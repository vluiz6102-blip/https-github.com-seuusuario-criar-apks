/* Jornada 90 Manager AI 2.0
 * Decision layer over the existing lineup/tactical/transfer/contract engines.
 * Adds transfer valuation, agent personality, development planning, opponent scouting,
 * board recommendations and the premium mobile squad/negotiation UX.
 */
(function(){
'use strict';
if(window.__J90_MANAGER_AI_2__)return;
window.__J90_MANAGER_AI_2__=true;

var VERSION='2.0';
var C={bg:'#121722',panel:'#171d2a',line:'#2a3342',text:'#f5f7fa',muted:'#9aa7b8',green:'#00E676',gold:'#ffca3a',red:'#ff6573',blue:'#71a7ff'};

function num(v,d){var n=Number(v);return Number.isFinite(n)?n:d}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function key(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function esc(v){if(typeof window.esc==='function')return window.esc(v);return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])})}
function money(v){return typeof fm==='function'?fm(Math.max(0,Math.round(num(v,0)))):Math.round(num(v,0)).toLocaleString('pt-BR')}
function role(p){var q=String(p&&p.position||p&&p.role||'').toUpperCase();if(/GOL|GK/.test(q))return'GOL';if(/ZAG|CB|DEF/.test(q))return'ZAG';if(/LAT|LB|RB|LE|LD/.test(q))return'LAT';if(/MEI|ME|MC|CM|CAM|VOL|DM/.test(q))return'MEI';return'ATA'}
function rating(p,k,f){var a={pac:['pac','vel','pace'],sho:['sho','fin','finishing'],pas:['pas','pass','passing'],dri:['dri','drible','dribbling'],def:['def','defesa','defending'],phy:['phy','fis','physical']}[k]||[k],i,n;for(i=0;i<a.length;i++){n=Number(p&&p[a[i]]);if(Number.isFinite(n))return n}return num(p&&p.ovr,f==null?68:f)}
function roster(){return Array.isArray(S&&S.roster)?S.roster:[]}
function starters(){var ids=S&&S.lineup&&Array.isArray(S.lineup.slots)?S.lineup.slots.filter(Boolean):[];return ids.map(function(id){return roster().find(function(p){return p&&p.id===id})}).filter(Boolean)}
function ensureState(){if(!S)return null;S.j90ManagerAI=S.j90ManagerAI&&typeof S.j90ManagerAI==='object'?S.j90ManagerAI:{};var a=S.j90ManagerAI;a.version=VERSION;a.transfer=a.transfer||{};a.contract=a.contract||{};a.development=a.development||{};a.opponent=a.opponent||{};a.board=a.board||{};a.history=Array.isArray(a.history)?a.history:[];return a}

function transferAI(p){
 var o=num(p&&p.ovr,65),age=num(p&&p.age,25),potential=num(p&&p.potential,o+8),form=num(p&&p.form,70),morale=num(p&&p.morale,70),years=num(p&&p.years,1),salary=Math.max(1,num(p&&p.salary,Math.max(1,o*.11)));
 var ageFactor=age<=21?1.42:age<=24?1.24:age<=28?1.0:age<=31?.78:age<=34?.53:.34;
 var potentialFactor=1+cl(potential-o,0,25)*.018;
 var performanceFactor=1+(form-70)/420+(morale-70)/700;
 var contractPressure=years<=1?1.15:years<=2?1.07:years>=5?.92:1;
 var value=Math.max(3,Math.round((o*2.65+Math.max(0,o-60)*2.8)*ageFactor*potentialFactor*performanceFactor*contractPressure));
 var wage=Math.max(1,Math.round((o*.11)*(age<=23?1.08:1)*(1+(form-70)/380)));
 var sellerUrgency=cl((age>=30?.22:0)+(years<=1?.28:0)+(form<62?.22:0)+(num(p&&p.transferListed,0)?.20:0),0,1);
 var buyerFit=cl((o-60)/35+(potential-o)/120+(form-55)/260,0,1);
 return {value:value,fairValue:Math.round(value),wage:wage,sellerUrgency:sellerUrgency,buyerFit:buyerFit,form:form,morale:morale,potential:potential,age:age,contractYears:years};
}
function personality(p){
 var o=transferAI(p),seed=key(p&&p.name).split('').reduce(function(a,c){return((a*33+c.charCodeAt(0))>>>0)},7)%100;
 var demanding=cl(.25+(o.value>250?0.30:0)+(o.wage>12?0.12:0)+seed/500,0,1);
 var patient=cl(1-demanding+(o.age>=29?.10:0),0,1);
 var labels=demanding>.68?'Exigente':patient>.66?'Paciente':'Competitivo';
 var walk=cl(20+o.buyerFit*36+o.value/14-demanding*14,18,88);
 return {type:labels,demanding:demanding,patient:patient,walkAway:Math.round(walk)};
}
function clubPower(name){
 var t=0;try{var c=(typeof S!=='undefined'&&S.teams||[]).find(function(x){return x&&x.n===name});t=num(c&&c.s,55)}catch(e){}
 return t||55;
}
function playerInterest(p){
 var base=transferAI(p),pers=personality(p),club=clubPower(p&&p.club),my=clubPower(S&&S.managerClub),roleNeed=0;
 var desiredRole=role(p),xs=starters().filter(function(x){return role(x)===desiredRole;});
 if(xs.length<=1)roleNeed=10;else if(xs.length>=3)roleNeed=-8;
 var playingTime=num(p&&p.age,25)<=23?8:0;
 var domestic=key(p&&p.nationality).indexOf('brasil')>=0&&key(S&&S.managerClub).indexOf('brasil')>=0?4:0;
 var delta=(my-club)*.42+(S&&S.board&&num(S.board.confidence,60)-60)*.08+roleNeed+playingTime+domestic;
 return {interest:Math.round(cl(44+delta+(base.buyerFit*18),8,96)),personality:pers,roleNeed:roleNeed,buyerPower:my,sellerPower:club};
}
function analyseTransfer(p){
 var t=transferAI(p),i=playerInterest(p),budget=num(S&&S.finance&&S.finance.budget,0),can=budget>=t.value;
 var recommendation=t.sellerUrgency>.58?'Negocie abaixo do valor e use parcelas':t.buyerFit>.66?'Prioridade alta para o projeto':'Sondar antes de oferecer';
 return Object.assign({},t,i,{affordable:can,recommendation:recommendation,score:Math.round(cl(50+i.interest*.35+t.buyerFit*34-t.sellerUrgency*8,0,99))});
}

