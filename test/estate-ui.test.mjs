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

test('Single-ring board opens magnified, supports zoom and overview, and keeps working lot inspection',async()=>{
  localStorage.setItem('sc-party-view','2d');localStorage.setItem('sc-estate-tutorial-v3','done');
  const g=game(8);
  await render(PartyBoard,{kind:'monopoly',state:g.party,mySide:'R',turn:'R',legal:[],enabled:false,animate:false});
  const lots=[...document.querySelectorAll('[data-cell-index]')];assert.equal(lots.length,48);
  for(const lot of lots){
    const rect=lot.querySelector('rect');assert.equal(Number(rect.getAttribute('width')),Number(rect.getAttribute('height')),'Every lot must be an exact square');
  }
  const surface=()=>document.querySelector('.estate-board-surface');
  assert.equal(surface().style.width,'1560px','Large mode must enlarge the actual board');
  const viewport=document.querySelector('.estate-board-viewport');
  Object.defineProperties(viewport,{clientWidth:{value:600},clientHeight:{value:400}});
  Object.defineProperties(surface(),{clientWidth:{get:()=>parseFloat(surface().style.width)||600},clientHeight:{get:()=>parseFloat(surface().style.width)||600}});
  await click(button('Quân của bạn'));assert.equal(viewport.scrollLeft,960);assert.equal(viewport.scrollTop,1160);
  await click(button('Phóng to'));assert.equal(surface().style.width,'1820px');
  await click(button('Toàn bàn'));assert.ok(document.querySelector('.estate-board-viewport.is-fit'));
  assert.equal(viewport.scrollLeft,0);assert.equal(viewport.scrollTop,0);
  await click(button('Phóng to'));assert.equal(surface().style.width,'1560px');
  await click(button('Thu nhỏ'));assert.equal(surface().style.width,'1300px');
  const court=document.querySelector('.vn-estate-flat .board-svg-center');assert.equal(court.getAttribute('width'),'660');
  await click(lots[3]);
  assert.match(document.querySelector('.estate-inspector').textContent,new RegExp(VN_CELLS[3].name));
  assert.equal(document.querySelector('[data-cell-index="3"]').getAttribute('aria-pressed'),'true');
});

