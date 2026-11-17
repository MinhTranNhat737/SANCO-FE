import BoardAppearance,{useBoardTheme} from './BoardAppearance';
import EstateControls from './EstateControls';
import VietnamEstateBoard,{EstateInspector} from './VietnamEstateBoard';
import {isVietnam} from './estate-data';
import type {DiceRoll} from './three/dice-motion.ts';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {Box,Layers,RotateCcw,Dice5,Flag} from 'lucide-react';
import {moveRequest,type GameKind,type PartyState,type PracticeMove} from './practice-types';
import Board3DBoundary from './Board3DBoundary';
import {PARTY_SIDES as SIDES,PARTY_COLORS as COLORS,CITIES,GROUP_COLORS,LUDO_PATH as PATH,LUDO_SAFE as SAFE,groupOf,estateCell as ring} from './three/party-layout.ts';
import './party.css';
export {COLORS,CITIES};
const ScenePartyBoard=lazy(()=>import('./ScenePartyBoard'));
export const COLOR_NAMES:Record<string,string>={R:'Đỏ',G:'Xanh lá',Y:'Vàng',B:'Xanh dương'};

const PIP_LAYOUT:Record<number,number[]>={
  1:[4],
  2:[0,8],
  3:[0,4,8],
  4:[0,2,6,8],
  5:[0,2,4,6,8],
  6:[0,2,3,5,6,8]
};

function PipDie({value,className=''}:{value:number;className?:string}){
  const active=PIP_LAYOUT[value]||PIP_LAYOUT[1];
  return <span className={`pip-die pip-die-${value} ${className}`} aria-hidden="true">
    {Array.from({length:9},(_,i)=><i key={i} className={active.includes(i)?'pip-on':''}/>)}
  </span>;
}

export function previewParty(kind?:GameKind):PartyState{return kind==='monopoly'?{edition:'vn-v2',sides:SIDES.slice(0,2),players:SIDES.slice(0,2).map(side=>({side,active:true,tokens:[-1,-1,-1,-1],position:0,cash:3000,jail:0,laps:0,jailCards:0})),stage:'roll',dice:null,diceValues:[],rolls:0,round:1,property:Array(48).fill(null),houses:Array(48).fill(0),mortgaged:Array(48).fill(false),loans:[],pending:null,auction:null,ledger:[],message:'Tiền trong game · Đơn vị triệu',debt:null}:{sides:SIDES.slice(0,2),players:SIDES.slice(0,2).map(side=>({side,active:true,tokens:[-1,-1,-1,-1],position:0,cash:1500,jail:0})),stage:'roll',dice:null,rolls:0,round:1,property:Array(20).fill(null),houses:Array(20).fill(0),message:'',debt:null};}

