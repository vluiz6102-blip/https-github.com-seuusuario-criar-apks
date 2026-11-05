export interface MatchNewsInput {
  eventId: string;
  day: number;
  competition: string;
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  homeGoals: number;
  awayGoals: number;
  managedClubId?: string;
}

export interface NewsArticleDraft {
  eventId: string;
  day: number;
  tag: "partida";
  publisherId: string;
  source: string;
  truthLevel: "confirmed";
  title: string;
  body: string;
}

function scoreLine(event: MatchNewsInput): string {
  return event.homeClubName + " " + event.homeGoals + " x " + event.awayGoals + " " + event.awayClubName;
}

function resultLine(event: MatchNewsInput): string {
  if (event.homeGoals > event.awayGoals) return event.homeClubName + " venceu";
  if (event.awayGoals > event.homeGoals) return event.awayClubName + " venceu";
  return "A partida terminou empatada";
}

/**
 * Produces publication drafts only from a completed, structured match result.
 * No RNG or inferred events are used, so the same event always yields the same
 * headlines and every article can be traced back to its fixture ID.
 */
export function createMatchNews(event: MatchNewsInput): NewsArticleDraft[] {
  if (!event.eventId.trim() || !event.competition.trim()) {
    throw new Error("Match news requires an event ID and competition.");
  }
  if (!event.homeClubId || !event.awayClubId || event.homeClubId === event.awayClubId) {
    throw new Error("Match news requires two different clubs.");
  }
  if (!event.homeClubName.trim() || !event.awayClubName.trim()) {
    throw new Error("Match news requires both club names.");
  }
  if (!Number.isInteger(event.day) || event.day < 1) {
    throw new Error("Match news day must be a positive integer.");
  }
  if (!Number.isInteger(event.homeGoals) || event.homeGoals < 0 ||
      !Number.isInteger(event.awayGoals) || event.awayGoals < 0) {
    throw new Error("Match scores must be non-negative integers.");
  }

  const score = scoreLine(event);
  const result = resultLine(event);
  const articles: NewsArticleDraft[] = [
    {
      eventId: event.eventId,
      day: event.day,
      tag: "partida",
      publisherId: "p90-agencia",
      source: "P90 Agência",
      truthLevel: "confirmed",
      title: score,
      body: "Placar final de " + event.competition + ": " + score + "."
    },
    {
      eventId: event.eventId,
      day: event.day,
      tag: "partida",
      publisherId: "central-90",
      source: "Central 90",
      truthLevel: "confirmed",
      title: result + " em " + event.competition,
      body: score + ". O resultado foi registrado na competição."
    }
  ];

  if (event.managedClubId === event.homeClubId || event.managedClubId === event.awayClubId) {
    const managedName = event.managedClubId === event.homeClubId
      ? event.homeClubName
      : event.awayClubName;
    const managedGoals = event.managedClubId === event.homeClubId
      ? event.homeGoals
      : event.awayGoals;
    const opponentGoals = event.managedClubId === event.homeClubId
      ? event.awayGoals
      : event.homeGoals;
    const managedResult = managedGoals > opponentGoals
      ? "Vitória"
      : managedGoals < opponentGoals
        ? "Derrota"
        : "Empate";

    articles.push({
      eventId: event.eventId,
      day: event.day,
      tag: "partida",
      publisherId: "jornal-do-clube",
      source: "Jornal do Clube",
      truthLevel: "confirmed",
      title: managedResult + " do " + managedName,
      body: "O " + managedName + " terminou a partida com o placar " + score + ", pela " + event.competition + "."
    });
  }

  return articles;
}
