import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {DiceRollQueue,sampleDiceThrow,THROW_DURATION} from '../src/three/dice-motion.ts';
import {partyRoll} from '../src/three/party-layout.ts';

test('A throw approaches, grips, lifts, releases, bounces and rests on the server face for all six values',()=>{
  const normals:Record<number,Vector3>={1:new Vector3(0,1,0),2:new Vector3(0,0,1),3:new Vector3(1,0,0),4:new Vector3(-1,0,0),5:new Vector3(0,0,-1),6:new Vector3(0,-1,0)},rest=new Vector3(0,.597,1.3);
  for(let value=1;value<=6;value++){
    const held=sampleDiceThrow(THROW_DURATION*.35,value,rest),flight=sampleDiceThrow(THROW_DURATION*.62,value,rest),done=sampleDiceThrow(THROW_DURATION,value,rest);
    assert.equal(held.grip,1);assert.ok(held.position.distanceTo(held.hand)<1e-8);assert.ok(held.position.y>rest.y+.5);
    assert.equal(flight.grip,0);assert.ok(flight.position.distanceTo(flight.hand)>.3);assert.ok(flight.position.y>rest.y);
    assert.equal(done.handVisible,false);assert.equal(done.done,true);assert.ok(done.position.distanceTo(rest)<1e-8);
    assert.ok(normals[value].clone().applyQuaternion(done.rotation).distanceTo(new Vector3(0,1,0))<1e-8,'Upward pips must match the accepted server value');
    for(let ms=0;ms<=THROW_DURATION;ms+=10){const pose=sampleDiceThrow(ms,value,rest,new Quaternion());assert.ok(pose.position.y>=rest.y-1e-8,'The die must never sink through the table');assert.ok(Number.isFinite(pose.rotation.length()));assert.ok(pose.grip>=0&&pose.grip<=1);}
  }
});

test('Fast bot rolls queue once, preserve accepted order and do not replay reconnect history',()=>{
  const history=[{key:'old',value:5}],queue=new DiceRollQueue();queue.reset(history);
  const human={key:'human',value:2},bot={key:'bot',value:6};
  assert.deepEqual(queue.accept([...history,human,bot]),[human,bot]);
  assert.deepEqual(queue.accept([...history,human,bot]),[]);
  queue.reset([...history,human,bot]);assert.deepEqual(queue.accept([...history,human,bot]),[]);
  assert.deepEqual(queue.accept([{key:'invalid',value:9}]),[]);
});

test('Roll history retains the human throw when bot packets arrive in the same render and respects replay position',()=>{
  const moves=[{action:'roll',die:3,at:1,side:'R'},{action:'roll',die:6,at:2,side:'G'},{action:'move',at:3,side:'G'}];
  assert.deepEqual(partyRoll(moves).rolls.map(r=>r.value),[3,6]);assert.equal(partyRoll(moves,1).lastDie,3);assert.equal(partyRoll(moves,0).rolls.length,0);
});

test('Mouse-dropped dice release from the cursor position, roll across the board surface and settle on the rolled face',()=>{
  const rest=new Vector3(0,.597,1.3),dropOrigin=new Vector3(-2.4,2.05,-1.8);
  const atRelease=sampleDiceThrow(THROW_DURATION*.5,6,rest,new Quaternion(),dropOrigin);
  const midRoll=sampleDiceThrow(THROW_DURATION*.78,6,rest,new Quaternion(),dropOrigin);
  const settled=sampleDiceThrow(THROW_DURATION,6,rest,new Quaternion(),dropOrigin);
  assert.ok(atRelease.position.distanceTo(dropOrigin)<1e-6);
  assert.ok(midRoll.position.distanceTo(rest)>.15,'Die must roll across the board before stopping');
  assert.ok(midRoll.position.y>=rest.y-1e-8,'Rolling die must stay on or above the board surface');
  assert.ok(settled.position.distanceTo(rest)<1e-8);
  assert.ok(new Vector3(0,-1,0).applyQuaternion(settled.rotation).distanceTo(new Vector3(0,1,0))<1e-8);
});
