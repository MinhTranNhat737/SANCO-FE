import {META,isPlacement,type GameKind,type PracticePly} from '../practice-types.ts';
import {commanderTransition} from './commander-motion.ts';

export type Board=readonly (string|null)[];
export type MotionActor={from:number|null;to:number;piece:string;finalPiece:string;path:'straight'|'knight'|'place'|'flip'|'bomb'|'fire'|'burn';height:number;duration:number;delay:number};
export type Transition={before:Board;after:Board;departure?:Board;move:PracticePly;actors:MotionActor[];captures:number[];duration:number};
export type Snapshot={key:string;count:number;board:Board;stamp:string|null};
export const sameBoard=(a:Board,b:Board)=>a.length===b.length&&a.every((piece,index)=>piece===b[index]);
const moveStamp=(move:PracticePly|undefined)=>move?`${move.at}:${move.side}:${move.from}:${move.to}:${move.promotion||''}`:null;
export const snapshot=(key:string,board:Board,count:number,history:readonly PracticePly[]):Snapshot=>({key,count,board:[...board],stamp:moveStamp(history[count-1])});

export function transitionFor(kind:GameKind,before:Board,after:Board,move:PracticePly):Transition|null{
  if(kind==='commander')return commanderTransition(before,after,move);
  const {cols,rows}=META[kind],length=cols*rows;
  const {from,to,piece,side}=move;
  if(before.length!==length||after.length!==length||!Number.isInteger(to)||to<0||to>=length||!piece)return null;
  const actors:MotionActor[]=[],captures:number[]=[],changed=new Set<number>();
  const clone=kind==='ataxx'&&from!==null&&before[from]===piece&&after[from]===piece;
  if(isPlacement(kind)||clone){
    if(!clone&&from!==null||before[to]||after[to]!==side||piece!==side)return null;
    actors.push({from:null,to,piece,finalPiece:piece,path:'place',height:kind==='connect4'?2:.95,duration:580,delay:0});changed.add(to);
    if(kind==='reversi'){
      for(const index of move.flips||[]){
        if(!before[index]||before[index]===side||after[index]!==side)return null;
        actors.push({from:index,to:index,piece:before[index]!,finalPiece:side,path:'flip',height:.65,duration:640,delay:300});changed.add(index);
      }
    }else if(kind==='go'){
      for(const index of move.captures||[]){
        if(!before[index]||before[index]===side||after[index]!==null)return null;
        captures.push(index);changed.add(index);
      }
    }
  }else{
    if(from===null||!Number.isInteger(from)||from<0||from>=length||before[from]!==piece||(after[from]!==null&&!(kind==='isolation'&&after[from]==='#'))||piece[0]!==side)return null;
    const finalPiece=kind==='checkers'?(after[to]||piece):move.promotion?side+move.promotion.toUpperCase():piece;
    if(after[to]!==finalPiece)return null;
    const dr=Math.abs(Math.floor(to/cols)-Math.floor(from/cols)),dc=Math.abs(to%cols-from%cols),type=piece[1];
    if(kind==='checkers'){
      if(dr!==dc||(dr!==1&&dr!==2))return null;
      for(const index of move.captures||[]){
        if(!before[index]||before[index]![0]===side||after[index]!==null)return null;
        captures.push(index);changed.add(index);
      }
    }else{
      if(type==='N'&&!((dr===2&&dc===1)||(dr===1&&dc===2)))return null;
      if((type==='R'||kind==='xiangqi'&&type==='C')&&dr!==0&&dc!==0)return null;
      if(kind==='chess'&&type==='B'&&dr!==dc)return null;
      if(kind==='chess'&&type==='Q'&&dr!==0&&dc!==0&&dr!==dc)return null;
      if(kind==='xiangqi'&&type==='B'&&(dr!==2||dc!==2))return null;
      if(kind==='xiangqi'&&type==='A'&&(dr!==1||dc!==1))return null;
    }
    actors.push({from,to,piece,finalPiece,path:type==='N'?'knight':'straight',height:type==='N'?(kind==='chess'?2.15:.95):type==='C'&&before[to]?1.1:.62,duration:type==='N'?920:800,delay:0});
    changed.add(from);changed.add(to);
    if(before[to]){if(before[to]![0]===side)return null;captures.push(to);}
    // En passant removes a pawn from a square other than the destination.
    if(kind==='chess'&&type==='P'&&dc===1&&!before[to]){
      const captured=Math.floor(from/8)*8+to%8;
      if(before[captured]!==`${side==='w'?'b':'w'}P`||after[captured]!==null)return null;
      captures.push(captured);changed.add(captured);
    }
    if(kind==='chess'&&type==='K'&&dr===0&&dc===2){
      const rookFrom=Math.floor(from/8)*8+(to>from?7:0),rookTo=to+(to>from?-1:1),rook=side+'R';
      if(before[rookFrom]!==rook||after[rookFrom]!==null||before[rookTo]!==null||after[rookTo]!==rook)return null;
      actors.push({from:rookFrom,to:rookTo,piece:rook,finalPiece:rook,path:'straight',height:2.15,duration:800,delay:640});
      changed.add(rookFrom);changed.add(rookTo);
    }
  }
  if(kind==='ataxx'||kind==='coganh')for(const index of move.flips||[]){if(!before[index]||before[index]===side||after[index]!==side)return null;actors.push({from:index,to:index,piece:before[index]!,finalPiece:side,path:'flip',height:.4,duration:450,delay:200});changed.add(index);}
  if(before.some((value,index)=>value!==after[index]&&!changed.has(index)))return null;
  return {before:[...before],after:[...after],move,actors,captures,duration:Math.max(...actors.map(actor=>actor.duration+actor.delay))};
}

