import test from 'node:test';
import assert from 'node:assert/strict';
import {winningHandValue} from './hand-value.js';
import {analyzeWaitValues} from './waits.js';
import {createGame,initializeGame,applyEvent} from './state.js';

const READY=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=hand=>initializeGame(createGame(),{hand,missing:{self:'tong'}});
const value=(hand,melds=[])=>winningHandValue(hand,melds,'tong');

test('wait values include confirmed bonuses and show ordinary self-draw separately',()=>{
  const r=analyzeWaitValues(game(READY));
  assert.equal(r.waits[0].value.multiplier,2);
  assert.equal(r.waits[0].value.name,'平胡');
  assert.equal(r.waits[0].value.scope,'hand');
  assert.equal(r.waits[0].selfDrawValue.multiplier,4);
  const drawn=applyEvent(game(READY),{player:'self',type:'draw',tile:'tiao-9'});
  assert.equal(analyzeWaitValues(drawn,{discardTile:'tiao-9'}).waits[0].value.multiplier,2);
});
test('different waits on the same hand get their own completed-hand multiplier',()=>{
  const hand=['wan-1','wan-1','wan-2','wan-2','wan-3','wan-3','wan-4','wan-4','wan-5','wan-5','wan-6','wan-6','wan-7'];
  assert.deepEqual(analyzeWaitValues(game(hand)).waits.map(({tile,value})=>[tile,value.multiplier]),[
    ['wan-1',8],['wan-4',8],['wan-7',256],
  ]);
});
test('pairs, dragons and consecutive pairs use their explicit combined multipliers',()=>{
  const simple=['wan-1','wan-1','wan-4','wan-4','wan-7','wan-7','tiao-2','tiao-2','tiao-5','tiao-5','tiao-8','tiao-8','wan-9','wan-9'];
  assert.equal(value(simple).multiplier,4);
  const dragon=['wan-1','wan-1','wan-1','wan-1','wan-4','wan-4','tiao-2','tiao-2','tiao-5','tiao-5','tiao-8','tiao-8','wan-9','wan-9'];
  assert.equal(value(dragon).multiplier,8);assert.equal(value(dragon).roots,1);
  const double=['wan-1','wan-1','wan-1','wan-1','wan-4','wan-4','wan-4','wan-4','tiao-2','tiao-2','tiao-5','tiao-5','tiao-8','tiao-8'];
  assert.equal(value(double).multiplier,16);
  const consecutive=Array.from({length:7},(_,i)=>[`wan-${i+1}`,`wan-${i+1}`]).flat();
  assert.equal(value(consecutive).multiplier,256);
  assert.equal(value(consecutive).name,'连七对');
});
test('all triplets and golden-hook combinations include exposed meld suits',()=>{
  const mixed=['wan-1','wan-1','wan-1','wan-4','wan-4','wan-4','tiao-2','tiao-2','tiao-2','tiao-5','tiao-5','tiao-5','wan-9','wan-9'];
  assert.equal(value(mixed).name,'碰碰胡');assert.equal(value(mixed).multiplier,4);
  const pure=mixed.map(t=>t.replace('tiao','wan'));
  assert.equal(value(pure).multiplier,16);assert.equal(value(pure).name,'清碰');
  const melds=[{type:'pung',tile:'wan-1'},{type:'openKong',tile:'wan-4'},{type:'pung',tile:'tiao-2'},{type:'pung',tile:'tiao-5'}];
  assert.equal(value(['wan-9','wan-9'],melds).multiplier,4);
  assert.equal(value(['wan-9','wan-9'],melds.map(m=>({...m,tile:m.tile.replace('tiao','wan')}))).multiplier,16);
});
test('terminal pattern needs a terminal in every group and the pair',()=>{
  const valid=['wan-1','wan-2','wan-3','wan-7','wan-8','wan-9','tiao-1','tiao-2','tiao-3','tiao-7','tiao-8','tiao-9','wan-1','wan-1'];
  assert.equal(value(valid).name,'幺九');assert.equal(value(valid).multiplier,8);
  const invalid=valid.map((t,i)=>i<3?`wan-${i+2}`:t);
  assert.notEqual(value(invalid).name,'幺九');
});
test('nine gates and four-kong special patterns respect physical and exposure restrictions',()=>{
  const nine=['wan-1','wan-1','wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','wan-7','wan-8','wan-9','wan-9','wan-9','wan-5'];
  assert.equal(value(nine).name,'九莲宝灯');assert.equal(value(nine).multiplier,128);
  const melds=[{type:'concealedKong',tile:'wan-1'},{type:'openKong',tile:'wan-4'},{type:'addedKong',tile:'tiao-2'},{type:'concealedKong',tile:'tiao-5'}];
  assert.equal(value(['wan-9','wan-9'],melds).multiplier,128);
  assert.equal(value(['wan-9','wan-9'],melds.map(m=>({...m,tile:m.tile.replace('tiao','wan')}))).multiplier,512);
  assert.equal(value(['wan-1','wan-1'],melds),null);
});
test('closed-hand and no-terminal bonuses multiply while invalid hands have no value',()=>{
  const hand=['wan-2','wan-3','wan-4','wan-2','wan-3','wan-4','tiao-2','tiao-3','tiao-4','tiao-5','tiao-6','tiao-7','wan-5','wan-5'];
  assert.equal(value(hand).multiplier,4);
  assert.equal(value(READY),null);
  assert.equal(winningHandValue([...READY,'wan-9'],[],'wan'),null);
});
test('concealed kongs permit closed-hand value but exposed melds do not',()=>{
  const hand=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-6','tiao-7','tiao-8','wan-9','wan-9'];
  assert.equal(value(hand,[{type:'concealedKong',tile:'tiao-2'}]).multiplier,2);
  assert.equal(value(hand,[{type:'openKong',tile:'tiao-2'}]).multiplier,1);
  assert.equal(value(hand,[{type:'concealedKong',tile:'tiao-2'}]).roots,0);
});
