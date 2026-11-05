export type Difficulty = "facil" | "medio" | "dificil" | "quase-impossivel";
export type CareerPace = "normal" | "tranquilo" | "delegado";

export interface WorldClubSeed {
  id: string;
  name: string;
  shortName: string;
  countryCode: string;
  country: string;
  region: string;
  divisionId: string;
  divisionName: string;
  tier: number;
  city: string;
  stadium: string;
  strength: number;
  supporters: number;
  budget: number;
  project: string;
}

export interface WorldDivision {
  id: string;
  name: string;
  countryCode: string;
  country: string;
  tier: number;
  clubs: string[];
  promotionPlaces?: number;
  relegationPlaces?: number;
  promotionTarget?: string;
  relegationTarget?: string;
  kind: "national" | "state" | "regional" | "amateur";
}

export interface WorldCompetitionSeed {
  id: string;
  name: string;
  countryCode: string;
  type: "league" | "cup" | "continental" | "international" | "amateur";
  divisionId?: string;
  participants: number;
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function clubProject(tier: number, strength: number): string {
  if (tier >= 7) return "Levar o futebol de bairro ao cenário nacional";
  if (tier >= 6) return "Conquistar a região e buscar calendário nacional";
  if (tier === 5) return "Garantir permanência e sonhar com o acesso";
  if (tier === 4) return "Subir para a divisão superior";
  if (tier === 3) return "Montar um elenco competitivo e conquistar o acesso";
  if (tier === 2) return "Chegar à elite e equilibrar as finanças";
  if (strength >= 88) return "Disputar títulos nacionais e continentais";
  return "Consolidar-se na elite e crescer com sustentabilidade";
}

function buildDivision(
  id: string,
  name: string,
  countryCode: string,
  country: string,
  region: string,
  tier: number,
  kind: WorldDivision["kind"],
  names: string[],
  cities: string[],
  baseStrength: number
): { division: WorldDivision; clubs: WorldClubSeed[] } {
  const clubs = names.map((name, index): WorldClubSeed => {
    const city = cities[index % cities.length]!;
    const strength = Math.max(31, Math.min(96, baseStrength + (names.length - index) * 0.38 + ((index * 7) % 5) - 2));
    const shortName = name.replace(/[^A-Z0-9]/g, "").slice(0, 7) || "CLUBE";
    const clubId = id + "-" + slug(name);
    return {
      id: clubId, name, shortName, countryCode, country, region, divisionId: id,
      divisionName: nameForDivision(name, id, name),
      tier, city, stadium: "Arena " + city, strength: Math.round(strength),
      supporters: Math.round(2200 + strength * strength * (tier <= 2 ? 42 : tier <= 4 ? 15 : 4)),
      budget: Math.round(Math.pow(strength, 2) * (tier <= 2 ? 10500 : tier <= 4 ? 2800 : 650)),
      project: clubProject(tier, strength)
    };
  });
  clubs.forEach(club => { club.divisionName = name; });
  return { division: {
    id, name, countryCode, country, tier, clubs: clubs.map(c => c.id), kind,
    promotionPlaces: tier===1?0:tier<=4?4:tier===5?1:2,
    relegationPlaces: tier===1?4:tier<=4?4:tier===5||tier===6?2:0
  }, clubs };
}

function nameForDivision(_club: string, _id: string, fallback: string): string { return fallback; }

const divisions: WorldDivision[] = [];
const clubs: WorldClubSeed[] = [];
function addDivision(
  id: string, name: string, countryCode: string, country: string, region: string,
  tier: number, kind: WorldDivision["kind"], names: string, cities: string, strength: number
): void {
  const result = buildDivision(id, name, countryCode, country, region, tier, kind, names.split("|"), cities.split("|"), strength);
  divisions.push(result.division);
  clubs.push(...result.clubs);
}

addDivision("br-a", "Brasileirão Série A", "BR", "Brasil", "Nacional", 1, "national",
"FL4MENGO|PALME1RAS|C0R1NTHIANS|S4O PAUL0|SANT0S|B0TAF0G0|FLUM1NENSE|V4SC0 DA G4MA|GRÊM1O|1NTERNAC10NAL|ATLÉT1C0-MG|CRUZ31R0|B4H1A|V1T0R1A|F0RT4LEZA|C3ARÁ|ATHLET1C0-PR|BR4GANT1N0|G0IÁS|CUI4BÁ",
"Rio de Janeiro|São Paulo|São Paulo|São Paulo|Santos|Rio de Janeiro|Rio de Janeiro|Rio de Janeiro|Porto Alegre|Porto Alegre|Belo Horizonte|Belo Horizonte|Salvador|Salvador|Fortaleza|Fortaleza|Curitiba|Bragança Paulista|Goiânia|Cuiabá", 87);
addDivision("br-b", "Brasileirão Série B", "BR", "Brasil", "Nacional", 2, "national",
"C0R1T1BA|AVA1|CH4PEC0ENSE|V1LA N0VA|N4UT1C0|SP0RT REC1FE|P0NTE PRETA|GU4R4N1|B0T4F0G0-SP|AMÉR1CA-MG|ATHL3T1C0-G0|L0ND R1NA|CR1C1ÚMA|JUV3NTUDE|P4YS4NDU|REM0|V1T0R1A-BA|ABC FC|C0NF1ANÇA|M4R1NGÁ",
"Curitiba|Florianópolis|Chapecó|Goiânia|Recife|Recife|Campinas|Campinas|Ribeirão Preto|Belo Horizonte|Goiânia|Londrina|Criciúma|Caxias do Sul|Belém|Belém|Salvador|Natal|Aracaju|Maringá", 77);
addDivision("br-c", "Brasileirão Série C", "BR", "Brasil", "Nacional", 3, "national",
"F3RR0V1ÁR10|B0T4F0G0-PB|M4N4US FC|S4MPA10|Y P1R4NG4|F1GUE1R3NSE|C4X1AS|M0T0 CLUBE|0PERÁR10|T0MBENSE|BRUSQUE|S4NTA CRUZ|1T4B41ANA|P0RTUGUESA|C4MP1NENSE|S4O B3RN4RD0|F3RROV1ÁR10-CE|M4R4NHÃO|P4R4NÁ CLUBE|V0LTA RED0NDA",
"João Pessoa|João Pessoa|Manaus|São Luís|Ponta Grossa|Florianópolis|Caxias do Sul|Campina Grande|Ponta Grossa|Tombos|Brusque|Recife|Itabaiana|São Paulo|Campina Grande|São Bernardo do Campo|Fortaleza|São Luís|Curitiba|Volta Redonda", 67);
addDivision("br-d", "Brasileirão Série D", "BR", "Brasil", "Nacional", 4, "national",
"ÁGUIA DE MARABÁ|T0CANT1NÓP0L1S|M4RCÍL10 D1AS|P0RT0 V3LH0|1P4T1NG4|G4L0 MAR1NGÁ|N0V0 H4MBURG0|S4O R4YMUND0|C4SC4V3L FC|P4TR10TAS|P0US0 AL3GR3|C4T4NDUV3NS3|S4NTA CRUZ-RN|4NÁP0L1S FC|TUP1N4MBÁS|1GUA TU|G3NUS|P4R4C4TU|P4T0 BR4NC0 FC|C4N0AS",
"Marabá|Tocantinópolis|Maringá|Porto Velho|Ipatinga|Maringá|Novo Hamburgo|Boa Vista|Cascavel|Pato Branco|Pouso Alegre|Catanduva|Natal|Anápolis|Juiz de Fora|Iguatu|Porto Velho|Paracatu|Pato Branco|Canoas", 55);

const stateSets = [
  ["br-pr-a", "Paranaense Regional Ouro", "Paraná", "PR", "Curitiba|Londrina|Maringá|Cascavel|Pato Branco|Toledo|Foz do Iguaçu|Guarapuava", "CORITIBA B|OPERÁRIO PR|AZURIZ|ANDRAUS|RIO BRANCO PR|TOLEDO EC|FOZ FC|PRUDENTÓPOLIS", 59],
  ["br-sp-a", "Paulista Regional Ouro", "São Paulo", "SP", "Santos|Campinas|Sorocaba|Ribeirão Preto|Bauru|São José dos Campos|Itu|Limeira", "XV DE PIRACICABA|FERROVIÁRIA|BOTAFOGO-SP B|ITUANO|N0V0R1Z0NT1N0|SÃO BENTO|COMERCIAL-SP|L1NENSE", 61],
  ["br-rj-a", "Carioca Regional Ouro", "Rio de Janeiro", "RJ", "Niterói|Volta Redonda|Nova Iguaçu|Duque de Caxias|Macaé|Resende|Cabo Frio|Petrópolis", "VOLTA REDONDA B|NOVA IGUAÇU|AMERICANO|MACAÉ|RESENDE FC|CABOFRIENSE|PETRÓPOLIS|OLARIA", 58],
  ["br-rs-a", "Gaúcho Regional Ouro", "Rio Grande do Sul", "RS", "Pelotas|Caxias do Sul|Santa Maria|Passo Fundo|Ijuí|Bagé|Erechim|Lajeado", "BRASIL DE PELOTAS|JUVENTUDE B|INTER-SM|PASSO FUNDO|SÃO LUIZ|BAGÉ FC|Ypiranga B|LAJEADENSE", 58],
  ["br-sc-a", "Catarinense Regional Ouro", "Santa Catarina", "SC", "Joinville|Blumenau|Itajaí|Tubarão|Concórdia|Lages|Jaraguá do Sul|Rio do Sul", "JOINVILLE B|METROPOLITANO|MARCÍLIO DIAS|TUBARÃO FC|CONCÓRDIA|LAGES|JARAGUÁ|RIO DO SUL", 57],
  ["br-mg-a", "Mineiro Regional Ouro", "Minas Gerais", "MG", "Uberlândia|Juiz de Fora|Uberaba|Patos de Minas|Ipatinga|Poços de Caldas|Varginha|Sete Lagoas", "UBERLÂNDIA|TUPI|UBERABA SC|URT|IPATINGA B|CALDENSE|BOA ESPORTE|DEMOCRATA SL", 58],
  ["br-ba-a", "Baiano Regional Ouro", "Bahia", "BA", "Feira de Santana|Ilhéus|Juazeiro|Vitória da Conquista|Alagoinhas|Itabuna|Jacobina|Porto Seguro", "FLUMINENSE-BA|BARCELONA ILHÉUS|JUAZEIRENSE|VITÓRIA DA CONQUISTA|ATLÉTICO-BA|ITABUNA|JACOBINA|PORTO FC", 55],
  ["br-ce-a", "Cearense Regional Ouro", "Ceará", "CE", "Juazeiro do Norte|Sobral|Crato|Iguatu|Maracanaú|Quixadá|Itapipoca|Crateús", "ICASA|GUARANY SOBRAL|CRATO EC|IGUATU FC|MARACANAÚ|QUIXADÁ|ITAPIPOCA|CRATEÚS", 55]
] as const;
for (const item of stateSets) {
  addDivision(item[0], item[1], "BR", "Brasil", item[2], 5, "state", item[5], item[4], item[6]);
}

addDivision("br-varzea-sul", "Taça Várzea Sul", "BR", "Brasil", "Regional Sul", 6, "amateur",
"UNIÃO DO BAIRRO|ATLÉTICO DA PONTE|REAL VILA NOVA|JUVENTUDE DO PARQUE|GRÊMIO DA ESTAÇÃO|ESTRELA AZUL|AMIGOS DO CAMPO|NACIONAL DO MORRO|VILA OPERÁRIA|RACING DO SUL|GUERREIROS FC|BOLA DE OURO|INDEPENDENTE DA SERRA|FAMÍLIA FC|SÃO JORGE|EXPRESSO VERDE",
"Pato Branco|Pato Branco|Francisco Beltrão|Dois Vizinhos|Clevelândia|Coronel Vivida|Palmas|Itapejara d'Oeste|Mariópolis|Vitorino|Pato Branco|Mangueirinha|Chopinzinho|São João|Bom Sucesso do Sul|Pato Branco", 38);

const international: Array<[string,string,string,string,string,number]> = [
["en","Inglaterra","Premier Orbit League","M4NCH3STER BLU3|M4NCH3STER R3D|L1V3RP00L|ARS3NAL|CH3LS3A|T0TT3NH4M|N3WC4STL3|AST0N V1LLA|EV3RT0N|W3ST H4M","Manchester|Manchester|Liverpool|London|London|London|Newcastle|Birmingham|Liverpool|London",88],
["es","Espanha","Liga Ibérica Ouro","R3AL M4DR1D|B4RCEL0NA|ATL3T1C0 M4DR1D|S3V1LLA|VAL3NC1A|V1LL4RREAL|R3AL S0C13D4D|B3T1S|G3T4F3|G1R0N4","Madrid|Barcelona|Madrid|Sevilla|Valencia|Villarreal|San Sebastián|Sevilla|Getafe|Girona",87],
["de","Alemanha","Bundesliga Central","B4Y3RN MÜNCH3N|D0RTMUND|L31PZ1G|L3V3RKUS3N|FR31BURG|STUTTG4RT|FR4NKFURT|W0LFSBURG|BR3M3N|H0FF3NH31M","Munich|Dortmund|Leipzig|Leverkusen|Freiburg|Stuttgart|Frankfurt|Wolfsburg|Bremen|Hoffenheim",86],
["it","Itália","Lega Azzurra","JUV3NTUS|1NT3R M1L4N|M1L4N|N4P0L1|R0M4|L4Z10|4T4L4NT4|F10R3NT1N4|B0L0GN4|T0R1N0","Turin|Milan|Milan|Naples|Rome|Rome|Bergamo|Florence|Bologna|Turin",85],
["fr","França","Ligue Lumière","P4R1S SG|M4RS3LL3|M0N4C0|LY0N|L1LL3|R3NN3S|N1C3|L3NS|T0UL0US3|N4NT3S","Paris|Marseille|Monaco|Lyon|Lille|Rennes|Nice|Lens|Toulouse|Nantes",84],
["pt","Portugal","Liga Atlântica","P0RT0|B3NF1C4|SP0RT1NG|BR4G4|V1TÓR14 SC|F4M4L1CÃO|B0AV1ST4|R10 4V3|M0R31R3NS3|G1LM4RÃ3S","Porto|Lisbon|Lisbon|Braga|Guimarães|Famalicão|Porto|Vila do Conde|Moreira de Cónegos|Guimarães",79],
["ar","Argentina","Liga del Plata","R1V3R PL4T3|B0C4 JUN10RS|R4C1NG|1ND3P3ND13NT3|S4N L0R3NZ0|R0S4R10 C3NTR4L|N3W3LLS|V3L3Z|T4LL3R3S|3STUD14NT3S","Buenos Aires|Buenos Aires|Avellaneda|Avellaneda|Buenos Aires|Rosario|Rosario|Buenos Aires|Córdoba|La Plata",80],
["us","Estados Unidos","Major Soccer Circuit","L0S 4NG3L3S FC|1NT3R M14M1|NYC FC|S34TTL3|4TL4NT4|H0UST0N|P0RTL4ND|4UST1N|D4LL4S|N3W Y0RK","Los Angeles|Miami|New York|Seattle|Atlanta|Houston|Portland|Austin|Dallas|New York",77],
["jp","Japão","J-League Horizon","T0KY0 FC|Y0K0H4M4|K4W4S4K1|UR4W4|G4MB4 0S4K4|K4SH1M4|V1SS3L K0B3|N4G0Y4|S4PP0R0|SANFR3CCE","Tokyo|Yokohama|Kawasaki|Saitama|Osaka|Kashima|Kobe|Nagoya|Sapporo|Hiroshima",76],
["nl","Países Baixos","Eredivisie Neon","4J4X|PSV|F3Y3N00RD|4Z|TW3NT3|UTR3CHT|4LKMA4R|GR0N1NG3N|H33R3NV33N|SP4RT4","Amsterdam|Eindhoven|Rotterdam|Alkmaar|Enschede|Utrecht|Alkmaar|Groningen|Heerenveen|Rotterdam",78],
["mx","México","Liga Sol de Oro","4M3R1C4|T1GR3S|M0NT3RR3Y|CRUZ 4ZUL|CH1V4S|PUM4S|T0LUCA|P4CHUC4|L30N|S4NT0S L4GUN4","Mexico City|Monterrey|Monterrey|Mexico City|Guadalajara|Mexico City|Toluca|Pachuca|León|Torreón",78],
["co","Colômbia","Liga Andina","4TL3T1C0 N4C10N4L|M1LL0N4R10S|4M3R1C4 C4L1|D3P0RT1V0 C4L1|T0L1M4|JUN10R|S4NT4 F3|3NV1G4D0|P3R31R4|ONC3 C4LD4S","Medellín|Bogotá|Cali|Cali|Ibagué|Barranquilla|Bogotá|Envigado|Pereira|Manizales",75]
];

for (const [code, country, leagueName, topNames, cityNames, strength] of international) {
  addDivision(code + "-1", leagueName, code.toUpperCase(), country, "Nacional", 1, "national", topNames, cityNames, strength);
  const roots = topNames.split("|");
  const cities = cityNames.split("|");
  const lower = roots.map(name => "ATLÉTICO " + name.replace(/[0-9]/g, "") + " B");
  addDivision(code + "-2", country + " Segunda Divisão", code.toUpperCase(), country, "Nacional", 2, "national", lower.join("|"), cities.join("|"), strength - 13);
}


/*
 * Expanded original world database.
 * These clubs and competition names are fictional and generated from curated
 * city/identity lists. The database is intentionally independent of real
 * club badges, trademarks and proprietary player rosters.
 */
const brazilStates: Array<[string,string,string,string[],number]> = [
 ["ac","Acre","Rio Branco|Cruzeiro do Sul|Sena Madureira|Tarauacá|Feijó|Brasiléia|Xapuri|Plácido de Castro".split("|"),48],
 ["al","Alagoas","Maceió|Arapiraca|Rio Largo|Palmeira dos Índios|Penedo|União dos Palmares|Delmiro Gouveia|São Miguel dos Campos".split("|"),51],
 ["ap","Amapá","Macapá|Santana|Laranjal do Jari|Oiapoque|Mazagão|Porto Grande|Tartarugalzinho|Calçoene".split("|"),46],
 ["am","Amazonas","Manaus|Parintins|Itacoatiara|Manacapuru|Coari|Tefé|Tabatinga|Maués".split("|"),54],
 ["df","Distrito Federal","Brasília|Ceilândia|Taguatinga|Gama|Planaltina|Sobradinho|Samambaia|Guará".split("|"),56],
 ["es","Espírito Santo","Vitória|Vila Velha|Serra|Cariacica|Linhares|Colatina|Guarapari|Cachoeiro de Itapemirim".split("|"),57],
 ["go","Goiás","Goiânia|Anápolis|Aparecida de Goiânia|Rio Verde|Catalão|Jataí|Itumbiara|Formosa".split("|"),58],
 ["ma","Maranhão","São Luís|Imperatriz|Caxias|Timon|Codó|Bacabal|Balsas|Pinheiro".split("|"),52],
 ["mt","Mato Grosso","Cuiabá|Várzea Grande|Rondonópolis|Sinop|Tangará da Serra|Cáceres|Sorriso|Lucas do Rio Verde".split("|"),55],
 ["ms","Mato Grosso do Sul","Campo Grande|Dourados|Três Lagoas|Corumbá|Ponta Porã|Naviraí|Nova Andradina|Aquidauana".split("|"),53],
 ["pa","Pará","Belém|Santarém|Marabá|Ananindeua|Castanhal|Altamira|Parauapebas|Tucuruí".split("|"),56],
 ["pb","Paraíba","João Pessoa|Campina Grande|Patos|Sousa|Cajazeiras|Bayeux|Guarabira|Cabedelo".split("|"),55],
 ["pe","Pernambuco","Recife|Caruaru|Petrolina|Garanhuns|Serra Talhada|Arcoverde|Goiana|Vitória de Santo Antão".split("|"),59],
 ["pi","Piauí","Teresina|Parnaíba|Picos|Floriano|Piripiri|Campo Maior|Barras|Oeiras".split("|"),50],
 ["rn","Rio Grande do Norte","Natal|Mossoró|Parnamirim|Caicó|Assú|Currais Novos|Macau|Pau dos Ferros".split("|"),53],
 ["ro","Rondônia","Porto Velho|Ji-Paraná|Ariquemes|Cacoal|Vilhena|Jaru|Rolim de Moura|Guajará-Mirim".split("|"),49],
 ["rr","Roraima","Boa Vista|Rorainópolis|Caracaraí|Alto Alegre|Mucajaí|Bonfim|Pacaraima|Cantá".split("|"),45],
 ["se","Sergipe","Aracaju|Itabaiana|Lagarto|Estância|Nossa Senhora do Socorro|São Cristóvão|Propriá|Tobias Barreto".split("|"),52],
 ["to","Tocantins","Palmas|Araguaína|Gurupi|Porto Nacional|Paraíso do Tocantins|Colinas|Guaraí|Dianópolis".split("|"),50]
];
const stateClubPrefixes = ["União","Atlético","Estrela","Nacional","Vila","Real","Operário","Racing"];
for (const [uf,state,cities,strength] of brazilStates) {
 const existingTop = divisions.find(item=>item.id==="br-"+uf+"-a");
 if (!existingTop) {
  const topNames = cities.map((city,index)=>stateClubPrefixes[index]+" "+city);
  addDivision("br-"+uf+"-a","Campeonato "+state+" · Divisão Principal","BR","Brasil",state,5,"state",topNames.join("|"),cities.join("|"),strength);
 }
 const accessNames = cities.map((city,index)=>["Boreal","Pioneiros","Portuária","Ferroviário","Ribeira","Central","Montanha","Horizonte"][index]+" "+city);
 addDivision("br-"+uf+"-b","Campeonato "+state+" · Divisão de Acesso","BR","Brasil",state,6,"state",accessNames.join("|"),cities.join("|"),strength-7);
 const amateurNames = cities.map((city,index)=>["Raiz","Bairro","Várzea","Juventude","Campo","Parque","Comunidade","Esperança"][index]+" "+city);
 addDivision("br-varzea-"+uf,"Liga de Várzea "+state,"BR","Brasil",state,7,"amateur",amateurNames.join("|"),cities.join("|"),strength-16);
}
// Complete the same access and amateur layers for the eight state leagues
// that were part of the original seed set.
for (const top of divisions.filter(item=>item.countryCode==="BR"&&item.kind==="state"&&item.id.endsWith("-a"))) {
 const uf=top.id.slice(3,-2);
 const cities=clubs.filter(club=>club.divisionId===top.id).map(club=>club.city);
 if(!divisions.some(item=>item.id==="br-"+uf+"-b")){
  const base=Math.max(38,Math.round(clubs.filter(club=>club.divisionId===top.id).reduce((sum,club)=>sum+club.strength,0)/Math.max(1,cities.length))-7);
  const accessNames=cities.map((city,index)=>["Boreal","Pioneiros","Portuária","Ferroviário","Ribeira","Central","Montanha","Horizonte"][index]+" "+city);
  addDivision("br-"+uf+"-b","Campeonato "+top.region+" · Divisão de Acesso","BR","Brasil",top.region,6,"state",accessNames.join("|"),cities.join("|"),base);
  const amateurNames=cities.map((city,index)=>["Raiz","Bairro","Várzea","Juventude","Campo","Parque","Comunidade","Esperança"][index]+" "+city);
  addDivision("br-varzea-"+uf,"Liga de Várzea "+top.region,"BR","Brasil",top.region,7,"amateur",amateurNames.join("|"),cities.join("|"),base-9);
 }
}
for (const division of divisions) {
 if (division.countryCode==="BR" && division.kind==="state") {
  const uf=division.id.slice(3,-2);
  if (division.id.endsWith("-a")) {
   division.promotionTarget="br-d";
   division.relegationTarget="br-"+uf+"-b";
  } else if (division.id.endsWith("-b")) {
   division.promotionTarget="br-"+uf+"-a";
   division.relegationTarget="br-varzea-"+uf;
  }
 }
 if (division.id.startsWith("br-varzea-") && division.id!=="br-varzea-sul") {
  const uf=division.id.slice("br-varzea-".length);
  division.promotionTarget="br-"+uf+"-b";
 }
}

const expandedNations: Array<[string,string,string[],number]> = [
 ["uy","Uruguai","Montevidéu|Salto|Paysandú|Maldonado|Rivera|Colonia|Durazno|Tacuarembó|Rocha|Mercedes".split("|"),77],
 ["cl","Chile","Santiago|Valparaíso|Concepción|Antofagasta|Temuco|Rancagua|Iquique|Talca|La Serena|Puerto Montt".split("|"),78],
 ["ec","Equador","Quito|Guayaquil|Cuenca|Ambato|Manta|Loja|Riobamba|Ibarra|Machala|Esmeraldas".split("|"),78],
 ["py","Paraguai","Assunção|Ciudad del Este|Encarnación|Luque|San Lorenzo|Capiatá|Pedro Juan Caballero|Villarrica|Caaguazú|Concepción".split("|"),74],
 ["pe","Peru","Lima|Arequipa|Cusco|Trujillo|Chiclayo|Piura|Iquitos|Huancayo|Tacna|Puno".split("|"),76],
 ["be","Bélgica","Bruxelas|Antuérpia|Bruges|Gent|Liège|Genk|Leuven|Mechelen|Charleroi|Namur".split("|"),80],
 ["hr","Croácia","Zagreb|Split|Rijeka|Osijek|Zadar|Pula|Varaždin|Šibenik|Karlovac|Dubrovnik".split("|"),77],
 ["ch","Suíça","Zurique|Basileia|Genebra|Berna|Lausanne|Lugano|Lucerna|Sion|St. Gallen|Thun".split("|"),79],
 ["dk","Dinamarca","Copenhague|Aarhus|Odense|Aalborg|Esbjerg|Randers|Vejle|Horsens|Herning|Kolding".split("|"),78],
 ["no","Noruega","Oslo|Bergen|Trondheim|Stavanger|Drammen|Tromsø|Bodø|Kristiansand|Ålesund|Molde".split("|"),79],
 ["tr","Turquia","Istambul|Ancara|Esmirna|Bursa|Trabzon|Adana|Antália|Konya|Gaziantep|Samsun".split("|"),81],
 ["ua","Ucrânia","Kyiv|Lviv|Odesa|Kharkiv|Dnipro|Poltava|Lutsk|Rivne|Uzhhorod|Chernihiv".split("|"),78],
 ["pl","Polônia","Varsóvia|Cracóvia|Gdańsk|Poznań|Wrocław|Łódź|Szczecin|Lublin|Białystok|Katowice".split("|"),79],
 ["se","Suécia","Estocolmo|Gotemburgo|Malmö|Uppsala|Västerås|Örebro|Linköping|Helsingborg|Jönköping|Kalmar".split("|"),79],
 ["at","Áustria","Viena|Graz|Linz|Salzburgo|Innsbruck|Klagenfurt|Villach|Wels|Bregenz|Leoben".split("|"),78],
 ["gr","Grécia","Atenas|Salônica|Patras|Heraclião|Larissa|Volos|Ioannina|Kavala|Rodes|Kalamata".split("|"),77],
 ["kr","Coreia do Sul","Seul|Busan|Incheon|Daegu|Daejeon|Ulsan|Suwon|Jeonju|Pohang|Gwangju".split("|"),81],
 ["au","Austrália","Sydney|Melbourne|Brisbane|Perth|Adelaide|Canberra|Newcastle|Wollongong|Geelong|Darwin".split("|"),80],
 ["ir","Irã","Teerã|Isfahan|Shiraz|Tabriz|Mashhad|Ahvaz|Rasht|Qom|Kerman|Yazd".split("|"),76],
 ["ma","Marrocos","Casablanca|Rabat|Marrakech|Tânger|Fez|Agadir|Oujda|Meknès|Tetuão|Safi".split("|"),81],
 ["sn","Senegal","Dakar|Thiès|Saint-Louis|Kaolack|Ziguinchor|Diourbel|Louga|Tambacounda|Mbour|Kolda".split("|"),75],
 ["ng","Nigéria","Lagos|Abuja|Kano|Ibadan|Benin City|Enugu|Jos|Kaduna|Warri|Port Harcourt".split("|"),78],
 ["eg","Egito","Cairo|Alexandria|Gizé|Port Said|Suez|Luxor|Aswan|Tanta|Mansoura|Ismailia".split("|"),79],
 ["za","África do Sul","Joanesburgo|Cidade do Cabo|Durban|Pretória|Soweto|Polokwane|Bloemfontein|Nelspruit|Kimberley|East London".split("|"),79],
 ["gh","Gana","Acra|Kumasi|Tamale|Takoradi|Cape Coast|Tema|Sunyani|Obuasi|Koforidua|Ho".split("|"),75],
 ["ca","Canadá","Toronto|Montreal|Vancouver|Calgary|Ottawa|Edmonton|Winnipeg|Hamilton|Quebec|Halifax".split("|"),78],
 ["cr","Costa Rica","San José|Alajuela|Cartago|Heredia|Liberia|Puntarenas|Limón|Escazú|San Carlos|Grecia".split("|"),72],
 ["nz","Nova Zelândia","Auckland|Wellington|Christchurch|Hamilton|Dunedin|Tauranga|Napier|Nelson|Rotorua|Invercargill".split("|"),71],
 ["sa","Arábia Saudita","Riade|Jidá|Meca|Medina|Dammam|Taif|Tabuk|Abha|Buraidah|Jubail".split("|"),78],
 ["qa","Catar","Doha|Al Rayyan|Al Wakrah|Al Khor|Lusail|Umm Salal|Dukhan|Mesaieed|Al Daayen|Al Shahaniya".split("|"),73],
 ["cn","China","Xangai|Pequim|Guangzhou|Shenzhen|Chengdu|Wuhan|Tianjin|Nanjing|Hangzhou|Qingdao".split("|"),79]
];
const worldTopPrefixes=["Aurora","Atlântico","Horizonte","Estrela","Vanguarda","Portuária","União","Boreal","Nacional","Vértice"];
const worldLowerPrefixes=["Vale","Pioneiros","Central","Ribeira","Imperial","Montanha","Fênix","Litorânea","Bairro","Racing"];
for (const [code,country,cities,strength] of expandedNations) {
 const topNames=cities.map((city,index)=>worldTopPrefixes[index]+" "+city);
 const lowerNames=cities.map((city,index)=>worldLowerPrefixes[index]+" "+city);
 addDivision(code+"-1",country+" · Liga Nacional",code.toUpperCase(),country,"Nacional",1,"national",topNames.join("|"),cities.join("|"),strength);
 addDivision(code+"-2",country+" · Segunda Liga",code.toUpperCase(),country,"Nacional",2,"national",lowerNames.join("|"),cities.join("|"),strength-12);
}

for (const division of divisions) {
  if (division.id === "br-a") division.relegationTarget = "br-b";
  if (division.id === "br-b") { division.promotionTarget = "br-a"; division.relegationTarget = "br-c"; }
  if (division.id === "br-c") { division.promotionTarget = "br-b"; division.relegationTarget = "br-d"; }
  if (division.id === "br-d") { division.promotionTarget = "br-c"; division.relegationTarget = "br-pr-a"; }
  if (division.id === "br-varzea-sul") division.promotionTarget = "br-pr-a";
  if (division.id.endsWith("-1") && division.countryCode !== "BR") division.relegationTarget = division.countryCode.toLowerCase() + "-2";
  if (division.id.endsWith("-2") && division.countryCode !== "BR") division.promotionTarget = division.countryCode.toLowerCase() + "-1";
}

export const WORLD_DIVISIONS: WorldDivision[] = divisions;
export const WORLD_CLUBS: WorldClubSeed[] = clubs;

const cupCompetitions: WorldCompetitionSeed[] = [
  { id: "br-copa", name: "Copa Nacional do Brasil", countryCode: "BR", type: "cup", participants: 92 },
  { id: "br-super", name: "Supercopa do Brasil", countryCode: "BR", type: "cup", participants: 2 },
  { id: "br-estaduais", name: "Copas Estaduais", countryCode: "BR", type: "cup", participants: 128 },
  { id: "conmebol-libertadores", name: "Copa Libertadores Continental", countryCode: "CONMEBOL", type: "continental", participants: 32 },
  { id: "conmebol-sudamericana", name: "Copa Sul-Americana Continental", countryCode: "CONMEBOL", type: "continental", participants: 32 },
  { id: "uefa-champions", name: "Liga dos Campeões Europeia", countryCode: "UEFA", type: "continental", participants: 36 },
  { id: "uefa-europa", name: "Liga Europa", countryCode: "UEFA", type: "continental", participants: 36 },
  { id: "uefa-conference", name: "Liga Conferência", countryCode: "UEFA", type: "continental", participants: 36 },
  { id: "fifa-club-world", name: "Mundial de Clubes", countryCode: "FIFA", type: "international", participants: 32 },
  { id: "fifa-world-cup", name: "Copa do Mundo de Seleções", countryCode: "FIFA", type: "international", participants: 48 },
  { id: "fifa-qualifiers", name: "Eliminatórias Mundiais", countryCode: "FIFA", type: "international", participants: 211 },
  { id: "copa-america", name: "Copa América", countryCode: "CONMEBOL", type: "international", participants: 16 },
  { id: "euro", name: "Euro Continental", countryCode: "UEFA", type: "international", participants: 24 },
  { id: "gold-cup", name: "Copa Ouro", countryCode: "CONCACAF", type: "international", participants: 16 },
  { id: "afcon", name: "Copa Africana", countryCode: "CAF", type: "international", participants: 24 },
  { id: "asian-cup", name: "Copa da Ásia", countryCode: "AFC", type: "international", participants: 24 }
];

export const WORLD_COMPETITIONS: WorldCompetitionSeed[] = [
  ...divisions.map(d => ({
    id: "league-" + d.id, name: d.name, countryCode: d.countryCode,
    type: d.kind === "amateur" ? "amateur" as const : "league" as const,
    divisionId: d.id, participants: d.clubs.length
  })),
  ...cupCompetitions
];

export const NATIONAL_TEAMS: Array<{ id: string; name: string; confederation: string; strength: number }> = [
  ["br","Brasil","CONMEBOL",94],["ar","Argentina","CONMEBOL",93],["uy","Uruguai","CONMEBOL",86],["co","Colômbia","CONMEBOL",85],
  ["cl","Chile","CONMEBOL",79],["ec","Equador","CONMEBOL",82],["py","Paraguai","CONMEBOL",78],["pe","Peru","CONMEBOL",77],
  ["gb","Inglaterra","UEFA",91],["fr","França","UEFA",93],["es","Espanha","UEFA",92],["de","Alemanha","UEFA",90],
  ["it","Itália","UEFA",87],["pt","Portugal","UEFA",89],["nl","Países Baixos","UEFA",88],["be","Bélgica","UEFA",85],
  ["hr","Croácia","UEFA",84],["ch","Suíça","UEFA",82],["dk","Dinamarca","UEFA",82],["no","Noruega","UEFA",81],
  ["us","Estados Unidos","CONCACAF",82],["mx","México","CONCACAF",83],["ca","Canadá","CONCACAF",78],["cr","Costa Rica","CONCACAF",74],
  ["jp","Japão","AFC",82],["kr","Coreia do Sul","AFC",80],["au","Austrália","AFC",79],["ir","Irã","AFC",78],
  ["ma","Marrocos","CAF",86],["sn","Senegal","CAF",84],["ng","Nigéria","CAF",82],["eg","Egito","CAF",81],
  ["za","África do Sul","CAF",75],["gh","Gana","CAF",78],["cm","Camarões","CAF",78],["ci","Costa do Marfim","CAF",80],
  ["nz","Nova Zelândia","OFC",70],["sa","Arábia Saudita","AFC",76],["qa","Catar","AFC",73],["tr","Turquia","UEFA",83],
  ["ua","Ucrânia","UEFA",82],["pl","Polônia","UEFA",81],["se","Suécia","UEFA",80],["at","Áustria","UEFA",80],
  ["rs","Sérvia","UEFA",82],["ro","Romênia","UEFA",76],["gr","Grécia","UEFA",75],["jm","Jamaica","CONCACAF",72]
].map(([id,name,confederation,strength]) => ({ id: String(id), name: String(name), confederation: String(confederation), strength: Number(strength) }));

const worldClubById = new Map(WORLD_CLUBS.map(club => [club.id, club] as const));
const worldDivisionById = new Map(WORLD_DIVISIONS.map(division => [division.id, division] as const));

export function getWorldClub(id: string): WorldClubSeed | undefined {
  return worldClubById.get(id);
}

export function getDivision(id: string): WorldDivision | undefined {
  return worldDivisionById.get(id);
}

export function getDivisionClubs(id: string): WorldClubSeed[] {
  const division = getDivision(id);
  if (!division) return [];
  return division.clubs.map(clubId => getWorldClub(clubId)).filter((club): club is WorldClubSeed => Boolean(club));
}

export function getAdjacentDivision(id: string, direction: "up" | "down"): string | undefined {
  const division = getDivision(id);
  if (!division) return undefined;
  return direction === "up" ? division.promotionTarget : division.relegationTarget;
}

export function countryDivisionCount(countryCode: string): number {
  return WORLD_DIVISIONS.filter(division => division.countryCode === countryCode).length;
}

export const MANAGER_PRESETS = [
  { id: "custom", name: "Criar meu treinador", reputation: 25, experience: "Iniciante", style: "Personalizado" },
  { id: "pep-guardiola", name: "Pep Guardiola", reputation: 98, experience: "Elite mundial", style: "Posse e pressão" },
  { id: "carlo-ancelotti", name: "Carlo Ancelotti", reputation: 97, experience: "Elite mundial", style: "Gestão de estrelas" },
  { id: "jose-mourinho", name: "José Mourinho", reputation: 95, experience: "Elite mundial", style: "Estratégia competitiva" },
  { id: "abel-ferreira", name: "Abel Ferreira", reputation: 90, experience: "Elite nacional", style: "Intensidade e organização" },
  { id: "dorival-junior", name: "Dorival Júnior", reputation: 84, experience: "Clubes e seleção", style: "Equilíbrio" },
  { id: "manager-elite", name: "Treinador de elite", reputation: 90, experience: "Títulos continentais", style: "Tático" },
  { id: "manager-national", name: "Técnico internacional", reputation: 82, experience: "Seleções e grandes clubes", style: "Equilibrado" },
  { id: "manager-rising", name: "Jovem treinador promissor", reputation: 55, experience: "Projeto em ascensão", style: "Desenvolvimento" },
  { id: "manager-lower", name: "Treinador de divisões inferiores", reputation: 24, experience: "Várzea e Série D", style: "Competitivo" },
  { id: "manager-varzea", name: "Treinador de várzea", reputation: 12, experience: "Futebol amador", style: "Raça e comunidade" },
  { id: "former-player", name: "Ex-jogador aposentado", reputation: 42, experience: "Carreira dentro de campo", style: "Liderança" },
  { id: "retired-rafael-monteiro", name: "Rafael Monteiro", reputation: 64, experience: "Ex-jogador aposentado · ídolo nacional", style: "Liderança" },
  { id: "retired-davi-ventura", name: "Davi Ventura", reputation: 57, experience: "Ex-jogador aposentado · ídolo regional", style: "Desenvolvimento" },
  { id: "retired-leandro-farias", name: "Leandro Farias", reputation: 49, experience: "Ex-jogador aposentado · carreira de clube", style: "Competitivo" }
] as const;

export const SPONSOR_CATALOG = [
  { id: "norte-bank", brand: "Norte Banco", sector: "Finanças", tier: 5, base: 4800000 },
  { id: "orbit-mobile", brand: "Órbita Mobile", sector: "Tecnologia", tier: 5, base: 4200000 },
  { id: "viva-energy", brand: "Viva Energia", sector: "Energia", tier: 4, base: 2400000 },
  { id: "campo-forte", brand: "Campo Forte", sector: "Material esportivo", tier: 4, base: 1900000 },
  { id: "brasa-foods", brand: "Brasa Foods", sector: "Alimentos", tier: 3, base: 850000 },
  { id: "rota-log", brand: "Rota Log", sector: "Logística", tier: 3, base: 720000 },
  { id: "playbet-fic", brand: "Play Arena", sector: "Entretenimento", tier: 3, base: 950000 },
  { id: "sul-market", brand: "Sul Market", sector: "Varejo regional", tier: 2, base: 410000 },
  { id: "pixel-lab", brand: "Pixel Lab", sector: "Startup de tecnologia", tier: 1, base: 120000 },
  { id: "raiz-cafe", brand: "Raiz Café", sector: "Pequeno negócio local", tier: 1, base: 65000 },
  { id: "garagem-10", brand: "Garagem 10", sector: "Mobilidade", tier: 1, base: 90000 },
  { id: "clinica-viva", brand: "Clínica Viva", sector: "Saúde e bem-estar", tier: 2, base: 260000 }
] as const;

export const PROJECT_TEMPLATES = [
  "Evitar o rebaixamento e reorganizar as contas",
  "Conquistar o acesso em até duas temporadas",
  "Revelar três jogadores da base",
  "Voltar à primeira divisão após anos de queda",
  "Superar o rival regional e conquistar a torcida",
  "Reduzir a folha salarial sem perder competitividade",
  "Montar um elenco jovem e negociar talentos",
  "Chegar à final da copa nacional",
  "Construir uma equipe dominante em casa",
  "Profissionalizar um clube de origem amadora"
] as const;
