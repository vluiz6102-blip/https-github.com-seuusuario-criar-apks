import { chromium } from 'playwright';

const base = process.env.J90_SMOKE_URL || 'http://127.0.0.1:4173/';
const viewports = [
  { width: 320, height: 568, name: 'compact-phone' },
  { width: 360, height: 800, name: 'small-phone' },
  { width: 390, height: 844, name: 'phone' },
  { width: 412, height: 915, name: 'large-phone' }
];

const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ deviceScaleFactor: 1 });
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', e => errors.push('pageerror: '+e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: '+m.text()); });

for (const vp of viewports) {
  await page.setViewportSize({width:vp.width,height:vp.height});
  await page.goto(base, {waitUntil:'networkidle'});
  const intro=page.locator('#j90CinematicIntro');
  if (await intro.count()) await intro.waitFor({state:'detached',timeout:7000});

  const report=await page.evaluate(() => {
    const vw=innerWidth, vh=innerHeight;
    const root=document.documentElement;
    const body=document.body;
    const overflowX=root.scrollWidth>vw+2 || body.scrollWidth>vw+2;
    const overflowY=root.scrollHeight>vh+2 && !!document.querySelector('.j90MatchOnlyPage');
    const bad=[];
    const targets=[...document.querySelectorAll('button,input,select,a')].filter(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
    });
    for(const el of targets){
      const r=el.getBoundingClientRect();
      if(r.width<40 || r.height<40) bad.push({tag:el.tagName,cls:String(el.className||''),w:Math.round(r.width),h:Math.round(r.height)});
    }
    const clipped=[...document.querySelectorAll('#app,.j90ManagerShell,.card,.j90MgrCard,.j90xCard')].filter(el=>{
      const r=el.getBoundingClientRect();
      return r.width>vw+2 || r.right>vw+2 || r.left<-2;
    }).slice(0,12).map(el=>String(el.className||el.id||el.tagName));
    return {vw,vh,overflowX,overflowY,badTargets:bad.slice(0,12),clipped};
  });
  if(report.overflowX) throw new Error(vp.name+': horizontal overflow detected '+JSON.stringify(report));
  if(report.clipped.length) throw new Error(vp.name+': element exceeds viewport '+JSON.stringify(report));
  if(report.badTargets.length) throw new Error(vp.name+': undersized touch target '+JSON.stringify(report));
}
if(errors.length) throw new Error(errors.slice(0,20).join('\n'));
console.log('VISUAL_SCAN=OK');
await browser.close();
