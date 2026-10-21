import {applyEvent,tileName} from '../state.js';
import {observe} from './observation.js';
import {DEFAULT_RULES,fingerprint,legalDiscardTiles} from './rules.js';
import {enumerateActions} from './actions.js';
import {handEfficiency} from './efficiency.js';
import {sampleWorlds} from './belief.js';
import {analyzeRisk,noImmediateRisk} from './risk.js';
import {searchCandidate} from './search.js';
import {winningHandValue} from '../hand-value.js';
import {selfWinningValue} from '../hand.js';

export const AGENT_VERSION='hybrid-analysis-1.1';
const round=n=>Math.round(n*1000)/1000;
function valueWaits(hand,melds,missing,efficiency){
  const waits=efficiency.waits.map(w=>({...w,value:winningHandValue([...hand,w.tile],melds,missing),selfDrawValue:winningHandValue([...hand,w.tile],melds,missing,{selfDraw:true})}));
  const count=waits.reduce((n,w)=>n+w.unseen,0);
  return {waits,maxMultiplier:Math.max(0,...waits.map(w=>w.value?.multiplier??0)),meanFan:count?waits.reduce((n,w)=>n+(w.value?.fan??0)*w.unseen,0)/count:0};
}
function scoreCandidate(c,wall){
  if(c.type==='win')return 1000;
  const e=c.efficiency;
  const potential=e.routes.reduce((v,r)=>v+({清一色:.28,七对:.12,碰碰胡:.08,金钩钓:.05}[r.name]??0)*Math.max(0,1-(r.shanten-e.shanten)/3),0);
  const riskWeight=.8+Math.max(0,e.shanten)*.8+(wall<16?.8:0);
  const searchBonus=c.search?.samples ? .3*(e.shanten-c.search.meanShanten) : 0;
  const kongDiscardThreat=c.search?.meanReplacementDiscardThreat??0;
  const handValueBonus=Math.min(.8,(c.handValues?.meanFan??0)/9*.8);
  return round(-1.6*e.shanten+Math.min(e.ukeire,80)/80*1.3+potential+handValueBonus-riskWeight*(c.riskEvidence.index+kongDiscardThreat*.7)+searchBonus+(c.kongIncome?.multiplier??0)*.055-(c.type==='pung'?.12:0));
}
function explain(c){
  if(c.type==='win')return [c.event.robKong?'可以抢杠胡：补杠取消、原碰保留，该次杠收入不成立。':'当前已满足合法胡牌条件。',`本次认证${c.value.multiplier}倍：${c.value.breakdown}。`,'采用合法胡优先策略，未证明拒胡后的净收益更高。'];
  const e=c.efficiency,notes=[e.shanten===0?`保持听牌，${e.waits.length}种待牌、共${e.ukeire}张未见进张。`:`距离听牌${e.shanten}步，有效进张${e.ukeire}张未见牌。`];
  if(c.followUp?.type==='discard')notes.push(`碰后打出${tileName(c.followUp.tile)}，已将这次出牌纳入比较。`);
  if(c.type==='pass')notes.push('保留当前暗手与牌型路线，等待后续机会。');
  if(c.kongIncome)notes.push(`${c.kongIncome.label}${c.kongIncome.multiplier}倍底分，仍可能退税；须补牌后再决策。`);
  if(c.handValues?.waits.length)notes.push(`各待牌按完整牌型认证，普通点炮最高${c.handValues.maxMultiplier}倍；倍数已纳入排序。`);
  if(c.riskEvidence.kind!=='none')notes.push(c.riskEvidence.note);
  if(c.type==='addedKong')notes.push('补杠须先经过抢杠响应；被抢则本次杠收入取消。');
  const route=e.routes.filter(r=>r.name!=='普通胡'&&r.shanten<=e.shanten+1).map(r=>r.name);
  if(route.length)notes.push(`可保留${route.join('、')}路线；未听牌时不预报未完成牌型的最终倍数。`);
  return notes;
}
function makeCandidate(o,action,worlds){
  const own=o.state.players.self;
  let hand=[...own.hand],melds=structuredClone(own.melds),followUp=null,risk=noImmediateRisk(),kongIncome=null;
  if(action.type==='discard'){hand.splice(hand.indexOf(action.tile),1);risk=analyzeRisk(o,worlds,action.tile);}
  if(action.type==='win')return {...action,value:selfWinningValue(o.state,action.event.winType),efficiency:handEfficiency(action.event.winType==='discard'?[...hand,action.tile]:hand,melds,own.missing,o.known),analysisHand:hand,analysisMelds:melds,riskEvidence:risk,expectedNetScore:null};
  if(action.type==='pung'||action.type.endsWith('Kong')){
    const after=applyEvent(o.state,action.event);hand=after.players.self.hand;melds=after.players.self.melds;
    if(action.type==='addedKong')melds=melds.map(m=>m.type==='pung'&&m.tile===action.tile?{...m,type:'addedKong'}:m);
    if(action.type==='pung'){
      let best=null;
      for(const tile of legalDiscardTiles(hand,own.missing)){
        const remaining=[...hand];remaining.splice(remaining.indexOf(tile),1);
        const c={type:'discard',efficiency:handEfficiency(remaining,melds,own.missing,o.known),riskEvidence:analyzeRisk(o,worlds,tile)};
        c.handValues=valueWaits(remaining,melds,own.missing,c.efficiency);
        c.heuristicScore=scoreCandidate(c,o.state.wallRemaining);
        if(!best||c.heuristicScore>best.heuristicScore)best={...c,hand:remaining,tile};
      }
      if(!best)return null;
      hand=best.hand;risk=best.riskEvidence;followUp={type:'discard',tile:best.tile};
    }else{
      const payers=Object.keys(o.state.players).filter(id=>id!=='self'&&!o.state.players[id].won);
      kongIncome={label:'杠成功时即时收入',multiplier:action.type==='openKong'?2:payers.length*(action.type==='concealedKong'?2:1),payers:action.type==='openKong'?[action.event.source]:payers};
      followUp={replacementRequired:true,drawFrom:'tail'};
      if(action.type==='addedKong')risk=analyzeRisk(o,worlds,action.tile,{robKong:true});
    }
  }
  const efficiency=handEfficiency(hand,melds,own.missing,o.known);
  return {...action,analysisHand:hand,analysisMelds:melds,followUp,kongIncome,efficiency,handValues:valueWaits(hand,melds,own.missing,efficiency),riskEvidence:risk,expectedNetScore:null};
}

