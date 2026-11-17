import {lazy,Suspense,useEffect,useState} from 'react';
import FlatBoard from './FlatBoard';
import Board3DBoundary from './Board3DBoundary';
import type {SceneBoardProps} from './SceneBoard';
import {COMMANDER_UNITS,commanderName,commanderUnits} from './commander-ui';
import {squareName,type PracticeMove} from './practice-types';
import {VIETNAM_UNITS} from './vietnam-profile';
import './commander.css';
const SceneBoard=lazy(()=>import('./SceneBoard'));
type CommanderScene=Pick<SceneBoardProps,'gameKey'|'history'|'plyCount'|'onAnimatingChange'|'onZoomChange'|'pendingSquare'|'topView'|'resetViewKey'|'zoom'|'onFallback'>;
const modes:Record<string,string>={move:'Đi / thế chỗ',bomb:'Ném bom · trở về',fire:'Bắn · đứng tại chỗ',board:'Lên / đón quân'};
function parts(move:PracticeMove){const [,unit,mode]=(move.action||'').split('-');return {unit:+unit,mode,to:move.to};}
export default function CommanderBoard({board,legal,enabled,last,checkSquare,winning,flipped,onMove,scene}:{board:(string|null)[];legal:PracticeMove[];enabled:boolean;last:PracticeMove|null;checkSquare:number|null;winning:number[];flipped:boolean;onMove:(move:PracticeMove)=>void;scene?:CommanderScene}){
  const [selected,setSelected]=useState<number|null>(null),[unit,setUnit]=useState(0),[options,setOptions]=useState<PracticeMove[]>([]),[combined,setCombined]=useState(false),[orders,setOrders]=useState<PracticeMove[]>([]),[air,setAir]=useState(false);
  const [outdoors,setOutdoors]=useState(true);
  useEffect(()=>{setSelected(null);setOptions([]);setOrders([]);setCombined(false);setUnit(0);},[board,enabled]);
  const stack=selected===null?[]:commanderUnits(board[selected]);
  const candidates=legal.filter(m=>m.from===selected&&parts(m).unit===unit&&!orders.some(o=>o.to===m.to));
  function choose(move:PracticeMove){
    setOptions([]);
    if(!combined){onMove(move);return;}
    const next=[...orders.filter(o=>parts(o).unit!==parts(move).unit),move];setOrders(next);
    const unused=stack.findIndex((_,i)=>!next.some(o=>parts(o).unit===i));if(unused>=0)setUnit(unused);
  }
  function pick(index:number){
    if(!enabled)return;
    const found=candidates.filter(m=>m.to===index);
    if(found.length===1){choose(found[0]);return;}if(found.length>1){setOptions(found);return;}
    if(legal.some(m=>m.from===index)){
      setSelected(index===selected?null:index);setUnit(0);setOptions([]);setOrders([]);setCombined(false);
    }
  }
  return <div className="commander-surface">
    <div className={`ctl-board-wrap ${scene?'ctl-board-3d':''}`}>{scene?<Board3DBoundary onFallback={scene.onFallback}><Suspense fallback={<span className="ctl-model-loading" role="status">Đang bày bàn 3D…</span>}><SceneBoard {...scene} kind="commander" board={board} selected={selected} targets={candidates.map(m=>m.to)} last={last} checkSquare={checkSquare} winning={winning} flipped={flipped} enabled={enabled} onSquare={pick} airDefense={air} scenery={outdoors}/></Suspense></Board3DBoundary>:<FlatBoard kind="commander" board={board} selected={selected} targets={candidates.map(m=>m.to)} last={last} checkSquare={checkSquare} winning={winning} flipped={flipped} enabled={enabled} onSquare={pick}/>}
      {air&&!scene&&<div className="ctl-air-overlay" aria-hidden="true">{board.flatMap((cell,index)=>commanderUnits(cell).filter(u=>['A','M','N'].includes(u[1])).map((u,slot)=>{const r=flipped?11-Math.floor(index/11):Math.floor(index/11),c=flipped?10-index%11:index%11,radius=(u[1]==='M'?2:1)+(u.endsWith('*')?1:0);return <i key={`${index}-${slot}`} className={`ctl-air ctl-air-${u[0]}`} style={{left:`${(c+.5)/11*100}%`,top:`${(r+.5)/12*100}%`,width:`${radius*2/11*100}%`,aspectRatio:'1'}}/>;}))}</div>}
    </div>
    {scene&&<p className="ctl-gesture-hint">Kéo để xoay · Cuộn/chụm để zoom · Chạm quân để ra lệnh</p>}
    <div className="ctl-toolbar">{scene&&<button type="button" className="text-button ctl-outdoors-toggle" aria-pressed={outdoors} onClick={()=>setOutdoors(!outdoors)}>Ngoại cảnh {outdoors?'✓':''}</button>}<span><i className="ctl-water-key"/>Biển · Ngầm 5, 7</span><button type="button" className="text-button" aria-pressed={air} onClick={()=>setAir(!air)}>{air?'Ẩn':'Hiện'} vùng phòng không</button></div>
    {enabled&&selected!==null&&<section className="ctl-orders" aria-label="Điều quân"><div className="ctl-order-heading"><strong>{squareName('commander',selected)} · {commanderName(board[selected])}</strong>{stack.length>1&&<button type="button" className="text-button" aria-pressed={combined} onClick={()=>{setCombined(!combined);setOrders([]);setOptions([]);}}>Phối hợp {combined?'✓':''}</button>}</div>
      <div className="ctl-unit-picker" role="group" aria-label="Chọn quân trong tổ hợp">{stack.map((u,i)=><button key={i} type="button" aria-pressed={unit===i} disabled={orders.some(o=>parts(o).unit===i)||!legal.some(m=>m.from===selected&&parts(m).unit===i)} onClick={()=>{setUnit(i);setOptions([]);}}>{COMMANDER_UNITS[u[1]].name}{u.endsWith('*')?' ★':''}{i===0&&stack.length>1?' · chở quân':''}</button>)}</div>
      <p className="ctl-hint">{combined?'Chọn quân, chọn đích, rồi xác nhận các lệnh cùng lượt.':'Chọn một giao điểm được đánh dấu.'}</p>
      {options.length>0&&<div className="ctl-action-options" role="group" aria-label="Chọn cách đánh">{options.map(m=><button type="button" key={m.action} onClick={()=>choose(m)}>{modes[parts(m).mode]} → {squareName('commander',m.to)}</button>)}</div>}
      {orders.length>0&&<><ol className="ctl-planned">{orders.map((m,i)=><li key={i}>{COMMANDER_UNITS[stack[parts(m).unit][1]].name}: {modes[parts(m).mode]} → {squareName('commander',m.to)}<button type="button" className="text-button" onClick={()=>setOrders(orders.filter((_,j)=>j!==i))}>Bỏ</button></li>)}</ol><button type="button" className="button button-small" onClick={()=>onMove(orders.length===1?orders[0]:{from:selected,to:orders[0].to,action:'ctl-combined',details:{orders:orders.map(parts)}})}>Thực hiện {orders.length} lệnh</button></>}
    </section>}
    <details className="ctl-field-guide"><summary>11 binh chủng · Cách đi</summary><div>{Object.entries(COMMANDER_UNITS).map(([key,u])=><p key={key}><b>{u.label} · {u.name}</b><span>{u.rule}</span></p>)}</div><p>★ Anh hùng: thêm 1 bước, được đi chéo; máy bay không bị phòng không bắn cháy. Tọa độ đọc hàng trước, cột sau; gốc 0,0 ở góc dưới trái phía Đỏ.</p></details>
    <details className="ctl-model-credits"><summary>Bộ quân Việt Nam · Nguồn tham khảo</summary><div className="ctl-model-profiles">{Object.entries(VIETNAM_UNITS).map(([type,profile])=><span key={type}><b>{COMMANDER_UNITS[type].label}</b>{profile.name}</span>)}</div><p>Mô hình cách điệu tham chiếu ảnh tư liệu của <a href="https://www.qdnd.vn/trien-lam-quoc-phong-quoc-te-viet-nam-2024/trien-lam-quoc-phong-quoc-te-viet-nam-2024-bien-doi-ho-mang-chua-tai-trien-lam-806598" target="_blank" rel="noreferrer">Báo Quân đội nhân dân</a> và <a href="https://btlsqsvn.mod.gov.vn/tin-tuc/chi-tiet?post_id=d1ea0812-8bb3-4703-8a9b-240e31779ee9" target="_blank" rel="noreferrer">Bảo tàng Lịch sử Quân sự Việt Nam</a>. Màu đế phân biệt hai phe.</p></details>
  </div>;
}
