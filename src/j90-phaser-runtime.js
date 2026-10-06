(function(){
'use strict';
function detectGpu(){
  try{
    var c=document.createElement('canvas');
    var gl2=c.getContext('webgl2',{powerPreference:'high-performance'});
    var gl=gl2||c.getContext('webgl',{powerPreference:'high-performance'});
    if(!gl)return {webgl:false,webgl2:false,renderer:'unknown',vendor:'unknown',maxTextureSize:0};
    var info=gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl:true,
      webgl2:!!gl2,
      renderer:String(info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)||'unknown'),
      vendor:String(info?gl.getParameter(info.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)||'unknown'),
      maxTextureSize:Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)||0)
    };
  }catch(e){return {webgl:false,webgl2:false,renderer:'unknown',vendor:'unknown',maxTextureSize:0};}
}
function gpuFamily(g){
  var s=(g.renderer+' '+g.vendor).toLowerCase();
  if(/adreno|qualcomm/.test(s))return 'adreno';
  if(/mali|arm/.test(s))return 'mali';
  if(/xclipse|samsung/.test(s))return 'xclipse';
  if(/powervr|imagination/.test(s))return 'powervr';
  if(/nvidia|geforce|tegra/.test(s))return 'nvidia';
  if(/apple/.test(s))return 'apple';
  return 'unknown';
}
async function nativeDeviceInfo(){try{var cap=window.Capacitor;if(!cap)return null;var d=cap.Plugins&&cap.Plugins.Device;if(!d&&cap.registerPlugin){window.J90NativeDevice=window.J90NativeDevice||cap.registerPlugin('Device');d=window.J90NativeDevice;}if(d&&d.getInfo)return await d.getInfo();}catch(e){}return null;}
function quality(g){
  var cores=Math.max(1,Number(navigator.hardwareConcurrency||4));
  var mem=Number(navigator.deviceMemory||0);
  var mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var family=gpuFamily(g),s=0;
  if(g.webgl2)s+=2; else if(g.webgl)s++;
  if(cores>=8)s+=2; else if(cores>=6)s++;
  if(mem>=8)s+=2; else if(mem>=4)s++;
  if(g.maxTextureSize>=8192)s+=2; else if(g.maxTextureSize>=4096)s++;
  /* Mobile WebView is intentionally conservative: stable frame pacing beats a synthetic 'ultra' tier. */
  if(mobile && (family==='mali'||family==='powervr'||family==='unknown')) s=Math.min(s,5);
  var tier=s>=8?'high':s>=6?'balanced':s>=4?'balanced':'performance';
  var renderHz=tier==='high'?90:(tier==='balanced'?60:45);
  var pixelRatio=tier==='high'?1.15:(tier==='balanced'?1.0:.85);
  return {tier:tier,score:s,cores:cores,memoryGb:mem,gpuFamily:family,renderHz:renderHz,pixelRatio:pixelRatio};
}
window.J90Graphics={
  version:'phaser4-core-1',
  detect:function(){
    var g=detectGpu(),q=quality(g);
    var p={
      engine:'Phaser 4.2.1',
      renderer:g.webgl2?'WebGL2':(g.webgl?'WebGL':'Canvas fallback'),
      gpu:g.renderer,
      vendor:g.vendor,
      gpuFamily:q.gpuFamily,
      maxTextureSize:g.maxTextureSize,
      cpuCores:q.cores,
      memoryGb:q.memoryGb,
      quality:q.tier,
      qualityScore:q.score,
      renderHz:q.renderHz,
      renderPixelRatio:q.pixelRatio,
      mobile:/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    };
    window.J90_GRAPHICS_PROFILE=p;
    return p;
  },
  start:async function(){
    var p=this.detect();
    var n=await nativeDeviceInfo();
    if(n){p.model=n.model||'';p.manufacturer=n.manufacturer||'';p.osVersion=n.osVersion||'';p.webViewVersion=n.webViewVersion||'';}
    window.J90_GRAPHICS_PROFILE=p;
    window.J90_PHASER_READY=!!window.Phaser;
    return p;
  }
};
try{window.J90Graphics.start().then(function(p){document.documentElement.style.setProperty('--j90-render-dpr',String(p.renderPixelRatio||1));document.documentElement.style.setProperty('--j90-render-hz',String(p.renderHz||60));}).catch(function(){window.J90_PHASER_READY=!!window.Phaser;});}catch(e){window.J90_PHASER_READY=false;}
})();