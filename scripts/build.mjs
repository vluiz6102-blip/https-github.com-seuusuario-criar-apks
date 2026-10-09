import { mkdirSync, copyFileSync, readFileSync, existsSync, cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync('index.html', 'utf8');
const inlineScripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
const scripts = inlineScripts.map(match => match[1]).join('\n');
if (!scripts.includes('menuTime') || !scripts.includes('j90SoundscapeStart')) throw new Error('Canonical index.html is missing the Jornada 90 environment core.');
if (/j90Music(Start|Stop|Track|Notes|Timer|Nodes)/.test(scripts)) throw new Error('Obsolete menu music engine detected in canonical index.html.');

const rosterPath = 'data/rosters.json';
if (!existsSync(rosterPath)) throw new Error('data/rosters.json ausente. Execute npm run data:rosters antes da build.');
let rosters;
try { rosters = JSON.parse(readFileSync(rosterPath, 'utf8')); } catch (error) { throw new Error('data/rosters.json inválido: ' + error.message); }
const manifest = {};

const soundscapeSource = readFileSync('src/j90-soundscape.js', 'utf8');
const expansionSource = readFileSync('src/j90-expansion.js', 'utf8');
const aiSource = readFileSync('src/j90-ai2.js', 'utf8');
const tacticsSource = readFileSync('src/j90-tactics.js', 'utf8');
const match2dSource = readFileSync('src/j90-match2d-v3.js', 'utf8');
const squadCardsSource = readFileSync('src/j90-squad-cards.js', 'utf8');
const comfortSource = readFileSync('src/j90-comfort-ui.js', 'utf8');
const matchEventsSource = readFileSync('src/j90-match-events.js', 'utf8');
const lineupAiSource = readFileSync('src/j90-lineup-ai.js', 'utf8');
const replaySource = readFileSync('src/j90-match-replay.js', 'utf8');
const teamTacticalAiSource = readFileSync('src/j90-team-tactical-ai.js', 'utf8');
const managerStatsSource = readFileSync('src/j90-manager-stats.js', 'utf8');
const copaBrasilSource = readFileSync('src/j90-copa-do-brasil.js', 'utf8');
const managerAiSource = readFileSync('src/j90-manager-ai.js', 'utf8');
const lifecycleSource = readFileSync('src/j90-match-lifecycle.js', 'utf8');
const autoHealSource = readFileSync('src/j90-auto-heal.js', 'utf8');
const perfSource = readFileSync('src/j90-perf.js', 'utf8');
const fusionSource = readFileSync('src/j90-fusion.js', 'utf8');
const contentRoot = 'assets/j90-content';
const contentManifestPath = join(contentRoot, 'content-manifest.json');
if (!existsSync(contentManifestPath)) throw new Error('Pacote de conteúdo ausente. Execute npm run content:build antes da build.');
let contentManifest;
try { contentManifest = JSON.parse(readFileSync(contentManifestPath, 'utf8')); } catch (error) { throw new Error('content-manifest.json inválido: ' + error.message); }

const soundscape = soundscapeSource.replace('__J90_AUDIO_MANIFEST__', JSON.stringify(manifest));
const syntaxUnits = [
  ...inlineScripts.map((match, index) => ['index-inline-script-' + (index + 1), match[1]]),
  ['j90-soundscape.js', soundscape],
  ['j90-expansion.js', expansionSource],
  ['j90-ai2.js', aiSource],
  ['j90-tactics.js', tacticsSource],
  ['j90-match2d-v3.js', match2dSource],
  ['j90-comfort-ui.js', comfortSource],
  ['j90-match-events.js', matchEventsSource],
  ['j90-squad-cards.js', squadCardsSource],
  ['j90-lineup-ai.js', lineupAiSource],
  ['j90-match-replay.js', replaySource],
  ['j90-team-tactical-ai.js', teamTacticalAiSource],
  ['j90-manager-stats.js', managerStatsSource],
  ['j90-copa-do-brasil.js', copaBrasilSource],
  ['j90-manager-ai.js', managerAiSource],
  ['j90-match-lifecycle.js', lifecycleSource],
  ['j90-auto-heal.js', autoHealSource],
  ['j90-perf.js', perfSource],
  ['j90-fusion.js', fusionSource]
];
try {
  for (const [name, code] of syntaxUnits) {
    try { new Function(code); }
    catch (error) { throw new Error(name + ': ' + error.message); }
  }
  // Each script tag and runtime file is parsed exactly as the browser loads it.
  // Concatenating classic scripts can create false syntax errors at async function boundaries.
} catch (error) { throw new Error('JavaScript syntax validation failed: ' + error.message); }

mkdirSync('www', { recursive: true });
copyFileSync('index.html', 'www/index.html');
if (existsSync('diag.html')) copyFileSync('diag.html', 'www/diag.html');
writeFileSync('www/j90-soundscape.js', soundscape);
writeFileSync('www/j90-expansion.js', expansionSource);
writeFileSync('www/j90-ai2.js', aiSource);
writeFileSync('www/j90-tactics.js', tacticsSource);
writeFileSync('www/j90-match2d-v3.js', match2dSource);
writeFileSync('www/j90-comfort-ui.js', comfortSource);
writeFileSync('www/j90-match-events.js', matchEventsSource);
writeFileSync('www/j90-squad-cards.js', squadCardsSource);
writeFileSync('www/j90-lineup-ai.js', lineupAiSource);
writeFileSync('www/j90-match-replay.js', replaySource);
writeFileSync('www/j90-team-tactical-ai.js', teamTacticalAiSource);
writeFileSync('www/j90-manager-stats.js', managerStatsSource);
writeFileSync('www/j90-copa-do-brasil.js', copaBrasilSource);
writeFileSync('www/j90-manager-ai.js', managerAiSource);
writeFileSync('www/j90-match-lifecycle.js', lifecycleSource);
writeFileSync('www/j90-auto-heal.js', autoHealSource);
writeFileSync('www/j90-perf.js', perfSource);
writeFileSync('www/j90-fusion.js', fusionSource);

if (existsSync(contentRoot)) {
  mkdirSync('www/assets', { recursive: true });
  cpSync(contentRoot, 'www/assets/j90-content', { recursive: true });
}

const generated = readFileSync('www/index.html', 'utf8');
const runtimeFiles = [
  'j90-soundscape.js','j90-expansion.js','j90-ai2.js','j90-tactics.js','j90-match2d-v3.js','j90-comfort-ui.js',
  'j90-lineup-ai.js','j90-team-tactical-ai.js','j90-match-replay.js','j90-squad-cards.js','j90-match-events.js',
  'j90-manager-stats.js','j90-copa-do-brasil.js','j90-manager-ai.js','j90-match-lifecycle.js','j90-auto-heal.js','j90-perf.js','j90-fusion.js'
];

function assertBalancedTagPair(html, name) {
  const opens = (html.match(new RegExp('<' + name + '\\b', 'gi')) || []).length;
  const closes = (html.match(new RegExp('</' + name + '>', 'gi')) || []).length;
  if (opens !== closes) throw new Error('Generated index.html has unbalanced <' + name + '> tags: ' + opens + '/' + closes);
}

function assertNoNestedStyleTags(html) {
  const token = /<style\b[^>]*>|<\/style>/gi;
  let depth = 0;
  let match;
  while ((match = token.exec(html))) {
    if (/^<style/i.test(match[0])) {
      if (depth > 0) throw new Error('Generated index.html contains nested <style> tags. Close the current style block before opening another.');
      depth++;
    } else {
      if (depth === 0) throw new Error('Generated index.html contains an unexpected </style>.');
      depth--;
    }
  }
  if (depth !== 0) throw new Error('Generated index.html has an unclosed <style> block.');
}

assertBalancedTagPair(generated, 'style');
assertBalancedTagPair(generated, 'script');
assertNoNestedStyleTags(generated);

const bootstrap = '<script>window.J90_AUDIO_MANIFEST=' + JSON.stringify(manifest) + ';window.J90_ROSTERS=' + JSON.stringify(rosters) + ';window.J90_CONTENT=' + JSON.stringify(contentManifest) + ';</script>';

// Runtime scripts are owned by the build output. Remove any existing canonical
// tags first, then inject exactly one copy immediately before </body>.
let generatedWithoutRuntime = generated;
for (const file of runtimeFiles) {
  const tag = '<script src="' + file + '"></script>';
  generatedWithoutRuntime = generatedWithoutRuntime.split(tag).join('');
}
const additions = [];
if (!generatedWithoutRuntime.includes('window.J90_AUDIO_MANIFEST=')) additions.push(bootstrap);
for (const file of runtimeFiles) additions.push('<script src="' + file + '"></script>');
if (!generatedWithoutRuntime.includes('</body>')) throw new Error('Generated index.html has no </body> boundary.');
const patched = generatedWithoutRuntime.replace('</body>', additions.join('') + '</body>');

assertBalancedTagPair(patched, 'style');
assertBalancedTagPair(patched, 'script');
assertNoNestedStyleTags(patched);

for (const file of runtimeFiles) {
  const tag = '<script src="' + file + '"></script>';
  if (!patched.includes(tag)) throw new Error('Runtime script tag missing after build: ' + file);
  if (!existsSync(join('www', file))) throw new Error('Runtime file missing from www: ' + file);
}
writeFileSync('www/index.html', patched);

const rosterTeams=Object.keys(rosters||{}).length;
const rosterPlayers=Object.values(rosters||{}).reduce((n,t)=>n+(Array.isArray(t?.players)?t.players.length:0),0);
console.log('Jornada 90 web build OK: soundscape + expansão + IA 2.0 + Match 2D Canvas + Comfort UI + Squad Cards + Match Events + Manager Stats + regras CBF Copa do Brasil + Manager AI 2.0 + Auto-Heal AI + BugGuard + recuperação de partida e modo retrato injetados, ' + rosterTeams + ' elencos / ' + rosterPlayers + ' jogadores, ' + (contentManifest.sceneCount || 0) + ' cenas / ' + Math.round((contentManifest.generatedBytes || 0) / 1024 / 1024) + ' MiB de conteúdo.');
