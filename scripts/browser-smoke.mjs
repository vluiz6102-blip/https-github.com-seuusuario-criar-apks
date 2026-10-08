import { chromium } from 'playwright';

const base = process.env.J90_SMOKE_URL || 'http://127.0.0.1:4173/';
const errors = [];
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(8000);

page.on('pageerror', err => errors.push('pageerror: ' + err.message));
page.on('console', msg => {
  if (msg.type() === 'error') errors.push('console: ' + msg.text());
});
page.on('requestfailed', req => {
  errors.push('requestfailed: ' + req.url() + ' :: ' + (req.failure()?.errorText || 'unknown'));
});

await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => window.J90Perf?.enable?.());

const runtimeContract = await page.evaluate(() => {
  const expected = ['j90-manager-ai.js', 'j90-auto-heal.js'];
  const scripts = [...document.scripts].map(s => s.src || 'inline').filter(Boolean);
  const external = [...document.querySelectorAll('script[src]')].map(s => s.src);
  const missing = expected.filter(name =>
    !external.some(src => {
      try { return new URL(src, location.href).pathname.endsWith('/' + name); }
      catch (_) { return false; }
    })
  );
  return { expected, external, missing };
});
if (runtimeContract.missing.length) {
  throw new Error('Critical runtime script tags are missing from the browser DOM: ' + JSON.stringify(runtimeContract));
}

await page.waitForFunction(
  () => !!window.J90AutoHealAI && !!window.J90BugGuard,
  { timeout: 15000 }
).catch(async error => {
  const diagnostic = await page.evaluate(() => ({
    autoHeal: !!window.J90AutoHealAI,
    bugGuard: !!window.J90BugGuard,
    autoHealVersion: window.J90AutoHealAI?.version || '',
    bugGuardVersion: window.J90BugGuard?.version || '',
    scripts: [...document.scripts].map(s => s.src || 'inline').filter(Boolean),
    runtimeScriptTags: [...document.querySelectorAll('script[src]')].map(s => s.src),
    runtimeResources: performance.getEntriesByType('resource')
      .map(x => x.name)
      .filter(x => /j90-(auto-heal|manager-ai)\.js/.test(x))
  }));
  throw new Error('Runtime resilience did not initialize within 15s. ' + JSON.stringify({ diagnostic, errors, waitError: error.message }));
});
if (await page.locator('#j90CinematicIntro').count() !== 1) {
  throw new Error('Cinematic intro was not created.');
}

// The startup must stay responsive and transition without JS errors.
await page.locator('#j90CinematicIntro').waitFor({ state: 'detached', timeout: 7000 });
await page.waitForTimeout(250);
const startup = await page.evaluate(() => ({
  introVisible: !!document.getElementById('j90CinematicIntro'),
  bodyText: (document.body.innerText || '').length,
  perf: window.J90Perf?.snapshot?.() || null
}));
if (startup.bodyText < 50) throw new Error('Startup rendered an unexpectedly empty UI.');
if (startup.perf && startup.perf.frames < 5) throw new Error('Shared animation loop did not produce enough frames after startup.');
const resilience = await page.evaluate(() => ({
  autoHeal: !!window.J90AutoHealAI,
  bugGuard: !!window.J90BugGuard,
  autoHealVersion: window.J90AutoHealAI?.version || '',
  bugGuardVersion: window.J90BugGuard?.version || ''
}));
if (!resilience.autoHeal || !resilience.bugGuard) {
  throw new Error('Runtime Auto-Heal AI / BugGuard did not initialize: ' + JSON.stringify({ resilience, errors }));
}

// Exercise the primary career flow.
const start = page.getByRole('button', { name: /Começar carreira|Continuar carreira/i }).first();
await start.click();
await page.waitForTimeout(150);
if (await page.locator('#nm').count() !== 1) throw new Error('Career creation screen did not open.');

