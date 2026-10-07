/* Jornada 90 Auto-Heal AI + BugGuard
 * Runtime resilience layer. Repairs known startup/UI/state faults without masking test errors.
 */
(function(){
'use strict';

var VERSION='1.0';

// Boot contract: os dois globais existem imediatamente, sem depender do DOM.
if(!window.J90AutoHealAI){
  window.J90AutoHealAI={version:VERSION,health:function(){return true}};
}
if(!window.J90BugGuard){
  window.J90BugGuard={version:VERSION,scan:function(){return true},stats:function(){return{}}};
}
if(window.__J90_AUTO_HEAL_AI__)return;
window.__J90_AUTO_HEAL_AI__=true;
var MAX_ATTEMPTS=24;
var attempts=0;
var repairing=false;
var lastError='';
var stats={repairs:0,errors:0,ui:0,state:0,loadedManagerAI:0};

function safe(fn){try{return fn()}catch(e){lastError=String(e&&e.message||e);return null}}
function hasManager(){return safe(function(){return !!(window.S&&window.S.manager)})}
function rerender(){return safe(function(){if(typeof window.render==='function'){window.render(1);return true}return false})}

function loadScript(src,done){
  var found=document.querySelector('script[src="'+src+'"]');
  if(found && found.dataset.j90Loaded==='1'){done(true);return}
  if(found){
    found.addEventListener('load',function(){done(true)},{once:true});
    found.addEventListener('error',function(){done(false)},{once:true});
    return;
  }
  var s=document.createElement('script');
  s.src=src;
  s.async=false;
  s.dataset.j90AutoHeal='1';
  s.addEventListener('load',function(){s.dataset.j90Loaded='1';stats.loadedManagerAI++;done(true)},{once:true});
  s.addEventListener('error',function(){done(false)},{once:true});
  (document.body||document.head||document.documentElement).appendChild(s);
}

function repairManagerAI(){
  if(!hasManager())return false;
  if(window.J90ManagerAI && typeof window.J90ManagerAI.playerProfile==='function')return true;
  if(repairing)return false;
  repairing=true;
  loadScript('j90-manager-ai.js',function(ok){
    repairing=false;
    if(ok && window.J90ManagerAI){
      stats.repairs++;stats.state++;rerender();
    }
  });
  return false;
}

function repairSquad(){
  if(!hasManager())return false;
  repairManagerAI();
  var profile=document.querySelector('.j90EliteProfile');
  if(profile)return true;
  var ai=window.J90ManagerAI;
  var roster=safe(function(){return Array.isArray(S.roster)?S.roster:[]})||[];
  if(!ai || typeof ai.playerProfile!=='function' || !roster.length)return false;
  var player=roster.find(function(p){return p&&p.id===window.__J90_SELECTED_PLAYER})||roster[0];
  var host=document.querySelector('.j90RosterHub');
  if(!player || !host)return false;
  var html=safe(function(){return ai.playerProfile(player)});
  if(!html || html.indexOf('j90EliteProfile')<0)return false;
  var wrap=document.createElement('div');
  wrap.className='j90MgrCard j90AISelectedWrap j90AutoRecovered';
  wrap.innerHTML=html;
  host.parentNode.insertBefore(wrap,host);
  stats.repairs++;stats.ui++;
  return true;
}

function repairManagerState(){
  if(!hasManager())return false;
  var changed=false;
  safe(function(){
    if(!S.j90ManagerAI || typeof S.j90ManagerAI!=='object'){S.j90ManagerAI={};changed=true}
    S.j90ManagerAI.version=S.j90ManagerAI.version||'2.0';
    if(!S.lineup || typeof S.lineup!=='object'){S.lineup={slots:[]};changed=true}
    if(!Array.isArray(S.lineup.slots)){S.lineup.slots=[];changed=true}
    if(Array.isArray(S.roster) && S.lineup.slots.length===0){
      S.lineup.slots=S.roster.slice(0,11).map(function(p){return p&&p.id}).filter(Boolean);
      changed=true;
    }
    if(!S.marketFilter || typeof S.marketFilter!=='object'){S.marketFilter={q:'',pos:'',nat:'',min:0,maxAge:99};changed=true}
  });
  if(changed){stats.repairs++;stats.state++;rerender()}
  return changed;
}

function repairDOM(){
  var app=document.getElementById('app');
  if(!app)return false;
  var changed=false;
  safe(function(){
    if(hasManager() && document.body && document.body.classList.contains('j90-manager-nav-right')){
      var nav=document.getElementById('j90MgrRightNav');
      if(!nav){ /* navigation runtime will recreate it */ changed=true }
    }
    if(window.S&&S.match2d){
      var canvas=document.getElementById('j90MatchCanvas');
      if(canvas && (canvas.width<200 || canvas.height<120) && typeof window.j90MatchResize==='function'){
        window.j90MatchResize();changed=true;
      }
    }
    document.querySelectorAll('.j90AutoRecovered').forEach(function(el){
      if(!el.innerHTML.trim()){el.remove();changed=true}
    });
  });
  if(changed){stats.repairs++;stats.ui}
  return changed;
}

function health(){
  if(!hasManager())return;
  repairManagerState();
  repairManagerAI();
  repairSquad();
  repairDOM();
}

function recoverError(error,source){
  stats.errors++;
  var msg=String(error&&error.message||error||'');
  lastError=msg;
  if(/j90EliteProfile|Premium player profile|playerProfile/i.test(msg)){
    repairManagerAI();
    setTimeout(repairSquad,60);
  }else if(/render|manager|undefined|null|cannot read/i.test(msg)){
    repairManagerState();
    repairManagerAI();
    setTimeout(rerender,50);
  }else if(/canvas|match|WebGL|context/i.test(msg)){
    repairDOM();
    safe(function(){if(window.S&&S.match2d&&typeof window.j90MatchResize==='function')window.j90MatchResize()});
  }
  safe(function(){console.warn('[J90 Auto-Heal AI]',source,msg)});
}

window.addEventListener('error',function(e){recoverError(e&&e.error||e,'error')});
window.addEventListener('unhandledrejection',function(e){recoverError(e&&e.reason||e,'unhandledrejection')});

function start(){
  health();
  var timer=setInterval(function(){
    if(attempts++>=MAX_ATTEMPTS){clearInterval(timer);return}
    health();
  },300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

window.J90AutoHealAI={
  version:VERSION,
  health:health,
  repairManagerAI:repairManagerAI,
  repairManagerState:repairManagerState,
  repairSquad:repairSquad,
  repairDOM:repairDOM,
  recoverError:recoverError,
  stats:function(){return Object.assign({},stats,{attempts:attempts,lastError:lastError})}
};
window.J90BugGuard={
  version:VERSION,
  scan:health,
  stats:window.J90AutoHealAI.stats
};
})();
