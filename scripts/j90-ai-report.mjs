#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";

function arg(name, fallback=null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const promptFile = arg("--prompt-file");
const outputFile = arg("--output-file");
const preference = (process.env.J90_AI_PREFERENCE || "gemini,openrouter,groq,copilot")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

if (!promptFile || !outputFile) {
  console.error("Uso: j90-ai-report.mjs --prompt-file <arquivo> --output-file <arquivo>");
  process.exit(2);
}

const prompt = fs.readFileSync(promptFile, "utf8");
const maxOutputTokens = Number(process.env.J90_AI_MAX_OUTPUT_TOKENS || 12000);

function writeOutput(text) {
  const value = String(text || "").trim();
  if (!value) throw new Error("O provedor retornou resposta vazia.");
  fs.mkdirSync(new URL(".", `file://${process.cwd()}/${outputFile}`).pathname, { recursive: true });
  fs.writeFileSync(outputFile, value + "\n", "utf8");
}

function collectRepositoryContext() {
  let files = [];
  try {
    files = execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 })
      .split("\n").filter(Boolean);
  } catch {
    return "git ls-files indisponível; use somente o prompt recebido.";
  }
  const priority = [
    "package.json", "capacitor.config.ts", "index.html", "diag.html",
    /^src\//, /^scripts\//, /^android-overrides\//, /^data\//
  ];
  files.sort((a, b) => {
    const score = p => priority.reduce((n, rule, i) => n + (rule instanceof RegExp ? rule.test(p) : rule === p ? 100 : 0) * (priority.length - i), 0);
    return score(b) - score(a);
  });
  const chunks = [];
  let total = 0;
  const maxChars = Number(process.env.J90_AI_CONTEXT_CHARS || 500000);
  for (const file of files) {
    if (total >= maxChars) break;
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 150000) continue;
      const ext = file.split(".").pop()?.toLowerCase();
      if (!["js","mjs","cjs","ts","tsx","json","html","css","md","py","xml","gradle","properties","yaml","yml"].includes(ext) && file !== "package.json") continue;
      const text = fs.readFileSync(file, "utf8");
      const room = maxChars - total;
      const chunk = text.length <= room ? text : text.slice(0, room) + "\n[TRUNCADO]";
      chunks.push(`### ${file}\n${chunk}`);
      total += chunk.length;
    } catch {
      // Ignora binários, links quebrados e arquivos que mudarem durante a coleta.
    }
  }
  const status = `Contexto coletado: ${chunks.length} arquivos, ${total} caracteres.`;
  return status + "\n\n" + chunks.join("\n\n");
}

const repositoryContext = collectRepositoryContext();
function collectTeamContext() {
  try {
    if (!fs.existsSync(".j90-team")) return "";
    return fs.readdirSync(".j90-team").filter(name => /\\.(md|txt|log)$/i.test(name)).map(name => {
      try { return `### .j90-team/${name}\\n${fs.readFileSync(`.j90-team/${name}`, "utf8").slice(0, 120000)}`; }
      catch { return ""; }
    }).filter(Boolean).join("\\n\\n");
  } catch { return ""; }
}
const teamContext = collectTeamContext();
const fullPrompt = prompt + "\n\n=== SNAPSHOT DO REPOSITÓRIO ===\n" + repositoryContext + "\n\n=== CONTEXTO PERSISTIDO DA EQUIPE ===\n" + teamContext;

async function gemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY ausente.");
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    systemInstruction: {
      parts: [{ text: "Você é um engenheiro sênior. Responda somente com o relatório solicitado, baseado em evidências do repositório. Não invente defeitos." }]
    },
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: { maxOutputTokens }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini não retornou conteúdo.");
  return text;
}

async function anthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY ausente.");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      system: "Você é um engenheiro sênior. Gere somente o relatório solicitado, baseado em evidências. Não invente defeitos.",
      messages: [{ role: "user", content: fullPrompt }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json?.content?.filter(p => p.type === "text").map(p => p.text).join("\n").trim();
  if (!text) throw new Error("Anthropic não retornou conteúdo.");
  return text;
}

async function openrouter() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY ausente.");
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${key}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://github.com/vluiz6102-blip/https-github.com-seuusuario-criar-apks",
      "X-Title": "Jornada 90 Manager"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Você é um engenheiro sênior. Gere somente o relatório solicitado, baseado em evidências. Não invente defeitos." },
        { role: "user", content: fullPrompt }
      ],
      max_tokens: maxOutputTokens
    })
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter não retornou conteúdo.");
  return text;
}

async function groq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY ausente.");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Você é um engenheiro sênior. Gere somente o relatório solicitado, baseado em evidências. Não invente defeitos." },
        { role: "user", content: prompt }
      ],
      max_tokens: maxOutputTokens
    })
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq não retornou conteúdo.");
  return text;
}

function copilot() {
  const token = process.env.COPILOT_GITHUB_TOKEN;
  if (!token) throw new Error("COPILOT_GITHUB_TOKEN ausente.");
  const text = execFileSync("copilot", ["-p", prompt, "--no-banner"], {
    env: { ...process.env, GITHUB_TOKEN: token, COPILOT_GITHUB_TOKEN: token },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });
  if (!text.trim()) throw new Error("Copilot não retornou conteúdo.");
  return text;
}

const providers = { gemini, anthropic, openrouter, groq, copilot };
const errors = [];

for (const provider of preference) {
  if (!providers[provider]) continue;
  try {
    const result = await providers[provider]();
    writeOutput(result);
    fs.writeFileSync(
      process.env.J90_AI_PROVIDER_STATUS || ".j90-team/ai-provider-used.txt",
      provider + "\n",
      "utf8"
    );
    console.log(`J90_AI_PROVIDER=${provider}`);
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`${provider}: ${message}`);
    console.warn(`Provider ${provider} falhou: ${message}`);
  }
}

console.error("Nenhum provedor de IA disponível.");
for (const e of errors) console.error(e);
process.exit(1);
