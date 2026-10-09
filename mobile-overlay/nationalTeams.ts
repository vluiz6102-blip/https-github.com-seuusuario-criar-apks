import source from "./worldcup2026-squads.json";
import type { Team, Player, Position } from "./types";

type RawPlayer = {
  number: number;
  pos: string;
  name: string;
  club: string;
  club_country: string;
  date_of_birth: string;
};
type RawNation = {
  name: string;
  fifa_code: string;
  group: string;
  players: RawPlayer[];
};
type RawSource = { teams: RawNation[] };

export type NationalPlayer = Player & {
  shirt_number: number;
  club: string;
  club_country: string;
  date_of_birth: string;
};
export type NationalTeam = Team & {
  fifa_code: string;
  group: string;
  worldcup_overall: number;
  roster: NationalPlayer[];
};

const data = source as RawSource;
const COUNTRY_NAMES: Record<string, string> = {
  "Argentina": "Argentina",
  "Australia": "Austrália",
  "Austria": "Áustria",
  "Belgium": "Bélgica",
  "Brazil": "Brasil",
  "Canada": "Canadá",
  "Cape Verde": "Cabo Verde",
  "Colombia": "Colômbia",
  "Croatia": "Croácia",
  "Curaçao": "Curaçao",
  "Czech Republic": "República Tcheca",
  "Denmark": "Dinamarca",
  "Ecuador": "Equador",
  "Egypt": "Egito",
  "England": "Inglaterra",
  "France": "França",
  "Germany": "Alemanha",
  "Ghana": "Gana",
  "Haiti": "Haiti",
  "Iran": "Irã",
  "Iraq": "Iraque",
  "Italy": "Itália",
  "Ivory Coast": "Costa do Marfim",
  "Japan": "Japão",
  "Jordan": "Jordânia",
  "Mexico": "México",
  "Morocco": "Marrocos",
  "Netherlands": "Países Baixos",
  "New Zealand": "Nova Zelândia",
  "Norway": "Noruega",
  "Panama": "Panamá",
  "Paraguay": "Paraguai",
  "Portugal": "Portugal",
  "Qatar": "Catar",
  "Saudi Arabia": "Arábia Saudita",
  "Scotland": "Escócia",
  "Senegal": "Senegal",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  "Spain": "Espanha",
  "Sweden": "Suécia",
  "Switzerland": "Suíça",
  "Tunisia": "Tunísia",
  "Turkey": "Turquia",
  "Ukraine": "Ucrânia",
  "United States": "Estados Unidos",
  "Uruguay": "Uruguai",
  "Uzbekistan": "Uzbequistão",
  "DR Congo": "RD do Congo",
};

const TEAM_LEVEL: Record<string, number> = {
  "Argentina": 85, "Brazil": 86, "France": 86, "Spain": 85, "England": 84,
  "Portugal": 84, "Germany": 83, "Netherlands": 82, "Belgium": 81, "Croatia": 80,
  "Morocco": 80, "Uruguay": 80, "Colombia": 80, "Japan": 78, "Switzerland": 78,
  "United States": 77, "Mexico": 76, "Senegal": 77, "Denmark": 78, "Austria": 77,
  "Norway": 78, "South Korea": 75, "Ecuador": 77, "Australia": 73, "Canada": 75,
};

const clamp = (v: number) => Math.max(45, Math.min(94, Math.round(v)));
const positionOf = (p: string): Position =>
  p === "GK" ? "GK" : p === "DF" ? "DEF" : p === "MF" ? "MID" : "FWD";

function buildNation(raw: RawNation, index: number): NationalTeam {
  const id = 1001 + index;
  const base = TEAM_LEVEL[raw.name] ?? (68 + ((index * 7) % 10));
  const roster: NationalPlayer[] = raw.players.map((p, playerIndex) => {
    const pos = positionOf(p.pos);
    const variation = ((playerIndex * 7 + index * 11) % 13) - 6;
    const overall = base + variation;
    const pace = clamp(overall + (pos === "FWD" ? 8 : pos === "DEF" ? -3 : pos === "GK" ? -18 : 1));
    const technique = clamp(overall + (pos === "MID" ? 6 : pos === "FWD" ? 3 : pos === "GK" ? -15 : 0));
    const passing = clamp(overall + (pos === "MID" ? 8 : pos === "GK" ? -18 : 0));
    const defending = clamp(overall + (pos === "DEF" ? 9 : pos === "GK" ? -7 : pos === "FWD" ? -13 : -2));
    const finishing = clamp(overall + (pos === "FWD" ? 9 : pos === "GK" ? -20 : pos === "DEF" ? -10 : 0));
    const stamina = clamp(overall + (pos === "GK" ? -10 : 1));
    const birthYear = Number(p.date_of_birth.slice(0, 4));
    return {
      id: 100000 + index * 100 + (p.number || playerIndex + 1),
      name: p.name,
      age: Number.isFinite(birthYear) && birthYear > 1900 ? 2026 - birthYear : 27,
      position: pos,
      attributes: { pace, technique, passing, defending, finishing, stamina },
      shirt_number: p.number,
      club: p.club,
      club_country: p.club_country,
      date_of_birth: p.date_of_birth,
    };
  });

  const starters: NationalPlayer[] = [];
  const take = (pos: Position, count: number) => {
    for (const p of roster.filter((x) => x.position === pos)) {
      if (starters.filter((x) => x.position === pos).length >= count) break;
      starters.push(p);
    }
  };
  take("GK", 1);
  take("DEF", 4);
  take("MID", 3);
  take("FWD", 3);
  for (const p of [...roster].sort((a, b) => {
    const av = (a.attributes.pace + a.attributes.technique + a.attributes.passing + a.attributes.defending + a.attributes.finishing + a.attributes.stamina) / 6;
    const bv = (b.attributes.pace + b.attributes.technique + b.attributes.passing + b.attributes.defending + b.attributes.finishing + b.attributes.stamina) / 6;
    return bv - av;
  })) {
    if (starters.length >= 11) break;
    if (!starters.some((x) => x.id === p.id)) starters.push(p);
  }
  const starting_xi = starters.slice(0, 11).map((p) => p.id);
  const bench = roster.filter((p) => !starting_xi.includes(p.id)).slice(0, 7).map((p) => p.id);

  return {
    id,
    name: COUNTRY_NAMES[raw.name] ?? raw.name,
    fifa_code: raw.fifa_code,
    group: raw.group,
    worldcup_overall: base,
    roster,
    formation: "F433",
    tactics: { mentality: "Balanced", tempo: "Normal", pressing: "Medium", width: "Normal" },
    starting_xi,
    bench,
  };
}

export const NATIONAL_TEAMS: NationalTeam[] = data.teams.map(buildNation);
export const nationalTeamById = (id: number) => NATIONAL_TEAMS.find((team) => team.id === id);
