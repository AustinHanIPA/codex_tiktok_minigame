import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { EndlessScene } from "./scenes/EndlessScene";
import { LevelSelectScene } from "./scenes/LevelSelectScene";
import { MenuScene } from "./scenes/MenuScene";
import { PlayScene } from "./scenes/PlayScene";
import { GAME_HEIGHT, GAME_WIDTH } from "./utils/constants";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#d8e7f2",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MenuScene, LevelSelectScene, PlayScene, EndlessScene]
};