function developmentPlan(){
 var a=ensureState(),ps=roster(),start=starters(),pool=start.length?start:ps.slice(0,11),avg=pool.length?pool.reduce(function(n,p){return n+num(p.ovr,65)},0)/pool.length:65;
 var young=ps.filter(function(p){return num(p.age,25)<=23}).sort(function(a,b){return num(b.potential,b.ovr)-num(a.potential,a.ovr)}).slice(0,3);
 var weak={pac:0,sho:0,pas:0,dri:0,def:0,phy:0},best='pac';
 ['pac','sho','pas','dri','def','phy'].forEach(function(k){weak[k]=pool.length?pool.reduce(function(n,p){return n+rating(p,k,avg)},0)/pool.length:avg});
 best=Object.keys(weak).sort(function(x,y){return weak[x]-weak[y]})[0];
 var focusLabel={pac:'Velocidade',sho:'Finalização',pas:'Passe',dri:'Drible',def:'Defesa',phy:'Físico'}[best];
 var alert=young.length?'Base prioritária: '+young.map(function(p){return p.name}).join(', '):'Priorize o onze principal e a rotação';
 var out={focus:best,focusLabel:focusLabel,average:Math.round(avg),young:young.map(function(p){return p.id}),message:alert};
 a.development=out;
 return out;
}

function opponentAnalysis(){
 var a=ensureState(),opp='',players=[];
 try{if(typeof j90MatchFixtureOpponent==='function')opp=j90MatchFixtureOpponent()}catch(e){}
 if(!opp&&S&&S.fx&&S.r!=null){try{var row=S.fx[S.r]||[];var hit=row.find(function(x){return x[0]===S.me||x[1]===S.me});opp=hit?(hit[0]===S.me?hit[1]:hit[0]):''}catch(e2){}}
 try{players=typeof teamRoster==='function'?teamRoster(opp):[]}catch(e3){players=[]}
 var avg=players.length?players.reduce(function(n,p){return n+num(p.ovr,65)},0)/players.length:65;
 var attack=players.filter(function(p){return role(p)==='ATA'}).sort(function(a,b){return num(b.ovr,0)-num(a.ovr,0)})[0];
 var mid=players.filter(function(p){return role(p)==='MEI'}).sort(function(a,b){return num(b.ovr,0)-num(a.ovr,0)})[0];
 var defense=players.filter(function(p){return role(p)==='ZAG'||role(p)==='LAT'}).sort(function(a,b){return num(b.ovr,0)-num(a.ovr,0)})[0];
 var plan=null;try{plan=window.J90_LINEUP_AI&&window.J90_LINEUP_AI.get?window.J90_LINEUP_AI.get(opp,players,null):null}catch(e4){}
 var style=plan&&plan.style||'competitive',weak=avg<70?'explorar transições':style==='elite'?'evitar perda curta na saída':'atacar costas dos laterais';
 var tactic=avg<68?'ofensiva':avg>80?'equilibrada':'ofensiva com controle';
 var out={team:opp||'Adversário',average:Math.round(avg),topThreat:attack&&attack.name||'Ataque adversário',creator:mid&&mid.name||'Meio-campo adversário',defender:defense&&defense.name||'Linha defensiva',style:style,weakness:weak,recommendedTactic:tactic};
 a.opponent=out;
 return out;
}
function boardAI(){
 var a=ensureState(),inj=roster().filter(function(p){return p&&p.injury}).length,avg=starters().reduce(function(n,p){return n+num(p.ovr,65)},0)/Math.max(1,starters().length),budget=num(S&&S.finance&&S.finance.budget,0),conf=num(S&&S.board&&S.board.confidence,60),last=S&&S.managerHistory&&S.managerHistory[0],trend=last?(last.result==='Vitória'?1:last.result==='Derrota'?-1:0):0;
 var action=inj>=3?'Reduzir carga e proteger o elenco':budget<100?'Controlar gastos e priorizar empréstimos':avg<68?'Buscar reforços de baixo custo':trend<0?'Ajustar tática e recuperar moral':'Manter planejamento e desenvolver jovens';
 var severity=inj>=3||budget<70||conf<35?'alta':inj>=2||trend<0?'média':'baixa';
 a.board={action:action,severity:severity,confidence:conf};
 return a.board;
}

