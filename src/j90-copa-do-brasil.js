/* Jornada 90 Manager | Copa do Brasil qualification engine
 * Based on CBF 2026 participation criteria.
 */
(function(){
'use strict';
if(window.J90CopaDoBrasil)return;

var FED_RANK={SP:1,RJ:2,MG:3,RS:4,PR:5,BA:6,PE:7,SC:8,GO:9,CE:10,PA:11,AL:12,ES:13,PB:14,RN:15,SE:16,AM:17,MA:18,MT:19,DF:20,PI:21,MS:22,RO:23,AC:24,AP:25,TO:26,RR:27};
function key(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function ufOf(club){
 if(!club)return '';
 var u=String(club.uf||club.state||club.federation||'').toUpperCase().replace(/^BR-/,'');
 if(FED_RANK[u])return u;
 var n=key(club.n||club.name);
 var map={
  'flamengo':'RJ','vasco':'RJ','botafogo':'RJ','fluminense':'RJ',
  'corinthians':'SP','palmeiras':'SP','sao paulo':'SP','santos':'SP','novorizontino':'SP','ponte preta':'SP','guarani':'SP',
  'atletico mg':'MG','cruzeiro':'MG','america mg':'MG',
  'gremio':'RS','internacional':'RS','juventude':'RS',
  'athletico pr':'PR','atletico paranaense':'PR','coritiba':'PR','operario pr':'PR',
  'chapecoense':'SC','avai':'SC','figueirense':'SC','criciuma':'SC',
  'goias':'GO','vila nova':'GO','atletico go':'GO',
  'sport':'PE','nautico':'PE','santa cruz':'PE',
  'ceara':'CE','fortaleza':'CE',
  'bahia':'BA','vitoria':'BA',
  'remo':'PA','paysandu':'PA',
  'crb':'AL','asa':'AL',
  'athletic':'MG','tombense':'MG','america rn':'RN'
 };
 return map[n]||'';
}
function stateSlots(uf){
 var r=FED_RANK[uf];
 if(!r)return 3;
 if(r<=2)return 6;
 if(r<=5)return 5;
 if(r<=14)return 4;
 return 3;
}
function clubName(){try{return S&&S.club&&S.club.n||''}catch(e){return''}}
function tier(){try{return Number(S&&S.club&&S.club.tier)}catch(e){return 99}}
function resultPlace(){
 try{
  var p=S.club.statePlace||S.club.stateRank||S.club.ufPlace||S.statePlace;
  if(Number.isFinite(Number(p)))return Number(p);
  if(S.club&&Number.isFinite(Number(S.club.campeonatoEstadualPlace)))return Number(S.club.campeonatoEstadualPlace);
 }catch(e){}
 return 99;
}
function championFlags(){
 try{
  return {
   nordeste:!!(S.club&&S.club.campeaoNordeste||S.campeaoNordeste),
   verde:!!(S.club&&S.club.campeaoVerde||S.campeaoVerde),
   serieC:!!(S.club&&S.club.campeaoSerieC||S.campeaoSerieC),
   serieD:!!(S.club&&S.club.campeaoSerieD||S.campeaoSerieD)
  };
 }catch(e){return{nordeste:false,verde:false,serieC:false,serieD:false}}
}
function seriesA(){return tier()===1}
function stateEligible(){
 var uf=ufOf(S&&S.club),place=resultPlace();
 return !!uf&&place>=1&&place<=stateSlots(uf);
}
function eligibility(){
 var ch=championFlags(),via=[];
 if(seriesA())via.push('Série A');
 if(ch.nordeste)via.push('campeão da Copa do Nordeste');
 if(ch.verde)via.push('campeão da Copa Verde');
 if(ch.serieC)via.push('campeão da Série C');
 if(ch.serieD)via.push('campeão da Série D');
 if(stateEligible())via.push('classificação no campeonato estadual');
 return {eligible:via.length>0,via:via,uf:ufOf(S&&S.club),statePlace:resultPlace(),stateSlots:stateSlots(ufOf(S&&S.club)),tier:tier()};
}
function entryPhase(){
 var e=eligibility();if(!e.eligible)return 0;
 if(e.via.indexOf('Série A')>=0)return 5;
 if(e.via.some(function(x){return /Nordeste|Verde|Série C|Série D/.test(x)}))return 3;
 /* State qualifiers are split by RNC. The exact RNC order is supplied by
    the manager save when available; otherwise preserve a deterministic fallback. */
 var rnc=Number(S&&S.club&&S.club.rnc)||999999;
 return rnc<=74?2:1;
}
function normalizeStateCompetitions(){
 var s;
 try{s=S}catch(e){return}
 if(!s||!s.club)return;
 var e=eligibility();
 s.copaDoBrasilQualification={
  year:Number(s.year)||2026,
  club:s.club.n,
  eligible:e.eligible,
  via:e.via,
  federation:e.uf,
  statePlace:e.statePlace,
  stateSlots:e.stateSlots,
  entryPhase:entryPhase(),
  rules:'CBF-2026'
 };
}
function setupHook(){
 if(typeof compSetup!=='function'||compSetup.__j90Cdb)return;
 var old=compSetup;
 var wrapped=function(){
  var out=old.apply(this,arguments);
  try{
   normalizeStateCompetitions();
   var e=eligibility();
   if(Array.isArray(S.comps)){
    var c=S.comps.find(function(x){return x&&x.id==='cdb'});
    if(!e.eligible&&c)S.comps.splice(S.comps.indexOf(c),1);
    if(e.eligible&&c){
     c.cdbQualification=e;
     c.entryPhase=entryPhase();
     c.stageRule='CBF 2026: fase '+c.entryPhase;
    }
   }
  }catch(err){}
  return out;
 };
 wrapped.__j90Cdb=true;wrapped.__original=old;compSetup=wrapped;
}
window.J90CopaDoBrasil={
 version:'2026.1',
 rules:{stateSlots:stateSlots,federationRanking:FED_RANK},
 federationOf:ufOf,
 eligibility:eligibility,
 entryPhase:entryPhase,
 refresh:normalizeStateCompetitions
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupHook,{once:true});else setupHook();
Promise.resolve().then(setupHook);
})();