import config from './vietnam-estate.json' with {type:'json'};
import type {PartyState} from './practice-types';
export type EstateCell={index:number;name:string;type:string;price:number;group?:number;buildCost:number;rent:number[];amount?:number};
const specials=config.specials as Record<string,{name:string;type:string;price?:number;amount?:number}>;
export const VN_CELLS:EstateCell[]=Array.from({length:48},(_,index)=>{
  if(specials[index])return {index,price:0,buildCost:0,rent:[],...specials[index]};
  const ordinal=Array.from({length:index},(_,i)=>i).filter(i=>!specials[i]).length,group=Math.min(10,Math.floor(ordinal/3)),price=120+group*50+ordinal%3*20;
  return {index,name:config.provinces[ordinal],type:'property',group,price,buildCost:60+group*15,rent:[Math.ceil(price*.08),Math.ceil(price*.4),Math.ceil(price*1.05),Math.ceil(price*2),Math.ceil(price*3),Math.ceil(price*4.2)]};
});
export const VN_GROUP_COLORS=config.groupColors;
export const isVietnam=(state:PartyState)=>state.edition===config.edition;
export const ownable=(cell:EstateCell)=>['property','station','utility'].includes(cell.type);
export const SIDE_NAMES:Record<string,string>={R:'Đỏ',G:'Xanh lá',Y:'Vàng',B:'Xanh dương',P:'Tím',O:'Cam',C:'Ngọc lam',K:'Hồng'};
export const cash=(amount:number)=>`${amount.toLocaleString('vi-VN')} tr`;
export function estateRent(state:PartyState,index:number){const c=VN_CELLS[index],owner=state.property[index];if(!owner||state.mortgaged?.[index])return 0;if(c.type==='station')return 50*2**(VN_CELLS.filter(v=>v.type==='station'&&state.property[v.index]===owner).length-1);if(c.type==='utility')return VN_CELLS.filter(v=>v.type==='utility'&&state.property[v.index]===owner).length===2?12:5;const group=VN_CELLS.filter(v=>v.type==='property'&&v.group===c.group);return c.rent[state.houses[index]]*(state.houses[index]===0&&group.every(v=>state.property[v.index]===owner)?2:1);}
