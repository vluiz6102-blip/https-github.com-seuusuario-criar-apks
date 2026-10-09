import { useMemo, useState } from "react";
import { Box, Button, Select, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { ALL_TEAMS } from "../teams";
import { NATIONAL_TEAMS } from "../nationalTeams";

export function GandulaSplash({
  onStart,
  onStartNation,
  onFriendly,
}: {
  onStart: (teamId: number) => void;
  onStartNation: (teamId: number) => void;
  onFriendly: () => void;
}) {
  const [mode, setMode] = useState<string>("club");
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedNationId, setSelectedNationId] = useState<string | null>(null);

  const clubOptions = useMemo(
    () => [...ALL_TEAMS]
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map((team) => ({ value: String(team.id), label: team.name })),
    [],
  );
  const nationOptions = useMemo(
    () => [...NATIONAL_TEAMS]
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map((team) => ({ value: String(team.id), label: team.name + " (" + team.fifa_code + ")" })),
    [],
  );

  const canStart = mode === "club" ? selectedClubId !== null : selectedNationId !== null;

  return (
    <Stack align="center" gap="lg" py={{ base: "lg", sm: "xl" }}>
      <Box
        aria-hidden="true"
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 35% 30%, #ffffff 0%, #c8f5dc 18%, var(--mantine-color-accent-5) 60%, var(--mantine-color-accent-8) 100%)",
          boxShadow:
            "0 0 32px 6px rgba(21, 184, 101, 0.55), inset 0 0 12px rgba(255,255,255,0.4)",
        }}
      />
      <Stack align="center" gap={4}>
        <Title
          order={1}
          fz={{ base: 40, sm: 56 }}
          ta="center"
          style={{ letterSpacing: "-0.03em", textShadow: "0 0 24px rgba(21, 184, 101, 0.5)" }}
        >
          Jornada 90
        </Title>
        <Text c="dimmed" ta="center" maw={420} px="md">
          Escolha quem vai treinar. Gerencie o clube ou dispute o Mundial com uma seleção nacional.
        </Text>
      </Stack>

      <Stack gap="sm" w="100%" maw={380} mt="md">
        <SegmentedControl
          fullWidth
          size="md"
          value={mode}
          onChange={(value) => {
            setMode(value);
            setSelectedClubId(null);
            setSelectedNationId(null);
          }}
          data={[
            { label: "Clube", value: "club" },
            { label: "Seleção", value: "nation" },
          ]}
        />
        {mode === "club" ? (
          <Select
            label="Clube para treinar"
            placeholder="Pesquisar clube..."
            searchable
            clearable
            nothingFoundMessage="Nenhum clube encontrado"
            data={clubOptions}
            value={selectedClubId}
            onChange={setSelectedClubId}
            size="md"
          />
        ) : (
          <Select
            label="Seleção nacional"
            description="Elencos do Mundial de 2026 · 48 seleções · 1.248 jogadores"
            placeholder="Pesquisar seleção..."
            searchable
            clearable
            nothingFoundMessage="Nenhuma seleção encontrada"
            data={nationOptions}
            value={selectedNationId}
            onChange={setSelectedNationId}
            size="md"
          />
        )}
        <Button
          size="md"
          disabled={!canStart}
          onClick={() => {
            if (mode === "club" && selectedClubId !== null) onStart(Number(selectedClubId));
            if (mode === "nation" && selectedNationId !== null) onStartNation(Number(selectedNationId));
          }}
        >
          {mode === "club" ? "Iniciar carreira" : "Treinar seleção"}
        </Button>
        <Button size="md" variant="default" onClick={onFriendly}>
          Amistoso
        </Button>
      </Stack>
    </Stack>
  );
}
