import { describe, expect, it } from "vitest";
import { WORLD_CLUBS, WORLD_COMPETITIONS, WORLD_DIVISIONS, NATIONAL_TEAMS, REAL_PLAYER_ROSTERS, SPONSOR_CATALOG, countryDivisionCount, getAdjacentDivision, getDivision, getDivisionClubs } from "../src/world-data";

describe("Pulso 90 original global database",()=>{
 it("provides at least two playable divisions for each represented nation",()=>{
  const countries=[...new Set(WORLD_DIVISIONS.filter(item=>item.countryCode!=="BR"&&item.teamType!=="selection").map(item=>item.countryCode))];
  expect(countries.length).toBeGreaterThanOrEqual(40);
  for(const code of countries)expect(countryDivisionCount(code)).toBeGreaterThanOrEqual(2);
 });
 it("contains a connected Brazilian path from amateur football through state levels to Série D and the national tiers",()=>{
  for(const uf of ["ac","al","ap","am","df","es","go","ma","mt","ms","pa","pb","pe","pi","rn","ro","rr","se","to","pr","sp","rj","rs","sc","mg","ba","ce"]){
   const amateur="br-varzea-"+uf,access="br-"+uf+"-b",state="br-"+uf+"-a";
   expect(getDivisionClubs(amateur).length).toBeGreaterThanOrEqual(8);
   expect(getAdjacentDivision(amateur,"up")).toBe(access);
   expect(getAdjacentDivision(access,"up")).toBe(state);
   expect(getAdjacentDivision(state,"up")).toBe("br-d");
  }
 });
 it("includes national competitions and national teams in the world catalogue",()=>{
  expect(WORLD_COMPETITIONS.some(item=>item.id==="br-copa")).toBe(true);
  expect(WORLD_COMPETITIONS.some(item=>item.id==="fifa-world-cup")).toBe(true);
  expect(NATIONAL_TEAMS.length).toBeGreaterThanOrEqual(40);
 });
 it("has unique club and division IDs and no empty divisions",()=>{
  expect(new Set(WORLD_CLUBS.map(item=>item.id)).size).toBe(WORLD_CLUBS.length);
  expect(new Set(WORLD_DIVISIONS.map(item=>item.id)).size).toBe(WORLD_DIVISIONS.length);
  expect(WORLD_DIVISIONS.every(item=>item.clubs.length>=8)).toBe(true);
 });
});

 it("defines explicit promotion and relegation places for the Brazilian pyramid",()=>{
  expect(getDivision("br-a")?.promotionPlaces).toBe(0);
  expect(getDivision("br-a")?.relegationPlaces).toBe(4);
  expect(getDivision("br-b")?.promotionPlaces).toBe(4);
  expect(getDivision("br-c")?.promotionPlaces).toBe(4);
  expect(getDivision("br-d")?.promotionPlaces).toBe(4);
  expect(getDivision("br-pr-a")?.promotionPlaces).toBe(1);
  expect(getDivision("br-pr-b")?.promotionPlaces).toBe(2);
  expect(getDivision("br-varzea-pr")?.promotionPlaces).toBe(2);
 });

