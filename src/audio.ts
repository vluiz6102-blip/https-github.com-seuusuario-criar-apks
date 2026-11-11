type MusicTrack={title?:string;src:string};
let audioContext:AudioContext|null=null,musicSource:AudioBufferSourceNode|null=null,musicGain:GainNode|null=null;
let musicWanted=false,licensedAudio:HTMLAudioElement|null=null,licensedTracks:MusicTrack[]=[],musicBuffer:AudioBuffer|null=null,licensedIndex=0;
function context():AudioContext{const AudioCtor=window.AudioContext;if(!AudioCtor)throw new Error("Web Audio não disponível");audioContext??=new AudioCtor();return audioContext;}
function makeOriginalBuffer(ctx:AudioContext):AudioBuffer{
 if(musicBuffer)return musicBuffer;
 const sampleRate=22050,bpm=94,beat=60/bpm,bars=8,length=Math.floor(sampleRate*beat*4*bars),buffer=ctx.createBuffer(1,length,sampleRate),samples=buffer.getChannelData(0);
 const chords=[[261.63,329.63,392],[196,246.94,392],[220,261.63,329.63],[174.61,220,261.63]],melody=[523.25,587.33,659.25,783.99,659.25,587.33,493.88,587.33];let noise=73129;
 for(let i=0;i<length;i++){
  const t=i/sampleRate,beatPosition=t/beat,beatIndex=Math.floor(beatPosition),bar=Math.floor(beatIndex/4)%4,beatPart=beatPosition-beatIndex,chord=chords[bar]!;
  let pad=0;for(let n=0;n<chord.length;n++)pad+=Math.sin(2*Math.PI*chord[n]!*t+n*.7)*.018;
  const bass=Math.sin(2*Math.PI*(chord[0]!/2)*t)*.11*Math.exp(-beatPart*5.5);
  const melodyStep=Math.floor(beatPosition*2)%melody.length,melodyAge=(beatPosition*2)%1,pluck=Math.sin(2*Math.PI*melody[melodyStep]!*t)*.045*Math.exp(-melodyAge*7);
  const kickPhase=beatPosition%4,kick=kickPhase<.18?Math.sin(2*Math.PI*(88-kickPhase*210)*t)*Math.exp(-kickPhase*23)*.13:0;
  const halfBeat=beatPosition%1;noise=(noise*16807)%2147483647;const hat=beatIndex%2===1&&halfBeat<.11?((noise/2147483647)*2-1)*(1-halfBeat/.11)*.018:0;
  const fade=Math.max(0,Math.min(1,t/.12,(length/sampleRate-t)/.2));samples[i]=Math.max(-.85,Math.min(.85,(pad+bass+pluck+kick+hat)*fade));
 }
 musicBuffer=buffer;return buffer;
}
function startProcedural():void{
 const ctx=context();if(musicSource)return;
 const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=makeOriginalBuffer(ctx);source.loop=true;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.24,ctx.currentTime+1.8);
 source.connect(gain);gain.connect(ctx.destination);source.start();musicSource=source;musicGain=gain;
}
async function startLicensedTrack():Promise<void>{
 if(!musicWanted||!licensedTracks.length)return;
 const track=licensedTracks[licensedIndex%licensedTracks.length]!,audio=new Audio(track.src);audio.loop=licensedTracks.length===1;audio.volume=0;
 audio.addEventListener("ended",()=>{if(musicWanted&&licensedTracks.length>1){licensedIndex++;void startLicensedTrack();}});
 try{await audio.play();if(!musicWanted){audio.pause();return;}if(licensedAudio)licensedAudio.pause();licensedAudio=audio;
  let volume=0;const fade=window.setInterval(()=>{if(!musicWanted||licensedAudio!==audio){window.clearInterval(fade);return;}volume=Math.min(.22,volume+.025);audio.volume=volume;if(volume>=.22)window.clearInterval(fade);},80);
  if(musicSource&&musicGain){const oldSource=musicSource,oldGain=musicGain;oldGain.gain.setTargetAtTime(.0001,context().currentTime,.12);window.setTimeout(()=>{try{oldSource.stop();}catch{}},650);musicSource=null;musicGain=null;}
 }catch(error){console.warn("Faixa da playlist indisponível; mantendo a trilha original.",error);startProcedural();}
}
async function loadPlaylist():Promise<void>{
 try{const response=await fetch("/music/playlist.json");if(!response.ok)return;const data=await response.json() as {tracks?:unknown};
  if(!Array.isArray(data.tracks))return;
  licensedTracks=data.tracks.filter((item):item is MusicTrack=>Boolean(item&&typeof item==="object"&&typeof(item as MusicTrack).src==="string"&&(item as MusicTrack).src.startsWith("/music/tracks/")));
  if(musicWanted&&licensedTracks.length)void startLicensedTrack();
 }catch{/* Offline: use original local soundtrack. */}
}
void loadPlaylist();
export function startBackgroundMusic():void{musicWanted=true;try{const ctx=context();if(ctx.state==="suspended")void ctx.resume();if(licensedTracks.length)void startLicensedTrack();else startProcedural();}catch(error){console.debug("Trilha indisponível neste dispositivo.",error);}}
export function stopBackgroundMusic():void{
 musicWanted=false;if(licensedAudio){licensedAudio.pause();licensedAudio.currentTime=0;licensedAudio=null;}
 if(musicSource&&musicGain&&audioContext){const source=musicSource,gain=musicGain,now=audioContext.currentTime;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(Math.max(.0001,gain.gain.value),now);gain.gain.exponentialRampToValueAtTime(.0001,now+.35);window.setTimeout(()=>{try{source.stop();}catch{}},420);musicSource=null;musicGain=null;}
}
export function playUiSound(kind:"tap"|"goal"="tap"):void{
 try{const ctx=context();if(ctx.state==="suspended")void ctx.resume();const oscillator=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
  oscillator.type="sine";oscillator.frequency.setValueAtTime(kind==="goal"?660:520,now);if(kind==="goal")oscillator.frequency.exponentialRampToValueAtTime(990,now+.16);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==="goal"?.12:.035,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+(kind==="goal"?.28:.09));
  oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(now);oscillator.stop(now+(kind==="goal"?.3:.11));
 }catch(error){console.debug("Áudio indisponível neste dispositivo.",error);}
}
