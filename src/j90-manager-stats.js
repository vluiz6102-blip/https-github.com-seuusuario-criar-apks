/* Jornada 90 Manager Stats 1.0 */
(function(){
'use strict';
if(window.__J90_MANAGER_STATS__)return;
window.__J90_MANAGER_STATS__=true;
var V=1;
var ST={
 flamengo:{name:'Maracanã',capacity:78838,pressure:.98},
 corinthians:{name:'Neo Química Arena',capacity:49205,pressure:.99},
 palmeiras:{name:'Allianz Parque',capacity:43713,pressure:.91},
 'real madrid':{name:'Santiago Bernabéu',capacity:76000,pressure:.88},
 goias:{name:'Estádio da Serrinha',capacity:14525,pressure:.76},
 'vila nova':{name:'OBA',capacity:11000,pressure:.82},
 novorizontino:{name:'Jorge Ismael de Biasi',capacity:12500,pressure:.78},
 'operario pr':{name:'Germano Krüger',capacity:10300,pressure:.80},
 chapecoense:{name:'Arena Condá',capacity:19700,pressure:.79},
 avai:{name:'Ressacada',capacity:17800,pressure:.80},
 sport:{name:'Ilha do Retiro',capacity:32000,pressure:.90},
 ceara:{name:'Arena Castelão',capacity:63000,pressure:.88},
 coritiba:{name:'Couto Pereira',capacity:40502,pressure:.84},
 'america mg':{name:'Independência',capacity:23000,pressure:.77}
};
function n(v,d){v=Number(v);return Number.isFinite(v)?v:d}
function key(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function hash(s){var h=2166136261>>>0;String(s||'').split('').forEach(function(c){h^=c.charCodeAt(0);h=Math.imul(h,16777619)});return h>>>0}
function role(p){var x=String(p&&p.position||p&&p.role||'').toUpperCase();if(/GOL|GK|GOAL/.test(x))return'GK';if(/ZAG|CB|LAT|LD|LE|RB|LB|DEF/.test(x))return'DEF';if(/MEI|MC|VOL|MD|ME|MID|CAM|CM|DM/.test(x))return'MID';return'ATT'}
function roster(team){
 try{
  var all=window.J90_ROSTERS||{},r=all[team];
  if(r&&Array.isArray(r.players))return r.players;
  var k=key(team),names=Object.keys(all);
  for(var i=0;i<names.length;i++){if(key(names[i])===k&&all[names[i]]&&Array.isArray(all[names[i]].players))return all[names[i]].players}
 }catch(e){}
 return [];
}
function pool(team){
 var r=roster(team),h=hash(team);
 if(!r.length)for(var i=0;i<11;i++)r.push({id:'f'+h+'_'+i,name:'Jogador '+(i+1),position:i===0?'GOL':i<5?'ZAG':i<8?'MEI':'ATA',ovr:55+(h+i*11)%18});
 return r.map(function(p,i){return Object.assign({},p,{_id:String(p.id==null?key(team)+'_'+i:p.id),_role:role(p),_team:team})}).filter(function(p){return p.name});
}
function weight(p,assist){var o=n(p.ovr,65),r=p._role;return Math.max(.2,(o-35)/30)*(assist?(r==='MID'?2.3:r==='ATT'?1.25:r==='DEF'?.3:.05):(r==='ATT'?2.8:r==='MID'?1.35:r==='DEF'?.4:.06))}
function pick(a,w,seed){
 if(!a.length)return null;
 var total=a.reduce(function(s,p){return s+w(p)},0),x=(Math.abs(Math.sin(seed*12.9898))*43758.5453%1)*total;
 for(var i=0;i<a.length;i++){x-=w(a[i]);if(x<=0)return a[i]}
 return a[a.length-1];
}
function season(){
 if(typeof S==='undefined'||!S)return null;
 var y=n(S.year,2026);
 if(!S.managerStats||S.managerStats.version!==V)S.managerStats={version:V,year:y,players:{},competitions:{},matches:0};
 if(n(S.managerStats.year,y)!==y){
  S.managerStatsHistory=S.managerStatsHistory||[];
  S.managerStatsHistory.unshift(S.managerStats);S.managerStatsHistory=S.managerStatsHistory.slice(0,8);
  S.managerStats={version:V,year:y,players:{},competitions:{},matches:0};
 }
 return S.managerStats;
}
function rec(book,p,team,g,a){
 var r=book[p._id]||(book[p._id]={id:p._id,name:p.name,team:team,position:p.position||'',goals:0,assists:0});
 r.goals+=g;r.assists+=a;return r;
}
function board(c){
 if(!c)return;
 var teams=[S&&S.club&&S.club.n,c.opp],old={};
 (c.sc||[]).forEach(function(x){if(x&&x.id)old[x.id]=x});
 var out=[];
 teams.forEach(function(team){
  pool(team).forEach(function(p){
   var x=old[p._id]||{id:p._id,n:p.name,team:team,position:p.position||'',g:0,a:0};
   x.n=p.name;x.team=team;out.push(x);
  });
 });
 c.sc=out;
}
function record(teamA,teamB,ga,gb,cid,c){
 var s=season();if(!s)return;
 var comp=cid?(s.competitions[cid]||(s.competitions[cid]={players:{},matches:0})):s;
 comp.players=comp.players||{};
 if(c)board(c);
 var seed=hash(teamA+'|'+teamB+'|'+n(S.managerRound,0)+'|'+n(S.year,2026)+'|'+n(s.matches,0));
 function goals(team,total,off){
  var arr=pool(team);
  for(var i=0;i<Math.max(0,Math.round(total));i++){
   var scorer=pick(arr,function(p){return weight(p,false)},seed+off+i*17.31);
   if(!scorer)continue;
   rec(comp.players,scorer,team,1,0);
   var row=c&&c.sc&&c.sc.find(function(x){return x.id===scorer._id});if(row)row.g=n(row.g,0)+1;
   var chance=.70+(n(scorer.ovr,65)>=78?.08:0);
   if(Math.abs(Math.sin(seed+off+i*4.7))<chance){
    var cand=arr.filter(function(p){return p._id!==scorer._id});
    var as=pick(cand,function(p){return weight(p,true)},seed+off+i*31.7+3);
    if(as){
     rec(comp.players,as,team,0,1);
     var ar=c&&c.sc&&c.sc.find(function(x){return x.id===as._id});if(ar)ar.a=n(ar.a,0)+1;
    }
   }
  }
 }
 goals(teamA,ga,1.7);goals(teamB,gb,2.9);
 s.matches++;comp.matches=n(comp.matches,0)+1;
}
function competitionScorers(team){return pool(team).map(function(p){return{id:p._id,n:p.name,team:team,position:p.position||'',g:0,a:0}}).slice(0,22)}
function stadium(team){var k=key(team),p=ST[k];if(p)return Object.assign({team:team},p);var h=hash(team);return{team:team,name:'Estádio '+team,capacity:8500+(h%42000),pressure:.56+(h%34)/100}}
function wrap(name,fn){
 if(typeof window[name]!=='function'||window[name].__j90Stats)return;
 var old=window[name],w=fn(old);w.__j90Stats=true;w.__original=old;window[name]=w;
}
function boot(){
 if(typeof competitionScorers!=='function')window.competitionScorers=competitionScorers;
 wrap('compSetup',function(old){return function(){var out=old.apply(this,arguments);try{(S.comps||[]).forEach(function(c){board(c);c.stadium=stadium(S.club.n);c.crowdPressure=Math.min(1,c.stadium.pressure+(/flamengo|corinthians|palmeiras|real madrid|barcelona|liverpool|bayern|psg/.test(key(c.opp))?.12:0));if(c.id==='cdb'&&c.round===0&&S.club.tier===1){var draw=['Flamengo','Palmeiras','Corinthians','São Paulo'];c.opp=draw[hash(S.club.n)%draw.length];c.stadium=stadium(S.club.n);c.crowdPressure=Math.min(1,c.stadium.pressure+(/flamengo|corinthians|palmeiras|real madrid|barcelona|liverpool|bayern|psg/.test(key(c.opp))?.12:0));board(c)}})}catch(e){}return out}});
 wrap('compResult',function(old){return function(c){var pressure=n(c&&c.crowdPressure,0),big=/flamengo|corinthians|palmeiras|real madrid|barcelona|liverpool|bayern|psg/.test(key(c&&c.opp));var lower=typeof S!=='undefined'&&S&&S.club&&S.club.tier===1;var out=old.apply(this,arguments);if(out&&out.last){if(c&&c.id==='cdb'&&c.round===1&&lower&&big){var swing=(Math.abs(Math.sin(hash(S.club.n)+'|'+n(S.managerRound,0)))*43758.5453%1);if(swing<pressure*.22)out.last.my++;if(swing>.82&&pressure>.8&&out.last.og>0)out.last.og--;}var team=S.club.n,opp=out.last.opp||c.opp;var id='competition:'+String(c.id||c.name||'cup');c.sc=[];record(team,opp,n(out.last.my,0),n(out.last.og,0),id,c)}return out}});
 wrap('sim',function(old){return function(h,a){var g=old.apply(this,arguments);try{record(S.teams[h].n,S.teams[a].n,n(g[0],0),n(g[1],0),'league:'+String(S.year),null)}catch(e){}return g}});
 wrap('compV',function(old){return function(){var html=old.apply(this,arguments);try{var c=S&&S.comps&&S.comps[S.cmp];if(c&&c.sc){var g=c.sc.filter(function(x){return n(x.g,0)>0}).sort(function(a,b){return n(b.g,0)-n(a.g)||n(b.a,0)-n(a.a,0)}).slice(0,8);var a=c.sc.filter(function(x){return n(x.a,0)>0}).sort(function(x,y){return n(y.a,0)-n(x.a,0)||n(y.g,0)-n(x.g,0)}).slice(0,8);var block='<div class="j90StatsGrid"><div><b>Artilharia</b>'+ (g.length?g.map(function(x,i){return '<div class="row"><span>'+(i+1)+'. '+x.n+'</span><b>'+x.g+'</b></div>'}).join(''):'<p class="mu">Nenhum gol.</p>')+'</div><div><b>Assistências</b>'+ (a.length?a.map(function(x,i){return '<div class="row"><span>'+(i+1)+'. '+x.n+'</span><b>'+x.a+'</b></div>'}).join(''):'<p class="mu">Nenhuma assistência.</p>')+'</div></div>';html=html.replace(/<div style="margin-top:8px"><b>Artilharia<\/b>[\s\S]*?<\/div><\/div>/,block);var st=c.stadium;if(st){var pressure=Math.round(n(c.crowdPressure,st.pressure)*100);html=html.replace(/<p class="mu">Próximo adversário: /,'<p class="mu">Estádio: '+st.name+' · '+Math.round(st.capacity/1000)+' mil lugares · pressão da torcida '+pressure+'%<\/p><p class="mu">Próximo adversário: ')}}}catch(e){}return html}});
 if(!document.getElementById('j90-manager-stats-style')){var s=document.createElement('style');s.id='j90-manager-stats-style';s.textContent='.j90StatsGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.j90StatsGrid>div{border:1px solid #242424;border-radius:10px;padding:9px;background:#070707}.j90StatsGrid .row{min-height:30px;padding:5px 0;font-size:11px}@media(max-width:560px){.j90StatsGrid{grid-template-columns:1fr}}';document.head.appendChild(s)}
}
window.J90ManagerStats={version:V,stadium:stadium,competitionScorers:competitionScorers,leaderboard:function(c,f){return(c&&c.sc||[]).slice().sort(function(a,b){return n(b[f||'g'],0)-n(a[f||'g'],0)})},state:season};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
Promise.resolve().then(boot);
})();