/* Jornada 90 Soundscape 2.1
 * Curated CC0 instrumental tracks streamed from OpenGameArt + low-volume local crowd synthesis.\n * The original CC0 reference asset remains crowd_shouting.ogg, but match ambience does not depend on a remote crowd request.
 * Music is deliberately quieter than stadium ambience so match audio remains clear.
 */
(() => {
  'use strict';
  const state=window.ambienceState||{timeOfDay:'afternoon',weather:'clear',rainIntensity:0,windIntensity:0,matchDay:false,minutesToMatch:null,recentResult:'neutral',menuActive:true};
  window.ambienceState=state;

  const CC0='https://opengameart.org/sites/default/files/';
  const tracks=[
    ['A Cup of Tea','A cup of tea.mp3','OpenGameArt CC0'],
    ['Calm Music','song_2.mp3','OpenGameArt CC0'],
    ['Rainy Forest','Rainy Forest.mp3','OpenGameArt CC0'],
    ['Morning Rain','Morning rain.mp3','OpenGameArt CC0'],
    ['Countryside','Countryside.mp3','OpenGameArt CC0'],
    ['Oceanside','Oceanside.mp3','OpenGameArt CC0'],
    ['Cat Caffe','Cat caffe.mp3','OpenGameArt CC0'],
    ['Florist','Florist.mp3','OpenGameArt CC0'],
    ['Chill Loopable','chillloopable.mp3','OpenGameArt CC0'],
    ['A Chill Fever','a_chill_fever.mp3','OpenGameArt CC0'],
    ['Once Upon a Time · loop','once_upon_a_time_loop.mp3','OpenGameArt CC0'],
    ['Pointless Loop','pointless_loop.mp3','OpenGameArt CC0'],
    ['In the Middle of Nowhere · ambience','unknown_space_ambience.mp3','OpenGameArt CC0'],
    ['In the Middle of Nowhere · guitar','unknown_space_bassed.mp3','OpenGameArt CC0'],
    ['Perces','perces1.mp3','OpenGameArt CC0'],
    ['MindStream','DST-MindStream.mp3','OpenGameArt CC0'],
    ['Classical Pop · instrumental','ClassicalPop (Instrumental).mp3','OpenGameArt CC0'],
    ['Mythica','mythica.mp3','OpenGameArt CC0'],
    ['Joyfully · loop','joyfully_loop_bpm170.mp3','OpenGameArt CC0'],
    ['Our Expanse · loop','our_expanse_-_loop-version-.mp3','OpenGameArt CC0']
  ].map((t,i)=>({id:i,title:t[0],file:t[1],collection:t[2],url:CC0+encodeURIComponent(t[1]),license:'CC0'}));

  let musicEl=null,crowdEl=null,goalEl=null,activeTrack=-1,musicEnabled=true,crowdEnabled=true,matchAudio=false,pendingPlay=false;
  let AC=null,master=null,offlineGain=null,offlineOsc=[],crowdNoise=null,crowdGain=null;

  function ensureOffline(){
    if(AC)return AC;
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
    try{
      AC=new C();master=AC.createGain();master.gain.value=.58;master.connect(AC.destination);
    }catch(e){AC=null}
    return AC;
  }
  function resumeOffline(){const c=ensureOffline();if(c&&c.state==='suspended')c.resume();return c;}
  function stopOffline(){offlineOsc=[];if(offlineGain)offlineGain.gain.value=0;}
  function showState(){window.dispatchEvent(new CustomEvent('j90-audio-state',{detail:{track:activeTrack>=0?tracks[activeTrack].title:'',remote:!!musicEl,mode:window.J90_AUDIO_MODE}}));}
  function stopMusic(){pendingPlay=false;if(musicEl){musicEl.pause();musicEl.removeAttribute('src');try{musicEl.load()}catch(e){}musicEl=null;}stopOffline();showState();}
  function playOffline(){return false;}
  function playTrack(index){
    if(!musicEnabled)return false;
    index=((index%tracks.length)+tracks.length)%tracks.length;activeTrack=index;
    if(musicEl){musicEl.pause();musicEl.removeAttribute('src');try{musicEl.load()}catch(e){}}
    const a=new Audio();a.preload='metadata';a.loop=false;a.volume=matchAudio?.018:.040;a.src=tracks[index].url;
    a.addEventListener('ended',()=>playTrack(index+1),{once:true});
    a.addEventListener('error',()=>{pendingPlay=false;playOffline();showState();},{once:true});
    musicEl=a;pendingPlay=true;const promise=a.play();if(promise&&promise.catch)promise.catch(()=>{pendingPlay=true;});
    stopOffline();showState();return true;
  }
  function ensureCrowd(){
    if(!crowdEnabled||!matchAudio||crowdNoise)return;
    const c=resumeOffline();if(!c||!master)return;
    try{
      const size=Math.max(1,Math.floor(c.sampleRate*2));
      const buffer=c.createBuffer(1,size,c.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<size;i++){
        const n=(Math.random()*2-1);
        data[i]=n*.22;
      }
      const src=c.createBufferSource();src.buffer=buffer;src.loop=true;
      const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;filter.Q.value=.35;
      const gain=c.createGain();gain.gain.value=.008;
      src.connect(filter);filter.connect(gain);gain.connect(master);src.start();
      crowdNoise=src;crowdGain=gain;
    }catch(e){crowdNoise=null;crowdGain=null}
  }
  function setCrowdLevel(level){
    level=Math.max(0,Math.min(1,Number(level)||0));
    if(crowdGain)crowdGain.gain.value=matchAudio?(0.003+level*0.018):0;
  }
  function setGoalLevel(level){
    level=Math.max(0,Math.min(1,Number(level)||0));
    if(goalEl)goalEl.volume=matchAudio?(0.025+level*0.075):0;
  }
  function goal(){
    if(!crowdEnabled||!matchAudio)return;
    ensureCrowd();if(goalEl){try{goalEl.pause()}catch(e){}}
    const c=resumeOffline();if(!c||!master)return;
    try{
      const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;
      o.type='triangle';o.frequency.setValueAtTime(280,t);o.frequency.exponentialRampToValueAtTime(760,t+.35);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.065,t+.05);g.gain.exponentialRampToValueAtTime(.0001,t+1.1);
      o.connect(g);g.connect(master);o.start(t);o.stop(t+1.15);
      goalEl={pause:()=>{try{o.stop()}catch(e){}}};
      window.dispatchEvent(new CustomEvent('j90-audio-goal',{detail:{source:'CC0-cheers.ogg-compatible'}}));
    }catch(e){goalEl=null}
  }
  function whistle(){
    const c=resumeOffline();if(!c)return;
    const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type='sine';o.frequency.setValueAtTime(1450,t);o.frequency.exponentialRampToValueAtTime(2050,t+.32);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.40);o.connect(g);g.connect(master);o.start(t);o.stop(t+.45);
  }
  function setWeather(weather){state.weather=['clear','cloudy','lightRain','heavyRain'].includes(weather)?weather:'clear';state.rainIntensity=0;state.windIntensity=0;syncVisualEnvironment();}
  function syncVisualEnvironment(){
    document.querySelectorAll('.stadiumScene').forEach(root=>{const night=state.timeOfDay==='night';root.style.setProperty('--j90-sun',String(night?.28:.72));root.style.setProperty('--j90-horizon',String(night?.13:.29));root.style.setProperty('--j90-lights',String(night?.25:.08));root.style.setProperty('--j90-clouds',String(state.weather==='cloudy'?.14:.05));root.style.setProperty('--j90-rain','0');root.querySelector('.j90RainLayer')?.remove();});
  }
  function startSoundscape(){
    matchAudio=!!(state.matchDay&&!state.menuActive);resumeOffline();
    if(musicEnabled&&activeTrack<0)playTrack(0);
    else if(musicEnabled&&pendingPlay&&musicEl){const p=musicEl.play();if(p&&p.catch)p.catch(()=>{});}
    if(matchAudio)ensureCrowd();else if(crowdEl){crowdEl.pause();crowdEl=null;}
    syncVisualEnvironment();showState();return Promise.resolve();
  }
  function sync(){state.menuActive=false;state.matchDay=true;matchAudio=true;startSoundscape();}
  function stop(){stopMusic();if(crowdNoise){try{crowdNoise.stop()}catch(e){}crowdNoise=null;}crowdGain=null;if(goalEl){goalEl.pause();goalEl=null;}matchAudio=false;}
  function pause(){if(musicEl)musicEl.pause();if(crowdNoise)crowdGain&&(crowdGain.gain.value=0);}
  function resume(){return startSoundscape();}
  function setMusicEnabled(v){musicEnabled=!!v;if(!musicEnabled)stopMusic();else playTrack(activeTrack<0?0:activeTrack);}
  function setCrowdEnabled(v){crowdEnabled=!!v;if(!crowdEnabled&&crowdNoise){try{crowdNoise.stop()}catch(e){}crowdNoise=null;crowdGain=null;}else if(crowdEnabled&&matchAudio)ensureCrowd();}
  function nextTrack(){return playTrack(activeTrack+1);}
  function getTracks(){return tracks.map(t=>({id:t.id,title:t.title,source:t.collection,license:t.license,url:t.url}));}
  function debugScenario(name){const weather={clear:'clear',cloudy:'cloudy',lightRain:'lightRain',heavyRain:'heavyRain',match:'clear',preMatch:'clear'}[name];if(!weather)return false;setWeather(weather);state.matchDay=name==='match'||name==='preMatch';state.minutesToMatch=name==='match'?180:name==='preMatch'?30:null;if(name==='match'){state.menuActive=false;matchAudio=true;startSoundscape();}return true;}
  function snapshot(){
    const base=typeof j90PerfSnapshot==='function'?j90PerfSnapshot():{};
    return Object.assign({},base,{weather:state.weather,rainIntensity:0,windIntensity:0,continuousLayers:musicEnabled?['cc0-music:'+(activeTrack>=0?tracks[activeTrack].title:'none')]:[],activeEvents:goalEl?1:0,activeAudioSources:(musicEl?1:0)+(crowdEl?1:0)+(goalEl?1:0),soundscapeNodes:0,loadedAudioBuffers:[],failedAudioAssets:[],audioContextState:AC?.state||'unavailable',audioDisabled:false,musicTracks:tracks.length,copyrightModel:'CC0-remote'});
  }

  window.addEventListener('pointerdown',()=>{if(pendingPlay&&musicEl){const p=musicEl.play();if(p&&p.catch)p.catch(()=>{});}}, {once:false,passive:true});
  window.J90Ambience={start:startSoundscape,stop,pause,resume,setWeather,debugScenario,snapshot,state,setMusicEnabled,setCrowdEnabled,nextTrack,getTracks,goal,whistle,setCrowdLevel,setGoalLevel};
  window.J90Perf=window.J90Perf||{};window.J90Perf.snapshot=snapshot;
  window.j90SoundscapeStart=startSoundscape;window.j90SoundscapeStop=stop;window.j90SyncSoundscape=sync;window.updateJ90MenuEnvironment=syncVisualEnvironment;
  window.J90_AUDIO_DISABLED=false;window.J90_AUDIO_MODE='remote-cc0';window.J90_AUDIO_PROFILE='quiet-match-2.1';
  syncVisualEnvironment();
})();