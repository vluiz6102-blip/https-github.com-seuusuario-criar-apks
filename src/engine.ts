import { createMatchNews } from "./newsroom";
import { getAdjacentDivision, getDivision, getDivisionClubs, getWorldClub, WORLD_DIVISIONS, type Difficulty } from "./world-data";
import { acceptSponsor, advanceWorldDay, applyFanMatchReaction, createWorldState, getDifficultyStrengthAdjustment, migrateWorldState, refreshWorldOffers, toRetiredPlayerRecord, toggleInvestor, updateWorldJobMarket, type CareerPace, type WorldState } from "./world-simulation";
export type Position = "GOL" | "DEF" | "MEI" | "ATA";
export type Formation = "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1";
export type Tactic = "equilibrada" | "ofensiva" | "defensiva" | "posse" | "contra-ataque" | "pressao";
export type Screen = "inicio" | "elenco" | "taticas" | "calendario" | "mercado" | "clube" | "jornal" | "mundo" | "partida";
export type MatchPhase = "first-half" | "halftime" | "second-half" | "extra-time-break" | "extra-time" | "extra-time-halftime" | "full-time";
export interface Player { id:string; name:string; age:number; position:Position; overall:number; potential:number; finishing:number; passing:number; defending:number; pace:number; stamina:number; handling:number; creativity:number; fitness:number; value:number; wage:number; goals:number; assists:number; appearances:number; clubId:string; }
export interface Club { id:string; name:string; shortName:string; city:string; stadium:string; strength:number; budget:number; wageBudget:number; supporters:number; formation:Formation; tactic:Tactic; players:Player[]; startingXI?:string[]; }
export interface Fixture { id:string; round:number; competition:string; homeClubId:string; awayClubId:string; knockout:boolean; played:boolean; homeScore?:number; awayScore?:number; }
export interface MatchEvent { id:string; minute:number; kind:"goal"|"shot"|"card"|"sub"|"chance"|"whistle"|"text"; text:string; teamId?:string; playerId?:string; }
export interface MatchStats { shots:number; onTarget:number; possession:number; passes:number; corners:number; fouls:number; yellowCards:number; }
export interface MatchState { fixtureId:string; homeClubId:string; awayClubId:string; competition:string; knockout:boolean; minute:number; phase:MatchPhase; homeScore:number; awayScore:number; homePenaltyScore:number; awayPenaltyScore:number; homeLineup:string[]; awayLineup:string[]; participants?:string[]; condition:Record<string,number>; homeStats:MatchStats; awayStats:MatchStats; events:MatchEvent[]; homeSubs:number; awaySubs:number; homeTactic:Tactic; awayTactic:Tactic; homeFormation:Formation; awayFormation:Formation; finishedApplied:boolean; nextEventId:number; }
export interface NewsItem { id:string; day:number; title:string; body:string; tag:"clube"|"mercado"|"partida"|"base"; source?:string; publisherId?:string; eventId?:string; truthLevel?:"confirmed"|"rumor"|"opinion"; }
export interface Career { schemaVersion:1; season:number; day:number; managerName:string; managerNickname:string; clubId:string; screen:Screen; clubs:Club[]; fixtures:Fixture[]; transferMarket:Player[]; news:NewsItem[]; currentMatch:MatchState|null; lastRestFixtureId?:string; nextNewsId:number; world?:WorldState; }
export interface CareerOptions { difficulty?:Difficulty; pace?:CareerPace; managerProfileId?:string; }

