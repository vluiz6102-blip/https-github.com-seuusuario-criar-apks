export type Position = "GOL" | "DEF" | "MEI" | "ATA";
export type Formation = "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1";
export type Tactic = "equilibrada" | "ofensiva" | "defensiva" | "posse" | "contra-ataque" | "pressao";
export type Screen = "inicio" | "elenco" | "taticas" | "calendario" | "mercado" | "clube" | "partida";
export type MatchPhase = "first-half" | "halftime" | "second-half" | "extra-time-break" | "extra-time" | "extra-time-halftime" | "full-time";
export interface Player { id:string; name:string; age:number; position:Position; overall:number; potential:number; finishing:number; passing:number; defending:number; pace:number; stamina:number; handling:number; creativity:number; fitness:number; value:number; wage:number; goals:number; assists:number; appearances:number; clubId:string; }
export interface Club { id:string; name:string; shortName:string; city:string; stadium:string; strength:number; budget:number; wageBudget:number; supporters:number; formation:Formation; tactic:Tactic; players:Player[]; }
export interface Fixture { id:string; round:number; competition:string; homeClubId:string; awayClubId:string; knockout:boolean; played:boolean; homeScore?:number; awayScore?:number; }
export interface MatchEvent { id:string; minute:number; kind:"goal"|"shot"|"card"|"sub"|"chance"|"whistle"|"text"; text:string; teamId?:string; playerId?:string; }
export interface MatchStats { shots:number; onTarget:number; possession:number; passes:number; corners:number; fouls:number; yellowCards:number; }
export interface MatchState { fixtureId:string; homeClubId:string; awayClubId:string; competition:string; knockout:boolean; minute:number; phase:MatchPhase; homeScore:number; awayScore:number; homeLineup:string[]; awayLineup:string[]; condition:Record<string,number>; homeStats:MatchStats; awayStats:MatchStats; events:MatchEvent[]; homeSubs:number; awaySubs:number; homeTactic:Tactic; awayTactic:Tactic; homeFormation:Formation; awayFormation:Formation; finishedApplied:boolean; nextEventId:number; }
export interface NewsItem { id:string; day:number; title:string; body:string; tag:"clube"|"mercado"|"partida"|"base"; }
export interface Career { schemaVersion:1; season:number; day:number; managerName:string; managerNickname:string; clubId:string; screen:Screen; clubs:Club[]; fixtures:Fixture[]; transferMarket:Player[]; news:NewsItem[]; currentMatch:MatchState|null; nextNewsId:number; }

const firstNames = ["Lucas","Gabriel","Mateus","Rafael","Bruno","Caio","Pedro","João","Enzo","Davi","Henrique","André","Miguel","Thiago","Vitor","Felipe","Murilo","Arthur","Cauã","Diego","Samuel","Nicolas","Lorenzo","Gustavo","Luan","Eduardo","Daniel","Yuri","Ícaro","Leandro","Alex","Renan","Heitor","Marcos","Otávio","Wesley"];
const lastNames = ["Almeida","Barbosa","Cardoso","Dias","Ferreira","Gomes","Lopes","Mendes","Nunes","Oliveira","Pereira","Ramos","Ribeiro","Silva","Souza","Teixeira","Vieira","Costa","Martins","Azevedo","Rocha","Freitas","Campos","Machado","Monteiro","Moraes","Farias","Borges","Prado","Tavares","Batista","Melo"];
const clubSpecs = [
{id:"pato-branco",name:"Pato Branco FC",shortName:"PATO",city:"Pato Branco",stadium:"Arena das Araucárias",strength:69,budget:8200000,wageBudget:245000,supporters:18500},
{id:"aurora",name:"Aurora Esporte Clube",shortName:"AUR",city:"Curitiba",stadium:"Estádio Aurora",strength:78,budget:14500000,wageBudget:410000,supporters:68000},
{id:"serrano",name:"Atlético Serrano",shortName:"SER",city:"Guarapuava",stadium:"Caldeirão Serrano",strength:66,budget:6700000,wageBudget:210000,supporters:23000},
{id:"vale",name:"União do Vale",shortName:"UNI",city:"Cascavel",stadium:"Parque do Vale",strength:64,budget:6100000,wageBudget:180000,supporters:21000},
{id:"oeste",name:"Estrela do Oeste",shortName:"EST",city:"Toledo",stadium:"Estádio das Estrelas",strength:62,budget:5200000,wageBudget:165000,supporters:16000},
{id:"central",name:"Ferroviário Central",shortName:"FER",city:"Londrina",stadium:"Vila Central",strength:74,budget:10700000,wageBudget:315000,supporters:44000},
{id:"araucarias",name:"Real das Araucárias",shortName:"REA",city:"Ponta Grossa",stadium:"Bosque Real",strength:71,budget:9300000,wageBudget:285000,supporters:36000},
{id:"vila-nova",name:"Vila Nova do Sul",shortName:"VNS",city:"Francisco Beltrão",stadium:"Estádio da Vila",strength:59,budget:4600000,wageBudget:142000,supporters:12500}
] as const;

