import {useEffect,useState,type ReactNode} from 'react';
import {ArrowLeft,ChevronDown,ChevronUp,Maximize} from 'lucide-react';

export default function EstateFullscreenHud({title,status,actions,menu,inspector,decision,attention,onExit}:{title:string;status:ReactNode;actions:ReactNode;menu:ReactNode;inspector:ReactNode;decision:ReactNode;attention:string;onExit?:()=>void}){
  const [collapsed,setCollapsed]=useState(false);
  useEffect(()=>{if(attention)setCollapsed(false);},[attention]);
  return <aside className="estate-game-hud" aria-label="HUD Tỷ phú">
    <header><strong>{title}</strong><button type="button" aria-label={collapsed?'Mở HUD':'Thu gọn HUD'} aria-expanded={!collapsed} onClick={()=>setCollapsed(value=>!value)}>{collapsed?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button></header>
    <div className="estate-game-hud-body" hidden={collapsed}>
      <p className="estate-hud-status" role="status">{status}</p>
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
