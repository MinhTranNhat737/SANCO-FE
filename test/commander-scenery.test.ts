import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildCommanderScenery,COMMANDER_SCENERY_PADDING} from '../src/three/commander-scenery.ts';
import {setBoardCamera,fitBoardCamera,boardPoint} from '../src/three/board-layout.ts';
import {disposeObject} from '../src/three/pieces.ts';

test('Tropical scenery keeps every tree outside the playable board and batches decoration into a small mesh budget',()=>{
  const s=buildCommanderScenery('light');const playable=new T.Box3(new T.Vector3(-5.6,0,-6.1),new T.Vector3(5.6,2,6.1));
  assert.equal(s.root.userData.treeBounds.length,12);
  for(const bounds of s.root.userData.treeBounds){const box=new T.Box3(new T.Vector3(...bounds.min),new T.Vector3(...bounds.max));assert.equal(box.intersectsBox(playable),false);}
  let meshes=0;let triangles=0;s.root.traverse(o=>{if(o instanceof T.Mesh){meshes++;const geometry=o.geometry;triangles+=(geometry.index?.count||geometry.getAttribute('position').count)/3;}});assert.ok(meshes<=22,`Mesh budget: ${meshes}`);assert.ok(triangles<35_000,`Triangle budget: ${triangles}`);disposeObject(s.root);
});
test('Sea and river preserve board intersections, animate by time uniforms and respect reduced motion and theme',()=>{
  const s=buildCommanderScenery();assert.equal(s.water.children.length,2);assert.equal(s.details.children.length,10);
  const materials:T.ShaderMaterial[]=[];s.root.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.ShaderMaterial)materials.push(o.material);});assert.equal(materials.length,3);
  s.update(12);for(const mat of materials){assert.equal(mat.uniforms.time.value,12);assert.equal(mat.depthWrite,false);assert.ok(mat.fragmentShader.includes('\n#include <colorspace_fragment>'));}
  s.update(15,true);assert.ok(materials.every(m=>m.uniforms.time.value===0));
  const before=materials[0].uniforms.shallow.value.getHex();s.setTheme('light');assert.notEqual(materials[0].uniforms.shallow.value.getHex(),before);
  const sea=new T.Box3().setFromObject(s.water.children[0]);assert.ok(sea.max.y<.3);assert.ok(Math.abs(sea.min.x+5.5)<.001);assert.ok(Math.abs(sea.max.x+2.5)<.001);disposeObject(s.root);
});
test('Scenery camera framing preserves square picking and the orbit when decoration is toggled',()=>{
  for(const [width,height]of [[320,480],[1000,650]])for(const flipped of[false,true]){
    const c=new T.OrthographicCamera(-8,8,8,-8,.1,140);setBoardCamera(c,'commander',width,height,flipped,true,1,COMMANDER_SCENERY_PADDING);
    for(const i of[0,10,66,131]){const expected=boardPoint('commander',i),p=expected.clone().project(c),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(p.x,p.y),c);const point=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.3),new T.Vector3())!;assert.ok(point.distanceTo(expected)<1e-8);}
    const left=new T.Vector3(-8.25,.3,-8.25).project(c);assert.ok(Math.abs(left.x)<1&&Math.abs(left.y)<1);
    const orientation=c.quaternion.clone(),position=c.position.clone();fitBoardCamera(c,'commander',width,height,1,0);assert.ok(c.quaternion.equals(orientation)&&c.position.equals(position));
  }
});
