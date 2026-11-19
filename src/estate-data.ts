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
export function estateRent(state:PartyState,index:number,diceTotal=state.diceValues?.reduce((sum,value)=>sum+value,0)||7){
  const c=VN_CELLS[index],owner=state.property[index];
  if(!c||!owner||state.mortgaged?.[index])return 0;
  let amount:number;
  if(c.type==='station')amount=50*2**(VN_CELLS.filter(v=>v.type==='station'&&state.property[v.index]===owner).length-1);
  else if(c.type==='utility')amount=diceTotal*(VN_CELLS.filter(v=>v.type==='utility'&&state.property[v.index]===owner).length===2?12:5);
  else {const group=VN_CELLS.filter(v=>v.type==='property'&&v.group===c.group);amount=(c.rent[state.houses[index]]||0)*(state.houses[index]===0&&group.every(v=>state.property[v.index]===owner)?2:1);}
  return Math.ceil(amount*(state.market?.rentPercent??100)/100);
}
export function estateBuyoutPrice(state:PartyState,index:number){
  const c=VN_CELLS[index];
  if(!c||!ownable(c))return {landPrice:0,houses:0,houseUnit:0,buildingPrice:0,totalPrice:0};
  const landPrice=c.price||0;
  const houses=state.houses[index]||0;
  const houseUnit=c.type==='property'?Math.ceil(c.buildCost*(state.market?.buildPercent??100)/100):0;
  const buildingPrice=houses*houseUnit;
  return {landPrice,houses,houseUnit,buildingPrice,totalPrice:landPrice+buildingPrice};
}
