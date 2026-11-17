import * as T from 'three';
import { X_LABELS } from '../practice-types.ts';
import {BOARD_PALETTES,type BoardTheme} from '../board-palette.ts';

const profiles: Record<string, [number, number][]> = {
  base: [[0,0],[.29,0],[.35,.045],[.35,.11],[.31,.17],[.29,.2],[.26,.24],[0,.24]],
  pawn: [[0,.2],[.24,.2],[.24,.28],[.18,.35],[.12,.54],[.13,.65],[.2,.7],[.2,.76],[0,.76]],
  tall: [[0,.2],[.27,.2],[.25,.31],[.17,.43],[.125,.73],[.15,.94],[.23,1.02],[.24,1.1],[0,1.1]],
  rook: [[0,.2],[.27,.2],[.23,.34],[.22,.85],[.29,.93],[.3,1.03],[0,1.03]],
};
function add(group:T.Group,geometry:T.BufferGeometry<T.NormalBufferAttributes>,material:T.Material,x=0,y=0,z=0){const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
function lathe(group:T.Group,profile:[number,number][],material:T.Material){return add(group,new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),40),material);}
function band(group:T.Group,radius:number,y:number,material:T.Material,thickness=.018){const mesh=add(group,new T.TorusGeometry(radius,thickness,8,40),material,0,y,0);mesh.rotation.x=Math.PI/2;}

