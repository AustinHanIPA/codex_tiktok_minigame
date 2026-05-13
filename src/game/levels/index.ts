import { COLORS } from "../utils/constants";
import type { LevelConfig, StaticBodyConfig } from "../utils/types";

const walls: StaticBodyConfig[] = [
  { id: "left-rail", type: "rectangle", x: 28, y: 640, width: 56, height: 1280, color: COLORS.trackDark },
  { id: "right-rail", type: "rectangle", x: 692, y: 640, width: 56, height: 1280, color: COLORS.trackDark },
  { id: "top-rail", type: "rectangle", x: 360, y: 80, width: 664, height: 44, color: COLORS.trackDark }
];

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "滚动入门",
    hint: "顺着斜坡滚到发光终点。",
    difficulty: 1,
    ballStart: { x: 170, y: 180 },
    goal: { x: 566, y: 1034, radius: 48 },
    timeLimit: 45,
    starTimes: { three: 12, two: 22, one: 45 },
    staticBodies: [
      ...walls,
      { id: "ramp-1", type: "rectangle", x: 260, y: 310, width: 390, height: 34, angle: 11 },
      { id: "ramp-2", type: "rectangle", x: 468, y: 570, width: 430, height: 34, angle: -13 },
      { id: "ramp-3", type: "rectangle", x: 292, y: 820, width: 430, height: 34, angle: 12 },
      { id: "landing", type: "rectangle", x: 548, y: 1100, width: 230, height: 34, angle: -4 }
    ],
    mechanisms: []
  },
  {
    id: 2,
    name: "点亮履带",
    hint: "点击蓝色按钮，启动传送带。",
    difficulty: 1,
    ballStart: { x: 162, y: 180 },
    goal: { x: 560, y: 1058, radius: 48 },
    timeLimit: 50,
    starTimes: { three: 15, two: 28, one: 50 },
    staticBodies: [
      ...walls,
      { id: "ramp-1", type: "rectangle", x: 258, y: 305, width: 390, height: 34, angle: 11 },
      { id: "flat-before-belt", type: "rectangle", x: 350, y: 560, width: 470, height: 34 },
      { id: "ramp-after-belt", type: "rectangle", x: 468, y: 812, width: 430, height: 34, angle: -12 },
      { id: "landing", type: "rectangle", x: 550, y: 1120, width: 220, height: 34 }
    ],
    mechanisms: [
      { id: "start-belt", type: "button", x: 132, y: 520, targetIds: ["belt-1"], once: false, cooldown: 800 },
      { id: "belt-1", type: "conveyor", x: 448, y: 520, width: 220, height: 28, speed: 7, direction: "right", active: false }
    ]
  },
  {
    id: 3,
    name: "转盘坡道",
    hint: "拖动黄色转盘，让球滚向下一层。",
    difficulty: 1,
    ballStart: { x: 162, y: 180 },
    goal: { x: 160, y: 1060, radius: 48 },
    timeLimit: 55,
    starTimes: { three: 18, two: 32, one: 55 },
    staticBodies: [
      ...walls,
      { id: "top-run", type: "rectangle", x: 258, y: 306, width: 390, height: 34, angle: 10 },
      { id: "mid-catch", type: "rectangle", x: 500, y: 724, width: 330, height: 34, angle: -8 },
      { id: "bottom-run", type: "rectangle", x: 310, y: 946, width: 420, height: 34, angle: 12 }
    ],
    mechanisms: [
      {
        id: "rotator-1",
        type: "rotator",
        x: 386,
        y: 514,
        width: 270,
        height: 30,
        angle: -8,
        minAngle: -30,
        maxAngle: 25,
        controllable: true
      }
    ]
  },
  {
    id: 4,
    name: "拖动挡板",
    hint: "拖动绿色挡板接住小球。",
    difficulty: 2,
    ballStart: { x: 546, y: 172 },
    goal: { x: 556, y: 1056, radius: 48 },
    timeLimit: 60,
    starTimes: { three: 24, two: 40, one: 60 },
    staticBodies: [
      ...walls,
      { id: "upper-ramp", type: "rectangle", x: 460, y: 306, width: 380, height: 34, angle: -12 },
      { id: "lower-ramp", type: "rectangle", x: 460, y: 810, width: 430, height: 34, angle: -10 },
      { id: "landing", type: "rectangle", x: 548, y: 1120, width: 220, height: 34 }
    ],
    mechanisms: [
      {
        id: "slider-1",
        type: "slider",
        x: 306,
        y: 562,
        width: 230,
        height: 30,
        axis: "x",
        min: 210,
        max: 510,
        controllable: true
      }
    ]
  },
  {
    id: 5,
    name: "弹射起飞",
    hint: "点击橙色弹射器给小球一个冲量。",
    difficulty: 2,
    ballStart: { x: 176, y: 180 },
    goal: { x: 552, y: 1038, radius: 48 },
    timeLimit: 60,
    starTimes: { three: 22, two: 38, one: 60 },
    staticBodies: [
      ...walls,
      { id: "top-ramp", type: "rectangle", x: 270, y: 300, width: 410, height: 34, angle: 10 },
      { id: "launch-pad", type: "rectangle", x: 430, y: 604, width: 270, height: 34, angle: -4 },
      { id: "catch-ramp", type: "rectangle", x: 430, y: 812, width: 420, height: 34, angle: -11 },
      { id: "goal-pad", type: "rectangle", x: 550, y: 1100, width: 230, height: 34 }
    ],
    mechanisms: [
      { id: "launcher-1", type: "launcher", x: 214, y: 574, forceX: 0.035, forceY: -0.07, cooldown: 900 }
    ]
  },
  {
    id: 6,
    name: "按钮开门",
    hint: "先开门，再让球进入下层通道。",
    difficulty: 2,
    ballStart: { x: 166, y: 180 },
    goal: { x: 160, y: 1050, radius: 48 },
    timeLimit: 65,
    starTimes: { three: 28, two: 45, one: 65 },
    staticBodies: [
      ...walls,
      { id: "top-run", type: "rectangle", x: 278, y: 310, width: 430, height: 34, angle: 10 },
      { id: "door-catch", type: "rectangle", x: 492, y: 602, width: 280, height: 34 },
      { id: "lower-run", type: "rectangle", x: 320, y: 844, width: 430, height: 34, angle: 12 },
      { id: "goal-pad", type: "rectangle", x: 154, y: 1110, width: 230, height: 34 }
    ],
    mechanisms: [
      { id: "door-button", type: "button", x: 580, y: 520, targetIds: ["door-1"], once: false },
      {
        id: "door-1",
        type: "slider",
        x: 356,
        y: 602,
        width: 32,
        height: 170,
        axis: "y",
        min: 602,
        max: 760,
        controllable: false
      }
    ]
  },
  {
    id: 7,
    name: "连续传送",
    hint: "传送带会持续推球，注意节奏。",
    difficulty: 3,
    ballStart: { x: 540, y: 180 },
    goal: { x: 560, y: 1060, radius: 48 },
    timeLimit: 70,
    starTimes: { three: 32, two: 50, one: 70 },
    staticBodies: [
      ...walls,
      { id: "top-run", type: "rectangle", x: 468, y: 312, width: 390, height: 34, angle: -10 },
      { id: "mid-platform", type: "rectangle", x: 354, y: 570, width: 500, height: 34 },
      { id: "drop-ramp", type: "rectangle", x: 464, y: 825, width: 410, height: 34, angle: -12 },
      { id: "goal-pad", type: "rectangle", x: 552, y: 1118, width: 220, height: 34 }
    ],
    mechanisms: [
      { id: "belt-1", type: "conveyor", x: 334, y: 532, width: 240, height: 28, speed: 6, direction: "left", active: true },
      { id: "belt-2", type: "conveyor", x: 468, y: 786, width: 220, height: 28, speed: 6, direction: "right", active: true }
    ]
  },
  {
    id: 8,
    name: "转盘弹射",
    hint: "先调转盘，再用弹射器补速度。",
    difficulty: 3,
    ballStart: { x: 166, y: 178 },
    goal: { x: 548, y: 1048, radius: 48 },
    timeLimit: 75,
    starTimes: { three: 36, two: 55, one: 75 },
    staticBodies: [
      ...walls,
      { id: "top-run", type: "rectangle", x: 276, y: 308, width: 420, height: 34, angle: 10 },
      { id: "launch-catch", type: "rectangle", x: 448, y: 690, width: 320, height: 34, angle: -8 },
      { id: "goal-run", type: "rectangle", x: 504, y: 1002, width: 320, height: 34, angle: -6 }
    ],
    mechanisms: [
      {
        id: "rotator-1",
        type: "rotator",
        x: 390,
        y: 502,
        width: 285,
        height: 30,
        angle: -5,
        minAngle: -25,
        maxAngle: 28,
        controllable: true
      },
      { id: "launcher-1", type: "launcher", x: 210, y: 640, forceX: 0.042, forceY: -0.065, cooldown: 850 }
    ]
  },
  {
    id: 9,
    name: "选择通路",
    hint: "拖挡板改变路径，按钮可以打开门。",
    difficulty: 4,
    ballStart: { x: 548, y: 178 },
    goal: { x: 166, y: 1060, radius: 48 },
    timeLimit: 80,
    starTimes: { three: 42, two: 62, one: 80 },
    staticBodies: [
      ...walls,
      { id: "top-run", type: "rectangle", x: 464, y: 306, width: 400, height: 34, angle: -10 },
      { id: "mid-run", type: "rectangle", x: 320, y: 610, width: 430, height: 34, angle: 9 },
      { id: "bottom-run", type: "rectangle", x: 294, y: 916, width: 440, height: 34, angle: 10 },
      { id: "goal-pad", type: "rectangle", x: 164, y: 1120, width: 240, height: 34 }
    ],
    mechanisms: [
      {
        id: "slider-1",
        type: "slider",
        x: 420,
        y: 460,
        width: 230,
        height: 30,
        axis: "x",
        min: 240,
        max: 500,
        controllable: true
      },
      { id: "door-button", type: "button", x: 572, y: 716, targetIds: ["door-1"], once: false },
      {
        id: "door-1",
        type: "slider",
        x: 292,
        y: 770,
        width: 34,
        height: 160,
        axis: "y",
        min: 770,
        max: 922,
        controllable: false
      }
    ]
  },
  {
    id: 10,
    name: "机关总装",
    hint: "综合使用按钮、转盘、滑块、弹射器和传送带。",
    difficulty: 5,
    ballStart: { x: 164, y: 176 },
    goal: { x: 556, y: 1064, radius: 48 },
    timeLimit: 90,
    starTimes: { three: 48, two: 70, one: 90 },
    staticBodies: [
      ...walls,
      { id: "top-run", type: "rectangle", x: 284, y: 300, width: 420, height: 34, angle: 10 },
      { id: "mid-catch", type: "rectangle", x: 478, y: 612, width: 320, height: 34, angle: -7 },
      { id: "lower-run", type: "rectangle", x: 316, y: 868, width: 430, height: 34, angle: 12 },
      { id: "goal-pad", type: "rectangle", x: 552, y: 1120, width: 230, height: 34 }
    ],
    mechanisms: [
      { id: "belt-button", type: "button", x: 582, y: 492, targetIds: ["belt-1", "door-1"], once: false },
      {
        id: "rotator-1",
        type: "rotator",
        x: 392,
        y: 474,
        width: 285,
        height: 30,
        angle: -4,
        minAngle: -28,
        maxAngle: 26,
        controllable: true
      },
      {
        id: "slider-1",
        type: "slider",
        x: 290,
        y: 708,
        width: 225,
        height: 30,
        axis: "x",
        min: 208,
        max: 506,
        controllable: true
      },
      {
        id: "door-1",
        type: "slider",
        x: 520,
        y: 840,
        width: 34,
        height: 170,
        axis: "y",
        min: 840,
        max: 990,
        controllable: false
      },
      { id: "belt-1", type: "conveyor", x: 432, y: 832, width: 210, height: 28, speed: 7, direction: "right", active: false },
      { id: "launcher-1", type: "launcher", x: 198, y: 790, forceX: 0.04, forceY: -0.065, cooldown: 850 }
    ]
  }
];

export function getLevel(levelId: number): LevelConfig {
  const level = LEVELS.find((item) => item.id === levelId);

  if (!level) {
    throw new Error(`Missing level ${levelId}`);
  }

  return level;
}
