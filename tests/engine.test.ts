import { WORLD_CLUBS, WORLD_DIVISIONS } from "../src/world-data";
import { describe, expect, it } from "vitest";
import { acceptJobOffer, acceptSponsorOffer, advanceCupTournaments, advanceMinute, advanceSeason, autoSelectLineup, completeRound, createCareer, createLiveMatch, getNextFixture, getStartingLineup, getStandings, makeSubstitution, migrateCareer, restManagedSquad, resumeMatch, setStartingPlayer, simulateFixture, syncWorldLeagueFromCareer, syncWorldNews, type Career } from "../src/engine";
function seeded(seed:number):()=>number{let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
describe("Jornada 90 match engine",()=>{
 it("builds a career with every club in its selected division and a balanced double round-robin",()=>{
  const c=createCareer("Teste","Mister","pato-branco");expect(c.clubs).toHaveLength(92);expect(c.clubs.every(x=>x.players.length>=18)).toBe(true);expect(c.clubs.every(x=>x.players.reduce((sum,p)=>sum+p.wage,0)<=x.wageBudget)).toBe(true);expect(c.fixtures).toHaveLength(408);
  for(let round=1;round<=38;round++){const fs=c.fixtures.filter(f=>f.round===round);expect(fs).toHaveLength(10);expect(new Set(fs.flatMap(f=>[f.homeClubId,f.awayClubId])).size).toBe(20);}expect(getNextFixture(c)).toBeDefined();
 });
 it("pauses at halftime and ends a regular match at 90 minutes",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),m=createLiveMatch(getNextFixture(c)!,c.clubs),r=seeded(34);
  while(m.phase==="first-half")advanceMinute(m,c.clubs,r);expect(m.minute).toBe(45);expect(m.phase).toBe("halftime");resumeMatch(m);
  while(m.phase==="second-half")advanceMinute(m,c.clubs,r);expect(m.minute).toBe(90);expect(m.phase).toBe("full-time");expect(m.homeScore+m.awayScore).toBeGreaterThanOrEqual(0);
 });
 it("supports extra time and a shootout in knockout mode",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f={...getNextFixture(c)!,knockout:true,id:"cup-test"},m=createLiveMatch(f,c.clubs),r=()=>.5;
  while(m.phase==="first-half")advanceMinute(m,c.clubs,r);resumeMatch(m);while(m.phase==="second-half")advanceMinute(m,c.clubs,r);
  expect(m.phase).toBe("extra-time-break");m.homeScore=0;m.awayScore=0;resumeMatch(m);while(m.phase==="extra-time")advanceMinute(m,c.clubs,r);expect(m.phase).toBe("extra-time-halftime");resumeMatch(m);while(m.phase==="extra-time")advanceMinute(m,c.clubs,r);
  expect(m.phase).toBe("full-time");expect(m.minute).toBe(120);expect(m.events.some(e=>e.text.toLowerCase().includes("pênaltis"))).toBe(true);expect(m.homePenaltyScore).not.toBe(m.awayPenaltyScore);expect(m.homeScore).toBe(m.awayScore);
 });
 it("calculates standings only from completed fixtures",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f=c.fixtures[0]!;f.played=true;f.homeScore=2;f.awayScore=0;const rows=getStandings(c);
  expect(rows.find(r=>r.club.id===f.homeClubId)?.points).toBe(3);expect(rows.find(r=>r.club.id===f.awayClubId)?.points).toBe(0);expect(rows.reduce((sum,r)=>sum+r.played,0)).toBe(2);
 });
 it("runs a match simulation and records appearances for both teams",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f={...getNextFixture(c)!,knockout:false},result=simulateFixture(f,c.clubs,seeded(188));
  expect(result.homeScore).toBeGreaterThanOrEqual(0);expect(result.awayScore).toBeGreaterThanOrEqual(0);expect(result.homeScore).toBeLessThan(20);expect(result.awayScore).toBeLessThan(20);
  const involved=[c.clubs.find(x=>x.id===f.homeClubId)!,c.clubs.find(x=>x.id===f.awayClubId)!];
  expect(involved.flatMap(x=>x.players).filter(p=>p.appearances===1)).toHaveLength(22);
 });
});

