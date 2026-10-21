import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,encodeAction} from '../sim/engine.mjs';
import {TILE_IDS} from '../../ui/src/game/tiles.js';
import {choose,visibleState} from '../sim/policies.mjs';
import {observation} from '../sim/observation.mjs';
import {observe} from '../../ui/src/game/decision/observation.js';

// Put specified hands in a physically valid state; fillers stay in wall.
function fixture(hands){
  const g=new Game({seed:0,mandatoryLastFourHu:false});
  g.wall=TILE_IDS.flatMap(t=>[t,t,t,t]);
  for(let s=0;s<4;s++){
    g.players[s].hand=[...(hands[s]??[])];
    g.players[s].missing='tong';
    for(const tile of g.players[s].hand){const i=g.wall.indexOf(tile);assert.ok(i>=0);g.wall.splice(i,1);}
  }
  g.initial=false;g.players.forEach(p=>p.discarded=true);
  return g;
}
const waiting=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-1','tiao-2','tiao-3','tiao-7','tiao-8','tiao-9','wan-9'];

test('two-player self draw only charges the remaining opponent',()=>{
  const g=fixture([[...waiting,'wan-9'],[],waiting,[]]);
  g.players[1].won=true;g.players[3].won=true;g.drawn='wan-9';
  const value=g.winValue(0,true).multiplier;
  g.step(135);
  assert.equal(g.done,true);
  assert.deepEqual(g.ledger.scores,[value,0,-value,0]);
});
test('two simultaneous winners end a three-player round without lost payments',()=>{
  const g=fixture([['wan-9'],waiting,waiting,[]]);
  g.players[3].won=true;g.drawn='wan-9';
  g.step(encodeAction({type:'discard',tile:'wan-9'}));
  assert.equal(g.actor,1);g.step(135);
  assert.equal(g.actor,2);g.step(135);
  assert.equal(g.done,true);
  assert.ok(g.ledger.scores[1]>0&&g.ledger.scores[2]>0);
  assert.equal(g.ledger.scores[0],-g.ledger.scores[1]-g.ledger.scores[2]);
});
test('robbed added kong keeps pung, cancels kong payment and preserves tiles',()=>{
  const hand=['wan-1','wan-2','wan-4','wan-5','wan-6','tiao-1','tiao-2','tiao-3','tiao-7','tiao-8','tiao-9','wan-9','wan-9'];
  const g=fixture([['wan-3'],hand,[],[]]);
  for(let i=0;i<3;i++)g.wall.splice(g.wall.indexOf('wan-3'),1);
  g.players[0].melds=[{type:'pung',tile:'wan-3',source:2,id:0}];
  g.drawn='wan-3';
  g.step(encodeAction({type:'addedKong',tile:'wan-3'}));
  const offer=g.pending.eventId;
  assert.ok(Number.isInteger(offer));
  assert.equal(g.actor,1);g.step(135);
  assert.equal(g.events.find(e=>e.type==='win').trigger,offer);
  assert.equal(g.events.find(e=>e.id===offer).type,'kongOffer');
  assert.equal(g.players[0].melds[0].type,'pung');
  assert.equal(g.ledger.kongFunds.length,0);
  assert.equal(g.players[1].won,true);
  g.assertValid();
});
test('passed same face is forbidden until normal draw; replacement preserves restriction',()=>{
  const g=fixture([[...waiting,'wan-9'],[],[],[]]);g.drawn='wan-9';
  assert.ok(g.winValue(0,true));g.recordPass(0,true);
  assert.equal(g.winValue(0,true),null);
  g.draw(0,true);assert.ok(g.players[0].passed['wan-9']);
  g.draw(0,false);assert.deepEqual(g.players[0].passed,{});
});
test('flower pig pays all three including a winner; repeated settlement is idempotent',()=>{
  const g=fixture([['tong-1'],waiting,[],[]]);
  g.players[2].won=true;g.players[3].won=true;
  g.finishDraw();
  assert.deepEqual(g.ledger.scores,[-192,64,64,64]);
  g.finishDraw();assert.deepEqual(g.ledger.scores,[-192,64,64,64]);
});
test('teacher receives no opponent hand and runs a complete seeded game',()=>{
  const g=new Game({seed:19});
  const state=visibleState(g,g.actor);
  assert.equal(state.players.right.hand,undefined);
  let stages=new Set();
  while(!g.done){
    stages.add(g.active().length);
    g.step(choose(g,'teacher',g.random,{samples:0,searchDepth:0}));
    assert.ok(observation(g,0).every(Number.isFinite));
  }
  assert.equal(g.ledger.scores.reduce((a,b)=>a+b,0),0);
  assert.ok(stages.has(4));
});
test('teacher counts an exited self-draw winner tile as public, not concealed',()=>{
  const g=fixture([[...waiting,'wan-9'],waiting,[],[]]);g.drawn='wan-9';
  g.finishWins([0],0,true);
  const o=observe(visibleState(g,1));
  assert.equal(o.known['wan-9'],2); // learner's one + winner's exposed one
  assert.equal(o.concealed.left,13);
});
test('response observation never exposes the discarder private drawn tile',()=>{
  const g=fixture([['wan-9','wan-8'],waiting,[],[]]);
  g.drawn='wan-8';g.step(encodeAction({type:'discard',tile:'wan-9'}));
  assert.equal(g.phase,'response');
  assert.equal(g.actor,1);
  const a=observation(g,1);
  g.drawn='wan-7'; // Same public state; another possible private draw.
  assert.deepEqual(observation(g,1),a);
});
