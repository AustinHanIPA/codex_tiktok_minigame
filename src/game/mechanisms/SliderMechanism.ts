import type Phaser from "phaser";
import { COLORS } from "../utils/constants";
import { clamp } from "../utils/math";
import type { SliderMechanismConfig } from "../utils/types";
import type { PlayScene } from "../scenes/PlayScene";
import { BaseMechanism } from "./BaseMechanism";

export class SliderMechanism extends BaseMechanism<SliderMechanismConfig> {
  private readonly rail: Phaser.GameObjects.Rectangle;
  private readonly plank: Phaser.GameObjects.Rectangle;
  private open = false;

  constructor(scene: PlayScene, config: SliderMechanismConfig) {
    super(scene, config);

    const startValue = config.startAtMax ? config.max : config[config.axis];
    const startX = config.axis === "x" ? startValue : config.x;
    const startY = config.axis === "y" ? startValue : config.y;

    this.addStaticRectangle(startX, startY, config.width, config.height);
    this.rail = scene.add
      .rectangle(
        config.axis === "x" ? (config.min + config.max) / 2 : config.x,
        config.axis === "y" ? (config.min + config.max) / 2 : config.y,
        config.axis === "x" ? Math.abs(config.max - config.min) + config.width : 18,
        config.axis === "y" ? Math.abs(config.max - config.min) + config.height : 18,
        0xffffff,
        0.32
      )
      .setStrokeStyle(2, COLORS.panelStroke, 0.75);
    this.plank = scene.add
      .rectangle(startX, startY, config.width, config.height, COLORS.green)
      .setStrokeStyle(4, COLORS.ink);

    this.register(this.rail);
    this.register(this.plank);

    if (config.controllable) {
      this.plank.setInteractive({ draggable: true, useHandCursor: true });
      scene.input.setDraggable(this.plank);
      this.plank.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        this.moveTo(config.axis === "x" ? dragX : config.x, config.axis === "y" ? dragY : config.y);
      });
    }
  }

  override trigger(): void {
    this.open = !this.open;
    const targetValue = this.open ? this.config.max : this.config.min;
    const target = {
      x: this.config.axis === "x" ? targetValue : this.config.x,
      y: this.config.axis === "y" ? targetValue : this.config.y
    };

    this.scene.tweens.add({
      targets: this.plank,
      x: target.x,
      y: target.y,
      duration: 220,
      ease: "Sine.Out",
      onUpdate: () => this.setBodyPosition(this.plank.x, this.plank.y)
    });
  }

  private moveTo(x: number, y: number): void {
    const clamped = {
      x: this.config.axis === "x" ? clamp(x, this.config.min, this.config.max) : this.config.x,
      y: this.config.axis === "y" ? clamp(y, this.config.min, this.config.max) : this.config.y
    };

    this.plank.setPosition(clamped.x, clamped.y);
    this.setBodyPosition(clamped.x, clamped.y);
  }
}
