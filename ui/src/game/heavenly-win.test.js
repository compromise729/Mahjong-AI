import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent,undo,knownCounts} from './state.js';
import {getSelfDrawResponse} from './responses.js';
import * as entry from './entry.js';

const HAND=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const missing={self:'tong',left:'tong',top:'tong',right:'tong'};

test('the dealer can win its initial fourteen without an extra draw or wall deduction',()=>{
  const start=initializeGame(createGame(),{hand:[...HAND,'wan-9'],dealerSeat:'self',missing});
  const response=getSelfDrawResponse(start);
  assert.ok(response,'valid initial winning hand must offer self draw / heavenly Hu');
  assert.equal(response.tile,'wan-9');
  const won=applyEvent(start,response.event);
  assert.equal(won.players.self.win.heavenly,true);
  assert.equal(won.players.self.win.tile,'wan-9');
  assert.equal(won.wallRemaining,55);
  assert.deepEqual(knownCounts(won),knownCounts(start));
  assert.deepEqual(undo(won),start);
});

test('an opponent dealer may also record initial heavenly Hu',()=>{
  const start=initializeGame(createGame(),{hand:HAND,dealerSeat:'top',missing});
  const won=applyEvent(start,{player:'top',type:'win',winType:'selfDraw',tile:'wan-8'});
  assert.equal(won.players.top.win.heavenly,true);
  assert.equal(won.wallRemaining,55);
});

test('a first normal draw remains available as self draw and is distinct from the initial dealer win',()=>{
  let state=initializeGame(createGame(),{hand:HAND,dealerSeat:'left',missing});
  state=applyEvent(state,{player:'left',type:'discard',tile:'wan-8'});
  state=applyEvent(state,{player:'self',type:'draw',tile:'wan-9'});
  const response=getSelfDrawResponse(state);
  assert.ok(response);
  const won=applyEvent(state,response.event);
  assert.equal(won.players.self.win.heavenly,false);
  assert.equal(won.wallRemaining,54);
});

test('invalid or missing-suit initial dealer hands still cannot win',()=>{
  for(const tile of ['wan-8','tong-9']){
    const start=initializeGame(createGame(),{hand:[...HAND,tile],dealerSeat:'self',missing});
    assert.equal(getSelfDrawResponse(start),null);
    assert.throws(()=>applyEvent(start,{player:'self',type:'win',winType:'selfDraw',tile}),/胡牌/);
  }
});

test('reopening and saving setup preserves the originally designated fourteenth tile',()=>{
  const start=initializeGame(createGame(),{hand:[...HAND,'wan-9'],dealerSeat:'self',missing});
  const input=entry.setupHand(start);
  assert.equal(input.at(-1),'wan-9');
  const saved=initializeGame(start,{hand:input,dealerSeat:'self',missing});
  assert.equal(saved.drawnTile,'wan-9');
  assert.ok(getSelfDrawResponse(saved));
});

test('winner setup restores all fourteen faces with the winning face last without modifying the old hand',()=>{
  const start=initializeGame(createGame(),{hand:[...HAND,'wan-9'],dealerSeat:'self',missing});
  const won=applyEvent(start,getSelfDrawResponse(start).event);
  const input=entry.setupHand(won);
  assert.equal(input.length,14);assert.equal(input.at(-1),'wan-9');
  assert.equal(won.players.self.hand.length,13);
});
