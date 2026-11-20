import {POOL_LABELS} from './rating-types';
import MobileOrientation from './MobileOrientation';
import {EloChange} from './Rankings';
import {useBoardTheme} from './BoardAppearance';
import {partyRoll} from './three/party-layout.ts';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,BookOpen,Check,Copy,Flag,History,RotateCcw,UserRound,Wifi,WifiOff} from 'lucide-react';
import type {Room} from './types';
import {META,RULE_TEXT,type PracticeMove,type PartyState} from './practice-types';
import {PartyBoard,PartyControls,COLORS,COLOR_NAMES} from './PartyBoard';
import {lobbySeats,estateModePreview} from './estate-rules';

const AVATAR_BG:Record<string,string>={
  R:'linear-gradient(145deg,#ef4444,#991b1b)',
  G:'linear-gradient(145deg,#10b981,#065f46)',
  Y:'linear-gradient(145deg,#f59e0b,#92400e)',
  B:'linear-gradient(145deg,#3b82f6,#1e3a8a)',
  P:'linear-gradient(145deg,#a855f7,#581c87)',
  O:'linear-gradient(145deg,#fb923c,#9a3412)',
  C:'linear-gradient(145deg,#06b6d4,#155e75)',
  K:'linear-gradient(145deg,#ec4899,#9d174d)'
};
const AVATAR_ORDER=['R','G','Y','B','P','O','C','K'];

function PlayerAvatar({side,name,active=true,turn=false,online=false,size='md'}:{side:string;name?:string;active?:boolean;turn?:boolean;online?:boolean;size?:'sm'|'md'}){
  const empty=!name;
  const idx=Math.max(0,AVATAR_ORDER.indexOf(side));
  const initial=name?name.trim().slice(0,1).toUpperCase():'';
  const style=idx%4;
  return <span
    className={`party-avatar party-avatar-${size} ${empty?'is-empty':''} ${turn?'is-turn':''} ${!active?'is-out':''}`}
    style={empty?undefined:{background:AVATAR_BG[side]||COLORS[side]||'#516b49',borderColor:turn?'#fde047':COLORS[side]||'#8c9b6e'}}
    aria-hidden="true"
  >
    {empty
      ?<UserRound size={size==='sm'?15:18}/>
      :<svg viewBox="0 0 40 40" className="party-avatar-svg">
        <path d="M9 36 C9 26.5 31 26.5 31 36 Z" fill="#ffffff" fillOpacity=".92"/>
        <circle cx="20" cy="18.5" r="6.8" fill="#fff7e6"/>
        <circle cx="17.8" cy="18" r="1" fill="#1e293b"/>
        <circle cx="22.2" cy="18" r="1" fill="#1e293b"/>
        <path d="M18.2 21 Q20 22.6 21.8 21" fill="none" stroke="#1e293b" strokeWidth="1.1" strokeLinecap="round"/>
        {style===0&&<g>
          <rect x="11.5" y="11" width="17" height="2.4" rx="1.2" fill="#18181b"/>
          <rect x="14.2" y="4.5" width="11.6" height="7" rx="1.4" fill="#18181b"/>
          <rect x="14.2" y="9.2" width="11.6" height="1.8" fill="#facc15"/>
        </g>}
        {style===1&&<path d="M13 12.2 L14.5 6.5 L17.6 9.8 L20 5.5 L22.4 9.8 L25.5 6.5 L27 12.2 Z" fill="#facc15" stroke="#78350f" strokeWidth=".9" strokeLinejoin="round"/>}
        {style===2&&<g>
          <path d="M13 13 C13 7 27 7 27 13 Z" fill="#facc15" stroke="#78350f" strokeWidth=".9"/>
          <path d="M19 4.5 Q22 5.5 21.5 9 L18.5 9 Z" fill="#fef08a"/>
        </g>}
        {style===3&&<g>
          <path d="M12.5 11.5 Q20 6.5 27.5 11.5 L26 13.5 L14 13.5 Z" fill="#f8fafc" stroke="#1e293b" strokeWidth=".9"/>
          <rect x="13" y="11.8" width="14" height="1.8" rx=".9" fill="#facc15"/>
        </g>}
      </svg>}
    {!empty&&<span className="party-avatar-badge" style={{background:COLORS[side]||'#398868'}}>{initial}</span>}
    {online&&!empty&&<i className="party-avatar-online"/>}
  </span>;
}

