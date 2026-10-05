import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const OUT='assets/audio', BUNDLE='www/assets/audio', META='audio-import/metadata.json', FFPROBE=process.env.FFPROBE||'ffprobe';
const map={
'01-wind':['wind','wind-soft-01.ogg'],'02-leaves':['trees','leaves-soft-01.ogg'],'03-neighborhood':['neighborhood','neighborhood-bed-01.ogg'],'04-birds-bed':['birdsBed','birds-distant-01.ogg'],'05-bird-call':['birdEvents','bird-call-01.ogg'],'06-dog':['dog','dog-distant-01.ogg'],'07-car':['car','car-pass-01.ogg'],'08-light-rain':['rain','light-rain-bed-01.ogg'],'09-heavy-rain':['rain','heavy-rain-bed-01.ogg'],'10-crowd':['crowd','crowd-distant-01.ogg']};
const keys=Object.keys(map), errors=[];
const ff=spawnSync(FFPROBE,['-version'],{stdio:'ignore'});const hasProbe=!ff.error&&ff.status===0;
const probe=f=>{if(!hasProbe)return null;const r=spawnSync(FFPROBE,['-v','error','-select_streams','a:0','-show_entries','stream=codec_type,duration,channels,sample_rate','-of','json',f],{encoding:'utf8'});if(r.status!==0)return null;try{const s=JSON.parse(r.stdout).streams?.[0];return s&&s.codec_type==='audio'&&Number(s.duration)>0?{duration:Number(s.duration),channels:s.channels,sampleRate:Number(s.sample_rate)}:null;}catch{return null;}};
const metadata=existsSync(META)?JSON.parse(readFileSync(META,'utf8')):{};
const licenses=existsSync(join(OUT,'LICENSES.json'))?JSON.parse(readFileSync(join(OUT,'LICENSES.json'),'utf8')):{};
const rows=[];
for(const k of keys){const [folder,name]=map[k],p=join(OUT,folder,name),b=join(BUNDLE,folder,name),m=metadata[k];let status='AUSENTE',why='';
 if(!m?.originalName||!m?.author||!m?.sourceUrl||!m?.license)why='metadata incompleta';
 else if(['unknown','desconhecida'].includes(String(m.license).toLowerCase()))why='licença desconhecida';
 else if(!existsSync(p)||statSync(p).size===0)why='arquivo ausente/vazio';
 else{const q=probe(p);if(!q)why=hasProbe?'áudio não decodificável':'FFprobe indisponível';else if(!licenses[k])why='licença não registrada';else if(!existsSync(b)||statSync(b).size===0)why='ausente no bundle';else status='PRONTO';}
 rows.push({arquivo:k,status,duracao:status==='PRONTO'?probe(p).duration.toFixed(1)+'s':'-',tamanho:existsSync(p)?statSync(p).size:'-',licenca:m?.license||'-',destino:p,bundle:existsSync(b)?'SIM':'NÃO',observacao:why});}
console.table(rows);
const ready=rows.filter(x=>x.status==='PRONTO').length;console.log('Prontos: '+ready+'/10');
if(!hasProbe)errors.push('FFprobe não disponível, não é possível confirmar decodificação.');
if(ready!==10)errors.push('Existem arquivos ausentes, inválidos, sem licença ou fora do bundle.');
if(errors.length){for(const e of errors)console.error('ERRO: '+e);process.exitCode=1;}
