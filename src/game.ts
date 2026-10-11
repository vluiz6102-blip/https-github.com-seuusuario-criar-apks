export type Formation = "4-3-3" | "4-2-3-1" | "3-5-2";
export type PlayStyle = "equilibrado" | "posse" | "transicao" | "pressao";
export type Position = "GOL" | "ZAG" | "LAT" | "VOL" | "MC" | "MEI" | "PE" | "PD" | "CA";

export interface Club {
  id: string;
  name: string;
  shortName: string;
  city: string;
  primary: string;
  budget: number;
  strength: number;
  stadium: string;
  motto: string;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  age: number;
  rating: number;
  potential: number;
  condition: number;
  value: number;
}

export interface MatchSummary {
  round: number;
  opponentId: string;
  opponentName: string;
  isHome: boolean;
  homeGoals: number;
  awayGoals: number;
  userGoals: number;
  opponentGoals: number;
  result: "V" | "E" | "D";
  season: number;
}

export interface LiveMatch {
  round: number;
  opponentId: string;
  opponentName: string;
  isHome: boolean;
  homeName: string;
  awayName: string;
  minute: number;
  homeGoals: number;
  awayGoals: number;
  events: string[];
  finished: boolean;
}

export interface Career {
  clubId: string;
  managerName: string;
  season: number;
  round: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  budget: number;
  squad: Player[];
  market: Player[];
  formation: Formation;
  style: PlayStyle;
  trainingCredits: number;
  transfersMade: number;
  history: MatchSummary[];
  match: LiveMatch | null;
}

export const SELECTABLE_CLUBS: Club[] = [
  { id: "aurora", name: "Aurora do Vale FC", shortName: "AVF", city: "Vale do Horizonte", primary: "#a6ef68", budget: 18_400_000, strength: 69, stadium: "Estádio Horizonte", motto: "O futuro começa aqui." },
  { id: "porto", name: "Porto Dourado AC", shortName: "PDA", city: "Costa Dourada", primary: "#f1c56a", budget: 14_200_000, strength: 67, stadium: "Arena do Porto", motto: "Jogar com coragem." },
  { id: "serra", name: "União da Serra", shortName: "UDS", city: "Serra Clara", primary: "#83c9ff", budget: 12_600_000, strength: 65, stadium: "Campo das Nuvens", motto: "Raiz forte, sonho alto." },
  { id: "mare", name: "Maré Alta FC", shortName: "MAF", city: "Baía Serena", primary: "#e3a8ff", budget: 16_000_000, strength: 68, stadium: "Estádio das Marés", motto: "Até o último minuto." }
];

const EXTRA_CLUBS: Club[] = [
  { id: "estacao", name: "Estação Central", shortName: "ETC", city: "Vila Central", primary: "#ff9a6b", budget: 10_000_000, strength: 64, stadium: "Parque Central", motto: "Trabalho em cada bola." },
  { id: "pinhais", name: "Pinhais Atlético", shortName: "PAT", city: "Pinhais do Norte", primary: "#f18d9b", budget: 9_600_000, strength: 62, stadium: "Arena dos Pinhais", motto: "Ninguém joga sozinho." },
  { id: "bruma", name: "Bruma Esporte Clube", shortName: "BEC", city: "Campo da Bruma", primary: "#b4c6cc", budget: 8_800_000, strength: 61, stadium: "Estádio Neblina", motto: "Silêncio, foco e jogo." },
  { id: "pedra", name: "Pedra Branca FC", shortName: "PBF", city: "Pedra Branca", primary: "#d5a68c", budget: 11_200_000, strength: 63, stadium: "Arena Pedra Branca", motto: "A força vem de dentro." }
];

export const ALL_CLUBS: Club[] = [...SELECTABLE_CLUBS, ...EXTRA_CLUBS];

type PlayerTemplate = Omit<Player, "id" | "condition">;

const SQUAD_TEMPLATE: PlayerTemplate[] = [
  { name: "Rafael Monte", position: "GOL", age: 27, rating: 69, potential: 72, value: 1_300_000 },
  { name: "Caio Mendes", position: "LAT", age: 23, rating: 66, potential: 76, value: 1_050_000 },
  { name: "Yuri Farias", position: "ZAG", age: 26, rating: 68, potential: 71, value: 1_250_000 },
  { name: "Lucas Brandão", position: "ZAG", age: 24, rating: 67, potential: 75, value: 1_180_000 },
  { name: "Enzo Leal", position: "LAT", age: 22, rating: 65, potential: 77, value: 980_000 },
  { name: "Davi Marçal", position: "VOL", age: 25, rating: 68, potential: 73, value: 1_350_000 },
  { name: "Ícaro Nunes", position: "MC", age: 21, rating: 70, potential: 83, value: 2_200_000 },
  { name: "Breno Prado", position: "MC", age: 28, rating: 67, potential: 68, value: 900_000 },
  { name: "Luan Peixoto", position: "MEI", age: 22, rating: 71, potential: 84, value: 2_600_000 },
  { name: "Theo Bastos", position: "PD", age: 23, rating: 70, potential: 81, value: 2_300_000 },
  { name: "Samuel Nery", position: "CA", age: 25, rating: 72, potential: 78, value: 2_900_000 },
  { name: "Mateus Rios", position: "PE", age: 21, rating: 68, potential: 82, value: 1_950_000 },
  { name: "João Salles", position: "GOL", age: 20, rating: 61, potential: 76, value: 520_000 },
  { name: "Alan Vilela", position: "ZAG", age: 23, rating: 63, potential: 73, value: 740_000 },
  { name: "Miguel Tavares", position: "VOL", age: 20, rating: 62, potential: 78, value: 680_000 },
  { name: "Pedro Arantes", position: "MEI", age: 19, rating: 64, potential: 82, value: 910_000 },
  { name: "Ruan Felício", position: "CA", age: 22, rating: 64, potential: 77, value: 850_000 },
  { name: "Heitor Sampaio", position: "PE", age: 24, rating: 62, potential: 70, value: 610_000 }
];

