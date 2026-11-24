import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {execFileSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
let server,api,ApiError,gameAction,cache;
const original=globalThis.fetch;
before(async()=>{
  cache=await mkdtemp(path.join(os.tmpdir(),'sanco-api-test-'));
  server=await createServer({configFile:false,cacheDir:cache,server:{middlewareMode:true},appType:'custom'});
  ({api,ApiError}=await server.ssrLoadModule('/src/api.ts'));
  ({gameAction}=await server.ssrLoadModule('/src/live.ts'));
});
after(async()=>{globalThis.fetch=original;await server.close();if(path.resolve(cache).startsWith(path.join(os.tmpdir(),'sanco-api-test-')))await rm(cache,{recursive:true,force:true});});

test('Concurrent reads use one fetch and failed reads release the slot',async()=>{
  let count=0,release;
  globalThis.fetch=async()=>{count++;return new Promise(resolve=>{release=resolve;});};
  const first=api('/rooms/ABC'),second=api('/rooms/ABC');assert.equal(count,1);
  release(Response.json({room:{id:'ABC'}}));assert.deepEqual(await first,await second);
  globalThis.fetch=async()=>{count++;return new Response('<html>missing</html>',{status:404});};
  await assert.rejects(api('/rooms/ABC'),error=>error.status===404);
  await assert.rejects(api('/rooms/ABC'),error=>error.status===404);assert.equal(count,3);
});

test('Socket timeout falls back once with the identical actionId; rejection does not retry',async()=>{
  const body={actionId:'idempotent-move',version:1,action:'move'};let calls=0;
  const socket={connected:true,timeout(){return this;},async emitWithAck(){throw Error('ack lost');}};
  globalThis.fetch=async(_url,options)=>{calls++;assert.deepEqual(JSON.parse(options.body),body);return Response.json({room:{version:2}});};
  await gameAction(socket,'room','ABC',body);assert.equal(calls,1);
  globalThis.fetch=async()=>{calls++;throw new TypeError('network');};
  await assert.rejects(gameAction(socket,'room','ABC',body));assert.equal(calls,2);
  socket.emitWithAck=async()=>({error:'expired',status:401});
  await assert.rejects(gameAction(socket,'room','ABC',body),error=>error instanceof ApiError&&error.status===401);assert.equal(calls,2);
});

test('Deployment 4815172 recursive acceptRoom produces 1000 HTTP reads for one malformed stream',async()=>{
  const app=execFileSync('git',['show','4815172:src/App.tsx'],{encoding:'utf8'});
  const mergeSource=execFileSync('git',['show','4815172:src/live-state.ts'],{encoding:'utf8'});
  const {mergeLive}=await import('data:text/javascript,'+encodeURIComponent(stripTypeScriptTypes(mergeSource)));
  const declaration=app.slice(app.indexOf('  const acceptRoom='),app.indexOf('  async function refreshLists'));
  const current={current:{id:'A',version:1,game:{id:'round',moves:[]}}},broken={id:'A',version:2,game:{id:'round',moveCount:4}};
  let requests=0,finish;const complete=new Promise(resolve=>{finish=resolve;});
  const legacy=new Function('mergeLive','api','roomRef','archivedRef','setRoom','notifyError',stripTypeScriptTypes(declaration)+';return acceptRoom;');
  const accept=legacy(mergeLive,async()=>{if(++requests>=1000)throw Error('test cutoff');return {room:broken};},current,{current:false},()=>{},()=>finish());
  accept(broken);await complete;assert.equal(requests,1000);
});
