import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Minus,Plus,Scan,LocateFixed} from 'lucide-react';
import {estateBounds} from './three/party-layout.ts';

export default function EstateBoardViewport({children,position,busy,view,topView,onFocusPiece,immersive=false,toolsTarget}:{children:ReactNode;position:number;busy:boolean;view:'2d'|'3d';topView:boolean;onFocusPiece:()=>void;immersive?:boolean;toolsTarget?:HTMLElement|null}){
  const [size,setSize]=useState(1560);
  const viewport=useRef<HTMLDivElement>(null);
  const lastFocus=useRef('');
  const focusPiece=()=>{
    const host=viewport.current,surface=host?.firstElementChild as HTMLElement|null;
    if(!host||!surface||!host.clientWidth)return;
    if(!size){host.scrollLeft=0;host.scrollTop=0;return;}
    const b=estateBounds(position,13),span=view==='3d'?10/11.1:1,inset=(1-span)/2;
    host.scrollLeft=Math.max(0,Math.min(surface.clientWidth-host.clientWidth,(inset+(b.x+b.width/2)/600*span)*surface.clientWidth-host.clientWidth/2));
    host.scrollTop=Math.max(0,Math.min(surface.clientHeight-host.clientHeight,(inset+(b.y+b.height/2)/600*span)*surface.clientHeight-host.clientHeight/2));
  };
  useEffect(()=>{
    if(busy)return;
    const signature=`${size}:${position}:${view}:${topView}`;
    if(lastFocus.current!==signature){focusPiece();lastFocus.current=signature;}
    if(typeof ResizeObserver==='undefined'||!viewport.current)return;
    const host=viewport.current;
    let width=host.clientWidth,height=host.clientHeight;
    const observer=new ResizeObserver(()=>{
      if(width===host.clientWidth&&height===host.clientHeight)return;
      width=host.clientWidth;height=host.clientHeight;focusPiece();
    });observer.observe(host);
    return()=>observer.disconnect();
  },[size,position,busy,view,topView]);
  const tools=<div className="estate-zoom-tools" role="group" aria-label="Kích thước bàn Tỷ phú">
      <button type="button" disabled={size===1040} onClick={()=>setSize(current=>current?Math.max(1040,current-260):1040)}><Minus size={18}/>Thu nhỏ</button>
      <button type="button" disabled={size===2080} onClick={()=>setSize(current=>current?Math.min(2080,current+260):1560)}><Plus size={18}/>Phóng to</button>
      <button type="button" aria-pressed={size===0} onClick={()=>setSize(0)}><Scan size={18}/>Toàn bàn</button>
      <button type="button" onClick={()=>{onFocusPiece();focusPiece();}}><LocateFixed size={18}/>Quân của bạn</button>
      <span>Cuộn để xem các phía</span>
    </div>;
  return <>
    {immersive?(toolsTarget?createPortal(tools,toolsTarget):null):tools}
    <div ref={viewport} className={`estate-board-viewport${size?'':' is-fit'}`} role="region" aria-label="Bàn Tỷ phú một vòng, có thể cuộn" tabIndex={0} onWheelCapture={event=>{if(!event.ctrlKey&&!event.metaKey)event.stopPropagation();}}>
      <div className="estate-board-surface" data-board-size={size} style={size?{width:size}:undefined}>{children}</div>
    </div>
  </>;
}
