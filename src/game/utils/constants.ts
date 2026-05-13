export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const WORLD_PADDING = 48;
export const BALL_RADIUS = 24;
export const MAX_BALL_SPEED = 24;

export const COLORS = {
  backgroundTop: 0xf5f7ff,
  backgroundBottom: 0xd8e7f2,
  ink: 0x263241,
  mutedInk: 0x65758b,
  panel: 0xffffff,
  panelStroke: 0xd7dee8,
  primary: 0x2f8fdd,
  primaryDark: 0x166a93,
  yellow: 0xffc857,
  orange: 0xff8a5b,
  red: 0xf26464,
  green: 0x6bd98e,
  blue: 0x5ab3ff,
  purple: 0x8f7bff,
  track: 0x7d8998,
  trackDark: 0x536170,
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
