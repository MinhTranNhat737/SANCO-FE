import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {act,createElement} from 'react';
import {newVietnam,startVietnam,VN_CELLS,vietnamRent,vietnamMove,vietnamBuildCost} from '../../be/src/vietnam-estate.js';
import {newGame,publicRoom} from '../../be/src/room-game.js';
let vite,cache,dom,root,createRoot,rules,data,Tutorial,Controls,PartyBoard,PartyRoom,turnHint;
before(async()=>{
  cache=await mkdtemp(path.join(os.tmpdir(),'sanco-estate-ui-'));
  vite=await createServer({configFile:false,root:process.cwd(),cacheDir:cache,plugins:[react()],server:{middlewareMode:true},appType:'custom'});
  rules=await vite.ssrLoadModule('/src/estate-rules.ts');data=await vite.ssrLoadModule('/src/estate-data.ts');
  ({default:Tutorial,estateTurnHint:turnHint}=await vite.ssrLoadModule('/src/EstateTutorial.tsx'));
  ({default:Controls}=await vite.ssrLoadModule('/src/EstateControls.tsx'));({PartyBoard}=await vite.ssrLoadModule('/src/PartyBoard.tsx'));({default:PartyRoom}=await vite.ssrLoadModule('/src/PartyRoom.tsx'));
});
beforeEach(async()=>{
  dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
  for(const key of ['window','document','localStorage','history','HTMLElement','HTMLInputElement','Image','Event','MouseEvent'])globalThis[key]=dom.window[key];
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.matchMedia=window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  window.scrollTo=()=>{};({createRoot}=await import('react-dom/client'));root=createRoot(document.getElementById('root'));
});
afterEach(async()=>{await act(async()=>root.unmount());dom.window.close();});
after(async()=>{await vite.close();if(path.resolve(cache).startsWith(path.join(os.tmpdir(),'sanco-estate-ui-')))await rm(cache,{recursive:true,force:true});});
const render=async(Component,props)=>act(async()=>root.render(createElement(Component,props)));
const click=async(element)=>{assert.ok(element);await act(async()=>element.dispatchEvent(new MouseEvent('click',{bubbles:true})));};
const button=text=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===text);
const game=(count=2)=>{const g={phase:'playing',kind:'monopoly',turn:'R',party:newVietnam(count,'auto')};startVietnam(g,()=>0);return g;};

test('Large square board shows all 48 lots, a smaller court and working inspection on the inner row',async()=>{
  localStorage.setItem('sc-party-view','2d');localStorage.setItem('sc-estate-tutorial-v3','done');
  const g=game(8);
  await render(PartyBoard,{kind:'monopoly',state:g.party,mySide:'R',turn:'R',legal:[],enabled:false,animate:false});
  const lots=[...document.querySelectorAll('[data-cell-index]')];assert.equal(lots.length,48);
  for(const lot of lots){
    const rect=lot.querySelector('rect');assert.equal(rect.getAttribute('width'),rect.getAttribute('height'));
    assert.match(lot.getAttribute('transform'),/scale\(1\.625\)/);
  }
  const court=document.querySelector('.vn-estate-flat .board-svg-center');assert.equal(court.getAttribute('width'),'390');
  await click(lots[3]);
  assert.match(document.querySelector('.estate-inspector').textContent,new RegExp(VN_CELLS[3].name));
  assert.equal(document.querySelector('[data-cell-index="3"]').getAttribute('aria-pressed'),'true');
});

test('Lobby has one row per color and never repeats a player in an empty seat',()=>{
  const owner={mark:'K',name:'Owner'},guest={mark:'Y',name:'Guest'};
  const seats=rules.lobbySeats([owner,guest],['R','G','Y','B','P','O','C','K'],8);
  assert.equal(seats.filter(row=>row.seat===owner).length,1);assert.equal(seats.filter(row=>row.seat===guest).length,1);assert.equal(seats.filter(row=>!row.seat).length,6);
  for(let count=2;count<=8;count++)assert.equal(rules.estateModePreview(count,'auto').name,game(count).party.profile.name);
});

