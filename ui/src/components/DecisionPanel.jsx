import {useEffect,useMemo,useState} from 'react';
import {LightbulbIcon} from '@phosphor-icons/react';
import {Tile} from './Tile.jsx';
import {PLAYER_NAMES,tileName} from '../game/state.js';
import {observe} from '../game/decision/observation.js';
import {createDecisionClient} from '../game/decision/client.js';
import {actionLabel} from '../game/decision/agent.js';

const distance=n=>n===-1?'已成胡':n===0?'听牌':`${n}向听`;
function riskLabel(candidate){
  if(candidate.type==='win')return '当前合法可胡';
  const risk=candidate.riskEvidence;
  if(risk.kind==='none')return candidate.type.endsWith('Kong')?'待补牌后评估':'本次不打出牌';
  if(risk.index===0)return '对手定缺限制';
  return risk.index>=.9?'威胁较高':risk.index>=.35?'留意防守':'威胁较低，仍可能放炮';
}

export function DecisionPanel({state,onSelectDiscard,onRespond}){
  const [update,setUpdate]=useState(null);
  const observation=useMemo(()=>{try{return observe(state);}catch(error){return {stateKey:null,error:error.message};}},[state]);
  useEffect(()=>{
    if(observation.error)return;
    const client=createDecisionClient();client.run(observation.state,setUpdate);
    return ()=>client.dispose();
  },[observation]);
  const result=update?.result?.stateKey===observation.stateKey?update.result:null;
  const loading=!result&&!observation.error,refining=result&&update.stage==='basic';
  const recommended=result?.recommendedAction;
  const select=action=>{
    if(!result||observe(state).stateKey!==result.stateKey)return;
    if(action.type==='discard')onSelectDiscard(action.tile);
    else onRespond(action.event,result.stateKey);
  };
  return <section className="decision-panel" aria-label="智能决策建议" aria-busy={Boolean(loading||refining)}>
    <div className="decision-heading"><div><LightbulbIcon size={20}/><h2>决策建议</h2></div><span role="status">{loading?'正在分析当前牌局…':refining?'基础建议 · 正在比较隐藏牌样本':result?.status==='ready'?`${result.stage??4}人阶段 · 攻防基线`:'规则与牌效率分析'}</span></div>
    {observation.error&&<p className="decision-empty">{observation.error}</p>}
    {result&&!recommended&&<p className="decision-empty">{result.message||'等待自己的决策机会。'}</p>}
    {recommended&&<>
      <div className="decision-main">
        <div className="decision-choice">{recommended.tile&&recommended.type!=='pass'&&<Tile tile={recommended.tile}/>}<div><small>当前首选{result.closeAlternatives?' · 候选接近':''}</small><h3>{actionLabel(recommended)}</h3><p>{distance(recommended.efficiency.shanten)}<span> · </span>{recommended.type==='win'?`合法胡牌 · ${recommended.value.multiplier}倍`:`${recommended.efficiency.ukeire}张有效未见进张`}</p></div></div>
        <button className="decision-apply" onClick={()=>select(recommended)}>{recommended.type==='discard'?'选中这张牌':recommended.type==='pass'?'记录过牌':'记录此动作'}</button>
      </div>
      <ul className="decision-reasons">{recommended.reasons.slice(0,3).map(reason=><li key={reason}>{reason}</li>)}</ul>
      <p className="decision-risk">{riskLabel(recommended)}{recommended.riskEvidence.samples>0&&` · ${recommended.riskEvidence.samples}组参考样本中${recommended.riskEvidence.anyHits}组发现可胡结构`}</p>
      <details className="decision-details"><summary>比较{result.candidates.length}种打法与分析依据</summary>
        <div className="decision-table-wrap"><table><thead><tr><th>打法</th><th>牌效率</th><th>有效未见</th><th>风险依据</th><th>选择</th></tr></thead><tbody>{result.candidates.map(c=><tr key={c.id}><th scope="row">{actionLabel(c)}{c.followUp?.type==='discard'&&<small>再打{tileName(c.followUp.tile)}</small>}</th><td>{distance(c.efficiency.shanten)}</td><td>{c.efficiency.ukeire}张</td><td>{riskLabel(c)}{c.riskEvidence.multiHits>0&&<small>样本发现一炮多响</small>}</td><td><button onClick={()=>select(c)} aria-label={`选择${actionLabel(c)}`}>选择</button></td></tr>)}</tbody></table></div>
        <div className="decision-evidence"><h4>首选的具体依据</h4><ul>{recommended.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>
          {recommended.riskEvidence.opponents.map(p=><p key={p.id}>{PLAYER_NAMES[p.id]}：{p.immune?'该花色为其定缺，不能胡此牌':`${recommended.riskEvidence.samples}组样本中${p.hits}组可胡结构；${p.reasons.join(' ')}`}</p>)}
          {recommended.search&&<p>短程牌效率：完成{recommended.search.samples}组、最多{recommended.search.depth}次后续摸牌；{recommended.search.note}</p>}
          {result.unresolved.map(a=><p key={a.id}>{actionLabel(a)}：{a.reason}</p>)}
          <h4>方法与限制</h4><ul>{result.limitations.map(note=><li key={note}>{note}</li>)}</ul>
          <p>未见牌包含对手暗手，不等于牌墙存量。采样命中次数不是实局概率；当前尚无经对局验证的净得分模型。</p>
          <p>算法 {result.agentVersion} · 规则 {result.rulesKey} · 种子 {result.seed} · {result.elapsedMs}ms</p>
        </div>
      </details>
      <p className="decision-note">{update.error||'建议由当前牌局实时计算。风险证据与启发式排序尚未经实战校准，不代表最优得分。'}</p>
    </>}
  </section>;
}
