import { LightbulbIcon } from '@phosphor-icons/react';
import { Tile } from './Tile.jsx';
import { analyzeWaitValues } from '../game/waits.js';
import { tileName } from '../game/state.js';

export function WaitsPanel({state,discardTile}) {
  const result=analyzeWaitValues(state,{discardTile});
  return <section className={`waits-panel ${result.status}`} aria-label="听牌分析">
    <div className="waits-heading"><LightbulbIcon size={20}/><h3>听牌</h3><p role="status">{result.status==='waiting'&&discardTile?`打出${tileName(discardTile)}后可听：`:result.message}</p></div>
    {result.waits.length>0&&<>
      <div className="waiting-tiles">{result.waits.map(({tile,unseen,value,selfDrawValue})=><div key={tile} className={`waiting-tile ${unseen===0?'exhausted':''}`}>
        <Tile tile={tile}/><strong className="wait-multiplier" title={value.breakdown} aria-label={`${tileName(tile)}，普通点炮${value.multiplier}倍`}>{value.multiplier}倍</strong>
        <small className="wait-self-draw" title={selfDrawValue.breakdown}>自摸{selfDrawValue.multiplier}倍</small><span>{tileName(tile)}</span><small>{unseen===0?'已见完':`未见${unseen}张`}</small>
      </div>)}</div>
      <details className="wait-value-details"><summary>倍数明细</summary><ul>{result.waits.map(({tile,value,selfDrawValue})=><li key={tile}><strong>{tileName(tile)}</strong>：{value.breakdown}；普通自摸{selfDrawValue.multiplier}倍。</li>)}</ul></details>
      <p className="waits-note">牌下为普通点炮倍数，另列普通自摸；已计门前清、断幺九及根，512倍封顶。特殊事件在实际发生时计算。</p>
      <p className="waits-note">未见牌包含对手暗手，不代表牌墙中的剩余张数。</p>
    </>}
  </section>;
}
