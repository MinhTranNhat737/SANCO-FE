import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeLive,createLiveReceiver} from '../src/live-state.ts';
import {startPolling,retryDelay,SOCKET_POLICY} from '../src/network-policy.ts';
import {apiOrigin} from '../src/api-origin.ts';

test('Malformed live packets never throw or erase replay; stale snapshots cannot roll back',()=>{
  const previous={id:'A',version:3,game:{id:'round',moves:[1]}};
  for(const packet of [null,{}, {id:'A'}, {id:'A',version:4,game:{}},{id:'A',version:4,game:{id:'round',moveCount:-1}}, {id:'A',version:4,game:{id:'round',moveCount:2,movesAppend:{}}}])assert.equal(mergeLive(previous,packet),null);
  assert.equal(mergeLive(previous,{id:'A',version:2,game:{moves:[]}}),previous);
  assert.equal(mergeLive({id:'A',version:1,game:{id:'round'}} as any,{id:'A',version:4,game:{id:'round',moveCount:2}}),null);
});

test('Burst of invalid packets and permanently invalid recovery is bounded; leaving ignores late response',async t=>{
  t.mock.timers.enable({apis:['Date'],now:1000});
  let current:any={id:'A',version:1,moves:[]},loads=0,errors=0,resolve:any;
  const receive=createLiveReceiver({current:()=>current,apply:next=>{current=next;},load:async()=>{loads++;return new Promise(r=>{resolve=r;});},error:()=>{errors++;}});
  const broken={id:'A',version:2,moveCount:4};
  const first=receive(broken);await Promise.all(Array.from({length:100},()=>receive(broken)));
  assert.equal(loads,1);resolve(broken);await first;assert.equal(errors,1);
  for(let i=0;i<2;i++){t.mock.timers.tick(30001);const request=receive(broken);resolve(broken);await request;}
  t.mock.timers.tick(60000);await receive(broken);assert.equal(loads,3);
  current={id:'B',version:1,moves:[]};const late=receive({id:'B',version:2,moveCount:4});current=null;resolve({id:'B',version:2,moves:[1,2,3,4]});await late;assert.equal(current,null);
});

test('Lost delta recovers once and preserves newer socket events during HTTP recovery',async()=>{
  let current:any={id:'A',version:1,moves:[]},resolve:any;
  const receive=createLiveReceiver({current:()=>current,apply:next=>{current=next;},load:()=>new Promise(r=>{resolve=r;}),error:error=>{throw error;}});
  const pending=receive({id:'A',version:2,moveCount:2});
  await receive({id:'A',version:5,moves:[1,2,3]});resolve({id:'A',version:2,moves:[1,2]});await pending;
  assert.equal(current.version,5);
  await assert.rejects(receive({id:'A',version:6,moveCount:7},false));
  await assert.rejects(receive(null,false));
  await assert.rejects(receive({id:'wrong-room',version:6,moves:[]},false));
});

test('Polling serializes slow requests, backs off outages, wakes on visibility and stops on expired sessions',async t=>{
  const oldDocument=globalThis.document,oldWindow=globalThis.window;
  const doc=Object.assign(new EventTarget(),{hidden:false});
  Object.assign(globalThis,{document:doc,window:new EventTarget()});
  t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});
  try{
    let calls=0,resolve:any;
    const poll=startPolling(async()=>{calls++;await new Promise(r=>{resolve=r;});},{delay:()=>1500,immediate:true});
    t.mock.timers.tick(12000);poll.wake();assert.equal(calls,1);
    resolve();await Promise.resolve();await Promise.resolve();poll.stop();
    let limited=0;const rateLimited=startPolling(async()=>{limited++;throw Object.assign(Error('limited'),{status:429,retryAfter:120000});},{delay:()=>1000,immediate:true});
    await Promise.resolve();await Promise.resolve();t.mock.timers.tick(60000);await Promise.resolve();assert.equal(limited,1);rateLimited.stop();
    let failed=0;const outage=startPolling(async()=>{failed++;throw Error('offline');},{delay:()=>5000,immediate:true});
    for(let i=0;i<300;i++){t.mock.timers.tick(1000);await Promise.resolve();await Promise.resolve();}
    assert.ok(failed<=10,`300-second outage: ${failed} requests`);outage.stop();
    let terminal=0;const expired=startPolling(async()=>{terminal++;throw Object.assign(Error('expired'),{status:401});},{delay:()=>1000,immediate:true});
    await Promise.resolve();await Promise.resolve();t.mock.timers.tick(300000);expired.wake();assert.equal(terminal,1);expired.stop();
    doc.hidden=true;let hidden=0;const paused=startPolling(async()=>{hidden++;},{delay:()=>1000,immediate:true});t.mock.timers.tick(5000);assert.equal(hidden,0);doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(hidden,1);paused.stop();
  }finally{Object.assign(globalThis,{document:oldDocument,window:oldWindow});}
});

test('Routing rejects API suffixes and malformed origins; reconnects and jitter are bounded',()=>{
  assert.equal(apiOrigin(' https://api.example.test/// '),'https://api.example.test');
  for(const value of ['https://example.test/api','/api','https://user:pass@example.test','https://example.test?room=x'])assert.throws(()=>apiOrigin(value));
  assert.equal(SOCKET_POLICY.reconnectionAttempts,8);
  assert.equal(retryDelay(5000,1,()=>0.5),10000);
  assert.equal(retryDelay(5000,20,()=>0.5),60000);
});
