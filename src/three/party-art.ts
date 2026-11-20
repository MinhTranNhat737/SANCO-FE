import {BOARD_PALETTES,type BoardTheme} from '../board-palette.ts';
import * as T from 'three';
import {CITIES,GROUP_COLORS,PARTY_COLORS,PARTY_SIDES,LUDO_PATH,LUDO_SAFE,estateBounds,estateCenterBounds,estateTitleLines,groupOf} from './party-layout.ts';
import {VN_CELLS,VN_GROUP_COLORS,ownable} from '../estate-data.ts';
import {PROVINCE_LANDMARKS,type LandmarkKind} from '../vietnam-landmarks.ts';

const UI_FONT="'Be Vietnam Pro','Segoe UI',Arial,sans-serif";
const DISPLAY_FONT="'Playfair Display',Georgia,'Times New Roman',serif";

function canvas(size=2400){const el=document.createElement('canvas');el.width=el.height=size;return {el,ctx:el.getContext('2d')!};}
function texture(el:HTMLCanvasElement){const t=new T.CanvasTexture(el);t.colorSpace=T.SRGBColorSpace;t.anisotropy=16;return t;}
function round(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string|CanvasGradient,stroke?:string,lineWidth=1){
  ctx.beginPath();
  if(r>0)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);
  ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}
function text(ctx:CanvasRenderingContext2D,label:string,x:number,y:number,size:number,color:string,font=UI_FONT,weight='700',maxWidth?:number){
  ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign='center';ctx.textBaseline='middle';
  if(maxWidth)ctx.fillText(label,x,y,maxWidth);else ctx.fillText(label,x,y);
}
function star(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,points=5){
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const a=-Math.PI/2+i*Math.PI/points,rr=i%2?r*.42:r;
    ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);
  }
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
}

export function woodTexture(){
  const {el,ctx}=canvas(512);
  const grad=ctx.createLinearGradient(0,0,512,512);
  grad.addColorStop(0,'#633d22');grad.addColorStop(.5,'#4d2e18');grad.addColorStop(1,'#5c381f');
  ctx.fillStyle=grad;ctx.fillRect(0,0,512,512);
  for(let i=0;i<190;i++){
    ctx.strokeStyle=i%3?'#c88b422a':'#1c120977';ctx.lineWidth=i%3?1:2;
    ctx.beginPath();
    for(let x=0;x<=512;x+=8)ctx.lineTo(x,i*2.8+Math.sin(x*.014+i*.38)*8+Math.sin(x*.043+i)*2);
    ctx.stroke();
  }
  return texture(el);
}

