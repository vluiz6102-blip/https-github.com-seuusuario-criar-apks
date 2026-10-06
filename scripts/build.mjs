import { mkdirSync, copyFileSync, readFileSync, readdirSync, existsSync, cpSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';

const source = readFileSync('index.html', 'utf8');
const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .join('\n');

if (!scripts.includes('menuTime') || !scripts.includes('j90SoundscapeStart')) {
  throw new Error('Canonical index.html is missing the Jornada 90 environment core.');
}
if (/j90Music(Start|Stop|Track|Notes|Timer|Nodes)/.test(scripts)) {
  throw new Error('Obsolete menu music engine detected in canonical index.html.');
}

const audioRoot = 'assets/audio';
const rosterPath = 'data/rosters.json';
if (!existsSync(rosterPath)) throw new Error('data/rosters.json ausente. Execute npm run data:rosters antes da build.');
let rosters;
try { rosters = JSON.parse(readFileSync(rosterPath, 'utf8')); } catch (error) { throw new Error('data/rosters.json inválido: ' + error.message); }
const manifest = {};
const audioExt = new Set(['.mp3', '.ogg', '.wav', '.m4a']);

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (audioExt.has(extname(entry.name).toLowerCase())) {
      const rel = relative(audioRoot, full).replaceAll('\\\\', '/');
      const category = dirname(rel) === '.' ? 'root' : dirname(rel).replaceAll('\\\\', '/');
      (manifest[category] ||= []).push(rel);
    }
  }
}
walk(audioRoot);
Object.values(manifest).forEach(list => list.sort());

const soundscapeSource = readFileSync('src/j90-soundscape.js', 'utf8');
const expansionSource = readFileSync('src/j90-expansion.js', 'utf8');
const aiSource = readFileSync('src/j90-ai2.js', 'utf8');
const contentRoot = 'assets/j90-content';
const contentManifestPath = join(contentRoot, 'content-manifest.json');
if (!existsSync(contentManifestPath)) throw new Error('Pacote de conteúdo ausente. Execute npm run content:build antes da build.');
let contentManifest;
try { contentManifest = JSON.parse(readFileSync(contentManifestPath, 'utf8')); } catch (error) { throw new Error('content-manifest.json inválido: ' + error.message); }
const soundscape = soundscapeSource.replace(
  '__J90_AUDIO_MANIFEST__',
  JSON.stringify(manifest)
);

try {
  new Function(scripts + '\n' + soundscape + '\n' + expansionSource + '\n' + aiSource);
} catch (error) {
  throw new Error('JavaScript syntax validation failed: ' + error.message);
}

mkdirSync('www', { recursive: true });
copyFileSync('index.html', 'www/index.html');
writeFileSync('www/j90-soundscape.js', soundscape);
writeFileSync('www/j90-expansion.js', expansionSource);
writeFileSync('www/j90-ai2.js', aiSource);

if (existsSync(audioRoot)) {
  mkdirSync('www/assets', { recursive: true });
  cpSync(audioRoot, 'www/assets/audio', { recursive: true });
}
if (existsSync(contentRoot)) {
  mkdirSync('www/assets', { recursive: true });
  cpSync(contentRoot, 'www/assets/j90-content', { recursive: true });
}

const generated = readFileSync('www/index.html', 'utf8');
const injection = '<script>window.J90_AUDIO_MANIFEST=' + JSON.stringify(manifest) + ';window.J90_ROSTERS=' + JSON.stringify(rosters) + ';window.J90_CONTENT=' + JSON.stringify(contentManifest) + ';</script><script src="j90-soundscape.js"></script><script src="j90-expansion.js"></script><script src="j90-ai2.js"></script>';
if (!generated.includes('src="j90-soundscape.js"')) {
  const patched = generated.replace('</body>', injection + '</body>');
  if (patched === generated) throw new Error('Could not inject the asset-based soundscape runtime.');
  writeFileSync('www/index.html', patched);
}

const totalAssets = Object.values(manifest).reduce((n, list) => n + list.length, 0);
const rosterTeams=Object.keys(rosters||{}).length;
const rosterPlayers=Object.values(rosters||{}).reduce((n,t)=>n+(Array.isArray(t?.players)?t.players.length:0),0);
console.log('Jornada 90 web build OK: canonical source validated, soundscape + expansion + AI 2.0 injected, ' + totalAssets + ' audio assets found, ' + rosterTeams + ' team rosters / ' + rosterPlayers + ' players injected, ' + (contentManifest.sceneCount || 0) + ' stadium scenes / ' + Math.round((contentManifest.generatedBytes || 0) / 1024 / 1024) + ' MiB content pack.');
