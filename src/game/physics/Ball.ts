import type Phaser from "phaser";
import { BALL_RADIUS, COLORS, DEPTHS, MAX_BALL_SPEED } from "../utils/constants";
import { clampVector } from "../utils/math";
import type { Point } from "../utils/types";

export class Ball {
  readonly body: MatterJS.BodyType;

  private readonly scene: Phaser.Scene;
  private readonly shell: Phaser.GameObjects.Arc;
  private readonly core: Phaser.GameObjects.Arc;
  private readonly glint: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, start: Point) {
    this.scene = scene;
    this.body = scene.matter.add.circle(start.x, start.y, BALL_RADIUS, {
      label: "ball",
      restitution: 0.28,
      friction: 0.018,
      frictionAir: 0.006,
      density: 0.002
    });

    scene.matter.body.setInertia(this.body, Number.POSITIVE_INFINITY);

    this.shell = scene.add.circle(start.x, start.y, BALL_RADIUS, COLORS.ink).setDepth(DEPTHS.ball);
    this.core = scene.add.circle(start.x - 4, start.y - 5, BALL_RADIUS - 7, 0x6ad7ff).setDepth(DEPTHS.ball + 1);
    this.glint = scene.add.circle(start.x - 9, start.y - 11, 5, 0xffffff, 0.82).setDepth(DEPTHS.ball + 2);
  }

  update(): void {
    const velocity = clampVector(this.body.velocity.x, this.body.velocity.y, MAX_BALL_SPEED);
    this.scene.matter.body.setVelocity(this.body, velocity);

    this.shell.setPosition(this.body.position.x, this.body.position.y);
    this.core.setPosition(this.body.position.x - 4, this.body.position.y - 5);
    this.glint.setPosition(this.body.position.x - 9, this.body.position.y - 11);
  }

  setPosition(point: Point): void {
    this.scene.matter.body.setPosition(this.body, point);
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
    this.update();
  }

  applyImpulse(forceX: number, forceY: number): void {
    this.scene.matter.body.applyForce(this.body, this.body.position, { x: forceX, y: forceY });
    this.scene.tweens.add({
      targets: [this.shell, this.core],
      scale: { from: 1.18, to: 1 },
      duration: 160,
      ease: "Back.Out"
    });
  }

  nudge(velocityX: number, velocityY: number): void {
    this.scene.matter.body.setVelocity(this.body, {
      x: this.body.velocity.x + velocityX,
      y: this.body.velocity.y + velocityY
    });
  }

  destroy(): void {
    this.scene.matter.world.remove(this.body);
    this.shell.destroy();
    this.core.destroy();
    this.glint.destroy();
  }
}
