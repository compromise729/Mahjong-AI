import {getSelfResponses,getSelfDrawResponse} from '../responses.js';
import {applyEvent} from '../state.js';
import {DEFAULT_RULES,legalDiscardTiles} from './rules.js';

export function enumerateActions(observation,settings={}){
  const rules={...DEFAULT_RULES,...settings},s=observation.state,own=s.players.self;
  const result={phase:'waiting',actions:[],unresolved:[],reason:''};
  const add=(event,unresolved=false,reason='')=>{
    const action={id:`${event.type}:${event.tile??''}`,type:event.type,tile:event.tile??null,event,legality:unresolved?'unresolved':'legal',reason};
    if(!unresolved){try{applyEvent(s,event);}catch{return;}}
    result[unresolved?'unresolved':'actions'].push(action);
  };
  if(!s.initialized){result.reason='先设置起始手牌。';return result;}
  if(s.finished||own.won){result.phase='finished';result.reason=own.won?'你已胡牌，退出后续摸打。':'本局已结束。';return result;}
  if(!own.missing){result.phase='needsInformation';result.reason='先设置自己的定缺。';return result;}
  const rest=13-3*own.melds.length,hasMissing=own.hand.some(t=>t.startsWith(`${own.missing}-`));
  if(s.pendingPlayer&&s.pendingPlayer!=='self'&&!s.discardResponse?.robKong){result.reason='等待其他玩家完成摸打。';return result;}
  if(own.hand.length===rest+1&&(own.hasDrawn||own.pendingDiscard)){
    result.phase='discard';
    const win=getSelfDrawResponse(s);if(win)add(win.event);
    const forcedHu=Boolean(win&&rules.mandatoryLastFourHu&&s.wallRemaining<4);
    if(!forcedHu)for(const tile of legalDiscardTiles(own.hand,own.missing))add({player:'self',type:'discard',tile});
    if(!forcedHu&&own.hasDrawn&&s.wallRemaining>0){
      for(const tile of [...new Set(own.hand)]){
        if(tile.startsWith(`${own.missing}-`))continue;
        const type=own.hand.filter(t=>t===tile).length===4?'concealedKong':own.melds.some(m=>m.type==='pung'&&m.tile===tile)?'addedKong':null;
        if(type)add({player:'self',type,tile},hasMissing&&rules.allowMeldWhileMissing!==true,'持有定缺牌时碰杠其他花色的规则待确认。');
      }
    }
    return result;
  }
  if(own.hand.length!==rest){result.phase='invalid';result.reason='手牌张数与当前动作阶段不符。';return result;}
  const response=getSelfResponses(s);
  if(response){
    for(const option of response.options){
      if(option.type==='openKong'&&s.wallRemaining<=0)continue;
      if(option.enabled)add(option.event);
      else if(option.pendingRule){
        if(rules.allowMeldWhileMissing===true)add(option.event);
        else if(rules.allowMeldWhileMissing!==false)add(option.event,true,option.reason);
      }
    }
    if(result.actions.length||result.unresolved.length){
      result.phase='response';
      const force=rules.mandatoryLastFourHu&&s.wallRemaining<4&&result.actions.some(a=>a.type==='win');
      if(!force)add({player:'self',type:'pass',tile:response.tile,source:response.source,discardId:response.id});
    }
  }
  result.reason=result.phase==='waiting'?'等待自己的摸牌或可响应的弃牌。':'';
  return result;
}
