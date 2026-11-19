import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estateCell,estatePoint,estateIndexAt,partyRoll} from '../src/three/party-layout.ts';
import {VN_CELLS} from '../src/estate-data.ts';

test('48 estate spaces form a unique 13 by 13 perimeter and every token/inspection coordinate returns its correct cell',()=>{
  const cells=Array.from({length:48},(_,i)=>estateCell(i,13));assert.equal(new Set(cells.map(c=>c.join(','))).size,48);
  for(let i=0;i<48;i++){const[r,c]=cells[i];assert.ok([0,12].includes(r)||[0,12].includes(c));for(let seat=0;seat<8;seat++){const p=estatePoint(i,seat,13);assert.equal(estateIndexAt(p.x,p.z,13),i);}}
  assert.equal(estateIndexAt(0,0,13),null);assert.equal(estateIndexAt(8,0,13),null);
  assert.equal(VN_CELLS.filter(c=>c.type==='property').length,34);assert.equal(VN_CELLS.length,48);
});

test('Two accepted dice keep both exact values through snapshot/replay',()=>{
  const out=partyRoll([{action:'roll',die:3,dice:[3,6],at:1,side:'R'}]);assert.equal(out.lastDie,3);assert.deepEqual(out.rolls[0].faces,[3,6]);
});
