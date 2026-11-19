import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estateCell,estateBounds,estatePoint,estateIndexAt,partyRoll} from '../src/three/party-layout.ts';
import {VN_CELLS} from '../src/estate-data.ts';

test('48 estate spaces form a unique 13 by 13 perimeter and every token/inspection coordinate returns its correct cell',()=>{
  const cells=Array.from({length:48},(_,i)=>estateCell(i,13));assert.equal(new Set(cells.map(c=>c.join(','))).size,48);
  for(let i=0;i<48;i++){const[r,c]=cells[i];assert.ok([0,12].includes(r)||[0,12].includes(c));for(let seat=0;seat<8;seat++){const p=estatePoint(i,seat,13);assert.equal(estateIndexAt(p.x,p.z,13),i);}}
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
    const usedArea=bounds.reduce((sum,b)=>sum+b.width*b.height,0);
    assert.ok(Math.abs(usedArea-(600*600-(600-1200/size)**2))<1e-7,'Square lots should cover the full perimeter');
  }
});

test('Two accepted dice keep both exact values through snapshot/replay',()=>{
  const out=partyRoll([{action:'roll',die:3,dice:[3,6],at:1,side:'R'}]);assert.equal(out.lastDie,3);assert.deepEqual(out.rolls[0].faces,[3,6]);
});
