import { useEffect, useMemo, useState } from "react";
import { Anchor, Badge, Box, Group, Paper, Skeleton, Stack, Text, Title } from "@mantine/core";
import { REAL_COMPETITIONS, REAL_FOOTBALL_COUNTS, REAL_FOOTBALL_METADATA, formatEuro } from "../realFootballData";
import type { RealFootballPlayer } from "../realFootballData";

type Article = { title: string; url: string; domain: string; seendate?: string; language?: string };

export default function RealFootballNewsView() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Consultando manchetes externas…");
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);
    const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=football%20OR%20soccer&mode=ArtList&format=json&maxrecords=12&sort=HybridRel";
    fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => { if (!response.ok) throw new Error("Feed indisponível"); return response.json() as Promise<{ articles?: Article[] }>; })
      .then((data) => {
        const rows = (data.articles ?? []).filter((item) => item.title && item.url).slice(0, 12);
        setArticles(rows);
        setMessage(rows.length ? "Manchetes externas com link para o site de origem." : "Nenhuma manchete externa retornou neste momento.");
      })
      .catch(() => setMessage("Feed externo indisponível. Os dossiês da base local continuam disponíveis."))
      .finally(() => { window.clearTimeout(timeout); setLoading(false); });
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, []);

  const topPlayers = useMemo(() => {
    const all: Array<RealFootballPlayer & { club: string; country: string; competition: string }> = [];
    for (const competition of REAL_COMPETITIONS) for (const club of competition.clubs) {
      for (const player of club.players as RealFootballPlayer[]) if (player.marketValueEUR > 0) {
        all.push({ ...player, club: club.name, country: competition.countryName, competition: competition.name });
      }
    }
    const unique = new Map<number, (typeof all)[number]>();
    for (const player of all) {
      const previous = unique.get(player.id);
      if (!previous || player.marketValueEUR > previous.marketValueEUR) unique.set(player.id, player);
    }
    return [...unique.values()].sort((a, b) => b.marketValueEUR - a.marketValueEUR).slice(0, 8);
  }, []);

  return <Stack gap="md">
    <Box><Title order={2} fz={{ base: "h3", sm: "h2" }}>Central de Notícias</Title><Text c="dimmed" size="sm">Manchetes externas e boletins de dados do futebol. Matérias completas permanecem nos sites de origem.</Text></Box>
    <Paper withBorder radius="lg" p="md">
      <Group justify="space-between" align="center"><Title order={3} fz="lg">Manchetes do futebol</Title><Badge color={articles.length ? "green" : "gray"} variant="light">{articles.length ? "Feed conectado" : "Feed opcional"}</Badge></Group>
      <Text c="dimmed" size="xs" mt={4} mb="sm">{message}</Text>
      {loading && <Stack gap="sm">{[0,1,2].map((item) => <Skeleton key={item} height={48} radius="md" />)}</Stack>}
      {!loading && articles.length > 0 && <Stack gap="sm">{articles.map((article, index) => <Paper key={article.url + index} withBorder radius="md" p="sm">
        <Text fw={600} size="sm">{article.title}</Text>
        <Group justify="space-between" align="center" mt={5} gap="xs"><Text c="dimmed" size="xs">{article.domain || "Fonte externa"}{article.seendate ? " · " + article.seendate.slice(0,8) : ""}</Text><Anchor href={article.url} target="_blank" rel="noreferrer" size="sm">Ler no site</Anchor></Group>
      </Paper>)}</Stack>}
      {!loading && articles.length === 0 && <Text c="dimmed" size="sm">A parte externa precisa de internet; o radar de mercado abaixo funciona com os dados incluídos no app.</Text>}
    </Paper>
    <Paper withBorder radius="lg" p="md">
      <Title order={3} fz="lg">Radar do mercado</Title>
      <Text c="dimmed" size="xs" mt={4} mb="sm">Destaques calculados da base aberta. Não são rumores de transferência nem cotações ao vivo.</Text>
      <Stack gap="sm">{topPlayers.map((player, i) => <Group key={player.id} justify="space-between" align="center" wrap="nowrap" gap="sm">
        <Box style={{ width: 22, flexShrink: 0 }}><Text c="dimmed" size="sm">{i + 1}</Text></Box>
        <Box style={{ minWidth: 0, flex: 1 }}><Text size="sm" fw={600} truncate>{player.name}</Text><Text size="xs" c="dimmed" truncate>{player.club} · {player.country} · {player.competition}</Text></Box>
        <Text fw={700} size="sm" ta="right" style={{ flexShrink: 0 }}>{formatEuro(player.marketValueEUR)}</Text>
      </Group>)}</Stack>
    </Paper>
    <Paper withBorder radius="lg" p="md">
      <Title order={3} fz="lg">Ligas e elencos disponíveis</Title>
      <Group grow mt="sm">
        <Box><Text c="dimmed" size="xs">Competições</Text><Title order={3} fz="xl">{REAL_FOOTBALL_COUNTS.competitions}</Title></Box>
        <Box><Text c="dimmed" size="xs">Clubes jogáveis</Text><Title order={3} fz="xl">{REAL_FOOTBALL_COUNTS.clubs}</Title></Box>
        <Box><Text c="dimmed" size="xs">Jogadores únicos</Text><Title order={3} fz="xl">{REAL_FOOTBALL_COUNTS.players.toLocaleString("pt-BR")}</Title></Box>
      </Group>
      <Text c="dimmed" size="xs" mt="sm">{REAL_FOOTBALL_METADATA.marketValueNote}</Text>
      <Anchor href={REAL_FOOTBALL_METADATA.sourceUrl} target="_blank" rel="noreferrer" size="sm" mt="sm">Fonte dos dados e licença CC0</Anchor>
    </Paper>
  </Stack>;
}
