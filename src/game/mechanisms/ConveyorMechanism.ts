import type Phaser from "phaser";
import { BALL_RADIUS, COLORS } from "../utils/constants";
import type { ConveyorMechanismConfig } from "../utils/types";
import type { PlayScene } from "../scenes/PlayScene";
import { BaseMechanism } from "./BaseMechanism";

export class ConveyorMechanism extends BaseMechanism<ConveyorMechanismConfig> {
  private readonly belt: Phaser.GameObjects.Rectangle;
  private readonly stripes: Phaser.GameObjects.Rectangle[] = [];
  private active: boolean;

  constructor(scene: PlayScene, config: ConveyorMechanismConfig) {
    super(scene, config);
    this.active = config.active;

    this.addStaticRectangle(config.x, config.y, config.width, config.height, 0, {
      isSensor: true
    });

    this.belt = scene.add
      .rectangle(config.x, config.y, config.width, config.height, this.active ? COLORS.primary : COLORS.track)
      .setStrokeStyle(4, COLORS.ink);
    this.register(this.belt);

    const stripeCount = Math.max(3, Math.floor(config.width / 46));
    for (let index = 0; index < stripeCount; index += 1) {
      const offset = (index - (stripeCount - 1) / 2) * 46;
      const stripe = scene.add.rectangle(config.x + offset, config.y, 18, config.height + 6, 0xffffff, 0.45);
      this.register(stripe);
      this.stripes.push(stripe);
    }
  }

  override update(): void {
    if (!this.active) {
      return;
    }

    const ball = this.scene.getBall();
    const position = ball.body.position;
    const isInside =
      Math.abs(position.x - this.config.x) <= this.config.width / 2 + BALL_RADIUS &&
      Math.abs(position.y - this.config.y) <= this.config.height / 2 + BALL_RADIUS;

    if (!isInside) {
      return;
    }

    const speed = this.config.speed / 60;
    const direction = this.config.direction;
    const x = direction === "right" ? speed : direction === "left" ? -speed : 0;
    const y = direction === "down" ? speed : direction === "up" ? -speed : 0;
    ball.nudge(x, y);

    for (const stripe of this.stripes) {
      stripe.alpha = 0.72;
    }
  }

  override trigger(): void {
    this.active = !this.active;
    this.belt.setFillStyle(this.active ? COLORS.primary : COLORS.track);
    this.scene.tweens.add({
      targets: this.belt,
      scaleY: 1.22,
      yoyo: true,
      duration: 120,
      ease: "Quad.Out"
    });
  }
}