const OWNER_BG:Record<string,string>={R:'#f2b7ae',G:'#a8dec5',Y:'#f6df98',B:'#aecdf0'};
function FlatPartyBoard({kind,state,mySide,selected,onSelect}:{kind:GameKind;state:PartyState;mySide:string;selected?:number|null;onSelect?:(index:number)=>void}){
  if(kind==='monopoly')return <div className="party-board estate-board"><svg viewBox="0 0 600 600" role="img" aria-label="Bàn Tỷ phú mini 20 ô" preserveAspectRatio="xMidYMid meet"><rect className="board-svg-base" width="600" height="600" rx="0" fill="#182f29"/><rect className="board-svg-center" x="106" y="106" width="388" height="388" rx="14" fill="#213f33" stroke="#678461" strokeWidth="2"/>{CITIES.map((name,i)=>{const [r,c]=ring(i),owner=state.property[i],lvl=state.houses[i]||0,special=[0,3,5,8,10,13,15,18].includes(i),isSel=selected===i,ownerColor=owner?COLORS[owner]:'';return <g key={i} data-owned={Boolean(owner)||isSel} role="button" tabIndex={0} aria-label={`Xem ${name}`} onClick={()=>onSelect?.(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.(i);}}} style={{cursor:'pointer'}}><rect className={isSel?'board-svg-selected':'board-svg-lot'} x={c*100+3} y={r*100+3} width="94" height="94" rx="5" fill={isSel?'#ece2b1':owner?OWNER_BG[owner]||'#e0dcc0':special?'#b9bb91':'#e0dcc0'} stroke={isSel?'#f5e49c':owner?ownerColor:'#314e3a'} strokeWidth={isSel?3.5:owner?3:2}/><rect x={c*100+5} y={r*100+5} width="90" height="11" rx="3" fill={special?'#9aa175':GROUP_COLORS[groupOf(i)]}/><text x={c*100+50} y={r*100+34} textAnchor="middle" fill="#1d3324" fontSize="12" fontWeight="700">{name}</text><text x={c*100+50} y={r*100+51} textAnchor="middle" fill="#324a32" fontSize="11">{special?i===0?'+200':i===5?'−120':i===10?'Nghỉ 1 lượt':i===15?'Tự do':'?':`${100+i*20} · G${groupOf(i)+1}`}</text>{owner&&<rect x={c*100+6} y={r*100+88} width="88" height="6" rx="2" fill={ownerColor}/>} {lvl>0&&<g><rect x={c*100+50-(14+lvl*6)} y={r*100+82-(12+lvl*4)} width={(14+lvl*6)*2} height={12+lvl*4} rx="3" fill="#f7eed2" stroke={ownerColor||'#416e42'} strokeWidth="2"/><path d={`M${c*100+47-(14+lvl*6)} ${r*100+82-(12+lvl*4)} L${c*100+50} ${r*100+74-(12+lvl*5.5)} L${c*100+53+(14+lvl*6)} ${r*100+82-(12+lvl*4)} Z`} fill={ownerColor||'#416e42'}/><text x={c*100+50} y={r*100+79} textAnchor="middle" fill="#182d20" fontSize={10+lvl} fontWeight="800">{lvl===5?'★KS':`CẤP ${lvl}`}</text></g>}</g>;})}<text className="board-svg-label" x="300" y="260" textAnchor="middle" fill="#e0d7aa" fontSize="29" fontFamily="Georgia,serif">TỶ PHÚ MINI</text><text className="board-svg-label" x="300" y="294" textAnchor="middle" fill="#b7c9a7" fontSize="16">Vòng {state.round} / 30</text><rect x="262" y="320" width="76" height="76" rx="17" fill="#e4dec4"/><text className="board-svg-label" x="300" y="371" textAnchor="middle" fill="#30452d" fontSize="39">{state.dice||'?'}</text>{state.players.filter(p=>p.active).map((p,i)=>{const[r,c]=ring(p.position);return <g key={p.side}><circle cx={c*100+20+i*18} cy={r*100+83} r="9" fill={COLORS[p.side]} stroke={p.side===mySide?'#fff4cb':'#21392c'} strokeWidth="3"/><text x={c*100+20+i*18} y={r*100+87} textAnchor="middle" fill="#13291e" fontSize="9" fontWeight="bold">{i+1}</text></g>;})}</svg></div>;
  return <div className="party-board ludo-board"><svg viewBox="0 0 600 600" role="img" aria-label="Bàn Cá ngựa Ludo, 52 ô vòng ngoài và bốn đường về đích" preserveAspectRatio="xMidYMid meet"><rect className="board-svg-base" width="600" height="600" rx="0" fill="#e5e0c6"/>{SIDES.map((side,i)=>{const r=i>1?9:0,c=i===1||i===2?9:0;return <g key={side}><rect x={c*40+5} y={r*40+5} width="230" height="230" rx="17" fill={COLORS[side]}/><rect className="board-svg-home" x={c*40+30} y={r*40+30} width="180" height="180" rx="28" fill="#f2efd9"/>{[0,1,2,3].map(t=><circle key={t} cx={c*40+75+(t%2)*90} cy={r*40+75+Math.floor(t/2)*90} r="25" fill={COLORS[side]} opacity=".3"/>)}</g>;})}{PATH.map(([r,c],i)=><g key={i}><rect className={i%13===0?undefined:'board-svg-path'} x={c*40+1} y={r*40+1} width="38" height="38" fill={i%13===0?COLORS[SIDES[Math.floor(i/13)]]:'#fffbe7'} stroke="#93a28a" strokeWidth="1"/>{SAFE.includes(i)&&<text x={c*40+20} y={r*40+28} textAnchor="middle" className="board-svg-path-label" fontSize="24" fill="#5d7152">☆</text>}</g>)}{SIDES.map((side,i)=>Array.from({length:6},(_,n)=>{const r=i===0||i===2?7:i===1?n+1:13-n,c=i===1||i===3?7:i===0?n+1:13-n;return <rect key={side+n} x={c*40+1} y={r*40+1} width="38" height="38" fill={COLORS[side]} stroke="#e6e4cc" strokeWidth="1"/>;}))}<path d="M240 240H360V360H240Z" fill="#e7ddaf"/><path d="M240 240L300 300L240 360Z" fill={COLORS.R}/><path d="M240 240L300 300L360 240Z" fill={COLORS.G}/><path d="M360 240L300 300L360 360Z" fill={COLORS.Y}/><path d="M240 360L300 300L360 360Z" fill={COLORS.B}/>{state.players.filter(p=>p.active).flatMap(player=>player.tokens.map((pos,token)=>{
    const index=SIDES.indexOf(player.side),homeR=index>1?9:0,homeC=index===1||index===2?9:0;
    let x:number,y:number;
    if(pos<0){x=homeC*40+75+(token%2)*90;y=homeR*40+75+Math.floor(token/2)*90;}
    else if(pos===57){x=275+(token%2)*35;y=275+Math.floor(token/2)*35;}
    else if(pos<52){const[r,c]=PATH[(pos+index*13)%52];x=c*40+20+(token%2?4:-4);y=r*40+20+(token>1?4:-4);}
    else{const n=pos-52,r=index===0||index===2?7:index===1?n+1:13-n,c=index===1||index===3?7:index===0?n+1:13-n;x=c*40+20;y=r*40+20;}
    return <g key={player.side+token}><circle cx={x} cy={y+3} r="15" fill="#20322866"/><circle cx={x} cy={y} r="15" fill={COLORS[player.side]} stroke={player.side===mySide?'#fff5d4':'#263e2d'} strokeWidth="3"/><text x={x} y={y+5} fontSize="13" textAnchor="middle" fill="#172a1d" fontWeight="bold">{token+1}</text></g>;
  }))}</svg></div>;
}

