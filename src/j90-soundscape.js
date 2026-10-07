/* Jornada 90 Soundscape 2.0
 * Real CC0 music streamed from OpenGameArt + CC0 stadium ambience.
 * Offline fallback is a quiet original WebAudio bed, never white noise.
 */
(() => {
  'use strict';
  const state=window.ambienceState||{timeOfDay:'afternoon',weather:'clear',rainIntensity:0,windIntensity:0,matchDay:false,minutesToMatch:null,recentResult:'neutral',menuActive:true};
  window.ambienceState=state;

  const CC0='https://opengameart.org/sites/default/files/';
  const tracks=[
    ['Wealthy','wealthy3.mp3','Songs'],['Woke','woke2.mp3','Songs'],['Billion','billion.mp3','Songs'],['Farm','farm.mp3','Songs'],
    ['Trailer','trailer.mp3','Songs'],['Rush','rush.mp3','Songs'],['Sakuriasis','sakuriasis.mp3','Songs'],['Vox','vox.mp3','Songs'],
    ['Beatnik','beatnik.mp3','Songs'],['Moments','moments.mp3','Songs'],['Too','too.mp3','Songs'],['Fakie Dakie','fakie_dakie.mp3','Songs'],
    ['Hard','hard.mp3','Songs'],['Rush 2','rush_2.mp3','Songs'],['A Song','a song_0.ogg','A Soundtrack'],['Castle 2','castle 2_0.ogg','A Soundtrack'],
    ['Final or Regular Boss Theme','Final or Regular Boss Theme_0.ogg','A Soundtrack'],
    ['Into Depths','Into Depths! Keep in mind, it's forced_0.ogg','A Soundtrack'],
    ['Sad Village',"sad village with claps 'n shit at the end_0.ogg",'A Soundtrack'],["Stooge's Story","Stooge's Story_0.ogg",'A Soundtrack']
  ].map((t,i)=>({id:i,title:t[0],file:t[1],collection:t[2],url:CC0+encodeURIComponent(t[1]),license:'CC0'}));

  let musicEl=null,crowdEl=null,goalEl=null,activeTrack=-1,musicEnabled=true,crowdEnabled=true,matchAudio=false,pendingPlay=false;
  let AC=null,master=null,offlineGain=null,offlineOsc=[];

  function ensureOffline(){
    if(AC)return AC;
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
    try{
      AC=new C();master=AC.createGain();master.gain.value=.58;master.connect(AC.destination);
      offlineGain=AC.createGain();offlineGain.gain.value=0;offlineGain.connect(master);
      [110,146.83,164.81].forEach((f)=>{const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;g.gain.value=.018;o.connect(g);g.connect(offlineGain);o.start();offlineOsc.push(o);});
    }catch(e){AC=null}
    return AC;
  }
  function resumeOffline(){const c=ensureOffline();if(c&&c.state==='suspended')c.resume();return c;}
  function stopOffline(){offlineOsc.forEach(o=>{try{o.stop()}catch(e){}});offlineOsc=[];if(offlineGain)offlineGain.gain.value=0;}
  function showState(){window.dispatchEvent(new CustomEvent('j90-audio-state',{detail:{track:activeTrack>=0?tracks[activeTrack].title:'',remote:!!musicEl,mode:window.J90_AUDIO_MODE}}));}
  function stopMusic(){pendingPlay=false;if(musicEl){musicEl.pause();musicEl.removeAttribute('src');try{musicEl.load()}catch(e){}musicEl=null;}stopOffline();showState();}
  function playOffline(){const c=resumeOffline();if(!c||!musicEnabled)return false;if(offlineGain)offlineGain.gain.setValueAtTime(matchAudio?.045:.018,c.currentTime);return true;}
  function playTrack(index){
    if(!musicEnabled)return false;
    index=((index%tracks.length)+tracks.length)%tracks.length;activeTrack=index;
    if(musicEl){musicEl.pause();musicEl.removeAttribute('src');try{musicEl.load()}catch(e){}}
    const a=new Audio();a.preload='metadata';a.loop=false;a.volume=matchAudio?.12:.055;a.src=tracks[index].url;
    a.addEventListener('ended',()=>playTrack(index+1),{once:true});
    a.addEventListener('error',()=>{pendingPlay=false;playOffline();showState();},{once:true});
    musicEl=a;pendingPlay=true;const promise=a.play();if(promise&&promise.catch)promise.catch(()=>{pendingPlay=true;});
    stopOffline();showState();return true;
  }
  function ensureCrowd(){
    if(!crowdEnabled||!matchAudio||crowdEl)return;
    const a=new Audio();a.preload='metadata';a.loop=true;a.volume=.075;a.src=CC0+'crowd_shouting.ogg';
    a.addEventListener('error',()=>{try{a.pause()}catch(e){}},{once:true});crowdEl=a;
    const p=a.play();if(p&&p.catch)p.catch(()=>{});
  }
  function goal(){
    if(!crowdEnabled||!matchAudio)return;
    ensureCrowd();if(goalEl){try{goalEl.pause()}catch(e){}}
    const a=new Audio();a.preload='metadata';a.volume=.13;a.src=CC0+'cheers.ogg';goalEl=a;
    const p=a.play();if(p&&p.catch)p.catch(()=>{});
  }
  function whistle(){
    const c=resumeOffline();if(!c)return;
    const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type='sine';o.frequency.setValueAtTime(1450,t);o.frequency.exponentialRampToValueAtTime(2050,t+.32);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.06,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.40);o.connect(g);g.connect(master);o.start(t);o.stop(t+.45);
  }
  function setWeather(weather){state.weather=['clear','cloudy','lightRain','heavyRain'].includes(weather)?weather:'clear';state.rainIntensity=0;state.windIntensity=0;syncVisualEnvironment();}
  function syncVisualEnvironment(){
    document.querySelectorAll('.stadiumScene').forEach(root=>{const night=state.timeOfDay==='night';root.style.setProperty('--j90-sun',String(night?.28:.72));root.style.setProperty('--j90-horizon',String(night?.13:.29));root.style.setProperty('--j90-lights',String(night?.25:.08));root.style.setProperty('--j90-clouds',String(state.weather==='cloudy'?.14:.05));root.style.setProperty('--j90-rain','0');root.querySelector('.j90RainLayer')?.remove();});
  }
  function startSoundscape(){
    matchAudio=!!(state.matchDay&&!state.menuActive);resumeOffline();
    if(musicEnabled&&activeTrack<0)playTrack(Math.floor(Math.random()*tracks.length));
    else if(musicEnabled&&pendingPlay&&musicEl){const p=musicEl.play();if(p&&p.catch)p.catch(()=>{});}
    if(matchAudio)ensureCrowd();else if(crowdEl){crowdEl.pause();crowdEl=null;}
    syncVisualEnvironment();showState();return Promise.resolve();
  }
  function sync(){state.menuActive=false;state.matchDay=true;matchAudio=true;startSoundscape();}
  function stop(){stopMusic();if(crowdEl){crowdEl.pause();crowdEl=null;}if(goalEl){goalEl.pause();goalEl=null;}matchAudio=false;}
  function pause(){if(musicEl)musicEl.pause();if(crowdEl)crowdEl.pause();}
  function resume(){return startSoundscape();}
  function setMusicEnabled(v){musicEnabled=!!v;if(!musicEnabled)stopMusic();else playTrack(activeTrack<0?0:activeTrack);}
  function setCrowdEnabled(v){crowdEnabled=!!v;if(!crowdEnabled&&crowdEl){crowdEl.pause();crowdEl=null;}else if(crowdEnabled&&matchAudio)ensureCrowd();}
  function nextTrack(){return playTrack(activeTrack+1);}
  function getTracks(){return tracks.map(t=>({id:t.id,title:t.title,source:t.collection,license:t.license,url:t.url}));}
  function externalMusic(provider,url){const allowed=['spotify','appleMusic','amazonMusic'];if(!allowed.includes(provider))return false;const target=String(url||'').trim();if(!target)return false;window.open(target,'_blank','noopener,noreferrer');return true;}
  function debugScenario(name){const weather={clear:'clear',cloudy:'cloudy',lightRain:'lightRain',heavyRain:'heavyRain',match:'clear',preMatch:'clear'}[name];if(!weather)return false;setWeather(weather);state.matchDay=name==='match'||name==='preMatch';state.minutesToMatch=name==='match'?180:name==='preMatch'?30:null;if(name==='match'){state.menuActive=false;matchAudio=true;startSoundscape();}return true;}
  function snapshot(){
    const base=typeof j90PerfSnapshot==='function'?j90PerfSnapshot():{};
    return Object.assign({},base,{weather:state.weather,rainIntensity:0,windIntensity:0,continuousLayers:musicEnabled?['cc0-music:'+(activeTrack>=0?tracks[activeTrack].title:'none')]:[],activeEvents:goalEl?1:0,activeAudioSources:(musicEl?1:0)+(crowdEl?1:0)+(goalEl?1:0),soundscapeNodes:0,loadedAudioBuffers:[],failedAudioAssets:[],audioContextState:AC?.state||'unavailable',audioDisabled:false,musicTracks:tracks.length,copyrightModel:'CC0-remote'});
  }

  window.addEventListener('pointerdown',()=>{if(pendingPlay&&musicEl){const p=musicEl.play();if(p&&p.catch)p.catch(()=>{});}}, {once:false,passive:true});
  window.J90Ambience={start:startSoundscape,stop,pause,resume,setWeather,debugScenario,snapshot,state,setMusicEnabled,setCrowdEnabled,nextTrack,getTracks,externalMusic,goal,whistle};
  window.J90Perf=window.J90Perf||{};window.J90Perf.snapshot=snapshot;
  window.j90SoundscapeStart=startSoundscape;window.j90SoundscapeStop=stop;window.j90SyncSoundscape=sync;window.updateJ90MenuEnvironment=syncVisualEnvironment;
  window.J90_AUDIO_DISABLED=false;window.J90_AUDIO_MODE='remote-cc0';
  syncVisualEnvironment();
})();