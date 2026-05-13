import Phaser from "phaser";
import { EventTracker } from "../data/EventTracker";
import { SaveManager } from "../data/SaveManager";
import { PlatformService } from "../platform/PlatformService";
import { COLORS, DEPTHS } from "../utils/constants";
import { createButton, createScreenTitle, drawToyBackground } from "../ui/UiFactory";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    drawToyBackground(this);
    EventTracker.track("game_start", { source: "menu" });

    this.addGear(154, 376, 72, COLORS.yellow);
    this.addGear(560, 326, 54, COLORS.green);
    this.add.circle(360, 438, 92, COLORS.ink).setDepth(DEPTHS.board);
    this.add.circle(360, 438, 72, 0x6ad7ff).setDepth(DEPTHS.board + 1);
    this.add.circle(332, 412, 13, 0xffffff, 0.85).setDepth(DEPTHS.board + 2);

    createScreenTitle(this, "机械球球", "点击、拖拽、旋转机关，把小球送进终点");

    const save = SaveManager.load();
    const continueLevel = Math.min(save.unlockedLevel, 10);

    createButton(this, 360, 670, "开始闯关", () => this.scene.start("LevelSelectScene"), {
      width: 340,
      height: 78,
      fill: COLORS.primary
    });
    createButton(this, 360, 770, `继续第 ${continueLevel} 关`, () => this.scene.start("PlayScene", { levelId: continueLevel }), {
      width: 340,
      height: 72,
      fill: COLORS.green,
      textColor: "#263241"
    });
    createButton(this, 360, 864, "设置", () => this.openSettings(), {
      width: 340,
      height: 72,
      fill: COLORS.panel,
      textColor: "#263241"
    });

    this.add
      .text(360, 1030, "MVP 原型：10 个关卡 / 5 种机关 / 本地存档", {
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
    const shade = this.add.rectangle(360, 640, 720, 1280, 0x101722, 0.45).setInteractive().setDepth(DEPTHS.modal);
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

  private addGear(x: number, y: number, radius: number, color: number): void {
    const gear = this.add.star(x, y, 10, radius * 0.72, radius, color).setDepth(DEPTHS.board);
    gear.setStrokeStyle(4, COLORS.ink, 0.85);
    this.tweens.add({
      targets: gear,
      angle: 360,
      duration: 10000,
      repeat: -1,
      ease: "Linear"
    });
  }
}