function ensureAnalysis(p){
 var a=ensureState(),x=analyseTransfer(p);a.transfer[x.playerId||p.id||p.name]=x;a.last=x;return x;
}
function safePlayerId(p){return p&&p.id||p&&p.name||''}
function range(k,value){
 if(!S||!S.negotiation)return;
 var n=S.negotiation,v=Math.max(0,Math.round(num(value,0)));n[k]=k==='years'?cl(v,1,6):v;
 var id='j90AIVal_'+k,o=document.getElementById(id);if(o)o.textContent=k==='years'?String(n[k])+' anos':'R$ '+money(n[k]);
 var total=(num(n.fee,0)+num(n.signing,0)+num(n.bonus,0));
 var t=document.getElementById('j90AITotal');if(t)t.textContent='R$ '+money(total);
 var budget=document.getElementById('j90AIBudget');if(budget)budget.textContent=total<=num(S.finance&&S.finance.budget,0)?'Dentro do orçamento':'Acima do orçamento';
}
window.j90AISetRange=range;

function radar(p){
 var vals=[rating(p,'pac'),rating(p,'sho'),rating(p,'pas'),rating(p,'dri'),rating(p,'def'),rating(p,'phy')];
 var cx=100,cy=100,r=68,pts=[],i;
 for(i=0;i<6;i++){var a=(-Math.PI/2)+(Math.PI*2*i/6),rr=r*cl(vals[i],0,100)/100;pts.push((cx+Math.cos(a)*rr).toFixed(1)+','+(cy+Math.sin(a)*rr).toFixed(1))}
 var grid=[];for(i=0;i<6;i++){var ang=(-Math.PI/2)+(Math.PI*2*i/6);grid.push((cx+Math.cos(ang)*r).toFixed(1)+','+(cy+Math.sin(ang)*r).toFixed(1))}
 var labs=['PAC','SHO','PAS','DRI','DEF','PHY'],label='';
 for(i=0;i<6;i++){var ang=(-Math.PI/2)+(Math.PI*2*i/6),lx=cx+Math.cos(ang)*83,ly=cy+Math.sin(ang)*83+3;label+='<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="middle" class="j90RadarLabel">'+labs[i]+'</text>'}
 return '<svg class="j90Radar" viewBox="0 0 200 200" role="img" aria-label="Radar de atributos"><polygon points="'+grid.join(' ')+'" class="j90RadarGrid"></polygon><polygon points="100,32 159,66 159,134 100,168 41,134 41,66" class="j90RadarHex"></polygon><polygon points="'+pts.join(' ')+'" class="j90RadarData"></polygon>'+label+'</svg>';
}

function pitch(p){
 var ids=S&&S.lineup&&Array.isArray(S.lineup.slots)?S.lineup.slots:[],slots=(typeof MGR_FORMATIONS!=='undefined'&&MGR_FORMATIONS[S.lineup&&S.lineup.formation])||[],html='<div class="j90MiniPitch" aria-label="Prancheta tática">';
 ids.forEach(function(id,i){var q=roster().find(function(x){return x&&x.id===id});var z=slots[i]||{x:50,y:50};if(q)html+='<button class="j90MiniSpot '+(p&&q.id===p.id?'on':'')+'" style="left:'+z.x+'%;top:'+(100-z.y)+'%" onclick="window.__J90_SELECTED_PLAYER=&quot;'+esc(q.id)+'&quot;;render(1)" title="'+esc(q.name)+'"><span>'+esc(String(q.name||'').slice(0,2).toUpperCase())+'</span></button>'});
 html+='</div>';return html;
}