export function PartyBoard({kind,state,mySide,legal=[],enabled=false,onMove,gameKey='preview',animate=true,lastDie=null,rollKey='',rolls=[],onAnimatingChange}:{kind:GameKind;state:PartyState;mySide:string;legal?:PracticeMove[];enabled?:boolean;onMove?:(move:PracticeMove)=>void;gameKey?:string;animate?:boolean;lastDie?:number|null;rollKey?:string;rolls?:DiceRoll[];onAnimatingChange?:(busy:boolean)=>void}){
  const [boardTheme]=useBoardTheme();
  const [view,setView]=useState<'3d'|'2d'>(()=>typeof window!=='undefined'&&'WebGLRenderingContext' in window&&localStorage.getItem('sc-party-view')!=='2d'?'3d':'2d'),[top,setTop]=useState(false),[reset,setReset]=useState(0),[failed,setFailed]=useState(false);
  const [rolling,setRolling]=useState(false),[holding,setHolding]=useState(false),[selectedCell,setSelectedCell]=useState<number|null>(null);
  const [flatHold,setFlatHold]=useState<{x:number;y:number}|null>(null);
  const [flatRoll,setFlatRoll]=useState<{fromX:number;fromY:number;tick:number}|null>(null);
  const stageRef=useRef<HTMLDivElement>(null);
  const grabRef=useRef<((e:PointerEvent)=>void)|null>(null);
  const pointerHandledRef=useRef(false);
  const seenRollRef=useRef(rollKey);

  const vietnam=kind==='monopoly'&&isVietnam(state),inspect=selectedCell??state.players.find(v=>v.side===mySide)?.position??0;
  const rollMove=legal.find(m=>(m.action||m.command)==='roll');
  const canRoll=Boolean(enabled&&rollMove&&!rolling&&!flatRoll);

  const latestRoll=rolls.at(-1);
  const faces:number[]=vietnam
    ?(latestRoll?.faces?.length?latestRoll.faces:state.diceValues?.length?state.diceValues:lastDie?[lastDie,1]:[])
    :(lastDie||state.dice?[lastDie||state.dice!]:[]);
  const total=faces.reduce((a,b)=>a+b,0);

  useEffect(()=>{
    if(!animate){seenRollRef.current=rollKey;return;}
    if(rollKey&&rollKey!==seenRollRef.current){
      seenRollRef.current=rollKey;
      if(view==='2d'){
        setFlatRoll(prev=>prev||{fromX:68,fromY:76,tick:1});
        onAnimatingChange?.(true);
        const timer=setTimeout(()=>{setFlatRoll(null);onAnimatingChange?.(false);},900);
        return()=>clearTimeout(timer);
      }
    }
  },[rollKey,animate,view]);

  useEffect(()=>{
    if(!flatRoll)return;
    const id=setInterval(()=>setFlatRoll(prev=>prev?{...prev,tick:(prev.tick%6)+1}:null),95);
    const done=setTimeout(()=>{setFlatRoll(null);onAnimatingChange?.(false);},900);
    return()=>{clearInterval(id);clearTimeout(done);};
  },[Boolean(flatRoll)]);

  const toStagePercent=(clientX:number,clientY:number)=>{
    const box=stageRef.current?.getBoundingClientRect();
    if(!box||!box.width||!box.height)return {x:50,y:50};
    return {
      x:Math.max(14,Math.min(86,((clientX-box.left)/box.width)*100)),
      y:Math.max(14,Math.min(86,((clientY-box.top)/box.height)*100))
    };
  };

  useEffect(()=>{
    if(!flatHold)return;
    const onMoveWin=(e:PointerEvent)=>setFlatHold(toStagePercent(e.clientX,e.clientY));
    const onUpWin=(e:PointerEvent)=>{
      const drop=toStagePercent(e.clientX,e.clientY);
      setFlatHold(null);
      setHolding(false);
      if(rollMove&&enabled){
        setFlatRoll({fromX:drop.x,fromY:drop.y,tick:1});
        onAnimatingChange?.(true);
        onMove?.(moveRequest(rollMove));
      }
    };
    window.addEventListener('pointermove',onMoveWin);
    window.addEventListener('pointerup',onUpWin);
    return()=>{window.removeEventListener('pointermove',onMoveWin);window.removeEventListener('pointerup',onUpWin);};
  },[Boolean(flatHold),rollMove,enabled]);

  const startBoardDiceGrab=(e:React.PointerEvent)=>{
    if(!canRoll)return;
    pointerHandledRef.current=true;
    e.preventDefault();
    if(view==='3d'&&grabRef.current){
      grabRef.current(e.nativeEvent);
      return;
    }
    setHolding(true);
    setFlatHold(toStagePercent(e.clientX,e.clientY));
  };

  const flat=()=>vietnam?<VietnamEstateBoard state={state} mySide={mySide} selected={inspect} onSelect={i=>setSelectedCell(prev=>prev===i?null:i)}/>:<FlatPartyBoard kind={kind} state={state} mySide={mySide} selected={selectedCell} onSelect={i=>setSelectedCell(prev=>prev===i?null:i)}/>;
  const choose=(v:'3d'|'2d')=>{setView(v);localStorage.setItem('sc-party-view',v);};
  const fallback=()=>{setFailed(true);setView('2d');};
  const isBusyRoll=rolling||Boolean(flatRoll);

  return <div data-board-theme={boardTheme} className={`party-board party-table party-table-${view}`}>
    <div className="party-table-toolbar"><span className="party-material-label">{kind==='ludo'?'CÁ NGỰA':'TỶ PHÚ'}<small>{kind==='monopoly'?'Bấm vào ô bất kỳ để xem thông tin':view==='3d'?'Bộ cờ Sân Cờ':'Mặt bàn'}</small></span><div className="board-view-options"><BoardAppearance/><div role="group" aria-label="Kiểu bộ cờ"><button className={view==='3d'?'selected':''} disabled={failed} aria-pressed={view==='3d'} onClick={()=>choose('3d')}><Box size={15}/>3D</button><button className={view==='2d'?'selected':''} aria-pressed={view==='2d'} onClick={()=>choose('2d')}><Layers size={15}/>2D</button></div></div></div>
    <div className="party-stage-wrap" ref={stageRef}>
      {view==='3d'?<Board3DBoundary onFallback={fallback}><Suspense fallback={flat()}><ScenePartyBoard kind={kind} state={state} mySide={mySide} legal={legal} enabled={enabled} onMove={m=>onMove?.(moveRequest(m))} onFallback={fallback} topView={top} resetKey={reset} gameKey={gameKey} animate={animate} lastDie={lastDie} rollKey={rollKey} rolls={rolls} selectedCell={selectedCell} grabRef={grabRef} onCellSelect={i=>setSelectedCell(prev=>prev===i?null:i)} onHoldChange={setHolding} onAnimatingChange={busy=>{setRolling(busy);onAnimatingChange?.(busy);}}/></Suspense></Board3DBoundary>:flat()}
      {view==='2d'&&flatHold&&<div className="board-dice-hand-follower" style={{left:`${flatHold.x}%`,top:`${flatHold.y}%`}} aria-hidden="true">
        <div className="board-held-dice">
          <PipDie value={((Math.round(flatHold.x+flatHold.y)%6)+1)} className="is-shaking"/>
          {vietnam&&<PipDie value={((Math.round(flatHold.x*2+flatHold.y)%6)+1)} className="is-shaking"/>}
        </div>
      </div>}
      {view==='2d'&&flatRoll&&<div className="board-dice-roller" style={{'--drop-x':`${flatRoll.fromX-50}%`,'--drop-y':`${flatRoll.fromY-50}%`} as React.CSSProperties} aria-hidden="true">
        <PipDie value={faces[0]||flatRoll.tick} className="is-tumbling"/>
        {vietnam&&<PipDie value={faces[1]||((flatRoll.tick%6)+1)} className="is-tumbling delay"/>}
      </div>}
      {kind==='monopoly'&&selectedCell!==null&&<div className="party-cell-popup-wrap">
        <EstateInspector state={state} selected={selectedCell} onClose={()=>setSelectedCell(null)} legal={legal} enabled={enabled} onAction={m=>onMove?.(moveRequest(m))}/>
      </div>}
      <div className="party-board-dice-hud">
        {faces.length>0&&!holding&&<div className={`party-rolled-banner ${isBusyRoll?'is-rolling':'is-settled'} ${canRoll?'can-grab':''}`} onPointerDown={canRoll?startBoardDiceGrab:undefined} role="status" aria-live="polite">
          <div className="party-rolled-cubes">
            {faces.map((v,i)=><PipDie key={i} value={isBusyRoll?((v+i)%6)+1:v} className={isBusyRoll?'is-tumbling':''}/>)}
          </div>
          <div className="party-rolled-text">
            <strong>{isBusyRoll?'Xúc xắc đang lăn…':vietnam?`Ra ${faces[0]} + ${faces[1]} = ${total} nút`:`Ra số ${faces[0]}`}</strong>
            <small>{isBusyRoll?'Đang nảy trên mặt bàn':vietnam?(faces[0]===faces[1]?`Đôi ${faces[0]} · Thêm lượt!`:`Tổng ${total} nút`):(faces[0]===6?'Số 6 · Xuất chuồng / Thêm lượt!':`Đi ${faces[0]} ô`)}</small>
          </div>
        </div>}
        {canRoll&&<button
          type="button"
          className={`party-dice-pickup ${holding?'is-holding':''}`}
          onPointerDown={startBoardDiceGrab}
          onClick={()=>{if(pointerHandledRef.current){pointerHandledRef.current=false;return;}if(!holding&&!flatHold&&rollMove&&enabled)onMove?.(moveRequest(rollMove));}}
          aria-label={vietnam?'Lăn 2 xúc xắc trên bàn':'Lăn xúc xắc trên bàn'}
        >
          <span className="party-pickup-cubes">
            <PipDie value={faces[0]||5}/>
            {vietnam&&<PipDie value={faces[1]||2}/>}
          </span>
          <span className="party-pickup-copy">
            <strong>{holding?'Thả chuột để xúc xắc lăn!':vietnam?'Lăn 2 xúc xắc':'Lăn xúc xắc'}</strong>
            <small>{holding?'Thả xuống mặt bàn':'Kéo thả hoặc bấm để lăn trên bàn'}</small>
          </span>
        </button>}
      </div>
    </div>
    {view==='3d'&&<div className="party-camera-bar"><span role="status">{holding?'Thả chuột để xúc xắc lăn trên bàn':rolling?'Xúc xắc đang lăn trên bàn…':kind==='monopoly'?'Bấm vào ô để xem · Kéo xoay':'Kéo xoay · Cuộn/chụm để zoom'}</span><button aria-pressed={top} onClick={()=>{setTop(!top);setReset(v=>v+1);}}><Layers size={15}/>{top?'Góc nghiêng':'Từ trên'}</button><button aria-label="Đặt lại góc nhìn bàn cờ" onClick={()=>{setTop(false);setReset(v=>v+1);}}><RotateCcw size={15}/></button></div>}
    {failed&&<span className="party-fallback-note" role="status">Đang dùng bàn 2D trên thiết bị này.</span>}
  </div>;
}

