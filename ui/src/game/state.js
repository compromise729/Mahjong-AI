import {SUIT_NAMES,TILE_IDS,tileName,sortHand} from './tiles.js';
import {isWinningHand,canSelfWinOnDiscard,selfWinningValue,passedWinBlocked} from './hand.js';
import {winningContext,isReplacementTurn,kongCount} from './win-context.js';
import {legalDiscardTiles} from './decision/rules.js';
export {SUIT_NAMES,TILE_IDS,tileName,sortHand} from './tiles.js';
export const PLAYERS = ['self', 'left', 'top', 'right'];
export const PLAYER_NAMES = {self:'我', left:'上家', top:'对家', right:'下家'};
export const EVENT_NAMES = {draw:'摸牌', discard:'出牌', pung:'碰牌', openKong:'明杠', addedKong:'补杠', concealedKong:'暗杠',win:'胡牌',pass:'过'};

export function createGame() {
  return {
    initialized:false, isDemo:false, finished:false, dealerSeat:null, wallRemaining:null, pendingPlayer:null, pendingKong:null, discardResponse:null, drawnTile:null, nextId:1, events:[], history:[],
    players:Object.fromEntries(PLAYERS.map(id=>[id,{missing:null,discards:[],melds:[],hasDrawn:false,pendingDiscard:false,won:false,win:null,passedWins:[],passedWinValues:{},...(id==='self'?{hand:[]}:{})}]))
  };
}
export const concealedCount = player => player.hand ? player.hand.length : Math.max(0,13-player.melds.length*3)+Number(Boolean(player.hasDrawn||player.pendingDiscard));
export const isInitialDealerTurn=(state,player)=>state.dealerSeat===player&&state.events.length>0&&state.events.every(e=>e.type==='setup');
export function knownCounts(state) {
  const counts = Object.fromEntries(TILE_IDS.map(tile=>[tile,0]));
  const add = (tile,n=1) => { if (!TILE_IDS.includes(tile)) throw new Error('牌面无效'); counts[tile]+=n; };
  state.players.self.hand.forEach(tile=>add(tile));
  const riverTiles=new Set();
  for (const player of Object.values(state.players)) {
    player.discards.forEach(item=>{const physicalId=item.physicalId??`discard:${item.id}`;if(!riverTiles.has(physicalId)){riverTiles.add(physicalId);add(item.tile);}});
    player.melds.forEach(meld=>add(meld.tile,meld.type==='pung'?3:4));
  }
  return counts;
}
function validateCounts(state) {
  for (const [tile,count] of Object.entries(knownCounts(state))) {
    if (count>4) throw new Error(`${tileName(tile)}最多只有4张，请检查手牌、弃牌和碰杠记录。`);
  }
}
function snapshot(state) { const result=structuredClone(state); delete result.history; return result; }
function commit(before,after,event) {
  validateCounts(after);
  after.events.push({...event,id:after.nextId++});
  after.history=[...before.history,snapshot(before)];
  return after;
}
export function initializeGame(state,{hand,dealer=false,dealerSeat=null,missing={}}) {
  if(dealerSeat!==null&&!PLAYERS.includes(dealerSeat))throw new Error('请选择有效庄家。');
  const firstPlayer=dealerSeat??(dealer?'self':null);
  const required=firstPlayer==='self'?14:13;
  if (!Array.isArray(hand) || hand.length!==required) throw new Error(`请设置${required}张起始手牌。`);
  if (hand.some(tile=>!TILE_IDS.includes(tile))) throw new Error('手牌包含无效牌面。');
  const next=createGame();
  next.initialized=true;
  next.players.self.hand=sortHand(hand);
  next.drawnTile=firstPlayer==='self'?hand.at(-1):null;
  next.dealerSeat=firstPlayer;
  next.wallRemaining=55;
  if(firstPlayer)next.players[firstPlayer].hasDrawn=true;
  next.pendingPlayer=firstPlayer;
  for (const id of PLAYERS) {
    const suit=missing[id]??null;
    if (suit!==null && !Object.keys(SUIT_NAMES).includes(suit)) throw new Error('定缺花色无效。');
    next.players[id].missing=suit;
  }
  next.nextId=state.nextId;
  return commit(state,next,{type:'setup',player:'self',label:'已设置起始牌局'});
}
function removeHand(player,tile,count) {
  if (player.hand.filter(t=>t===tile).length<count) throw new Error(`手牌中没有足够的${tileName(tile)}。`);
  for (let i=0;i<count;i++) player.hand.splice(player.hand.indexOf(tile),1);
}
function drawFromWall(state){
  if(!Number.isInteger(state.wallRemaining))throw new Error('旧牌局尚无牌墙数据，请在手牌设置中选择庄家开始新局。');
  if(state.wallRemaining<=0)throw new Error('牌墙已摸完，不能再摸牌。');
  state.wallRemaining-=1;
}
function recordPassedWin(next,state,winType){
  const own=next.players.self,tile=winType==='selfDraw'?state.drawnTile:state.discardResponse?.tile;
  const value=selfWinningValue(state,winType);
  if(!tile||!value)return;
  own.passedWins=[...new Set([...(own.passedWins??[]),tile])];
  own.passedWinValues??={};
  own.passedWinValues[tile]={multiplier:value.multiplier,fan:value.uncappedFan,kongCount:kongCount(state.players.self)};
}
export function applyEvent(state,event) {
  if (!state.initialized) throw new Error('请先设置自己的起始手牌。');
  const {player:id,type,tile,source}=event;
  if (!PLAYERS.includes(id)) throw new Error('请选择有效玩家。');
  if (!Object.keys(EVENT_NAMES).includes(type)) throw new Error('操作类型无效。');
  if (state.finished) throw new Error('三家已胡牌，本局已结束。请设置新牌局或撤销。');
  if (state.players[id].won) throw new Error('该玩家已胡牌，退出本局后续摸打。');
  const kongResponse=state.pendingKong&&id!==state.pendingKong.player&&(type==='pass'||type==='win'&&event.winType==='discard'&&source===state.pendingKong.player&&tile===state.pendingKong.tile);
  if(state.pendingKong&&id!==state.pendingKong.player&&!kongResponse)throw new Error('补杠响应期间只能抢杠胡或过；补杠者之后补牌。');
  if(state.pendingPlayer&&state.pendingPlayer!==id&&!kongResponse)throw new Error(`请先完成${PLAYER_NAMES[state.pendingPlayer]}的出牌，再记录其他玩家的动作。`);
  if(state.pendingPlayer===id&&!state.players[id].hasDrawn&&!state.players[id].pendingDiscard&&type!=='draw')throw new Error('请先记录该玩家杠后的补牌，再完成出牌。');
  if(event.discardId!=null&&(!state.discardResponse||state.discardResponse.id!==event.discardId||selfPassedResponse(state,id)))throw new Error('这张弃牌的响应已过期，请按当前出牌重新选择。');
  const unknownDraw=type==='draw'&&id!=='self';
  const selfDrawWin=type==='win'&&event.winType==='selfDraw';
  if(selfDrawWin&&tile!=null&&!TILE_IDS.includes(tile))throw new Error('请选择有效胡牌牌面。');
  if (!unknownDraw&&!selfDrawWin&&type!=='pass'&&!TILE_IDS.includes(tile)) throw new Error('请选择有效牌面。');
  if(['pung','openKong','addedKong','concealedKong'].includes(type)&&state.players[id].missing&&tile.startsWith(state.players[id].missing+'-'))throw new Error('定缺花色的牌不能碰牌、明杠、补杠或暗杠。');
  if(['openKong','addedKong','concealedKong'].includes(type)&&!(state.wallRemaining>0))throw new Error('牌墙无牌可补，不能杠牌。');
  if(id!=='self'&&['pung','openKong'].includes(type)&&canSelfWinOnDiscard(state))throw new Error('胡牌优先，请先处理自己的胡牌或明确过牌，再记录他家碰杠。');
  if (unknownDraw&&tile!=null) throw new Error('别家摸牌不填写具体牌面，只有自己摸牌选择牌面。');
  const next=structuredClone(state),player=next.players[id],self=id==='self';
  const restCount=13-player.melds.length*3;
  if(!self&&['addedKong','concealedKong'].includes(type)&&!player.hasDrawn)throw new Error('请先记录该玩家摸牌，再记录补杠或暗杠。');
  if(type!=='win'&&type!=='pass'){
    if(canSelfWinOnDiscard(state))recordPassedWin(next,state,'discard');
    if(self&&['discard','addedKong','concealedKong'].includes(type)&&state.players.self.missing&&state.players.self.hasDrawn&&state.drawnTile&&selfWinningValue(state,'selfDraw')&&!passedWinBlocked(state,state.drawnTile,'selfDraw'))recordPassedWin(next,state,'selfDraw');
    next.discardResponse=null;
  }
  if(self && (type==='pung'||type==='openKong') && player.hand.length!==restCount) throw new Error('请先完成自己的出牌，再记录碰牌或明杠。');
  if(self && (type==='addedKong'||type==='concealedKong') && player.hand.length!==restCount+1) throw new Error('请先记录自己的摸牌，再记录补杠或暗杠。');
  if (type==='draw') {
    if (self?player.hand.length!==restCount:player.hasDrawn||player.pendingDiscard) throw new Error('请先完成出牌，再记录新的摸牌。');
    const replacementDraw=state.pendingPlayer===id&&!state.players[id].hasDrawn&&!state.players[id].pendingDiscard;
    if(next.pendingKong){
      const pending=next.pendingKong;
      const meld=player.melds.find(m=>m.id===pending.meldId&&m.type==='pung');
      if(!meld)throw new Error('待补杠的碰牌组已变化。');
      meld.type='addedKong';
      player.discards=player.discards.filter(d=>d.physicalId!==pending.physicalId);
      next.pendingKong=null;
    }
    drawFromWall(next);
    if(self){player.hand.push(tile);next.drawnTile=tile;if(!replacementDraw){player.passedWins=[];player.passedWinValues={};}}
    event={...event,replacementDraw};
    player.hasDrawn=true;
    next.pendingPlayer=id;
  } else if (type==='discard') {
    event={...event,afterKong:isReplacementTurn(state,id)};
    if(!self&&!player.hasDrawn&&!player.pendingDiscard)drawFromWall(next);
    if (self) {
      if (!player.hand.includes(tile)) throw new Error(`手牌中没有${tileName(tile)}。`);
      if (player.hand.length!==restCount+1) throw new Error('请先摸牌或完成碰杠，再记录自己的出牌。');
      if (!legalDiscardTiles(player.hand,player.missing).includes(tile)) throw new Error('手中仍有定缺牌，必须优先打出定缺牌。');
      removeHand(player,tile,1); player.hand=sortHand(player.hand); next.drawnTile=null;
    }
    player.discards.push({tile,id:next.nextId});
    player.hasDrawn=false;player.pendingDiscard=false;
    next.pendingPlayer=null;
    next.discardResponse={player:id,tile,id:next.nextId,winners:[]};
  } else if(type==='pass'){
    const response=next.discardResponse;
    if(!self||!response||response.player==='self'||response.selfPassed)throw new Error('当前没有可跳过的别家出牌响应。');
    if(canSelfWinOnDiscard(state))recordPassedWin(next,state,'discard');
    response.selfPassed=true;
    return commit(state,next,{...event,tile:response.tile,source:response.player});
  } else if(type==='win'){
    if(!['selfDraw','discard'].includes(event.winType))throw new Error('请选择自摸或点炮胡牌。');
    if(!player.missing)throw new Error('请先设置该玩家的定缺，才能记录胡牌。');
    if(player.melds.some(m=>m.tile.startsWith(player.missing+'-'))||(tile&&tile.startsWith(player.missing+'-')))throw new Error('胡牌不能含有定缺花色。');
    if(event.winType==='selfDraw'){
      const winningTile=tile??(self?next.drawnTile:null);
      if(!TILE_IDS.includes(winningTile))throw new Error('请选择自摸胡牌的那张牌。');
      if(winningTile.startsWith(player.missing+'-'))throw new Error('胡牌不能含有定缺花色。');
      if(self){
        if(!player.hasDrawn)throw new Error('请先记录自己的摸牌，再记录自摸胡牌。');
        if(!isWinningHand(player.hand,player.melds,player.missing))throw new Error('自己的手牌尚不满足合法胡牌结构。');
        if(passedWinBlocked(state,winningTile,'selfDraw'))throw new Error('这张牌受过手胡限制，杠后须升番或等下一次普通摸牌。');
        if(next.drawnTile&&winningTile!==next.drawnTile)throw new Error('自摸胡牌张须与自己新摸到的牌一致。');
        removeHand(player,winningTile,1);player.hand=sortHand(player.hand);next.drawnTile=null;
      }else if(!player.hasDrawn)throw new Error('请先记录该玩家摸牌，再记录自摸胡牌。');
      player.discards.push({tile:winningTile,id:next.nextId,kind:'win',physicalId:`win-draw:${next.nextId}`});
      event={...event,tile:winningTile};
      player.hasDrawn=false;
      next.discardResponse=null;
    }else{
      const response=next.discardResponse;
      if(!response||response.player!==source||response.tile!==tile||source===id)throw new Error('点炮胡牌须对应当前尚未结束响应的弃牌。');
      if(player.hasDrawn||player.pendingDiscard)throw new Error('请完成自己的出牌后，再响应他家的弃牌胡牌。');
      if(self&&(passedWinBlocked(state,tile,'discard')||response.selfPassed))throw new Error('这张牌受过手胡限制，杠后须升番或等下一次普通摸牌。');
      if(self){
        if(!isWinningHand([...player.hand,tile],player.melds,player.missing))throw new Error('加上该弃牌后，自己的手牌仍不满足合法胡牌结构。');
        const river=next.players[source].discards,index=river.findIndex(item=>item.id===response.id);
        if(index<0)throw new Error('来源弃牌已被其他动作使用。');
        next.drawnTile=null;
      }
      const winningDiscard=next.players[source].discards.find(item=>item.id===response.id);
      if(winningDiscard)winningDiscard.winClaimed=true;
      response.winners.push(id);
      player.discards.push({tile,id:next.nextId,kind:'win',physicalId:winningDiscard?.physicalId??`discard:${response.id}`,source});
      if(response.robKong){next.pendingKong=null;event={...event,robKong:true};}
    }
    player.won=true;player.pendingDiscard=false;
    next.pendingPlayer=null;
    const heavenly=event.winType==='selfDraw'&&isInitialDealerTurn(state,id);
    const context=winningContext(state,id,event.winType);
    const value=self?selfWinningValue(state,event.winType):null;
    event={...event,heavenly,earthly:context.earthly,...(value?{value}:{})};
    player.win={type:event.winType,tile:event.tile,source:event.winType==='discard'?source:null,order:PLAYERS.filter(p=>next.players[p].won).length,heavenly,earthly:context.earthly,...(value?{value}:{}),...(event.robKong?{robKong:true}:{})};
    next.finished=PLAYERS.filter(p=>next.players[p].won).length>=3;
  } else if (type==='addedKong') {
    const meld=player.melds.find(m=>m.type==='pung' && m.tile===tile);
    if (!meld) throw new Error(`没有可补杠的${tileName(tile)}碰牌组。`);
    if (self) removeHand(player,tile,1);
    const physicalId=`kong:${next.nextId}`;
    next.pendingKong={player:id,tile,meldId:meld.id,physicalId};
    player.discards.push({tile,id:next.nextId,kind:'kongOffer',physicalId});
    next.discardResponse={player:id,tile,id:next.nextId,winners:[],robKong:true};
    if (self) next.drawnTile=null;
    player.hasDrawn=false;player.pendingDiscard=false;
    next.pendingPlayer=id;
  } else {
    if (player.melds.length>=4) throw new Error('已记录四组碰杠，不能继续增加副露。');
    if (type==='pung' || type==='openKong') {
      if (!PLAYERS.includes(source) || source===id) throw new Error('请选择另一位玩家的对应弃牌。');
      if(next.players[source].won)throw new Error('来源玩家已胡牌，不能再参与新的碰杠。');
      if(!self&&(player.hasDrawn||player.pendingDiscard))throw new Error('请先完成自己的出牌，再记录碰牌或明杠。');
      const response=state.discardResponse;
      if(!response||response.player!==source||response.tile!==tile)throw new Error('碰牌或明杠必须使用当前最近的一张弃牌。');
      event={...event,discardId:response.id};
      const river=next.players[source].discards,index=river.findLastIndex(item=>item.tile===tile&&!item.winClaimed&&item.kind!=='win'&&(event.discardId==null||item.id===event.discardId));
      if (index<0) throw new Error(`来源玩家没有可用的${tileName(tile)}弃牌，已用于胡牌的牌不能再碰杠。`);
      if (self) removeHand(player,tile,type==='pung'?2:3);
      river.splice(index,1); player.melds.push({type,tile,source,id:next.nextId});
      player.hasDrawn=false;player.pendingDiscard=type==='pung';
    } else if (type==='concealedKong') {
      if (self) removeHand(player,tile,4);
      player.melds.push({type,tile,source:null,id:next.nextId});
      player.hasDrawn=false;player.pendingDiscard=false;
    }
    if (self) next.drawnTile=null;
    next.pendingPlayer=id;
  }
  return commit(state,next,event);
}
function selfPassedResponse(state,id){return id==='self'&&state.discardResponse.selfPassed;}
export function undo(state) {
  if (!state.history.length) return state;
  return {...structuredClone(state.history.at(-1)),history:state.history.slice(0,-1)};
}
export function createDemoGame() {
  const hand=['wan-1','wan-2','wan-3','wan-6','wan-7','wan-8','tiao-2','tiao-3','tiao-4','tiao-6','tiao-7','tiao-8','tong-5'];
  let state=initializeGame(createGame(),{hand,dealerSeat:'left',missing:{self:'tong',left:'tong',top:'tiao',right:'tong'}});
  const pairs=[['left','wan-2'],['left','tiao-5'],['left','tong-2'],['left','tong-7'],['top','wan-4'],['top','tong-1'],['top','tiao-1'],['right','wan-1'],['right','tiao-3']];
  for (const [player,tile] of pairs) state=applyEvent(state,{player,type:'discard',tile});
  state=applyEvent(state,{player:'right',type:'discard',tile:'wan-9'});
  state=applyEvent(state,{player:'left',type:'pung',tile:'wan-9',source:'right'});
  state=applyEvent(state,{player:'left',type:'discard',tile:'wan-5'});
  state=applyEvent(state,{player:'right',type:'discard',tile:'tong-4'});
  state=applyEvent(state,{player:'top',type:'openKong',tile:'tong-4',source:'right'});
  state=applyEvent(state,{player:'top',type:'draw'});
  state=applyEvent(state,{player:'top',type:'discard',tile:'wan-7'});
  state=applyEvent(state,{player:'right',type:'draw'});
  state=applyEvent(state,{player:'right',type:'concealedKong',tile:'tiao-9'});
  state=applyEvent(state,{player:'right',type:'draw'});
  state=applyEvent(state,{player:'right',type:'discard',tile:'tong-6'});
  state=applyEvent(state,{player:'self',type:'draw',tile:'tong-5'});
  state.isDemo=true; state.history=[]; validateCounts(state); return state;
}
