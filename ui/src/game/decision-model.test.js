import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent,knownCounts} from './state.js';
import {observe} from './decision/observation.js';
import {enumerateActions} from './decision/actions.js';
import {sampleWorlds} from './decision/belief.js';

const READY=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=(hand=READY)=>initializeGame(createGame(),{hand,dealerSeat:'left',missing:{self:'tong',left:'tong',right:'tong',top:'tong'}});
test('observation whitelists own information and never copies hidden hands or future wall',()=>{
  const a=game();const b=structuredClone(a);
  b.players.left.hand=['wan-9'];b.futureWall=['wan-1'];b.history=[{secret:true}];b.players.left.secret=42;
  assert.deepEqual(observe(a),observe(b));
});
test('all legal discards clear missing suit first in both recommender and recorder',()=>{
  let s=game([...READY.slice(0,12),'tong-1']);
  s=applyEvent(s,{player:'left',type:'discard',tile:'wan-8'});
  s=applyEvent(s,{player:'self',type:'draw',tile:'tong-2'});
  const result=enumerateActions(observe(s));
  assert.equal(result.phase,'discard');
  assert.deepEqual(result.actions.filter(a=>a.type==='discard').map(a=>a.tile),['tong-1','tong-2']);
  assert.throws(()=>applyEvent(s,{player:'self',type:'discard',tile:'wan-1'}),/定缺/);
});
test('response candidates bind the live ID and allow nonmissing melds while holding missing tiles',()=>{
  let s=game(['wan-9','wan-9','tong-1',...READY.slice(0,10)]);
  s=applyEvent(s,{player:'left',type:'discard',tile:'wan-9'});
  const r=enumerateActions(observe(s));
  assert.equal(r.unresolved.length,0);
  assert.ok(r.actions.some(a=>a.type==='pung'));
  s.players.self.hand=s.players.self.hand.map(t=>t==='tong-1'?'tiao-9':t);
  const pung=enumerateActions(observe(s)).actions.find(a=>a.type==='pung');
  assert.equal(pung.event.discardId,s.discardResponse.id);assert.equal(pung.event.source,'left');
});
test('self kongs require a draw and replacement tiles',()=>{
  let s=game(['wan-9','wan-9','wan-9',...READY.slice(0,10)]);
  s=applyEvent(s,{player:'left',type:'discard',tile:'wan-8'});
  s=applyEvent(s,{player:'self',type:'draw',tile:'wan-9'});
  assert.ok(enumerateActions(observe(s)).actions.some(a=>a.type==='concealedKong'));
  s.wallRemaining=0;
  assert.ok(!enumerateActions(observe(s)).actions.some(a=>a.type.endsWith('Kong')));
});
test('frozen winners keep hidden tiles and every seeded world conserves all copies',()=>{
  let s=applyEvent(game(),{player:'left',type:'win',winType:'selfDraw',tile:'wan-8'});
  const observation=observe(s),result=sampleWorlds(observation,{seed:73,samples:12});
  assert.equal(result.reason,null);assert.equal(result.worlds.length,12);
  assert.deepEqual(result,sampleWorlds(observation,{seed:73,samples:12}));
  for(const w of result.worlds){
    assert.equal(w.hands.left.length,13);assert.equal(w.wall.length,s.wallRemaining);
    const counts={...knownCounts(s)};
    for(const tile of [...w.wall,...Object.values(w.hands).flat()])counts[tile]++;
    assert.ok(Object.values(counts).every(n=>n===4));
  }
});
test('one physical multi-win tile is counted once and malformed inventories disable sampling',()=>{
  let s=applyEvent(game(),{player:'left',type:'discard',tile:'wan-9'});
  s=applyEvent(s,{player:'right',type:'win',winType:'discard',source:'left',tile:'wan-9'});
  s=applyEvent(s,{player:'top',type:'win',winType:'discard',source:'left',tile:'wan-9'});
  assert.equal(sampleWorlds(observe(s),{seed:2,samples:1}).worlds.length,1);
  s.wallRemaining--;
  assert.match(sampleWorlds(observe(s),{seed:2,samples:1}).reason,/牌数|库存/);
});
test('sampling excludes a fabricated fifth copy and requests missing dealer bookkeeping',()=>{
  const s=game();s.players.left.discards.push({id:999,tile:'wan-1'});
  assert.match(sampleWorlds(observe(s),{samples:1}).reason,/库存|牌数/);
  const legacy=initializeGame(createGame(),{hand:READY,missing:{self:'tong'}});
  assert.match(sampleWorlds(observe(legacy),{samples:1}).reason,/庄家/);
});
