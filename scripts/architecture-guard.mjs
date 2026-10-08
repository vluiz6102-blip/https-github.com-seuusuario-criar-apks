#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const fail = [];
const pass = [];

function ok(message) { pass.push(message); }
function bad(message) { fail.push(message); }
function read(path) { return readFileSync(join(root, path), 'utf8'); }
function count(text, re) { return (text.match(re) || []).length; }
function countLiteral(text, value) { return text.split(value).length - 1; }

function checkNodeSyntax(path) {
  const r = spawnSync(process.execPath, ['--check', join(root, path)], { encoding: 'utf8' });
  if (r.status !== 0) {
    bad('Sintaxe inválida em ' + path + ': ' + (r.stderr || r.stdout || 'erro desconhecido').trim());
    return false;
  }
  return true;
}

const index = read('index.html');
const srcDir = join(root, 'src');
const srcFiles = readdirSync(srcDir)
  .filter((name) => extname(name).toLowerCase() === '.js')
  .sort();

for (const file of srcFiles) checkNodeSyntax(join('src', file));
for (const file of readdirSync(join(root, 'scripts')).filter((name) => /\\.(mjs|js)$/.test(name)).sort()) {
  checkNodeSyntax(join('scripts', file));
}
ok('Sintaxe: ' + srcFiles.length + ' módulos runtime + scripts validados');

function balanced(tag, html) {
  const open = count(html, new RegExp('<' + tag + '\\\\b', 'gi'));
  const close = count(html, new RegExp('</' + tag + '>', 'gi'));
  if (open !== close) bad('index.html com <' + tag + '> desbalanceado: ' + open + '/' + close);
  else ok('HTML: <' + tag + '> balanceado (' + open + ')');
}
balanced('script', index);
balanced('style', index);

const styleTokens = /<style\\b[^>]*>|<\\/style>/gi;
let styleDepth = 0;
let styleMatch;
while ((styleMatch = styleTokens.exec(index))) {
  if (/^<style/i.test(styleMatch[0])) {
    if (styleDepth) bad('index.html contém <style> aninhado.');
    styleDepth++;
  } else {
    if (!styleDepth) bad('index.html contém </style> sem abertura.');
    styleDepth--;
  }
}
if (styleDepth) bad('index.html contém <style> não fechado.');
else ok('HTML: blocos <style> sem aninhamento/abertura órfã');

const inlineScripts = [...index.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)]
  .map((m) => m[1]).join('\\n');
try {
  new Function(inlineScripts);
  ok('JavaScript inline: parser do Node aceitou o bundle inline');
} catch (error) {
  bad('JavaScript inline inválido: ' + error.message);
}

