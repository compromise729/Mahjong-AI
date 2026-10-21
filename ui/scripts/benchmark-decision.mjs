import {analyzeDecision} from '../src/game/decision/agent.js';
import {createDemoGame,createGame,initializeGame,applyEvent} from '../src/game/state.js';

const hand=['wan-1','wan-2','wan-3','wan-4','wan-5','wan-6','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','wan-9'];
function drawn(tile){let s=initializeGame(createGame(),{hand,dealerSeat:'left',missing:{self:'tong',left:'tong',top:'tong',right:'tong'}});s=applyEvent(s,{player:'left',type:'discard',tile:'wan-8'});return applyEvent(s,{player:'self',type:'draw',tile});}
let claim=initializeGame(createGame(),{hand:['wan-9','wan-9',...hand.slice(0,11)],dealerSeat:'left',missing:{self:'tong',left:'tong',top:'tong',right:'tong'}});
claim=applyEvent(claim,{player:'left',type:'discard',tile:'wan-9'});
const cases=[['摸牌宽听',drawn('tiao-9')],['自摸',drawn('wan-9')],['碰或过',claim],['演示局清缺',createDemoGame()]];
const results=[];
for(const [name,state] of cases){
  const basic=analyzeDecision(state,{samples:0,searchDepth:0,timeBudgetMs:0});
  const full=analyzeDecision(state,{seed:42,samples:256,searchDepth:2,timeBudgetMs:2800});
  const replay=analyzeDecision(state,{seed:42,samples:256,searchDepth:0,timeBudgetMs:2800});
  if(full.status!=='ready'||!full.recommendedAction)throw new Error(`${name}: no recommendation`);
  if(replay.expectedNetScore!==null)throw new Error('Analysis must not claim net score');
  results.push({name,basicMs:basic.elapsedMs,fullMs:full.elapsedMs,samples:full.budgetUsed.samples,searchSamples:full.budgetUsed.searchSamples,action:full.recommendedAction.id,shanten:full.recommendedAction.efficiency.shanten,ukeire:full.recommendedAction.efficiency.ukeire,limited:full.limitations.some(x=>x.includes('达到计算'))});
}
const timings=results.map(r=>r.fullMs).sort((a,b)=>a-b);
console.log(JSON.stringify({method:'Fixed scenario performance smoke; no win-rate or strength claim',agentVersion:analyzeDecision(cases[0][1],{samples:0,searchDepth:0}).agentVersion,node:process.version,seed:42,results,p50Ms:timings[Math.ceil(timings.length*.5)-1],p95Ms:timings[Math.ceil(timings.length*.95)-1]},null,2));
