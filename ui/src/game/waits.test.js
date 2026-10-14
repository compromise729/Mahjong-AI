import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent} from './state.js';
import * as analysis from './waits.js';

const READY=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=hand=>initializeGame(createGame(),{hand,missing:{self:'tong'}});

test('four melds and a single tile wait on that tile as the pair',()=>{
  const result=analysis.analyzeWaits(game(READY));
  assert.equal(result.status,'waiting');
  assert.deepEqual(result.waits,[{tile:'wan-9',unseen:3}]);
});
test('a two-sided sequence waits on both ends',()=>{
  const hand=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-1','tiao-2','tiao-3','wan-9','wan-9','tiao-4','tiao-5'];
  assert.deepEqual(analysis.analyzeWaits(game(hand)).waits.map(w=>w.tile),['tiao-3','tiao-6']);
});
test('seven pairs and dragon seven pairs are recognized without open melds',()=>{
  for(const hand of [
    ['wan-1','wan-1','wan-2','wan-2','wan-4','wan-4','tiao-2','tiao-2','tiao-5','tiao-5','tiao-8','tiao-8','wan-9'],
    ['wan-1','wan-1','wan-1','wan-1','wan-4','wan-4','tiao-2','tiao-2','tiao-5','tiao-5','tiao-8','tiao-8','wan-9']
  ]) assert.deepEqual(analysis.analyzeWaits(game(hand)).waits.map(w=>w.tile),['wan-9']);
});
test('remaining missing-suit tiles invalidate a hand even when other suits decompose',()=>{
  const state=game(READY.map((t,i)=>i===12?'tong-9':t));
  const result=analysis.analyzeWaits(state);
  assert.equal(result.status,'missingSuit');
  assert.deepEqual(result.waits,[]);
});
test('three suits or a missing-suit meld cannot form a legal winning hand',()=>{
  assert.equal(analysis.isWinningHand([...READY.slice(0,12),'tong-9','tong-9'],[],null),false);
  assert.equal(analysis.isWinningHand(READY.slice(0,11),[{type:'pung',tile:'tong-3'}],'tong'),false);
});
test('no fifth physical copy can be suggested for a closed hand or a kong',()=>{
  const hand=['wan-1','wan-1','wan-1','wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','wan-7','wan-8','wan-9','wan-9'];
  assert.ok(!analysis.analyzeWaits(game(hand)).waits.some(w=>w.tile==='wan-1'));
  let state=initializeGame(createGame(),{hand:['wan-9','wan-9','wan-9','wan-9',...READY.slice(0,10)],dealer:true,missing:{self:'tong'}});
  state=applyEvent(state,{player:'self',type:'concealedKong',tile:'wan-9'});
  assert.ok(!analysis.analyzeWaits(state).waits.some(w=>w.tile==='wan-9'));
});
test('melds reduce the concealed hand size and seven pairs requires no melds',()=>{
  let state=initializeGame(createGame(),{hand:['wan-9','wan-9',...READY.slice(0,9),'tiao-6','tiao-6'],missing:{self:'tong'}});
  state=applyEvent(state,{player:'left',type:'discard',tile:'wan-9'});
  state=applyEvent(state,{player:'self',type:'pung',tile:'wan-9',source:'left'});
  state=applyEvent(state,{player:'self',type:'discard',tile:'tiao-6'});
  assert.deepEqual(analysis.analyzeWaits(state).waits.map(w=>w.tile),['tiao-6']);
  assert.equal(analysis.isWinningHand(['wan-1','wan-1','wan-4','wan-4','tiao-2','tiao-2','tiao-5','tiao-5','tiao-8','tiao-8','wan-9'],[{type:'pung',tile:'wan-9'}],'tong'),false);
});
test('golden hook waits on the last concealed tile with four melds',()=>{
  assert.equal(analysis.isWinningHand(['wan-9','wan-9'],[{type:'pung',tile:'wan-1'},{type:'openKong',tile:'wan-4'},{type:'pung',tile:'tiao-2'},{type:'pung',tile:'tiao-6'}],'tong'),true);
});
test('fourteen tiles require a discard preview or report an already winning hand',()=>{
  const drawn=applyEvent(game(READY),{player:'self',type:'draw',tile:'tiao-9'});
  assert.equal(analysis.analyzeWaits(drawn).status,'needsDiscard');
  assert.deepEqual(analysis.analyzeWaits(drawn,{discardTile:'tiao-9'}).waits,[{tile:'wan-9',unseen:3}]);
  assert.equal(analysis.analyzeWaits(applyEvent(game(READY),{player:'self',type:'draw',tile:'wan-9'})).status,'winning');
});
test('publicly exhausted waits are marked zero unseen without inventing wall probabilities',()=>{
  let state=game(READY);
  for(let i=0;i<3;i++)state=applyEvent(state,{player:'left',type:'discard',tile:'wan-9'});
  assert.deepEqual(analysis.analyzeWaits(state).waits,[{tile:'wan-9',unseen:0}]);
});
test('invalid totals, five copies and unset missing suit do not produce waits',()=>{
  assert.equal(analysis.isWinningHand(['wan-1','wan-1'],[],'tong'),false);
  assert.equal(analysis.isWinningHand(['wan-1','wan-1','wan-1','wan-1','wan-1',...READY.slice(2,11)],[],'tong'),false);
  assert.equal(analysis.analyzeWaits(createGame()).status,'uninitialized');
  assert.equal(analysis.analyzeWaits(initializeGame(createGame(),{hand:READY})).status,'needsMissingSuit');
});