export function incomingBoard(kind:GameKind,previous:Snapshot|null,next:Snapshot,history:readonly PracticePly[]):{mode:'unchanged'|'snap'|'animate';steps:Transition[]}{
  if(!previous||previous.key!==next.key)return {mode:'snap',steps:[]};
  if(previous.count===next.count&&sameBoard(previous.board,next.board))return {mode:'unchanged',steps:[]};
  if(next.count<=previous.count||next.count-previous.count>8||previous.stamp!==moveStamp(history[previous.count-1]))return {mode:'snap',steps:[]};
  const steps:Transition[]=[];let before=previous.board;
  for(let index=previous.count;index<next.count;index++){
    const move=history[index];if(!move)return {mode:'snap',steps:[]};
    const step=transitionFor(kind,before,move.board,move);if(!step)return {mode:'snap',steps:[]};
    steps.push(step);before=move.board;
  }
  return sameBoard(before,next.board)?{mode:'animate',steps}:{mode:'snap',steps:[]};
}

const smooth=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function sampleActor(actor:MotionActor,cols:number,rows:number,elapsed:number,startY=.3){
  const to={x:actor.to%cols-(cols-1)/2,z:Math.floor(actor.to/cols)-(rows-1)/2},from=actor.from===null?to:{x:actor.from%cols-(cols-1)/2,z:Math.floor(actor.from/cols)-(rows-1)/2};
  const progress=Math.max(0,Math.min(1,(elapsed-actor.delay)/actor.duration)),surface=.3,peak=surface+actor.height;
  if(actor.path==='place')return {x:to.x,z:to.z,y:peak+(surface-peak)*smooth(progress),progress};
  if(actor.path==='fire'){const t=smooth(progress);return {x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t,y:surface+.25+Math.sin(progress*Math.PI)*actor.height,progress};}
  if(actor.path==='bomb'){
    const t=progress<.5?smooth(progress*2):1-smooth((progress-.5)*2);
    return {x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t,y:surface+Math.sin(progress*Math.PI)*actor.height,progress};
  }
  const liftEnd=.24,dropStart=.76;
  if(progress<liftEnd)return {x:from.x,z:from.z,y:startY+(peak-startY)*smooth(progress/liftEnd),progress};
  if(progress>=dropStart)return {x:to.x,z:to.z,y:peak+(surface-peak)*smooth((progress-dropStart)/(1-dropStart)),progress};
  const travel=smooth((progress-liftEnd)/(dropStart-liftEnd));let x:number,z:number;
  if(actor.path==='knight'){
    const dx=Math.abs(to.x-from.x),dz=Math.abs(to.z-from.z),first=Math.max(dx,dz)/(dx+dz),longX=dx>dz;
    if(travel<first){const part=travel/first;x=longX?from.x+(to.x-from.x)*part:from.x;z=longX?from.z:from.z+(to.z-from.z)*part;}
    else{const part=(travel-first)/(1-first);x=longX?to.x:from.x+(to.x-from.x)*part;z=longX?from.z+(to.z-from.z)*part:to.z;}
  }else{x=from.x+(to.x-from.x)*travel;z=from.z+(to.z-from.z)*travel;}
  return {x,z,y:peak,progress};
}
