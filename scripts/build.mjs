import { mkdirSync, copyFileSync, readFileSync, existsSync, cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync('index.html', 'utf8');
const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]).join('\n');
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
const webglSource = readFileSync('src/j90-match2d-webgl.js', 'utf8');
const comfortSource = readFileSync('src/j90-comfort-ui.js', 'utf8');
const matchEventsSource = readFileSync('src/j90-match-events.js', 'utf8');
const lineupAiSource = readFileSync('src/j90-lineup-ai.js', 'utf8');
const replaySource = readFileSync('src/j90-match-replay.js', 'utf8');
const teamTacticalAiSource = readFileSync('src/j90-team-tactical-ai.js', 'utf8');
const managerStatsSource = readFileSync('src/j90-manager-stats.js', 'utf8');
const copaBrasilSource = readFileSync('src/j90-copa-do-brasil.js', 'utf8');
const contentRoot = 'assets/j90-content';
const contentManifestPath = join(contentRoot, 'content-manifest.json');
if (!existsSync(contentManifestPath)) throw new Error('Pacote de conteúdo ausente. Execute npm run content:build antes da build.');
let contentManifest;
try { contentManifest = JSON.parse(readFileSync(contentManifestPath, 'utf8')); } catch (error) { throw new Error('content-manifest.json inválido: ' + error.message); }

const soundscape = soundscapeSource.replace('__J90_AUDIO_MANIFEST__', JSON.stringify(manifest));
try {
  new Function(scripts + '\n' + soundscape + '\n' + expansionSource + '\n' + aiSource + '\n' + tacticsSource + '\n' + match2dSource + '\n' + webglSource + '\n' + comfortSource + '\n' + matchEventsSource + '\n' + squadCardsSource + '\n' + lineupAiSource + '\n' + replaySource + '\n' + teamTacticalAiSource + '\n' + managerStatsSource + '\n' + copaBrasilSource);
} catch (error) { throw new Error('JavaScript syntax validation failed: ' + error.message); }

mkdirSync('www', { recursive: true });
copyFileSync('index.html', 'www/index.html');
writeFileSync('www/j90-soundscape.js', soundscape);
writeFileSync('www/j90-expansion.js', expansionSource);
writeFileSync('www/j90-ai2.js', aiSource);
writeFileSync('www/j90-tactics.js', tacticsSource);
writeFileSync('www/j90-match2d-v3.js', match2dSource);
writeFileSync('www/j90-match2d-webgl.js', webglSource);
writeFileSync('www/j90-comfort-ui.js', comfortSource);
writeFileSync('www/j90-match-events.js', matchEventsSource);
writeFileSync('www/j90-squad-cards.js', squadCardsSource);
writeFileSync('www/j90-lineup-ai.js', lineupAiSource);
writeFileSync('www/j90-match-replay.js', replaySource);
writeFileSync('www/j90-team-tactical-ai.js', teamTacticalAiSource);
writeFileSync('www/j90-manager-stats.js', managerStatsSource);

if (existsSync(contentRoot)) {
  mkdirSync('www/assets', { recursive: true });
  cpSync(contentRoot, 'www/assets/j90-content', { recursive: true });
}

const generated = readFileSync('www/index.html', 'utf8');
const injection = '<script>window.J90_AUDIO_MANIFEST=' + JSON.stringify(manifest) + ';window.J90_ROSTERS=' + JSON.stringify(rosters) + ';window.J90_CONTENT=' + JSON.stringify(contentManifest) + ';</script><script src="j90-soundscape.js"></script><script src="j90-expansion.js"></script><script src="j90-ai2.js"></script><script src="j90-tactics.js"></script><script src="j90-match2d-v3.js"></script><script src="j90-match2d-webgl.js"></script><script src="j90-comfort-ui.js"></script><script src="j90-lineup-ai.js"></script><script src="j90-team-tactical-ai.js"></script><script src="j90-match-replay.js"></script><script src="j90-squad-cards.js"></script><script src="j90-match-events.js"></script><script src="j90-manager-stats.js"></script><script src="j90-copa-do-brasil.js"></script>';
if (!generated.includes('src="j90-soundscape.js"')) {
  const patched = generated.replace('</body>', injection + '</body>');
  if (patched === generated) throw new Error('Could not inject the asset-based soundscape runtime.');
  writeFileSync('www/index.html', patched);
}

const rosterTeams=Object.keys(rosters||{}).length;
const rosterPlayers=Object.values(rosters||{}).reduce((n,t)=>n+(Array.isArray(t?.players)?t.players.length:0),0);
console.log('Jornada 90 web build OK: soundscape + expansão + IA 2.0 + Match 2D + WebGL1 + Comfort UI + Squad Cards + Match Events + Manager Stats + regras CBF Copa do Brasil injetados, ' + rosterTeams + ' elencos / ' + rosterPlayers + ' jogadores, ' + (contentManifest.sceneCount || 0) + ' cenas / ' + Math.round((contentManifest.generatedBytes || 0) / 1024 / 1024) + ' MiB de conteúdo.');