test('Fullscreen estate game keeps actions, settings and lot inspection in one collapsible HUD and restores page scrolling',async()=>{
  localStorage.setItem('sc-party-view','2d');localStorage.setItem('sc-estate-tutorial-v3','done');document.body.style.overflow='scroll';
  const g=game(),sent=[],legal=[{from:null,to:-1,action:'roll'}],move=m=>sent.push(m);
  const props={kind:'monopoly',state:g.party,mySide:'R',turn:'R',legal,enabled:true,animate:false,immersive:true,onMove:move,hudActions:createElement(Controls,{state:g.party,mySide:'R',legal,enabled:true,onMove:move})};
  await render(PartyBoard,props);
  const hud=document.querySelector('.estate-game-hud'),shell=document.querySelector('.estate-immersive');
  assert.equal(shell.parentElement,document.body);assert.equal(document.body.style.overflow,'hidden');
  assert.equal(document.querySelectorAll('.estate-game-hud').length,1);
  assert.ok(document.querySelector('.party-table-toolbar').closest('.estate-game-hud'));
  assert.ok(document.querySelector('.estate-zoom-tools').closest('.estate-game-hud'));
  assert.ok(document.querySelector('.estate-primary-actions').closest('.estate-game-hud'));
  await click(document.querySelector('.estate-primary-actions button'));assert.equal(sent[0].command,'roll');
  await click(document.querySelector('[aria-label="Thu gọn HUD"]'));assert.equal(document.querySelector('.estate-game-hud-body').hidden,true);
  await click(document.querySelector('[data-cell-index="3"]'));
  assert.ok(document.querySelector('.estate-corner-inspector .estate-inspector'),'Clicking a lot opens the compact top-left corner inspector');
  assert.equal(document.querySelector('.estate-game-hud-body').hidden,true,'Inspecting a lot stays in the left corner without expanding or scrolling the right HUD');
  assert.equal(document.querySelector('.party-cell-popup-wrap'),null);
  await render(PartyBoard,{...props,immersive:false});assert.equal(document.querySelector('.estate-game-hud'),null);assert.equal(document.body.style.overflow,'scroll');
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
  raw.game.phase='playing';startVietnam(raw.game,()=>0);
  await render(PartyRoom,{...props,room:publicRoom(raw,'one',Date.now())});
  assert.ok(document.querySelector('.estate-immersive'));assert.ok(document.querySelector('.party-room-workspace').hasAttribute('inert'));
  assert.equal(document.querySelectorAll('.estate-game-hud').length,1);assert.equal(document.querySelector('.practice-aside'),null);
  assert.ok(document.querySelector('.party-roster').closest('.estate-game-hud'));
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

test('Minimalist fullscreen Monopoly opens in fit tabletop space and zooms onto the moving piece during walk',async()=>{
  localStorage.setItem('sc-party-view','2d');
  const g=game(2),initial=structuredClone(g.party);
  initial.players[0].position=0;initial.players[1].position=0;
  const props={kind:'monopoly',mySide:'R',turn:'R',legal:[{from:null,to:-1,action:'roll'}],enabled:true,gameKey:'zoom-walk-test',animate:true,immersive:true,lastDie:null,rollKey:'',rolls:[]};
  await render(PartyBoard,{...props,state:initial});
  const surface=()=>document.querySelector('.estate-board-surface');
  assert.equal(surface().getAttribute('data-board-size'),'0','Fullscreen Monopoly opens showing the whole board with breathing space');
  assert.ok(document.querySelector('.estate-board-viewport.is-fit'));
  assert.equal(document.querySelector('.estate-tutorial'),null,'No cluttered tutorial card inside minimalist fullscreen HUD');
  assert.equal(surface().getAttribute('data-walking-zoom'),null);

  // Trigger a 5-step roll: while dice rolls (t=0..820ms), no walk zoom yet
  const rolled=structuredClone(initial);
  rolled.players[0].position=5;rolled.stage='end';rolled.dice=5;rolled.diceValues=[2,3];
  await render(PartyBoard,{...props,state:rolled,lastDie:2,rollKey:'0:500',rolls:[{key:'0:500',value:2,faces:[2,3],side:'R'}]});
  assert.equal(surface().getAttribute('data-walking-zoom'),null,'Do not zoom before dice finishes rolling');

  // After dice settles (t=960ms), piece is walking -> board zooms smoothly into the moving piece!
  await act(async()=>new Promise(resolve=>setTimeout(resolve,960)));
  assert.equal(surface().getAttribute('data-walking-zoom'),'true','Board must zoom onto moving piece while walking');
  assert.match(surface().style.transform,/scale\(1\.82\)/);

  // After walk finishes, board glides back out to full view
  await act(async()=>new Promise(resolve=>setTimeout(resolve,850)));
  assert.equal(surface().getAttribute('data-walking-zoom'),null,'Board zooms back out once piece lands');
  assert.equal(surface().style.transform,'');
});

test('Fullscreen HUD suppresses duplicate buy/auction buttons and supports resizing via separator handle',async()=>{
  localStorage.setItem('sc-party-view','2d');
  localStorage.removeItem('sc-estate-hud-width');
  const g=game(2),p=g.party;
  p.property[1]=null;p.players[0].position=1;p.stage='buy';
  const legal=[{from:null,to:1,action:'buy'},{from:null,to:-1,action:'auction'},{from:null,to:-1,action:'skip_buy'}];
  await render(PartyBoard,{
    kind:'monopoly',state:p,mySide:'R',turn:'R',legal,enabled:true,animate:false,immersive:true,onMove:()=>{},
    hudActions:createElement(Controls,{state:p,mySide:'R',legal,enabled:true,suppressDecision:true,onMove:()=>{}})
  });
  // Decision card renders once; EstateControls does NOT duplicate Buy / Auction / Skip buttons below it
  assert.equal(document.querySelectorAll('.estate-buy-center').length,1);
  assert.equal(document.querySelector('.estate-primary-actions'),null,'No duplicate decision buttons in EstateControls');
  const hud=document.querySelector('.estate-game-hud');
  const resizer=document.querySelector('.estate-hud-resizer[role="separator"]');
  assert.ok(resizer,'HUD must provide a resize separator');
  assert.equal(hud.style.width,'276px');
  await act(async()=>{resizer.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));});
  assert.equal(hud.style.width,'296px');
  assert.equal(localStorage.getItem('sc-estate-hud-width'),'296');
});
