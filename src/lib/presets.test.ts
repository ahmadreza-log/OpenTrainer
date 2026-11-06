import { describe, expect, it } from "vitest";
import sample from "../../src-tauri/resources/vrising-sample-preset.json";
import {
  buildPreset,
  changedEffects,
  defaultValues,
  effects,
  isValidName,
  profiles,
} from "./presets";

describe("buildPreset", () => {
  it("matches the sample shared with the Rust backend", () => {
    expect(buildPreset(sample.values)).toEqual(sample.expected);
  });

  it("always forces PvE, even with no changes", () => {
    expect(buildPreset(defaultValues())).toEqual({ GameModeType: "PvE" });
  });

  it.each([
    ["too high", { "max-health": 99 }],
    ["too low", { "damage-received": 0 }],
    ["not a number", { "max-health": Number.NaN }],
    ["unknown", { "castle-damage": 1 }],
  ])("rejects a value that is %s", (_, values) => {
    expect(() => buildPreset(values)).toThrow();
  });
});

describe("effects", () => {
  it("keeps every default inside its range and on the slider grid", () => {
    for (const e of effects) {
      expect(e.default).toBeGreaterThanOrEqual(e.min);
      expect(e.default).toBeLessThanOrEqual(e.max);
      const steps = (e.default - e.min) / e.step;
      expect(steps).toBeCloseTo(Math.round(steps));
    }
  });

  it("has unique IDs and paths", () => {
    expect(new Set(effects.map((e) => e.id)).size).toBe(effects.length);
    expect(new Set(effects.map((e) => e.path)).size).toBe(effects.length);
  });

  it("has only valid profiles", () => {
    for (const profile of profiles) {
      expect(() => buildPreset(profile.values)).not.toThrow();
    }
  });
});

describe("changedEffects", () => {
  it("lists only values that differ from the default", () => {
    const values = { ...defaultValues(), "sun-damage": 0.5 };
    expect(changedEffects(values).map((e) => e.id)).toEqual(["sun-damage"]);
  });
});

describe("isValidName", () => {
  it.each(["Relaxed", "My Preset 2", "test_build-1"])("accepts %s", (name) => {
    expect(isValidName(name)).toBe(true);
  });

  it.each([
    "",
    " leading",
    "trailing ",
    "../evil",
    "a\\b",
    "a/b",
    "con",
    "LPT1",
    "name.json",
    "x".repeat(49),
  ])("rejects %j", (name) => {
    expect(isValidName(name)).toBe(false);
  });
});
