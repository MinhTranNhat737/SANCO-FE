import { t } from './language.ts';
import {useEffect,useState,type FormEvent} from 'react';
import {Gavel,Landmark,SkipForward,Coins,Check,X,Sparkles,Eye,TrainFront,Zap,ArrowLeftRight} from 'lucide-react';
import type {PartyState,PracticeMove} from './practice-types';
import {VN_CELLS,VN_GROUP_COLORS,SIDE_NAMES,cash,estateBuyoutPrice} from './estate-data';
import {PARTY_COLORS} from './three/party-layout.ts';
import {PROVINCE_LANDMARKS} from './vietnam-landmarks';

type Props={
  state:PartyState;
  mySide:string;
  turn?:string;
  playerNames?:Record<string,string>;
  legal:PracticeMove[];
  enabled:boolean;
  busy?:boolean;
  onMove:(move:PracticeMove)=>void;
};

export default function EstateAuctionModal({state,mySide,turn,playerNames,legal,enabled,busy=false,onMove}:Props){
  const [customBid,setCustomBid]=useState(10);
  const [minimized,setMinimized]=useState(false);

  const auction=state.auction;
  const me=state.players.find(p=>p.side===mySide);
  const nameOf=(side:string)=>playerNames?.[side]||SIDE_NAMES[side]||side;
  const allowed=(action:string,to?:number)=>legal.some(m=>(m.action||m.command)===action&&(to===undefined||m.to===to));
  const send=(action:string,to=-1,details?:Record<string,unknown>)=>onMove({from:null,to,command:action,...(details?{details}:{})});

  const minBid=auction?auction.bid+10:10;
  useEffect(()=>{
    if(auction){
      setCustomBid(prev=>Math.max(auction.bid+10,prev<auction.bid+10?auction.bid+10:prev));
      setMinimized(false);
    }
  },[auction?.lot,auction?.bid]);

  useEffect(()=>{
    if(state.stage==='buy'||state.stage==='buyout')setMinimized(false);
  },[state.stage,me?.position]);

  const cellSubtitle=(cell:typeof VN_CELLS[number])=>{
    const landmark=PROVINCE_LANDMARKS[cell.name];
    if(landmark)return landmark.title;
    if(cell.type==='station')return t('Bến xe & Nhà ga · Thuê nhân đôi theo số ga');
    if(cell.type==='utility')return t('Công trình tiện ích · Thuê theo tổng 2 xúc xắc');
    return t('Bất động sản đặc biệt');
  };

  // 1. LIVE AUCTION CENTER MODAL — visible to EVERY player in the room once dice & movement land!
  if(state.stage==='auction'&&auction&&!busy){
    const cell=VN_CELLS[auction.lot];
    if(!cell)return null;
    const accent=cell.group!==undefined?VN_GROUP_COLORS[cell.group]:cell.type==='station'?'#16a34a':'#d97706';
    const activePlayers=state.players.filter(p=>p.active);
    const currentBidder=turn||activePlayers.find(p=>!auction.passed.includes(p.side)&&p.side!==auction.leader)?.side;
    const isMyTurn=Boolean(enabled&&(allowed('bid')||allowed('pass_bid')));
    const canBid=Boolean(enabled&&allowed('bid')&&me&&me.cash>=minBid);
    const hasPassed=auction.passed.includes(mySide);

    const quickSteps=auction.bid===0
      ?Array.from(new Set([10,50,100,Math.max(10,Math.floor((cell.price||100)*0.5/10)*10)]))
          .filter(v=>v>=10)
          .sort((a,b)=>a-b)
          .map(amount=>({label:`${amount.toLocaleString('vi-VN')} tr`,amount}))
      :[10,20,50,100].map(step=>({label:`+${step} tr`,amount:auction.bid+step}));

    const submitCustom=(e:FormEvent)=>{
      e.preventDefault();
      if(!canBid||!me)return;
      const val=Math.max(minBid,Math.min(me.cash,Math.floor(customBid)));
      send('bid',-1,{amount:val});
    };

    if(minimized){
      return <button type="button" className="estate-center-reopen is-auction" onClick={()=>setMinimized(false)}>
        <Gavel size={16}/>
        <span>{t('Đang đấu giá') + ' '}<strong>{t(cell.name ?? '')}</strong> · {auction.bid>0?cash(auction.bid):t('Mở màn')}{isMyTurn?t(' · Lượt bạn!'):''}</span>
      </button>;
    }

    return <div className="estate-center-overlay" role="dialog" aria-label={t('Đấu giá {0}', cell.name)}>
      <section className="estate-center-card estate-auction-center" style={{'--lot-accent':accent} as React.CSSProperties}>
        <div className="estate-center-top-accent"/>
        <div className="estate-center-banner">
          <span className="estate-center-kicker">
            <span className="estate-kicker-gem"><Gavel size={13}/></span>{t('ĐẤU GIÁ') + ' '}</span>
          <button type="button" className="estate-center-min" onClick={()=>setMinimized(true)} title={t('Thu gọn để xem bàn')}><Eye size={13}/>{t('Xem bàn')}</button>
        </div>

        <div className="estate-center-body">
          <div className="estate-center-title-row">
            <div className="estate-center-heading">
              <h3>{t(cell.name ?? '')}</h3>
              <span className="estate-center-subtitle">{cellSubtitle(cell)}</span>
            </div>
            <div className="estate-center-listprice">
              <small>{t('Giá mua')}</small>
              <strong>{cash(cell.price)}</strong>
            </div>
          </div>

          <div className="estate-auction-hero">
            <div className="estate-auction-price-box">
              <small>{auction.bid>0?t('Giá cao nhất hiện tại'):t('Khởi điểm đấu giá')}</small>
              <strong>{auction.bid>0?cash(auction.bid):t('Từ 10 tr')}</strong>
            </div>
            <div className="estate-auction-leader-box">
              <small>{t('Đang dẫn')}</small>
              {auction.leader
                ?<span className="estate-leader-pill">
                  <i style={{background:PARTY_COLORS[auction.leader]||'#d7a431'}}/>
                  <strong>{nameOf(auction.leader)}</strong>
                </span>
                :<span className="estate-leader-empty">{t('Chưa có người trả giá')}</span>}
            </div>
          </div>

          <div className="estate-auction-roster" aria-label={t('Người chơi tham gia đấu giá')}>
            {activePlayers.map(p=>{
              const passed=auction.passed.includes(p.side);
              const isLeader=auction.leader===p.side;
              const isAsking=currentBidder===p.side&&!passed;
              return <span key={p.side} className={`estate-bidder-chip ${isLeader?'is-leader':''} ${isAsking?'is-active':''} ${passed?'is-passed':''}`}>
                <i style={{background:PARTY_COLORS[p.side]||'#687d58'}}/>
                <span>{nameOf(p.side)}{p.side===mySide?t(' (Bạn)'):''}</span>
                <em>{isLeader?t('Dẫn'):passed?t('Bỏ'):isAsking?t('Ra giá'):t('Chờ')}</em>
              </span>;
            })}
          </div>

          {!!auction.history?.length&&<div className="estate-bid-feed">
            {auction.history.slice(-4).reverse().map((item,idx)=><div key={`${item.at}-${idx}`} className="estate-bid-feed-row">
              <i style={{background:PARTY_COLORS[item.side]||'#8c9b6e'}}/>
              <span><strong>{nameOf(item.side)}</strong> {item.action==='bid'?t('ra giá {0}', cash(item.amount||0)):t('đã rút lui')}</span>
            </div>)}
          </div>}

          {isMyTurn?<div className="estate-bid-controls">
            <div className="estate-bid-turn-banner">
              <Sparkles size={14}/>
              <span>{t('Đến lượt bạn ra giá · Ví hiện có') + ' '}<strong>{cash(me?.cash||0)}</strong></span>
            </div>

            <div className="estate-bid-steps" role="group" aria-label={t('Các bước giá nhanh')}>
              {quickSteps.map(step=>{
                const disabled=!canBid||!me||step.amount>me.cash;
                return <button
                  key={step.amount}
                  type="button"
                  className="estate-step-btn"
                  disabled={disabled}
                  onClick={()=>send('bid',-1,{amount:step.amount})}
                >
                  <strong>{step.label}</strong>
                  <small>{cash(step.amount)}</small>
                </button>;
              })}
            </div>

            <form className="estate-custom-bid-row" onSubmit={submitCustom}>
              <input
                type="number"
                aria-label={t('Nhập giá đấu tùy chỉnh')}
                min={minBid}
                max={Math.max(minBid,me?.cash||minBid)}
                step={10}
                value={customBid}
                onChange={e=>setCustomBid(+e.target.value)}
                disabled={!canBid}
                required
              />
              <button type="submit" className="estate-lux-btn estate-lux-gold estate-custom-submit" disabled={!canBid}>
                <Coins size={15}/>{t('Đặt giá') + ' '}</button>
            </form>

            <button type="button" className="estate-lux-btn estate-lux-skip estate-pass-btn" disabled={!enabled||!allowed('pass_bid')} onClick={()=>send('pass_bid')}>
              <X size={15}/>{t('Bỏ qua (Không mua)') + ' '}</button>
            <p className="estate-center-footnote">{t('Nếu không có ai mua, phiên đấu giá đóng và bỏ qua lượt luôn.')}</p>
          </div>:<div className="estate-bid-waiting" role="status">
            <strong>{hasPassed?t('Bạn đã rút khỏi phiên đấu giá này'):currentBidder?t('Đang chờ {0} ra giá…', nameOf(currentBidder)):t('Đang chờ người chơi khác…')}</strong>
            <small>{t('Mức tối thiểu tiếp theo:') + ' '}{cash(minBid)}{' ' + t('· Ví của bạn:') + ' '}{cash(me?.cash||0)}</small>
          </div>}
        </div>
      </section>
    </div>;
  }

  // 2. PROPERTY LANDING DECISION MODAL — shown in center when YOU land on an unowned lot
  if(state.stage==='buy'&&enabled&&!busy&&me&&(allowed('buy',me.position)||allowed('auction')||allowed('skip_buy'))){
    const cell=VN_CELLS[me.position];
    if(!cell)return null;
    const accent=cell.group!==undefined?VN_GROUP_COLORS[cell.group]:cell.type==='station'?'#16a34a':'#d97706';
    const canBuy=allowed('buy',me.position)&&me.cash>=cell.price;
    const canSkip=allowed('skip_buy');
    const HeaderIcon=cell.type==='station'?TrainFront:cell.type==='utility'?Zap:Landmark;
    const stats=cell.type==='property'
      ?[
        {label:t('Ví của bạn'),value:cash(me.cash)},
        {label:t('Thuê đất trống'),value:cash(cell.rent[0])},
        {label:t('Thuê khách sạn'),value:cash(cell.rent[5])}
      ]
      :cell.type==='station'
        ?[
          {label:t('Ví của bạn'),value:cash(me.cash)},
          {label:t('Thuê 1 ga'),value:'50 tr'},
          {label:t('Đủ 4 ga'),value:'400 tr'}
        ]
        :[
          {label:t('Ví của bạn'),value:cash(me.cash)},
          {label:t('Sở hữu 1 ô'),value:t('5× xúc xắc')},
          {label:t('Đủ 2 ô'),value:t('12× xúc xắc')}
        ];

    if(minimized){
      return <button type="button" className="estate-center-reopen" onClick={()=>setMinimized(false)}>
        <HeaderIcon size={16}/>
        <span>{t('Quyết định mua') + ' '}<strong>{t(cell.name ?? '')}</strong> · {cash(cell.price)}</span>
      </button>;
    }

    return <div className="estate-center-overlay" role="dialog" aria-label={t('Quyết định ô đất {0}', cell.name)}>
      <section className="estate-center-card estate-buy-center" style={{'--lot-accent':accent} as React.CSSProperties}>
        <div className="estate-center-top-accent"/>
        <div className="estate-center-banner">
          <span className="estate-center-kicker">
            <span className="estate-kicker-gem"><HeaderIcon size={13}/></span>{t('SỔ ĐỎ ĐẤT CHƯA CÓ CHỦ') + ' '}</span>
          <button type="button" className="estate-center-min" onClick={()=>setMinimized(true)} title={t('Thu gọn để xem bàn')}><Eye size={13}/>{t('Xem bàn')}</button>
        </div>

        <div className="estate-center-body">
          <div className="estate-center-title-row">
            <div className="estate-center-heading">
              <h3>{t(cell.name ?? '')}</h3>
              <span className="estate-center-subtitle">{cellSubtitle(cell)}</span>
            </div>
            <div className="estate-center-listprice">
              <small>{t('Giá mua')}</small>
              <strong>{cash(cell.price)}</strong>
            </div>
          </div>

          <div className="estate-buy-facts">
            {stats.map(item=><span key={item.label}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </span>)}
          </div>

          <div className="estate-buy-actions">
            <button type="button" className="estate-lux-btn estate-lux-gold estate-buy-primary" disabled={!canBuy} onClick={()=>send('buy',me.position)}>
              <Check size={17}/>{canBuy?`Mua ngay · ${cash(cell.price)}`:t('Không đủ tiền ({0})', cash(cell.price))}
            </button>
            <button type="button" className="estate-lux-btn estate-lux-skip estate-skip-btn" disabled={!canSkip&&!allowed('auction')} onClick={()=>send(canSkip?'skip_buy':'auction')}>
              <SkipForward size={15}/>{t('Bỏ qua lượt') + ' '}</button>
          </div>
          <p className="estate-center-footnote">{state.profile?t('Bỏ qua sẽ tự động đưa ô đất ra đấu giá.'):t('Bỏ qua sẽ chuyển lượt ngay.')}</p>
        </div>
      </section>
    </div>;
  }

  // 3. PROPERTY BUYOUT MODAL — shown in center when YOU land on an opponent's lot and can buy it out!
  if(state.stage==='buyout'&&enabled&&!busy&&me&&(allowed('buyout',me.position)||allowed('skip_buyout'))){
    const cell=VN_CELLS[me.position];
    const ownerSide=state.property[me.position];
    if(!cell||!ownerSide||ownerSide===mySide)return null;
    const accent=cell.group!==undefined?VN_GROUP_COLORS[cell.group]:cell.type==='station'?'#16a34a':'#d97706';
    const {landPrice,houses,buildingPrice,totalPrice}=estateBuyoutPrice(state,me.position);
    const canBuyout=allowed('buyout',me.position)&&me.cash>=totalPrice;
    const ownerName=nameOf(ownerSide);
    const houseLabel=houses===5?t('1 khách sạn'):houses>0?t('{0} nhà', houses):t('Đất trống');

    if(minimized){
      return <button type="button" className="estate-center-reopen" onClick={()=>setMinimized(false)}>
        <ArrowLeftRight size={16}/>
        <span>{t('Mua lại') + ' '}<strong>{t(cell.name ?? '')}</strong>{' ' + t('từ') + ' '}{ownerName} · {cash(totalPrice)}</span>
      </button>;
    }

    return <div className="estate-center-overlay" role="dialog" aria-label={t('Mua lại ô đất {0}', cell.name)}>
      <section className="estate-center-card estate-buy-center estate-buyout-center" style={{'--lot-accent':accent} as React.CSSProperties}>
        <div className="estate-center-top-accent"/>
        <div className="estate-center-banner">
          <span className="estate-center-kicker">
            <span className="estate-kicker-gem"><ArrowLeftRight size={13}/></span>{t('MUA LẠI ĐẤT ĐỐI THỦ') + ' '}</span>
          <button type="button" className="estate-center-min" onClick={()=>setMinimized(true)} title={t('Thu gọn để xem bàn')}><Eye size={13}/>{t('Xem bàn')}</button>
        </div>

        <div className="estate-center-body">
          <div className="estate-center-title-row">
            <div className="estate-center-heading">
              <h3>{t(cell.name ?? '')}</h3>
              <span className="estate-center-subtitle">{t('Chủ hiện tại:') + ' '}<strong style={{color:PARTY_COLORS[ownerSide]||'#fde047'}}>{ownerName}</strong> · {houseLabel}</span>
            </div>
            <div className="estate-center-listprice">
              <small>{t('Tổng mua lại')}</small>
              <strong>{cash(totalPrice)}</strong>
            </div>
          </div>

          <div className="estate-buy-facts">
            <span>
              <small>{t('Giá đất')}</small>
              <strong>{cash(landPrice)}</strong>
            </span>
            {houses>0?<span>
              <small>{t('Tiền') + ' '}{houses===5?t('khách sạn'):t('{0} nhà', houses)}</small>
              <strong>+{cash(buildingPrice)}</strong>
            </span>:<span>
              <small>{t('Ví sau khi mua')}</small>
              <strong>{cash(Math.max(0,me.cash-totalPrice))}</strong>
            </span>}
            <span>
              <small>{t('Ví hiện có')}</small>
              <strong>{cash(me.cash)}</strong>
            </span>
          </div>

          <div className="estate-buy-actions">
            <button type="button" className="estate-lux-btn estate-lux-gold estate-buy-primary estate-buyout-primary" disabled={!canBuyout} onClick={()=>send('buyout',me.position)}>
              <Check size={17}/>{canBuyout?t('Mua lại ngay · {0}', cash(totalPrice)):t('Không đủ tiền ({0})', cash(totalPrice))}
            </button>
            <button type="button" className="estate-lux-btn estate-lux-skip estate-pass-btn" disabled={!allowed('skip_buyout')} onClick={()=>send('skip_buyout')}>
              <SkipForward size={15}/>{t('Không mua · Bỏ qua lượt') + ' '}</button>
          </div>
          <p className="estate-center-footnote">
            {houses>0
              ?t('Đã cộng giá đất ({0}) + {1} ({2}). Công trình giữ nguyên khi sang tên.', cash(landPrice), houses===5?t('khách sạn'):t('{0} nhà', houses), cash(buildingPrice))
              :t('Chuyển {0} cho {1} và sang tên quyền sở hữu ngay.', cash(totalPrice), ownerName)}
          </p>
        </div>
      </section>
    </div>;
  }

  return null;
}