await page.locator('#nm').fill('Smoke Test');
const offer = page.locator('.offerCard').first();
if (await offer.count() !== 1) throw new Error('No club offer is available.');
await offer.click();
const confirm = page.locator('#startConfirm');
if (await confirm.count() !== 1) throw new Error('Club confirmation control is missing.');
if (await confirm.isDisabled()) throw new Error('Club confirmation control stayed disabled after selection.');
const startGuard = await page.evaluate(() => ({
  startCareerType: typeof window.startCareer
}));
if (startGuard.startCareerType !== 'function') throw new Error('Career start function is unavailable.');
await confirm.click();
await page.waitForTimeout(500);
if (await page.locator('.j90ManagerShell').count() !== 1) {
  const diagnostic = await page.evaluate(() => ({
    bodyText: (document.body.innerText || '').slice(0, 1200),
    hasApp: !!document.querySelector('#app'),
    appHtml: document.querySelector('#app')?.innerHTML?.slice(0, 1600) || '',
    managerState: !!window.J90ManagerBridge?.getState?.(),
    startCareerType: typeof window.startCareer
  }));
  throw new Error('Manager screen did not open after club confirmation. ' + JSON.stringify({ errors, diagnostic }));
}


async function assertReadableLayout(page){
  const result=await page.evaluate(() => {
    const selector='h1,h2,h3,h4,p,small,label,button,.mu,.hint,.sub,.j90V3Hint,.j90SquadHint';
    const nodes=[...document.querySelectorAll(selector)].filter(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&s.pointerEvents!=='none'&&!el.closest('[aria-hidden="true"]');
    });
    const problems=[];
    const independentParent=(a,b)=>{
      let pa=a.parentElement,pb=b.parentElement;
      while(pa&&pa!==b){if(pa===b.parentElement)return false;pa=pa.parentElement}
      while(pb&&pb!==a){if(pb===a.parentElement)return false;pb=pb.parentElement}
      return true;
    };
    const ignoreSameControl=(a,b)=>{
      const ca=a.closest('button,a,label');
      const cb=b.closest('button,a,label');
      return !!ca&&ca===cb;
    };
    for(let i=0;i<nodes.length;i++){
      const a=nodes[i],ra=a.getBoundingClientRect();
      if(ra.width<8||ra.height<8)continue;
      for(let j=i+1;j<nodes.length;j++){
        const b=nodes[j];
        if(!independentParent(a,b)||ignoreSameControl(a,b))continue;
        const rb=b.getBoundingClientRect();
        const ix=Math.max(0,Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left));
        const iy=Math.max(0,Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top));
        const area=ix*iy;
        const minArea=Math.min(ra.width*ra.height,rb.width*rb.height);
        const meaningful=area>24&&area>minArea*.08;
        if(meaningful) problems.push({a:a.tagName+'.'+String(a.className||''),b:b.tagName+'.'+String(b.className||''),ix:Math.round(ix),iy:Math.round(iy),area:Math.round(area)});
        if(problems.length>=10)break;
      }
      if(problems.length>=10)break;
    }
    const overflow=[...document.querySelectorAll('.j90MgrCard,.j90xCard,.j90RosterRow,.j90MgrMarketRow,.j90XIPlayer')].filter(el=>{
      const r=el.getBoundingClientRect();
      return r.width>0&&r.height>0&&(el.scrollWidth-el.clientWidth>3||el.scrollHeight-el.clientHeight>3);
    }).slice(0,10).map(el=>String(el.className||el.tagName));
    return {problems,overflow};
  });
  if(result.problems.length) throw new Error('Text overlap detected: '+JSON.stringify(result.problems));
  if(result.overflow.length) throw new Error('Text/container overflow detected: '+JSON.stringify(result.overflow));
}
await page.evaluate(() => window.J90ManagerBridge.setTab('squad'));
await page.waitForTimeout(180);
if (await page.locator('.j90EliteProfile').count() < 1) {
  const profileDiagnostic = await page.evaluate(() => {
    const out = { managerAI: null, bindings: {}, state: null, rosterHost: '', directProfile: null, resources: [] };
    try { out.managerAI = window.J90ManagerAI ? { version: window.J90ManagerAI.version || '', keys: Object.keys(window.J90ManagerAI), playerProfileType: typeof window.J90ManagerAI.playerProfile } : null; } catch (e) { out.managerAI = { error: String(e?.message || e) }; }
    try {
      out.bindings = {
        j90ManagerAI2: !!window.__J90_MANAGER_AI_2__,
        managerVWindow: typeof window.managerV,
        squadWindow: typeof window.j90SquadView,
        renderWindow: typeof window.render,
        renderBinding: typeof render,
        squadBinding: typeof j90SquadView,
        tabBinding: typeof tab === 'undefined' ? 'undefined' : tab
      };
    } catch (e) { out.bindings = { error: String(e?.message || e) }; }
    try {
      out.state = typeof S !== 'undefined' && S ? {
        manager: !!S.manager,
        managerClub: S.managerClub || '',
        roster: Array.isArray(S.roster) ? S.roster.length : -1,
        slots: Array.isArray(S.lineup?.slots) ? S.lineup.slots.length : -1,
        firstPlayer: S.roster?.[0]?.name || ''
      } : null;
    } catch (e) { out.state = { error: String(e?.message || e) }; }
    try {
      const host = document.querySelector('.j90RosterHub');
      out.rosterHost = host ? host.outerHTML.slice(0, 1200) : '';
    } catch (e) { out.rosterHost = 'ERROR: ' + String(e?.message || e); }
    try {
      const p = typeof S !== 'undefined' && S?.roster?.[0];
      if (p && window.J90ManagerAI && typeof window.J90ManagerAI.playerProfile === 'function') {
        const html = window.J90ManagerAI.playerProfile(p);
        out.directProfile = { ok: true, length: html.length, hasElite: html.includes('j90EliteProfile'), hasRadar: html.includes('j90Radar'), hasPitch: html.includes('j90MiniPitch') };
      } else {
        out.directProfile = { ok: false, reason: 'playerProfile unavailable or roster empty' };
      }
    } catch (e) { out.directProfile = { ok: false, error: String(e?.stack || e?.message || e) }; }
    try { out.resources = performance.getEntriesByType('resource').map(x => x.name).filter(x => /j90-manager-ai|j90-match-lifecycle|j90-match-events/.test(x)); } catch (e) {}
    return out;
  });
  throw new Error('Premium player profile did not render. ' + JSON.stringify({ errors, profileDiagnostic }));
}
if (await page.locator('.j90Radar').count() < 1) throw new Error('Player radar chart did not render.');
if (await page.locator('.j90MiniPitch').count() < 1) throw new Error('Mini tactical pitch did not render.');
if (await page.locator('.j90EliteProfile').count()) await page.locator('.j90EliteProfile').first().scrollIntoViewIfNeeded();
await assertReadableLayout(page);

