import { describe, expect, it } from "vitest";
import { WORLD_CLUBS, WORLD_COMPETITIONS, WORLD_DIVISIONS, NATIONAL_TEAMS, countryDivisionCount, getAdjacentDivision, getDivision, getDivisionClubs } from "../src/world-data";

describe("Pulso 90 original global database",()=>{
 it("provides at least two playable divisions for each represented nation",()=>{
  const countries=[...new Set(WORLD_DIVISIONS.filter(item=>item.countryCode!=="BR").map(item=>item.countryCode))];
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

import { advanceWorldDay, createWorldState } from "../src/world-simulation";
describe("Pulso 90 global football simulation",()=>{
 it("simulates global league rounds and publishes headlines tied to real saved scores",()=>{
  const world=createWorldState("br-d-p4t0-br4nc0-fc");
  const league=world.globalLeagues.find(item=>item.divisionId==="en-1")!;
  expect(league).toBeDefined();
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
  expect(WORLD_DIVISIONS).toHaveLength(172);
  expect(WORLD_CLUBS).toHaveLength(1604);
  expect(WORLD_COMPETITIONS).toHaveLength(188);
  expect(NATIONAL_TEAMS).toHaveLength(48);
 });
