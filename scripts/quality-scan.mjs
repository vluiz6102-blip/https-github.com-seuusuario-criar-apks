import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const fail = [];
const warn = [];
const add = (list, msg) => list.push(msg);
const read = p => { if (!existsSync(p)) { add(fail, 'Arquivo ausente: ' + p); return ''; } return readFileSync(p, 'utf8'); };
const index = read('index.html');

function checkSyntax(label, source) {
  try { new Function(source); }
  catch (e) { add(fail, label + ': ' + e.message); }
}

const inlineScripts = [...index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n');
if (!/function\s+startCareer\s*\(/.test(index)) add(fail, 'Fluxo crítico de início de carreira sem startCareer().');
if (!/id=["']startConfirm["']/.test(index)) add(fail, 'Controle crítico startConfirm ausente da tela de criação.');
if (/function\s+start\s*\(/.test(index)) add(fail, 'Função global start() detectada. Evitar colisão com APIs de áudio/browser.');

checkSyntax('JavaScript inline', inlineScripts);
const soundscape = read('src/j90-soundscape.js');
checkSyntax('Soundscape', soundscape.replace('__J90_AUDIO_MANIFEST__', '{}'));
const expansion = read('src/j90-expansion.js');
checkSyntax('Jornada 90 Plus', expansion);

const fnNames = [...inlineScripts.matchAll(/(?:^|[;}]\s*)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]);
const seen = new Set();
for (const n of fnNames) { if (seen.has(n)) add(fail, 'Função duplicada: ' + n); seen.add(n); }

const onclicks = [...index.matchAll(/onclick\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
const calls = new Set();
for (const code of onclicks) {
  for (const m of code.matchAll(/(^|[^.A-Za-z0-9_$])([A-Za-z_$][\w$]*)\s*\(/g)) calls.add(m[2]);
}
const globals = new Set(['alert','confirm','prompt','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame','parseInt','parseFloat','Number','String','Boolean','Math','Date','JSON','Object','Array','console','window','document','navigator','localStorage','location','performance','fetch','URL','Audio','setProperty']);
for (const name of calls) if (!globals.has(name) && !fnNames.includes(name) && !inlineScripts.includes('window.' + name)) add(fail, 'onclick chama função ausente: ' + name);

const ids = [...index.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
const idCounts = new Map();
for (const id of ids) idCounts.set(id, (idCounts.get(id) || 0) + 1);
for (const [id,n] of idCounts) if (n > 1) add(fail, 'ID HTML duplicado: ' + id + ' (' + n + 'x)');

if ((index.match(/requestAnimationFrame\s*\(/g) || []).length > 6) add(warn, 'Mais de 6 referências a requestAnimationFrame detectadas. Revisar loops antes de adicionar novas animações.');
const intervalCount=(index.match(/setInterval\s*\(/g)||[]).length;
if(intervalCount>0)add(fail,'setInterval detectado ('+intervalCount+'). O runtime Jornada 90 usa um único loop visual compartilhado.');
if (/\bgetImageData\s*\(|\breadPixels\s*\(/.test(index)) add(warn, 'Leitura de pixels detectada, revisar custo de CPU/GPU.');
if (/\binnerHTML\s*=\s*[^;]*(?:setInterval|requestAnimationFrame)/.test(index)) add(warn, 'Possível reconstrução de DOM dentro de loop/timer.');
if (/j90Music(Start|Stop|Track|Notes|Timer|Nodes)/.test(index)) add(fail, 'Motor de música legado detectado no index.html.');

const refs = [];
for (const m of index.matchAll(/(?:src|href)\s*=\s*["']([^"'#?]+)["']/gi)) {
  const p = m[1];
  if (/^(https?:|data:|javascript:|mailto:|tel:|#)/i.test(p)) continue;
  refs.push(p.replace(/^\.\//, ''));
}
for (const p of refs) if (!existsSync(p) && !existsSync(join('www', p))) add(warn, 'Referência de asset não encontrada no repositório: ' + p);

const audioExpected = [
  'assets/audio/wind/wind-soft-01.ogg','assets/audio/trees/leaves-soft-01.ogg','assets/audio/neighborhood/neighborhood-bed-01.ogg',
  'assets/audio/birdsBed/birds-distant-01.ogg','assets/audio/birdEvents/bird-call-01.ogg','assets/audio/dog/dog-distant-01.ogg',
  'assets/audio/car/car-pass-01.ogg','assets/audio/rain/light-rain-bed-01.ogg','assets/audio/rain/heavy-rain-bed-01.ogg','assets/audio/crowd/crowd-distant-01.ogg'
];
for (const p of audioExpected) if (!existsSync(p) || statSync(p).size === 0) add(fail, 'Áudio obrigatório ausente/vazio: ' + p);

if (existsSync('assets/j90-content/content-manifest.json')) {
  try {
    const content = JSON.parse(readFileSync('assets/j90-content/content-manifest.json','utf8'));
    const sceneCount = Number(content?.sceneCount)||0;
    const generatedBytes = Number(content?.generatedBytes)||0;
    if (sceneCount < 1) add(fail, 'Pacote de conteúdo sem cenas.');
    if (generatedBytes < 1000 * 1024 * 1024) add(fail, 'Pacote de conteúdo abaixo de 1000 MiB.');
    console.log('Pacote de conteúdo: ' + sceneCount + ' cenas / ' + Math.round(generatedBytes / 1048576) + ' MiB');
  } catch (e) { add(fail, 'content-manifest.json inválido: ' + e.message); }
}

if (existsSync('data/rosters.json')) {
  try {
    const rosters = JSON.parse(readFileSync('data/rosters.json','utf8'));
    let teams = 0, players = 0;
    for (const [team, data] of Object.entries(rosters)) {
      teams++;
      if (!Array.isArray(data?.players)) add(fail, 'Elenco inválido: ' + team);
      else players += data.players.length;
    }
    if (!teams || !players) add(fail, 'data/rosters.json sem elencos/jogadores.');
    console.log('Elencos: ' + teams + ' times / ' + players + ' jogadores');
  } catch (e) { add(fail, 'data/rosters.json inválido: ' + e.message); }
}

const htmlBytes = Buffer.byteLength(index, 'utf8');
console.log('Varredura Jornada 90:');
console.log('HTML: ' + htmlBytes + ' bytes | funções: ' + fnNames.length + ' | onclicks: ' + onclicks.length + ' | IDs: ' + ids.length);
if (warn.length) { console.warn('Avisos:'); warn.forEach(x => console.warn('  - ' + x)); }
if (fail.length) { console.error('Falhas:'); fail.forEach(x => console.error('  - ' + x)); process.exitCode = 1; }
else console.log('OK: nenhum erro estrutural encontrado.');

// Scanner compatibility hardened for DOM object-method handlers.
