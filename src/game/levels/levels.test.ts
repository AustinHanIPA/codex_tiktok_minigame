import { describe, expect, it } from "vitest";
import { getLevel, LEVELS } from ".";
import { ensureBonusBlocks, getRollPool, rollExtraBlockValue } from "../logic/blockQueue";
import { GRID_COLS, GRID_ROWS } from "../utils/constants";
import { cloneGrid, getHardDropY, getMaxValue, isValidGrid, lockBlock, resolveGrid } from "../logic/gridLogic";
import type { ActiveBlock } from "../utils/types";

/** 模拟将方块放在指定列并硬落 */
function simulateDrop(grid: number[][], col: number, value: number): { grid: number[][]; comboCount: number } {
  const block: ActiveBlock = { x: col, y: 0, value };
  const dropY = getHardDropY(grid, block);
  const locked = lockBlock(grid, { ...block, y: dropY });
  return resolveGrid(locked);
}

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

describe("Bonus block queue replenishment", () => {
  it("levels with starSteps.one > nextBlocks.length never run out of blocks (uses production logic)", () => {
    // 使用固定 seed 保证测试确定性
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (const level of LEVELS) {
      if (level.starSteps.one <= level.nextBlocks.length) {
        continue;
      }

      let grid = cloneGrid(level.initialGrid);
      let bonusBlocks: number[] = [];
      const baseLength = level.nextBlocks.length;

      for (let step = 0; step < level.starSteps.one; step += 1) {
        // 使用与 PlayScene 完全相同的纯函数补充队列
        const maxVal = getMaxValue(grid);
        const newBlocks = ensureBonusBlocks(
          baseLength + bonusBlocks.length,
          step,
          1,
          maxVal,
          seededRandom
        );
        bonusBlocks = [...bonusBlocks, ...newBlocks];

        const fullQueue = [...level.nextBlocks, ...bonusBlocks];
        const value = fullQueue[step];
        expect(value, `Level ${level.id} step ${step} should have a block value`).toBeDefined();

        const result = simulateDrop(grid, Math.floor(GRID_COLS / 2), value);
        grid = result.grid;
      }
    }
  });

  it("getRollPool returns correct pools for each threshold", () => {
    expect(getRollPool(2)).toEqual([2, 2, 2, 4, 4]);
    expect(getRollPool(16)).toEqual([2, 2, 2, 4, 4]);
    expect(getRollPool(32)).toEqual([2, 2, 4, 4, 8]);
    expect(getRollPool(64)).toEqual([2, 2, 4, 4, 8]);
    expect(getRollPool(128)).toEqual([2, 2, 4, 4, 8, 8, 16]);
    expect(getRollPool(512)).toEqual([2, 2, 4, 4, 8, 8, 16]);
  });

  it("ensureBonusBlocks generates exactly the needed count", () => {
    // 队列有 3 块，index 在 2，需要 3 前瞻 → 需要补 2 块
    const result = ensureBonusBlocks(3, 2, 3, 64);
    expect(result).toHaveLength(2);
    // 所有补充块都应在 pool [2,2,4,4,8] 的值域内
    for (const v of result) {
      expect([2, 4, 8]).toContain(v);
    }
  });

  it("rollExtraBlockValue clamps injected random values to a valid pool index", () => {
    expect(rollExtraBlockValue(128, () => -1)).toBe(2);
    expect(rollExtraBlockValue(128, () => 1)).toBe(16);
  });
});

describe("Levels 6-10 scripted solutions", () => {
  it("Level 6: drop 2 in center column achieves 512 in one step", () => {
    const level = getLevel(6);
    const result = simulateDrop(level.initialGrid, Math.floor(GRID_COLS / 2), level.nextBlocks[0]);

    expect(getMaxValue(result.grid)).toBeGreaterThanOrEqual(512);
    expect(result.comboCount).toBeGreaterThanOrEqual(3);
  });

  it("Level 7: drop 2 in center column achieves 1024 in one step", () => {
    const level = getLevel(7);
    const result = simulateDrop(level.initialGrid, Math.floor(GRID_COLS / 2), level.nextBlocks[0]);

    expect(getMaxValue(result.grid)).toBeGreaterThanOrEqual(1024);
    expect(result.comboCount).toBeGreaterThanOrEqual(4);
  });

  it("Level 8: achievable within 2 steps", () => {
    const level = getLevel(8);
    // 第一步: 中路落下
    const step1 = simulateDrop(level.initialGrid, Math.floor(GRID_COLS / 2), level.nextBlocks[0]);

    if (getMaxValue(step1.grid) >= 1024) {
      expect(getMaxValue(step1.grid)).toBeGreaterThanOrEqual(1024);
      return;
    }

    // 如果一步不够，第二步继续
    const step2 = simulateDrop(step1.grid, Math.floor(GRID_COLS / 2), level.nextBlocks[1]);
    expect(getMaxValue(step2.grid)).toBeGreaterThanOrEqual(1024);
  });

  it("Level 9: drop 2 in center column achieves 1024 in one step", () => {
    const level = getLevel(9);
    const result = simulateDrop(level.initialGrid, Math.floor(GRID_COLS / 2), level.nextBlocks[0]);

    expect(getMaxValue(result.grid)).toBeGreaterThanOrEqual(1024);
    expect(result.comboCount).toBeGreaterThanOrEqual(4);
  });

  it("Level 10: drop 2 in center column achieves 1024 in one step", () => {
    const level = getLevel(10);
    const result = simulateDrop(level.initialGrid, Math.floor(GRID_COLS / 2), level.nextBlocks[0]);

    expect(getMaxValue(result.grid)).toBeGreaterThanOrEqual(1024);
    expect(result.comboCount).toBeGreaterThanOrEqual(4);
  });

  it("all levels 6-10 are solvable within starSteps.three limit", () => {
    for (let id = 6; id <= 10; id += 1) {
      const level = getLevel(id);
      let grid = cloneGrid(level.initialGrid);
      let solved = false;

      for (let step = 0; step < level.starSteps.three; step += 1) {
        const value = level.nextBlocks[step];
        const result = simulateDrop(grid, Math.floor(GRID_COLS / 2), value);
        grid = result.grid;

        if (getMaxValue(grid) >= level.targetValue) {
          solved = true;
          break;
        }
      }

      expect(solved, `Level ${id} should be solvable in ${level.starSteps.three} step(s)`).toBe(true);
    }
  });
});
