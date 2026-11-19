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
import {botRoster,RANKS,ratingView} from '../../be/src/ratings.js';
import {matchPresets} from '../../be/src/matchmaking.js';

let vite,cache,dom,root,App,Boundary,createRoot,previewBoard,user;
let CommanderBoard,MobileOrientation;
const socketModule=`export function io(){return {connected:false,on(){return this},off(){return this},emit(){return this},timeout(){return this},emitWithAck(){return Promise.resolve({})},disconnect(){}}}`;
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const roomFor=(kind,capacity,ranked=false)=>{const owner={id:user.id,name:user.name,mark:boardSide(kind),ready:false,rematch:false},party=['ludo','monopoly'].includes(kind),cap=party?(capacity||4):2;return publicRoom({id:'ABCD1234',kind,ranked,version:0,duration:300000,createdAt:Date.now(),owner,guest:null,...(party?{players:[owner],capacity:cap}:{}),game:newGame(300000,'round-one',kind,cap)},user.id,Date.now());};
before(async()=>{
  cache=await mkdtemp(path.join(os.tmpdir(),'sanco-ui-'));
  vite=await createServer({configFile:false,root:process.cwd(),cacheDir:cache,plugins:[react(),{name:'test-socket',enforce:'pre',resolveId(id){if(id==='socket.io-client')return '\0sanco-test-socket';},load(id){if(id==='\0sanco-test-socket')return socketModule;}}],server:{middlewareMode:true},appType:'custom'});
  ({default:App}=await vite.ssrLoadModule('/src/App.tsx'));({default:Boundary}=await vite.ssrLoadModule('/src/AppErrorBoundary.tsx'));({previewBoard}=await vite.ssrLoadModule('/src/practice-types.ts'));
  ({default:CommanderBoard}=await vite.ssrLoadModule('/src/CommanderBoard.tsx'));
  ({default:MobileOrientation}=await vite.ssrLoadModule('/src/MobileOrientation.tsx'));
});
beforeEach(async()=>{
  dom=new JSDOM('<div id="root"></div>',{url:'http://127.0.0.1:5173/'});
  for(const key of['window','document','localStorage','history','HTMLElement','HTMLInputElement','Image','Event','MouseEvent'])globalThis[key]=dom.window[key];
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.scrollTo=()=>{};globalThis.matchMedia=window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  ({createRoot}=await import('react-dom/client'));root=createRoot(document.getElementById('root'));
  user={id:'user-one',name:'Bạn cờ',account:true,email:'test@sanco.games'};
  globalThis.fetch=async(url,options={})=>{
    const pathname=new URL(String(url),window.location.href).pathname,body=options.body?JSON.parse(options.body):null;
    if(pathname==='/api/me')return json({user,providers:{google:true,facebook:true}});
    if(pathname==='/api/rooms'&&body)return json({room:roomFor(body.kind,body.capacity,body.ranked),token:'test-invitation'});
    if(pathname==='/api/rooms')return json({rooms:[]});if(pathname==='/api/history')return json({matches:[]});
    if(pathname==='/api/practice'&&body)return json({game:practiceView(createPractice(body.kind,boardSide(body.kind),'medium','00000000-0000-4000-8000-000000000001'))});
    if(pathname==='/api/practice')return json({games:[]});
    if(pathname==='/api/ratings')return json({ratings:Object.fromEntries(KINDS.map(kind=>[kind,ratingView()])),ranks:RANKS});
    if(pathname==='/api/matchmaking')return json({presets:matchPresets,ticket:{status:'idle'}});
    if(pathname.startsWith('/api/bots/'))return json({bots:botRoster(pathname.split('/').at(-1))});
    if(pathname.startsWith('/api/leaderboard/'))return json({players:[]});
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
  for(let i=0;i<30&&!document.querySelector('.online-workspace');i++)await settle();
  const close=document.querySelector('[aria-label="Đóng"]');if(close)await click(close);
  await click(document.querySelector(`[data-square="${ctlAt(3,4)}"]`));await click(document.querySelector(`[data-square="${ctlAt(6,4)}"]`));await click([...document.querySelectorAll('.ctl-action-options button')].find(b=>b.textContent.includes('Ném bom')));
  assert.ok(sent,'App must send the selected command');assert.equal(state.board[ctlAt(6,4)],null);assert.equal(state.board[ctlAt(3,4)],'rF');assert.equal(document.querySelector('.error-box'),null);
});
test('Commander 3D can be selected and safely falls back to the same playable board without WebGL',async()=>{
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();await click(document.querySelector('.collection-commander'));await click([...document.querySelectorAll('.mode-choices button')].find(b=>b.textContent.includes('Chơi với máy')));await click(document.querySelector('.practice-start'));
  const before=[...document.querySelectorAll('.flat-commander [data-square]')].map(c=>c.getAttribute('aria-label'));
  const button=[...document.querySelectorAll('.practice-display-switch button')].find(b=>b.textContent==='3D');assert.equal(button.disabled,false);
  const original=window.HTMLCanvasElement.prototype.getContext;window.HTMLCanvasElement.prototype.getContext=()=>null;
  try{await click(button);for(let i=0;i<30&&!document.querySelector('.flat-commander');i++)await settle();assert.ok(document.querySelector('.flat-commander'));assert.equal(document.querySelector('.ctl-board-3d'),null);assert.deepEqual([...document.querySelectorAll('.flat-commander [data-square]')].map(c=>c.getAttribute('aria-label')),before);assert.ok(document.querySelector('.practice-session'));assert.equal(document.querySelector('.startup-message'),null);}finally{window.HTMLCanvasElement.prototype.getContext=original;}
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
test('Guest can reach registration and login (with Google/Facebook) and must sign in to create a room',async()=>{
  user={id:'user-one',name:'Bạn cờ',account:false,email:null};
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click([...document.querySelectorAll('.quick-lobby-actions button')].find(b=>b.textContent.includes('Tạo phòng')));
  assert.equal(document.querySelector('[role="dialog"] h2').textContent,'Đăng nhập');
  assert.ok(document.querySelector('.social-google'),'Google (Gmail) login button must be rendered');
  assert.ok(document.querySelector('.social-facebook'),'Facebook login button must be rendered');
  await click(document.querySelector('[aria-label="Đóng"]'));
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
    await click([...document.querySelectorAll('.mode-choices button')].find(b=>b.textContent.includes('Chơi với máy')));
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

test('Rankings displays separate game ratings, real leaderboard empty state and all 12 bot profiles',async()=>{
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click([...document.querySelectorAll('.nav-item')].find(b=>b.textContent==='Xếp hạng'));
  const pool=document.querySelectorAll('.ranking-filters select')[1];
  await act(async()=>{pool.value='overall';pool.dispatchEvent(new Event('change',{bubbles:true}));});await settle();
  assert.equal(document.querySelectorAll('.rank-bots article').length,12);
  assert.match(document.querySelector('.rank-profile').textContent,/1000/);
  assert.match(document.querySelector('.rankings-page').textContent,/Chưa có người chơi hoàn tất 10 ván/);
  const selector=document.querySelector('.rankings-page select');
  await act(async()=>{selector.value='xiangqi';selector.dispatchEvent(new Event('change',{bubbles:true}));});await settle();
  assert.match(document.querySelector('.rank-profile').textContent,/Cờ tướng/);
  await click(document.querySelector('.rank-profile .button'));
  for(let i=0;i<30&&!document.querySelector('.practice-workspace');i++)await settle();
  assert.equal(document.querySelector('.practice-workspace').classList.contains('practice-xiangqi'),true);
  assert.equal(document.querySelector('.rank-mode-options button[aria-pressed="true"]').textContent,'Đấu rank');
  assert.equal(document.querySelector('.side-options'),null);
});

test('Public game links open the requested game and mode directly',async()=>{
  window.history.replaceState(null,'','/?game=xiangqi&mode=ranked&utm_source=community');
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  assert.equal(document.querySelector('.match-settings select').value,'xiangqi');
  assert.match(document.querySelector('.match-presets button[aria-pressed=true]').textContent,/10 phút/);

  await act(async()=>root.unmount());
  root=createRoot(document.getElementById('root'));
  window.history.replaceState(null,'','/?game=monopoly&mode=friends');
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  assert.equal(document.querySelector('.modal h2').textContent,'Tạo phòng');
  assert.equal(document.querySelector('.modal select').value,'monopoly');
});

test('Search uses the selected time control and cancellation returns to setup',async()=>{
  const fallback=globalThis.fetch;
  const commands=[];
  globalThis.fetch=async(url,options={})=>{
    const pathname=new URL(String(url),window.location.href).pathname;
    if(pathname==='/api/matchmaking'&&options.body){
      const action=JSON.parse(options.body);commands.push(action);
      return json({ticket:action.action==='search'?{status:'searching',kind:action.kind,preset:action.preset,waitedMs:0,eloWindow:25,botAvailable:false}:{status:'idle'}});
    }
    return fallback(url,options);
  };
  window.history.replaceState(null,'','/?game=chess&mode=ranked');
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click([...document.querySelectorAll('.match-presets button')].find(b=>b.textContent.includes('3 + 2')));
  await click(document.querySelector('.match-status .button'));
  assert.deepEqual(commands[0],{action:'search',kind:'chess',preset:'3-2'});
  assert.match(document.querySelector('.match-status [role="status"]').textContent,/±25 Elo/);
  assert.equal(document.querySelector('.match-settings select').disabled,true);
  await click(document.querySelector('.match-status .button'));
  assert.deepEqual(commands[1],{action:'cancel'});
  assert.equal(document.querySelector('.match-settings select').disabled,false);
});

test('A match found from search opens the authoritative online playing room with the selected clock',async()=>{
  const fallback=globalThis.fetch;
  const config=matchPresets.chess.find(preset=>preset.id==='10-0');
  const owner={id:user.id,name:user.name,mark:'w',elo:1012,ready:true,rematch:false};
  const guest={id:'user-two',name:'Đối thủ',mark:'b',elo:1030,ready:true,rematch:false};
  const game=newGame(600000,'ranked-round','chess');game.phase='playing';game.turnStartedAt=Date.now();
  const matched=publicRoom({id:'ABCD1234',kind:'chess',version:0,duration:600000,createdAt:Date.now(),owner,guest,game,ranked:true,matchmaking:config},user.id,Date.now());
  globalThis.fetch=async(url,options={})=>{
    const pathname=new URL(String(url),window.location.href).pathname;
    if(pathname==='/api/matchmaking'&&options.body)return json({ticket:{status:'matched',kind:'chess',preset:'10-0',roomId:matched.id}});
    if(pathname===`/api/rooms/${matched.id}`)return json({room:matched});
    return fallback(url,options);
  };
  window.history.replaceState(null,'','/?game=chess&mode=ranked');
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click(document.querySelector('.match-status .button'));
  for(let i=0;i<30&&!document.querySelector('.online-workspace');i++)await settle();
  assert.match(window.location.search,/room=ABCD1234/);
  assert.match(document.querySelector('.rank-room-label').textContent,/Cờ nhanh.*10\+0/);
  assert.match(document.querySelector('.opponent-player').textContent,/Đối thủ.*1030 Elo/);
});

test('My rank shows position beyond the top 50 in the selected pool',async()=>{
  const fallback=globalThis.fetch;
  globalThis.fetch=async(url,options={})=>{
    const parsed=new URL(String(url),window.location.href);
    if(parsed.pathname==='/api/leaderboard/chess'){
      assert.equal(parsed.searchParams.get('pool'),'rapid');
      return json({players:[],me:{...ratingView({elo:1200,games:10}),position:52,rankedPlayers:126}});
    }
    return fallback(url,options);
  };
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click([...document.querySelectorAll('.nav-item')].find(b=>b.textContent==='Xếp hạng'));
  assert.match(document.querySelector('.my-rank').textContent,/#52 trên 126 người chơi/);
});

test('Lobby skips the banner and the collapsible sidebar presents the top three and my rank',async()=>{
  const fallback=globalThis.fetch;
  const profile={...ratingView({elo:1200,games:10}),position:52,rankedPlayers:126};
  globalThis.fetch=async(url,options={})=>{
    if(new URL(String(url),window.location.href).pathname==='/api/leaderboard/chess')return json({
      me:profile,players:[1,2,3,4].map(position=>({...profile,position,name:`Người chơi ${position}`}))
    });
    return fallback(url,options);
  };
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  assert.equal(document.querySelector('.quick-lobby-logo,.topbar-brand-emblem'),null);
  assert.equal(document.querySelectorAll('.sidebar-ranks-list li').length,3);
  assert.match(document.querySelector('.sidebar-ranks-me').textContent,/#52/);
  await click(document.querySelector('[aria-label="Thu gọn thanh bên"]'));
  assert.equal(localStorage.getItem('sc-sidebar-collapsed'),'true');assert.equal(document.querySelector('.sidebar-ranks'),null);
  await click(document.querySelector('[aria-label="Mở rộng thanh bên"]'));
  await click(document.querySelector('.sidebar-ranks-me'));
  for(let i=0;i<30&&!document.querySelector('.rank-tiers');i++)await settle();
  const badges=[...document.querySelectorAll('.rank-tiers .rank-badge')];
  assert.equal(badges.length,7);assert.equal(new Set(badges.map(badge=>badge.className)).size,7);
});

test('Matchmaking offers retry when the API is missing and restores the search form when it comes back',async()=>{
  const fallback=globalThis.fetch;
  let attempts=0;
  globalThis.fetch=async(url,options={})=>{
    if(new URL(String(url),window.location.href).pathname==='/api/matchmaking'&&++attempts===1){
      return new Response(JSON.stringify({error:'Không tìm thấy API.'}),{status:404});
    }
    return fallback(url,options);
  };
  window.history.replaceState(null,'','/?game=xiangqi&mode=ranked');
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  for(let i=0;i<30&&!document.querySelector('.match-status [role="alert"]');i++)await settle();
  assert.match(document.querySelector('.match-status [role="alert"]').textContent,/Máy chủ tìm trận chưa sẵn sàng/);
  await click([...document.querySelectorAll('.match-actions button')].find(b=>b.textContent==='Tải lại'));
  assert.equal(document.querySelector('.match-settings select').value,'xiangqi');
  assert.equal(document.querySelector('.match-actions button[type="submit"]').disabled,false);
});

test('Lesson deep links let a visitor try a move, review the result, and switch games',async()=>{
  const {default:Lessons}=await vite.ssrLoadModule('/src/Lessons.tsx');
  window.history.replaceState(null,'','/bi-kip?mon=co-vua&chuong=chieu-het-hang-cuoi');
  await act(async()=>root.render(createElement(Lessons)));await settle();
  assert.equal(document.querySelectorAll('.lesson-chapters button').length,4);
  assert.match(document.querySelector('#lesson-title').textContent,/Chiếu hết ở hàng cuối/);
  await click(document.querySelector('[data-square="56"]'));
  await click(document.querySelector('[data-square="0"]'));
  assert.equal(document.querySelector('.lesson-explanation>strong').textContent,'Chiếu hết');
  assert.ok(document.querySelector('.flat-cell.in-check[data-square="6"]'));
  await click(document.querySelector('[aria-label="Về đầu ví dụ"]'));
  assert.equal(document.querySelector('.lesson-explanation>strong').textContent,'Thử trên bàn cờ');
  await click([...document.querySelectorAll('.lesson-games button')].find(button=>button.textContent==='Cờ tướng'));
  assert.ok(document.querySelector('.flat-xiangqi'));
  assert.equal(new URL(window.location.href).searchParams.get('mon'),'co-tuong');
});

test('Ranked bot setup submits its selected profile, identifies the bot and disables undo/new game',async()=>{
  const original=globalThis.fetch;let submitted;
  globalThis.fetch=async(url,options={})=>{
    if(String(url).endsWith('/api/practice')&&options.body){
      submitted=JSON.parse(options.body);const g=createPractice(submitted.kind,boardSide(submitted.kind),'medium','00000000-0000-4000-8000-000000000001');
      g.ranked=true;g.bot=botRoster(g.kind)[4];g.playerElo=1000;
      return json({game:practiceView(g)});
    }
    return original(url,options);
  };
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click(document.querySelector('.collection-chess'));
  await click([...document.querySelectorAll('.mode-choices button')].find(b=>b.textContent.includes('Đấu xếp hạng')));
  await click([...document.querySelectorAll('.match-status button')].find(b=>b.textContent==='Đấu bot'));
  const selector=document.querySelector('.practice-setup select');
  await act(async()=>{selector.value='chess-bot-1000';selector.dispatchEvent(new Event('change',{bubbles:true}));});await settle();
  await click(document.querySelector('.practice-start'));
  assert.equal(submitted.ranked,true);assert.equal(submitted.botId,'chess-bot-1000');
  assert.match(document.querySelector('.opponent-player').textContent,/Bách Diệp.*BOT.*1000 Elo/);
  const actions=[...document.querySelectorAll('.practice-session button')];
  assert.equal(actions.find(b=>b.textContent==='Đi lại').disabled,true);
  assert.equal(actions.find(b=>b.textContent==='Ván mới').disabled,true);
});

test('Phone portrait blocks Monopoly, rotation unlocks it, and optional orientation persists separately per game',async()=>{
  let portrait=true,back=false;const listeners=new Set();
  globalThis.matchMedia=window.matchMedia=query=>({get matches(){return query==='(orientation: portrait)'?portrait:true;},addEventListener(event,fn){listeners.add(fn);},removeEventListener(event,fn){listeners.delete(fn);}});
  const render=kind=>act(async()=>root.render(createElement(MobileOrientation,{kind,onBack:()=>{back=true;}})));
  await render('monopoly');await settle();
  assert.ok(document.querySelector('.orientation-guard'));assert.equal(document.getElementById('root').inert,true);
  assert.equal(document.querySelector('.orientation-toolbar input'),null);
  assert.equal([...document.querySelectorAll('.orientation-guard button')].some(b=>b.textContent==='Tiếp tục chơi dọc'),false);
  await act(async()=>{portrait=false;for(const fn of listeners)fn();});
  assert.equal(document.querySelector('.orientation-guard'),null);assert.equal(document.getElementById('root').inert,false);
  await act(async()=>{portrait=true;for(const fn of listeners)fn();});
  await click([...document.querySelectorAll('.orientation-guard button')].find(b=>b.textContent==='Về chọn cờ'));assert.equal(back,true);
  await render('chess');await settle();assert.equal(document.querySelector('.orientation-guard'),null);
  await click(document.querySelector('.orientation-toolbar input'));
  assert.equal(localStorage.getItem('sc-landscape-chess'),'on');assert.ok(document.querySelector('.orientation-guard'));
  await click([...document.querySelectorAll('.orientation-guard button')].find(b=>b.textContent==='Tiếp tục chơi dọc'));
  assert.equal(document.querySelector('.orientation-guard'),null);assert.equal(localStorage.getItem('sc-landscape-chess'),'off');
  localStorage.setItem('sc-landscape-chess','on');await render('caro');await settle();assert.equal(document.querySelector('.orientation-guard'),null);
  await render('chess');await settle();assert.ok(document.querySelector('.orientation-guard'));
  await render('caro');await settle();assert.equal(document.getElementById('root').inert,false);
});

test('Creating a Monopoly room defaults to casual mode, supports 8 players, and renders right-side avatars',async()=>{
  const fallback=globalThis.fetch;let createdBody=null;
  globalThis.fetch=async(url,options={})=>{
    const pathname=new URL(String(url),window.location.href).pathname;
    if(pathname==='/api/rooms'&&options.body){createdBody=JSON.parse(options.body);return json({room:roomFor(createdBody.kind,createdBody.capacity,createdBody.ranked),token:'test-invitation'});}
    return fallback(url,options);
  };
  await act(async()=>root.render(createElement(Boundary,null,createElement(App))));await settle();
  await click(document.querySelector('.collection-monopoly'));
  await click([...document.querySelectorAll('.mode-choices button')].find(b=>b.textContent.includes('Chơi với bạn')));
  assert.match(document.querySelector('.casual-room-badge').textContent,/Chế độ giải trí/);
  assert.equal(document.querySelector('.rank-room-toggle'),null);
  assert.equal(document.querySelector('.room-side-options'),null);
  const capButtons=[...document.querySelectorAll('.capacity-grid-8 button')];
  assert.equal(capButtons.length,7);
  await click(capButtons.find(b=>b.textContent==='8 người'));
  await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await settle();
  assert.equal(createdBody.ranked,false);
  assert.equal(createdBody.side,'random');
  assert.equal(createdBody.capacity,8);
  assert.match(document.querySelector('.rank-room-label').textContent,/Chế độ giải trí/);
  assert.equal(document.querySelectorAll('.practice-aside .party-roster-vertical .party-player-card').length,8);
  assert.equal(document.querySelectorAll('.practice-aside .party-roster-vertical .party-avatar').length,8);
  assert.equal(document.querySelectorAll('.party-lobby-seats .party-avatar').length,8);
});

test('Monopoly center buy decision and live auction modal render quick bid steps and skip action',async()=>{
  const {default:EstateAuctionModal}=await vite.ssrLoadModule('/src/EstateAuctionModal.tsx');
  const game=createPractice('monopoly','R','medium','auction-ui-test');
  game.party.players[0].position=1;game.party.stage='buy';
  const sent=[];
  await act(async()=>root.render(createElement(EstateAuctionModal,{state:game.party,mySide:'R',turn:'R',playerNames:{R:'Minh',G:'Nam'},legal:[{from:null,to:1,action:'buy'},{from:null,to:-1,action:'auction'},{from:null,to:-1,action:'skip_buy'}],enabled:true,onMove:m=>sent.push(m)})));await settle();
  assert.ok(document.querySelector('.estate-buy-center'),'Center buy modal must appear on unowned land');
  await click(document.querySelector('.estate-skip-btn'));
  assert.equal(sent[0].command,'skip_buy');

  game.party.stage='auction';
  game.party.auction={lot:1,bid:100,leader:'G',passed:[],returnSide:'R',history:[{side:'G',action:'bid',amount:100,at:1}]};
  await act(async()=>root.render(createElement(EstateAuctionModal,{state:game.party,mySide:'R',turn:'R',playerNames:{R:'Minh',G:'Nam'},legal:[{from:null,to:-1,action:'bid'},{from:null,to:-1,action:'pass_bid'}],enabled:true,onMove:m=>sent.push(m)})));await settle();
  assert.ok(document.querySelector('.estate-auction-center'),'Center auction modal must appear');
  const stepButtons=[...document.querySelectorAll('.estate-step-btn')];
  assert.equal(stepButtons.length,4);
  await click(stepButtons[1]); // +20 tr => 120 tr
  assert.equal(sent[1].command,'bid');
  assert.equal(sent[1].details.amount,120);
});
