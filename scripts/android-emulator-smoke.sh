#!/usr/bin/env bash
set -euo pipefail

APK="android/app/build/outputs/apk/debug/Jornada-90-Manager.apk"
PACKAGE="com.jornada90.manager"
OUT="${RUNNER_TEMP:-/tmp}/j90-android-smoke"
mkdir -p "$OUT"

test -s "$APK"
adb wait-for-device
adb shell getprop sys.boot_completed | grep -q '^1$'

echo "ANDROID_DEVICE=$(adb shell getprop ro.product.model | tr -d '\r')"
echo "ANDROID_API=$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
adb install -r "$APK"
adb shell am force-stop "$PACKAGE"
adb logcat -c
adb shell monkey -p "$PACKAGE" 1 >/tmp/j90-monkey.txt 2>&1

sleep 4
adb shell dumpsys activity activities >"$OUT/activity.txt"
grep -q "$PACKAGE" "$OUT/activity.txt"
adb exec-out screencap -p >"$OUT/startup.png"

PORT=9222
SOCKET_LIST="$(adb shell cat /proc/net/unix | tr -d '\r' | awk '{print $8}' | grep -E '@webview_devtools_remote_[0-9]+$' | sort -u || true)"
echo "WEBVIEW_DEVTOOLS_SOCKETS=${SOCKET_LIST:-none}"
SELECTED_SOCKET=""
rm -f "$OUT/cdp-version.json" "$OUT/cdp-list.json"

while IFS= read -r raw_socket; do
  [ -n "$raw_socket" ] || continue
  socket="${raw_socket#@}"
  adb forward --remove tcp:$PORT >/dev/null 2>&1 || true
  if ! adb forward tcp:$PORT "localabstract:$socket" >/dev/null 2>&1; then
    echo "WEBVIEW_CDP_FORWARD_FAILED=$socket"
    continue
  fi
  if curl --fail --silent --show-error --connect-timeout 1 --max-time 2 "http://127.0.0.1:$PORT/json/version" -o "$OUT/cdp-version.json"; then
    SELECTED_SOCKET="$socket"
    echo "WEBVIEW_CDP_SOCKET_SELECTED=$socket"
    cat "$OUT/cdp-version.json"
    break
  fi
  echo "WEBVIEW_CDP_PROBE_FAILED=$socket"
done <<< "$SOCKET_LIST"

test -n "$SELECTED_SOCKET" || {
  echo "No WebView DevTools socket answered /json/version."
  adb shell dumpsys webviewupdate || true
  adb logcat -d -v time >"$OUT/logcat.txt"
  grep -E -i 'FATAL EXCEPTION|AndroidRuntime|ANR|chromium|WebView|DevTools' "$OUT/logcat.txt" | tail -200 || true
  exit 1
}

curl --fail --silent --show-error --connect-timeout 1 --max-time 3 "http://127.0.0.1:$PORT/json/list" -o "$OUT/cdp-list.json"
cat "$OUT/cdp-list.json"

export J90_ANDROID_SMOKE_OUT="$OUT"
timeout 120s node <<'NODE'
import { chromium } from 'playwright';
import fs from 'node:fs';

const out=process.env.J90_ANDROID_SMOKE_OUT;
const errors=[];
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222',{timeout:10000});
let pages=browser.contexts().flatMap(c=>c.pages());
for(let i=0;i<20&&!pages.length;i++){await new Promise(r=>setTimeout(r,500));pages=browser.contexts().flatMap(c=>c.pages());}
if(!pages.length) throw new Error('No Android WebView page exposed over CDP.');
const page=pages.find(p=>/j90|localhost|capacitor/i.test(p.url()))||pages[0];

page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
page.setDefaultTimeout(10000);
page.on('requestfailed',r=>errors.push('requestfailed: '+r.url()+' :: '+(r.failure()?.errorText||'unknown')));

await page.waitForFunction(()=>document.body&&(document.body.innerText||'').length>20,{timeout:15000});
await page.waitForTimeout(3600);

const resilience=await page.evaluate(()=>({
  autoHeal:!!window.J90AutoHealAI,
  bugGuard:!!window.J90BugGuard,
  autoHealVersion:window.J90AutoHealAI?.version||'',
  bugGuardVersion:window.J90BugGuard?.version||''
}));
if(!resilience.autoHeal||!resilience.bugGuard) throw new Error('Runtime resilience missing: '+JSON.stringify(resilience));

const start=page.getByRole('button',{name:/Começar carreira|Continuar carreira/i}).first();
if(await start.count()!==1) throw new Error('Career start button missing.');
await start.click();
await page.waitForTimeout(150);
await page.locator('#nm').fill('Android Smoke');
const offer=page.locator('.offerCard').first();
if(await offer.count()!==1) throw new Error('Club offer missing.');
await offer.click();
const confirm=page.locator('#startConfirm');
if(await confirm.count()!==1||await confirm.isDisabled()) throw new Error('Club confirmation unavailable.');
await confirm.click();
await page.waitForTimeout(700);
if(await page.locator('.j90ManagerShell').count()!==1) throw new Error('Manager screen failed.');

