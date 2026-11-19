import type {PartyState,PracticeMove} from './practice-types';
import {VN_CELLS,VN_GROUP_COLORS,SIDE_NAMES,cash,estateRent,ownable} from './estate-data';
import {estateCell,PARTY_COLORS,CITIES,GROUP_COLORS,groupOf} from './three/party-layout.ts';
import {PROVINCE_LANDMARKS,type LandmarkKind} from './vietnam-landmarks';
import './estate.css';

const TYPE_LABELS:Record<string,string>={
  property:'Tỉnh / Thành phố',
  station:'Bến xe / Nhà ga',
  utility:'Công trình tiện ích',
  start:'Ô Xuất phát',
  tax:'Ô Thuế',
  chance:'Thẻ Cơ hội',
  community:'Quỹ Khí vận',
  gotojail:'Vào Trại giam',
  jail:'Trại giam / Thăm tù',
  rest:'Bến nghỉ chân'
};

export function EstateInspector({
  state,
  selected,
  onClose,
  legal=[],
  enabled=false,
  onAction
}:{
  state:PartyState;
  selected:number;
  onClose?:()=>void;
  legal?:PracticeMove[];
  enabled?:boolean;
  onAction?:(move:PracticeMove)=>void;
}){
  const vietnam=state.edition==='vn-v2';
  if(!vietnam){
    const name=CITIES[selected];
    if(!name)return null;
    const owner=state.property[selected],special=[0,3,5,8,10,13,15,18].includes(selected),grp=groupOf(selected),price=100+selected*20,houses=state.houses[selected]||0;
    const cellActions=legal.filter(m=>m.to===selected||((m.action||m.command)==='buy'&&state.players.some(p=>p.position===selected)));
    return <article className="estate-inspector estate-cell-card" role="region" aria-label={`Thông tin ô ${name}`}>
      <div className="estate-card-header" style={{'--cell-accent':special?'#9aa175':GROUP_COLORS[grp]||'#a39c78'} as React.CSSProperties}>
        <i style={{background:special?'#9aa175':GROUP_COLORS[grp]||'#a39c78'}}/>
        <div>
          <span className="estate-card-kicker">Ô #{selected+1} · {special?'Ô sự kiện':`Nhóm màu ${grp+1}`}</span>
          <strong>{name}</strong>
          <small>{owner?`Chủ sở hữu: ${SIDE_NAMES[owner]||owner}`:special?'Ô đặc biệt':'Chưa có chủ'}</small>
        </div>
        {onClose&&<button type="button" className="estate-card-close" onClick={onClose} aria-label="Đóng thông tin ô">×</button>}
      </div>
      <div className="estate-inspect-facts">
        {!special?<>
          <div className="estate-fact-grid">
            <span>Giá mua<strong>{price}</strong></span>
            <span>Nhà hiện tại<strong>{houses} nhà</strong></span>
            <span>Xây nhà<strong>100 / căn</strong></span>
            <span>Tiền thuê<strong>{Math.round(price*.35)+houses*45}</strong></span>
          </div>
        </>:<p>{selected===0?'Đi qua hoặc dừng nhận +200 tiền.':selected===5?'Nộp thuế −120 tiền.':selected===10?'Nghỉ 1 lượt tại đây.':selected===15?'Bến đỗ tự do, không mất phí.':'Rút thẻ Cơ hội ngẫu nhiên.'}</p>}
      </div>
      {enabled&&cellActions.length>0&&<div className="estate-card-actions">
        {cellActions.map(m=>{const act=m.action||m.command||'';return <button key={act+':'+m.to} type="button" className="button button-small" onClick={()=>onAction?.(m)}>{act==='buy'?`Mua ${name}`:act==='build'?'Xây thêm nhà':act==='sell'?'Bán tài sản':act}</button>;})}
      </div>}
    </article>;
  }

  const c=VN_CELLS[selected],owner=state.property[selected];
  if(!c)return null;
  const houses=state.houses[selected]||0,mortgaged=Boolean(state.mortgaged?.[selected]);
  const accent=c.group!==undefined?VN_GROUP_COLORS[c.group]:'#a39c78';
  const currentPos=state.players.find(p=>p.active&&legal.some(m=>(m.action||m.command)==='buy'))?.position;
  const cellMoves=legal.filter(m=>{
    const act=m.action||m.command||'';
    if(act==='buy'||act==='auction')return currentPos===selected||m.to===selected;
    return m.to===selected&&['build','mortgage','redeem','sell_building','sell'].includes(act);
  });
  const actionLabels:Record<string,string>={
    buy:`Mua ${c.name} (${cash(c.price)})`,
    auction:'Mở đấu giá',
    build:`Xây dựng (${cash(c.buildCost)})`,
    mortgage:`Thế chấp (+${cash(Math.floor(c.price/2))})`,
    redeem:`Chuộc đất (${cash(Math.ceil(c.price*.55))})`,
    sell_building:'Bán 1 công trình',
    sell:`Bán đất (+${cash(Math.floor(c.price/2))})`
  };

  return <article className="estate-inspector estate-cell-card" role="region" aria-label={`Thông tin ô ${c.name}`}>
    <div className="estate-card-header" style={{'--cell-accent':accent} as React.CSSProperties}>
      <i style={{background:accent}}/>
      <div>
        <span className="estate-card-kicker">Ô #{c.index+1} · {TYPE_LABELS[c.type]||'Ô bàn cờ'}</span>
        <strong>{c.name}</strong>
        {PROVINCE_LANDMARKS[c.name]&&<span className="estate-landmark-tag">★ {PROVINCE_LANDMARKS[c.name].title}</span>}
        <small>
          {owner?`Chủ: ${SIDE_NAMES[owner]}`:ownable(c)?'Chưa có chủ · Có thể mua':'Ô sự kiện chung'}
          {mortgaged?' · Đang thế chấp':''}
          {ownable(c)&&c.type==='property'?` · ${houses===5?'1 Khách sạn':houses?`${houses} nhà`:'Đất trống'}`:''}
        </small>
      </div>
      {onClose&&<button type="button" className="estate-card-close" onClick={onClose} aria-label="Đóng thông tin ô">×</button>}
    </div>
    <div className="estate-inspect-facts">
      {ownable(c)?<>
        <div className="estate-fact-grid">
          <span>Giá mua<strong>{cash(c.price)}</strong></span>
          <span>Thuê hiện tại<strong>{mortgaged?'0 (Thế chấp)':c.type==='utility'?`${estateRent(state,selected)||'5–12'}× xúc xắc`:cash(estateRent(state,selected)||c.rent[0]||50)}</strong></span>
          {c.buildCost>0&&<span>Giá xây dựng<strong>{cash(c.buildCost)} / cấp</strong></span>}
          <span>Thế chấp / Chuộc<strong>{cash(Math.floor(c.price/2))} / {cash(Math.ceil(c.price*.55))}</strong></span>
        </div>
        {c.type==='property'&&c.rent.length>=6&&<div className="estate-rent-tiers">
          <span>Đất trống: <b>{cash(c.rent[0])}</b></span>
          <span>1 nhà: <b>{cash(c.rent[1])}</b></span>
          <span>2 nhà: <b>{cash(c.rent[2])}</b></span>
          <span>3 nhà: <b>{cash(c.rent[3])}</b></span>
          <span>4 nhà: <b>{cash(c.rent[4])}</b></span>
          <span>Khách sạn: <b>{cash(c.rent[5])}</b></span>
        </div>}
        {c.type==='station'&&<p className="estate-special-note">Tiền thuê theo số bến/ga cùng chủ: 1 ga 50 tr · 2 ga 100 tr · 3 ga 200 tr · 4 ga 400 tr.</p>}
        {c.type==='utility'&&<p className="estate-special-note">Sở hữu 1 tiện ích: thuê = 5× tổng 2 xúc xắc · Sở hữu đủ 2 tiện ích: thuê = 12× tổng 2 xúc xắc.</p>}
      </>:<p className="estate-special-note">{c.type==='start'?'Đi qua hoặc dừng tại Xuất phát nhận +400 triệu.':c.type==='tax'?`Nộp ngân sách nhà nước ${cash(c.amount||0)}.`:c.type==='gotojail'?'Di chuyển thẳng vào Trại giam trong tối đa 3 lượt.':c.type==='jail'?'Thăm tù tự do (hoặc trả 100 tr / dùng thẻ để ra tù).':c.type==='rest'?'Bến dừng chân tự do, không phải nộp phí.':'Rút thẻ sự kiện ngẫu nhiên thưởng/phạt ngay trong lượt.'}</p>}
    </div>
    {enabled&&cellMoves.length>0&&<div className="estate-card-actions">
      {cellMoves.map(m=>{const act=m.action||m.command||'';return <button key={act+':'+m.to} type="button" className="button button-small" onClick={()=>onAction?.(m)}>{actionLabels[act]||act}</button>;})}
    </div>}
  </article>;
}

