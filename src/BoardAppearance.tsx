import {useSyncExternalStore} from 'react';
import {Sun,Moon} from 'lucide-react';
import type {BoardTheme} from './board-palette';
import './board-appearance.css';

const key='sc-board-theme',event='sc-board-theme-change';
let fallback:BoardTheme='dark';
function snapshot():BoardTheme {
  try {const stored=localStorage.getItem(key);return stored==='light'||stored==='dark'?stored:fallback;}catch{return fallback;}
}
function subscribe(listener:()=>void){
  window.addEventListener(event,listener);window.addEventListener('storage',listener);
  return()=>{window.removeEventListener(event,listener);window.removeEventListener('storage',listener);};
}
export function useBoardTheme(){
  const theme=useSyncExternalStore(subscribe,snapshot,()=>'dark' as BoardTheme);
  const setTheme=(next:BoardTheme)=>{fallback=next;try{localStorage.setItem(key,next);}catch{}window.dispatchEvent(new Event(event));};
  return [theme,setTheme] as const;
}
export default function BoardAppearance(){
  const [theme,setTheme]=useBoardTheme();
  return <div className="board-appearance" role="group" aria-label="Màu bàn cờ">
    <button type="button" aria-pressed={theme==='light'} onClick={()=>setTheme('light')}><Sun size={15}/>Sáng</button>
    <button type="button" aria-pressed={theme==='dark'} onClick={()=>setTheme('dark')}><Moon size={15}/>Tối</button>
  </div>;
}
