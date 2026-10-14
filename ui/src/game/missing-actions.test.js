import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent} from './state.js';
import {getSelfResponses} from './responses.js';

const HAND=['tong-9','tong-9','tong-9','wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-1','tiao-2','tiao-3','tiao-4'];
const game=()=>initializeGame(createGame(),{hand:HAND,missing:{self:'tong',left:'tong',right:'tong',top:'tong'}});

test('every seat rejects every kind of missing-suit meld without changing the game',()=>{
  for(const player of ['self','left','right','top']){
    for(const type of ['pung','openKong','addedKong','concealedKong']){
      let state=game();
      if(type==='pung'||type==='openKong')state=applyEvent(state,{player:player==='left'?'right':'left',type:'discard',tile:'tong-9'});
      else state=applyEvent(state,{player,type:'draw',...(player==='self'?{tile:'tong-9'}:{})});
      const before=structuredClone(state);
      assert.throws(()=>applyEvent(state,{player,type,tile:'tong-9',source:player==='left'?'right':'left'}),/定缺/);
      assert.deepEqual(state,before);
    }
  }
});

test('a missing-suit discard is forbidden rather than an unresolved response',()=>{
  const state=applyEvent(game(),{player:'left',type:'discard',tile:'tong-9'});
  const responses=getSelfResponses(state);
  assert.ok(responses.options.every(option=>!option.enabled&&!option.pendingRule));
  for(const option of responses.options)assert.match(option.reason,/定缺/);
});

test('self draw wins on missing suit are rejected for all players',()=>{
  for(const player of ['self','left','right','top']){
    const state=applyEvent(game(),{player,type:'draw',...(player==='self'?{tile:'tong-9'}:{})});
    assert.throws(()=>applyEvent(state,{player,type:'win',winType:'selfDraw',tile:'tong-9'}),/定缺/);
  }
});
