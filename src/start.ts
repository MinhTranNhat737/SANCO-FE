import { initializeLanguage, t } from './language.ts';
initializeLanguage();

const bootText = document.querySelector('.sanco-boot-sub');
if (bootText) bootText.textContent = t('Đang tải bàn cờ & kết nối máy chủ…');

import('./main').catch(error=>{
  console.error('Sân Cờ startup error:',error);
  if(import.meta.env.DEV)void fetch('/__dev/client-errors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:error?.message||String(error),stack:error?.stack})}).catch(()=>{});
  const root=document.getElementById('root');if(!root)return;
  const panel=document.createElement('section');panel.className='startup-message';panel.setAttribute('role','alert');
  const heading=document.createElement('h1');heading.textContent=t('Chưa tải được Sân Cờ');
  const text=document.createElement('p');text.textContent=t('Kết nối đã gián đoạn hoặc bản cập nhật chưa tải xong.');
  const retry=document.createElement('button');retry.textContent=t('Tải lại');retry.onclick=()=>window.location.reload();
  panel.append(heading,text,retry);
  if(import.meta.env.DEV){const detail=document.createElement('pre');detail.textContent=String(error?.message||error);panel.append(detail);}
  root.prepend(panel);
});
