export const SUIT_NAMES={wan:'万',tiao:'条',tong:'筒'};
export const TILE_IDS=Object.keys(SUIT_NAMES).flatMap(suit=>Array.from({length:9},(_,i)=>`${suit}-${i+1}`));
const NUMBERS='一二三四五六七八九';
export const tileName=tile=>TILE_IDS.includes(tile)?NUMBERS[Number(tile.split('-')[1])-1]+SUIT_NAMES[tile.split('-')[0]]:'未选牌';
export const sortHand=hand=>[...hand].sort((a,b)=>TILE_IDS.indexOf(a)-TILE_IDS.indexOf(b));
