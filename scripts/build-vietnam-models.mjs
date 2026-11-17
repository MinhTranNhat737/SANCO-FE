import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildVietnamModel,VIETNAM_UNITS} from '../src/three/vietnam-models.ts';

// GLTFExporter uses this browser interface for its final binary Blob.
globalThis.FileReader=class{
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');this.onloadend?.();});}
};
const directory=new URL('../public/models/commander/vietnam/',import.meta.url);
await mkdir(directory,{recursive:true});
const assets=[];
for(const [unit,profile]of Object.entries(VIETNAM_UNITS)){
  const model=buildVietnamModel(unit),buffer=await new GLTFExporter().parseAsync(model,{binary:true}),bytes=Buffer.from(buffer);
  const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)).trim());
  const triangles=gltf.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+gltf.accessors[p.indices??p.attributes.POSITION].count/3,0);
  const entry={unit,file:unit+'.glb',title:profile.name,features:profile.features,references:profile.references,author:'Sân Cờ project',license:'Project-original',source:'fe/src/three/vietnam-models.ts',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),triangles};
  await writeFile(new URL(entry.file,directory),bytes);assets.push(entry);console.log(unit,bytes.length,triangles);
}
await writeFile(new URL('manifest.json',directory),JSON.stringify({profile:'vietnam-miniatures-v1',description:'Original stylized board-game miniatures, made using public visual references. Not engineering-scale replicas. Team colors are on bases, equipment retains natural military colors.',assets},null,2)+'\n');
console.log('Total',assets.reduce((n,a)=>n+a.bytes,0),'bytes');
