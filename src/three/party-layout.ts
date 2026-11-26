export const PARTY_SIDES=['R','G','Y','B'];
export const MONOPOLY_SIDES=['R','G','Y','B','P','O','C','K'];
export const PARTY_COLORS:Record<string,string>={R:'#c74b42',G:'#398868',Y:'#d7a431',B:'#457cb4',P:'#8b5cf6',O:'#ea580c',C:'#0891b2',K:'#db2777'};
export const CITIES=['Xuất phát','Sen','Trúc','Cơ hội','Mai','Thuế','Đào','Lan','Cơ hội','Cúc','Thăm tù','Sông','Núi','Cơ hội','Biển','Nghỉ chân','Mây','Gió','Cơ hội','Trăng'];
export const PROPERTY_SPACES=[1,2,4,6,7,9,11,12,14,16,17,19];
export const GROUP_COLORS=['#bd8d76','#a9b979','#82aba6','#c9b576','#a08dbd','#7fabc4'];
export const LUDO_PATH=[[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
export const LUDO_SAFE=[0,8,13,21,26,34,39,47];
export const groupOf=(i:number)=>Math.floor(PROPERTY_SPACES.indexOf(i)/2);
/**
 * A ring of equal SQUARE lots laid on a rectangle of `cols` x `rows` lots.
 * `unit` is the lot size in board pixels (600 px = 10 world units at extent 600).
 * A 48-lot Vietnam ring needs cols + rows = 26, so the board can be
 * 13x13, 14x12, 15x11, 16x10, 17x9 or 18x8 lots — the widest choice fills a
 * landscape screen instead of leaving two empty bars beside a square board.
 */
export type EstateLayout={cols:number;rows:number;unit:number};
export type EstateSize=number|EstateLayout;
export const VN_TILE=600/13;
/**
 * Corner/depth ratio (1.44x edge width): makes the 4 corner squares (Xuất phát #0, Thăm tù #16,
 * Nghỉ chân #24, Vào tù #40) the biggest tiles on the 17x9 widescreen rectangular board.
 */
export const VN_CORNER_RATIO=1.44;
const VN_LAYOUTS:Record<number,EstateLayout>=Object.fromEntries([13,14,15,16,17,18].map(cols=>[cols,Object.freeze({cols,rows:26-cols,unit:VN_TILE})]));
export function vnLayout(cols=17):EstateLayout{return VN_LAYOUTS[Math.max(13,Math.min(18,Math.round(cols)))];}
export const VN_SQUARE=vnLayout(13);
export const VN_RECT=vnLayout(17);
function cornerRatio(size:EstateSize){const l=estateLayout(size);return l.cols+l.rows>=20?VN_CORNER_RATIO:1;}
/** Lot size (screen px) each Vietnam layout would get inside a width x height area. */
export function vnTileSize(layout:EstateLayout,width:number,height:number,margin=.3){
  const extra=2*(VN_CORNER_RATIO-1);
  return Math.min(width/(layout.cols+extra+margin),height/(layout.rows+extra+margin));
}
/** Always use the 17x9 widescreen rectangle so tiles are maximally large AND Xuất phát (0), Thăm tù (16), Nghỉ chân (24), Vào tù (40) stay locked to the 4 largest corners. */
export function bestVnLayout(_width:number,_height:number):EstateLayout{
  return VN_RECT;
}
export function estateLayout(size:EstateSize=6):EstateLayout{return typeof size==='number'?(size===13?VN_SQUARE:{cols:size,rows:size,unit:600/size}):size;}
export function estateBoardSize(size:EstateSize=6,extent=600){
  const l=estateLayout(size),u=l.unit*extent/600,d=u*cornerRatio(size);
  return {width:2*d+(l.cols-2)*u,height:2*d+(l.rows-2)*u,unit:u,depth:d};
}
export function estateCell(index:number,size:EstateSize=6){
  const {cols,rows}=estateLayout(size),C=cols-1,R=rows-1;
  if(index<=C)return [R,C-index];
  if(index<=C+R)return [R-(index-C),0];
  if(index<=2*C+R)return [0,index-C-R];
  return [index-2*C-R,C];
}
export function estateGridCell(index:number,size:EstateSize=6){return estateCell(index,size);}
/** 0 = bottom edge, 1 = left, 2 = top, 3 = right. */
export function estateEdge(index:number,size:EstateSize=6){const {cols,rows}=estateLayout(size),[r,c]=estateCell(index,size);return r===rows-1?0:c===0?1:r===0?2:c===cols-1?3:0;}
export function isEstateCorner(index:number,size:EstateSize=6){const {cols,rows}=estateLayout(size),[r,c]=estateCell(index,size);return (r===0||r===rows-1)&&(c===0||c===cols-1);}
// Both renderers, hit testing, pieces and effects share balanced perimeter lots + larger square corners.
export function estateBounds(index:number,size:EstateSize=6,extent=600){
  const {cols,rows}=estateLayout(size),[row,col]=estateGridCell(index,size),{unit:u,depth:d}=estateBoardSize(size,extent);
  const x=col===0?0:d+(col-1)*u;
  const y=row===0?0:d+(row-1)*u;
  const width=col===0||col===cols-1?d:u;
  const height=row===0||row===rows-1?d:u;
  return {x,y,width,height};
}
export function estateCenterBounds(size:EstateSize=6,extent=600){
  const {width,height,depth}=estateBoardSize(size,extent);
  return {x:depth,y:depth,width:width-depth*2,height:height-depth*2};
}
/** Board pixel -> world coordinates, centred on the (possibly rectangular) board. */
export function estateWorld([x,y]:number[],size:EstateSize=6){const {width,height}=estateBoardSize(size);return {x:(x-width/2)/60,z:(y-height/2)/60};}
// Render the board's shorter side at 2K, within the GPU's drawing-buffer limit.
export function estatePixelRatio(width:number,height:number,deviceRatio=1,maxSize=8192){
  const w=Math.max(1,width),h=Math.max(1,height);
  return Math.min(Math.max(Math.min(deviceRatio,2),2048/Math.min(w,h)),maxSize/Math.max(w,h));
}
export function estateTitleLines(name:string,narrow=false){
  const short:Record<string,string>={'Quỹ cộng đồng':'Quỹ chung','Điện quốc gia':'Điện lực'};
  const label=short[name]||name;
  if(narrow&&label.length>8){
    const words=label.split(' ');
    let split=1;
    for(let i=2;i<words.length;i++)if(Math.abs(words.slice(0,i).join(' ').length-words.slice(i).join(' ').length)<Math.abs(words.slice(0,split).join(' ').length-words.slice(split).join(' ').length))split=i;
    return words.length>1?[words.slice(0,split).join(' '),words.slice(split).join(' ')]:[label];
  }
  return [label];
}
export function ludoCell(side:string,token:number,position:number):[number,number]{
  const i=PARTY_SIDES.indexOf(side),r=i>1?9:0,c=i===1||i===2?9:0;
  if(position<0)return [c*40+75+(token%2)*90,r*40+75+Math.floor(token/2)*90];
  if(position===57)return [272+(token%2)*48,272+Math.floor(token/2)*48];
  if(position<52){const [row,col]=LUDO_PATH[(position+i*13)%52];return [col*40+20,row*40+20];}
  const n=position-52,row=i===0||i===2?7:i===1?n+1:13-n,col=i===1||i===3?7:i===0?n+1:13-n;
  return [col*40+20,row*40+20];
}
export const worldPoint=([x,y]:number[])=>({x:(x-300)/60,z:(y-300)/60});
export function ludoRoute(side:string,token:number,from:number,to:number){
  if(from>=0&&to>from)return Array.from({length:to-from},(_,i)=>worldPoint(ludoCell(side,token,from+i+1)));
  return [worldPoint(ludoCell(side,token,to))];
}
export function estatePoint(position:number,seat=0,size:EstateSize=6){const b=estateBounds(position,size);if(seat>=4){const sub=seat-4;return estateWorld([b.x+b.width*(.18+(sub%2)*.64),b.y+b.height*(.22+Math.floor(sub/2)*.34)],size);}return estateWorld([b.x+b.width*(.27+(seat%2)*.44),b.y+b.height*(.43+Math.floor(seat/2)*.38)],size);}
export function estateIndexAt(x:number,z:number,size:EstateSize=6){const {width,height}=estateBoardSize(size),{cols,rows}=estateLayout(size),px=x*60+width/2,py=z*60+height/2;if(px<0||py<0||px>=width||py>=height)return null;for(let i=0;i<2*(cols+rows)-4;i++){const b=estateBounds(i,size);if(px>=b.x&&px<b.x+b.width&&py>=b.y&&py<b.y+b.height)return i;}return null;}
export function partyRoll(moves:{action?:string;die?:number;dice?:number[];at?:number;side?:string}[],count=moves.length){const rolls=[];for(let i=0;i<Math.min(count,moves.length);i++){const m=moves[i];if(m.action==='roll'&&m.die)rolls.push({key:`${i}:${m.at||0}`,value:m.die,...(m.dice?{faces:m.dice}:{}),side:m.side});}const last=rolls.at(-1);return {lastDie:last?.value??null,rollKey:last?.key??'',rolls};}
