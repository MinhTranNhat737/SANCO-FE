import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ChevronDown,ChevronUp,Maximize} from 'lucide-react';

const MIN_HUD_WIDTH=220;
const MAX_HUD_WIDTH=460;
const DEFAULT_HUD_WIDTH=276;
const clampWidth=(value:number)=>Math.max(MIN_HUD_WIDTH,Math.min(MAX_HUD_WIDTH,Math.round(value)));

export default function EstateFullscreenHud({title,status,diceBadge,players,actions,menu,inspector,decision,attention,onExit}:{title:string;status:ReactNode;diceBadge?:ReactNode;players?:ReactNode;actions:ReactNode;menu:ReactNode;inspector:ReactNode;decision:ReactNode;attention:string;onExit?:()=>void}){
  const [collapsed,setCollapsed]=useState(false);
  const [resizing,setResizing]=useState(false);
  const [width,setWidth]=useState<number>(()=>{
    try{
      const saved=Number(localStorage.getItem('sc-estate-hud-width'));
      return Number.isFinite(saved)&&saved>=MIN_HUD_WIDTH?clampWidth(saved):DEFAULT_HUD_WIDTH;
    }catch{return DEFAULT_HUD_WIDTH;}
  });
  const asideRef=useRef<HTMLElement>(null);

  useEffect(()=>{if(attention)setCollapsed(false);},[attention]);

  useEffect(()=>{
    const parent=asideRef.current?.closest('.estate-immersive') as HTMLElement|null;
    if(parent)parent.style.setProperty('--estate-hud-width',`${width}px`);
    try{localStorage.setItem('sc-estate-hud-width',String(width));}catch{/* Storage may be unavailable */}
  },[width]);

  const startResize=(e:React.PointerEvent)=>{
    if(collapsed)return;
    e.preventDefault();
    setResizing(true);
    const onMove=(ev:PointerEvent)=>{
      const maxAllowed=Math.min(MAX_HUD_WIDTH,Math.max(MIN_HUD_WIDTH,window.innerWidth-260));
      const next=Math.max(MIN_HUD_WIDTH,Math.min(maxAllowed,Math.round(window.innerWidth-ev.clientX)));
      setWidth(next);
    };
    const onUp=()=>{
      setResizing(false);
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp);
      window.removeEventListener('pointercancel',onUp);
    };
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp);
    window.addEventListener('pointercancel',onUp);
  };

  return <aside
    ref={asideRef}
    className={`estate-game-hud${collapsed?' is-collapsed':''}${resizing?' is-resizing':''}`}
    style={collapsed?undefined:{width,flexBasis:width}}
    aria-label="HUD Tỷ phú"
  >
    {!collapsed&&<div
      className="estate-hud-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Kéo để co giãn kích thước HUD"
      aria-valuemin={MIN_HUD_WIDTH}
      aria-valuemax={MAX_HUD_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      title="Kéo để co giãn · Nhấp đúp để mặc định"
      onPointerDown={startResize}
      onDoubleClick={()=>setWidth(DEFAULT_HUD_WIDTH)}
      onKeyDown={e=>{
        if(e.key==='ArrowLeft'){e.preventDefault();setWidth(w=>clampWidth(w+20));}
        else if(e.key==='ArrowRight'){e.preventDefault();setWidth(w=>clampWidth(w-20));}
        else if(e.key==='Home'){e.preventDefault();setWidth(DEFAULT_HUD_WIDTH);}
      }}
    />}
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
