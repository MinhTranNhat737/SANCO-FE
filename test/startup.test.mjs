import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {act,createElement} from 'react';
import {KINDS,createPractice,practiceView,boardSide,legalMoves,makePracticeMove} from '../../be/src/practice-engine.js';
import {newGame,publicRoom} from '../../be/src/room-game.js';

let vite,cache,dom,root,App,Boundary,createRoot,previewBoard,user;
let CommanderBoard;
const socketModule=`export function io(){return {connected:false,on(){return this},off(){return this},emit(){return this},timeout(){return this},emitWithAck(){return Promise.resolve({})},disconnect(){}}}`;
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const roomFor=kind=>{const owner={id:user.id,name:user.name,mark:boardSide(kind),ready:false,rematch:false},party=['ludo','monopoly'].includes(kind);return publicRoom({id:'ABCD1234',kind,version:0,duration:300000,createdAt:Date.now(),owner,guest:null,...(party?{players:[owner],capacity:4}:{}),game:newGame(300000,'round-one',kind,party?4:2)},user.id,Date.now());};
before(async()=>{
  cache=await mkdtemp(path.join(os.tmpdir(),'sanco-ui-'));
  vite=await createServer({configFile:false,root:process.cwd(),cacheDir:cache,plugins:[react(),{name:'test-socket',enforce:'pre',resolveId(id){if(id==='socket.io-client')return '\0sanco-test-socket';},load(id){if(id==='\0sanco-test-socket')return socketModule;}}],server:{middlewareMode:true},appType:'custom'});
  ({default:App}=await vite.ssrLoadModule('/src/App.tsx'));({default:Boundary}=await vite.ssrLoadModule('/src/AppErrorBoundary.tsx'));({previewBoard}=await vite.ssrLoadModule('/src/practice-types.ts'));
  ({default:CommanderBoard}=await vite.ssrLoadModule('/src/CommanderBoard.tsx'));
});
beforeEach(async()=>{
  dom=new JSDOM('<div id="root"></div>',{url:'http://127.0.0.1:5173/'});
  for(const key of['window','document','localStorage','history','HTMLElement','HTMLInputElement','Image','Event','MouseEvent'])globalThis[key]=dom.window[key];
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.scrollTo=()=>{};globalThis.matchMedia=window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  ({createRoot}=await import('react-dom/client'));root=createRoot(document.getElementById('root'));
  user={id:'user-one',name:'Bạn cờ',account:false,email:null};
  globalThis.fetch=async(url,options={})=>{
    const pathname=new URL(String(url),window.location.href).pathname,body=options.body?JSON.parse(options.body):null;
    if(pathname==='/api/me')return json({user});
    if(pathname==='/api/rooms'&&body)return json({room:roomFor(body.kind),token:'test-invitation'});
    if(pathname==='/api/rooms')return json({rooms:[]});if(pathname==='/api/history')return json({matches:[]});
    if(pathname==='/api/practice'&&body)return json({game:practiceView(createPractice(body.kind,boardSide(body.kind),'medium','00000000-0000-4000-8000-000000000001'))});
    if(pathname==='/api/practice')return json({games:[]});
    if(pathname==='/__dev/client-errors')return json({ok:true});throw Error('Unexpected request: '+pathname);
  };
});
afterEach(async()=>{await act(async()=>root.unmount());dom.window.close();});
after(async()=>{await vite.close();if(path.resolve(cache).startsWith(path.join(os.tmpdir(),'sanco-ui-')))await rm(cache,{recursive:true,force:true});});
async function settle(){await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});}
async function click(element){assert.ok(element,'Expected visible control');await act(async()=>element.dispatchEvent(new MouseEvent('click',{bubbles:true})));await settle();}
const ctlAt=(y,x)=>(11-y)*11+x;
function ctlPosition(pieces){const g=createPractice('commander','r','easy','ctl-ui');g.board.fill(null);for(const [y,x,piece]of [[0,10,'rK'],[11,9,'bK'],...pieces])g.board[ctlAt(y,x)]=piece;return g;}
async function renderCommander(g,onMove,enabled=true,flipped=false){await act(async()=>root.render(createElement(CommanderBoard,{board:g.board,legal:legalMoves(g),enabled,last:null,checkSquare:null,winning:[],flipped,onMove})));await settle();}

