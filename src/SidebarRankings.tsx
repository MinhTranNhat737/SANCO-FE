import { languageTag, t } from './language.ts';
import {useEffect,useState} from 'react';
import {ChevronRight,Trophy} from 'lucide-react';
import {api} from './api';
import {META,type GameKind} from './practice-types';
import {rankName,POOL_LABELS,type Leaderboard,type RatingPool} from './rating-types';
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
  return <section className="sidebar-ranks" aria-label={t('Bảng xếp hạng nhanh')}>
    <button className="sidebar-ranks-title" onClick={onOpen}><Trophy size={16}/>{t('Bảng xếp hạng')}<ChevronRight size={15}/></button>
    <p className="sidebar-ranks-pool">{META[kind].name} · {POOL_LABELS[pool]}</p>
    {board?.players.length?<ol className="sidebar-ranks-list">{board.players.slice(0,3).map(player=><li key={player.position} title={rankName(player.rank)}>
      <span>#{player.position}</span><RankBadge rank={player.rank} small/><strong>{player.name}</strong><span>{player.elo}</span>
    </li>)}</ol>:<p className="sidebar-ranks-empty">{failed?t('Chưa tải được bảng hạng'):board?t('Chưa có người hoàn tất phân hạng'):playerId?t('Đang tải…'):t('Đang kết nối…')}</p>}
    {me&&<button className="sidebar-ranks-me" onClick={onOpen}><RankBadge rank={me.rank} small/><span><strong>{me.position===null?t('Hạng của tôi'):t('Hạng của tôi · #{0}', me.position.toLocaleString(languageTag()))}</strong><small>{me.elo} Elo{me.provisional?t(' · {0}/10 ván', me.games):''}</small></span></button>}
  </section>;
}
