import type { MechanismConfig } from "../utils/types";
import type { PlayScene } from "../scenes/PlayScene";
import type { BaseMechanism } from "./BaseMechanism";
import { ButtonMechanism } from "./ButtonMechanism";
import { ConveyorMechanism } from "./ConveyorMechanism";
import { LauncherMechanism } from "./LauncherMechanism";
import { RotatorMechanism } from "./RotatorMechanism";
import { SliderMechanism } from "./SliderMechanism";

export type Mechanism = BaseMechanism;

export function createMechanism(scene: PlayScene, config: MechanismConfig): Mechanism {
  switch (config.type) {
    case "button":
      return new ButtonMechanism(scene, config);
    case "rotator":
      return new RotatorMechanism(scene, config);
    case "slider":
      return new SliderMechanism(scene, config);
    case "launcher":
      return new LauncherMechanism(scene, config);
    case "conveyor":
      return new ConveyorMechanism(scene, config);
    default: {
      const exhaustive: never = config;
      throw new Error(`Unsupported mechanism ${(exhaustive as MechanismConfig).type}`);
    }
  }
}
