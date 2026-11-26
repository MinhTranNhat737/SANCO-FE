import { t } from './language.ts';
import { VN_CELLS } from './estate-data';
import type {PartyState} from './practice-types';
import type {Seat} from './types';
const SIDES=['R','G','Y','B','P','O','C','K'];

export function lobbySeats(players:Seat[],sides:string[],capacity:number){
  const order=[...sides,...SIDES.filter(side=>!sides.includes(side))].slice(0,capacity);
  return order.map(side=>({side,seat:players.find(player=>player.mark===side)||null}));
}

export function estateModePreview(_count:number,mode:'auto'|'classic'){
  if(mode==='classic')return {name:t('Cổ điển'),description:t('Chơi đến người trụ lại cuối cùng · Đủ 1 dãy ô màu được xây nhà luôn cả dãy · Bỏ mua mở đấu giá · Không trả giá ngược.')};
  return {name:t('Sáng tạo'),description:t('Chơi đến bao giờ hết tiền · Đủ 1 dãy ô màu được xây nhà luôn cả dãy · Bỏ mua mở đấu giá · Mua lại & thương lượng.')};
}
export const estateBuildCost=(state:PartyState,base:number)=>Math.ceil(base*(state.market?.buildPercent??100)/100);
export const estateSalary=(state:PartyState)=>Math.ceil((state.profile?.salary??500)*(state.market?.salaryPercent??100)/100);

export function estateGroupBuildPlan(state:PartyState,index:number){
  const c=VN_CELLS[index];
  if(!c||c.type!=='property')return null;
  const owner=state.property[c.index];
  if(!owner)return null;
  const group=VN_CELLS.filter(v=>v.type==='property'&&v.group===c.group);
  if(!group.every(v=>state.property[v.index]===owner&&!state.mortgaged?.[v.index]))return null;
  const minLevel=Math.min(...group.map(v=>state.houses[v.index]||0));
  if(minLevel>=5)return null;
  const targetLevel=minLevel+1;
  const lots=group.filter(v=>(state.houses[v.index]||0)<targetLevel);
  if(!lots.length)return null;
  const bank=(state as {bank?:{houses:number;hotels:number}}).bank;
  if(bank&&(targetLevel===5?bank.hotels<lots.length:bank.houses<lots.length))return null;
  const cost=lots.reduce((sum,v)=>sum+estateBuildCost(state,v.buildCost),0);
  return {group,lots,targetLevel,cost};
}

export function ownershipChanges(previous:(string|null)[],current:(string|null)[],purchase:PartyState['lastPurchase']){
  return current.flatMap((side,lot)=>{
    if(!side||previous[lot]===side)return [];
    const exact=purchase?.lot===lot&&purchase.side===side?purchase:null;
    const source=previous[lot]
      ?(exact?.source==='buyout'?'buyout' as const:'transfer' as const)
      :(exact?.source??'buy' as const);
    return [{lot,side,fromSide:exact?.fromSide||previous[lot]||undefined,houses:exact?.houses,price:exact?.price??0,source}];
  });
}
