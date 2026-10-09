import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "docs/modding/examples/maia-club-world-2026";
async function json(path) {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}
const pack = await json("package.json");
const teamFile = await json("teams/teams.json");
const playerFile = await json("players/players.json");
const teams = teamFile.items;
const players = playerFile.items;
const active = new Set(pack.defaultActiveCompetitions);
const teamIds = new Set(teams.map((team) => team.id));
const playerIds = new Set(players.map((player) => player.id));
assert.equal(pack.id, "maia-club-world-2026");
assert.equal(teamFile.schema, "team");
assert.equal(playerFile.schema, "player");
assert.equal(teams.length, 152, "Expected 152 clubs across eight leagues");
assert.equal(players.length, teams.length * 22, "Every club must have a 22-player squad");
assert.equal(teamIds.size, teams.length, "Club IDs must be unique");
assert.equal(playerIds.size, players.length, "Player IDs must be unique");
assert.equal(active.size, 8, "Expected eight active domestic competitions");
const allCompetitors = new Set();
for (const file of [
  "competitions/maia-premier-league-2026-27.json",
  "competitions/maia-la-liga-2026-27.json",
  "competitions/maia-bundesliga-2026-27.json",
  "competitions/maia-serie-a-2026-27.json",
  "competitions/maia-ligue-1-2026-27.json",
  "competitions/maia-brasileirao-serie-a-2026.json",
  "competitions/maia-primeira-liga-2026-27.json",
  "competitions/maia-eredivisie-2026-27.json",
]) {
  const comp = await json(file);
  assert.equal(comp.schema, "competition");
  assert.ok(active.has(comp.id), `Competition not active: ${comp.id}`);
  assert.ok(comp.participants.explicit.length >= 18);
  assert.equal(new Set(comp.participants.explicit).size, comp.participants.explicit.length);
  for (const id of comp.participants.explicit) {
    assert.ok(teamIds.has(id), `Missing team reference ${id}`);
    assert.ok(!allCompetitors.has(id), `Team is assigned to multiple leagues ${id}`);
    allCompetitors.add(id);
  }
}
assert.equal(allCompetitors.size, teams.length, "Every club must belong to exactly one league");
const squads = new Map(teams.map((team) => [team.id, []]));
for (const player of players) {
  assert.ok(squads.has(player.club), `Player references unknown club: ${player.id}`);
  assert.ok(player.name && player.firstName && player.lastName);
  assert.ok(Number.isInteger(player.age) && player.age >= 15 && player.age <= 50);
  assert.ok(Number.isInteger(player.overall) && player.overall >= 52 && player.overall <= 88);
  assert.ok(Number.isInteger(player.potential) && player.potential >= player.overall && player.potential <= 95);
  assert.ok(Number.isInteger(player.value) && player.value >= 0);
  assert.ok(["Goalkeeper", "Defender", "Midfielder", "Forward"].includes(player.position));
  squads.get(player.club).push(player);
}
for (const [clubId, squad] of squads) {
  assert.equal(squad.length, 22, `Squad size mismatch for ${clubId}`);
  assert.deepEqual(
    ["Goalkeeper", "Defender", "Midfielder", "Forward"].map((role) => squad.filter((p) => p.position === role).length),
    [3, 7, 7, 5],
    `Position balance mismatch for ${clubId}`,
  );
}
const realCount = players.filter((player) => player.id.startsWith("rt-")).length;
const generatedCount = players.length - realCount;
assert.ok(realCount >= 500, "Expected at least 500 sourced player records");
const normalizePlayerName = (value) => value.normalize("NFKD").replace(/\\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const generatedNames = players.filter((player) => !player.id.startsWith("rt-")).map((player) => normalizePlayerName(player.name));
assert.equal(new Set(generatedNames).size, generatedNames.length, "Generated filler-player names must be unique");
const realNames = new Set(players.filter((player) => player.id.startsWith("rt-")).map((player) => normalizePlayerName(player.name)));
assert.ok(generatedNames.every((name) => !realNames.has(name)), "Generated names must not collide with real sourced player names");
console.log(`Club database valid: ${teams.length} clubs, ${players.length} squad players (${realCount} Rising Transfers + ${generatedCount} generated), 8 competitions, all cross-references verified.`);
