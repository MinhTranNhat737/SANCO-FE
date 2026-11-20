import { t } from './language.ts';
import type {PartyState} from './practice-types';
import type {Seat} from './types';
const SIDES=['R','G','Y','B','P','O','C','K'];

export function lobbySeats(players:Seat[],sides:string[],capacity:number){
  const order=[...sides,...SIDES.filter(side=>!sides.includes(side))].slice(0,capacity);
  return order.map(side=>({side,seat:players.find(player=>player.mark===side)||null}));
}

export function estateModePreview(count:number,mode:'auto'|'classic'){
  if(mode==='classic')return {name:t('Cổ điển'),description:t('Không chia đất ban đầu, không giới hạn vòng. Bỏ mua sẽ mở đấu giá; còn một người trụ lại thì thắng.')};
  if(count===2)return {name:t('Đối đầu khởi nghiệp'),description:t('2 lô khởi nghiệp/người · 18 vòng · Thị trường đổi mỗi 3 vòng · Thương lượng và đề nghị giá ngược.')};
  if(count<=4)return {name:t('Thương trường'),description:t('1 lô khởi nghiệp/người · 24 vòng · Thị trường đổi mỗi 3 vòng · Hợp đồng, đấu giá và 12 loại thẻ.')};
  return {name:t('Đại hội địa ốc'),description:t('1 lô khởi nghiệp/người · 16 vòng · Thị trường đổi mỗi 2 vòng · Nhịp nhanh cho nhóm đông.')};
}
export const estateBuildCost=(state:PartyState,base:number)=>Math.ceil(base*(state.market?.buildPercent??100)/100);
export const estateSalary=(state:PartyState)=>Math.ceil((state.profile?.salary??400)*(state.market?.salaryPercent??100)/100);

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
