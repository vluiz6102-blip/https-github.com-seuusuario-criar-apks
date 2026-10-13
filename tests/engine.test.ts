import { describe, expect, it } from "vitest";
import { advanceMinute, createCareer, createLiveMatch, getNextFixture, getStandings, resumeMatch, simulateFixture } from "../src/engine";
function seeded(seed:number):()=>number{let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
describe("Jornada 90 match engine",()=>{
 it("builds a career with eight original clubs and a balanced double round-robin",()=>{
  const c=createCareer("Teste","Mister","pato-branco");expect(c.clubs).toHaveLength(8);expect(c.clubs.every(x=>x.players.length>=18)).toBe(true);expect(c.fixtures).toHaveLength(56);
  for(let round=1;round<=14;round++){const fs=c.fixtures.filter(f=>f.round===round);expect(fs).toHaveLength(4);expect(new Set(fs.flatMap(f=>[f.homeClubId,f.awayClubId])).size).toBe(8);}expect(getNextFixture(c)).toBeDefined();
 });
 it("pauses at halftime and ends a regular match at 90 minutes",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),m=createLiveMatch(getNextFixture(c)!,c.clubs),r=seeded(34);
  while(m.phase==="first-half")advanceMinute(m,c.clubs,r);expect(m.minute).toBe(45);expect(m.phase).toBe("halftime");resumeMatch(m);
  while(m.phase==="second-half")advanceMinute(m,c.clubs,r);expect(m.minute).toBe(90);expect(m.phase).toBe("full-time");expect(m.homeScore+m.awayScore).toBeGreaterThanOrEqual(0);
 });
 it("supports extra time and a shootout in knockout mode",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f={...getNextFixture(c)!,knockout:true,id:"cup-test"},m=createLiveMatch(f,c.clubs),r=()=>.5;
  while(m.phase==="first-half")advanceMinute(m,c.clubs,r);resumeMatch(m);while(m.phase==="second-half")advanceMinute(m,c.clubs,r);
  expect(m.phase).toBe("extra-time-break");m.homeScore=0;m.awayScore=0;resumeMatch(m);while(m.phase==="extra-time")advanceMinute(m,c.clubs,r);
  expect(m.phase).toBe("full-time");expect(m.minute).toBe(120);expect(m.events.some(e=>e.text.toLowerCase().includes("pênaltis"))).toBe(true);expect(m.homeScore).not.toBe(m.awayScore);
 });
 it("calculates standings only from completed fixtures",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f=c.fixtures[0]!;f.played=true;f.homeScore=2;f.awayScore=0;const rows=getStandings(c);
  expect(rows.find(r=>r.club.id===f.homeClubId)?.points).toBe(3);expect(rows.find(r=>r.club.id===f.awayClubId)?.points).toBe(0);expect(rows.reduce((sum,r)=>sum+r.played,0)).toBe(2);
 });
 it("runs a match simulation without rendering a pitch",()=>{
  const c=createCareer("Teste","Mister","pato-branco"),f={...getNextFixture(c)!,knockout:false},result=simulateFixture(f,c.clubs,seeded(188));
  expect(result.homeScore).toBeGreaterThanOrEqual(0);expect(result.awayScore).toBeGreaterThanOrEqual(0);expect(result.homeScore).toBeLessThan(20);expect(result.awayScore).toBeLessThan(20);
 });
});
