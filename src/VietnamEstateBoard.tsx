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

const OWNER_BG:Record<string,string>={R:'#f2b7ae',G:'#a8dec5',Y:'#f6df98',B:'#aecdf0'};
const lines=(name:string)=>{const words=name.split(' ');if(name.length<=8||words.length===1)return [name];const split=Math.ceil(words.length/2);return [words.slice(0,split).join(' '),words.slice(split).join(' ')];};
const titleSize=(rows:string[])=>{const maxLen=Math.max(...rows.map(r=>r.length));return maxLen>11?6.2:maxLen>9?7.0:rows.length>1?7.4:8.2;};

function SvgLandmark({cx,cy,kind,accent}:{cx:number;cy:number;kind:LandmarkKind;accent:string}){
  return <g aria-hidden="true" transform={`translate(${cx} ${cy}) scale(1.18) translate(${-cx} ${-cy})`}>
    <circle cx={cx} cy={cy} r="7.5" fill="#fff7e2" stroke={accent} strokeWidth="1.1"/>
    {kind==='hanoi'?<>
      <path d={`M${cx-5.5} ${cy+2.5}H${cx+5.5}A6.5 6.5 0 0 1 ${cx-5.5} ${cy+2.5}Z`} fill="#2b7e9c"/>
      <rect x={cx-3.2} y={cy-1.2} width="6.4" height="3.2" fill="#c99f5e"/>
      <path d={`M${cx-4} ${cy-1.2}H${cx+4}L${cx+2.6} ${cy-3.4}H${cx-2.6}Z`} fill="#9e3328"/>
      <path d={`M${cx-2.4} ${cy-3.4}L${cx} ${cy-5.8}L${cx+2.4} ${cy-3.4}Z`} fill="#9e3328"/>
    </>:kind==='hcm'?<>
      <rect x={cx+1} y={cy-5.2} width="2.2" height="10" fill="#2d658a"/>
      <rect x={cx-5} y={cy+.2} width="5.5" height="4.8" fill="#d9c391"/>
      <rect x={cx-3} y={cy-2.4} width="2" height="2.6" fill="#a84432"/>
    </>:kind==='halong'?<>
      <path d={`M${cx-5.5} ${cy+2.4}H${cx+5.5}A6.5 6.5 0 0 1 ${cx-5.5} ${cy+2.4}Z`} fill="#1f7a91"/>
      <path d={`M${cx-5.2} ${cy+2.4}L${cx-2.8} ${cy-3.8}L${cx-.4} ${cy+2.4}Z`} fill="#3e6352"/>
      <path d={`M${cx-.6} ${cy+2.4}L${cx+2.2} ${cy-4.6}L${cx+5} ${cy+2.4}Z`} fill="#2f5243"/>
      <path d={`M${cx+1.6} ${cy+2.4}L${cx+3} ${cy-1.6}L${cx+4.8} ${cy+2.4}Z`} fill="#b83b2c"/>
    </>:kind==='hue'?<>
      <rect x={cx-3.4} y={cy+1.2} width="6.8" height="3" fill="#6c3063"/>
      <rect x={cx-2.5} y={cy-1.6} width="5" height="2.6" fill="#7e3b73"/>
      <path d={`M${cx-3} ${cy-1.6}L${cx} ${cy-5.4}L${cx+3} ${cy-1.6}Z`} fill="#d9b25f"/>
    </>:kind==='danang'?<>
      <path d={`M${cx-5.5} ${cy+2.5}H${cx+5.5}A6.5 6.5 0 0 1 ${cx-5.5} ${cy+2.5}Z`} fill="#247291"/>
      <path d={`M${cx-5.2} ${cy+2.2}Q${cx-2} ${cy-3.8} ${cx} ${cy}Q${cx+2.5} ${cy-3.4} ${cx+5} ${cy+1.8}`} fill="none" stroke="#d4911e" strokeWidth="1.8"/>
    </>:kind==='lotus'?<>
      <ellipse cx={cx} cy={cy-.2} rx="2" ry="4.6" fill="#d95b7d"/>
      <ellipse cx={cx-2.4} cy={cy+.6} rx="1.7" ry="3.8" transform={`rotate(-28 ${cx-2.4} ${cy+.6})`} fill="#d95b7d"/>
      <ellipse cx={cx+2.4} cy={cy+.6} rx="1.7" ry="3.8" transform={`rotate(28 ${cx+2.4} ${cy+.6})`} fill="#d95b7d"/>
      <rect x={cx-4.5} y={cy+3.5} width="9" height="1.8" rx="1" fill="#3b8751"/>
    </>:kind==='coffee'?<>
      <rect x={cx-3.6} y={cy-1.2} width="7.2" height="5.4" rx="1.5" fill="#5c331b"/>
      <path d={`M${cx-1.6} ${cy-2.5}V${cy-4.6}M${cx+1.4} ${cy-2.5}V${cy-4.6}`} stroke="#8c593b" strokeWidth="1.1"/>
    </>:kind==='tea'||kind==='dalat'||kind==='rice'?<>
      <path d={`M${cx-6} ${cy+4.5}A5.5 5.5 0 0 1 ${cx+1} ${cy+4.5}Z`} fill="#4aa366"/>
      <path d={`M${cx-1} ${cy+4.5}A5.5 5.5 0 0 1 ${cx+6} ${cy+4.5}Z`} fill="#2b7546"/>
    </>:kind==='fansipan'||kind==='mountain'?<>
      <path d={`M${cx-5.5} ${cy+4.5}L${cx-1} ${cy-4.6}L${cx+3.5} ${cy+4.5}Z`} fill={accent}/>
      <path d={`M${cx-2.2} ${cy-1.8}L${cx-1} ${cy-4.6}L${cx+.2} ${cy-1.8}Z`} fill="#fff"/>
    </>:<>
      <path d={`M${cx-5} ${cy-.4}L${cx} ${cy-4.6}L${cx+5} ${cy-.4}Z`} fill={accent}/>
      <rect x={cx-3.6} y={cy-.4} width="7.2" height="4.4" fill="#d4ae60"/>
      <rect x={cx-1.1} y={cy+1.2} width="2.2" height="2.8" fill="#4a311c"/>
    </>}
  </g>;
}