await page.evaluate(() => window.J90ManagerBridge.setTab('market'));
await page.waitForTimeout(180);
if (await page.locator('.j90AIMarketInsight').count() < 1) throw new Error('Transfer market AI panel did not render.');
const marketAI = await page.evaluate(() => ({
  managerAI: !!window.J90ManagerAI,
  version: window.J90ManagerAI?.version || '',
  playerCount: Array.isArray(window.J90_ROSTERS) ? Object.keys(window.J90_ROSTERS).length : Object.keys(window.J90_ROSTERS || {}).length
}));
if (!marketAI.managerAI || marketAI.version !== '2.0') throw new Error('Manager AI 2.0 did not initialize.');
const firstTarget = await page.evaluate(() => {
  const state = window.J90ManagerBridge.getState();
  const f = state.marketFilter || {};
  const q = window.J90ManagerAI ? null : null;
  const all = typeof window.mgrMarketFiltered === 'function' ? window.mgrMarketFiltered() : [];
  return all[0] ? {id:all[0].id,name:all[0].name,club:all[0].club,ovr:all[0].ovr} : null;
});
if (firstTarget) {
  await page.evaluate((target) => {
    const state=window.J90ManagerBridge.getState();
    state.window='open';
    const p=(window.mgrMarketFiltered&&window.mgrMarketFiltered()).find(x=>x.id===target.id);
    if (p && typeof window.j90OpenContract==='function') window.j90OpenContract(p, Math.max(1, Number(p.ovr)*3.1));
  }, firstTarget);
  await page.waitForTimeout(120);
  const negotiationDiagnostic = await page.evaluate(() => ({
    manager: !!window.J90ManagerBridge?.getState?.()?.manager,
    managerClub: window.J90ManagerBridge?.getState?.()?.managerClub || '',
    windowState: window.J90ManagerBridge?.getState?.()?.window || '',
    negotiation: window.J90ManagerBridge?.getState?.()?.negotiation ? {
      playerId: window.J90ManagerBridge.getState().negotiation.playerId || '',
      player: window.J90ManagerBridge.getState().negotiation.player || '',
      stage: window.J90ManagerBridge.getState().negotiation.stage || ''
    } : null,
    functions: {
      open: typeof window.j90OpenContract,
      managerV: typeof window.managerV,
      negotiationView: typeof window.j90NegotiationView,
      managerAI: typeof window.J90ManagerAI?.negotiation
    },
    tab: typeof window.tab !== 'undefined' ? window.tab : 'n/a',
    gridCount: document.querySelectorAll('.j90NegotiationGrid').length,
    rangeCount: document.querySelectorAll('input[type="range"]').length,
    app: document.querySelector('#app')?.innerHTML?.slice(0, 2200) || ''
  }));
  if (negotiationDiagnostic.gridCount < 1) throw new Error('Premium AI negotiation screen did not render. DIAG=' + JSON.stringify(negotiationDiagnostic));
  if (negotiationDiagnostic.rangeCount < 3) throw new Error('Negotiation sliders did not render. DIAG=' + JSON.stringify(negotiationDiagnostic));
  await page.evaluate(() => { if (window.J90ManagerBridge.getState()?.negotiation) window.J90ManagerBridge.getState().negotiation=null; window.J90ManagerBridge.render(1); });
  await page.waitForTimeout(100);
}
await page.evaluate(() => window.J90ManagerBridge.setTab('game'));
await page.waitForTimeout(120);
await assertReadableLayout(page);

