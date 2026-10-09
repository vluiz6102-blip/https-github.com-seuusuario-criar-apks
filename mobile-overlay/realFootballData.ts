import raw from "./realFootballData.json";
import type { Player, Position, Team } from "./types";

export type RealFootballPlayer = Player & {
  sourceId: number;
  marketValueEUR: number;
  citizenship: string;
  dateOfBirth: string;
  preferredFoot: string;
};
export type RealFootballTeam = {
  id: number;
  sourceId: number;
  name: string;
  competitionId: string;
  competitionName: string;
  countryName: string;
  countryCode: string;
  stadiumName: string;
  stadiumCapacity: number;
  totalMarketValueEUR: number;
  playerCount: number;
  players: RealFootballPlayer[];
  team: Team;
};
export type RealCompetition = {
  id: string;
  name: string;
  countryName: string;
  countryCode: string;
  clubs: RealFootballTeam[];
};
type RawData = {
  metadata: {
    source: string; sourceUrl: string; license: string; datasetSnapshot: string;
    marketValueNote: string; gameRatingNote: string; generatedAt: string;
  };
  counts: { competitions: number; clubs: number; players: number };
  competitions: RealCompetition[];
};
const data = raw as unknown as RawData;
export const REAL_FOOTBALL_METADATA = data.metadata;
export const REAL_FOOTBALL_COUNTS = data.counts;
export const REAL_COMPETITIONS: RealCompetition[] = data.competitions;
export const REAL_CLUBS: RealFootballTeam[] = REAL_COMPETITIONS.flatMap((competition) =>
  competition.clubs.map((club) => ({ ...club, competitionId: competition.id, competitionName: competition.name, countryName: competition.countryName, countryCode: competition.countryCode })),
);
export function realTeamById(id: number): Team | undefined {
  return REAL_CLUBS.find((club) => club.id === id)?.team;
}
export function realClubById(id: number): RealFootballTeam | undefined {
  return REAL_CLUBS.find((club) => club.id === id);
}
export function formatEuro(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Valor não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}
export function positionLabel(position: Position): string {
  return ({ GK: "GOL", DEF: "DEF", MID: "MEI", FWD: "ATA" })[position] ?? position;
}
export function playerOverall(player: Player): number {
  const a = player.attributes;
  return Math.round((a.pace + a.technique + a.passing + a.defending + a.finishing + a.stamina) / 6);
}