const firstNames = ["Lucas","Gabriel","Mateus","Rafael","Bruno","Caio","Pedro","João","Enzo","Davi","Henrique","André","Miguel","Thiago","Vitor","Felipe","Murilo","Arthur","Cauã","Diego","Samuel","Nicolas","Lorenzo","Gustavo","Luan","Eduardo","Daniel","Yuri","Ícaro","Leandro","Alex","Renan","Heitor","Marcos","Otávio","Wesley"];
const lastNames = ["Almeida","Barbosa","Cardoso","Dias","Ferreira","Gomes","Lopes","Mendes","Nunes","Oliveira","Pereira","Ramos","Ribeiro","Silva","Souza","Teixeira","Vieira","Costa","Martins","Azevedo","Rocha","Freitas","Campos","Machado","Monteiro","Moraes","Farias","Borges","Prado","Tavares","Batista","Melo"];

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
 return {id,name:playerName(random),age:playerAge,position,overall,potential,finishing,passing,defending,pace:clamp(overall+Math.round(random()*16-8),32,96),stamina:clamp(overall+Math.round(random()*14-7),35,96),handling,creativity:clamp(overall+Math.round(random()*16-8),30,96),fitness:82+Math.floor(random()*19),value,wage:Math.max(900,Math.round(overall*overall*2)),goals:0,assists:0,appearances:0,clubId};
}
function makeSquad(clubId:string,strength:number,random:()=>number):Player[] {
 const positions:Position[]=["GOL","GOL","DEF","DEF","DEF","DEF","DEF","DEF","MEI","MEI","MEI","MEI","MEI","MEI","ATA","ATA","ATA","ATA"];
 return positions.map((pos,i)=>makePlayer(clubId+"-p"+String(i+1).padStart(2,"0"),clubId,pos,strength+(i<11?3:-3),random));
}
function createFixtures(clubs:Club[],season:number,competitionName="Liga das Araucárias"):Fixture[] {
 const ids=clubs.map(c=>c.id),fixtures:Fixture[]=[];
 for(let leg=0;leg<2;leg++){
  const rotation=[...ids],n=ids.length,half=n/2;
  for(let round=0;round<n-1;round++){
   for(let i=0;i<half;i++){
    const first=rotation[i]!,second=rotation[n-1-i]!,flip=(round+i+leg)%2===1;
    fixtures.push({id:"s"+season+"-r"+(leg*(n-1)+round+1)+"-"+i,round:leg*(n-1)+round+1,competition:competitionName,homeClubId:flip?second:first,awayClubId:flip?first:second,knockout:false,played:false});
   }
   const last=rotation.pop()!;rotation.splice(1,0,last);
  }
 }
 return fixtures;
}
function stableSeed(value:string):number{let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);return hash>>>0;}
function clubFromWorldSeed(seed:NonNullable<ReturnType<typeof getWorldClub>>,random:()=>number,managerClub:boolean,difficulty:Difficulty):Club {
 const adjustment=managerClub?0:getDifficultyStrengthAdjustment(difficulty);
 const strength=clamp(Math.round(seed.strength+adjustment),30,98);
 const club:Club={id:seed.id,name:seed.name,shortName:seed.shortName,city:seed.city,stadium:seed.stadium,strength,budget:seed.budget,wageBudget:Math.round(seed.budget/36),supporters:seed.supporters,formation:"4-3-3",tactic:"equilibrada",players:makeSquad(seed.id,strength,random)};
 club.startingXI=selectLineup(club,club.formation);
 return club;
}
export function createCareer(managerName:string,managerNickname:string,clubId:string,options:CareerOptions={}):Career {
 const fallbackId="br-d-p4t0-br4nc0-fc";
 const selected=getWorldClub(clubId)??getWorldClub(fallbackId)??getDivisionClubs("br-d")[0]!;
 const difficulty=options.difficulty??"medio";
 const world=createWorldState(selected.id,options.managerProfileId??"custom",difficulty,options.pace??"normal");
 const peers=getDivisionClubs(selected.divisionId);
 const chosen=[selected,...peers.filter(item=>item.id!==selected.id)];
 const clubs:Club[]=chosen.map((seed,i)=>clubFromWorldSeed(seed,seeded(9031+stableSeed(seed.id)),i===0,difficulty));
 const effectiveClubId=selected.id;
 const transferRandom=seeded(9031+stableSeed(effectiveClubId+"-market"));
 const transferMarket=Array.from({length:28},(_,i)=>makePlayer("free-"+(i+1),"free-agent",(["GOL","DEF","MEI","ATA"] as Position[])[i%4]!,48+transferRandom()*31,transferRandom)).sort((a,b)=>b.overall-a.overall);
 updateWorldJobMarket(world,clubs.map(club=>({id:club.id,name:club.name,strength:club.strength})));
 const career:Career={
  schemaVersion:1,season:2026,day:1,managerName:managerName.trim()||"Victor Luiz",
  managerNickname:managerNickname.trim()||"Mister",clubId:effectiveClubId,screen:"inicio",clubs,
  fixtures:createFixtures(clubs,2026,world.competitionName),transferMarket,
  news:[
   {id:"news-1",day:1,tag:"clube",title:"Uma nova jornada começa",body:"A diretoria apresentou o novo treinador e espera ver uma identidade clara dentro de campo.",source:"Jornal do Clube",publisherId:"jornal-do-clube",eventId:"career-start-"+effectiveClubId,truthLevel:"confirmed"},
   {id:"news-2",day:1,tag:"base",title:"Olhos na base",body:"A comissão técnica vai acompanhar os jovens durante os primeiros treinos da temporada.",source:"Central 90",publisherId:"central-90",eventId:"academy-start-"+effectiveClubId,truthLevel:"confirmed"}
  ],
  currentMatch:null,nextNewsId:3,world
 };
 return career;
}
export function migrateCareer(career:Career):Career {
 const legacyCompetition=career.fixtures[0]?.competition??"Liga das Araucárias";
 if(!getWorldClub(career.clubId)){
  const world=migrateWorldState(career.world,career.clubId);
  world.divisionId="legacy";
  world.competitionName=legacyCompetition;
  world.countryCode="BR";
  world.jobOffers=[];
  world.sponsorOffers=[];
  career.world=world;
  return career;
 }
 career.world=migrateWorldState(career.world,career.clubId);
 if(career.world.divisionId!==getWorldClub(career.clubId)?.divisionId){
  const clubSeed=getWorldClub(career.clubId);
  if(clubSeed){career.world.divisionId=clubSeed.divisionId;career.world.competitionName=clubSeed.divisionName;career.world.countryCode=clubSeed.countryCode;}
 }
 return career;
}
export function getClub(career:Career,id:string):Club{return career.clubs.find(c=>c.id===id)??career.clubs[0]!;}
export function syncWorldNews(c:Career):void{
 if(!c.world)return;
 for(const item of [...c.world.worldNews].reverse()){
  if(c.news.some(article=>article.eventId===item.id))continue;
  const tag:NewsItem["tag"]=item.category==="mercado"?"mercado":item.category==="mundo"?"partida":"clube";
  c.news.unshift({id:"news-"+c.nextNewsId++,day:item.day,tag,title:item.title,body:item.body,source:item.source,publisherId:item.source.toLowerCase().replace(/[^a-z0-9]+/g,"-"),eventId:item.id,truthLevel:"confirmed"});
 }
 c.news=c.news.slice(0,120);
}
export function getManagedClub(career:Career):Club{return getClub(career,career.clubId);}
export function playerPositionLabel(pos:Position):string{return ({GOL:"Goleiro",DEF:"Defensor",MEI:"Meio-campista",ATA:"Atacante"})[pos];}
function formationCounts(f:Formation):Record<Position,number>{const p=f.split("-").map(Number);if(f==="4-2-3-1")return {GOL:1,DEF:4,MEI:5,ATA:1};return {GOL:1,DEF:p[0]??4,MEI:p[1]??3,ATA:p[2]??3};}
function selectLineup(club:Club,formation:Formation):string[]{
 const count=formationCounts(formation),remaining=[...club.players].sort((a,b)=>b.overall-a.overall),selected:Player[]=[];
 for(const pos of ["GOL","DEF","MEI","ATA"] as const){const candidates=remaining.filter(p=>p.position===pos).slice(0,count[pos]);selected.push(...candidates);for(const player of candidates){const index=remaining.findIndex(p=>p.id===player.id);if(index>=0)remaining.splice(index,1);}}
 while(selected.length<11&&remaining.length)selected.push(remaining.shift()!);return selected.slice(0,11).map(p=>p.id);
}
function lineupPosition(formation:Formation,slot:number):Position{
 if(slot===0)return "GOL";
 const count=formationCounts(formation);
 if(slot<=count.DEF)return "DEF";
 if(slot<=count.DEF+count.MEI)return "MEI";
 return "ATA";
}
function validLineup(club:Club,ids:string[]):boolean{
 return ids.length===11&&new Set(ids).size===11&&ids.every((id,index)=>{
  const player=club.players.find(item=>item.id===id);
  return Boolean(player&&player.position===lineupPosition(club.formation,index));
 });
}
function resolveLineup(club:Club):string[]{
 if(club.startingXI&&validLineup(club,club.startingXI))return [...club.startingXI];
 club.startingXI=selectLineup(club,club.formation);
 return [...club.startingXI];
}
export function getStartingLineup(club:Club):Player[]{
 const ids=resolveLineup(club);
 return ids.map(id=>club.players.find(player=>player.id===id)!).filter(Boolean);
}
export function autoSelectLineup(c:Career):boolean{
 if(c.currentMatch&&(c.currentMatch.phase!=="full-time"||!c.currentMatch.finishedApplied))return false;
 const managed=getManagedClub(c);
 managed.startingXI=selectLineup(managed,managed.formation);
 return true;
}
export function setStartingPlayer(c:Career,slot:number,playerId:string):boolean{
 if(!Number.isInteger(slot)||slot<0||slot>=11)return false;
 if(c.currentMatch&&(c.currentMatch.phase!=="full-time"||!c.currentMatch.finishedApplied))return false;
 const managed=getManagedClub(c),player=managed.players.find(item=>item.id===playerId);
 if(!player||player.position!==lineupPosition(managed.formation,slot))return false;
 const ids=resolveLineup(managed);
 if(ids.some((id,index)=>id===playerId&&index!==slot))return false;
 ids[slot]=playerId;
 if(!validLineup(managed,ids))return false;
 managed.startingXI=ids;
 return true;
}
function newStats():MatchStats{return {shots:0,onTarget:0,possession:0,passes:0,corners:0,fouls:0,yellowCards:0};}
function addEvent(match:MatchState,kind:MatchEvent["kind"],text:string,minute=match.minute,teamId?:string,playerId?:string):void{match.events.push({id:"e"+match.nextEventId++,minute,kind,text,teamId,playerId});if(match.events.length>100)match.events.shift();}
export function createLiveMatch(fixture:Fixture,clubs:Club[]):MatchState{
 const home=clubs.find(c=>c.id===fixture.homeClubId)!,away=clubs.find(c=>c.id===fixture.awayClubId)!;
 const homeLineup=resolveLineup(home),awayLineup=resolveLineup(away),condition:Record<string,number>={};
 for(const p of [...home.players,...away.players])condition[p.id]=p.fitness;
 const match:MatchState={fixtureId:fixture.id,homeClubId:home.id,awayClubId:away.id,competition:fixture.competition,knockout:fixture.knockout,minute:0,phase:"first-half",homeScore:0,awayScore:0,homePenaltyScore:0,awayPenaltyScore:0,homeLineup,awayLineup,participants:[...homeLineup,...awayLineup],condition,homeStats:newStats(),awayStats:newStats(),events:[],homeSubs:0,awaySubs:0,homeTactic:home.tactic,awayTactic:away.tactic,homeFormation:home.formation,awayFormation:away.formation,finishedApplied:false,nextEventId:1};
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
 for(let n=1;n<=5;n++){const hg=r()<clamp(.72+(ha-defenseRating(m,a,"away"))/260,.54,.9),ag=r()<clamp(.72+(aa-defenseRating(m,h,"home"))/260,.54,.9);if(hg)m.homePenaltyScore++;if(ag)m.awayPenaltyScore++;addEvent(m,"text","Pênaltis "+n+": "+h.shortName+(hg?" converte":" desperdiça")+"; "+a.shortName+(ag?" converte.":" desperdiça."),120);if(m.homePenaltyScore>m.awayPenaltyScore+(5-n)||m.awayPenaltyScore>m.homePenaltyScore+(5-n))break;}
 let sudden=0;while(m.homePenaltyScore===m.awayPenaltyScore&&sudden<10){sudden++;if(r()<.72)m.homePenaltyScore++;if(r()<.72)m.awayPenaltyScore++;addEvent(m,"text","Morte súbita "+sudden+": "+h.shortName+" "+m.homePenaltyScore+" x "+m.awayPenaltyScore+" "+a.shortName,120);}
 if(m.homePenaltyScore===m.awayPenaltyScore){if(r()<.5)m.homePenaltyScore++;else m.awayPenaltyScore++;addEvent(m,"text","Uma cobrança extra finalmente desempata a disputa.",120);}
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
 const replacement=bench.filter(p=>p.position===out.position).sort((a,b)=>b.overall-a.overall)[0]??bench.filter(p=>p.position!=="GOL").sort((a,b)=>b.overall-a.overall)[0];if(!replacement)return false;
 lineup[lineup.indexOf(outId)]=replacement.id;const participants=new Set(m.participants??[...m.homeLineup,...m.awayLineup,outId]);participants.add(outId);participants.add(replacement.id);m.participants=[...participants];m.condition[replacement.id]=replacement.fitness;if(side==="home")m.homeSubs++;else m.awaySubs++;
 addEvent(m,"sub","Substituição em "+club.shortName+": "+replacement.name+" entra no lugar de "+out.name+".",m.minute,club.id);return true;
}
function applyPlayerMatchStats(m:MatchState,clubs:Club[]):void{
 const participants=new Set(m.participants??[...m.homeLineup,...m.awayLineup]);
 for(const clubId of [m.homeClubId,m.awayClubId]){
  const club=clubs.find(c=>c.id===clubId);if(!club)continue;
  for(const p of club.players){const played=participants.has(p.id);p.fitness=Math.round(clamp((m.condition[p.id]??p.fitness)+(played?1:5),40,100));if(played)p.appearances++;}
 }
}
export function simulateFixture(f:Fixture,clubs:Club[],r:()=>number=Math.random):{homeScore:number;awayScore:number}{
 const m=createLiveMatch(f,clubs);let guard=0;while(m.phase!=="full-time"&&guard<130){if(["halftime","extra-time-break","extra-time-halftime"].includes(m.phase))resumeMatch(m);advanceMinute(m,clubs,r);guard++;}if(m.phase==="full-time")applyPlayerMatchStats(m,clubs);return {homeScore:m.homeScore,awayScore:m.awayScore};
}
export function getNextFixture(c:Career):Fixture|undefined{return c.fixtures.filter(f=>!f.played&&(f.homeClubId===c.clubId||f.awayClubId===c.clubId)).sort((a,b)=>a.round-b.round)[0];}
export function restManagedSquad(c:Career):boolean{
 if(c.currentMatch&&(c.currentMatch.phase!=="full-time"||!c.currentMatch.finishedApplied))return false;
 const fixture=getNextFixture(c);if(!fixture||c.lastRestFixtureId===fixture.id)return false;
 for(const p of getManagedClub(c).players)p.fitness=Math.min(100,p.fitness+9);
 c.lastRestFixtureId=fixture.id;c.day++;if(c.world){advanceWorldDay(c.world,c.clubId);syncWorldNews(c);}
 addNews(c,"clube","Sessão regenerativa concluída","A comissão deu prioridade à recuperação física do elenco.");
 return true;
}
export function getStandings(c:Career):Array<{club:Club;played:number;wins:number;draws:number;losses:number;goalsFor:number;goalsAgainst:number;points:number}>{
 const rows=c.clubs.map(club=>({club,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,points:0})),map=new Map(rows.map(row=>[row.club.id,row]));
 for(const f of c.fixtures){if(!f.played||f.competition!==(c.world?.competitionName??"Liga das Araucárias")||f.homeScore===undefined||f.awayScore===undefined)continue;const h=map.get(f.homeClubId),a=map.get(f.awayClubId);if(!h||!a)continue;h.played++;a.played++;h.goalsFor+=f.homeScore;h.goalsAgainst+=f.awayScore;a.goalsFor+=f.awayScore;a.goalsAgainst+=f.homeScore;if(f.homeScore>f.awayScore){h.wins++;a.losses++;h.points+=3;}else if(f.homeScore<f.awayScore){a.wins++;h.losses++;a.points+=3;}else{h.draws++;a.draws++;h.points++;a.points++;}}
 return rows.sort((a,b)=>b.points-a.points||((b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst))||b.goalsFor-a.goalsFor||b.club.strength-a.club.strength);
}
export function completeRound(c:Career,m:MatchState):void{
 const f=c.fixtures.find(item=>item.id===m.fixtureId);
 if(!f||f.played||m.phase!=="full-time"||m.finishedApplied)return;

 f.played=true;
 f.homeScore=m.homeScore;
 f.awayScore=m.awayScore;
 m.finishedApplied=true;
 applyPlayerMatchStats(m,c.clubs);

 // The rest of the round is resolved before the newsroom receives its facts.
 for(const other of c.fixtures.filter(item=>item.round===f.round&&!item.played&&item.id!==f.id)){
  const score=simulateFixture(other,c.clubs);
  other.homeScore=score.homeScore;
  other.awayScore=score.awayScore;
  other.played=true;
 }

 c.day++;
 const completed=c.fixtures.filter(item=>item.round===f.round&&item.played&&item.homeScore!==undefined&&item.awayScore!==undefined);
 for(const item of completed){
  const home=getClub(c,item.homeClubId),away=getClub(c,item.awayClubId);
  const eventId=item.id+"-final";
  if(c.news.some(article=>article.eventId===eventId))continue;
  const drafts=createMatchNews({
   eventId,
   day:c.day,
   competition:item.competition,
   homeClubId:home.id,
   homeClubName:home.name,
   awayClubId:away.id,
   awayClubName:away.name,
   homeGoals:item.homeScore!,
   awayGoals:item.awayScore!,
   managedClubId:c.clubId
  });
  for(const article of drafts){
   c.news.unshift({
    id:"news-"+c.nextNewsId++,
    day:article.day,
    tag:article.tag,
    title:article.title,
    body:article.body,
    source:article.source,
    publisherId:article.publisherId,
    eventId:article.eventId,
    truthLevel:article.truthLevel
   });
  }
 }
 c.news=c.news.slice(0,120);
 const managedFixture=completed.find(item=>item.homeClubId===c.clubId||item.awayClubId===c.clubId);
 if(c.world&&managedFixture){
  const home=getClub(c,managedFixture.homeClubId),away=getClub(c,managedFixture.awayClubId);
  const managedIsHome=managedFixture.homeClubId===c.clubId;
  const goalsFor=managedIsHome?managedFixture.homeScore!:managedFixture.awayScore!;
  const goalsAgainst=managedIsHome?managedFixture.awayScore!:managedFixture.homeScore!;
  const reaction=applyFanMatchReaction(c.world,getManagedClub(c).name,managedIsHome?away.name:home.name,goalsFor,goalsAgainst,c.day);
  c.news.unshift({id:"news-"+c.nextNewsId++,day:c.day,tag:"clube",title:reaction.title,body:reaction.body,source:reaction.source,publisherId:"voz-arquibancada",eventId:reaction.id,truthLevel:"confirmed"});
  c.world.managerReputation=clamp(c.world.managerReputation+(goalsFor>goalsAgainst?1:goalsFor<goalsAgainst?-1:0),0,100);
  if(c.world.activeSponsor)getManagedClub(c).budget+=Math.round(c.world.activeSponsor.amount/14);
  advanceWorldDay(c.world,c.clubId);
  syncWorldNews(c);
 }
}
export function advanceSeason(c:Career):Career{
 const previousSeason=c.season;
 const finalTable=getStandings(c);
 const managedPosition=finalTable.findIndex(row=>row.club.id===c.clubId)+1;
 c.season++;c.day=1;
 const seasonRandom=seeded(9031+c.season*7919);
 for(const club of c.clubs){
  const survivors:Player[]=[];
  for(let playerIndex=0;playerIndex<club.players.length;playerIndex++){
   const p=club.players[playerIndex]!;
   p.age++;
   p.fitness=Math.round(clamp(p.fitness+14,40,100));
   if(p.age<24&&p.overall<p.potential&&seasonRandom()<.55)p.overall=Math.min(p.potential,p.overall+1);
   const retire=p.age>=38||(p.age>=35&&seasonRandom()<.22);
   const remaining=club.players.length-playerIndex-1;
   if(retire&&survivors.length+remaining>=16){
    if(c.world){const record=toRetiredPlayerRecord(p,club,previousSeason);c.world.retiredPlayers.unshift(record);if(record.canBecomeManager)c.world.worldNews.unshift({id:"retire-"+p.id,day:1,source:"Central 90",title:p.name+" encerra a carreira",body:p.name+" pendura as chuteiras no "+club.name+". O ex-atleta poderá iniciar uma carreira como treinador.",category:"carreira"});}
   }else survivors.push(p);
  }
  club.players=survivors;
  let academyIndex=0;
  while(club.players.length<18){
   const position=(["GOL","DEF","MEI","ATA"] as Position[])[club.players.length%4]!;
   club.players.push(makePlayer("academy-"+c.season+"-"+club.id+"-"+academyIndex++,club.id,position,club.strength-15,seasonRandom,16+Math.floor(seasonRandom()*3)));
  }
  club.budget+=Math.round(club.supporters*28);
  if(c.world?.investorMode)club.budget=999999999999;
 }
 if(c.world){
  let targetDivision:string|undefined;
  const currentDivision=getDivision(c.world.divisionId);
  const promotionPlaces=currentDivision?.promotionPlaces??2;
  const relegationPlaces=currentDivision?.relegationPlaces??3;
  if(promotionPlaces>0&&managedPosition>0&&managedPosition<=promotionPlaces)targetDivision=getAdjacentDivision(c.world.divisionId,"up");
  else if(relegationPlaces>0&&managedPosition>c.clubs.length-relegationPlaces){
   if(c.world.divisionId==="br-d"){
    const city=getManagedClub(c).city;
    targetDivision=WORLD_DIVISIONS.filter(item=>item.countryCode==="BR"&&item.kind==="state"&&item.id.endsWith("-a"))
     .find(item=>getDivisionClubs(item.id).some(seed=>seed.city===city))?.id??getAdjacentDivision(c.world.divisionId,"down");
   }else targetDivision=getAdjacentDivision(c.world.divisionId,"down");
  }
  if(targetDivision){
   const target=getDivision(targetDivision);
   const managed=getManagedClub(c);
   const source=getWorldClub(managed.id);
   const peers=getDivisionClubs(targetDivision);
   if(target&&source){
    const movedSeed={...source,divisionId:target.id,divisionName:target.name,tier:target.tier};
    const destinationPeers=peers.filter(item=>item.id!==managed.id).sort((a,b)=>b.strength-a.strength);
    const seeds=[movedSeed,...destinationPeers.slice(0,Math.max(0,destinationPeers.length-1))];
    const previousClubs=new Map(c.clubs.map(club=>[club.id,club]));
    c.clubs=seeds.map(seed=>{
     const existing=previousClubs.get(seed.id);
     if(existing)return existing;
     return clubFromWorldSeed(seed,seeded(c.season*73+stableSeed(seed.id)),false,c.world!.difficulty);
    });
    c.world.divisionId=target.id;c.world.competitionName=target.name;c.world.countryCode=target.countryCode;
    c.world.worldNews.unshift({id:"movement-"+c.season+"-"+managed.id,day:1,source:"Central 90",title:managed.name+" muda de divisão",body:managedPosition<=2?"O clube conquistou o acesso e vai disputar "+target.name+".":"O clube sofreu o rebaixamento e disputará "+target.name+".",category:"mundo"});
   }
  }
  refreshWorldOffers(c.world,c.clubId);
 }
 if(c.world)syncWorldNews(c);
 c.fixtures=createFixtures(c.clubs,c.season,c.world?.competitionName??"Liga das Araucárias");
 const marketRandom=seeded(9031+c.season*7919);
 c.transferMarket=Array.from({length:18},(_,i)=>makePlayer("free-"+c.season+"-"+(i+1),"free-agent",(["GOL","DEF","MEI","ATA"] as Position[])[i%4]!,48+marketRandom()*33,marketRandom)).sort((a,b)=>b.overall-a.overall);
 c.currentMatch=null;c.screen="inicio";
 c.news.unshift({id:"news-"+c.nextNewsId++,day:1,tag:"clube",title:"Nova temporada, novas metas",body:"A diretoria definiu um novo ciclo. Reavalie o elenco, a folha salarial e os objetivos antes da estreia.",source:"Jornal do Clube",publisherId:"jornal-do-clube",eventId:"season-"+c.season,truthLevel:"confirmed"});
 c.news=c.news.slice(0,120);
 return c;
}

