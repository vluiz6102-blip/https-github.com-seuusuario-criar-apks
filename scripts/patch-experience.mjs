import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const game = resolve(root, "game-source");
const web = resolve(game, "web");
const src = resolve(web, "src");
const components = resolve(src, "components");

function once(file, oldText, newText) {
  const original = readFileSync(file, "utf8");
  const count = original.split(oldText).length - 1;
  if (count !== 1) throw new Error("Expected one patch point in " + file + ", found " + count + ": " + oldText.slice(0, 90));
  writeFileSync(file, original.replace(oldText, newText), "utf8");
}

copyFileSync(resolve(root, "mobile-overlay/realFootballData.ts"), resolve(src, "realFootballData.ts"));
copyFileSync(resolve(root, "mobile-overlay/GandulaSplash.tsx"), resolve(components, "GandulaSplash.tsx"));
copyFileSync(resolve(root, "mobile-overlay/RealClubCareerView.tsx"), resolve(components, "RealClubCareerView.tsx"));
copyFileSync(resolve(root, "mobile-overlay/RealFootballNewsView.tsx"), resolve(components, "RealFootballNewsView.tsx"));
copyFileSync(resolve(root, "mobile-overlay/ExperienceTools.tsx"), resolve(components, "ExperienceTools.tsx"));
copyFileSync(resolve(root, "assets/j90-app-icon.svg"), resolve(web, "public/j90-app-icon.svg"));

const teamsFile = resolve(src, "teams.ts");
once(teamsFile,
  'import { NATIONAL_TEAMS } from "./nationalTeams";',
  'import { NATIONAL_TEAMS } from "./nationalTeams";\nimport { realTeamById } from "./realFootballData";',
);
once(teamsFile,
  'return ALL_TEAMS.find((t) => t.id === id) ?? NATIONAL_TEAMS.find((t) => t.id === id);',
  'return ALL_TEAMS.find((t) => t.id === id) ?? NATIONAL_TEAMS.find((t) => t.id === id) ?? realTeamById(id);',
);

const seasonFile = resolve(components, "SeasonView.tsx");
once(seasonFile,
  'import NationalTeamCareerView from "./NationalTeamCareerView";',
  'import NationalTeamCareerView from "./NationalTeamCareerView";\nimport RealClubCareerView from "./RealClubCareerView";',
);
once(seasonFile,
  '  | { tag: "friendly" }\n  | { tag: "national"; teamId: number };',
  '  | { tag: "friendly" }\n  | { tag: "national"; teamId: number }\n  | { tag: "realClub"; competitionId: string; teamId: number };',
);
once(seasonFile,
  '  const careerTeamName =\n    "career" in phase\n      ? teamById(phase.career.controlledTeamId)?.name ?? null\n      : phase.tag === "national"\n        ? teamById(phase.teamId)?.name ?? null\n        : null;',
  '  const careerTeamName =\n    "career" in phase\n      ? teamById(phase.career.controlledTeamId)?.name ?? null\n      : phase.tag === "national" || phase.tag === "realClub"\n        ? teamById(phase.teamId)?.name ?? null\n        : null;',
);
once(seasonFile,
  '          <GandulaSplash\n            onStart={run}\n            onStartNation={(teamId) => setPhase({ tag: "national", teamId })}\n            onFriendly={openFriendly}\n          />',
  '          <GandulaSplash\n            onStart={run}\n            onStartRealClub={(competitionId, teamId) => setPhase({ tag: "realClub", competitionId, teamId })}\n            onStartNation={(teamId) => setPhase({ tag: "national", teamId })}\n            onFriendly={openFriendly}\n          />',
);
once(seasonFile,
  '      case "national":\n        return (\n          <NationalTeamCareerView\n            teamId={phase.teamId}\n            onBack={() => setPhase({ tag: "form" })}\n            onStatus={onStatus}\n          />\n        );\n      case "friendly":',
  '      case "national":\n        return (\n          <NationalTeamCareerView\n            teamId={phase.teamId}\n            onBack={() => setPhase({ tag: "form" })}\n            onStatus={onStatus}\n          />\n        );\n      case "realClub":\n        return (\n          <RealClubCareerView\n            competitionId={phase.competitionId}\n            teamId={phase.teamId}\n            onBack={() => setPhase({ tag: "form" })}\n            onStatus={onStatus}\n          />\n        );\n      case "friendly":',
);

const appFile = resolve(src, "App.tsx");
once(appFile,
  'import { SeasonView } from "./components/SeasonView";',
  'import { SeasonView } from "./components/SeasonView";\nimport ExperienceTools from "./components/ExperienceTools";',
);
once(appFile,
  '  const [teamName, setTeamName] = useState<string | null>(null);',
  '  const [teamName, setTeamName] = useState<string | null>(null);\n  const [managerLabel, setManagerLabel] = useState("Treinador");',
);
once(appFile,
  '              {teamName ? (\n                <>\n                  <Text c="dimmed" fz="lg" style={{ flexShrink: 0 }}>\n                    ·\n                  </Text>\n                  <Text c="accent.3" fw={600} fz={{ base: "sm", sm: "md" }} truncate>\n                    {teamName}\n                  </Text>\n                </>\n              ) : (\n                <Badge variant="light" color="accent" radius="sm" size="sm">\n                  BETA\n                </Badge>\n              )}',
  '              {teamName ? (\n                <>\n                  <Text c="dimmed" fz="lg" style={{ flexShrink: 0 }}>·</Text>\n                  <Text c="accent.3" fw={600} fz={{ base: "sm", sm: "md" }} truncate>{teamName}</Text>\n                </>\n              ) : (\n                <Badge variant="light" color="accent" radius="sm" size="sm">MOBILE</Badge>\n              )}\n              <Text c="dimmed" size="xs" truncate maw={84}>{managerLabel}</Text>',
);
once(appFile,
  '            <Text c="dimmed" size="xs" ff="monospace" style={{ flexShrink: 0 }}>\n              v{__APP_VERSION__}\n            </Text>',
  '            <Stack gap={2} align="flex-end">\n              <Text c="dimmed" size="xs" ff="monospace" style={{ flexShrink: 0 }}>v{__APP_VERSION__}</Text>\n              <ExperienceTools onProfileChange={setManagerLabel} />\n            </Stack>',
);

const indexFile = resolve(web, "index.html");
once(indexFile,
  '    <meta name="theme-color" content="#15b865" />',
  '    <meta name="theme-color" content="#071d33" />',
);
once(indexFile,
  '    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />\n    <link rel="icon" type="image/png" sizes="1024x1024" href="/icon.png" />\n    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  '    <link rel="icon" type="image/svg+xml" href="/j90-app-icon.svg" />\n    <link rel="apple-touch-icon" href="/j90-app-icon.svg" />',
);

console.log("J90_EXPERIENCE_READY real-club-career manager-profile music ui-sounds news-center modern-icon");
