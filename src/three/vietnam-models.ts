import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Original miniature geometry. Visual references, not engineering reproductions.
import {VIETNAM_UNITS} from '../vietnam-profile.ts';
export {VIETNAM_UNITS};
const palette={olive:0x526040,light:0x7d8755,dark:0x354432,camo:0x87926c,black:0x252b28,steel:0x454d48,skin:0xc5966e,wood:0x76503c,red:0xc52533,gold:0xf4cf57,gray:0x78878b,deck:0x536969,blue:0x6a8c9a,glass:0x233e4a,sand:0x8c8560};
type Paint=keyof typeof palette;
class Kit{
  root=new T.Group();materials=new Map<Paint,T.MeshStandardMaterial>();
  mat(key:Paint){if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color:palette[key],roughness:key==='glass'?.3:.8,metalness:['steel','gray'].includes(key)?.18:0}));return this.materials.get(key)!;}
  add(geometry:T.BufferGeometry,paint:Paint,x=0,y=0,z=0,parent:T.Object3D=this.root){const m=new T.Mesh(geometry,this.mat(paint));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  box(w:number,h:number,d:number,paint:Paint,x=0,y=0,z=0,parent?:T.Object3D){return this.add(new T.BoxGeometry(w,h,d),paint,x,y,z,parent);}
  ellipsoid(xr:number,yr:number,zr:number,paint:Paint,x=0,y=0,z=0,parent?:T.Object3D){const m=this.add(new T.SphereGeometry(1,12,8),paint,x,y,z,parent);m.scale.set(xr,yr,zr);return m;}
  rod(a:T.Vector3,b:T.Vector3,radius:number,paint:Paint,parent:T.Object3D=this.root,top=radius){const delta=b.clone().sub(a),m=this.add(new T.CylinderGeometry(top,radius,delta.length(),8),paint,0,0,0,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
  wheel(x:number,y:number,z:number,r=.17){const m=this.add(new T.CylinderGeometry(r,r,.11,12),'black',x,y,z);m.rotation.z=Math.PI/2;const hub=this.add(new T.CylinderGeometry(r*.65,r*.65,.12,12),'olive',x,y,z);hub.rotation.z=Math.PI/2;}
  polygon(points:[number,number][],thickness:number,paint:Paint,y:number,parent:T.Object3D=this.root){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});geo.rotateX(Math.PI/2);return this.add(geo,paint,0,y+thickness,0,parent);}
  star(radius:number,parent:T.Object3D,x:number,y:number,z:number){const shape=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?radius*.4:radius;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?shape.lineTo(px,py):shape.moveTo(px,py);}shape.closePath();return this.add(new T.ShapeGeometry(shape),'gold',x,y,z,parent);}
  roundel(x:number,y:number,z:number,size=.11,parent:T.Object3D=this.root){const g=new T.Group();g.position.set(x,y,z);g.rotation.x=-Math.PI/2;parent.add(g);this.add(new T.CircleGeometry(size,20),'red',0,0,0,g);this.star(size*.76,g,0,0,.001);}
  flag(x:number,y:number,z:number,scale=.3){this.rod(new T.Vector3(x,0,z),new T.Vector3(x,y,z),.012,'steel');const g=new T.Group();g.position.set(x+scale*.6,y-scale*.3,z);this.root.add(g);this.box(scale*1.2,scale*.8,.009,'red',0,0,0,g);this.star(scale*.23,g,0,0,.006);}
  merge(){this.root.updateMatrixWorld(true);const result=new T.Group(),buckets=new Map<T.Material,T.BufferGeometry[]>();this.root.traverse(o=>{if(o instanceof T.Mesh){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);const list=buckets.get(o.material as T.Material)||[];list.push(g.index?g.toNonIndexed():g);buckets.set(o.material as T.Material,list);}});for(const [material,geometries]of buckets){const geo=mergeGeometries(geometries,false)!;geometries.forEach(g=>g.dispose());const m=new T.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;result.add(m);}this.root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});return result;}
}
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);

