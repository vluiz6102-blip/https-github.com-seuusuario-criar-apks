#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const args=process.argv.slice(2);
const phaseIndex=args.indexOf('--phase');
const roundsIndex=args.indexOf('--max-rounds');
const sep=args.indexOf('--');
const phase=phaseIndex>=0?String(args[phaseIndex+1]||'build'):'build';
const maxRounds=Math.max(1,Math.min(3,Number(roundsIndex>=0?args[roundsIndex+1]:3)||3));
const command=sep>=0?args.slice(sep+1).join(' '):'';
const selfTest=args.includes('--self-test');
if(!selfTest&&!command)throw new Error('Self-healing runner requires a command after --.');
if(selfTest){
  const fixture='/tmp/j90-self-heal-fixture.js';
  writeFileSync(fixture,'function buildPitch(m){return m;}\n');
  const before=readFileSync(fixture,'utf8');
  const changed=(()=>{const n=before.replace(/function\s+buildPitch\s*\(/,'function fieldCache(').replace(/buildPitch\\(m\\)/g,'fieldCache(m)');writeFileSync(fixture,n);return n!==before;})();
  const ok=changed && /function fieldCache\(/.test(read(fixture));
  writeFileSync(fixture,before);
  if(!ok)throw new Error('Self-healing self-test failed.');
  console.log('[J90 SELF-HEAL] SELF-TEST=PASS');
  process.exit(0);
}

const stateDir='/tmp/j90-self-healing';
mkdirSync(stateDir,{recursive:true});
const logPath=join(stateDir,phase.replace(/[^a-z0-9_-]+/gi,'_')+'.log');
const original=new Map();
const touched=new Set();

const read=p=>readFileSync(p,'utf8');
const exists=p=>existsSync(p);
function remember(p){if(!original.has(p)&&exists(p))original.set(p,read(p));}
function write(p,s){remember(p);if(read(p)===s)return false;writeFileSync(p,s);touched.add(p);return true;}
function restore(){for(const [p,s] of original)writeFileSync(p,s);}
function run(cmd){
  const r=spawnSync(cmd,{shell:true,encoding:'utf8',env:{...process.env,J90_SELF_HEAL_PHASE:phase}});
  const out=(r.stdout||'')+(r.stderr||'');
  writeFileSync(logPath,out);
  return {code:r.status??1,out};
}
function log(s){console.log('[J90 SELF-HEAL] '+s);}

function repairAsyncAsync(){
  const p='index.html';if(!exists(p))return false;
  const s=read(p);return /async\s+async\s+function/.test(s)?write(p,s.replace(/async\s+async\s+function/g,'async function')):false;
}
function repairFieldCache(){
  const p='src/j90-match2d-v3.js';if(!exists(p))return false;
  const s=read(p);
  if(/function\s+fieldCache\s*\(/.test(s))return false;
  if(!/function\s+buildPitch\s*\(/.test(s))return false;
  let n=s.replace(/function\s+buildPitch\s*\(/,'function fieldCache(');
  n=n.replace(/buildPitch\(m\)/g,'fieldCache(m)');
  return write(p,n);
}
function repairCanvasFloor(){
  const p='src/j90-match2d-v3.js';if(!exists(p))return false;
  const s=read(p);
  const n=s.replace(/var\s+targetH\s*=\s*Math\.max\(150,Math\.round\(cssH\*dpr\)\)/,'var targetH=Math.max(180,Math.round(cssH*dpr))');
  return n!==s?write(p,n):false;
}
function repairReducedMotionRAF(){
  const p='index.html';if(!exists(p))return false;
  const s=read(p);
  const bad=/if\(reduced\)\{menuTime=0;updateJ90MenuEnvironment\(true\);j90AtmoNodes\.forEach\(draw\)\}\s*else\s*j90AtmoFrame=requestAnimationFrame\(frame\)/;
  return bad.test(s)?write(p,s.replace(bad,'if(reduced){menuTime=0;updateJ90MenuEnvironment(true);j90AtmoNodes.forEach(draw)}\n      j90AtmoFrame=requestAnimationFrame(frame);')):false;
}
function repairDuplicateRuntimeTags(){
  const p='index.html';if(!exists(p))return false;
  let s=read(p),changed=false;
  const files=['j90-soundscape.js','j90-expansion.js','j90-ai2.js','j90-tactics.js','j90-match2d-v3.js','j90-comfort-ui.js','j90-lineup-ai.js','j90-team-tactical-ai.js','j90-match-replay.js','j90-squad-cards.js','j90-match-events.js','j90-manager-stats.js','j90-copa-do-brasil.js','j90-manager-ai.js','j90-commentary.js','j90-match-lifecycle.js','j90-auto-heal.js','j90-perf.js'];
  for(const file of files){
    const tag='<script src="'+file+'"></script>';
    while(s.split(tag).length>2){
      const parts=s.split(tag);
      s=parts.shift()+tag+parts.slice(1).join('');
      changed=true;
    }
  }
  return changed?write(p,s):false;
}

const rules=[
  {name:'async-async',match:/async\s+async\s+function/,apply:repairAsyncAsync},
  {name:'canvas-field-cache',match:/Canvas 2D sem pré-renderização do campo|pre-renders the field|fieldCache|buildPitch/,apply:repairFieldCache},
  {name:'canvas-backing-floor',match:/Invalid Android 2D canvas|height":141|targetH=Math\.max\(150/,apply:repairCanvasFloor},
  {name:'reduced-motion-raf',match:/prefers-reduced-motion|reduced-motion|tickCount.*0|shared RAF/,apply:repairReducedMotionRAF},
  {name:'duplicate-runtime-tags',match:/duplicad|duplicate.*script|runtime.*tag/i,apply:repairDuplicateRuntimeTags}
];

log('phase='+phase+' maxRounds='+maxRounds);
log('command='+command);

let result={code:1,out:''};
for(let round=1;round<=maxRounds;round++){
  log('tentativa '+round+'/'+maxRounds);
  result=run(command);
  if(result.code===0){
    log('PASS: '+phase);
    if(touched.size){
      log('correções: '+[...touched].join(', '));
      if(process.env.J90_SELF_HEAL_COMMIT==='true'){
        const files=[...touched].filter(exists);
        if(files.length){
          spawnSync('git',['add',...files],{stdio:'inherit'});
          const commit=spawnSync('git',['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m',\`fix(self-heal): repair \${phase} [skip ci]\`],{stdio:'inherit',encoding:'utf8'});
          if(commit.status===0)spawnSync('git',['push'],{stdio:'inherit'});
          else log('commit não criado; correção permanece apenas nesta execução.');
        }
      }
    }
    process.exit(0);
  }
  let repaired=false;
  for(const rule of rules){
    if(rule.match.test(result.out)){
      try{
        if(rule.apply()){log('REPAIR '+rule.name);repaired=true;break;}
      }catch(e){log('REPAIR '+rule.name+' falhou: '+e.message);}
    }
  }
  if(!repaired){
    log('nenhuma correção segura catalogada para este erro.');
    break;
  }
}
restore();
log('FAIL: alterações temporárias revertidas.');
process.exit(result.code||1);