const CLASSIC_GROUP_COLORS=[
  '#7b2cbf', // Nhóm 0: Tím đậm
  '#4cc9f0', // Nhóm 1: Xanh da trời
  '#f72585', // Nhóm 2: Hồng cánh sen
  '#fb8500', // Nhóm 3: Cam
  '#e63946', // Nhóm 4: Đỏ tươi
  '#facc15', // Nhóm 5: Vàng tươi
  '#16a34a', // Nhóm 6: Xanh lá
  '#1d4ed8', // Nhóm 7: Xanh lam đậm
  '#0d9488', // Nhóm 8: Ngọc lam
  '#9333ea', // Nhóm 9: Tím hoàng gia
  '#dc2626'  // Nhóm 10: Đỏ đô (Hà Nội / TP.HCM)
];

const TOKEN_STYLES:Record<string,{fill:string;dark:string;label:string}>={
  R:{fill:'#ef233c',dark:'#9b0a1e',label:'ĐỎ'},
  G:{fill:'#10b981',dark:'#065f46',label:'XANH'},
  Y:{fill:'#f59e0b',dark:'#92400e',label:'VÀNG'},
  B:{fill:'#2563eb',dark:'#1e3a8a',label:'LAM'},
  P:{fill:'#9333ea',dark:'#581c87',label:'TÍM'},
  O:{fill:'#f97316',dark:'#9a3412',label:'CAM'},
  C:{fill:'#06b6d4',dark:'#155e75',label:'NGỌC'},
  K:{fill:'#ec4899',dark:'#9d174d',label:'HỒNG'}
};