const criticalFunctions = [
  ['mgrMatchTick', /function\\s+mgrMatchTick\\s*\\(/g],
  ['mgrStartMatch', /function\\s+mgrStartMatch\\s*\\(/g],
  ['startJ90Atmosphere', /function\\s+startJ90Atmosphere\\s*\\(/g]
];
for (const [name, re] of criticalFunctions) {
  const n = count(index, re);
  if (n !== 1) bad('Função crítica ' + name + ' deveria existir exatamente 1 vez, encontrada: ' + n);
  else ok('Função crítica ' + name + ': 1 definição canônica');
}

const runtimeFiles = [
  'j90-soundscape.js','j90-expansion.js','j90-ai2.js','j90-tactics.js','j90-match2d-v3.js','j90-comfort-ui.js',
  'j90-lineup-ai.js','j90-team-tactical-ai.js','j90-match-replay.js','j90-squad-cards.js','j90-match-events.js',
  'j90-manager-stats.js','j90-copa-do-brasil.js','j90-manager-ai.js','j90-match-lifecycle.js','j90-auto-heal.js','j90-perf.js'
];
for (const file of runtimeFiles) {
  const tag = '<script src="' + file + '"></script>';
  const n = countLiteral(index, tag);
  if (n !== 1) bad('Runtime ' + file + ': esperado 1 tag, encontrado ' + n);
}
ok('Runtime: ' + runtimeFiles.length + ' scripts canônicos conferidos no index.html');

for (const file of runtimeFiles) {
  if (!existsSync(join(root, 'src', file))) bad('Runtime ausente em src/: ' + file);
}
ok('Runtime: arquivos-fonte presentes');

if (/startJ90MatchLoop|j90MatchFrame/.test(index)) bad('Loop legado detectado: startJ90MatchLoop/j90MatchFrame.');
else ok('Loop legado: nenhum símbolo encontrado');

const srcText = srcFiles.map((f) => [f, read(join('src', f))]);
const approvedRafOwners = new Set(['j90-perf.js', 'j90-match-replay.js']);
for (const [file, text] of srcText) {
  const raf = count(text, /requestAnimationFrame\\s*\\(/g);
  const cancel = count(text, /cancelAnimationFrame\\s*\\(/g);
  const interval = count(text, /setInterval\\s*\\(/g);
  if (raf && !approvedRafOwners.has(file)) {
    bad('RAF não autorizado em src/' + file + ': ' + raf + ' referência(s). O loop principal pertence ao index.html.');
  }
  if (cancel && file !== 'j90-perf.js') {
    bad('cancelAnimationFrame fora do monitor de performance em src/' + file + ': ' + cancel + ' referência(s).');
  }
  if (interval) {
    bad('setInterval em runtime src/' + file + ': ' + interval + ' referência(s). Use o loop compartilhado ou um timeout pontual.');
  }
}
const rafOwners = srcText.filter(([, text]) => /requestAnimationFrame\\s*\\(/.test(text)).map(([file]) => file);
ok('RAF runtime: proprietários isolados permitidos [' + (rafOwners.join(', ') || 'nenhum') + ']');

if (count(index, /cancelAnimationFrame\\s*\\(/g)) bad('cancelAnimationFrame apareceu no index.html. Nenhum módulo pode cancelar o loop principal.');
else ok('Loop principal: index.html não cancela RAF');

if (count(index, /setInterval\\s*\\(/g)) bad('setInterval apareceu no index.html. A simulação deve usar o RAF compartilhado.');
else ok('Loop principal: index.html sem setInterval');

if (!/j90AtmoFrame\\s*=\\s*requestAnimationFrame\\s*\\(frame\\)/.test(index)) {
  bad('Loop principal não reagenda o RAF compartilhado em startJ90Atmosphere().');
} else {
  ok('Loop principal: RAF compartilhado identificado');
}

if (!/startJ90Atmosphere\\(\\)/.test(index)) bad('startJ90Atmosphere() não é chamada no fluxo.');
if (!/_j90MatchLoopReady/.test(index)) bad('_j90MatchLoopReady não está presente no controle do loop.');
if (!/m\\._j90TickCount/.test(index)) bad('Heartbeat _j90TickCount não está presente em mgrMatchTick().');

if (/if\\s*\\(\\s*!j90AtmoNodes\\.length\\s*\\)\\s*return\\s*;/.test(index)) {
  bad('startJ90Atmosphere() ainda depende de .atmoCanvas. A partida fullscreen não pode perder o RAF por causa disso.');
} else {
  ok('Atmosfera: RAF não depende da existência de .atmoCanvas');
}

const ai = read('src/j90-ai2.js');
if (!/window\\.J90AI2\\s*=/.test(ai)) bad('AI 2.0 não exporta window.J90AI2.');
else ok('AI 2.0: export público encontrado');

if (/\\b(?:window\\.)?mgrMatchTick\\s*=\\s*[^=]/.test(ai)) {
  bad('AI 2.0 tenta assumir o mgrMatchTick. Deve apenas expor tick().');
} else {
  ok('AI 2.0: não substitui o loop canônico');
}

const match2d = read('src/j90-match2d-v3.js');
if (/requestAnimationFrame\\s*\\(|cancelAnimationFrame\\s*\\(|setInterval\\s*\\(/.test(match2d)) {
  bad('Renderer Match 2D possui loop próprio. O renderer deve apenas desenhar quando chamado pelo loop canônico.');
} else {
  ok('Renderer Match 2D: sem loop próprio');
}

for (const [file, text] of srcText) {
  if (/function\\s+(?:mgrMatchTick|startJ90Atmosphere|mgrStartMatch)\\s*\\(/.test(text)) {
    bad('Definição crítica duplicada encontrada em src/' + file + '. Essas funções devem ter origem única no index.html.');
  }
}

const mustExport = [
  ['src/j90-auto-heal.js', /window\\.J90AutoHealAI/],
  ['src/j90-auto-heal.js', /window\\.J90BugGuard/],
  ['src/j90-match2d-v3.js', /window\\.J90Match2D/],
  ['src/j90-match-lifecycle.js', /window\\.J90MatchLifecycle/]
];
for (const [file, re] of mustExport) {
  const text = read(file);
  if (!re.test(text)) bad(file + ': contrato/runtime essencial ausente (' + re.source + ')');
}
ok('Contratos essenciais: Auto-Heal, BugGuard, Match 2D e Lifecycle conferidos');

if (/async\\s+async\\s+function/.test(index)) bad('Padrão async async function encontrado.');
if (/function\\s+mgrStartMatch\\s*\\([^)]*\\)\\s*\\{\\s*async\\s+async/.test(index)) {
  bad('mgrStartMatch ainda contém a forma historicamente quebrada async async.');
}

if (fail.length) {
  console.error('J90 ARCHITECTURE GUARD: FAIL');
  for (const message of fail) console.error('  FAIL:', message);
  process.exit(1);
}

console.log('J90 ARCHITECTURE GUARD: PASS');
for (const message of pass) console.log('  PASS:', message);
