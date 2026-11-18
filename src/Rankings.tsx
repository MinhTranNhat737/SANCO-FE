import {useEffect,useState} from 'react';
import {Bot,Trophy,ArrowRight,LoaderCircle} from 'lucide-react';
import {api} from './api';
import {META,GAME_KINDS,type GameKind} from './practice-types';
import type {User} from './types';
import {POOL_LABELS,type RatingPool,type Rating,type BotProfile,type RatingChange} from './rating-types';
import GameEmblem from './GameEmblem';

export function EloChange({change}:{change?:RatingChange}){
  if(!change)return null;
  return <div className={`elo-change ${change.delta>=0?'elo-up':'elo-down'}`} role="status"><strong>{change.after} Elo <span>{change.delta>=0?'+':''}{change.delta}</span></strong><small>{change.rank}{change.provisional?` · ${change.games}/10 ván phân hạng`:''}</small></div>;
}

type RankedProfile=Rating&{position:number|null;rankedPlayers:number};
type Leader=Rating&{name:string;position:number;me?:boolean};
export default function Rankings({user,initialKind,initialPool,onPlay}:{user:User|null;initialKind:GameKind;initialPool:RatingPool;onPlay:(kind:GameKind,pool:RatingPool)=>void}){
  const [kind,setKind]=useState(initialKind),[pool,setPool]=useState(initialPool),[rating,setRating]=useState<RankedProfile|null>(null),[bots,setBots]=useState<BotProfile[]>([]);
  const [leaders,setLeaders]=useState<Leader[]>([]),[ranks,setRanks]=useState<{name:string;min:number}[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{if(!user)return;let active=true;setLoading(true);setError('');
    Promise.all([api(`/ratings?pool=${pool}`),pool==='overall'?api(`/bots/${kind}`):Promise.resolve({bots:[]}),api(`/leaderboard/${kind}?pool=${pool}`)]).then(([profile,roster,board])=>{
      if(active){setRating(board.me??{...profile.ratings[kind],position:null,rankedPlayers:board.players.length});setRanks(profile.ranks);setBots(roster.bots);setLeaders(board.players);}
    }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
  },[user?.id,kind,pool]);
  return <div className="rankings-page"><div className="page-heading"><h1><Trophy size={28}/> Xếp hạng</h1><p>Xem Elo và vị trí của bạn theo môn cờ và nhóm thời gian.</p></div>
    <div className="ranking-filters"><label>Môn cờ<select value={kind} onChange={e=>setKind(e.target.value as GameKind)}>{GAME_KINDS.map(k=><option value={k} key={k}>{META[k].name}</option>)}</select></label>
    <label>Bảng xếp hạng<select value={pool} onChange={e=>setPool(e.target.value as RatingPool)}>{(['rapid','blitz','classical','overall'] as const).map(p=><option key={p} value={p}>{POOL_LABELS[p]}</option>)}</select></label></div>
    {error&&<p className="error-box" role="alert">{error}</p>}
    {loading?<div className="empty-state"><LoaderCircle className="spin"/></div>:!error&&rating&&<>
      <section className="panel rank-profile"><GameEmblem kind={kind}/><div><span>{META[kind].name} · {POOL_LABELS[pool]}</span><h2>{rating.elo} <small>Elo</small></h2><strong>{rating.rank}</strong><p>{rating.provisional?`Phân hạng ${rating.games}/10 · Còn ${rating.placementLeft} ván`:rating.nextElo?`Còn ${Math.max(0,rating.nextElo-rating.elo)} Elo đến ${rating.nextRank}`:'Đã đạt bậc cao nhất'}</p></div><button className="button" disabled={!user} onClick={()=>onPlay(kind,pool)}><Trophy size={18}/>{pool==='overall'?'Đấu bot':'Tìm trận'}<ArrowRight size={17}/></button></section>
      <div className="panel my-rank"><Trophy size={19}/><div><strong>Vị trí của bạn</strong><span>{rating.position===null?`Còn ${rating.placementLeft} ván phân hạng`:`#${rating.position.toLocaleString('vi-VN')} trên ${rating.rankedPlayers.toLocaleString('vi-VN')} người chơi`}</span></div></div>
      <div className="rank-stats">{[[rating.games,'Ván đã đấu'],[rating.wins,'Thắng'],[rating.draws,'Hòa'],[rating.losses,'Thua'],[rating.peak,'Elo cao nhất']].map(([value,label])=><div className="panel" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="rank-tiers" aria-label="Các bậc xếp hạng">{ranks.map(rank=><span key={rank.name} className={!rating.provisional&&rating.rank===rank.name?'current':''}><Trophy size={15}/><strong>{rank.name}</strong><small>{rank.min}+ Elo</small></span>)}</div>
      <p className="rank-explainer">Mỗi bảng bắt đầu ở 1.000 Elo và cần 10 ván để công bố thứ hạng. {pool==='overall'?'Bảng này tính các ván rank với bot và phòng riêng bật rank.':'Bảng này tính các ván ghép với người chơi trong nhóm thời gian đã chọn.'}</p>
      <section className="panel"><div className="section-heading"><h2>Top 50 · {META[kind].name}</h2></div>{leaders.length?<ol className="rank-leaderboard">{leaders.map(player=><li key={player.position} className={player.me?'rank-row-me':undefined}><b>#{player.position}</b><span><strong>{player.name}{player.me?' · Bạn':''}</strong><small>{player.rank} · {player.games} ván</small></span><strong>{player.elo} Elo</strong></li>)}</ol>:<p>Chưa có người chơi hoàn tất 10 ván phân hạng.</p>}</section>
      {pool==='overall'&&<section className="panel"><h2><Bot size={20}/> Đối thủ máy</h2><p>12 bot mỗi môn với Elo nội bộ từ 400 đến 2.050.</p><div className="rank-bots">{bots.map(bot=><article key={bot.id}><Bot size={20}/><div><strong>{bot.name}</strong><small>BOT · {bot.rank}</small></div><b>{bot.elo}</b></article>)}</div></section>}
    </>}
  </div>;
}
