import {applyEvent,isInitialDealerTurn} from './state.js';
import {canSelfWinOnDiscard,isWinningHand} from './hand.js';

export function getSelfDrawResponse(state){
  const own=state.players.self;
  if(!state.initialized||state.finished||own.won||!own.hasDrawn||!own.missing||!state.drawnTile||state.pendingPlayer&&state.pendingPlayer!=='self')return null;
  if(!isWinningHand(own.hand,own.melds,own.missing))return null;
  return {tile:state.drawnTile,heavenly:isInitialDealerTurn(state,'self'),event:{player:'self',type:'win',winType:'selfDraw',tile:state.drawnTile}};
}

export function getSelfResponses(state){
  const response=state.discardResponse,own=state.players.self;
  if(!state.initialized||state.finished||own.won||!response||response.player==='self'||response.selfPassed)return null;
  const count=own.hand.filter(t=>t===response.tile).length;
  const phaseOK=!own.hasDrawn&&!own.pendingDiscard&&own.hand.length===13-3*own.melds.length;
  const forbiddenMissing=own.missing&&response.tile.startsWith(own.missing+'-');
  const uncertainMissing=!own.missing||own.hand.some(t=>t.startsWith(own.missing+'-'));
  const options=['win','pung','openKong'].map(type=>{
    const event={player:'self',type,tile:response.tile,source:response.player,discardId:response.id,...(type==='win'?{winType:'discard'}:{})};
    let enabled=false,reason='',pendingRule=false;
    if(forbiddenMissing)reason='定缺花色不能碰、杠或胡。';
    else if(!phaseOK)reason='请先完成自己的出牌。';
    else if(type==='win'){
      enabled=canSelfWinOnDiscard(state);
      reason=enabled?'这张牌可组成合法胡牌结构。':!own.missing?'先设置定缺。':(own.passedWins??[]).includes(response.tile)?'受过手胡限制。':'这张牌不能组成合法胡牌结构。';
    }else if(response.winners.length)reason='这张弃牌已有胡家，不能再碰杠。';
    else if(count<(type==='pung'?2:3))reason=`手牌不足${type==='pung'?2:3}张相同牌。`;
    else if(uncertainMissing){pendingRule=true;reason='定缺期间的碰杠限制待确认，可按实局规则手动录入。';}
    else enabled=true;
    if(enabled){try{applyEvent(state,event);}catch(error){enabled=false;reason=error.message;}}
    return {type,event,enabled,reason,pendingRule};
  });
  return {tile:response.tile,source:response.player,id:response.id,options,canPass:phaseOK};
}
