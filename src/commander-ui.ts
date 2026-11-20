import { t } from './language.ts';
export const COMMANDER_UNITS:Record<string,{name:string;label:string;rule:string}>={
  K:{get name() { return t('Tư lệnh'); },label:'TL',get rule() { return t('Đi thẳng không giới hạn; ăn 1 bước. Được vào sở chỉ huy hoặc lên xe tăng, máy bay, tàu.'); }},
  I:{get name() { return t('Bộ binh'); },label:'BB',get rule() { return t('Đi và ăn 1 bước ngang hoặc dọc.'); }},
  E:{get name() { return t('Công binh'); },label:'CB',get rule() { return t('Đi và ăn 1 bước ngang/dọc. Chở pháo, cao xạ, tên lửa qua đoạn sông sâu.'); }},
  T:{get name() { return t('Xe tăng'); },label:'XT',get rule() { return t('Đi và ăn 1–2 bước ngang/dọc. Chở tối đa hai quân trong nhóm bộ binh, dân quân và Tư lệnh. Có thể bắn tàu từ vị trí đang đứng.'); }},
  A:{get name() { return t('Pháo cao xạ'); },label:'CX',get rule() { return t('Đi và ăn 1 bước ngang/dọc. Vòng phòng không bán kính 1 bước.'); }},
  P:{get name() { return t('Pháo binh'); },label:'PB',get rule() { return t('Đi và ăn 1–3 bước theo 8 hướng. Bắn qua vật cản khi ăn quân.'); }},
  M:{get name() { return t('Tên lửa phòng không'); },get label() { return t('TLửa'); },get rule() { return t('Ngang/dọc 1–2 bước; chéo 1 bước. Vòng phòng không bán kính 2 bước.'); }},
  F:{get name() { return t('Không quân (máy bay)'); },label:'MB',get rule() { return t('Bay 1–4 bước theo 8 hướng, qua vật cản. Có thể ném bom rồi trở về; ăn máy bay phải thế chỗ.'); }},
  N:{get name() { return t('Hải quân (tàu chiến)'); },label:'HQ',get rule() { return t('Đi biển/ven bờ tối đa 4 bước. Pháo hạm bắn sâu vào đất liền tối đa 3 bước. Ăn dọc bờ phải thế chỗ. Cao xạ có tầm 1 bước. Chở tối đa 2 quân.'); }},
  H:{get name() { return t('Sở chỉ huy'); },label:'SCH',get rule() { return t('Đứng yên. Chỉ Tư lệnh được vào; bị phá thì Tư lệnh bên trong cũng bị diệt.'); }},
  D:{get name() { return t('Dân quân tóc dài'); },label:'DQ',get rule() { return t('Đi và ăn 1 bước theo 8 hướng.'); }}
};
export const commanderUnits=(cell:string|null)=>cell?cell.split('+'):[];
export function commanderTransferPassenger(units:readonly string[],slot:number){
  if(units[0]?.[1]!=='N'||units[slot]?.[1]!=='F')return -1;
  return units.findIndex((unit,index)=>index>0&&index!==slot&&['K','I','D','T'].includes(unit[1]));
}
export function commanderName(cell:string|null){return commanderUnits(cell).map(unit=>`${COMMANDER_UNITS[unit[1]]?.name||unit}${unit.endsWith('*')?t(' anh hùng'):''}`).join(' + ');}
export function commanderPreview(){
  const board:(string|null)[]=Array(132).fill(null);
  const setup=[
    [0,6,'K'],
    [1,1,'N'],[1,4,'F'],[1,5,'H'],[1,7,'H'],[1,8,'F'],
    [2,3,'P'],[2,6,'M'],[2,9,'P'],
    [3,2,'N'],[3,4,'A'],[3,5,'T'],[3,7,'T'],[3,8,'A'],
    [4,2,'I'],[4,3,'E'],[4,6,'D'],[4,9,'E'],[4,10,'I'],
  ] as const;
  for(const [y,x,t] of setup){board[(11-y)*11+x]='r'+t;board[y*11+x]='b'+t;}
  return board;
}

export const COMMANDER_SYMBOLS:Record<string,{notation:string;path:string}>={
  K:{notation:'★',path:'M12 3l2.6 5.4 6 .8-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.2l6-.8Z'},
  I:{notation:'B',path:'M4 11h16M6 10c0-8 12-8 12 0M7 15h13m-8 0-2 5m-5-4 4-1m10 0v2'},
  E:{notation:'C',path:'M2 11h20M5 18v-6m14 6v-6M6 11c3-5 9-5 12 0M3 21c2-2 4 2 6 0s4 2 6 0 4 2 6 0'},
  T:{notation:'T',path:'M3 13h18v6H3zM8 9h8v4H8zM14 9V6h8M6 19v2m4-2v2m4-2v2m4-2v2'},
  A:{notation:'F',path:'M4 21h16m-8-3v3M7 17h11m-9 0 2-5 5 5M11 12 6 6m6 5L7 4'},
  P:{notation:'P',path:'M4 21h16M7 18a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM12 16l6-12 3 1-6 12m-7-1-5 4'},
  M:{notation:'L',path:'M4 21h16M8 20l3-6m2 1L9 11 17 3l4-1-1 4-8 8m5-11 3 3'},
  F:{notation:'K',path:'M12 2v20m0-13L3 15v3l9-4 9 4v-3l-9-6M8 21l4-3 4 3'},
  N:{notation:'H',path:'M2 15h20l-4 5H6zM7 15v-4h10v4m-6-4V5m0 2 5-2m1 8 3-2M3 23h18'},
  H:{notation:'S',path:'M3 20V12l5-4h8l5 4v8ZM7 15h10m1-4V4h4'},
  D:{notation:'D',path:'M9 10V6a3 3 0 0 1 6 0v4m-8 0 2-4m6 1 3 4M8 21l1-8 3-2 3 2 1 8Z'},
};