export function analyzeDecision(input,options={}){
  const started=performance.now(),rules={...DEFAULT_RULES,...options.rules},seed=options.seed??20261020;
  const result={status:'waiting',phase:'waiting',method:'rules+exactEfficiency+referenceSampling',agentVersion:AGENT_VERSION,rulesKey:fingerprint(rules),stateKey:null,recommendedAction:null,candidates:[],unresolved:[],expectedNetScore:null,seed,budgetUsed:{samples:0,searchSamples:0,searchDepth:0},assumptions:['仅使用玩家可见信息。','隐藏牌采用库存约束均匀先验，不代表对手真实策略分布。'],limitations:['已按确认规则认证胡牌与听牌倍数；完整四家收支模拟尚未实现，当前分数是启发式排序，不是期望净得分。'],elapsedMs:0};
  const finish=()=>{result.elapsedMs=round(performance.now()-started);return result;};
  if(options.mode&&options.mode!=='analysis'){
    result.status='needsInformation';result.message='完整四家收益模拟尚未实现，不能输出期望净得分。';return finish();
  }
  const samples=options.samples??256,depth=options.searchDepth??2,maxCandidates=options.maxSearchCandidates??6,timeBudget=options.timeBudgetMs??2800;
  if(!Number.isInteger(samples)||samples<0||samples>4096||!Number.isInteger(depth)||depth<0||depth>2||!Number.isInteger(maxCandidates)||maxCandidates<0||maxCandidates>6||!Number.isFinite(seed)||!Number.isFinite(timeBudget)||timeBudget<0){result.status='invalid';result.message='分析预算无效：样本0—4096，深度0—2，深入候选0—6，耗时预算须为非负数。';return finish();}
  let o;
  try{o=observe(input);}catch(error){result.status='invalid';result.message=error.message;return finish();}
  result.stateKey=o.stateKey;
  const enumeration=enumerateActions(o,rules);
  result.phase=enumeration.phase;result.unresolved=enumeration.unresolved;result.message=enumeration.reason;
  if(!enumeration.actions.length){result.status=enumeration.phase==='response'?'needsInformation':enumeration.phase;return finish();}
  const deadline=started+timeBudget;
  const sampling=sampleWorlds(o,{seed,samples:performance.now()<deadline?samples:0});
  if(sampling.reason)result.limitations.push(sampling.reason);
  result.budgetUsed.samples=sampling.worlds.length;
  for(const action of enumeration.actions){
    const c=makeCandidate(o,action,sampling.worlds);if(!c)continue;
    if(!Number.isFinite(c.efficiency.shanten)){result.status='invalid';result.message='手牌、副露或定缺无法形成合法目标结构。';return finish();}
    c.heuristicScore=scoreCandidate(c,o.state.wallRemaining);result.candidates.push(c);
  }
  const sorted=()=>result.candidates.sort((a,b)=>b.heuristicScore-a.heuristicScore||(a.id<b.id?-1:a.id>b.id?1:0));
  sorted();
  if(depth&&sampling.worlds.length&&maxCandidates){
    const available=result.candidates.filter(c=>c.type!=='win');
    const safe=[...available].sort((a,b)=>a.riskEvidence.index-b.riskEvidence.index);
    const picked=new Set();
    for(let i=0;picked.size<maxCandidates&&i<available.length;i++){picked.add(available[i]);if(picked.size<maxCandidates)picked.add(safe[i]);}
    for(const c of picked){
      if(performance.now()>=deadline)break;
      c.search=searchCandidate(o,c,sampling.worlds,{depth,deadline});
      result.budgetUsed.searchSamples+=c.search.samples;result.budgetUsed.searchDepth=depth;
      c.heuristicScore=scoreCandidate(c,o.state.wallRemaining);
    }
    result.limitations.push('短程搜索忽略他家中途碰杠胡，只用于牌效率比较。');
    if(performance.now()>=deadline)result.limitations.push('已达到计算时间预算，部分候选或样本尚未深入。');
  }
  sorted();
  for(const c of result.candidates){c.reasons=explain(c);delete c.analysisHand;delete c.analysisMelds;}
  result.recommendedAction=result.candidates[0]??null;result.status=result.recommendedAction?'ready':'waiting';
  result.closeAlternatives=result.candidates.length>1&&result.candidates[0].heuristicScore===result.candidates[1].heuristicScore;
  result.stage=Object.values(o.state.players).filter(p=>!p.won).length;
  result.message=result.closeAlternatives?'主要候选接近，可结合风险证据选择。':'基于当前公开信息的攻防建议。';
  if(result.unresolved.length)result.limitations.push('部分碰杠动作涉及未决规则，未纳入确定合法的首选。');
  return finish();
}

export function actionLabel(action){
  if(!action)return '等待决策机会';
  if(action.type==='pass')return '过，保留手牌';
  const labels={discard:'打出',pung:'碰',openKong:'明杠',addedKong:'补杠',concealedKong:'暗杠',win:action.event?.robKong?'抢杠胡':action.event?.winType==='selfDraw'?'自摸胡':'胡'};
  return `${labels[action.type]??action.type}${tileName(action.tile)}`;
}
