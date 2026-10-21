import test from 'node:test';
import assert from 'node:assert/strict';
import {createDecisionClient} from './decision/client.js';

function harness(){
  const workers=[];
  const createWorker=()=>{const w={postMessage(m){this.message=m;},terminate(){this.stopped=true;}};workers.push(w);return w;};
  const analyze=()=>({stateKey:'basic',status:'ready',candidates:[]});
  return {workers,client:createDecisionClient({createWorker,analyze})};
}
test('stale worker messages and disposed clients cannot overwrite newer recommendations',()=>{
  const {workers,client}=harness(),seen=[];
  client.run({name:'old'},x=>seen.push(x));const old=workers[0];
  client.run({name:'new'},x=>seen.push(x));const fresh=workers[1];
  old.onmessage({data:{id:old.message.id,result:{stateKey:'old'},stage:'full'}});
  fresh.onmessage({data:{id:fresh.message.id,result:{stateKey:'new'},stage:'full'}});
  assert.equal(old.stopped,true);assert.deepEqual(seen.map(x=>x.result.stateKey),['new']);
  client.dispose();fresh.onmessage({data:{id:fresh.message.id,result:{stateKey:'late'}}});
  assert.equal(seen.length,1);
});
test('worker creation failure produces explicitly marked basic fallback',async()=>{
  const seen=[];
  const client=createDecisionClient({createWorker(){throw new Error('disabled');},analyze(){return {stateKey:'current',status:'ready'};}});
  client.run({},x=>seen.push(x));await new Promise(r=>setTimeout(r,10));
  assert.equal(seen[0].stage,'fallback');assert.match(seen[0].error,/后台/);
  client.dispose();
});
test('worker runtime error preserves basic analysis and cancellation prevents fallback delivery',async()=>{
  const {workers,client}=harness(),seen=[];
  const cancel=client.run({},x=>seen.push(x));workers[0].onerror({preventDefault(){}});
  cancel();await new Promise(r=>setTimeout(r,10));assert.equal(seen.length,0);
});
