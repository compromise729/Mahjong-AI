import { useState } from 'react';
import { XIcon, PlusIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { Tile, TilePicker } from './Tile.jsx';
import { PLAYER_NAMES, SUIT_NAMES, TILE_IDS, tileName } from '../game/state.js';
import { setupHand } from '../game/entry.js';

export function HandSetup({state,onClose,onSave}) {
  const [hand,setHand]=useState(()=>setupHand(state));
  const [dealerSeat,setDealerSeat]=useState(state.dealerSeat??(state.players.self.hand.length===14?'self':'left'));
  const [missing,setMissing]=useState(Object.fromEntries(Object.entries(state.players).map(([id,p])=>[id,p.missing??''])));
  const [error,setError]=useState('');
  const required=dealerSeat==='self'?14:13;
  const add=tile=>{
    if(hand.length>=required) {setError(`已选${required}张，请先移除一张再添加。`);return;}
    if(hand.filter(t=>t===tile).length>=4) {setError(`${tileName(tile)}最多4张。`);return;}
    setHand([...hand,tile]);setError('');
  };
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title">
    <header><div><span className="eyebrow">开始一副新牌</span><h2 id="setup-title">设置起始手牌</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭手牌设置"><XIcon size={24}/></button></header>
    <p className="dialog-intro">点击下方牌面添加，点击已选手牌移除。自己是庄家时，最后添加的第14张牌单独放在旁边，可直接记录合法天胡。保存后清空旧记录，可撤销恢复。</p>
    <div className="setup-role"><label>本局庄家<select aria-label="本局庄家" value={dealerSeat} onChange={e=>{setDealerSeat(e.target.value);setError('');}}>{['self','left','top','right'].map(id=><option key={id} value={id}>{PLAYER_NAMES[id]}</option>)}</select></label><strong className={hand.length===required?'ready':''}>已选 {hand.length} / {required} 张</strong></div>
    <div className="setup-hand">{hand.map((tile,i)=><Tile key={`${tile}-${i}`} tile={tile} onClick={()=>{setHand(hand.filter((_,index)=>index!==i));setError('');}} label={`移除${tileName(tile)}`}/>)}{!hand.length && <span className="muted"><PlusIcon size={24}/>从下方选取你的起始手牌</span>}</div>
    <div className="setup-utilities"><button onClick={()=>{setHand([]);setError('');}}><ArrowCounterClockwiseIcon size={17}/>清空已选手牌</button></div>
    <TilePicker onSelect={add} disabledTiles={TILE_IDS.filter(t=>hand.filter(h=>h===t).length>=4)}/>
    <div className="missing-settings">{['self','left','top','right'].map(id=><label key={id}>{PLAYER_NAMES[id]}的定缺<select value={missing[id]} onChange={e=>setMissing({...missing,[id]:e.target.value})}><option value="">未确定</option>{Object.entries(SUIT_NAMES).map(([suit,name])=><option key={suit} value={suit}>{name}</option>)}</select></label>)}</div>
    <footer><p role="alert">{error||`保存后由${PLAYER_NAMES[dealerSeat]}先出牌，牌墙剩55张，并清空旧记录。`}</p><button className="primary-button" disabled={hand.length!==required} onClick={()=>{try{onSave({hand,dealerSeat,missing:Object.fromEntries(Object.entries(missing).map(([id,suit])=>[id,suit||null]))});}catch(e){setError(e.message);}}}>保存并开始记录</button></footer>
  </section></div>;
}
