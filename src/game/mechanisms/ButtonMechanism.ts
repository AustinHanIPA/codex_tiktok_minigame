import type Phaser from "phaser";
import { COLORS } from "../utils/constants";
import type { ButtonMechanismConfig } from "../utils/types";
import type { PlayScene } from "../scenes/PlayScene";
import { BaseMechanism } from "./BaseMechanism";

export class ButtonMechanism extends BaseMechanism<ButtonMechanismConfig> {
  private readonly face: Phaser.GameObjects.Arc;
  private readonly cap: Phaser.GameObjects.Arc;
  private used = false;
  private nextReadyAt = 0;

  constructor(scene: PlayScene, config: ButtonMechanismConfig) {
    super(scene, config);

    this.face = scene.add.circle(config.x, config.y, 34, COLORS.blue).setStrokeStyle(5, COLORS.ink);
    this.cap = scene.add.circle(config.x, config.y - 8, 20, 0x9ce3ff, 0.96);
    const label = scene.add.text(config.x, config.y + 52, "按钮", {
      color: "#263241",
      fontSize: "20px",
      fontStyle: "700"
    }).setOrigin(0.5);

    this.face.setInteractive({ useHandCursor: true });
    this.face.on("pointerdown", () => this.press());

    this.register(this.face);
    this.register(this.cap);
    this.register(label);
  }

  private press(): void {
    if (this.used || this.scene.time.now < this.nextReadyAt) {
      return;
    }

    this.used = this.config.once;
    this.nextReadyAt = this.scene.time.now + (this.config.cooldown ?? 450);
    this.scene.triggerMechanisms(this.config.targetIds);
    this.scene.pulseAt(this.config.x, this.config.y, COLORS.blue);

    this.scene.tweens.add({
      targets: this.cap,
      y: this.config.y + 4,
      yoyo: true,
      duration: 110,
      ease: "Quad.Out"
    });

    if (this.used) {
      this.face.disableInteractive();
      this.face.setAlpha(0.55);
      this.cap.setAlpha(0.55);
    }
  }
}
