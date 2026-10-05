import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT='audio-import', OUT='assets/audio', META=join(ROOT,'metadata.json');
const map={
 '01-wind':['wind','wind-soft-01.ogg'],'02-leaves':['trees','leaves-soft-01.ogg'],'03-neighborhood':['neighborhood','neighborhood-bed-01.ogg'],
 '04-birds-bed':['birdsBed','birds-distant-01.ogg'],'05-bird-call':['birdEvents','bird-call-01.ogg'],'06-dog':['dog','dog-distant-01.ogg'],
 '07-car':['car','car-pass-01.ogg'],'08-light-rain':['rain','light-rain-bed-01.ogg'],'09-heavy-rain':['rain','heavy-rain-bed-01.ogg'],'10-crowd':['crowd','crowd-distant-01.ogg']
};
const exts=new Set(['.wav','.mp3','.m4a','.ogg']), confirm=process.argv.includes('--confirm');
const run=(cmd,args)=>spawnSync(cmd,args,{encoding:'utf8'});
const has=cmd=>{const r=run(cmd,['-version']);return !r.error&&r.status===0};
const ffmpeg=has(process.env.FFMPEG||'ffmpeg'), ffprobe=has(process.env.FFPROBE||'ffprobe');
const fmt=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB';
const duration=s=>Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0');
function probe(file){if(!ffprobe)return null;const r=run(process.env.FFPROBE||'ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_type,channels,sample_rate,duration','-of','json',file]);if(r.status!==0)return null;try{const s=JSON.parse(r.stdout).streams?.[0];return s&&s.codec_type==='audio'&&Number(s.duration)>0?{duration:Number(s.duration),channels:s.channels,sampleRate:Number(s.sample_rate)}:null;}catch{return null;}}
if(!existsSync(ROOT))mkdirSync(ROOT,{recursive:true});
if(!existsSync(META))throw new Error('audio-import/metadata.json ausente.');
const metadata=JSON.parse(readFileSync(META,'utf8'));
const files=readdirSync(ROOT).filter(f=>exts.has(extname(f).toLowerCase()));
console.log('FFmpeg: '+(ffmpeg?'disponível':'indisponível')+' | FFprobe: '+(ffprobe?'disponível':'indisponível'));
if(!files.length){console.log('Nenhum áudio em audio-import/. Relatório: 0/10.');process.exit(0);}
const licenses={};let count=0;
for(const file of files.sort()){
 const key=basename(file,extname(file));
 if(!map[key]){console.warn('Ignorado, nome não reconhecido: '+file);continue;}
 const m=metadata[key];
 if(!m?.originalName||!m?.author||!m?.sourceUrl||!m?.license||['unknown','desconhecida'].includes(String(m.license).toLowerCase())){console.warn('Ignorado, metadata/licença inválida: '+key);continue;}
 const src=join(ROOT,file), p=probe(src);
 if(!p){console.warn('Ignorado, áudio inválido ou não decodificável: '+file);continue;}
 const [folder,name]=map[key], dest=join(OUT,folder,name);mkdirSync(join(OUT,folder),{recursive:true});
 if(existsSync(dest)&&!confirm){console.warn('Destino já existe, não substituído: '+dest+' | use --confirm');continue;}
 let converted=false;
 if(extname(file).toLowerCase()==='.ogg')copyFileSync(src,dest);
 else{
  if(!ffmpeg){console.warn('Pendente, FFmpeg ausente: '+file+' | forneça OGG pronto ou converta externamente.');continue;}
  const tmp=dest+'.tmp';const r=run(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y','-i',src,'-map','0:a:0','-c:a','libvorbis','-q:a','5','-vn',tmp]);
  if(r.status!==0||!existsSync(tmp)||statSync(tmp).size===0){console.warn('Falha na conversão: '+file);continue;}
  copyFileSync(tmp,dest);require('node:fs').unlinkSync(tmp);converted=true;
 }
 const final=probe(dest);if(!final){console.warn('Arquivo final não decodificável: '+dest);continue;}
 licenses[key]={...m,destination:dest.replaceAll('\\','/'),durationSeconds:final.duration,format:'OGG',channels:final.channels,sampleRate:Number(final.sampleRate),conversion:converted?'FFmpeg/libvorbis q5, sem normalização':'Nenhuma'};
 count++;console.log('OK '+key+' | '+duration(final.duration)+' | '+final.channels+'ch | '+final.sampleRate+'Hz | '+fmt(statSync(dest).size));
}
const lp=join(OUT,'LICENSES.json'), old=existsSync(lp)?JSON.parse(readFileSync(lp,'utf8')):{};
writeFileSync(lp,JSON.stringify({...old,...licenses},null,2)+'\n');
const lines=['# Créditos de áudio','','Registro de procedência dos arquivos do Soundscape.',''];
for(const [k,v] of Object.entries(licenses))lines.push('## '+k,'- Autor: '+v.author,'- Nome original: '+v.originalName,'- Licença: '+v.license,'- Fonte: '+v.sourceUrl,'- Destino: '+v.destination,'');
writeFileSync(join(OUT,'CREDITS.md'),lines.join('\n'));
console.log('Importados: '+count+'/10');
