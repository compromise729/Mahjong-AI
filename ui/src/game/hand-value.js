import {isWinningHand} from './hand-shape.js';
import {TILE_IDS} from './tiles.js';

const terminal=index=>index%9===0||index%9===8;

function allTriplets(counts) {
  return counts.some((count,pair)=>count>=2&&counts.every((n,i)=>(n-(i===pair?2:0))%3===0));
}

function terminalMelds(counts) {
  const first=counts.findIndex(n=>n>0);
  if(first<0)return true;
  if(terminal(first)&&counts[first]>=3){
    counts[first]-=3;
    const ok=terminalMelds(counts);
    counts[first]+=3;
    if(ok)return true;
  }
  if((first%9===0||first%9===6)&&counts[first+1]>0&&counts[first+2]>0){
    counts[first]--;counts[first+1]--;counts[first+2]--;
    const ok=terminalMelds(counts);
    counts[first]++;counts[first+1]++;counts[first+2]++;
    if(ok)return true;
  }
  return false;
}

function terminalHand(counts,melds) {
  if(melds.some(m=>!terminal(TILE_IDS.indexOf(m.tile))))return false;
  return counts.some((n,i)=>{
    if(n<2||!terminal(i))return false;
    const rest=[...counts];rest[i]-=2;
    return terminalMelds(rest);
  });
}

// Compound patterns contain their components. Independent bonuses follow
// the user's 2026-10-20 stacking rules, then the 512 cap.
export function winningHandValue(hand,melds=[],missing=null,context={}) {
  if(!isWinningHand(hand,melds,missing))return null;
  if(context.heavenly&&context.earthly||context.kongFlower&&!context.selfDraw||context.robKong&&context.selfDraw)return null;
  if((context.heavenly||context.earthly)&&melds.length||context.heavenly&&!context.selfDraw)return null;
  if(context.kongFlower&&!melds.some(m=>m.type!=='pung'))return null;
  const counts=TILE_IDS.map(tile=>hand.filter(t=>t===tile).length);
  const indices=[...hand,...melds.map(m=>m.tile)].map(tile=>TILE_IDS.indexOf(tile));
  const pure=new Set(indices.map(i=>Math.floor(i/9))).size===1;
  const generals=indices.every(i=>[1,4,7].includes(i%9));
  const roots=counts.filter(n=>n===4).length;
  const pairs=melds.length===0&&counts.every(n=>n%2===0);
  const triplets=allTriplets(counts);
  const goldenHook=melds.length===4;
  const candidates=[{name:'平胡',multiplier:1}];
  const add=(condition,name,multiplier)=>{if(condition)candidates.push({name,multiplier});};

  add(triplets,'碰碰胡',2);
  add(pure,'清一色',4);
  add(generals,'将将胡',4);
  add(terminalHand(counts,melds),'幺九',4);
  add(pure&&triplets,'清碰',8);
  add(generals&&triplets,'将对',8);
  add(goldenHook,'金钩钩',4);
  add(goldenHook&&pure,'清金钩钩',16);
  add(goldenHook&&generals,'将金钩钩',16);

  if(pairs){
    const names=['七对','龙七对','双龙七对','三龙七对'];
    add(true,names[roots],4*2**roots);
    add(pure,`清${names[roots]}`,16*2**roots);
    add(generals,`将${names[roots]}`,16*2**roots);
    const occupied=counts.map((n,i)=>n?i:-1).filter(i=>i>=0);
    add(pure&&occupied.length===7&&occupied.every((i,n)=>counts[i]===2&&i===occupied[0]+n),'连七对',256);
  }
  if(!melds.length&&pure){
    const start=Math.floor(indices[0]/9)*9;
    const base=[3,1,1,1,1,1,1,1,3];
    add(base.every((n,i)=>counts[start+i]>=n),'九莲宝灯',128);
  }
  const fourKongs=goldenHook&&melds.every(m=>m.type!=='pung');
  add(fourKongs,'十八罗汉',128);
  add(fourKongs&&pure,'清十八罗汉',512);
  add(fourKongs&&generals,'将十八罗汉',512);

  const best=candidates.reduce((a,b)=>b.multiplier>a.multiplier?b:a);
  const bonuses=[];
  const bonus=(condition,name,multiplier)=>{if(condition)bonuses.push({name,multiplier});};
  bonus(!pairs&&best.name!=='九莲宝灯'&&melds.every(m=>m.type==='concealedKong'),'门前清',2);
  bonus(best.name!=='连七对'&&indices.every(i=>!terminal(i)),'断幺九',2);
  const dragonPairs=pairs&&roots>0;
  const appliedRoots=fourKongs||dragonPairs?0:roots;
  bonus(appliedRoots>0,'根',2**appliedRoots);
  bonus(context.selfDraw,'自摸',2);
  bonus(context.kongFlower,'杠上开花',2);
  bonus(context.heavenly,'天胡',32);
  bonus(context.earthly,'地胡',32);
  bonus(context.kongShot&&!context.selfDraw,'杠上炮',2);
  bonus(context.robKong,'抢杠胡',2);
  bonus(context.lastTile&&context.selfDraw,'海底捞月',2);
  const uncappedMultiplier=bonuses.reduce((n,b)=>n*b.multiplier,best.multiplier);
  const multiplier=Math.min(512,uncappedMultiplier),capped=uncappedMultiplier>512;
  const breakdown=[`${best.name}${best.multiplier}倍`,...bonuses.map(b=>`${b.name}${b.name==='根'?`（${appliedRoots}根）`:''}×${b.multiplier}`)].join(' × ')+` = ${multiplier}倍${capped?'（512倍封顶）':''}`;
  return {name:best.name,patternMultiplier:best.multiplier,bonuses,roots,appliedRoots,multiplier,uncappedMultiplier,fan:Math.log2(multiplier),uncappedFan:Math.log2(uncappedMultiplier),capped,breakdown,scope:Object.values(context).some(Boolean)?'win':'hand'};
}
