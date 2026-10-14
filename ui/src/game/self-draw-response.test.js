import test from 'node:test';
import assert from 'node:assert/strict';
import * as responses from './responses.js';
import {createGame,initializeGame,applyEvent,undo} from './state.js';

const HAND=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=()=>initializeGame(createGame(),{hand:HAND,missing:{self:'tong',left:'tong'}});

test('a legal own drawn win offers the actual drawn face and its executable Hu event',()=>{
  const drawn=applyEvent(game(),{player:'self',type:'draw',tile:'wan-9'});
  const response=responses.getSelfDrawResponse(drawn);
  assert.equal(response.tile,'wan-9');
  const won=applyEvent(drawn,response.event);
  assert.equal(won.players.self.discards.at(-1).tile,'wan-9');
  assert.equal(responses.getSelfDrawResponse(won),null);
  assert.equal(responses.getSelfDrawResponse(undo(won)).tile,'wan-9');
});

test('self draw prompts stay hidden before drawing, for nonwinning draws and missing-suit draws',()=>{
  assert.equal(responses.getSelfDrawResponse(game()),null);
  for(const tile of ['wan-8','tong-9'])assert.equal(responses.getSelfDrawResponse(applyEvent(game(),{player:'self',type:'draw',tile})),null);
  assert.equal(responses.getSelfDrawResponse(applyEvent(game(),{player:'left',type:'draw'})),null);
});