function playerProfile(p){
 if(!p)return '';
 var t=transferAI(p),pers=personality(p),d=developmentPlan(),r=role(p),sel=starters().some(function(x){return x.id===p.id});
 return '<div class="j90EliteProfile"><div class="j90EliteTop"><div class="j90EliteIdentity"><span class="j90EliteOVR">'+num(p.ovr,0)+'</span><div><div class="j90EliteKicker">PERFIL DO ATLETA · '+(sel?'TITULAR':'ELENCO')+'</div><h2>'+esc(p.name)+'</h2><div class="j90EliteMeta">'+esc(r)+' · '+num(p.age,25)+' anos · '+esc(p.club||S.managerClub||'Clube')+'</div><div class="j90EliteValue">Valor de mercado estimado <b>R$ '+money(t.fairValue)+'</b></div></div></div><div class="j90EliteBadge">'+esc(p.style||'Perfil')+'</div></div><div class="j90EliteBody"><div class="j90RadarWrap">'+radar(p)+'</div><div class="j90EliteMetrics"><div><span>FORMA</span><b>'+num(p.form,0)+'</b></div><div><span>MORAL</span><b>'+num(p.morale,0)+'</b></div><div><span>POTENCIAL</span><b>'+num(t.potential,0)+'</b></div><div><span>CONTRATO</span><b>'+num(p.years,1)+'a</b></div></div></div><div class="j90ElitePitchRow"><div><div class="j90EliteSection">PRANCHETA</div>'+pitch(p)+'</div><div class="j90AIDecision"><div class="j90EliteSection">IA DO MANAGER</div><b>'+esc(d.focusLabel)+' como foco</b><small>'+esc(d.message)+'</small><button onclick="tab=&quot;market&quot;;render(1)">Encontrar reforços</button></div></div><div class="j90EliteFooter"><span>VALOR</span><b>R$ '+money(t.fairValue)+'</b><span>AGENTE</span><b>'+esc(pers.type)+'</b><span>INTERESSE FUTURO</span><b>'+playerInterest(p).interest+'%</b></div></div>';
}

