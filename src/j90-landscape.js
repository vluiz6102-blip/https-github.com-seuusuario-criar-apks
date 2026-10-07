/* Jornada 90 Landscape Match 1.0
 * Automatically prefers landscape during live Manager matches.
 * Native Android remains sensor-capable as a fallback, so manual rotation still works.
 * No extra animation loop.
 */
(function(){
'use strict';
if(window.__J90_LANDSCAPE_MATCH__)return;
window.__J90_LANDSCAPE_MATCH__=true;

var active=false;
var previousType='';
var root=document.documentElement;

function supported(){return !!(screen&&screen.orientation&&typeof screen.orientation.lock==='function')}
function matchActive(){try{return !!(window.S&&S.match2d)}catch(e){return false}}
function syncLayout(){
  document.body.classList.toggle('j90-landscape-match',active&&matchActive());
  try{window.dispatchEvent(new Event('resize'))}catch(e){}
  try{
    var m=window.S&&S.match2d;
    if(m){m._cw=0;m._ch=0;m._j90v3Field=null}
  }catch(e2){}
  if(typeof window.render==='function')window.render(1);
}
async function lock(){
  previousType='';
  active=true;
  root.classList.add('j90-landscape-requested');
  syncLayout();
  if(!supported())return false;
  try{
    previousType=String(screen.orientation.type||'');
    await screen.orientation.lock('landscape-primary');
    active=true;
    syncLayout();
    return true;
  }catch(e){
    try{await screen.orientation.lock('landscape')}catch(_){}
    syncLayout();
    return false;
  }
}
async function unlock(){
  active=false;
  root.classList.remove('j90-landscape-requested');
  try{
    if(screen&&screen.orientation&&typeof screen.orientation.unlock==='function')screen.orientation.unlock();
  }catch(e){}
  syncLayout();
}
function install(){
  if(typeof window.mgrStartMatch==='function'&&!window.mgrStartMatch.__j90Landscape){
    var oldStart=window.mgrStartMatch;
    var wrappedStart=async function(){
      var out=await oldStart.apply(this,arguments);
      if(matchActive())lock();
      return out;
    };
    wrappedStart.__j90Landscape=true;wrappedStart.__original=oldStart;window.mgrStartMatch=wrappedStart;mgrStartMatch=wrappedStart;
  }
  if(typeof window.mgrMatchFinish==='function'&&!window.mgrMatchFinish.__j90Landscape){
    var oldFinish=window.mgrMatchFinish;
    var wrappedFinish=function(){
      var out=oldFinish.apply(this,arguments);
      unlock();
      return out;
    };
    wrappedFinish.__j90Landscape=true;wrappedFinish.__original=oldFinish;window.mgrMatchFinish=wrappedFinish;mgrMatchFinish=wrappedFinish;
  }
  return typeof window.mgrStartMatch==='function';
}
if(screen&&screen.orientation&&typeof screen.orientation.addEventListener==='function'){
  screen.orientation.addEventListener('change',function(){
    if(matchActive()){active=true;syncLayout()}
  },{passive:true});
}
window.addEventListener('resize',function(){if(matchActive())syncLayout()},{passive:true});
window.addEventListener('pagehide',function(){try{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock()}catch(e){}},{passive:true});

var tries=0;(function retry(){if(install()||tries++>120)return;setTimeout(retry,60)})();
window.J90Landscape={
  version:'1.0',
  supported:supported,
  isActive:function(){return active&&matchActive()},
  lock:lock,
  unlock:unlock,
  sync:syncLayout
};
})();