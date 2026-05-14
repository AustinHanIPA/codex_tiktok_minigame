import { describe, expect, it } from "vitest";
import { LEVELS } from ".";
import { GRID_COLS, GRID_ROWS } from "../utils/constants";
import { getHardDropY, getMaxValue, isValidGrid, lockBlock, resolveGrid } from "../logic/gridLogic";

describe("Drop & Merge levels", () => {
  it("ships ten challenge levels with valid 5x8 grids", () => {
    expect(LEVELS).toHaveLength(10);

    for (const level of LEVELS) {
      expect(isValidGrid(level.initialGrid)).toBe(true);
      expect(level.nextBlocks.length).toBeGreaterThan(0);
      expect(level.starSteps.three).toBeLessThanOrEqual(level.starSteps.two);
      expect(level.starSteps.two).toBeLessThanOrEqual(level.starSteps.one);
      expect(level.initialGrid).toHaveLength(GRID_ROWS);
      expect(level.initialGrid[0]).toHaveLength(GRID_COLS);
    }
  });

  it("progresses toward higher targets", () => {
    expect(LEVELS[0].targetValue).toBe(64);
    expect(LEVELS.at(-1)?.targetValue).toBe(1024);
  });

  it("turns the first correct drop into a large domino combo", () => {
    for (const level of LEVELS) {
      const block = { x: Math.floor(GRID_COLS / 2), y: 0, value: level.nextBlocks[0] };
      const locked = lockBlock(level.initialGrid, { ...block, y: getHardDropY(level.initialGrid, block) });
      const resolved = resolveGrid(locked);

      expect(resolved.comboCount).toBeGreaterThanOrEqual(3);
      expect(getMaxValue(resolved.grid)).toBeGreaterThanOrEqual(level.targetValue);
    }
  });
});