function negotiationAIView(){
 var n=S&&S.negotiation;if(!n)return '';
 var p=n.renewal?(roster().find(function(x){return x.id===n.playerId})||{}):(typeof j90ContractPlayer==='function'?j90ContractPlayer(n):null)||{};
 var a=analyseTransfer(p),interest=playerInterest(p),tension=cl(num(n.tension,18),0,100),total=num(n.fee,0)+num(n.signing,0)+num(n.bonus,0),maxFee=Math.max(num(n.fee,a.fairValue),a.fairValue*1.45,10),maxSalary=Math.max(num(n.salary,a.wage),a.wage*1.8,10);
 var failed=n.stage==='failed',renew=!!n.renewal;
 n.interest=cl(Math.round((num(n.interest,45)*.45+interest.interest*.55)),8,96);
 var roleFit=n.role==='Titular importante'?'Titular importante':n.role==='Rotação'?'Rotação':'Reserva';
 var advice=a.sellerUrgency>.60?'Vendedor pode ceder com parcelas.':interest.personality.type==='Exigente'?'Agente exige projeto esportivo e salário.':'Negociação equilibrada. Evite elevar a tensão.';
 var b=transferAI(p);
 var h='<section class="j90Negotiation j90AIPage"><div class="j90AIHeader"><button class="j90AIBack" onclick="S.negotiation=null;render(1)">‹ Mercado</button><span>NEGOCIAÇÃO INTELIGENTE</span><span class="j90AIStatus">IA ATIVA</span></div>'+
 '<div class="j90NegotiationGrid"><div class="j90AIProfileCard">'+playerProfile(p)+'</div><div class="j90OfferCard"><div class="j90AIStage"><span class="on">01 SONDAGEM</span><span class="'+(n.stage!=="club"?'on':'')+'">02 CLUBE</span><span class="'+(n.stage==="player"||failed?'on':'')+'">03 ATLETA</span><span class="'+(failed?'on':'')+'">04 FECHO</span></div><div class="j90AIInterest"><div><small>INTERESSE DO ATLETA</small><b>'+Math.round(n.interest)+'%</b></div><div><small>TENSÃO</small><b>'+tension+'%</b></div></div><div class="j90AITension"><i style="width:'+tension+'%"></i></div><div class="j90AIAdvisor"><span>IA AGENTE</span><b>'+esc(interest.personality.type)+'</b><small>'+esc(advice)+'</small></div>'+
 '<div class="j90RangeGrid">'+
 '<label>Taxa de transferência <span id="j90AIVal_fee">R$ '+money(n.fee)+'</span><input type="range" min="0" max="'+Math.ceil(maxFee)+'" step="1" value="'+num(n.fee,0)+'" oninput="j90AISetRange(\'fee\',this.value)"></label>'+
 '<label>Salário mensal <span id="j90AIVal_salary">R$ '+money(n.salary)+'</span><input type="range" min="1" max="'+Math.ceil(maxSalary)+'" step="1" value="'+Math.max(1,num(n.salary,a.wage))+'" oninput="j90AISetRange(\'salary\',this.value)"></label>'+
 '<label>Duração <span id="j90AIVal_years">'+num(n.years,4)+' anos</span><input type="range" min="1" max="6" step="1" value="'+cl(num(n.years,4),1,6)+'" oninput="j90AISetRange(\'years\',this.value)"></label>'+
 '<label>Luvas <span id="j90AIVal_signing">R$ '+money(n.signing)+'</span><input type="range" min="0" max="'+Math.ceil(Math.max(10,a.fairValue*.35))+'" step="1" value="'+num(n.signing,0)+'" oninput="j90AISetRange(\'signing\',this.value)"></label>'+
 '<label>Bônus <span id="j90AIVal_bonus">R$ '+money(n.bonus)+'</span><input type="range" min="0" max="'+Math.ceil(Math.max(10,a.fairValue*.20))+'" step="1" value="'+num(n.bonus,0)+'" oninput="j90AISetRange(\'bonus\',this.value)"></label>'+
 '<label>Cláusula de saída <span id="j90AIVal_release">R$ '+money(n.release)+'</span><input type="range" min="0" max="'+Math.ceil(Math.max(10,a.fairValue*2.2))+'" step="1" value="'+num(n.release,0)+'" oninput="j90AISetRange(\'release\',this.value)"></label>'+
 '</div><div class="j90DealSummary j90AISummary"><div><small>CUSTO INICIAL</small><b id="j90AITotal">R$ '+money(total)+'</b></div><div><small>VALOR JUSTO</small><b>R$ '+money(b.fairValue)+'</b></div><div><small>ORÇAMENTO</small><b id="j90AIBudget">'+(total<=num(S.finance&&S.finance.budget,0)?'Dentro do orçamento':'Acima do orçamento')+'</b></div></div>'+
 '<div class="j90RoleRow"><span>Papel no elenco</span>'+['Titular importante','Rotação','Reserva'].map(function(x){return '<button class="'+(x===roleFit?'on':'')+'" onclick="j90NegRole(&quot;'+x+'&quot;)">'+x+'</button>'}).join('')+'</div><div class="j90ContractActions j90AIActions"><button onclick="j90NegotiateStage(\'probe\')">Sondar</button><button onclick="j90NegotiateStage(\'club\')">Avançar</button><button class="primary" onclick="j90NegotiateStage(\'final\')" '+(failed?'disabled':'')+'>'+(renew?'Renovar contrato':'Enviar proposta')+'</button></div></div></div></section>';
 return h;
}

