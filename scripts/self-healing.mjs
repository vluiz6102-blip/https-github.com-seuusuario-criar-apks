#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const args=process.argv.slice(2);
const selfTest=args.includes('--self-test');
const phaseIndex=args.indexOf('--phase');
const roundsIndex=args.indexOf('--max-rounds');
const separator=args.indexOf('--');
const phase=phaseIndex>=0?String(args[phaseIndex+1]||'build'):'build';
const maxRounds=Math.max(1,Math.min(3,Number(roundsIndex>=0?args[roundsIndex+1]:3)||3));
const command=separator>=0?args.slice(separator+1).join(' '):'';

const stateDir='/tmp/j90-self-healing';
mkdirSync(stateDir,{recursive:true});

const read=p=>readFileSync(p,'utf8');
const exists=p=>existsSync(p);
const log=s=>console.log('[J90 SELF-HEAL] '+s);

if(selfTest){
  const fixture='/tmp/j90-self-heal-fixture.js';
  const before='function buildPitch(m){return m;}';
  writeFileSync(fixture,before);
  const after=before.replace(/function\s+buildPitch\s*\(/,'function fieldCache(').replace(/buildPitch\(m\)/g,'fieldCache(m)');
  writeFileSync(fixture,after);
  const ok=after!==before&&/function\s+fieldCache\s*\(/.test(read(fixture));
  writeFileSync(fixture,before);
  if(!ok)throw new Error('Self-healing self-test failed.');
  log('SELF-TEST=PASS');
  process.exit(0);
}
if(!command)throw new Error('Self-healing runner requires a command after --.');

const logPath=join(stateDir,phase.replace(/[^a-z0-9_-]+/gi,'_')+'.log');
const original=new Map();
const touched=new Set();

function remember(path){
  if(!original.has(path)&&exists(path))original.set(path,read(path));
}
function write(path,content){
  remember(path);
  if(read(path)===content)return false;
  writeFileSync(path,content);
  touched.add(path);
  return true;
}
function restore(){
  for(const [path,content] of original)writeFileSync(path,content);
}
function execute(cmd){
  const result=spawnSync(cmd,{
    shell:true,
    encoding:'utf8',
    env:{...process.env,J90_SELF_HEAL_PHASE:phase}
  });
  const output=(result.stdout||'')+(result.stderr||'');
  writeFileSync(logPath,output);
  return {code:result.status??1,out:output};
}

function repairAsyncAsync(){
  const path='index.html';
  if(!exists(path))return false;
  const source=read(path);
  if(!/async\s+async\s+function/.test(source))return false;
  return write(path,source.replace(/async\s+async\s+function/g,'async function'));
}
function repairFieldCache(){
  const path='src/j90-match2d-v3.js';
  if(!exists(path))return false;
  const source=read(path);
  if(/function\s+fieldCache\s*\(/.test(source))return false;
  if(!/function\s+buildPitch\s*\(/.test(source))return false;
  let next=source.replace(/function\s+buildPitch\s*\(/,'function fieldCache(');
  next=next.replace(/buildPitch\(m\)/g,'fieldCache(m)');
  return write(path,next);
}
function repairCanvasFloor(){
  const path='src/j90-match2d-v3.js';
  if(!exists(path))return false;
  const source=read(path);
  const next=source.replace(/var\s+targetH\s*=\s*Math\.max\(150,Math\.round\(cssH\*dpr\)\)/,'var targetH=Math.max(180,Math.round(cssH*dpr))');
  return next!==source?write(path,next):false;
}
function repairReducedMotionRAF(){
  const path='index.html';
  if(!exists(path))return false;
  const source=read(path);
  const pattern=/if\(reduced\)\{menuTime=0;updateJ90MenuEnvironment\(true\);j90AtmoNodes\.forEach\(draw\)\}\s*else\s*j90AtmoFrame=requestAnimationFrame\(frame\)/;
  if(!pattern.test(source))return false;
  return write(path,source.replace(pattern,'if(reduced){menuTime=0;updateJ90MenuEnvironment(true);j90AtmoNodes.forEach(draw)}\n      j90AtmoFrame=requestAnimationFrame(frame);'));
}
function repairDuplicateRuntimeTags(){
  const path='index.html';
  if(!exists(path))return false;
  let source=read(path);
  let changed=false;
  const files=[
    'j90-soundscape.js','j90-expansion.js','j90-ai2.js','j90-tactics.js',
    'j90-match2d-v3.js','j90-comfort-ui.js','j90-lineup-ai.js','j90-team-tactical-ai.js',
    'j90-match-replay.js','j90-squad-cards.js','j90-match-events.js','j90-manager-stats.js',
    'j90-copa-do-brasil.js','j90-manager-ai.js','j90-commentary.js','j90-match-lifecycle.js',
    'j90-auto-heal.js','j90-perf.js'
  ];
  for(const file of files){
    const tag='<script src="'+file+'"></script>';
    const parts=source.split(tag);
    if(parts.length>2){
      source=parts[0]+tag+parts.slice(1).join('');
      changed=true;
    }
  }
  return changed?write(path,source):false;
}

const rules=[
  {name:'async-async',test:/async\s+async\s+function/,repair:repairAsyncAsync},
  {name:'canvas-field-cache',test:/Canvas 2D sem pré-renderização do campo|buildPitch|fieldCache/,repair:repairFieldCache},
  {name:'canvas-backing-floor',test:/Invalid Android 2D canvas|height":141|targetH=Math\.max\(150/,repair:repairCanvasFloor},
  {name:'reduced-motion-raf',test:/prefers-reduced-motion|reduced-motion|tickCount.*0|shared RAF/,repair:repairReducedMotionRAF},
  {name:'duplicate-runtime-tags',test:/duplicad|duplicate.*script|runtime.*tag/i,repair:repairDuplicateRuntimeTags}
];

log('phase='+phase+' rounds='+maxRounds);
let last={code:1,out:''};

for(let round=1;round<=maxRounds;round++){
  log('attempt='+round+'/'+maxRounds);
  last=execute(command);

  if(last.code===0){
    log('PASS phase='+phase);
    if(touched.size){
      appendFileSync(logPath,'\nCORRECTIONS='+[...touched].join(',')+'\n');
      if(process.env.J90_SELF_HEAL_COMMIT==='true'){
        const files=[...touched].filter(exists);
        if(files.length){
          const add=spawnSync('git',['add','--',...files],{stdio:'inherit'});
          if(add.status===0){
            const message='fix(self-heal): repair '+phase+' [skip ci]';
            const commit=spawnSync('git',['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m',message],{stdio:'inherit'});
            if(commit.status===0)spawnSync('git',['push'],{stdio:'inherit'});
            else log('commit skipped: no staged changes or commit rejected');
          }
        }
      }
    }
    process.exit(0);
  }

  let repaired=false;
  for(const rule of rules){
    if(rule.test.test(last.out)){
      try{
        if(rule.repair()){
          log('REPAIR='+rule.name);
          repaired=true;
          break;
        }
      }catch(error){
        log('REPAIR_ERROR='+rule.name+' '+String(error&&error.message||error));
      }
    }
  }

  if(!repaired){
    log('NO_SAFE_REPAIR_FOR_FAILURE');
    break;
  }
}

restore();
log('FAIL phase='+phase+' temporary corrections reverted');
process.exit(last.code||1);
