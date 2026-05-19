import { describe, expect, it } from "vitest";
import { createDefaultSave, getDefeatedPercent, getStarsForSteps, mergeSaveData } from "./scoring";

describe("scoring", () => {
  it("maps used steps to stars", () => {
    const starSteps = { three: 3, two: 6, one: 9 };

    expect(getStarsForSteps(3, starSteps)).toBe(3);
    expect(getStarsForSteps(5, starSteps)).toBe(2);
    expect(getStarsForSteps(8, starSteps)).toBe(1);
    expect(getStarsForSteps(10, starSteps)).toBe(0);
  });

  it("creates and merges save data for all levels", () => {
    const defaults = createDefaultSave(10);
    const merged = mergeSaveData(
      {
        unlockedLevel: 99,
        levels: {
          2: { completed: true, bestSteps: 4, stars: 3 }
        }
      },
      10
    );

    expect(Object.keys(defaults.levels)).toHaveLength(10);
    expect(defaults.endless.bestScore).toBe(0);
    expect(merged.unlockedLevel).toBe(10);
    expect(merged.levels[2].bestSteps).toBe(4);
    expect(merged.levels[1].completed).toBe(false);
    expect(merged.endless.gamesPlayed).toBe(0);
  });

  describe("getStarsForSteps boundary cases", () => {
    const starSteps = { three: 5, two: 10, one: 15 };

    it("returns 3 stars at exact three-star boundary", () => {
      expect(getStarsForSteps(5, starSteps)).toBe(3);
    });

    it("returns 2 stars at one step over three-star boundary", () => {
      expect(getStarsForSteps(6, starSteps)).toBe(2);
    });

    it("returns 2 stars at exact two-star boundary", () => {
      expect(getStarsForSteps(10, starSteps)).toBe(2);
    });

    it("returns 1 star at exact one-star boundary", () => {
      expect(getStarsForSteps(15, starSteps)).toBe(1);
    });

    it("returns 0 stars above one-star boundary", () => {
      expect(getStarsForSteps(16, starSteps)).toBe(0);
    });

    it("returns 3 stars for 1 step (minimum possible)", () => {
      expect(getStarsForSteps(1, starSteps)).toBe(3);
    });
  });

  describe("getDefeatedPercent boundary cases", () => {
    it("never returns more than 99", () => {
      // 3 stars, 1 step → formula gives 56 + 36 + 22 = 114, capped at 99
      expect(getDefeatedPercent(3, 1)).toBe(99);
    });

    it("never returns less than 52", () => {
      // 0 stars, 100 steps → formula gives 56 + 0 + 0 = 56, min 52 still holds
      expect(getDefeatedPercent(0, 100)).toBeGreaterThanOrEqual(52);
    });

    it("returns higher percent for more stars", () => {
      const p1 = getDefeatedPercent(1, 5);
      const p2 = getDefeatedPercent(2, 5);
      const p3 = getDefeatedPercent(3, 5);
      expect(p3).toBeGreaterThan(p2);
      expect(p2).toBeGreaterThan(p1);
    });

    it("returns higher percent for fewer steps with same stars", () => {
      const fewSteps = getDefeatedPercent(2, 3);
      const manySteps = getDefeatedPercent(2, 20);
      expect(fewSteps).toBeGreaterThanOrEqual(manySteps);
    });
  });
});