function injectStyles(){
 if(document.getElementById('j90-manager-ai-style'))return;
 var s=document.createElement('style');s.id='j90-manager-ai-style';
 s.textContent=':root{--j90-ai-bg:'+C.bg+';--j90-ai-panel:'+C.panel+';--j90-ai-line:'+C.line+';--j90-ai-text:'+C.text+';--j90-ai-muted:'+C.muted+';--j90-ai-green:'+C.green+'}'+
 '.j90EliteProfile,.j90OfferCard{background:var(--j90-ai-bg);border:1px solid var(--j90-ai-line);border-radius:20px;box-shadow:0 14px 38px rgba(0,0,0,.26);overflow:hidden}'+
 '.j90EliteTop{padding:18px 18px 12px}.j90EliteIdentity{display:flex;gap:14px;align-items:center}.j90EliteOVR{font:900 42px/1 system-ui,sans-serif;color:'+C.green+';min-width:54px;text-align:center}.j90EliteKicker,.j90EliteSection{font:700 10px/1.2 system-ui,sans-serif;letter-spacing:1.4px;color:'+C.muted+'}.j90EliteTop h2{font-size:28px;margin:4px 0 4px;color:'+C.text+'}.j90EliteMeta{font-size:13px;color:'+C.muted+'}.j90EliteValue{margin-top:7px;font-size:12px;color:'+C.muted+'}.j90EliteValue b{color:'+C.text+'}.j90EliteBadge{margin-left:auto;border:1px solid rgba(0,230,118,.35);color:'+C.green+';border-radius:999px;padding:8px 10px;font-size:10px;white-space:nowrap}.j90EliteBody{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:6px 18px 18px}.j90RadarWrap{display:grid;place-items:center;min-height:188px}.j90Radar{width:100%;max-width:205px}.j90RadarGrid{fill:rgba(0,230,118,.05);stroke:'+C.line+';stroke-width:1}.j90RadarHex{fill:none;stroke:'+C.line+';stroke-width:1}.j90RadarData{fill:rgba(0,230,118,.19);stroke:'+C.green+';stroke-width:3}.j90RadarLabel{fill:'+C.muted+';font:700 9px system-ui,sans-serif}.j90EliteMetrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:center}.j90EliteMetrics div{border:1px solid '+C.line+';border-radius:12px;padding:10px;background:'+C.panel+'}.j90EliteMetrics span{display:block;font-size:9px;color:'+C.muted+';letter-spacing:1px}.j90EliteMetrics b{display:block;font-size:20px;margin-top:3px;color:'+C.text+'}.j90ElitePitchRow{display:grid;grid-template-columns:1.2fr 1fr;gap:12px;padding:0 18px 18px}.j90MiniPitch{position:relative;height:190px;border-radius:14px;background:linear-gradient(180deg,#174f36,#0e3a28);border:1px solid rgba(0,230,118,.20);overflow:hidden}.j90MiniPitch:before{content:"";position:absolute;inset:10%;border:1px solid rgba(255,255,255,.3);border-radius:7px}.j90MiniPitch:after{content:"";position:absolute;left:50%;top:10%;bottom:10%;border-left:1px solid rgba(255,255,255,.25)}.j90MiniSpot{position:absolute!important;transform:translate(-50%,-50%);width:34px!important;height:34px!important;min-height:34px!important;padding:0!important;border-radius:50%!important;border:1px solid rgba(255,255,255,.65)!important;background:#1d2632!important;color:#fff!important;font-size:10px!important;z-index:2}.j90MiniSpot.on{background:'+C.green+'!important;color:#03140b!important;border-color:'+C.green+'!important;box-shadow:0 0 0 5px rgba(0,230,118,.16)!important}.j90AIDecision{border:1px solid '+C.line+';border-radius:14px;padding:12px;background:'+C.panel+';display:flex;flex-direction:column;justify-content:center;gap:7px}.j90AIDecision b{font-size:14px}.j90AIDecision small{color:'+C.muted+';font-size:11px;line-height:1.4}.j90AIDecision button{margin-top:3px;min-height:44px;border:1px solid rgba(0,230,118,.32);background:rgba(0,230,118,.08);color:'+C.green+';border-radius:10px}.j90EliteFooter{display:grid;grid-template-columns:auto 1fr auto 1fr auto 1fr;gap:7px;padding:12px 18px;border-top:1px solid '+C.line+';font-size:10px;color:'+C.muted+';align-items:center}.j90EliteFooter b{font-size:12px;color:'+C.text+'}'+
 '.j90AIPage{max-width:100%;padding-bottom:24px}.j90AIHeader{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:2px 0 12px;font-size:11px;font-weight:800;letter-spacing:1.4px;color:'+C.muted+'}.j90AIBack{background:none;border:0!important;color:'+C.text+';padding:8px 0!important;min-height:40px!important;font-size:14px!important}.j90AIStatus{color:'+C.green+';border:1px solid rgba(0,230,118,.28);padding:7px 9px;border-radius:999px}.j90NegotiationGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.j90AIProfileCard{min-width:0}.j90AIProfileCard>.j90EliteProfile{height:100%}.j90OfferCard{padding:18px}.j90AIStage{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:14px}.j90AIStage span{padding:8px 6px;border:1px solid '+C.line+';border-radius:8px;font-size:9px;text-align:center;color:'+C.muted+'}.j90AIStage span.on{border-color:rgba(0,230,118,.38);background:rgba(0,230,118,.07);color:'+C.green+'}.j90AIInterest{display:grid;grid-template-columns:1fr 1fr;gap:9px}.j90AIInterest div{border:1px solid '+C.line+';border-radius:12px;padding:11px}.j90AIInterest small{display:block;color:'+C.muted+';font-size:9px;letter-spacing:1px}.j90AIInterest b{font-size:25px;display:block;margin-top:2px}.j90AITension{height:8px;margin:10px 0 14px;background:#242b37;border-radius:999px;overflow:hidden}.j90AITension i{display:block;height:100%;background:'+C.green+'}.j90AIAdvisor{border:1px solid '+C.line+';border-radius:12px;padding:11px;margin-bottom:14px;background:'+C.panel+'}.j90AIAdvisor span{color:'+C.green+';font-size:9px;font-weight:800;letter-spacing:1px}.j90AIAdvisor b{display:block;font-size:14px;margin-top:3px}.j90AIAdvisor small{display:block;color:'+C.muted+';font-size:11px;line-height:1.4;margin-top:4px}.j90RangeGrid{display:grid;gap:12px}.j90RangeGrid label{font-size:12px;color:'+C.muted+';margin:0}.j90RangeGrid label span{float:right;color:'+C.text+';font-weight:800}.j90RangeGrid input[type=range]{width:100%;height:34px;margin:7px 0 0;padding:0;background:transparent;accent-color:'+C.green+';min-height:34px}.j90RangeGrid input[type=range]::-webkit-slider-runnable-track{height:6px;background:#303846;border-radius:999px}.j90RangeGrid input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;margin-top:-8px;width:22px;height:22px;border-radius:50%;background:'+C.green+';border:3px solid '+C.bg+'}.j90AISummary{display:grid!important;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px!important}.j90AISummary>div{border:1px solid '+C.line+';border-radius:12px;padding:10px;background:'+C.panel+'}.j90AISummary small{display:block;color:'+C.muted+';font-size:8px;letter-spacing:1px}.j90AISummary b{display:block;margin-top:4px;font-size:13px;line-height:1.2}.j90RoleRow{margin-top:14px;border-top:1px solid '+C.line+';padding-top:12px}.j90RoleRow>span{display:block;color:'+C.muted+';font-size:10px;letter-spacing:1px;margin-bottom:7px}.j90RoleRow button{width:100%;margin-top:6px;min-height:46px;border:1px solid '+C.line+';background:'+C.panel+';color:'+C.text+';border-radius:10px}.j90RoleRow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}.j90RoleRow>span{grid-column:1/-1}.j90RoleRow button{margin:0}.j90RoleRow button.on{border-color:'+C.green+';background:rgba(0,230,118,.08);color:'+C.green+'}.j90AIActions{display:grid!important;grid-template-columns:1fr 1fr 1.3fr;gap:8px;margin-top:16px}.j90AIActions button{min-height:50px!important}.j90AIActions .primary{background:'+C.green+'!important;color:#03140b!important;border-color:'+C.green+'!important}'+
 '.j90AIMarketInsight{margin-bottom:12px;padding:14px;border:1px solid '+C.line+';border-radius:16px;background:'+C.bg+'}.j90AIMarketInsight .top{display:flex;justify-content:space-between;gap:8px;align-items:center}.j90AIMarketInsight b{font-size:14px}.j90AIMarketInsight small{display:block;color:'+C.muted+';font-size:11px;line-height:1.4;margin-top:6px}.j90AIMarketInsight .chips{display:flex!important;flex-wrap:wrap;gap:7px!important;margin-top:9px}.j90AIMarketInsight .chips span{border:1px solid '+C.line+';padding:6px 8px;border-radius:999px;font-size:10px;color:'+C.muted+'}.j90AIMarketInsight .chips span strong{color:'+C.text+'}'+
 '@media(max-width:760px){.j90NegotiationGrid{grid-template-columns:1fr}.j90EliteBody{grid-template-columns:1fr 1fr}.j90ElitePitchRow{grid-template-columns:1fr}.j90AIHeader{grid-template-columns:auto 1fr auto}.j90AIMarketInsight .top{align-items:flex-start}.j90EliteTop h2{font-size:24px}}'+
 '@media(max-width:420px){.j90EliteTop{padding:15px 13px 10px}.j90EliteBody,.j90ElitePitchRow{padding-left:13px;padding-right:13px}.j90EliteFooter{grid-template-columns:auto 1fr auto 1fr;gap:6px}.j90EliteFooter span:nth-of-type(3),.j90EliteFooter b:nth-of-type(3){display:none}.j90EliteOVR{font-size:34px;min-width:46px}.j90EliteBadge{display:none}.j90AIStage span{font-size:8px;padding:7px 2px}.j90OfferCard{padding:13px}.j90AISummary{grid-template-columns:1fr!important}.j90AIActions{grid-template-columns:1fr!important}.j90RoleRow{grid-template-columns:1fr!important}.j90RoleRow>span{grid-column:auto}.j90RoleRow button{min-height:46px}.j90MiniPitch{height:210px}}';
 document.head.appendChild(s);
}

