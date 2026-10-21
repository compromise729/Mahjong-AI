import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent,knownCounts,undo} from './state.js';
import {analyzeDecision} from './decision/agent.js';
import {getSelfResponses} from './responses.js';
import {observe} from './decision/observation.js';
import {sampleWorlds} from './decision/belief.js';
import {selectSeat,afterRecord} from './entry.js';

const HAND=['wan-1','wan-2','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9','wan-9'];
function pending(){
  let s=initializeGame(createGame(),{hand:HAND,dealerSeat:'left',missing:{self:'tong',left:'tong',right:'tong',top:'tong'}});
  for(const event of [{player:'left',type:'discard',tile:'wan-3'},{player:'self',type:'pass'},{player:'right',type:'pung',tile:'wan-3',source:'left'},{player:'right',type:'discard',tile:'tong-1'},{player:'self',type:'draw',tile:'tong-2'},{player:'self',type:'discard',tile:'tong-2'},{player:'right',type:'draw'},{player:'right',type:'addedKong',tile:'wan-3'}])s=applyEvent(s,event);
  return s;
}
test('an actual added kong offers a legal rob-kong Hu before replacement',()=>{
  const s=pending(),r=analyzeDecision(s,{samples:0,searchDepth:0});
  assert.equal(s.players.right.melds[0].type,'pung');
  assert.equal(s.pendingKong.player,'right');
  assert.equal(r.recommendedAction.type,'win');assert.equal(r.recommendedAction.event.robKong,true);
  assert.deepEqual(getSelfResponses(s).options.filter(o=>o.enabled).map(o=>o.type),['win']);
  const entry=selectSeat({player:'right',type:'draw'},'self',s);
  assert.equal(entry.type,'win');assert.equal(entry.source,'right');
});
test('robbed kong keeps the original pung and supports multi-win physical deduplication and undo',()=>{
  const s=pending(),win=analyzeDecision(s,{samples:0,searchDepth:0}).recommendedAction.event;
  const first=applyEvent(s,win);
  assert.equal(first.players.self.won,true);assert.equal(first.pendingKong,null);
  assert.equal(first.players.right.melds[0].type,'pung');assert.equal(first.players.self.win.robKong,true);
  assert.deepEqual(undo(first),s);
  const second=applyEvent(first,{player:'top',type:'win',winType:'discard',source:'right',tile:'wan-3',discardId:first.discardResponse.id});
  assert.equal(knownCounts(second)['wan-3'],4);
  assert.equal(sampleWorlds(observe(second),{samples:1}).worlds.length,1);
});
test('passing rob-kong closes own same-face win and replacement commits the kong atomically',()=>{
  const before=pending(),passed=applyEvent(before,{player:'self',type:'pass',discardId:before.discardResponse.id});
  assert.ok(passed.players.self.passedWins.includes('wan-3'));
  assert.equal(afterRecord({player:'self',type:'pass'},passed).player,'right');
  const drawn=applyEvent(passed,{player:'right',type:'draw'});
  assert.equal(drawn.pendingKong,null);assert.equal(drawn.players.right.melds[0].type,'addedKong');
  assert.equal(drawn.wallRemaining,before.wallRemaining-1);assert.equal(knownCounts(drawn)['wan-3'],4);
  assert.deepEqual(undo(drawn),passed);
});
test('the exposed fourth tile cannot be punged or used for another kong',()=>{
  const s=pending();
  assert.throws(()=>applyEvent(s,{player:'top',type:'pung',source:'right',tile:'wan-3'}),/抢杠|响应/);
});
