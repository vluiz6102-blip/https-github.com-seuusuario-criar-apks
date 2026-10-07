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

await page.goto(base, { waitUntil: 'networkidle' });
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
      return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
    });
    const nested=(a,b)=>a.contains(b)||b.contains(a);
    const problems=[];
    for(let i=0;i<nodes.length;i++){
      const a=nodes[i],ra=a.getBoundingClientRect();
      if(ra.width<8||ra.height<8)continue;
      for(let j=i+1;j<nodes.length;j++){
        const b=nodes[j];if(nested(a,b))continue;
        const rb=b.getBoundingClientRect();
        const ix=Math.max(0,Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left));
        const iy=Math.max(0,Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top));
        if(ix>3&&iy>3) problems.push({a:a.tagName+'.'+String(a.className||''),b:b.tagName+'.'+String(b.className||''),ix:Math.round(ix),iy:Math.round(iy)});
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
await assertReadableLayout(page);

// Exercise the 2D match renderer for several frames.
const play = page.getByRole('button', { name: /^Jogar$/ }).first();
if (await play.count() === 1) {
  await play.click();
  await page.waitForTimeout(1200);
  if (await page.locator('#j90MatchCanvas').count() !== 1) throw new Error('Match canvas did not open.');
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
      audioMode: window.J90_AUDIO_MODE || '',
      musicTracks: window.J90Ambience?.getTracks?.().length || 0
    };
  });
  if (rendererCheck.canvasWidth < 200 || rendererCheck.canvasHeight < 150 || rendererCheck.cssWidth < 200 || rendererCheck.cssHeight < 180) {
    throw new Error('Match canvas has invalid dimensions: ' + JSON.stringify(rendererCheck));
  }
  if (!rendererCheck.webgl && !rendererCheck.canvas2d) throw new Error('No WebGL or Canvas2D renderer initialized.');
  if (rendererCheck.audioMode !== 'remote-cc0') throw new Error('Unexpected audio mode: ' + rendererCheck.audioMode);
  if (rendererCheck.musicTracks < 20) throw new Error('CC0 playlist has fewer than 20 tracks: ' + rendererCheck.musicTracks);

  const before = await page.evaluate(() => ({ clock: document.querySelector('#j90MatchClock')?.textContent || '', frames: window.J90FrameStats?.().frames || 0 }));
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => ({ clock: document.querySelector('#j90MatchClock')?.textContent || '', possession: document.querySelector('#j90MatchPoss')?.textContent || '', frames: window.J90FrameStats?.().frames || 0, perf: window.J90Perf?.snapshot?.() || null }));
  if (before.clock === after.clock) throw new Error('Match clock did not advance.');
  if (after.frames < before.frames) throw new Error('Frame counter regressed.');
  if (!after.possession.trim()) throw new Error('Possession HUD is empty.');
}

if (errors.length) {
  throw new Error('Browser smoke errors:\n' + errors.slice(0, 20).join('\n'));
}

console.log('BROWSER_SMOKE=OK');
console.log('STARTUP=' + JSON.stringify(startup));
await browser.close();