import { advanceWorldDay, createWorldState, processGlobalPromotions } from "../src/world-simulation";
describe("Pulso 90 global football simulation",()=>{
 it("simulates global league rounds and publishes headlines tied to real saved scores",()=>{
  const world=createWorldState("br-d-p4t0-br4nc0-fc");
  const league=world.globalLeagues.find(item=>item.divisionId==="en-1")!;
  expect(league).toBeDefined();
  expect(world.globalLeagues).toHaveLength(WORLD_DIVISIONS.length);
  for(let day=0;day<2;day++)advanceWorldDay(world,"br-d-p4t0-br4nc0-fc");
  expect(league.matchday).toBe(1);
  expect(league.recentResults).toHaveLength(5);
  expect(league.standings.reduce((sum,row)=>sum+row.played,0)).toBe(10);
  const headline=world.worldNews.find(item=>item.id.startsWith("global-match-en-1-"));
  expect(headline).toBeDefined();
  const result=league.recentResults[0]!;
  const home=WORLD_CLUBS.find(club=>club.id===result.homeClubId)!;
  const away=WORLD_CLUBS.find(club=>club.id===result.awayClubId)!;
  expect(headline!.body).toContain(home.name+" "+result.homeGoals+" x "+result.awayGoals+" "+away.name);
 });
});

 it("ships a substantial original playable catalogue",()=>{
  expect(WORLD_DIVISIONS).toHaveLength(512);
  expect(WORLD_CLUBS).toHaveLength(5155);
  expect(WORLD_COMPETITIONS).toHaveLength(769);
  expect(NATIONAL_TEAMS).toHaveLength(211);
  expect(WORLD_DIVISIONS.filter(division=>division.teamType==="selection")).toHaveLength(6);
  expect(WORLD_CLUBS.filter(club=>club.teamType==="selection")).toHaveLength(211);
  for(const team of NATIONAL_TEAMS)expect(WORLD_CLUBS.some(club=>club.id==="national-"+team.id&&club.teamType==="selection")).toBe(true);
  expect(new Set(NATIONAL_TEAMS.map(team=>team.id)).size).toBe(211);
  for(const team of NATIONAL_TEAMS){
   expect(WORLD_DIVISIONS.filter(division=>division.country===team.name).length).toBeGreaterThanOrEqual(2);
   const countryCode=WORLD_DIVISIONS.find(division=>division.country===team.name)!.countryCode;
   expect(WORLD_COMPETITIONS.some(competition=>competition.type==="cup"&&competition.countryCode===countryCode)).toBe(true);
  }
  expect(new Set(WORLD_COMPETITIONS.map(item=>item.id)).size).toBe(WORLD_COMPETITIONS.length);
 });

describe("Pulso 90 global promotion and relegation",()=>{
 it("swaps the promoted clubs with the relegated clubs when both divisions finish",()=>{
  const world=createWorldState("br-d-p4t0-br4nc0-fc");
  const upper=world.globalLeagues.find(item=>item.divisionId==="en-1")!;
  const lower=world.globalLeagues.find(item=>item.divisionId==="en-2")!;
  lower.standings=lower.standings.map((row,index)=>({...row,points:100-index,goalsFor:60-index,goalsAgainst:10}));
  upper.standings=upper.standings.map((row,index)=>({...row,points:index<6?80-index:10-(index-6),goalsFor:40-index,goalsAgainst:20}));
  lower.seasonComplete=true;
  upper.seasonComplete=true;
  const promoted=[...lower.standings].sort((a,b)=>b.points-a.points).slice(0,4).map(row=>row.clubId);
  const relegated=[...upper.standings].sort((a,b)=>b.points-a.points).slice(-4).map(row=>row.clubId);
  processGlobalPromotions(world);
  expect(promoted.every(id=>upper.standings.some(row=>row.clubId===id))).toBe(true);
  expect(relegated.every(id=>lower.standings.some(row=>row.clubId===id))).toBe(true);
  expect(lower.seasonComplete).toBe(false);
  expect(upper.seasonComplete).toBe(false);
  expect(lower.matchday).toBe(0);
  expect(upper.matchday).toBe(0);
  expect(world.worldNews.some(item=>item.id.startsWith("global-promotion-en-2-"))).toBe(true);
 });
});

describe("Pulso 90 national team divisions",()=>{
 it("simulates odd-sized confederation leagues with a bye instead of self-matches",()=>{
  const world=createWorldState("br-d-p4t0-br4nc0-fc");
  const league=world.globalLeagues.find(item=>item.divisionId==="nat-uefa")!;
  expect(league.standings).toHaveLength(55);
  for(let day=0;day<2;day++)advanceWorldDay(world,"br-d-p4t0-br4nc0-fc");
  expect(league.matchday).toBe(1);
  expect(league.recentResults).toHaveLength(27);
  expect(league.standings.reduce((sum,row)=>sum+row.played,0)).toBe(54);
  expect(league.recentResults.every(result=>result.homeClubId!==result.awayClubId)).toBe(true);
  expect(world.worldNews.some(item=>item.id.startsWith("global-match-nat-uefa-"))).toBe(true);
 });
});