const OWNER_BG:Record<string,string>={R:'#ffe3e6',G:'#d8f8eb',Y:'#fef3c7',B:'#dbeafe',P:'#f3e8ff',O:'#ffedd5',C:'#cffafe',K:'#fce7f3'};
const lines=(name:string)=>{const words=name.split(' ');if(name.length<=8||words.length===1)return [name];const split=Math.ceil(words.length/2);return [words.slice(0,split).join(' '),words.slice(split).join(' ')];};
const titleSize=(rows:string[])=>{const maxLen=Math.max(...rows.map(r=>r.length));return maxLen>11?6.2:maxLen>9?6.9:rows.length>1?7.3:8.0;};

function SvgLandmark({cx,cy,kind,accent}:{cx:number;cy:number;kind:LandmarkKind;accent:string}){
  return <g aria-hidden="true" transform={`translate(${cx} ${cy}) scale(1.08) translate(${-cx} ${-cy})`}>
    <circle cx={cx} cy={cy} r="6.8" fill="#fffbeb" stroke={accent} strokeWidth="1"/>
    {kind==='hanoi'?<>
      <path d={`M${cx-5} ${cy+2.2}H${cx+5}A6 6 0 0 1 ${cx-5} ${cy+2.2}Z`} fill="#2b7e9c"/>
      <rect x={cx-3} y={cy-1} width="6" height="3" fill="#c99f5e"/>
      <path d={`M${cx-3.8} ${cy-1}H${cx+3.8}L${cx+2.4} ${cy-3.1}H${cx-2.4}Z`} fill="#9e3328"/>
      <path d={`M${cx-2.2} ${cy-3.1}L${cx} ${cy-5.3}L${cx+2.2} ${cy-3.1}Z`} fill="#9e3328"/>
    </>:kind==='hcm'?<>
      <rect x={cx+1} y={cy-4.8} width="2" height="9.2" fill="#2d658a"/>
      <rect x={cx-4.6} y={cy+.2} width="5" height="4.4" fill="#d9c391"/>
      <rect x={cx-2.8} y={cy-2.2} width="1.8" height="2.4" fill="#a84432"/>
    </>:kind==='halong'?<>
      <path d={`M${cx-5} ${cy+2.2}H${cx+5}A6 6 0 0 1 ${cx-5} ${cy+2.2}Z`} fill="#1f7a91"/>
      <path d={`M${cx-4.8} ${cy+2.2}L${cx-2.5} ${cy-3.5}L${cx-.3} ${cy+2.2}Z`} fill="#3e6352"/>
      <path d={`M${cx-.5} ${cy+2.2}L${cx+2} ${cy-4.2}L${cx+4.6} ${cy+2.2}Z`} fill="#2f5243"/>
    </>:kind==='hue'?<>
      <rect x={cx-3.2} y={cy+1} width="6.4" height="2.8" fill="#6c3063"/>
      <rect x={cx-2.3} y={cy-1.4} width="4.6" height="2.4" fill="#7e3b73"/>
      <path d={`M${cx-2.8} ${cy-1.4}L${cx} ${cy-5}L${cx+2.8} ${cy-1.4}Z`} fill="#d9b25f"/>
    </>:kind==='danang'?<>
      <path d={`M${cx-5} ${cy+2.2}H${cx+5}A6 6 0 0 1 ${cx-5} ${cy+2.2}Z`} fill="#247291"/>
      <path d={`M${cx-4.8} ${cy+2}Q${cx-1.8} ${cy-3.5} ${cx} ${cy}Q${cx+2.2} ${cy-3.2} ${cx+4.6} ${cy+1.6}`} fill="none" stroke="#d4911e" strokeWidth="1.6"/>
    </>:kind==='lotus'?<>
      <ellipse cx={cx} cy={cy-.2} rx="1.8" ry="4.2" fill="#d95b7d"/>
      <ellipse cx={cx-2.2} cy={cy+.5} rx="1.5" ry="3.4" transform={`rotate(-28 ${cx-2.2} ${cy+.5})`} fill="#d95b7d"/>
      <ellipse cx={cx+2.2} cy={cy+.5} rx="1.5" ry="3.4" transform={`rotate(28 ${cx+2.2} ${cy+.5})`} fill="#d95b7d"/>
    </>:kind==='coffee'?<>
      <rect x={cx-3.2} y={cy-1} width="6.4" height="4.8" rx="1.3" fill="#5c331b"/>
      <path d={`M${cx-1.4} ${cy-2.2}V${cy-4.2}M${cx+1.2} ${cy-2.2}V${cy-4.2}`} stroke="#8c593b" strokeWidth="1"/>
    </>:kind==='tea'||kind==='dalat'||kind==='rice'?<>
      <path d={`M${cx-5.4} ${cy+4}A5 5 0 0 1 ${cx+1} ${cy+4}Z`} fill="#4aa366"/>
      <path d={`M${cx-1} ${cy+4}A5 5 0 0 1 ${cx+5.4} ${cy+4}Z`} fill="#2b7546"/>
    </>:kind==='fansipan'||kind==='mountain'?<>
      <path d={`M${cx-5} ${cy+4}L${cx-.8} ${cy-4.2}L${cx+3.2} ${cy+4}Z`} fill={accent}/>
      <path d={`M${cx-2} ${cy-1.6}L${cx-.8} ${cy-4.2}L${cx+.2} ${cy-1.6}Z`} fill="#fff"/>
    </>:<>
      <path d={`M${cx-4.5} ${cy-.4}L${cx} ${cy-4.2}L${cx+4.5} ${cy-.4}Z`} fill={accent}/>
      <rect x={cx-3.2} y={cy-.4} width="6.4" height="4" fill="#d4ae60"/>
      <rect x={cx-1} y={cy+1} width="2" height="2.6" fill="#4a311c"/>
    </>}
  </g>;
}