function FlatBuilding({x,y,level,color}:{x:number;y:number;level:number;color:string}){
  const lvl=Math.max(1,Math.min(5,level));
  const w=14+lvl*5,h=8+lvl*3.2,bx=x+30-w/2,by=y+52-h;
  return <g aria-label={lvl===5?'Khách sạn':`Nhà cấp ${lvl}`}>
    <rect x={bx} y={by} width={w} height={h} rx="2" fill="#f7eed2" stroke={color} strokeWidth="1.5"/>
    <path d={`M${bx-2} ${by} L${x+30} ${by-4-lvl*1.1} L${bx+w+2} ${by} Z`} fill={color} stroke="#f5e3a4" strokeWidth=".9"/>
    <text x={x+30} y={by+h-2.2} textAnchor="middle" fontSize={lvl===5?7.5:8} fontWeight="800" fill="#182d20">{lvl===5?'★KS':`C${lvl}`}</text>
  </g>;
}

function FlatPlayerToken({cx,cy,side,index,isMine}:{cx:number;cy:number;side:string;index:number;isMine:boolean}){
  const color=PARTY_COLORS[side]||'#c74b42';
  return <g className="flat-player-token">
    <circle cx={cx} cy={cy+2} r="9.5" fill="#08161099"/>
    <circle cx={cx} cy={cy} r="9" fill={color} stroke={isMine?'#fff4c2':'#f0d894'} strokeWidth={isMine?2.4:1.6}/>
    <path d={`M${cx-4.8} ${cy-6.8} L${cx-2.6} ${cy-10.5} L${cx} ${cy-8} L${cx+2.6} ${cy-10.5} L${cx+4.8} ${cy-6.8} Z`} fill="#f7df92" stroke="#5c4318" strokeWidth=".6"/>
    <text x={cx} y={cy+3.2} textAnchor="middle" fontSize="8.8" fontWeight="800" fill="#fffdf4">{index+1}</text>
  </g>;
}