test('Frontend bills equal backend prices for every lot, building level and market modifier',()=>{
  const g=game(4),p=g.party;p.property=p.property.map(()=> 'R');
  for(const percent of [80,100,110,125]){
    p.market={rentPercent:percent,buildPercent:percent,salaryPercent:percent};
    for(const cell of VN_CELLS.filter(cell=>['property','station','utility'].includes(cell.type)))for(let level=0;level<=5;level++){
      p.houses[cell.index]=cell.type==='property'?level:0;
      assert.equal(data.estateRent(p,cell.index,3),vietnamRent(g,cell.index,3));
      if(cell.type==='property')assert.equal(rules.estateBuildCost(p,cell.buildCost),vietnamBuildCost(p,cell.index));
      p.mortgaged[cell.index]=true;assert.equal(data.estateRent(p,cell.index),0);p.mortgaged[cell.index]=false;
    }
  }
});

test('Ownership batches cover purchases and transfers, ignore releases and repeated snapshots',()=>{
  const prev=Array(48).fill(null),next=[...prev];prev[3]='G';next[1]='R';next[2]='G';next[3]='R';
  const changes=rules.ownershipChanges(prev,next,{lot:1,side:'R',price:120,source:'buy'});
  assert.deepEqual(changes.map(change=>[change.lot,change.source,change.price]),[[1,'buy',120],[2,'buy',0],[3,'transfer',0]]);
  assert.deepEqual(rules.ownershipChanges(next,next,null),[]);assert.deepEqual(rules.ownershipChanges(next,prev,null),[{lot:3,side:'G',fromSide:'R',houses:undefined,price:0,source:'transfer'}]);
});

