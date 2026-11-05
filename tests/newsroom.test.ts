import { describe, expect, it } from "vitest";
import { createMatchNews, type MatchNewsInput } from "../src/newsroom";

const baseEvent: MatchNewsInput = {
  eventId: "fixture-2026-14-1",
  day: 42,
  competition: "Liga das Araucárias",
  homeClubId: "pato-branco",
  homeClubName: "Pato Branco FC",
  awayClubId: "aurora",
  awayClubName: "Aurora Esporte Clube",
  homeGoals: 2,
  awayGoals: 1,
  managedClubId: "pato-branco"
};

describe("Pulso 90 newsroom", () => {
  it("publishes the same confirmed result through different fictional outlets", () => {
    const articles = createMatchNews(baseEvent);
    expect(articles).toHaveLength(5);
    expect(new Set(articles.map(article => article.publisherId)).size).toBe(5);
    for (const article of articles) {
      expect(article.eventId).toBe(baseEvent.eventId);
      expect(article.day).toBe(baseEvent.day);
      expect(article.truthLevel).toBe("confirmed");
      expect(article.body).toContain("Pato Branco FC 2 x 1 Aurora Esporte Clube");
    }
    expect(articles.map(article=>article.source)).toEqual(expect.arrayContaining(["P90 Agência","Central 90","TV Campo","Diário da Bola","Jornal do Clube"]));
  });

  it("does not publish a club-specific article for a match without the managed club", () => {
    const articles = createMatchNews({ ...baseEvent, managedClubId: "other-club" });
    expect(articles).toHaveLength(4);
    expect(articles.every(article => article.publisherId !== "jornal-do-clube")).toBe(true);
  });

  it("describes a draw as a draw and does not invent a winner", () => {
    const articles = createMatchNews({ ...baseEvent, homeGoals: 0, awayGoals: 0 });
    expect(articles[1]?.title).toBe("A partida terminou empatada em Liga das Araucárias");
    expect(articles.every(article => !article.title.includes("venceu"))).toBe(true);
  });

  it("is deterministic for the same stored event", () => {
    expect(createMatchNews(baseEvent)).toEqual(createMatchNews(baseEvent));
  });

  it("rejects invalid results instead of creating unreliable headlines", () => {
    expect(() => createMatchNews({ ...baseEvent, homeGoals: -1 })).toThrow();
    expect(() => createMatchNews({ ...baseEvent, awayClubId: "pato-branco" })).toThrow();
    expect(() => createMatchNews({ ...baseEvent, day: 0 })).toThrow();
  });
});
