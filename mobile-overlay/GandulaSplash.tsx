import { useMemo, useState } from "react";
import { Box, Button, Select, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { REAL_COMPETITIONS, REAL_FOOTBALL_COUNTS } from "../realFootballData";
import { NATIONAL_TEAMS } from "../nationalTeams";

export function GandulaSplash({
  onStart, onStartRealClub, onStartNation, onFriendly,
}: {
  onStart: () => void;
  onStartRealClub: (competitionId: string, teamId: number) => void;
  onStartNation: (teamId: number) => void;
  onFriendly: () => void;
}) {
  const [mode, setMode] = useState("club");
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedNation, setSelectedNation] = useState<string | null>(null);
  const clubOptions = useMemo(() => REAL_COMPETITIONS.map((competition) => ({
    group: competition.countryName + " · " + competition.name,
    items: competition.clubs.map((club) => ({ value: competition.id + "::" + club.id, label: club.name })),
  })), []);
  const nationOptions = useMemo(() => NATIONAL_TEAMS.slice().sort((a,b) => a.name.localeCompare(b.name,"pt-BR"))
    .map((team) => ({ value: String(team.id), label: team.name + " (" + team.fifa_code + ")" })), []);
  const canStart = mode === "club" ? selectedClub !== null : mode === "nation" ? selectedNation !== null : true;

  return <Stack align="center" gap="lg" py={{ base:"lg", sm:"xl" }}>
    <Box aria-hidden="true" style={{ width:92, height:92, borderRadius:24, background:"linear-gradient(145deg,#163e6b,#071d33 62%,#04121f)", border:"2px solid #2bdd83", boxShadow:"0 0 30px rgba(37,211,102,.20)", display:"grid", placeItems:"center" }}>
      <Text fw={900} fz={32} c="white" style={{ letterSpacing:"-0.07em" }}>J<Text span c="#80ff43">90</Text></Text>
    </Box>
    <Stack align="center" gap={4}>
      <Title order={1} fz={{base:40,sm:56}} ta="center" style={{letterSpacing:"-0.03em"}}>Jornada 90</Title>
      <Text c="dimmed" ta="center" maw={440} px="md">Seu clube. Sua história. Assuma um clube real, escolha uma seleção ou jogue no modo clássico.</Text>
    </Stack>
    <Stack gap="sm" w="100%" maw={420} mt="md">
      <SegmentedControl fullWidth size="md" value={mode} onChange={(value) => { setMode(value); setSelectedClub(null); setSelectedNation(null); }}
        data={[{label:"Clubes reais",value:"club"},{label:"Seleções",value:"nation"},{label:"Clássico",value:"classic"}]} />
      {mode === "club" && <>
        <Select label="Clube para treinar" description={REAL_FOOTBALL_COUNTS.clubs.toLocaleString("pt-BR")+" clubes com elenco jogável · "+REAL_FOOTBALL_COUNTS.competitions+" competições"}
          placeholder="Pesquisar clube..." searchable clearable nothingFoundMessage="Nenhum clube jogável encontrado"
          data={clubOptions} value={selectedClub} onChange={setSelectedClub} size="md" />
        <Text c="dimmed" size="xs">Elencos e valores vêm do conjunto aberto; a cobertura depende da competição. Valores podem estar desatualizados.</Text>
      </>}
      {mode === "nation" && <Select label="Seleção nacional" description="Mundial 2026 · 48 seleções · 1.248 jogadores no snapshot"
        placeholder="Pesquisar seleção..." searchable clearable nothingFoundMessage="Nenhuma seleção encontrada"
        data={nationOptions} value={selectedNation} onChange={setSelectedNation} size="md" />}
      <Button size="md" disabled={!canStart} onClick={() => {
        if (mode === "club" && selectedClub) {
          const [competitionId, idText] = selectedClub.split("::");
          const teamId = Number(idText);
          if (competitionId && Number.isFinite(teamId)) onStartRealClub(competitionId, teamId);
        } else if (mode === "nation" && selectedNation) onStartNation(Number(selectedNation));
        else if (mode === "classic") onStart();
      }}>{mode === "club" ? "Assumir clube" : mode === "nation" ? "Treinar seleção" : "Carreira clássica"}</Button>
      <Button size="md" variant="default" onClick={onFriendly}>Amistoso clássico</Button>
    </Stack>
    <Text c="dimmed" size="xs" ta="center" maw={440}>Snapshot de mercado: julho de 2026; atributos são estimativas, não avaliações oficiais.</Text>
  </Stack>;
}
