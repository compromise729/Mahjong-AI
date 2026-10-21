import test from 'node:test';
import assert from 'node:assert/strict';
import {winningHandValue} from './hand-value.js';
import {createGame,initializeGame,applyEvent,undo} from './state.js';
import {getSelfResponses,getSelfDrawResponse} from './responses.js';
import {analyzeDecision} from './decision/agent.js';

const READY=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=hand=>initializeGame(createGame(),{hand,missing:{self:'tong',left:'tong',top:'tong',right:'tong'}});
const handValue=(hand,melds=[],context={})=>winningHandValue(hand,melds,'tong',context);

test('bonuses multiply with every primary pattern and expose a reproducible breakdown',()=>{
  const pure=['wan-3','wan-4','wan-5','wan-6','wan-7','wan-8','wan-6','wan-7','wan-8','wan-5','wan-5'];
  const value=handValue(pure,[{type:'concealedKong',tile:'wan-2'}],{selfDraw:true,kongFlower:true});
  assert.equal(value.patternMultiplier,4);
  assert.deepEqual(value.bonuses.map(b=>b.name),['门前清','断幺九','自摸','杠上开花']);
  assert.equal(value.multiplier,64);
  assert.equal(value.fan,6);
});
test('dragon pairs exclude root bonuses and seven-pairs families never add closed-hand',()=>{
  const hand=['wan-2','wan-2','wan-2','wan-2','wan-5','wan-5','tiao-2','tiao-2','tiao-5','tiao-5','tiao-8','tiao-8','wan-8','wan-8'];
  const value=handValue(hand);
  assert.equal(value.name,'将龙七对');assert.equal(value.patternMultiplier,32);
  assert.equal(value.multiplier,64); // 将龙32 × 断幺九2，不再额外计根
  assert.equal(value.appliedRoots,0);
  assert.equal(value.bonuses.some(b=>b.name==='根'),false);
  assert.equal(value.bonuses.some(b=>b.name==='门前清'),false);
});
test('four kong families exclude roots and cap independent bonuses at 512',()=>{
  const melds=[{type:'concealedKong',tile:'wan-1'},{type:'openKong',tile:'wan-4'},{type:'addedKong',tile:'tiao-2'},{type:'concealedKong',tile:'tiao-5'}];
  const value=handValue(['wan-9','wan-9'],melds,{selfDraw:true,kongFlower:true});
  assert.equal(value.name,'十八罗汉');assert.equal(value.roots,0);
  assert.equal(value.appliedRoots,0);assert.equal(value.multiplier,512);
  assert.equal(value.bonuses.some(b=>b.name==='根'),false);
  const heavenly=handValue([...READY,'wan-9'],[],{selfDraw:true,heavenly:true});
  assert.equal(heavenly.multiplier,128);
  const capped=handValue(['wan-2','wan-2','wan-2','wan-2','wan-5','wan-5','tiao-2','tiao-2','tiao-5','tiao-5','tiao-8','tiao-8','wan-8','wan-8'],[],{selfDraw:true,earthly:true});
  assert.equal(capped.multiplier,512);assert.equal(capped.uncappedMultiplier,4096);assert.equal(capped.capped,true);
});
test('actual draw values recognize heavenly and kong flower while waits do not invent these events',()=>{
  const heavenly=initializeGame(createGame(),{hand:[...READY,'wan-9'],dealerSeat:'self',missing:{self:'tong'}});
  assert.equal(getSelfDrawResponse(heavenly).value.multiplier,128);
  const won=applyEvent(heavenly,getSelfDrawResponse(heavenly).event);
  assert.equal(won.players.self.win.value.multiplier,128);
  assert.deepEqual(undo(won),heavenly);
  let kong=initializeGame(createGame(),{hand:['wan-9','wan-9','wan-9','wan-9',...READY.slice(0,9),'tiao-9'],dealerSeat:'self',missing:{self:'tong'}});
  kong=applyEvent(kong,{player:'self',type:'concealedKong',tile:'wan-9'});
  kong=applyEvent(kong,{player:'self',type:'draw',tile:'tiao-9'});
  const response=getSelfDrawResponse(kong);
  assert.ok(response);assert.equal(response.value.multiplier,8);
  assert.ok(response.value.bonuses.some(b=>b.name==='杠上开花'));
});
test('held missing tiles permit other-suit pung and every kong is rejected without replacement tiles',()=>{
  let s=game(['wan-9','wan-9','tong-1',...READY.slice(0,10)]);
  s=applyEvent(s,{player:'left',type:'discard',tile:'wan-9'});
  const pung=getSelfResponses(s).options.find(o=>o.type==='pung');
  assert.equal(pung.enabled,true);assert.equal(pung.pendingRule,false);
  assert.ok(analyzeDecision(s,{samples:0,searchDepth:0}).candidates.some(c=>c.type==='pung'));
  let kong=initializeGame(createGame(),{hand:['wan-9','wan-9','wan-9','wan-9',...READY.slice(0,10)],dealerSeat:'self',missing:{self:'tong'}});
  kong.wallRemaining=0;
  assert.throws(()=>applyEvent(kong,{player:'self',type:'concealedKong',tile:'wan-9'}),/补牌|牌墙/);
});
test('known legal Hu is resolved before another player can claim pung',()=>{
  let s=game(READY);s=applyEvent(s,{player:'left',type:'discard',tile:'wan-9'});
  assert.throws(()=>applyEvent(s,{player:'right',type:'pung',tile:'wan-9',source:'left'}),/胡牌优先|先.*胡/);
  s=applyEvent(s,{player:'self',type:'pass'});
  assert.doesNotThrow(()=>applyEvent(s,{player:'right',type:'pung',tile:'wan-9',source:'left'}));
});
test('declining a self draw records the face and value and an ordinary draw clears it',()=>{
  let s=game(READY);s=applyEvent(s,{player:'self',type:'draw',tile:'wan-9'});
  const drawn=s;s=applyEvent(s,{player:'self',type:'discard',tile:'wan-9'});
  assert.ok(s.players.self.passedWins.includes('wan-9'));
  assert.equal(s.players.self.passedWinValues['wan-9'].multiplier,4);
  assert.deepEqual(undo(s),drawn);
  s=applyEvent(s,{player:'self',type:'draw',tile:'tiao-9'});
  assert.deepEqual(s.players.self.passedWins,[]);
});
test('a delayed added kong permits the passed face only when its actual Hu value increases',()=>{
  let s=game(['wan-1','wan-1','wan-2','wan-2','wan-3','wan-3','tiao-6','tiao-7','tiao-8','wan-9','wan-9','tong-1','tong-2']);
  for(const event of [
    {player:'left',type:'discard',tile:'wan-1'},
    {player:'self',type:'pung',tile:'wan-1',source:'left'},
    {player:'self',type:'discard',tile:'tong-1'},
    {player:'self',type:'draw',tile:'wan-1'},
    {player:'self',type:'discard',tile:'tong-2'},
    {player:'self',type:'draw',tile:'wan-4'},
  ])s=applyEvent(s,event);
  assert.equal(getSelfDrawResponse(s).value.multiplier,2);
  s=applyEvent(s,{player:'self',type:'addedKong',tile:'wan-1'});
  assert.equal(s.players.self.passedWinValues['wan-4'].multiplier,2);
  s=applyEvent(s,{player:'self',type:'draw',tile:'wan-4'});
  assert.ok(s.players.self.passedWins.includes('wan-4'));
  assert.equal(getSelfDrawResponse(s).value.multiplier,4);
  const result=analyzeDecision(s,{samples:0,searchDepth:0});
  assert.equal(result.recommendedAction.type,'win');
  assert.equal(applyEvent(s,getSelfDrawResponse(s).event).players.self.won,true);
});
test('kong replacement does not clear a passed face when losing a root offsets kong-flower bonus',()=>{
  let s=game(['wan-1','wan-1','wan-1','wan-1','wan-2','wan-2','wan-3','wan-3','tiao-6','tiao-7','tiao-8','wan-9','wan-9']);
  s=applyEvent(s,{player:'self',type:'draw',tile:'wan-4'});
  assert.equal(getSelfDrawResponse(s).value.multiplier,8);
  s=applyEvent(s,{player:'self',type:'concealedKong',tile:'wan-1'});
  const before=s;s=applyEvent(s,{player:'self',type:'draw',tile:'wan-4'});
  assert.ok(s.players.self.passedWins.includes('wan-4'));
  assert.equal(getSelfDrawResponse(s),null);
  assert.throws(()=>applyEvent(s,{player:'self',type:'win',winType:'selfDraw',tile:'wan-4'}),/过手胡/);
  assert.equal(analyzeDecision(s,{samples:0,searchDepth:0}).candidates.some(c=>c.type==='win'),false);
  assert.deepEqual(undo(s),before);
});
test('decision candidates use the same per-wait values without pretending these are net expected scores',()=>{
  let s=game(['wan-1','wan-1','wan-2','wan-2','wan-3','wan-3','wan-4','wan-4','wan-5','wan-5','wan-6','wan-6','wan-7']);
  s=applyEvent(s,{player:'self',type:'draw',tile:'wan-9'});
  const result=analyzeDecision(s,{samples:0,searchDepth:0});
  const discard=result.candidates.find(c=>c.type==='discard'&&c.tile==='wan-9');
  const seven=discard.handValues.waits.find(w=>w.tile==='wan-7');
  assert.equal(seven.value.multiplier,256);assert.equal(seven.selfDrawValue.multiplier,512);
  assert.equal(discard.handValues.maxMultiplier,256);assert.equal(discard.expectedNetScore,null);
});
test('earthly and last-wall bonuses need real matching events and dead-wall discard is not last-tile self draw',()=>{
  let earthly=initializeGame(createGame(),{hand:READY,dealerSeat:'left',missing:{self:'tong',left:'tong'}});
  earthly=applyEvent(earthly,{player:'left',type:'discard',tile:'wan-8'});
  earthly=applyEvent(earthly,{player:'self',type:'draw',tile:'wan-9'});
  const value=getSelfDrawResponse(earthly).value;
  assert.equal(value.multiplier,128);assert.ok(value.bonuses.some(b=>b.name==='地胡'));
  let last=game(READY);last.wallRemaining=1;
  last=applyEvent(last,{player:'self',type:'draw',tile:'wan-9'});
  assert.equal(getSelfDrawResponse(last).value.multiplier,8);
  assert.equal(handValue([...READY,'wan-9'],[],{lastTile:true}).multiplier,2);
});
test('impossible heavenly and kong-flower context cannot produce certified values',()=>{
  const hand=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-6','tiao-7','tiao-8','wan-9','wan-9'];
  assert.equal(handValue(hand,[{type:'concealedKong',tile:'tiao-2'}],{selfDraw:true,heavenly:true}),null);
  assert.equal(handValue([...READY,'wan-9'],[],{selfDraw:true,kongFlower:true}),null);
});

