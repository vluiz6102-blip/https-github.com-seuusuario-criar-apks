import { mkdirSync, copyFileSync, readFileSync } from 'node:fs';

const source = readFileSync('index.html', 'utf8');
const scripts = [...source.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)]
  .map(match => match[1])
  .join('\\n');

if (!scripts.includes('menuTime') || !scripts.includes('j90SoundscapeStart')) {
  throw new Error('Canonical index.html is missing the Jornada 90 environment core.');
}
if (/j90Music(Start|Stop|Track|Notes|Timer|Nodes)/.test(scripts)) {
  throw new Error('Obsolete menu music engine detected in canonical index.html.');
}

try {
  new Function(scripts);
} catch (error) {
  throw new Error('JavaScript syntax validation failed: ' + error.message);
}

mkdirSync('www', { recursive: true });
copyFileSync('index.html', 'www/index.html');
console.log('Jornada 90 web build OK: canonical index.html validated and copied to www/index.html');
