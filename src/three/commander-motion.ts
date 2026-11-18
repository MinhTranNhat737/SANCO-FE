import {commanderTransferPassenger,commanderUnits} from '../commander-ui.ts';
import type {PracticePly} from '../practice-types.ts';
import type {Board,MotionActor,Transition} from './board-motion.ts';
const plain=(cell:string|null)=>cell?.replaceAll('*','')||null;
type Order={unit:number;to:number;mode:string};
type Effect={from:number;to:number;unit:string;mode:string;burnt:boolean};
function interception(before:Board,from:number,to:number,side:string){
  const r=(i:number)=>Math.floor(i/11),c=(i:number)=>i%11;
  const zones=before.flatMap((cell,i)=>commanderUnits(cell).filter(u=>u[0]!==side&&['A','M','N'].includes(u[1])).map(u=>({i,radius:(u[1]==='M'?2:1)+(u.endsWith('*')?1:0)})));
  const inside=(i:number,z:{i:number;radius:number})=>(r(i)-r(z.i))**2+(c(i)-c(z.i))**2<=z.radius**2;
  const dr=r(to)-r(from),dc=c(to)-c(from),steps=Math.max(Math.abs(dr),Math.abs(dc)),capture=!!before[to]&&before[to]![0]!==side;
  for(let step=1;step<steps;step++){const i=(r(from)+Math.sign(dr)*step)*11+c(from)+Math.sign(dc)*step;if(zones.some(z=>inside(i,z)&&!(capture&&inside(to,z))))return i;}
  return to;
}
export function commanderTransition(before:Board,after:Board,move:PracticePly):Transition|null{
  const from=move.from;
  if(from===null||!Number.isInteger(from)||from<0||from>=132||before.length!==132||after.length!==132)return null;
  const units=commanderUnits(before[from]);if(!units.length||units[0][0]!==move.side||before[from]!==move.piece)return null;
  let orders:Order[];
  if(move.action==='ctl-combined')orders=move.details?.orders as Order[];
  else{const m=/^ctl-([0-2])-(move|board|bomb|fire|transfer|pickup)$/.exec(move.action||'');if(!m)return null;orders=[{unit:+m[1],to:move.to,mode:m[2]}];}
  const effects=move.effects as Effect[]|undefined;
  if(!Array.isArray(orders)||!orders.length||orders.length>3||!Array.isArray(effects)||effects.length!==orders.length)return null;
  if(new Set(orders.map(o=>o?.unit)).size!==orders.length||new Set(orders.map(o=>o?.to)).size!==orders.length)return null;
  const departure=[...before],expected=[...before],actors:MotionActor[]=[],remove=new Set<number>(),depart=new Set<number>(),used=new Set(orders.map(o=>o.unit));
  const transfers=new Map<number,number>();
  for(const order of orders.filter(o=>o.mode==='transfer')){
    const passenger=commanderTransferPassenger(units,order.unit);
    if(passenger<0||used.has(passenger))return null;
    transfers.set(order.unit,passenger);used.add(passenger);
  }
  for(const order of orders){
    const {unit:slot,to,mode}=order;
    if(!Number.isInteger(slot)||!units[slot]||!Number.isInteger(to)||to<0||to>=132||to===from||!['move','board','bomb','fire','transfer','pickup'].includes(mode))return null;
    const effect=effects.find(e=>e.from===from&&e.to===to&&e.unit===units[slot]&&e.mode===mode);if(!effect)return null;
    const carried=slot===0?units.flatMap((_,i)=>i>0&&!used.has(i)?[i]:[]):transfers.has(slot)?[transfers.get(slot)!]:[];
    const slots=[slot,...carried],piece=slots.map(i=>units[i]).join('+');
    if((mode!=='bomb'&&mode!=='fire')||effect.burnt)slots.forEach(i=>remove.add(i));
    if(mode!=='fire')slots.forEach(i=>depart.add(i));
    actors.push({from,to:effect.burnt?interception(before,from,to,move.side):to,piece,finalPiece:piece,path:mode==='fire'?'fire':effect.burnt?'burn':mode==='bomb'?'bomb':'straight',height:mode==='fire'?.28:units[slot][1]==='F'?1.45:.65,duration:effect.burnt?1050:mode==='bomb'?1450:mode==='fire'?750:950,delay:0});
  }
  departure[from]=units.filter((_,i)=>!depart.has(i)).join('+')||null;
  expected[from]=units.filter((_,i)=>!remove.has(i)).join('+')||null;
  const captures=move.captures||[];
  for(const index of captures){if(!Number.isInteger(index)||index<0||index>=132||!before[index]||before[index]![0]===move.side||!orders.some(o=>o.to===index))return null;expected[index]=null;}
  for(const [i,order]of orders.entries()){
    if(effects.find(e=>e.to===order.to)!.burnt||order.mode==='bomb'||order.mode==='fire')continue;
    const incoming=actors[i].piece;
    if(order.mode==='board'||order.mode==='transfer'){
      if(!expected[order.to]||expected[order.to]![0]!==move.side)return null;
      expected[order.to]+='+'+incoming;
    }else if(order.mode==='pickup'){
      if(!expected[order.to]||expected[order.to]![0]!==move.side)return null;
      expected[order.to]=incoming+'+'+expected[order.to];
    }else{if(expected[order.to])return null;expected[order.to]=incoming;}
  }
  if(expected.some((p,i)=>plain(p)!==plain(after[i])))return null;
  return {before:[...before],after:[...after],departure,move,actors,captures:[...captures],duration:Math.max(...actors.map(a=>a.duration))};
}
