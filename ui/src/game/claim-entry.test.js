import test from 'node:test';
import assert from 'node:assert/strict';
import * as entry from './entry.js';
import {createGame,initializeGame,applyEvent} from './state.js';

const HAND=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=()=>initializeGame(createGame(),{hand:HAND,missing:{self:'tong',left:'tong',right:'tong',top:'tong'}});

test('pung, open kong and discard win automatically bind the current discard and source',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-8'});
  state=applyEvent(state,{player:'right',type:'discard',tile:'tiao-9'});
  for(const type of ['pung','openKong','win']){
    const chosen=entry.claimEntry({player:'top',tile:'wan-8',source:'left'},type,state);
    assert.equal(chosen.tile,'tiao-9');assert.equal(chosen.source,'right');
    assert.equal(chosen.discardId,state.discardResponse.id);
    if(type==='win')assert.equal(chosen.winType,'discard');
  }
});

test('an expired discard or own discard cannot supply a claim tile',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-8'});
  assert.equal(entry.claimEntry({player:'left'},'pung',state).tile,null);
  state=applyEvent(state,{player:'right',type:'draw'});
  assert.equal(entry.claimEntry({player:'top',tile:'wan-8'},'win',state).tile,null);
});

test('own self draw always binds the newly drawn face and never the latest discard',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-8'});
  state=applyEvent(state,{player:'self',type:'draw',tile:'wan-9'});
  const chosen=entry.selfDrawEntry({player:'self',tile:'wan-8',source:'left',discardId:2},state);
  assert.equal(chosen.tile,'wan-9');assert.equal(chosen.source,'');
  assert.equal(chosen.discardId,undefined);assert.equal(chosen.winType,'selfDraw');
  assert.equal(applyEvent(state,chosen).players.self.discards.at(-1).tile,'wan-9');
});

test('opponent self draw cannot invent its hidden face',()=>{
  const state=applyEvent(game(),{player:'right',type:'draw'});
  assert.equal(entry.selfDrawEntry({player:'right',tile:'wan-8'},state).tile,null);
});

test('manual pung and open kong cannot claim an older discard after another tile was played',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-8'});
  state=applyEvent(state,{player:'right',type:'discard',tile:'tiao-9'});
  const before=structuredClone(state);
  for(const type of ['pung','openKong'])assert.throws(()=>applyEvent(state,{player:'top',type,source:'left',tile:'wan-8'}),/当前.*弃牌/);
  assert.deepEqual(state,before);
});