await page.evaluate(()=>window.J90ManagerBridge.setTab('game'));
await page.waitForTimeout(150);
const play=page.getByRole('button',{name:/^Jogar$/}).first();
if(await play.count()!==1) throw new Error('Jogar button missing.');
await play.click();
await page.waitForTimeout(1400);

const check=await page.evaluate(()=>({
  canvas:!!document.querySelector('#j90MatchCanvas'),
  liveClass:document.body.classList.contains('j90-live-match'),
  navHidden:!document.querySelector('#j90MgrRightNav')||getComputedStyle(document.querySelector('#j90MgrRightNav')).display==='none',
  width:document.querySelector('#j90MatchCanvas')?.width||0,
  height:document.querySelector('#j90MatchCanvas')?.height||0,
  cssWidth:document.querySelector('#j90MatchCanvas')?.getBoundingClientRect().width||0,
  cssHeight:document.querySelector('#j90MatchCanvas')?.getBoundingClientRect().height||0,
  renderer:window.J90Match2DV3?{version:window.J90Match2DV3.version,mode:window.J90Match2DV3.mode,animation:window.J90Match2DV3.animationProfile}:null,
  camera:typeof window.j90MatchCameraCycle==='function',
  frames:Number(window.S?.match2d?._j90v3Frames||0),
  elapsed:Number(window.S?.match2d?.elapsed||0),
  paused:!!window.S?.match2d?.paused,
  sample:(()=>{try{const c=document.querySelector('#j90MatchCanvas'),m=window.S?.match2d;if(!c||!m?._ctx)return 0;const p=m._ctx.getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data;return p[0]+p[1]+p[2]+p[3]}catch(e){return 0}})()
}));
fs.writeFileSync(out+'/webview-check.json',JSON.stringify(check,null,2));
await page.screenshot({path:out+'/android-2d.png',fullPage:false});

if(!check.canvas) throw new Error('2D canvas did not open.');
if(check.width<200||check.height<150||check.cssWidth<200||check.cssHeight<180) throw new Error('2D canvas dimensions invalid: '+JSON.stringify(check));
if(!check.renderer||check.renderer.version!=='4.0'||check.renderer.mode!=='broadcast-tv') throw new Error('2D renderer contract invalid: '+JSON.stringify(check));
if(!check.camera) throw new Error('Broadcast camera control missing.');
if(check.frames<8) throw new Error('2D renderer did not paint enough frames: '+JSON.stringify(check));
if(check.sample<=0) throw new Error('2D canvas appears blank: '+JSON.stringify(check));
if(check.paused) throw new Error('Live match unexpectedly paused.');

const before=Number(await page.evaluate(()=>window.S?.match2d?.elapsed||0));
await page.waitForTimeout(1000);
const after=Number(await page.evaluate(()=>window.S?.match2d?.elapsed||0));
if(after<=before) throw new Error('Match clock did not advance: '+JSON.stringify({before,after}));

await page.evaluate(()=>window.J90MatchLifecycle.pauseForBackground());
if(!await page.evaluate(()=>!!window.S?.match2d?.paused)) throw new Error('Lifecycle did not pause live match.');
await page.evaluate(()=>window.J90MatchLifecycle.resumeAfterForeground());
await page.waitForTimeout(300);
const resumed=await page.evaluate(()=>({paused:!!window.S?.match2d?.paused,elapsed:Number(window.S?.match2d?.elapsed||0),frames:Number(window.S?.match2d?._j90v3Frames||0)}));
if(resumed.paused) throw new Error('Lifecycle did not resume live match.');
if(resumed.frames<check.frames+2) throw new Error('2D renderer did not recover after lifecycle resume: '+JSON.stringify(resumed));

fs.writeFileSync(out+'/android-result.json',JSON.stringify({resilience,check,before,after,resumed,errors},null,2));
if(errors.length) throw new Error('Android WebView errors:\n'+errors.slice(0,20).join('\n'));
console.log('ANDROID_WEBVIEW_SMOKE=OK');
console.log('ANDROID_2D='+JSON.stringify({before,after,check,resumed}));
await browser.close();
NODE

adb logcat -d -v threadtime >"$OUT/logcat.txt"
if grep -E -i 'FATAL EXCEPTION|ANR in|Fatal signal [0-9]|SIGSEGV|SIGABRT|OutOfMemoryError' "$OUT/logcat.txt" >/tmp/j90-fatal.txt; then
  echo "Fatal Android runtime signatures detected:"
  cat /tmp/j90-fatal.txt
  exit 1
fi

echo "ANDROID_APK_SMOKE=OK"
