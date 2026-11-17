import {useBoardTheme} from './BoardAppearance';
import {type BoardTheme} from './board-palette';
import {boardTexture,woodTexture,labelTexture} from './three/party-art';
import {useEffect,useRef} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {BoardGesture} from './three/board-gesture.ts';
import {PARTY_SIDES,ludoCell,worldPoint,ludoRoute,estatePoint,estateCell,estateIndexAt} from './three/party-layout.ts';
import {SURFACE,table,horse,estateToken,estateAssets,dice,diceRotation,tabletopProps,dispose} from './three/party-models.ts';
import {DiceRollQueue,sampleDiceThrow,THROW_DURATION,type DiceRoll} from './three/dice-motion.ts';
import type {PartyState,PracticeMove} from './practice-types';

type Props={
  kind:string;state:PartyState;mySide:string;legal:PracticeMove[];enabled:boolean;
  onMove?:(move:PracticeMove)=>void;onFallback:()=>void;topView:boolean;resetKey:number;gameKey:string;
  animate:boolean;lastDie:number|null;rollKey:string;rolls:DiceRoll[];
  selectedCell?:number|null;
  onAnimatingChange?:(busy:boolean)=>void;onHoldChange?:(holding:boolean)=>void;onCellSelect?:(index:number)=>void;
  grabRef?:React.MutableRefObject<((e:PointerEvent)=>void)|null>;
};
type Piece={node:T.Group;position:number;side:string;token:number;route:{x:number;z:number}[];from:T.Vector3;started:number;ring:T.Mesh};

