import {analyzeDecision} from './agent.js';
self.onmessage=({data:{id,state,options}})=>{
  try{
    const basic=analyzeDecision(state,{...options,samples:0,searchDepth:0,timeBudgetMs:0});
    const finished=basic.status!=='ready';
    self.postMessage({id,result:basic,stage:finished?'final':'basic'});
    if(!finished)self.postMessage({id,result:analyzeDecision(state,options),stage:'full'});
  }catch(error){self.postMessage({id,error:error.message});}
};
