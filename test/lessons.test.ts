import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS,lessonFrames,lessonSquare} from '../src/lesson-data.ts';
import {boardSide,createPractice,makePracticeMove,positionKey} from '../../be/src/practice-engine.js';

function chessPlacement(board:(string|null)[]){
  return Array.from({length:8},(_,row)=>board.slice(row*8,row*8+8)
    .map(piece=>piece?piece[0]==='w'?piece[1]:piece[1].toLowerCase():'1').join('')
    .replace(/1+/g,run=>String(run.length))).join('/');
}

for(const kind of ['chess','xiangqi'] as const){
  for(const lesson of LESSONS[kind])test(`${kind}: ${lesson.id} follows the game rules`,()=>{
    const frames=lessonFrames(kind,lesson);
    const game=createPractice(kind,boardSide(kind),'medium',lesson.id);
    if(lesson.position){
      game.board=[...frames[0]];
      if(kind==='chess')game.fen=`${chessPlacement(game.board)} w - - 0 1`;
      game.repetitions={[positionKey(game)]:1};
    }
    assert.deepEqual(frames[0],game.board);
    lesson.moves.forEach((move,index)=>{
      makePracticeMove(game,{from:lessonSquare(kind,move.from),to:lessonSquare(kind,move.to)});
      assert.deepEqual(frames[index+1],game.board,move.label);
      assert.equal(game.checkSquare,move.check?lessonSquare(kind,move.check):null,move.label);
    });
    if(lesson.ending==='mate')assert.equal(game.result?.reason,'checkmate');
  });
}