describe("Pulso 90 career safeguards",()=>{
 it("refreshes the transfer market at the start of every new season",()=>{
  const c=createCareer("Teste","Mister","pato-branco");c.transferMarket=[];advanceSeason(c);
  expect(c.season).toBe(2027);expect(c.transferMarket).toHaveLength(18);
  expect(c.transferMarket.every(p=>p.id.startsWith("free-2027-"))).toBe(true);
  expect(new Set(c.transferMarket.map(p=>p.id)).size).toBe(18);
 });
 it("keeps substitutions unique and enforces the five-change limit",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),m=createLiveMatch(getNextFixture(c)!,c.clubs);
  for(let i=0;i<5;i++)expect(makeSubstitution(m,c.clubs,"home")).toBe(true);
  expect(m.homeSubs).toBe(5);expect(new Set(m.homeLineup).size).toBe(11);
  expect(m.homeLineup.every(id=>c.clubs.find(x=>x.id===m.homeClubId)!.players.some(p=>p.id===id))).toBe(true);
  expect(makeSubstitution(m,c.clubs,"home")).toBe(false);
 });
 it("counts both the substituted starter and the incoming player as appearances",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f=getNextFixture(c)!,m=createLiveMatch(f,c.clubs),initial=new Set(m.homeLineup);
  expect(makeSubstitution(m,c.clubs,"home")).toBe(true);
  const outgoing=[...initial].find(id=>!m.homeLineup.includes(id))!;
  const incoming=m.homeLineup.find(id=>!initial.has(id))!;
  m.phase="full-time";completeRound(c,m);
  const home=c.clubs.find(x=>x.id===m.homeClubId)!;
  expect(home.players.find(p=>p.id===outgoing)?.appearances).toBe(1);
  expect(home.players.find(p=>p.id===incoming)?.appearances).toBe(1);
  expect(home.players.filter(p=>p.appearances===1)).toHaveLength(12);
 });
 it("limits squad recovery to once per fixture and blocks it during a live match",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f=getNextFixture(c)!,initialDay=c.day;
  const initialFitness=c.clubs.find(x=>x.id===c.clubId)!.players.map(p=>p.fitness);
  expect(restManagedSquad(c)).toBe(true);expect(c.day).toBe(initialDay+1);
  const recovered=c.clubs.find(x=>x.id===c.clubId)!.players.map(p=>p.fitness);
  expect(recovered.every((value,i)=>value>=initialFitness[i]!&&value<=Math.min(100,initialFitness[i]!+9))).toBe(true);
  expect(restManagedSquad(c)).toBe(false);expect(c.day).toBe(initialDay+1);
  const m=createLiveMatch(f,c.clubs);c.currentMatch=m;expect(restManagedSquad(c)).toBe(false);
  m.phase="full-time";completeRound(c,m);expect(restManagedSquad(c)).toBe(true);
 });
 it("does not apply an unfinished match or apply a finished round twice",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f=getNextFixture(c)!,m=createLiveMatch(f,c.clubs);
  m.homeScore=1;m.awayScore=0;completeRound(c,m);expect(f.played).toBe(false);
  m.phase="full-time";completeRound(c,m);const dayAfterFirstApply=c.day,tableAfterFirstApply=getStandings(c);
  expect(f.played).toBe(true);expect(m.finishedApplied).toBe(true);
  completeRound(c,m);expect(c.day).toBe(dayAfterFirstApply);expect(getStandings(c)).toEqual(tableAfterFirstApply);
 });
});


describe("Pulso 90 event-based newspaper integration",()=>{
 it("publishes the completed round through multiple outlets using saved results",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f=getNextFixture(c)!,m=createLiveMatch(f,c.clubs);
  m.phase="full-time";
  m.homeScore=2;
  m.awayScore=1;
  completeRound(c,m);

  const completedRound=c.fixtures.filter(item=>item.round===f.round&&item.played);
  expect(completedRound).toHaveLength(10);
  for(const fixture of completedRound){
   const eventId=fixture.id+"-final";
   const articles=c.news.filter(article=>article.eventId===eventId);
   expect(articles.length).toBeGreaterThanOrEqual(2);
   expect(new Set(articles.map(article=>article.publisherId)).size).toBe(articles.length);
   const home=c.clubs.find(club=>club.id===fixture.homeClubId)!;
   const away=c.clubs.find(club=>club.id===fixture.awayClubId)!;
   const factualScore=home.name+" "+fixture.homeScore+" x "+fixture.awayScore+" "+away.name;
   expect(articles.every(article=>article.body.includes(factualScore))).toBe(true);
   expect(articles.every(article=>article.truthLevel==="confirmed")).toBe(true);
  }

  const count=c.news.length;
  completeRound(c,m);
  expect(c.news).toHaveLength(count);
 });
});