describe("Pulso 90 sponsor marketplace",()=>{
 it("offers a broad mix of fictional brands across business sectors and sizes",()=>{
  expect(SPONSOR_CATALOG.length).toBeGreaterThanOrEqual(35);
  expect(new Set(SPONSOR_CATALOG.map(sponsor=>sponsor.sector)).size).toBeGreaterThanOrEqual(20);
  expect(new Set(SPONSOR_CATALOG.map(sponsor=>sponsor.tier))).toEqual(new Set([1,2,3,4,5]));
  expect(new Set(SPONSOR_CATALOG.map(sponsor=>sponsor.id)).size).toBe(SPONSOR_CATALOG.length);
 });
});

describe("Verified Brazilian club data",()=>{
 it("uses Azuriz FC for Pato Branco and keeps its stable save ID",()=>{
  const azuriz=WORLD_CLUBS.find(club=>club.id==="br-d-p4t0-br4nc0-fc")!;
  expect(azuriz.name).toBe("Azuriz Futebol Clube");expect(azuriz.city).toBe("Pato Branco");expect(azuriz.stadium).toBe("Estádio Os Pioneiros");
 });
 it("contains the 33 published Azuriz first-team names grouped by position",()=>{
  const roster=REAL_PLAYER_ROSTERS["br-d-p4t0-br4nc0-fc"]!;
  expect(roster).toHaveLength(33);expect(roster.filter(p=>p.position==="GOL")).toHaveLength(5);
  expect(roster.filter(p=>p.position==="DEF")).toHaveLength(9);expect(roster.filter(p=>p.position==="MEI")).toHaveLength(10);
  expect(roster.filter(p=>p.position==="ATA")).toHaveLength(9);
 });
});

describe("2026 Brasileirão Série A real squads",()=>{
 const ids=["br-a-athlet1c0-pr","br-a-atlet1c0-mg","br-a-b4h1a","br-a-b0taf0g0","br-a-f0rt4leza","br-a-c0r1nthians","br-a-c3ara","br-a-cruz31r0","br-a-grem1o","br-a-1nternac10nal","br-a-g0ias","br-a-palme1ras","br-a-br4gant1n0","br-a-cui4ba","br-a-sant0s","br-a-v4sc0-da-g4ma","br-a-v1t0r1a","br-a-fl4mengo","br-a-flum1nense","br-a-s4o-paul0"];
 it("loads 20 real clubs and at least 650 named players with valid positions",()=>{
  expect(getDivisionClubs("br-a")).toHaveLength(20);
  expect(ids).toHaveLength(20);
  expect(ids.reduce((sum,id)=>sum+(REAL_PLAYER_ROSTERS[id]?.length??0),0)).toBeGreaterThanOrEqual(650);
  for(const id of ids){
   const roster=REAL_PLAYER_ROSTERS[id]!;
   expect(roster.length).toBeGreaterThanOrEqual(25);
   expect(new Set(roster.map(player=>player.name.toLocaleLowerCase())).size).toBe(roster.length);
   for(const position of ["GOL","DEF","MEI","ATA"] as const)expect(roster.some(player=>player.position===position)).toBe(true);
  }
 });
 it("renames the four promoted/current clubs without breaking their stable IDs",()=>{
  const clubs=getDivisionClubs("br-a");
  for(const [id,name] of [["br-a-f0rt4leza","Chapecoense"],["br-a-c3ara","Coritiba"],["br-a-g0ias","Mirassol"],["br-a-cui4ba","Remo"]]){
   expect(clubs.find(club=>club.id===id)?.name).toBe(name);
  }
 });
});
