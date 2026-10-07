import { chromium } from 'playwright';

const base = process.env.J90_DIAG_URL || 'http://127.0.0.1:4173/diag.html';
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', err => errors.push('pageerror: ' + err.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

await page.goto(base, { waitUntil: 'networkidle' });
if (await page.locator('#stage').count() !== 1) throw new Error('Diagnostic stage missing.');

for (const mode of ['dom', 'canvas', 'svg']) {
  await page.locator('button[data-mode="' + mode + '"]').click();
  await page.waitForTimeout(1200);
  const result = await page.evaluate(() => window.J90Diag?.getReport?.() || null);
  if (!result || result.mode !== mode) throw new Error('Diagnostic mode did not activate: ' + mode);
  if (!(result.fps > 0)) throw new Error('Diagnostic FPS did not advance in mode: ' + mode);
  if (!(result.dpr >= 1)) throw new Error('Invalid DPR in diagnostic mode: ' + mode);
  if (mode === 'canvas' && (!result.canvas2d || result.canvasWidth < 100 || result.canvasHeight < 100)) {
    throw new Error('Canvas 2D diagnostic failed: ' + JSON.stringify(result));
  }
}
if (errors.length) throw new Error(errors.slice(0, 20).join('\n'));
console.log('DIAG_SMOKE=OK');
await browser.close();