function SpecialCellArt({type,name,cx,cy}:{type:string;name:string;cx:number;cy:number}){
  if(type==='chance'){
    return <g aria-hidden="true">
      <text x={cx} y={cy+8} textAnchor="middle" fontSize="24" fontWeight="900" fill="#e63946" stroke="#111" strokeWidth=".7">?</text>
    </g>;
  }
  if(type==='community'){
    return <g aria-hidden="true">
      <rect x={cx-9} y={cy-4} width="18" height="11" rx="2" fill="#38bdf8" stroke="#111" strokeWidth="1.1"/>
      <path d={`M${cx-10} ${cy-4}Q${cx} ${cy-10} ${cx+10} ${cy-4}Z`} fill="#facc15" stroke="#111" strokeWidth="1.1"/>
      <rect x={cx-2} y={cy-5} width="4" height="5" rx="1" fill="#facc15" stroke="#111" strokeWidth=".8"/>
    </g>;
  }
  if(type==='station'){
    return <g aria-hidden="true">
      <rect x={cx-10} y={cy-6} width="20" height="12" rx="3" fill="#22c55e" stroke="#111" strokeWidth="1.1"/>
      <rect x={cx-7} y={cy-4} width="6" height="5" rx="1" fill="#e0f2fe"/>
      <rect x={cx+1} y={cy-4} width="6" height="5" rx="1" fill="#e0f2fe"/>
      <circle cx={cx-5.5} cy={cy+7} r="2.6" fill="#111"/>
      <circle cx={cx+5.5} cy={cy+7} r="2.6" fill="#111"/>
    </g>;
  }
  if(type==='utility'){
    const water=name.toLowerCase().includes('nước');
    return water?<g aria-hidden="true">
      <path d={`M${cx} ${cy-8}C${cx-7} ${cy} ${cx-7} ${cy+7} ${cx} ${cy+7}C${cx+7} ${cy+7} ${cx+7} ${cy} ${cx} ${cy-8}Z`} fill="#38bdf8" stroke="#111" strokeWidth="1.1"/>
    </g>:<g aria-hidden="true">
      <circle cx={cx} cy={cy-2} r="6.5" fill="#fde047" stroke="#111" strokeWidth="1.1"/>
      <rect x={cx-3} y={cy+4} width="6" height="3.5" rx="1" fill="#94a3b8" stroke="#111" strokeWidth=".9"/>
    </g>;
  }
  if(type==='tax'){
    return <g aria-hidden="true">
      <polygon points={`${cx},${cy-8} ${cx+9},${cy-2} ${cx},${cy+8} ${cx-9},${cy-2}`} fill="#38bdf8" stroke="#111" strokeWidth="1.1"/>
      <polygon points={`${cx},${cy-8} ${cx+4},${cy-2} ${cx},${cy+8} ${cx-4},${cy-2}`} fill="#bae6fd"/>
    </g>;
  }
  if(type==='start'){
    return <g aria-hidden="true">
      <path d={`M${cx-16} ${cy+2}A16 14 0 0 1 ${cx+16} ${cy+2}`} fill="none" stroke="#ef4444" strokeWidth="3"/>
      <path d={`M${cx-13} ${cy+2}A13 11 0 0 1 ${cx+13} ${cy+2}`} fill="none" stroke="#facc15" strokeWidth="2.6"/>
      <path d={`M${cx-10} ${cy+2}A10 8 0 0 1 ${cx+10} ${cy+2}`} fill="none" stroke="#3b82f6" strokeWidth="2.4"/>
      <path d={`M${cx+14} ${cy+9}H${cx-12}L${cx-7} ${cy+5}M${cx-12} ${cy+9}L${cx-7} ${cy+13}`} fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round"/>
    </g>;
  }
  if(type==='jail'){
    return <g aria-hidden="true">
      <polygon points={`${cx},${cy-11} ${cx+13},${cy} ${cx},${cy+11} ${cx-13},${cy}`} fill="#fb923c" stroke="#111" strokeWidth="1.2"/>
      <circle cx={cx} cy={cy+1} r="4.5" fill="#fde68a" stroke="#111" strokeWidth=".9"/>
      <line x1={cx-6} y1={cy-7} x2={cx-6} y2={cy+7} stroke="#111" strokeWidth="1.3"/>
      <line x1={cx} y1={cy-10} x2={cx} y2={cy+10} stroke="#111" strokeWidth="1.3"/>
      <line x1={cx+6} y1={cy-7} x2={cx+6} y2={cy+7} stroke="#111" strokeWidth="1.3"/>
    </g>;
  }
  if(type==='rest'){
    return <g aria-hidden="true">
      <path d={`M${cx-11} ${cy+3}L${cx+10} ${cy-5}L${cx+13} ${cy-2}L${cx-8} ${cy+6}Z`} fill="#c084fc" stroke="#111" strokeWidth="1"/>
      <path d={`M${cx-2} ${cy-2}L${cx-9} ${cy-9}L${cx-5} ${cy-10}L${cx+3} ${cy-3}Z`} fill="#e9d5ff" stroke="#111" strokeWidth="1"/>
      <path d={`M${cx+1} ${cy+1}L${cx+6} ${cy+9}L${cx+9} ${cy+8}L${cx+5} ${cy}Z`} fill="#e9d5ff" stroke="#111" strokeWidth="1"/>
    </g>;
  }
  if(type==='gotojail'){
    return <g aria-hidden="true">
      <circle cx={cx} cy={cy+1} r="7.5" fill="#fde68a" stroke="#111" strokeWidth="1.1"/>
      <path d={`M${cx-9} ${cy-3}Q${cx} ${cy-12} ${cx+9} ${cy-3}Z`} fill="#1d4ed8" stroke="#111" strokeWidth="1.1"/>
      <rect x={cx-9} y={cy-4} width="18" height="2.4" rx="1" fill="#111"/>
      <circle cx={cx} cy={cy-6.5} r="1.5" fill="#facc15"/>
    </g>;
  }
  return null;
}