function seeded(seed:number):()=>number { let state=seed>>>0; return ()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;}; }
function clamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value));}
function pick<T>(arr:readonly T[],random:()=>number):T{return arr[Math.floor(random()*arr.length)]!;}
function playerName(random:()=>number):string{return pick(firstNames,random)+" "+pick(lastNames,random);}
function makePlayer(id:string,clubId:string,position:Position,target:number,random:()=>number,age?:number):Player {
 const overall=clamp(Math.round(target+(random()*18-9)),42,89);
 const potential=clamp(overall+Math.round(random()*17),overall,94);
 const finishing=clamp(overall+(position==="ATA"?7:position==="MEI"?1:-10)+Math.round(random()*10-5),35,95);
 const passing=clamp(overall+(position==="MEI"?8:position==="DEF"?0:-5)+Math.round(random()*10-5),35,95);
 const defending=clamp(overall+(position==="DEF"?8:position==="GOL"?2:-11)+Math.round(random()*10-5),30,95);
 const handling=clamp(overall+(position==="GOL"?17:-25)+Math.round(random()*8-4),25,96);
 const playerAge=age??17+Math.floor(random()*18);
 const value=Math.round(Math.pow(Math.max(1,overall-35),2.1)*680+Math.max(0,potential-overall)*28000);
 return {id,name:playerName(random),age:playerAge,position,overall,potential,finishing,passing,defending,pace:clamp(overall+Math.round(random()*16-8),32,96),stamina:clamp(overall+Math.round(random()*14-7),35,96),handling,creativity:clamp(overall+Math.round(random()*16-8),30,96),fitness:82+Math.floor(random()*19),value,wage:Math.max(900,Math.round(overall*overall*6.2)),goals:0,assists:0,appearances:0,clubId};
}
function makeSquad(clubId:string,strength:number,random:()=>number):Player[] {
 const positions:Position[]=["GOL","GOL","DEF","DEF","DEF","DEF","DEF","DEF","MEI","MEI","MEI","MEI","MEI","MEI","ATA","ATA","ATA","ATA"];
 return positions.map((pos,i)=>makePlayer(clubId+"-p"+String(i+1).padStart(2,"0"),clubId,pos,strength+(i<11?3:-3),random));
}
function createFixtures(clubs:Club[],season:number):Fixture[] {
 const ids=clubs.map(c=>c.id),fixtures:Fixture[]=[];
 for(let leg=0;leg<2;leg++){
  const rotation=[...ids],n=ids.length,half=n/2;
  for(let round=0;round<n-1;round++){
   for(let i=0;i<half;i++){
    const first=rotation[i]!,second=rotation[n-1-i]!,flip=(round+i+leg)%2===1;
    fixtures.push({id:"s"+season+"-r"+(leg*(n-1)+round+1)+"-"+i,round:leg*(n-1)+round+1,competition:"Liga das Araucárias",homeClubId:flip?second:first,awayClubId:flip?first:second,knockout:false,played:false});
   }
   const last=rotation.pop()!;rotation.splice(1,0,last);
  }
 }
 return fixtures;
}
export function createCareer(managerName:string,managerNickname:string,clubId:string):Career {
 const random=seeded(9031);
 const clubs:Club[]=clubSpecs.map((s,i):Club=>({...s,formation:i%3===0?"4-3-3":i%3===1?"4-2-3-1":"4-4-2",tactic:"equilibrada",players:makeSquad(s.id,s.strength,random)}));
 const transferMarket=Array.from({length:18},(_,i)=>makePlayer("free-"+(i+1),"free-agent",(["GOL","DEF","MEI","ATA"] as Position[])[i%4]!,57+random()*17,random)).sort((a,b)=>b.overall-a.overall);
 return {schemaVersion:1,season:2026,day:1,managerName:managerName.trim()||"Victor Luiz",managerNickname:managerNickname.trim()||"Mister",clubId,screen:"inicio",clubs,fixtures:createFixtures(clubs,2026),transferMarket,news:[{id:"news-1",day:1,tag:"clube",title:"Uma nova jornada começa",body:"A diretoria apresentou o novo treinador e espera ver uma identidade clara dentro de campo."},{id:"news-2",day:1,tag:"base",title:"Olhos na base",body:"A comissão técnica vai acompanhar os jovens durante os primeiros treinos da temporada."}],currentMatch:null,nextNewsId:3};
}
export function getClub(career:Career,id:string):Club{return career.clubs.find(c=>c.id===id)??career.clubs[0]!;}
export function getManagedClub(career:Career):Club{return getClub(career,career.clubId);}
export function playerPositionLabel(pos:Position):string{return ({GOL:"Goleiro",DEF:"Defensor",MEI:"Meio-campista",ATA:"Atacante"})[pos];}
function formationCounts(f:Formation):Record<Position,number>{const p=f.split("-").map(Number);if(f==="4-2-3-1")return {GOL:1,DEF:4,MEI:5,ATA:1};return {GOL:1,DEF:p[0]??4,MEI:p[1]??3,ATA:p[2]??3};}
function selectLineup(club:Club,formation:Formation):string[]{
 const count=formationCounts(formation),remaining=[...club.players].sort((a,b)=>b.overall-a.overall),selected:Player[]=[];
 for(const pos of ["GOL","DEF","MEI","ATA"] as const){const candidates=remaining.filter(p=>p.position===pos).slice(0,count[pos]);selected.push(...candidates);for(const player of candidates){const index=remaining.findIndex(p=>p.id===player.id);if(index>=0)remaining.splice(index,1);}}
 while(selected.length<11&&remaining.length)selected.push(remaining.shift()!);return selected.slice(0,11).map(p=>p.id);
}
function newStats():MatchStats{return {shots:0,onTarget:0,possession:0,passes:0,corners:0,fouls:0,yellowCards:0};}
function addEvent(match:MatchState,kind:MatchEvent["kind"],text:string,minute=match.minute,teamId?:string,playerId?:string):void{match.events.push({id:"e"+match.nextEventId++,minute,kind,text,teamId,playerId});if(match.events.length>100)match.events.shift();}
export function createLiveMatch(fixture:Fixture,clubs:Club[]):MatchState{
 const home=clubs.find(c=>c.id===fixture.homeClubId)!,away=clubs.find(c=>c.id===fixture.awayClubId)!;
 const homeLineup=selectLineup(home,home.formation),awayLineup=selectLineup(away,away.formation),condition:Record<string,number>={};
 for(const p of [...home.players,...away.players])condition[p.id]=p.fitness;
 const match:MatchState={fixtureId:fixture.id,homeClubId:home.id,awayClubId:away.id,competition:fixture.competition,knockout:fixture.knockout,minute:0,phase:"first-half",homeScore:0,awayScore:0,homeLineup,awayLineup,condition,homeStats:newStats(),awayStats:newStats(),events:[],homeSubs:0,awaySubs:0,homeTactic:home.tactic,awayTactic:away.tactic,homeFormation:home.formation,awayFormation:away.formation,finishedApplied:false,nextEventId:1};
 addEvent(match,"text","As equipes entram em campo. O árbitro autoriza o início da partida.",0);return match;
}
function average(a:number[]):number{return a.length?a.reduce((s,v)=>s+v,0)/a.length:60;}
function statsFor(match:MatchState,side:"home"|"away"):MatchStats{return side==="home"?match.homeStats:match.awayStats;}
function lineupFor(match:MatchState,side:"home"|"away"):string[]{return side==="home"?match.homeLineup:match.awayLineup;}
function activePlayers(match:MatchState,club:Club,side:"home"|"away"):Player[]{return lineupFor(match,side).map(id=>club.players.find(p=>p.id===id)).filter((p):p is Player=>Boolean(p));}
function fitnessScore(match:MatchState,p:Player):number{return p.overall*(.78+(match.condition[p.id]??p.fitness)/455);}
function attackMod(t:Tactic):number{return ({equilibrada:1,ofensiva:1.12,defensiva:.89,posse:1.02,"contra-ataque":1.08,pressao:1.05})[t];}
function midfieldMod(t:Tactic):number{return ({equilibrada:1,ofensiva:.96,defensiva:.98,posse:1.14,"contra-ataque":.93,pressao:1.02})[t];}
function tacticFor(m:MatchState,s:"home"|"away"):Tactic{return s==="home"?m.homeTactic:m.awayTactic;}
function attackRating(m:MatchState,c:Club,s:"home"|"away"):number{return average(activePlayers(m,c,s).filter(p=>p.position==="ATA"||p.position==="MEI").map(p=>fitnessScore(m,p)*(p.position==="ATA"?.68:.32)+p.finishing*.22+p.pace*.1))*attackMod(tacticFor(m,s));}
function defenseRating(m:MatchState,c:Club,s:"home"|"away"):number{const players=activePlayers(m,c,s),defs=players.filter(p=>p.position==="DEF"),gk=players.filter(p=>p.position==="GOL");return average(defs.map(p=>fitnessScore(m,p)*.55+p.defending*.45))*.76+average(gk.map(p=>fitnessScore(m,p)*.35+p.handling*.65))*.24;}
function midfieldRating(m:MatchState,c:Club,s:"home"|"away"):number{return average(activePlayers(m,c,s).filter(p=>p.position==="MEI").map(p=>fitnessScore(m,p)*.6+p.passing*.25+p.creativity*.15))*midfieldMod(tacticFor(m,s));}
function attackSide(m:MatchState,h:Club,a:Club,r:()=>number):"home"|"away"{const hp=midfieldRating(m,h,"home")+attackRating(m,h,"home")*.22+h.strength*.15,ap=midfieldRating(m,a,"away")+attackRating(m,a,"away")*.22+a.strength*.15;return r()<clamp(.5+(hp-ap)/150,.32,.68)?"home":"away";}
function scorer(m:MatchState,c:Club,s:"home"|"away",r:()=>number):Player|undefined{const choices=activePlayers(m,c,s).filter(p=>p.position==="ATA"||p.position==="MEI").sort((a,b)=>b.finishing-a.finishing);return choices[Math.min(choices.length-1,Math.floor(r()*Math.min(choices.length,4)))];}
function finish(m:MatchState):void{m.phase="full-time";addEvent(m,"whistle","Fim de jogo. O placar está fechado.");}
function penalties(m:MatchState,h:Club,a:Club,r:()=>number):void{
 const ha=attackRating(m,h,"home"),aa=attackRating(m,a,"away");
 for(let n=1;n<=5;n++){const hg=r()<clamp(.72+(ha-defenseRating(m,a,"away"))/260,.54,.9),ag=r()<clamp(.72+(aa-defenseRating(m,h,"home"))/260,.54,.9);if(hg)m.homeScore++;if(ag)m.awayScore++;addEvent(m,"text","Pênaltis "+n+": "+h.shortName+(hg?" converte":" desperdiça")+"; "+a.shortName+(ag?" converte.":" desperdiça."),120);if(m.homeScore>m.awayScore+(5-n)||m.awayScore>m.homeScore+(5-n))break;}
 let sudden=0;while(m.homeScore===m.awayScore&&sudden<10){sudden++;if(r()<.72)m.homeScore++;if(r()<.72)m.awayScore++;addEvent(m,"text","Morte súbita "+sudden+": "+h.shortName+" "+m.homeScore+" x "+m.awayScore+" "+a.shortName,120);}
 if(m.homeScore===m.awayScore){if(r()<.5)m.homeScore++;else m.awayScore++;addEvent(m,"text","Uma cobrança extra finalmente desempata a disputa.",120);}
}
export function advanceMinute(m:MatchState,clubs:Club[],r:()=>number=Math.random):MatchState{
 if(!["first-half","second-half","extra-time"].includes(m.phase))return m;
 const h=clubs.find(c=>c.id===m.homeClubId)!,a=clubs.find(c=>c.id===m.awayClubId)!;m.minute++;
 const possession=attackSide(m,h,a,r);statsFor(m,possession).possession++;statsFor(m,possession).passes+=2+Math.floor(r()*5);
 for(const [side,club] of [["home",h],["away",a]] as const){for(const id of lineupFor(m,side)){const p=club.players.find(v=>v.id===id);if(p)m.condition[id]=Math.max(35,(m.condition[id]??p.fitness)-((tacticFor(m,side)==="pressao")?.24:.16)*(1.25-p.stamina/150));}}
 if(r()<.235){
  const side=attackSide(m,h,a,r),attack=side==="home"?h:a,defend=side==="home"?a:h,st=statsFor(m,side);
  const texts=["troca passes no meio-campo e procura espaço","acelera pelo corredor","pressiona a saída de bola","circula a bola com paciência","ganha a segunda bola e avança"];
  addEvent(m,"chance",attack.shortName+" "+pick(texts,r)+".",m.minute,attack.id);
  const quality=attackRating(m,attack,side),defense=defenseRating(m,defend,side==="home"?"away":"home"),shotChance=clamp(.4+(quality-defense)/180,.23,.65);
  if(r()<shotChance){
   st.shots++;const shooter=scorer(m,attack,side,r),onTarget=clamp(.48+((shooter?.finishing??60)-(defense*.55))/180,.26,.76);
   if(r()<onTarget){
    st.onTarget++;if(r()<clamp(.25+(quality-defense)/180,.12,.43)){
     if(side==="home")m.homeScore++;else m.awayScore++;if(shooter)shooter.goals++;
     addEvent(m,"goal","GOL! "+attack.shortName+" marca"+(shooter?" com "+shooter.name:"")+".",m.minute,attack.id,shooter?.id);
     if(shooter){const assist=activePlayers(m,attack,side).filter(p=>p.id!==shooter.id&&p.position==="MEI")[0];if(assist&&r()>.35)assist.assists++;}
    }else addEvent(m,"shot","Boa defesa! O goleiro de "+defend.shortName+" evita o gol.",m.minute,attack.id);
   }else addEvent(m,"shot","Finalização de "+attack.shortName+" passa perto do gol.",m.minute,attack.id);
  }else if(r()<.42){st.corners++;addEvent(m,"chance","Escanteio para "+attack.shortName+".",m.minute,attack.id);}
  else{const def=defend.players.find(p=>p.position==="DEF");st.fouls++;if(r()<.25){st.yellowCards++;addEvent(m,"card","Cartão amarelo para "+(def?.name??"um defensor")+".",m.minute,defend.id,def?.id);}else addEvent(m,"text","Falta no meio-campo. O jogo segue disputado.",m.minute,defend.id);}
 }else if(m.minute%6===0)addEvent(m,"text","A partida segue intensa. "+(possession==="home"?h.shortName:a.shortName)+" controla a posse neste momento.",m.minute,possession==="home"?h.id:a.id);
 if(m.minute===45){addEvent(m,"whistle","Intervalo. Hora de ajustar a estratégia e recuperar o fôlego.",45);m.phase="halftime";}
 else if(m.minute===90){if(m.knockout&&m.homeScore===m.awayScore){addEvent(m,"whistle","Fim do tempo normal. Empate: a decisão vai para a prorrogação.",90);m.phase="extra-time-break";}else finish(m);}
 else if(m.minute===105){addEvent(m,"whistle","Intervalo da prorrogação. Mais quinze minutos para decidir.",105);m.phase="extra-time-halftime";}
 else if(m.minute===120){if(m.homeScore===m.awayScore&&m.knockout){addEvent(m,"whistle","A prorrogação não resolveu. Vamos para os pênaltis.",120);penalties(m,h,a,r);}finish(m);}
 return m;
}
export function resumeMatch(m:MatchState):MatchState{if(m.phase==="halftime"){m.phase="second-half";addEvent(m,"text","Bola rolando para o segundo tempo.",m.minute);}else if(m.phase==="extra-time-break"||m.phase==="extra-time-halftime"){m.phase="extra-time";addEvent(m,"text","A prorrogação recomeça.",m.minute);}return m;}
export function makeSubstitution(m:MatchState,clubs:Club[],side:"home"|"away"="home"):boolean{
 const club=clubs.find(c=>c.id===(side==="home"?m.homeClubId:m.awayClubId));if(!club)return false;const used=side==="home"?m.homeSubs:m.awaySubs;if(used>=5||m.phase==="full-time")return false;
 const lineup=lineupFor(m,side),outIds=lineup.filter(id=>club.players.find(p=>p.id===id)?.position!=="GOL"),outId=outIds.sort((a,b)=>(m.condition[a]??80)-(m.condition[b]??80))[0];if(!outId)return false;
 const out=club.players.find(p=>p.id===outId);if(!out)return false;const active=new Set(lineup),bench=club.players.filter(p=>!active.has(p.id));
 const replacement=bench.filter(p=>p.position===out.position).sort((a,b)=>b.overall-a.overall)[0]??bench.sort((a,b)=>b.overall-a.overall)[0];if(!replacement)return false;
 lineup[lineup.indexOf(outId)]=replacement.id;m.condition[replacement.id]=replacement.fitness;if(side==="home")m.homeSubs++;else m.awaySubs++;
 addEvent(m,"sub","Substituição em "+club.shortName+": "+replacement.name+" entra no lugar de "+out.name+".",m.minute,club.id);return true;
}
export function simulateFixture(f:Fixture,clubs:Club[],r:()=>number=Math.random):{homeScore:number;awayScore:number}{
 const m=createLiveMatch(f,clubs);let guard=0;while(m.phase!=="full-time"&&guard<130){if(["halftime","extra-time-break","extra-time-halftime"].includes(m.phase))resumeMatch(m);advanceMinute(m,clubs,r);guard++;}return {homeScore:m.homeScore,awayScore:m.awayScore};
}
export function getNextFixture(c:Career):Fixture|undefined{return c.fixtures.filter(f=>!f.played&&(f.homeClubId===c.clubId||f.awayClubId===c.clubId)).sort((a,b)=>a.round-b.round)[0];}
export function getStandings(c:Career):Array<{club:Club;played:number;wins:number;draws:number;losses:number;goalsFor:number;goalsAgainst:number;points:number}>{
 const rows=c.clubs.map(club=>({club,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,points:0})),map=new Map(rows.map(row=>[row.club.id,row]));
 for(const f of c.fixtures){if(!f.played||f.competition!=="Liga das Araucárias"||f.homeScore===undefined||f.awayScore===undefined)continue;const h=map.get(f.homeClubId),a=map.get(f.awayClubId);if(!h||!a)continue;h.played++;a.played++;h.goalsFor+=f.homeScore;h.goalsAgainst+=f.awayScore;a.goalsFor+=f.awayScore;a.goalsAgainst+=f.homeScore;if(f.homeScore>f.awayScore){h.wins++;a.losses++;h.points+=3;}else if(f.homeScore<f.awayScore){a.wins++;h.losses++;a.points+=3;}else{h.draws++;a.draws++;h.points++;a.points++;}}
 return rows.sort((a,b)=>b.points-a.points||((b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst))||b.goalsFor-a.goalsFor||b.club.strength-a.club.strength);
}
export function completeRound(c:Career,m:MatchState):void{
 const f=c.fixtures.find(item=>item.id===m.fixtureId);if(!f||f.played)return;f.played=true;f.homeScore=m.homeScore;f.awayScore=m.awayScore;m.finishedApplied=true;
 for(const clubId of [m.homeClubId,m.awayClubId])for(const p of getClub(c,clubId).players){const active=m.homeLineup.includes(p.id)||m.awayLineup.includes(p.id);p.fitness=Math.round(clamp((m.condition[p.id]??p.fitness)+(active?1:5),40,100));if(active)p.appearances++;}
 for(const other of c.fixtures.filter(item=>item.round===f.round&&!item.played&&item.id!==f.id)){const score=simulateFixture(other,c.clubs);other.homeScore=score.homeScore;other.awayScore=score.awayScore;other.played=true;for(const id of [other.homeClubId,other.awayClubId])for(const p of getClub(c,id).players)p.fitness=Math.round(clamp(p.fitness+2,40,100));}
 const home=getClub(c,m.homeClubId),away=getClub(c,m.awayClubId),isWin=m.homeClubId===c.clubId?m.homeScore>m.awayScore:m.awayScore>m.homeScore;
 const outcome=m.homeScore===m.awayScore?"Empate":isWin?"Vitória":"Derrota";c.day++;
 c.news.unshift({id:"news-"+c.nextNewsId++,day:c.day,tag:"partida",title:outcome+" em "+m.competition,body:home.name+" "+m.homeScore+" x "+m.awayScore+" "+away.name+". "+m.events.filter(e=>e.kind==="goal").length+" gol(s) registrados no relato."});c.news=c.news.slice(0,30);
}
export function advanceSeason(c:Career):Career{
 c.season++;c.day=1;for(const club of c.clubs){for(const p of club.players){p.age++;p.fitness=Math.round(clamp(p.fitness+14,40,100));if(p.age<24&&p.overall<p.potential&&Math.random()<.55)p.overall=Math.min(p.potential,p.overall+1);}club.budget+=Math.round(club.supporters*28);}
 c.fixtures=createFixtures(c.clubs,c.season);c.transferMarket=c.transferMarket.filter(p=>p.age<35);c.currentMatch=null;c.screen="inicio";c.news.unshift({id:"news-"+c.nextNewsId++,day:1,tag:"clube",title:"Nova temporada, novas metas",body:"A diretoria definiu um novo ciclo. Reavalie o elenco, a folha salarial e os objetivos antes da estreia."});return c;
}
export function money(value:number):string{if(value>=1_000_000)return "R$ "+(value/1_000_000).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mi";if(value>=1000)return "R$ "+(value/1000).toLocaleString("pt-BR",{maximumFractionDigits:0})+" mil";return "R$ "+Math.round(value).toLocaleString("pt-BR");}
export function formatScore(home:number|undefined,away:number|undefined):string{return String(home??"–")+" : "+String(away??"–");}
export function addNews(c:Career,tag:NewsItem["tag"],title:string,body:string):void{c.news.unshift({id:"news-"+c.nextNewsId++,day:c.day,tag,title,body});c.news=c.news.slice(0,30);}
