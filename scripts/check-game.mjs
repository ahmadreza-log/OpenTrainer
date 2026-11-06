// Checks effects.json against a local V Rising install, including each default value.
// Usage: npm run check:game -- "D:\Games\Steam\steamapps\common\VRising"
import { readFileSync } from "node:fs";
import { join } from "node:path";

const gameDir = process.argv[2];
if (!gameDir) {
  console.error("Usage: npm run check:game -- <V Rising folder>");
  process.exit(2);
}

const settingsDir = join(
  gameDir,
  "VRising_Data",
  "StreamingAssets",
  "Settings",
);
const readJson = (path) =>
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
const settings = readJson(join(settingsDir, "ServerGameSettings.json"));
const { effects } = readJson(
  new URL("../src-tauri/resources/vrising-effects.json", import.meta.url),
);

let failures = 0;
for (const effect of effects) {
  const actual = effect.path
    .split(".")
    .reduce((node, key) => node?.[key], settings);
  if (actual === undefined) {
    console.error(`Missing from game: ${effect.path}`);
    failures++;
  } else if (actual !== effect.default) {
    console.error(
      `${effect.path}: game default is ${actual}, not ${effect.default}`,
    );
    failures++;
  }
}

if (failures > 0) process.exit(1);
console.log(`All ${effects.length} effects match the game's default settings.`);
