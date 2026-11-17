export const COMMANDER_UNITS:Record<string,{name:string;label:string;rule:string}>={
  K:{name:'Tư lệnh',label:'TL',rule:'Đi thẳng không giới hạn; ăn 1 bước. Được vào sở chỉ huy hoặc lên xe tăng, máy bay, tàu.'},
  I:{name:'Bộ binh',label:'BB',rule:'Đi và ăn 1 bước ngang hoặc dọc.'},
  E:{name:'Công binh',label:'CB',rule:'Đi và ăn 1 bước ngang/dọc. Chở pháo, cao xạ, tên lửa qua đoạn sông sâu.'},
  T:{name:'Xe tăng',label:'XT',rule:'Đi và ăn 1–2 bước ngang/dọc. Chở tối đa 2 quân bộ binh, dân quân hoặc Tư lệnh.'},
  A:{name:'Cao xạ',label:'CX',rule:'Đi và ăn 1 bước ngang/dọc. Vòng phòng không bán kính 1 bước.'},
  P:{name:'Pháo binh',label:'PB',rule:'Đi và ăn 1–3 bước theo 8 hướng. Bắn qua vật cản khi ăn quân.'},
  M:{name:'Tên lửa',label:'TLửa',rule:'Ngang/dọc 1–2 bước; chéo 1 bước. Vòng phòng không bán kính 2 bước.'},
  F:{name:'Máy bay',label:'MB',rule:'Bay 1–4 bước theo 8 hướng, qua vật cản. Có thể ném bom rồi trở về; ăn máy bay phải thế chỗ.'},
  N:{name:'Tàu chiến',label:'HQ',rule:'Đi biển/ven bờ tối đa 4 bước. Pháo hạm bắn vào đất liền tối đa 3 bước. Có cao xạ, chở tối đa 2 quân.'},
  H:{name:'Sở chỉ huy',label:'SCH',rule:'Đứng yên. Chỉ Tư lệnh được vào; bị phá thì Tư lệnh bên trong cũng bị diệt.'},
  D:{name:'Dân quân',label:'DQ',rule:'Đi và ăn 1 bước theo 8 hướng.'}
};
export const commanderUnits=(cell:string|null)=>cell?cell.split('+'):[];
export function commanderName(cell:string|null){return commanderUnits(cell).map(unit=>`${COMMANDER_UNITS[unit[1]]?.name||unit}${unit.endsWith('*')?' anh hùng':''}`).join(' + ');}
export function commanderPreview(){
  const board:(string|null)[]=Array(132).fill(null);
  for(const [y,x,t]of [[0,6,'K'],[1,1,'N'],[1,4,'F'],[1,5,'T'],[1,7,'T'],[1,8,'F'],[2,3,'I'],[2,6,'M'],[2,9,'I'],[3,2,'N'],[3,4,'A'],[3,5,'E'],[3,7,'E'],[3,8,'A'],[4,2,'H'],[4,3,'P'],[4,6,'D'],[4,9,'P'],[4,10,'H']] as [number,number,string][]){board[(11-y)*11+x]='r'+t;board[y*11+x]='b'+t;}
  return board;
}
