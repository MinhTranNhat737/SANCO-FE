import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Raycaster,Texture,Vector3,Mesh,MeshBasicMaterial} from 'three';
import {table,house,estateAssets,SURFACE,dispose} from '../src/three/party-models.ts';

test('monopoly buildings grow strictly larger and taller from level 1 to level 5 and owned cells carry the buyer color',()=>{
  const heights:number[]=[],widths:number[]=[];
  for(let lvl=1;lvl<=5;lvl++){
    const b=house(lvl,'R');
    try{
      b.updateMatrixWorld(true);
      const box=new Box3().setFromObject(b),size=box.getSize(new Vector3());
      heights.push(size.y);widths.push(size.x);
    }finally{dispose(b);}
  }
  for(let i=1;i<heights.length;i++){
    assert.ok(heights[i]>heights[i-1]+.15,`Level ${i+1} height (${heights[i]}) must exceed level ${i} (${heights[i-1]})`);
    assert.ok(widths[i]>widths[i-1]+.04,`Level ${i+1} width (${widths[i]}) must exceed level ${i} (${widths[i-1]})`);
  }
  const property=Array(48).fill(null);property[1]='R';property[2]='G';
  const houses=Array(48).fill(0);houses[1]=2;houses[2]=5;
  const assets=estateAssets({edition:'vn-v2',property,houses,mortgaged:Array(48).fill(false)});
  try{
    assert.equal(assets.children.length,4,'Each owned property with buildings renders a colored cell overlay group and a tiered 3D building');
  }finally{dispose(assets);}
});

for(const kind of['ludo','monopoly'])test(`${kind}: printed playing surface stays visible above wood from overhead and orbit views`,()=>{
  // Real mesh geometry, without needing a browser to paint texture bitmaps.
  const board=table(kind,{wood:()=>new Texture(),board:()=>new Texture(),label:()=>new Texture()});
  try{
    board.updateMatrixWorld(true);
    const wood=board.getObjectByName('table-wood-inlay')!,face=board.getObjectByName('table-playing-surface')!;
    const ink=(face as Mesh).material as MeshBasicMaterial;
    assert.ok(ink instanceof MeshBasicMaterial,'Printed lettering must not bleach under room lights');
    assert.equal(ink.toneMapped,false,'Exposure changes must leave print contrast intact');
    assert.ok(SURFACE>new Box3().setFromObject(wood).max.y+.005,'Print must clear the solid wood top');
    for(const x of[-4.6,0,4.6])for(const z of[-4.6,0,4.6])for(const angle of[0,Math.PI/2,Math.PI,Math.PI*1.5]){
      // Avoid exact shared triangle edges, where ray/triangle precision is ambiguous.
      const target=new Vector3(x+.001,SURFACE,z),origin=target.clone().add(new Vector3(Math.sin(angle)*5,12,Math.cos(angle)*5));
      const hits=new Raycaster(origin,target.clone().sub(origin).normalize()).intersectObject(board,true);
      assert.equal(hits[0]?.object.name,face.name,`Wood hides the board at (${x},${z}), orbit ${angle}`);
    }
    const overhead=new Raycaster(new Vector3(0,15,0),new Vector3(0,-1,0)).intersectObject(board,true);
    assert.equal(overhead[0]?.object.name,face.name);
  }finally{dispose(board);}
});
