import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const errors = [];
const warnings = [];
const check = (ok, message) => (ok ? null : errors.push(message));
const readJson = (path) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { errors.push(path + ': ' + error.message); return null; }
};

const pkg = readJson('package.json') || {};
check(pkg.dependencies?.phaser === '4.2.1', 'Phaser deve permanecer fixado em 4.2.1.');
check(pkg.dependencies?.['@capacitor/core'] === '7.4.3', 'Capacitor Core deve permanecer fixado em 7.4.3.');
check(existsSync('package-lock.json'), 'package-lock.json ausente: dependências não reproduzíveis; gerar e versionar lockfile.');
check(existsSync('index.html'), 'index.html ausente.');
check(existsSync('src/j90-phaser-runtime.js'), 'Runtime Phaser ausente.');
check(existsSync('src/j90-soundscape.js'), 'Soundscape ausente.');
check(existsSync('src/j90-expansion.js'), 'Módulo de expansão ausente.');
check(existsSync('scripts/build.mjs'), 'Script de build ausente.');
check(existsSync('data/rosters.json'), 'data/rosters.json ausente; executar npm run data:rosters e revisar os dados.');
check(existsSync('assets/j90-content/content-manifest.json'), 'Pacote de conteúdo ausente; executar npm run content:build.');
check(existsSync('android'), 'Projeto Android nativo ausente; executar npx cap add android antes do sync/build.');

const roster = existsSync('data/rosters.json') ? readJson('data/rosters.json') : null;
if (roster) {
  const teams = Object.entries(roster);
  check(teams.length > 0, 'Nenhum clube no arquivo de elencos.');
  for (const [club, data] of teams) {
    check(Array.isArray(data?.players) && data.players.length > 0, 'Elenco sem jogadores: ' + club);
  }
}

const metadata = existsSync('audio-import/metadata.json') ? readJson('audio-import/metadata.json') : null;
const licenses = existsSync('assets/audio/LICENSES.json') ? readJson('assets/audio/LICENSES.json') : null;
const audioMap = {
  '01-wind':['wind','wind-soft-01.ogg'],
  '02-leaves':['trees','leaves-soft-01.ogg'],
  '03-neighborhood':['neighborhood','neighborhood-bed-01.ogg'],
  '04-birds-bed':['birdsBed','birds-distant-01.ogg'],
  '05-bird-call':['birdEvents','bird-call-01.ogg'],
  '06-dog':['dog','dog-distant-01.ogg'],
  '07-car':['car','car-pass-01.ogg'],
  '08-light-rain':['rain','light-rain-bed-01.ogg'],
  '09-heavy-rain':['rain','heavy-rain-bed-01.ogg'],
  '10-crowd':['crowd','crowd-distant-01.ogg']
};
for (const [key,[folder,file]] of Object.entries(audioMap)) {
  const path = join('assets/audio', folder, file);
  check(existsSync(path) && statSync(path).size > 0, 'Áudio ausente/vazio: ' + path);
  const m = metadata?.[key];
  check(!!(m?.author && m?.sourceUrl && m?.license && !['unknown','desconhecida'].includes(String(m.license).toLowerCase())), 'Metadados/licença incompletos: ' + key);
  check(!!licenses?.[key], 'Registro de licença/arquivo convertido ausente: ' + key);
  check(existsSync(join('www/assets/audio', folder, file)), 'Áudio ainda não foi copiado para o bundle www: ' + key);
}
check(existsSync('CREDITS.md'), 'CREDITS.md ausente.');

if (existsSync('assets/j90-content/content-manifest.json')) {
  const content = readJson('assets/j90-content/content-manifest.json') || {};
  check(Number(content.sceneCount) > 0, 'Manifesto de conteúdo sem cenas.');
  check(Number(content.generatedBytes) >= 1000 * 1024 * 1024, 'Pacote visual abaixo do mínimo configurado de 1000 MiB.');
}

console.log('Jornada 90 release preflight');
console.log('Node: ' + process.version);
console.log('Dependências: ' + Object.keys(pkg.dependencies || {}).length + ' runtime / ' + Object.keys(pkg.devDependencies || {}).length + ' desenvolvimento');
if (warnings.length) warnings.forEach(x => console.warn('WARN: ' + x));
if (errors.length) {
  console.error('BLOQUEIOS (' + errors.length + '):');
  errors.forEach(x => console.error(' - ' + x));
  process.exitCode = 1;
} else {
  console.log('PRE-FLIGHT OK. Isso não substitui testes de runtime, Chromium ou instalação Android.');
}
