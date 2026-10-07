/* Jornada 90 Comfort UI 1.0
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
      '#j90ComfortButton{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483000;width:48px;height:48px;min-width:48px;min-height:48px;padding:0!important;border-radius:16px;border:1px solid rgba(255,255,255,.20);background:rgba(8,17,12,.94);color:#fff;font:900 18px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.28);}',
      '#j90ComfortPanel{position:fixed;right:12px;bottom:calc(68px + env(safe-area-inset-bottom));z-index:2147482999;width:min(320px,calc(100vw - 24px));padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.14);background:rgba(8,17,12,.97);color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.38);display:none;}',
      '#j90ComfortPanel.open{display:block;}',
      '#j90ComfortPanel h3{margin:0 0 8px;font-size:calc(16px * var(--j90-ui-scale));}',
      '#j90ComfortPanel p{margin:0 0 12px;color:#b8c6bd;font-size:calc(11px * var(--j90-ui-scale));}',
      '.j90ComfortRow{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;}',
      '.j90ComfortRow button{min-height:48px;min-width:48px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#12261a;color:#fff;}',
      '#j90ComfortValue{text-align:center;font:900 13px system-ui;}',
      '@media(max-width:390px){.j90RosterTabs{gap:6px!important}.j90RosterTabs button{padding:8px!important}.j90SquadCanvasWrap{min-height:500px!important;height:500px!important;}}',
      '@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:0.001ms!important;animation-duration:0.001ms!important;}}'
    ].join('');
    document.head.appendChild(s);
  }
  function mount(){
    addStyle();applyScale(loadScale());
    if(document.getElementById('j90ComfortButton'))return;
    var b=document.createElement('button');b.id='j90ComfortButton';b.type='button';b.textContent='Aa';b.setAttribute('aria-label','Ajustar conforto visual');
    var p=document.createElement('section');p.id='j90ComfortPanel';p.setAttribute('aria-label','Conforto visual');
    p.innerHTML='<h3>Conforto visual</h3><p>Aumente o texto sem deixar informações escaparem das caixas.</p><div class="j90ComfortRow"><button type="button" id="j90ComfortDown">A−</button><strong id="j90ComfortValue">110%</strong><button type="button" id="j90ComfortUp">A+</button></div><div class="j90ComfortRow" style="margin-top:8px"><button type="button" id="j90ComfortReset" style="grid-column:1/-1">Restaurar padrão</button></div>';
    document.body.appendChild(b);document.body.appendChild(p);
    b.addEventListener('click',function(){p.classList.toggle('open');});
    document.getElementById('j90ComfortDown').addEventListener('click',function(){applyScale(loadScale()-.06);});
    document.getElementById('j90ComfortUp').addEventListener('click',function(){applyScale(loadScale()+.06);});
    document.getElementById('j90ComfortReset').addEventListener('click',function(){applyScale(1.10);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.J90Comfort={version:'1.0',getScale:loadScale,setScale:applyScale};
})();