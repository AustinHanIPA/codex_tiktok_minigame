import Phaser from "phaser";
import { EventTracker } from "../data/EventTracker";
import { SaveManager } from "../data/SaveManager";
import { PlatformService } from "../platform/PlatformService";
import { BLOCK_COLORS, COLORS, DEPTHS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { createButton, createScreenTitle, drawToyBackground } from "../ui/UiFactory";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    drawToyBackground(this);
    EventTracker.track("game_start", { source: "menu" });

    this.addPreviewBoard();

    createScreenTitle(this, "方块合合合", "掉落方块，连锁合成目标数字");

    const save = SaveManager.load();
    const continueLevel = Math.min(save.unlockedLevel, 10);

    createButton(this, 360, 650, "开始挑战", () => this.scene.start("LevelSelectScene"), {
      width: 340,
      height: 78,
      fill: COLORS.primary
    });
    createButton(this, 360, 748, "无尽模式", () => this.scene.start("EndlessScene"), {
      width: 340,
      height: 72,
      fill: COLORS.blue,
      textColor: "#263241"
    });
    createButton(this, 360, 840, `继续第 ${continueLevel} 关`, () => this.scene.start("PlayScene", { levelId: continueLevel }), {
      width: 340,
      height: 72,
      fill: COLORS.green,
      textColor: "#263241"
    });
    createButton(this, 360, 932, "设置", () => this.openSettings(), {
      width: 340,
      height: 72,
      fill: COLORS.panel,
      textColor: "#263241"
    });

    this.add
      .text(360, 1072, `MVP 原型：10 个残局关卡 / 无尽最高 ${save.endless.bestScore} / 广告分享 Mock`, {
        color: "#65758b",
        fontSize: "22px",
        fontStyle: "700",
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui);
  }

  private openSettings(): void {
    const save = SaveManager.load();
    const overlayObjects: Phaser.GameObjects.GameObject[] = [];
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x101722, 0.45).setInteractive().setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(360, 640, 500, 390, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    const title = this.add
      .text(360, 500, "设置", {
        color: "#263241",
        fontSize: "36px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    overlayObjects.push(shade, panel, title);

    const closeOverlay = () => {
      for (const object of overlayObjects) {
        object.destroy();
      }
    };

    const renderToggle = (label: string, y: number, key: "sound" | "vibration") => {
      const button = createButton(
        this,
        360,
        640 + y,
        `${label}：${save.settings[key] ? "开" : "关"}`,
        () => {
          save.settings[key] = !save.settings[key];
          SaveManager.setSettings(save.settings);
          EventTracker.track("setting_change", {
            sound: save.settings.sound,
            vibration: save.settings.vibration
          });
          closeOverlay();
          this.openSettings();
        },
        {
          width: 360,
          height: 64,
          fill: save.settings[key] ? COLORS.green : COLORS.panel,
          textColor: "#263241"
        }
      ).setDepth(DEPTHS.modal + 2);
      overlayObjects.push(button);
    };

    renderToggle("音效", -50, "sound");
    renderToggle("震动", 34, "vibration");
    const closeButton = createButton(this, 360, 640 + 132, "关闭", () => closeOverlay(), {
      width: 220,
      height: 62,
      fill: COLORS.primary
    }).setDepth(DEPTHS.modal + 2);
    overlayObjects.push(closeButton);

    void PlatformService.getInstance().getLaunchOptions();
  }

  private addPreviewBoard(): void {
    const board = this.add.rectangle(360, 430, 390, 252, COLORS.board).setDepth(DEPTHS.board);
    board.setStrokeStyle(5, COLORS.ink, 0.18);

    const values = [
      [0, 2, 0, 4],
      [2, 4, 8, 0],
      [16, 8, 4, 2]
    ];

    for (let row = 0; row < values.length; row += 1) {
      for (let col = 0; col < values[row].length; col += 1) {
        const x = 224 + col * 90;
        const y = 354 + row * 76;
        const value = values[row][col];
        const fill = value === 0 ? COLORS.boardCell : (BLOCK_COLORS[value]?.fill ?? COLORS.primary);
        const textColor = value === 0 ? "#8f7a62" : (BLOCK_COLORS[value]?.text ?? "#ffffff");
        this.add.rectangle(x, y, 74, 62, fill).setStrokeStyle(2, COLORS.ink, 0.12).setDepth(DEPTHS.board + 1);

        if (value > 0) {
          this.add
            .text(x, y, `${value}`, {
              color: textColor,
              fontSize: "28px",
              fontStyle: "900"
            })
            .setOrigin(0.5)
            .setDepth(DEPTHS.board + 2);
        }
      }
    }

    const falling = this.add.rectangle(360, 276, 74, 62, BLOCK_COLORS[4].fill).setStrokeStyle(2, COLORS.ink, 0.12);
    const label = this.add
      .text(360, 276, "4", {
        color: BLOCK_COLORS[4].text,
        fontSize: "28px",
        fontStyle: "900"
      })
      .setOrigin(0.5);
    const block = this.add.container(0, 0, [falling, label]).setDepth(DEPTHS.board + 3);
    this.tweens.add({
      targets: block,
      y: 68,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.InOut"
    });
  }
}
