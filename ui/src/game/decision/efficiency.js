import {TILE_IDS,SUIT_NAMES} from '../tiles.js';

const SUITS=Object.keys(SUIT_NAMES),INDEX=new Map(TILE_IDS.map((t,i)=>[t,i]));
const suitCache=new Map(),distanceCache=new Map();
function memo(cache,key,value,max=10000){if(cache.size>=max)cache.clear();cache.set(key,value);return value;}

// Each rank consumes sequences started at the previous two ranks. The DP
// enumerates legal complete targets, not heuristic partial-hand groupings.
function suitCosts(counts,caps,maxM,tripletsOnly=false){
  const key=`${counts.join('')}/${caps.join('')}/${maxM}/${+tripletsOnly}`;
  if(suitCache.has(key))return suitCache.get(key);
  let states=new Map([[0,0]]);
  for(let rank=0;rank<9;rank++){
    const next=new Map();
    for(const [encoded,cost] of states){
      const prev=encoded%5,prev2=Math.floor(encoded/5)%5,m=Math.floor(encoded/25)%5,p=Math.floor(encoded/125);
      const room=caps[rank]-prev-prev2;
      if(room<0)continue;
      const maxSeq=rank<=6&&!tripletsOnly?Math.min(room,maxM-m):0;
      for(let seq=0;seq<=maxSeq;seq++)for(let trip=0;trip<=1;trip++)for(let pair=0;pair<=1-p;pair++){
        const target=prev+prev2+seq+trip*3+pair*2,groups=m+seq+trip;
        if(target>caps[rank]||groups>maxM)continue;
        const k=seq+prev*5+groups*25+(p+pair)*125;
        const value=cost+Math.max(0,target-counts[rank]);
        if(value<(next.get(k)??Infinity))next.set(k,value);
      }
    }
    states=next;
  }
  const table=Array.from({length:maxM+1},()=>[Infinity,Infinity]);
  for(const [k,cost] of states){const m=Math.floor(k/25)%5,p=Math.floor(k/125);table[m][p]=Math.min(table[m][p],cost);}
  return memo(suitCache,key,table);
}

function encode(hand,melds,missing){
  if(!Array.isArray(hand)||!Array.isArray(melds)||melds.length>4||missing&&!SUITS.includes(missing))return null;
  if(![13-3*melds.length,14-3*melds.length].includes(hand.length))return null;
  const counts=Array(27).fill(0),caps=Array(27).fill(4);
  for(const tile of hand){const i=INDEX.get(tile);if(i===undefined)return null;counts[i]++;}
  for(const m of melds){const i=INDEX.get(m.tile);if(i===undefined||!['pung','openKong','addedKong','concealedKong'].includes(m.type)||m.tile.startsWith(`${missing}-`))return null;caps[i]-=m.type==='pung'?3:4;}
  if(counts.some((n,i)=>n>caps[i]||caps[i]<0))return null;
  return {counts,caps,need:4-melds.length,allowed:SUITS.map((s,i)=>s===missing?-1:i).filter(i=>i>=0)};
}
function standardCost(data,allowed=data.allowed,tripletsOnly=false){
  let best=Infinity;
  // With no declared missing suit, examine each permissible two-suit target.
  const combinations=allowed.length===3?[[0,1],[0,2],[1,2]]:[allowed];
  for(const suits of combinations){
    let total=Array.from({length:data.need+1},()=>[Infinity,Infinity]);total[0][0]=0;
    for(const suit of suits){
      const local=suitCosts(data.counts.slice(suit*9,suit*9+9),data.caps.slice(suit*9,suit*9+9),data.need,tripletsOnly);
      const next=Array.from({length:data.need+1},()=>[Infinity,Infinity]);
      for(let m=0;m<=data.need;m++)for(let p=0;p<=1;p++)for(let n=0;m+n<=data.need;n++)for(let q=0;p+q<=1;q++)next[m+n][p+q]=Math.min(next[m+n][p+q],total[m][p]+local[n][q]);
      total=next;
    }
    best=Math.min(best,total[data.need][1]);
  }
  return best;
}
function pairsCost(data,allowed=data.allowed){
  if(data.need!==4)return Infinity;
  if(allowed.length===3)return Math.min(...[[0,1],[0,2],[1,2]].map(s=>pairsCost(data,s)));
  let dp=Array(8).fill(Infinity);dp[0]=0;
  for(const s of allowed)for(let i=s*9;i<s*9+9;i++){
    const next=Array(8).fill(Infinity);
    for(let n=0;n<=7;n++)for(let p=0;p<=Math.floor(data.caps[i]/2)&&p+n<=7;p++)next[n+p]=Math.min(next[n+p],dp[n]+Math.max(0,p*2-data.counts[i]));
    dp=next;
  }
  return dp[7];
}
function distances(hand,melds,missing){
  const data=encode(hand,melds,missing);
  if(!data)return {shanten:Infinity,standardShanten:Infinity,sevenPairsShanten:null};
  const key=`${data.counts.join('')}/${data.caps.join('')}/${data.need}/${missing??''}`;
  if(distanceCache.has(key))return distanceCache.get(key);
  const standardShanten=standardCost(data)-1,sevenPairsShanten=melds.length?null:pairsCost(data)-1;
  return memo(distanceCache,key,{shanten:Math.min(standardShanten,sevenPairsShanten??Infinity),standardShanten,sevenPairsShanten});
}
export function shanten(hand,melds=[],missing=null){return distances(hand,melds,missing).shanten;}

export function handEfficiency(hand,melds=[],missing=null,known=null){
  const result={...distances(hand,melds,missing),ukeire:0,waits:[],improvingTiles:[],routes:[]};
  const data=encode(hand,melds,missing);if(!data)return result;
  result.routes.push({name:'普通胡',shanten:result.standardShanten});
  if(!melds.length)result.routes.push({name:'七对',shanten:result.sevenPairsShanten});
  result.routes.push({name:'碰碰胡',shanten:standardCost(data,data.allowed,true)-1});
  const meldSuits=new Set(melds.map(m=>Math.floor(INDEX.get(m.tile)/9)));
  const pure=data.allowed.filter(s=>!meldSuits.size||meldSuits.size===1&&meldSuits.has(s));
  if(pure.length)result.routes.push({name:'清一色',shanten:Math.min(...pure.map(s=>Math.min(standardCost(data,[s]),pairsCost(data,[s]))))-1});
  if(melds.length===4)result.routes.push({name:'金钩钓',shanten:result.shanten});
  if(hand.length!==13-melds.length*3)return result;
  for(let i=0;i<27;i++){
    if(data.counts[i]>=data.caps[i]||TILE_IDS[i].startsWith(`${missing}-`))continue;
    const tile=TILE_IDS[i],next=shanten([...hand,tile],melds,missing);
    if(next>=result.shanten)continue;
    const unseen=Math.max(0,4-(known?.[tile]??(4-data.caps[i]+data.counts[i])));
    result.improvingTiles.push({tile,unseen,shanten:next});result.ukeire+=unseen;
    if(next===-1)result.waits.push({tile,unseen});
  }
  return result;
}
