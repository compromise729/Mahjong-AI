import { tileName } from '../game/state.js';

export function Tile({ tile, back=false, selected=false, onClick, className='', disabled=false, label }) {
  const name=back?'未公开的牌':tileName(tile);
  const image=<img src={`/tiles/${back?'back':tile}.svg${!back&&tile==='tiao-6'?'?v=2rows-3cols':''}`} alt={onClick?'':name} draggable="false" />;
  const classes=`tile ${back?'tile-back':''} ${selected?'is-selected':''} ${className}`;
  return onClick
    ? <button type="button" className={classes} onClick={onClick} disabled={disabled} aria-label={label??name} aria-pressed={selected}>{image}</button>
    : <span className={classes} role="img" aria-label={label??name}>{image}</span>;
}

export function TilePicker({ value, onSelect, disabledTiles=[] }) {
  return <div className="tile-picker" aria-label="选择牌面">
    {['wan','tiao','tong'].map((suit,row)=><div className={`picker-row suit-${suit}`} key={suit}>
      <span className="suit-label">{['万','条','筒'][row]}</span>
      {Array.from({length:9},(_,i)=>`${suit}-${i+1}`).map(tile=><Tile key={tile} tile={tile} selected={value===tile} onClick={()=>onSelect(tile)} disabled={disabledTiles.includes(tile)} />)}
    </div>)}
  </div>;
}
