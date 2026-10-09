import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import WebSocket from 'ws';

const out=process.env.J90_ANDROID_SMOKE_OUT||'/tmp/j90-android-smoke';
const errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const adb=args=>execFileSync('adb',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});

async function target(){
  const end=Date.now()+15000;
  let lastList=[];
  while(Date.now()<end){
    const r=await fetch('http://127.0.0.1:9222/json/list');
    if(!r.ok)throw new Error('CDP /json/list HTTP '+r.status);
    const list=await r.json();
    lastList=list;
    const p=list.find(x=>x.type==='page'&&/(com\.jornada90\.manager|jornada-90|https:\/\/localhost|capacitor:\/\/)/i.test(String(x.url||'')+' '+String(x.title||'')));
    if(p?.webSocketDebuggerUrl)return p;
    await sleep(250);
  }
  const pages=lastList.filter(x=>x.type==='page').map(x=>({url:x.url||'',title:x.title||'',ws:!!x.webSocketDebuggerUrl}));
  throw new Error('Android WebView page target not found: '+JSON.stringify(pages));
}
class CDP{
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map()}
  connect(){
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(t);fn(value)};
      const t=setTimeout(()=>finish(reject,Error('CDP open timeout')),8000);
      this.ws.once('open',()=>finish(resolve));
      this.ws.once('error',err=>finish(reject,Error('CDP websocket error: '+err.message)));
      this.ws.on('message',data=>{
        try{
          const m=JSON.parse(data.toString());
          if(m.id&&this.pending.has(m.id)){
            const p=this.pending.get(m.id);
            this.pending.delete(m.id);
            m.error?p.reject(Error(m.error.message||'CDP error')):p.resolve(m.result);
          }
        }catch(err){errors.push('cdp-message: '+err.message)}
      });
      this.ws.on('close',()=>{if(!settled)finish(reject,Error('CDP websocket closed before open'))});
    });
  }
  call(method,params={}){
    const id=++this.id;
    return new Promise((resolve,reject)=>{
      const t=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout '+method))},8000);
      this.pending.set(id,{resolve:v=>{clearTimeout(t);resolve(v)},reject:e=>{clearTimeout(t);reject(e)}});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  async eval(expression){
    const r=await this.call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
    if(r?.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'Runtime.evaluate failed');
    return r?.result?.value;
  }
  async shot(path){const r=await this.call('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path,Buffer.from(r.data,'base64'))}
  close(){try{this.ws.close()}catch{}}
}
async function connect(){const t=await target();const c=new CDP(t.webSocketDebuggerUrl);await c.connect();await c.call('Runtime.enable');await c.call('Page.enable');return c}
async function wait(c,expr,ms=15000){const end=Date.now()+ms;let lastEvalError='';while(Date.now()<end){try{if(await c.eval(expr))return}catch(e){lastEvalError=e?.message||String(e)}await sleep(250)}let detail='';if(expr.includes('J90Match2DV3')){try{detail='; renderer='+JSON.stringify(await c.eval("({version:window.J90Match2DV3?.version||null,mode:window.J90Match2DV3?.mode||null,animation:window.J90Match2DV3?.animationProfile||null,canvas:!!document.querySelector('#j90MatchCanvas')})"))}catch(e){detail='; renderer diagnostic failed: '+(e?.message||String(e))}}throw Error('Timeout: '+expr+detail+(lastEvalError?'; lastEvalError='+lastEvalError:''))}

async function rendererDiag(c){
  return c.eval("(()=>{const m=window.S?.match2d,canvas=document.querySelector('#j90MatchCanvas'),r=canvas?.getBoundingClientRect();const life=window.J90MatchLifecycle;return{match:!!m,canvas:!!canvas,frames:Number(m?._j90v3Frames||0),renderError:String(m?._j90RenderError||''),renderErrorStage:String(m?._j90RenderErrorStage||''),renderErrorStack:String(m?._j90RenderErrorStack||''),runtimeError:String(m?._j90RuntimeError||''),runtimeErrorStack:String(m?._j90RuntimeErrorStack||''),tickCount:Number(m?._j90TickCount||0),lastTickAt:Number(m?._j90LastTickAt||0),canvas2d:!!(m&&m._ctx),renderer:window.J90Match2DV3?{version:window.J90Match2DV3.version,mode:window.J90Match2DV3.mode,animation:window.J90Match2DV3.animationProfile}:null,visibilityState:String(document.visibilityState),hidden:!!document.hidden,readyState:String(document.readyState),lifecycle:life?{version:String(life.version||''),isLive:!!life.isLive?.(),paused:!!m?.paused,lifecyclePaused:!!m?.__j90LifecyclePaused,resumeOnRestore:!!m?.j90ResumeOnRestore}:null,canvasRenderDpr:Number(m?._j90Dpr||0),frameP95:Number(m?._j90FrameP95||0),rendererFps:Number(m?._j90Fps||0),canvasCss:{width:Number(r?.width||0),height:Number(r?.height||0)},canvasCount:document.querySelectorAll('canvas').length,canvases:[...document.querySelectorAll('canvas')].map(x=>({id:x.id||'',className:String(x.className||''),width:x.width,height:x.height,cssWidth:Number(x.getBoundingClientRect().width||0),cssHeight:Number(x.getBoundingClientRect().height||0)})),perf:window.J90Perf?.snapshot?.()||null}})()");
}
function filteredAndroidLogcat(limit=180){
  try{
    const raw=adb(['logcat','-d','-v','threadtime','-t','500']);
    const lines=raw.split(/\r?\n/).filter(line=>/chromium|WebView|j90/i.test(line));
    return lines.slice(-limit).join('\n');
  }catch(e){
    return 'logcat capture failed: '+(e?.message||String(e));
  }
}
async function captureRendererFailure(c,error){
  const diag=await rendererDiag(c).catch(e=>({evalError:e?.message||String(e)}));
  try{await c.shot(out+'/android-frame-timeout.png')}catch(e){fs.writeFileSync(out+'/android-frame-timeout-screenshot-error.txt',String(e?.message||e))}
  fs.writeFileSync(out+'/android-frame-timeout-logcat.txt',filteredAndroidLogcat());
  fs.writeFileSync(out+'/android-frame-timeout.json',JSON.stringify({error:error?.message||String(error),diag},null,2));
  return diag;
}
async function waitForRendererFrames(c,target=8,timeoutMs=90000){
  const started=Date.now();let last=null;
  while(Date.now()-started<timeoutMs){
    try{
      last=await rendererDiag(c);
      if(Number(last?.frames||0)>=target)return last;
    }catch(e){
      last={evalError:e?.message||String(e)};
    }
    const remaining=timeoutMs-(Date.now()-started);
    if(remaining<=0)break;
    await sleep(Math.min(1000,remaining));
  }
  const failure=new Error('Renderer frame timeout after '+(Date.now()-started)+'ms');
  failure.lastDiag=last;
  throw failure;
}

let c=await connect();
await wait(c,"!!document.body");
await wait(c,"!!window.J90Perf",10000);
await c.eval("window.J90Perf.enable()");
if(await c.eval("!!document.getElementById('j90CinematicIntro')"))await c.eval("document.getElementById('j90CinematicIntro').click()");
await wait(c,"!!window.J90AutoHealAI&&!!window.J90BugGuard");
const resilience=await c.eval("({autoHeal:!!window.J90AutoHealAI,bugGuard:!!window.J90BugGuard,autoHealVersion:window.J90AutoHealAI?.version||'',bugGuardVersion:window.J90BugGuard?.version||''})");

await c.eval("(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Começar carreira|Continuar carreira/i.test(x.innerText||''));if(!b)throw Error('career start missing');b.click()})()");
await wait(c,"!!document.querySelector('#nm')");
await c.eval("(()=>{const e=document.querySelector('#nm');e.value='Android Smoke';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()");
await wait(c,"document.querySelectorAll('.offerCard').length>0");
await c.eval("document.querySelector('.offerCard').click()");
await wait(c,"!!document.querySelector('#startConfirm')");
await wait(c,"!document.querySelector('#startConfirm').disabled");
await c.eval("document.querySelector('#startConfirm').click()");
await wait(c,"!!document.querySelector('.j90ManagerShell')");
await c.eval("window.J90ManagerBridge.setTab('game')");
await sleep(250);
await wait(c,"[...document.querySelectorAll('button')].some(x=>/^Iniciar partida$/.test((x.innerText||'').trim()))");
await c.eval("(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^Iniciar partida$/.test((x.innerText||'').trim()));if(!b)throw Error('Iniciar partida missing');b.click()})()");
await wait(c,"!!document.querySelector('#j90MatchCanvas')",45000);
await wait(c,"window.J90Match2DV3?.version==='4.1'&&window.J90Match2DV3?.mode==='broadcast-tv'");
try {
  await waitForRendererFrames(c,8,90000);
} catch (firstFrameError) {
  const diag=await captureRendererFailure(c,firstFrameError);
  throw Error('Android renderer did not reach 8 frames: '+JSON.stringify(diag));
}

const check=await c.eval("(()=>{const e=document.querySelector('#j90MatchCanvas'),m=window.S?.match2d,r=e?.getBoundingClientRect();let s=0;try{const p=m?._ctx?.getImageData(Math.floor(e.width/2),Math.floor(e.height/2),1,1).data;s=p?Number(p[0])+Number(p[1])+Number(p[2])+Number(p[3]):0}catch{}return{canvas:!!e,live:document.body.classList.contains('j90-live-match'),visibilityState:String(document.visibilityState),hidden:!!document.hidden,lifecyclePaused:!!m?.__j90LifecyclePaused,resumeOnRestore:!!m?.j90ResumeOnRestore,canvasCount:document.querySelectorAll('canvas').length,renderDpr:Number(m?._j90Dpr||0),frameP95:Number(m?._j90FrameP95||0),rendererFps:Number(m?._j90Fps||0),width:e?.width||0,height:e?.height||0,cssWidth:r?.width||0,cssHeight:r?.height||0,renderer:window.J90Match2DV3?{version:window.J90Match2DV3.version,mode:window.J90Match2DV3.mode,animation:window.J90Match2DV3.animationProfile}:null,camera:typeof window.j90MatchCameraCycle==='function',cameraMode:m?.cameraMode||'',frames:Number(m?._j90v3Frames||0),elapsed:Number(m?.elapsed||0),paused:!!m?.paused,sample:s}})()");
await c.shot(out+'/android-2d.png');

if(!check.canvas||check.width<200||check.height<150||check.cssWidth<200||check.cssHeight<180)throw Error('Invalid Android 2D canvas: '+JSON.stringify(check));
if(check.renderer?.version!=='4.1'||check.renderer?.mode!=='broadcast-tv'||!/broadcast-smooth/i.test(check.renderer?.animation||''))throw Error('Invalid Android 2D renderer: '+JSON.stringify(check));
if(!check.camera||check.frames<8||check.sample<=0||check.paused)throw Error('Android 2D render verification failed: '+JSON.stringify(check));

const before=Number(await c.eval("window.S?.match2d?.elapsed||0"));await sleep(1100);const after=Number(await c.eval("window.S?.match2d?.elapsed||0"));
if(after<=before)throw Error('Android match clock did not advance: '+JSON.stringify({before,after}));

const camBefore=String(await c.eval("window.S?.match2d?.cameraMode||''"));const camAfter=String(await c.eval("window.j90MatchCameraCycle()"));if(camAfter===camBefore)throw Error('Camera cycle failed');

await c.eval("window.J90MatchLifecycle.pauseForBackground()");
if(!await c.eval("!!window.S?.match2d?.paused"))throw Error('Lifecycle pause failed');
const savedElapsed=Number(await c.eval("window.S?.match2d?.elapsed||0"));
await c.eval("window.J90MatchLifecycle.resumeAfterForeground()");
await sleep(350);
const resumed=await c.eval("({paused:!!window.S?.match2d?.paused,elapsed:Number(window.S?.match2d?.elapsed||0),frames:Number(window.S?.match2d?._j90v3Frames||0)})");
if(resumed.paused||resumed.frames<check.frames+2)throw Error('2D recovery after lifecycle failed: '+JSON.stringify(resumed));

await c.eval("window.J90MatchLifecycle.save()");
await c.call('Page.reload',{ignoreCache:true});
await wait(c,"!!window.S?.match2d",20000);await wait(c,"!!document.querySelector('#j90MatchCanvas')",20000);await wait(c,"window.J90Match2DV3?.version==='4.1'",20000);
const restored=await c.eval("({match:!!window.S?.match2d,canvas:!!document.querySelector('#j90MatchCanvas'),elapsed:Number(window.S?.match2d?.elapsed||0),paused:!!window.S?.match2d?.paused,frames:Number(window.S?.match2d?._j90v3Frames||0)})");
if(!restored.match||!restored.canvas)throw Error('Live match not restored after WebView reload: '+JSON.stringify(restored));
if(restored.elapsed+0.5<savedElapsed)throw Error('Clock regressed after reload: '+JSON.stringify({savedElapsed,restored}));

try{adb(['shell','input','keyevent','3'])}catch(e){errors.push('adb-home: '+e.message)}
await sleep(1500);
try{adb(['shell','monkey','-p','com.jornada90.manager','1'])}catch(e){errors.push('adb-reopen: '+e.message)}
await sleep(1800);
c.close();c=await connect();
await wait(c,"!!window.S?.match2d",20000);await wait(c,"!!document.querySelector('#j90MatchCanvas')",20000);await wait(c,"window.J90Match2DV3?.version==='4.1'",20000);
const foreground=await c.eval("({match:!!window.S?.match2d,canvas:!!document.querySelector('#j90MatchCanvas'),elapsed:Number(window.S?.match2d?.elapsed||0),paused:!!window.S?.match2d?.paused,frames:Number(window.S?.match2d?._j90v3Frames||0)})");
if(!foreground.match||!foreground.canvas||foreground.paused)throw Error('Android background/foreground recovery failed: '+JSON.stringify(foreground));
await c.shot(out+'/android-2d-after-resume.png');
const perf=await c.eval("window.J90Perf?.snapshot?.()||null");

fs.writeFileSync(out+'/android-result.json',JSON.stringify({resilience,check,before,after,camBefore,camAfter,savedElapsed,resumed,restored,foreground,perf,errors},null,2));
if(errors.length)throw Error('Android runtime errors:\n'+errors.slice(0,20).join('\n'));
console.log('ANDROID_WEBVIEW_SMOKE=OK');
console.log('ANDROID_2D='+JSON.stringify({check,before,after,resumed,restored,foreground}));
c.close();
