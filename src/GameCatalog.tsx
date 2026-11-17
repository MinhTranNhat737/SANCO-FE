import {useState} from 'react';
import {ArrowUpRight,Search,Users,Swords,Zap,LayoutGrid,Sparkles,X} from 'lucide-react';
import {GAME_KINDS,META,ABSTRACT_KINDS,isParty,type GameKind} from './practice-types';
import './collection.css';
import './home.css';
import GameEmblem from './GameEmblem';

export function GameOptions({value,onChange}:{value:GameKind;onChange:(kind:GameKind)=>void}){
  return <div className="game-options" role="group" aria-label="Chọn loại cờ">{GAME_KINDS.map(kind=><button type="button" key={kind} aria-pressed={value===kind} className={value===kind?'selected':''} onClick={()=>onChange(kind)}><GameEmblem kind={kind}/><strong>{META[kind].name}</strong></button>)}</div>;
}
const newKinds:GameKind[]=[...ABSTRACT_KINDS,'commander'];
const quick:GameKind[]=['caro','connect4','tictactoe','ataxx','breakthrough','isolation'];
const aliases:Partial<Record<GameKind,string>>={chess:'chess co vua',xiangqi:'xiangqi co tuong',reversi:'reversi othello',monopoly:'monopoly ty phu',loa:'lines of action lien quan',breakthrough:'breakthrough dot pha',isolation:'isolation co lap',commander:'co tu lenh commander chess chien tranh',coganh:'co ganh'};
const normalize=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
export default function GameCatalog({disabled,onSelect}:{disabled:boolean;onSelect:(kind:GameKind)=>void}){
  const [filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  const kinds=GAME_KINDS.filter(kind=>(filter==='all'||filter==='new'&&newKinds.includes(kind)||filter==='party'&&isParty(kind)||filter==='quick'&&quick.includes(kind)||filter==='strategy'&&!isParty(kind)&&!quick.includes(kind))&&normalize(`${META[kind].name} ${aliases[kind]||kind}`).includes(normalize(query.trim())));
  return <section className="collection-section visual-catalog" aria-labelledby="catalog-heading">
    <div className="catalog-heading"><h2 id="catalog-heading">Chọn trò <span>{GAME_KINDS.length}</span></h2><label className="catalog-search"><Search size={17}/><input type="search" aria-label="Tìm trò chơi" placeholder="Tìm trò chơi" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Xóa tìm kiếm" onClick={()=>setQuery('')}><X size={16}/></button>}</label></div>
    <div className="collection-filters" role="group" aria-label="Lọc môn cờ">{[{id:'all',label:'Tất cả',icon:LayoutGrid},{id:'new',label:'Mới',icon:Sparkles},{id:'strategy',label:'Chiến thuật',icon:Swords},{id:'quick',label:'Chơi nhanh',icon:Zap},{id:'party',label:'Nhóm bạn',icon:Users}].map(({id,label,icon:Icon})=><button key={id} className={filter===id?'selected':''} aria-pressed={filter===id} onClick={()=>setFilter(id)}><Icon size={15}/>{label}</button>)}</div>
    <div className="collection-grid">{kinds.map(kind=><button key={kind} disabled={disabled} className={`collection-card collection-${kind}`} onClick={()=>onSelect(kind)} aria-label={`Chọn cách chơi ${META[kind].name}`}>
      <div className="catalog-picture"><img src={`/logos/${kind}.jpg`} alt="" loading="lazy" decoding="async" width="320" height="320"/>{newKinds.includes(kind)&&<span className="catalog-new">Mới</span>}<span className="catalog-play"><ArrowUpRight size={23}/></span></div>
      <div className="catalog-caption"><h3>{META[kind].name}</h3><span aria-label={isParty(kind)?'2 đến 4 người':'2 người'}><Users size={14}/>{isParty(kind)?'2–4':'2'}</span></div>
    </button>)}</div>
    {!kinds.length&&<div className="catalog-empty" role="status"><Search size={30}/><p>Không tìm thấy trò</p><button className="text-button" onClick={()=>{setQuery('');setFilter('all');}}>Xem tất cả</button></div>}
  </section>;
}
