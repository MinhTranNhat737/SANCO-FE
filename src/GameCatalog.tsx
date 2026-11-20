import { t, translate } from './language.ts';
import {useState} from 'react';
import {ArrowUpRight,Search,Users,Swords,Zap,LayoutGrid,Sparkles,X} from 'lucide-react';
import {GAME_KINDS,META,ABSTRACT_KINDS,isParty,type GameKind} from './practice-types';
import './collection.css';
import './home.css';
import GameEmblem from './GameEmblem';

export function GameOptions({value,onChange}:{value:GameKind;onChange:(kind:GameKind)=>void}){
  return <div className="game-options" role="group" aria-label={t('Chọn loại cờ')}>{GAME_KINDS.map(kind=><button type="button" key={kind} aria-pressed={value===kind} className={value===kind?'selected':''} onClick={()=>onChange(kind)}><GameEmblem kind={kind}/><strong>{META[kind].name}</strong></button>)}</div>;
}
const newKinds:GameKind[]=[...ABSTRACT_KINDS,'commander'];
const quick:GameKind[]=['caro','connect4','tictactoe','ataxx','breakthrough','isolation'];
const aliases:Partial<Record<GameKind,string>>={chess:'chess co vua',xiangqi:'xiangqi co tuong',reversi:'reversi othello',monopoly:'monopoly ty phu',loa:'lines of action lien quan',breakthrough:'breakthrough dot pha',isolation:'isolation co lap',commander:'co tu lenh commander chess chien tranh',coganh:'co ganh'};
const normalize=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
export default function GameCatalog({disabled,onSelect}:{disabled:boolean;onSelect:(kind:GameKind)=>void}){
  const [filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  const kinds=GAME_KINDS.filter(kind=>(filter==='all'||filter==='new'&&newKinds.includes(kind)||filter==='party'&&isParty(kind)||filter==='quick'&&quick.includes(kind)||filter==='strategy'&&!isParty(kind)&&!quick.includes(kind))&&normalize(translate('en', META[kind].name) + ' ' + META[kind].name + ' ' + (aliases[kind] || kind)).includes(normalize(query.trim())));
  return <section className="collection-section visual-catalog" aria-labelledby="catalog-heading">
    <div className="catalog-heading"><h2 id="catalog-heading">{t('Chọn trò') + ' '}<span>{GAME_KINDS.length}</span></h2><label className="catalog-search"><Search size={17}/><input type="search" aria-label={t('Tìm trò chơi')} placeholder={t('Tìm trò chơi')} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label={t('Xóa tìm kiếm')} onClick={()=>setQuery('')}><X size={16}/></button>}</label></div>
    <div className="collection-filters" role="group" aria-label={t('Lọc môn cờ')}>{[{id:'all',label:t('Tất cả'),icon:LayoutGrid},{id:'new',label:t('Mới'),icon:Sparkles},{id:'strategy',label:t('Chiến thuật'),icon:Swords},{id:'quick',label:t('Chơi nhanh'),icon:Zap},{id:'party',label:t('Nhóm bạn'),icon:Users}].map(({id,label,icon:Icon})=><button key={id} className={filter===id?'selected':''} aria-pressed={filter===id} onClick={()=>setFilter(id)}><Icon size={15}/>{label}</button>)}</div>
    <div className="collection-grid">{kinds.map((kind,index)=><button key={kind} disabled={disabled} className={`collection-card collection-${kind}`} onClick={()=>onSelect(kind)} aria-label={t('Chọn cách chơi {0}', META[kind].name)}>
      <div className="catalog-picture"><img src={`/thumbs/${kind}.jpg`} alt="" loading={index<2?'eager':'lazy'} fetchPriority={index===0?'high':undefined} decoding="async" width="384" height="384"/>{newKinds.includes(kind)&&<span className="catalog-new">{t('Mới')}</span>}<span className="catalog-play"><ArrowUpRight size={23}/></span></div>
      <div className="catalog-caption"><h3>{META[kind].name}</h3><span aria-label={kind==='monopoly'?t('2 đến 8 người'):isParty(kind)?t('2 đến 4 người'):t('2 người')}><Users size={14}/>{kind==='monopoly'?'2–8':isParty(kind)?'2–4':'2'}</span></div>
    </button>)}</div>
    {!kinds.length&&<div className="catalog-empty" role="status"><Search size={30}/><p>{t('Không tìm thấy trò')}</p><button className="text-button" onClick={()=>{setQuery('');setFilter('all');}}>{t('Xem tất cả')}</button></div>}
  </section>;
}
