import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estateGridCell,estateBounds,estateCenterBounds,estateBoardSize,estatePixelRatio,estatePoint,estateIndexAt,partyRoll,vnLayout,vnTileSize,bestVnLayout,VN_SQUARE} from '../src/three/party-layout.ts';
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

test('Square lots cover the perimeter without overlap and every part of a lot remains selectable',()=>{
  for(const size of [6,13]){
    const count=4*(size-1),bounds=Array.from({length:count},(_,i)=>estateBounds(i,size));
    for(let i=0;i<count;i++){
      const b=bounds[i];
      assert.equal(b.width,b.height,'Every lot must remain square');
      assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=600.000001&&b.y+b.height<=600.000001);
      for(const dx of [.01,.25,.5,.75,.99])for(const dy of [.01,.25,.5,.75,.99]){
        assert.equal(estateIndexAt((b.x+b.width*dx-300)/60,(b.y+b.height*dy-300)/60,size),i);
      }
      for(let j=i+1;j<count;j++){
        const other=bounds[j],overlapX=Math.min(b.x+b.width,other.x+other.width)-Math.max(b.x,other.x),overlapY=Math.min(b.y+b.height,other.y+other.height)-Math.max(b.y,other.y);
        assert.ok(overlapX<1e-7||overlapY<1e-7,`Lots ${i} and ${j} overlap`);
      }
    }
    const usedArea=bounds.reduce((sum,b)=>sum+b.width*b.height,0),center=estateCenterBounds(size);
    assert.ok(Math.abs(usedArea+center.width*center.height-600*600)<1e-6,'Lots and center must cover the whole board');
    assert.equal(center.width,600-1200/size,'The middle retains the single-ring square layout');
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
      assert.ok(Math.abs(b.width-b.height)<1e-9,'Every lot must be an exact square');
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
  // Widescreen 1920x1080 with HUD open (1660x1080) -> 16x10; HUD collapsed (1920x1080) -> 17x9 (bigger tiles, no sidebars!)
  const openHud=bestVnLayout(1660,1080),fullScreen=bestVnLayout(1920,1080),ultraWide=bestVnLayout(2560,1080);
  assert.equal(openHud.cols,16);assert.equal(openHud.rows,10);
  assert.equal(fullScreen.cols,17);assert.equal(fullScreen.rows,9);
  assert.equal(ultraWide.cols,18);assert.equal(ultraWide.rows,8);
  assert.ok(vnTileSize(fullScreen,1920,1080)>vnTileSize(VN_SQUARE,1920,1080)*1.3,'17x9 tiles must be >30% larger linearly than 13x13 on 16:9');
  assert.ok(vnTileSize(fullScreen,1920,1080)>vnTileSize(openHud,1660,1080),'Collapsing HUD freesizes the board to even larger square tiles');
});