export function chessPiece(code:string):T.Group {
  const white=code[0]==='w',kind=code[1],group=new T.Group();
  const body=new T.MeshStandardMaterial({color:white?0xe5dfce:0x263a31,roughness:.3,metalness:white?.08:.24});
  const accent=new T.MeshStandardMaterial({color:white?0xb29050:0xc09b55,roughness:.27,metalness:.65});
  const dark=new T.MeshStandardMaterial({color:0x1c2b24,roughness:.5});
  lathe(group,profiles.base,body);band(group,.325,.11,accent,.012);band(group,.275,.225,accent,.013);
  if(kind==='P') {lathe(group,profiles.pawn,body);add(group,new T.SphereGeometry(.205,28,20),body,0,.9,0);band(group,.19,.72,accent,.012);}
  else if(kind==='N') {
    const neck=new T.Shape();neck.moveTo(-.24,0);neck.lineTo(.25,0);neck.quadraticCurveTo(.11,.24,.04,.43);neck.quadraticCurveTo(.15,.7,.28,.62);neck.lineTo(.43,.83);neck.lineTo(.31,.98);neck.lineTo(.13,1.07);neck.lineTo(.06,1.25);neck.lineTo(-.07,1.17);neck.lineTo(-.2,1.24);neck.lineTo(-.22,1.02);neck.quadraticCurveTo(-.48,.7,-.35,.3);neck.closePath();
    const geometry=new T.ExtrudeGeometry(neck,{depth:.24,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:20});geometry.translate(0,.3,-.12);add(group,geometry,body);
    for(const z of [-.15,.15])add(group,new T.SphereGeometry(.025,12,10),accent,.17,1.27,z);
    for(let n=0;n<5;n++){const m=add(group,new T.BoxGeometry(.08,.07,.29),accent,-.28+n*.015,.78+n*.1,0);m.rotation.z=-.25;}
    band(group,.22,.36,accent,.015);if(!white)group.rotation.y=Math.PI;
  } else if(kind==='R') {
    lathe(group,profiles.rook,body);add(group,new T.CylinderGeometry(.3,.29,.15,32),body,0,1.06,0);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=add(group,new T.BoxGeometry(.16,.18,.12),body,Math.cos(a)*.24,1.2,Math.sin(a)*.24);m.rotation.y=-a;}
    band(group,.29,.96,accent,.018);
  } else {
    lathe(group,profiles.tall,body);band(group,.22,1.04,accent,.016);
    if(kind==='B') {
      const head=add(group,new T.SphereGeometry(.22,32,24),body,0,1.29,0);head.scale.y=1.4;
      const slit=add(group,new T.BoxGeometry(.035,.28,.45),dark,.05,1.4,0);slit.rotation.z=-.42;
      add(group,new T.SphereGeometry(.065,16,12),accent,0,1.62,0);
    } else if(kind==='Q') {
      add(group,new T.CylinderGeometry(.27,.15,.25,32),body,0,1.23,0);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;add(group,new T.SphereGeometry(.055,14,12),accent,Math.cos(a)*.245,1.43,Math.sin(a)*.245);}
      add(group,new T.SphereGeometry(.115,24,16),body,0,1.45,0);add(group,new T.SphereGeometry(.06,16,12),accent,0,1.6,0);
    } else {
      add(group,new T.CylinderGeometry(.2,.17,.18,32),body,0,1.21,0);add(group,new T.SphereGeometry(.16,24,20),body,0,1.36,0);
      add(group,new T.BoxGeometry(.09,.38,.09),accent,0,1.66,0);add(group,new T.BoxGeometry(.32,.09,.09),accent,0,1.7,0);
    }
  }
  group.scale.setScalar(1.14);
  return group;
}
export function xiangqiPiece(code:string):T.Group {
  const group=new T.Group(),red=code[0]==='r';
  const body=new T.MeshStandardMaterial({color:red?0xfff5df:0x172b34,roughness:.85,metalness:0});
  const rim=new T.MeshStandardMaterial({color:red?0x931d29:0xafc5ce,roughness:.8,metalness:0});
  add(group,new T.CylinderGeometry(.455,.46,.29,48),body,0,.145,0);band(group,.45,.25,rim,.018);band(group,.45,.045,rim,.014);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=red?'#fff5df':'#172b34';ctx.fillRect(0,0,512,512);
  ctx.strokeStyle=red?'#931d29':'#afc5ce';ctx.lineWidth=14;ctx.beginPath();ctx.arc(256,256,226,0,Math.PI*2);ctx.stroke();ctx.lineWidth=5;ctx.beginPath();ctx.arc(256,256,207,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=red?'#931d29':'#fff5df';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 336px "SimSun", "Noto Serif SC", "Microsoft YaHei", serif';ctx.fillText(X_LABELS[code],256,269);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const top=new T.MeshBasicMaterial({map:texture,toneMapped:false});const face=add(group,new T.CircleGeometry(.445,48),top,0,.295,0);face.rotation.x=-Math.PI/2;face.castShadow=false;face.receiveShadow=false;
  return group;
}
export function caroPiece(code:string,theme:BoardTheme='dark'):T.Group {
  const palette=BOARD_PALETTES[theme];
  const group=new T.Group();const material=new T.MeshStandardMaterial({color:code==='X'?palette.markX:palette.markO,roughness:.28,metalness:.15});
  if(code==='X')for(const angle of[-Math.PI/4,Math.PI/4]){const m=add(group,new T.BoxGeometry(.78,.14,.155),material,0,.08,0);m.rotation.y=angle;}
  else {const m=add(group,new T.TorusGeometry(.3,.088,16,40),material,0,.095,0);m.rotation.x=-Math.PI/2;}
  return group;
}
export function discPiece(code:string):T.Group {
  const crowned=code[1]==='K';code=code[0];
  const group=new T.Group(),color=code==='B'?0x18241f:code==='W'?0xf3ead6:code==='R'?0xd76853:0xf1ca64;
  const material=new T.MeshStandardMaterial({color,roughness:.3,metalness:.12});
  if(code==='B'||code==='W'){
    const bottom=new T.MeshStandardMaterial({color:code==='B'?0xf3ead6:0x18241f,roughness:.3,metalness:.12});
    const disc=new T.Mesh(new T.CylinderGeometry(.43,.44,.21,48),[material,material,bottom]);
    disc.position.y=.105;disc.castShadow=true;disc.receiveShadow=true;group.add(disc);
  }else add(group,new T.CylinderGeometry(.43,.44,.21,48),material,0,.105,0);
  band(group,.36,.215,new T.MeshStandardMaterial({color:code==='B'?0x728d7a:0xffffff,roughness:.4,metalness:.2}),.009);
  if(crowned){const gold=new T.MeshStandardMaterial({color:0xe8c875,metalness:.55,roughness:.25});band(group,.25,.24,gold,.028);band(group,.14,.24,gold,.028);}
  return group;
}
export function disposeObject(object:T.Object3D){
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
  object.traverse(child=>{if(child instanceof T.Mesh||child instanceof T.Line){geometries.add(child.geometry);for(const material of Array.isArray(child.material)?child.material:[child.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);}}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
