import { systemMessage } from './system-message';
import { t } from './language.ts';
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
    if(card===1||card===7||card===9)return <Coins size={20}/>;
    if(card===2||card===11)return <Wrench size={20}/>;
    if(card===3||card===12)return <KeyRound size={20}/>;
    if(card===4||card===10)return <Flag size={20}/>;
    if(card===5)return <LockKeyhole size={20}/>;
    return <Undo2 size={20}/>;
  };

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

    {/* 2. Vivid 3D Deck-Draw & Flip Reveal (Cơ hội / Khí vận) */}
    {featured&&(featured.type==='card'||featured.type==='market')&&<div className="estate-fx-stage" role="status" aria-live="polite" onClick={onDismissFeatured}>
      <div key={featured.id} className={`estate-card-scene ${featured.type==='card'?'estate-card-draw':''} deck-${featured.deck||'chance'}`} onClick={e=>e.stopPropagation()}>
        {featured.type==='card'&&<div className="estate-deck-origin" aria-hidden="true">
          <span className="estate-deck-stack-layer l3"/>
          <span className="estate-deck-stack-layer l2"/>
          <span className="estate-deck-stack-top">
            <b>{featured.deck==='community'?'★':'?'}</b>
            <small>{featured.deck==='community'?t('KHÍ VẬN'):t('CƠ HỘI')}</small>
          </span>
        </div>}
        <div className={featured.type==='card'?'estate-card-flipper':'estate-card-static'}>
          {featured.type==='card'&&<div className="estate-card-back" aria-hidden="true">
            <div className="estate-card-back-frame">
              <span className="estate-card-back-emblem">{featured.deck==='community'?'★':'?'}</span>
              <strong>{featured.deck==='community'?t('KHÍ VẬN'):t('CƠ HỘI')}</strong>
              <small>{t('Rút thẻ từ bộ bài')}</small>
            </div>
          </div>}
          <div className="estate-card-front">
            <span className="estate-card-shine" aria-hidden="true"/>
            <div className="estate-card-front-top">
              <span className="estate-card-deck-pill">{featured.type==='market'?t('Thị trường'):featured.deck==='community'?t('Rút bài · Khí vận'):t('Rút bài · Cơ hội')}</span>
              <button type="button" className="estate-fx-close" aria-label={t('Đóng thẻ')} onClick={onDismissFeatured}><X size={14}/></button>
            </div>
            <div className="estate-card-head">
              <span className="estate-card-icon-ring">{featured.type==='market'?<Landmark size={20}/>:cardIcon(featured.card)}</span>
              <div>
                <h3 className="estate-card-title">{t(featured.title ?? '')}</h3>
                <p className="estate-card-desc">{systemMessage(featured.reason)}</p>
              </div>
            </div>
            <div className="estate-card-footer">
              <span className="estate-card-player">
                <i style={{background:PARTY_COLORS[featured.side]||'#d7a431'}}/>
                {featured.type==='market'?t('Áp dụng toàn bàn'):nameOf(featured.side)}
              </span>
              {featured.amount!==0&&<span className={`estate-card-amount ${featured.amount>0?'pos':'neg'}`}>
                {featured.amount>0?`+${cash(featured.amount)}`:`−${cash(Math.abs(featured.amount))}`}
              </span>}
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
