/* Jornada 90 - procedural music + stadium audio. No copyrighted audio files are bundled. */
(() => {
  'use strict';
  const state=window.ambienceState||{timeOfDay:'afternoon',weather:'clear',rainIntensity:0,windIntensity:0,matchDay:false,minutesToMatch:null,recentResult:'neutral',menuActive:true};
  window.ambienceState=state;
  let AC=null, master=null, musicGain=null, crowdGain=null, musicTimer=null, musicNodes=[], crowdSource=null, crowdBuffer=null, activeTrack=-1, musicEnabled=true, crowdEnabled=true;
  const tracks=[
    ['Kickoff Horizon',112,0,[0,4,7,11,7,4,2,4]],['Night Drive Football',118,2,[0,3,7,10,7,3,1,3]],
    ['Stadium Lights',124,1,[0,5,9,12,9,5,4,5]],['Golden Goal',108,3,[0,4,8,11,8,4,0,3]],
    ['Counter Attack',128,0,[0,2,5,9,12,9,5,2]],['Final Whistle',100,2,[0,5,7,10,7,5,2,0]],
    ['Home End',116,1,[0,7,5,9,12,9,5,7]],['Away Days',122,3,[0,3,5,8,10,8,5,3]],
    ['Pressing Game',130,0,[0,4,6,9,11,9,6,4]],['Extra Time',104,2,[0,7,10,12,10,7,5,2]],
    ['Touchline',114,1,[0,2,7,9,12,9,7,2]],['One More Chance',110,3,[0,5,8,12,8,5,3,0]],
    ['Fast Break',132,0,[0,3,7,10,12,10,7,3]],['Derby Night',120,1,[0,4,7,11,9,7,4,2]],
    ['The Tenth Minute',106,2,[0,7,9,12,9,7,4,0]],['Champions Road',126,3,[0,2,5,9,12,9,5,2]],
    ['Deep Block',102,0,[0,4,5,9,10,7,5,3]],['Last Attack',128,2,[0,3,8,11,13,8,3,1]],
    ['Football City',118,1,[0,5,9,12,9,5,1,4]],['Ninety Plus',124,3,[0,2,6,11,14,11,6,2]]
  ];
  function ensure(){ if(AC)return AC; const C=window.AudioContext||window.webkitAudioContext;if(!C)return null; AC=new C(); master=AC.createGain();master.gain.value=.62;master.connect(AC.destination);musicGain=AC.createGain();musicGain.gain.value=.20;musicGain.connect(master);crowdGain=AC.createGain();crowdGain.gain.value=.32;crowdGain.connect(master); return AC; }
  function unlock(){const c=ensure();if(c&&c.state==='suspended')c.resume();return c;}
  function stopMusic(){if(musicTimer)clearTimeout(musicTimer);musicTimer=null;musicNodes.forEach(n=>{try{n.stop?.()}catch{}});musicNodes=[];}
  function note(freq,t,d,g,type='triangle'){const o=AC.createOscillator(),v=AC.createGain();o.type=type;o.frequency.value=freq;v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(g,t+.015);v.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(v);v.connect(musicGain);o.start(t);o.stop(t+d+.03);musicNodes.push(o);}
  function playTrack(index){const c=unlock();if(!c||!musicEnabled)return false;index=((index%tracks.length)+tracks.length)%tracks.length;activeTrack=index;stopMusic();const tr=tracks[index], bpm=tr[1], scale=tr[3], step=60/bpm, now=c.currentTime+.05;for(let i=0;i<32;i++){const sem=scale[i%scale.length]+tr[2];const f=110*Math.pow(2,sem/12);note(f,now+i*step*.5,step*.42,.055,i%4===0?'square':'triangle');if(i%2===0)note(f/2,now+i*step*.5,step*.38,.025,'sine');}musicTimer=setTimeout(()=>playTrack((index+1)%tracks.length),Math.max(1000,(32*step*.5)*1000-100));return true;}
  function makeCrowd(){const c=unlock();if(!c||crowdSource)return;const len=c.sampleRate*2,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++){const n=Math.random()*2-1;d[i]=(n*.34+Math.sin(i*.017)*.08+Math.sin(i*.0043)*.12)*.65;}crowdBuffer=buf;crowdSource=c.createBufferSource();crowdSource.buffer=buf;crowdSource.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1700;crowdSource.connect(filter);filter.connect(crowdGain);crowdSource.start();window.setTimeout(()=>crowdSource&&crowdSource.stop?.(),2147483000);}
  function crowd(level=.32){const c=unlock();if(!c||!crowdEnabled)return;makeCrowd();if(crowdGain)crowdGain.gain.cancelScheduledValues(c.currentTime),crowdGain.gain.linearRampToValueAtTime(Math.max(0,Math.min(.7,level)),c.currentTime+.08);}
  function whistle(){const c=unlock();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(1500,c.currentTime);o.frequency.exponentialRampToValueAtTime(2100,c.currentTime+.45);g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.12,c.currentTime+.03);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.55);o.connect(g);g.connect(master);o.start();o.stop(c.currentTime+.6);}
  function goal(){crowd(.58);whistle();}
  function setWeather(weather){state.weather=['clear','cloudy','lightRain','heavyRain'].includes(weather)?weather:'clear';state.rainIntensity=0;state.windIntensity=0;syncVisualEnvironment();}
  function syncVisualEnvironment(){document.querySelectorAll('.stadiumScene').forEach(root=>{const night=state.timeOfDay==='night';root.style.setProperty('--j90-sun',String(night?.28:.72));root.style.setProperty('--j90-horizon',String(night?.13:.29));root.style.setProperty('--j90-lights',String(night?.25:.08));root.style.setProperty('--j90-clouds',String(state.weather==='cloudy'?.14:.05));root.style.setProperty('--j90-rain','0');root.querySelector('.j90RainLayer')?.remove();});}
  function start(){const c=unlock();if(c){makeCrowd();crowd(.26);if(musicEnabled&&activeTrack<0)playTrack(Math.floor(Math.random()*tracks.length));}syncVisualEnvironment();return Promise.resolve();}
  function stop(){stopMusic();try{crowdSource?.stop()}catch{}crowdSource=null;}
  function pause(){stopMusic();}
  function resume(){return start();}
  function setMusicEnabled(v){musicEnabled=!!v;if(!musicEnabled)stopMusic();else if(AC)playTrack(activeTrack<0?0:activeTrack);}
  function setCrowdEnabled(v){crowdEnabled=!!v;if(!crowdEnabled&&crowdGain)crowdGain.gain.value=0;else crowd(.3);}
  function nextTrack(){return playTrack((activeTrack+1)%tracks.length);}
  function getTracks(){return tracks.map((t,i)=>({id:i,title:t[0],bpm:t[1],copyright:'procedural/original'}));}
  function externalMusic(provider,url){const allowed=['spotify','appleMusic','amazonMusic'];if(!allowed.includes(provider))return false;const target=String(url||'').trim();if(!target)return false;window.open(target,'_blank','noopener,noreferrer');return true;}
  function debugScenario(name){const weather={clear:'clear',cloudy:'cloudy',lightRain:'lightRain',heavyRain:'heavyRain',match:'clear',preMatch:'clear'}[name];if(!weather)return false;setWeather(weather);state.matchDay=name==='match'||name==='preMatch';state.minutesToMatch=name==='match'?180:name==='preMatch'?30:null;if(name==='match')crowd(.45);return true;}
  function snapshot(){const base=typeof j90PerfSnapshot==='function'?j90PerfSnapshot():{};return Object.assign({},base,{weather:state.weather,rainIntensity:0,windIntensity:0,continuousLayers:musicEnabled?['procedural-music']:[],activeEvents:0,activeAudioSources:(AC?1:0)+(musicEnabled?musicNodes.length:0),soundscapeNodes:musicNodes.length+(crowdSource?1:0),loadedAudioBuffers:crowdBuffer?['procedural-crowd']:[],failedAudioAssets:[],audioContextState:AC?.state||'unavailable',audioDisabled:false,musicTracks:tracks.length,copyrightModel:'procedural-original'});}
  window.J90Ambience={start,stop,pause,resume,setWeather,debugScenario,snapshot,state:state,setMusicEnabled,setCrowdEnabled,nextTrack,getTracks,externalMusic,goal,whistle};
  window.J90Perf=window.J90Perf||{};window.J90Perf.snapshot=snapshot;
  window.j90SoundscapeStart=start;window.j90SoundscapeStop=stop;window.j90SyncSoundscape=()=>{state.menuActive=false;syncVisualEnvironment();};window.updateJ90MenuEnvironment=syncVisualEnvironment;
  window.J90_AUDIO_DISABLED=false;window.J90_AUDIO_MODE='procedural-original';
  syncVisualEnvironment();
})();