export default function ScenePartyBoard(props:Props){
  const [boardTheme]=useBoardTheme();
  const host=useRef<HTMLDivElement>(null),live=useRef(props),controller=useRef<{sync:()=>void;camera:()=>void;appearance:(theme:BoardTheme)=>void}|null>(null);live.current=props;
  useEffect(()=>{
    if(!host.current)return;const mount=host.current;
    let renderer:T.WebGLRenderer;
    try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{live.current.onFallback();return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0,0);mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.style.touchAction='none';
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-8,8,8,-8,.1,90),controls=new OrbitControls(camera,renderer.domElement);
    controls.target.set(0,.22,0);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.13;controls.minPolarAngle=.035;controls.maxPolarAngle=Math.PI/3;controls.minZoom=.8;controls.maxZoom=1.65;
    let dirty=true,closed=false,lastFrame=0,frame=0;
    const markDirty=()=>{dirty=true;};controls.addEventListener('change',markDirty);
    const ambient=new T.HemisphereLight('#fff3d5','#1d392c',.9);scene.add(ambient);
    const key=new T.DirectionalLight('#fff2cf',1.6);key.position.set(-6,12,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;key.shadow.bias=-.0004;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
    const fill=new T.DirectionalLight('#c4e0d5',.45);fill.position.set(7,5,-7);scene.add(fill);
    let environment:T.WebGLRenderTarget|undefined;
    try{const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.35;room.dispose();pmrem.dispose();}catch{/* Directional lighting remains available on low-end devices. */}
    const vietnam=props.kind==='monopoly'&&props.state.edition==='vn-v2',estateSize=vietnam?13:6,trackLength=vietnam?48:20;
    const staticItems=new T.Group();const gameTable=table(props.kind,{wood:woodTexture,board:(kind,edition)=>boardTexture(kind,edition,boardTheme),label:labelTexture},props.state.edition);staticItems.add(gameTable);scene.add(staticItems);
    const felt=new T.Mesh(new T.CircleGeometry(14,80),new T.MeshStandardMaterial({color:'#112b21',roughness:1}));felt.rotation.x=-Math.PI/2;felt.position.y=-.33;felt.receiveShadow=true;staticItems.add(felt);
    if(props.kind==='monopoly')staticItems.add(tabletopProps());
    const die=dice(),rest=new T.Vector3(vietnam?-.36:0,SURFACE+.36,props.kind==='ludo'?0:1.3);die.position.copy(rest);scene.add(die);
    const secondDie=vietnam?dice():null;if(secondDie){secondDie.position.copy(rest).add(new T.Vector3(.72,0,0));scene.add(secondDie);}
    const diceCenter=new T.Vector3(0,SURFACE+.015,props.kind==='ludo'?0:1.3);
    const diceRing=new T.Mesh(new T.RingGeometry(vietnam?.76:.52,vietnam?.92:.66,48),new T.MeshBasicMaterial({color:'#f6df98',side:T.DoubleSide,transparent:true,opacity:.85}));
    diceRing.rotation.x=-Math.PI/2;diceRing.position.copy(diceCenter);diceRing.visible=false;scene.add(diceRing);

    const tileSpan=10/estateSize;
    const cellHighlight=new T.Mesh(
      new T.PlaneGeometry(tileSpan*.96,tileSpan*.96),
      new T.MeshBasicMaterial({color:'#f9e28c',transparent:true,opacity:.38,side:T.DoubleSide,depthWrite:false})
    );
    cellHighlight.rotation.x=-Math.PI/2;
    cellHighlight.position.y=SURFACE+.014;
    cellHighlight.visible=false;
    scene.add(cellHighlight);

    const rollQueue=new DiceRollQueue();rollQueue.reset(props.rolls);const pendingRolls:DiceRoll[]=[];
    let activeThrow:{roll:DiceRoll;started:number;previous:T.Quaternion;secondPrevious?:T.Quaternion;releaseOrigin?:T.Vector3}|null=null,wasAnimate=props.animate;
    let pendingDrop:{origin:T.Vector3;started:number}|null=null;
    let heldDice:{active:boolean;point:T.Vector3;started:number;moved:boolean;downX:number;downY:number}={active:false,point:rest.clone(),started:0,moved:false,downX:0,downY:0};

    const canRollNow=()=>{const p=live.current;return p.enabled&&!activeThrow&&!pendingDrop&&p.legal.some(m=>(m.action||m.command)==='roll');};
    function startThrow(now:number){
      const roll=pendingRolls.shift();if(!roll)return;
      const drop=pendingDrop;pendingDrop=null;
      const started=drop?now-THROW_DURATION*.48:now;
      activeThrow={roll,started,previous:die.quaternion.clone(),secondPrevious:secondDie?.quaternion.clone(),releaseOrigin:drop?.origin};
      live.current.onAnimatingChange?.(true);
    }
    let assetRoot=new T.Group();scene.add(assetRoot);let assetKey='';
    const pieces=new Map<string,Piece>(),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const endpoint=(side:string,token:number,pos:number)=>props.kind==='ludo'?worldPoint(ludoCell(side,token,pos)):estatePoint(pos,PARTY_SIDES.indexOf(side),estateSize);
    function sync(){
      const p=live.current,keep=new Set<string>(),now=performance.now();
      const baseline=!p.animate||!wasAnimate||reduced;
      if(baseline){rollQueue.reset(p.rolls);pendingRolls.length=0;activeThrow=null;pendingDrop=null;heldDice.active=false;die.position.copy(rest);secondDie?.position.copy(rest).add(new T.Vector3(.72,0,0));p.onAnimatingChange?.(false);p.onHoldChange?.(false);}
      else{pendingRolls.push(...rollQueue.accept(p.rolls));if(!activeThrow)startThrow(now);}
      wasAnimate=p.animate;
      diceRing.visible=canRollNow()&&!heldDice.active;
      if(props.kind==='monopoly'&&p.selectedCell!=null&&p.selectedCell>=0){
        const [r,c]=estateCell(p.selectedCell,estateSize),step=600/estateSize,pt=worldPoint([c*step+step*.5,r*step+step*.5]);
        cellHighlight.position.set(pt.x,SURFACE+.014,pt.z);
        cellHighlight.visible=true;
      }else{
        cellHighlight.visible=false;
      }
      const rollWait=activeThrow?Math.max(0,THROW_DURATION-(now-activeThrow.started))+pendingRolls.length*THROW_DURATION:0;
      for(const player of p.state.players){if(!player.active)continue;const seat=PARTY_SIDES.indexOf(player.side),tokens=props.kind==='ludo'?player.tokens:[player.position];
        tokens.forEach((position,token)=>{
          const id=`${player.side}:${token}`;keep.add(id);let piece=pieces.get(id);const target=endpoint(player.side,token,position);
          if(!piece){const node=props.kind==='ludo'?horse(player.side,token+1):estateToken(player.side,seat);node.position.set(target.x,SURFACE,target.z);node.rotation.y=props.kind==='ludo'?seat*Math.PI/2:0;scene.add(node);
            const ring=new T.Mesh(new T.RingGeometry(.24,.29,36),new T.MeshBasicMaterial({color:'#f8e4a1',side:T.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.y=.01;node.add(ring);
            piece={node,position,side:player.side,token,route:[],from:node.position.clone(),started:now,ring};pieces.set(id,piece);
          }else if(baseline){piece.route=[];piece.position=position;piece.node.position.set(target.x,SURFACE,target.z);}
          else if(position!==piece.position){
            const teleport=vietnam&&p.state.movement?.side===player.side&&p.state.movement.teleport;
            const path=props.kind==='ludo'?ludoRoute(player.side,token,piece.position,position):teleport?[target]:Array.from({length:(position-piece.position+trackLength)%trackLength},(_,i)=>estatePoint((piece!.position+i+1)%trackLength,seat,estateSize));
            if(p.animate&&!reduced){piece.route.push(...path);piece.from.copy(piece.node.position);piece.started=now+rollWait;}else{piece.route=[];piece.node.position.set(target.x,SURFACE,target.z);}
            piece.position=position;
          }
          piece.ring.visible=p.enabled&&player.side===p.mySide&&p.legal.some(m=>(m.action||m.command)==='move'&&m.to===token);
          piece.node.userData.pick=player.side===p.mySide?token:null;
        });
      }
      for(const [id,piece]of pieces)if(!keep.has(id)){scene.remove(piece.node);dispose(piece.node);pieces.delete(id);}
      if(props.kind==='monopoly'){const key=JSON.stringify([p.state.property,p.state.houses,p.state.mortgaged]);if(key!==assetKey){scene.remove(assetRoot);dispose(assetRoot);assetRoot=estateAssets(p.state);scene.add(assetRoot);assetKey=key;}}
      if(!activeThrow&&!heldDice.active&&!pendingDrop){die.quaternion.setFromEuler(diceRotation(p.lastDie||p.state.diceValues?.[0]||p.state.dice||1));secondDie?.quaternion.setFromEuler(diceRotation(p.rolls.at(-1)?.faces?.[1]||p.state.diceValues?.[1]||1));}
      dirty=true;
    }
    function fit(){const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight),aspect=w/h,size=Math.max(11.1,11.1/aspect);camera.left=-size*aspect/2;camera.right=size*aspect/2;camera.top=size/2;camera.bottom=-size/2;camera.updateProjectionMatrix();renderer.setSize(w,h,false);dirty=true;}
    function resetCamera(){camera.zoom=1;camera.up.set(0,1,0);camera.position.set(0,live.current.topView?22:17,live.current.topView?.001:10);controls.target.set(0,SURFACE,0);camera.lookAt(controls.target);fit();controls.update();dirty=true;}
    controller.current={sync,camera:resetCamera,appearance:(theme)=>{const face=gameTable.getObjectByName('table-playing-surface') as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;const previous=face.material.map;face.material.map=boardTexture(props.kind,props.state.edition,theme);face.material.needsUpdate=true;previous?.dispose();(felt.material as T.MeshStandardMaterial).color.set(theme==='light'?'#d8dfce':'#112b21');dirty=true;}};resetCamera();sync();
    const resize=new ResizeObserver(fit);resize.observe(mount);
    const ray=new T.Raycaster(),cursor=new T.Vector2(),gesture=new BoardGesture();
    const boardPlane=new T.Plane(new T.Vector3(0,1,0),-SURFACE);
    const liftPlane=new T.Plane(new T.Vector3(0,1,0),-(SURFACE+1.35));

    const updateCursorRay=(e:{clientX:number;clientY:number})=>{
      const box=renderer.domElement.getBoundingClientRect();
      cursor.set((e.clientX-box.left)/Math.max(1,box.width)*2-1,-(e.clientY-box.top)/Math.max(1,box.height)*2+1);
      ray.setFromCamera(cursor,camera);
    };
    const projectLiftPoint=(e:{clientX:number;clientY:number})=>{
      updateCursorRay(e);
      const pt=ray.ray.intersectPlane(liftPlane,new T.Vector3())||new T.Vector3(rest.x,SURFACE+1.35,rest.z);
      pt.x=T.MathUtils.clamp(pt.x,-3.8,3.8);
      pt.z=T.MathUtils.clamp(pt.z,-3.8,3.8);
      pt.y=SURFACE+1.35;
      return pt;
    };
    const isHittingDice=(e:PointerEvent)=>{
      if(!canRollNow())return false;
      updateCursorRay(e);
      const targets=secondDie?[die,secondDie,diceRing]:[die,diceRing];
      if(ray.intersectObjects(targets,true).length>0)return true;
      const pt=ray.ray.intersectPlane(boardPlane,new T.Vector3());
      return !!pt&&pt.distanceTo(diceCenter)<(vietnam?1.25:1.05);
    };
    const beginHold=(e:PointerEvent)=>{
      if(!canRollNow())return;
      heldDice={active:true,point:projectLiftPoint(e),started:performance.now(),moved:false,downX:e.clientX,downY:e.clientY};
      controls.enabled=false;
      diceRing.visible=false;
      renderer.domElement.style.cursor='grabbing';
      live.current.onHoldChange?.(true);
      dirty=true;
    };
    if(live.current.grabRef)live.current.grabRef.current=beginHold;

    const down=(e:PointerEvent)=>{
      if(isHittingDice(e)){e.stopPropagation();beginHold(e);return;}
      gesture.down(e);
    };
    const move=(e:PointerEvent)=>{
      if(heldDice.active){
        if(Math.hypot(e.clientX-heldDice.downX,e.clientY-heldDice.downY)>6)heldDice.moved=true;
        heldDice.point.copy(projectLiftPoint(e));
        dirty=true;
        return;
      }
      if(canRollNow()){
        renderer.domElement.style.cursor=isHittingDice(e)?'grab':'';
      }else if(renderer.domElement.style.cursor){
        renderer.domElement.style.cursor='';
      }
      gesture.move(e);
    };
    const releaseHold=(e:PointerEvent)=>{
      if(!heldDice.active)return false;
      const dropOrigin=projectLiftPoint(e);
      heldDice.active=false;
      controls.enabled=true;
      renderer.domElement.style.cursor='';
      live.current.onHoldChange?.(false);
      const rollMove=live.current.legal.find(m=>(m.action||m.command)==='roll');
      if(rollMove&&live.current.enabled){
        pendingDrop={origin:dropOrigin,started:performance.now()};
        live.current.onMove?.(rollMove);
      }else{
        die.position.copy(rest);
        secondDie?.position.copy(rest).add(new T.Vector3(.72,0,0));
      }
      dirty=true;
      return true;
    };
    const cancel=(e:PointerEvent)=>{
      if(heldDice.active){
        heldDice.active=false;controls.enabled=true;renderer.domElement.style.cursor='';
        die.position.copy(rest);secondDie?.position.copy(rest).add(new T.Vector3(.72,0,0));
        live.current.onHoldChange?.(false);dirty=true;return;
      }
      gesture.cancel(e);
    };
    const up=(e:PointerEvent)=>{
      if(releaseHold(e))return;
      if(!gesture.up(e))return;
      updateCursorRay(e);
      if(props.kind==='monopoly'){
        const point=ray.ray.intersectPlane(boardPlane,new T.Vector3());
        if(point){
          const index=estateIndexAt(point.x,point.z,estateSize);
          if(index!==null)live.current.onCellSelect?.(index);
        }
        return;
      }
      if(!live.current.enabled||props.kind!=='ludo')return;
      const hits=ray.intersectObjects([...pieces.values()].map(p=>p.node),true);
      for(const hit of hits){let obj:T.Object3D|null=hit.object;while(obj&&!Object.hasOwn(obj.userData,'pick'))obj=obj.parent;const token=obj?.userData.pick;if(token===null||token===undefined)continue;const legal=live.current.legal.find(m=>(m.action||m.command)==='move'&&m.to===token);if(legal){live.current.onMove?.(legal);break;}}
    };
    const winMove=(e:PointerEvent)=>{if(heldDice.active)move(e);};
    const winUp=(e:PointerEvent)=>{if(heldDice.active)releaseHold(e);};
    const lost=(e:Event)=>{e.preventDefault();live.current.onFallback();};
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('webglcontextlost',lost);
    window.addEventListener('pointermove',winMove);window.addEventListener('pointerup',winUp);

    function render(time:number){if(closed)return;frame=requestAnimationFrame(render);if(document.hidden||time-lastFrame<32)return;lastFrame=time;let moving=false;controls.update();
      if(diceRing.visible){diceRing.scale.setScalar(1+Math.sin(time*.005)*.06);moving=true;}
      for(const piece of pieces.values())if(piece.route.length){moving=true;if(activeThrow||time<piece.started)continue;const target=piece.route[0],t=Math.min(1,(time-piece.started)/(piece.route.length>2?100:180)),ease=t*t*(3-2*t);piece.node.position.set(T.MathUtils.lerp(piece.from.x,target.x,ease),SURFACE+Math.sin(t*Math.PI)*.16,T.MathUtils.lerp(piece.from.z,target.z,ease));if(t===1){piece.route.shift();piece.from.copy(piece.node.position);piece.started=time;}}
      if(heldDice.active){
        const shakeX=Math.sin(time*.028)*.08,shakeY=Math.cos(time*.034)*.05,shakeZ=Math.sin(time*.024)*.07;
        const holdPos=new T.Vector3(heldDice.point.x+shakeX,heldDice.point.y+shakeY,heldDice.point.z+shakeZ);
        die.position.copy(holdPos);
        die.quaternion.setFromEuler(new T.Euler(time*.011,time*.014,Math.sin(time*.018)*.8));
        if(secondDie){
          secondDie.position.copy(holdPos).add(new T.Vector3(.72,Math.sin(time*.03)*.04,0));
          secondDie.quaternion.setFromEuler(new T.Euler(-time*.012,time*.01,Math.cos(time*.02)*.8));
        }
        moving=true;
      }else if(pendingDrop&&!activeThrow){
        const dt=Math.min(1,(time-pendingDrop.started)/300);
        if(time-pendingDrop.started>1500){pendingDrop=null;die.position.copy(rest);secondDie?.position.copy(rest).add(new T.Vector3(.72,0,0));}
        else{
          const pos=pendingDrop.origin.clone().lerp(rest,dt*.4);
          pos.y=Math.max(rest.y,pendingDrop.origin.y*(1-dt)+rest.y*dt);
          die.position.copy(pos);
          die.quaternion.setFromEuler(new T.Euler(time*.016,time*.014,time*.012));
          if(secondDie){secondDie.position.copy(pos).add(new T.Vector3(.72,0,0));secondDie.quaternion.setFromEuler(new T.Euler(-time*.015,time*.017,-time*.013));}
          moving=true;
        }
      }else if(activeThrow){
        const pose=sampleDiceThrow(time-activeThrow.started,activeThrow.roll.value,rest,activeThrow.previous,activeThrow.releaseOrigin);
        die.position.copy(pose.position);die.quaternion.copy(pose.rotation);
        if(secondDie){const second=sampleDiceThrow(time-activeThrow.started,activeThrow.roll.faces?.[1]||1,rest,activeThrow.secondPrevious,activeThrow.releaseOrigin);secondDie.position.copy(second.position).add(new T.Vector3(.72,0,0));secondDie.quaternion.copy(second.rotation);}
        moving=true;
        if(pose.done){activeThrow=null;startThrow(time);if(!activeThrow){diceRing.visible=canRollNow();live.current.onAnimatingChange?.(false);}}
      }
      if(dirty||moving){renderer.render(scene,camera);dirty=false;}
    }
    frame=requestAnimationFrame(render);
    return()=>{closed=true;if(live.current.grabRef)live.current.grabRef.current=null;cancelAnimationFrame(frame);resize.disconnect();controls.removeEventListener('change',markDirty);controls.dispose();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('webglcontextlost',lost);window.removeEventListener('pointermove',winMove);window.removeEventListener('pointerup',winUp);controller.current=null;live.current.onAnimatingChange?.(false);live.current.onHoldChange?.(false);dispose(scene);environment?.dispose();key.shadow.dispose();renderer.dispose();renderer.domElement.remove();};
  },[props.kind,props.gameKey]);
  useEffect(()=>{controller.current?.sync();},[props.state,props.enabled,props.legal,props.mySide,props.animate,props.lastDie,props.rollKey,props.selectedCell]);
  useEffect(()=>{controller.current?.appearance(boardTheme);},[boardTheme]);
  useEffect(()=>{controller.current?.camera();},[props.topView,props.resetKey]);
  return <div className="party-model" ref={host} role="img" aria-label={`Bộ cờ ${props.kind==='ludo'?'Cá ngựa':props.state.edition==='vn-v2'?'Tỷ phú Việt Nam':'Tỷ phú bản cũ'} 3D, bàn gỗ và quân cờ nổi.`}/>;
}
