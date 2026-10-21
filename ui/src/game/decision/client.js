import {analyzeDecision} from './agent.js';

export function createDecisionClient({createWorker=()=>new Worker(new URL('./worker.js',import.meta.url),{type:'module'}),analyze=analyzeDecision}={}){
  let current=0,worker=null;
  const stop=()=>{if(worker){worker.terminate();worker=null;}};
  return {
    run(state,onUpdate,options={}){
      stop();const id=++current;let failed=false;
      const fallback=()=>{
        if(id!==current||failed)return;
        failed=true;stop();
        setTimeout(()=>{
          if(id!==current)return;
          try{
            const result=analyze(state,{...options,samples:0,searchDepth:0,timeBudgetMs:0});
            if(id===current)onUpdate({id,result,stage:'fallback',error:'后台分析不可用，当前显示基础牌效率与公开威胁建议。'});
          }catch(error){if(id===current)onUpdate({id,result:{status:'invalid',message:error.message,candidates:[]},stage:'fallback',error:'基础分析未能完成。'});}
        },0);
      };
      try{
        worker=createWorker();
        worker.onmessage=event=>{
          if(id!==current||event.data.id!==id)return;
          if(event.data.error){fallback();return;}
          onUpdate(event.data);
          if(event.data.stage==='full'||event.data.stage==='final')stop();
        };
        worker.onerror=event=>{event.preventDefault?.();fallback();};
        worker.postMessage({id,state,options});
      }catch{fallback();}
      return ()=>{if(current===id){current++;stop();}};
    },
    dispose(){current++;stop();}
  };
}
