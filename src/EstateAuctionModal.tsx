import {useEffect,useState,type FormEvent} from 'react';
import {Gavel,Landmark,SkipForward,Coins,Check,X,Sparkles,Eye,TrainFront,Zap} from 'lucide-react';
import type {PartyState,PracticeMove} from './practice-types';
import {VN_CELLS,VN_GROUP_COLORS,SIDE_NAMES,cash} from './estate-data';
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
    if(state.stage==='buy')setMinimized(false);
  },[state.stage,me?.position]);

  const cellSubtitle=(cell:typeof VN_CELLS[number])=>{
    const landmark=PROVINCE_LANDMARKS[cell.name];
    if(landmark)return landmark.title;
    if(cell.type==='station')return 'Bến xe & Nhà ga · Thuê nhân đôi theo số ga';
    if(cell.type==='utility')return 'Công trình tiện ích · Thuê theo tổng 2 xúc xắc';
    return 'Bất động sản đặc biệt';
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
        <span>Đang đấu giá <strong>{cell.name}</strong> · {auction.bid>0?cash(auction.bid):'Mở màn'}{isMyTurn?' · Lượt bạn!':''}</span>
      </button>;
    }

    return <div className="estate-center-overlay" role="dialog" aria-label={`Đấu giá ${cell.name}`}>
      <section className="estate-center-card estate-auction-center" style={{'--lot-accent':accent} as React.CSSProperties}>
        <div className="estate-center-top-accent"/>
        <div className="estate-center-banner">
          <span className="estate-center-kicker">
            <span className="estate-kicker-gem"><Gavel size={13}/></span>
            PHIÊN ĐẤU GIÁ HOÀNG GIA
          </span>
          <button type="button" className="estate-center-min" onClick={()=>setMinimized(true)} title="Thu gọn để xem bàn"><Eye size={13}/>Xem bàn</button>
        </div>

        <div className="estate-center-body">
          <div className="estate-center-title-row">
            <div className="estate-center-heading">
              <h3>{cell.name}</h3>
              <span className="estate-center-subtitle">{cellSubtitle(cell)}</span>
            </div>
            <div className="estate-center-listprice">
              <small>Giá niêm yết</small>
              <strong>{cash(cell.price)}</strong>
            </div>
          </div>

          <div className="estate-auction-hero">
            <div className="estate-auction-price-box">
              <small>{auction.bid>0?'Giá cao nhất hiện tại':'Khởi điểm đấu giá'}</small>
              <strong>{auction.bid>0?cash(auction.bid):'Từ 10 tr'}</strong>
            </div>
            <div className="estate-auction-leader-box">
              <small>Người đang dẫn</small>
              {auction.leader
                ?<span className="estate-leader-pill">
                  <i style={{background:PARTY_COLORS[auction.leader]||'#d7a431'}}/>
                  <strong>{nameOf(auction.leader)}</strong>
                </span>
                :<span className="estate-leader-empty">Chưa có người trả giá</span>}
            </div>
          </div>

          <div className="estate-auction-roster" aria-label="Người chơi tham gia đấu giá">
            {activePlayers.map(p=>{
              const passed=auction.passed.includes(p.side);
              const isLeader=auction.leader===p.side;
              const isAsking=currentBidder===p.side&&!passed;
              return <span key={p.side} className={`estate-bidder-chip ${isLeader?'is-leader':''} ${isAsking?'is-active':''} ${passed?'is-passed':''}`}>
                <i style={{background:PARTY_COLORS[p.side]||'#687d58'}}/>
                <span>{nameOf(p.side)}{p.side===mySide?' (Bạn)':''}</span>
                <em>{isLeader?'Dẫn':passed?'Bỏ':isAsking?'Ra giá':'Chờ'}</em>
              </span>;
            })}
          </div>

          {!!auction.history?.length&&<div className="estate-bid-feed">
            {auction.history.slice(-4).reverse().map((item,idx)=><div key={`${item.at}-${idx}`} className="estate-bid-feed-row">
              <i style={{background:PARTY_COLORS[item.side]||'#8c9b6e'}}/>
              <span><strong>{nameOf(item.side)}</strong> {item.action==='bid'?`ra giá ${cash(item.amount||0)}`:'đã rút lui'}</span>
            </div>)}
          </div>}

          {isMyTurn?<div className="estate-bid-controls">
            <div className="estate-bid-turn-banner">
              <Sparkles size={14}/>
              <span>Đến lượt bạn ra giá · Ví hiện có <strong>{cash(me?.cash||0)}</strong></span>
            </div>

            <div className="estate-bid-steps" role="group" aria-label="Các bước giá nhanh">
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
                aria-label="Nhập giá đấu tùy chỉnh"
                min={minBid}
                max={Math.max(minBid,me?.cash||minBid)}
                step={10}
                value={customBid}
                onChange={e=>setCustomBid(+e.target.value)}
                disabled={!canBid}
                required
              />
              <button type="submit" className="estate-lux-btn estate-lux-gold estate-custom-submit" disabled={!canBid}>
                <Coins size={15}/>Đặt giá
              </button>
            </form>

            <button type="button" className="estate-lux-btn estate-lux-skip estate-pass-btn" disabled={!enabled||!allowed('pass_bid')} onClick={()=>send('pass_bid')}>
              <X size={15}/>Bỏ qua (Không mua)
            </button>
            <p className="estate-center-footnote">Nếu không có ai mua, phiên đấu giá đóng và bỏ qua lượt luôn.</p>
          </div>:<div className="estate-bid-waiting" role="status">
            <strong>{hasPassed?'Bạn đã rút khỏi phiên đấu giá này':currentBidder?`Đang chờ ${nameOf(currentBidder)} ra giá…`:'Đang chờ người chơi khác…'}</strong>
            <small>Mức tối thiểu tiếp theo: {cash(minBid)} · Ví của bạn: {cash(me?.cash||0)}</small>
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
        {label:'Ví của bạn',value:cash(me.cash)},
        {label:'Thuê đất trống',value:cash(cell.rent[0])},
        {label:'Thuê khách sạn',value:cash(cell.rent[5])}
      ]
      :cell.type==='station'
        ?[
          {label:'Ví của bạn',value:cash(me.cash)},
          {label:'Thuê 1 ga',value:'50 tr'},
          {label:'Đủ 4 ga',value:'400 tr'}
        ]
        :[
          {label:'Ví của bạn',value:cash(me.cash)},
          {label:'Sở hữu 1 ô',value:'5× xúc xắc'},
          {label:'Đủ 2 ô',value:'12× xúc xắc'}
        ];

    if(minimized){
      return <button type="button" className="estate-center-reopen" onClick={()=>setMinimized(false)}>
        <HeaderIcon size={16}/>
        <span>Chọn mua / đấu giá <strong>{cell.name}</strong> · {cash(cell.price)}</span>
      </button>;
    }

    return <div className="estate-center-overlay" role="dialog" aria-label={`Quyết định ô đất ${cell.name}`}>
      <section className="estate-center-card estate-buy-center" style={{'--lot-accent':accent} as React.CSSProperties}>
        <div className="estate-center-top-accent"/>
        <div className="estate-center-banner">
          <span className="estate-center-kicker">
            <span className="estate-kicker-gem"><HeaderIcon size={13}/></span>
            SỔ ĐỎ ĐẤT CHƯA CÓ CHỦ
          </span>
          <button type="button" className="estate-center-min" onClick={()=>setMinimized(true)} title="Thu gọn để xem bàn"><Eye size={13}/>Xem bàn</button>
        </div>

        <div className="estate-center-body">
          <div className="estate-center-title-row">
            <div className="estate-center-heading">
              <h3>{cell.name}</h3>
              <span className="estate-center-subtitle">{cellSubtitle(cell)}</span>
            </div>
            <div className="estate-center-listprice">
              <small>Giá mua</small>
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
              <Check size={17}/>{canBuy?`Mua ngay · ${cash(cell.price)}`:`Không đủ tiền (${cash(cell.price)})`}
            </button>
            <div className="estate-buy-secondary-row">
              <button type="button" className="estate-lux-btn estate-lux-auction" disabled={!allowed('auction')} onClick={()=>send('auction')}>
                <Gavel size={15}/>Mở đấu giá
              </button>
              <button type="button" className="estate-lux-btn estate-lux-skip estate-skip-btn" disabled={!canSkip} onClick={()=>send('skip_buy')}>
                <SkipForward size={15}/>Bỏ qua lượt
              </button>
            </div>
          </div>
          <p className="estate-center-footnote">Bỏ qua sẽ không mở đấu giá và chuyển lượt ngay.</p>
        </div>
      </section>
    </div>;
  }

  return null;
}
