import { LightbulbIcon } from '@phosphor-icons/react';
import { Tile } from './Tile.jsx';
import { analyzeWaits } from '../game/waits.js';
import { tileName } from '../game/state.js';

export function WaitsPanel({state,discardTile}) {
  const result=analyzeWaits(state,{discardTile});
  return <section className={`waits-panel ${result.status}`} aria-label="听牌分析">
    <div className="waits-heading"><LightbulbIcon size={20}/><h3>听牌</h3><p role="status">{result.status==='waiting'&&discardTile?`打出${tileName(discardTile)}后可听：`:result.message}</p></div>
    {result.waits.length>0&&<><div className="waiting-tiles">{result.waits.map(({tile,unseen})=><div key={tile} className={`waiting-tile ${unseen===0?'exhausted':''}`}><Tile tile={tile}/><span>{tileName(tile)}</span><small>{unseen===0?'已见完':`未见${unseen}张`}</small></div>)}</div><p className="waits-note">未见牌包含对手暗手，不代表牌墙中的剩余张数。</p></>}
  </section>;
}
