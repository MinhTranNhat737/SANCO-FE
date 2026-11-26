import { useLayoutEffect, useRef } from 'react';
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
  const deckTopRef=useRef<HTMLDivElement>(null);
  const moverRef=useRef<HTMLDivElement>(null);
  const flipperRef=useRef<HTMLDivElement>(null);
  const deckStackRef=useRef<HTMLDivElement>(null);

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

  // Drive physical pull-from-deck + 3D flip via Web Animations API so OS reduced-motion settings never suppress gameplay card draws!
  useLayoutEffect(()=>{
    if(!featured||featured.type!=='card')return;
    const deckEl=deckTopRef.current,moverEl=moverRef.current,flipperEl=flipperRef.current,stackEl=deckStackRef.current;
    if(!moverEl||!flipperEl||typeof moverEl.animate!=='function')return;
    const isComm=featured.deck==='community';
    const deckTilt=isComm?7:-7;
    let startX=-215,startY=12,startScale=0.44;
    const deckRect=deckEl?.getBoundingClientRect();
    const moverRect=moverEl.getBoundingClientRect();
    if(deckRect&&moverRect&&deckRect.width>0&&moverRect.width>0){
      startX=Math.round((deckRect.left+deckRect.width/2)-(moverRect.left+moverRect.width/2));
      startY=Math.round((deckRect.top+deckRect.height/2)-(moverRect.top+moverRect.height/2));
      startScale=Math.max(0.34,Math.min(0.62,+(deckRect.width/moverRect.width).toFixed(3)));
    }
    const moveAnim=moverEl.animate([
      {transform:`translate3d(${startX}px, ${startY}px, 0) scale(${startScale}) rotate(${deckTilt}deg)`,opacity:1,offset:0},
      {transform:`translate3d(${Math.round(startX+54)}px, ${Math.round(startY-48)}px, 0) scale(${+(startScale*1.16).toFixed(3)}) rotate(${deckTilt-6}deg)`,opacity:1,offset:0.24},
      {transform:'translate3d(-12px, -14px, 0) scale(1.04) rotate(-2deg)',opacity:1,offset:0.56},
      {transform:'translate3d(0px, 0px, 0) scale(1) rotate(0deg)',opacity:1,offset:1}
    ],{duration:1450,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'forwards'});

    const flipAnim=flipperEl.animate([
      {transform:'rotateY(180deg)',offset:0},
      {transform:'rotateY(180deg)',offset:0.54},
      {transform:'rotateY(0deg)',offset:1}
    ],{duration:1450,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'forwards'});

    const stackAnim=stackEl?.animate?.([
      {transform:`rotate(${deckTilt}deg) scale(0.95)`,offset:0},
      {transform:`rotate(${deckTilt}deg) translateY(6px) scale(0.92)`,offset:0.22},
      {transform:`rotate(${deckTilt}deg) translateY(0px) scale(1)`,offset:0.62},
      {transform:`rotate(${deckTilt}deg) scale(1)`,offset:1}
    ],{duration:1450,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'forwards'});

    return ()=>{
      moveAnim.cancel();
      flipAnim.cancel();
      stackAnim?.cancel();
    };
  },[featured?.id]);

  const sourceLot=featured?.type==='card'?(cardOrigin?.lot??featured.sourceLot??(featured.deck==='community'?4:28)):null;
  const sourceCellName=sourceLot!=null&&VN_CELLS[sourceLot]?VN_CELLS[sourceLot].name:(featured?.deck==='community'?t('Khí vận'):t('Cơ hội'));
  const dx=cardOrigin?.dx??(featured?.deck==='community'?165:-165);
  const dy=cardOrigin?.dy??(featured?.deck==='community'?185:-185);
  const isComm=featured?.deck==='community';

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

    {/* 2. Physical Card-Deck Stack (Bộ thẻ Cơ hội / Khí vận) + Top-Card Slide-Out & 3D Flip Reveal */}
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
          <b>{isComm?'★':'?'}</b>
          <small>{`Ô ${sourceCellName}`}</small>
        </span>
      </div>}

      <div
        key={featured.id}
        className={`estate-card-scene ${featured.type==='card'?'estate-card-draw estate-deck-draw-stage':''} deck-${featured.deck||'chance'}`}
        data-draw-from-lot={sourceLot??undefined}
        style={featured.type==='card'?({'--tile-dx':`${dx}px`,'--tile-dy':`${dy}px`} as React.CSSProperties):undefined}
        onClick={e=>e.stopPropagation()}
      >
        {/* Left: Visible Physical Card Deck Stack ("Bộ thẻ") from which the top card is pulled */}
        {featured.type==='card'&&<div className="estate-physical-deck-col" aria-hidden="true">
          <div ref={deckStackRef} className="estate-physical-deck" style={{transform:`rotate(${isComm?7:-7}deg)`}}>
            <span className="estate-deck-tray"/>
            <span className="estate-deck-sheet s5"/>
            <span className="estate-deck-sheet s4"/>
            <span className="estate-deck-sheet s3"/>
            <span className="estate-deck-sheet s2"/>
            <div ref={deckTopRef} className="estate-deck-next-card">
              <div className="estate-deck-next-inner">
                <span className="estate-deck-next-emblem">{isComm?'★':'?'}</span>
                <strong>{isComm?t('KHÍ VẬN'):t('CƠ HỘI')}</strong>
              </div>
            </div>
          </div>
          <span className="estate-physical-deck-caption">
            {isComm?t('Bộ thẻ Khí vận'):t('Bộ thẻ Cơ hội')}
          </span>
        </div>}

        {/* Right: The Top Card sliding OFF the deck stack & flipping 180° to reveal its content */}
        <div className={featured.type==='card'?'estate-drawn-card-slot':'estate-card-static'}>
          <div ref={moverRef} className={featured.type==='card'?'estate-card-mover estate-card-flyer':'estate-card-static-inner'}>
            <div ref={flipperRef} className={featured.type==='card'?'estate-card-flipper':'estate-card-static-inner'}>
              {featured.type==='card'&&<div className="estate-card-back" aria-hidden="true">
                <div className="estate-card-back-frame">
                  <span className="estate-card-back-emblem">{isComm?'★':'?'}</span>
                  <strong>{isComm?t('KHÍ VẬN'):t('CƠ HỘI')}</strong>
                  <small>{t('Đang rút thẻ…')}</small>
                </div>
              </div>}
              <div className="estate-card-front">
                <span className="estate-card-shine" aria-hidden="true"/>
                <div className="estate-card-front-top">
                  <span className="estate-card-deck-pill">
                    {featured.type==='market'?t('Thị trường'):`Rút từ bộ thẻ ${sourceCellName}${featured.card?` · #${featured.card}`:''}`}
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
                    {featured.type==='market'?t('Áp dụng toàn bàn'):`${nameOf(featured.side)} vừa rút thẻ`}
                  </span>
                  <button type="button" className="estate-card-ok-btn" onClick={onDismissFeatured}><Check size={13}/>{t('Đã xem')}</button>
                </div>
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
