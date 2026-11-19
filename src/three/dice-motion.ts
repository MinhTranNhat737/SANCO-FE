import {Euler,Quaternion,Vector3} from 'three';

export type DiceRoll={key:string;value:number;faces?:number[];side?:string};
export type DiceThrowVariant={spinX:number;spinY:number;spinZ:number;releaseX:number;releaseZ:number;scatterX:number;scatterZ:number;bounceAmp:number;yaw:number};
export const THROW_DURATION=1850;
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const mix=(a:Vector3,b:Vector3,t:number)=>a.clone().lerp(b,smooth(t));
export function diceFaceRotation(value:number){return value===1?new Euler(0,0,0):value===6?new Euler(Math.PI,0,0):value===2?new Euler(-Math.PI/2,0,0):value===5?new Euler(Math.PI/2,0,0):value===3?new Euler(0,0,Math.PI/2):new Euler(0,0,-Math.PI/2);}

function randUnit(){
  if(typeof crypto!=='undefined'&&crypto.getRandomValues){
    const arr=new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0]/4294967296;
  }
  return Math.random();
}

export function randomThrowVariant():DiceThrowVariant{
  const sign=()=>randUnit()<.5?-1:1;
  return {
    spinX:sign()*(2.8+randUnit()*2.4),
    spinY:sign()*(1.6+randUnit()*2.2),
    spinZ:sign()*(2.4+randUnit()*2.4),
    releaseX:-1.9+randUnit()*3.8,
    releaseZ:-1.4+randUnit()*2.4,
    scatterX:(randUnit()-.5)*.42,
    scatterZ:(randUnit()-.5)*.32,
    bounceAmp:.24+randUnit()*.22,
    yaw:(randUnit()-.5)*Math.PI*2
  };
}

/** Only accepted server rolls enter this queue; reconnect and replay are baselines. */
export class DiceRollQueue{
  private seen=new Set<string>();
  reset(rolls:DiceRoll[]){this.seen=new Set(rolls.map(r=>r.key));}
  accept(rolls:DiceRoll[]){const fresh=rolls.filter(r=>!this.seen.has(r.key)&&Number.isInteger(r.value)&&r.value>=1&&r.value<=6);for(const r of fresh)this.seen.add(r.key);return fresh;}
}

/** Approach → grasp → lift/shake → release → drop onto board → roll & bounce across table → exact server face. */
export function sampleDiceThrow(elapsed:number,value:number,rest:Vector3,previous=new Quaternion(),releaseOrigin?:Vector3,variant?:DiceThrowVariant){
  const t=Math.max(0,Math.min(1,elapsed/THROW_DURATION)),entry=new Vector3(2.6,rest.y+1.1,rest.z+4.9),lift=new Vector3(1.15,rest.y+1.55,rest.z+.95);
  const rx=variant?variant.releaseX:-1.35,rz=variant?variant.releaseZ:rest.z-.75;
  const release=releaseOrigin?new Vector3(releaseOrigin.x,Math.max(rest.y+.9,releaseOrigin.y),releaseOrigin.z):new Vector3(rx,rest.y+1.48,rz);
  const impact=new Vector3(rest.x+(release.x-rest.x)*.58,rest.y,rest.z+(release.z-rest.z)*.58);
  const faceQ=new Quaternion().setFromEuler(diceFaceRotation(value));
  const target=variant?new Quaternion().setFromAxisAngle(new Vector3(0,1,0),variant.yaw).multiply(faceQ):faceQ;
  const sx=variant?.spinX??3.6,sy=variant?.spinY??2.1,sz=variant?.spinZ??3.2;
  const bAmp=variant?.bounceAmp??.32,scX=variant?.scatterX??.16,scZ=variant?.scatterZ??.10;
  let hand=entry.clone(),position=rest.clone(),rotation=previous.clone(),grip=0;
  if(t<.22){hand=mix(entry,rest,t/.22);grip=smooth((t-.13)/.09);}
  else if(t<.4){
    const u=(t-.22)/.18;hand=mix(rest,lift,u);
    hand.x+=Math.sin(u*Math.PI*6)*.10*Math.sin(u*Math.PI);
    hand.y+=Math.sin(u*Math.PI*8)*.07*Math.sin(u*Math.PI);
    position.copy(hand);
    rotation.copy(previous).multiply(new Quaternion().setFromEuler(new Euler(u*Math.PI*2.2,u*Math.PI*1.6,Math.sin(u*Math.PI*4)*.45)));
    grip=1;
  }else if(t<.5){
    const u=(t-.4)/.1;hand=mix(lift,release,u);position.copy(hand);
    rotation.copy(previous).multiply(new Quaternion().setFromEuler(new Euler((1+u)*Math.PI*2.2,(1+u)*Math.PI*1.6,u*Math.PI)));
    grip=1-smooth((t-.47)/.03);
  }else{
    const retreat=smooth((t-.5)/.34);hand=mix(release,entry.clone().add(new Vector3(1.7,1.5,1.2)),retreat);
    if(t<.68){
      const u=(t-.5)/.18;
      position.copy(release).lerp(impact,u);
      position.y=rest.y+(release.y-rest.y)*(1-u*u)+Math.sin(u*Math.PI)*.48;
      rotation.slerp(target,smooth(u*.45));
      rotation.multiply(new Quaternion().setFromEuler(new Euler(u*Math.PI*sx,u*Math.PI*sy,u*Math.PI*sz)));
    }else{
      const u=(t-.68)/.32,ease=1-Math.pow(1-u,2.35),rem=1-ease;
      position.copy(impact).lerp(rest,ease);
      position.y=rest.y+Math.abs(Math.sin(u*Math.PI*3.5))*bAmp*(1-u)*(1-u);
      position.x+=Math.sin(u*Math.PI*2)*scX*(1-u);
      position.z+=Math.cos(u*Math.PI*2)*scZ*(1-u)*(1-ease);
      rotation.copy(target).multiply(new Quaternion().setFromEuler(new Euler(rem*Math.PI*sx+Math.sin(u*Math.PI*4)*.18*(1-u),rem*Math.PI*sy,rem*Math.PI*sz)));
    }
  }
  if(t===1){position.copy(rest);rotation.copy(target);}
  return {position,rotation,hand,grip,handVisible:t<.84,done:t===1};
}
