import { useMemo, useState } from "react";
import {
  Badge, Box, Button, Checkbox, Divider, Group, Paper, Stack, Table, Text, Title,
} from "@mantine/core";
import { run_season } from "../wasm/gandula_wasm.js";
import type { SeasonRecord, TeamStats } from "../types";
import { computeStandings, goalDifference, points } from "../types";
import { NATIONAL_TEAMS, type NationalTeam, type NationalPlayer } from "../nationalTeams";

type GroupMatch = {
  round: number;
  home: NationalTeam;
  away: NationalTeam;
  homeGoals: number;
  awayGoals: number;
};
type GroupResult = {
  letter: string;
  teams: NationalTeam[];
  standings: TeamStats[];
  matches: GroupMatch[];
};
type KnockoutMatch = {
  home: NationalTeam;
  away: NationalTeam;
  homeGoals: number;
  awayGoals: number;
  winner: NationalTeam;
  note?: string;
};
type KnockoutRound = { title: string; matches: KnockoutMatch[] };

function strength(team: NationalTeam): number {
  return team.worldcup_overall;
}
function roundTitle(teamCount: number): string {
  if (teamCount === 32) return "Fase de 32";
  if (teamCount === 16) return "Oitavas de final";
  if (teamCount === 8) return "Quartas de final";
  if (teamCount === 4) return "Semifinais";
  return "Final";
}
export default function NationalTeamCareerView({
  teamId,
  onBack,
  onStatus,
}: {
  teamId: number;
  onBack: () => void;
  onStatus: (msg: string) => void;
}) {
  const nation = NATIONAL_TEAMS.find((team) => team.id === teamId);
  const [selectedXI, setSelectedXI] = useState<number[]>(nation?.starting_xi ?? []);
  const [stage, setStage] = useState<"lineup" | "groups" | "knockout" | "finished">("lineup");
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [bracketTeams, setBracketTeams] = useState<NationalTeam[]>([]);
  const [roundHistory, setRoundHistory] = useState<KnockoutRound[]>([]);
  const [champion, setChampion] = useState<NationalTeam | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupsByLetter = useMemo(() => {
    const map = new Map<string, NationalTeam[]>();
    for (const team of NATIONAL_TEAMS) {
      map.set(team.group, [...(map.get(team.group) ?? []), team]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, []);

  if (!nation) {
    return (
      <Stack gap="md">
        <Text c="red">Não foi possível carregar esta seleção.</Text>
        <Button onClick={onBack}>Voltar</Button>
      </Stack>
    );
  }

  const customNation: NationalTeam = { ...nation, starting_xi: selectedXI };
  const validXI = selectedXI.length === 11 && selectedXI.some((id) => nation.roster.some((p) => p.id === id && p.position === "GK"));

  function togglePlayer(playerId: number, checked: boolean) {
    setSelectedXI((previous) => {
      if (checked) {
        if (previous.length >= 11 || previous.includes(playerId)) return previous;
        return [...previous, playerId];
      }
      return previous.filter((id) => id !== playerId);
    });
  }

  function startGroups() {
    setError(null);
    try {
      const results = groupsByLetter.map(([letter, groupTeams], groupIndex) => {
        const lineup = groupTeams.map((team) => team.id === customNation.id ? customNation : team);
        const record = run_season(
          lineup,
          BigInt(20260601 + groupIndex * 7919),
          "Grupo " + letter,
        ) as SeasonRecord;
        const standings = computeStandings(record.matches, record.fixtures, 3, lineup.map((team) => team.id));
        const byId = new Map(lineup.map((team) => [team.id, team]));
        const matches: GroupMatch[] = record.fixtures
          .map((fixture, i) => ({ fixture, match: record.matches[i] }))
          .filter(({ fixture, match }) => fixture.round < 3 && Boolean(match))
          .map(({ fixture, match }) => ({
            round: fixture.round + 1,
            home: byId.get(match.home)!,
            away: byId.get(match.away)!,
            homeGoals: match.result.home_goals,
            awayGoals: match.result.away_goals,
          }));
        return { letter, teams: lineup, standings, matches };
      });
      setGroups(results);
      setStage("groups");
      onStatus("Mundial de seleções · fase de grupos simulada");
    } catch (e) {
      setError(String(e));
      onStatus("erro na fase de grupos: " + String(e));
    }
  }

  function qualify() {
    const topTwo: NationalTeam[] = [];
    const thirdPlace: Array<{ team: NationalTeam; stats: TeamStats }> = [];
    for (const group of groups) {
      for (const stats of group.standings.slice(0, 2)) {
        const team = group.teams.find((x) => x.id === stats.team_id);
        if (team) topTwo.push(team);
      }
      const thirdStats = group.standings[2];
      const thirdTeam = thirdStats ? group.teams.find((x) => x.id === thirdStats.team_id) : undefined;
      if (thirdStats && thirdTeam) thirdPlace.push({ team: thirdTeam, stats: thirdStats });
    }
    thirdPlace.sort((a, b) =>
      points(b.stats) - points(a.stats) ||
      goalDifference(b.stats) - goalDifference(a.stats) ||
      b.stats.goals_for - a.stats.goals_for ||
      a.team.id - b.team.id,
    );
    const qualified = [...topTwo, ...thirdPlace.slice(0, 8).map((x) => x.team)]
      .sort((a, b) => strength(b) - strength(a) || a.id - b.id);
    if (qualified.length !== 32) {
      setError("Falha ao formar os 32 classificados. Volte e gere a fase de grupos novamente.");
      return;
    }
    setBracketTeams(qualified);
    setRoundHistory([]);
    setChampion(null);
    setStage("knockout");
    onStatus("Mata-mata iniciado · 32 seleções classificadas");
  }

  function playNextRound() {
    setError(null);
    try {
      const current = bracketTeams;
      if (current.length < 2) return;
      const title = roundTitle(current.length);
      const results: KnockoutMatch[] = [];
      const winners: NationalTeam[] = [];
      for (let i = 0; i < current.length / 2; i++) {
        const home = current[i];
        const away = current[current.length - 1 - i];
        const record = run_season(
          [home, away],
          BigInt(20261009 + roundHistory.length * 100003 + i * 101),
          "Mata-mata " + title,
        ) as SeasonRecord;
        let homeGoals = 0;
        let awayGoals = 0;
        for (const match of record.matches.slice(0, 2)) {
          if (match.home === home.id) {
            homeGoals += match.result.home_goals;
            awayGoals += match.result.away_goals;
          } else if (match.home === away.id) {
            awayGoals += match.result.home_goals;
            homeGoals += match.result.away_goals;
          }
        }
        let winner = home;
        let note: string | undefined;
        if (homeGoals < awayGoals) winner = away;
        else if (homeGoals === awayGoals) {
          if (strength(away) > strength(home) || (strength(away) === strength(home) && away.id < home.id)) winner = away;
          note = "Desempate aplicado";
        }
        winners.push(winner);
        results.push({ home, away, homeGoals, awayGoals, winner, note });
      }
      setRoundHistory((previous) => [...previous, { title, matches: results }]);
      if (winners.length === 1) {
        setChampion(winners[0]);
        setStage("finished");
        onStatus("Campeã do Mundial: " + winners[0].name);
      } else {
        setBracketTeams(winners);
        onStatus(title + " concluída · " + winners.length + " seleções avançam");
      }
    } catch (e) {
      setError(String(e));
      onStatus("erro no mata-mata: " + String(e));
    }
  }

  const playerLabel = (player: NationalPlayer) =>
    "#" + player.shirt_number + " · " + player.name + " · " + player.position + " · " + player.club;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Box style={{ minWidth: 0 }}>
          <Title order={2} fz={{ base: "h3", sm: "h2" }}>Mundial de seleções</Title>
          <Text c="dimmed" size="sm">{nation.name} · {nation.fifa_code} · Grupo {nation.group}</Text>
        </Box>
        <Badge color="green">Elenco real 2026</Badge>
      </Group>

      {stage === "lineup" && (
        <>
          <Paper withBorder p="sm" radius="md">
            <Text fw={700} mb={4}>Monte os 11 titulares</Text>
            <Text c="dimmed" size="sm">
              Selecione 11 jogadores, incluindo ao menos um goleiro. Clubes, nomes, camisas e posições vêm do elenco publicado; atributos são estimativas de simulação.
            </Text>
            <Text fw={600} mt="sm">{selectedXI.length}/11 selecionados</Text>
            <Divider my="sm" />
            <Stack gap="xs">
              {(nation.roster as NationalPlayer[]).map((player) => (
                <Checkbox
                  key={player.id}
                  checked={selectedXI.includes(player.id)}
                  disabled={!selectedXI.includes(player.id) && selectedXI.length >= 11}
                  onChange={(event) => togglePlayer(player.id, event.currentTarget.checked)}
                  label={
                    <Box>
                      <Text size="sm" fw={500}>{playerLabel(player)}</Text>
                      <Text size="xs" c="dimmed">
                        {player.date_of_birth} · {Math.round((
                          player.attributes.pace + player.attributes.technique + player.attributes.passing +
                          player.attributes.defending + player.attributes.finishing + player.attributes.stamina
                        ) / 6)} GER estimado
                      </Text>
                    </Box>
                  }
                />
              ))}
            </Stack>
          </Paper>
          <Button size="md" disabled={!validXI} onClick={startGroups}>Iniciar Mundial</Button>
          <Button variant="default" onClick={onBack}>Voltar à escolha de equipe</Button>
        </>
      )}

      {stage === "groups" && (
        <>
          <Paper withBorder p="sm" radius="md">
            <Title order={3} fz="lg">Seu grupo: {groups.find((g) => g.letter === nation.group)?.letter ?? nation.group}</Title>
            <Stack gap="xs" mt="sm">
              {(groups.find((g) => g.letter === nation.group)?.matches ?? []).map((match, i) => (
                <Group key={i} justify="space-between" wrap="nowrap" gap="xs">
                  <Text size="sm" truncate>{match.home.name}</Text>
                  <Text fw={800} ff="monospace">{match.homeGoals} - {match.awayGoals}</Text>
                  <Text size="sm" ta="right" truncate>{match.away.name}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
          <Title order={3} fz="lg">Classificação dos grupos</Title>
          {groups.map((group) => (
            <Paper withBorder p="sm" radius="md" key={group.letter}>
              <Text fw={700} mb="xs">Grupo {group.letter}</Text>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>#</Table.Th><Table.Th>Seleção</Table.Th><Table.Th ta="right">J</Table.Th>
                    <Table.Th ta="right">SG</Table.Th><Table.Th ta="right">Pts</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {group.standings.map((stats, index) => {
                    const team = group.teams.find((x) => x.id === stats.team_id)!;
                    return (
                      <Table.Tr key={team.id} bg={team.id === nation.id ? "var(--mantine-color-green-light)" : undefined}>
                        <Table.Td>{index + 1}</Table.Td>
                        <Table.Td>{team.name}</Table.Td>
                        <Table.Td ta="right">{stats.played}</Table.Td>
                        <Table.Td ta="right">{goalDifference(stats) > 0 ? "+" : ""}{goalDifference(stats)}</Table.Td>
                        <Table.Td ta="right" fw={700}>{points(stats)}</Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
          ))}
          <Button size="md" onClick={qualify}>Classificar para o mata-mata</Button>
          <Button variant="default" onClick={onBack}>Voltar à escolha de equipe</Button>
        </>
      )}

      {(stage === "knockout" || stage === "finished") && (
        <>
          {champion && (
            <Paper withBorder p="lg" radius="md">
              <Text c="dimmed" ta="center" size="sm">CAMPEÃ DO MUNDIAL</Text>
              <Title order={2} ta="center" mt="xs">{champion.name}</Title>
              <Text ta="center" c="dimmed">{champion.fifa_code}</Text>
            </Paper>
          )}
          {roundHistory.map((round, index) => (
            <Paper withBorder p="sm" radius="md" key={index}>
              <Text fw={700} mb="sm">{round.title}</Text>
              <Stack gap="xs">
                {round.matches.map((match, i) => (
                  <Box key={i}>
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                      <Text size="sm" fw={match.winner.id === match.home.id ? 700 : 400} truncate>{match.home.name}</Text>
                      <Text ff="monospace" fw={800}>{match.homeGoals} - {match.awayGoals}</Text>
                      <Text size="sm" fw={match.winner.id === match.away.id ? 700 : 400} ta="right" truncate>{match.away.name}</Text>
                    </Group>
                    {match.note && <Text c="dimmed" size="xs">{match.note}: avançou {match.winner.name}</Text>}
                  </Box>
                ))}
              </Stack>
            </Paper>
          ))}
          {stage === "knockout" && (
            <>
              <Text c="dimmed" size="sm">Próxima fase: {roundTitle(bracketTeams.length)} · {bracketTeams.length} seleções</Text>
              <Button size="md" onClick={playNextRound}>Simular {roundTitle(bracketTeams.length).toLowerCase()}</Button>
            </>
          )}
          <Button variant="default" onClick={onBack}>Voltar à escolha de equipe</Button>
        </>
      )}

      {error && <Text c="red" style={{ whiteSpace: "pre-wrap" }}>{error}</Text>}
    </Stack>
  );
}
