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
if (/Crie seu jogador/i.test(index)) add(fail, 'Texto legado de criação de jogador ainda presente na interface Manager.');
const homeSection = (() => { const a=index.indexOf('function menuV()'); const b=index.indexOf('function howToView()', a); return a>=0 ? index.slice(a, b>0?b:a+12000) : ''; })();
if (/POSN\[S\.pos\]/.test(homeSection)) add(fail, 'Tela inicial ainda apresenta posição de jogador em vez de identidade de Manager.');
if (/Crie seu jogador/i.test(homeSection)) add(fail, 'Tela inicial ainda usa linguagem de criação de jogador.');
if (!/PRODUZIDO POR VICTOR/i.test(index)) add(fail, 'Assinatura PRODUZIDO POR VICTOR ausente da tela inicial.');
if (!/Créditos &amp; tecnologia/i.test(index) || !/Tecnologias usadas/i.test(index)) add(fail, 'Área de créditos tecnológicos incompleta.');
if (!/Capacitor.*Web Audio.*Android/i.test(index)) add(warn, 'Tecnologias principais não estão descritas juntas nos créditos.');


checkSyntax('JavaScript inline', inlineScripts);
const soundscape = read('src/j90-soundscape.js');
checkSyntax('Soundscape', soundscape.replace('__J90_AUDIO_MANIFEST__', '{}'));
const webgl = read('src/j90-match2d-webgl.js');
checkSyntax('Match 2D WebGL', webgl);
const comfort = read('src/j90-comfort-ui.js');
checkSyntax('Comfort UI', comfort);
if (!/getContext\(['\"]webgl['\"]/.test(webgl)) add(fail, 'Renderer WebGL1 ausente.');
if (!/webglcontextlost/.test(webgl) || !/webglcontextrestored/.test(webgl)) add(fail, 'Renderer WebGL sem recuperação de contexto.');
const expansion = read('src/j90-expansion.js');
checkSyntax('Jornada 90 Plus', expansion);
const ai2 = read('src/j90-ai2.js');
checkSyntax('Jornada 90 AI 2.0', ai2);
if (!/window\.J90AI2/.test(ai2)) add(fail, 'Jornada 90 AI 2.0 não exporta window.J90AI2.');
if (/setInterval\s*\(/.test(ai2)) add(fail, 'AI 2.0 usa setInterval. Manter a simulação no RAF compartilhado.');

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

if ((index.match(/requestAnimationFrame\s*\(/g) || []).length > 5) add(warn, 'Muitas referências a requestAnimationFrame. Manter um único loop visual compartilhado por cena.');
if (/startJ90MatchLoop\s*=|function\s+startJ90MatchLoop|\bj90MatchFrame\b/.test(index)) add(fail, 'Loop de partida legado/duplicado detectado. A partida deve usar somente o RAF compartilhado.');
const buildScript=read('scripts/build.mjs');
if (!/j90-ai2\.js/.test(buildScript)) add(fail, 'scripts/build.mjs não empacota j90-ai2.js.');
if (!/j90-match2d-webgl\.js/.test(buildScript)) add(fail, 'scripts/build.mjs não empacota renderer WebGL.');
if (!/j90-comfort-ui\.js/.test(buildScript)) add(fail, 'scripts/build.mjs não empacota Comfort UI.');
const tacticsSourceForScan = read('src/j90-tactics.js');
checkSyntax('Tactical Studio', tacticsSourceForScan);
if (!/window\.J90TACT\s*=/.test(tacticsSourceForScan)) add(fail, 'Tactical Studio não exporta window.J90TACT.');
if (!/function\s+view\s*\(/.test(tacticsSourceForScan)||!/function\s+drag\s*\(/.test(tacticsSourceForScan)) add(fail, 'Prancheta tática drag-and-drop incompleta.');
if (!/var\s+P\s*=/.test(tacticsSourceForScan)||!/MGR_FORMATIONS/.test(tacticsSourceForScan)) add(fail, 'Biblioteca de estilos/formações táticas incompleta.');
if (!/j90TacticalBoard|j90TB/.test(tacticsSourceForScan)) add(fail, 'Prancheta tática não encontrada no Tactical Studio.');
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

if (!/J90_AUDIO_MODE=['\"]remote-cc0['\"]/.test(soundscape)) add(fail, 'Soundscape não está no modo remoto CC0.');
const trackStart=soundscape.indexOf('const tracks=[');
const trackEnd=soundscape.indexOf('].map((t,i)',trackStart);
const trackBlock=trackStart>=0&&trackEnd>trackStart?soundscape.slice(trackStart,trackEnd):'';
const cc0Tracks=(trackBlock.match(/^\s*\[/gm)||[]).length;
if (cc0Tracks < 20) add(fail, 'Playlist CC0 abaixo de 20 faixas: '+cc0Tracks);
if (!/crowd_shouting\.ogg/.test(soundscape) || !/cheers\.ogg/.test(soundscape)) add(fail, 'Sons CC0 de torcida/evento ausentes.');
if (/decodeAudioData/.test(soundscape)) add(fail, 'decodeAudioData inesperado no Soundscape.');


if (existsSync('assets/j90-content/technology/animation-manifest.json')) {
  try {
    const am=JSON.parse(readFileSync('assets/j90-content/technology/animation-manifest.json','utf8'));
    if(Number(am?.frameRate||0)<60) add(fail,'Pacote de animação abaixo de 60 fps.');
    if(Number(am?.framesPerAtlas||0)<32) add(fail,'Atlas de animação abaixo de 32 frames.');
  } catch(e) { add(fail,'animation-manifest.json inválido: '+e.message); }
}

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
