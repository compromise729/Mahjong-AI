import {TILE_IDS} from '../tiles.js';
export function seededRandom(seed=20261020){
  let x=(Number(seed)>>>0)||0x9e3779b9;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
export function sampleWorlds(observation,{seed=20261020,samples=256}={}){
  const {state:s,known,concealed}=observation;
  const result={worlds:[],reason:null,seed};
  if(!Number.isInteger(samples)||samples<0||samples>4096){result.reason='采样预算须为0至4096的整数。';return result;}
  if(!samples){result.reason='当前未启用隐藏牌采样。';return result;}
  if(!s.dealerSeat){result.reason='采样需要完整庄家与起手牌数信息。';return result;}
  if(!Number.isInteger(s.wallRemaining)||s.wallRemaining<0){result.reason='牌墙余量无效。';return result;}
  const pool=TILE_IDS.flatMap(tile=>Array(Math.max(0,4-known[tile])).fill(tile));
  const opponents=['left','top','right'];
  if(pool.length!==s.wallRemaining+opponents.reduce((n,id)=>n+concealed[id],0)){
    result.reason='已知牌、暗手与牌墙的库存牌数不一致，暂不采样。';return result;
  }
  const random=seededRandom(seed);
  for(let k=0;k<samples;k++){
    const deck=[...pool];
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    const hands={};let offset=0;
    for(const id of opponents){hands[id]=deck.slice(offset,offset+concealed[id]);offset+=concealed[id];}
    result.worlds.push({hands,wall:deck.slice(offset)});
  }
  return result;
}
