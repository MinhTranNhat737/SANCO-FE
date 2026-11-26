import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estateGridCell,estateBounds,estateCenterBounds,estateBoardSize,estatePixelRatio,estatePoint,estateIndexAt,partyRoll,vnLayout,vnTileSize,bestVnLayout,VN_SQUARE,VN_CORNER_RATIO,isEstateCorner} from '../src/three/party-layout.ts';
import {VN_CELLS} from '../src/estate-data.ts';

test('48 square lots stay on one perimeter with the original four corners and correct eight-player picking',()=>{
  const cells=Array.from({length:48},(_,i)=>estateGridCell(i,13));assert.equal(new Set(cells.map(c=>c.join(','))).size,48);
  for(let i=0;i<48;i++){
    const [r,c]=cells[i],[nr,nc]=cells[(i+1)%48];
    assert.ok(r===0||r===12||c===0||c===12,'Every lot must stay on the single outer ring');
    assert.equal(Math.abs(nr-r)+Math.abs(nc-c),1,'Every move, including the lap boundary, visits an adjacent lot');
    for(let seat=0;seat<8;seat++){const p=estatePoint(i,seat,13);assert.equal(estateIndexAt(p.x,p.z,13),i);}
  }
  assert.deepEqual([cells[0],cells[12],cells[24],cells[36]],[[12,12],[12,0],[0,0],[0,12]]);
  assert.equal(estateIndexAt(0,0,13),null);assert.equal(estateIndexAt(8,0,13),null);
  assert.equal(VN_CELLS.filter(c=>c.type==='property').length,34);assert.equal(VN_CELLS.length,48);
});

test('Square corners and balanced edge lots cover the perimeter without overlap and stay selectable',()=>{
  for(const size of [6,13]){
    const count=4*(size-1),board=estateBoardSize(size),bounds=Array.from({length:count},(_,i)=>estateBounds(i,size));
    for(let i=0;i<count;i++){
      const b=bounds[i];
      if(size===6||isEstateCorner(i,size)){
        assert.ok(Math.abs(b.width-b.height)<1e-9,'Corners and mini-board lots must remain exact squares');
      }else{
        const ratio=Math.max(b.width,b.height)/Math.min(b.width,b.height);
        assert.ok(Math.abs(ratio-VN_CORNER_RATIO)<1e-6,'Edge lots keep the balanced 1:1.24 proportion');
      }
      assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=board.width+1e-6&&b.y+b.height<=board.height+1e-6);
      for(const dx of [.01,.25,.5,.75,.99])for(const dy of [.01,.25,.5,.75,.99]){
        assert.equal(estateIndexAt((b.x+b.width*dx-board.width/2)/60,(b.y+b.height*dy-board.height/2)/60,size),i);
      }
      for(let j=i+1;j<count;j++){
        const other=bounds[j],overlapX=Math.min(b.x+b.width,other.x+other.width)-Math.max(b.x,other.x),overlapY=Math.min(b.y+b.height,other.y+other.height)-Math.max(b.y,other.y);
        assert.ok(overlapX<1e-7||overlapY<1e-7,`Lots ${i} and ${j} overlap`);
      }
    }
    const usedArea=bounds.reduce((sum,b)=>sum+b.width*b.height,0),center=estateCenterBounds(size);
    assert.ok(Math.abs(usedArea+center.width*center.height-board.width*board.height)<1e-6,'Lots and center must cover the whole board');
    assert.ok(Math.abs(center.width-(board.width-2*board.depth))<1e-6,'The middle retains the single-ring court layout');
  }
});

test('Two accepted dice keep both exact values through snapshot/replay',()=>{
  const out=partyRoll([{action:'roll',die:3,dice:[3,6],at:1,side:'R'}]);assert.equal(out.lastDie,3);assert.deepEqual(out.rolls[0].faces,[3,6]);
});

test('Estate rendering targets 2K on normal and high-DPI screens without exceeding GPU limits',()=>{
  for(const [width,height] of [[1000,900],[720,720],[850,400]])for(const dpr of [1,1.5,2,3]){
    const ratio=estatePixelRatio(width,height,dpr,8192);
    assert.ok(Math.min(width,height)*ratio>=2048);
    assert.ok(Math.max(width,height)*ratio<=8192);
  }
  const limited=estatePixelRatio(1200,600,1,2048);
  assert.equal(1200*limited,2048);
});

test('All adaptive 48-lot widescreen layouts (13x13..18x8) keep exact square tiles, zero overlap and grow tiles when HUD collapses',()=>{
  for(let cols=13;cols<=18;cols++){
    const layout=vnLayout(cols),rows=26-cols,board=estateBoardSize(layout);
    assert.equal(layout.cols,cols);assert.equal(layout.rows,rows);
    const cells=Array.from({length:48},(_,i)=>estateGridCell(i,layout));
    assert.equal(new Set(cells.map(c=>c.join(','))).size,48);
    const bounds=Array.from({length:48},(_,i)=>estateBounds(i,layout));
    for(let i=0;i<48;i++){
      const [r,c]=cells[i],[nr,nc]=cells[(i+1)%48],b=bounds[i];
      assert.ok(r===0||r===rows-1||c===0||c===cols-1,'Every lot must stay on the outer ring');
      assert.equal(Math.abs(nr-r)+Math.abs(nc-c),1,'Adjacent lots must touch orthogonally');
      if(isEstateCorner(i,layout)){
        assert.ok(Math.abs(b.width-b.height)<1e-9,'Corners must be exact squares');
      }else{
        const ratio=Math.max(b.width,b.height)/Math.min(b.width,b.height);
        assert.ok(Math.abs(ratio-VN_CORNER_RATIO)<1e-6,'Edge lots keep the balanced 1:1.24 proportion');
      }
      assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=board.width+1e-6&&b.y+b.height<=board.height+1e-6);
      for(let seat=0;seat<8;seat++){const p=estatePoint(i,seat,layout);assert.equal(estateIndexAt(p.x,p.z,layout),i);}
      for(let j=i+1;j<48;j++){
        const other=bounds[j],overlapX=Math.min(b.x+b.width,other.x+other.width)-Math.max(b.x,other.x),overlapY=Math.min(b.y+b.height,other.y+other.height)-Math.max(b.y,other.y);
        assert.ok(overlapX<1e-7||overlapY<1e-7,`Lots ${i} and ${j} overlap in ${cols}x${rows}`);
      }
    }
    const usedArea=bounds.reduce((sum,b)=>sum+b.width*b.height,0),center=estateCenterBounds(layout);
    assert.ok(Math.abs(usedArea+center.width*center.height-board.width*board.height)<1e-6);
  }
  // bestVnLayout always preserves the 13x13 ring so Xuất phát (0), Thăm tù (12), Nghỉ chân (24), Vào tù (36) stay locked to the 4 largest corners
  for(const [w,h] of [[1660,1080],[1920,1080],[2560,1080],[390,844]]){
    const layout=bestVnLayout(w,h);
    assert.equal(layout.cols,13);assert.equal(layout.rows,13);
    for(const cornerIdx of [0,12,24,36]){
      assert.equal(isEstateCorner(cornerIdx,layout),true,`Index ${cornerIdx} (${VN_CELLS[cornerIdx].name}) must sit at a corner`);
      const cb=estateBounds(cornerIdx,layout),eb=estateBounds(1,layout);
      assert.ok(cb.width*cb.height>eb.width*eb.height*1.4,'The 4 corner tiles must be significantly larger than every edge tile');
    }
  }
});