const MARKET_TEMPLATE: PlayerTemplate[] = [
  { name: "Gabriel Torres", position: "ZAG", age: 22, rating: 67, potential: 79, value: 1_400_000 },
  { name: "André Valim", position: "MC", age: 20, rating: 65, potential: 82, value: 1_250_000 },
  { name: "Nicolas Avelar", position: "PD", age: 24, rating: 70, potential: 78, value: 2_100_000 },
  { name: "Vitor Leme", position: "GOL", age: 25, rating: 68, potential: 73, value: 1_100_000 },
  { name: "Danilo Caires", position: "VOL", age: 26, rating: 69, potential: 72, value: 1_550_000 },
  { name: "Arthur Bessa", position: "CA", age: 19, rating: 63, potential: 84, value: 1_350_000 },
  { name: "Felipe Noronha", position: "LAT", age: 21, rating: 66, potential: 78, value: 1_100_000 },
  { name: "Renan Couto", position: "MEI", age: 27, rating: 73, potential: 75, value: 2_850_000 }
];

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function getClub(id: string): Club {
  return ALL_CLUBS.find((club) => club.id === id) ?? SELECTABLE_CLUBS[0];
}

export function getNextOpponent(clubId: string, round: number): Club {
  const otherClubs = ALL_CLUBS.filter((club) => club.id !== clubId);
  const safeIndex = Math.max(0, round - 1) % otherClubs.length;
  return otherClubs[safeIndex];
}

export function createCareer(clubId: string, managerName: string): Career {
  const club = getClub(clubId);
  const adjustment = Math.round((club.strength - 66) / 4);
  const squad = SQUAD_TEMPLATE.map((template, index) => ({
    ...template,
    id: "s-" + String(index + 1),
    rating: clamp(template.rating + adjustment, 40, 92),
    value: Math.round(template.value * (1 + (club.strength - 66) / 30)),
    condition: 88 + (index % 13)
  }));
  const market = MARKET_TEMPLATE.map((template, index) => ({
    ...template,
    id: "m-" + String(index + 1),
    condition: 94
  }));

  return {
    clubId: club.id,
    managerName: managerName.trim() || "Victor",
    season: 2026,
    round: 1,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    budget: club.budget,
    squad,
    market,
    formation: "4-3-3",
    style: "equilibrado",
    trainingCredits: 3,
    transfersMade: 0,
    history: [],
    match: null
  };
}

