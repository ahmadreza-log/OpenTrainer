import { describe, expect, it } from "vitest";
import {
  formatBytes,
  gameArt,
  initials,
  latestActive,
  matchesSearch,
} from "./format";

describe("formatBytes", () => {
  it("uses readable units", () => {
    expect(formatBytes(23040)).toBe("23 KB");
    expect(formatBytes(51681149)).toBe("49.3 MB");
  });
});

describe("gameArt", () => {
  it("is stable per game and differs between games", () => {
    expect(gameArt("god-hand")).toBe(gameArt("god-hand"));
    expect(gameArt("god-hand")).not.toBe(gameArt("other-game"));
  });
});

describe("initials", () => {
  it("uses capitalized words only", () => {
    expect(initials("God Hand")).toBe("GH");
    expect(initials("Heroes of Might and Magic: Olden Era")).toBe("HMM");
  });
});

describe("matchesSearch", () => {
  it("ignores case and spacing, and an empty search matches all", () => {
    expect(matchesSearch(" GOD ", "God Hand")).toBe(true);
    expect(matchesSearch("", "anything")).toBe(true);
    expect(matchesSearch("zelda", "God Hand", "Author")).toBe(false);
  });
});

describe("latestActive", () => {
  it("skips deprecated and revoked releases and picks the newest", () => {
    const releases = [
      { version: "1", status: "active", publishedAt: "2026-01-01" },
      { version: "3", status: "revoked", publishedAt: "2026-03-01" },
      { version: "2", status: "active", publishedAt: "2026-02-01" },
    ];
    expect(latestActive(releases)?.version).toBe("2");
    expect(latestActive([releases[1]])).toBeUndefined();
  });
});
