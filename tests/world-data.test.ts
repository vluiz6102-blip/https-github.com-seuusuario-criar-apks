import { describe, expect, it } from "vitest";
import { WORLD_CLUBS, WORLD_COMPETITIONS, WORLD_DIVISIONS, NATIONAL_TEAMS, countryDivisionCount, getAdjacentDivision, getDivisionClubs } from "../src/world-data";

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