function CenterMascotCard({x,y,rotate,bg,title}:{x:number;y:number;rotate:number;bg:string;title:string}){
  return <g transform={`translate(${x} ${y}) rotate(${rotate})`} aria-hidden="true">
    <rect x="-78" y="-52" width="156" height="104" rx="4" fill={bg} stroke="#111111" strokeWidth="2.6"/>
    <rect x="-72" y="-46" width="144" height="92" rx="2" fill="none" stroke="#11111155" strokeWidth="1" strokeDasharray="4 3"/>
    {/* Classic Top-Hat Tycoon Mascot */}
    <g transform="translate(0 -6)">
      <path d="M-28 24 Q0 4 28 24 L20 34 L-20 34 Z" fill="#111111"/>
      <path d="M-7 16 L0 28 L7 16 Z" fill="#ffffff"/>
      <path d="M-2 18 L0 27 L2 18 Z" fill="#e63946"/>
      <circle cx="0" cy="4" r="14" fill="#fffbeb" stroke="#111111" strokeWidth="2.2"/>
      {/* Mustache & eyes */}
      <circle cx="-5" cy="2" r="1.8" fill="#111111"/>
      <circle cx="5" cy="2" r="1.8" fill="#111111"/>
      <path d="M-11 9 Q-5 5 0 9 Q5 5 11 9 Q6 13 0 10 Q-6 13 -11 9 Z" fill="#ffffff" stroke="#111111" strokeWidth="1.4"/>
      {/* Top hat */}
      <rect x="-18" y="-11" width="36" height="4.5" rx="2" fill="#111111"/>
      <rect x="-12" y="-28" width="24" height="18" rx="2" fill="#111111"/>
      <rect x="-12" y="-15" width="24" height="3.5" fill="#e63946"/>
      {/* Cane */}
      <line x1="-34" y1="22" x2="34" y2="8" stroke="#111111" strokeWidth="3.2" strokeLinecap="round"/>
      <path d="M34 8 Q41 6 39 13" fill="none" stroke="#111111" strokeWidth="3" strokeLinecap="round"/>
    </g>
    <text x="0" y="42" textAnchor="middle" fontSize="18" fontWeight="900" fill="#111111" letterSpacing="1.5">{title}</text>
  </g>;
}

