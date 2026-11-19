import {Sparkles,Coins,Landmark,LockKeyhole,KeyRound,Wrench,Undo2,Flag,ReceiptText,TrendingDown,ArrowRight,X} from 'lucide-react';
import type {EstateEvent} from './practice-types';
import {SIDE_NAMES,cash} from './estate-data';
import {PARTY_COLORS} from './three/party-layout.ts';

type Props={
  featured:EstateEvent|null;
  toasts:EstateEvent[];
  playerNames?:Record<string,string>;
  onDismissFeatured:()=>void;
  onDismissToast:(id:number)=>void;
};

export default function EstateEventOverlay({featured,toasts,playerNames,onDismissFeatured,onDismissToast}:Props){
  const nameOf=(side:string)=>playerNames?.[side]||SIDE_NAMES[side]||side;

  const cardIcon=(card?:number)=>{
    if(card===1)return <Coins size={28}/>;
    if(card===2)return <Wrench size={28}/>;
    if(card===3)return <KeyRound size={28}/>;
    if(card===4)return <Flag size={28}/>;
    if(card===5)return <LockKeyhole size={28}/>;
    return <Undo2 size={28}/>;
  };

  return <>
    {/* 1. Floating Cash Loss / Tax / Rent / Salary Feed Stack (always visible, non-blocking) */}
    {toasts.length>0&&<div className="estate-event-toasts" aria-live="polite">
      {toasts.map(ev=>{
        const isGain=ev.amount>0;
        const isTax=ev.type==='tax';
        const isRent=ev.type==='rent';
        const color=PARTY_COLORS[ev.side]||'#d7a431';
        return <article key={ev.id} className={`estate-cash-toast ${isGain?'is-gain':'is-loss'} ${isTax?'is-tax':''}`} role="status">
          <span className="estate-cash-toast-icon">
            {isGain?<Sparkles size={17}/>:isTax?<ReceiptText size={17}/>:isRent?<Landmark size={17}/>:<TrendingDown size={17}/>}
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
            <p className="estate-cash-reason"><strong>{ev.title}:</strong> {ev.reason}</p>
          </div>
          <button type="button" className="estate-toast-close" aria-label="Đóng thông báo" onClick={()=>onDismissToast(ev.id)}><X size={13}/></button>
        </article>;
      })}
    </div>}

    {/* 2. Dramatic Centerpiece Showcase: 3D Flipping Cơ Hội / Khí Vận Card OR Jail Bars Slam */}
    {featured&&featured.type==='card'&&<div className="estate-fx-stage" role="status" aria-live="polite" onClick={onDismissFeatured}>
      <div key={featured.id} className={`estate-card-scene deck-${featured.deck||'chance'}`} onClick={e=>e.stopPropagation()}>
        <div className="estate-card-3d">
          {/* Card Back (visible during initial flip) */}
          <div className="estate-card-face estate-card-back">
            <div className="estate-card-foil-frame">
              <span className="estate-card-crest"><Sparkles size={34}/></span>
              <strong>{featured.deck==='community'?'KHÍ VẬN':'CƠ HỘI'}</strong>
              <small>TỶ PHÚ VIỆT NAM</small>
            </div>
          </div>
          {/* Card Front (flips into view) */}
          <div className="estate-card-face estate-card-front">
            <div className="estate-card-front-top">
              <span className="estate-card-deck-pill">{featured.deck==='community'?'THẺ KHÍ VẬN':'THẺ CƠ HỘI'}</span>
              <button type="button" className="estate-fx-close" aria-label="Đóng thẻ" onClick={onDismissFeatured}><X size={14}/></button>
            </div>
            <div className="estate-card-icon-ring">
              {cardIcon(featured.card)}
            </div>
            <h3 className="estate-card-title">{featured.title}</h3>
            <p className="estate-card-desc">{featured.reason}</p>
            <div className="estate-card-footer">
              <span className="estate-card-player">
                <i style={{background:PARTY_COLORS[featured.side]||'#d7a431'}}/>
                {nameOf(featured.side)}
              </span>
              {featured.amount!==0&&<span className={`estate-card-amount ${featured.amount>0?'pos':'neg'}`}>
                {featured.amount>0?`+${cash(featured.amount)}`:`−${cash(Math.abs(featured.amount))}`}
              </span>}
            </div>
          </div>
        </div>
      </div>
    </div>}

    {featured&&featured.type==='jail'&&<div className="estate-fx-stage" role="status" aria-live="polite" onClick={onDismissFeatured}>
      <div key={featured.id} className="estate-jail-card" onClick={e=>e.stopPropagation()}>
        <div className="estate-jail-bars" aria-hidden="true">
          <i/><i/><i/><i/><i/><i/>
        </div>
        <button type="button" className="estate-fx-close estate-jail-close" aria-label="Đóng thông báo" onClick={onDismissFeatured}><X size={14}/></button>
        <div className="estate-jail-badge"><LockKeyhole size={30}/></div>
        <span className="estate-jail-kicker">LỆNH TẠM GIAM</span>
        <h3>VÀO TRẠI GIAM!</h3>
        <div className="estate-jail-who">
          <i style={{background:PARTY_COLORS[featured.side]||'#ef4444'}}/>
          <strong>{nameOf(featured.side)}</strong>
        </div>
        <p className="estate-jail-reason">{featured.reason}</p>
        <small className="estate-jail-hint">Tối đa 3 lượt · Có thể nộp 100 tr, dùng thẻ hoặc gieo đôi để ra</small>
      </div>
    </div>}
  </>;
}
