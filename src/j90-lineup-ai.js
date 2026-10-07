/* Jornada 90 Lineup Intelligence 1.0
 * Builds a club-specific XI from the current roster snapshot.
 * No club shares a generic lineup: role, rating, availability and balance decide.
 */
(function(){
'use strict';
var FORM={
 '4-3-3':[
  {p:'GK',x:50,y:88},{p:'LB',x:14,y:68},{p:'CB',x:38,y:73},{p:'CB',x:62,y:73},{p:'RB',x:86,y:68},
  {p:'CM',x:30,y:52},{p:'CM',x:50,y:46},{p:'CM',x:70,y:52},
  {p:'LW',x:18,y:23},{p:'ST',x:50,y:17},{p:'RW',x:82,y:23}],
 '4-2-3-1':[
  {p:'GK',x:50,y:88},{p:'LB',x:14,y:68},{p:'CB',x:38,y:73},{p:'CB',x:62,y:73},{p:'RB',x:86,y:68},
  {p:'DM',x:38,y:55},{p:'DM',x:62,y:55},{p:'LW',x:20,y:36},{p:'AM',x:50,y:40},{p:'RW',x:80,y:36},{p:'ST',x:50,y:18}],
 '4-4-2':[
  {p:'GK',x:50,y:88},{p:'LB',x:14,y:68},{p:'CB',x:38,y:73},{p:'CB',x:62,y:73},{p:'RB',x:86,y:68},
  {p:'LM',x:18,y:50},{p:'CM',x:40,y:54},{p:'CM',x:60,y:54},{p:'RM',x:82,y:50},{p:'ST',x:39,y:22},{p:'ST',x:61,y:22}]
};
var aliases={
 GK:['GK','GOL','GOLEIRO','GOALKEEPER'],CB:['CB','ZAG','ZAGUEIRO','DC'],LB:['LB','LE','LATERAL ESQUERDO'],RB:['RB','LD','LATERAL DIREITO'],
 DM:['DM','VOL','VOLANTE'],CM:['CM','MC','ME','MEI'],AM:['CAM','AM','MEI','MED'],LW:['LW','PE','PONTA ESQUERDA'],RW:['RW','PD','PONTA DIREITA'],
 LM:['LM','ME','PE'],RM:['RM','MD','PD'],ST:['ST','ATA','ATACANTE','CF']
};
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim()}
function pos(p){return norm(p&&p.position)}
function rating(p){return Number(p&& (p.ovr??p.overall??p.rating))||70}
function score(p,role,index){
 var s=rating(p),q=pos(p),a=aliases[role]||[role];
 if(a.some(function(x){return q===norm(x)||q.includes(norm(x))}))s+=18;
 var roleHints={
  GK:['GOL','GK'],CB:['ZAG','CB'],LB:['LE','LB'],RB:['LD','RB'],DM:['VOL','DM'],CM:['MC','CM','MEI'],AM:['MEI','CAM','AM'],
  LM:['ME','PE','LM'],RM:['MD','PD','RM'],LW:['PE','LW'],RW:['PD','RW'],ST:['ATA','ST','CF']
 }[role]||[];
 if(roleHints.some(function(x){return q===norm(x)}))s+=8;
 if(p.form!=null)s+=Math.max(-8,Math.min(8,(Number(p.form)-50)/6));
 if(p.fitness!=null)s+=Math.max(-12,Math.min(6,(Number(p.fitness)-70)/4));
 if(p.injured||p.suspended||p.available===false)s-=100;
 s+=(index%3)*.01;
 return s;
}
function choose(pool,role,used){
 var best=null,bs=-Infinity;
 pool.forEach(function(p,i){if(!p||used[p.id||p.name])return;var z=score(p,role,i);if(z>bs){bs=z;best=p}});
 return best;
}
function inferFormation(players){
 var counts={GK:0,DEF:0,MID:0,ATT:0};
 players.forEach(function(p){var q=pos(p);if(/GK|GOL/.test(q))counts.GK++;else if(/CB|ZAG|LB|RB|LE|LD|DEF/.test(q))counts.DEF++;else if(/DM|VOL|CM|MC|CAM|AM|MEI|LM|RM|ME|MD/.test(q))counts.MID++;else counts.ATT++});
 if(counts.MID>=5)return '4-2-3-1';
 if(counts.ATT>=4)return '4-3-3';
 return '4-4-2';
}
function build(team,players,preferred){
 var pool=(Array.isArray(players)?players:[]).filter(Boolean).slice();
 var formation=preferred&&FORM[preferred]?preferred:inferFormation(pool),slots=FORM[formation],used={},xi=[];
 slots.forEach(function(slot,i){var p=choose(pool,slot.p,used);if(p){used[p.id||p.name]=true;xi.push(Object.assign({},p,{aiRole:slot.p,x:slot.x,y:slot.y,starter:true}))}});
 if(xi.length<11){
  pool.slice().sort(function(a,b){return rating(b)-rating(a)}).forEach(function(p){if(xi.length>=11||used[p.id||p.name])return;used[p.id||p.name]=true;xi.push(Object.assign({},p,{aiRole:slots[xi.length]?.p||'CM',x:slots[xi.length]?.x||50,y:slots[xi.length]?.y||50,starter:true}))});
 }
 var bench=pool.filter(function(p){return !used[p.id||p.name]}).sort(function(a,b){return rating(b)-rating(a)}).slice(0,7);
 var avg=xi.reduce(function(n,p){return n+rating(p)},0)/Math.max(1,xi.length);
 var style=avg>=82?'elite':avg>=76?'competitive':'development';
 var traits=[];
 var hasWide=xi.some(function(p){return /LW|RW|LB|RB/.test(p.aiRole)});
 var hasDM=xi.some(function(p){return /DM/.test(p.aiRole));
 if(hasWide)traits.push('amplitude');
 if(hasDM)traits.push('proteção central');
 if(xi.filter(function(p){return /ST/.test(p.aiRole)}).length)traits.push('ataque à profundidade');
 if(xi.some(function(p){return /AM/.test(p.aiRole)}))traits.push('entrelinhas');
 return {team:team||'Clube',formation:formation,players:xi,bench:bench,average:+avg.toFixed(1),style:style,traits:traits,generatedAt:new Date().toISOString(),source:'roster snapshot + tactical role model'};
}
function get(team,players,preferred){return build(team,players,preferred)}
window.J90_LINEUP_AI={build:build,get:get,formations:FORM};
})();