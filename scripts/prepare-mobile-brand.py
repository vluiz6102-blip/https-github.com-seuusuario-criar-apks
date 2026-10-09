#!/usr/bin/env python3
"""Brand the mobile app and add club selection without altering the match engine."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "game-source"
WEB = GAME / "web"


def replace_once(path: Path, old: str, new: str) -> None:
    if not path.is_file():
        raise SystemExit(f"Required upstream file is missing: {path}")
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one patch target in {path}, found {count}: {old!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_block(path: Path, old: str, new: str) -> None:
    replace_once(path, old, new)


def main() -> None:
    if not (GAME / "LICENSE").is_file() or not (WEB / "src" / "App.tsx").is_file():
        raise SystemExit("Game source is missing; checkout the submodule recursively.")

    replace_once(WEB / "index.html", "<title>Gandula</title>", "<title>Jornada 90</title>")
    replace_once(WEB / "src" / "App.tsx", "\n                Gandula\n", "\n                Jornada 90\n")

    # Player-facing start screen: pick one of the clubs already in the game.
    # A proper national-team career needs a separate competition model and is not
    # falsely exposed here as if it were implemented.
    (WEB / "src" / "components" / "GandulaSplash.tsx").write_text(
        """import { useState } from "react";
import { Box, Button, Select, Stack, Text, Title } from "@mantine/core";
import { ALL_TEAMS } from "../teams";

