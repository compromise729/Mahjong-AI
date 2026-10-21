import readline from 'node:readline';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {Game,ACTIONS,rng} from './engine.mjs';
import {observation,SCHEMA,HISTORY} from './observation.mjs';
import {choose,AGENT_VERSION} from './policies.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=text=>createHash('sha256').update(text).digest('hex');
const sourceFiles=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?sourceFiles(join(dir,d.name)):(/\.(js|mjs)$/.test(d.name)&&!d.name.includes('.test.')?[join(dir,d.name)]:[]));
const meta={schema:SCHEMA,actions:ACTIONS,history:HISTORY,teacherVersion:AGENT_VERSION,
  ruleHash:sha(readFileSync(resolve(root,'麻将规则.md'))),
  codeHash:sha([...sourceFiles(resolve(root,'ui/src/game')),...sourceFiles(resolve(root,'training/sim'))].sort().map(p=>readFileSync(p,'utf8')).join('\n')),
  observationSize:observation(new Game(),0).length};
let game,policies,random,teacherOptions,viewSeat=0;
function metrics(){
  return game.players.map((p,s)=>{
    const wins=game.events.filter(e=>e.type==='win'&&e.seat===s);
    const dealIns=game.events.filter(e=>e.type==='win'&&!e.selfDraw&&e.source===s);
    return {score:game.ledger.scores[s],won:p.won,winDraws:p.won?p.draws:null,
      winIncome:game.ledger.entries.filter(e=>e.reason==='win'&&e.to===s).reduce((n,e)=>n+e.amount,0),
      dealInPayments:game.ledger.entries.filter(e=>e.reason==='win'&&e.from===s&&game.events[e.event-1]?.selfDraw===false).reduce((n,e)=>n+e.amount,0),
      dealInWinners:dealIns.length,dealInEvents:new Set(dealIns.map(e=>e.trigger)).size,winCount:wins.length};
  });
}
function result(){
  const seat=game.done?viewSeat:game.actor;
  return {schema:SCHEMA,done:game.done,actor:game.actor,viewSeat:seat,active:game.active(),phase:game.phase,
    observation:observation(game,seat),mask:game.mask(),scores:game.ledger.scores,
    metrics:game.done?metrics():null,decisions:game.decisions,stageDecisions:game.stageDecisions};
}
function advance(){
  while(!game.done&&policies[game.actor]!=='external')game.step(choose(game,policies[game.actor],random,teacherOptions));
  return result();
}
function handle(r){
  if(r.cmd==='hello')return meta;
  if(r.cmd==='reset'){
    const kinds=r.policies??['external','teacher','teacher','teacher'];
    if(kinds.length!==4||kinds.some(k=>!['external','teacher','efficiency','random'].includes(k)))throw new Error('Invalid policies');
    game=new Game({seed:r.seed??0,dealer:r.dealer??(r.seed??0)%4,mandatoryLastFourHu:r.mandatoryLastFourHu??true});
    policies=kinds;random=rng((r.seed??0)^0xABCD1234);teacherOptions=r.teacherOptions??{};
    viewSeat=r.viewSeat??0;
    return advance();
  }
  if(r.cmd==='step'){game.step(r.action);return advance();}
  if(r.cmd==='teacher')return {action:choose(game,r.kind??'teacher',random,teacherOptions)};
  throw new Error(`Unknown command: ${r.cmd}`);
}
const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of lines){
  let request;
  try{
    request=JSON.parse(line);
    process.stdout.write(JSON.stringify({id:request.id,ok:true,result:handle(request)})+'\n');
  }catch(error){
    process.stdout.write(JSON.stringify({id:request?.id,ok:false,error:error.stack??String(error)})+'\n');
  }
}
