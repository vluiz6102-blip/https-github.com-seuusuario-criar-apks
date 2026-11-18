import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const forbiddenPaths = [
  "src/audio.ts",
  "src/engine.ts",
  "src/newsroom.ts",
  "src/persistence.ts",
  "src/real-rosters-2026.json",
  "src/world-data.ts",
  "src/world-simulation.ts",
  "docs/PULSO90_WORLD_EXPANSION.md",
  "public/jornada90.svg",
  "public/pulso90.svg",
  "public/pulso90-foreground.svg",
  "public/music"
];

const forbiddenText = [
  /Pulso\s*90/i,
  /jornada90/i,
  /com\.victorluiz\.jornada90/i,
  /admin/i
];

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

for (const path of forbiddenPaths) {
  try {
    await stat(path);
    throw new Error("Arquivo/pasta legado ainda existe: " + path);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const candidates = [
  ...(await walk("src")),
  ...(await walk("public")),
  "index.html",
  "capacitor.config.ts",
  "package.json"
];

for (const file of candidates) {
  const content = await readFile(file, "utf8");
  for (const pattern of forbiddenText) {
    if (pattern.test(content)) {
      throw new Error("Referência antiga encontrada em " + file + ": " + pattern);
    }
  }
}

console.log("Limpeza validada: nenhum arquivo ou identificador do jogo foi encontrado.");
