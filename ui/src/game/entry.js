const NEXT_SEAT={left:'self',self:'right',right:'top',top:'left'};

export function setupHand(state){
  const own=state.players.self,hand=[...own.hand];
  if(own.won){hand.push(own.win.tile);return hand;}
  if(state.drawnTile){const index=hand.lastIndexOf(state.drawnTile);if(index>=0){hand.splice(index,1);hand.push(state.drawnTile);}}
  return hand;
}

function nextActive(player,state){
  for(let i=0;i<4;i++){player=NEXT_SEAT[player];if(!state?.players[player].won)return player;}
  return null;
}

export function selectSeat(entry,player,state) {
  if(state?.pendingKong&&!state.players[player]?.won&&player!==state.pendingKong.player)return claimEntry({...entry,player},'win',state);
  if(state?.finished||state?.players[player]?.won||state?.pendingPlayer&&state.pendingPlayer!==player)return entry;
  const acting=state?.players[player];
  const needsDraw=!(acting?.hasDrawn||acting?.pendingDiscard)&&(player==='self'||state?.pendingPlayer===player);
  return {...entry,player,type:needsDraw?'draw':'discard',tile:null,source:'',discardId:undefined};
}

export function claimEntry(entry,type,state){
  const response=state.discardResponse;
  const available=response&&response.player!==entry.player&&!(entry.player==='self'&&response.selfPassed);
  return {...entry,type,tile:available?response.tile:null,source:available?response.player:'',discardId:available?response.id:undefined,...(type==='win'?{winType:'discard',robKong:Boolean(response?.robKong)}:{})};
}

export function selfDrawEntry(entry,state){
  return {...entry,type:'win',winType:'selfDraw',tile:entry.player==='self'?state.drawnTile:null,source:'',discardId:undefined};
}

export function afterRecord(entry,state) {
  if(state?.finished)return {player:null,type:'discard',tile:null,source:''};
  if(entry.type==='pass'&&state?.pendingKong)return {player:state.pendingKong.player,type:'draw',tile:null,source:''};
  let anchor=entry.player;
  if((entry.type==='pass'||entry.type==='win'&&entry.winType==='discard')&&state?.discardResponse){
    const response=state.discardResponse;
    anchor=response.player;
    let seat=response.player;
    for(let i=0;i<3;i++){seat=NEXT_SEAT[seat];if(response.winners.includes(seat))anchor=seat;}
  }
  const player=['discard','win','pass'].includes(entry.type)?nextActive(anchor,state):entry.player;
  const needsDraw=(player==='self' && ['discard','win','pass'].includes(entry.type))||['openKong','addedKong','concealedKong'].includes(entry.type);
  return {player,type:needsDraw?'draw':'discard',tile:null,source:''};
}