function marketInject(html){
 var all=[],top=[];
 try{all=mgrMarketFiltered();top=all.map(function(p){var x=analyseTransfer(p);return {p:p,a:x}}).sort(function(a,b){return b.a.score-a.a.score}).slice(0,3)}catch(e){return html}
 if(!top.length)return html;
 var cards=top.map(function(x){return '<span><strong>'+esc(x.p.name)+'</strong> · '+role(x.p)+' · '+Math.round(x.a.score)+'% ajuste</span>'}).join('');
 var lead=top[0],desc=lead.a.recommendation+' · valor justo R$ '+money(lead.a.fairValue)+' · interesse '+lead.a.interest+'%.';
 var block='<div class="j90AIMarketInsight"><div class="top"><b>RADAR DE MERCADO · IA</b><b style="color:'+C.green+'">'+esc(lead.p.name)+'</b></div><small>'+esc(desc)+'</small><div class="chips">'+cards+'</div></div>';
 var marker='<div class="j90MgrCard">';
 return html.replace(marker,block+marker);
}

function install(){
 injectStyles();ensureState();developmentPlan();opponentAnalysis();boardAI();
 if(typeof j90SquadView==='function'&&!j90SquadView.__j90ManagerAI){
   var oldSquad=j90SquadView;
   var wrapSquad=function(){
     var html=oldSquad.apply(this,arguments);
     var selectedId=window.__J90_SELECTED_PLAYER||(S.lineup&&S.lineup.slots&&S.lineup.slots[0]);
     var p=roster().find(function(x){return x&&x.id===selectedId})||starters()[0];
     if(p)html=html.replace('<section class="j90RosterHub">','<section class="j90RosterHub"><div class="j90MgrCard j90AISelectedWrap">'+playerProfile(p)+'</div>');
     return html;
   };
   wrapSquad.__j90ManagerAI=true;wrapSquad.__original=oldSquad;j90SquadView=wrapSquad;window.j90SquadView=wrapSquad;
 }
 if(typeof j90NegotiationView==='function'&&!j90NegotiationView.__j90ManagerAI){
   var oldNeg=j90NegotiationView;
   var wrapNeg=function(){return negotiationAIView()};
   wrapNeg.__j90ManagerAI=true;wrapNeg.__original=oldNeg;j90NegotiationView=wrapNeg;window.j90NegotiationView=wrapNeg;
 }
 if(typeof mgrMarket==='function'&&!mgrMarket.__j90ManagerAI){
   var oldMarket=mgrMarket;
   var wrapMarket=function(){return marketInject(oldMarket.apply(this,arguments));};
   wrapMarket.__j90ManagerAI=true;wrapMarket.__original=oldMarket;mgrMarket=wrapMarket;window.mgrMarket=wrapMarket;
 }
 if(typeof mgrBuy==='function'&&!mgrBuy.__j90ManagerAI){
   var oldBuy=mgrBuy;
   var wrapBuy=function(i){
     var q;try{q=mgrMarketFiltered()[i]}catch(e){q=null}
     if(q){var a=analyseTransfer(q);q.transferValue=Math.max(num(q.transferValue,0),a.fairValue);q.interest=a.interest;ensureState().transfer[safePlayerId(q)]=a}
     return oldBuy.apply(this,arguments);
   };
   wrapBuy.__j90ManagerAI=true;wrapBuy.__original=oldBuy;mgrBuy=wrapBuy;window.mgrBuy=wrapBuy;
 }
 if(typeof j90OpenContract==='function'&&!j90OpenContract.__j90ManagerAI){
   var oldOpen=j90OpenContract;
   var wrapOpen=function(p,price){
     var a=p&&analyseTransfer(p);
     var out=oldOpen.apply(this,[p,price||((a&&a.fairValue)||0)]);
     if(S&&S.negotiation&&a){
       S.negotiation.interest=Math.round(a.interest);
       S.negotiation.ai={fairValue:a.fairValue,wage:a.wage,sellerUrgency:a.sellerUrgency,personality:a.personality,recommendation:a.recommendation,score:a.score};
       S.negotiation.fee=Math.round(cl(num(S.negotiation.fee,a.fairValue),0,Math.max(a.fairValue*1.55,a.fairValue+5)));
       S.negotiation.salary=Math.max(num(S.negotiation.salary,1),a.wage);
       S.j90ManagerAI.last=a;
       ensureState().history.unshift({r:num(S.managerRound,0),player:p.name,score:a.score,at:Date.now()});
       ensureState().history=ensureState().history.slice(0,30);
     }
     return out;
   };
   wrapOpen.__j90ManagerAI=true;wrapOpen.__original=oldOpen;j90OpenContract=wrapOpen;window.j90OpenContract=wrapOpen;
 }
 if(typeof mgrStartMatch==='function'&&!mgrStartMatch.__j90ManagerAI){
   var oldStart=mgrStartMatch;
   var wrapStart=async function(){
     var out=await oldStart.apply(this,arguments);
     try{if(S&&S.match2d){var o=opponentAnalysis();var a=ensureState();S.match2d.aiBriefing=o;S.match2d.aiBriefingGeneratedAt=Date.now();a.lastOpponent=o}}catch(e){}
     return out;
   };
   wrapStart.__j90ManagerAI=true;wrapStart.__original=oldStart;mgrStartMatch=wrapStart;window.mgrStartMatch=wrapStart;
 }
 return true;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
var tries=0;(function retry(){if(install()||tries++>80)return;setTimeout(retry,60)})();
window.J90ManagerAI={version:VERSION,transfer:analyseTransfer,development:developmentPlan,opponent:opponentAnalysis,board:boardAI,install:install};
})();