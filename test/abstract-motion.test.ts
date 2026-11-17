import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPractice,makePracticeMove} from '../../be/src/practice-engine.js';
import {transitionFor,type Board} from '../src/three/board-motion.ts';
import type {GameKind,PracticePly} from '../src/practice-types.ts';

test('New 3D games explain cloning, color conversions and blocked squares without losing accepted board state',()=>{
  const cases:{kind:GameKind;pieces:Record<number,string>;from:number;to:number;actors:number}[]=[
    {kind:'ataxx',pieces:{0:'B',9:'W',48:'W'},from:0,to:8,actors:2},
    {kind:'coganh',pieces:{7:'B',11:'W',13:'W',24:'W'},from:7,to:12,actors:3},
    {kind:'isolation',pieces:{0:'B',63:'W'},from:0,to:9,actors:1},
    {kind:'loa',pieces:{0:'B',2:'B',5:'W'},from:0,to:3,actors:1},
  ];
  for(const item of cases){
    const g=createPractice(item.kind,'B','easy','motion');g.board.fill(null);for(const [i,p]of Object.entries(item.pieces))g.board[+i]=p;
    const before:Board=[...g.board];makePracticeMove(g,{from:item.from,to:item.to});
    const plan=transitionFor(item.kind,before,g.board,g.moves[0] as PracticePly);
    assert.ok(plan,item.kind);assert.equal(plan.actors.length,item.actors,item.kind);assert.deepEqual(plan.after,g.board);
    if(item.kind==='isolation')assert.equal(plan.after[0],'#');
  }
});