export default function PartyRoom({room,busy,connected,latency,archived,onBack,onAction,onInvite,onResign}:{room:Room;busy:boolean;connected:boolean;latency?:number|null;archived:boolean;onBack:()=>void;onAction:(action:string,move?:number|PracticeMove)=>void;onInvite:(rotate?:boolean)=>void;onResign:()=>void}){
  const [boardTheme]=useBoardTheme();
  const [now,setNow]=useState(Date.now()),[rules,setRules]=useState(false),[step,setStep]=useState<number|null>(null),g=room.game,meta=META[room.kind],party=g.party!,players=room.players||[],moves=g.moves as any[];
  const state:PartyState=step===null?party:step===0?g.initialParty!:moves[step-1]?.party||party;
  const offset=useRef(room.serverNow-Date.now());useEffect(()=>{offset.current=room.serverNow-Date.now();},[room.serverNow]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer);},[]);
  const remaining=(side:string)=>{const ms=g.remaining[side]-(g.phase==='playing'&&g.turn===side&&g.turnStartedAt!==null?Math.max(0,now+offset.current-g.turnStartedAt):0),seconds=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
  const turnLimitSec=Math.round((g.turnLimitMs||30000)/1000);
  const turnSec=g.phase==='playing'&&g.turnDeadline!=null?Math.max(0,Math.min(turnLimitSec,Math.ceil((g.turnDeadline-(now+offset.current))/1000))):null;
  const [visualBusy,setVisualBusy]=useState(false);
  const canMove=!visualBusy&&!busy&&!archived&&step===null&&g.phase==='playing'&&g.turn===room.me.mark;
  const playerNames=Object.fromEntries(players.map(s=>[s.mark,s.name]));
  const mode=party.profile;
  const modePreview=estateModePreview(Math.max(2,players.length),room.estateMode||'classic');
  const roster=<div className={`party-roster ${room.kind==='monopoly'?'party-roster-vertical':''}`}>{state.players.map(player=>{const seat=players.find(s=>s.mark===player.side);const isTurn=g.turn===player.side&&g.phase==='playing';const isMe=room.me.mark===player.side;const showTurnTimer=room.kind==='monopoly'&&isTurn&&turnSec!==null;return <article key={player.side} className={`party-player-card ${isTurn?'active-turn':''} ${!player.active?'out':''}`}><PlayerAvatar side={player.side} name={seat?.name} active={player.active} turn={isTurn} online={seat?.online}/><div className="party-player-meta"><strong className="party-player-name"><span>{seat?.name||'Ghế trống'}</span>{isMe&&<em className="party-me-tag">Bạn</em>}</strong><small className="party-player-sub"><i className="party-side-dot" style={{background:COLORS[player.side]}}/>{COLOR_NAMES[player.side]} · {room.kind==='monopoly'?`${player.cash.toLocaleString('vi-VN')} tr`:`${player.tokens.filter(v=>v===57).length}/4 về đích`}{seat?.elo!=null?` · ${seat.elo} Elo`:''}{!player.active?' · Đã dừng':''}</small>{showTurnTimer&&<div className="party-turn-bar" aria-hidden="true"><span style={{width:`${Math.round((turnSec!/turnLimitSec)*100)}%`}} className={turnSec!<=5?'is-danger':turnSec!<=10?'is-warn':''}/></div>}</div><div className="party-clock-col">{showTurnTimer&&<span className={`party-turn-pill ${turnSec!<=5?'is-danger':turnSec!<=10?'is-warn':''}`} role="timer">{turnSec}s</span>}<div className="party-clock">{remaining(player.side)}</div></div></article>;})}</div>;
  const estateImmersive=room.kind==='monopoly'&&party.edition==='vn-v2'&&g.phase!=='waiting';
  const estateHudActions=<>{g.phase==='playing'&&step===null&&!archived&&<section className="panel party-action-panel"><PartyControls kind={room.kind} state={party} mySide={room.me.mark} legal={g.legal||[]} enabled={canMove} animating={visualBusy} onMove={move=>onAction('move',move)}/></section>}{estateImmersive&&step!==null&&<div className="estate-replay-tools"><input type="range" min={0} max={moves.length} value={step} aria-label="Chọn lượt xem lại" onChange={e=>setStep(+e.target.value)}/><button className="button" onClick={()=>setStep(null)}>Về ván</button></div>}</>;
  const estateHudMenu=<>{!estateImmersive&&room.kind==='monopoly'&&g.phase!=='waiting'&&roster}
    {g.phase==='waiting'&&!archived&&<section className="panel lobby-panel"><h2>Mời bạn ({players.length}/{room.capacity})</h2><div className="party-lobby-seats">{lobbySeats(players,state.sides,room.capacity||2).map(({side,seat})=><div key={side}><PlayerAvatar side={side} name={seat?.name} online={seat?.online} size="sm"/><strong>{seat?.name||'Ghế trống'}</strong><small className={seat?.ready?'seat-ready':''}>{seat?seat.ready?'Sẵn sàng':'Đang chờ':'Chưa có người'}</small></div>)}</div>{room.me.role==='owner'&&<><button className="button full" disabled={busy} onClick={()=>onInvite()}><Copy size={16}/>Sao chép link mời</button><button className="text-button invite-rotate" disabled={busy} onClick={()=>onInvite(true)}><RotateCcw size={14}/>Tạo link mới</button></>}<button className={`button full ${room.me.ready?'button-secondary':''}`} disabled={busy||(room.kind!=='monopoly'&&players.length!==room.capacity)} onClick={()=>onAction('ready')}><Check size={17}/>{room.me.ready?'Hủy sẵn sàng':'Sẵn sàng'}</button>{room.kind==='monopoly'&&room.me.role==='owner'&&<button className="button full estate-start-current" disabled={busy||players.length<2||players.some(player=>!player.ready)} onClick={()=>onAction('start')}>Bắt đầu với {players.length} người</button>}<p className="room-helper">{room.kind==='monopoly'?'Chủ phòng có thể bắt đầu từ 2 người khi tất cả đã sẵn sàng; không cần lấp đầy ghế.':`Cần đủ ${room.capacity} người để bắt đầu.`}</p></section>}
    {g.phase==='playing'&&!archived&&<section className="panel"><button className="text-button resign-link" disabled={busy||!party.players.find(p=>p.side===room.me.mark)?.active} onClick={onResign}><Flag size={16}/>Rời ván (nhận thua)</button><p className="clock-note">Mất mạng vẫn tính giờ. Vào lại bằng đúng tài khoản hoặc trình duyệt.</p></section>}
    {g.phase==='finished'&&<section className="panel result-panel"><EloChange change={g.ratingChanges?.[room.me.mark]}/><h2>{g.result?.winner===null?'Hòa':g.result?.winner===room.me.mark?'Bạn thắng':'Ván đã kết thúc'}</h2><p>{g.result?.winner?`Thắng: ${players.find(s=>s.mark===g.result?.winner)?.name||COLOR_NAMES[g.result.winner]}`:'Không phân thắng bại'}</p>{!archived&&<button className="button full" disabled={busy} onClick={room.matchmaking?onBack:()=>onAction('rematch')}><RotateCcw size={16}/>{room.matchmaking?'Tìm trận mới':room.me.rematch?'Hủy mời đấu lại':'Đấu lại'}</button>}<button className="button button-secondary full" onClick={()=>setStep(0)}><History size={16}/>Xem lại</button>{!room.matchmaking&&<p className="room-helper">Đấu lại khi tất cả đồng ý.</p>}</section>}
    <details className="panel compact-moves"><summary>Lượt chơi <span>{moves.length}</span></summary><div className="party-log">{moves.slice().reverse().map((move,i)=><p key={i}>{COLOR_NAMES[move.side]} · {move.label}</p>)}</div></details>
    </>;
  return <div inert={estateImmersive} data-board-theme={boardTheme} className={`practice-workspace practice-${room.kind} party-room-workspace ${g.phase!=='waiting'?'board-unified-play':''}`}><MobileOrientation kind={room.kind} onBack={onBack}/><p className="rank-room-label">{room.matchmaking?`Xếp hạng · ${POOL_LABELS[room.matchmaking.pool]} · ${room.matchmaking.minutes}+${room.matchmaking.increment}`:room.ranked?'Xếp hạng · Elo chung':'Chế độ giải trí · Không tính Elo'}</p><div className="practice-breadcrumb"><button className="text-button" onClick={onBack}><ArrowLeft size={16}/>{room.matchmaking&&room.game.phase==='finished'&&!archived?'Tìm trận':'Phòng của tôi'}</button><span>{connected?<Wifi size={14}/>:<WifiOff size={14}/>} {connected?latency!=null?`${latency} ms`:'Đã kết nối':'Đang nối lại…'}</span></div><div className="room-title"><div><span className="eyebrow">Phòng {room.id} · {players.length}/{room.capacity} người</span><h1>{meta.name}</h1><p>{meta.short}</p></div><button className="button button-secondary button-small" onClick={()=>setRules(!rules)} aria-expanded={rules}><BookOpen size={16}/>Luật</button></div>{rules&&<section className="panel room-rule-expanded"><p>{RULE_TEXT[room.kind]}</p></section>}
    {room.kind==='monopoly'&&<section className="estate-mode-strip" aria-label="Luật Tỷ phú đang áp dụng"><strong>{g.phase==='waiting'?modePreview.name:mode?.name||'Luật phòng hiện tại'}</strong><span>{g.phase==='waiting'?modePreview.description:mode?`Vòng ${Math.min(party.round,mode.roundLimit||party.round)}${mode.roundLimit?`/${mode.roundLimit}`:''} · Lương cơ bản ${mode.salary} tr · ${mode.initialLots} lô khởi nghiệp/người`:'Ván cũ giữ nguyên luật'}</span>{party.market&&<small><b>{party.market.name}</b> · {party.market.description} · Đến hết vòng {party.market.endRound}</small>}</section>}
    <div className="practice-layout"><section className="practice-table"><div className="party-room-stage"><PartyBoard kind={room.kind} immersive={estateImmersive} hudPlayers={estateImmersive?roster:undefined} hudActions={estateHudActions} hudMenu={estateHudMenu} onExit={onBack} hudStatus={step!==null?'Đang xem lại':g.phase==='finished'?'Ván đã kết thúc':(g.turn===room.me.mark?'Lượt của bạn':'Lượt '+(playerNames[g.turn]||COLOR_NAMES[g.turn]))+(turnSec!==null?' · '+turnSec+'s':'')} state={state} mySide={room.me.mark} turn={g.turn} playerNames={playerNames} legal={g.legal||[]} enabled={canMove} onMove={move=>onAction('move',move)} gameKey={g.id} animate={step===null} onAnimatingChange={setVisualBusy} {...partyRoll(moves,step??moves.length)}/></div>{room.kind!=='monopoly'&&roster}<p className="party-summary" role="status">{step!==null?`Xem lại ${step}/${moves.length}`:g.phase==='waiting'?'Chờ mọi người sẵn sàng':g.phase==='finished'?'Ván đã kết thúc':`${g.turn===room.me.mark?'Đến lượt bạn':`Lượt ${players.find(s=>s.mark===g.turn)?.name||COLOR_NAMES[g.turn]}`}${room.kind==='monopoly'&&turnSec!==null?` · còn ${turnSec}s`:''}`}</p>{step!==null&&<div className="practice-replay"><input type="range" min={0} max={moves.length} value={step} aria-label="Chọn lượt xem lại" onChange={e=>setStep(+e.target.value)}/><button className="text-button" onClick={()=>setStep(null)}>Về ván</button></div>}</section>{!estateImmersive&&<aside className="practice-aside">{estateHudActions}{estateHudMenu}</aside>}</div></div>;
}
