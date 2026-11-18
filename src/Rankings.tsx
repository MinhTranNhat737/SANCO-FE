import {useEffect,useState} from 'react';
import {Bot,Trophy,ArrowRight,LoaderCircle} from 'lucide-react';
import {api} from './api';
import {META,GAME_KINDS,type GameKind} from './practice-types';
import type {User} from './types';
import {POOL_LABELS,type RatingPool,type RankedProfile,type Leader,type BotProfile,type RatingChange} from './rating-types';
import GameEmblem from './GameEmblem';
import RankBadge from './RankBadge';

export function EloChange({change}:{change?:RatingChange}){
  if(!change)return null;
  return <div className={`elo-change ${change.delta>=0?'elo-up':'elo-down'}`} role="status"><strong>{change.after} Elo <span>{change.delta>=0?'+':''}{change.delta}</span></strong><small className="rank-label"><RankBadge rank={change.rank} small/>{change.rank}{change.provisional?` · ${change.games}/10 ván phân hạng`:''}</small></div>;
}

type Props={user:User|null;kind:GameKind;pool:RatingPool;onFilter:(kind:GameKind,pool:RatingPool)=>void;onPlay:(kind:GameKind,pool:RatingPool)=>void};
export default function Rankings({user,kind,pool,onFilter,onPlay}:Props){
  const [rating,setRating]=useState<RankedProfile|null>(null),[bots,setBots]=useState<BotProfile[]>([]);
  const [leaders,setLeaders]=useState<Leader[]>([]),[ranks,setRanks]=useState<{name:string;min:number}[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{if(!user)return;let active=true;setLoading(true);setError('');
    Promise.all([api(`/ratings?pool=${pool}`),pool==='overall'?api(`/bots/${kind}`):Promise.resolve({bots:[]}),api(`/leaderboard/${kind}?pool=${pool}`)]).then(([profile,roster,board])=>{
      if(active){setRating(board.me??{...profile.ratings[kind],position:null,rankedPlayers:board.players.length});setRanks(profile.ranks);setBots(roster.bots);setLeaders(board.players);}
    }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
  },[user?.id,kind,pool]);
  return <div className="rankings-page"><div className="page-heading"><h1><Trophy size={28}/> Xếp hạng</h1><p>Xem Elo và vị trí của bạn theo môn cờ và nhóm thời gian.</p></div>
    <div className="ranking-filters"><label>Môn cờ<select value={kind} onChange={e=>onFilter(e.target.value as GameKind,pool)}>{GAME_KINDS.map(k=><option value={k} key={k}>{META[k].name}</option>)}</select></label>
    <label>Bảng xếp hạng<select value={pool} onChange={e=>onFilter(kind,e.target.value as RatingPool)}>{(['rapid','blitz','classical','overall'] as const).map(p=><option key={p} value={p}>{POOL_LABELS[p]}</option>)}</select></label></div>
    {error&&<p className="error-box" role="alert">{error}</p>}
    {loading?<div className="empty-state"><LoaderCircle className="spin"/></div>:!error&&rating&&<>
      <section className="panel rank-profile"><GameEmblem kind={kind}/><div><span>{META[kind].name} · {POOL_LABELS[pool]}</span><h2>{rating.elo} <small>Elo</small></h2><strong className="rank-label"><RankBadge rank={rating.rank} small/>{rating.rank}</strong><p>{rating.provisional?`Phân hạng ${rating.games}/10 · Còn ${rating.placementLeft} ván`:rating.nextElo?`Còn ${Math.max(0,rating.nextElo-rating.elo)} Elo đến ${rating.nextRank}`:'Đã đạt bậc cao nhất'}</p></div><button className="button" disabled={!user} onClick={()=>onPlay(kind,pool)}><Trophy size={18}/>{pool==='overall'?'Đấu bot':'Tìm trận'}<ArrowRight size={17}/></button></section>
      <div className="panel my-rank"><RankBadge rank={rating.rank}/><div><strong>Vị trí của bạn</strong><span>{rating.position===null?`Còn ${rating.placementLeft} ván phân hạng`:`#${rating.position.toLocaleString('vi-VN')} trên ${rating.rankedPlayers.toLocaleString('vi-VN')} người chơi`}</span></div></div>
      <div className="rank-stats">{[[rating.games,'Ván đã đấu'],[rating.wins,'Thắng'],[rating.draws,'Hòa'],[rating.losses,'Thua'],[rating.peak,'Elo cao nhất']].map(([value,label])=><div className="panel" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="rank-tiers" aria-label="Các bậc xếp hạng">{ranks.map(rank=><span key={rank.name} className={!rating.provisional&&rating.rank===rank.name?'current':''}><RankBadge rank={rank.name}/><strong>{rank.name}</strong><small>{rank.min}+ Elo</small></span>)}</div>
      <p className="rank-explainer">Mỗi bảng bắt đầu ở 1.000 Elo và cần 10 ván để công bố thứ hạng. {pool==='overall'?'Bảng này tính các ván rank với bot và phòng riêng bật rank.':'Bảng này tính các ván ghép với người chơi trong nhóm thời gian đã chọn.'}</p>
      <section className="panel"><div className="section-heading"><h2>Top 50 · {META[kind].name}</h2></div>{leaders.length?<ol className="rank-leaderboard">{leaders.map(player=><li key={player.position} className={player.me?'rank-row-me':undefined}><b>#{player.position}</b><RankBadge rank={player.rank} small/><span className="rank-player"><strong>{player.name}{player.me?' · Bạn':''}</strong><small>{player.rank} · {player.games} ván</small></span><strong>{player.elo} Elo</strong></li>)}</ol>:<p>Chưa có người chơi hoàn tất 10 ván phân hạng.</p>}</section>
      {pool==='overall'&&<section className="panel"><h2><Bot size={20}/> Đối thủ máy</h2><p>12 bot mỗi môn với Elo nội bộ từ 400 đến 2.050.</p><div className="rank-bots">{bots.map(bot=><article key={bot.id}><RankBadge rank={bot.rank} small/><div><strong>{bot.name}</strong><small>BOT · {bot.rank}</small></div><b>{bot.elo}</b></article>)}</div></section>}
    </>}
  </div>;
}
