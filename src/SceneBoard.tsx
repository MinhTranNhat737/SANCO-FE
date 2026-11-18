import {useBoardTheme} from './BoardAppearance';
import {playMoveSound} from './sound-effects';
import {BOARD_PALETTES,type BoardTheme} from './board-palette';
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {BoardGesture} from './three/board-gesture.ts';
import {caroPiece,chessPiece,xiangqiPiece,discPiece,disposeObject} from './three/pieces';
import {boardMetrics,boardPoint,fitBoardCamera,setBoardCamera,BOARD_SURFACE_Y} from './three/board-layout.ts';
import {snapshot,incomingBoard,sampleActor,type Snapshot,type Transition,type MotionActor} from './three/board-motion.ts';
import {META,squareName,pieceName,type GameKind,type PracticeMove,type PracticePly} from './practice-types';
import {loadCommanderModels,commanderPiece} from './three/commander-models';
import {commanderUnits} from './commander-ui';
import {buildCommanderScenery,COMMANDER_SCENERY_PADDING} from './three/commander-scenery';

export type SceneBoardProps={gameKey:string;history:PracticePly[];plyCount:number;onAnimatingChange:(busy:boolean)=>void;onZoomChange:(zoom:number)=>void;pendingSquare:number|null;kind:GameKind;board:(string|null)[];selected:number|null;targets:number[];last:PracticeMove|null;checkSquare:number|null;winning:number[];flipped:boolean;topView:boolean;resetViewKey:number;zoom:number;enabled:boolean;onSquare:(square:number)=>void;onFallback:()=>void;airDefense?:boolean;scenery?:boolean};
type Props=SceneBoardProps;

