import {TILE_IDS} from '../../ui/src/game/tiles.js';
import {SUITS,TYPES} from './engine.mjs';

export const SCHEMA='blood-battle-flat-v1';
export const HISTORY=512;
export const EVENT_TYPES=['draw','discard','pung','openKong','addedKong','concealedKong','win','settle','kongOffer'];
const counts=hand=>TILE_IDS.map(t=>hand.filter(x=>x===t).length/4);
export function observation(game,seat){
  // No simulator/private queue fields or teacher scores are read here.
  const own=game.players[seat],rel=s=>s==null?-1:(s-seat+4)%4;
  const out=[...counts(own.hand)];
  for(let j=0;j<4;j++){
    const p=game.players[(seat+j)%4];
    out.push(Number(p.won),SUITS.indexOf(p.missing)/2,p.hand.length/14,p.draws/60,Number(p.discarded),game.ledger.scores[(seat+j)%4]/2048);
    out.push(...counts(p.discards.map(d=>d.tile)));
    for(const type of TYPES.slice(1))out.push(...TILE_IDS.map(t=>Number(p.melds.some(m=>m.type===type&&m.tile===t))));
  }
  out.push(game.wall.length/55,rel(game.dealer)/3,rel(game.actor)/3,Number(game.phase==='response'),
    Number(game.replacement),Number(game.afterPung),Number(game.initial),Number(game.anyMeld),
    (TILE_IDS.indexOf(game.phase==='turn'&&game.actor===seat?game.drawn:null)+1)/27,
    (TILE_IDS.indexOf(game.pending?.tile)+1)/27,(rel(game.pending?.source)+1)/4,Number(game.pending?.rob??false),Number(game.pending?.afterKong??false),
    Number(game.mandatoryLastFourHu));
  for(const tile of TILE_IDS)out.push(Number(Boolean(own.passed[tile])),(own.passed[tile]?.fan??0)/16,(own.passed[tile]?.kongs??0)/4);
  if(game.events.length>HISTORY)throw new Error('Public history capacity exceeded');
  out.push(game.events.length/HISTORY);
  for(let i=0;i<HISTORY;i++){
    const e=game.events[i];
    if(!e){out.push(0,0,0,0,0,0,0);continue;}
    const tile=e.type==='draw'&&e.seat!==seat?null:e.tile;
    out.push((EVENT_TYPES.indexOf(e.type)+1)/EVENT_TYPES.length,(rel(e.seat)+1)/4,(TILE_IDS.indexOf(tile)+1)/27,
      (rel(e.source)+1)/4,Number(e.replacement??e.afterKong??false),Number(e.selfDraw??false),(e.multiplier??0)/512);
  }
  return out;
}
