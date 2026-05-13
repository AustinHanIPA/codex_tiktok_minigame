import { describe, expect, it } from "vitest";
import { createDefaultSave, getStarsForTime, mergeSaveData } from "./scoring";

describe("scoring", () => {
  it("maps elapsed time to stars", () => {
    const starTimes = { three: 10, two: 20, one: 30 };

    expect(getStarsForTime(9.9, starTimes)).toBe(3);
    expect(getStarsForTime(18, starTimes)).toBe(2);
    expect(getStarsForTime(28, starTimes)).toBe(1);
    expect(getStarsForTime(31, starTimes)).toBe(0);
  });

  it("creates and merges save data for all levels", () => {
    const defaults = createDefaultSave(10);
    const merged = mergeSaveData(
      {
        unlockedLevel: 99,
        levels: {
          2: { completed: true, bestTime: 12.4, stars: 3 }
        }
      },
      10
    );

    expect(Object.keys(defaults.levels)).toHaveLength(10);
    expect(merged.unlockedLevel).toBe(10);
    expect(merged.levels[2].bestTime).toBe(12.4);
    expect(merged.levels[1].completed).toBe(false);
  });
});