describe("Pulso 90 lineup management",()=>{
 it("starts with eleven unique, position-compatible starters and persists a manual selection into matches",()=>{
  const c=createCareer("Teste","Mister","br-d-p4t0-br4nc0-fc"),managed=c.clubs.find(item=>item.id===c.clubId)!;
  const initial=getStartingLineup(managed);
  expect(initial).toHaveLength(11);
  expect(new Set(initial.map(player=>player.id)).size).toBe(11);
  expect(initial[0]?.position).toBe("GOL");
  const bench=managed.players.find(player=>player.position==="ATA"&&!initial.some(starter=>starter.id===player.id))!;
  expect(setStartingPlayer(c,8,bench.id)).toBe(true);
  expect(setStartingPlayer(c,9,bench.id)).toBe(false);
  const fixture=getNextFixture(c)!;
  const match=createLiveMatch(fixture,c.clubs);
  const managedLineup=fixture.homeClubId===managed.id?match.homeLineup:match.awayLineup;
  expect(managedLineup).toContain(bench.id);
 });
 it("rejects an out-of-position goalkeeper and lineup changes during a live match",()=>{
  const c=createCareer("Teste","Mister","br-d-p4t0-br4nc0-fc"),managed=c.clubs.find(item=>item.id===c.clubId)!;
  const keeper=managed.players.find(player=>player.position==="GOL")!;
  expect(setStartingPlayer(c,1,keeper.id)).toBe(false);
  const match=createLiveMatch(getNextFixture(c)!,c.clubs);c.currentMatch=match;
  const bench=managed.players.find(player=>player.position==="DEF"&&!getStartingLineup(managed).some(starter=>starter.id===player.id))!;
  expect(setStartingPlayer(c,1,bench.id)).toBe(false);
 });
});

describe("Pulso 90 world newspaper synchronization",()=>{
 it("publishes signed sponsor events once in the main newspaper",()=>{
  const c=createCareer("Teste","Mister","br-d-p4t0-br4nc0-fc");
  const offer=c.world!.sponsorOffers[0]!;
  expect(acceptSponsorOffer(c,offer.id)).toBe(true);
  const eventId="sponsor-signed-"+offer.id;
  expect(c.news.filter(item=>item.eventId===eventId)).toHaveLength(1);
  const before=c.news.length;
  syncWorldNews(c);
  expect(c.news.length).toBe(before);
  expect(c.news.find(item=>item.eventId===eventId)?.source).toBe("Mercado & Negócios");
 });
});

describe("Pulso 90 automatic lineup",()=>{
 it("rebuilds the best available eleven for the selected formation",()=>{
  const c=createCareer("Teste","Mister","br-d-p4t0-br4nc0-fc"),managed=c.clubs.find(item=>item.id===c.clubId)!;
  const initial=getStartingLineup(managed);
  const weaker=managed.players.find(player=>player.position==="ATA"&&!initial.some(starter=>starter.id===player.id))!;
  expect(setStartingPlayer(c,8,weaker.id)).toBe(true);
  expect(autoSelectLineup(c)).toBe(true);
  const rebuilt=getStartingLineup(managed);
  expect(rebuilt.some(player=>player.id===weaker.id)).toBe(false);
  expect(rebuilt).toHaveLength(11);
 });
});