export function acceptJobOffer(c:Career,offerId:string):boolean{
 if(!c.world)return false;
 const offer=c.world.jobOffers.find(item=>item.id===offerId);
 if(!offer||!c.clubs.some(club=>club.id===offer.clubId))return false;
 const oldClub=getManagedClub(c);
 c.clubId=offer.clubId;
 const newClub=getManagedClub(c);
 c.world.managerReputation=clamp(c.world.managerReputation+2,0,100);
 c.world.jobOffers=c.world.jobOffers.filter(item=>item.id!==offerId);
 c.world.worldNews.unshift({id:"job-accepted-"+c.world.worldDay+"-"+offer.id,day:c.world.worldDay,source:"Central 90",title:c.managerName+" assume o "+newClub.name,body:"O treinador deixa "+oldClub.name+" e passa a liderar o projeto de "+newClub.name+": "+offer.project+".",category:"carreira"});
 syncWorldNews(c);
 return true;
}
export function acceptSponsorOffer(c:Career,offerId:string):boolean{
 if(!c.world)return false;
 const offer=acceptSponsor(c.world,offerId);
 if(!offer)return false;
 const managed=getManagedClub(c);
 managed.budget+=offer.upfront;
 if(c.world.investorMode)managed.budget=999999999999;
 syncWorldNews(c);
 return true;
}
export function toggleCareerInvestors(c:Career):boolean{
 if(!c.world)return false;
 const enabled=toggleInvestor(c.world);
 if(enabled)getManagedClub(c).budget=999999999999;
 syncWorldNews(c);
 return enabled;
}
export function setCareerDifficulty(c:Career,difficulty:Difficulty):void{
 if(!c.world)return;
 c.world.difficulty=difficulty;
 for(const team of c.clubs)if(team.id!==c.clubId){const base=getWorldClub(team.id)?.strength??team.strength;team.strength=clamp(base+getDifficultyStrengthAdjustment(difficulty),30,98);}
 addNews(c,"clube","Dificuldade ajustada","A carreira agora está no modo "+({facil:"Fácil",medio:"Médio",dificil:"Difícil","quase-impossivel":"Quase impossível"}[difficulty])+".");
}
export function setCareerPace(c:Career,pace:CareerPace):void{if(c.world)c.world.pace=pace;}
export function simulateNextFixtureFast(c:Career):boolean{
 const fixture=getNextFixture(c);
 if(!fixture||c.currentMatch&&(c.currentMatch.phase!=="full-time"||!c.currentMatch.finishedApplied))return false;
 const match=createLiveMatch(fixture,c.clubs);
 c.currentMatch=match;
 const random=seeded(stableSeed(fixture.id+"-"+c.season+"-"+c.day));
 let guard=0;
 while(match.phase!=="full-time"&&guard<130){
  if(["halftime","extra-time-break","extra-time-halftime"].includes(match.phase))resumeMatch(match);
  advanceMinute(match,c.clubs,random);
  guard++;
 }
 if(match.phase!=="full-time")return false;
 completeRound(c,match);
 c.screen="inicio";
 return true;
}

export function money(value:number):string{if(value>=1_000_000)return "R$ "+(value/1_000_000).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mi";if(value>=1000)return "R$ "+(value/1000).toLocaleString("pt-BR",{maximumFractionDigits:0})+" mil";return "R$ "+Math.round(value).toLocaleString("pt-BR");}
export function formatScore(home:number|undefined,away:number|undefined):string{return String(home??"–")+" : "+String(away??"–");}
export function addNews(c:Career,tag:NewsItem["tag"],title:string,body:string):void{c.news.unshift({id:"news-"+c.nextNewsId++,day:c.day,tag,title,body,source:"Jornal do Clube",publisherId:"jornal-do-clube",eventId:"career-"+c.season+"-"+c.day+"-"+c.nextNewsId,truthLevel:"confirmed"});c.news=c.news.slice(0,120);}
