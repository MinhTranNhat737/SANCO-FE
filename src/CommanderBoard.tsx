import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import FlatBoard from './FlatBoard';
import Board3DBoundary from './Board3DBoundary';
import type {SceneBoardProps} from './SceneBoard';
import {COMMANDER_SYMBOLS,COMMANDER_UNITS,commanderName,commanderUnits} from './commander-ui';
import {squareName,type PracticeMove} from './practice-types';
import {VIETNAM_UNITS} from './vietnam-profile';
import './commander.css';
const SceneBoard=lazy(()=>import('./SceneBoard'));
type CommanderScene=Pick<SceneBoardProps,'gameKey'|'history'|'plyCount'|'onAnimatingChange'|'onZoomChange'|'pendingSquare'|'topView'|'resetViewKey'|'zoom'|'onFallback'>;
const modes:Record<string,string>={move:'Đi / thế chỗ',bomb:'Ném bom · trở về',fire:'Bắn · đứng tại chỗ',board:'Lên / đón quân'};
function parts(move:PracticeMove){const [,unit,mode]=(move.action||'').split('-');return {unit:+unit,mode,to:move.to};}
function direction(from:number,to:number){return `${Math.sign(Math.floor(to/11)-Math.floor(from/11))},${Math.sign(to%11-from%11)}`;}
export default function CommanderBoard({board,legal,enabled,last,checkSquare,winning,flipped,onMove,scene,originalRules=false}:{board:(string|null)[];legal:PracticeMove[];enabled:boolean;last:PracticeMove|null;checkSquare:number|null;winning:number[];flipped:boolean;onMove:(move:PracticeMove)=>void;scene?:CommanderScene;originalRules?:boolean}){
  const [selected,setSelected]=useState<number|null>(null),[unit,setUnit]=useState(0),[options,setOptions]=useState<PracticeMove[]>([]),[combined,setCombined]=useState(false),[orders,setOrders]=useState<PracticeMove[]>([]),[air,setAir]=useState(false);
  const [outdoors,setOutdoors]=useState(true);
  useEffect(()=>{setSelected(null);setOptions([]);setOrders([]);setCombined(false);setUnit(0);},[board,enabled]);
  const stack=selected===null?[]:commanderUnits(board[selected]);
  const available=selected===null?[]:legal.filter(move=>move.from===selected&&!orders.some(order=>order.to===move.to||originalRules&&direction(selected,order.to)===direction(selected,move.to)));
  const candidates=available.filter(move=>parts(move).unit===unit);
  function choose(move:PracticeMove){
    setOptions([]);
    if(!combined){onMove(move);return;}
    const next=[...orders.filter(o=>parts(o).unit!==parts(move).unit),move];setOrders(next);
    const unused=stack.findIndex((_,i)=>!next.some(o=>parts(o).unit===i));if(unused>=0)setUnit(unused);
  }
  function pick(index:number){
    if(!enabled)return;
    if(options.length>0&&options[0]?.to===index){
      choose(options.find(m=>parts(m).mode==='bomb')||options[0]);
      return;
    }
    const found=candidates.filter(m=>m.to===index);
    if(found.length===1){choose(found[0]);return;}if(found.length>1){setOptions(found);return;}
    if(legal.some(m=>m.from===index)){
      setSelected(index===selected?null:index);setUnit(0);setOptions([]);setOrders([]);setCombined(false);
    }
  }
  const prevBoardRef=useRef<(string|null)[]>(board);
  const hadCaptureRef=useRef(false);
  if(prevBoardRef.current!==board){
    const prev=prevBoardRef.current;
    const prevPieces=prev.reduce((n,c)=>n+(c?commanderUnits(c).length:0),0);
    const currPieces=board.reduce((n,c)=>n+(c?commanderUnits(c).length:0),0);
    hadCaptureRef.current=Boolean(last&&(currPieces<prevPieces||(prev[last.to]&&prev[last.to]!==board[last.to])));
    prevBoardRef.current=board;
  }
  const cellGrid=(sq:number)=>({c:(flipped?10-sq%11:sq%11)+.5,r:(flipped?11-Math.floor(sq/11):Math.floor(sq/11))+.5});
  const latestPly=scene?.history?.[scene.history.length-1];
  const fromGrid=last&&last.from!==null?cellGrid(last.from):null,toGrid=last?cellGrid(last.to):null;
  const isRanged=Boolean(last&&(last.action?.includes('fire')||last.action?.includes('bomb')));
  const isCombat=Boolean(last&&(isRanged||hadCaptureRef.current||latestPly?.captures?.length));
  const fxKey=last?`${last.from}-${last.to}-${last.action||'m'}-${board.filter(Boolean).length}`:'none';
  return <div className="commander-surface">
    <div className={`ctl-board-wrap ${scene?'ctl-board-3d':''}`}>{scene?<Board3DBoundary onFallback={scene.onFallback}><Suspense fallback={<span className="ctl-model-loading" role="status">Đang bày bàn 3D…</span>}><SceneBoard {...scene} kind="commander" board={board} selected={selected} targets={candidates.map(m=>m.to)} last={last} checkSquare={checkSquare} winning={winning} flipped={flipped} enabled={enabled} onSquare={pick} airDefense={air} scenery={outdoors}/></Suspense></Board3DBoundary>:<FlatBoard kind="commander" board={board} selected={selected} targets={candidates.map(m=>m.to)} last={last} checkSquare={checkSquare} winning={winning} flipped={flipped} enabled={enabled} onSquare={pick}/>}
      <div className="ctl-war-haze" aria-hidden="true">
        <span className="ctl-smoke-drifter ctl-smoke-1"/><span className="ctl-smoke-drifter ctl-smoke-2"/><span className="ctl-smoke-drifter ctl-smoke-3"/>
      </div>
      {!scene&&last&&fromGrid&&toGrid&&isCombat&&<div key={fxKey} className={`ctl-battle-fx ${isRanged?'ctl-battle-heavy':'ctl-battle-skirmish'}`} aria-hidden="true">
        <svg className="ctl-tracer-svg" viewBox="0 0 11 12">
          <line x1={fromGrid.c} y1={fromGrid.r} x2={toGrid.c} y2={toGrid.r} pathLength={1} className="ctl-tracer-glow"/>
          <line x1={fromGrid.c} y1={fromGrid.r} x2={toGrid.c} y2={toGrid.r} pathLength={1} className="ctl-tracer-core"/>
        </svg>
        <div className="ctl-muzzle-fx" style={{left:`${fromGrid.c/11*100}%`,top:`${fromGrid.r/12*100}%`}}>
          <span className="ctl-muzzle-flash"/><span className="ctl-gun-smoke"/>
        </div>
        <div className="ctl-impact-fx" style={{left:`${toGrid.c/11*100}%`,top:`${toGrid.r/12*100}%`}}>
          <span className="ctl-shockwave"/><span className="ctl-fireball"/><span className="ctl-war-smoke ctl-ws-1"/><span className="ctl-war-smoke ctl-ws-2"/><span className="ctl-debris"/>
        </div>
      </div>}
      {air&&!scene&&<div className="ctl-air-overlay" aria-hidden="true">{board.flatMap((cell,index)=>commanderUnits(cell).filter(u=>['A','M','N'].includes(u[1])).map((u,slot)=>{const r=flipped?11-Math.floor(index/11):Math.floor(index/11),c=flipped?10-index%11:index%11,radius=(u[1]==='M'?2:1)+(u.endsWith('*')?1:0);return <i key={`${index}-${slot}`} className={`ctl-air ctl-air-${u[0]}`} style={{left:`${(c+.5)/11*100}%`,top:`${(r+.5)/12*100}%`,width:`${radius*2/11*100}%`,aspectRatio:'1'}}/>;}))}</div>}
      {enabled&&selected!==null&&<section className={`ctl-orders ctl-orders-hud ${options.length>0?'ctl-orders-prompt':''}`} aria-label="Điều quân">
        <div className="ctl-order-heading">
          <span className="ctl-console-id"><i className="ctl-console-led"/>[{squareName('commander',selected)}]</span>
          <strong>{commanderName(board[selected])}</strong>
          {stack.length>1&&<button type="button" className="text-button ctl-combine-switch" aria-pressed={combined} onClick={()=>{setCombined(!combined);setOrders([]);setOptions([]);}}>Phối hợp {combined?'✓':''}</button>}
        </div>
        {stack.length>1&&<div className="ctl-unit-picker" role="group" aria-label="Chọn quân trong tổ hợp">{stack.map((u,i)=><button key={i} type="button" aria-pressed={unit===i} disabled={orders.some(o=>parts(o).unit===i)||!available.some(m=>parts(m).unit===i)} onClick={()=>{setUnit(i);setOptions([]);}}>{COMMANDER_UNITS[u[1]].name}{u.endsWith('*')?' ★':''}{i===0&&stack.length>1?' · chở quân':''}</button>)}</div>}
        <p className="ctl-hint">{options.length>0?'CHỌN PHƯƠNG THỨC TÁC CHIẾN:':combined?'Chọn từng đơn vị và tọa độ đích, sau đó phát lệnh.':'Chọn tọa độ di chuyển hoặc mục tiêu tác chiến trên bản đồ.'}</p>
        {options.length>0&&<div className="ctl-action-options" role="group" aria-label="Chọn cách đánh">{options.map(m=><button type="button" key={m.action} className={parts(m).mode==='bomb'?'ctl-btn-bomb':'ctl-btn-land'} onClick={()=>choose(m)}>{modes[parts(m).mode]} → {squareName('commander',m.to)}</button>)}</div>}
        {orders.length>0&&<><ol className="ctl-planned">{orders.map((m,i)=><li key={i}>{COMMANDER_UNITS[stack[parts(m).unit][1]].name}: {modes[parts(m).mode]} → {squareName('commander',m.to)}<button type="button" className="text-button" onClick={()=>setOrders(orders.filter((_,j)=>j!==i))}>Bỏ</button></li>)}</ol><button type="button" className="button button-small ctl-exec-btn" onClick={()=>onMove(orders.length===1?orders[0]:{from:selected,to:orders[0].to,action:'ctl-combined',details:{orders:orders.map(parts)}})}>Thực hiện {orders.length} lệnh</button></>}
      </section>}
    </div>
    {scene&&<p className="ctl-gesture-hint">Kéo để xoay · Cuộn/chụm để zoom · Chạm quân để ra lệnh</p>}
    <div className="ctl-toolbar">{scene&&<button type="button" className="text-button ctl-outdoors-toggle" aria-pressed={outdoors} onClick={()=>setOutdoors(!outdoors)}>Ngoại cảnh {outdoors?'✓':''}</button>}<span><i className="ctl-water-key"/>Biển · Ngầm 5, 7</span><button type="button" className="text-button" aria-pressed={air} onClick={()=>setAir(!air)}>{air?'Ẩn':'Hiện'} vùng phòng không</button></div>
    <details className="ctl-field-guide"><summary>11 loại quân · Cách đi</summary><div>{Object.entries(COMMANDER_UNITS).map(([key,u])=><p key={key}><b>{COMMANDER_SYMBOLS[key].notation} · {u.name}</b><span>{u.rule}</span></p>)}</div><p>Quân anh hùng đi xa thêm một đoạn và được đi chéo. Máy bay anh hùng xuyên qua vòng lửa. Đọc tọa độ hàng trước, cột sau.</p><p><a href="https://haiduongblog.wordpress.com/2017/07/22/3394/" target="_blank" rel="noreferrer">Luật và sơ đồ của tác giả Nguyễn Quý Hải</a></p></details>
    <details className="ctl-model-credits"><summary>Bộ quân Việt Nam · Nguồn tham khảo</summary><div className="ctl-model-profiles">{Object.entries(VIETNAM_UNITS).map(([type,profile])=><span key={type}><b>{COMMANDER_UNITS[type].label}</b>{profile.name}</span>)}</div><p>Mô hình cách điệu tham chiếu ảnh tư liệu của <a href="https://www.qdnd.vn/trien-lam-quoc-phong-quoc-te-viet-nam-2024/trien-lam-quoc-phong-quoc-te-viet-nam-2024-bien-doi-ho-mang-chua-tai-trien-lam-806598" target="_blank" rel="noreferrer">Báo Quân đội nhân dân</a> và <a href="https://btlsqsvn.mod.gov.vn/tin-tuc/chi-tiet?post_id=d1ea0812-8bb3-4703-8a9b-240e31779ee9" target="_blank" rel="noreferrer">Bảo tàng Lịch sử Quân sự Việt Nam</a>. Màu đế phân biệt hai phe.</p></details>
  </div>;
}