describe("Pulso 90 worldwide manager market",()=>{
 it("offers jobs outside the starting division and moves the career into the selected league",()=>{
  const c=createCareer("Teste","Mister","br-d-p4t0-br4nc0-fc",{managerProfileId:"manager-lower"});
  const oldDivision=c.world!.divisionId;
  const offer=c.world!.jobOffers.find(item=>item.divisionId!==oldDivision)!;
  expect(offer).toBeDefined();
  expect(acceptJobOffer(c,offer.id)).toBe(true);
  expect(c.clubId).toBe(offer.clubId);
  expect(c.world!.divisionId).toBe(offer.divisionId);
  expect(c.world!.competitionName).toBe(offer.divisionName);
  expect(c.fixtures.length).toBeGreaterThan(0);
  expect(c.fixtures.every(fixture=>fixture.competition===offer.divisionName)).toBe(true);
  expect(c.world!.globalLeagues.find(league=>league.divisionId===oldDivision)?.standings.length).toBeGreaterThan(0);
  expect(c.world!.globalLeagues.find(league=>league.divisionId===offer.divisionId)?.matchday).toBe(0);
 });
});

describe("Pulso 90 international squads",()=>{
 it("generates player names from the club's confederation outside Brazil",()=>{
  const japanClub=WORLD_CLUBS.find(club=>club.country==="Japão")!;
  const career=createCareer("Teste","Mister",japanClub.id);
  const japaneseFirstNames=new Set(["Haruto","Yuto","Sota","Kaito","Min-jun","Ji-ho","Wei","Jun","Ravi","Arjun","Omar","Ali"]);
  expect(career.clubs[0]!.players.every(player=>japaneseFirstNames.has(player.name.split(" ")[0]!))).toBe(true);
 });
});

describe("Pulso 90 save migration",()=>{
 it("restores global divisions and repairs old job offers without losing the career",()=>{
  const current=createCareer("Teste","Mister","br-d-p4t0-br4nc0-fc");
  const legacy={...current,world:{...current.world!,globalLeagues:current.world!.globalLeagues.slice(0,2),jobOffers:current.world!.jobOffers.map(offer=>({...offer,divisionId:undefined as unknown as string}))}} as Career;
  const migrated=migrateCareer(legacy);
  expect(migrated.clubId).toBe(current.clubId);
  expect(migrated.world!.globalLeagues).toHaveLength(WORLD_DIVISIONS.length);
  expect(migrated.world!.jobOffers.every(offer=>Boolean(offer.divisionId))).toBe(true);
  expect(migrated.world!.globalLeagues.find(league=>league.divisionId===migrated.world!.divisionId)?.standings.length).toBeGreaterThan(0);
 });
});

describe("Pulso 90 national cup engine",()=>{
 it("creates a Brazilian national cup with 92 clubs while keeping the league table separate",()=>{
  const c=createCareer("Teste","Mister","br-d-p4t0-br4nc0-fc");
  expect(c.cups).toHaveLength(1);
  expect(c.cups[0]!.participants).toHaveLength(92);
  expect(c.fixtures.filter(f=>f.competition===c.cups[0]!.competition&&f.round===4)).toHaveLength(28);
  expect(c.cups[0]!.byes).toHaveLength(36);
  expect(getStandings(c)).toHaveLength(20);
 });
 it("creates a national cup for an international career",()=>{
  const japan=WORLD_CLUBS.find(club=>club.country==="Japão")!;
  const c=createCareer("Teste","Mister",japan.id);
  expect(c.cups).toHaveLength(1);
  expect(c.cups[0]!.countryCode).toBe(japan.countryCode);
  expect(c.cups[0]!.participants.length).toBeGreaterThanOrEqual(16);
 });
});

describe("Pulso 90 cup bracket progression",()=>{
 it("advances a 92-team cup from preliminary round to a 64-team bracket",()=>{
  const c=createCareer("Teste","Mister","br-d-p4t0-br4nc0-fc");
  const cup=c.cups[0]!;
  const firstRound=c.fixtures.filter(f=>f.competition===cup.competition&&f.round===cup.fixtureRound);
  for(const fixture of firstRound){
   fixture.played=true;
   fixture.homeScore=2;
   fixture.awayScore=1;
  }
  advanceCupTournaments(c,cup.fixtureRound);
  expect(cup.currentStage).toBe(2);
  expect(cup.fixtureRound).toBe(8);
  expect(c.fixtures.filter(f=>f.competition===cup.competition&&f.round===8)).toHaveLength(32);
  expect(cup.byes).toHaveLength(0);
 });
});