test('Commander board offers explicit bombing/landing choices and sends the selected authoritative command',async()=>{
  const g=ctlPosition([[3,4,'rF'],[6,4,'bI'],[1,3,'rI'],[9,3,'bT']]);let accepted;
  await renderCommander(g,m=>accepted=m);assert.equal(document.querySelectorAll('[role="gridcell"]').length,132);
  await click(document.querySelector(`[data-square="${ctlAt(3,4)}"]`));await click(document.querySelector(`[data-square="${ctlAt(6,4)}"]`));
  const choices=document.querySelectorAll('.ctl-action-options button');assert.equal(choices.length,2);
  await click([...choices].find(b=>b.textContent.includes('Ném bom')));assert.equal(accepted.action,'ctl-0-bomb');
  makePracticeMove(g,accepted);assert.equal(g.board[ctlAt(3,4)],'rF');assert.equal(g.board[ctlAt(6,4)],null);
});

test('Commander stack selector composes one atomic order with three distinct destinations',async()=>{
  const g=ctlPosition([[3,5,'rT+rI+rD'],[9,3,'bI']]);let accepted;
  await renderCommander(g,m=>accepted=m);await click(document.querySelector(`[data-square="${ctlAt(3,5)}"]`));await click([...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Phối hợp')));
  await click(document.querySelector(`[data-square="${ctlAt(5,5)}"]`));await click(document.querySelector(`[data-square="${ctlAt(3,4)}"]`));await click(document.querySelector(`[data-square="${ctlAt(4,6)}"]`));
  assert.equal(document.querySelectorAll('.ctl-planned li').length,3);await click([...document.querySelectorAll('button')].find(b=>b.textContent==='Thực hiện 3 lệnh'));
  assert.equal(accepted.action,'ctl-combined');makePracticeMove(g,accepted);assert.equal(g.moves.length,1);assert.equal(g.board[ctlAt(5,5)],'rT');assert.equal(g.board[ctlAt(3,4)],'rI');assert.equal(g.board[ctlAt(4,6)],'rD');
});

test('Commander board exposes air defenses, uses native coordinates after rotation, and blocks replay input',async()=>{
  const g=createPractice('commander','r','easy','ctl-readonly');let calls=0;await renderCommander(g,()=>calls++,false,true);
  assert.equal(document.querySelector('[role="gridcell"]').dataset.square,'131');assert.ok(document.querySelector('[data-square="127"]').getAttribute('aria-label').includes('Tư lệnh Đỏ'));
  await click([...document.querySelectorAll('button')].find(b=>b.textContent.includes('Hiện vùng phòng không')));assert.equal(document.querySelectorAll('.ctl-air').length,10);
  await click(document.querySelector('[data-square="127"]'));assert.equal(document.querySelector('.ctl-orders'),null);assert.equal(calls,0);
});

test('Commander online screen sends move as the room action and preserves the bombing command through App',async()=>{
  const state=ctlPosition([[3,4,'rF'],[6,4,'bI'],[1,3,'rI'],[9,3,'bT']]);
  const room=roomFor('commander');room.game={...room.game,...state,legal:legalMoves(state),remaining:{r:300000,b:300000},turnStartedAt:Date.now()};
  const fallback=globalThis.fetch;let sent;
  globalThis.fetch=async(url,options={})=>{
    const path=new URL(String(url),window.location.href).pathname;
    if(path==='/api/rooms'&&options.method==='POST')return json({room,token:'test-invitation'});
    if(path===`/api/rooms/${room.id}/actions`){sent=JSON.parse(options.body);assert.equal(sent.action,'move');assert.equal(sent.command,'ctl-0-bomb');makePracticeMove(state,{...sent,action:sent.command});room.version++;room.game={...room.game,...state,legal:[]};return json({room});}
    if(path===`/api/rooms/${room.id}`)return json({room});
    return fallback(url,options);
  };
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click(document.querySelector('.collection-commander'));await click([...document.querySelectorAll('.mode-choices button')].find(b=>b.textContent.includes('Chơi với bạn')));
  await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await settle();
  const close=document.querySelector('[aria-label="Đóng"]');if(close)await click(close);
  await click(document.querySelector(`[data-square="${ctlAt(3,4)}"]`));await click(document.querySelector(`[data-square="${ctlAt(6,4)}"]`));await click([...document.querySelectorAll('.ctl-action-options button')].find(b=>b.textContent.includes('Ném bom')));
  assert.ok(sent,'App must send the selected command');assert.equal(state.board[ctlAt(6,4)],null);assert.equal(state.board[ctlAt(3,4)],'rF');assert.equal(document.querySelector('.error-box'),null);
});
test('Commander 3D can be selected and safely falls back to the same playable board without WebGL',async()=>{
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();await click(document.querySelector('.collection-commander'));await click(document.querySelectorAll('.mode-choices button')[1]);await click(document.querySelector('.practice-start'));
  const before=[...document.querySelectorAll('.flat-commander [data-square]')].map(c=>c.getAttribute('aria-label'));
  const button=[...document.querySelectorAll('.practice-display-switch button')].find(b=>b.textContent==='3D');assert.equal(button.disabled,false);
  const original=window.HTMLCanvasElement.prototype.getContext;window.HTMLCanvasElement.prototype.getContext=()=>null;
  try{await click(button);await settle();await settle();await settle();assert.ok(document.querySelector('.flat-commander'));assert.equal(document.querySelector('.ctl-board-3d'),null);assert.deepEqual([...document.querySelectorAll('.flat-commander [data-square]')].map(c=>c.getAttribute('aria-label')),before);assert.ok(document.querySelector('.practice-session'));assert.equal(document.querySelector('.startup-message'),null);}finally{window.HTMLCanvasElement.prototype.getContext=original;}
});
async function verifyBoardThemes(){
  const workspace=document.querySelector('.practice-workspace');
  const board=workspace.querySelector('[role="grid"],.party-table');
  const labels=()=>[...board.querySelectorAll('[data-square]')].map(cell=>cell.getAttribute('aria-label'));
  const before=labels();
  const controls=workspace.querySelector('.party-table-toolbar .board-appearance')||workspace.querySelector('.board-appearance');
  assert.ok(controls,'Every game needs a theme selector');
  for(const [index,theme]of [[0,'light'],[1,'dark']]){
    await click(controls.querySelectorAll('button')[index]);
    assert.equal(workspace.dataset.boardTheme,theme);
    assert.equal(board.dataset.boardTheme,theme);
    assert.equal(controls.querySelectorAll('button')[index].getAttribute('aria-pressed'),'true');
    assert.equal(localStorage.getItem('sc-board-theme'),theme);
    assert.equal(workspace.querySelector('[role="grid"],.party-table'),board,'Theme must preserve the mounted game');
    assert.deepEqual(labels(),before,'Theme must preserve every piece and square');
  }
}
test('Guest can reach registration and login directly from the header',async()=>{
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  const header=document.querySelector('.topbar-right');
  await click([...header.querySelectorAll('button')].find(button=>button.textContent==='Tạo tài khoản'));
  assert.equal(document.querySelector('[role="dialog"] h2').textContent,'Đăng ký');
  assert.equal(document.querySelector('input[type="email"]').required,true);
  assert.equal(document.querySelector('input[autocomplete="new-password"]').minLength,10);
  await click(document.querySelector('[aria-label="Đóng"]'));
  await click(header.querySelector('.account-button'));
  assert.equal(document.querySelector('[role="dialog"] h2').textContent,'Đăng nhập');
  assert.ok(document.querySelector('input[autocomplete="current-password"]'));
});
test('Home mounts, loads the session and opens the chess room without a blank render',async()=>{
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  assert.equal(document.querySelectorAll('.collection-card').length,KINDS.length);assert.ok(document.querySelector('.quick-lobby'));
  await click(document.querySelector('[aria-label="Chọn cách chơi Cờ vua"]'));
  await click([...document.querySelectorAll('.mode-choices button')].find(button=>button.textContent.includes('Chơi với bạn')));
  assert.equal(document.querySelector('select').value,'chess');
  await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await settle();await settle();
  assert.ok(document.querySelector('.online-workspace'),'Room must mount after creation');assert.equal(document.querySelector('.room-title h1').textContent,'Cờ vua.');assert.equal(document.querySelectorAll('.flat-chess [role="gridcell"]').length,64);assert.equal(document.querySelector('.startup-message'),null);
});
test('Practice opens a usable chess board after the session loads',async()=>{
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click(document.querySelector('.quick-lobby-actions .button-secondary'));await settle();
  assert.ok(document.querySelector('.practice-setup'));assert.equal(document.querySelectorAll('.flat-chess [role="gridcell"]').length,64);assert.ok(document.querySelector('.practice-start'));assert.equal(document.querySelector('.startup-message'),null);
});

test('Visual home filters playable new games, searches without accents, and recovers from no results',async()=>{
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  assert.equal(document.querySelectorAll('.collection-card').length,KINDS.length);
  assert.equal(document.querySelectorAll('.catalog-caption p').length,0);
  assert.equal(document.querySelector('.quick-lobby p'),null);
  await click([...document.querySelectorAll('.collection-filters button')].find(b=>b.textContent==='Mới'));
  assert.equal(document.querySelectorAll('.collection-card').length,6);
  await click([...document.querySelectorAll('.collection-filters button')].find(b=>b.textContent==='Tất cả'));
  const input=document.querySelector('[aria-label="Tìm trò chơi"]');
  const setValue=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  await act(async()=>{setValue.call(input,'co ganh');input.dispatchEvent(new Event('input',{bubbles:true}));});await settle();
  assert.equal(document.querySelectorAll('.collection-card').length,1);assert.ok(document.querySelector('.collection-coganh'));
  await act(async()=>{setValue.call(input,'khong co tro nay');input.dispatchEvent(new Event('input',{bubbles:true}));});await settle();
  assert.equal(document.querySelectorAll('.collection-card').length,0);assert.ok(document.querySelector('.catalog-empty'));
  await click(document.querySelector('.catalog-empty button'));assert.equal(document.querySelectorAll('.collection-card').length,KINDS.length);
});

for(const kind of KINDS){
  test(`${kind}: catalog opens a room using the actual server state`,async()=>{
    await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
    await click(document.querySelector(`.collection-${kind}`));
    await click([...document.querySelectorAll('.mode-choices button')].find(b=>b.textContent.includes('Chơi với bạn')));
    await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await settle();
    assert.ok(document.querySelector('.online-workspace,.party-room-stage'),'Room must mount');
    assert.ok(document.querySelector('[role="grid"],.party-board'),'Board must render');
    await verifyBoardThemes();
    assert.equal(document.querySelector('.startup-message'),null);
  });
  test(`${kind}: bot setup and start render actual game rules and controls`,async()=>{
    await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
    await click(document.querySelector(`.collection-${kind}`));
    await click(document.querySelectorAll('.mode-choices button')[1]);
    await click(document.querySelector('.practice-start'));
    assert.ok(document.querySelector('.practice-session'));assert.ok(document.querySelector('[role="grid"],.party-board'));
    await verifyBoardThemes();
    if(['ludo','monopoly'].includes(kind))assert.ok([...document.querySelectorAll('button')].some(b=>b.textContent.includes('Gieo')));
    assert.equal(document.querySelector('.startup-message'),null);
  });
}

test('Saved board theme is restored after remounting the app',async()=>{
  localStorage.setItem('sc-board-theme','light');
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click(document.querySelector('.quick-lobby-actions .button-secondary'));
  assert.equal(document.querySelector('.practice-workspace').dataset.boardTheme,'light');
  await act(async()=>root.unmount());
  root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click(document.querySelector('.quick-lobby-actions .button-secondary'));
  assert.equal(document.querySelector('.practice-workspace').dataset.boardTheme,'light');
  assert.equal(document.querySelector('.board-appearance button').getAttribute('aria-pressed'),'true');
});