export default function VietnamEstateBoard({state,mySide,selected,onSelect}:{state:PartyState;mySide:string;selected:number;onSelect:(index:number)=>void}){
  return <div className="party-board estate-board vn-estate-flat"><svg viewBox="0 0 780 780" role="img" aria-label="Bàn Tỷ phú Việt Nam 48 ô, 34 tỉnh thành" preserveAspectRatio="xMidYMid meet">
    <defs>
      <radialGradient id="vn-court-grad" cx="50%" cy="50%" r="58%">
        <stop offset="0%" stopColor="#265441"/>
        <stop offset="65%" stopColor="#183a2d"/>
        <stop offset="100%" stopColor="#0f261d"/>
      </radialGradient>
    </defs>
    <rect className="board-svg-base" width="780" height="780" rx="8" fill="#173327"/>
    <rect className="board-svg-center" x="63" y="63" width="654" height="654" rx="6" fill="url(#vn-court-grad)" stroke="#d8b870" strokeWidth="2.5"/>
    <rect x="75" y="75" width="630" height="630" rx="4" fill="none" stroke="#e8cf9066" strokeWidth="1.2"/>
    <circle cx="390" cy="340" r="118" fill="#122b20aa" stroke="#d8b87066" strokeWidth="1.5"/>
    <circle cx="390" cy="340" r="106" fill="none" stroke="#d8b87044" strokeDasharray="4 4"/>
    {VN_CELLS.map(c=>{
      const[r,col]=estateCell(c.index,13),x=col*60,y=r*60,owned=state.property[c.index],lvl=state.houses[c.index]||0,ownerColor=owned?PARTY_COLORS[owned]:'',isCorner=c.index%12===0;
      const rows=lines(c.name),fs=titleSize(rows),landmark=PROVINCE_LANDMARKS[c.name];
      return <g key={c.index} data-owned={Boolean(owned)||selected===c.index} role="button" tabIndex={0} aria-label={`Xem ${c.name}`} onClick={()=>onSelect(c.index)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(c.index);}}}>
        <rect className={selected===c.index?'board-svg-selected':'board-svg-lot'} x={x+1} y={y+1} width="58" height="58" rx={isCorner?3:1.5} fill={selected===c.index?'#f6e9b2':owned?OWNER_BG[owned]||'#faf3e2':isCorner?'#f2dfb3':ownable(c)?'#faf4e4':'#eadbc0'} stroke={selected===c.index?'#fff5b8':owned?ownerColor:isCorner?'#c9a252':'#576e5a'} strokeWidth={selected===c.index?3.4:owned?2.8:isCorner?1.8:1.1}/>
        <rect x={x+2} y={y+2} width="56" height="7" rx="1" fill={c.group!==undefined?VN_GROUP_COLORS[c.group]:isCorner?'#9e3b2e':c.type==='station'?'#295440':c.type==='utility'?'#b58428':'#7d6b42'}/>
        {owned&&<rect x={x+2} y={y+52} width="56" height="6" fill={ownerColor}/>}
        {rows.map((line,i)=><text key={i} x={x+30} y={y+(rows.length===1?17:14.5+i*7.8)} textAnchor="middle" fontSize={fs} fontWeight="800" fill="#12281c" textLength={line.length>10?52:undefined} lengthAdjust="spacingAndGlyphs">{line}</text>)}
        {!lvl&&landmark&&<SvgLandmark cx={x+30} cy={y+32} kind={landmark.kind} accent={landmark.accent}/>}
        {!lvl&&<g>
          <rect x={x+6} y={y+42} width="48" height="10.5" rx="3.5" fill={owned?ownerColor:isCorner?'#8c2f24':ownable(c)?'#183528':'#3b4f3e'} opacity={owned?.92:1}/>
          <text x={x+30} y={y+49.5} textAnchor="middle" fontSize="7.6" fontWeight="800" fill="#fff5d6">{ownable(c)?c.price:c.type==='start'?'+400':c.type==='chance'?'CƠ HỘI':c.type==='community'?'KHÍ VẬN':c.type==='tax'?`−${c.amount}`:c.type==='gotojail'?'VÀO TÙ':c.type==='jail'?'THĂM TÙ':'NGHỈ'}</text>
        </g>}
        {lvl>0&&<FlatBuilding x={x} y={y} level={lvl} color={ownerColor||'#a45e44'}/>}
        {state.mortgaged?.[c.index]&&<path d={`M${x+5} ${y+48}l49-33`} stroke="#a25945" strokeWidth="3" opacity=".7"/>}
      </g>;
    })}
    <text className="board-svg-label" x="390" y="268" textAnchor="middle" fill="#f0da9e" fontSize="12" fontWeight="700" letterSpacing="2">★ SÂN CỜ HOÀNG GIA ★</text>
    <text className="board-svg-label" x="390" y="314" textAnchor="middle" fill="#f8e7b5" fontSize="46" fontFamily="Georgia,serif" fontWeight="700">TỶ PHÚ</text>
    <text className="board-svg-label" x="390" y="357" textAnchor="middle" fill="#dfcfa0" fontSize="28" fontFamily="Georgia,serif" fontWeight="700">VIỆT NAM</text>
    <text className="board-svg-label" x="390" y="395" textAnchor="middle" fill="#d4dfc4" fontSize="14" fontWeight="600">34 tỉnh thành · Vòng {state.round}</text>
    <text className="board-svg-label" x="390" y="452" textAnchor="middle" fill="#f5e7be" fontSize="62">{state.diceValues?.map(v=>['','⚀','⚁','⚂','⚃','⚄','⚅'][v]).join(' ')||'⚄ ⚁'}</text>
    {state.players.filter(v=>v.active).map((p,i)=>{
      const[r,c]=estateCell(p.position,13);
      return <FlatPlayerToken key={p.side} cx={c*60+14+(i%2)*32} cy={r*60+35+Math.floor(i/2)*15} side={p.side} index={i} isMine={p.side===mySide}/>;
    })}
  </svg></div>;
}