export function GandulaSplash({
  onStart,
  onFriendly,
}: {
  onStart: (teamId: number) => void;
  onFriendly: () => void;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  return (
    <Stack align="center" gap="lg" py={{ base: "lg", sm: "xl" }}>
      <Box
        aria-hidden="true"
        style={{
          width: 96,
          height: 96,
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
          style={{
            letterSpacing: "-0.03em",
            textShadow: "0 0 24px rgba(21, 184, 101, 0.5)",
          }}
        >
          Jornada 90
        </Title>
        <Text c="dimmed" ta="center" maw={420} px="md">
          Escolha o clube que deseja treinar. Monte o elenco, decida as táticas,
          negocie contratações e leve sua equipe ao título.
        </Text>
      </Stack>

      <Stack gap="sm" w="100%" maw={360} mt="md">
        <Select
          label="Clube para treinar"
          placeholder="Pesquisar clube..."
          searchable
          clearable
          nothingFoundMessage="Nenhum clube encontrado"
          data={[...ALL_TEAMS]
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            .map((team) => ({ value: String(team.id), label: team.name }))}
          value={selectedTeamId}
          onChange={setSelectedTeamId}
          size="md"
        />
        <Button
          size="md"
          disabled={selectedTeamId === null}
          onClick={() => {
            if (selectedTeamId !== null) onStart(Number(selectedTeamId));
          }}
        >
          Iniciar carreira
        </Button>
        <Button size="md" variant="default" onClick={onFriendly}>
          Amistoso
        </Button>
      </Stack>
    </Stack>
  );
}
""",
        encoding="utf-8",
    )

    season_path = WEB / "src" / "components" / "SeasonView.tsx"
    season = season_path.read_text(encoding="utf-8")
    replace_once(season_path, 'import SupportView from "./SupportView";\n', "")
    replace_once(season_path, '  | { tag: "friendly" }\n  | { tag: "support" };', '  | { tag: "friendly" };')
    replace_once(
        season_path,
        '''  function openSupport() {
    onStatus("apoiar o projeto");
    setPhase({ tag: "support" });
  }

  function backFromSupport() {
    onStatus("pronto");
    setPhase({ tag: "form" });
  }

''',
        "",
    )
    replace_once(
        season_path,
        '''          <GandulaSplash
            onStart={run}
            onFriendly={openFriendly}
            onSupport={openSupport}
          />''',
        '''          <GandulaSplash
            onStart={run}
            onFriendly={openFriendly}
          />''',
    )
    replace_once(season_path, '''      case "support":
        return <SupportView onBack={backFromSupport} />;
''', "")
    replace_once(season_path, "  function run() {", "  function run(selectedTeamId?: number) {")
    replace_once(
        season_path,
        '''      const [tierA, tierB, tierC] = divideIntoDivisions(ALL_TEAMS);
      const starterTeam = pickRandomStarter(tierC);''',
        '''      const [tierA, tierB, tierC] = divideIntoDivisions(ALL_TEAMS);
      const tiers = [tierA, tierB, tierC];
      const starterTeam =
        selectedTeamId === undefined
          ? pickRandomStarter(tierC)
          : ALL_TEAMS.find((team) => team.id === selectedTeamId);
      if (!starterTeam) {
        throw new Error("O clube selecionado não foi encontrado.");
      }
      const starterTierIndex = tiers.findIndex((tier) =>
        tier.some((team) => team.id === starterTeam.id),
      );
      if (starterTierIndex < 0) {
        throw new Error("O clube selecionado não pertence às divisões.");
      }
      const starterDivisionName =
        starterTierIndex === 0
          ? "Série A"
          : starterTierIndex === 1
            ? "Série B"
            : "Série C";
      const starterTier = (starterTierIndex + 1) as 1 | 2 | 3;''',
    )
    replace_once(
        season_path,
        "        manager: { money: STARTING_MONEY, ...seedStadiumForTier(3) },",
        "        manager: { money: STARTING_MONEY, ...seedStadiumForTier(starterTier) },",
    )
    replace_once(
        season_path,
        "`nova carreira · ${starterTeam.name} (Série C) · ano ${FIRST_YEAR} · 3 ligas simuladas em ${ms}ms · seed ${seed} · $ ${formatMoney(STARTING_MONEY)}`",
        "`nova carreira · ${starterTeam.name} (${starterDivisionName}) · ano ${FIRST_YEAR} · 3 ligas simuladas em ${ms}ms · seed ${seed} · $ ${formatMoney(STARTING_MONEY)}`",
    )
    season = season_path.read_text(encoding="utf-8")
    replace_once(
        season_path,
        '''// ─── Phase: form ────────────────────────────────────────────────────────────
// The branded landing lives in GandulaSplash. The team checkboxes are gone
// (the Brasileirão Imaginário plays with all 60 teams fixed) and the user no
// longer picks a team (assigned to a random Série C club — the bottom of the
// pyramid — via pickRandomStarter).''',
        '''// ─── Phase: form ────────────────────────────────────────────────────────────
// The mobile start screen lets the user choose a club from the existing registry.
// The original three-division simulation and progression engine remain unchanged.''',
    )

    # Visible branding and technology list only. Legal notices stay bundled.
    (WEB / "src" / "components" / "Footer.tsx").write_text(
        """import { Stack, Text } from "@mantine/core";

type FooterProps = {
  status: string;
};

export function Footer({ status }: FooterProps) {
  return (
    <Stack gap={4} mt="md">
      <Text c="dimmed" size="sm" ff="monospace" ta="center">
        &gt; {status}<span className="cursor">█</span>
      </Text>
      <Text c="dimmed" size="xs" ta="center">
        Jornada 90 · Victor Luiz
        <br />
        Tecnologias: React, TypeScript, Rust, WebAssembly, Vite e Capacitor 7
      </Text>
    </Stack>
  );
}
""",
        encoding="utf-8",
    )

    public_dir = WEB / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(GAME / "LICENSE", public_dir / "OPEN_SOURCE_LICENSES.txt")
    (public_dir / "J90-CREDITS.txt").write_text(
        "Jornada 90\n"
        "Personalização da marca e empacotamento Android: Victor Luiz.\n"
        "Tecnologias: React, TypeScript, Rust, WebAssembly, Vite e Capacitor 7.\n"
        "Avisos e textos de licenças de código aberto: OPEN_SOURCE_LICENSES.txt\n",
        encoding="utf-8",
    )

    assert "Jornada 90" in (WEB / "index.html").read_text(encoding="utf-8")
    assert "Jornada 90" in (WEB / "src" / "App.tsx").read_text(encoding="utf-8")
    assert "Clube para treinar" in (WEB / "src" / "components" / "GandulaSplash.tsx").read_text(encoding="utf-8")
    assert "Apoiar projeto" not in (WEB / "src" / "components" / "GandulaSplash.tsx").read_text(encoding="utf-8")
    assert "Victor Luiz" in (WEB / "src" / "components" / "Footer.tsx").read_text(encoding="utf-8")
    assert (public_dir / "OPEN_SOURCE_LICENSES.txt").is_file()
    print("BRANDING=OK; CLUB_SELECTOR=OK; SUPPORT_BUTTON=REMOVED; OPEN_SOURCE_LICENSE=INCLUDED")


if __name__ == "__main__":
    main()
