import {RULE_SOURCE_SHA256} from './rule-source.js';
export const DEFAULT_RULES=Object.freeze({version:'sichuan-confirmed-2026-10-20',sourceHash:RULE_SOURCE_SHA256,allowMeldWhileMissing:true,huPriority:true,delayedAddedKongScores:true,replacementRequired:true,closedHandStacks:true,rootExcludedFamilies:['dragonSevenPairs','fourKongs'],noTerminalExcludedPatterns:['连七对'],fanCap:512,handScoringConfirmed:true,flowerPig:{multiplier:64,recipients:'otherThreeSeats',participatesInReadyPenalty:false},callTransfer:'allConsecutiveKongIncome',refund:'retainedKongIncome',lastDiscardBonus:false,mandatoryLastFourHu:true,completeScoring:false});
export function legalDiscardTiles(hand,missing){
  const unique=[...new Set(hand)],forced=missing?unique.filter(t=>t.startsWith(`${missing}-`)):[];
  return forced.length?forced:unique;
}
export function fingerprint(value){
  const input=JSON.stringify(value);let hash=2166136261;
  for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16).padStart(8,'0');
}
