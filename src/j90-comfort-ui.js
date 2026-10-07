/* Jornada 90 Comfort UI 1.1
 * Readability, touch sizing, overflow protection and adjustable UI scale.
 * No extra animation loop.
 */
(function(){
  'use strict';
  if(window.__J90_COMFORT_UI__)return;
  window.__J90_COMFORT_UI__=true;

  var KEY='j90_ui_scale_v1';
  function loadScale(){try{var n=Number(localStorage.getItem(KEY));if(Number.isFinite(n))return Math.max(.92,Math.min(1.45,n));}catch(e){}return 1.10;}
  function applyScale(n){
    n=Math.max(.92,Math.min(1.45,Number(n)||1.10));
    document.documentElement.style.setProperty('--j90-ui-scale',n);
    try{localStorage.setItem(KEY,String(n));}catch(e){}
    var out=document.getElementById('j90ComfortValue');if(out)out.textContent=Math.round(n*100)+'%';
  }
  function addStyle(){
    if(document.getElementById('j90-comfort-style'))return;
    var s=document.createElement('style');s.id='j90-comfort-style';
    s.textContent=[
      ':root{--j90-ui-scale:1.10;--j90-body-size:calc(14px * var(--j90-ui-scale));--j90-small-size:calc(11px * var(--j90-ui-scale));}',
      '#app,.app,.page,.screen{font-size:var(--j90-body-size);}',
      '#app *,.app *,.page *,.screen *{box-sizing:border-box;}',
      'h1,h2,h3,h4,p,small,button,label,span,b,strong,div{overflow-wrap:anywhere;}',
      'p{line-height:1.45;}',
      'small,.mu,.hint,.sub,.muted,.j90Hint,.j90V3Hint,.j90SquadHint,.j90xCard small,.j90MgrCard small,.j90RosterRow small,.j90RosterOVR,.j90OnlineStatus{font-size:var(--j90-small-size)!important;line-height:1.38!important;}',
      '.j90MgrCard,.j90xCard,.j90SquadCards,.j90RosterHub,.j90Negotiation,.j90RosterList,.j90MgrMarketList{min-width:0;}',
      '.j90MgrTitle,.j90SquadHead,.j90SquadHead>div,.j90NegotiationHero>div,.j90RosterRow>span,.j90MgrMarketRow>div{min-width:0;}',
      '.j90MgrTitle small,.j90SquadHead small,.j90RosterRow small,.j90MgrMarketRow small,.j90Negotiation p{white-space:normal!important;}',
      'button,.btn,input,select,textarea{min-height:44px;}',
      'button{white-space:normal!important;line-height:1.22!important;padding:9px 12px!important;}',
      '.j90RosterTabs button,.j90RosterActions button,.j90ContractActions button,.j90MgrFilters button{min-height:44px;}',
      '.j90RosterRow{min-height:58px!important;gap:10px!important;}',
      '.j90RosterOVR{font-size:calc(20px * var(--j90-ui-scale))!important;line-height:1!important;}',
      '.j90XIGrid,.j90EditorGrid,.j90OfferGrid,.j90ContractActions,.j90RosterActions{align-items:stretch;}',
      '.j90xGrid3 button,.j90XIPlayer,.j90RosterRow,.j90MgrMarketRow{overflow:hidden;}',
      '.j90xGrid3 button b,.j90XIPlayer b,.j90RosterRow b,.j90MgrMarketRow b{font-size:calc(13px * var(--j90-ui-scale))!important;line-height:1.24!important;}',
      '.j90V3Live{min-height:48px!important;}',
      '.j90V3Live b{font-size:calc(12px * var(--j90-ui-scale))!important;}',
      '.j90V3Live span,.j90V4Renderer{font-size:calc(10px * var(--j90-ui-scale))!important;}',
      '.j90V3Hint{font-size:calc(10px * var(--j90-ui-scale))!important;}',
      '.j90SquadCards{padding:14px!important;}',
      '.j90SquadHead{font-size:calc(14px * var(--j90-ui-scale))!important;}',
      '.j90SquadCanvasWrap{min-height:540px!important;}',
      '@media(max-width:390px){.j90RosterTabs{gap:6px!important}.j90RosterTabs button{padding:8px!important}.j90SquadCanvasWrap{min-height:500px!important;height:500px!important;}}',
      '@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:0.001ms!important;animation-duration:0.001ms!important;}}'
    ].join('');
    document.head.appendChild(s);
  }
  function mount(){addStyle();applyScale(1.10);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.J90Comfort={version:'1.1',getScale:loadScale,setScale:applyScale};
})();