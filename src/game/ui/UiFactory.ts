import type Phaser from "phaser";
import { COLORS, DEPTHS } from "../utils/constants";

interface ButtonOptions {
  width?: number;
  height?: number;
  fill?: number;
  stroke?: number;
  textColor?: string;
  fontSize?: number;
  disabled?: boolean;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {}
): Phaser.GameObjects.Container {
  const width = options.width ?? 260;
  const height = options.height ?? 72;
  const fill = options.disabled ? 0xb9c4d0 : options.fill ?? COLORS.primary;
  const stroke = options.stroke ?? COLORS.ink;
  const alpha = options.disabled ? 0.58 : 1;

  const background = scene.add
    .rectangle(0, 0, width, height, fill, alpha)
    .setStrokeStyle(3, stroke, alpha)
    .setOrigin(0.5);
  const text = scene.add
    .text(0, 0, label, {
      color: options.textColor ?? "#ffffff",
      fontSize: `${options.fontSize ?? 28}px`,
      fontStyle: "700",
      align: "center"
    })
    .setOrigin(0.5);

  const button = scene.add.container(x, y, [background, text]).setDepth(DEPTHS.ui);
  button.setSize(width, height);

  if (!options.disabled) {
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => {
      scene.tweens.add({
        targets: button,
        scale: 0.96,
        yoyo: true,
        duration: 90,
        ease: "Quad.Out"
      });
      onClick();
    });
  }

  return button;
}

export function createScreenTitle(scene: Phaser.Scene, title: string, subtitle?: string): void {
  scene.add
    .text(360, 178, title, {
      color: "#263241",
      fontSize: "64px",
      fontStyle: "900",
      align: "center"
    })
    .setOrigin(0.5)
    .setDepth(DEPTHS.ui);

  if (subtitle) {
    scene.add
      .text(360, 242, subtitle, {
        color: "#65758b",
        fontSize: "24px",
        fontStyle: "600",
        align: "center",
        wordWrap: { width: 560 }
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui);
  }
}

export function drawToyBackground(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor(COLORS.backgroundBottom);

  const graphics = scene.add.graphics().setDepth(0);
  graphics.fillGradientStyle(
    COLORS.backgroundTop,
    COLORS.backgroundTop,
    COLORS.backgroundBottom,
    COLORS.backgroundBottom,
    1
  );
  graphics.fillRect(0, 0, 720, 1280);

  graphics.fillStyle(0xffffff, 0.5);
  for (let y = 120; y < 1180; y += 120) {
    graphics.fillCircle(82, y, 4);
    graphics.fillCircle(638, y + 44, 4);
  }

  graphics.lineStyle(2, 0xc7d8e6, 0.42);
  for (let y = 120; y <= 1120; y += 80) {
    graphics.lineBetween(70, y, 650, y);
  }
}

export function starText(stars: number): string {
  return "★".repeat(stars).padEnd(3, "☆");
}
