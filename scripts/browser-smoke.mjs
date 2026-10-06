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
const confirm = page.getByRole('button', { name: /Confirmar primeiro contrato/i }).first();
if (await confirm.count() !== 1) throw new Error('Club confirmation control did not appear after selection.');
await confirm.click();
await page.waitForTimeout(700);
if (await page.locator('.j90ManagerShell').count() !== 1) {
  const diagnostic = await page.evaluate(() => ({
    bodyText: (document.body.innerText || '').slice(0, 1200),
    hasApp: !!document.querySelector('#app'),
    appHtml: document.querySelector('#app')?.innerHTML?.slice(0, 1600) || '',
    managerState: !!window.J90ManagerBridge?.getState?.()
  }));
  throw new Error('Manager screen did not open after club confirmation. ' + JSON.stringify({ errors, diagnostic }));
}

// Exercise the 2D match renderer for several frames.
const play = page.getByRole('button', { name: /^Jogar$/ }).first();
if (await play.count() === 1) {
  await play.click();
  await page.waitForTimeout(1200);
  if (await page.locator('#j90MatchCanvas').count() !== 1) throw new Error('Match canvas did not open.');
  const before = await page.evaluate(() => ({ clock: document.querySelector('#j90MatchClock')?.textContent || '', frames: window.J90FrameStats?.().frames || 0 }));
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => ({ clock: document.querySelector('#j90MatchClock')?.textContent || '', frames: window.J90FrameStats?.().frames || 0, perf: window.J90Perf?.snapshot?.() || null }));
  if (before.clock === after.clock) throw new Error('Match clock did not advance.');
  if (after.frames < before.frames) throw new Error('Frame counter regressed.');
}

if (errors.length) {
  throw new Error('Browser smoke errors:\n' + errors.slice(0, 20).join('\n'));
}

console.log('BROWSER_SMOKE=OK');
console.log('STARTUP=' + JSON.stringify(startup));
await browser.close();