function drawLandmarkIcon(ctx:CanvasRenderingContext2D,kind:LandmarkKind,cx:number,cy:number,accent:string){
  ctx.save();
  // Soft framed medallion backdrop
  ctx.beginPath();ctx.arc(cx,cy,7.4,0,Math.PI*2);
  const bg=ctx.createLinearGradient(cx,cy-7.4,cx,cy+7.4);
  bg.addColorStop(0,'#fff8e6');bg.addColorStop(1,'#e6d8b5');
  ctx.fillStyle=bg;ctx.fill();
  ctx.strokeStyle=accent;ctx.lineWidth=.9;ctx.stroke();

  ctx.beginPath();ctx.arc(cx,cy,6.7,0,Math.PI*2);ctx.clip();

  if(kind==='hanoi'){
    // Hồ Gươm & Tháp Rùa
    ctx.fillStyle='#bce0ee';ctx.fillRect(cx-7,cy-7,14,10);
    ctx.fillStyle='#2a7f9e';ctx.fillRect(cx-7,cy+2.5,14,5);
    ctx.fillStyle='#598a4a';ctx.beginPath();ctx.ellipse(cx,cy+2.8,5.6,1.8,0,0,Math.PI*2);ctx.fill();
    // 3-tier Turtle Tower
    ctx.fillStyle='#c99f5e';ctx.fillRect(cx-3.2,cy-1.2,6.4,3.4);
    ctx.fillStyle='#9e3328';
    ctx.fillRect(cx-3.8,cy-1.4,7.6,.9);
    ctx.fillRect(cx-2.4,cy-3.4,4.8,2);
    ctx.fillRect(cx-3,cy-3.6,6,.8);
    ctx.beginPath();ctx.moveTo(cx-2.2,cy-3.6);ctx.lineTo(cx,cy-5.8);ctx.lineTo(cx+2.2,cy-3.6);ctx.closePath();ctx.fill();
  }else if(kind==='hcm'){
    // Landmark 81 + Chợ Bến Thành
    ctx.fillStyle='#d5e6f2';ctx.fillRect(cx-7,cy-7,14,14);
    ctx.fillStyle='#2d658a';ctx.fillRect(cx+1,cy-5.5,2.2,11);
    ctx.fillStyle='#3d85ad';ctx.fillRect(cx+3.2,cy-3.5,1.6,9);
    ctx.fillStyle='#e5d2a1';ctx.fillRect(cx-5.5,cy+.5,6.5,5.5);
    ctx.fillStyle='#a84432';ctx.fillRect(cx-3.2,cy-2.5,2.2,3);
    ctx.beginPath();ctx.arc(cx-2.1,cy-1.2,.7,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
  }else if(kind==='halong'){
    // Vịnh Hạ Long (limestone karsts + red junk sail)
    ctx.fillStyle='#cbeaf2';ctx.fillRect(cx-7,cy-7,14,10);
    ctx.fillStyle='#1f7a91';ctx.fillRect(cx-7,cy+2,14,5.5);
    ctx.fillStyle='#3e6352';
    ctx.beginPath();ctx.moveTo(cx-6.5,cy+2.2);ctx.lineTo(cx-4,cy-4.2);ctx.lineTo(cx-1.2,cy+2.2);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(cx-1,cy+2.2);ctx.lineTo(cx+2.2,cy-5.2);ctx.lineTo(cx+5.5,cy+2.2);ctx.closePath();ctx.fill();
    ctx.fillStyle='#b83b2c';ctx.beginPath();ctx.moveTo(cx+2,cy+2.5);ctx.lineTo(cx+3.5,cy-1.8);ctx.lineTo(cx+5.5,cy+2.5);ctx.closePath();ctx.fill();
  }else if(kind==='hue'){
    // Chùa Thiên Mụ / Kinh Thành Huế
    ctx.fillStyle='#e8d9eb';ctx.fillRect(cx-7,cy-7,14,14);
    ctx.fillStyle='#6c3063';
    for(let t=0;t<4;t++){
      const w=6.8-t*1.2,y=cy+3.5-t*2.3;
      ctx.fillRect(cx-w/2,y,w,1.8);
      ctx.fillStyle='#d9b25f';ctx.fillRect(cx-w/2-.7,y-.4,w+1.4,.7);
      ctx.fillStyle='#7e3b73';
    }
    ctx.fillStyle='#d9b25f';ctx.fillRect(cx-.5,cy-5.8,1,2.2);
  }else if(kind==='danang'){
    // Cầu Rồng vàng Đà Nẵng
    ctx.fillStyle='#cce5f0';ctx.fillRect(cx-7,cy-7,14,10);
    ctx.fillStyle='#247291';ctx.fillRect(cx-7,cy+2.5,14,5);
    ctx.strokeStyle='#d4911e';ctx.lineWidth=1.7;
    ctx.beginPath();ctx.moveTo(cx-6.5,cy+2.5);ctx.quadraticCurveTo(cx-3,cy-4,cx,cy+.5);ctx.quadraticCurveTo(cx+3,cy-3.5,cx+6,cy+2);ctx.stroke();
    ctx.fillStyle='#d94726';ctx.beginPath();ctx.arc(cx+5.4,cy-1,1.3,0,Math.PI*2);ctx.fill();
  }else if(kind==='fansipan'||kind==='mountain'){
    // Núi cao & đỉnh Fansipan
    ctx.fillStyle='#cde3ef';ctx.fillRect(cx-7,cy-7,14,14);
    ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(cx-7,cy+6);ctx.lineTo(cx-1,cy-5.2);ctx.lineTo(cx+5,cy+6);ctx.closePath();ctx.fill();
    ctx.fillStyle='#1f4739';ctx.beginPath();ctx.moveTo(cx-1,cy+6);ctx.lineTo(cx+3.5,cy-2.2);ctx.lineTo(cx+7.5,cy+6);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx-2.6,cy-2.2);ctx.lineTo(cx-1,cy-5.2);ctx.lineTo(cx+.6,cy-2.2);ctx.closePath();ctx.fill();
  }else if(kind==='ninhbinh'||kind==='cave'){
    // Tràng An / Động Phong Nha
    ctx.fillStyle='#cbe6e0';ctx.fillRect(cx-7,cy-7,14,10);
    ctx.fillStyle='#26756b';ctx.fillRect(cx-7,cy+2.5,14,5);
    ctx.fillStyle='#3b5e4d';
    ctx.beginPath();ctx.arc(cx-2,cy+2.5,4.2,Math.PI,0);ctx.fill();
    ctx.beginPath();ctx.arc(cx+3,cy+2.5,3.5,Math.PI,0);ctx.fill();
    ctx.fillStyle='#15362e';ctx.beginPath();ctx.arc(cx-2,cy+2.5,1.8,Math.PI,0);ctx.fill();
  }else if(kind==='camau'){
    // Mũi tàu Cà Mau
    ctx.fillStyle='#d4e8f0';ctx.fillRect(cx-7,cy-7,14,10);
    ctx.fillStyle='#1f6d82';ctx.fillRect(cx-7,cy+2.5,14,5);
    ctx.fillStyle='#a84231';ctx.beginPath();ctx.moveTo(cx-5,cy+3.5);ctx.lineTo(cx+5.5,cy-1.2);ctx.lineTo(cx+1.5,cy+3.5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e8cf86';ctx.fillRect(cx-.5,cy-5,1.2,6.5);
  }else if(kind==='cantho'||kind==='haiphong'||kind==='island'){
    // Thuyền / Cảng biển / Đảo
    ctx.fillStyle='#d2eaf2';ctx.fillRect(cx-7,cy-7,14,10);
    ctx.fillStyle='#1c7694';ctx.fillRect(cx-7,cy+2,14,5.5);
    ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(cx-5,cy+1.2);ctx.lineTo(cx+5,cy+1.2);ctx.lineTo(cx+3.5,cy+3.8);ctx.lineTo(cx-3.5,cy+3.8);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f7e4ad';ctx.beginPath();ctx.moveTo(cx-.5,cy+1);ctx.lineTo(cx-.5,cy-5);ctx.lineTo(cx+4,cy+.2);ctx.closePath();ctx.fill();
  }else if(kind==='nhatrang'||kind==='dienbien'){
    // Tháp / Tượng đài
    ctx.fillStyle='#d6eaf2';ctx.fillRect(cx-7,cy-7,14,14);
    ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(cx-2.5,cy+5.5);ctx.lineTo(cx-.8,cy-5.2);ctx.lineTo(cx+.8,cy-5.2);ctx.lineTo(cx+2.5,cy+5.5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f2d479';ctx.beginPath();ctx.arc(cx,cy-1.2,1.6,0,Math.PI*2);ctx.fill();
  }else if(kind==='tea'||kind==='dalat'||kind==='rice'){
    // Đồi chè / Thông Đà Lạt / Ruộng lúa
    ctx.fillStyle='#dcf0e2';ctx.fillRect(cx-7,cy-7,14,14);
    ctx.fillStyle='#4aa366';ctx.beginPath();ctx.arc(cx-3.5,cy+6.5,6.5,Math.PI,0);ctx.fill();
    ctx.fillStyle='#2b7546';ctx.beginPath();ctx.arc(cx+3,cy+7,6.5,Math.PI,0);ctx.fill();
    if(kind==='dalat'){
      ctx.fillStyle='#1e5232';ctx.beginPath();ctx.moveTo(cx-1,cy-5.5);ctx.lineTo(cx-4,cy+2);ctx.lineTo(cx+2,cy+2);ctx.closePath();ctx.fill();
    }
  }else if(kind==='coffee'){
    // Ly cà phê Buôn Ma Thuột
    ctx.fillStyle='#f5e9d6';ctx.fillRect(cx-7,cy-7,14,14);
    ctx.fillStyle='#5c331b';round(ctx,cx-3.8,cy-1.5,7.6,5.8,1.5,'#5c331b');
    ctx.strokeStyle='#8c593b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-1.8,cy-3);ctx.lineTo(cx-1.8,cy-5);ctx.moveTo(cx+1.2,cy-3);ctx.lineTo(cx+1.2,cy-5);ctx.stroke();
  }else if(kind==='lotus'){
    // Hoa sen Đồng Tháp / Làng Sen
    ctx.fillStyle='#fcebf0';ctx.fillRect(cx-7,cy-7,14,14);
    ctx.fillStyle='#d95b7d';
    ctx.beginPath();ctx.ellipse(cx,cy,2.1,5,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(cx-2.6,cy+.8,1.9,4.2,-.55,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(cx+2.6,cy+.8,1.9,4.2,.55,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3b8751';ctx.fillRect(cx-5,cy+4,10,2);
  }else if(kind==='fruit'){
    // Vườn cây trái / Nhãn lồng
    ctx.fillStyle='#eef5df';ctx.fillRect(cx-7,cy-7,14,14);
    ctx.fillStyle='#468742';ctx.beginPath();ctx.ellipse(cx+1,cy-3.2,3.2,1.3,-.4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d68e29';ctx.beginPath();ctx.arc(cx-2,cy+1.2,2.6,0,Math.PI*2);ctx.arc(cx+2.3,cy+1.5,2.5,0,Math.PI*2);ctx.arc(cx,cy-1.2,2.3,0,Math.PI*2);ctx.fill();
  }else if(kind==='bridge'){
    // Cầu Hàm Rồng / Cầu cổ
    ctx.fillStyle='#dcebf2';ctx.fillRect(cx-7,cy-7,14,10);
    ctx.fillStyle='#2b758c';ctx.fillRect(cx-7,cy+2.5,14,5);
    ctx.strokeStyle=accent;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,cy+2.8,4.8,Math.PI,0);ctx.stroke();
  }else{
    // Đền / Thành cổ / Khu di tích (temple)
    ctx.fillStyle='#f5ead5';ctx.fillRect(cx-7,cy-7,14,14);
    ctx.fillStyle=accent;
    ctx.beginPath();ctx.moveTo(cx-6,cy-.5);ctx.lineTo(cx,cy-5);ctx.lineTo(cx+6,cy-.5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d4ae60';ctx.fillRect(cx-4.2,cy-.5,8.4,4.8);
    ctx.fillStyle='#4a311c';ctx.fillRect(cx-1.3,cy+1.2,2.6,3.1);
  }
  ctx.restore();
}

function drawSpecialIcon(ctx:CanvasRenderingContext2D,type:string,cx:number,cy:number){
  ctx.save();
  if(type==='station'){
    round(ctx,cx-6.5,cy-4,13,8,2,'#244937','#d8b66c',.8);
    round(ctx,cx-4.5,cy-2.5,9,3.5,1,'#f2e3b3');
    ctx.fillStyle='#d8b66c';ctx.beginPath();ctx.arc(cx-3.4,cy+4.8,1.4,0,Math.PI*2);ctx.arc(cx+3.4,cy+4.8,1.4,0,Math.PI*2);ctx.fill();
  }else if(type==='utility'){
    ctx.fillStyle='#d69e2e';
    ctx.beginPath();ctx.moveTo(cx+1,cy-5.5);ctx.lineTo(cx-3.6,cy+.4);ctx.lineTo(cx,cy+.4);ctx.lineTo(cx-1.4,cy+5.5);ctx.lineTo(cx+4,cy-.8);ctx.lineTo(cx+.5,cy-.8);ctx.closePath();ctx.fill();
  }else if(type==='chance'){
    ctx.beginPath();ctx.arc(cx,cy,5.8,0,Math.PI*2);ctx.fillStyle='#9e3b2e';ctx.fill();ctx.strokeStyle='#f2d794';ctx.lineWidth=.9;ctx.stroke();
    text(ctx,'?',cx,cy+.4,8.2,'#fff4d2','Georgia','700');
  }else if(type==='community'){
    round(ctx,cx-6,cy-4.2,12,8.4,2,'#285943','#e5c778',.9);
    ctx.beginPath();ctx.moveTo(cx-6,cy-.4);ctx.lineTo(cx+6,cy-.4);ctx.strokeStyle='#e5c778';ctx.lineWidth=1;ctx.stroke();
    star(ctx,cx,cy-.4,2.5,'#f7e29c');
  }else if(type==='tax'){
    ctx.beginPath();ctx.moveTo(cx,cy-5.5);ctx.lineTo(cx+5.5,cy);ctx.lineTo(cx,cy+5.5);ctx.lineTo(cx-5.5,cy);ctx.closePath();
    ctx.fillStyle='#8c3428';ctx.fill();ctx.strokeStyle='#eccd83';ctx.lineWidth=.9;ctx.stroke();
    text(ctx,'%',cx,cy+.3,6.5,'#fff0c7',UI_FONT,'800');
  }else if(type==='start'){
    star(ctx,cx,cy,6.4,'#c43c2d',8);
    star(ctx,cx,cy,3.8,'#f7df94',5);
  }else if(type==='jail'){
    round(ctx,cx-5.8,cy-4.8,11.6,9.6,1.5,'#37443c','#d5c394',.9);
    ctx.strokeStyle='#d5c394';ctx.lineWidth=1;
    for(let k=-3;k<=3;k+=3){ctx.beginPath();ctx.moveTo(cx+k,cy-4.5);ctx.lineTo(cx+k,cy+4.5);ctx.stroke();}
  }else if(type==='gotojail'){
    ctx.beginPath();ctx.arc(cx,cy,5.8,0,Math.PI*2);ctx.fillStyle='#a6382b';ctx.fill();ctx.strokeStyle='#f4dc96';ctx.lineWidth=.9;ctx.stroke();
    text(ctx,'!',cx,cy+.4,8.5,'#fff4d2',UI_FONT,'800');
  }else if(type==='rest'){
    ctx.beginPath();ctx.arc(cx,cy,5.8,0,Math.PI*2);ctx.fillStyle='#2b5e46';ctx.fill();ctx.strokeStyle='#ecd086';ctx.lineWidth=.9;ctx.stroke();
    star(ctx,cx,cy,3.8,'#f6e2a2',6);
  }
  ctx.restore();
}

function vietnamPrint(ctx:CanvasRenderingContext2D,theme:BoardTheme){
  const palette=BOARD_PALETTES[theme];
  const center=estateCenterBounds(13),inner=center.x,innerSpan=center.width;
  round(ctx,inner,inner,innerSpan,innerSpan,0,palette.center,'#546658',1.5);
  text(ctx,'TỶ PHÚ',300,266,34,palette.centerInk,UI_FONT,'900');
  text(ctx,'VIỆT NAM',300,302,19,palette.centerInk,UI_FONT,'800');
  const priceColor=theme==='dark'?'#fae39b':'#24170c';
  VN_CELLS.forEach(c=>{
    const b=estateBounds(c.index,13),w=b.width,h=b.height,corner=c.index%12===0;
    const own=ownable(c),bandColor=c.group!==undefined?VN_GROUP_COLORS[c.group]:'#64748b';
    const price=own?c.price+' tr':c.type==='start'?'+400 tr':c.type==='tax'?'−'+c.amount+' tr':'';
    ctx.save();ctx.translate(b.x,b.y);
    round(ctx,.35,.35,w-.7,h-.7,0,corner?palette.special:palette.lot,corner?'#d4b060':'#34483b',corner?1.7:1.05);
    if(c.type==='property')round(ctx,1,1,w-2,6.2,0,bandColor);
    const rows=estateTitleLines(c.name,true),fs=corner?9.6:9.0;
    const tx=w/2,ty=rows.length>1?(c.type==='property'?13.2:11.2):(c.type==='property'?17.2:15.2);
    rows.forEach((line,i)=>text(ctx,line,tx,ty+i*(fs+1.1),fs,palette.lotInk,UI_FONT,'900',w-3));
    if(!PROVINCE_LANDMARKS[c.name]){
      ctx.save();ctx.translate(w/2,h*(price?.63:.66));ctx.scale(corner?.9:.68,corner?.9:.68);drawSpecialIcon(ctx,c.type,0,0);ctx.restore();
    }
    if(price)text(ctx,price,tx,h-5.0,corner?8.5:8.0,c.type==='tax'?'#fca5a5':priceColor,UI_FONT,'900',w-3);
    ctx.restore();
  });
}

export function boardTexture(kind:string,edition='legacy',theme:BoardTheme='dark'){
  const palette=BOARD_PALETTES[theme];
  const {el,ctx}=canvas(kind==='monopoly'&&edition==='vn-v2'?4096:2400);
  const paint=()=>{
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(el.width/600,el.height/600);
    ctx.fillStyle=palette.board;ctx.fillRect(0,0,600,600);
    if(kind==='monopoly'&&edition==='vn-v2')vietnamPrint(ctx,theme);
    else if(kind==='ludo'){
      PARTY_SIDES.forEach((side,i)=>{const r=i>1?9:0,c=i===1||i===2?9:0,color=PARTY_COLORS[side];
        round(ctx,c*40+3,r*40+3,234,234,8,color,'#684f30');
        round(ctx,c*40+22,r*40+22,196,196,25,palette.home,'#ffffff66');
        for(let token=0;token<4;token++){const x=c*40+75+(token%2)*90,y=r*40+75+Math.floor(token/2)*90;ctx.beginPath();ctx.arc(x,y,30,0,Math.PI*2);ctx.fillStyle=color+'32';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.stroke();ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.strokeStyle='#fff9e0';ctx.stroke();}
        text(ctx,['ĐỎ','XANH LÁ','VÀNG','XANH DƯƠNG'][i],c*40+120,r*40+216,9,palette.lotInk,UI_FONT,'700');
      });
      LUDO_PATH.forEach(([r,c],i)=>{round(ctx,c*40+.6,r*40+.6,38.8,38.8,1,i%13===0?PARTY_COLORS[PARTY_SIDES[Math.floor(i/13)]]:palette.lot,'#7f8262');if(LUDO_SAFE.includes(i))star(ctx,c*40+20,r*40+20,8,i%13===0?'#f9e6ae':palette.lotInk);});
      PARTY_SIDES.forEach((side,i)=>{for(let n=0;n<6;n++){const r=i===0||i===2?7:i===1?n+1:13-n,c=i===1||i===3?7:i===0?n+1:13-n;round(ctx,c*40+.6,r*40+.6,38.8,38.8,1,PARTY_COLORS[side],'#fff1c6');if(n<5)text(ctx,String(n+1),c*40+20,r*40+20,9,'#fff3cf',UI_FONT,'700');}});
      const center=[[240,240,240,360,'R'],[240,240,360,240,'G'],[360,240,360,360,'Y'],[240,360,360,360,'B']] as const;
      for(const [x1,y1,x2,y2,side]of center){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(300,300);ctx.lineTo(x2,y2);ctx.closePath();ctx.fillStyle=PARTY_COLORS[side];ctx.fill();ctx.strokeStyle='#e9c88c';ctx.stroke();}
      ctx.beginPath();ctx.arc(300,300,17,0,Math.PI*2);ctx.fillStyle='#eed8a1';ctx.fill();star(ctx,300,300,10,'#715d31');
    }else{
      round(ctx,101,101,398,398,2,palette.center,'#d5b56e',2);
      ctx.save();ctx.beginPath();ctx.rect(110,110,380,380);ctx.clip();ctx.strokeStyle='#9ab69818';ctx.lineWidth=.6;
      for(let i=-12;i<22;i++){ctx.beginPath();ctx.moveTo(100+i*22,100);ctx.lineTo(500+i*22,500);ctx.stroke();ctx.beginPath();ctx.moveTo(500-i*22,100);ctx.lineTo(100-i*22,500);ctx.stroke();}ctx.restore();
      round(ctx,118,118,364,364,4,palette.center,'#dfc38499',1.2);
      ctx.beginPath();ctx.arc(300,257,78,0,Math.PI*2);ctx.strokeStyle='#d8bd7a88';ctx.lineWidth=1.5;ctx.stroke();
      text(ctx,'★ SÂN CỜ ★',300,214,10,palette.centerInk,UI_FONT,'700');text(ctx,'TỶ PHÚ',300,252,36,palette.centerInk,DISPLAY_FONT,'700');text(ctx,'BỘ SƯU TẬP · 20 Ô',300,286,9,palette.centerInk,UI_FONT,'700');
      for(let i=0;i<20;i++){
        const edge=Math.floor(i/5),n=i%5;ctx.save();ctx.translate(300,300);ctx.rotate(edge*Math.PI/2);ctx.translate(-300,-300);
        const x=500-n*100,y=500,special=[0,3,5,8,10,13,15,18].includes(i),color=special?'#9e3b2e':GROUP_COLORS[groupOf(i)];
        round(ctx,x+1,y+1,98,98,2,special?palette.special:palette.lot,'#4a5f4d',1.2);round(ctx,x+2,y+2,96,15,1,color);
        text(ctx,CITIES[i].toLocaleUpperCase('vi'),x+50,y+33,12,palette.lotInk,UI_FONT,'800',88);
        round(ctx,x+12,y+74,76,18,6,special?'#7d3126':'#183528','#d8b66c88',.8);
        text(ctx,special?i===0?'+200':i===5?'THUẾ −120':i===10?'NGHỈ 1 LƯỢT':i===15?'TỰ DO':'CƠ HỘI':`${100+i*20}`,x+50,y+83.5,10,'#f7e5b2',UI_FONT,'800',70);
        ctx.restore();
      }
    }
    ctx.globalAlpha=.035;for(let i=0;i<7000;i++){const x=(i*73.17)%600,y=(i*157.61)%600;ctx.fillStyle=i%2?'#fffbe5':'#655a3b';ctx.fillRect(x,y,.6,.6);}ctx.globalAlpha=1;
  };
  paint();
  const tex=texture(el);
  if(typeof document!=='undefined'&&document.fonts?.ready){
    void document.fonts.ready.then(()=>{paint();tex.needsUpdate=true;});
  }
  return tex;
}
export function labelTexture(label:string,background='#eee4bd',color='#2b4938',size=256){const {el,ctx}=canvas(size);ctx.fillStyle=background;ctx.fillRect(0,0,size,size);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(12,12,size-24,size-24);text(ctx,label,size/2,size/2,size/(label.length>3?6.2:3),color,DISPLAY_FONT,'700',size-32);return texture(el);}
