import assert from 'node:assert/strict';
import {TILE_IDS,sortHand} from '../../ui/src/game/tiles.js';
import {winningHandValue} from '../../ui/src/game/hand-value.js';
import {legalDiscardTiles} from '../../ui/src/game/decision/rules.js';
import {Ledger} from './ledger.mjs';

export const ACTIONS=137;
export const TYPES=['discard','pung','openKong','addedKong','concealedKong'];
export const SUITS=['wan','tiao','tong'];
export function encodeAction(a){return a.type==='win'?135:a.type==='pass'?136:TYPES.indexOf(a.type)*27+TILE_IDS.indexOf(a.tile);}
export function rng(seed){
  let x=seed>>>0;
  return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
const count=(hand,tile)=>hand.filter(t=>t===tile).length;
const kongs=p=>p.melds.filter(m=>m.type!=='pung').length;
function remove(hand,tile,n=1){for(let i=0;i<n;i++){const j=hand.indexOf(tile);if(j<0)throw new Error('Missing physical tile');hand.splice(j,1);}}

export class Game {
  constructor({seed=0,dealer=seed%4,mandatoryLastFourHu=true}={}){
    if(!Number.isInteger(seed)||!Number.isInteger(dealer)||dealer<0||dealer>3)throw new Error('Invalid seed/dealer');
    this.seed=seed;this.random=rng(seed);this.dealer=dealer;this.mandatoryLastFourHu=mandatoryLastFourHu;
    this.players=Array.from({length:4},()=>({hand:[],melds:[],discards:[],won:false,win:null,missing:null,passed:{},draws:0,discarded:false}));
    this.wall=TILE_IDS.flatMap(t=>[t,t,t,t]);
    for(let i=107;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.wall[i],this.wall[j]]=[this.wall[j],this.wall[i]];}
    for(let round=0;round<3;round++)for(let j=0;j<4;j++)this.players[(dealer+j)%4].hand.push(...this.wall.splice(0,4));
    for(let j=0;j<4;j++)this.players[(dealer+j)%4].hand.push(this.wall.shift());
    this.players[dealer].hand.push(this.wall.shift());
    const exchange=this.players.map(p=>{
      const suit=[...SUITS].sort((a,b)=>p.hand.filter(t=>t.startsWith(b)).length-p.hand.filter(t=>t.startsWith(a)).length||SUITS.indexOf(a)-SUITS.indexOf(b))[0];
      const tiles=sortHand(p.hand.filter(t=>t.startsWith(suit))).slice(0,3);
      tiles.forEach(t=>remove(p.hand,t));return tiles;
    });
    this.exchangeDirection=1+Math.floor(this.random()*3);
    exchange.forEach((tiles,s)=>this.players[(s+this.exchangeDirection)%4].hand.push(...tiles));
    for(const p of this.players){
      p.hand=sortHand(p.hand);
      p.missing=[...SUITS].sort((a,b)=>p.hand.filter(t=>t.startsWith(a)).length-p.hand.filter(t=>t.startsWith(b)).length||SUITS.indexOf(a)-SUITS.indexOf(b))[0];
    }
    this.ledger=new Ledger();this.events=[];this.actor=dealer;this.phase='turn';this.done=false;
    this.pending=null;this.drawn=this.players[dealer].hand.at(-1);this.replacement=false;
    this.afterPung=false;this.anyMeld=false;this.initial=true;this.kongChain=[];this.decisions=0;
    this.stageDecisions={2:0,3:0,4:0};
    this.assertValid();
  }
  active(){return this.players.map((p,s)=>!p.won?s:null).filter(s=>s!==null);}
  next(seat){for(let i=1;i<=4;i++){const s=(seat+i)%4;if(!this.players[s].won)return s;}throw new Error('No active player');}
  emit(type,seat,extra={}){const e={id:this.events.length+1,type,seat,...extra};this.events.push(e);return e.id;}
  context(seat,selfDraw){
    const p=this.players[seat];
    return {selfDraw,heavenly:selfDraw&&seat===this.dealer&&this.initial,
      earthly:seat!==this.dealer&&!p.discarded&&p.draws<=1&&!this.anyMeld,
      kongFlower:selfDraw&&this.replacement,robKong:!selfDraw&&Boolean(this.pending?.rob),
      kongShot:!selfDraw&&Boolean(this.pending?.afterKong),lastTile:selfDraw&&this.wall.length===0};
  }
  winValue(seat,selfDraw){
    const p=this.players[seat],tile=selfDraw?this.drawn:this.pending?.tile;
    if(!tile)return null;
    const value=winningHandValue(selfDraw?p.hand:[...p.hand,tile],p.melds,p.missing,this.context(seat,selfDraw));
    if(!value)return null;
    const passed=p.passed[tile];
    if(passed&&!(kongs(p)>passed.kongs&&value.uncappedFan>passed.fan))return null;
    return value;
  }
  recordPass(seat,selfDraw){
    const value=this.winValue(seat,selfDraw);
    if(value)this.players[seat].passed[selfDraw?this.drawn:this.pending.tile]={fan:value.uncappedFan,kongs:kongs(this.players[seat])};
  }
  legalFor(seat,phase=this.phase){
    if(this.done||this.players[seat].won)return [];
    const p=this.players[seat],a=[];
    if(phase==='turn'){
      if(this.winValue(seat,true))a.push({type:'win'});
      if(a.length&&this.mandatoryLastFourHu&&this.wall.length<4)return a;
      for(const tile of legalDiscardTiles(p.hand,p.missing))a.push({type:'discard',tile});
      if(!this.afterPung&&this.wall.length)for(const tile of new Set(p.hand)){
        if(tile.startsWith(p.missing))continue;
        if(count(p.hand,tile)===4)a.push({type:'concealedKong',tile});
        if(p.melds.some(m=>m.type==='pung'&&m.tile===tile))a.push({type:'addedKong',tile});
      }
    }else{
      if(this.winValue(seat,false))a.push({type:'win'});
      if(a.length&&this.mandatoryLastFourHu&&this.wall.length<4)return a;
      const {tile,rob}=this.pending;
      if(!rob&&!tile.startsWith(p.missing)){
        if(count(p.hand,tile)>=2)a.push({type:'pung',tile});
        if(count(p.hand,tile)>=3&&this.wall.length)a.push({type:'openKong',tile});
      }
      a.push({type:'pass'});
    }
    return a;
  }
  legalActions(){return this.done?[]:this.legalFor(this.actor);}
  mask(){const m=Array(ACTIONS).fill(false);for(const a of this.legalActions())m[encodeAction(a)]=true;return m;}
  draw(seat,replacement=false){
    if(!this.wall.length){this.finishDraw();return;}
    this.actor=seat;this.phase='turn';this.pending=null;this.afterPung=false;this.initial=false;
    this.drawn=replacement?this.wall.pop():this.wall.shift();
    this.replacement=replacement;
    if(!replacement){this.players[seat].passed={};this.kongChain=[];}
    this.players[seat].draws++;this.players[seat].hand.push(this.drawn);
    this.emit('draw',seat,{tile:this.drawn,replacement});
  }
  startResponses(source,tile,rob=false,afterKong=false){
    this.phase='response';
    const eventId=rob?this.emit('kongOffer',source,{tile}):this.events.findLast(e=>e.type==='discard'&&e.seat===source).id;
    this.pending={source,tile,rob,afterKong,eventId,choices:[],queue:[]};
    for(let i=1;i<4;i++){
      const s=(source+i)%4;
      if(!this.players[s].won&&this.legalFor(s,'response').some(a=>a.type!=='pass'))this.pending.queue.push(s);
    }
    if(this.pending.queue.length)this.actor=this.pending.queue.shift();
    else this.resolveResponses();
  }
  step(actionId){
    if(!Number.isInteger(actionId)||actionId<0||actionId>=ACTIONS)throw new Error('Invalid action id');
    const action=this.legalActions().find(a=>encodeAction(a)===actionId);
    if(!action)throw new Error(`Illegal action ${actionId}`);
    if(++this.decisions>1500)throw new Error('Decision safety limit reached');
    this.stageDecisions[this.active().length]++;
    const seat=this.actor,p=this.players[seat],{type,tile}=action;
    if(this.phase==='response'){
      if(type!=='win')this.recordPass(seat,false);
      this.pending.choices.push({seat,...action});
      // Responses stay private until every eligible seat has selected.
      if(this.pending.queue.length)this.actor=this.pending.queue.shift();
      else this.resolveResponses();
    }else if(type==='win'){
      this.finishWins([seat],seat,true);
    }else{
      this.recordPass(seat,true);
      if(type==='discard'){
        remove(p.hand,tile);p.discarded=true;
        const id=this.emit('discard',seat,{tile,afterKong:this.replacement});
        p.discards.push({tile,id});
        const afterKong=this.replacement;this.initial=false;this.afterPung=false;
        this.startResponses(seat,tile,false,afterKong);
      }else if(type==='addedKong'){
        this.initial=false;this.startResponses(seat,tile,true,false);
      }else{
        remove(p.hand,tile,4);p.melds.push({type,tile,source:null,id:this.events.length+1});
        this.completeKong(type,seat,null,tile);
      }
    }
    this.assertValid();
    return this;
  }
  completeKong(type,seat,source,tile){
    const id=this.emit(type,seat,{tile,source});
    this.anyMeld=true;this.initial=false;
    this.kongChain.push(...this.ledger.kong(type,seat,source,this.active(),id));
    this.draw(seat,true);
  }
  resolveResponses(){
    const pending=this.pending,{source,tile,rob,choices}=pending;
    const winners=choices.filter(a=>a.type==='win').map(a=>a.seat);
    if(winners.length){
      if(rob){
        remove(this.players[source].hand,tile);
        this.players[source].discards.push({tile,id:this.events.length+1});
      }
      this.finishWins(winners,source,false);
      return;
    }
    if(rob){
      remove(this.players[source].hand,tile);
      this.players[source].melds.find(m=>m.type==='pung'&&m.tile===tile).type='addedKong';
      this.completeKong('addedKong',source,null,tile);
      return;
    }
    const claim=choices.find(a=>a.type==='pung'||a.type==='openKong');
    this.kongChain=[];
    if(claim){
      const p=this.players[claim.seat];
      const river=this.players[source].discards;
      const index=river.findLastIndex(d=>d.tile===tile);
      if(index<0)throw new Error('Missing claimed discard');
      river.splice(index,1);
      remove(p.hand,tile,claim.type==='pung'?2:3);
      p.melds.push({type:claim.type,tile,source,id:this.events.length+1});
      if(claim.type==='openKong')this.completeKong(claim.type,claim.seat,source,tile);
      else{
        this.emit('pung',claim.seat,{tile,source});this.anyMeld=true;this.pending=null;
        this.actor=claim.seat;this.phase='turn';this.afterPung=true;this.replacement=false;this.drawn=null;
      }
    }else this.draw(this.next(source));
  }
  finishWins(winners,source,selfDraw,fixedValue=null){
    const active=this.active(),pending=this.pending;
    const ordered=[...winners].sort((a,b)=>((a-source+4)%4)-((b-source+4)%4));
    const values=ordered.map(s=>fixedValue??this.winValue(s,selfDraw));
    if(values.some(v=>!v))throw new Error('Invalid winner');
    ordered.forEach((seat,i)=>{
      const value=values[i];
      const trigger=selfDraw?null:pending?.eventId;
      const id=this.emit('win',seat,{tile:selfDraw?this.drawn:pending?.tile,source:selfDraw?null:source,selfDraw,multiplier:value.multiplier,trigger});
      for(const from of selfDraw?active.filter(s=>s!==seat):[source])this.ledger.pay(from,seat,value.multiplier,'win',id);
      this.players[seat].won=true;
      this.players[seat].win={selfDraw,source,tile:selfDraw?this.drawn:pending?.tile,value};
    });
    if(!selfDraw&&pending?.afterKong&&ordered.length===1)this.ledger.transfer(this.kongChain,ordered[0],this.events.length);
    this.pending=null;this.kongChain=[];
    if(this.active().length<=1){this.done=true;this.phase='terminal';return;}
    this.draw(this.next(ordered.at(-1)));
  }
  finishDraw(){
    if(this.done)return;
    const active=this.active(),pig=new Set(),ready=new Map();
    for(const s of active){
      const p=this.players[s];
      if([...p.hand,...p.melds.map(m=>m.tile)].some(t=>t.startsWith(p.missing))){pig.add(s);continue;}
      let max=0;
      for(const tile of TILE_IDS){
        const v=winningHandValue([...p.hand,tile],p.melds,p.missing,{});
        if(v)max=Math.max(max,v.multiplier);
      }
      if(max)ready.set(s,max);
    }
    const event=this.emit('settle',null);
    for(const s of pig)for(let to=0;to<4;to++)if(to!==s)this.ledger.pay(s,to,64,'flowerPig',event);
    for(const s of active){
      if(!pig.has(s)&&!ready.has(s))for(const [to,amount] of ready)this.ledger.pay(s,to,amount,'notReady',event);
      if(!ready.has(s))this.ledger.refund(s,event);
    }
    this.done=true;this.phase='terminal';this.pending=null;
  }
  assertValid(){
    const tiles=[...this.wall];
    for(const p of this.players){
      tiles.push(...p.hand,...p.discards.map(d=>d.tile));
      for(const m of p.melds)tiles.push(...Array(m.type==='pung'?3:4).fill(m.tile));
    }
    assert.equal(tiles.length,108,'Physical tile total');
    for(const tile of TILE_IDS)assert.equal(count(tiles,tile),4,`Physical copies ${tile}`);
    assert.equal(this.ledger.scores.reduce((a,b)=>a+b,0),0,'Zero sum');
    if(!this.done)assert.equal(this.players[this.actor].won,false,'Winner cannot act');
  }
}
