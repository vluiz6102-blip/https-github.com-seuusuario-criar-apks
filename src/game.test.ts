import { describe, expect, it } from "vitest";
import {
  advanceMatch,
  beginMatch,
  calculateTeamStrength,
  createCareer,
  releasePlayer,
  signPlayer,
  trainPlayer
} from "./game";

describe("Maia Soccer Manager original career engine", () => {
  it("creates a career with a fictional squad and a realistic starting budget", () => {
    const career = createCareer("man-city", "Vic");
    expect(career.managerName).toBe("Vic");
    expect(career.squad.length).toBeGreaterThanOrEqual(18);
    expect(career.market.length).toBeGreaterThanOrEqual(6);
    expect(career.budget).toBeGreaterThan(1_000_000);
    expect(calculateTeamStrength(career.squad)).toBeGreaterThan(50);
  });

  it("charges the correct transfer fee and removes the signed player from the market", () => {
    const base = createCareer("man-city", "Victor");
    const target = base.market.find((player) => player.value <= base.budget);
    expect(target).toBeDefined();
    if (!target) return;
    const career = base;
    const next = signPlayer(career, target.id);
    expect(next.squad.length).toBe(career.squad.length + 1);
    expect(next.budget).toBe(career.budget - target.value);
    expect(next.market.some((player) => player.id === target.id)).toBe(false);
    expect(next.transfersMade).toBe(1);
    expect(next.news[0].category).toBe("mercado");
    expect(next.news[0].headline).toContain(target.name);
  });

  it("refuses a transfer that the club cannot afford", () => {
    const career = createCareer("real-madrid", "Victor");
    const expensiveCareer = { ...career, budget: 0 };
    expect(signPlayer(expensiveCareer, career.market[0].id)).toBe(expensiveCareer);
  });

  it("trains a player by one rating point and consumes one training credit", () => {
    const career = createCareer("man-city", "Victor");
    const player = career.squad.find((candidate) => candidate.rating < candidate.potential);
    expect(player).toBeDefined();
    if (!player) return;
    const next = trainPlayer(career, player.id);
    const changed = next.squad.find((candidate) => candidate.id === player.id);
    expect(changed?.rating).toBe(Math.min(player.potential, player.rating + 1));
    expect(next.trainingCredits).toBe(career.trainingCredits - 1);
  });

  it("returns a release fee and protects the minimum squad size", () => {
    const career = createCareer("man-city", "Victor");
    const player = career.squad[career.squad.length - 1];
    const next = releasePlayer(career, player.id);
    expect(next.squad.length).toBe(career.squad.length - 1);
    expect(next.budget).toBe(career.budget + Math.round(player.value * 0.62));
    const minimum = { ...career, squad: career.squad.slice(0, 12) };
    expect(releasePlayer(minimum, minimum.squad[0].id)).toBe(minimum);
  });

  it("creates a clearly simulated real-brand footwear partnership when a prospect reaches 70", () => {
    const base = createCareer("man-city", "Victor");
    const player = base.squad[0];
    const career = { ...base, squad: base.squad.map((candidate) => candidate.id === player.id ? { ...candidate, rating: 69, potential: 75 } : candidate) };
    const next = trainPlayer(career, player.id);
    expect(next.news[0].category).toBe("patrocinio");
    expect(next.news[0].headline).toMatch(/Nike|adidas|PUMA/);
    expect(next.news[0].detail).toContain("não uma notícia sobre patrocínio real");
  });

  it("finishes a text-only match after five one-minute simulation steps and records it once", () => {
    let career = beginMatch(createCareer("man-city", "Victor"));
    expect(career.match?.minute).toBe(0);
    for (let step = 0; step < 5; step += 1) career = advanceMatch(career);
    expect(career.match?.minute).toBe(5);
    expect(career.match?.finished).toBe(true);
    expect(career.match?.events[(career.match?.events.length ?? 1) - 1]).toContain("APITO FINAL");
    expect(career.played).toBe(1);
    expect(career.history.length).toBe(1);
    expect(career.points).toBe(career.wins * 3 + career.draws);
    const repeated = advanceMatch(career);
    expect(repeated.played).toBe(1);
    expect(repeated.history.length).toBe(1);
  });
});
