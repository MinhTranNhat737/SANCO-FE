import {useEffect,useState} from 'react';
import {Bot,Trophy,ArrowRight,LoaderCircle} from 'lucide-react';
import {api} from './api';
import {META,GAME_KINDS,type GameKind} from './practice-types';
import type {User} from './types';
import type {Rating,BotProfile,RatingChange} from './rating-types';
import GameEmblem from './GameEmblem';

export function EloChange({change}:{change?:RatingChange}){
  if(!change)return null;
  return <div className={`elo-change ${change.delta>=0?'elo-up':'elo-down'}`} role="status"><strong>{change.after} Elo <span>{change.delta>=0?'+':''}{change.delta}</span></strong><small>{change.rank}{change.provisional?` · ${change.games}/10 ván phân hạng`:''}</small></div>;
}

export default function Rankings({user,onPlay}:{user:User|null;onPlay:(kind:GameKind)=>void}){
  const [kind,setKind]=useState<GameKind>('chess'),[ratings,setRatings]=useState<Partial<Record<GameKind,Rating>>>({}),[bots,setBots]=useState<BotProfile[]>([]);
  const [leaders,setLeaders]=useState<(Rating&{name:string;position:number})[]>([]),[ranks,setRanks]=useState<{name:string;min:number}[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{if(!user)return;let active=true;setLoading(true);setError('');
    Promise.all([api('/ratings'),api(`/bots/${kind}`),api(`/leaderboard/${kind}`)]).then(([profile,roster,board])=>{
      if(active){setRatings(profile.ratings);setRanks(profile.ranks);setBots(roster.bots);setLeaders(board.players);}
    }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
  },[user?.id,kind]);
  const rating=ratings[kind];
  return <div className="rankings-page"><div className="page-heading"><h1><Trophy size={28}/> Xếp hạng</h1><p>Mỗi môn một Elo, một hành trình riêng.</p></div>
    <label>Môn cờ<select value={kind} onChange={e=>setKind(e.target.value as GameKind)}>{GAME_KINDS.map(k=><option value={k} key={k}>{META[k].name}</option>)}</select></label>
    {error&&<p className="error-box" role="alert">{error}</p>}
    {loading?<div className="empty-state"><LoaderCircle className="spin"/></div>:rating&&<>
      <section className="panel rank-profile"><GameEmblem kind={kind}/><div><span>{META[kind].name}</span><h2>{rating.elo} <small>Elo</small></h2><strong>{rating.rank}</strong><p>{rating.provisional?`Phân hạng ${rating.games}/10 · Còn ${rating.placementLeft} ván`:rating.nextElo?`Còn ${Math.max(0,rating.nextElo-rating.elo)} Elo đến ${rating.nextRank}`:'Đã đạt bậc cao nhất'}</p></div><button className="button" disabled={!user} onClick={()=>onPlay(kind)}><Trophy size={18}/>Đấu rank<ArrowRight size={17}/></button></section>
      <div className="rank-stats">{[[rating.games,'Ván đã đấu'],[rating.wins,'Thắng'],[rating.draws,'Hòa'],[rating.losses,'Thua'],[rating.peak,'Elo cao nhất']].map(([value,label])=><div className="panel" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="rank-tiers" aria-label="Các bậc xếp hạng">{ranks.map(rank=><span key={rank.name} className={!rating.provisional&&rating.rank===rank.name?'current':''}><Trophy size={15}/><strong>{rank.name}</strong><small>{rank.min}+ Elo</small></span>)}</div>
      <p className="rank-explainer">Khởi đầu 1.000 Elo ở từng môn. 10 ván đầu phân hạng (K = 40), sau đó K = 24. Thắng đối thủ mạnh được nhiều điểm hơn; hòa tính nửa điểm. Phòng riêng có thể bật/tắt tính rank. Luyện tập không đổi Elo.</p>
      <section className="panel"><div className="section-heading"><h2>Bảng xếp hạng · {META[kind].name}</h2></div>{leaders.length?<ol className="rank-leaderboard">{leaders.map(player=><li key={player.position}><b>#{player.position}</b><span><strong>{player.name}</strong><small>{player.rank} · {player.games} ván</small></span><strong>{player.elo} Elo</strong></li>)}</ol>:<p>Chưa có người chơi hoàn tất 10 ván phân hạng. Bạn có thể bắt đầu ngay với bot.</p>}</section>
      <section className="panel"><h2><Bot size={20}/> Đối thủ luôn sẵn sàng</h2><p>12 bot mỗi môn · 400–2.050 Elo ước lượng nội bộ. Máy tự chọn đối thủ gần Elo của bạn. Đây là bot, có thể phục vụ nhiều ván đồng thời; sức mạnh sẽ cần được hiệu chỉnh bằng kết quả thực tế.</p><div className="rank-bots">{bots.map(bot=><article key={bot.id}><Bot size={20}/><div><strong>{bot.name}</strong><small>BOT · {bot.rank}</small></div><b>{bot.elo}</b></article>)}</div></section>
    </>}
  </div>;
}
