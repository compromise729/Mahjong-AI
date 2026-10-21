import test from 'node:test';
import assert from 'node:assert/strict';
import {shanten,handEfficiency} from './decision/efficiency.js';
import {isWinningHand} from './hand.js';
import {TILE_IDS} from './tiles.js';

const READY=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
test('exact distance recognizes ready, complete, and a forced missing-suit replacement',()=>{
  assert.equal(shanten(READY,[],'tong'),0);
  assert.equal(shanten([...READY,'wan-9'],[],'tong'),-1);
  assert.equal(shanten([...READY.slice(0,12),'tong-1'],[],'tong'),1);
  assert.equal(shanten(Array(13).fill('tong-1'),[],'tong'),Infinity);
});
test('seven pairs counts a concealed quad as two pairs and is disabled by melds',()=>{
  const hand=['wan-1','wan-1','wan-1','wan-1','wan-4','wan-4','tiao-2','tiao-2','tiao-5','tiao-5','tiao-8','tiao-8','wan-9'];
  assert.equal(handEfficiency(hand,[],'tong').sevenPairsShanten,0);
  assert.equal(shanten([...hand,'wan-9'],[],'tong'),-1);
  assert.equal(handEfficiency(['wan-9'],[{type:'pung',tile:'wan-1'},{type:'pung',tile:'wan-4'},{type:'pung',tile:'tiao-2'},{type:'pung',tile:'tiao-5'}],'tong').sevenPairsShanten,null);
});
test('golden hook and kong physical caps never propose a fifth tile',()=>{
  const melds=[{type:'openKong',tile:'wan-1'},{type:'pung',tile:'wan-4'},{type:'pung',tile:'tiao-2'},{type:'pung',tile:'tiao-5'}];
  assert.equal(shanten(['wan-9'],melds,'tong'),0);
  assert.equal(shanten(['wan-1'],melds,'tong'),Infinity);
  assert.deepEqual(handEfficiency(['wan-9'],melds,'tong').waits.map(w=>w.tile),['wan-9']);
});
test('effective unseen counts include opponents and exhausted waits remain structurally ready',()=>{
  const known=Object.fromEntries(TILE_IDS.map(t=>[t,READY.filter(x=>x===t).length]));
  const live=handEfficiency(READY,[],'tong',known);
  assert.equal(live.ukeire,3);
  assert.deepEqual(live.waits,[{tile:'wan-9',unseen:3}]);
  known['wan-9']=4;
  const dead=handEfficiency(READY,[],'tong',known);
  assert.equal(dead.shanten,0);assert.equal(dead.ukeire,0);
  assert.deepEqual(dead.waits,[{tile:'wan-9',unseen:0}]);
});
test('ready states agree with the independent existing winning-hand predicate',()=>{
  for(const tile of TILE_IDS){
    const hand=[...READY.slice(0,12),tile];
    const waits=TILE_IDS.filter(t=>isWinningHand([...hand,t],[],'tong'));
    assert.equal(shanten(hand,[],'tong')===0,waits.length>0);
  }
});
test('small concealed domain agrees with exhaustive enumeration of complete target hands',()=>{
  const melds=[{type:'pung',tile:'wan-7'},{type:'pung',tile:'tiao-7'},{type:'openKong',tile:'tiao-9'}];
  const allowed=TILE_IDS.filter(t=>!t.startsWith('tong'));
  const targets=[];
  for(const pair of allowed) for(const suit of ['wan','tiao']) for(let rank=1;rank<=9;rank++){
    for(const set of [[`${suit}-${rank}`,`${suit}-${rank}`,`${suit}-${rank}`],...(rank<=7?[[`${suit}-${rank}`,`${suit}-${rank+1}`,`${suit}-${rank+2}`]]:[])]){
      const target=[pair,pair,...set];
      if(isWinningHand(target,melds,'tong'))targets.push(target);
    }
  }
  for(let i=0;i<32;i++){
    const hand=Array.from({length:4},(_,j)=>allowed[(i*7+j*5+j*j)%allowed.length]);
    const physical=[...hand,...melds.flatMap(m=>Array(m.type==='pung'?3:4).fill(m.tile))];
    if(allowed.some(t=>physical.filter(x=>x===t).length>4))continue;
    const expected=Math.min(...targets.map(target=>allowed.reduce((sum,t)=>sum+Math.max(0,target.filter(x=>x===t).length-hand.filter(x=>x===t).length),0)))-1;
    assert.equal(shanten(hand,melds,'tong'),expected,hand.join(','));
  }
});
