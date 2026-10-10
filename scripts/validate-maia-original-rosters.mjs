import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const packs = [
  { id: "maia-club-world-2026", root: "docs/modding/examples/maia-club-world-2026", teams: 152, players: 3344, prefix: "msm-club-player-", clubSquads: true },
  { id: "maia-world-cup-2026", root: "docs/modding/examples/maia-world-cup-2026", teams: 48, players: 1363, prefix: "msm-national-player-", clubSquads: false },
];
const normalize = (value) => value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
async function readJson(root, path) {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

for (const packConfig of packs) {
  const pack = await readJson(packConfig.root, "package.json");
  const teamFile = await readJson(packConfig.root, "teams/teams.json");
  const playerFile = await readJson(packConfig.root, "players/players.json");
  const teams = teamFile.items;
  const players = playerFile.items;
  const byTeam = new Map(teams.map((team) => [team.id, team]));
  assert.equal(pack.id, packConfig.id);
  assert.equal(pack.license, "CC0-1.0");
  assert.equal(teamFile.schema, "team");
  assert.equal(playerFile.schema, "player");
  assert.equal(teams.length, packConfig.teams);
  assert.equal(players.length, packConfig.players);
  assert.equal(new Set(teams.map((team) => team.id)).size, teams.length);
  assert.equal(new Set(players.map((player) => player.id)).size, players.length);

  const names = [];
  const squads = new Map(teams.map((team) => [team.id, []]));
  for (const player of players) {
    const team = byTeam.get(player.club);
    assert.ok(team, `Unknown team reference: ${player.club}`);
    assert.ok(player.id.startsWith(packConfig.prefix), `Non-original player ID: ${player.id}`);
    assert.ok(player.name && player.firstName && player.lastName);
    assert.equal(player.nationality, team.country, `Nationality mismatch for ${player.id}`);
    assert.ok(Number.isInteger(player.age) && player.age >= 17 && player.age <= 34);
    assert.ok(Number.isInteger(player.overall) && player.overall >= 52 && player.overall <= 88);
    assert.ok(Number.isInteger(player.potential) && player.potential >= player.overall && player.potential <= 95);
    assert.ok(Number.isInteger(player.value) && player.value >= 0);
    assert.ok(["Goalkeeper", "Defender", "Midfielder", "Forward"].includes(player.position));
    names.push(normalize(player.name));
    squads.get(player.club).push(player);
  }
  assert.equal(new Set(names).size, names.length, "Fictional player names must be unique within each pack");

  if (packConfig.clubSquads) {
    for (const [teamId, squad] of squads) {
      assert.equal(squad.length, 22, `Squad size mismatch for ${teamId}`);
      assert.deepEqual(["Goalkeeper", "Defender", "Midfielder", "Forward"].map((role) =>
        squad.filter((player) => player.position === role).length,
      ), [3, 7, 7, 5], `Position balance mismatch for ${teamId}`);
    }
  } else {
    assert.equal(squads.size, 48);
    for (const [teamId, squad] of squads) {
      assert.ok(squad.length >= 20 && squad.length <= 40, `Unexpected national squad size for ${teamId}`);
    }
  }
  console.log(`${packConfig.id}: ${teams.length} teams and ${players.length} original fictional players validated.`);
}
