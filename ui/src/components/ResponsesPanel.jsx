import { CheckCircleIcon } from '@phosphor-icons/react';
import { Tile } from './Tile.jsx';
import {getSelfResponses,getSelfDrawResponse} from '../game/responses.js';
import {PLAYER_NAMES,tileName} from '../game/state.js';

const LABELS={win:'胡牌',pung:'碰牌',openKong:'明杠'};
export function ResponsesPanel({state,onRespond}){
  const selfDraw=getSelfDrawResponse(state);
  if(selfDraw)return <section className="responses-panel has-response" aria-label="自摸响应" aria-live="polite">
    <div className="response-title"><span>{selfDraw.heavenly?'庄家第14张':'你摸到'}</span><Tile tile={selfDraw.tile}/><strong>{tileName(selfDraw.tile)}</strong><span>{selfDraw.heavenly?'起手可以天胡':'可以自摸胡牌'} · {selfDraw.value.multiplier}倍</span></div>
    <div className="response-buttons"><button className="response-action win" onClick={()=>onRespond(selfDraw.event)}><CheckCircleIcon size={18}/>{selfDraw.heavenly?'天胡':'自摸胡牌'}</button></div>
    <p className="response-help">{selfDraw.heavenly?'起手14张已满足胡牌条件，无需再摸牌，牌墙不扣张。':'当前手牌满足胡牌条件，胡牌张已自动使用新摸牌。'}</p>
    <p className="response-help">{selfDraw.value.breakdown}</p>
  </section>;
  const response=getSelfResponses(state);
  if(!response)return null;
  const available=response.options.filter(o=>o.enabled);
  if(!available.length)return null;
  const pending=response.options.some(o=>o.pendingRule);
  const win=available.find(o=>o.type==='win');
  return <section className={`responses-panel ${available.length?'has-response':''}`} aria-label="出牌响应" aria-live="polite">
    <div className="response-title"><span>{PLAYER_NAMES[response.source]}{response.robKong?'补杠亮出':'打出'}</span><Tile tile={response.tile}/><strong>{tileName(response.tile)}</strong><span>你可以选择：</span></div>
    <div className="response-buttons">{response.options.map(option=><button key={option.type} className={`response-action ${option.type}`} disabled={!option.enabled} title={option.reason} onClick={()=>onRespond(option.event)}>{option.enabled&&<CheckCircleIcon size={18}/>} {option.type==='win'&&response.robKong?'抢杠胡':LABELS[option.type]}{option.pendingRule?' · 待确认':!option.enabled?' · 不可':''}</button>)}<button disabled={!response.canPass} className="pass-response" onClick={()=>onRespond({player:'self',type:'pass',discardId:response.id})}>过</button></div>
    <p className="response-help">{pending?'先设置定缺，再确认可碰杠的花色。':available.length?`当前可${available.map(o=>({win:'胡',pung:'碰',openKong:'明杠'}[o.type])).join('、')}，胡牌优先；可主动放弃自己的胡牌。`:response.options[0].reason}</p>
    {win&&<p className="response-help">本次胡牌{win.value.multiplier}倍：{win.value.breakdown}</p>}
  </section>;
}
