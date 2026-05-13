import Phaser from "phaser";
import { COLORS } from "../utils/constants";
import { clamp } from "../utils/math";
import type { RotatorMechanismConfig } from "../utils/types";
import type { PlayScene } from "../scenes/PlayScene";
import { BaseMechanism } from "./BaseMechanism";

export class RotatorMechanism extends BaseMechanism<RotatorMechanismConfig> {
  private readonly platform: Phaser.GameObjects.Rectangle;
  private readonly pivot: Phaser.GameObjects.Arc;
  private angleDegrees: number;

  constructor(scene: PlayScene, config: RotatorMechanismConfig) {
    super(scene, config);
    this.angleDegrees = config.angle;
    this.addStaticRectangle(config.x, config.y, config.width, config.height, config.angle);

    this.platform = scene.add
      .rectangle(config.x, config.y, config.width, config.height, COLORS.yellow)
      .setStrokeStyle(4, COLORS.ink)
      .setRotation(Phaser.Math.DegToRad(config.angle));
    this.pivot = scene.add.circle(config.x, config.y, 20, COLORS.ink).setAlpha(0.9);
    this.register(this.platform);
    this.register(this.pivot);

    if (config.controllable) {
      this.platform.setInteractive({ draggable: true, useHandCursor: true });
      scene.input.setDraggable(this.platform);
      this.platform.on("drag", (pointer: Phaser.Input.Pointer) => this.handleDrag(pointer));
    }
  }

  override trigger(): void {
    const target = this.config.targetAngle ?? (this.angleDegrees === this.config.minAngle ? this.config.maxAngle : this.config.minAngle);
    this.setAngle(target, true);
  }

  private handleDrag(pointer: Phaser.Input.Pointer): void {
    const rawAngle = Phaser.Math.RadToDeg(Math.atan2(pointer.y - this.config.y, pointer.x - this.config.x));
    this.setAngle(clamp(rawAngle, this.config.minAngle, this.config.maxAngle));
  }

  private setAngle(angle: number, animated = false): void {
    this.angleDegrees = clamp(angle, this.config.minAngle, this.config.maxAngle);
    this.setBodyAngleDegrees(this.angleDegrees);

    if (animated) {
      this.scene.tweens.add({
        targets: this.platform,
        rotation: Phaser.Math.DegToRad(this.angleDegrees),
        duration: 180,
        ease: "Sine.Out"
      });
      return;
    }

    this.platform.setRotation(Phaser.Math.DegToRad(this.angleDegrees));
  }
}