function LegacyPartyControls({kind,state,legal,enabled,onMove}:{kind:GameKind;state:PartyState;legal:PracticeMove[];enabled:boolean;onMove:(move:PracticeMove)=>void}){
  const [confirm,setConfirm]=useState(false),main=legal.filter(m=>!['build','sell','bankrupt'].includes(m.action||'')),assets=legal.filter(m=>['build','sell'].includes(m.action||''));
  const label=(m:PracticeMove)=>m.action==='roll'?'Gieo xúc xắc':m.action==='buy'?`Mua ${CITIES[m.to]} · ${100+m.to*20}`:m.action==='end'?'Kết thúc lượt':m.action==='build'?`Xây ${CITIES[m.to]} · 100`:m.action==='sell'?`Bán ${CITIES[m.to]}`:`Đi quân ${m.to+1}`;
  return <div className="party-controls"><div className="party-dice"><span aria-label={`Xúc xắc ${state.dice||'chưa gieo'}`}>{state.dice?<PipDie value={state.dice}/>:<Dice5 size={32}/>}</span><p role="status">{state.message||'Đến lượt, gieo xúc xắc để bắt đầu.'}</p></div><div className="party-primary-actions">{main.map((move,i)=><button className={`button ${i?'button-secondary':''}`} key={move.action+':'+move.to} disabled={!enabled} onClick={()=>onMove(moveRequest(move))}>{label(move)}</button>)}{!enabled&&<span className="party-wait">Đợi đến lượt của bạn</span>}</div>{assets.length>0&&<details className="compact-details" open={state.stage==='debt'}><summary>{state.debt?`Cần trả ${state.debt.amount}`:'Quản lý tài sản'}</summary><div className="party-assets">{assets.map(move=><button key={move.action+':'+move.to} className="button button-secondary button-small" disabled={!enabled} onClick={()=>onMove(moveRequest(move))}>{label(move)}</button>)}</div></details>}{legal.some(m=>m.action==='bankrupt')&&<button className="text-button resign-link" disabled={!enabled} onClick={()=>{if(confirm){onMove(moveRequest(legal.find(m=>m.action==='bankrupt')!));setConfirm(false);}else setConfirm(true);}}><Flag size={15}/>{confirm?'Xác nhận phá sản':'Phá sản'}</button>}</div>;
}

export function PartyControls(props:{kind:GameKind;state:PartyState;legal:PracticeMove[];enabled:boolean;onMove:(move:PracticeMove)=>void;mySide?:string}){return props.kind==='monopoly'&&isVietnam(props.state)?<EstateControls {...props} mySide={props.mySide||'R'}/>:<LegacyPartyControls {...props}/>;}
