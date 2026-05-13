import type Phaser from "phaser";
import { COLORS } from "../utils/constants";
import type { LauncherMechanismConfig } from "../utils/types";
import type { PlayScene } from "../scenes/PlayScene";
import { BaseMechanism } from "./BaseMechanism";

export class LauncherMechanism extends BaseMechanism<LauncherMechanismConfig> {
  private readonly base: Phaser.GameObjects.Arc;
  private nextReadyAt = 0;

  constructor(scene: PlayScene, config: LauncherMechanismConfig) {
    super(scene, config);

    const radius = config.radius ?? 38;
    this.base = scene.add.circle(config.x, config.y, radius, COLORS.orange).setStrokeStyle(5, COLORS.ink);
    const arrow = scene.add
      .triangle(config.x, config.y - 3, 0, -22, 38, 0, 0, 22, 0xffffff)
      .setRotation(Math.atan2(config.forceY, config.forceX) + Math.PI / 2);
    const label = scene.add.text(config.x, config.y + 56, "弹射", {
      color: "#263241",
      fontSize: "20px",
      fontStyle: "700"
    }).setOrigin(0.5);

    this.base.setInteractive({ useHandCursor: true });
    this.base.on("pointerdown", () => this.launch());

    this.register(this.base);
    this.register(arrow);
    this.register(label);
  }

  override trigger(): void {
    this.launch();
  }

  private launch(): void {
    if (this.scene.time.now < this.nextReadyAt) {
      return;
    }

    this.nextReadyAt = this.scene.time.now + this.config.cooldown;
    this.scene.getBall().applyImpulse(this.config.forceX, this.config.forceY);
    this.scene.pulseAt(this.config.x, this.config.y, COLORS.orange);
    this.scene.tweens.add({
      targets: this.base,
      scale: { from: 0.82, to: 1 },
      duration: 170,
      ease: "Back.Out"
    });
  }
}
