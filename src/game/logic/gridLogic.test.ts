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

  it("resolveGrid terminates within loop guard limit on already-stable grid", () => {
    const grid = createEmptyGrid();
    // All blocks at bottom, no adjacent same values → no gravity, no merge
    grid[7][0] = 2;
    grid[7][1] = 4;
    grid[7][2] = 8;

    const result = resolveGrid(grid);

    expect(result.comboCount).toBe(0);
    expect(result.steps).toHaveLength(0);
  });

  it("resolveGrid handles large combo chains without infinite loop", () => {
    // Set up a cascading scenario: merge produces value that merges again
    const grid = createEmptyGrid();
    // col 0: [2, 2] → merge to 4, then 4 should merge with another 4
    grid[7][0] = 2;
    grid[6][0] = 2;
    grid[5][0] = 4; // After 2+2=4, this 4 will merge with the new 4

    const result = resolveGrid(grid);

    // Should have at least 2 merges in the chain
    expect(result.comboCount).toBeGreaterThanOrEqual(2);
    // Final grid should contain 8
    expect(result.grid.flat()).toContain(8);
    // Loop guard: steps should never exceed 20 iterations
    expect(result.steps.length).toBeLessThanOrEqual(40); // at most 20 gravity + 20 merge
  });

  it("resolveGrid returns empty steps on empty grid", () => {
    const grid = createEmptyGrid();
    const result = resolveGrid(grid);

    expect(result.comboCount).toBe(0);
    expect(result.steps).toHaveLength(0);
    expect(result.grid).toEqual(grid);
  });
});
