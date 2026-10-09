import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Divider, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { run_season } from "../wasm/gandula_wasm.js";
import type { SeasonRecord, TeamStats } from "../types";
import { computeStandings, goalDifference, points } from "../types";
import { REAL_COMPETITIONS, realClubById, formatEuro, playerOverall, positionLabel, type RealFootballPlayer } from "../realFootballData";

function roundCount(record: SeasonRecord): number {
  return record.fixtures.reduce((max, fixture) => Math.max(max, fixture.round + 1), 0);
}

export default function RealClubCareerView({ competitionId, teamId, onBack, onStatus }: {
  competitionId: string; teamId: number; onBack: () => void; onStatus: (message: string) => void;
}) {
  const competition = useMemo(() => REAL_COMPETITIONS.find((item) => item.id === competitionId), [competitionId]);
  const club = useMemo(() => realClubById(teamId), [teamId]);
  const teams = useMemo(() => competition?.clubs.map((item) => item.team) ?? [], [competition]);
  const record = useMemo(() => {
    if (!competition || teams.length < 8) return null;
    const suffix = Array.from(competition.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return run_season(teams, BigInt(20260706 + suffix * 1009 + teamId), competition.name) as SeasonRecord;
  }, [competition, teams, teamId]);
  const saveKey = \`j90-real-career-\${competitionId}-\${teamId}\`;
  const [roundIndex, setRoundIndex] = useState(() => {
    try {
      const saved = Number(window.localStorage.getItem(saveKey) ?? "0");
      return Number.isInteger(saved) && saved >= 0 ? saved : 0;
    } catch { return 0; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(saveKey, String(roundIndex)); } catch { /* private mode */ }
  }, [saveKey, roundIndex]);

  if (!competition || !club || !record) {
    return <Stack gap="md"><Text c="red">Não foi possível abrir a carreira deste clube. O elenco pode estar incompleto na fonte.</Text><Button onClick={onBack}>Voltar</Button></Stack>;
  }
  const rounds = roundCount(record);
  const done = Math.min(roundIndex, rounds);
  const teamMap = new Map(competition.clubs.map((item) => [item.id, item]));
  const standings: TeamStats[] = computeStandings(record.matches, record.fixtures, done, teams.map((team) => team.id));
  const playedRound = done === 0 ? 0 : done - 1;
  const fixtureRows = record.fixtures.map((fixture, index) => ({ fixture, match: record.matches[index] }))
    .filter(({ fixture }) => fixture.round === playedRound);
  const scoresVisible = done > 0;
  const players = (club.players as RealFootballPlayer[]).slice().sort((a, b) => b.marketValueEUR - a.marketValueEUR);
  const totalValue = players.reduce((sum, player) => sum + player.marketValueEUR, 0);
  const position = standings.findIndex((stats) => stats.team_id === club.id) + 1;

  function playNextRound() {
    if (done >= rounds) return;
    const next = done + 1;
    setRoundIndex(next);
    onStatus(\`Carreira real · \${club.name} · \${competition.name} · rodada \${next}/\${rounds}\`);
  }
  function resetSeason() {
    setRoundIndex(0);
    onStatus(\`Temporada reiniciada · \${club.name}\`);
  }

  return (
    <Stack gap="md">
      <Paper withBorder radius="lg" p="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box style={{ minWidth: 0, flex: 1 }}>
            <Text c="dimmed" size="xs" tt="uppercase">{competition.countryName} · {competition.name}</Text>
            <Title order={2} fz={{ base: "h3", sm: "h2" }} mt={4}>{club.name}</Title>
            <Text c="dimmed" size="sm">{club.stadiumName || "Estádio não informado"}{club.stadiumCapacity > 0 ? \` · \${club.stadiumCapacity.toLocaleString("pt-BR")} lugares\` : ""}</Text>
          </Box>
          <Badge color="green" variant="light">Clube real</Badge>
        </Group>
        <Divider my="sm" />
        <Group grow align="flex-start">
          <Box><Text c="dimmed" size="xs">Elenco disponível</Text><Title order={3} fz="xl">{players.length} jogadores</Title></Box>
          <Box><Text c="dimmed" size="xs">Valor reportado do elenco</Text><Title order={3} fz="xl">{formatEuro(totalValue)}</Title></Box>
          <Box><Text c="dimmed" size="xs">Classificação parcial</Text><Title order={3} fz="xl">{position > 0 ? \`\${position}º\` : "—"}</Title></Box>
        </Group>
      </Paper>

      <Paper withBorder radius="lg" p="md">
        <Group justify="space-between" align="center">
          <Box><Title order={3} fz="lg">Temporada · rodada {done}/{rounds}</Title><Text c="dimmed" size="xs">Partidas simuladas pelo motor Rust/WebAssembly</Text></Box>
          <Badge color={done >= rounds ? "yellow" : "blue"}>{done >= rounds ? "Temporada concluída" : "Em andamento"}</Badge>
        </Group>
        <Stack gap="xs" mt="sm">
          {fixtureRows.map(({ match }, index) => {
            const home = teamMap.get(match.home);
            const away = teamMap.get(match.away);
            if (!home || !away) return null;
            const selected = match.home === club.id || match.away === club.id;
            return (
              <Paper key={\`\${playedRound}-\${index}\`} withBorder={selected} radius="md" p="sm"
                style={selected ? { borderColor: "var(--mantine-color-green-5)", background: "var(--mantine-color-green-light)" } : undefined}>
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Text fw={selected ? 700 : 500} size="sm" style={{ flex: 1, minWidth: 0 }} truncate>{home.name}</Text>
                  <Text fw={800} ff="monospace" style={{ flexShrink: 0 }}>{scoresVisible ? \`\${match.result.home_goals} - \${match.result.away_goals}\` : "vs"}</Text>
                  <Text fw={selected ? 700 : 500} size="sm" ta="right" style={{ flex: 1, minWidth: 0 }} truncate>{away.name}</Text>
                </Group>
              </Paper>
            );
          })}
        </Stack>
        <Group mt="md" grow>
          <Button onClick={playNextRound} disabled={done >= rounds}>{done >= rounds ? "Temporada concluída" : \`Jogar rodada \${done + 1}\`}</Button>
          <Button variant="default" onClick={resetSeason} disabled={done === 0}>Reiniciar temporada</Button>
        </Group>
      </Paper>

      <Paper withBorder radius="lg" p="md">
        <Title order={3} fz="lg">Classificação</Title>
        <Text c="dimmed" size="xs" mb="sm">Somente as rodadas já disputadas entram na tabela.</Text>
        <Stack gap={4} hiddenFrom="sm">
          {standings.map((stats, index) => {
            const item = teamMap.get(stats.team_id);
            if (!item) return null;
            const gd = goalDifference(stats);
            return <Group key={stats.team_id} gap="xs" wrap="nowrap" style={{ padding: 8, borderRadius: 8, background: item.id === club.id ? "var(--mantine-color-green-light)" : undefined }}>
              <Text size="sm" fw={800} w={22}>{index + 1}</Text>
              <Box style={{ flex: 1, minWidth: 0 }}><Text size="sm" fw={item.id === club.id ? 800 : 500} truncate>{item.name}</Text><Text c="dimmed" size="xs">{stats.played}J · {stats.won}V {stats.drawn}E {stats.lost}D</Text></Box>
              <Box ta="right"><Text fw={800}>{points(stats)}</Text><Text c="dimmed" size="xs">SG {gd > 0 ? "+" : ""}{gd}</Text></Box>
            </Group>;
          })}
        </Stack>
        <Table.ScrollContainer minWidth={360} visibleFrom="sm">
          <Table fz="sm"><Table.Thead><Table.Tr><Table.Th>#</Table.Th><Table.Th>Clube</Table.Th><Table.Th ta="right">J</Table.Th><Table.Th ta="right">SG</Table.Th><Table.Th ta="right">Pts</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{standings.map((stats, index) => {
              const item = teamMap.get(stats.team_id);
              if (!item) return null;
              const gd = goalDifference(stats);
              return <Table.Tr key={stats.team_id} bg={item.id === club.id ? "var(--mantine-color-green-light)" : undefined}>
                <Table.Td>{index + 1}</Table.Td><Table.Td fw={item.id === club.id ? 800 : 500}>{item.name}</Table.Td>
                <Table.Td ta="right">{stats.played}</Table.Td><Table.Td ta="right">{gd > 0 ? "+" : ""}{gd}</Table.Td><Table.Td ta="right" fw={800}>{points(stats)}</Table.Td>
              </Table.Tr>;
            })}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Paper withBorder radius="lg" p="md">
        <Title order={3} fz="lg">Elenco real e valores de mercado</Title>
        <Text c="dimmed" size="xs" mt={4} mb="sm">Nomes, clubes e valores reportados da base CC0. GER e atributos são estimativas de jogo.</Text>
        <Stack gap="xs">
          {players.slice(0, 36).map((player) => <Group key={player.id} gap="sm" wrap="nowrap" align="center">
            <Box style={{ minWidth: 0, flex: 1 }}><Text size="sm" fw={600} truncate>{player.name}</Text><Text size="xs" c="dimmed">{positionLabel(player.position)} · {player.age} anos · GER estimado {playerOverall(player)}</Text></Box>
            <Text size="sm" fw={700} ta="right" style={{ flexShrink: 0 }}>{formatEuro(player.marketValueEUR)}</Text>
          </Group>)}
        </Stack>
        {players.length > 36 && <Text c="dimmed" size="xs" mt="sm">Exibindo os 36 atletas de maior valor do elenco.</Text>}
      </Paper>
      <Paper withBorder radius="lg" p="md"><Text c="dimmed" size="xs">Snapshot de dados: 06/07/2026. A fonte informa que avaliações podem ser anteriores a 27/02/2026.</Text></Paper>
      <Button variant="default" onClick={onBack}>Voltar à escolha de clube</Button>
    </Stack>
  );
}
