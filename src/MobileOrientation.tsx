import { t } from './language.ts';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {RotateCw,Smartphone,ArrowLeft} from 'lucide-react';
import type {GameKind} from './practice-types';
import LanguageSwitch from './LanguageSwitch';

const phoneQuery='(pointer: coarse) and (max-width: 1100px), (max-width: 650px)';
function useMedia(query:string){
  const [matches,setMatches]=useState(()=>window.matchMedia(query).matches);
  useEffect(()=>{const media=window.matchMedia(query),change=()=>setMatches(media.matches);change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[query]);
  return matches;
}
export default function MobileOrientation({kind,onBack}:{kind:GameKind;onBack:()=>void}){
  const mobile=useMedia(phoneQuery),portrait=useMedia('(orientation: portrait)');
  const [preferred,setPreferred]=useState(()=>localStorage.getItem(`sc-landscape-${kind}`)==='on'),[notice,setNotice]=useState('');
  const ownedFullscreen=useRef(false),guard=useRef<HTMLDivElement>(null);
  useEffect(()=>{setPreferred(localStorage.getItem(`sc-landscape-${kind}`)==='on');setNotice('');},[kind]);
  const required=kind==='monopoly'||preferred,blocked=mobile&&portrait&&required;
  useEffect(()=>{
    if(!blocked)return;
    const root=document.getElementById('root'),previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow,wasInert=root?.inert;
    if(root)root.inert=true;document.body.style.overflow='hidden';guard.current?.focus();
    return()=>{if(root)root.inert=!!wasInert;document.body.style.overflow=overflow;previous?.focus();};
  },[blocked]);
  useEffect(()=>()=>{
    if(ownedFullscreen.current){(screen.orientation as ScreenOrientation&{unlock?:()=>void}).unlock?.();if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});}
  },[]);
  async function fullscreen(){
    try{
      if(!document.fullscreenElement){await document.documentElement.requestFullscreen();ownedFullscreen.current=true;}
      const orientation=screen.orientation as ScreenOrientation&{lock?:(value:string)=>Promise<void>};
      if(orientation?.lock)await orientation.lock('landscape');
      else setNotice('Hãy tắt khóa xoay màn hình và xoay điện thoại sang ngang.');
    }catch{setNotice('Trình duyệt chưa hỗ trợ tự xoay. Hãy tắt khóa xoay và xoay điện thoại sang ngang.');}
  }
  return <><div className="orientation-toolbar">
    {kind==='monopoly'?<span><Smartphone size={15}/>{t('Tỷ phú · Luôn chơi ngang')}</span>:<label><input type="checkbox" checked={preferred} onChange={e=>{setPreferred(e.target.checked);localStorage.setItem(`sc-landscape-${kind}`,e.target.checked?'on':'off');}}/><RotateCw size={15}/>{t('Yêu cầu chơi ngang')}</label>}
    <LanguageSwitch/>
  </div>{blocked&&createPortal(<div className="orientation-guard" role="dialog" aria-modal="true" aria-label={t('Xoay ngang điện thoại')} tabIndex={-1} ref={guard} onKeyDown={e=>{if(e.key==='Tab'){const buttons=Array.from(guard.current?.querySelectorAll<HTMLButtonElement>('button')||[]),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===guard.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===guard.current)){e.preventDefault();first?.focus();}}}}>
    <div className="orientation-card"><Smartphone className="orientation-phone" size={68}/><h2>{t('Xoay ngang để chơi')}</h2><p>{kind==='monopoly'?t('Bàn Tỷ phú cần màn hình ngang để xem rõ đất, tài sản và thao tác.'):t('Bạn đã bật chế độ chơi ngang cho môn cờ này.')}</p><p>{t('Tắt khóa xoay, rồi xoay điện thoại. Bàn cờ sẽ tự mở khi màn hình nằm ngang.')}</p><button className="button full" onClick={fullscreen}><RotateCw size={18}/>{t('Thử xoay và mở toàn màn hình')}</button>{notice&&<p role="status">{t(notice)}</p>}{kind!=='monopoly'&&<button className="button button-secondary full" onClick={()=>{setPreferred(false);localStorage.setItem(`sc-landscape-${kind}`,'off');}}>{t('Tiếp tục chơi dọc')}</button>}<button className="text-button" onClick={onBack}><ArrowLeft size={16}/>{t('Về chọn cờ')}</button><small>{t('Đồng hồ ván đang chơi vẫn chạy khi xoay máy.')}</small><LanguageSwitch/></div>
  </div>,document.body)}</>;
}
