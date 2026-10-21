import {TILE_IDS, knownCounts} from './state.js';
import {isWinningHand} from './hand.js';
import {winningHandValue} from './hand-value.js';
export {isWinningHand} from './hand.js';

export function analyzeWaits(state,{discardTile=null}={}) {
  const result=(status,message,waits=[])=>({status,message,waits});
  if(!state.initialized)return result('uninitialized','先设置起始手牌，即可查看听牌。');
  if(state.players.self.won)return result('won',state.finished?'本局三家已胡牌，对局结束。':'你已胡牌，退出本局后续摸打。');
  if(state.finished)return result('finished','本局三家已胡牌，对局结束。');
  const own=state.players.self,rest=13-3*own.melds.length;
  if(!own.missing)return result('needsMissingSuit','先在手牌设置中选择自己的定缺。');
  const hand=[...own.hand];
  if(hand.length===rest+1&&discardTile){
    const index=hand.indexOf(discardTile);
    if(index<0)return result('invalid','手牌中没有选择的出牌。');
    hand.splice(index,1);
  }else if(hand.length===rest+1){
    if(isWinningHand(hand,own.melds,own.missing))return result('winning','当前手牌已满足胡牌结构。');
    return result('needsDiscard','点击一张手牌，查看打出后听什么牌。');
  }
  if(hand.length!==rest)return result('invalid','请先完成摸打，恢复正确的手牌张数。');
  if(hand.some(t=>t.startsWith(own.missing+'-'))||own.melds.some(m=>m.tile.startsWith(own.missing+'-')))return result('missingSuit','定缺牌尚未打完，暂不能合法听牌。');
  const known=knownCounts(state),waits=[];
  for(const tile of TILE_IDS){
    if(isWinningHand([...hand,tile],own.melds,own.missing))waits.push({tile,unseen:Math.max(0,4-known[tile])});
  }
  return waits.length?result('waiting',discardTile?'打出所选牌后可听：':'当前可听：',waits):result('notWaiting',discardTile?'打出所选牌后尚未听牌。':'当前尚未听牌。');
}

export function analyzeWaitValues(state,{discardTile=null}={}) {
  const result=analyzeWaits(state,{discardTile});
  if(!result.waits.length)return result;
  const own=state.players.self,hand=[...own.hand];
  if(hand.length===14-3*own.melds.length&&discardTile)hand.splice(hand.indexOf(discardTile),1);
  return {...result,waits:result.waits.map(wait=>({...wait,value:winningHandValue([...hand,wait.tile],own.melds,own.missing),selfDrawValue:winningHandValue([...hand,wait.tile],own.melds,own.missing,{selfDraw:true})}))};
}
