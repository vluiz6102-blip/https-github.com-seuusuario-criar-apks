/* Jornada 90 - audio disabled by design.
 * The game is intentionally silent. Keep this compatibility API so existing
 * UI/environment calls cannot create Web Audio nodes or play imported assets.
 */
(() => {
  'use strict';
  const ambienceState = window.ambienceState || {
    timeOfDay:'afternoon', weather:'clear', rainIntensity:0, windIntensity:0,
    matchDay:false, minutesToMatch:null, recentResult:'neutral', menuActive:true
  };
  ambienceState.menuActive = false;
  ambienceState.rainIntensity = 0;
  ambienceState.windIntensity = 0;
  window.ambienceState = ambienceState;

  function syncVisualEnvironment(){
    const roots=document.querySelectorAll('.stadiumScene');
    const night=ambienceState.timeOfDay==='night';
    roots.forEach(root=>{
      root.style.setProperty('--j90-sun',String(night?.28:.72));
      root.style.setProperty('--j90-horizon',String(night?.13:.29));
      root.style.setProperty('--j90-lights',String(night?.25:.08));
      root.style.setProperty('--j90-clouds',String(ambienceState.weather==='cloudy'?.14:.05));
      root.style.setProperty('--j90-ambient','1');
      root.style.setProperty('--j90-rain','0');
      const rain=root.querySelector('.j90RainLayer');
      if(rain) rain.remove();
    });
  }

  function setWeather(weather){
    const allowed=['clear','cloudy','lightRain','heavyRain'];
    ambienceState.weather=allowed.includes(weather)?weather:'clear';
    ambienceState.rainIntensity=0;
    ambienceState.windIntensity=0;
    syncVisualEnvironment();
  }
  function start(){ ambienceState.menuActive=false; syncVisualEnvironment(); return Promise.resolve(); }
  function stop(){ ambienceState.menuActive=false; }
  function pause(){ ambienceState.menuActive=false; }
  function resume(){ ambienceState.menuActive=false; return Promise.resolve(); }
  function debugScenario(name){
    const weather={clear:'clear',cloudy:'cloudy',lightRain:'lightRain',heavyRain:'heavyRain',match:'clear',preMatch:'clear'}[name];
    if(!weather)return false;
    setWeather(weather);
    ambienceState.matchDay=name==='match'||name==='preMatch';
    ambienceState.minutesToMatch=name==='match'?180:name==='preMatch'?30:null;
    return true;
  }
  function snapshot(){
    const base=typeof j90PerfSnapshot==='function'?j90PerfSnapshot():{};
    return Object.assign({},base,{
      weather:ambienceState.weather,
      rainIntensity:0,
      windIntensity:0,
      continuousLayers:[],
      activeEvents:0,
      activeAudioSources:0,
      soundscapeNodes:0,
      loadedAudioBuffers:[],
      failedAudioAssets:[],
      audioContextState:'disabled',
      audioDisabled:true,
      quality:document.body.classList.contains('j90-low-quality')?'low':'high'
    });
  }

  window.J90Ambience={start,stop,pause,resume,setWeather,debugScenario,snapshot,state:ambienceState};
  window.J90Perf=window.J90Perf||{};
  window.J90Perf.snapshot=snapshot;
  window.j90SoundscapeStart=start;
  window.j90SoundscapeStop=stop;
  window.j90SyncSoundscape=()=>{ ambienceState.menuActive=false; syncVisualEnvironment(); };
  window.updateJ90MenuEnvironment=syncVisualEnvironment;
  window.J90_AUDIO_DISABLED=true;
  syncVisualEnvironment();
})();