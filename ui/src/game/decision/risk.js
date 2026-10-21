import {isWinningHand} from '../hand.js';

export function analyzeRisk(observation,worlds,tile,{robKong=false}={}){
  const {state:s,known}=observation,suit=tile?.split('-')[0];
  const opponents=[];const hitsPerWorld=Array(worlds.length).fill(0);
  for(const id of ['left','top','right']){
    const p=s.players[id];if(p.won)continue;
    const immune=p.missing===suit;
    let hits=0;
    if(!immune)worlds.forEach((w,i)=>{
      const hand=w.hands[id];
      if(hand&&isWinningHand([...hand,tile],p.melds,p.missing)){hits++;hitsPerWorld[i]++;}
    });
    const meldSuits=new Set(p.melds.map(m=>m.tile.split('-')[0]));
    const focus=p.melds.length>=2&&meldSuits.size===1&&meldSuits.has(suit)?1.5:1;
    // A versioned threat index, deliberately NOT a calibrated probability.
    const publicIndex=immune?0:Math.min(.9,(.04+.14*p.melds.length+.002*p.discards.length+.002*Math.max(0,55-(s.wallRemaining??55)))*focus*(known[tile]>=3?.75:1));
    opponents.push({id,immune,hits,publicIndex,index:immune?0:Math.max(publicIndex,worlds.length?hits/worlds.length:0),reasons:immune?['该花色是对手定缺，规则禁止胡此牌。']:[`${p.melds.length}组公开碰杠`,...(focus>1?['同色副露提示清一色路线。']:[]),'历史弃过此牌不代表永久安全。']});
  }
  const anyHits=hitsPerWorld.filter(n=>n>0).length,multiHits=hitsPerWorld.filter(n=>n>1).length;
  return {kind:robKong?'robKong':'discard',index:opponents.reduce((n,p)=>n+p.index,0),opponents,samples:worlds.length,anyHits,multiHits,note:worlds.length?(anyHits?'样本发现可胡结构；不是实局放炮概率。':'样本内未发现可胡结构，仍可能放炮。'):'未采样，仅有公开信息威胁特征，仍可能放炮。'};
}
export function noImmediateRisk(){return {kind:'none',index:0,opponents:[],samples:0,anyHits:0,multiHits:0,note:'该动作本身不立即打出牌；后续摸打仍有风险。'};}
