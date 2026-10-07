import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const fail = [];
const strict = process.argv.includes('--strict');
const ok = (name, condition, detail='') => {
  if (!condition) fail.push(name + (detail ? ': ' + detail : ''));
  else console.log('READY_GATE=' + name + ':OK');
};
const text = p => existsSync(p) ? readFileSync(p, 'utf8') : '';

for (const p of [
  'index.html','scripts/build.mjs','scripts/browser-smoke.mjs','scripts/diag-smoke.mjs',
  'src/j90-ai2.js','src/j90-manager-ai.js','src/j90-auto-heal.js',
  'src/j90-match-events.js','src/j90-landscape.js','src/j90-match2d-v3.js','data/rosters.json'
]) ok('file:'+p, existsSync(p));

const build=text('scripts/build.mjs');
const managerAI=text('src/j90-manager-ai.js');
const heal=text('src/j90-auto-heal.js');
const index=text('index.html');
const workflow=text('.github/workflows/build-apk.yml');

ok('build:manager-ai', /j90-manager-ai\.js/.test(build));
ok('build:auto-heal', /j90-auto-heal\.js/.test(build));
ok('build:match-events', /j90-match-events\.js/.test(build));
ok('build:landscape', /j90-landscape\.js/.test(build));
ok('manager-ai:export', /window\.J90ManagerAI/.test(managerAI));
ok('manager-ai:profile', /j90EliteProfile/.test(managerAI) && /j90Radar/.test(managerAI) && /j90MiniPitch/.test(managerAI));
ok('auto-heal:export', /window\.J90AutoHealAI/.test(heal) && /window\.J90BugGuard/.test(heal));
ok('runtime:browser-smoke', /J90AutoHealAI/.test(text('scripts/browser-smoke.mjs')));
ok('runtime:no-player-photos', !/playerPhotos|j90PlayerPhoto|COMMONS_API|Wikimedia/i.test(index));
ok('workflow:chromium-smoke', /browser-smoke\.mjs/.test(workflow));
ok('workflow:apk-audit', /APK_FORENSICS=OK/.test(workflow));
ok('workflow:release-publish', /RELEASE_PUBLISHED=OK/.test(workflow));

const quality=spawnSync(process.execPath,['scripts/quality-scan.mjs'],{stdio:'inherit'});
ok('quality:scan',quality.status===0,'exit='+quality.status);

if(existsSync('www/index.html')){
  const probe=spawnSync(process.execPath,['-e',"const fs=require('fs');const s=fs.readFileSync('www/index.html','utf8');if(!s.includes('j90-manager-ai.js'))process.exit(1);if(!s.includes('j90-auto-heal.js'))process.exit(1);"],{stdio:'inherit'});
  ok('web:bundle-critical-runtimes',probe.status===0);
}else ok('web:bundle-present',false,'www/index.html missing. Run npm run build first.');

let marker=null;
try{marker=JSON.parse(readFileSync('.j90-release-ready.json','utf8'));}catch{}
if (strict) {
  ok('agent:completion-marker',!!marker?.ready && !!marker?.revision,'marker missing or ready=false');
  ok('agent:marker-checks',!!marker?.checks && Object.values(marker.checks).every(Boolean));
  const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
  const dirty=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout.trim();
  ok('agent:marker-current',!!head && marker?.revision===head,'marker revision does not match HEAD');
  ok('agent:working-tree-clean',dirty==='','ready marker exists with uncommitted changes');
} else {
  console.log(marker?.ready ? 'RELEASE_MARKER_PRESENT=YES' : 'RELEASE_MARKER_PRESENT=NO');
}

if(fail.length){
  console.error('RELEASE_GATE_FAILED');
  fail.forEach(x=>console.error(' - '+x));
  process.exit(1);
}
if (!strict && !marker?.ready) {
  console.log('RELEASE_READY=NO');
  console.log('Structural gates passed; autonomous improvement cycle may continue.');
  process.exit(0);
}
console.log('RELEASE_READY=YES');
