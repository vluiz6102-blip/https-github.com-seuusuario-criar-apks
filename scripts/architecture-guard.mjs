import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const fail = [];
const pass = [];
const read = (p) => readFileSync(join(root, p), 'utf8');
const hits = (s, re) => (s.match(re) || []).length;
const index = read('index.html');

function check(ok, message) {
  if (ok) pass.push(message);
  else fail.push(message);
}

check(hits(index, /<script\b/gi) === hits(index, /<\/script>/gi), 'HTML script tags balance');
check(hits(index, /<style\b/gi) === hits(index, /<\/style>/gi), 'HTML style tags balance');
check(!/startJ90MatchLoop|j90MatchFrame/.test(index), 'legacy match loop absent');
check(hits(index, /function\s+mgrMatchTick\s*\(/g) === 1, 'single canonical mgrMatchTick');
check(hits(index, /function\s+mgrStartMatch\s*\(/g) === 1, 'single canonical mgrStartMatch');
check(hits(index, /function\s+startJ90Atmosphere\s*\(/g) === 1, 'single canonical atmosphere starter');
check(!/cancelAnimationFrame\s*\(/.test(index), 'main HTML loop does not cancel RAF');
check(!/setInterval\s*\(/.test(index), 'main HTML loop does not use setInterval');
check(/j90AtmoFrame\s*=\s*requestAnimationFrame\s*\(frame\)/.test(index), 'shared RAF reschedules itself');
check(/_j90MatchLoopReady/.test(index), 'match loop has one-time readiness guard');
check(/m\._j90TickCount/.test(index), 'match loop heartbeat exists');
check(!/if\s*\(\s*!j90AtmoNodes\.length\s*\)\s*return\s*;/.test(index), 'atmosphere nodes do not gate the shared RAF');
check(!/async\s+async\s+function/.test(index), 'historical async async syntax absent');

const runtime = readdirSync(join(root, 'src')).filter((name) => name.endsWith('.js')).sort();
const allowedRaf = new Set(['j90-perf.js', 'j90-match-replay.js']);
for (const file of runtime) {
  const source = read(join('src', file));
  const raf = hits(source, /requestAnimationFrame\s*\(/g);
  const cancel = hits(source, /cancelAnimationFrame\s*\(/g);
  const interval = hits(source, /setInterval\s*\(/g);
  check(!raf || allowedRaf.has(file), 'RAF ownership: ' + file);
  check(!cancel || file === 'j90-perf.js', 'RAF cancellation ownership: ' + file);
  check(!interval, 'no setInterval in runtime: ' + file);
}

const ai = read('src/j90-ai2.js');
check(/window\.J90AI2\s*=/.test(ai), 'AI 2.0 export exists');
check(!/\b(?:window\.)?mgrMatchTick\s*=\s*[^=]/.test(ai), 'AI 2.0 does not replace mgrMatchTick');

const match2d = read('src/j90-match2d-v3.js');
check(!/requestAnimationFrame\s*\(|cancelAnimationFrame\s*\(|setInterval\s*\(/.test(match2d), 'Match 2D has no private loop');

const runtimeFiles = [
  'j90-soundscape.js','j90-expansion.js','j90-ai2.js','j90-tactics.js','j90-match2d-v3.js','j90-comfort-ui.js',
  'j90-lineup-ai.js','j90-team-tactical-ai.js','j90-match-replay.js','j90-squad-cards.js','j90-match-events.js',
  'j90-manager-stats.js','j90-copa-do-brasil.js','j90-manager-ai.js','j90-match-lifecycle.js','j90-auto-heal.js','j90-perf.js'
];
for (const file of runtimeFiles) {
  check(index.split('<script src="' + file + '"></script>').length - 1 <= 1, 'runtime tag is not duplicated: ' + file);
}

if (fail.length) {
  console.error('J90 ARCHITECTURE GUARD: FAIL');
  fail.forEach((x) => console.error('  FAIL:', x));
  throw new Error('Architecture guard blocked this build with ' + fail.length + ' finding(s).');
}
console.log('J90 ARCHITECTURE GUARD: PASS');
pass.forEach((x) => console.log('  PASS:', x));