function FlatBuilding({x,y,level,color}:{x:number;y:number;level:number;color:string}){
  const lvl=Math.max(1,Math.min(5,level));
  const w=14+lvl*5,h=8+lvl*3.2,bx=x+30-w/2,by=y+49-h;
  return <g aria-label={lvl===5?'Khách sạn':`Nhà cấp ${lvl}`}>
    <rect x={bx} y={by} width={w} height={h} rx="2" fill="#fffbeb" stroke="#111111" strokeWidth="1.4"/>
    <path d={`M${bx-2} ${by} L${x+30} ${by-4-lvl*1.1} L${bx+w+2} ${by} Z`} fill={color} stroke="#111111" strokeWidth="1.1"/>
    <text x={x+30} y={by+h-2} textAnchor="middle" fontSize={lvl===5?7.5:8} fontWeight="900" fill="#111111">{lvl===5?'★KS':`C${lvl}`}</text>
  </g>;
}

function FlatPlayerToken({cx,cy,side,index,isMine,isTurn,compact=false}:{cx:number;cy:number;side:string;index:number;isMine:boolean;isTurn:boolean;compact?:boolean}){
  const style=TOKEN_STYLES[side]||{fill:PARTY_COLORS[side]||'#ef233c',dark:'#7f1d1d',label:`P${index+1}`};
  const scale=compact?0.74:1;
  return <g className="flat-player-token" transform={compact?`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`:undefined} aria-label={`Nhân vật ${SIDE_NAMES[side]||side}${isMine?' (Bạn)':''}`}>
    {isTurn&&<circle cx={cx} cy={cy} r="17.5" fill="none" stroke="#111111" strokeWidth="2.2" strokeDasharray="3 2"/>}
    {isMine&&<circle cx={cx} cy={cy} r="15.5" fill="none" stroke="#facc15" strokeWidth="2.8"/>}
    {/* Drop shadow */}
    <ellipse cx={cx} cy={cy+11.5} rx="11" ry="4" fill="#00000055"/>
    {/* Big high-contrast white shield halo so token never blends into the board */}
    <circle cx={cx} cy={cy} r="13" fill="#ffffff" stroke="#111111" strokeWidth="2.4"/>
    <circle cx={cx} cy={cy} r="10.4" fill={style.fill} stroke="#ffffff" strokeWidth="1.4"/>
    {/* Character bust silhouette (head + shoulders + crown) */}
    <path d={`M${cx-6.2} ${cy+6.8} C${cx-6.2} ${cy+2.2} ${cx+6.2} ${cy+2.2} ${cx+6.2} ${cy+6.8} Z`} fill="#ffffff"/>
    <circle cx={cx} cy={cy-1.6} r="3.8" fill="#ffffff"/>
    {/* Crown on top of token */}
    <path d={`M${cx-5.5} ${cy-9.5} L${cx-3} ${cy-14} L${cx} ${cy-11} L${cx+3} ${cy-14} L${cx+5.5} ${cy-9.5} Z`} fill="#facc15" stroke="#111111" strokeWidth="1"/>
    {/* Clear player badge pill at bottom of token */}
    <rect x={cx-11} y={cy+5.2} width="22" height="9.2" rx="4.6" fill="#111111" stroke="#ffffff" strokeWidth="1.1"/>
    <text x={cx} y={cy+12.1} textAnchor="middle" fontSize="6.8" fontWeight="900" fill="#fde047">{isMine?'BẠN':`${index+1}·${style.label}`}</text>
  </g>;
}

