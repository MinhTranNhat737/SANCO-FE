export const PARTY_SIDES=['R','G','Y','B'];
export const MONOPOLY_SIDES=['R','G','Y','B','P','O','C','K'];
export const PARTY_COLORS:Record<string,string>={R:'#c74b42',G:'#398868',Y:'#d7a431',B:'#457cb4',P:'#8b5cf6',O:'#ea580c',C:'#0891b2',K:'#db2777'};
export const CITIES=['Xuất phát','Sen','Trúc','Cơ hội','Mai','Thuế','Đào','Lan','Cơ hội','Cúc','Thăm tù','Sông','Núi','Cơ hội','Biển','Nghỉ chân','Mây','Gió','Cơ hội','Trăng'];
export const PROPERTY_SPACES=[1,2,4,6,7,9,11,12,14,16,17,19];
export const GROUP_COLORS=['#bd8d76','#a9b979','#82aba6','#c9b576','#a08dbd','#7fabc4'];
export const LUDO_PATH=[[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
export const LUDO_SAFE=[0,8,13,21,26,34,39,47];
export const groupOf=(i:number)=>Math.floor(PROPERTY_SPACES.indexOf(i)/2);
export function estateCell(index:number,size=6){const edge=size-1;return index<=edge?[edge,edge-index]:index<=edge*2?[edge*2-index,0]:index<=edge*3?[0,index-edge*2]:[index-edge*3,edge];}
export function estateGridCell(index:number,size=6){return estateCell(index,size);}
// Both renderers, hit testing, pieces and effects share equal square lots on the single outer ring.
export function estateBounds(index:number,size=6,extent=600){
  const [row,col]=estateGridCell(index,size),step=extent/size;
  return {x:col*step,y:row*step,width:step,height:step};
}
export function estateCenterBounds(size=6,extent=600){
  const inset=extent/size;
  return {x:inset,y:inset,width:extent-inset*2,height:extent-inset*2};
}
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
export function estatePoint(position:number,seat=0,size=6){const b=estateBounds(position,size);if(seat>=4){const sub=seat-4;return worldPoint([b.x+b.width*(.18+(sub%2)*.64),b.y+b.height*(.22+Math.floor(sub/2)*.34)]);}return worldPoint([b.x+b.width*(.27+(seat%2)*.44),b.y+b.height*(.43+Math.floor(seat/2)*.38)]);}
export function estateIndexAt(x:number,z:number,size=6){const px=x*60+300,py=z*60+300;if(px<0||py<0||px>=600||py>=600)return null;for(let i=0;i<4*(size-1);i++){const b=estateBounds(i,size);if(px>=b.x&&px<b.x+b.width&&py>=b.y&&py<b.y+b.height)return i;}return null;}
export function partyRoll(moves:{action?:string;die?:number;dice?:number[];at?:number;side?:string}[],count=moves.length){const rolls=[];for(let i=0;i<Math.min(count,moves.length);i++){const m=moves[i];if(m.action==='roll'&&m.die)rolls.push({key:`${i}:${m.at||0}`,value:m.die,...(m.dice?{faces:m.dice}:{}),side:m.side});}const last=rolls.at(-1);return {lastDie:last?.value??null,rollKey:last?.key??'',rolls};}
