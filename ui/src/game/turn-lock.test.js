import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent,undo} from './state.js';
import {selectSeat,afterRecord} from './entry.js';

const HAND=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=()=>initializeGame(createGame(),{hand:HAND,missing:{self:'tong',left:'tong',right:'tong',top:'tong'}});

test('a draw locks all other seats until that player discards, for every seat',()=>{
  for(const player of ['self','left','right','top']){
    const drawn=applyEvent(game(),{player,type:'draw',...(player==='self'?{tile:'wan-9'}:{})});
    const before=structuredClone(drawn);
    for(const other of ['self','left','right','top'].filter(id=>id!==player)){
      for(const action of [{type:'draw',...(other==='self'?{tile:'wan-8'}:{})},{type:'discard',tile:'wan-8'},{type:'concealedKong',tile:'wan-8'},{type:'win',winType:'selfDraw',tile:'wan-8'}]){
        assert.throws(()=>applyEvent(drawn,{player:other,...action}),/先.*出牌/);
        assert.deepEqual(drawn,before);
      }
      const entry={player,type:'discard',tile:'wan-9',source:''};
      assert.deepEqual(selectSeat(entry,other,drawn),entry);
    }
    const discarded=applyEvent(drawn,{player,type:'discard',tile:'wan-9'});
    const other=player==='left'?'right':'left';
    assert.doesNotThrow(()=>applyEvent(discarded,{player:other,type:'draw'}));
    assert.deepEqual(undo(discarded),drawn);
  }
});

test('selecting the player who already drew keeps discard selected',()=>{
  const drawn=applyEvent(game(),{player:'self',type:'draw',tile:'wan-9'});
  assert.equal(selectSeat({player:'self',type:'win'},'self',drawn).type,'discard');
});

test('dealer must finish the initial fourteen-tile turn before another player acts',()=>{
  const dealer=initializeGame(createGame(),{hand:[...HAND,'wan-9'],dealer:true});
  assert.throws(()=>applyEvent(dealer,{player:'left',type:'draw'}),/先.*出牌/);
  const discarded=applyEvent(dealer,{player:'self',type:'discard',tile:'wan-9'});
  assert.doesNotThrow(()=>applyEvent(discarded,{player:'left',type:'draw'}));
});

test('a self-draw win ends the pending turn and allows the next active player',()=>{
  let state=applyEvent(game(),{player:'self',type:'draw',tile:'wan-9'});
  state=applyEvent(state,{player:'self',type:'win',winType:'selfDraw'});
  assert.doesNotThrow(()=>applyEvent(state,{player:'right',type:'draw'}));
});

test('pung also reserves its mandatory discard and kong reserves replacement draw',()=>{
  let state=applyEvent(game(),{player:'left',type:'discard',tile:'wan-8'});
  state=applyEvent(state,{player:'top',type:'pung',source:'left',tile:'wan-8'});
  assert.throws(()=>applyEvent(state,{player:'right',type:'draw'}),/先.*出牌/);
  state=applyEvent(state,{player:'top',type:'discard',tile:'wan-7'});
  state=applyEvent(state,{player:'top',type:'draw'});
  state=applyEvent(state,{player:'top',type:'addedKong',tile:'wan-8'});
  assert.throws(()=>applyEvent(state,{player:'right',type:'draw'}),/先.*出牌/);
  assert.equal(afterRecord({player:'top',type:'addedKong'},state).type,'draw');
  state=applyEvent(state,{player:'top',type:'draw'});
  state=applyEvent(state,{player:'top',type:'discard',tile:'wan-7'});
  assert.doesNotThrow(()=>applyEvent(state,{player:'right',type:'draw'}));
});
