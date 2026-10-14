import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent,undo,knownCounts,concealedCount} from './state.js';
import {afterRecord} from './entry.js';

const READY=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=()=>initializeGame(createGame(),{hand:READY,missing:{self:'tong',left:'tong',top:'tong',right:'tong'}});

test('opponent unknown draw adds one concealed back without adding known tile identities',()=>{
  const before=game();
  const after=applyEvent(before,{player:'left',type:'draw'});
  assert.equal(after.players.left.hasDrawn,true);
  assert.equal(concealedCount(after.players.left),14);
  assert.equal(after.players.left.hand,undefined);
  assert.deepEqual(knownCounts(after),knownCounts(before));
  assert.deepEqual(undo(after),before);
});
test('opponent discard removes the separated draw and returns to thirteen concealed backs',()=>{
  const drawn=applyEvent(game(),{player:'left',type:'draw'});
  const after=applyEvent(drawn,{player:'left',type:'discard',tile:'wan-8'});
  assert.equal(after.players.left.hasDrawn,false);
  assert.equal(concealedCount(after.players.left),13);
  assert.equal(after.players.left.discards[0].tile,'wan-8');
  assert.deepEqual(undo(after),drawn);
});
test('opponents cannot draw twice or reveal a fabricated drawn face',()=>{
  const drawn=applyEvent(game(),{player:'right',type:'draw'});
  assert.throws(()=>applyEvent(drawn,{player:'right',type:'draw'}),/出牌/);
  assert.throws(()=>applyEvent(game(),{player:'right',type:'draw',tile:'wan-8'}),/牌面/);
});
test('self drawn winning hand exits blood battle and undo restores the active draw',()=>{
  const drawn=applyEvent(game(),{player:'self',type:'draw',tile:'wan-9'});
  const after=applyEvent(drawn,{player:'self',type:'win',winType:'selfDraw'});
  assert.equal(after.players.self.won,true);
  assert.equal(after.players.self.win.order,1);
  assert.equal(after.finished,false);
  assert.throws(()=>applyEvent(after,{player:'self',type:'discard',tile:'wan-9'}),/已胡/);
  assert.deepEqual(undo(after),drawn);
});
test('a self win with an invalid shape or retained missing suit is rejected atomically',()=>{
  const drawn=applyEvent(game(),{player:'self',type:'draw',tile:'tong-9'});
  const snapshot=structuredClone(drawn);
  assert.throws(()=>applyEvent(drawn,{player:'self',type:'win',winType:'selfDraw'}),/胡牌/);
  assert.deepEqual(drawn,snapshot);
});
test('self discard win displays the shared winning tile in its river and counts it once',()=>{
  const discarded=applyEvent(game(),{player:'left',type:'discard',tile:'wan-9'});
  const after=applyEvent(discarded,{player:'self',type:'win',winType:'discard',source:'left',tile:'wan-9'});
  assert.equal(after.players.self.won,true);
  assert.equal(after.players.self.hand.length,13);
  assert.equal(after.players.left.discards.length,1);
  assert.equal(after.players.self.discards.at(-1).kind,'win');
  assert.equal(knownCounts(after)['wan-9'],2);
  assert.deepEqual(undo(after),discarded);
});
test('one discard can win for three players without duplicating known physical copies',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-9'});
  for(const player of ['self','right','top'])state=applyEvent(state,{player,type:'win',winType:'discard',source:'left',tile:'wan-9'});
  assert.equal(state.finished,true);
  assert.deepEqual(['self','right','top'].map(id=>state.players[id].win.order),[1,2,3]);
  assert.equal(knownCounts(state)['wan-9'],2);
  assert.throws(()=>applyEvent(state,{player:'left',type:'draw'}),/结束/);
  const restored=undo(state);
  assert.equal(restored.finished,false);
  assert.equal(restored.players.top.won,false);
});
test('only the current unclaimed discard response may be recorded as a discard win',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-9'});
  assert.throws(()=>applyEvent(state,{player:'right',type:'win',winType:'discard',source:'top',tile:'wan-9'}),/弃牌/);
  state=applyEvent(state,{player:'top',type:'draw'});
  state=applyEvent(state,{player:'top',type:'discard',tile:'wan-8'});
  assert.throws(()=>applyEvent(state,{player:'right',type:'win',winType:'discard',source:'left',tile:'wan-9'}),/弃牌/);
});
test('known missing-suit winning tile and melds cannot be recorded as a win',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'tong-9'});
  assert.throws(()=>applyEvent(state,{player:'right',type:'win',winType:'discard',source:'left',tile:'tong-9'}),/定缺/);
});
test('self draws and automatic flow skip all winners while others keep playing',()=>{
  let state=applyEvent(game(),{player:'left',type:'draw'});
  state=applyEvent(state,{player:'left',type:'win',winType:'selfDraw',tile:'wan-8'});
  assert.deepEqual(afterRecord({player:'top',type:'discard'},state),{player:'self',type:'draw',tile:null,source:''});
  state=applyEvent(state,{player:'self',type:'draw',tile:'wan-9'});
  state=applyEvent(state,{player:'self',type:'win',winType:'selfDraw'});
  assert.deepEqual(afterRecord({player:'top',type:'discard'},state),{player:'right',type:'discard',tile:null,source:''});
  for(const type of ['draw','discard','pung','concealedKong'])assert.throws(()=>applyEvent(state,{player:'left',type,tile:'wan-8',source:'right'}),/已胡/);
});
test('opponent pung adds no separated draw but still needs to discard its eleventh concealed tile',()=>{
  const discarded=applyEvent(game(),{player:'right',type:'discard',tile:'tiao-9'});
  const pung=applyEvent(discarded,{player:'left',type:'pung',tile:'tiao-9',source:'right'});
  assert.equal(pung.players.left.hasDrawn,false);
  assert.equal(concealedCount(pung.players.left),11);
  const after=applyEvent(pung,{player:'left',type:'discard',tile:'wan-8'});
  assert.equal(concealedCount(after.players.left),10);
});
test('new hand setup clears previous winners and pending unknown draws',()=>{
  let state=applyEvent(game(),{player:'left',type:'draw'});
  state=applyEvent(state,{player:'left',type:'win',winType:'selfDraw',tile:'wan-8'});
  const reset=initializeGame(state,{hand:READY,missing:{self:'tong'}});
  assert.equal(reset.players.left.won,false);
  assert.equal(reset.players.left.hasDrawn,false);
  assert.equal(reset.finished,false);
  assert.deepEqual(undo(reset),state);
});

