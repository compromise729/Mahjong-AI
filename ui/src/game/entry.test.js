import test from 'node:test';
import assert from 'node:assert/strict';
import * as entry from './entry.js';

test('discard recording advances left to self to right to top to left',()=>{
  let input={player:'left',type:'discard',tile:'wan-9',source:''};
  for(const [player,type] of [['self','draw'],['right','discard'],['top','discard'],['left','discard']]){
    input=entry.afterRecord({...input,type:'discard',tile:'wan-9'});
    assert.deepEqual(input,{player,type,tile:null,source:''});
  }
});
test('own draw switches to discard while pung and kong keep the acting seat',()=>{
  for(const [player,type,wantType] of [['self','draw','discard'],['self','pung','discard'],['self','openKong','draw'],['self','addedKong','draw'],['self','concealedKong','draw'],['left','pung','discard'],['right','openKong','draw']]){
    assert.deepEqual(entry.afterRecord({player,type,tile:'wan-9',source:'top'}),{player,type:wantType,tile:null,source:''});
  }
});
test('manual seat change clears tile and defaults own seat to draw and others to discard',()=>{
  const input={player:'top',type:'pung',tile:'wan-9',source:'right'};
  assert.deepEqual(entry.selectSeat(input,'self'),{player:'self',type:'draw',tile:null,source:'',discardId:undefined});
  assert.deepEqual(entry.selectSeat(input,'right'),{player:'right',type:'discard',tile:null,source:'',discardId:undefined});
});
