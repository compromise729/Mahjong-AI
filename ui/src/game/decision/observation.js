import {PLAYERS,knownCounts,concealedCount} from '../state.js';
import {fingerprint} from './rules.js';

const pick=(object,keys)=>Object.fromEntries(keys.filter(k=>object?.[k]!==undefined).map(k=>[k,structuredClone(object[k])]));
export function observe(input){
  if(!input?.players?.self)throw new Error('牌局信息不完整。');
  const state=pick(input,['initialized','isDemo','finished','dealerSeat','wallRemaining','pendingPlayer','drawnTile','nextId']);
  state.history=[];
  state.pendingKong=input.pendingKong?pick(input.pendingKong,['player','tile','meldId','physicalId']):null;
  state.events=(input.events??[]).map(e=>pick(e,e.type==='draw'&&e.player!=='self'?['id','player','type','replacementDraw']:['id','player','type','tile','source','discardId','winType','heavenly','earthly','robKong','replacementDraw','afterKong']));
  state.players=Object.fromEntries(PLAYERS.map(id=>{
    const p=input.players[id];if(!p)throw new Error('缺少玩家信息。');
    const out=pick(p,['missing','hasDrawn','pendingDiscard','won']);
    out.melds=(p.melds??[]).map(m=>pick(m,['id','type','tile','source']));
    out.discards=(p.discards??[]).map(d=>pick(d,['id','tile','kind','physicalId','source','winClaimed']));
    out.win=p.win?pick(p.win,['type','tile','source','order','heavenly','robKong']):null;
    if(id==='self'){out.hand=[...(p.hand??[])];out.passedWins=[...(p.passedWins??[])];out.passedWinValues=structuredClone(p.passedWinValues??{});}
    return [id,out];
  }));
  state.discardResponse=input.discardResponse?pick(input.discardResponse,['id','tile','player','winners','selfPassed','robKong']):null;
  const known=knownCounts(state);
  if(Object.values(known).some(n=>n>4))throw new Error('已知牌数超过每种4张。');
  return {state,known,stateKey:fingerprint(state),concealed:Object.fromEntries(PLAYERS.map(id=>[id,concealedCount(state.players[id])]))};
}
