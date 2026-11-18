import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {COMMANDER_MODEL_TYPES,COMMANDER_MODEL_PATH,parseCommanderModel,commanderPiece,loadCommanderModels} from '../src/three/commander-models.ts';
import {VIETNAM_UNITS} from '../src/vietnam-profile.ts';

const models=new Map<string,T.Group>();
before(async()=>{
  // GLTFLoader's bitmap interface only; mesh, skin pose and material parsing run unchanged.
  Object.assign(globalThis,{self:globalThis,Path2D:class {},createImageBitmap:async()=>({width:1024,height:1024,close(){}}),document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},save(){},restore(){},translate(){},scale(){},stroke(){}})})}});
  for(const type of COMMANDER_MODEL_TYPES){const bytes=await readFile(new URL(`../public${COMMANDER_MODEL_PATH}/${type}.glb`,import.meta.url));models.set(type,await parseCommanderModel(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)));}
});
after(()=>{for(const model of models.values())model.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});});
test('Every shipped internet model has a recorded source, license, checksum and a valid self-contained GLB',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../public/models/commander/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.assets.length,11);
  let total=0;for(const a of manifest.assets){const bytes=await readFile(new URL(`../public/models/commander/${a.file}`,import.meta.url));total+=bytes.length;assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.ok(a.source.startsWith('https://'));assert.ok(['CC0-1.0','CC-BY-3.0'].includes(a.license));const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)).trim());assert.ok((gltf.buffers||[]).every((b:{uri?:string})=>!b.uri||b.uri.startsWith('data:')));}
  assert.ok(total<3_000_000,'The entire 11-model download must remain under 3 MB');
});
test('Vietnamese profile meshes fit one square in either player color without a skeleton',()=>{
  for(const type of COMMANDER_MODEL_TYPES){const source=models.get(type)!;let meshes=0;source.traverse(o=>{assert.ok(!(o instanceof T.SkinnedMesh));if(o instanceof T.Mesh){meshes++;assert.ok(o.geometry.getAttribute('position').count>0);}});assert.ok(meshes>0&&meshes<=20,`${type}: merged draw calls ${meshes}`);
    for(const side of['r','b']){const piece=commanderPiece(side+type,models),box=new T.Box3().setFromObject(piece),size=box.getSize(new T.Vector3());assert.ok(size.x<=.9&&size.z<=.9&&size.y<=1.06,`${side+type}: ${size.toArray()}`);assert.ok(box.min.y>=-.001);}
  }
});
test('A carrier displays all three imported miniatures, and heroes retain their type and badge',()=>{
  const stack=commanderPiece('rN+rF*+rK',models);assert.deepEqual(stack.userData.commanderUnits,['rN','rF*','rK']);const size=new T.Box3().setFromObject(stack).getSize(new T.Vector3());assert.ok(size.x<=.9&&size.z<=.9&&size.y<1.1);assert.equal(stack.children.length,6);
  const badge=stack.children.find(child=>child.userData.commanderLabel) as T.Mesh<T.PlaneGeometry>;
  assert.ok(badge.geometry.parameters.height>.32);
});
test('Vietnamese equipment retains its natural colors while square bases distinguish teams',()=>{
  const colors=(g:T.Object3D)=>{const values:number[]=[];g.traverse(o=>{if(o instanceof T.Mesh)values.push((o.material as T.MeshStandardMaterial).color.getHex());});return values;};
  for(const type of COMMANDER_MODEL_TYPES){const source=models.get(type)!;assert.equal(source.userData.vietnam,true,type);assert.deepEqual(source.userData.features,VIETNAM_UNITS[type].features);
    const red=commanderPiece('r'+type,models),blue=commanderPiece('b'+type,models);assert.deepEqual(colors(red.children[1]),colors(blue.children[1]),type);assert.notEqual(colors(red.children[0])[0],colors(blue.children[0])[0]);
  }
});
test('The active Vietnamese GLBs match their reference manifest and stay below 1.5 MB',async()=>{
  const manifest=JSON.parse(await readFile(new URL(`../public${COMMANDER_MODEL_PATH}/manifest.json`,import.meta.url),'utf8'));assert.equal(manifest.assets.length,11);let total=0;
  for(const asset of manifest.assets){const bytes=await readFile(new URL(`../public${COMMANDER_MODEL_PATH}/${asset.file}`,import.meta.url));total+=bytes.length;assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(asset.license,'Project-original');assert.ok(asset.references.every((url:string)=>url.startsWith('https://')));assert.ok(asset.features.length>=3);}
  assert.ok(total<1_500_000);
});
test('Loading models caches downloads, isolates mounted boards and retries a failed asset',async()=>{
  const originalFetch=globalThis.fetch,counts=new Map<string,number>();let fail=true;
  globalThis.fetch=async(input,init)=>{
    const url=String(input);if(!url.startsWith('/models/commander/'))return originalFetch(input,init);
    counts.set(url,(counts.get(url)||0)+1);if(fail&&url.endsWith('/K.glb'))return new Response('',{status:503});
    return new Response(await readFile(new URL('../public'+url,import.meta.url)));
  };
  try{
    await assert.rejects(loadCommanderModels(),/Model K: 503/);fail=false;const a=await loadCommanderModels(),b=await loadCommanderModels();
    assert.equal(a.size,11);assert.equal(b.size,11);assert.notEqual(a.get('T'),b.get('T'));assert.notEqual((a.get('T')!.children[0] as T.Mesh).geometry,(b.get('T')!.children[0] as T.Mesh).geometry);
    for(const type of COMMANDER_MODEL_TYPES)assert.equal(counts.get(`${COMMANDER_MODEL_PATH}/${type}.glb`),type==='K'?2:1);
  }finally{globalThis.fetch=originalFetch;}
});
