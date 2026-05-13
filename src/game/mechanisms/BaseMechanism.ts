import type Phaser from "phaser";
import { DEPTHS } from "../utils/constants";
import { degreesToRadians } from "../utils/math";
import type { MechanismConfig } from "../utils/types";
import type { PlayScene } from "../scenes/PlayScene";

export abstract class BaseMechanism<TConfig extends MechanismConfig = MechanismConfig> {
  readonly id: string;
  readonly type: TConfig["type"];

  protected readonly scene: PlayScene;
  protected readonly config: TConfig;
  protected body: MatterJS.BodyType | null = null;
  protected readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: PlayScene, config: TConfig) {
    this.scene = scene;
    this.config = config;
    this.id = config.id;
    this.type = config.type;
  }

  update(): void {
    return;
  }

  trigger(): void {
    return;
  }

  destroy(): void {
    if (this.body) {
      this.scene.matter.world.remove(this.body);
    }

    for (const object of this.objects) {
      object.destroy();
    }
  }

  protected addStaticRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    angleDegrees = 0,
    options: MatterJS.IBodyDefinition = {}
  ): MatterJS.BodyType {
    const body = this.scene.matter.add.rectangle(x, y, width, height, {
      isStatic: true,
      angle: degreesToRadians(angleDegrees),
      friction: 0.85,
      restitution: 0.08,
      ...options
    });
    this.body = body;
    return body;
  }

  protected setBodyPosition(x: number, y: number): void {
    if (!this.body) {
      return;
    }

    this.scene.matter.body.setPosition(this.body, { x, y });
  }

  protected setBodyAngleDegrees(angle: number): void {
    if (!this.body) {
      return;
    }

    this.scene.matter.body.setAngle(this.body, degreesToRadians(angle));
  }

  protected register<TObject extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth>(object: TObject): void {
    object.setDepth(DEPTHS.mechanism);
    this.objects.push(object);
  }
}
