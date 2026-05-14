import type { Difficulty, LevelConfig } from "../utils/types";

const GRID_ROWS = 8;
const GRID_COLS = 5;

interface DominoLevelInput {
  id: number;
  name: string;
  description: string;
  difficulty: Difficulty;
  targetValue: number;
  chainValues: number[];
  starSteps: { three: number; two: number; one: number };
  nextBlocks?: number[];
  extras?: Array<{ row: number; col: number; value: number }>;
}

export const LEVELS: LevelConfig[] = [
  createDominoLevel({
    id: 1,
    name: "一触即发",
    description: "把 2 放进中间缺口，看整列数字一路爆到 64。",
    difficulty: 1,
    targetValue: 64,
    chainValues: [4, 8, 16, 32],
    starSteps: { three: 1, two: 2, one: 4 },
    extras: [
      { row: 7, col: 4, value: 4 },
      { row: 6, col: 4, value: 8 }
    ]
  }),
  createDominoLevel({
    id: 2,
    name: "暖场连爆",
    description: "一颗 2 就能推倒 128，注意观察连续坍塌。",
    difficulty: 1,
    targetValue: 128,
    chainValues: [4, 8, 16, 32, 64],
    starSteps: { three: 1, two: 2, one: 5 },
    extras: [
      { row: 7, col: 3, value: 8 },
      { row: 6, col: 3, value: 16 },
      { row: 7, col: 4, value: 8 }
    ]
  }),
  createDominoLevel({
    id: 3,
    name: "半屏爆破",
    description: "从底部的 2 开始，连锁会一路点亮 256。",
    difficulty: 2,
    targetValue: 256,
    chainValues: [4, 8, 16, 32, 64, 128],
    starSteps: { three: 1, two: 3, one: 6 },
    extras: [
      { row: 7, col: 3, value: 16 },
      { row: 6, col: 3, value: 32 },
      { row: 5, col: 3, value: 64 }
    ]
  }),
  createDominoLevel({
    id: 4,
    name: "满列烟花",
    description: "正确落点会触发 512 级别的多米诺合成。",
    difficulty: 2,
    targetValue: 512,
    chainValues: [4, 8, 16, 32, 64, 128, 256],
    starSteps: { three: 1, two: 3, one: 7 },
    extras: [
      { row: 7, col: 4, value: 32 },
      { row: 6, col: 4, value: 64 },
      { row: 5, col: 4, value: 128 }
    ]
  }),
  createDominoLevel({
    id: 5,
    name: "黄金冲线",
    description: "一手触发 1024，发光方块会连续铺满视线。",
    difficulty: 3,
    targetValue: 1024,
    chainValues: [4, 8, 16, 32, 64, 128, 256, 512],
    starSteps: { three: 1, two: 4, one: 8 },
    extras: [
      { row: 7, col: 3, value: 64 },
      { row: 6, col: 3, value: 128 },
      { row: 5, col: 3, value: 256 }
    ]
  }),
  createDominoLevel({
    id: 6,
    name: "双塔预演",
    description: "左侧主链先爆，右侧高阶方块强化视觉冲击。",
    difficulty: 3,
    targetValue: 512,
    chainValues: [4, 8, 16, 32, 64, 128, 256],
    starSteps: { three: 1, two: 4, one: 8 },
    extras: [
      { row: 7, col: 3, value: 4 },
      { row: 6, col: 3, value: 8 },
      { row: 5, col: 3, value: 16 },
      { row: 7, col: 4, value: 64 },
      { row: 6, col: 4, value: 128 }
    ]
  }),
  createDominoLevel({
    id: 7,
    name: "高阶连锁",
    description: "高级方块发光后继续合并，冲到 1024。",
    difficulty: 4,
    targetValue: 1024,
    chainValues: [4, 8, 16, 32, 64, 128, 256, 512],
    starSteps: { three: 1, two: 4, one: 9 },
    extras: [
      { row: 7, col: 3, value: 16 },
      { row: 6, col: 3, value: 32 },
      { row: 5, col: 3, value: 64 },
      { row: 4, col: 3, value: 128 }
    ]
  }),
  createDominoLevel({
    id: 8,
    name: "右侧火线",
    description: "主链引爆后，右侧高阶塔让整屏都在闪。",
    difficulty: 4,
    targetValue: 1024,
    chainValues: [4, 8, 16, 32, 64, 128, 256, 512],
    starSteps: { three: 1, two: 5, one: 10 },
    extras: [
      { row: 7, col: 3, value: 32 },
      { row: 6, col: 3, value: 64 },
      { row: 5, col: 3, value: 128 },
      { row: 4, col: 3, value: 256 },
      { row: 7, col: 4, value: 32 }
    ]
  }),
  createDominoLevel({
    id: 9,
    name: "全屏热浪",
    description: "落下第一颗 2，整条数值阶梯会连炸到 1024。",
    difficulty: 5,
    targetValue: 1024,
    chainValues: [4, 8, 16, 32, 64, 128, 256, 512],
    starSteps: { three: 1, two: 5, one: 11 },
    extras: [
      { row: 7, col: 3, value: 64 },
      { row: 6, col: 3, value: 128 },
      { row: 5, col: 3, value: 256 },
      { row: 4, col: 3, value: 512 },
      { row: 7, col: 4, value: 16 }
    ]
  }),
  createDominoLevel({
    id: 10,
    name: "终局烟火",
    description: "最后一关只差一颗 2，触发最华丽的 1024 连锁。",
    difficulty: 5,
    targetValue: 1024,
    chainValues: [4, 8, 16, 32, 64, 128, 256, 512],
    starSteps: { three: 1, two: 5, one: 12 },
    extras: [
      { row: 7, col: 3, value: 128 },
      { row: 6, col: 3, value: 256 },
      { row: 5, col: 3, value: 512 },
      { row: 7, col: 4, value: 64 },
      { row: 6, col: 4, value: 128 }
    ]
  })
];

export function getLevel(levelId: number): LevelConfig {
  const level = LEVELS.find((item) => item.id === levelId);

  if (!level) {
    throw new Error(`Missing level ${levelId}`);
  }

  return level;
}

function createDominoLevel(input: DominoLevelInput): LevelConfig {
  const grid = Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => 0));

  input.chainValues.forEach((value, index) => {
    grid[GRID_ROWS - 1 - index][0] = value;
  });

  grid[GRID_ROWS - 1][1] = 2;

  for (const extra of input.extras ?? []) {
    grid[extra.row][extra.col] = extra.value;
  }

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    difficulty: input.difficulty,
    targetValue: input.targetValue,
    initialGrid: grid,
    starSteps: input.starSteps,
    nextBlocks: input.nextBlocks ?? [2, 2, 4, 8]
  };
}
