import Phaser from "phaser";
import { BLOCK_COLORS, CELL_SIZE, COLORS, DEPTHS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";

/** 当前活跃粒子数（全局计数），超过上限时跳过新粒子创建 */
let activeParticleCount = 0;
const MAX_ACTIVE_PARTICLES = 80;

/**
 * 重置粒子计数器。应在场景 shutdown 时调用，
 * 防止 tween 未正常走到 onComplete 导致计数永不归零。
 */
export function resetParticleCount(): void {
  activeParticleCount = 0;
}

/**
 * 合成粒子特效：方块合并时发出彩色粒子爆炸
 */
export function showMergeParticles(
  scene: Phaser.Scene,
  worldX: number,
  worldY: number,
  value: number,
  cellCount: number
): void {
  const blockColor = BLOCK_COLORS[value * 2] ?? BLOCK_COLORS[value] ?? { fill: COLORS.yellow };
  const baseColor = blockColor.fill;
  const budget = MAX_ACTIVE_PARTICLES - activeParticleCount;

  if (budget <= 0) {
    return;
  }

  const desiredCount = Math.min(6 + cellCount * 3, 18);
  const particleCount = Math.min(desiredCount, budget);
  const spread = CELL_SIZE * 0.7;

  for (let i = 0; i < particleCount; i += 1) {
    const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.4;
    const distance = spread + Math.random() * spread * 0.6;
    const targetX = worldX + Math.cos(angle) * distance;
    const targetY = worldY + Math.sin(angle) * distance;

    const size = 6 + Math.random() * 8;
    const colorVariant = Phaser.Display.Color.IntegerToColor(baseColor);
    const shift = Math.floor(Math.random() * 20);
    if (Math.random() < 0.5) {
      colorVariant.brighten(shift);
    } else {
      colorVariant.darken(shift);
    }
    const finalColor = colorVariant.color;

    const particle = scene.add
      .rectangle(worldX, worldY, size, size, finalColor)
      .setDepth(DEPTHS.effects + 1)
      .setAngle(Math.random() * 360);

    activeParticleCount += 1;

    scene.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY,
      angle: particle.angle + Phaser.Math.Between(-90, 90),
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: 360 + Math.random() * 180,
      ease: "Quad.Out",
      onComplete: () => {
        particle.destroy();
        activeParticleCount = Math.max(0, activeParticleCount - 1);
      }
    });
  }

  // 中心闪光环
  const ring = scene.add
    .circle(worldX, worldY, 12, baseColor, 0.5)
    .setDepth(DEPTHS.effects);

  scene.tweens.add({
    targets: ring,
    scale: 3.5,
    alpha: 0,
    duration: 320,
    ease: "Quad.Out",
    onComplete: () => ring.destroy()
  });
}

/**
 * 连锁合成时的数字飘出特效
 */
export function showMergeValuePopup(
  scene: Phaser.Scene,
  worldX: number,
  worldY: number,
  newValue: number
): void {
  const text = scene.add
    .text(worldX, worldY, `${newValue}`, {
      color: "#ffffff",
      fontSize: "32px",
      fontStyle: "900",
      stroke: "#263241",
      strokeThickness: 5
    })
    .setOrigin(0.5)
    .setDepth(DEPTHS.effects + 2);

  scene.tweens.add({
    targets: text,
    y: worldY - 48,
    scale: 1.3,
    alpha: 0,
    duration: 560,
    ease: "Quad.Out",
    onComplete: () => text.destroy()
  });
}

/**
 * 通关时的星星点亮动画
 */
export function showStarAnimation(
  scene: Phaser.Scene,
  centerX: number,
  centerY: number,
  stars: 1 | 2 | 3,
  onComplete?: () => void
): void {
  const starSize = 52;
  const starGap = 66;
  const starObjects: Phaser.GameObjects.Text[] = [];

  for (let i = 0; i < 3; i += 1) {
    const x = centerX + (i - 1) * starGap;
    const isFilled = i < stars;
    const star = scene.add
      .text(x, centerY, isFilled ? "★" : "☆", {
        color: isFilled ? "#ffb703" : "#c7c7c7",
        fontSize: `${starSize}px`,
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 3)
      .setScale(0)
      .setAlpha(0);

    starObjects.push(star);
  }

  starObjects.forEach((star, index) => {
    scene.tweens.add({
      targets: star,
      scale: 1,
      alpha: 1,
      delay: 200 + index * 260,
      duration: 320,
      ease: "Back.Out",
      onComplete: () => {
        // 点亮时的闪烁
        if (index < stars) {
          scene.tweens.add({
            targets: star,
            scale: 1.2,
            yoyo: true,
            duration: 140,
            ease: "Quad.Out"
          });
        }

        if (index === 2 && onComplete) {
          scene.time.delayedCall(200, onComplete);
        }
      }
    });
  });
}

/**
 * 失败时的屏幕震动和红色闪烁
 */
export function showFailEffect(scene: Phaser.Scene): void {
  // 红色闪烁覆盖层
  const flash = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.red, 0.18)
    .setDepth(DEPTHS.effects + 5);

  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 400,
    ease: "Quad.Out",
    onComplete: () => flash.destroy()
  });

  // 棋盘方块震动效果（通过摄像头）
  scene.cameras.main.shake(200, 0.006);
}

/** Data key 用于存储上次 combo scale tween 引用 */
const COMBO_TWEEN_KEY = "__comboScaleTween";

/**
 * 连锁 combo 爆发时的棋盘方块就地脉冲反馈。
 * 遍历容器内每个子 sprite 做就地缩放（围绕自身中心），
 * 避免容器原点 (0,0) 导致整体偏移。
 *
 * 仅取消先前由本函数创建的 combo tween，不影响其它动画（如落地弹跳、合并移动等）。
 */
export function showComboImpact(scene: Phaser.Scene, comboCount: number, target?: Phaser.GameObjects.Container): void {
  if (!target || target.length === 0) {
    return;
  }

  const intensity = Math.min(1.04 + comboCount * 0.008, 1.1);
  const children = target.getAll() as Phaser.GameObjects.Container[];

  for (const child of children) {
    // 仅停止上一个 combo scale tween（不影响其他 tween）
    const prevTween = child.getData(COMBO_TWEEN_KEY) as Phaser.Tweens.Tween | undefined;
    if (prevTween && prevTween.isPlaying()) {
      prevTween.stop();
      child.setScale(1);
    }

    const tween = scene.tweens.add({
      targets: child,
      scaleX: intensity,
      scaleY: intensity,
      duration: 80,
      yoyo: true,
      ease: "Quad.Out",
      onComplete: () => {
        child.setScale(1);
        child.setData(COMBO_TWEEN_KEY, null);
      }
    });

    child.setData(COMBO_TWEEN_KEY, tween);
  }
}