export function calculateTeamStrength(squad: Player[]): number {
  const firstEleven = [...squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
  if (firstEleven.length === 0) return 0;
  return firstEleven.reduce((sum, player) => sum + player.rating, 0) / firstEleven.length;
}

export function signPlayer(career: Career, playerId: string): Career {
  const player = career.market.find((candidate) => candidate.id === playerId);
  if (!player || career.budget < player.value || career.squad.length >= 24) return career;

  return {
    ...career,
    budget: career.budget - player.value,
    squad: [...career.squad, { ...player, id: "s-" + String(career.squad.length + 1) + "-" + player.id, condition: 94 }],
    market: career.market.filter((candidate) => candidate.id !== playerId),
    transfersMade: career.transfersMade + 1
  };
}

export function trainPlayer(career: Career, playerId: string): Career {
  const player = career.squad.find((candidate) => candidate.id === playerId);
  if (!player || career.trainingCredits <= 0 || player.rating >= player.potential) return career;

  return {
    ...career,
    trainingCredits: career.trainingCredits - 1,
    squad: career.squad.map((candidate) => candidate.id === playerId
      ? { ...candidate, rating: Math.min(candidate.potential, candidate.rating + 1), condition: Math.max(55, candidate.condition - 5) }
      : candidate)
  };
}

export function releasePlayer(career: Career, playerId: string): Career {
  if (career.squad.length <= 12) return career;
  const player = career.squad.find((candidate) => candidate.id === playerId);
  if (!player) return career;

  return {
    ...career,
    budget: career.budget + Math.round(player.value * 0.62),
    squad: career.squad.filter((candidate) => candidate.id !== playerId)
  };
}

export function updateTactics(career: Career, formation: Formation, style: PlayStyle): Career {
  return { ...career, formation, style };
}

export function beginMatch(career: Career): Career {
  if (career.match && !career.match.finished) return career;

  const club = getClub(career.clubId);
  const opponent = getNextOpponent(career.clubId, career.round);
  const isHome = career.round % 2 === 1;
  const match: LiveMatch = {
    round: career.round,
    opponentId: opponent.id,
    opponentName: opponent.name,
    isHome,
    homeName: isHome ? club.name : opponent.name,
    awayName: isHome ? opponent.name : club.name,
    minute: 0,
    homeGoals: 0,
    awayGoals: 0,
    events: ["00' Apito inicial se aproxima. As equipes entram em campo."],
    finished: false
  };
  const recoveredSquad = career.squad.map((player) => ({
    ...player,
    condition: Math.min(100, player.condition + 12)
  }));

  return { ...career, squad: recoveredSquad, match };
}

function seededRoll(seed: number): number {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

export function advanceMatch(career: Career): Career {
  const current = career.match;
  if (!current || current.finished) return career;

  const opponent = getClub(current.opponentId);
  const tacticalBoost = career.style === "pressao" ? 3 : career.style === "transicao" ? 2 : career.style === "posse" ? 1 : 0;
  const userPower = calculateTeamStrength(career.squad) + tacticalBoost;
  const homePower = current.isHome ? userPower + 2 : opponent.strength + 2;
  const awayPower = current.isHome ? opponent.strength : userPower;
  const nextMinute = Math.min(90, current.minute + 15);
  const homeChance = clamp(0.20 + (homePower - awayPower) * 0.0015, 0.095, 0.32);
  const awayChance = clamp(0.19 + (awayPower - homePower) * 0.0015, 0.085, 0.31);
  const homeScored = seededRoll(current.round * 997 + nextMinute * 17 + 7) < homeChance;
  const awayScored = seededRoll(current.round * 991 + nextMinute * 19 + 211) < awayChance;
  const homeGoals = current.homeGoals + (homeScored ? 1 : 0);
  const awayGoals = current.awayGoals + (awayScored ? 1 : 0);
  const events = [...current.events];

  if (homeScored) events.push(String(nextMinute) + "' GOL! " + current.homeName + " encontra espaço e balança a rede.");
  if (awayScored) events.push(String(nextMinute) + "' GOL! " + current.awayName + " responde no ataque.");
  if (!homeScored && !awayScored) {
    const quietEvents = [
      "As linhas se fecham e o meio-campo vira uma batalha.",
      "Boa troca de passes, mas a defesa corta o avanço.",
      "A torcida cresce, e os treinadores pedem mais intensidade.",
      "Uma disputa forte no meio mantém o jogo equilibrado.",
      "O goleiro acompanha a jogada sem precisar intervir.",
      "A equipe tenta acelerar pelos lados do campo."
    ];
    const eventIndex = (current.round + nextMinute / 15) % quietEvents.length;
    events.push(String(nextMinute) + "' " + quietEvents[eventIndex]);
  }

  const finished = nextMinute >= 90;
  if (finished) events.push("90' Fim de jogo. O resultado está confirmado.");

  const match: LiveMatch = {
    ...current,
    minute: nextMinute,
    homeGoals,
    awayGoals,
    events: events.slice(-9),
    finished
  };

  if (!finished) return { ...career, match };

  const userGoals = match.isHome ? homeGoals : awayGoals;
  const opponentGoals = match.isHome ? awayGoals : homeGoals;
  const result: MatchSummary["result"] = userGoals > opponentGoals ? "V" : userGoals === opponentGoals ? "E" : "D";
  const reward = result === "V" ? 210_000 : result === "E" ? 120_000 : 65_000;
  const nextRound = match.round + 1;
  const seasonFinished = nextRound > 10;
  const summary: MatchSummary = {
    round: match.round,
    opponentId: match.opponentId,
    opponentName: match.opponentName,
    isHome: match.isHome,
    homeGoals,
    awayGoals,
    userGoals,
    opponentGoals,
    result,
    season: career.season
  };

  return {
    ...career,
    match,
    round: seasonFinished ? 1 : nextRound,
    season: seasonFinished ? career.season + 1 : career.season,
    played: seasonFinished ? 0 : career.played + 1,
    wins: seasonFinished ? 0 : career.wins + (result === "V" ? 1 : 0),
    draws: seasonFinished ? 0 : career.draws + (result === "E" ? 1 : 0),
    losses: seasonFinished ? 0 : career.losses + (result === "D" ? 1 : 0),
    points: seasonFinished ? 0 : career.points + (result === "V" ? 3 : result === "E" ? 1 : 0),
    goalsFor: seasonFinished ? 0 : career.goalsFor + userGoals,
    goalsAgainst: seasonFinished ? 0 : career.goalsAgainst + opponentGoals,
    budget: career.budget + reward - 35_000,
    squad: career.squad.map((player) => ({ ...player, condition: Math.max(52, player.condition - 7) })),
    trainingCredits: Math.min(5, career.trainingCredits + 1),
    history: [summary, ...career.history].slice(0, 20)
  };
}
