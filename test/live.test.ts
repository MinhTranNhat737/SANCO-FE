import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeLive} from '../src/live-state.ts';
test('Live deltas append once, ignore stale versions and request a full snapshot after packet loss',()=>{
  const previous={id:'room',version:1,game:{id:'round',moves:[{to:1}],initialBoard:[null],board:['X']}};
  const packet={id:'room',version:2,game:{id:'round',moveCount:2,movesAppend:[{to:2}],board:['O']}};
  const merged=mergeLive(previous,packet)!;assert.equal(merged.game.moves.length,2);assert.deepEqual(merged.game.initialBoard,[null]);assert.deepEqual(merged.game.board,['O']);
  assert.equal(mergeLive(merged,packet)!.game.moves.length,2);
  assert.equal(mergeLive(merged,{...packet,version:0}),merged);
  assert.equal(mergeLive(previous,{...packet,game:{...packet.game,moveCount:4}}),null);
  const reset=mergeLive(merged,{id:'room',version:4,game:{id:'new-round',moveCount:0,movesAppend:[],initialBoard:['B'],board:['B']}})!;
  assert.equal(reset.game.id,'new-round');assert.deepEqual(reset.game.moves,[]);assert.deepEqual(reset.game.initialBoard,['B']);
});
test('Practice packets and reconnect snapshots preserve a complete replay',()=>{
  const previous={id:'practice',version:0,moves:[],board:[null]},packet={id:'practice',version:1,moveCount:1,movesAppend:[{to:0}],board:['B']};
  assert.equal(mergeLive(previous,packet)!.moves.length,1);assert.equal(mergeLive(null,packet),null);
  const snapshot={id:'practice',version:9,moves:[1,2,3],board:['W']};assert.equal(mergeLive(previous,snapshot),snapshot);
});
