import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {labelTexture,boardTexture,woodTexture} from './party-art.ts';
import {PARTY_COLORS,estateGridCell,estateBounds,worldPoint} from './party-layout.ts';
import {VN_CELLS} from '../estate-data.ts';
import {PROVINCE_LANDMARKS,type LandmarkKind} from '../vietnam-landmarks.ts';
export {diceFaceRotation as diceRotation} from './dice-motion.ts';

const INLAY_CENTER=.16,INLAY_THICKNESS=.13;
// The print sits above the entire wood slab, with a small depth-buffer clearance.
export const SURFACE=INLAY_CENTER+INLAY_THICKNESS/2+.012;
const gold=()=>new T.MeshStandardMaterial({color:'#d5b36f',metalness:.72,roughness:.28});
function mesh(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const cylinder=(parent:T.Object3D,material:T.Material,top:number,bottom:number,height:number,y:number)=>mesh(new T.CylinderGeometry(top,bottom,height,32),material,parent,0,y);
function landmarkMonument(kind:LandmarkKind,accent:string){
  const root=new T.Group();
  const baseMat=new T.MeshStandardMaterial({color:accent,roughness:.45,metalness:.15});
  const stoneMat=new T.MeshStandardMaterial({color:'#e8ddc0',roughness:.55});
  const waterMat=new T.MeshStandardMaterial({color:'#26809e',roughness:.2,metalness:.25});
  const roofMat=new T.MeshStandardMaterial({color:'#a33b2e',roughness:.5});
  const leafMat=new T.MeshStandardMaterial({color:'#3b854e',roughness:.6});
  const brass=gold();

  if(kind==='hanoi'){
    // Hồ Gươm & Tháp Rùa 3 tầng
    cylinder(root,waterMat,.22,.23,.02,.01);
    cylinder(root,leafMat,.15,.16,.025,.028);
    mesh(new T.BoxGeometry(.14,.07,.11),stoneMat,root,0,.075,0);
    mesh(new T.BoxGeometry(.17,.018,.14),roofMat,root,0,.115,0);
    mesh(new T.BoxGeometry(.10,.055,.08),stoneMat,root,0,.15,0);
    mesh(new T.BoxGeometry(.13,.016,.11),roofMat,root,0,.185,0);
    mesh(new T.ConeGeometry(.075,.075,4),roofMat,root,0,.23,0).rotation.y=Math.PI/4;
  }else if(kind==='hcm'){
    // Landmark 81 + Chợ Bến Thành
    mesh(new T.BoxGeometry(.09,.28,.09),waterMat,root,.05,.14,0);
    mesh(new T.ConeGeometry(.045,.08,4),brass,root,.05,.32,0).rotation.y=Math.PI/4;
    mesh(new T.BoxGeometry(.12,.08,.10),stoneMat,root,-.07,.04,0);
    mesh(new T.BoxGeometry(.05,.09,.05),roofMat,root,-.07,.11,0);
  }else if(kind==='halong'){
    // Vịnh Hạ Long: hai đảo đá + thuyền buồm
    cylinder(root,waterMat,.22,.23,.02,.01);
    mesh(new T.ConeGeometry(.07,.20,6),leafMat,root,-.07,.11,-.03);
    mesh(new T.ConeGeometry(.085,.25,6),baseMat,root,.04,.13,.02);
    mesh(new T.ConeGeometry(.045,.11,3),roofMat,root,.11,.08,-.05);
  }else if(kind==='hue'){
    // Chùa Thiên Mụ 4 tầng
    for(let t=0;t<4;t++){
      const r=.11-t*.02,y=.03+t*.058;
      cylinder(root,baseMat,r,r+.01,.045,y);
      cylinder(root,brass,r+.025,r+.025,.012,y+.026);
    }
    mesh(new T.ConeGeometry(.035,.07,8),brass,root,0,.29,0);
  }else if(kind==='danang'){
    // Cầu Rồng vàng
    cylinder(root,waterMat,.22,.22,.02,.01);
    const arch=mesh(new T.TorusGeometry(.11,.024,8,18,Math.PI),brass,root,0,.04,0);
    arch.rotation.y=Math.PI/6;
  }else if(kind==='fansipan'||kind==='mountain'){
    mesh(new T.ConeGeometry(.12,.22,5),baseMat,root,-.04,.11,0);
    mesh(new T.ConeGeometry(.09,.16,5),leafMat,root,.08,.08,.03);
    mesh(new T.ConeGeometry(.045,.07,5),stoneMat,root,-.04,.20,0);
  }else if(kind==='ninhbinh'||kind==='cave'){
    cylinder(root,waterMat,.21,.21,.02,.01);
    mesh(new T.TorusGeometry(.11,.04,8,14,Math.PI),baseMat,root,0,.03,0);
  }else if(kind==='camau'){
    cylinder(root,waterMat,.21,.21,.02,.01);
    const prow=mesh(new T.ConeGeometry(.08,.22,4),roofMat,root,0,.12,0);
    prow.rotation.z=-Math.PI/3;
  }else if(kind==='cantho'||kind==='haiphong'||kind==='island'){
    cylinder(root,waterMat,.21,.21,.02,.01);
    mesh(new T.BoxGeometry(.16,.05,.08),baseMat,root,0,.045,0);
    mesh(new T.ConeGeometry(.06,.16,3),brass,root,0,.15,0);
  }else if(kind==='tea'||kind==='dalat'||kind==='rice'){
    mesh(new T.SphereGeometry(.11,14,10,0,Math.PI*2,0,Math.PI/2),leafMat,root,-.05,.01,0);
    mesh(new T.SphereGeometry(.09,14,10,0,Math.PI*2,0,Math.PI/2),baseMat,root,.06,.01,.02);
    if(kind==='dalat')mesh(new T.ConeGeometry(.06,.19,7),leafMat,root,0,.14,0);
  }else if(kind==='coffee'){
    cylinder(root,stoneMat,.14,.14,.016,.008);
    cylinder(root,baseMat,.085,.065,.12,.075);
  }else if(kind==='lotus'){
    cylinder(root,leafMat,.17,.17,.016,.008);
    for(let k=0;k<5;k++){
      const a=k*Math.PI*2/5;
      const petal=mesh(new T.ConeGeometry(.042,.11,6),new T.MeshStandardMaterial({color:'#d95b7d',roughness:.45}),root,Math.cos(a)*.045,.065,Math.sin(a)*.045);
      petal.rotation.z=-Math.cos(a)*.45;petal.rotation.x=Math.sin(a)*.45;
    }
  }else if(kind==='fruit'){
    mesh(new T.SphereGeometry(.06,12,10),brass,root,-.04,.07,0);
    mesh(new T.SphereGeometry(.055,12,10),brass,root,.05,.065,.03);
    mesh(new T.SphereGeometry(.055,12,10),leafMat,root,0,.12,-.02);
  }else{
    mesh(new T.BoxGeometry(.15,.09,.12),stoneMat,root,0,.045,0);
    mesh(new T.ConeGeometry(.12,.09,4),baseMat,root,0,.135,0).rotation.y=Math.PI/4;
  }
  root.traverse(n=>{n.castShadow=false;n.raycast=()=>{};});
  return root;
}

export function table(kind:string,textures={wood:woodTexture,board:boardTexture,label:labelTexture},edition='legacy'){
  const root=new T.Group(),wood=new T.MeshStandardMaterial({map:textures.wood(),color:'#c49b72',roughness:.4}),brass=gold();
  mesh(new T.BoxGeometry(10.94,.34,10.94),wood,root,0,-.12);
  mesh(new T.BoxGeometry(10.72,.07,10.72),brass,root,0,.085);
  const inlay=mesh(new T.BoxGeometry(10.6,INLAY_THICKNESS,10.6),wood,root,0,INLAY_CENTER);inlay.name='table-wood-inlay';
  // Printed ink keeps its authored contrast regardless of room illumination.
  const face=mesh(new T.PlaneGeometry(10,10),new T.MeshBasicMaterial({map:textures.board(kind,edition),toneMapped:false}),root,0,SURFACE);face.rotation.x=-Math.PI/2;face.name='table-playing-surface';face.castShadow=false;
  const shadows=mesh(new T.PlaneGeometry(10,10),new T.ShadowMaterial({opacity:.24,depthWrite:false}),root,0,SURFACE+.002);shadows.rotation.x=-Math.PI/2;shadows.castShadow=false;shadows.raycast=()=>{};
  for(const x of[-5.24,5.24])for(const z of[-5.24,5.24]){const pin=mesh(new T.CylinderGeometry(.055,.055,.012,20),brass,root,x,.232,z);pin.castShadow=false;}
  const plate=mesh(new T.PlaneGeometry(1.15,.23),new T.MeshStandardMaterial({map:textures.label('SÂN CỜ','#c7a45a','#3e3522'),roughness:.3,metalness:.4}),root,0,-.12,5.483);plate.castShadow=false;
  if(kind==='monopoly'&&edition==='vn-v2'){
    VN_CELLS.forEach(c=>{
      const lm=PROVINCE_LANDMARKS[c.name];
      if(!lm)return;
      const [r,col]=estateGridCell(c.index,13),b=estateBounds(c.index,13),pt=worldPoint([b.x+b.width/2,b.y+b.height*.67]);
      const mon=landmarkMonument(lm.kind,lm.accent);
      mon.scale.setScalar(1.08);
      mon.position.set(pt.x,SURFACE+.005,pt.z);
      const edgeIdx=r===12?0:col===0?1:r===0?2:3;
      mon.rotation.y=-edgeIdx*Math.PI/2;
      root.add(mon);
    });
  }
  return root;
}
export function horse(side:string,number:number){
  const root=new T.Group(),resin=new T.MeshPhysicalMaterial({color:PARTY_COLORS[side],roughness:.24,metalness:.08,clearcoat:1,clearcoatRoughness:.2}),trim=gold();
  cylinder(root,resin,.19,.225,.075,.04);cylinder(root,trim,.19,.2,.025,.091);cylinder(root,resin,.13,.18,.1,.15);
  const shape=new T.Shape();shape.moveTo(-.14,.20);shape.lineTo(-.09,.37);shape.lineTo(.055,.46);shape.lineTo(-.13,.445);shape.lineTo(-.22,.52);shape.lineTo(-.105,.70);shape.lineTo(-.07,.82);shape.lineTo(.025,.74);shape.lineTo(.15,.69);shape.quadraticCurveTo(.26,.51,.14,.3);shape.lineTo(.16,.2);shape.closePath();
  const neck=mesh(new T.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.022,bevelThickness:.02}),resin,root,0,0,-.07);
  neck.rotation.y=-Math.PI/2;
  for(const sign of[-1,1]){const eye=mesh(new T.SphereGeometry(.022,12,8),new T.MeshStandardMaterial({color:'#181b15',roughness:.25}),root,sign*.09,.65,-.05);eye.castShadow=false;}
  const badge=mesh(new T.PlaneGeometry(.15,.15),new T.MeshStandardMaterial({map:labelTexture(String(number),'#edd6a0','#323f2b',64),roughness:.5}),root,0,.15,.172);badge.castShadow=false;
  return root;
}
export function estateToken(side:string,index:number){
  const root=new T.Group();
  const sideColor=PARTY_COLORS[side]||['#c74b42','#398868','#d7a431','#457cb4'][index]||'#c74b42';
  const coat=new T.MeshPhysicalMaterial({color:sideColor,roughness:.2,metalness:.14,clearcoat:1,clearcoatRoughness:.15});
  const ivory=new T.MeshPhysicalMaterial({color:'#f7eed7',roughness:.26,clearcoat:.5});
  const dark=new T.MeshStandardMaterial({color:'#1b241e',roughness:.35,metalness:.2});
  const accent=gold();

  // Royal stepped pedestal in player color + brushed gold
  cylinder(root,coat,.22,.25,.055,.028);
  cylinder(root,accent,.205,.225,.024,.068);
  cylinder(root,ivory,.17,.195,.032,.096);

  // Sculpted Chibi Character Body & Head
  const torso=mesh(new T.CylinderGeometry(.11,.155,.22,24),coat,root,0,.22,0);
  torso.castShadow=true;
  // Golden belt & collar
  cylinder(root,accent,.136,.142,.026,.18);
  cylinder(root,accent,.115,.12,.022,.325);

  // Sculpted arms
  for(const s of[-1,1]){
    const arm=mesh(new T.CapsuleGeometry(.038,.11,6,12),coat,root,s*.145,.23,.015);
    arm.rotation.z=s*.28;
    arm.rotation.x=-.25;
    mesh(new T.SphereGeometry(.036,12,10),ivory,root,s*.17,.17,.045);
  }

  // Head + Expressive Eyes
  mesh(new T.SphereGeometry(.125,24,18),ivory,root,0,.44,0);
  for(const s of[-1,1]){
    const eye=mesh(new T.SphereGeometry(.018,12,10),dark,root,s*.045,.45,.112);
    eye.castShadow=false;
  }

  // Distinct Royal Headgear & Held Accessory per Character (cycles 4 styles across up to 8 players)
  const style=index%4;
  if(style===0){
    // Character 1: Tỷ Phú Hoàng Gia — Top Hat + Golden Diamond Scepter
    cylinder(root,dark,.16,.16,.024,.535);
    cylinder(root,coat,.105,.115,.15,.62);
    cylinder(root,accent,.112,.116,.028,.565);
    mesh(new T.CylinderGeometry(.014,.014,.32,10),accent,root,.18,.24,.07);
    mesh(new T.OctahedronGeometry(.045,0),accent,root,.18,.41,.07);
  }else if(style===1){
    // Character 2: Quân Vương Đại Gia — 5-Point Golden Royal Crown + Cape + Orb
    cylinder(root,accent,.115,.105,.055,.55);
    for(let k=0;k<6;k++){
      const a=k*Math.PI/3;
      const spike=mesh(new T.ConeGeometry(.028,.075,6),accent,root,Math.cos(a)*.095,.60,Math.sin(a)*.095);
      spike.castShadow=false;
    }
    mesh(new T.SphereGeometry(.045,14,12),accent,root,-.18,.21,.06);
  }else if(style===2){
    // Character 3: Kỵ Sĩ Rồng Vàng — Golden Crest Helmet + Shield
    mesh(new T.SphereGeometry(.132,20,14,0,Math.PI*2,0,Math.PI*.55),accent,root,0,.45,0);
    const plume=mesh(new T.BoxGeometry(.035,.11,.16),coat,root,0,.60,-.01);
    plume.rotation.x=-.15;
    mesh(new RoundedBoxGeometry(.11,.15,.025,2,.01),accent,root,-.18,.22,.05);
  }else{
    // Character 4: Đô Đốc Du Thuyền — Royal Captain's Peak Cap + Golden Bullion
    cylinder(root,ivory,.14,.125,.05,.545);
    cylinder(root,accent,.128,.128,.02,.52);
    const visor=mesh(new T.CylinderGeometry(.13,.13,.016,16,1,false,-Math.PI*.45,Math.PI*.9),dark,root,0,.515,.04);
    visor.rotation.x=.18;
    mesh(new RoundedBoxGeometry(.09,.045,.055,2,.01),accent,root,.18,.21,.06);
  }

  // Player Number Crest Badge on Pedestal Front
  if(typeof document!=='undefined'){
    try{
      const badge=mesh(
        new T.PlaneGeometry(.13,.13),
        new T.MeshBasicMaterial({map:labelTexture(String(index+1),'#fff6d6',sideColor,96),toneMapped:false}),
        root,0,.18,.155
      );
      badge.castShadow=false;
    }catch{/* Headless fallback */}
  }
  return root;
}
export function house(level=1,side='R'){
  const root=new T.Group(),lvl=Math.max(1,Math.min(5,level));
  const ownerHex=PARTY_COLORS[side]||'#a45e44';
  const wall=new T.MeshStandardMaterial({color:lvl===5?'#f6ecd0':'#e8dfc5',roughness:.52,metalness:.08});
  const roofMat=new T.MeshStandardMaterial({color:ownerHex,roughness:.38,metalness:.18});
  const trim=gold();
  const winMat=new T.MeshStandardMaterial({color:'#ffe9a2',emissive:'#d49b35',emissiveIntensity:.55,roughness:.3});
  const doorMat=new T.MeshStandardMaterial({color:'#3b281c',roughness:.7});

  const w=.28+lvl*.065,d=.24+lvl*.04,floorH=.15+lvl*.018,floors=lvl;
  const totalH=floors*floorH;

  // Stepped foundation plinth in buyer's color & gold
  mesh(new RoundedBoxGeometry(w+.09,.045,d+.09,2,.015),roofMat,root,0,.022,0);
  mesh(new RoundedBoxGeometry(w+.04,.025,d+.04,2,.01),trim,root,0,.052,0);

  // Main multi-story body with floor cornices and glowing windows
  for(let f=0;f<floors;f++){
    const fw=w*(1-f*(lvl>=4?.045:.02)),fd=d*(1-f*(lvl>=4?.04:.015));
    const cy=.065+f*floorH+floorH/2;
    mesh(new RoundedBoxGeometry(fw,floorH,fd,2,.018),wall,root,0,cy,0);
    mesh(new T.BoxGeometry(fw+.028,.02,fd+.028),f%2===0?trim:roofMat,root,0,.065+(f+1)*floorH,0);
    const cols=Math.min(4,lvl+1);
    for(let c=0;c<cols;c++){
      const wx=(c-(cols-1)/2)*(fw/(cols+.4));
      for(const sign of[-1,1]){
        const win=mesh(new T.BoxGeometry(.042,floorH*.46,.01),winMat,root,wx,cy,sign*(fd/2+.004));
        win.castShadow=false;
      }
    }
  }

  // Side wings for Level 2+ to make higher levels unmistakably broader and grander
  if(lvl>=2){
    const wingW=.11+lvl*.02,wingH=totalH*.68,wingD=d*.82;
    for(const sign of[-1,1]){
      const wx=sign*(w/2+wingW*.38);
      mesh(new RoundedBoxGeometry(wingW,wingH,wingD,2,.015),wall,root,wx,.065+wingH/2,0);
      mesh(new T.ConeGeometry(wingW*.78,.14,4),roofMat,root,wx,.065+wingH+.07,0).rotation.y=Math.PI/4;
    }
  }

  // Front entrance door
  mesh(new T.BoxGeometry(.075,.11,.014),doorMat,root,0,.12,d/2+.005);

  // Roof structure: pitched villa roof for levels 1-4, imperial golden crown + spire for level 5 Hotel
  const topY=.065+totalH;
  if(lvl<5){
    const roofW=w*(1-(floors-1)*(lvl>=4?.045:.02))+.06;
    const roofD=d*(1-(floors-1)*(lvl>=4?.04:.015))+.06;
    const roofH=.12+lvl*.028;
    const shape=new T.Shape();
    shape.moveTo(-roofW/2,0);shape.lineTo(0,roofH);shape.lineTo(roofW/2,0);shape.closePath();
    mesh(new T.ExtrudeGeometry(shape,{depth:roofD,bevelEnabled:false}),roofMat,root,0,topY,-roofD/2);
    mesh(new T.BoxGeometry(.03,roofH*.22,roofD+.02),trim,root,0,topY+roofH,0);
  }else{
    const crownW=w*.78,crownD=d*.78;
    mesh(new RoundedBoxGeometry(crownW,.13,crownD,2,.02),roofMat,root,0,topY+.065,0);
    mesh(new T.BoxGeometry(crownW+.05,.03,crownD+.05),trim,root,0,topY+.14,0);
    cylinder(root,trim,.03,.11,.18,topY+.23);
    mesh(new T.OctahedronGeometry(.075,0),trim,root,0,topY+.36,0);
  }

  // Rooftop level badge so the tier (1..4 or ★5 KS) is readable from every camera angle
  const badgeY=topY+(lvl===5?.48:.19+lvl*.025);
  let badgeMat:T.Material=roofMat;
  if(typeof document!=='undefined'){
    try{
      const badgeTex=labelTexture(lvl===5?'★5 KS':`CẤP ${lvl}`,ownerHex,'#fff8dc',128);
      badgeMat=new T.MeshBasicMaterial({map:badgeTex,toneMapped:false});
    }catch{/* Fallback to solid owner color in headless tests */}
  }
  const badge=mesh(new T.BoxGeometry(.26,.11,.025),badgeMat,root,0,badgeY,0);
  badge.castShadow=false;
  return root;
}
const BoxGeometry=T.BoxGeometry;
export function estateAssets(state:{property:(string|null)[];houses:number[];edition?:string;mortgaged?:boolean[]}){
  const root=new T.Group(),vietnam=state.edition==='vn-v2',size=vietnam?13:6,edgeCount=size-1;
  state.property.forEach((side,i)=>{
    if(!side)return;
    const [r,c]=estateGridCell(i,size),bounds=estateBounds(i,size),center=worldPoint([bounds.x+bounds.width/2,bounds.y+bounds.height/2]),tileW=bounds.width/60,tileH=bounds.height/60,tileSpan=Math.min(tileW,tileH);
    const isMortgaged=Boolean(state.mortgaged?.[i]),ownerColor=PARTY_COLORS[side]||'#c74b42';

    // 1. Full-cell buyer color overlay & raised 3D border frame
    const cellGroup=new T.Group();
    cellGroup.position.set(center.x,SURFACE+.005,center.z);
    const edgeIdx=r===edgeCount?0:c===0?1:r===0?2:3;
    cellGroup.rotation.y=vietnam?0:-edgeIdx*Math.PI/2;

    const tint=new T.Mesh(
      new T.PlaneGeometry(tileW*.95,tileH*.95),
      new T.MeshBasicMaterial({color:isMortgaged?'#6e4d47':ownerColor,transparent:true,opacity:isMortgaged?.26:.42,depthWrite:false,toneMapped:false})
    );
    tint.rotation.x=-Math.PI/2;
    tint.raycast=()=>{};
    cellGroup.add(tint);

    const frameMat=new T.MeshStandardMaterial({color:isMortgaged?'#8c584c':ownerColor,roughness:.32,metalness:.18,emissive:ownerColor,emissiveIntensity:isMortgaged?.04:.16});
    const bThick=tileSpan*.072,bHeight=.026;
    for(const s of[-1,1]){
      const barX=mesh(new T.BoxGeometry(tileW*.96,bHeight,bThick),frameMat,cellGroup,0,bHeight/2,s*tileH*.455);
      const barZ=mesh(new T.BoxGeometry(bThick,bHeight,tileH*.96),frameMat,cellGroup,s*tileW*.455,bHeight/2,0);
      barX.castShadow=false;barZ.castShadow=false;
      barX.raycast=()=>{};barZ.raycast=()=>{};
    }
    const crest=mesh(new T.BoxGeometry(tileW*.96,.038,tileSpan*.1),frameMat,cellGroup,0,.019,-tileH*.46);
    crest.castShadow=false;crest.raycast=()=>{};
    root.add(cellGroup);

    // 2. Tiered 3D Building (Level 1..5) scaled clearly by level
    const lvl=state.houses[i]||0;
    if(lvl>0){
      const b=house(lvl,side);
      const baseScale=vietnam?.65:1.25;
      b.scale.setScalar(baseScale);
      const buildPt=worldPoint(vietnam?[bounds.x+bounds.width/2,bounds.y+bounds.height*.67]:[bounds.x+bounds.width/2,bounds.y+bounds.height/2]);
      b.position.set(buildPt.x,SURFACE+.01,buildPt.z);
      b.rotation.y=-edgeIdx*Math.PI/2;
      b.traverse(node=>{node.raycast=()=>{};});
      root.add(b);
    }
  });
  return root;
}
export function dice(){
  const root=new T.Group();mesh(new RoundedBoxGeometry(.67,.67,.67,3,.095),new T.MeshPhysicalMaterial({color:'#f1ead2',roughness:.24,clearcoat:.65}),root);
  const dot=new T.MeshStandardMaterial({color:'#222b25',roughness:.7}),positions:Record<number,number[][]>={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[-1,1],[1,-1],[1,1]],5:[[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]};
  for(const [value,normal,axis]of[[1,[0,1,0],'y'],[6,[0,-1,0],'y'],[2,[0,0,1],'z'],[5,[0,0,-1],'z'],[3,[1,0,0],'x'],[4,[-1,0,0],'x']] as const){
    for(const [u,v]of positions[value]){const d=mesh(new T.CircleGeometry(.045,16),dot,root);d.position.set(normal[0]*.337,normal[1]*.337,normal[2]*.337);if(axis==='y'){d.rotation.x=normal[1]>0?-Math.PI/2:Math.PI/2;d.position.x=u*.155;d.position.z=v*.155;}else if(axis==='z'){d.rotation.y=normal[2]>0?0:Math.PI;d.position.x=u*.155;d.position.y=v*.155;}else{d.rotation.y=normal[0]>0?Math.PI/2:-Math.PI/2;d.position.z=u*.155;d.position.y=v*.155;}d.castShadow=false;}
  }
  return root;
}
export function throwHand(){
  const root=new T.Group(),skin=new T.MeshStandardMaterial({color:'#ba896f',roughness:.68}),nail=new T.MeshStandardMaterial({color:'#d5b29b',roughness:.48}),sleeve=new T.MeshStandardMaterial({color:'#243e36',roughness:.95});
  mesh(new RoundedBoxGeometry(.83,.25,.82,3,.11),skin,root,0,.53,.28);
  const wrist=mesh(new T.CapsuleGeometry(.23,.55,6,16),skin,root,0,.53,.99);wrist.rotation.x=Math.PI/2;wrist.scale.x=1.3;
  const cuff=mesh(new RoundedBoxGeometry(.69,.44,.75,3,.09),sleeve,root,0,.54,1.48);cuff.rotation.x=-.06;
  const joints:T.Group[][]=[];
  for(let i=0;i<4;i++){
    const lengths=[.27,.23,.18].map(v=>v*(i===3?.8:i===0?.9:1)),chain:T.Group[]=[];let parent:T.Object3D=root;
    for(let n=0;n<3;n++){const joint=new T.Group();joint.position.set(n?0:(i-1.5)*.21,n?0:.51,n?-lengths[n-1]:-.12);parent.add(joint);const bone=mesh(new T.CapsuleGeometry(n===2?.064:.077,Math.max(.01,lengths[n]-.11),5,12),skin,joint,0,0,-lengths[n]/2);bone.rotation.x=Math.PI/2;if(n===2){const tip=mesh(new T.SphereGeometry(.054,10,8),nail,joint,0,.057,-lengths[n]*.56);tip.scale.set(.83,.15,1.2);tip.castShadow=false;}chain.push(joint);parent=joint;}joints.push(chain);
  }
  const thumb=new T.Group();thumb.position.set(.43,.35,.31);root.add(thumb);const thumbBody=mesh(new T.CapsuleGeometry(.10,.30,5,12),skin,thumb,0,0,-.19);thumbBody.rotation.x=Math.PI/2;const thumbTip=mesh(new T.SphereGeometry(.09,12,10),skin,thumb,0,0,-.43);thumbTip.scale.set(1,1,1.25);
  return {root,setGrip(value:number){const g=T.MathUtils.clamp(value,0,1);for(const chain of joints){chain[0].rotation.x=-.08-g*.22;chain[1].rotation.x=-.12-g*.82;chain[2].rotation.x=-.08-g*.60;}thumb.rotation.y=.65-g*.9;thumb.rotation.x=-.35-g*.25;}};
}
export function tabletopProps(){
  const root=new T.Group(),paper=new T.MeshStandardMaterial({color:'#efe4c4',roughness:.82}),brass=gold();
  for(const [x,z,label,color]of[[-1.65,1.35,'CƠ HỘI','#9e3b2e'],[1.65,1.35,'KHÍ VẬN','#285943']] as const){
    const deck=new T.Group();
    mesh(new RoundedBoxGeometry(1.14,.04,1.58,2,.02),brass,deck,0,.02);
    mesh(new RoundedBoxGeometry(1.05,.13,1.5,2,.045),paper,deck,0,.075);
    const top=mesh(new T.PlaneGeometry(.99,1.43),new T.MeshStandardMaterial({map:labelTexture(label,color,'#f7e6b7'),roughness:.7}),deck,0,.147);
    top.rotation.x=-Math.PI/2;
    for(let i=0;i<4;i++)mesh(new T.BoxGeometry(1.015,.008,1.46),new T.MeshStandardMaterial({color:'#b5a37e',roughness:1}),deck,0,.03+i*.025);
    deck.rotation.y=x>0?-.13:.14;deck.position.set(x,SURFACE,z);root.add(deck);
  }
  for(let n=0;n<2;n++){
    const notes=new T.Group();
    mesh(new T.BoxGeometry(1.3,.10,.6),paper,notes,0,.05);
    const top=mesh(new T.PlaneGeometry(1.28,.59),new T.MeshStandardMaterial({map:labelTexture(n?'500':'200',n?'#2d5944':'#8c5e32','#f5e6b8'),roughness:.75}),notes,0,.105);
    top.rotation.x=-Math.PI/2;notes.position.set(n?1.65:-1.65,SURFACE,-1.75);notes.rotation.y=n?-.18:.2;root.add(notes);
  }
  for(let i=0;i<6;i++){
    const stack=new T.Group();
    for(let n=0;n<2+i%3;n++)cylinder(stack,brass,.11,.11,.028,n*.029);
    stack.position.set(-.52+i*.21,SURFACE+.018,2.45+(i%2)*.16);root.add(stack);
  }
  root.traverse(node=>{node.raycast=()=>{};});
  return root;
}
export function dispose(root:T.Object3D){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(node=>{if(!(node instanceof T.Mesh))return;geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);}});for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