test('multiple-discard-win continuation follows the furthest anticlockwise winner, not input order',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-9'});
  state=applyEvent(state,{player:'top',type:'win',winType:'discard',source:'left',tile:'wan-9'});
  state=applyEvent(state,{player:'self',type:'win',winType:'discard',source:'left',tile:'wan-9'});
  assert.deepEqual(afterRecord({player:'self',type:'win',winType:'discard'},state),{player:'left',type:'discard',tile:null,source:''});
});

test('self cannot call a completed pung a self draw win without drawing',()=>{
  let state=initializeGame(createGame(),{hand:['wan-9','wan-9',...READY.slice(0,9),'tiao-6','tiao-6'],missing:{self:'tong',left:'tong'}});
  state=applyEvent(state,{player:'left',type:'discard',tile:'wan-9'});
  state=applyEvent(state,{player:'self',type:'pung',tile:'wan-9',source:'left'});
  const before=structuredClone(state);
  assert.throws(()=>applyEvent(state,{player:'self',type:'win',winType:'selfDraw',tile:'tiao-6'}),/摸牌/);
  assert.deepEqual(state,before);
});

test('an old winning player discard cannot be used in a new meld after the player exits',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-8'});
  state=applyEvent(state,{player:'left',type:'draw'});
  state=applyEvent(state,{player:'left',type:'win',winType:'selfDraw',tile:'wan-8'});
  assert.throws(()=>applyEvent(state,{player:'top',type:'pung',tile:'wan-8',source:'left'}),/已胡/);
});

test('a winning discard cannot later be reused for pung or open kong',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-9'});
  state=applyEvent(state,{player:'right',type:'win',winType:'discard',source:'left',tile:'wan-9'});
  const before=structuredClone(state);
  for(const type of ['pung','openKong'])assert.throws(()=>applyEvent(state,{player:'top',type,source:'left',tile:'wan-9'}),/胡牌/);
  assert.deepEqual(state,before);
});

test('a later separate copy of a previously winning tile can still be claimed',()=>{
  let state=initializeGame(createGame(),{hand:READY.map(t=>t==='wan-9'?'tiao-9':t),missing:{self:'tong',left:'tong',right:'tong',top:'tong'}});
  state=applyEvent(state,{player:'left',type:'discard',tile:'wan-9'});
  state=applyEvent(state,{player:'right',type:'win',winType:'discard',source:'left',tile:'wan-9'});
  const winningId=state.discardResponse.id;
  state=applyEvent(state,{player:'left',type:'draw'});
  state=applyEvent(state,{player:'left',type:'discard',tile:'wan-9'});
  state=applyEvent(state,{player:'top',type:'pung',source:'left',tile:'wan-9'});
  assert.equal(state.players.left.discards[0].id,winningId);
  assert.equal(state.players.left.discards.length,1);
  assert.equal(knownCounts(state)['wan-9'],4);
});
