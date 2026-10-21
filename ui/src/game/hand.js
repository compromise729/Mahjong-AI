import {isWinningHand} from './hand-shape.js';
import {winningHandValue} from './hand-value.js';
import {winningContext,kongCount} from './win-context.js';
export {isWinningHand} from './hand-shape.js';

export function selfWinningValue(state,winType,response=state.discardResponse){
  const own=state.players.self;
  const hand=winType==='selfDraw'?own.hand:[...own.hand,response?.tile];
  return winningHandValue(hand,own.melds,own.missing,winningContext(state,'self',winType,response));
}

export function passedWinBlocked(state,tile,winType='discard',response=state.discardResponse){
  const own=state.players.self;
  if(!(own.passedWins??[]).includes(tile))return false;
  const passed=own.passedWinValues?.[tile];
  if(!passed||kongCount(own)<=passed.kongCount)return true;
  const current=selfWinningValue(state,winType,response);
  return !current||current.uncappedFan<=(passed.fan??Math.log2(passed.multiplier));
}

export function canSelfWinOnDiscard(state,response=state.discardResponse){
  const own=state.players.self;
  if(!state.initialized||state.finished||own.won||!response||response.player==='self'||response.selfPassed)return false;
  if(!own.missing||own.hasDrawn||own.pendingDiscard||own.hand.length!==13-3*own.melds.length)return false;
  return isWinningHand([...own.hand,response.tile],own.melds,own.missing)&&!passedWinBlocked(state,response.tile,'discard',response);
}
