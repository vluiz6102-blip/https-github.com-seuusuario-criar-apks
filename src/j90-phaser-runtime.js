(function(){
'use strict';
function detectGpu(){
  try{
    var c=document.createElement('canvas');
    var gl=c.getContext('webgl2',{powerPreference:'high-performance'})||c.getContext('webgl',{powerPreference:'high-performance'});
    if(!gl)return {webgl:false,webgl2:false,renderer:'unknown',vendor:'unknown',maxTextureSize:0};
    var info=gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl:true,
      webgl2:!!c.getContext('webgl2'),
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
function quality(g){
  var cores=Math.max(1,Number(navigator.hardwareConcurrency||4));
  var mem=Number(navigator.deviceMemory||0);
  var s=0;
  if(g.webgl2)s+=2; else if(g.webgl)s++;
  if(cores>=8)s+=2; else if(cores>=6)s++;
  if(mem>=8)s+=2; else if(mem>=4)s++;
  if(g.maxTextureSize>=8192)s+=2; else if(g.maxTextureSize>=4096)s++;
  var tier=s>=8?'ultra':s>=6?'high':s>=4?'medium':'performance';
  return {tier:tier,score:s,cores:cores,memoryGb:mem,gpuFamily:gpuFamily(g)};
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
      mobile:/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    };
    window.J90_GRAPHICS_PROFILE=p;
    return p;
  },
  start:function(){
    var p=this.detect();
    window.J90_PHASER_READY=!!window.Phaser;
    return p;
  }
};
try{window.J90Graphics.start();}catch(e){window.J90_PHASER_READY=false;}
})();