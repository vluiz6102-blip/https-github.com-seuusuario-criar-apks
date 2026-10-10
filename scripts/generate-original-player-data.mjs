import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const firstNames = ["Thiago","Matias","Enzo","Luca","Dario","Gael","Rafael","Caio","Bruno","Marco","Tomas","Nico","Felipe","Leandro","Mateo","Joao","Lucas","Pedro","Gabriel","Daniel","Samuel","Benicio","Iker","Sergio","Pablo","Hugo","Martin","Diego","Alejandro","Gonzalo","Xavier","Adrien","Theo","Remy","Julien","Antoine","Maxime","Nolan","Bastien","Leon","Felix","Jonas","Noah","Emil","Milan","Timo","Lars","Jasper","Bram","Daan","Ruben","Afonso","Nuno","Diogo","Andreas","Stefan","Lorenzo","Matteo","Elia","Fabio","Sandro","Davide","Dylan","Jules","Cian","Kieran","Owen","Rhys","Callum","Jamie","Lewis","Ethan","Aiden","Malik","Idris","Amir","Youssef","Samir","Karim","Nabil","Boubacar","Sekou","Ibrahim","Kwame","Kofi","Tawanda","Neo","Sipho","Teboho","Tariq","Alexis","Joaquin","Federico","Breno","Otavio","Heitor","Murilo","Vinicius","Yann","Arno","Sven","Mika","Jovan","Filip","Roko","Viktor","Marek"]; 
const lastNames = ["Alvarenga","Bastos","Cardoso","Dominguez","Estevez","Farias","Gouveia","Hernandez","Ibarra","Jimenez","Kovalenko","Ledesma","Mendez","Navarro","Oliveira","Pereira","Quintana","Ribeiro","Salazar","Teixeira","Urbina","Valente","Werner","Ximenes","Yilmaz","Zamora","Acosta","Barreto","Cabrera","Duarte","Escobar","Ferreira","Galindo","Herrera","Iglesias","Jurado","Keller","Lombardi","Moreira","Nogueira","Ortega","Pacheco","Quezada","Rojas","Santana","Tavares","Ulloa","Varela","Wolff","Xavier","Yanez","Zuniga","Andrade","Beltran","Castillo","Diniz","Espinoza","Fontes","Garrido","Hidalgo","Islas","Jara","Krause","Lara","Montoya","Neri","Ocampo","Prado","Quiroz","Reyes","Siqueira","Toledo","Urbano","Vidal","Weber","Ybarra","Zarate","Aranda","Borges","Coutinho","Delgado","Echeverria","Freitas","Gimenez","Lins","Molina","Neves","Olmedo","Paiva","Roldan","Sequeira","Torrado","Valdes","Wilke","Yamada","Zelaya","Amaral","Bittencourt","Caceres","Dalmau","Esteves","Falcao","Godoy","Loureiro","Marques","Nakamura","Paz","Ramalho","Saldana","Trindade"];

const packs = [
  { root: "docs/modding/examples/maia-club-world-2026", prefix: "msm-club-player-", globalOffset: 0, fixedClubSquads: true },
  { root: "docs/modding/examples/maia-world-cup-2026", prefix: "msm-national-player-", globalOffset: 3344, fixedClubSquads: false },
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalize = (value) => value.normalize("NFKD").replace(/\\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function attributes(globalIndex, teamIndex, slot, team) {
  const age = 17 + ((globalIndex * 5 + teamIndex * 3 + slot * 7) % 18);
  const averageReputation = (team.reputationRange[0] + team.reputationRange[1]) / 2;
  const base = clamp(57 + Math.round(((averageReputation - 500) / 500) * 25), 56, 82);
  const variance = ((slot * 7 + teamIndex * 3) % 11) - 5;
  const overall = clamp(base + variance, 52, 88);
  const boost = age <= 20 ? 8 + ((globalIndex + slot) % 8)
    : age <= 24 ? 4 + ((globalIndex + slot) % 7)
    : age <= 28 ? 2 + ((globalIndex + slot) % 5)
    : ((globalIndex + slot) % 3);
  const potential = clamp(overall + boost, overall, 95);
  const ageFactor = age <= 21 ? 1.35 : age <= 25 ? 1.12 : age <= 30 ? 0.82 : 0.58;
  const value = Math.round(Math.pow(overall - 35, 2) * 8500 * (0.8 + (potential - overall) / 35) * ageFactor);
  return { age, overall, potential, value };
}

for (const config of packs) {
  const teamsData = JSON.parse(await readFile(join(config.root, "teams/teams.json"), "utf8"));
  const playerData = JSON.parse(await readFile(join(config.root, "players/players.json"), "utf8"));
  const teams = new Map(teamsData.items.map((team, index) => [team.id, { ...team, index }]));
  const counts = new Map();
  for (const player of playerData.items) counts.set(player.club, (counts.get(player.club) || 0) + 1);
  const slots = new Map();
  const output = playerData.items.map((oldPlayer, index) => {
    const team = teams.get(oldPlayer.club);
    if (!team) throw new Error(`Unknown team reference: ${oldPlayer.club}`);
    const slot = slots.get(oldPlayer.club) || 0;
    slots.set(oldPlayer.club, slot + 1);
    if (config.fixedClubSquads && slot >= 22) throw new Error(`Unexpected squad size for ${oldPlayer.club}`);
    const globalIndex = config.globalOffset + index;
    const firstName = firstNames[globalIndex % firstNames.length];
    const lastName = lastNames[Math.floor(globalIndex / firstNames.length) % lastNames.length];
    const data = attributes(globalIndex, team.index, slot, team);
    let position;
    if (config.fixedClubSquads) {
      position = slot < 3 ? "Goalkeeper" : slot < 10 ? "Defender" : slot < 17 ? "Midfielder" : "Forward";
    } else {
      const total = counts.get(oldPlayer.club);
      const goalkeepers = Math.max(2, Math.round(total * 0.105));
      const defenders = Math.round(total * 0.32);
      const midfielders = Math.round(total * 0.32);
      position = slot < goalkeepers ? "Goalkeeper"
        : slot < goalkeepers + defenders ? "Defender"
        : slot < goalkeepers + defenders + midfielders ? "Midfielder"
        : "Forward";
    }
    return {
      id: config.prefix + String(index + 1).padStart(config.fixedClubSquads ? 5 : 4, "0"),
      name: firstName + " " + lastName,
      firstName,
      lastName,
      club: oldPlayer.club,
      nationality: team.country,
      position,
      ...data,
    };
  });
  if (new Set(output.map((player) => normalize(player.name))).size !== output.length) {
    throw new Error(`Fictional names collide in ${config.root}`);
  }
  playerData.items = output;
  await writeFile(join(config.root, "players/players.json"), JSON.stringify(playerData, null, 2) + "\n", "utf8");
  console.log(`${config.root}: generated ${output.length} original fictional players.`);
}
