import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve("dist");
const removedPaths = [
  resolve(dist, "open-source-games"),
  resolve(dist, "j90-open-source-launcher.js"),
  resolve(dist, "openfootlogo.svg"),
  resolve(dist, "openfootball.svg"),
];

for (const path of removedPaths) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
    console.log(`Removed third-party match bundle from Android staging: ${path}`);
  }
}

console.log("MAIA_ORIGINAL_2D_VIEW=ENABLED_IN_MAIN_APP");
console.log("THIRD_PARTY_MATCH_ENGINE_IN_ANDROID_BUNDLE=NO");
