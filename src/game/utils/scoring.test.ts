import { describe, expect, it } from "vitest";
import { createDefaultSave, getStarsForSteps, mergeSaveData } from "./scoring";

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
});
