import { systemMessage } from './system-message';
import { t } from './language.ts';
import {Sparkles,Coins,Landmark,LockKeyhole,KeyRound,Wrench,Undo2,Flag,ReceiptText,TrendingDown,ArrowRight,Check,X} from 'lucide-react';
import type {EstateEvent} from './practice-types';
import {SIDE_NAMES,VN_CELLS,cash} from './estate-data';
import {PARTY_COLORS} from './three/party-layout.ts';

type CardOrigin={lot:number;dx:number;dy:number};

type Props={
  featured:EstateEvent|null;
  cardOrigin?:CardOrigin|null;
  toasts:EstateEvent[];
  playerNames?:Record<string,string>;
  onDismissFeatured:()=>void;
  onDismissToast:(id:number)=>void;
};

export default function EstateEventOverlay({featured,cardOrigin=null,toasts,playerNames,onDismissFeatured,onDismissToast}:Props){
  const nameOf=(side:string)=>playerNames?.[side]||SIDE_NAMES[side]||side;

  const cardIcon=(card?:number)=>{
    if(card===1||card===7||card===9)return <Coins size={24}/>;
    if(card===2||card===11)return <Wrench size={24}/>;
    if(card===3||card===12)return <KeyRound size={24}/>;
    if(card===4||card===10)return <Flag size={24}/>;
    if(card===5)return <LockKeyhole size={24}/>;
    return <Undo2 size={24}/>;
  };

  const cardOutcomeBadge=(ev:EstateEvent)=>{
    if(ev.amount>0)return {cls:'pos',label:`Nhận +${cash(ev.amount)}`};
    if(ev.amount<0)return {cls:'neg',label:`Nộp −${cash(Math.abs(ev.amount))}`};
    if(ev.card===3)return {cls:'pos',label:t('+1 Thẻ ra tù miễn phí')};
    if(ev.card===5)return {cls:'neg',label:t('Vào Trại giam ngay')};
    if(ev.card===6)return {cls:'neu',label:t('Lùi 3 ô trên bàn')};
    if(ev.card===10)return {cls:'neu',label:t('Tiến tới Nhà ga gần nhất')};
    return null;
  };

  const sourceLot=featured?.type==='card'?(cardOrigin?.lot??featured.sourceLot??(featured.deck==='community'?4:28)):null;
  const sourceCellName=sourceLot!=null&&VN_CELLS[sourceLot]?VN_CELLS[sourceLot].name:(featured?.deck==='community'?t('Khí vận'):t('Cơ hội'));
  const dx=cardOrigin?.dx??(featured?.deck==='community'?165:-165);
  const dy=cardOrigin?.dy??(featured?.deck==='community'?185:-185);

  return <>
    {/* 1. Clean Cash Loss / Tax / Rent / Salary Toast Stack */}
    {toasts.length>0&&<div className="estate-event-toasts" aria-live="polite">
      {toasts.map(ev=>{
        const isGain=ev.amount>0;
        const isTax=ev.type==='tax';
        const isRent=ev.type==='rent';
        const color=PARTY_COLORS[ev.side]||'#d7a431';
        return <article key={ev.id} className={`estate-cash-toast ${isGain?'is-gain':'is-loss'} ${isTax?'is-tax':''}`} role="status">
          <span className="estate-cash-toast-icon">
            {isGain?<Sparkles size={15}/>:isTax?<ReceiptText size={15}/>:isRent?<Landmark size={15}/>:<TrendingDown size={15}/>}
          </span>
          <div className="estate-cash-toast-copy">
            <div className="estate-cash-toast-top">
              <span className="estate-cash-who">
                <i style={{background:color}}/>
                <strong>{nameOf(ev.side)}</strong>
                {ev.creditor&&<><ArrowRight size={11}/><i style={{background:PARTY_COLORS[ev.creditor]||'#8c9b6e'}}/><strong>{nameOf(ev.creditor)}</strong></>}
              </span>
              <span className={`estate-cash-delta ${isGain?'pos':'neg'}`}>
                {isGain?`+${cash(ev.amount)}`:`−${cash(Math.abs(ev.amount))}`}
              </span>
            </div>
            <p className="estate-cash-reason"><strong>{t(ev.title ?? '')}:</strong> {systemMessage(ev.reason)}</p>
          </div>
          <button type="button" className="estate-toast-close" aria-label={t('Đóng thông báo')} onClick={()=>onDismissToast(ev.id)}><X size={13}/></button>
        </article>;
      })}
    </div>}

    {/* 2. Tile-to-Center Card Pull & 3D Flip Reveal from Ô Khí vận (#4) / Ô Cơ hội (#28) */}
    {featured&&(featured.type==='card'||featured.type==='market')&&<div className="estate-fx-stage" role="status" aria-live="polite" onClick={onDismissFeatured}>
      {featured.type==='card'&&sourceLot!=null&&<div
        key={`beacon-${featured.id}`}
        className={`estate-tile-extract-fx deck-${featured.deck||'chance'}`}
        data-extract-lot={sourceLot}
        style={{'--tile-dx':`${dx}px`,'--tile-dy':`${dy}px`} as React.CSSProperties}
        aria-hidden="true"
      >
        <span className="estate-tile-extract-ring"/>
        <span className="estate-tile-extract-slot">
          <b>{featured.deck==='community'?'★':'?'}</b>
          <small>{`Ô ${sourceCellName}`}</small>
        </span>
      </div>}

      <div
        key={featured.id}
        className={`estate-card-scene ${featured.type==='card'?'estate-card-draw':''} deck-${featured.deck||'chance'}`}
        data-draw-from-lot={sourceLot??undefined}
        style={featured.type==='card'?({'--tile-dx':`${dx}px`,'--tile-dy':`${dy}px`,'--tile-tilt':featured.deck==='community'?'12deg':'-12deg'} as React.CSSProperties):undefined}
        onClick={e=>e.stopPropagation()}
      >
        <div className={featured.type==='card'?'estate-card-flyer':'estate-card-static'}>
          <div className={featured.type==='card'?'estate-card-flipper':'estate-card-static-inner'}>
            {featured.type==='card'&&<div className="estate-card-back" aria-hidden="true">
              <div className="estate-card-back-frame">
                <span className="estate-card-back-emblem">{featured.deck==='community'?'★':'?'}</span>
                <strong>{featured.deck==='community'?t('KHÍ VẬN'):t('CƠ HỘI')}</strong>
                <small>{`Rút thẻ từ ô ${sourceCellName}`}</small>
              </div>
            </div>}
            <div className="estate-card-front">
              <span className="estate-card-shine" aria-hidden="true"/>
              <div className="estate-card-front-top">
                <span className="estate-card-deck-pill">
                  {featured.type==='market'?t('Thị trường'):`Rút từ ô ${sourceCellName}${featured.card?` · Thẻ #${featured.card}`:''}`}
                </span>
                <button type="button" className="estate-fx-close" aria-label={t('Đóng thẻ')} onClick={onDismissFeatured}><X size={14}/></button>
              </div>
              <div className="estate-card-hero">
                <span className="estate-card-icon-ring">{featured.type==='market'?<Landmark size={24}/>:cardIcon(featured.card)}</span>
                <h3 className="estate-card-title">{t(featured.title ?? '')}</h3>
                <p className="estate-card-desc">{systemMessage(featured.reason)}</p>
                {featured.type==='card'&&(()=>{
                  const outcome=cardOutcomeBadge(featured);
                  return outcome?<span className={`estate-card-outcome ${outcome.cls}`}>{outcome.label}</span>:null;
                })()}
              </div>
              <div className="estate-card-footer">
                <span className="estate-card-player">
                  <i style={{background:PARTY_COLORS[featured.side]||'#d7a431'}}/>
                  {featured.type==='market'?t('Áp dụng toàn bàn'):`${nameOf(featured.side)} vừa bốc thẻ`}
                </span>
                <button type="button" className="estate-card-ok-btn" onClick={onDismissFeatured}><Check size={13}/>{t('Đã xem')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>}

    {/* 3. Simple, Clean Jail Notice */}
    {featured&&featured.type==='jail'&&<div className="estate-fx-stage" role="status" aria-live="polite" onClick={onDismissFeatured}>
      <div key={featured.id} className="estate-jail-card" onClick={e=>e.stopPropagation()}>
        <div className="estate-card-front-top">
          <span className="estate-jail-kicker"><LockKeyhole size={13}/>{t('VÀO TRẠI GIAM')}</span>
          <button type="button" className="estate-fx-close" aria-label={t('Đóng thông báo')} onClick={onDismissFeatured}><X size={14}/></button>
        </div>
        <div className="estate-jail-row">
          <span className="estate-jail-who">
            <i style={{background:PARTY_COLORS[featured.side]||'#ef4444'}}/>
            <strong>{nameOf(featured.side)}</strong>
          </span>
        </div>
        <p className="estate-jail-reason">{systemMessage(featured.reason)}</p>
        <small className="estate-jail-hint">{t('Tối đa 3 lượt · Nộp 100 tr, dùng thẻ hoặc gieo đôi để ra')}</small>
      </div>
    </div>}
  </>;
}
