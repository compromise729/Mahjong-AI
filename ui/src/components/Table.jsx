import { Tile } from './Tile.jsx';
import { concealedCount, isInitialDealerTurn, PLAYER_NAMES, SUIT_NAMES, EVENT_NAMES, tileName } from '../game/state.js';

function Badge({id,player,onSelect,selected,disabled=false}) {
  return <button type="button" disabled={disabled||player.won} className={`seat-badge ${selected?'seat-selected':''} ${player.won?'seat-won':''}`} onClick={()=>onSelect(id)} aria-label={`选择${PLAYER_NAMES[id]}`}>
    <span className="seat-name">{PLAYER_NAMES[id]}</span>
    <span className={`missing-badge ${player.missing??''}`}>定缺：{SUIT_NAMES[player.missing]??'未定'}</span>
    {id!=='self'&&<span className="hand-count">暗手{concealedCount(player)}张</span>}
    {player.won&&<span className="win-badge">{player.win.heavenly?'天胡':'已胡'} · 第{player.win.order}位</span>}
  </button>;
}

function Melds({ player }) {
  return <div className="meld-list">{player.melds.map(meld=><div className="meld" key={meld.id} aria-label={`${EVENT_NAMES[meld.type]} ${tileName(meld.tile)}`}>
    <div className="meld-tiles">{Array.from({length:meld.type==='pung'?3:4},(_,i)=><Tile key={i} tile={meld.tile} back={meld.type==='concealedKong' && i>0} />)}</div>
    <span className="meld-label">{EVENT_NAMES[meld.type]}</span>
  </div>)}</div>;
}

function River({player}) {
  return <div className="river" aria-label="弃牌区">{player.discards.filter(item=>item.kind!=='win').map(item=><Tile key={item.id} tile={item.tile} />)}</div>;
}

function WinningTile({id,player}){
  return <div className={id==='self'?'drawn-tile winning-hand-tile':'opponent-draw opponent-win'} aria-label={`${PLAYER_NAMES[id]}胡牌 ${tileName(player.win.tile)}`}>
    <Tile tile={player.win.tile}/><span className={id==='self'?'drawn-tile-label':'opponent-draw-label'}>{player.win.heavenly?'天胡':'胡牌'}</span>
  </div>;
}

export function Table({state,selectedPlayer,onSelectPlayer,selectedTile,onSelectOwnTile}) {
  const own=state.players.self;
  const hand=[...own.hand];
  let drawn=null;
  if (state.drawnTile&&!own.won) { const index=hand.lastIndexOf(state.drawnTile); if (index>=0) drawn=hand.splice(index,1)[0]; }
  return <section className="mahjong-table" aria-label="四川麻将牌桌">
    <div className="table-caption"><span>{state.finished?'本局结束':'四川血战'}</span><span>{state.finished?'三家已胡':state.isDemo?'演示牌局 · 可直接编辑':'手动记录牌局'}</span></div>
    {['top','left','right'].map(id=>{const player=state.players[id],separatedDraw=Boolean(player.hasDrawn&&!player.won),count=concealedCount(player),separateSlot=separatedDraw||player.won;return <div key={id} className={`opponent player-${id} ${player.won?'player-won':''}`} data-player={id}>
      <div className="opponent-label"><Badge id={id} player={state.players[id]} onSelect={onSelectPlayer} selected={selectedPlayer===id} disabled={state.finished||Boolean(state.pendingPlayer&&state.pendingPlayer!==id)}/></div>
      <div className="concealed-tiles" style={{'--concealed-count':count+Number(player.won),'--separated-gap':separateSlot?'14px':'0px'}} aria-label={`${PLAYER_NAMES[id]}暗手${count}张`}>{Array.from({length:count-Number(separatedDraw)},(_,i)=><Tile back key={i}/>) }
        {separatedDraw&&<div className="opponent-draw" aria-label={`${PLAYER_NAMES[id]}新摸牌`}><Tile back/><span className="opponent-draw-label">{isInitialDealerTurn(state,id)?'庄家首打':'新摸牌'}</span></div>}
        {player.won&&<WinningTile id={id} player={player}/>}
      </div>
      <div className="public-tiles"><Melds player={state.players[id]} /><River player={state.players[id]}/></div>
    </div>})}
    <div className="own-public"><Melds player={own}/><River player={own}/></div>
    <div className="own-player">
      <Badge id="self" player={own} onSelect={onSelectPlayer} selected={selectedPlayer==='self'} disabled={state.finished||Boolean(state.pendingPlayer&&state.pendingPlayer!=='self')}/>
      <div className="own-hand" aria-label={`我的手牌${own.hand.length+Number(own.won)}张`}>
        <div className="hand-tiles">{hand.map((tile,i)=><Tile key={`${tile}-${i}`} tile={tile} disabled={Boolean(state.pendingPlayer&&state.pendingPlayer!=='self')} selected={!own.won&&selectedPlayer==='self' && selectedTile===tile} onClick={own.won||state.finished?undefined:()=>onSelectOwnTile(tile)}/>)}
        {drawn && <div className="drawn-tile"><Tile tile={drawn} selected={selectedPlayer==='self' && selectedTile===drawn} onClick={()=>onSelectOwnTile(drawn)} /><span className="drawn-tile-label">{isInitialDealerTurn(state,'self')?'庄家第14张':'新摸牌'}</span></div>}
        {own.won&&<WinningTile id="self" player={own}/>}</div>
        {!own.hand.length && <p className="empty-hand">点击“手牌设置”，录入你的起始牌</p>}
      </div>
    </div>
  </section>;
}
