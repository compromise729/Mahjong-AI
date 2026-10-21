import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent} from './state.js';
import {observe} from './decision/observation.js';
import {analyzeRisk} from './decision/risk.js';
import {analyzeDecision} from './decision/agent.js';

const READY=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=(hand=READY)=>initializeGame(createGame(),{hand,dealerSeat:'left',missing:{self:'tong',left:'tong',right:'tong',top:'tong'}});
const options={samples:16,searchDepth:0,timeBudgetMs:10000,seed:42};
test('draw recommendation favors useful tenpai, explains evidence, and never invents payoff',()=>{
  let s=applyEvent(game(),{player:'left',type:'discard',tile:'wan-8'});
  s=applyEvent(s,{player:'self',type:'draw',tile:'tiao-9'});
  const r=analyzeDecision(s,options);
  assert.equal(r.status,'ready');assert.equal(r.recommendedAction.tile,'wan-9');
  assert.equal(r.recommendedAction.efficiency.shanten,0);
  assert.deepEqual(r.recommendedAction.efficiency.waits.map(w=>w.tile),['tiao-6','tiao-9']);
  assert.equal(r.recommendedAction.efficiency.ukeire,6);
  assert.equal(r.expectedNetScore,null);assert.ok(r.recommendedAction.reasons.length);
  assert.ok(r.candidates.every(c=>c.expectedNetScore===null));
});
test('legal Hu is preferred while passed same-face wins remain blocked',()=>{
  let s=applyEvent(game(),{player:'left',type:'discard',tile:'wan-9'});
  assert.equal(analyzeDecision(s,options).recommendedAction.type,'win');
  s=applyEvent(s,{player:'self',type:'pass'});
  s=applyEvent(s,{player:'right',type:'discard',tile:'wan-9'});
  assert.ok(!analyzeDecision(s,options).candidates.some(c=>c.type==='win'));
});
test('pung alternatives include the mandatory follow-up discard and pass',()=>{
  let s=game(['wan-9','wan-9',...READY.slice(0,11)]);
  s=applyEvent(s,{player:'left',type:'discard',tile:'wan-9'});
  const r=analyzeDecision(s,options),p=r.candidates.find(c=>c.type==='pung');
  assert.ok(p);assert.equal(p.followUp.type,'discard');
  assert.equal(p.event.discardId,s.discardResponse.id);
  assert.ok(r.candidates.some(c=>c.type==='pass'));
});
test('concealed kong exposes conditional income and replacement evaluation',()=>{
  let s=game(['wan-9','wan-9','wan-9',...READY.slice(0,10)]);
  s=applyEvent(s,{player:'left',type:'discard',tile:'wan-8'});
  s=applyEvent(s,{player:'self',type:'draw',tile:'wan-9'});
  const r=analyzeDecision(s,{...options,searchDepth:2}),kong=r.candidates.find(c=>c.type==='concealedKong');
  assert.ok(kong);assert.equal(kong.kongIncome.multiplier,6);
  assert.match(kong.kongIncome.label,/成功/);
  assert.ok(kong.followUp.replacementRequired);
});
test('a real added-kong candidate separately evaluates rob-kong threat',()=>{
  let s=game(['wan-9','wan-9',...READY.slice(0,11)]);
  s=applyEvent(s,{player:'left',type:'discard',tile:'wan-9'});
  s=applyEvent(s,{player:'self',type:'pung',source:'left',tile:'wan-9'});
  s=applyEvent(s,{player:'self',type:'discard',tile:'tiao-7'});
  s=applyEvent(s,{player:'self',type:'draw',tile:'wan-9'});
  const c=analyzeDecision(s,options).candidates.find(x=>x.type==='addedKong');
  assert.ok(c);assert.equal(c.riskEvidence.kind,'robKong');
  assert.equal(c.kongIncome.multiplier,3);assert.equal(c.followUp.drawFrom,'tail');
});
test('last four tiles force legal Hu instead of offering pass or discard',()=>{
  let s=applyEvent(game(),{player:'left',type:'discard',tile:'wan-9'});
  s.wallRemaining=3;
  assert.deepEqual(analyzeDecision(s,{...options,samples:0}).candidates.map(c=>c.type),['win']);
});
test('risk recognizes shared-world double wins, missing-suit immunity and no permanent furiten',()=>{
  const s=game();s.pendingPlayer=null;s.players.left.hasDrawn=false;
  s.players.left.discards.push({id:999,tile:'wan-9'});
  const o=observe(s),w={hands:{left:READY,top:READY,right:READY},wall:[]};
  const evidence=analyzeRisk(o,[w],'wan-9');
  assert.equal(evidence.anyHits,1);assert.equal(evidence.multiHits,1);
  assert.equal(evidence.opponents.find(p=>p.id==='left').hits,1);
  s.players.left.missing='wan';s.players.top.won=true;s.players.right.won=true;
  const immune=analyzeRisk(observe(s),[w],'wan-9');
  assert.equal(immune.index,0);assert.equal(immune.anyHits,0);
});
test('no sample hit is not a safe tile and results are seeded and hidden-state invariant',()=>{
  let s=applyEvent(game(),{player:'left',type:'discard',tile:'wan-8'});
  s=applyEvent(s,{player:'self',type:'draw',tile:'tiao-9'});
  const a=analyzeDecision(s,options),changed=structuredClone(s);
  changed.players.left.hand=READY;changed.wall=['tong-9'];
  const b=analyzeDecision(changed,options);
  assert.deepEqual(a.candidates,b.candidates);
  assert.ok(a.candidates.filter(c=>c.riskEvidence.samples>0&&c.riskEvidence.anyHits===0).every(c=>/仍可能/.test(c.riskEvidence.note)));
});
test('unsupported payoff mode and invalid or zero budgets degrade explicitly',()=>{
  const s=game();
  assert.equal(analyzeDecision(s,{mode:'payoffRollout'}).status,'needsInformation');
  s.pendingPlayer=null;s.players.left.hasDrawn=false;
  const drawn=applyEvent(s,{player:'self',type:'draw',tile:'wan-9'});
  const r=analyzeDecision(drawn,{samples:0,searchDepth:0});
  assert.equal(r.recommendedAction.type,'win');assert.ok(r.limitations.some(x=>/采样/.test(x)));
  assert.equal(analyzeDecision(drawn,{samples:-3}).status,'invalid');
});
