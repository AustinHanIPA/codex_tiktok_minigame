import { GRID_COLS, GRID_ROWS } from "../utils/constants";
import type { ActiveBlock, MergeGroup, Point, ResolveStep } from "../utils/types";

export function createEmptyGrid(): number[][] {
  return Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => 0));
}

export function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

export function isValidGrid(grid: number[][]): boolean {
  return grid.length === GRID_ROWS && grid.every((row) => row.length === GRID_COLS);
}

export function canPlace(grid: number[][], x: number, y: number): boolean {
  return x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS && grid[y][x] === 0;
}

export function lockBlock(grid: number[][], block: ActiveBlock): number[][] {
  const next = cloneGrid(grid);
  next[block.y][block.x] = block.value;
  return next;
}

export function getHardDropY(grid: number[][], block: ActiveBlock): number {
  let y = block.y;

  while (canPlace(grid, block.x, y + 1)) {
    y += 1;
  }

  return y;
}

export function applyGravity(grid: number[][]): { grid: number[][]; changed: boolean } {
  const next = createEmptyGrid();
  let changed = false;

  for (let x = 0; x < GRID_COLS; x += 1) {
    let targetY = GRID_ROWS - 1;

    for (let y = GRID_ROWS - 1; y >= 0; y -= 1) {
      const value = grid[y][x];

      if (value === 0) {
        continue;
      }

      next[targetY][x] = value;
      changed ||= targetY !== y;
      targetY -= 1;
    }
  }

  return { grid: next, changed };
}

export function findMergeGroups(grid: number[][]): MergeGroup[] {
  const visited = createEmptyGrid().map((row) => row.map(() => false));
  const groups: MergeGroup[] = [];

  for (let y = GRID_ROWS - 1; y >= 0; y -= 1) {
    for (let x = 0; x < GRID_COLS; x += 1) {
      const value = grid[y][x];

      if (value === 0 || visited[y][x]) {
        continue;
      }

      const cells = collectGroup(grid, { x, y }, visited);

      if (cells.length >= 2) {
        groups.push({
          value,
          cells,
          anchor: getMergeAnchor(cells)
        });
      }
    }
  }

  return groups;
}

export function applyMergeGroups(grid: number[][], groups: MergeGroup[]): number[][] {
  const next = cloneGrid(grid);

  for (const group of groups) {
    for (const cell of group.cells) {
      next[cell.y][cell.x] = 0;
    }

    next[group.anchor.y][group.anchor.x] = group.value * 2;
  }

  return next;
}

export function resolveGrid(grid: number[][]): { grid: number[][]; steps: ResolveStep[]; comboCount: number } {
  let current = cloneGrid(grid);
  const steps: ResolveStep[] = [];
  let comboCount = 0;

  for (let guard = 0; guard < 20; guard += 1) {
    const gravity = applyGravity(current);

    if (gravity.changed) {
      current = gravity.grid;
      steps.push({ grid: cloneGrid(current), mergeGroups: [] });
    }

    const groups = findMergeGroups(current);

    if (groups.length === 0) {
      break;
    }

    comboCount += groups.length;
    current = applyMergeGroups(current, groups);
    steps.push({ grid: cloneGrid(current), mergeGroups: groups });
  }

  return {
    grid: current,
    steps,
    comboCount
  };
}

export function getMaxValue(grid: number[][]): number {
  return Math.max(0, ...grid.flat());
}

function collectGroup(grid: number[][], start: Point, visited: boolean[][]): Point[] {
  const value = grid[start.y][start.x];
  const queue: Point[] = [start];
  const cells: Point[] = [];
  visited[start.y][start.x] = true;

  while (queue.length > 0) {
    const cell = queue.shift()!;
    cells.push(cell);

    for (const neighbor of getNeighbors(cell)) {
      if (visited[neighbor.y][neighbor.x] || grid[neighbor.y][neighbor.x] !== value) {
        continue;
      }

      visited[neighbor.y][neighbor.x] = true;
      queue.push(neighbor);
    }
  }

  return cells;
}

function getNeighbors(cell: Point): Point[] {
  return [
    { x: cell.x - 1, y: cell.y },
    { x: cell.x + 1, y: cell.y },
    { x: cell.x, y: cell.y - 1 },
    { x: cell.x, y: cell.y + 1 }
  ].filter((point) => point.x >= 0 && point.x < GRID_COLS && point.y >= 0 && point.y < GRID_ROWS);
}

function getMergeAnchor(cells: Point[]): Point {
  return [...cells].sort((a, b) => {
    if (a.y !== b.y) {
      return b.y - a.y;
    }

    return a.x - b.x;
  })[0];
}
