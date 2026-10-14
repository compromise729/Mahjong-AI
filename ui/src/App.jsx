import { useEffect, useRef, useState } from 'react';
import { BookOpenIcon, GearSixIcon, XIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { Table } from './components/Table.jsx';
import { EventEntry } from './components/EventEntry.jsx';
import { HandSetup } from './components/HandSetup.jsx';
import { createDemoGame, applyEvent, initializeGame, undo, PLAYER_NAMES, EVENT_NAMES, tileName } from './game/state.js';
import { afterRecord, selectSeat, claimEntry } from './game/entry.js';

function Rules({onClose}) {
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
    <header><div><span className="eyebrow">当前玩法</span><h2 id="rules-title">四川血战规则</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭规则"><XIcon size={24}/></button></header>
    <div className="rule-copy">
      <h3>牌张与基本玩法</h3><p>使用万、条、筒三门共108张牌。每种牌4张，不含字牌和花牌；可以碰、杠，不能吃。胡牌前须打完定缺的花色。</p>
      <h3>公开与隐藏</h3><p>其他三家的暗手放倒显示牌背，碰牌和明杠亮出全部牌面。按当前约定，暗杠亮一张牌面，其余三张显示牌背。</p>
      <h3>血战到底</h3><p>一人胡牌后，其余玩家继续，直到三人胡牌或牌墙摸完。支持一炮多响；由逆时针最后一位胡牌者的下一位未胡玩家继续摸打，已胡玩家全部跳过。</p>
      <h3>计分与流局</h3><p>胡牌分数取决于牌型及相关加番。流局涉及查花猪、查大叫等结算，详细计分以项目规则文档为准。</p>
      <h3>当前记录范围</h3><p>页面可记录摸牌、出牌、碰杠、定缺与胡牌，支持血战轮转、撤销和规则听牌分析。自己的胡牌校验手牌结构，别家的暗手未知，按实际牌局手动记录。放过的同牌胡机会会限制到自己下次摸牌；碰杠解除过手胡等边界尚待确认。番数结算与抢杠裁决尚未接入。</p>
    </div><a className="document-link" href="/rules.md" download="麻将规则.md"><BookOpenIcon size={20}/>下载完整规则文档<ArrowSquareOutIcon size={18}/></a>
  </section></div>;
}

export function App() {
  const [state,setState]=useState(createDemoGame);
  const [entry,setEntry]=useState({player:'self',type:'discard',tile:'tong-5',source:''});
  const [setup,setSetup]=useState(false);
  const [rules,setRules]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const submissionLock=useRef(false);
  const updateEntry=next=>{setEntry(next);setError('');setMessage('');submissionLock.current=false;};
  useEffect(()=>{submissionLock.current=false;},[state]);
  useEffect(()=>{
    if(!setup&&!rules)return;
    const previous=document.activeElement;
    const dialog=document.querySelector('[role="dialog"]');
    const focusable=()=>[...dialog.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href]')];
    focusable()[0]?.focus();
    const keydown=e=>{
      if(e.key==='Escape'){setSetup(false);setRules(false);}
      if(e.key==='Tab'){
        const items=focusable(),first=items[0],last=items.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    document.addEventListener('keydown',keydown);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);previous?.focus();};
  },[setup,rules]);
  const recordEvent=input=>{
    const faceOptional=(input.type==='draw'&&input.player!=='self')||(input.type==='win'&&input.winType==='selfDraw'&&input.player==='self'&&state.drawnTile)||input.type==='pass';
    if((!input.tile&&!faceOptional)||!input.player||submissionLock.current)return;
    submissionLock.current=true;
    try{
      const next=applyEvent(state,input);setState(next);
      const event=next.events.at(-1),detail=event.tile?tileName(event.tile):'（牌背）';
      setError('');setMessage(`已记录：${PLAYER_NAMES[input.player]}${event.heavenly?'天胡':EVENT_NAMES[input.type]}${detail}${next.finished?'，三家已胡，本局结束。':''}`);
      setEntry(afterRecord(input,next));
    }catch(e){setError(e.message);submissionLock.current=false;}
  };
  const showSetup=()=>{setRules(false);setSetup(true);};
  return <main>
    <header className={`app-header ${state.finished?'has-ended':''}`}><div className="brand"><h1>川麻<span> · </span>决策助手</h1><span className="mode-badge">手动记录 · 四川血战</span></div>{state.finished&&<div className="round-ended-status" role="status">对局结束</div>}<div className="header-tools"><nav aria-label="工具"><button onClick={()=>setRules(true)}><BookOpenIcon size={20}/>规则</button><button onClick={showSetup}><GearSixIcon size={20}/>设置</button></nav><div className="wall-status" role="status" aria-label="剩余牌墙" title="起手发牌后55张；摸牌和杠后补牌减1，撤销会恢复。"><span>剩余牌墙</span><strong>{state.wallRemaining??'—'}<small>张</small></strong></div></div></header>
    <Table state={state} selectedPlayer={entry.player} selectedTile={entry.tile} onSelectPlayer={player=>{if(!state.finished&&!state.players[player].won)updateEntry(selectSeat(entry,player,state));}} onSelectOwnTile={tile=>updateEntry({player:'self',type:'discard',tile,source:''})}/>
    <EventEntry state={state} entry={entry} setEntry={updateEntry} onRecord={()=>recordEvent(entry)} onRespond={recordEvent} onUndo={()=>{const last=state.events.at(-1);const previous=undo(state);setState(previous);const restored=last?.type==='setup'||last?.type==='pass'?(previous.events.at(-1)?.type&&previous.events.at(-1).type!=='setup'?afterRecord(previous.events.at(-1),previous):{player:'self',type:previous.players.self.hand.length===14-previous.players.self.melds.length*3?'discard':'draw',tile:null,source:''}):{player:last.player,type:last.type,tile:last.type==='win'?last.tile:null,source:last.source??'',...(last.type==='win'?{winType:last.winType}:{})};updateEntry(['pung','openKong'].includes(last?.type)||last?.type==='win'&&last.winType==='discard'?claimEntry(restored,last.type,previous):restored);setMessage('已撤销上一步，牌桌恢复到记录之前。');}} onSetup={showSetup} error={error} message={message}/>
    {setup&&<HandSetup state={state} onClose={()=>setSetup(false)} onSave={options=>{setState(initializeGame(state,options));setSetup(false);updateEntry({player:options.dealerSeat,type:'discard',tile:null,source:''});setMessage(`手牌设置已保存，由${PLAYER_NAMES[options.dealerSeat]}先出牌。`);}}/>}
    {rules&&<Rules onClose={()=>setRules(false)}/>}
  </main>;
}
