import {
  getDivisionClubs,
  getWorldClub,
  MANAGER_PRESETS,
  PROJECT_TEMPLATES,
  SPONSOR_CATALOG,
  type Difficulty,
  type WorldClubSeed
} from "./world-data";

export interface JobOffer {
  id: string;
  clubId: string;
  clubName: string;
  divisionName: string;
  project: string;
  salary: number;
  expectedReputation: number;
  boardPatience: number;
  expiresDay: number;
}

export interface SponsorOffer {
  id: string;
  brand: string;
  sector: string;
  amount: number;
  upfront: number;
  duration: number;
  requiredDivisionTier: number;
  clauses: string;
}

export interface ActiveSponsor extends SponsorOffer {
  signedDay: number;
  remainingDays: number;
}

export interface RetiredPlayerRecord {
  id: string;
  name: string;
  age: number;
  formerClubId: string;
  formerClubName: string;
  overall: number;
  season: number;
  canBecomeManager: boolean;
}

export interface WorldNewsRecord {
  id: string;
  day: number;
  source: string;
  title: string;
  body: string;
  category: "torcida" | "mercado" | "diretoria" | "mundo" | "carreira";
}

export interface WorldState {
  version: 1;
  difficulty: Difficulty;
  pace: "normal" | "tranquilo" | "delegado";
  divisionId: string;
  competitionName: string;
  countryCode: string;
  managerProfileId: string;
  managerReputation: number;
  investorMode: boolean;
  fanMood: number;
  fanReaction: string;
  lastFanUpdateDay: number;
  sponsorOffers: SponsorOffer[];
  activeSponsor: ActiveSponsor | null;
  jobOffers: JobOffer[];
  retiredPlayers: RetiredPlayerRecord[];
  worldNews: WorldNewsRecord[];
  worldDay: number;
  randomSeed: number;
  lastWorldEventKey: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function stableSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function makeJobOffer(club: WorldClubSeed, day: number, seed: number): JobOffer {
  const random = randomFrom(seed);
  const project = PROJECT_TEMPLATES[Math.floor(random() * PROJECT_TEMPLATES.length)]!;
  return {
    id: "job-" + club.id + "-" + day,
    clubId: club.id,
    clubName: club.name,
    divisionName: club.divisionName,
    project,
    salary: Math.max(1200, Math.round(club.strength * club.strength * (club.tier <= 2 ? 3.4 : 1.1))),
    expectedReputation: Math.max(10, club.strength - 25),
    boardPatience: 35 + Math.floor(random() * 55),
    expiresDay: day + 14
  };
}

function makeSponsorOffers(club: WorldClubSeed, day: number, seed: number): SponsorOffer[] {
  const random = randomFrom(seed);
  const eligible = SPONSOR_CATALOG.filter(sponsor => sponsor.tier <= Math.max(1, 6 - Math.floor(club.tier / 2)));
  const pool = eligible.length ? eligible : [...SPONSOR_CATALOG];
  const selected = [...pool].sort(() => random() - 0.5).slice(0, 4);
  return selected.map(sponsor => {
    const multiplier = clamp(club.strength / 65, 0.45, 1.8) * clamp(club.supporters / 12000, 0.3, 3.2);
    const amount = Math.round(sponsor.base * multiplier);
    return {
      id: "sponsor-" + sponsor.id + "-" + club.id + "-" + day,
      brand: sponsor.brand,
      sector: sponsor.sector,
      amount,
      upfront: Math.round(amount * 0.22),
      duration: 365,
      requiredDivisionTier: sponsor.tier,
      clauses: "Manter a marca visível durante a temporada e cumprir as metas esportivas."
    };
  });
}

export function createWorldState(
  clubId: string,
  managerProfileId = "custom",
  difficulty: Difficulty = "medio",
  pace: WorldState["pace"] = "normal"
): WorldState {
  const club = getWorldClub(clubId) ?? getWorldClub("br-a-fl4mengo") ?? getDivisionClubs("br-a")[0]!;
  const day = 1;
  const seed = stableSeed(club.id + "-" + managerProfileId + "-" + difficulty);
  const divisionClubs = getDivisionClubs(club.divisionId);
  const jobs = divisionClubs
    .filter(candidate => candidate.id !== club.id)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .map((candidate, index) => makeJobOffer(candidate, day, seed + index * 97));
  const selectedManager=MANAGER_PRESETS.find(preset=>preset.id===managerProfileId);
  return {
    version: 1,
    difficulty,
    pace,
    divisionId: club.divisionId,
    competitionName: club.divisionName,
    countryCode: club.countryCode,
    managerProfileId,
    managerReputation: selectedManager?.reputation ?? (managerProfileId.startsWith("retired-") ? 60 : 25),
    investorMode: false,
    fanMood: 56,
    fanReaction: "A torcida espera conhecer a nova comissão técnica.",
    lastFanUpdateDay: 0,
    sponsorOffers: makeSponsorOffers(club, day, seed + 991),
    activeSponsor: null,
    jobOffers: jobs,
    retiredPlayers: [],
    worldNews: [{
      id: "world-welcome-" + club.id,
      day,
      source: "Central 90",
      title: "Um novo projeto começa",
      body: club.name + " inicia uma nova etapa com objetivos definidos para " + club.divisionName + ".",
      category: "carreira"
    }],
    worldDay: day,
    randomSeed: seed,
    lastWorldEventKey: ""
  };
}

export function updateWorldJobMarket(world: WorldState, clubs: Array<{id:string;name:string;strength:number}>): void {
  const random = randomFrom(world.randomSeed + world.worldDay * 31);
  world.jobOffers = clubs
    .filter(club => club.id !== "")
    .filter(club => random() > 0.3)
    .slice(0, 5)
    .map((club, index) => {
      const seedClub = getWorldClub(club.id);
      if (seedClub) return makeJobOffer(seedClub, world.worldDay, world.randomSeed + world.worldDay + index);
      const fallback: WorldClubSeed = {
        id: club.id, name: club.name, shortName: club.name.slice(0, 7), countryCode: "BR",
        country: "Brasil", region: "Nacional", divisionId: world.divisionId,
        divisionName: world.competitionName, tier: 4, city: "Brasil",
        stadium: "Estádio Municipal", strength: club.strength, supporters: 8000,
        budget: 1000000, project: "Reconstruir o elenco"
      };
      return makeJobOffer(fallback, world.worldDay, world.randomSeed + index);
    });
}

export function refreshWorldOffers(world: WorldState, clubId: string): void {
  const club = getWorldClub(clubId) ?? getDivisionClubs(world.divisionId)[0];
  if (!club) return;
  const seed = world.randomSeed + world.worldDay * 131;
  world.sponsorOffers = makeSponsorOffers(club, world.worldDay, seed);
  const pool = getDivisionClubs(world.divisionId).filter(item => item.id !== clubId);
  const random = randomFrom(seed + 1);
  world.jobOffers = pool.sort(() => random() - 0.5).slice(0, 5)
    .map((item, index) => makeJobOffer(item, world.worldDay, seed + index * 17));
}

export function acceptSponsor(world: WorldState, offerId: string): SponsorOffer | undefined {
  const offer = world.sponsorOffers.find(item => item.id === offerId);
  if (!offer) return undefined;
  world.activeSponsor = { ...offer, signedDay: world.worldDay, remainingDays: offer.duration };
  world.sponsorOffers = world.sponsorOffers.filter(item => item.id !== offerId);
  world.worldNews.unshift({
    id: "sponsor-signed-" + offer.id,
    day: world.worldDay,
    source: "Mercado & Negócios",
    title: offer.brand + " fecha acordo com o clube",
    body: "O contrato de patrocínio com a empresa do setor de " + offer.sector.toLowerCase() + " foi assinado por uma temporada.",
    category: "mercado"
  });
  return offer;
}

export function toggleInvestor(world: WorldState): boolean {
  world.investorMode = !world.investorMode;
  world.worldNews.unshift({
    id: "investor-" + world.worldDay + "-" + (world.investorMode ? "on" : "off"),
    day: world.worldDay,
    source: "Jornal do Clube",
    title: world.investorMode ? "Modo Investidores ativado" : "Modo Investidores desativado",
    body: world.investorMode
      ? "A carreira entrou em modo sandbox, com capital ilimitado para testar projetos e contratações."
      : "A injeção automática de capital foi desativada. O saldo já recebido permanece na conta do clube.",
    category: "diretoria"
  });
  return world.investorMode;
}

export function applyFanMatchReaction(
  world: WorldState,
  clubName: string,
  opponentName: string,
  goalsFor: number,
  goalsAgainst: number,
  day: number
): WorldNewsRecord {
  let change = 0;
  let reaction = "";
  let title = "";
  if (goalsFor > goalsAgainst) {
    change = goalsFor - goalsAgainst >= 3 ? 9 : 6;
    reaction = "A torcida comemora a vitória e reconhece a entrega do elenco.";
    title = "Torcida celebra resultado positivo";
  } else if (goalsFor === goalsAgainst) {
    change = goalsFor > 0 ? 1 : -1;
    reaction = "A torcida vê pontos positivos, mas cobra mais eficiência.";
    title = "Torcida divide opiniões após empate";
  } else {
    change = goalsAgainst - goalsFor >= 3 ? -10 : -7;
    reaction = "A arquibancada demonstra insatisfação e cobra reação no próximo jogo.";
    title = "Cobrança aumenta após derrota";
  }
  world.fanMood = clamp(world.fanMood + change, 0, 100);
  world.fanReaction = reaction;
  world.lastFanUpdateDay = day;
  const article: WorldNewsRecord = {
    id: "fans-" + day + "-" + clubName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    day,
    source: "Voz da Arquibancada",
    title,
    body: reaction + " " + clubName + " " + goalsFor + " x " + goalsAgainst + " " + opponentName + ".",
    category: "torcida"
  };
  world.worldNews.unshift(article);
  world.worldNews = world.worldNews.slice(0, 40);
  return article;
}

export function advanceWorldDay(world: WorldState, clubId: string): void {
  world.worldDay += 1;
  if (world.activeSponsor) {
    world.activeSponsor.remainingDays = Math.max(0, world.activeSponsor.remainingDays - 1);
    if (world.activeSponsor.remainingDays === 0) {
      const expired = world.activeSponsor;
      world.activeSponsor = null;
      world.worldNews.unshift({
        id: "sponsor-expired-" + expired.id,
        day: world.worldDay,
        source: "Mercado & Negócios",
        title: "Fim do contrato com " + expired.brand,
        body: "O vínculo comercial terminou. O clube poderá receber novas propostas.",
        category: "mercado"
      });
    }
  }
  if (world.worldDay % 14 === 0) {
    refreshWorldOffers(world, clubId);
    const openJobs=world.jobOffers.slice(0,3).map(offer=>offer.clubName);
    world.worldNews.unshift({
      id:"jobs-market-"+world.worldDay,
      day:world.worldDay,
      source:"Central 90",
      title:"Mercado de treinadores abre novas vagas",
      body:openJobs.length
        ? "Clubes como "+openJobs.join(", ")+" procuram profissionais para seus projetos. As oportunidades já estão disponíveis na central de empregos."
        : "Novas oportunidades estão sendo avaliadas pelos clubes. A central de empregos será atualizada em breve.",
      category:"mercado"
    });
    const sponsorNames=world.sponsorOffers.slice(0,3).map(offer=>offer.brand);
    if(sponsorNames.length)world.worldNews.unshift({
      id:"sponsor-interest-"+world.worldDay,
      day:world.worldDay,
      source:"Mercado & Negócios",
      title:"Marcas analisam novos projetos esportivos",
      body:sponsorNames.join(", ")+" demonstraram interesse comercial e enviaram propostas ao clube.",
      category:"mercado"
    });
  }
  world.worldNews = world.worldNews.slice(0, 40);
}

export function getFanLabel(mood: number): string {
  if (mood >= 85) return "Em êxtase";
  if (mood >= 68) return "Confiante";
  if (mood >= 48) return "Esperançosa";
  if (mood >= 28) return "Impaciente";
  return "Revoltada";
}

export function difficultyLabel(difficulty: Difficulty): string {
  return ({
    facil: "Fácil",
    medio: "Médio",
    dificil: "Difícil",
    "quase-impossivel": "Quase impossível"
  })[difficulty];
}

export function getDifficultyStrengthAdjustment(difficulty: Difficulty): number {
  return ({ facil: -6, medio: 0, dificil: 5, "quase-impossivel": 11 })[difficulty];
}

export function migrateWorldState(world: Partial<WorldState> | undefined, clubId: string): WorldState {
  if (world && world.version === 1 && typeof world.divisionId === "string") {
    return {
      ...createWorldState(clubId, world.managerProfileId ?? "custom", world.difficulty ?? "medio", world.pace ?? "normal"),
      ...world,
      sponsorOffers: Array.isArray(world.sponsorOffers) ? world.sponsorOffers : [],
      jobOffers: Array.isArray(world.jobOffers) ? world.jobOffers : [],
      retiredPlayers: Array.isArray(world.retiredPlayers) ? world.retiredPlayers : [],
      worldNews: Array.isArray(world.worldNews) ? world.worldNews : [],
      activeSponsor: world.activeSponsor ?? null
    } as WorldState;
  }
  return createWorldState(clubId);
}

export function toRetiredPlayerRecord(
  player: {id:string;name:string;age:number;overall:number},
  club: {id:string;name:string},
  season: number
): RetiredPlayerRecord {
  return {
    id: player.id,
    name: player.name,
    age: player.age,
    formerClubId: club.id,
    formerClubName: club.name,
    overall: player.overall,
    season,
    canBecomeManager: player.overall >= 55
  };
}
