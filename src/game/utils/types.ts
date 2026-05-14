export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Point {
  x: number;
  y: number;
}

export interface StarSteps {
  three: number;
  two: number;
  one: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  difficulty: Difficulty;
  targetValue: number;
  initialGrid: number[][];
  starSteps: StarSteps;
  nextBlocks: number[];
}

export interface ActiveBlock {
  x: number;
  y: number;
  value: number;
}

export interface MergeGroup {
  value: number;
  cells: Point[];
  anchor: Point;
}

export interface ResolveStep {
  grid: number[][];
  mergeGroups: MergeGroup[];
}

export interface LevelSave {
  completed: boolean;
  bestSteps: number | null;
  stars: 0 | 1 | 2 | 3;
}

export interface EndlessSave {
  bestScore: number;
  bestTile: number;
  gamesPlayed: number;
}

export interface SaveData {
  unlockedLevel: number;
  levels: Record<number, LevelSave>;
  endless: EndlessSave;
  settings: {
    sound: boolean;
    vibration: boolean;
  };
}

export type PlayState = "ready" | "playing" | "paused" | "complete" | "failed";

export interface LevelResult {
  levelId: number;
  stepsUsed: number;
  stars: 1 | 2 | 3;
  targetValue: number;
  defeatedPercent: number;
  bestSteps: number | null;
  isNewBestSteps: boolean;
}

export interface EndlessResult {
  score: number;
  bestScore: number;
  bestTile: number;
  isNewBestScore: boolean;
}
