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
    const career = createCareer("aurora", "Vic");
    expect(career.managerName).toBe("Vic");
    expect(career.squad.length).toBeGreaterThanOrEqual(18);
    expect(career.market.length).toBeGreaterThanOrEqual(6);
    expect(career.budget).toBeGreaterThan(1_000_000);
    expect(calculateTeamStrength(career.squad)).toBeGreaterThan(50);
  });

  it("charges the correct transfer fee and removes the signed player from the market", () => {
    const career = createCareer("aurora", "Victor");
    const target = career.market[0];
    const next = signPlayer(career, target.id);
    expect(next.squad.length).toBe(career.squad.length + 1);
    expect(next.budget).toBe(career.budget - target.value);
    expect(next.market.some((player) => player.id === target.id)).toBe(false);
    expect(next.transfersMade).toBe(1);
  });

  it("refuses a transfer that the club cannot afford", () => {
    const career = createCareer("serra", "Victor");
    const expensiveCareer = { ...career, budget: 0 };
    expect(signPlayer(expensiveCareer, career.market[0].id)).toBe(expensiveCareer);
  });

  it("trains a player by one rating point and consumes one training credit", () => {
    const career = createCareer("aurora", "Victor");
    const player = career.squad.find((candidate) => candidate.rating < candidate.potential);
    expect(player).toBeDefined();
    if (!player) return;
    const next = trainPlayer(career, player.id);
    const changed = next.squad.find((candidate) => candidate.id === player.id);
    expect(changed?.rating).toBe(Math.min(player.potential, player.rating + 1));
    expect(next.trainingCredits).toBe(career.trainingCredits - 1);
  });

  it("returns a release fee and protects the minimum squad size", () => {
    const career = createCareer("aurora", "Victor");
    const player = career.squad[career.squad.length - 1];
    const next = releasePlayer(career, player.id);
    expect(next.squad.length).toBe(career.squad.length - 1);
    expect(next.budget).toBe(career.budget + Math.round(player.value * 0.62));
    const minimum = { ...career, squad: career.squad.slice(0, 12) };
    expect(releasePlayer(minimum, minimum.squad[0].id)).toBe(minimum);
  });

  it("advances the clock in 15-minute blocks and records a result once at full time", () => {
    let career = beginMatch(createCareer("aurora", "Victor"));
    expect(career.match?.minute).toBe(0);
    for (let step = 0; step < 6; step += 1) career = advanceMatch(career);
    expect(career.match?.minute).toBe(90);
    expect(career.match?.finished).toBe(true);
    expect(career.played).toBe(1);
    expect(career.history.length).toBe(1);
    expect(career.points).toBe(career.wins * 3 + career.draws);
    const repeated = advanceMatch(career);
    expect(repeated.played).toBe(1);
    expect(repeated.history.length).toBe(1);
  });
});