export default function VietnamEstateBoard({state,mySide,selected,onSelect,justPurchasedLot=null,justPurchasedKey=0,auctionLot=null}:{state:PartyState;mySide:string;selected:number;onSelect:(index:number)=>void;justPurchasedLot?:number|null;justPurchasedKey?:number;auctionLot?:number|null}){
  const activePlayers=state.players.filter(v=>v.active);
  const turnSide=state.players.find(p=>p.active&&p.side===(state as {turn?:string}).turn)?.side;
  const burstCell=justPurchasedLot!=null?VN_CELLS[justPurchasedLot]:null;
  const burstCoords=burstCell?estateCell(burstCell.index,13):null;
  const burstOwner=burstCell?state.property[burstCell.index]:null;
  const burstColor=burstOwner?TOKEN_STYLES[burstOwner]?.fill||PARTY_COLORS[burstOwner]||'#f59e0b':'#f59e0b';
  return <div className="party-board estate-board vn-estate-flat"><svg viewBox="0 0 780 780" role="img" aria-label="Bàn Tỷ phú Việt Nam 48 ô, 34 tỉnh thành" preserveAspectRatio="xMidYMid meet">
    <rect className="board-svg-base" width="780" height="780" rx="6" fill="#ffffff" stroke="#111111" strokeWidth="4"/>
    <rect className="board-svg-center" x="60" y="60" width="660" height="660" fill="#fbfaf6" stroke="#111111" strokeWidth="2.8"/>

    {/* Classic Center Court Graphics: Cơ hội (top-left), Diagonal CỜ TỶ PHÚ, Khí vận (bottom-right) */}
    <CenterMascotCard x={225} y={230} rotate={-42} bg="#f9a8d4" title="CƠ HỘI"/>
    <CenterMascotCard x={555} y={550} rotate={-42} bg="#fef08a" title="KHÍ VẬN"/>

    <g transform="translate(390 390) rotate(-42)" aria-hidden="true">
      <text x="3" y="-6" textAnchor="middle" fill="#0000001f" fontSize="68" fontWeight="900" letterSpacing="4">CỜ TỶ PHÚ</text>
      <text className="board-svg-label" x="0" y="-9" textAnchor="middle" fill="#111111" fontSize="68" fontWeight="900" letterSpacing="4">CỜ TỶ PHÚ</text>
      <text x="0" y="24" textAnchor="middle" fill="#dc2626" fontSize="18" fontWeight="900" letterSpacing="3">VIỆT NAM · 34 TỈNH THÀNH · VÒNG {state.round}</text>
    </g>

    {VN_CELLS.map(c=>{
      const[r,col]=estateCell(c.index,13),x=col*60,y=r*60,owned=state.property[c.index],lvl=state.houses[c.index]||0,ownerColor=owned?TOKEN_STYLES[owned]?.fill||PARTY_COLORS[owned]:'',isCorner=c.index%12===0;
      const isSelected=selected===c.index;
      const isAuction=auctionLot===c.index;
      const ownerStyle=owned?TOKEN_STYLES[owned]:null;
      const groupColor=c.group!==undefined?CLASSIC_GROUP_COLORS[c.group]||VN_GROUP_COLORS[c.group]:isCorner?'#dc2626':c.type==='station'?'#16a34a':c.type==='utility'?'#eab308':'#0284c7';
      const rows=lines(c.name),fs=titleSize(rows),landmark=PROVINCE_LANDMARKS[c.name];
      // Place color header strip facing the center of the board, like classic Monopoly
      const sideEdge=!isCorner&&(r===12?'top':col===0?'right':r===0?'bottom':'left');
      return <g key={c.index} data-owned={Boolean(owned)||isSelected} role="button" tabIndex={0} aria-label={`Xem ${c.name}`} onClick={()=>onSelect(c.index)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(c.index);}}}>
        <rect
          className={isAuction?'board-svg-lot vn-auction-lot-pulse':isSelected?'board-svg-selected':'board-svg-lot'}
          x={x}
          y={y}
          width="60"
          height="60"
          fill={isAuction?'#fef08a':isSelected?'#fef08a':owned?OWNER_BG[owned]||'#ffffff':isCorner?'#fff7ed':'#ffffff'}
          stroke={isAuction?'#d97706':isSelected?'#dc2626':owned?ownerColor:'#111111'}
          strokeWidth={isAuction?3.8:isSelected?3.4:owned?2.8:1.6}
        />
        {owned&&<rect x={x+2.4} y={y+2.4} width="55.2" height="55.2" fill="none" stroke="#facc15" strokeWidth="1.2" opacity=".85"/>}
        {!isCorner&&c.type==='property'&&<>
          {sideEdge==='top'&&<rect x={x+1} y={y+1} width="58" height="11" fill={groupColor} stroke="#111111" strokeWidth="1.1"/>}
          {sideEdge==='bottom'&&<rect x={x+1} y={y+48} width="58" height="11" fill={groupColor} stroke="#111111" strokeWidth="1.1"/>}
          {sideEdge==='left'&&<rect x={x+1} y={y+1} width="11" height="58" fill={groupColor} stroke="#111111" strokeWidth="1.1"/>}
          {sideEdge==='right'&&<rect x={x+48} y={y+1} width="11" height="58" fill={groupColor} stroke="#111111" strokeWidth="1.1"/>}
        </>}
        {owned&&<>
          {/* Corner ownership pennant */}
          <path d={`M${x+45} ${y+1} L${x+59} ${y+1} L${x+59} ${y+15} Z`} fill={ownerColor} stroke="#ffffff" strokeWidth=".9"/>
          <circle cx={x+54.6} cy={y+5.4} r="2" fill="#fde047"/>
          {/* Owner crest banner */}
          <rect x={x+3} y={sideEdge==='bottom'?y+2:y+48.5} width="54" height="9.5" rx="2.5" fill={ownerColor} stroke="#111111" strokeWidth=".9"/>
          <text x={x+30} y={sideEdge==='bottom'?y+9.2:y+55.6} textAnchor="middle" fontSize="6.7" fontWeight="900" fill="#ffffff" letterSpacing=".3">{`★ ${ownerStyle?.label||owned}`}</text>
        </>}

        {rows.map((line,i)=>{
          const baseY=sideEdge==='top'?22:13.5;
          return <text key={i} x={x+30} y={y+(rows.length===1?baseY+3:baseY+i*7.6)} textAnchor="middle" fontSize={fs} fontWeight="900" fill="#111111" textLength={line.length>10?46:undefined} lengthAdjust="spacingAndGlyphs">{line}</text>;
        })}

        {!lvl&&(c.type==='property'&&landmark
          ?<SvgLandmark cx={x+30} cy={y+(sideEdge==='top'?36.5:29.5)} kind={landmark.kind} accent={groupColor}/>
          :<SpecialCellArt type={c.type} name={c.name} cx={x+30} cy={y+(isCorner?31:31)}/>
        )}

        {!lvl&&!owned&&<text
          x={x+30}
          y={y+(sideEdge==='bottom'?45:55.5)}
          textAnchor="middle"
          fontSize="7.8"
          fontWeight="900"
          fill={isCorner||c.type==='tax'||c.type==='chance'?'#dc2626':'#111111'}
        >
          {ownable(c)?`${c.price} đ`:c.type==='start'?'+400 đ':c.type==='chance'?'CƠ HỘI':c.type==='community'?'KHÍ VẬN':c.type==='tax'?`−${c.amount} đ`:c.type==='gotojail'?'VÔ TÙ':c.type==='jail'?'THĂM TÙ':'SÂN BAY'}
        </text>}

        {lvl>0&&<FlatBuilding x={x} y={y} level={lvl} color={ownerColor||groupColor}/>}
        {state.mortgaged?.[c.index]&&<path d={`M${x+5} ${y+52}L${x+55} ${y+8}`} stroke="#dc2626" strokeWidth="3" opacity=".85"/>}
      </g>;
    })}

    {/* Render player character tokens on top with smart per-cell grouping so they never overlap or hide */}
    {activePlayers.map((p,i)=>{
      const[r,c]=estateCell(p.position,13);
      const cellmates=activePlayers.filter(other=>other.position===p.position);
      const slot=cellmates.findIndex(other=>other.side===p.side);
      const total=cellmates.length;
      const offsets=total===1
        ?[[30,31]]
        :total===2
          ?[[18,31],[42,31]]
          :total===3
            ?[[17,22],[43,22],[30,42]]
            :total===4
              ?[[17,20],[43,20],[17,42],[43,42]]
              :[[12,18],[24,18],[36,18],[48,18],[12,42],[24,42],[36,42],[48,42]];
      const [ox,oy]=offsets[slot]||[30,31];
      return <FlatPlayerToken
        key={p.side}
        cx={c*60+ox}
        cy={r*60+oy}
        side={p.side}
        index={i}
        isMine={p.side===mySide}
        isTurn={p.side===turnSide}
        compact={total>4}
      />;
    })}

    {/* Live Purchase Celebration Burst Effect on the newly bought tile */}
    {burstCoords&&<g key={justPurchasedKey} className="vn-buy-burst" style={{transformOrigin:`${burstCoords[1]*60+30}px ${burstCoords[0]*60+30}px`}} aria-hidden="true">
      <rect className="vn-buy-flash" x={burstCoords[1]*60} y={burstCoords[0]*60} width="60" height="60" rx="4" fill="#fde047"/>
      <circle className="vn-buy-ring" cx={burstCoords[1]*60+30} cy={burstCoords[0]*60+30} r="14" fill="none" stroke={burstColor} strokeWidth="5"/>
      <circle className="vn-buy-ring-2" cx={burstCoords[1]*60+30} cy={burstCoords[0]*60+30} r="10" fill="none" stroke="#facc15" strokeWidth="3.5"/>
      {[0,45,90,135,180,225,270,315].map(deg=>{
        const rad=deg*Math.PI/180,cx=burstCoords[1]*60+30,cy=burstCoords[0]*60+30;
        return <polygon
          key={deg}
          className="vn-buy-spark"
          style={{'--sx':`${Math.cos(rad)*36}px`,'--sy':`${Math.sin(rad)*36}px`} as React.CSSProperties}
          points={`${cx},${cy-4} ${cx+3},${cy} ${cx},${cy+4} ${cx-3},${cy}`}
          fill={deg%90===0?'#facc15':burstColor}
          stroke="#111111"
          strokeWidth=".7"
        />;
      })}
      <g className="vn-buy-stamp" style={{transformOrigin:`${burstCoords[1]*60+30}px ${burstCoords[0]*60+30}px`}}>
        <rect x={burstCoords[1]*60+2} y={burstCoords[0]*60+19} width="56" height="20" rx="5" fill={burstColor} stroke="#fef08a" strokeWidth="2.2"/>
        <text x={burstCoords[1]*60+30} y={burstCoords[0]*60+32.2} textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#ffffff" letterSpacing=".6">ĐÃ MUA!</text>
      </g>
    </g>}
  </svg></div>;
}
