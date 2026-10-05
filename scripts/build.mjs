import { mkdirSync, copyFileSync, readFileSync, readdirSync, existsSync, cpSync } from 'node:fs';
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
const soundscape = soundscapeSource.replace(
  '__J90_AUDIO_MANIFEST__',
  JSON.stringify(manifest)
);

try {
  new Function(scripts + '\n' + soundscape);
} catch (error) {
  throw new Error('JavaScript syntax validation failed: ' + error.message);
}

mkdirSync('www', { recursive: true });
copyFileSync('index.html', 'www/index.html');
copyFileSync('src/j90-soundscape.js', 'www/j90-soundscape.js');

if (existsSync(audioRoot)) {
  mkdirSync('www/assets', { recursive: true });
  cpSync(audioRoot, 'www/assets/audio', { recursive: true });
}

const generated = readFileSync('www/index.html', 'utf8');
const injection = '<script>window.J90_AUDIO_MANIFEST=' + JSON.stringify(manifest) + ';</script><script src="j90-soundscape.js"></script>';
if (!generated.includes('src="j90-soundscape.js"')) {
  const patched = generated.replace('</body>', injection + '</body>');
  if (patched === generated) throw new Error('Could not inject the asset-based soundscape runtime.');
  copyFileSync('www/index.html', 'www/index.html');
  const { writeFileSync } = await import('node:fs');
  writeFileSync('www/index.html', patched);
}

const totalAssets = Object.values(manifest).reduce((n, list) => n + list.length, 0);
console.log('Jornada 90 web build OK: canonical source validated, asset soundscape injected, ' + totalAssets + ' audio assets found.');
