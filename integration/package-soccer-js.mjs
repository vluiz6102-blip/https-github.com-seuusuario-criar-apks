import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "public/open-source-games/soccer-js");
const dist = resolve(root, "dist");
const temp = join(process.env.RUNNER_TEMP || tmpdir(), "j90-soccer-js-build-source");
const distIndex = resolve(dist, "index.html");
const launcherSource = resolve(root, "integration/j90-open-source-launcher.js");
const launcherOutput = resolve(dist, "j90-open-source-launcher.js");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

if (!existsSync(resolve(source, "package.json")) || !existsSync(resolve(source, "html/index.html"))) {
  throw new Error("The preserved soccer-js source tree is missing required files.");
}
if (!existsSync(distIndex)) throw new Error("Build the main manager first; dist/index.html is missing.");

rmSync(temp, { recursive: true, force: true });
cpSync(source, temp, {
  recursive: true,
  filter: (src) => !src.split(sep).some((part) => part === ".git" || part === "node_modules" || part === "build"),
});

run("npm", ["install", "--no-package-lock", "--no-audit", "--no-fund"], temp);
run("npm", ["run", "build"], temp);

const matchBuild = resolve(temp, "build");
const distMatchBuild = resolve(dist, "open-source-games/soccer-js/build");
if (!existsSync(resolve(matchBuild, "app.bundle.js")) || !existsSync(resolve(matchBuild, "app.css"))) {
  throw new Error("soccer-js build did not produce its required JavaScript and CSS bundles.");
}
mkdirSync(dirname(distMatchBuild), { recursive: true });
rmSync(distMatchBuild, { recursive: true, force: true });
cpSync(matchBuild, distMatchBuild, { recursive: true });
cpSync(launcherSource, launcherOutput);

const scriptTag = '<script src="./j90-open-source-launcher.js" defer></script>';
let html = readFileSync(distIndex, "utf8");
if (!html.includes(scriptTag)) {
  if (!/<\/body>/i.test(html)) throw new Error("Built manager HTML has no </body> insertion point.");
  html = html.replace(/<\/body>/i, scriptTag + "\n</body>");
  writeFileSync(distIndex, html, "utf8");
}

console.log("SECONDARY_MATCH_ENGINE=PACKAGED");
console.log("SECONDARY_MATCH_ENGINE_MODE=SEPARATE_IFRAME_WITH_UNMODIFIED_SOURCE");
