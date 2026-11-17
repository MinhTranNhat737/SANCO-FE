import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPractice,makePracticeMove} from '../../be/src/practice-engine.js';
import {transitionFor,sampleActor,incomingBoard,snapshot} from '../src/three/board-motion.ts';
import type {PracticePly} from '../src/practice-types.ts';
const at=(y:number,x:number)=>(11-y)*11+x;
function game(pieces:[number,number,string][]){const g=createPractice('commander','r','easy','motion');g.board.fill(null);for(const [y,x,p]of [[0,10,'rK'],[11,9,'bK'],...pieces] as [number,number,string][])g.board[at(y,x)]=p;return g;}
test('Commander 3D shows bombing out and back, stationary artillery shots, and the exact captured board',()=>{
  for(const mode of['bomb','fire']){
    const g=mode==='bomb'?game([[3,4,'rF'],[6,4,'bI'],[1,3,'rI'],[10,3,'bT']]):game([[4,2,'rN'],[4,4,'bI'],[1,3,'rI'],[10,3,'bT']]);
    const from=mode==='bomb'?at(3,4):at(4,2),to=mode==='bomb'?at(6,4):at(4,4),before=[...g.board];makePracticeMove(g,{from,to,action:`ctl-0-${mode}`});const plan=transitionFor('commander',before,g.board,g.moves[0] as PracticePly);assert.ok(plan);assert.equal(plan.actors[0].path,mode);assert.deepEqual(plan.captures,[to]);assert.deepEqual(plan.after,g.board);
    const actor=plan.actors[0],start=sampleActor(actor,11,12,0),end=sampleActor(actor,11,12,actor.duration),mid=sampleActor(actor,11,12,actor.duration/2);
    if(mode==='bomb'){assert.equal(end.x,start.x);assert.equal(end.z,start.z);assert.equal(mid.z,Math.floor(to/11)-5.5);assert.ok(mid.y>1);assert.equal(plan.departure![from],null);}else{assert.equal(plan.departure![from],before[from]);assert.equal(end.x,to%11-5);}
  }
});
test('Commander 3D splits a three-unit carrier into three actors without moving a passenger twice',()=>{
  const g=game([[3,5,'rT+rI+rD'],[9,3,'bI']]),before=[...g.board],orders=[{unit:0,to:at(5,5),mode:'move'},{unit:1,to:at(3,4),mode:'move'},{unit:2,to:at(4,6),mode:'move'}];
  makePracticeMove(g,{from:at(3,5),to:orders[0].to,action:'ctl-combined',details:{orders}});const p=transitionFor('commander',before,g.board,g.moves[0] as PracticePly);assert.ok(p);assert.deepEqual(p.actors.map(a=>a.piece),['rT','rI','rD']);assert.equal(p.departure![at(3,5)],null);assert.deepEqual(p.after,g.board);
});
test('Commander 3D handles boarding, disembarking and burning with a carried commander; unexplained changes snap',()=>{
  const cases=[{pieces:[[3,4,'rI'],[3,5,'rT'],[10,3,'bI']] as [number,number,string][],from:at(3,4),to:at(3,5),action:'ctl-0-board'},
    {pieces:[[3,4,'rT+rI'],[10,3,'bI']] as [number,number,string][],from:at(3,4),to:at(3,5),action:'ctl-1-move'},
    {pieces:[[3,4,'rF+rK'],[6,4,'bA'],[0,10,'rI']] as [number,number,string][],from:at(3,4),to:at(6,4),action:'ctl-0-bomb'}];
  for(const c of cases){const g=game(c.pieces),before=[...g.board];makePracticeMove(g,c);const p=transitionFor('commander',before,g.board,g.moves[0] as PracticePly);assert.ok(p,c.action);assert.deepEqual(p.after,g.board);if(c.pieces[0][2]==='rF+rK'){assert.equal(p.actors[0].path,'burn');assert.equal(p.actors[0].piece,'rF+rK');}const forged=[...g.board];forged[at(0,3)]='bT';assert.equal(transitionFor('commander',before,forged,g.moves[0] as PracticePly),null);}
});
test('Commander consecutive live moves queue once and replay starts synchronize without fabricated animation',()=>{
  const g=game([[3,4,'rF'],[6,4,'bI'],[1,3,'rI'],[9,3,'bT']]),initial=snapshot(g.id,g.board,0,[]);makePracticeMove(g,{from:at(3,4),to:at(6,4),action:'ctl-0-bomb'});const next=snapshot(g.id,g.board,1,g.moves as PracticePly[]);assert.equal(incomingBoard('commander',initial,next,g.moves as PracticePly[]).mode,'animate');assert.equal(incomingBoard('commander',next,next,g.moves as PracticePly[]).mode,'unchanged');assert.equal(incomingBoard('commander',next,initial,g.moves as PracticePly[]).mode,'snap');
});
test('A plane intercepted before its target animates to the AA contact point and leaves the target intact',()=>{
  const g=game([[2,4,'rF'],[3,4,'bA'],[6,4,'bI'],[1,3,'rI']]),before=[...g.board];makePracticeMove(g,{from:at(2,4),to:at(6,4),action:'ctl-0-bomb'});const plan=transitionFor('commander',before,g.board,g.moves[0] as PracticePly);assert.ok(plan);assert.equal(plan.actors[0].path,'burn');assert.equal(plan.actors[0].to,at(3,4));assert.equal(g.board[at(6,4)],'bI');assert.deepEqual(plan.captures,[]);
});
