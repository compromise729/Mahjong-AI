import { Tile, TilePicker } from './Tile.jsx';
import { PLAYER_NAMES, EVENT_NAMES, TILE_IDS, tileName, isInitialDealerTurn } from '../game/state.js';
import { selectSeat, claimEntry, selfDrawEntry } from '../game/entry.js';
import { canSelfWinOnDiscard } from '../game/hand.js';
import { getSelfDrawResponse } from '../game/responses.js';
import { WaitsPanel } from './WaitsPanel.jsx';
import { ResponsesPanel } from './ResponsesPanel.jsx';
import { ArrowCounterClockwiseIcon, SlidersHorizontalIcon, ClockCounterClockwiseIcon, LightbulbIcon, CheckIcon } from '@phosphor-icons/react';

export function EventEntry({state,entry,setEntry,onRecord,onRespond,onUndo,onSetup,error,message}) {
  const {player,type,tile,source}=entry;
  const claim=type==='pung' || type==='openKong';
  const winType=entry.winType??'selfDraw',unknownDraw=type==='draw'&&player!=='self';
  const needsSource=claim||(type==='win'&&winType==='discard');
  const noFaceNeeded=unknownDraw;
  const kongResponder=Boolean(state.pendingKong&&player!==state.pendingKong.player);
  const active=player&&!state.finished&&!state.players[player].won&&(!state.pendingPlayer||state.pendingPlayer===player||kongResponder);
  const ordinaryActive=active&&!kongResponder;
  const actor=state.players[player];
  const initialDealer=player&&isInitialDealerTurn(state,player);
  const missingTile=value=>Boolean(actor?.missing&&value?.startsWith(actor.missing+'-'));
  const latestClaim=claimEntry(entry,'win',state);
  const canClaim=active&&latestClaim.tile&&!actor.hasDrawn&&!actor.pendingDiscard&&!missingTile(latestClaim.tile);
  const canWin=canClaim&&(player!=='self'||canSelfWinOnDiscard(state));
  const canSelfDraw=active&&actor.hasDrawn&&actor.missing&&(player!=='self'||getSelfDrawResponse(state));
  const ownSelfDraw=type==='win'&&winType==='selfDraw'&&player==='self';
  const automaticFace=needsSource||ownSelfDraw;
  const missingForbidden=type!=='draw'&&type!=='discard'&&missingTile(tile);
  const staleClaim=needsSource&&entry.discardId!==state.discardResponse?.id;
  const meldTypes=['pung','openKong','addedKong','concealedKong'];
  const update=patch=>setEntry(patch.type==='pung'||patch.type==='openKong'?claimEntry(entry,patch.type,state):{...entry,...patch,tile:null,source:'',discardId:undefined});
  const events=state.events.filter(e=>e.type!=='setup').slice(-4).reverse();
  const winningRefs=Object.values(state.players).flatMap(p=>p.discards.filter(d=>d.kind==='win').map(d=>d.physicalId));
  const sharedWin=winningRefs.some((id,i)=>winningRefs.indexOf(id)!==i);
  const meldDisabled=t=>!ordinaryActive||Boolean(state.pendingKong)||(t!=='pung'&&!(state.wallRemaining>0))||(['pung','openKong'].includes(t)&&(!canClaim||state.discardResponse?.winners.length||player!=='self'&&canSelfWinOnDiscard(state)))||(['addedKong','concealedKong'].includes(t)&&!actor.hasDrawn);
  return <section className="entry-panel" aria-label="记录牌局事件">
    <div className="entry-heading">
      <h2>记录牌局事件</h2><p>选择座位、操作和牌面，记录当前这一步。</p>
      <div className="entry-tools"><button onClick={onUndo} disabled={!state.history.length}><ArrowCounterClockwiseIcon size={20}/>撤销</button><button onClick={onSetup}><SlidersHorizontalIcon size={20}/>手牌设置</button></div>
    </div>
    <ResponsesPanel state={state} onRespond={onRespond}/>
    {state.pendingKong?<p className="battle-notice" role="status">{PLAYER_NAMES[state.pendingKong.player]}亮出{tileName(state.pendingKong.tile)}补杠，先处理抢杠胡；原碰暂时保留。确认无人抢杠后，由补杠者记录补牌。</p>:state.pendingPlayer&&<p className="battle-notice" role="status">{PLAYER_NAMES[state.pendingPlayer]}正在{state.players[state.pendingPlayer].hasDrawn||state.players[state.pendingPlayer].pendingDiscard?'等待出牌':'杠后补牌'}，完成本次摸打后才能切换玩家。</p>}
    {state.discardResponse?.winners.length>0&&!state.finished&&<p className="battle-notice">本次弃牌已有胡家；如有其他人同时胡牌，选择其座位继续记录点炮胡。开始摸打后，本次响应结束。</p>}
    {sharedWin&&<p className="battle-notice">一炮多响的胡牌张在各家手牌旁分别展示，同一张牌只计数一次。</p>}
    <div className="entry-content">
      <div className="event-options">
        <div className="form-section"><label>选择座位</label><div className="seat-options">
          {['top','left','right','self'].map(id=><button key={id} disabled={state.finished||state.players[id].won||Boolean(state.pendingPlayer&&state.pendingPlayer!==id&&!state.pendingKong)} className={player===id?'active':''} onClick={()=>setEntry(selectSeat(entry,id,state))} aria-pressed={player===id}>{PLAYER_NAMES[id]}{state.players[id].won?' · 已胡':''}</button>)}
        </div></div>
        <div className="form-section"><label>操作类型</label><div className="type-options">
          <button disabled={!ordinaryActive||Boolean(state.pendingKong)} aria-pressed={type==='discard'} className={type==='discard'?'active':''} onClick={()=>update({type:'discard'})}>出牌</button>
          <button disabled={!ordinaryActive||actor.hasDrawn||actor.pendingDiscard||state.wallRemaining===0} aria-pressed={type==='draw'} className={type==='draw'?'active':''} onClick={()=>update({type:'draw'})}>{state.pendingKong&&player===state.pendingKong.player?'无人抢杠，补牌':player==='self'?'自己摸牌':'摸牌'}</button>
          <button disabled={!canWin} title={missingTile(latestClaim.tile)?'定缺花色不能胡。':'胡当前亮出的可响应牌。'} aria-pressed={type==='win'&&winType==='discard'} className={type==='win'&&winType==='discard'?'active':''} onClick={()=>setEntry(claimEntry(entry,'win',state))}>{state.discardResponse?.robKong?'抢杠胡':'胡牌'}</button>
          <button disabled={!canSelfDraw} title={initialDealer?'起手14张合法成胡时可直接天胡，无需再摸牌。':player==='self'?'胡自己刚摸到的牌；手中有定缺牌或结构不成立时不能胡。':'自摸须已记录摸牌，且胡牌张不能为定缺花色。'} aria-pressed={type==='win'&&winType==='selfDraw'} className={type==='win'&&winType==='selfDraw'?'active':''} onClick={()=>setEntry(selfDrawEntry(entry,state))}>自摸</button>
          {meldTypes.map(t=><button key={t} disabled={meldDisabled(t)} aria-pressed={type===t} className={type===t?'active':''} onClick={()=>update({type:t})}>{EVENT_NAMES[t]}</button>)}
        </div></div>
        <div className="input-help">{state.finished?'三家已胡牌，本局结束。可撤销或设置新手牌。':needsSource?'自动使用当前最近的弃牌及来源，无需重新选牌。':ownSelfDraw?(initialDealer?'庄家起手可直接天胡，第14张亮在手牌旁。':'自动使用自己刚摸到的牌，确认后亮在手牌旁。'):type==='win'?'别家胡牌张亮在新摸牌位置；牌面未知时录入一次，定缺花色不可胡。':unknownDraw?'记录摸牌即可，多一张分开的牌背。':type==='draw'?'摸到的牌会加入自己的手牌。':type==='discard' && player==='self'?'也可以直接点击牌桌上的手牌。':type==='concealedKong'?'暗杠亮一张、三张牌背；定缺花色不能杠。':'只记录已公开的牌；定缺花色不能碰、杠或胡。'}</div>
      </div>
      <div className="picker-section"><label>{noFaceNeeded?'无需选择牌面':automaticFace?'已自动带入牌面':type==='win'?'选择胡牌张':'选择一张牌'}</label>{noFaceNeeded?<div className="hidden-action-hint"><Tile back/><p>别家摸到的牌未知，确认后显示牌背。</p></div>:automaticFace?<div className="hidden-action-hint automatic-claim" aria-label="自动带入的牌">{tile&&<Tile tile={tile}/>}<p>{tile?`${needsSource?PLAYER_NAMES[source]+'刚打出的':initialDealer?'庄家第14张':'自己刚摸到的'}${tileName(tile)}`:'当前没有可用的牌。'}{missingForbidden&&'，定缺花色不可碰、杠或胡。'}</p></div>:<TilePicker value={tile} disabledTiles={!active?TILE_IDS:TILE_IDS.filter(t=>['pung','openKong','addedKong','concealedKong','win'].includes(type)&&missingTile(t))} onSelect={t=>setEntry({...entry,tile:t})}/>}</div>
      <div className="record-column">
        <span className="field-label">即将记录</span>
        <div className={`selection-preview ${tile?'has-tile':''}`}>{unknownDraw?<Tile back/>:tile ? <Tile tile={tile}/> : <span className="no-selection">{type==='win'?'自摸胡牌':'请选择牌面'}</span>}</div>
        <p className="action-description">{!player?'本局已结束':noFaceNeeded?`${PLAYER_NAMES[player]}摸牌`:tile?`${PLAYER_NAMES[player]}${type==='win'&&winType==='selfDraw'?(initialDealer?'天胡':'自摸胡牌'):EVENT_NAMES[type]}${tileName(tile)}`:'选择后在这里预览'}</p>
        <button className="primary-button" disabled={!active||kongResponder&&!(type==='win'&&winType==='discard')||missingForbidden||staleClaim||(type==='draw'&&state.wallRemaining===0)||(!noFaceNeeded&&!tile)||(needsSource&&!source)} onClick={onRecord}><CheckIcon size={20}/>确认记录</button>
        <div className={`record-feedback ${error?'error':''}`} role={error?'alert':'status'}>{error||message||'记录错误时，点击撤销即可恢复。'}</div>
      </div>
      <aside className="recent-events"><h3><ClockCounterClockwiseIcon size={19}/>近期记录</h3>{events.map((event,i)=><div className="event-row" key={event.id}><span>{PLAYER_NAMES[event.player]}</span><span>{event.heavenly?'天胡':EVENT_NAMES[event.type]}</span><strong>{event.type==='win'&&event.winType==='selfDraw'&&!event.heavenly?'自摸':event.tile?tileName(event.tile):'牌背'}</strong>{i===0 && <small>最近</small>}</div>)}{!events.length && <p className="muted">还没有摸打记录</p>}</aside>
    </div>
    <WaitsPanel state={state} discardTile={player==='self'&&type==='discard'?tile:null}/>
    <div className="analysis-status"><LightbulbIcon size={20}/><strong>AI决策</strong><span>已接入攻防基线 · 建议见上方面板</span><small>牌局仅保留在当前页面</small></div>
  </section>;
}
