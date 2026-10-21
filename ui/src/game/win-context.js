const MELDS=['pung','openKong','addedKong','concealedKong'];
export const kongCount=player=>player.melds.filter(m=>m.type!=='pung').length;

export function isReplacementTurn(state,player){
  const events=state.events??[],last=events.findLast(e=>e.player===player&&e.type!=='pass');
  if(last?.type!=='draw')return false;
  if(last.replacementDraw!==undefined)return last.replacementDraw;
  const previous=events.slice(0,events.indexOf(last)).findLast(e=>e.player===player&&e.type!=='pass');
  return ['openKong','addedKong','concealedKong'].includes(previous?.type);
}

export function winningContext(state,player,winType,response=state.discardResponse){
  const events=state.events??[],selfDraw=winType==='selfDraw';
  const heavenly=selfDraw&&state.dealerSeat===player&&events.length>0&&events.every(e=>e.type==='setup');
  const ownDraws=events.filter(e=>e.player===player&&e.type==='draw').length;
  const ownDiscard=events.some(e=>e.player===player&&e.type==='discard');
  const earthly=Boolean(state.dealerSeat&&state.dealerSeat!==player&&!ownDiscard&&ownDraws<=1&&!events.some(e=>MELDS.includes(e.type)));
  const discard=!selfDraw&&events.find(e=>e.id===response?.id&&e.type==='discard');
  return {selfDraw,heavenly,earthly,kongFlower:selfDraw&&isReplacementTurn(state,player),robKong:!selfDraw&&Boolean(response?.robKong),kongShot:!selfDraw&&Boolean(discard?.afterKong),lastTile:selfDraw&&state.wallRemaining===0};
}
