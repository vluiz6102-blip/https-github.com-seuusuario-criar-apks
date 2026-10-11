import { describe, expect, it } from "vitest";
import { WORLD_CLUBS, WORLD_HEADLINES, WORLD_PLAYERS } from "./world-database";

describe("curated world football database", () => {
  it("has unique clubs with stadium and region details", () => {
    expect(WORLD_CLUBS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(WORLD_CLUBS.map((club) => club.id)).size).toBe(WORLD_CLUBS.length);
    expect(WORLD_CLUBS.every((club) => club.name && club.stadium && club.region && club.country)).toBe(true);
  });

  it("does not attach a player to a club missing from the directory", () => {
    const clubIds = new Set(WORLD_CLUBS.map((club) => club.id));
    expect(WORLD_PLAYERS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(WORLD_PLAYERS.map((player) => player.id)).size).toBe(WORLD_PLAYERS.length);
    expect(WORLD_PLAYERS.every((player) => clubIds.has(player.clubId) && player.age > 15 && player.rating > 40)).toBe(true);
  });

  it("keeps current-world headlines source-linked", () => {
    expect(WORLD_HEADLINES.length).toBeGreaterThanOrEqual(4);
    expect(WORLD_HEADLINES.every((item) => item.url.startsWith("https://") && item.date && item.source)).toBe(true);
  });
});
