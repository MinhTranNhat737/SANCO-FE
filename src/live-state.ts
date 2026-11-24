export function mergeLive<T extends {id:string;version:number}>(previous:T|null,packet:any):T|null{
  if(!packet||typeof packet.id!=='string'||!Number.isSafeInteger(packet.version)||packet.version<0)return null;
  if(previous&&previous.id!==packet.id)return null;
  if(previous&&previous.version>packet.version)return previous;
  const incoming=packet.game??packet;
  if(!incoming||typeof incoming.id!=='string')return null;
  const existing:any=packet.game?(previous as any)?.game:previous;
  if(Array.isArray(existing?.board)&&!Array.isArray(incoming.board))return null;
  if(existing?.phase&&!['waiting','playing','finished'].includes(incoming.phase))return null;
  if(Array.isArray(incoming.moves))return packet;
  if(!Number.isSafeInteger(incoming.moveCount)||incoming.moveCount<0)return null;
  const old:any=previous,base=packet.game?old?.game:old,append=incoming.movesAppend??[];
  if(!Array.isArray(append)||append.length>incoming.moveCount)return null;
  let moves:any[];
  if(incoming.moveCount===0)moves=[];
  else if(base?.id===incoming.id&&Array.isArray(base.moves)&&base.moves.length===incoming.moveCount)moves=base.moves;
  else if(base?.id===incoming.id&&Array.isArray(base.moves)&&base.moves.length===incoming.moveCount-append.length)moves=[...base.moves,...append];
  else return null;
  const {movesAppend,moveCount,...rest}=incoming,game={...(base?.id===incoming.id?base:{}),...rest,moves};
  return (packet.game?{...old,...packet,game}:game) as T;
}

// Never feed a failed snapshot back into recovery. Broken schemas get at most
// three automatic snapshots per resource, with a cooldown and one in flight.
export function createLiveReceiver<T extends {id:string;version:number}>(options:{
  current:()=>T|null;apply:(next:T)=>void;load:(id:string)=>Promise<T>;error:(error:unknown)=>void;
}){
  let resource='',attempts=0,inflight=false,nextAttempt=0;
  return async(packet:unknown,recover=true)=>{
    const current=options.current();
    if(!current)return false;
    if(!packet||(packet as T).id!==current.id){if(!recover)throw new Error('Invalid live snapshot');return false;}
    if(resource!==current.id){resource=current.id;attempts=0;nextAttempt=0;}
    const next=mergeLive(current,packet);
    if(next){options.apply(next);return true;}
    if(!recover)throw new Error('Invalid live snapshot');
    if(inflight||attempts>=3||Date.now()<nextAttempt)return false;
    inflight=true;attempts++;nextAttempt=Date.now()+30000;
    const id=current.id;
    try{
      const snapshot=await options.load(id),active=options.current();
      if(!active||active.id!==id)return false;
      const game=(snapshot as any)?.game??snapshot;
      const restored=Array.isArray(game?.moves)?mergeLive(active,snapshot):null;
      if(!restored)throw new Error('Invalid live snapshot');
      options.apply(restored);attempts=0;return true;
    }catch(error){options.error(error);return false;}
    finally{inflight=false;}
  };
}
