export function mergeLive<T extends {id:string;version:number}>(previous:T|null,packet:any):T|null{
  if(previous&&previous.id===packet.id&&previous.version>packet.version)return previous;
  const incoming=packet.game||packet;
  if(Array.isArray(incoming.moves))return packet;
  if(!Number.isInteger(incoming.moveCount))return null;
  const old:any=previous,base=packet.game?old?.game:old,append=incoming.movesAppend||[];
  let moves:any[];
  if(incoming.moveCount===0)moves=[];
  else if(base?.id===incoming.id&&base.moves.length===incoming.moveCount)moves=base.moves;
  else if(base?.id===incoming.id&&base.moves.length===incoming.moveCount-append.length)moves=[...base.moves,...append];
  else return null;
  const {movesAppend,moveCount,...rest}=incoming,game={...(base?.id===incoming.id?base:{}),...rest,moves};
  return (packet.game?{...old,...packet,game}:game) as T;
}
