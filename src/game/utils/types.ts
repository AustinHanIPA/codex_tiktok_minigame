export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Point {
  x: number;
  y: number;
}

export interface StarTimes {
  three: number;
  two: number;
  one: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  hint: string;
  difficulty: Difficulty;
  ballStart: Point;
  goal: Point & { radius: number };
  timeLimit: number;
  starTimes: StarTimes;
  staticBodies: StaticBodyConfig[];
  mechanisms: MechanismConfig[];
}

export interface StaticBodyConfig {
  id: string;
  type: "rectangle" | "circle";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  angle?: number;
  color?: number;
}

export type MechanismType = "button" | "rotator" | "slider" | "launcher" | "conveyor";

export interface BaseMechanismConfig {
  id: string;
  type: MechanismType;
  x: number;
  y: number;
}

export interface ButtonMechanismConfig extends BaseMechanismConfig {
  type: "button";
  targetIds: string[];
  once: boolean;
  cooldown?: number;
}

export interface RotatorMechanismConfig extends BaseMechanismConfig {
  type: "rotator";
  width: number;
  height: number;
  angle: number;
  minAngle: number;
  maxAngle: number;
  controllable: boolean;
  targetAngle?: number;
}

export interface SliderMechanismConfig extends BaseMechanismConfig {
  type: "slider";
  width: number;
  height: number;
  axis: "x" | "y";
  min: number;
  max: number;
  controllable: boolean;
  startAtMax?: boolean;
}

export interface LauncherMechanismConfig extends BaseMechanismConfig {
  type: "launcher";
  forceX: number;
  forceY: number;
  cooldown: number;
  radius?: number;
}

export interface ConveyorMechanismConfig extends BaseMechanismConfig {
  type: "conveyor";
  width: number;
  height: number;
  speed: number;
  direction: "left" | "right" | "up" | "down";
  active: boolean;
}

export type MechanismConfig =
  | ButtonMechanismConfig
  | RotatorMechanismConfig
  | SliderMechanismConfig
  | LauncherMechanismConfig
  | ConveyorMechanismConfig;

export interface LevelSave {
  completed: boolean;
  bestTime: number | null;
  stars: 0 | 1 | 2 | 3;
}

export interface SaveData {
  unlockedLevel: number;
  levels: Record<number, LevelSave>;
  settings: {
    sound: boolean;
    vibration: boolean;
  };
}

export type PlayState = "ready" | "playing" | "paused" | "complete" | "failed";

export interface LevelResult {
  levelId: number;
  elapsed: number;
  stars: 1 | 2 | 3;
  bestTime: number | null;
  isNewBest: boolean;
}
