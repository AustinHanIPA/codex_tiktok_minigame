import { describe, expect, it } from "vitest";
import { applyGravity, findMergeGroups, lockBlock, resolveGrid } from "./gridLogic";
import { createEmptyGrid } from "./gridLogic";

describe("grid logic", () => {
  it("drops floating blocks to the bottom of each column", () => {
    const grid = createEmptyGrid();
    grid[1][2] = 4;
    grid[4][2] = 8;

    const result = applyGravity(grid);

    expect(result.changed).toBe(true);
    expect(result.grid[7][2]).toBe(8);
    expect(result.grid[6][2]).toBe(4);
  });

  it("finds adjacent merge groups", () => {
    const grid = createEmptyGrid();
    grid[7][0] = 2;
    grid[7][1] = 2;
    grid[6][1] = 2;

    const groups = findMergeGroups(grid);

    expect(groups).toHaveLength(1);
    expect(groups[0].cells).toHaveLength(3);
    expect(groups[0].anchor).toEqual({ x: 0, y: 7 });
  });

  it("locks a block and resolves combo chains", () => {
    const grid = createEmptyGrid();
    grid[7][0] = 4;
    grid[7][2] = 4;
    const locked = lockBlock(grid, { x: 1, y: 7, value: 4 });

    const result = resolveGrid(locked);

    expect(result.comboCount).toBeGreaterThan(0);
    expect(result.grid.flat()).toContain(8);
  });
});
