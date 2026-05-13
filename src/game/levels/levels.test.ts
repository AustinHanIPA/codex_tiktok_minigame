import { describe, expect, it } from "vitest";
import { LEVELS } from ".";

describe("MVP levels", () => {
  it("ships ten playable level configs", () => {
    expect(LEVELS).toHaveLength(10);

    for (const level of LEVELS) {
      expect(level.ballStart.x).toBeGreaterThan(0);
      expect(level.goal.radius).toBeGreaterThan(20);
      expect(level.timeLimit).toBeGreaterThanOrEqual(level.starTimes.one);
      expect(level.staticBodies.length).toBeGreaterThan(0);
    }
  });

  it("covers the five required mechanism types", () => {
    const mechanismTypes = new Set(LEVELS.flatMap((level) => level.mechanisms.map((mechanism) => mechanism.type)));

    expect(mechanismTypes).toEqual(new Set(["button", "conveyor", "rotator", "slider", "launcher"]));
  });
});
