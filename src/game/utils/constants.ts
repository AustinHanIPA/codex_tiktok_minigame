export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const GRID_COLS = 5;
export const GRID_ROWS = 8;
export const CELL_SIZE = 104;
export const CELL_GAP = 10;
export const BOARD_X = 78;
export const BOARD_Y = 246;
export const DROP_INTERVAL_MS = 520;
export const COMBO_STEP_DELAY_MS = 170;

export const BLOCK_COLORS: Record<number, { fill: number; text: string; glow?: number }> = {
  2: { fill: 0xeee4da, text: "#263241" },
  4: { fill: 0xede0c8, text: "#263241" },
  8: { fill: 0xf2b179, text: "#ffffff" },
  16: { fill: 0xf59563, text: "#ffffff" },
  32: { fill: 0xf67c5f, text: "#ffffff" },
  64: { fill: 0xf65e3b, text: "#ffffff", glow: 0xffd166 },
  128: { fill: 0xedcf72, text: "#ffffff", glow: 0xfff1a8 },
  256: { fill: 0xedcc61, text: "#ffffff", glow: 0xfff1a8 },
  512: { fill: 0xedc850, text: "#ffffff", glow: 0xfff1a8 },
  1024: { fill: 0xedc53f, text: "#ffffff", glow: 0xfff1a8 },
  2048: { fill: 0xedc22e, text: "#ffffff", glow: 0xffffff }
};

export const COLORS = {
  backgroundTop: 0xfaf8ef,
  backgroundBottom: 0xf2e5d5,
  ink: 0x263241,
  mutedInk: 0x65758b,
  panel: 0xffffff,
  panelStroke: 0xd7dee8,
  primary: 0xf27b4f,
  primaryDark: 0xb94e30,
  yellow: 0xffc857,
  orange: 0xff8a5b,
  red: 0xf26464,
  green: 0x6bd98e,
  blue: 0x5ab3ff,
  purple: 0x8f7bff,
  board: 0xbbada0,
  boardCell: 0xcdc1b4,
  track: 0xd9c5a7,
  trackDark: 0x8f7a62,
  metal: 0xc8d3df,
  shadow: 0x122033
} as const;

export const DEPTHS = {
  board: 1,
  mechanism: 5,
  ball: 10,
  effects: 20,
  ui: 50,
  modal: 100
} as const;
