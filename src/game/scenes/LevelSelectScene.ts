import Phaser from "phaser";
import { LEVELS } from "../levels";
import { SaveManager } from "../data/SaveManager";
import { COLORS, DEPTHS } from "../utils/constants";
import { createButton, createScreenTitle, drawToyBackground, starText } from "../ui/UiFactory";

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelectScene");
  }

  create(): void {
    drawToyBackground(this);
    createScreenTitle(this, "选择关卡", "每关用有限方块合成目标数字");

    const save = SaveManager.load();
    const startX = 220;
    const startY = 368;
    const gapX = 280;
    const gapY = 150;

    for (const level of LEVELS) {
      const index = level.id - 1;
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * gapX;
      const y = startY + row * gapY;
      const unlocked = level.id <= save.unlockedLevel;
      const levelSave = save.levels[level.id];
      const label = unlocked ? `第 ${level.id} 关\n${starText(levelSave?.stars ?? 0)}` : `第 ${level.id} 关\n未解锁`;

      createButton(this, x, y, label, () => this.scene.start("PlayScene", { levelId: level.id }), {
        width: 238,
        height: 120,
        fill: unlocked ? COLORS.panel : COLORS.panelStroke,
        textColor: unlocked ? "#263241" : "#65758b",
        fontSize: 25,
        disabled: !unlocked
      });

      this.add
        .text(x, y + 46, `${level.name} · ${level.targetValue}`, {
          color: unlocked ? "#65758b" : "#7e8b99",
          fontSize: "17px",
          fontStyle: "700",
          align: "center"
        })
        .setOrigin(0.5)
        .setDepth(DEPTHS.ui + 1);
    }

    createButton(this, 360, 1168, "返回首页", () => this.scene.start("MenuScene"), {
      width: 300,
      height: 68,
      fill: COLORS.primary
    });
  }
}