function tableTexture(kind:GameKind,width:number,depth:number,theme:BoardTheme){
  const palette=BOARD_PALETTES[theme];
  const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=Math.round(1400*depth/width);const ctx=canvas.getContext('2d')!,{cols,rows}=META[kind];
  const x=(v:number)=>(v/width+.5)*canvas.width,z=(v:number)=>(v/depth+.5)*canvas.height;
  const color=palette.board;ctx.fillStyle=color;ctx.fillRect(0,0,canvas.width,canvas.height);
  if(['chess','checkers','ataxx','breakthrough','loa','isolation'].includes(kind)){
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){ctx.fillStyle=(r+c)%2?palette.squareDark:palette.squareLight;ctx.fillRect(x(c-cols/2),z(r-rows/2),canvas.width/width+1,canvas.height/depth+1);}
  }
  if(kind==='reversi'||kind==='connect4'){
    ctx.fillStyle=kind==='reversi'?palette.field:palette.squareDark;ctx.fillRect(0,0,canvas.width,canvas.height);
    const cell=canvas.width/width;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const cx=x(c-(cols-1)/2),cz=z(r-(rows-1)/2);
      if(kind==='connect4'){ctx.fillStyle=palette.hole;ctx.beginPath();ctx.arc(cx,cz,cell*.41,0,Math.PI*2);ctx.fill();ctx.strokeStyle=palette.grid;ctx.lineWidth=2;ctx.stroke();}
      else{ctx.strokeStyle=palette.grid;ctx.lineWidth=2;ctx.strokeRect(cx-cell/2,cz-cell/2,cell,cell);}
    }
  }
  ctx.save();ctx.globalAlpha=kind==='xiangqi'?.025:kind==='chess'||kind==='checkers'?.055:.09;ctx.strokeStyle=kind==='caro'||kind==='tictactoe'?'#a7c3a1':'#43351e';ctx.lineWidth=.7;
  for(let i=0;i<160;i++){const y=i*canvas.height/160;ctx.beginPath();ctx.moveTo(0,y);for(let j=0;j<=canvas.width;j+=25)ctx.lineTo(j,y+Math.sin(j*.013+i*1.3)*3);ctx.stroke();}ctx.restore();
  const line=(x1:number,z1:number,x2:number,z2:number)=>{ctx.beginPath();ctx.moveTo(x(x1),z(z1));ctx.lineTo(x(x2),z(z2));ctx.stroke();};
  if(kind==='commander'){
    const dark=theme==='dark';ctx.fillStyle=dark?'#314738':'#d8ddbc';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle=dark?'#15394d':'#72abbc';ctx.fillRect(0,0,x(-2.5),canvas.height);
    ctx.fillStyle=dark?'#285568':'#a0d1d1';ctx.fillRect(x(-2.5),z(-.5),canvas.width, z(.5)-z(-.5));
    ctx.strokeStyle=dark?'#5b95aa':'#b9dce3';ctx.lineWidth=2;
    for(let r=0;r<22;r++){const rz=-5.7+r*.55;for(let c=-5.1;c<-2.6;c+=.6)line(c,rz,c+.22,rz+.06);}
    ctx.fillStyle=dark?'#8b8662':'#c0b37c';for(const c of[5,7])ctx.fillRect(x(c-5-.25),z(-.53),x(c-5+.25)-x(c-5-.25),z(.53)-z(-.53));
    ctx.strokeStyle=dark?'#a1bc9d':'#486248';ctx.lineWidth=2;
    for(let r=0;r<12;r++)line(-5,r-5.5,5,r-5.5);
    for(let c=0;c<11;c++){if(c<=2)line(c-5,-5.5,c-5,5.5);else{line(c-5,-5.5,c-5,-.5);line(c-5,.5,c-5,5.5);}}
    ctx.lineWidth=5;line(-3,-5.5,-3,5.5);
    ctx.font='bold 26px sans-serif';ctx.textAlign='center';ctx.fillStyle=dark?'#fff1c8':'#304937';ctx.fillText('NGẦM',x(0),z(0));ctx.fillText('NGẦM',x(2),z(0));
  }else if(kind==='xiangqi'){
    ctx.fillStyle=palette.river;ctx.fillRect(x(-4),z(-.5),x(4)-x(-4),z(.5)-z(-.5));
    ctx.fillStyle=palette.palace;for(const start of[-4.5,2.5])ctx.fillRect(x(-1),z(start),x(1)-x(-1),z(start+2)-z(start));
    ctx.strokeStyle=palette.ink;ctx.lineWidth=4.5;
    for(let r=0;r<10;r++)line(-4,r-4.5,4,r-4.5);
    for(let c=0;c<9;c++){if(c===0||c===8)line(c-4,-4.5,c-4,4.5);else{line(c-4,-4.5,c-4,-.5);line(c-4,.5,c-4,4.5);}}
    line(-1,-4.5,1,-2.5);line(1,-4.5,-1,-2.5);line(-1,2.5,1,4.5);line(1,2.5,-1,4.5);
    ctx.lineWidth=6;ctx.strokeRect(x(-4),z(-4.5),x(4)-x(-4),z(4.5)-z(-4.5));
    ctx.font='bold 52px "SimSun",serif';ctx.fillStyle=palette.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('楚 河',x(-2),z(0));ctx.fillText('漢 界',x(2),z(0));
    ctx.lineWidth=3;
    for(const [r,c]of[[2,1],[2,7],[7,1],[7,7],[3,0],[3,2],[3,4],[3,6],[3,8],[6,0],[6,2],[6,4],[6,6],[6,8]])for(const sign of[-1,1])if(c+sign>=0&&c+sign<=8){const cx=c-4,rz=r-4.5;for(const v of[-1,1]){line(cx+sign*.07,rz+v*.17,cx+sign*.07,rz+v*.07);line(cx+sign*.07,rz+v*.07,cx+sign*.17,rz+v*.07);}}
  }else if(kind==='coganh'){
    ctx.strokeStyle=palette.ink;ctx.lineWidth=4;for(let i=-2;i<=2;i++){line(i,-2,i,2);line(-2,i,2,i);}line(-2,-2,2,2);line(2,-2,-2,2);line(0,-2,2,0);line(2,0,0,2);line(0,2,-2,0);line(-2,0,0,-2);
  }else if(kind==='go'){
    ctx.strokeStyle=palette.ink;ctx.lineWidth=2.4;
    for(let i=-4;i<=4;i++){line(i,-4,i,4);line(-4,i,4,i);}
    ctx.fillStyle=palette.ink;
    for(const [r,c]of[[2,2],[2,6],[6,2],[6,6],[4,4]]){ctx.beginPath();ctx.arc(x(c-4),z(r-4),5,0,Math.PI*2);ctx.fill();}
  }else if(kind==='caro'||kind==='tictactoe'){
    const half=cols/2;
    ctx.strokeStyle=palette.grid;ctx.lineWidth=kind==='tictactoe'?3.2:1.6;
    for(let i=0;i<=cols;i++){line(i-half,-half,i-half,half);line(-half,i-half,half,i-half);}
    if(kind==='caro'){ctx.fillStyle=palette.grid;for(const [r,c]of[[3,3],[3,11],[7,7],[11,3],[11,11]]){ctx.beginPath();ctx.arc(x(c-7),z(r-7),3,0,Math.PI*2);ctx.fill();}}
  }
  const files=kind==='go'?'ABCDEFGHJ':'ABCDEFGHIJKLMNO';
  ctx.fillStyle=palette.ink;ctx.font=`${kind==='xiangqi'?700:500} ${kind==='xiangqi'?24:kind==='caro'?17:20}px "Be Vietnam Pro",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(let c=0;c<cols;c++){const cx=c-(cols-1)/2,label=kind==='commander'?String(c):files[c];ctx.fillText(label,x(cx),z(depth/2-.19));ctx.save();ctx.translate(x(cx),z(-depth/2+.19));ctx.rotate(Math.PI);ctx.fillText(label,0,0);ctx.restore();}
  for(let r=0;r<rows;r++){const rz=r-(rows-1)/2;const label=String(kind==='commander'?11-r:kind==='caro'?r+1:rows-r);ctx.fillText(label,x(-width/2+.18),z(rz));ctx.fillText(label,x(width/2-.18),z(rz));}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return texture;
}

type MovingPiece={object:T.Object3D;actor:MotionActor;startY:number};
type ActiveMove={plan:Transition;startedAt:number;actors:MovingPiece[];victims:{object:T.Object3D;origin:T.Vector3}[]};

export default function SceneBoard(props:Props){
  const [boardTheme]=useBoardTheme(),themeRef=useRef(boardTheme);themeRef.current=boardTheme;
  const mount=useRef<HTMLDivElement>(null),live=useRef(props);
  const controller=useRef<{update:()=>void;view:()=>void;zoom:()=>void;environment:()=>void;appearance:(theme:BoardTheme)=>void}|null>(null);
  const [focused,setFocused]=useState(0),[failed,setFailed]=useState(false);
  const [modelsReady,setModelsReady]=useState(props.kind!=='commander');
  const focusedRef=useRef(0);live.current=props;focusedRef.current=focused;
  useEffect(()=>{
    if(!mount.current)return;
    const host=mount.current,{cols,rows,width,depth}=boardMetrics(props.kind),point=(index:number)=>boardPoint(props.kind,index);
    let renderer:T.WebGLRenderer;
    try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}
    catch{try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{setFailed(true);live.current.onFallback();return;}}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0,0);
    host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
    const scene=new T.Scene(),assets=new T.Group();assets.visible=false;scene.add(assets);
    const landscape=props.kind==='commander'?buildCommanderScenery(boardTheme):null;
    if(landscape){landscape.exterior.visible=!!props.scenery;scene.add(landscape.root);}
    const cameraPadding=()=>landscape&&live.current.scenery?COMMANDER_SCENERY_PADDING:0;
    const camera=new T.OrthographicCamera(-8,8,8,-8,.1,140);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.target.set(0,BOARD_SURFACE_Y,0);
    controls.enablePan=false;controls.enableDamping=false;
    controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI/3;
    controls.minZoom=.7;controls.maxZoom=2.2;controls.rotateSpeed=.65;
    controls.touches.ONE=T.TOUCH.ROTATE;controls.touches.TWO=T.TOUCH.DOLLY_ROTATE;
    const zoomChanged=()=>{if(Math.abs(camera.zoom-live.current.zoom)>.00001)live.current.onZoomChange(camera.zoom);};
    controls.addEventListener('change',zoomChanged);
    scene.add(new T.HemisphereLight(0xe2f0d2,0x293229,2));
    const key=new T.DirectionalLight(0xffead0,3.4);key.position.set(-7,15,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
    const shadowSize=Math.max(width,depth)*.8;
    key.shadow.camera.left=-shadowSize;key.shadow.camera.right=shadowSize;key.shadow.camera.top=shadowSize;key.shadow.camera.bottom=-shadowSize;
    key.shadow.camera.far=50;key.shadow.normalBias=.025;key.shadow.bias=-.0001;scene.add(key);
    const fill=new T.DirectionalLight(0xa7dacc,1.7);fill.position.set(8,8,-10);scene.add(fill);
    const rim=new T.DirectionalLight(0xffd8a2,1.1);rim.position.set(-7,5,-6);scene.add(rim);
    const wood=new T.MeshStandardMaterial({color:0x4a3524,roughness:.4,metalness:.08});
    const trim=new T.MeshStandardMaterial({color:0xb08b4e,roughness:.35,metalness:.65});
    const add=(geometry:T.BufferGeometry<T.NormalBufferAttributes>,material:T.Material,y:number)=>{
      const mesh=new T.Mesh(geometry,material);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
    };
    add(new T.BoxGeometry(width+.65,.4,depth+.65),wood,0);
    add(new T.BoxGeometry(width+.45,.055,depth+.45),trim,.18);
    add(new T.BoxGeometry(width+.28,.1,depth+.28),wood,.235);
    const topMaterial=new T.MeshBasicMaterial({map:tableTexture(props.kind,width,depth,boardTheme),toneMapped:false});
    const top=add(new T.PlaneGeometry(width,depth),topMaterial,.292);
    top.rotation.x=-Math.PI/2;top.castShadow=false;
    const floor=add(new T.PlaneGeometry(100,100),new T.ShadowMaterial({opacity:.35}),-.23);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
    if(landscape)floor.visible=false;
    const plateCanvas=document.createElement('canvas');plateCanvas.width=512;plateCanvas.height=80;const ctx=plateCanvas.getContext('2d')!;
    ctx.fillStyle='#dac093';ctx.font='500 42px Georgia,serif';ctx.textAlign='center';ctx.fillText('S Â N   C Ờ',256,54);
    const plateTexture=new T.CanvasTexture(plateCanvas);plateTexture.colorSpace=T.SRGBColorSpace;
    const plate=add(new T.PlaneGeometry(2,.26),new T.MeshBasicMaterial({map:plateTexture,transparent:true,depthWrite:false}),-.025);plate.position.z=(depth+.66)/2;plate.castShadow=false;
    const pieces=new T.Group(),highlights=new T.Group(),battleFx=new T.Group();scene.add(pieces,highlights,battleFx);
    const templates=new Map<string,T.Group>(),stationary=new Map<number,T.Object3D>();
    let commanderModels:Map<string,T.Group>|null=null;
    const queue:Transition[]=[];let accepted:Snapshot|null=null,active:ActiveMove|null=null,animating=false;
    function signal(value:boolean){if(animating===value)return;animating=value;live.current.onAnimatingChange(value);}
    function orientCommander(root:T.Object3D){const sign=live.current.flipped?-1:1;root.traverse(o=>{if(o.userData.commanderLabel){o.rotation.z=live.current.flipped?Math.PI:0;o.position.z=sign*(o.userData.baseZ??.32);}if(o.userData.commanderUnit)o.position.z=sign*(o.userData.baseZ??-.17);});}
    function objectFor(code:string,index:number){
      let template=templates.get(code);
      if(!template&&code==='#shot'){
        template=new T.Group();
        template.add(new T.Mesh(new T.SphereGeometry(.16,12,10),new T.MeshBasicMaterial({color:0xfff7d6,toneMapped:false})));
        template.add(new T.Mesh(new T.SphereGeometry(.3,12,10),new T.MeshBasicMaterial({color:0xff7b00,transparent:true,opacity:.72,depthWrite:false,toneMapped:false})));
        templates.set(code,template);assets.add(template);
      }
      if(!template&&code==='#'){template=new T.Group();const tile=new T.Mesh(new T.BoxGeometry(.93,.025,.93),new T.MeshBasicMaterial({color:0x0e1c19}));tile.position.y=.015;template.add(tile);templates.set(code,template);assets.add(template);}
      if(!template){template=props.kind==='commander'?commanderPiece(code,commanderModels!):props.kind==='chess'?chessPiece(code):props.kind==='xiangqi'?xiangqiPiece(code):props.kind==='caro'||props.kind==='tictactoe'?caroPiece(code,themeRef.current):discPiece(code);templates.set(code,template);assets.add(template);}
      const object=template.clone(true);if(props.kind==='commander')orientCommander(object);object.userData.square=index;object.position.copy(point(index));pieces.add(object);return object;
    }
    function snap(board:readonly (string|null)[]){
      pieces.clear();stationary.clear();
      board.forEach((code,index)=>{if(code)stationary.set(index,objectFor(code,index));});
    }
    function marker(index:number,color:number,size=.4,opacity=.9){
      if(props.kind==='commander'){
        const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-size,0,-size),new T.Vector3(size,0,-size),new T.Vector3(size,0,size),new T.Vector3(-size,0,size)]);
        const outline=new T.LineLoop(geometry,new T.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false}));outline.position.copy(point(index));outline.position.y=.385;highlights.add(outline);
        const frame=new T.Mesh(new T.RingGeometry(size*1.12,size*1.28,4),new T.MeshBasicMaterial({color,transparent:true,opacity:opacity*.85,depthWrite:false,toneMapped:false}));
        frame.rotation.x=-Math.PI/2;frame.rotation.z=Math.PI/4;frame.position.copy(point(index));frame.position.y=.388;highlights.add(frame);
        return;
      }
      const m=new T.Mesh(new T.RingGeometry(size-(props.kind==='xiangqi'?.065:.035),size,48),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
      m.rotation.x=-Math.PI/2;m.position.copy(point(index));m.position.y=.31;highlights.add(m);
    }
    function drawHighlights(){
      const p=live.current,last=active?.plan.move||p.last,palette=BOARD_PALETTES[themeRef.current];
      disposeObject(highlights);highlights.clear();
      if(p.kind==='commander'&&p.airDefense)p.board.forEach((cell,index)=>commanderUnits(cell).filter(u=>['A','M','N'].includes(u[1])).forEach(unit=>{
        const radius=(unit[1]==='M'?2:1)+(unit.endsWith('*')?1:0),color=unit[0]==='r'?0xf66f83:0x73bfff;
        const zone=new T.Mesh(new T.RingGeometry(radius-.025,radius,64),new T.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false}));zone.rotation.x=-Math.PI/2;zone.position.copy(point(index));zone.position.y=.32;highlights.add(zone);
      }));
      if(last&&last.to>=0){if(last.from!==null&&last.from>=0)marker(last.from,new T.Color(palette.last).getHex(),.46,p.kind==='xiangqi'?1:.55);marker(last.to,new T.Color(palette.last).getHex(),.46,p.kind==='xiangqi'?1:.8);}
      if(!animating){
        if(p.selected!==null&&p.selected>=0)marker(p.selected,new T.Color(palette.marker).getHex(),.48,1);
        if(p.pendingSquare!==null&&p.pendingSquare>=0&&p.pendingSquare!==p.selected)marker(p.pendingSquare,new T.Color(palette.marker).getHex(),.45,p.kind==='xiangqi'?1:.9);
        if(p.kind!=='caro'&&p.kind!=='tictactoe'&&p.kind!=='go')for(const target of p.targets){
          if(target<0)continue;
          if(p.board[target]){
            const isEnemy=p.selected!==null&&p.board[p.selected]&&p.board[target]&&p.board[p.selected]![0]!==p.board[target]![0];
            const tColor=p.kind==='commander'?(isEnemy?0xff4d29:0x38bdf8):new T.Color(palette.marker).getHex();
            marker(target,tColor,.47,1);
            if(p.kind==='commander'){
              const ring=new T.Mesh(new T.RingGeometry(.42,.54,32),new T.MeshBasicMaterial({color:tColor,transparent:true,opacity:.95,depthWrite:false,toneMapped:false}));
              ring.rotation.x=-Math.PI/2;ring.position.copy(point(target));ring.position.y=.41;highlights.add(ring);
              const beacon=new T.Mesh(new T.CircleGeometry(.15,24),new T.MeshBasicMaterial({color:tColor,transparent:true,opacity:.95,depthWrite:false,toneMapped:false}));
              beacon.rotation.x=-Math.PI/2;beacon.position.copy(point(target));beacon.position.y=.88;highlights.add(beacon);
            }
          }
          else{const dot=new T.Mesh(new T.CircleGeometry(p.kind==='xiangqi'?.14:.12,24),new T.MeshBasicMaterial({color:palette.marker,transparent:true,opacity:p.kind==='xiangqi'?1:.9,depthWrite:false}));dot.rotation.x=-Math.PI/2;dot.position.copy(point(target));dot.position.y=.312;highlights.add(dot);}
        }
        if(p.checkSquare!==null&&p.checkSquare>=0)marker(p.checkSquare,new T.Color(palette.check).getHex(),.5,1);
        for(const index of p.winning)if(index>=0)marker(index,0xceefa2,.47,1);
        if(document.activeElement===host)marker(focusedRef.current,0xc9baff,.49,.95);
      }
    }
    type BattleParticle={mesh:T.Mesh;vx:number;vy:number;vz:number;born:number;life:number;s0:number;s1:number;op:number;ring?:boolean};
    const battleParticles:BattleParticle[]=[];
    const ambientSmokes:T.Mesh[]=[];
    const blastLight=new T.PointLight(0xff8c24,0,16);blastLight.position.set(0,BOARD_SURFACE_Y+1.4,0);battleFx.add(blastLight);
    let lastTrailAt=0,flashUntil=0;
    const sphereGeo=new T.SphereGeometry(1,10,8),ringGeo=new T.RingGeometry(.48,1,24);ringGeo.rotateX(-Math.PI/2);
    if(props.kind==='commander'){
      for(let i=0;i<12;i++){
        const mat=new T.MeshBasicMaterial({color:i%2?0x4b534a:0x6e6859,transparent:true,opacity:.18,depthWrite:false,toneMapped:false});
        const puff=new T.Mesh(sphereGeo,mat);
        puff.position.set((Math.random()-.5)*cols*.85,BOARD_SURFACE_Y+.26+Math.random()*.4,(Math.random()-.5)*rows*.85);
        puff.scale.setScalar(.28+Math.random()*.32);
        battleFx.add(puff);ambientSmokes.push(puff);
      }
    }
    function spawnParticle(x:number,y:number,z:number,color:number,s0:number,s1:number,vx:number,vy:number,vz:number,born:number,life:number,op:number,ring=false){
      const mat=new T.MeshBasicMaterial({color,transparent:true,opacity:op,depthWrite:false,toneMapped:false,side:ring?T.DoubleSide:T.FrontSide});
      const mesh=new T.Mesh(ring?ringGeo:sphereGeo,mat);
      mesh.position.set(x,y,z);mesh.scale.setScalar(s0);
      battleFx.add(mesh);battleParticles.push({mesh,vx,vy,vz,born,life,s0,s1,op,ring});
    }
    function spawnMuzzle(sq:number,now:number){
      const p=boardPoint(props.kind,sq);p.y+=.34;
      blastLight.position.set(p.x,BOARD_SURFACE_Y+1.5,p.z);blastLight.intensity=6;flashUntil=Math.max(flashUntil,now+360);
      spawnParticle(p.x,p.y,p.z,0xfff7d6,.18,.68,0,.18,0,now,240,.96);
      spawnParticle(p.x,p.y,p.z,0xff6b2b,.14,.55,0,.12,0,now,280,.9);
      spawnParticle(p.x,p.y-.14,p.z,0xffbe0b,.16,.85,0,0,0,now,260,.82,true);
      for(let i=0;i<6;i++){
        const a=Math.random()*Math.PI*2,sp=.32+Math.random()*.55;
        spawnParticle(p.x,p.y,p.z,i%2?0x57534e:0x78716c,.14,.54,Math.cos(a)*sp,.55+Math.random()*.45,Math.sin(a)*sp,now,680+Math.random()*280,.64);
      }
    }
    function spawnBlast(sq:number,now:number,delay=0,heavy=false){
      const p=boardPoint(props.kind,sq),t0=now+delay,scale=heavy?1.45:1.1;p.y+=.18;
      blastLight.position.set(p.x,BOARD_SURFACE_Y+1.8,p.z);blastLight.intensity=heavy?9:6.5;flashUntil=Math.max(flashUntil,t0+520);
      spawnParticle(p.x,p.y+.02,p.z,0xff9f1c,.22*scale,1.45*scale,0,0,0,t0,460,.92,true);
      spawnParticle(p.x,p.y+.04,p.z,0xfff3b0,.16*scale,1.05*scale,0,0,0,t0+40,380,.85,true);
      spawnParticle(p.x,p.y+.15,p.z,0xfff9db,.2*scale,.82*scale,0,.4,0,t0,320,.98);
      spawnParticle(p.x,p.y+.12,p.z,0xff5400,.24*scale,1.05*scale,0,.32,0,t0,440,.92);
      const count=heavy?14:10;
      for(let i=0;i<count;i++){
        const a=Math.PI*2*i/count+Math.random()*.4,sp=(.45+Math.random()*.9)*scale;
        const dark=i%4===0?0xff9f1c:i%3===0?0x292524:i%3===1?0x57534e:0x8c7a6b;
        spawnParticle(p.x+(Math.random()-.5)*.18,p.y+.1,p.z+(Math.random()-.5)*.18,dark,.16*scale,.68*scale,Math.cos(a)*sp,.75+Math.random()*.85,Math.sin(a)*sp,t0+20,820+Math.random()*420,.76);
      }
    }
    function beginNext(now:number){
      const plan=queue.shift();if(!plan){active=null;signal(false);drawHighlights();return;}
      playMoveSound(props.kind,{
        from:plan.actors[0]?.from??undefined,
        to:plan.actors[0]?.to,
        piece:plan.actors[0]?.piece,
        action:plan.actors.some(a=>a.path==='bomb')?'bomb':plan.actors.some(a=>a.path==='fire')?'fire':'move',
        captures:plan.captures,
        effects:plan.actors.some(a=>a.path==='burn')?[{square:plan.actors[0]?.to??0,kind:'burnt'}]:undefined,
        check:props.checkSquare!==null
      });
      if(props.kind==='commander'&&plan.departure)snap(plan.departure);
      const victims=plan.captures.flatMap(index=>{const object=stationary.get(index);return object?[{object,origin:object.position.clone()}]:[];});
      const actors=plan.actors.map(actor=>{
        const object=props.kind==='commander'?objectFor(actor.path==='fire'?'#shot':actor.piece,actor.from??actor.to):actor.from===null?objectFor(actor.piece,actor.to):stationary.get(actor.from)||objectFor(actor.piece,actor.from);
        if(actor.from!==null&&props.kind!=='commander')stationary.delete(actor.from);
        return {object,actor,startY:object.position.y};
      });
      if(props.kind==='commander'){
        const blasted=new Set<number>();
        for(const a of plan.actors){
          if(a.from!==null&&(a.path==='fire'||a.path==='bomb'||plan.captures.length>0))spawnMuzzle(a.from,now);
          if(a.path==='fire'||a.path==='bomb'||a.path==='burn'){
            blasted.add(a.to);
            spawnBlast(a.to,now,Math.round(a.duration*(a.path==='burn'?.62:.78)),a.path==='bomb');
          }else if(a.from!==null&&plan.captures.length===0){
            const p=boardPoint(props.kind,a.from);p.y+=.12;
            for(let i=0;i<3;i++){
              spawnParticle(p.x+(Math.random()-.5)*.15,p.y,p.z+(Math.random()-.5)*.15,0x8c7a6b,.12,.42,(Math.random()-.5)*.28,.32+Math.random()*.2,(Math.random()-.5)*.28,now,520,.52);
            }
          }
        }
        for(const cap of plan.captures){
          if(!blasted.has(cap))spawnBlast(cap,now,Math.round(plan.duration*.58),false);
        }
      }
      active={plan,startedAt:now,actors,victims};signal(true);drawHighlights();
    }
    let viewportWidth=Math.max(1,host.clientWidth||600),viewportHeight=Math.max(1,host.clientHeight||540);
    function update(){
      if(props.kind==='commander'&&!commanderModels)return;
      const p=live.current,prev=accepted,next=snapshot(p.gameKey,p.board,p.plyCount,p.history),change=incomingBoard(p.kind,accepted,next,p.history);
      accepted=next;
      if(change.mode==='snap'){
        queue.length=0;active=null;snap(p.board);signal(false);
        if(prev&&prev.key===next.key&&next.count>prev.count&&p.last){
          const now=performance.now(),latest=p.history[p.history.length-1];
          playMoveSound(p.kind,{from:p.last.from??undefined,to:p.last.to,action:p.last.action,piece:latest?.piece,captures:latest?.captures,check:p.checkSquare!==null});
          if(p.kind==='commander'){
            if(p.last.from!==null)spawnMuzzle(p.last.from,now);
            spawnBlast(p.last.to,now,60,Boolean(p.last.action?.includes('bomb')));
          }
        }
      }else if(change.mode==='animate'){
        queue.push(...change.steps);signal(true);if(!active)beginNext(performance.now());
      }
      drawHighlights();
      renderer.render(scene,camera);
    }
    function view(){
      if(props.kind==='commander')orientCommander(pieces);
      controls.target.set(0,BOARD_SURFACE_Y,0);
      setBoardCamera(camera,props.kind,viewportWidth,viewportHeight,live.current.flipped,live.current.topView,live.current.zoom,cameraPadding());
      controls.update();
      renderer.render(scene,camera);
    }
    function zoom(){camera.zoom=live.current.zoom;camera.updateProjectionMatrix();renderer.render(scene,camera);}
    const resize=()=>{
      const bounds=host.getBoundingClientRect();if(bounds.width<=0||bounds.height<=0)return;
      viewportWidth=bounds.width;viewportHeight=bounds.height;
      // CSS owns the canvas size; changing the drawing buffer must not stretch it.
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(viewportWidth,viewportHeight,false);
      fitBoardCamera(camera,props.kind,viewportWidth,viewportHeight,live.current.zoom,cameraPadding());
      controls.update();
      renderer.render(scene,camera);
    };
    const hitPlane=new T.Mesh(new T.PlaneGeometry(cols,rows),new T.MeshBasicMaterial({visible:false}));
    hitPlane.rotation.x=-Math.PI/2;hitPlane.position.y=BOARD_SURFACE_Y;scene.add(hitPlane);
    const raycaster=new T.Raycaster(),pointer=new T.Vector2(),gesture=new BoardGesture();
    const down=(event:PointerEvent)=>{gesture.down(event);};
    const move=(event:PointerEvent)=>{gesture.move(event);};
    const cancel=(event:PointerEvent)=>{gesture.cancel(event);};
    const pick=(event:PointerEvent)=>{
      if(!gesture.up(event)||animating||!live.current.enabled||props.kind==='commander'&&!commanderModels)return;
      const bounds=renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
      const pieceHit=raycaster.intersectObjects(pieces.children,true)[0];
      if(pieceHit){let object:T.Object3D|null=pieceHit.object;while(object&&typeof object.userData.square!=='number')object=object.parent;if(object){setFocused(object.userData.square);live.current.onSquare(object.userData.square);return;}}
      const hit=raycaster.intersectObject(hitPlane)[0];if(!hit)return;
      const col=Math.round(hit.point.x+(cols-1)/2),row=Math.round(hit.point.z+(rows-1)/2);
      if(col>=0&&col<cols&&row>=0&&row<rows){setFocused(row*cols+col);live.current.onSquare(row*cols+col);}
    };
    const contextLost=(event:Event)=>{event.preventDefault();live.current.onFallback();};
    renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move,true);
    renderer.domElement.addEventListener('pointerup',pick,true);renderer.domElement.addEventListener('pointercancel',cancel,true);
    renderer.domElement.addEventListener('lostpointercapture',cancel,true);renderer.domElement.addEventListener('webglcontextlost',contextLost);
    const observer=new ResizeObserver(resize);observer.observe(host);let visible=true;
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(host);
    let frame=0,stopped=false,lastFrame=0;
    function render(time:number){
      if(stopped)return;frame=requestAnimationFrame(render);
      if(!visible||document.hidden||time-lastFrame<30)return;
      const delta=Math.min(80,time-lastFrame),p=live.current;
      landscape?.update(time*.001,false);
      const victims=new Set(active?.victims.map(victim=>victim.object)||[]);
      for(const [index,object]of stationary){
        if(victims.has(object))continue;
        const raised=!active&&p.selected===index&&p.board[index]!==null;
        const desiredY=BOARD_SURFACE_Y+(raised ? .26 : 0);
        object.position.y+=(desiredY-object.position.y)*(1-Math.exp(-delta/65));
        object.scale.setScalar(1+(object.position.y-BOARD_SURFACE_Y)*.17);
      }
      if(active){
        const elapsed=time-active.startedAt;
        const emitTrail=props.kind==='commander'&&time-lastTrailAt>30;
        if(emitTrail)lastTrailAt=time;
        for(const moving of active.actors){
          const value=sampleActor(moving.actor,cols,rows,elapsed,moving.startY);
          moving.object.position.set(value.x,value.y,value.z);
          if(moving.actor.path==='flip'){
            const t=Math.max(0,Math.min(1,(value.progress-.24)/.52)),rotation=t*t*(3-2*t);
            moving.object.rotation.z=Math.PI*rotation;moving.object.position.y+=.18*rotation;
          }
          moving.object.scale.setScalar(1+Math.max(0,value.y-BOARD_SURFACE_Y)/moving.actor.height*.075);
          if(moving.actor.path==='burn')moving.object.scale.multiplyScalar(Math.max(.001,1-Math.max(0,(value.progress-.65)/.35)));
          if(emitTrail&&value.progress>.04&&value.progress<.92){
            const isFire=moving.actor.path==='fire'||moving.actor.path==='bomb'||moving.actor.path==='burn';
            spawnParticle(value.x,value.y+(isFire?0:.05),value.z,moving.actor.path==='fire'?0xff9f1c:isFire?0x57534e:0x8c7a6b,isFire?.11:.08,isFire?.38:.28,(Math.random()-.5)*.1,.2,(Math.random()-.5)*.1,time,isFire?420:320,isFire?.7:.45);
          }
        }
        const removal=Math.max(0,Math.min(1,(elapsed/active.plan.duration-.59)/.26));
        for(const victim of active.victims){victim.object.position.copy(victim.origin);victim.object.position.y+=Math.sin(removal*Math.PI/2)*.4;victim.object.scale.setScalar(Math.max(.001,1-removal));}
        if(elapsed>=active.plan.duration){const finalBoard=active.plan.after;snap(finalBoard);active=null;beginNext(time);}
      }
      if(props.kind==='commander'){
        if(blastLight.intensity>0){
          if(time>=flashUntil)blastLight.intensity=0;
          else blastLight.intensity*=.88;
        }
        for(let i=battleParticles.length-1;i>=0;i--){
          const pt=battleParticles[i],age=time-pt.born;
          if(age<0){pt.mesh.visible=false;continue;}
          if(age>=pt.life){
            battleFx.remove(pt.mesh);(pt.mesh.material as T.MeshBasicMaterial).dispose();battleParticles.splice(i,1);continue;
          }
          pt.mesh.visible=true;
          const k=age/pt.life,dt=.016;
          if(!pt.ring){pt.mesh.position.x+=pt.vx*dt;pt.mesh.position.y+=pt.vy*dt;pt.mesh.position.z+=pt.vz*dt;pt.vy*=.98;}
          pt.mesh.scale.setScalar(pt.s0+(pt.s1-pt.s0)*(1-Math.pow(1-k,2)));
          (pt.mesh.material as T.MeshBasicMaterial).opacity=pt.op*(1-k*k);
        }
        for(let i=0;i<ambientSmokes.length;i++){
          const puff=ambientSmokes[i];
          puff.position.x+=Math.sin(time*.00045+i)*0.0025;
          puff.position.z+=Math.cos(time*.00038+i*1.7)*0.002;
          const mat=puff.material as T.MeshBasicMaterial;
          mat.opacity=.12+.07*Math.sin(time*.0012+i*1.3);
        }
      }
      renderer.render(scene,camera);lastFrame=time;
    }
    controller.current={update,view,zoom,environment:()=>{if(landscape){landscape.exterior.visible=!!live.current.scenery;fitBoardCamera(camera,props.kind,viewportWidth,viewportHeight,live.current.zoom,cameraPadding());renderer.render(scene,camera);}},appearance:(theme)=>{landscape?.setTheme(theme);const previous=topMaterial.map;topMaterial.map=tableTexture(props.kind,width,depth,theme);topMaterial.needsUpdate=true;previous?.dispose();if(props.kind==='caro'||props.kind==='tictactoe'){const palette=BOARD_PALETTES[theme];for(const [code,template]of templates)template.traverse(node=>{if(node instanceof T.Mesh)(node.material as T.MeshStandardMaterial).color.set(code==='X'?palette.markX:palette.markO);});}drawHighlights();renderer.render(scene,camera);}};resize();view();update();frame=requestAnimationFrame(render);
    if(props.kind==='commander'){
      setModelsReady(false);
      loadCommanderModels().then(models=>{
        if(stopped){models.forEach(disposeObject);return;}
        commanderModels=models;models.forEach(model=>assets.add(model));setModelsReady(true);update();
      }).catch(()=>{if(!stopped){setFailed(true);live.current.onFallback();}});
    }
    return()=>{
      stopped=true;controller.current=null;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();
      renderer.domElement.removeEventListener('pointerdown',down,true);renderer.domElement.removeEventListener('pointermove',move,true);
      renderer.domElement.removeEventListener('pointerup',pick,true);renderer.domElement.removeEventListener('pointercancel',cancel,true);
      renderer.domElement.removeEventListener('lostpointercapture',cancel,true);renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      controls.removeEventListener('change',zoomChanged);controls.dispose();
      signal(false);disposeObject(scene);renderer.dispose();renderer.domElement.remove();
    };
  },[props.kind]);
  useEffect(()=>{controller.current?.update();},[props.gameKey,props.board,props.history,props.plyCount,props.selected,props.pendingSquare,props.targets,props.last,props.checkSquare,props.winning,props.airDefense,focused]);
  useEffect(()=>{controller.current?.view();},[props.flipped,props.topView,props.resetViewKey]);
  useEffect(()=>{controller.current?.appearance(boardTheme);},[boardTheme]);
  useEffect(()=>{controller.current?.zoom();},[props.zoom]);
  useEffect(()=>{controller.current?.environment();},[props.scenery]);
  return <div className="scene-board" ref={mount} tabIndex={0} onFocus={()=>controller.current?.update()} onBlur={()=>controller.current?.update()} role="group" aria-label={`Bàn ${META[props.kind].name} 3D. Dùng phím mũi tên và Enter để chọn ô. Ô đang chọn ${squareName(props.kind,focused)}: ${pieceName(props.kind,props.board[focused])}.`} onKeyDown={e=>{
    const {cols,rows}=META[props.kind];let next=focused,sign=props.flipped?-1:1;
    if(e.key==='ArrowLeft')next=Math.max(0,Math.min(cols*rows-1,focused-sign));
    else if(e.key==='ArrowRight')next=Math.max(0,Math.min(cols*rows-1,focused+sign));
    else if(e.key==='ArrowUp')next=Math.max(0,Math.min(cols*rows-1,focused-cols*sign));
    else if(e.key==='ArrowDown')next=Math.max(0,Math.min(cols*rows-1,focused+cols*sign));
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(props.enabled&&modelsReady)props.onSquare(focused);return;}
    else return;e.preventDefault();setFocused(next);
  }}>{failed?<span className="scene-fallback-notice">Đang chuyển sang bàn 2D…</span>:!modelsReady&&<span className="ctl-model-loading" role="status">Đang tải mô hình 3D…</span>}</div>;
}
