import {TILE_IDS,SUIT_NAMES} from './tiles.js';

function canBeMelds(counts,memo) {
  const key=counts.join('');
  if(memo.has(key))return memo.get(key);
  const first=counts.findIndex(n=>n>0);
  if(first<0)return true;
  let ok=false;
  if(counts[first]>=3){counts[first]-=3;ok=canBeMelds(counts,memo);counts[first]+=3;}
  if(!ok&&first<=6&&counts[first+1]>0&&counts[first+2]>0){
    counts[first]--;counts[first+1]--;counts[first+2]--;
    ok=canBeMelds(counts,memo);
    counts[first]++;counts[first+1]++;counts[first+2]++;
  }
  memo.set(key,ok);return ok;
}

export function isWinningHand(hand,melds=[],missing=null) {
  if(!Array.isArray(hand)||!Array.isArray(melds)||melds.length>4||hand.length!==14-3*melds.length)return false;
  const counts=Array(27).fill(0),physical=Array(27).fill(0);
  for(const tile of hand){const index=TILE_IDS.indexOf(tile);if(index<0)return false;counts[index]++;physical[index]++;}
  for(const meld of melds){
    const index=TILE_IDS.indexOf(meld.tile);
    if(index<0||!['pung','openKong','addedKong','concealedKong'].includes(meld.type))return false;
    physical[index]+=meld.type==='pung'?3:4;
  }
  if(physical.some(n=>n>4))return false;
  const suits=Object.keys(SUIT_NAMES).filter((s,i)=>physical.slice(i*9,i*9+9).some(n=>n>0));
  if(suits.length>2||suits.includes(missing))return false;
  if(!melds.length&&counts.every(n=>n%2===0))return true;
  const memo=new Map();
  for(let i=0;i<27;i++){
    if(counts[i]<2)continue;
    counts[i]-=2;
    const ok=[0,9,18].every(start=>canBeMelds(counts.slice(start,start+9),memo));
    counts[i]+=2;
    if(ok)return true;
  }
  return false;
}
