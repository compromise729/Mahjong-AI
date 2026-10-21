import {shanten} from './efficiency.js';
import {legalDiscardTiles} from './rules.js';
import {isWinningHand} from '../hand.js';
import {analyzeRisk} from './risk.js';

export function bestStructuralDiscard(hand,melds,missing){
  let best=null;
  for(const tile of legalDiscardTiles(hand,missing)){
    const next=[...hand];next.splice(next.indexOf(tile),1);
    const value=shanten(next,melds,missing);
    if(!best||value<best.shanten)best={tile,hand:next,shanten:value};
  }
  return best;
}
// This is a two-draw, single-player efficiency probe. It intentionally does
// not claim to simulate opponents' intervening actions or full game rewards.
export function searchCandidate(observation,candidate,worlds,{depth=2,deadline=Infinity}={}){
  let total=0,improved=0,wins=0,completed=0,threat=0;
  const start=candidate.efficiency.shanten,kong=candidate.type.endsWith('Kong');
  for(const world of worlds){
    if(performance.now()>=deadline)break;
    let hand=[...candidate.analysisHand],value=start,won=false;
    const deck=[...world.wall];
    let moves=0;
    for(let turn=0;turn<depth&&deck.length;turn++){
      const tile=turn===0&&kong?deck.pop():deck.shift();
      hand.push(tile);moves++;
      if(isWinningHand(hand,candidate.analysisMelds,observation.state.players.self.missing)){value=-1;won=true;break;}
      const next=bestStructuralDiscard(hand,candidate.analysisMelds,observation.state.players.self.missing);
      if(!next)break;
      hand=next.hand;value=next.shanten;
      if(kong&&turn===0)threat+=analyzeRisk(observation,[world],next.tile).index;
    }
    if(!moves)continue;
    total+=value;completed++;improved+=Number(value<start);wins+=Number(won);
  }
  return {method:'singlePlayerDrawProbe',depth,samples:completed,meanShanten:completed?total/completed:start,improvedCount:improved,winningCount:wins,meanReplacementDiscardThreat:completed?threat/completed:0,truncated:completed<worlds.length,note:'短程牌效率估计：忽略他家中途行动，样本计数不是胡牌概率。'};
}
