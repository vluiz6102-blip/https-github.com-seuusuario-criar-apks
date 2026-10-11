export interface WorldClub {
  id: string;
  name: string;
  country: string;
  region: "Europa" | "América do Sul" | "América do Norte" | "Ásia" | "África";
  league: string;
  stadium: string;
  manager?: string;
  managerChecked?: string;
  colors: [string, string];
  rivals: string[];
}

export interface WorldPlayer {
  id: string;
  name: string;
  clubId: string;
  nationality: string;
  position: string;
  age: number;
  rating: number;
  potential: number;
  marketValue: number;
}

export interface WorldHeadline {
  id: string;
  date: string;
  category: "Resultado" | "Mercado" | "Técnico" | "Contrato";
  headline: string;
  detail: string;
  source: string;
  url: string;
}

export const WORLD_DATA_DATE = "11/10/2026";

/**
 * World directory v1. This is a curated, expandable starter database, not a claim
 * that every professional, semi-professional, academy or amateur club worldwide is
 * already represented. Unknown coaching assignments are deliberately left blank.
 */
export const WORLD_CLUBS: WorldClub[] = [
  { id:"man-city", name:"Manchester City", country:"Inglaterra", region:"Europa", league:"Premier League", stadium:"Etihad Stadium", manager:"Enzo Maresca", managerChecked:"11/10/2026", colors:["#6CABDD","#1C2C5B"], rivals:["man-utd","liverpool"] },
  { id:"liverpool", name:"Liverpool", country:"Inglaterra", region:"Europa", league:"Premier League", stadium:"Anfield", manager:"Andoni Iraola", managerChecked:"11/10/2026", colors:["#C8102E","#F6EB61"], rivals:["man-utd","everton","man-city"] },
  { id:"arsenal", name:"Arsenal", country:"Inglaterra", region:"Europa", league:"Premier League", stadium:"Emirates Stadium", manager:"Mikel Arteta", managerChecked:"07/10/2026", colors:["#EF0107","#FFFFFF"], rivals:["tottenham","chelsea"] },
  { id:"man-utd", name:"Manchester United", country:"Inglaterra", region:"Europa", league:"Premier League", stadium:"Old Trafford", colors:["#DA291C","#FBE122"], rivals:["man-city","liverpool"] },
  { id:"chelsea", name:"Chelsea", country:"Inglaterra", region:"Europa", league:"Premier League", stadium:"Stamford Bridge", colors:["#034694","#FFFFFF"], rivals:["arsenal","tottenham"] },
  { id:"tottenham", name:"Tottenham Hotspur", country:"Inglaterra", region:"Europa", league:"Premier League", stadium:"Tottenham Hotspur Stadium", colors:["#132257","#FFFFFF"], rivals:["arsenal","chelsea"] },
  { id:"newcastle", name:"Newcastle United", country:"Inglaterra", region:"Europa", league:"Premier League", stadium:"St James' Park", colors:["#241F20","#FFFFFF"], rivals:["sunderland"] },
  { id:"aston-villa", name:"Aston Villa", country:"Inglaterra", region:"Europa", league:"Premier League", stadium:"Villa Park", colors:["#670E36","#95BFE5"], rivals:["birmingham-city"] },
  { id:"everton", name:"Everton", country:"Inglaterra", region:"Europa", league:"Premier League", stadium:"Hill Dickinson Stadium", colors:["#003399","#FFFFFF"], rivals:["liverpool"] },

  { id:"real-madrid", name:"Real Madrid", country:"Espanha", region:"Europa", league:"LaLiga", stadium:"Estadio Santiago Bernabéu", manager:"José Mourinho", managerChecked:"18/08/2026", colors:["#FFFFFF","#FEBE10"], rivals:["barcelona","atletico"] },
  { id:"barcelona", name:"FC Barcelona", country:"Espanha", region:"Europa", league:"LaLiga", stadium:"Spotify Camp Nou", colors:["#A50044","#004D98"], rivals:["real-madrid","espanyol"] },
  { id:"atletico", name:"Atlético de Madrid", country:"Espanha", region:"Europa", league:"LaLiga", stadium:"Riyadh Air Metropolitano", manager:"Diego Simeone", managerChecked:"11/10/2026", colors:["#CB3524","#FFFFFF"], rivals:["real-madrid"] },
  { id:"sevilla", name:"Sevilla FC", country:"Espanha", region:"Europa", league:"LaLiga", stadium:"Ramón Sánchez-Pizjuán", colors:["#FFFFFF","#D71920"], rivals:["real-betis"] },
  { id:"athletic", name:"Athletic Club", country:"Espanha", region:"Europa", league:"LaLiga", stadium:"San Mamés", colors:["#EE2523","#FFFFFF"], rivals:["real-sociedad"] },
  { id:"real-betis", name:"Real Betis", country:"Espanha", region:"Europa", league:"LaLiga", stadium:"Estadio La Cartuja", colors:["#00954C","#FFFFFF"], rivals:["sevilla"] },
  { id:"villarreal", name:"Villarreal CF", country:"Espanha", region:"Europa", league:"LaLiga", stadium:"Estadio de la Cerámica", colors:["#FFE667","#005187"], rivals:["valencia"] },
  { id:"real-sociedad", name:"Real Sociedad", country:"Espanha", region:"Europa", league:"LaLiga", stadium:"Reale Arena", colors:["#0067B1","#FFFFFF"], rivals:["athletic"] },
  { id:"valencia", name:"Valencia CF", country:"Espanha", region:"Europa", league:"LaLiga", stadium:"Mestalla", colors:["#FFFFFF","#F36F21"], rivals:["villarreal"] },

  { id:"juventus", name:"Juventus", country:"Itália", region:"Europa", league:"Serie A", stadium:"Allianz Stadium", manager:"Luciano Spalletti", managerChecked:"10/04/2026", colors:["#FFFFFF","#111111"], rivals:["inter","milan","torino"] },
  { id:"inter", name:"Inter", country:"Itália", region:"Europa", league:"Serie A", stadium:"Stadio Giuseppe Meazza", manager:"Cristian Chivu", managerChecked:"11/10/2026", colors:["#0068A8","#111111"], rivals:["milan","juventus"] },
  { id:"milan", name:"AC Milan", country:"Itália", region:"Europa", league:"Serie A", stadium:"Stadio Giuseppe Meazza", colors:["#FB090B","#111111"], rivals:["inter","juventus"] },
  { id:"napoli", name:"Napoli", country:"Itália", region:"Europa", league:"Serie A", stadium:"Stadio Diego Armando Maradona", colors:["#00A6E8","#FFFFFF"], rivals:["roma"] },
  { id:"roma", name:"AS Roma", country:"Itália", region:"Europa", league:"Serie A", stadium:"Stadio Olimpico", colors:["#8E1F2F","#F0BC42"], rivals:["lazio"] },
  { id:"lazio", name:"Lazio", country:"Itália", region:"Europa", league:"Serie A", stadium:"Stadio Olimpico", colors:["#87D8F7","#FFFFFF"], rivals:["roma"] },
  { id:"bologna", name:"Bologna FC", country:"Itália", region:"Europa", league:"Serie A", stadium:"Stadio Renato Dall'Ara", colors:["#1A2F6B","#D11F36"], rivals:["fiorentina"] },

  { id:"bayern", name:"Bayern München", country:"Alemanha", region:"Europa", league:"Bundesliga", stadium:"Allianz Arena", manager:"Vincent Kompany", managerChecked:"17/05/2026", colors:["#DC052D","#FFFFFF"], rivals:["dortmund"] },
  { id:"dortmund", name:"Borussia Dortmund", country:"Alemanha", region:"Europa", league:"Bundesliga", stadium:"Signal Iduna Park", colors:["#FDE100","#111111"], rivals:["bayern","schalke"] },
  { id:"leverkusen", name:"Bayer Leverkusen", country:"Alemanha", region:"Europa", league:"Bundesliga", stadium:"BayArena", colors:["#E32219","#111111"], rivals:["koln"] },
  { id:"leipzig", name:"RB Leipzig", country:"Alemanha", region:"Europa", league:"Bundesliga", stadium:"Red Bull Arena", colors:["#E32219","#FFFFFF"], rivals:["dortmund"] },
  { id:"frankfurt", name:"Eintracht Frankfurt", country:"Alemanha", region:"Europa", league:"Bundesliga", stadium:"Deutsche Bank Park", colors:["#E1000F","#111111"], rivals:["mainz"] },

  { id:"psg", name:"Paris Saint-Germain", country:"França", region:"Europa", league:"Ligue 1", stadium:"Parc des Princes", manager:"Luis Enrique", managerChecked:"04/09/2026", colors:["#004170","#DA291C"], rivals:["marseille"] },
  { id:"marseille", name:"Olympique de Marseille", country:"França", region:"Europa", league:"Ligue 1", stadium:"Orange Vélodrome", colors:["#FFFFFF","#2FAEE0"], rivals:["psg"] },
  { id:"lyon", name:"Olympique Lyonnais", country:"França", region:"Europa", league:"Ligue 1", stadium:"Groupama Stadium", colors:["#FFFFFF","#DA291C"], rivals:["saint-etienne"] },
  { id:"monaco", name:"AS Monaco", country:"Mônaco", region:"Europa", league:"Ligue 1", stadium:"Stade Louis II", colors:["#E41B36","#FFFFFF"], rivals:["nice"] },

  { id:"benfica", name:"SL Benfica", country:"Portugal", region:"Europa", league:"Liga Portugal", stadium:"Estádio da Luz", colors:["#E83030","#FFFFFF"], rivals:["porto","sporting"] },
  { id:"porto", name:"FC Porto", country:"Portugal", region:"Europa", league:"Liga Portugal", stadium:"Estádio do Dragão", colors:["#0050A4","#FFFFFF"], rivals:["benfica","sporting"] },
  { id:"sporting", name:"Sporting CP", country:"Portugal", region:"Europa", league:"Liga Portugal", stadium:"Estádio José Alvalade", colors:["#008D50","#FFFFFF"], rivals:["benfica","porto"] },
  { id:"braga", name:"SC Braga", country:"Portugal", region:"Europa", league:"Liga Portugal", stadium:"Estádio Municipal de Braga", colors:["#E32219","#FFFFFF"], rivals:["porto"] },
  { id:"ajax", name:"Ajax", country:"Países Baixos", region:"Europa", league:"Eredivisie", stadium:"Johan Cruyff Arena", colors:["#D2122E","#FFFFFF"], rivals:["feyenoord"] },
  { id:"psv", name:"PSV Eindhoven", country:"Países Baixos", region:"Europa", league:"Eredivisie", stadium:"Philips Stadion", colors:["#E32219","#FFFFFF"], rivals:["ajax"] },
  { id:"feyenoord", name:"Feyenoord", country:"Países Baixos", region:"Europa", league:"Eredivisie", stadium:"De Kuip", colors:["#E32219","#FFFFFF"], rivals:["ajax"] },

  { id:"palmeiras", name:"Palmeiras", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Nubank Parque", manager:"Abel Ferreira", managerChecked:"11/10/2026", colors:["#006437","#FFFFFF"], rivals:["corinthians","sao-paulo","santos"] },
  { id:"corinthians", name:"Corinthians", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Neo Química Arena", manager:"Clarence Seedorf", managerChecked:"11/10/2026", colors:["#111111","#FFFFFF"], rivals:["palmeiras","sao-paulo","santos"] },
  { id:"flamengo", name:"Flamengo", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Maracanã", colors:["#C8102E","#111111"], rivals:["fluminense","vasco","botafogo"] },
  { id:"sao-paulo", name:"São Paulo FC", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"MorumBIS", colors:["#FFFFFF","#D71920"], rivals:["corinthians","palmeiras","santos"] },
  { id:"santos", name:"Santos FC", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Vila Belmiro", colors:["#FFFFFF","#111111"], rivals:["palmeiras","corinthians","sao-paulo"] },
  { id:"gremio", name:"Grêmio", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Arena do Grêmio", colors:["#00AEEF","#111111"], rivals:["internacional"] },
  { id:"internacional", name:"Internacional", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Beira-Rio", colors:["#E32219","#FFFFFF"], rivals:["gremio"] },
  { id:"botafogo", name:"Botafogo", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Estádio Nilton Santos", colors:["#111111","#FFFFFF"], rivals:["flamengo","fluminense","vasco"] },
  { id:"fluminense", name:"Fluminense", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Maracanã", colors:["#7A1738","#006341"], rivals:["flamengo","botafogo","vasco"] },
  { id:"bahia", name:"Bahia", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Arena Fonte Nova", colors:["#005CA9","#D71920"], rivals:["vitoria"] },
  { id:"cruzeiro", name:"Cruzeiro", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Mineirão", colors:["#003DA5","#FFFFFF"], rivals:["atletico-mg"] },
  { id:"vasco", name:"Vasco da Gama", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"São Januário", colors:["#111111","#FFFFFF"], rivals:["flamengo","fluminense","botafogo"] },
  { id:"athletico-pr", name:"Athletico Paranaense", country:"Brasil", region:"América do Sul", league:"Brasileirão Série A", stadium:"Arena da Baixada", colors:["#D71920","#111111"], rivals:["coritiba"] },

  { id:"river-plate", name:"River Plate", country:"Argentina", region:"América do Sul", league:"Primera División", stadium:"Estadio Monumental", manager:"Leonardo Ponzio (interino)", managerChecked:"27/08/2026", colors:["#FFFFFF","#D71920"], rivals:["boca"] },
  { id:"boca", name:"Boca Juniors", country:"Argentina", region:"América do Sul", league:"Primera División", stadium:"La Bombonera", colors:["#003DA5","#F5C400"], rivals:["river-plate"] },
  { id:"racing", name:"Racing Club", country:"Argentina", region:"América do Sul", league:"Primera División", stadium:"Estadio Presidente Perón", colors:["#7CC7E8","#FFFFFF"], rivals:["independiente"] },
  { id:"independiente", name:"Independiente", country:"Argentina", region:"América do Sul", league:"Primera División", stadium:"Estadio Libertadores de América - Ricardo Enrique Bochini", colors:["#D71920","#FFFFFF"], rivals:["racing"] },

  { id:"america-mx", name:"Club América", country:"México", region:"América do Norte", league:"Liga MX", stadium:"Estadio Azteca", colors:["#F9D616","#003A70"], rivals:["chivas"] },
  { id:"chivas", name:"Chivas Guadalajara", country:"México", region:"América do Norte", league:"Liga MX", stadium:"Estadio Akron", colors:["#D71920","#FFFFFF"], rivals:["america-mx"] },
  { id:"monterrey", name:"CF Monterrey", country:"México", region:"América do Norte", league:"Liga MX", stadium:"Estadio BBVA", colors:["#00529F","#FFFFFF"], rivals:["tigres"] },
  { id:"tigres", name:"Tigres UANL", country:"México", region:"América do Norte", league:"Liga MX", stadium:"Estadio Universitario", colors:["#F9D616","#003A70"], rivals:["monterrey"] },
  { id:"inter-miami", name:"Inter Miami CF", country:"Estados Unidos", region:"América do Norte", league:"MLS", stadium:"Chase Stadium", colors:["#F7B5CD","#111111"], rivals:["lafc"] },
  { id:"lafc", name:"Los Angeles FC", country:"Estados Unidos", region:"América do Norte", league:"MLS", stadium:"BMO Stadium", colors:["#111111","#C39E6D"], rivals:["inter-miami"] },
  { id:"sounders", name:"Seattle Sounders FC", country:"Estados Unidos", region:"América do Norte", league:"MLS", stadium:"Lumen Field", colors:["#5D9741","#005595"], rivals:["portland"] },

  { id:"al-hilal", name:"Al-Hilal", country:"Arábia Saudita", region:"Ásia", league:"Saudi Pro League", stadium:"Kingdom Arena", colors:["#0057B8","#FFFFFF"], rivals:["al-nassr"] },
  { id:"al-nassr", name:"Al-Nassr", country:"Arábia Saudita", region:"Ásia", league:"Saudi Pro League", stadium:"Al-Awwal Park", colors:["#F9D616","#00529B"], rivals:["al-hilal"] },
  { id:"urawa", name:"Urawa Red Diamonds", country:"Japão", region:"Ásia", league:"J1 League", stadium:"Saitama Stadium 2002", colors:["#D71920","#FFFFFF"], rivals:["kashima"] },
  { id:"kashima", name:"Kashima Antlers", country:"Japão", region:"Ásia", league:"J1 League", stadium:"Kashima Soccer Stadium", colors:["#D71920","#111111"], rivals:["urawa"] },
  { id:"al-ahly", name:"Al Ahly", country:"Egito", region:"África", league:"Egyptian Premier League", stadium:"Cairo International Stadium", colors:["#D71920","#FFFFFF"], rivals:["zamalek"] },
  { id:"sundowns", name:"Mamelodi Sundowns", country:"África do Sul", region:"África", league:"South African Premiership", stadium:"Loftus Versfeld Stadium", colors:["#F9D616","#003A70"], rivals:[] }
];

export const WORLD_PLAYERS: WorldPlayer[] = [
  { id:"haaland", age:26, rating:91, potential:92, marketValue:180000000, name:"Erling Haaland", clubId:"man-city", nationality:"Noruega", position:"Atacante" },
  { id:"doku", age:24, rating:84, potential:88, marketValue:65000000, name:"Jérémy Doku", clubId:"man-city", nationality:"Bélgica", position:"Ponta" },
  { id:"cherki", age:23, rating:82, potential:89, marketValue:60000000, name:"Rayan Cherki", clubId:"man-city", nationality:"França", position:"Meia-atacante" },
  { id:"gravenberch", age:24, rating:83, potential:88, marketValue:80000000, name:"Ryan Gravenberch", clubId:"liverpool", nationality:"Países Baixos", position:"Meio-campista" },
  { id:"isak", age:27, rating:88, potential:89, marketValue:120000000, name:"Alexander Isak", clubId:"liverpool", nationality:"Suécia", position:"Atacante" },
  { id:"gakpo", age:27, rating:84, potential:86, marketValue:65000000, name:"Cody Gakpo", clubId:"liverpool", nationality:"Países Baixos", position:"Atacante" },
  { id:"rice", age:27, rating:88, potential:89, marketValue:120000000, name:"Declan Rice", clubId:"arsenal", nationality:"Inglaterra", position:"Meio-campista" },
  { id:"odegaard", age:27, rating:87, potential:88, marketValue:95000000, name:"Martin Ødegaard", clubId:"arsenal", nationality:"Noruega", position:"Meia-atacante" },
  { id:"saka", age:25, rating:89, potential:92, marketValue:140000000, name:"Bukayo Saka", clubId:"arsenal", nationality:"Inglaterra", position:"Ponta" },
  { id:"mbappe", age:27, rating:94, potential:95, marketValue:200000000, name:"Kylian Mbappé", clubId:"real-madrid", nationality:"França", position:"Atacante" },
  { id:"bellingham", age:23, rating:91, potential:94, marketValue:170000000, name:"Jude Bellingham", clubId:"real-madrid", nationality:"Inglaterra", position:"Meio-campista" },
  { id:"courtois", age:34, rating:88, potential:88, marketValue:18000000, name:"Thibaut Courtois", clubId:"real-madrid", nationality:"Bélgica", position:"Goleiro" },
  { id:"araujo", age:27, rating:85, potential:87, marketValue:55000000, name:"Ronald Araújo", clubId:"barcelona", nationality:"Uruguai", position:"Zagueiro" },
  { id:"pedri", age:23, rating:89, potential:93, marketValue:120000000, name:"Pedri", clubId:"barcelona", nationality:"Espanha", position:"Meio-campista" },
  { id:"yamal", age:19, rating:91, potential:96, marketValue:180000000, name:"Lamine Yamal", clubId:"barcelona", nationality:"Espanha", position:"Ponta" },
  { id:"neves", age:22, rating:88, potential:93, marketValue:100000000, name:"João Neves", clubId:"psg", nationality:"Portugal", position:"Meio-campista" },
  { id:"pacho", age:24, rating:85, potential:89, marketValue:65000000, name:"Willian Pacho", clubId:"psg", nationality:"Equador", position:"Zagueiro" },
  { id:"beraldo", age:23, rating:81, potential:88, marketValue:35000000, name:"Lucas Beraldo", clubId:"psg", nationality:"Brasil", position:"Zagueiro" },
  { id:"mayulu", age:20, rating:77, potential:88, marketValue:22000000, name:"Senny Mayulu", clubId:"psg", nationality:"França", position:"Meio-campista" },
  { id:"fabian-ruiz", age:30, rating:84, potential:84, marketValue:35000000, name:"Fabián Ruiz", clubId:"psg", nationality:"Espanha", position:"Meio-campista" },
  { id:"yildiz", age:21, rating:85, potential:91, marketValue:65000000, name:"Kenan Yıldız", clubId:"juventus", nationality:"Turquia", position:"Meia-atacante" },
  { id:"openda", age:26, rating:83, potential:85, marketValue:45000000, name:"Loïs Openda", clubId:"juventus", nationality:"Bélgica", position:"Atacante" },
  { id:"locatelli", age:28, rating:82, potential:83, marketValue:30000000, name:"Manuel Locatelli", clubId:"juventus", nationality:"Itália", position:"Meio-campista" },
  { id:"bonny", age:22, rating:78, potential:86, marketValue:25000000, name:"Ange-Yoan Bonny", clubId:"inter", nationality:"França", position:"Atacante" },
  { id:"pio-esposito", age:21, rating:77, potential:87, marketValue:20000000, name:"Pio Esposito", clubId:"inter", nationality:"Itália", position:"Atacante" },
  { id:"vitor-roque", age:21, rating:82, potential:89, marketValue:45000000, name:"Vitor Roque", clubId:"palmeiras", nationality:"Brasil", position:"Atacante" },
  { id:"andreas-pereira", age:30, rating:82, potential:83, marketValue:25000000, name:"Andreas Pereira", clubId:"palmeiras", nationality:"Brasil", position:"Meio-campista" },
  { id:"jhon-arias", age:29, rating:83, potential:83, marketValue:20000000, name:"Jhon Arias", clubId:"palmeiras", nationality:"Colômbia", position:"Ponta" },
  { id:"felipe-anderson", age:33, rating:79, potential:79, marketValue:6000000, name:"Felipe Anderson", clubId:"palmeiras", nationality:"Brasil", position:"Ponta" },
  { id:"paulinho", age:26, rating:81, potential:84, marketValue:18000000, name:"Paulinho", clubId:"palmeiras", nationality:"Brasil", position:"Atacante" }
];

export const WORLD_HEADLINES: WorldHeadline[] = [
  { id:"mc-liv-20261011", date:"11/10/2026", category:"Resultado", headline:"Manchester City vence Liverpool por 3 a 0", detail:"Erling Haaland, Jérémy Doku e Rayan Cherki marcaram em Anfield. É uma nota factual do recorte de outubro de 2026, não uma simulação da carreira do jogador.", source:"Reuters", url:"https://www.reuters.com/sports/soccer/man-city-silence-hostile-anfield-with-3-0-win-over-liverpool-2026-10-11/" },
  { id:"arsenal-arteta-20261007", date:"07/10/2026", category:"Contrato", headline:"Mikel Arteta amplia vínculo com o Arsenal até 2030", detail:"O clube confirmou a extensão do contrato do treinador após a temporada 2025/26.", source:"Reuters", url:"https://www.reuters.com/sports/soccer/arsenal-manager-mikel-arteta-extends-contract-until-2030-2026-10-07/" },
  { id:"madrid-mourinho-20260818", date:"18/08/2026", category:"Técnico", headline:"José Mourinho é apresentado como treinador do Real Madrid", detail:"O Real Madrid anunciou o técnico para a equipe principal com vínculo previsto até junho de 2029.", source:"Real Madrid (oficial)", url:"https://www.realmadrid.com/en-US/news/football/first-team/latest-news/acto-de-presentacion-de-mourinho-18-08-2026" },
  { id:"corinthians-seedorf-20261011", date:"11/10/2026", category:"Técnico", headline:"Clarence Seedorf assume o comando do Corinthians", detail:"O clube anunciou o treinador neste domingo. A ficha do mundo foi atualizada neste recorte da temporada.", source:"Reuters", url:"https://www.reuters.com/sports/soccer/struggling-corinthians-sign-seedorf-manager-2026-10-11/" },
  { id:"psg-enrique-20260904", date:"04/09/2026", category:"Contrato", headline:"PSG confirma continuidade de Luis Enrique", detail:"O clube anunciou a renovação do treinador e de João Neves, Willian Pacho, Lucas Beraldo, Senny Mayulu e Fabián Ruiz.", source:"Paris Saint-Germain (oficial)", url:"https://www.psg.fr/en/content/pr-choosing-continuity" },
  { id:"juve-spalletti-20260410", date:"10/04/2026", category:"Contrato", headline:"Luciano Spalletti renova com a Juventus até 2028", detail:"A Juventus confirmou a extensão de vínculo com o treinador da equipe masculina.", source:"Juventus (oficial)", url:"https://www.juventus.com/en/news/articles/renewal-luciano-spalletti-2028" }
];

export const WORLD_DATA_SOURCES = [
  { name:"UEFA - estádios e sedes", url:"https://football-uefa.com/stadiums/" },
  { name:"Palmeiras - elenco profissional e partidas", url:"https://palmeiras.com.br/futebol/" },
  { name:"Palmeiras - comissão técnica", url:"https://www.palmeiras.com.br/comissao-tecnica/" },
  { name:"Liverpool - nomeação de Andoni Iraola", url:"https://www.liverpoolfc.com/news/liverpool-fc-appoint-andoni-iraola-new-head-coach" },
  { name:"Real Madrid - José Mourinho", url:"https://www.realmadrid.com/en-US/news/football/first-team/latest-news/acto-de-presentacion-de-mourinho-18-08-2026" },
  { name:"Atlético de Madrid - Diego Simeone", url:"https://www.atleticodemadrid.com/noticias/simeone-renueva-hasta-2027" },
  { name:"Inter - elenco e Cristian Chivu", url:"https://www.inter.it/it/squadra/prima-squadra" },
  { name:"Juventus - Luciano Spalletti", url:"https://www.juventus.com/en/news/articles/renewal-luciano-spalletti-2028" },
  { name:"Paris Saint-Germain - equipe técnica", url:"https://www.psg.fr/pt/futebol-masculino/comissao-tecnica" },
  { name:"Bayern - Vincent Kompany", url:"https://fcbayern.com/en/news/2026/05/fc-bayern-celebrate-35th-championship-title-at-nockherberg" },
  { name:"Corinthians - contratação de Clarence Seedorf", url:"https://www.reuters.com/sports/soccer/struggling-corinthians-sign-seedorf-manager-2026-10-11/" },
  { name:"Arsenal - contrato de Mikel Arteta", url:"https://www.reuters.com/sports/soccer/arsenal-manager-mikel-arteta-extends-contract-until-2030-2026-10-07/" }
];
