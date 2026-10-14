import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, initializeGame, applyEvent, undo, knownCounts, concealedCount, createDemoGame } from './state.js';

const HAND = ['wan-1','wan-2','wan-3','wan-6','wan-7','wan-8','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','tong-5'];
const game = () => initializeGame(createGame(), {hand: HAND, dealer: false, missing: {self:'tong',left:'tong',top:'tiao',right:'tong'}});

test('draw adds one tile and marks it without mutating the previous hand', () => {
  const before = game();
  const after = applyEvent(before, {player:'self',type:'draw',tile:'tong-5'});
  assert.equal(before.players.self.hand.length, 13);
  assert.equal(after.players.self.hand.length, 14);
  assert.equal(after.drawnTile, 'tong-5');
});

test('self discard moves exactly one existing tile into the river and undo restores all state', () => {
  const before = applyEvent(game(), {player:'self',type:'draw',tile:'tong-5'});
  const after = applyEvent(before, {player:'self',type:'discard',tile:'tong-5'});
  assert.equal(after.players.self.hand.filter(t => t==='tong-5').length, 1);
  assert.equal(after.players.self.discards[0].tile, 'tong-5');
  assert.equal(after.drawnTile, null);
  assert.deepEqual(undo(after), before);
});

test('opponent discards retain their unknown concealed count and never expose an invented hand', () => {
  const after = applyEvent(game(), {player:'left',type:'discard',tile:'wan-9'});
  assert.equal(concealedCount(after.players.left), 13);
  assert.equal(after.players.left.hand, undefined);
  assert.equal(after.players.left.discards[0].tile, 'wan-9');
});

test('pung consumes its source discard and counts only three physical copies', () => {
  const discarded = applyEvent(game(), {player:'right',type:'discard',tile:'wan-9'});
  const after = applyEvent(discarded, {player:'left',type:'pung',tile:'wan-9',source:'right'});
  assert.equal(after.players.right.discards.length, 0);
  assert.equal(after.players.left.melds[0].type, 'pung');
  assert.equal(knownCounts(after)['wan-9'], 3);
  assert.equal(concealedCount(after.players.left), 11);
  assert.deepEqual(undo(after), discarded);
});

test('open kong transfers a source tile once and leaves ten unknown concealed tiles', () => {
  const discarded = applyEvent(game(), {player:'right',type:'discard',tile:'tong-4'});
  const after = applyEvent(discarded, {player:'top',type:'openKong',tile:'tong-4',source:'right'});
  assert.equal(knownCounts(after)['tong-4'], 4);
  assert.equal(after.players.right.discards.length, 0);
  assert.equal(concealedCount(after.players.top), 10);
});

test('added kong upgrades an existing pung without appending a second meld', () => {
  let before = applyEvent(game(), {player:'right',type:'discard',tile:'tong-4'});
  before = applyEvent(before, {player:'top',type:'pung',tile:'tong-4',source:'right'});
  before=applyEvent(before,{player:'top',type:'discard',tile:'wan-8'});
  before=applyEvent(before,{player:'top',type:'draw'});
  const after = applyEvent(before, {player:'top',type:'addedKong',tile:'tong-4'});
  assert.equal(after.players.top.melds.length, 1);
  assert.equal(after.players.top.melds[0].type, 'addedKong');
  assert.equal(knownCounts(after)['tong-4'], 4);
});

test('concealed kong reserves all four copies even though the UI shows one face', () => {
  const drawn=applyEvent(game(),{player:'right',type:'draw'});
  const after = applyEvent(drawn, {player:'right',type:'concealedKong',tile:'tiao-9'});
  assert.equal(knownCounts(after)['tiao-9'], 4);
  assert.equal(after.players.right.melds[0].type, 'concealedKong');
  assert.equal(concealedCount(after.players.right), 10);
});

test('self pung removes the two concealed source tiles and then permits the required discard', () => {
  const hand = ['wan-9','wan-9', ...HAND.slice(0,11)];
  let before = initializeGame(createGame(), {hand, dealer:false});
  before = applyEvent(before, {player:'right',type:'discard',tile:'wan-9'});
  const pung = applyEvent(before, {player:'self',type:'pung',tile:'wan-9',source:'right'});
  assert.equal(pung.players.self.hand.length, 11);
  const after = applyEvent(pung, {player:'self',type:'discard',tile:'wan-1'});
  assert.equal(after.players.self.hand.length, 10);
});

test('fifth known copy is rejected atomically', () => {
  let before=applyEvent(game(),{player:'right',type:'draw'});
  before = applyEvent(before, {player:'right',type:'concealedKong',tile:'tiao-9'});
  before=applyEvent(before,{player:'right',type:'draw'});
  before=applyEvent(before,{player:'right',type:'discard',tile:'wan-8'});
  const snapshot = structuredClone(before);
  assert.throws(() => applyEvent(before, {player:'left',type:'discard',tile:'tiao-9'}), /4张/);
  assert.deepEqual(before, snapshot);
});

test('illegal inputs, nonexistent discard and repeated draw are rejected', () => {
  const before = game();
  assert.throws(() => applyEvent(before, {player:'left',type:'draw',tile:'wan-4'}), /自己/);
  assert.throws(() => applyEvent(before, {player:'self',type:'discard',tile:'wan-9'}), /手牌/);
  assert.throws(() => applyEvent(before, {player:'left',type:'discard',tile:'wind-east'}), /牌/);
  assert.throws(() => applyEvent(before, {player:'missing',type:'discard',tile:'wan-9'}), /玩家/);
  assert.throws(() => applyEvent(before, {player:'left',type:'pung',tile:'wan-9',source:'top'}), /弃牌/);
  const opponentDrawn=applyEvent(before,{player:'left',type:'draw'});
  assert.throws(() => applyEvent(opponentDrawn, {player:'left',type:'addedKong',tile:'wan-9'}), /碰/);
  const drawn = applyEvent(before, {player:'self',type:'draw',tile:'wan-4'});
  assert.throws(() => applyEvent(drawn, {player:'self',type:'draw',tile:'wan-5'}), /出牌/);
});