const dragonCases=[
  ['龙七对',8,[['wan-1',4],['wan-4',2],['tiao-2',2],['tiao-5',2],['tiao-8',2],['wan-9',2]]],
  ['双龙七对',16,[['wan-1',4],['wan-4',4],['tiao-2',2],['tiao-5',2],['tiao-8',2]]],
  ['三龙七对',32,[['wan-1',4],['wan-4',4],['tiao-1',4],['tiao-9',2]]],
  ['清龙七对',32,[['wan-1',4],['wan-2',2],['wan-4',2],['wan-6',2],['wan-8',2],['wan-9',2]]],
  ['清双龙七对',64,[['wan-1',4],['wan-4',4],['wan-6',2],['wan-8',2],['wan-9',2]]],
  ['清三龙七对',128,[['wan-1',4],['wan-4',4],['wan-8',4],['wan-9',2]]],
  ['将龙七对',64,[['wan-2',4],['wan-5',2],['tiao-2',2],['tiao-5',2],['tiao-8',2],['wan-8',2]]],
  ['将双龙七对',128,[['wan-2',4],['wan-5',4],['tiao-2',2],['tiao-5',2],['tiao-8',2]]],
  ['将三龙七对',256,[['wan-2',4],['wan-5',4],['tiao-2',4],['tiao-8',2]]],
];
for(const [name,multiplier,groups] of dragonCases)test(`${name} contains its quad value without adding roots again`,()=>{
  const value=handValue(groups.flatMap(([tile,n])=>Array(n).fill(tile)));
  assert.equal(value.name,name);assert.equal(value.multiplier,multiplier);
  assert.ok(value.roots>0);assert.equal(value.appliedRoots,0);
  assert.equal(value.bonuses.some(b=>b.name==='根'),false);
});

test('consecutive pairs from two through eight exclude no-terminal bonus before self-draw and cap',()=>{
  const hand=['wan-2','wan-2','wan-3','wan-3','wan-4','wan-4','wan-5','wan-5','wan-6','wan-6','wan-7','wan-7','wan-8','wan-8'];
  const value=handValue(hand),selfDraw=handValue(hand,[],{selfDraw:true});
  assert.equal(value.name,'连七对');assert.equal(value.multiplier,256);
  assert.equal(value.uncappedMultiplier,256);
  assert.equal(value.bonuses.some(b=>b.name==='断幺九'),false);
  assert.equal(selfDraw.multiplier,512);assert.equal(selfDraw.uncappedMultiplier,512);
});
