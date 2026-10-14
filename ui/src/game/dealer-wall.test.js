import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent,undo,concealedCount} from './state.js';
import {afterRecord} from './entry.js';

const HAND=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=dealerSeat=>initializeGame(createGame(),{hand:dealerSeat==='self'?[...HAND,'wan-9']:HAND,dealerSeat,missing:{self:'tong',left:'tong',right:'tong',top:'tong'}});

test('each nominated dealer starts with fourteen and reserves the first discard',()=>{
  for(const seat of ['self','left','right','top']){
    const state=game(seat);
    assert.equal(state.dealerSeat,seat);assert.equal(state.pendingPlayer,seat);
    assert.equal(concealedCount(state.players[seat]),14);
    for(const other of ['self','left','right','top'].filter(id=>id!==seat)){
      assert.equal(concealedCount(state.players[other]),13);
      assert.throws(()=>applyEvent(state,{player:other,type:'draw',...(other==='self'?{tile:'wan-8'}:{})}),/先.*出牌/);
    }
    assert.equal(state.wallRemaining,55);
    const discarded=applyEvent(state,{player:seat,type:'discard',tile:'wan-9'});
    assert.equal(discarded.wallRemaining,55);
    assert.equal(afterRecord({player:seat,type:'discard'},discarded).player,{self:'right',left:'self',right:'top',top:'left'}[seat]);
  }
});

test('own and unknown draws each consume exactly one wall tile and undo restores it',()=>{
  let state=applyEvent(game('left'),{player:'left',type:'discard',tile:'wan-8'});
  const before=state;
  state=applyEvent(state,{player:'self',type:'draw',tile:'wan-8'});
  assert.equal(state.wallRemaining,54);assert.deepEqual(undo(state),before);
  state=applyEvent(state,{player:'self',type:'discard',tile:'wan-8'});
  assert.equal(state.wallRemaining,54);
  state=applyEvent(state,{player:'right',type:'draw'});
  assert.equal(state.wallRemaining,53);
  assert.throws(()=>applyEvent(state,{player:'top',type:'draw'}),/出牌/);
  assert.equal(state.wallRemaining,53);
});

test('a recorded opponent discard accounts for an omitted unknown draw once',()=>{
  let state=applyEvent(game('left'),{player:'left',type:'discard',tile:'wan-8'});
  state=applyEvent(state,{player:'right',type:'discard',tile:'tiao-9'});
  assert.equal(state.wallRemaining,54);
  state=applyEvent(state,{player:'top',type:'pung',source:'right',tile:'tiao-9'});
  assert.equal(state.wallRemaining,54);
  state=applyEvent(state,{player:'top',type:'discard',tile:'wan-8'});
  assert.equal(state.wallRemaining,54);
});

test('kong consumes no wall tile until replacement draw and its discard consumes no extra',()=>{
  let state=applyEvent(game('left'),{player:'left',type:'discard',tile:'tiao-9'});
  state=applyEvent(state,{player:'top',type:'openKong',source:'left',tile:'tiao-9'});
  assert.equal(state.wallRemaining,55);
  state=applyEvent(state,{player:'top',type:'draw'});
  assert.equal(state.wallRemaining,54);
  state=applyEvent(state,{player:'top',type:'discard',tile:'wan-8'});
  assert.equal(state.wallRemaining,54);
});

test('an empty wall rejects another draw atomically while allowing the last drawn tile to discard',()=>{
  let state=applyEvent(game('left'),{player:'left',type:'discard',tile:'wan-8'});
  state={...state,wallRemaining:1};
  state=applyEvent(state,{player:'self',type:'draw',tile:'wan-8'});
  assert.equal(state.wallRemaining,0);
  state=applyEvent(state,{player:'self',type:'discard',tile:'wan-8'});
  const before=structuredClone(state);
  assert.throws(()=>applyEvent(state,{player:'right',type:'draw'}),/牌墙/);
  assert.deepEqual(state,before);
});

test('opponent concealed and added kong require a recorded draw so no wall tile is omitted',()=>{
  let state=applyEvent(game('left'),{player:'left',type:'discard',tile:'tiao-9'});
  assert.throws(()=>applyEvent(state,{player:'right',type:'concealedKong',tile:'wan-8'}),/先.*摸牌/);
  state=applyEvent(state,{player:'top',type:'pung',source:'left',tile:'tiao-9'});
  state=applyEvent(state,{player:'top',type:'discard',tile:'wan-8'});
  assert.throws(()=>applyEvent(state,{player:'top',type:'addedKong',tile:'tiao-9'}),/先.*摸牌/);
  state=applyEvent(state,{player:'top',type:'draw'});
  state=applyEvent(state,{player:'top',type:'addedKong',tile:'tiao-9'});
  state=applyEvent(state,{player:'top',type:'draw'});
  assert.equal(state.wallRemaining,53);
});

test('a legacy hand without wall bookkeeping cannot corrupt the counter with NaN',()=>{
  const state=applyEvent(game('left'),{player:'left',type:'discard',tile:'wan-8'});
  delete state.wallRemaining;
  const before=structuredClone(state);
  assert.throws(()=>applyEvent(state,{player:'self',type:'draw',tile:'wan-8'}),/牌墙.*设置/);
  assert.deepEqual(state,before);
});
