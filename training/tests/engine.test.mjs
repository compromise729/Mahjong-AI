import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, ACTIONS, encodeAction} from '../sim/engine.mjs';
import {Ledger} from '../sim/ledger.mjs';
import {observation} from '../sim/observation.mjs';

test('seeded full games preserve physical tiles and zero-sum score',()=>{
  for(let seed=0;seed<12;seed++){
    const game=new Game({seed});
    const same=new Game({seed});
    assert.deepEqual(game.players,same.players);
    let n=0;
    while(!game.done){
      game.assertValid();
      const legal=game.legalActions();
      assert.ok(legal.length);
      const action=legal.find(a=>a.type==='win')??legal[Math.floor(game.random()*legal.length)];
      game.step(encodeAction(action));
      assert.ok(++n<1500);
    }
    game.assertValid();
    assert.equal(game.ledger.scores.reduce((a,b)=>a+b,0),0);
  }
});

test('four -> three -> two players: ordinary and replacement draws skip winners',()=>{
  const g=new Game({seed:2});
  g.players[1].won=true; g.players[3].won=true;
  assert.deepEqual(g.active(),[0,2]);
  assert.equal(g.next(0),2); assert.equal(g.next(2),0);
  assert.equal(g.next(3),0);
  const before=g.wall.length;
  const expected=g.wall.at(-1);
  g.draw(2,true);
  assert.equal(g.drawn,expected);
  assert.equal(g.wall.length,before-1);
  assert.equal(g.actor,2);
});

test('winning exits one seat without ending three or two player games',()=>{
  const g=new Game({seed:3});
  const value={multiplier:8};
  g.finishWins([0],0,true,value);
  assert.equal(g.active().length,3); assert.equal(g.done,false);
  g.finishWins([2],2,true,value);
  assert.equal(g.active().length,2); assert.equal(g.done,false);
  g.finishWins([3],3,true,value);
  assert.equal(g.done,true);
  assert.equal(g.ledger.scores.reduce((a,b)=>a+b,0),0);
});

test('multi-ron resumes after furthest winner, not response arrival order',()=>{
  const g=new Game({seed:4});
  g.pending={source:0,tile:'wan-1',rob:false,afterKong:false};
  g.finishWins([3,1],0,false,{multiplier:2});
  assert.deepEqual(g.active(),[0,2]);
  assert.equal(g.actor,0);
  assert.equal(g.done,false);
});

test('kong payments exclude winners and transfer/refund cannot double spend',()=>{
  const l=new Ledger();
  const entries=l.kong('concealedKong',0,null,[0,2,3],1);
  assert.deepEqual(l.scores,[4,0,-2,-2]);
  l.transfer(entries,2,2);
  l.refund(0,3);
  assert.deepEqual(l.scores,[0,0,2,-2]);
  l.refund(2,4);
  assert.deepEqual(l.scores,[0,0,0,0]);
  l.refund(2,5);
  assert.deepEqual(l.scores,[0,0,0,0]);
});

test('public observation hides opponents and future wall and records active seats',()=>{
  const g=new Game({seed:6}),before=observation(g,0);
  [g.players[1].hand[0],g.wall[0]]=[g.wall[0],g.players[1].hand[0]];
  assert.deepEqual(observation(g,0),before);
  assert.equal(g.mask().length,ACTIONS);
  assert.throws(()=>g.step(-1),/action/i);
  assert.throws(()=>g.step(999),/action/i);
});
