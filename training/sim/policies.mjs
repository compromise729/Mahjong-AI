import {createGame} from '../../ui/src/game/state.js';
import {analyzeDecision,AGENT_VERSION} from '../../ui/src/game/decision/agent.js';
import {shanten} from '../../ui/src/game/decision/efficiency.js';
import {encodeAction} from './engine.mjs';

export {AGENT_VERSION};
const SEATS=['self','right','top','left'];
export function visibleState(game,seat){
  const key=s=>s==null?null:SEATS[(s-seat+4)%4],s=createGame();
  Object.assign(s,{initialized:true,dealerSeat:key(game.dealer),finished:game.done,wallRemaining:game.wall.length,
    nextId:game.events.length+2,pendingPlayer:game.phase==='turn'?key(game.actor):null,
    drawnTile:game.phase==='turn'&&game.actor===seat?game.drawn:null});
  for(let n=0;n<4;n++){
    const p=game.players[n],out=s.players[key(n)];
    Object.assign(out,{missing:p.missing,won:p.won,win:p.win?{type:p.win.selfDraw?'selfDraw':'discard',tile:p.win.tile,source:key(p.win.source)}:null,
      hasDrawn:p.hand.length===14-3*p.melds.length&&!(game.afterPung&&game.actor===n),
      pendingDiscard:game.phase==='turn'&&game.actor===n&&game.afterPung,
      melds:p.melds.map(m=>({...m,source:key(m.source)})),
      discards:p.discards.map(d=>({...d,physicalId:`tile:${d.id}`}))});
    if(p.win?.selfDraw&&n!==seat){
      out.hasDrawn=false;
      const event=game.events.find(e=>e.type==='win'&&e.seat===n);
      out.discards.push({tile:p.win.tile,id:event.id,physicalId:`win-draw:${event.id}`,kind:'win'});
    }
    if(n===seat){
      out.hand=[...p.hand];out.passedWins=Object.keys(p.passed);
      out.passedWinValues=Object.fromEntries(Object.entries(p.passed).map(([t,v])=>[t,{fan:v.fan,multiplier:Math.min(512,2**v.fan),kongCount:v.kongs}]));
    }
  }
  s.events=[{id:0,type:'setup',player:key(game.dealer)},...game.events.filter(e=>e.type!=='settle').map(e=>({
    id:e.id,type:e.type,player:key(e.seat),...(e.type!=='draw'||e.seat===seat?{tile:e.tile}:{}),
    source:key(e.source),replacementDraw:e.replacement,afterKong:e.afterKong,winType:e.selfDraw?'selfDraw':'discard'
  }))];
  if(game.pending){
    const p=game.pending,id=p.eventId;
    s.discardResponse={id,player:key(p.source),tile:p.tile,winners:[],robKong:p.rob,selfPassed:false};
    if(p.rob){
      const meld=game.players[p.source].melds.find(m=>m.type==='pung'&&m.tile===p.tile);
      s.pendingKong={player:key(p.source),tile:p.tile,meldId:meld.id,physicalId:`offer:${id}`};
      s.pendingPlayer=key(p.source);
      s.players[key(p.source)].hasDrawn=false;
      s.players[key(p.source)].discards.push({tile:p.tile,id,physicalId:`offer:${id}`,kind:'kongOffer'});
    }
  }
  return s;
}
export function choose(game,kind='teacher',random=game.random,{samples=32,searchDepth=0}={}){
  const legal=game.legalActions();
  if(legal.length===1)return encodeAction(legal[0]);
  if(kind==='random')return encodeAction(legal[Math.floor(random()*legal.length)]);
  if(kind==='efficiency'){
    const win=legal.find(a=>a.type==='win');if(win)return encodeAction(win);
    const discards=legal.filter(a=>a.type==='discard');
    if(!discards.length)return encodeAction(legal.find(a=>a.type==='pass')??legal[0]);
    const p=game.players[game.actor];
    discards.sort((a,b)=>{
      const score=a=>{const h=[...p.hand];h.splice(h.indexOf(a.tile),1);return shanten(h,p.melds,p.missing);};
      return score(a)-score(b)||encodeAction(a)-encodeAction(b);
    });
    return encodeAction(discards[0]);
  }
  if(kind!=='teacher')throw new Error(`Unknown policy ${kind}`);
  const result=analyzeDecision(visibleState(game,game.actor),{
    samples,searchDepth,seed:(game.seed*1009+game.decisions)>>>0,timeBudgetMs:1e9,
    rules:{mandatoryLastFourHu:game.mandatoryLastFourHu}
  });
  const allowed=new Set(legal.map(encodeAction));
  const candidate=result.candidates.find(a=>allowed.has(encodeAction(a)));
  if(!candidate)throw new Error(`Teacher adapter mismatch: ${result.status}: ${result.message}`);
  return encodeAction(candidate);
}
