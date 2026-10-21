import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,initializeGame,applyEvent,undo,knownCounts} from './state.js';
import {getSelfResponses} from './responses.js';
import {afterRecord} from './entry.js';

const READY=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
const game=hand=>initializeGame(createGame(),{hand,missing:{self:'tong',left:'tong',top:'tong',right:'tong'}});
const discard=(state,tile,source='left')=>applyEvent(state,{player:source,type:'discard',tile});
const enabled=result=>{assert.ok(result);return result.options.filter(o=>o.enabled).map(o=>o.type);};

test('a matching pair offers pung with the exact current source and tile',()=>{
  const state=discard(game(['wan-9','wan-9',...READY.slice(0,11)]),'wan-9');
  const response=getSelfResponses(state);
  assert.deepEqual(enabled(response),['pung']);
  const option=response.options.find(o=>o.type==='pung');
  assert.equal(option.event.source,'left');assert.equal(option.event.tile,'wan-9');
  const after=applyEvent(state,option.event);
  assert.equal(after.players.self.melds[0].type,'pung');
  assert.equal(after.players.left.discards.length,0);
});
test('three matching concealed tiles offer both pung and open kong',()=>{
  const state=discard(game(['wan-9','wan-9','wan-9',...READY.slice(0,10)]),'wan-9');
  assert.deepEqual(enabled(getSelfResponses(state)),['pung','openKong']);
});
test('a completed four-melds-and-pair shape offers discard win and records its face in own river',()=>{
  const state=discard(game(READY),'wan-9');
  const response=getSelfResponses(state);
  assert.deepEqual(enabled(response),['win']);
  const after=applyEvent(state,response.options.find(o=>o.type==='win').event);
  assert.equal(after.players.self.won,true);
  assert.equal(after.players.self.discards.at(-1).kind,'win');
  assert.equal(after.players.self.discards.at(-1).tile,'wan-9');
  assert.equal(after.players.self.hand.length,13);
  assert.equal(knownCounts(after)['wan-9'],2);
});
test('seven pairs can offer win and pung on the same discard without choosing for the user',()=>{
  const hand=['wan-1','wan-1','wan-4','wan-4','tiao-1','tiao-1','tiao-4','tiao-4','tiao-7','tiao-7','wan-9','wan-9','wan-9'];
  assert.deepEqual(enabled(getSelfResponses(discard(game(hand),'wan-9'))),['win','pung','openKong']);
});
test('unmatched discards offer no actions and already-won or expired windows show no response',()=>{
  let state=discard(game(READY),'tong-8');
  assert.deepEqual(enabled(getSelfResponses(state)),[]);
  state=applyEvent(state,{player:'right',type:'draw'});
  assert.equal(getSelfResponses(state),null);
  state=applyEvent(game(READY),{player:'self',type:'draw',tile:'wan-9'});
  state=applyEvent(state,{player:'self',type:'win',winType:'selfDraw'});
  state=discard(state,'wan-8');
  assert.equal(getSelfResponses(state),null);
});
test('missing-suit melds stay forbidden while other-suit melds are allowed with missing tiles',()=>{
  const state=discard(game(['tong-9','tong-9',...READY.slice(0,11)]),'tong-9');
  assert.deepEqual(enabled(getSelfResponses(state)),[]);
  const response=getSelfResponses(discard(game(['wan-9','wan-9','tong-1',...READY.slice(0,10)]),'wan-9'));
  assert.deepEqual(enabled(response),['pung']);
  assert.equal(response.options.find(o=>o.type==='pung').pendingRule,false);
});
test('a winning discard remains available to other winners but not to meld responses',()=>{
  let state=discard(game(READY),'wan-9');
  state=applyEvent(state,{player:'right',type:'win',winType:'discard',source:'left',tile:'wan-9'});
  assert.deepEqual(enabled(getSelfResponses(state)),['win']);
});
test('passing a legal win blocks the same tile until the next self draw and can be undone',()=>{
  const before=discard(game(READY),'wan-9');
  let state=applyEvent(before,{player:'self',type:'pass'});
  assert.equal(getSelfResponses(state),null);
  assert.deepEqual(undo(state),before);
  state=discard(state,'wan-9','right');
  assert.deepEqual(enabled(getSelfResponses(state)),[]);
  assert.throws(()=>applyEvent(state,{player:'self',type:'win',winType:'discard',source:'right',tile:'wan-9'}),/过手胡/);
  state=applyEvent(state,{player:'self',type:'draw',tile:'wan-8'});
  state=applyEvent(state,{player:'self',type:'discard',tile:'wan-8'});
  state=discard(state,'wan-9','top');
  assert.deepEqual(enabled(getSelfResponses(state)),['win']);
});
test('continuing normal play without responding also records the passed winning tile',()=>{
  let state=discard(game(READY),'wan-9');
  state=applyEvent(state,{player:'right',type:'draw'});
  state=discard(state,'wan-9','right');
  assert.deepEqual(enabled(getSelfResponses(state)),[]);
});

test('passing resumes the actual next seat after the discarder rather than forcing own discard',()=>{
  const before=discard(game(READY),'wan-9','right');
  const state=applyEvent(before,{player:'self',type:'pass'});
  assert.deepEqual(afterRecord({player:'self',type:'pass'},state),{player:'top',type:'discard',tile:null,source:''});
});
test('all self-draw winning faces appear in the winner river without exposing other hidden faces',()=>{
  let state=applyEvent(game(READY),{player:'left',type:'draw'});
  state=applyEvent(state,{player:'left',type:'win',winType:'selfDraw',tile:'wan-8'});
  assert.equal(state.players.left.discards.at(-1).tile,'wan-8');
  assert.equal(state.players.left.discards.at(-1).kind,'win');
  assert.equal(state.players.left.hand,undefined);
  assert.equal(knownCounts(state)['wan-8'],1);
  state=applyEvent(state,{player:'self',type:'draw',tile:'wan-9'});
  state=applyEvent(state,{player:'self',type:'win',winType:'selfDraw'});
  assert.equal(state.players.self.discards.at(-1).tile,'wan-9');
  assert.equal(state.players.self.hand.length,13);
  assert.equal(knownCounts(state)['wan-9'],2);
});
test('shared discard winners each show a face while physical counts stay unchanged',()=>{
  let state=discard(game(READY),'wan-9');
  const counts=knownCounts(state);
  for(const player of ['top','self','right'])state=applyEvent(state,{player,type:'win',winType:'discard',source:'left',tile:'wan-9'});
  for(const player of ['top','self','right'])assert.equal(state.players[player].discards.at(-1).tile,'wan-9');
  assert.deepEqual(knownCounts(state),counts);
});

test('a stale action cannot claim an earlier discard after a newer response opens',()=>{
  let state=discard(game(['wan-9','wan-9',...READY.slice(0,11)]),'wan-9');
  const oldAction=getSelfResponses(state).options.find(o=>o.type==='pung').event;
  state=discard(state,'wan-9');
  const before=structuredClone(state);
  assert.throws(()=>applyEvent(state,oldAction),/响应/);
  assert.deepEqual(state,before);
});
