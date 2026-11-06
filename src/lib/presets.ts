import catalog from "../../src-tauri/resources/vrising-effects.json";

export type Values = Record<string, number>;
export type Effect = (typeof catalog.effects)[number];

export const { effects, groups, testedGameVersion } = catalog;
export const profiles = catalog.profiles as {
  id: string;
  label: string;
  values: Values;
}[];

// Mirrors valid_name in src-tauri/src/presets.rs, which is the check that counts.
const NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,47}$/;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function isValidName(name: string) {
  return NAME.test(name) && !name.endsWith(" ") && !RESERVED.test(name);
}

export function defaultValues(): Values {
  return Object.fromEntries(effects.map((e) => [e.id, e.default]));
}

export function changedEffects(values: Values) {
  return effects.filter((e) => values[e.id] !== e.default);
}

/** Preview only. The Rust backend rebuilds and validates the file it writes. */
export function buildPreset(values: Values) {
  const preset: Record<string, unknown> = { GameModeType: "PvE" };
  for (const id of Object.keys(values)) {
    if (!effects.some((e) => e.id === id)) {
      throw new Error(`Unknown effect: ${id}`);
    }
  }
  for (const effect of effects) {
    const value = values[effect.id] ?? effect.default;
    if (!(value >= effect.min && value <= effect.max)) {
      throw new Error(`${effect.label} is out of range`);
    }
    if (value === effect.default) continue;

    const keys = effect.path.split(".");
    const leaf = keys.pop()!;
    let target = preset;
    for (const key of keys) {
      target = (target[key] ??= {}) as Record<string, unknown>;
    }
    target[leaf] = value;
  }
  return preset;
}