// Exercise the 2D match renderer for several frames.
const play = page.getByRole('button', { name: /^Jogar$/ }).first();
if (await play.count() === 1) {
  await play.click();
  await page.waitForTimeout(1200);
  if (await page.locator('#j90MatchCanvas').count() !== 1) throw new Error('Match canvas did not open.');
  if (await page.locator('.j90ManagerTabs').count() !== 0) throw new Error('Manager navigation leaked into fullscreen match.');
  if (await page.locator('.j90MatchActionBar').count() !== 1) throw new Error('Live match action bar did not open.');
  if (await page.locator('#j90FusionDock').count() !== 1) throw new Error('Fusion Match Center did not open with the live 2D match.');
  const fusionContract = await page.evaluate(() => ({
    version: String(window.J90Fusion?.version || ''),
    dock: !!document.querySelector('#j90FusionDock'),
    controls: document.querySelectorAll('#j90FusionDock button[data-j90f]').length,
    state: window.J90Fusion?.state?.() || null
  }));
  if (fusionContract.version !== '1.0' || fusionContract.controls < 6) {
    throw new Error('Fusion Match Center runtime contract failed: ' + JSON.stringify(fusionContract));
  }
  await page.locator('#j90FusionDock button[data-j90f="lab"]').click();
  if (await page.locator('#j90FusionDock.open .j90FS').count() < 4) {
    throw new Error('Fusion Match Center analysis panel did not open.');
  }
  await page.locator('#j90FusionDock button[data-j90f="pressao-alta"]').click();
  const fusionTactic = await page.evaluate(() => window.J90Fusion?.state?.() || null);
  if (fusionTactic?.tactic !== 'pressao-alta') throw new Error('Fusion tactical preset was not applied: ' + JSON.stringify(fusionTactic));
  const beforeLiveElapsed = await page.evaluate(() => Number(window.S?.match2d?.elapsed || 0));
  await page.getByRole('button', { name: /^Tática/ }).click();
  if (await page.locator('#j90MatchPanel.open .j90MatchPane[data-pane="tactics"]').count() !== 1) throw new Error('Live tactics panel did not open.');
  const afterTacticElapsed = await page.evaluate(() => Number(window.S?.match2d?.elapsed || 0));
  if (afterTacticElapsed + 0.15 < beforeLiveElapsed) throw new Error('Opening/applying live tactics reset the match clock.');
  await page.getByRole('button', { name: /Fechar/ }).click();
  await page.getByRole('button', { name: /^Instruções/ }).click();
  await page.getByRole('button', { name: 'Pressionar alto' }).click();
  const instruction = await page.evaluate(() => window.S?.match2d?.management?.instruction || '');
  if (instruction !== 'press') throw new Error('Live instruction was not applied.');
  if (await page.locator('#j90MatchPoss').count() !== 1) throw new Error('Possession HUD did not open.');
  const rendererCheck = await page.evaluate(() => {
    const c = document.querySelector('#j90MatchCanvas');
    const m = window.S?.match2d;
    const rect = c?.getBoundingClientRect();
    return {
      canvasWidth: c?.width || 0,
      canvasHeight: c?.height || 0,
      cssWidth: rect?.width || 0,
      cssHeight: rect?.height || 0,
      webgl: !!(m && m._j90gl && m._j90gl.ready),
      canvas2d: !!(m && m._ctx),
      v3Loaded: !!window.J90Match2DV3 && typeof window.J90Match2DV3.draw === 'function',
      v3Frames: Number(m?._j90v3Frames||0),
      v3Mode: String(m?._j90v3Mode||window.J90Match2DV3?.mode||''),
      v3RenderMsAvg: Number(m?._j90v3RenderMsAvg||0),
      animationProfile: String(m?._j90AnimationProfile||window.J90Match2DV3?.animationProfile||''),
      ai2: !!window.J90AI2,
      ai2Version: String(window.J90AI2?.version||''),
      pixelated: getComputedStyle(c||document.body).imageRendering || '',
      canvasSample: (() => {
        try {
          if (!c || !m?._ctx) return 0;
          const x=Math.max(0,Math.floor((c.width||1)/2)), y=Math.max(0,Math.floor((c.height||1)/2));
          const px=m._ctx.getImageData(x,y,1,1).data;
          return Number(px[0])+Number(px[1])+Number(px[2])+Number(px[3]);
        } catch(e) { return 0; }
      })(),
      audioMode: window.J90_AUDIO_MODE || '',
      musicTracks: window.J90Ambience?.getTracks?.().length || 0
    };
  });
  if (rendererCheck.canvasWidth < 200 || rendererCheck.canvasHeight < 150 || rendererCheck.cssWidth < 200 || rendererCheck.cssHeight < 180) {
    throw new Error('Match canvas has invalid dimensions: ' + JSON.stringify(rendererCheck));
  }
  if (!rendererCheck.webgl && !rendererCheck.canvas2d) throw new Error('No WebGL or Canvas2D renderer initialized: ' + JSON.stringify(rendererCheck));
  if (!rendererCheck.v3Loaded) throw new Error('Jornada 90 2D renderer V3 did not load: ' + JSON.stringify(rendererCheck));
  if (rendererCheck.v3Mode !== 'broadcast-tv') throw new Error('2D renderer is not using broadcast-TV mode: ' + JSON.stringify(rendererCheck));
  if (!/broadcast-smooth/i.test(rendererCheck.animationProfile)) throw new Error('2D renderer lost broadcast-smooth animation profile: ' + JSON.stringify(rendererCheck));
  if (typeof window.j90MatchCameraCycle !== 'function') throw new Error('Broadcast camera control is unavailable.');
  if (!rendererCheck.ai2 || !/^2\\./.test(rendererCheck.ai2Version)) throw new Error('Enhanced match AI runtime did not initialize: ' + JSON.stringify(rendererCheck));
  if (rendererCheck.v3Frames < 5) throw new Error('2D renderer initialized but did not paint frames: ' + JSON.stringify(rendererCheck));
  if (/pixelated/i.test(rendererCheck.pixelated)) throw new Error('2D canvas is still forcing pixel-art rendering instead of broadcast smoothing: ' + JSON.stringify(rendererCheck));
  if (rendererCheck.canvasSample <= 0) throw new Error('2D canvas appears blank: ' + JSON.stringify(rendererCheck));
  if (await page.locator('#j90EventOverlayCanvas').count() !== 1) throw new Error('Match event overlay was not created.');
  if (!(await page.evaluate(() => !!window.J90MatchEvents?.state?.()))) throw new Error('Match event system did not initialize.');
  const refereeAI = await page.evaluate(() => window.J90MatchEvents?.state?.()?.refereeAI || null);
  if (!refereeAI || typeof refereeAI.pressure !== 'number' || typeof refereeAI.varReviews !== 'number') throw new Error('Improved referee AI did not initialize.');
  if (rendererCheck.audioMode !== 'remote-cc0') throw new Error('Unexpected audio mode: ' + rendererCheck.audioMode);
  if (rendererCheck.musicTracks < 20) throw new Error('CC0 playlist has fewer than 20 tracks: ' + rendererCheck.musicTracks);

  const before = await page.evaluate(() => ({ clock: document.querySelector('#j90MatchClock')?.textContent || '', frames: window.J90FrameStats?.().frames || 0, v3Frames: Number(window.S?.match2d?._j90v3Frames||0) }));
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => ({ clock: document.querySelector('#j90MatchClock')?.textContent || '', possession: document.querySelector('#j90MatchPoss')?.textContent || '', frames: window.J90FrameStats?.().frames || 0, v3Frames: Number(window.S?.match2d?._j90v3Frames||0), perf: window.J90Perf?.snapshot?.() || null }));
  if (after.v3Frames <= before.v3Frames + 10) throw new Error('2D render loop stalled during live match: ' + JSON.stringify({before,after}));
  if (before.clock === after.clock) throw new Error('Match clock did not advance.');
  if (after.frames < before.frames) throw new Error('Frame counter regressed.');
  if (!after.possession.trim()) throw new Error('Possession HUD is empty.');

  // Portrait-only live match contract + lifecycle recovery.
  const liveScene = await page.evaluate(() => {
    const c=document.querySelector('#j90MatchCanvas');
    const nav=document.querySelector('#j90MgrRightNav');
    const m=window.S?.match2d;
    return {
      orientation: innerWidth>innerHeight?'landscape':'portrait',
      overflow: document.documentElement.scrollWidth>innerWidth+2 || document.documentElement.scrollHeight>innerHeight+2,
      canvas: !!c,
      liveClass: document.body.classList.contains('j90-live-match'),
      navHidden: !nav || getComputedStyle(nav).display==='none',
      managerHeaderHidden: !document.querySelector('#j90-manager-head') || getComputedStyle(document.querySelector('#j90-manager-head')).display==='none',
      managerRightNavClass: !document.body.classList.contains('j90-manager-nav-right'),
      visibleManagerLeaks: ['#j90Expansion','#j90ComfortButton','.j90ManagerTabs','.j90ManagerShell > header'].filter(sel=>{
        const el=document.querySelector(sel); if(!el) return false;
        const s=getComputedStyle(el),r=el.getBoundingClientRect();
        return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&r.width>0&&r.height>0;
      }),
      elapsed: Number(m?.elapsed||0),
      paused: !!m?.paused
    };
  });
  if (liveScene.orientation !== 'portrait') throw new Error('Live match opened in landscape.');
  if (liveScene.overflow) throw new Error('Portrait live match overflowed the viewport: '+JSON.stringify(liveScene));
  if (!liveScene.canvas || !liveScene.liveClass || !liveScene.navHidden || !liveScene.managerHeaderHidden || !liveScene.managerRightNavClass || liveScene.visibleManagerLeaks.length) {
    throw new Error('Live match scene isolation failed: '+JSON.stringify(liveScene));
  }

  const persistence = await page.evaluate(() => {
    try {
      window.J90ManagerBridge?.save?.();
      const raw=localStorage.getItem('carreirafc2');
      const parsed=raw?JSON.parse(raw):null;
      const match=parsed?.match2d;
      const forbidden=[];
      function walk(v,path){
        if(!v||typeof v!=='object'||forbidden.length>8)return;
        Object.keys(v).forEach(k=>{
          if(/^_/.test(k)){forbidden.push(path+'.'+k);return}
          if(k!=='__j90ResumeOnRestore')walk(v[k],path+'.'+k);
        });
      }
      walk(match,'match2d');
      return {
        ok: !!match,
        elapsed: Number(match?.elapsed||0),
        paused: !!match?.paused,
        resumeOnRestore: !!match?.j90ResumeOnRestore,
        forbidden: forbidden.slice(0,8)
      };
    } catch(e) {
      return {ok:false,error:String(e?.message||e)};
    }
  });
  if (!persistence.ok) throw new Error('Live match save failed: '+JSON.stringify(persistence));
  if (!persistence.resumeOnRestore) throw new Error('Live match save did not persist resume marker: '+JSON.stringify(persistence));
  if (persistence.forbidden.length) throw new Error('Live match save leaked runtime-only fields: '+JSON.stringify(persistence.forbidden));

  const beforeExit = await page.evaluate(() => Number(window.S?.match2d?.elapsed||0));
  const lifecycle = await page.evaluate(() => {
    const m=window.S?.match2d;
    const life=window.J90MatchLifecycle;
    if(!m||!life)return {ok:false,reason:'lifecycle runtime missing'};
    life.pauseForBackground();
    const paused=!!m.paused;
    const savedElapsed=Number(m.elapsed||0);
    life.resumeAfterForeground();
    return {ok:true,paused,savedElapsed,resumed:!m.paused,after:Number(m.elapsed||0)};
  });
  if (!lifecycle.ok || !lifecycle.paused || !lifecycle.resumed) {
    throw new Error('Background/foreground lifecycle recovery failed: '+JSON.stringify(lifecycle));
  }
  if (lifecycle.savedElapsed + 0.05 < beforeExit) throw new Error('Lifecycle pause regressed match clock: '+JSON.stringify({beforeExit,lifecycle}));

  // Reload with the active match persisted. The app must reopen the live match, not the menu.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(4200);
  const restored = await page.evaluate(() => {
    const m=window.S?.match2d;
    const c=document.querySelector('#j90MatchCanvas');
    const nav=document.querySelector('#j90MgrRightNav');
    return {
      match: !!m,
      canvas: !!c,
      managerScreen: !!document.querySelector('.j90MatchOnly'),
      liveClass: document.body.classList.contains('j90-live-match'),
      navHidden: !nav || getComputedStyle(nav).display==='none',
      elapsed: Number(m?.elapsed||0),
      paused: !!m?.paused,
      overflow: document.documentElement.scrollWidth>innerWidth+2 || document.documentElement.scrollHeight>innerHeight+2
    };
  });
  if (!restored.match || !restored.canvas || !restored.managerScreen || !restored.liveClass || !restored.navHidden || restored.overflow) {
    throw new Error('Saved live match was not restored cleanly after reload: '+JSON.stringify(restored));
  }
  if (restored.elapsed + 0.2 < lifecycle.savedElapsed) throw new Error('Saved live match clock regressed after reload: '+JSON.stringify({lifecycle,restored}));

}

if (errors.length) {
  throw new Error('Browser smoke errors:\n' + errors.slice(0, 20).join('\n'));
}

const finalPerf = await page.evaluate(() => window.J90Perf?.snapshot?.() || null);
console.log('BROWSER_PERF=' + JSON.stringify(finalPerf));
console.log('BROWSER_SMOKE=OK');
console.log('STARTUP=' + JSON.stringify(startup));
await browser.close();
