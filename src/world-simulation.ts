import { createMatchNews } from "./newsroom";
import {
  getDivisionClubs,
  getWorldClub,
  WORLD_CLUBS,
  WORLD_DIVISIONS,
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
  divisionId: string;
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

export interface GlobalLeagueStanding {
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface GlobalLeagueResult {
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface GlobalLeagueState {
  divisionId: string;
  season: number;
  matchday: number;
  standings: GlobalLeagueStanding[];
  recentResults: GlobalLeagueResult[];
  seasonComplete?: boolean;
}

export interface WorldState {
  version: 1;
  globalLeagues: GlobalLeagueState[];
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
    divisionId: club.divisionId,
    project,
    salary: Math.max(1200, Math.round(club.strength * club.strength * (club.tier <= 2 ? 3.4 : 1.1))),
    expectedReputation: Math.max(10, club.strength - 25),
    boardPatience: 35 + Math.floor(random() * 55),
    expiresDay: day + 14
  };
}

function createWorldJobOffers(clubId:string,day:number,seed:number,managerReputation:number):JobOffer[]{
 const minStrength=Math.max(31,managerReputation-40);
 const maxStrength=Math.min(98,managerReputation+36);
 const eligible=WORLD_CLUBS.filter(club=>club.id!==clubId&&club.strength>=minStrength&&club.strength<=maxStrength);
 const pool=eligible.length>=5?eligible:WORLD_CLUBS.filter(club=>club.id!==clubId);
 const random=randomFrom(seed);
 return [...pool].sort(()=>random()-.5).slice(0,5).map((club,index)=>makeJobOffer(club,day,seed+index*97));
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

function createGlobalLeagueStates():GlobalLeagueState[]{
 return WORLD_DIVISIONS.map(division=>({
  divisionId:division.id,
  season:2026,
  matchday:0,
  standings:getDivisionClubs(division.id).map(club=>({
   clubId:club.id,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,points:0
  })),
  recentResults:[],
  seasonComplete:false
 }));
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
  const selectedManager=MANAGER_PRESETS.find(preset=>preset.id===managerProfileId);
  const managerReputation=selectedManager?.reputation ?? (managerProfileId.startsWith("retired-") ? 60 : 25);
  const jobs=createWorldJobOffers(club.id,day,seed,managerReputation);
  return {
    version: 1,
    globalLeagues: createGlobalLeagueStates(),
    difficulty,
    pace,
    divisionId: club.divisionId,
    competitionName: club.divisionName,
    countryCode: club.countryCode,
    managerProfileId,
    managerReputation,
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
  const currentClubId=clubs[0]?.id??"";
  world.jobOffers=createWorldJobOffers(currentClubId,world.worldDay,world.randomSeed+world.worldDay*31,world.managerReputation);
}

export function refreshWorldOffers(world: WorldState, clubId: string): void {
  const club = getWorldClub(clubId) ?? getDivisionClubs(world.divisionId)[0];
  if (!club) return;
  const seed = world.randomSeed + world.worldDay * 131;
  world.sponsorOffers = makeSponsorOffers(club, world.worldDay, seed);
  world.jobOffers=createWorldJobOffers(clubId,world.worldDay,seed+1,world.managerReputation);
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

function resetGlobalLeagueSeason(league:GlobalLeagueState,nextSeason?:number):void{
 const clubIds=league.standings.map(row=>row.clubId);
 league.season=nextSeason??league.season+1;
 league.matchday=0;
 league.seasonComplete=false;
 league.standings=clubIds.map(clubId=>({clubId,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,points:0}));
 league.recentResults=[];
}

export function processGlobalPromotions(world:WorldState):void{
 const processed=new Set<string>();
 for(const lowerDivision of WORLD_DIVISIONS){
  const upperId=lowerDivision.promotionTarget;
  if(!upperId)continue;
  const upperDivision=WORLD_DIVISIONS.find(item=>item.id===upperId);
  if(!upperDivision||upperDivision.relegationTarget!==lowerDivision.id)continue;
  const lower=world.globalLeagues.find(item=>item.divisionId===lowerDivision.id);
  const upper=world.globalLeagues.find(item=>item.divisionId===upperId);
  if(!lower?.seasonComplete||!upper?.seasonComplete)continue;
  if(lower.divisionId===world.divisionId||upper.divisionId===world.divisionId){
   if(lower.divisionId!==world.divisionId)resetGlobalLeagueSeason(lower);
   if(upper.divisionId!==world.divisionId)resetGlobalLeagueSeason(upper);
   processed.add(lower.divisionId);processed.add(upper.divisionId);
   continue;
  }
  const promotionPlaces=lowerDivision.promotionPlaces??0;
  const relegationPlaces=upperDivision.relegationPlaces??0;
  if(promotionPlaces<=0||promotionPlaces!==relegationPlaces||lower.standings.length<promotionPlaces||upper.standings.length<relegationPlaces){
   resetGlobalLeagueSeason(lower);resetGlobalLeagueSeason(upper);
   processed.add(lower.divisionId);processed.add(upper.divisionId);
   continue;
  }
  const lowerSorted=[...lower.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst));
  const upperSorted=[...upper.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst));
  const lowerIds=lowerSorted.map(row=>row.clubId),upperIds=upperSorted.map(row=>row.clubId);
  const promoted=lowerIds.slice(0,promotionPlaces);
  const relegated=upperIds.slice(-relegationPlaces);
  for(let i=0;i<promotionPlaces;i++){
   lowerIds[i]=relegated[i]!;
   upperIds[upperIds.length-relegationPlaces+i]=promoted[i]!;
  }
  const nextSeason=Math.max(lower.season,upper.season)+1;
  lower.standings=lowerIds.map(clubId=>({clubId,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,points:0}));
  upper.standings=upperIds.map(clubId=>({clubId,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,points:0}));
  resetGlobalLeagueSeason(lower,nextSeason);
  resetGlobalLeagueSeason(upper,nextSeason);
  const promotedNames=promoted.map(id=>getWorldClub(id)?.name??id);
  const relegatedNames=relegated.map(id=>getWorldClub(id)?.name??id);
  world.worldNews.unshift({
   id:"global-promotion-"+lower.divisionId+"-"+nextSeason,
   day:world.worldDay,
   source:"Central 90",
   title:"Acesso e rebaixamento definidos em "+upperDivision.country,
   body:promotedNames.join(", ")+" sobem para "+upperDivision.name+". "+relegatedNames.join(", ")+" descem para "+lowerDivision.name+".",
   category:"mundo"
  });
  processed.add(lower.divisionId);processed.add(upper.divisionId);
 }
 for(const league of world.globalLeagues){
  if(!league.seasonComplete||league.divisionId===world.divisionId||processed.has(league.divisionId))continue;
  const division=WORLD_DIVISIONS.find(item=>item.id===league.divisionId);
  const partnerId=division?.promotionTarget??division?.relegationTarget;
  const partner=partnerId?world.globalLeagues.find(item=>item.divisionId===partnerId):undefined;
  const partnerDivision=partnerId?WORLD_DIVISIONS.find(item=>item.id===partnerId):undefined;
  const reciprocal=division?.promotionTarget
   ? partnerDivision?.relegationTarget===division.id
   : partnerDivision?.promotionTarget===division?.id;
  if(partner&&reciprocal&&partner.divisionId!==world.divisionId&&!partner.seasonComplete)continue;
  resetGlobalLeagueSeason(league);
 }
}

function simulateGlobalMatchdays(world:WorldState,dayBucket:number):void{
 const featured: Array<{divisionId:string;divisionName:string;homeClubId:string;awayClubId:string;homeName:string;awayName:string;homeGoals:number;awayGoals:number;season:number;matchday:number}>=[];
 const featuredIds=["br-a","br-b","en-1","es-1","ar-1","jp-1","ma-1","nat-uefa","nat-conmebol","nat-afc","nat-caf","nat-concacaf","nat-ofc"];
 for(const league of world.globalLeagues){
  if(league.divisionId===world.divisionId||league.seasonComplete||stableSeed(league.divisionId)%2!==dayBucket)continue;
  const division=WORLD_DIVISIONS.find(item=>item.id===league.divisionId);
  const teams=league.standings.map(row=>getWorldClub(row.clubId)).filter((club):club is WorldClubSeed=>club!==undefined);
  const count=teams.length;
  if(!division||count<4)continue;
  const baseRotation=count%2===0?[...teams]:[...teams,null];
  const rounds=baseRotation.length-1;
  const round=league.matchday%rounds;
  const leg=Math.floor(league.matchday/rounds);
  const rotation=[...baseRotation];
  for(let turn=0;turn<round;turn++){const last=rotation.pop()!;rotation.splice(1,0,last);}
  const results:GlobalLeagueResult[]=[];
  let featuredForLeague=false;
  for(let pair=0;pair<rotation.length/2;pair++){
   let home=rotation[pair]!,away=rotation[rotation.length-1-pair]!;
   if(!home||!away)continue;
   if((round+pair+leg)%2===1){const swap=home;home=away;away=swap;}
   const random=randomFrom(world.randomSeed+stableSeed(league.divisionId+"-"+league.season+"-"+league.matchday+"-"+pair));
   const difference=home.strength-away.strength;
   const homeGoals=clamp(Math.round(1.15+difference/31+(random()-.5)*2.8),0,6);
   const awayGoals=clamp(Math.round(1.0-difference/34+(random()-.5)*2.8),0,6);
   const result={matchday:league.matchday+1,homeClubId:home.id,awayClubId:away.id,homeGoals,awayGoals};
   results.push(result);
   const homeRow=league.standings.find(row=>row.clubId===home.id)!;
   const awayRow=league.standings.find(row=>row.clubId===away.id)!;
   homeRow.played++;awayRow.played++;
   homeRow.goalsFor+=homeGoals;homeRow.goalsAgainst+=awayGoals;
   awayRow.goalsFor+=awayGoals;awayRow.goalsAgainst+=homeGoals;
   if(homeGoals>awayGoals){homeRow.wins++;awayRow.losses++;homeRow.points+=3;}
   else if(homeGoals<awayGoals){awayRow.wins++;homeRow.losses++;awayRow.points+=3;}
   else{homeRow.draws++;awayRow.draws++;homeRow.points++;awayRow.points++;}
   if(!featuredForLeague&&(featuredIds.includes(league.divisionId)||featured.length===0)){
    featured.push({divisionId:league.divisionId,divisionName:division.name,homeClubId:home.id,awayClubId:away.id,homeName:home.name,awayName:away.name,homeGoals,awayGoals,season:league.season,matchday:league.matchday+1});
    featuredForLeague=true;
   }
  }
  league.recentResults=[...league.recentResults,...results].slice(-20);
  league.matchday++;
  if(league.matchday>=rounds*2){
   const champion=[...league.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst))[0];
   const championName=teams.find(team=>team.id===champion?.clubId)?.name??"Um clube";
   world.worldNews.unshift({id:"global-champion-"+league.divisionId+"-"+league.season,day:world.worldDay,source:"Central 90",title:championName+" conquista "+division.name,body:"A equipe encerrou a temporada simulada com "+(champion?.points??0)+" pontos e terminou na liderança da competição.",category:"mundo"});
   league.seasonComplete=true;
  }
 }
 processGlobalPromotions(world);
 for(const item of featured){
  const eventId="global-match-"+item.divisionId+"-"+item.season+"-"+item.matchday+"-"+item.homeClubId+"-"+item.awayClubId;
  const drafts=createMatchNews({eventId,day:world.worldDay,competition:item.divisionName,homeClubId:item.homeClubId,homeClubName:item.homeName,awayClubId:item.awayClubId,awayClubName:item.awayName,homeGoals:item.homeGoals,awayGoals:item.awayGoals});
  for(const article of drafts)world.worldNews.unshift({id:eventId+"-"+article.publisherId,day:article.day,source:article.source,title:article.title,body:article.body,category:"mundo"});
 }
}

export function advanceWorldDay(world: WorldState, clubId: string): void {
  world.worldDay += 1;
  simulateGlobalMatchdays(world,world.worldDay%2);
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
    const defaults=createWorldState(clubId,world.managerProfileId??"custom",world.difficulty??"medio",world.pace??"normal");
    const existing=Array.isArray(world.globalLeagues)?world.globalLeagues:[];
    const byDivision=new Map(existing.map(league=>[league.divisionId,league]));
    return {
      ...defaults,
      ...world,
      sponsorOffers: Array.isArray(world.sponsorOffers) ? world.sponsorOffers : [],
      jobOffers: Array.isArray(world.jobOffers) ? world.jobOffers.map(offer=>({...offer,divisionId:offer.divisionId??getWorldClub(offer.clubId)?.divisionId??world.divisionId})) : [],
      retiredPlayers: Array.isArray(world.retiredPlayers) ? world.retiredPlayers : [],
      worldNews: Array.isArray(world.worldNews) ? world.worldNews : [],
      globalLeagues: defaults.globalLeagues.map(league=>{const existingLeague=byDivision.get(league.divisionId);return existingLeague?{...league,...existingLeague,seasonComplete:existingLeague.seasonComplete??false}:league;}),
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
