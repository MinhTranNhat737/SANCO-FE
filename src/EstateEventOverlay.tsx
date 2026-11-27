import { useLayoutEffect, useRef } from 'react';
import { systemMessage } from './system-message';
import { t } from './language.ts';
import {Sparkles,Coins,Landmark,LockKeyhole,KeyRound,Wrench,Undo2,Flag,ReceiptText,TrendingDown,ArrowRight,Check,X} from 'lucide-react';
import type {EstateEvent} from './practice-types';
import {SIDE_NAMES,cash} from './estate-data';
import {PARTY_COLORS} from './three/party-layout.ts';

type DrawPrompt={
  deck:'chance'|'community';
  side:string;
  canDraw:boolean;
};

type Props={
  featured:EstateEvent|null;
  drawPrompt?:DrawPrompt|null;
  onDrawCard?:()=>void;
  toasts:EstateEvent[];
  playerNames?:Record<string,string>;
  onDismissFeatured:()=>void;
  onDismissToast:(id:number)=>void;
};

export default function EstateEventOverlay({featured,drawPrompt=null,onDrawCard,toasts,playerNames,onDismissFeatured,onDismissToast}:Props){
  const nameOf=(side:string)=>playerNames?.[side]||SIDE_NAMES[side]||side;
  const moverRef=useRef<HTMLDivElement>(null);
  const flipperRef=useRef<HTMLDivElement>(null);
  const deckGhostRef=useRef<HTMLDivElement>(null);

  const cardIcon=(card?:number)=>{
    if(card===1||card===7||card===9)return <Coins size={26}/>;
    if(card===2||card===11)return <Wrench size={26}/>;
    if(card===3||card===12)return <KeyRound size={26}/>;
    if(card===4||card===10)return <Flag size={26}/>;
    if(card===5)return <LockKeyhole size={26}/>;
    return <Undo2 size={26}/>;
  };

  // Clean Vietnamese card copy: NFC-normalized, no redundant deck prefix, clean clause breaks
  const formatCardTitle=(raw?:string)=>(t(raw??'')).normalize('NFC');
  const formatCardDesc=(ev:EstateEvent)=>{
    let text=systemMessage(ev.reason).normalize('NFC').trim();
    if(ev.type==='card'){
      text=text.replace(/^Thẻ\s+(?:Cơ hội|Khí vận|Chance|Community)\s*:\s*/i,'');
      if(text.length>0)text=text[0].toUpperCase()+text.slice(1);
      if(ev.card===11){
        text=text.replace(/;\s*khách sạn/i,'\nKhách sạn').replace(/;\s*/g,' · ');
      }else if(text.includes('; ')){
        text=text.split('; ').map((part,idx)=>idx>0&&part.length?part[0].toUpperCase()+part.slice(1):part).join('\n');
      }
    }
    return text;
  };

  // Exact effect printed right on the face of the drawn card
  const printedEffectText=(ev:EstateEvent)=>{
    if(ev.card===4)return `VỀ Ô XUẤT PHÁT · NHẬN +${cash(ev.amount).toUpperCase()}`.normalize('NFC');
    if(ev.card===5)return t('DI CHUYỂN VÀO TRẠI GIAM NGAY').normalize('NFC');
    if(ev.card===6)return t('DI CHUYỂN LÙI 3 Ô TRÊN BÀN').normalize('NFC');
    if(ev.card===10)return t('ĐẾN NHÀ GA GẦN NHẤT').normalize('NFC');
    if(ev.card===3)return t('NHẬN +1 THẺ RA TÙ MIỄN PHÍ').normalize('NFC');
    if(ev.card===12)return `NHẬN +1 THẺ RA TÙ & +${cash(ev.amount).toUpperCase()}`.normalize('NFC');
    if(ev.amount>0)return `NHẬN THƯỞNG +${cash(ev.amount).toUpperCase()}`.normalize('NFC');
    if(ev.amount<0)return `NỘP PHÍ −${cash(Math.abs(ev.amount)).toUpperCase()}`.normalize('NFC');
    return t('ÁP DỤNG NGAY TRONG LƯỢT').normalize('NFC');
  };

  const printedEffectTone=(ev:EstateEvent)=>{
    if(ev.card===5||ev.amount<0)return 'neg';
    if(ev.card===6||ev.card===10)return 'neu';
    return 'pos';
  };

  // Single unified animation: 1 card slides out of the deck stack and flips open with its printed content & effect!
  useLayoutEffect(()=>{
    if(!featured||featured.type!=='card')return;
    const moverEl=moverRef.current,flipperEl=flipperRef.current,deckEl=deckGhostRef.current;
    if(!moverEl||!flipperEl||typeof moverEl.animate!=='function')return;
    const tilt=featured.deck==='community'?6:-6;

    const moveAnim=moverEl.animate([
      {transform:`translate3d(0px, 0px, 0) scale(0.52) rotate(${tilt}deg)`,offset:0},
      {transform:`translate3d(0px, -54px, 0) scale(0.78) rotate(${-tilt*0.35}deg)`,offset:0.32},
      {transform:'translate3d(0px, -6px, 0) scale(1.02) rotate(0deg)',offset:0.68},
      {transform:'translate3d(0px, 0px, 0) scale(1) rotate(0deg)',offset:1}
    ],{duration:1180,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'forwards'});

    const flipAnim=flipperEl.animate([
      {transform:'rotateY(180deg)',offset:0},
      {transform:'rotateY(180deg)',offset:0.34},
      {transform:'rotateY(0deg)',offset:1}
    ],{duration:1180,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'forwards'});

    const deckAnim=deckEl?.animate?.([
      {transform:`translate3d(0px, 0px, 0) rotate(${tilt}deg) scale(1)`,opacity:1,offset:0},
      {transform:`translate3d(0px, 18px, 0) rotate(${tilt}deg) scale(0.95)`,opacity:0.7,offset:0.38},
      {transform:`translate3d(0px, 38px, 0) rotate(${tilt}deg) scale(0.88)`,opacity:0,offset:1}
    ],{duration:880,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'forwards'});

    return ()=>{
      moveAnim.cancel();
      flipAnim.cancel();
      deckAnim?.cancel();
    };
  },[featured?.id]);

  const isComm=featured?.deck==='community';
  const promptIsComm=drawPrompt?.deck==='community';

  return <>
    {/* 1. Cash / Tax / Rent Toast Stack (only for non-card events) */}
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

    {/* 2A. Interactive Click-to-Draw Card Deck (Player MUST click the deck to draw 1 card) */}
    {!featured&&drawPrompt&&<div className="estate-fx-stage estate-deck-prompt-stage" role="dialog" aria-label={promptIsComm?t('Bộ thẻ Khí vận'):t('Bộ thẻ Cơ hội')}>
      <div className={`estate-deck-prompt-wrap deck-${drawPrompt.deck}`}>
        <button
          type="button"
          className={`estate-deck-click-btn ${drawPrompt.canDraw?'is-interactive':''}`}
          disabled={!drawPrompt.canDraw}
          onClick={()=>drawPrompt.canDraw&&onDrawCard?.()}
          aria-label={promptIsComm?t('Bấm vào bộ thẻ Khí vận để rút 1 lá bài'):t('Bấm vào bộ thẻ Cơ hội để rút 1 lá bài')}
        >
          <span className="estate-deck-tray"/>
          <span className="estate-deck-sheet s5"/>
          <span className="estate-deck-sheet s4"/>
          <span className="estate-deck-sheet s3"/>
          <span className="estate-deck-sheet s2"/>
          <span className="estate-deck-top-cover">
            <span className="estate-deck-top-inner">
              <span className="estate-deck-next-emblem">{promptIsComm?'★':'?'}</span>
              <strong>{promptIsComm?t('KHÍ VẬN'):t('CƠ HỘI')}</strong>
              <small>{drawPrompt.canDraw?t('Bấm để rút 1 lá'):t('Đang chờ rút bài…')}</small>
            </span>
          </span>
        </button>
        <p className="estate-deck-prompt-hint">
          {drawPrompt.canDraw
            ?(promptIsComm?t('Bấm vào Bộ thẻ Khí vận để rút 1 lá bài!'):t('Bấm vào Bộ thẻ Cơ hội để rút 1 lá bài!'))
            :`${nameOf(drawPrompt.side)} đang rút thẻ ${promptIsComm?t('Khí vận'):t('Cơ hội')}…`}
        </p>
      </div>
    </div>}

    {/* 2B. ONE Single Unified Card-Draw & Flip Animation — Effect & Info Printed Directly on the Drawn Card */}
    {featured&&(featured.type==='card'||featured.type==='market')&&<div className="estate-fx-stage" role="status" aria-live="polite" onClick={onDismissFeatured}>
      <div
        key={featured.id}
        className={`estate-card-scene ${featured.type==='card'?'estate-single-card-stage':''} deck-${featured.deck||'chance'}`}
        onClick={e=>e.stopPropagation()}
      >
        {featured.type==='card'&&<div ref={deckGhostRef} className="estate-deck-underlay" aria-hidden="true">
          <span className="estate-deck-tray"/>
          <span className="estate-deck-sheet s4"/>
          <span className="estate-deck-sheet s2"/>
          <div className="estate-deck-next-card">
            <div className="estate-deck-next-inner">
              <span className="estate-deck-next-emblem">{isComm?'★':'?'}</span>
              <strong>{isComm?t('KHÍ VẬN'):t('CƠ HỘI')}</strong>
            </div>
          </div>
        </div>}

        <div className={featured.type==='card'?'estate-drawn-card-slot':'estate-card-static'}>
          <div ref={moverRef} className={featured.type==='card'?'estate-card-mover':'estate-card-static-inner'}>
            <div ref={flipperRef} className={featured.type==='card'?'estate-card-flipper':'estate-card-static-inner'}>
              {featured.type==='card'&&<div className="estate-card-back" aria-hidden="true">
                <div className="estate-card-back-frame">
                  <span className="estate-card-back-emblem">{isComm?'★':'?'}</span>
                  <strong>{isComm?t('KHÍ VẬN'):t('CƠ HỘI')}</strong>
                </div>
              </div>}
              <article className="estate-card-front estate-printed-card">
                <span className="estate-card-shine" aria-hidden="true"/>
                <div className="estate-printed-border">
                  <header className="estate-printed-head">
                    <span className="estate-printed-kicker">
                      {featured.type==='market'?t('THÔNG BÁO THỊ TRƯỜNG'):isComm?t('★ THẺ KHÍ VẬN ★'):t('? THẺ CƠ HỘI ?')}
                    </span>
                    <button type="button" className="estate-printed-close" aria-label={t('Đóng thẻ')} onClick={onDismissFeatured}><X size={14}/></button>
                  </header>

                  <div className="estate-printed-body">
                    <span className="estate-printed-emblem">{featured.type==='market'?<Landmark size={26}/>:cardIcon(featured.card)}</span>
                    <h3 className="estate-printed-title">{formatCardTitle(featured.title)}</h3>
                    <p className="estate-printed-desc">{formatCardDesc(featured)}</p>
                    {featured.type==='card'&&<div className={`estate-printed-stamp ${printedEffectTone(featured)}`}>
                      <small>{t('HIỆU ỨNG TRÊN THẺ')}</small>
                      <strong>{printedEffectText(featured)}</strong>
                    </div>}
                  </div>

                  <footer className="estate-printed-foot">
                    <span className="estate-printed-who">
                      <i style={{background:PARTY_COLORS[featured.side]||'#b45309'}}/>
                      {featured.type==='market'?t('Áp dụng toàn bàn'):nameOf(featured.side)}
                    </span>
                    <button type="button" className="estate-printed-ok" onClick={onDismissFeatured}><Check size={14}/>{t('Tiếp tục')}</button>
                  </footer>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>}

    {/* 3. Jail Notice (for landing directly on Vào tù corner or 3 doubles) */}
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
