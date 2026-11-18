import {useEffect,useState} from 'react';
import {ChevronRight,Trophy} from 'lucide-react';
import {api} from './api';
import {META,type GameKind} from './practice-types';
import {POOL_LABELS,type Leaderboard,type RatingPool} from './rating-types';
import RankBadge from './RankBadge';

type Props={kind:GameKind;pool:RatingPool;playerId:string|null;hidden:boolean;refresh:number;onOpen:()=>void};

export default function SidebarRankings({kind,pool,playerId,hidden,refresh,onOpen}:Props){
  const [board,setBoard]=useState<Leaderboard|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(hidden||!playerId)return;
    let active=true;
    setBoard(null);setFailed(false);
    api<Leaderboard>(`/leaderboard/${kind}?pool=${pool}`).then(data=>{if(active)setBoard(data);})
      .catch(()=>{if(active)setFailed(true);});
    return ()=>{active=false;};
  },[kind,pool,playerId,hidden,refresh]);
  if(hidden)return null;

  const me=board?.me;
  return <section className="sidebar-ranks" aria-label="Bảng xếp hạng nhanh">
    <button className="sidebar-ranks-title" onClick={onOpen}><Trophy size={16}/>Bảng xếp hạng<ChevronRight size={15}/></button>
    <p className="sidebar-ranks-pool">{META[kind].name} · {POOL_LABELS[pool]}</p>
    {board?.players.length?<ol className="sidebar-ranks-list">{board.players.slice(0,3).map(player=><li key={player.position} title={player.rank}>
      <span>#{player.position}</span><RankBadge rank={player.rank} small/><strong>{player.name}</strong><span>{player.elo}</span>
    </li>)}</ol>:<p className="sidebar-ranks-empty">{failed?'Chưa tải được bảng hạng':board?'Chưa có người hoàn tất phân hạng':playerId?'Đang tải…':'Đang kết nối…'}</p>}
    {me&&<button className="sidebar-ranks-me" onClick={onOpen}><RankBadge rank={me.rank} small/><span><strong>{me.position===null?'Hạng của tôi':`Hạng của tôi · #${me.position.toLocaleString('vi-VN')}`}</strong><small>{me.elo} Elo{me.provisional?` · ${me.games}/10 ván`:''}</small></span></button>}
  </section>;
}
