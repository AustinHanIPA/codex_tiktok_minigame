import Phaser from "phaser";
import { SaveManager } from "../data/SaveManager";
import { PlatformService } from "../platform/PlatformService";
import { COLORS } from "../utils/constants";
import { drawToyBackground } from "../ui/UiFactory";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    drawToyBackground(this);
    SaveManager.load();
    void PlatformService.getInstance().login();

    this.add
      .text(360, 560, "方块合合合", {
        color: "#263241",
        fontSize: "58px",
        fontStyle: "900"
      })
      .setOrigin(0.5);
    this.add
      .text(360, 640, "准备棋盘中...", {
        color: "#65758b",
        fontSize: "26px",
        fontStyle: "700"
      })
      .setOrigin(0.5);

    const orb = this.add.rectangle(360, 732, 46, 46, COLORS.primary).setStrokeStyle(5, COLORS.ink);
    this.tweens.add({
      targets: orb,
      x: 438,
      yoyo: true,
      repeat: 2,
      duration: 280,
      ease: "Sine.InOut",
      onComplete: () => this.scene.start("MenuScene")
    });
  }
}
