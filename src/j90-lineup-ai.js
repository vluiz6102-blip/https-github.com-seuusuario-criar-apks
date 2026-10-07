/* Jornada 90 Lineup Intelligence 1.1
 * Builds a club-specific XI from its own current roster, roles, form and availability.
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
 GK:['GK','GOL','GOLEIRO','GOALKEEPER'],CB:['CB','ZAG','ZAGUEIRO','DC'],
 LB:['LB','LE','LATERAL ESQUERDO'],RB:['RB','LD','LATERAL DIREITO'],
 DM:['DM','VOL','VOLANTE'],CM:['CM','MC','ME','MEI'],AM:['CAM','AM','MEI','MED'],
 LM:['LM','ME','PE'],RM:['RM','MD','PD'],LW:['LW','PE','PONTA ESQUERDA'],RW:['RW','PD','PONTA DIREITA'],
 ST:['ST','ATA','ATACANTE','CF']
};
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();}
function pos(p){return norm(p&&p.position);}
function rating(p){var v=p&&(p.ovr!=null?p.ovr:(p.overall!=null?p.overall:p.rating));return Number(v)||70;}
function available(p){return !(p&&((p.injured)||(p.suspended)||(p.available===false)));}
function score(p,role,index){
 var s=rating(p),q=pos(p),a=aliases[role]||[role],i;
 for(i=0;i<a.length;i++){var aq=norm(a[i]);if(q===aq||q.indexOf(aq)>=0){s+=18;break;}}
 var hints={GK:['GOL','GK'],CB:['ZAG','CB'],LB:['LE','LB'],RB:['LD','RB'],DM:['VOL','DM'],CM:['MC','CM','MEI'],AM:['MEI','CAM','AM'],LM:['ME','PE','LM'],RM:['MD','PD','RM'],LW:['PE','LW'],RW:['PD','RW'],ST:['ATA','ST','CF']}[role]||[];
 for(i=0;i<hints.length;i++)if(q===norm(hints[i])){s+=8;break;}
 if(p&&p.form!=null)s+=Math.max(-8,Math.min(8,(Number(p.form)-50)/6));
 if(p&&p.fitness!=null)s+=Math.max(-12,Math.min(6,(Number(p.fitness)-70)/4));
 if(!available(p))s-=100;
 return s+(index%3)*0.01;
}
function choose(pool,role,used){
 var best=null,bs=-Infinity;
 pool.forEach(function(p,i){var id=p&&(p.id||p.name);if(!p||used[id])return;var z=score(p,role,i);if(z>bs){bs=z;best=p;}});
 return best;
}
function inferFormation(players){
 var c={GK:0,DEF:0,MID:0,ATT:0};
 players.forEach(function(p){var q=pos(p);if(/GK|GOL/.test(q))c.GK++;else if(/CB|ZAG|LB|RB|LE|LD|DEF/.test(q))c.DEF++;else if(/DM|VOL|CM|MC|CAM|AM|MEI|LM|RM|ME|MD/.test(q))c.MID++;else c.ATT++;});
 if(c.MID>=5)return '4-2-3-1';
 if(c.ATT>=4)return '4-3-3';
 return '4-4-2';
}
function build(team,players,preferred){
 var pool=(Array.isArray(players)?players:[]).filter(function(p){return p&&available(p);}).slice();
 var formation=(preferred&&FORM[preferred])?preferred:inferFormation(pool),slots=FORM[formation],used={},xi=[];
 slots.forEach(function(slot,i){var p=choose(pool,slot.p,used);if(p){used[p.id||p.name]=true;xi.push(Object.assign({},p,{aiRole:slot.p,x:slot.x,y:slot.y,starter:true}));}});
 if(xi.length<11){
  pool.slice().sort(function(a,b){return rating(b)-rating(a);}).forEach(function(p){
   var id=p.id||p.name;
   if(xi.length>=11||used[id])return;
   used[id]=true;
   var slot=slots[xi.length]||{p:'CM',x:50,y:50};
   xi.push(Object.assign({},p,{aiRole:slot.p,x:slot.x,y:slot.y,starter:true}));
  });
 }
 var bench=pool.filter(function(p){return !used[p.id||p.name];}).sort(function(a,b){return rating(b)-rating(a);}).slice(0,7);
 var avg=xi.reduce(function(n,p){return n+rating(p);},0)/Math.max(1,xi.length);
 var traits={
  amplitude:xi.some(function(p){return /LW|RW|LB|RB/.test(p.aiRole);})?1:0,
  centralProtection:xi.some(function(p){return /DM/.test(p.aiRole);})?1:0,
  depthAttack:xi.some(function(p){return /ST/.test(p.aiRole);})?1:0,
  betweenLines:xi.some(function(p){return /AM/.test(p.aiRole);})?1:0
 };
 var style=avg>=82?'elite':avg>=76?'competitive':'development';
 return {team:team||'Clube',formation:formation,players:xi,bench:bench,average:+avg.toFixed(1),style:style,traits:traits,generatedAt:new Date().toISOString(),source:'roster snapshot + tactical role model'};
}
function get(team,players,preferred){return build(team,players,preferred);}
window.J90_LINEUP_AI={build:build,get:get,formations:FORM};
})();