function person(k:Kit,commander:boolean,militia:boolean){
  for(const sign of[-1,1]){k.box(.15,.12,.3,'black',sign*.12,.06,.05);k.box(.14,.42,.17,'olive',sign*.12,.32,0);}
  k.box(.44,.44,.23,'olive',0,.76,0);k.box(.45,.06,.245,'wood',0,.59,0);k.box(.08,.055,.015,'gold',0,.59,.13);
  for(const sign of[-1,1]){const arm=k.box(.13,.4,.16,'olive',sign*.29,.76,.045);arm.rotation.z=sign*.13;k.ellipsoid(.067,.085,.06,'skin',sign*.31,.55,.05);k.box(.12,.015,.07,commander?'gold':'dark',sign*.17,.993,0);}
  k.ellipsoid(.16,.21,.14,'skin',0,1.15,.01);k.box(.19,.035,.02,'dark',0,1.2,.14);
  if(commander){k.add(new T.CylinderGeometry(.2,.18,.12,12),'olive',0,1.36,0);k.add(new T.CylinderGeometry(.182,.18,.045,12),'red',0,1.307,0);k.box(.25,.025,.13,'black',0,1.29,.13);k.star(.037,k.root,0,1.34,.185);for(const s of[-1,1])k.box(.06,.06,.025,'red',s*.09,.94,.132);k.rod(v(-.11,.8,.18),v(.11,.8,.18),.04,'black');}
  else if(militia){k.ellipsoid(.195,.09,.18,'olive',0,1.34,0);k.box(.24,.02,.14,'olive',0,1.3,.13);k.ellipsoid(.08,.2,.09,'black',0,1.09,-.14);k.box(.32,.07,.24,'dark',0,.96,0);k.star(.025,k.root,0,1.33,.175);}
  else{k.ellipsoid(.215,.13,.21,'olive',0,1.33,0);k.add(new T.CylinderGeometry(.25,.25,.025,16),'light',0,1.275,0);k.star(.03,k.root,0,1.34,.193);k.box(.28,.3,.16,'dark',0,.8,-.18);}
  if(!commander){const rifle=new T.Group();rifle.position.set(.06,.74,.21);rifle.rotation.z=-.6;k.root.add(rifle);k.box(.07,.25,.07,'wood',0,-.14,0,rifle);k.box(.07,.28,.08,'steel',0,.1,0,rifle);k.rod(v(0,.24,0),v(0,.53,0),.018,'steel',rifle);const magazine=k.box(.055,.16,.09,'black',.08,.03,0,rifle);magazine.rotation.z=.25;}
}
function tank(k:Kit){
  for(const s of[-1,1]){k.box(.25,.33,1.25,'black',s*.44,.23,0);for(let i=0;i<5;i++)k.wheel(s*.49,.22,-.5+i*.25,.19);k.box(.27,.045,1.36,'olive',s*.44,.43,0);}
  k.box(.78,.29,1.34,'olive',0,.48,0);const glacis=k.box(.74,.09,.38,'light',0,.6,.55);glacis.rotation.x=-.22;
  k.ellipsoid(.37,.235,.37,'olive',0,.77,-.02);k.add(new T.CylinderGeometry(.13,.13,.06,12),'dark',-.13,.99,-.07);
  k.rod(v(0,.81,.23),v(0,.84,1.25),.035,'olive');k.rod(v(0,.84,1.18),v(0,.84,1.31),.043,'steel');
  for(const s of[-1,1]){const drum=k.add(new T.CylinderGeometry(.11,.11,.29,12),'olive',s*.24,.65,-.72);drum.rotation.z=Math.PI/2;k.ellipsoid(.065,.065,.035,'glass',s*.29,.64,.69);}
  k.roundel(.26,.71,-.13,.08);
}
function bridgeTruck(k:Kit){
  k.box(.64,.16,1.65,'dark',0,.24,0);for(const s of[-1,1])for(const z of[-.6,-.25,.59])k.wheel(s*.36,.21,z,.17);
  k.box(.66,.45,.48,'olive',0,.56,.59);k.box(.52,.15,.018,'glass',0,.64,.84);k.box(.7,.07,.1,'black',0,.28,.86);
  for(const x of[-.23,.23]){k.box(.12,.035,1.12,'light',x,.57,-.3);k.box(.12,.035,1.12,'olive',x,.88,-.3);for(let n=0;n<6;n++)k.rod(v(x,.6,-.82+n*.2),v(x,.86,-.62+n*.2),.014,'steel');}
  for(let i=0;i<8;i++)k.box(.55,.025,.1,'light',0,.6,-.82+i*.14);k.roundel(0,.8,.6,.09);
}
function gun(k:Kit,aa:boolean){
  for(const s of[-1,1])k.wheel(s*.44,.2,-.1,.2);
  k.add(new T.CylinderGeometry(.2,.24,.2,12),'olive',0,.3,0);
  const directions=aa?[0,Math.PI]:[0,Math.PI*2/3,-Math.PI*2/3];
  for(const angle of directions){const g=new T.Group();g.rotation.y=angle;k.root.add(g);k.box(.11,.06,.66,'olive',0,.09,-.25,g);k.box(.2,.03,.15,'steel',0,.06,-.56,g);}
  const mount=new T.Group();mount.position.y=.48;mount.rotation.x=-.43;k.root.add(mount);
  for(const s of aa?[-1,1]:[0])k.rod(v(s*.08,0,-.13),v(s*.08,0,.95),aa?.021:.04,'steel',mount);
  k.box(aa?.3:.56,aa?.13:.39,.06,'olive',0,.51,.14);
  if(aa){for(const s of[-1,1]){k.box(.16,.06,.16,'olive',s*.26,.35,-.23);k.box(.14,.1,.2,'dark',s*.2,.49,.1);}}
  else{k.box(.11,.07,.12,'steel',0,.92,.9);k.roundel(-.19,.73,.16,.055);}
}
function missile(k:Kit){
  k.box(.64,.1,.72,'olive',0,.09,0);k.add(new T.CylinderGeometry(.22,.26,.24,12),'dark',0,.25,0);
  const launcher=new T.Group();launcher.position.set(0,.48,-.14);launcher.rotation.x=-.55;k.root.add(launcher);
  k.box(.13,.09,1.75,'olive',0,-.1,0,launcher);k.rod(v(0,0,-.82),v(0,0,.64),.087,'light',launcher,.065);
  const nose=k.add(new T.ConeGeometry(.066,.38,12),'sand',0,0,.83,launcher);nose.rotation.x=Math.PI/2;
  for(let i=0;i<4;i++){const fin=k.box(.33,.018,.27,'olive',0,0,-.58,launcher);fin.rotation.z=i*Math.PI/2;}
  k.box(.22,.09,.22,'steel',0,.27,-.2);k.roundel(.16,.15,.2,.07);
}
function aircraft(k:Kit){
  k.ellipsoid(.16,.135,1,'blue',0,.28,0);const nose=k.add(new T.ConeGeometry(.105,.5,12),'gray',0,.27,1.04);nose.rotation.x=Math.PI/2;
  for(const s of[-1,1]){
    k.rod(v(s*.2,.22,-.95),v(s*.2,.22,.26),.13,'gray');k.rod(v(s*.2,.22,-1.09),v(s*.2,.22,-.86),.1,'steel');
    k.polygon([[s*.08,.42],[s*.94,-.43],[s*.82,-.7],[s*.14,-.47]],.035,'blue',.3);
    k.polygon([[s*.13,-.65],[s*.51,-.97],[s*.42,-1.1],[s*.12,-1]],.025,'gray',.3);
    const tail=k.polygon([[-.13,-.3],[.13,-.3],[.13,.16],[-.13,.36]],.035,'blue',0);tail.rotation.x=Math.PI/2;tail.rotation.y=s*.12;tail.position.set(s*.23,.58,-.73);
    k.roundel(s*.59,.345,-.35,.09);
  }
  k.ellipsoid(.11,.12,.37,'glass',0,.42,.44);k.box(.015,.025,.05,'gray',0,.54,.41);k.roundel(0,.43,-.1,.07);
}
function frigate(k:Kit){
  const hull=[[-.27,-1.15],[.27,-1.15],[.3,.5],[.22,.89],[0,1.33],[-.22,.89],[-.3,.5]] as [number,number][];
  k.polygon(hull,.16,'gray',.06);k.polygon(hull.map(([x,z])=>[x*.96,z*.98]),.025,'deck',.23);
  k.box(.39,.28,.48,'gray',0,.39,.35);k.box(.34,.13,.28,'light',0,.59,.37);k.box(.32,.055,.015,'glass',0,.59,.52);
  k.ellipsoid(.1,.08,.14,'gray',0,.33,.93);k.rod(v(0,.34,1),v(0,.35,1.28),.018,'steel');
  k.box(.22,.26,.31,'gray',0,.42,-.17);k.rod(v(0,.57,-.14),v(0,1.01,-.14),.018,'steel');k.box(.31,.025,.07,'steel',0,.92,-.14);
  k.add(new T.SphereGeometry(.075,10,8),'light',0,1.01,-.14);k.box(.29,.04,.03,'light',0,.78,-.14);
  for(const s of[-1,1])for(const z of[-.27,-.05]){const box=k.box(.12,.12,.22,'gray',s*.18,.42,z);box.rotation.z=s*.6;}
  k.box(.31,.025,.5,'light',0,.273,-.76);k.box(.22,.009,.02,'gold',0,.291,-.76);k.box(.02,.009,.26,'gold',0,.291,-.76);
  k.flag(.12,.62,-1.04,.12);
}
function headquarters(k:Kit){
  k.box(1.25,.45,.9,'sand',0,.23,0);k.box(.86,.37,.48,'dark',0,.21,.29);k.box(.38,.28,.025,'black',0,.19,.54);
  const roof=k.ellipsoid(.76,.16,.59,'olive',0,.51,-.04);roof.rotation.z=.04;
  for(const s of[-1,1])for(let y=0;y<3;y++)for(let i=0;i<3;i++)k.ellipsoid(.17,.06,.1,'sand',s*.47,.1+y*.12,.34-i*.24);
  k.rod(v(-.54,.51,-.27),v(-.54,1.04,-.27),.009,'steel');k.rod(v(-.7,.9,-.27),v(-.38,.9,-.27),.009,'steel');k.flag(.47,.94,-.23,.25);
}

export function buildVietnamModel(type:string){
  if(!VIETNAM_UNITS[type])throw Error(`Unknown Vietnamese unit ${type}`);
  const k=new Kit();
  if(['K','I','D'].includes(type))person(k,type==='K',type==='D');
  else if(type==='T')tank(k);else if(type==='E')bridgeTruck(k);else if(type==='P')gun(k,false);else if(type==='A')gun(k,true);else if(type==='M')missile(k);else if(type==='F')aircraft(k);else if(type==='N')frigate(k);else headquarters(k);
  const result=k.merge();result.name=`vietnam-${type}`;result.userData={vietnam:true,unit:type,profile:VIETNAM_UNITS[type].name,features:VIETNAM_UNITS[type].features,referenceUrls:VIETNAM_UNITS[type].references};return result;
}