test('Trade selections drop lost land and the previous recipient assets after that recipient leaves',async()=>{
  const g=game(3),p=g.party;p.property.fill(null);p.property[1]='R';p.property[2]='G';p.property[3]='Y';const sent=[];
  const props={mySide:'R',enabled:true,legal:[{action:'offer',to:-1}],onMove:request=>sent.push(request)};
  await render(Controls,{...props,state:p});
  for(const input of document.querySelectorAll('.estate-lot-check input'))await click(input);
  const changed=structuredClone(p);changed.players[1].active=false;changed.property[1]='Y';changed.property[2]=null;
  await render(Controls,{...props,state:changed});
  await act(async()=>document.querySelector('select[aria-label="Đối tác giao dịch"]').closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await click(button('Xác nhận'));assert.equal(sent.length,1);assert.equal(sent[0].details.partner,'Y');assert.deepEqual(sent[0].details.give,[]);assert.deepEqual(sent[0].details.take,[]);
  vietnamMove({...g,party:changed},{...sent[0],action:sent[0].command},()=>1);
});

test('Trading an undeveloped owned lot is allowed when a different owner has buildings in its group',async()=>{
  const g=game(3),p=g.party;p.property.fill(null);p.property[1]='R';p.property[2]='G';p.houses[2]=2;p.bank.houses-=2;
  const sent=[];await render(Controls,{state:p,mySide:'R',enabled:true,legal:[{action:'offer',to:-1}],onMove:request=>sent.push(request)});
  const checkbox=[...document.querySelectorAll('.estate-lot-check')].find(label=>label.textContent.includes(VN_CELLS[1].name))?.querySelector('input');
  assert.ok(checkbox,'Server permits this lot to be traded');await click(checkbox);
  await act(async()=>document.querySelector('select[aria-label="Đối tác giao dịch"]').closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await click(button('Xác nhận'));assert.deepEqual(sent[0].details.give,[1]);vietnamMove(g,{...sent[0],action:sent[0].command},()=>1);
});

test('Tutorial walks seven steps, persists completion, reopens and tracks authoritative stages',async()=>{
  const g=game(),props={state:g.party,mySide:'R',turn:'R',busy:false,live:true};
  await render(Tutorial,props);assert.match(document.querySelector('.estate-tutorial-lesson h3').textContent,/1\./);assert.equal(button('Trước').disabled,true);
  for(let i=0;i<6;i++)await click(button('Tiếp'));assert.match(document.querySelector('.estate-tutorial-lesson h3').textContent,/7\./);
  await click(button('Đã hiểu'));assert.equal(document.querySelector('.estate-tutorial-lesson'),null);assert.equal(localStorage.getItem('sc-estate-tutorial-v3'),'done');
  await click(button('Hướng dẫn'));assert.ok(document.querySelector('.estate-tutorial-lesson'));
  for(const stage of ['roll','buy','buyout','end','auction','deal','debt']){
    const state={...g.party,stage};await render(Tutorial,{...props,state});assert.equal(document.querySelector('.estate-tutorial-header p').textContent,turnHint(state,'R','R',false,true));
    assert.ok(turnHint(state,'R','R',false,true).length>35);
  }
  await render(Tutorial,{...props,turn:'G'});assert.match(document.querySelector('.estate-tutorial-header p').textContent,/người khác/);
  await render(Tutorial,{...props,busy:true});assert.match(document.querySelector('.estate-tutorial-header p').textContent,/Chờ xúc xắc/);
});

test('Counteroffer controls preserve reversed lots and send one reviewed, server-valid contract',async()=>{
  const g=game(),p=g.party;p.property.fill(null);p.property[1]='R';p.property[2]='G';
  vietnamMove(g,{action:'offer',to:-1,details:{partner:'G',pay:200,ask:50,give:[1],take:[2]}},()=>1);
  const sent=[];
  await render(Controls,{state:p,mySide:'G',enabled:true,legal:[{action:'counter_offer',to:-1}],onMove:request=>sent.push(request)});
  await click([...document.querySelectorAll('button')].find(button=>button.textContent.startsWith('Đề nghị giá khác')));
  await act(async()=>document.querySelector('.estate-counter form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(sent.length,0);await click(button('Xác nhận'));assert.equal(sent.length,1);
  assert.equal(sent[0].command,'counter_offer');assert.deepEqual(sent[0].details,{pay:50,ask:200,give:[2],take:[1]});
  vietnamMove(g,{...sent[0],action:sent[0].command},()=>1);assert.equal(g.turn,'R');assert.equal(p.pending.counters,1);
});

test('Waiting room renders owner once, seven empty seats and a host start button using real readiness',async()=>{
  const owner={id:'one',name:'Unique Owner',mark:'G',ready:true},guest={id:'two',name:'Unique Guest',mark:'R',ready:true};
  const raw={id:'ROOM',kind:'monopoly',version:0,duration:3600000,capacity:8,estateMode:'auto',owner,players:[owner],game:newGame(3600000,'lobby','monopoly',8,'auto')};
  const actions=[],props={busy:false,connected:true,archived:false,onBack(){},onAction:action=>actions.push(action),onInvite(){},onResign(){}};
  await render(PartyRoom,{...props,room:publicRoom(raw,'one',Date.now())});
  assert.equal([...document.querySelectorAll('.party-lobby-seats strong')].filter(node=>node.textContent==='Unique Owner').length,1);
  assert.equal([...document.querySelectorAll('.party-lobby-seats strong')].filter(node=>node.textContent==='Ghế trống').length,7);assert.equal(button('Bắt đầu với 1 người').disabled,true);
  raw.players.push(guest);await render(PartyRoom,{...props,room:publicRoom(raw,'one',Date.now())});assert.equal(button('Bắt đầu với 2 người').disabled,false);await click(button('Bắt đầu với 2 người'));assert.deepEqual(actions,['start']);
});

test('Purchase glows every changed tile, stays across unrelated snapshots and expires without replay',async()=>{
  localStorage.setItem('sc-party-view','2d');localStorage.setItem('sc-estate-tutorial-v3','done');
  const g=game(),initial=structuredClone(g.party);initial.property.fill(null);
  const props={kind:'monopoly',mySide:'R',turn:'R',legal:[],enabled:false,gameKey:'purchase-batch',animate:true,lastDie:null,rollKey:'',rolls:[]};
  await render(PartyBoard,{...props,state:initial});const acquired=structuredClone(initial);acquired.property[1]='R';acquired.property[2]='G';acquired.lastPurchase={lot:1,side:'R',source:'buy',price:120};
  await render(PartyBoard,{...props,state:acquired});assert.equal(document.querySelectorAll('[data-glow-lot]').length,2);assert.ok(document.querySelector('.estate-purchase-banner'));
  await render(PartyBoard,{...props,state:{...acquired,message:'A new snapshot'}});assert.equal(document.querySelectorAll('[data-glow-lot]').length,2);
  await act(async()=>new Promise(resolve=>setTimeout(resolve,2500)));assert.equal(document.querySelectorAll('[data-glow-lot]').length,0);assert.equal(document.querySelector('.estate-purchase-banner'),null);
  await render(PartyBoard,{...props,state:structuredClone(acquired)});assert.equal(document.querySelectorAll('[data-glow-lot]').length,0);
  const startup=structuredClone(initial);startup.started=false;await render(PartyBoard,{...props,gameKey:'new-game',state:startup});
  await render(PartyBoard,{...props,gameKey:'new-game',state:acquired});assert.equal(document.querySelectorAll('[data-glow-lot]').length,0);
});