test('hand initialization checks count and resets the old board while remaining undoable', () => {
  assert.throws(() => initializeGame(createGame(), {hand:HAND.slice(0,12),dealer:false}), /13/);
  assert.throws(() => initializeGame(createGame(), {hand:['wan-1','wan-1','wan-1','wan-1','wan-1',...HAND.slice(0,8)],dealer:false}), /4张/);
  const before = applyEvent(game(), {player:'left',type:'discard',tile:'wan-9'});
  const reset = initializeGame(before, {hand:[...HAND,'tong-5'],dealer:true});
  assert.equal(reset.players.left.discards.length, 0);
  assert.equal(reset.players.self.hand.length, 14);
  assert.equal(reset.drawnTile, 'tong-5');
  assert.deepEqual(undo(reset), before);
});

test('demo exposes only legal public information with no fifth tile and consistent hand sizes', () => {
  const demo = createDemoGame();
  assert.equal(demo.players.self.hand.length, 14);
  assert.equal(demo.drawnTile, 'tong-5');
  assert.equal(concealedCount(demo.players.left), 10);
  assert.equal(concealedCount(demo.players.top), 10);
  assert.equal(concealedCount(demo.players.right), 10);
  assert.ok(Object.values(knownCounts(demo)).every(n=>n<=4));
  for(const player of Object.values(demo.players)) assert.ok(player.melds.every(m=>!m.tile.startsWith(player.missing+'-')));
});

test('self concealed and added kong before drawing are rejected atomically',()=>{
  const closed=initializeGame(createGame(),{hand:['wan-9','wan-9','wan-9','wan-9',...HAND.slice(0,9)]});
  const snapshot=structuredClone(closed);
  assert.throws(()=>applyEvent(closed,{player:'self',type:'concealedKong',tile:'wan-9'}),/摸牌/);
  assert.deepEqual(closed,snapshot);
  let added=initializeGame(createGame(),{hand:['wan-9','wan-9','wan-9',...HAND.slice(0,10)]});
  added=applyEvent(added,{player:'left',type:'discard',tile:'wan-9'});
  added=applyEvent(added,{player:'self',type:'pung',tile:'wan-9',source:'left'});
  added=applyEvent(added,{player:'self',type:'discard',tile:'wan-1'});
  const before=structuredClone(added);
  assert.throws(()=>applyEvent(added,{player:'self',type:'addedKong',tile:'wan-9'}),/摸牌/);
  assert.deepEqual(added,before);
});

test('self pung and open kong while holding a draw are rejected atomically',()=>{
  for(const type of ['pung','openKong']){
    let before=initializeGame(createGame(),{hand:['wan-9','wan-9','wan-9',...HAND.slice(0,10)]});
    before=applyEvent(before,{player:'left',type:'discard',tile:'wan-9'});
    before=applyEvent(before,{player:'self',type:'draw',tile:'tong-9'});
    const snapshot=structuredClone(before);
    assert.throws(()=>applyEvent(before,{player:'self',type,tile:'wan-9',source:'left'}),/出牌/);
    assert.deepEqual(before,snapshot);
  }
});

test('all valid self kong types allow replacement draw then discard',()=>{
  for(const type of ['concealedKong','openKong','addedKong']){
    let before;
    if(type==='concealedKong') before=initializeGame(createGame(),{hand:['wan-9','wan-9','wan-9','wan-9',...HAND.slice(0,10)],dealer:true});
    else {
      before=initializeGame(createGame(),{hand:['wan-9','wan-9','wan-9',...HAND.slice(0,10)]});
      before=applyEvent(before,{player:'left',type:'discard',tile:'wan-9'});
      if(type==='addedKong'){
        before=applyEvent(before,{player:'self',type:'pung',tile:'wan-9',source:'left'});
        before=applyEvent(before,{player:'self',type:'discard',tile:'wan-1'});
        before=applyEvent(before,{player:'self',type:'draw',tile:'tong-9'});
      }
    }
    const kong=applyEvent(before,{player:'self',type,tile:'wan-9',source:'left'});
    assert.equal(kong.players.self.hand.length,10);
    assert.equal(kong.drawnTile,null);
    const drawn=applyEvent(kong,{player:'self',type:'draw',tile:'tong-8'});
    const after=applyEvent(drawn,{player:'self',type:'discard',tile:'tong-8'});
    assert.equal(after.players.self.hand.length,10);
    assert.equal(after.players.self.melds[0].type,type);
    assert.deepEqual(undo(after),drawn);
  }
});

test('self discard sorts the remaining hand by wan tiao tong and ascending rank',()=>{
  let before=initializeGame(createGame(),{hand:['tong-9','tiao-8','wan-7','tong-1','wan-2','tiao-1','wan-9','tong-3','tiao-4','wan-1','tiao-2','tong-2','wan-3']});
  before=applyEvent(before,{player:'self',type:'draw',tile:'tong-8'});
  const after=applyEvent(before,{player:'self',type:'discard',tile:'tong-8'});
  assert.deepEqual(after.players.self.hand,['wan-1','wan-2','wan-3','wan-7','wan-9','tiao-1','tiao-2','tiao-4','tiao-8','tong-1','tong-2','tong-3','tong-9']);
  assert.deepEqual(undo(after),before);
});
