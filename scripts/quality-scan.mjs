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
const match2d = read('src/j90-match2d-v3.js');
checkSyntax('Match 2D Canvas', match2d);
const comfort = read('src/j90-comfort-ui.js');
checkSyntax('Comfort UI', comfort);
if (!/getContext\(['\"]2d['\"]/.test(match2d)) add(fail, 'Renderer Canvas 2D ausente.');
if (!/fieldCache\(/.test(match2d)) add(fail, 'Canvas 2D sem pré-renderização do campo.');
const expansion = read('src/j90-expansion.js');
checkSyntax('Jornada 90 Plus', expansion);
const matchEvents = read('src/j90-match-events.js');
checkSyntax('Match Events', matchEvents);
if (/createElement\(['"]canvas['"]\)/.test(matchEvents) && /j90EventOverlayCanvas/.test(matchEvents)) add(fail, 'Match Events voltou a criar um Canvas de overlay separado; use o Canvas principal.');
if (!/getElementById\(['"]j90MatchCanvas['"]\)/.test(matchEvents) || !/function\s+renderOverlay\s*\(/.test(matchEvents)) add(fail, 'Match Events não renderiza overlays no Canvas principal.');
const ai2 = read('src/j90-ai2.js');
const managerAi = read('src/j90-manager-ai.js');
checkSyntax('Manager AI 2.0', managerAi);
if (!/window\.J90ManagerAI/.test(managerAi) || !/transferAI/.test(managerAi) || !/developmentPlan/.test(managerAi) || !/opponentAnalysis/.test(managerAi)) add(fail, 'Manager AI 2.0 incompleta.');
if (!/j90EliteProfile/.test(managerAi) || !/j90Radar/.test(managerAi) || !/j90MiniPitch/.test(managerAi) || !/input\[type\s*=\s*["']?range["']?\]/.test(managerAi)) add(fail, 'UI premium de elenco/negociação incompleta.');

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
const externalRuntimeBindings = new Set(['j90MatchCameraCycle']);
for (const name of calls) if (!globals.has(name) && !externalRuntimeBindings.has(name) && !fnNames.includes(name) && !inlineScripts.includes('window.' + name)) add(fail, 'onclick chama função ausente: ' + name);

const ids = [...index.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
const idCounts = new Map();
for (const id of ids) idCounts.set(id, (idCounts.get(id) || 0) + 1);
for (const [id,n] of idCounts) if (n > 1) add(fail, 'ID HTML duplicado: ' + id + ' (' + n + 'x)');

if ((index.match(/requestAnimationFrame\s*\(/g) || []).length > 5) add(warn, 'Muitas referências a requestAnimationFrame. Manter um único loop visual compartilhado por cena.');
if (/startJ90MatchLoop\s*=|function\s+startJ90MatchLoop|\bj90MatchFrame\b/.test(index)) add(fail, 'Loop de partida legado/duplicado detectado. A partida deve usar somente o RAF compartilhado.');
const buildScript=read('scripts/build.mjs');
if (!/j90-ai2\.js/.test(buildScript)) add(fail, 'scripts/build.mjs não empacota j90-ai2.js.');
if (!/j90-match2d-v3\.js/.test(buildScript)) add(fail, 'scripts/build.mjs não empacota renderer Canvas 2D.');
if (/j90-match2d-webgl\.js/.test(buildScript)) add(fail, 'Renderer WebGL legado ainda está no pipeline.');
if (!/j90-comfort-ui\.js/.test(buildScript)) add(fail, 'scripts/build.mjs não empacota Comfort UI.');
if (!/j90-manager-ai\.js/.test(buildScript)) add(fail, 'scripts/build.mjs não empacota Manager AI 2.0.');
const workflow = read('.github/workflows/build-apk.yml');
if (/j90-landscape|screen\.orientation|orientation:landscape/i.test(index + '\\n' + buildScript + '\\n' + workflow)) add(fail, 'Modo paisagem ainda está presente no runtime/pipeline.');
if (!/android:screenOrientation="portrait"/.test(workflow)) add(fail, 'Android não está fixado em orientação retrato.');
if (!/android:configChanges="orientation\\|screenSize\\|keyboardHidden\\|smallestScreenSize\\|screenLayout"|configChanges.*orientation.*screenSize/.test(workflow)) add(fail, 'Android pode recriar Activity durante mudanças de configuração.');
if (existsSync('src/j90-landscape.js')) add(fail, 'Arquivo legado de paisagem ainda existe no projeto.');
if (!/getContext\(['"]2d['"]/.test(match2d) || !/ResizeObserver/.test(match2d) || !/_j90AutoLow/.test(match2d)) add(fail, 'Renderer 2D sem fallback/otimização adaptativa suficiente para dispositivos com menor capacidade.');
if (/\bvar\s+desired=cl\(/.test(match2d)) add(fail, 'Renderer 2D contém a chamada cl() indefinida na câmera.');
if (!/function\s+percentile95\s*\(/.test(match2d) || !/_j90FrameP95/.test(match2d) || !/_j90Dpr/.test(match2d) || !/Math\.min\(1\.5/.test(match2d)) add(fail, 'Renderer 2D sem gate de P95/DPR adaptativo do Android.');
const lifecycle = read('src/j90-match-lifecycle.js');
checkSyntax('Match Lifecycle Guard', lifecycle);
if (!/J90_CAFE90_URL=['"]https:\/\/www\.buymeacoffee\.com\/['"]/.test(index) || !/function\s+j90OpenCafe90\s*\(/.test(index)) add(fail, 'Entrada do Café 90 ausente ou URL insegura.');
if (/J90_CAFE90_URL=['"]http:/.test(index) || !/buymeacoffee\.com/.test(index)) add(fail, 'Café 90 não está preso ao domínio oficial HTTPS.');
const externalBrowser = read('android-overrides/J90ExternalBrowserPlugin.java');
const mainActivity = read('android-overrides/MainActivity.java');
if (!/J90ExternalBrowser/.test(externalBrowser) || !/https/.test(externalBrowser) || !/buymeacoffee\.com/.test(externalBrowser)) add(fail, 'Plugin nativo de navegador seguro do Café 90 incompleto.');
if (!/registerPlugin\(J90ExternalBrowserPlugin\.class\)/.test(mainActivity)) add(fail, 'MainActivity não registra o navegador seguro do Café 90.');
if (!/J90MatchLifecycle/.test(lifecycle) || !/pauseForBackground/.test(lifecycle) || !/ensureRecoveredMatch/.test(lifecycle)) add(fail, 'Proteção de ciclo de vida da partida incompleta.');
if (!/syncCanvasBudget/.test(lifecycle)) add(fail, 'Orçamento de Canvas do modo partida ausente.');
if (!/JSON\.stringify\(S,j90SaveReplacer\)/.test(index)) add(fail, 'Salvamento principal não usa serialização segura para runtime da partida.');
if (!/Object\.defineProperty\(window,'S'/.test(index)) add(fail, 'Bridge global do estado S ausente para runtimes externos.');



// Full source syntax gate: catch regressions in any first-party JavaScript before packaging.
const sourceFilesForScan = readdirSync('src', { withFileTypes: true }).filter(e => e.isFile() && /\\.(?:js|mjs)$/i.test(e.name)).map(e => join('src', e.name));
for (const file of sourceFilesForScan) {
  const source = read(file);
  checkSyntax('Source ' + file, source);
}
const indexSourceForScan = read('index.html');
if (!/function menuV\(\)[\s\S]*j90ManagerHome[\s\S]*CRIADO POR[\s\S]*VICTOR LUIZ/.test(indexSourceForScan)) add(fail, 'Tela inicial J90 v2 sem assinatura Criado por Victor Luiz.');
if (!/j90MHClub[\s\S]*j90MHGrid[\s\S]*j90MHNews/.test(indexSourceForScan)) add(fail, 'Tela inicial J90 v2 sem painel de clube, atalhos e agenda.');
const match2dSourceForScan = read('src/j90-match2d-v3.js');
checkSyntax('Match 2D broadcast camera', match2dSourceForScan);
if (!/function cameraState\(m\)[\s\S]*_cameraY[\s\S]*_cameraZoom/.test(match2dSourceForScan)) add(fail, 'Câmera broadcast não possui follow de profundidade e zoom dinâmico.');
if (!/function worldPoint\(x,y,cameraX,cameraY,mode,zoom\)/.test(match2dSourceForScan)) add(fail, 'Projeção da câmera broadcast não recebe Y/zoom.');
const fusionSourceForScan = read('src/j90-fusion.js');
checkSyntax('Fusion Match Center', fusionSourceForScan);
if (!/window\.J90Fusion\s*=/.test(fusionSourceForScan)) add(fail, 'Fusion Match Center não exporta window.J90Fusion.');
if (!/j90FusionDock/.test(fusionSourceForScan) || !/data-j90f=/.test(fusionSourceForScan)) add(fail, 'Fusion Match Center sem dock/controles.');
if (!/data-j90f-opp/.test(fusionSourceForScan) || !/data-j90f-scout/.test(fusionSourceForScan)) add(fail, 'Leitura de adversário ausente no Fusion Match Center.');
if (!/J90TACT\.apply/.test(fusionSourceForScan)) add(fail, 'Fusion Match Center não integra o Tactical Studio existente.');
if (/requestAnimationFrame|setInterval/.test(fusionSourceForScan)) add(fail, 'Fusion Match Center criou loop visual próprio; deve reutilizar o loop da partida.');

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
const cc0Tracks=(trackBlock.match(/\[[^\]]+\]/g)||[]).length;
if (cc0Tracks < 20) add(fail, 'Playlist CC0 abaixo de 20 faixas: '+cc0Tracks);
if (!/crowd_shouting\.ogg/.test(soundscape) || !/cheers\.ogg/.test(soundscape)) add(fail, 'Sons CC0 de torcida/evento ausentes.');
if (/externalMusic|amazonMusic|spotify|appleMusic/i.test(soundscape)) add(fail, 'Integração externa Spotify/Apple/Amazon ainda presente.');
if (/j90ComfortButton|textContent='Aa'/.test(comfort)) add(fail, 'Botão Aa do Comfort UI ainda presente.');
if (!/j90MatchOnlyPage/.test(index) || !/j90MatchOpenPanel/.test(index) || !/j90MatchInstruction/.test(index)) add(fail, 'Fluxo fullscreen de gestão ao vivo incompleto.');
if (!/function\s+mgrPosShort\s*\(/.test(index)) add(fail, 'Abreviações de posição do Manager ausentes.');
if (/decodeAudioData/.test(soundscape)) add(fail, 'decodeAudioData inesperado no Soundscape.');
if (!/fitText\(/.test(read('src/j90-squad-cards.js')) || !/\.clip\(\)/.test(read('src/j90-squad-cards.js'))) add(fail, 'Cards sem proteção contra texto saindo da carta.');
if (!/var\(--j90-ui-scale\)/.test(read('src/j90-comfort-ui.js'))) add(fail, 'Comfort UI sem escala tipográfica.');
if (!/J90MatchEvents/.test(read('src/j90-match-events.js')) || !/offsideCheck/.test(read('src/j90-match-events.js')) || !/discipline/.test(read('src/j90-match-events.js')) || !/injuryCheck/.test(read('src/j90-match-events.js')) || !/pitchInvader/.test(read('src/j90-match-events.js'))) add(fail, 'Sistema de eventos de partida incompleto.');
if (!/j90-match-events\.js/.test(read('scripts/build.mjs'))) add(fail, 'Eventos de partida não estão no pipeline de build.');
if (!/j90-match-lifecycle\.js/.test(read('scripts/build.mjs'))) add(fail, 'Match Lifecycle Guard não está no pipeline de build.');
if (/j90-landscape\.js/.test(read('scripts/build.mjs'))) add(fail, 'Runtime de paisagem ainda está no pipeline de build.');
if (!/j90-manager-ai\.js/.test(buildScript)) add(fail, 'Manager AI 2.0 não está no pipeline de build.');
if (!/j90-fusion\.js/.test(buildScript)) add(fail, 'Fusion Match Center não está no pipeline de build.');


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
    if (generatedBytes < 64 * 1024 * 1024) add(fail, 'Pacote de conteúdo abaixo de 64 MiB.');
    if (generatedBytes > 180 * 1024 * 1024) add(fail, 'Pacote de conteúdo excede 180 MiB e pode comprometer a distribuição mobile.');
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
