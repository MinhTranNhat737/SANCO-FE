import {useEffect,useState,type ReactNode} from 'react';
import {ArrowLeft,ChevronDown,ChevronUp,Maximize} from 'lucide-react';

export default function EstateFullscreenHud({title,status,diceBadge,players,actions,menu,inspector,decision,attention,onExit}:{title:string;status:ReactNode;diceBadge?:ReactNode;players?:ReactNode;actions:ReactNode;menu:ReactNode;inspector:ReactNode;decision:ReactNode;attention:string;onExit?:()=>void}){
  const [collapsed,setCollapsed]=useState(false);
  useEffect(()=>{if(attention)setCollapsed(false);},[attention]);
  return <aside className={`estate-game-hud${collapsed?' is-collapsed':''}`} aria-label="HUD Tỷ phú">
    <header>
      <div className="estate-hud-head-copy">
        <strong>{title}</strong>
        <span className="estate-hud-status" role="status">{status}</span>
      </div>
      <button type="button" aria-label={collapsed?'Mở HUD':'Thu gọn HUD'} aria-expanded={!collapsed} onClick={()=>setCollapsed(value=>!value)}>{collapsed?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button>
    </header>
    <div className="estate-game-hud-body" hidden={collapsed}>
      {diceBadge}
      {players&&<div className="estate-hud-players">{players}</div>}
      {decision}
      {inspector}
      {actions}
      <details className="estate-hud-menu"><summary>Menu</summary>
        {menu}
        <button type="button" className="button button-secondary full" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen?.().catch(()=>{});else void document.documentElement.requestFullscreen?.().catch(()=>{});}}><Maximize size={15}/>Toàn màn hình</button>
        {onExit&&<button type="button" className="button button-secondary full" onClick={onExit}><ArrowLeft size={15}/>Về sảnh</button>}
      </details>
    </div>
  </aside>;
}
