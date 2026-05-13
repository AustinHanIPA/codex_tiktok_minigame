import Phaser from "phaser";
import { EventTracker } from "../data/EventTracker";
import { SaveManager } from "../data/SaveManager";
import { getLevel, LEVELS } from "../levels";
import { createMechanism, type Mechanism } from "../mechanisms";
import { Ball } from "../physics/Ball";
import { PlatformService } from "../platform/PlatformService";
import { createButton, drawToyBackground, starText } from "../ui/UiFactory";
import { COLORS, DEPTHS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { degreesToRadians } from "../utils/math";
import { formatTime, getStarsForTime } from "../utils/scoring";
import type { LevelConfig, LevelResult, PlayState, StaticBodyConfig } from "../utils/types";

interface PlaySceneData {
  levelId?: number;
}

export class PlayScene extends Phaser.Scene {
  private level!: LevelConfig;
  private ball!: Ball;
  private state: PlayState = "ready";
  private startedAt = 0;
  private pauseStartedAt = 0;
  private elapsed = 0;
  private readonly mechanisms = new Map<string, Mechanism>();
  private timerText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private goalRing!: Phaser.GameObjects.Arc;

  constructor() {
    super("PlayScene");
  }

  init(data: PlaySceneData): void {
    this.level = getLevel(data.levelId ?? 1);
    this.state = "ready";
    this.startedAt = 0;
    this.pauseStartedAt = 0;
    this.elapsed = 0;
    this.mechanisms.clear();
  }

  create(): void {
    drawToyBackground(this);
    this.matter.world.resume();
    this.matter.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT, 56, true, true, true, false);
    this.matter.world.setGravity(0, 0);

    this.drawPlayfield();
    this.createStaticBodies();
    this.createGoal();
    this.ball = new Ball(this, this.level.ballStart);
    this.createMechanisms();
    this.createHud();
    this.startCountdown();

    EventTracker.track("level_start", { level_id: this.level.id });
  }

  update(): void {
    if (!this.ball || this.state === "complete" || this.state === "failed") {
      return;
    }

    this.ball.update();
    for (const mechanism of this.mechanisms.values()) {
      mechanism.update();
    }

    this.updateGoalPulse();

    if (this.state !== "playing") {
      return;
    }

    this.elapsed = (this.time.now - this.startedAt) / 1000;
    this.timerText.setText(formatTime(this.elapsed));

    if (this.elapsed > this.level.timeLimit) {
      this.failLevel("timeout");
      return;
    }

    if (this.ball.body.position.y > GAME_HEIGHT + 120) {
      this.failLevel("fall");
      return;
    }

    const distanceToGoal = Phaser.Math.Distance.Between(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.level.goal.x,
      this.level.goal.y
    );

    if (distanceToGoal <= this.level.goal.radius) {
      this.completeLevel();
    }
  }

  getBall(): Ball {
    return this.ball;
  }

  triggerMechanisms(targetIds: string[]): void {
    for (const targetId of targetIds) {
      this.mechanisms.get(targetId)?.trigger();
    }
  }

  pulseAt(x: number, y: number, color: number): void {
    const pulse = this.add.circle(x, y, 18, color, 0.35).setDepth(DEPTHS.effects);
    this.tweens.add({
      targets: pulse,
      scale: 3.8,
      alpha: 0,
      duration: 320,
      ease: "Quad.Out",
      onComplete: () => pulse.destroy()
    });
  }

  private drawPlayfield(): void {
    const graphics = this.add.graphics().setDepth(DEPTHS.board);
    graphics.fillStyle(0xffffff, 0.36);
    graphics.fillRect(56, 116, 608, 1022);
    graphics.lineStyle(4, 0xb7c7d8, 0.8);
    graphics.strokeRect(56, 116, 608, 1022);
  }

  private createStaticBodies(): void {
    for (const bodyConfig of this.level.staticBodies) {
      this.createStaticBody(bodyConfig);
    }
  }

  private createStaticBody(config: StaticBodyConfig): void {
    const color = config.color ?? COLORS.track;

    if (config.type === "circle") {
      const radius = config.radius ?? 20;
      this.matter.add.circle(config.x, config.y, radius, {
        isStatic: true,
        friction: 0.8,
        restitution: 0.08
      });
      this.add.circle(config.x, config.y, radius, color).setStrokeStyle(3, COLORS.ink).setDepth(DEPTHS.board + 1);
      return;
    }

    const width = config.width ?? 120;
    const height = config.height ?? 28;
    const rotation = degreesToRadians(config.angle ?? 0);
    this.matter.add.rectangle(config.x, config.y, width, height, {
      isStatic: true,
      angle: rotation,
      friction: 0.9,
      restitution: 0.05
    });
    this.add
      .rectangle(config.x, config.y, width, height, color)
      .setStrokeStyle(3, COLORS.ink, 0.9)
      .setRotation(rotation)
      .setDepth(DEPTHS.board + 1);
  }

  private createGoal(): void {
    this.add.circle(this.level.goal.x, this.level.goal.y, this.level.goal.radius, COLORS.green, 0.24).setDepth(DEPTHS.board + 1);
    this.goalRing = this.add
      .circle(this.level.goal.x, this.level.goal.y, this.level.goal.radius, COLORS.green, 0)
      .setStrokeStyle(7, COLORS.green)
      .setDepth(DEPTHS.board + 2);
    this.add
      .text(this.level.goal.x, this.level.goal.y, "终点", {
        color: "#263241",
        fontSize: "22px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.board + 3);
  }

  private createMechanisms(): void {
    for (const mechanismConfig of this.level.mechanisms) {
      const mechanism = createMechanism(this, mechanismConfig);
      this.mechanisms.set(mechanism.id, mechanism);
    }
  }

  private createHud(): void {
    this.add
      .text(72, 34, `第 ${this.level.id} 关  ${this.level.name}`, {
        color: "#263241",
        fontSize: "26px",
        fontStyle: "900"
      })
      .setDepth(DEPTHS.ui);

    this.timerText = this.add
      .text(612, 34, "0.0s", {
        color: "#263241",
        fontSize: "28px",
        fontStyle: "900"
      })
      .setOrigin(1, 0)
      .setDepth(DEPTHS.ui);

    createButton(this, 122, 1202, "选关", () => this.scene.start("LevelSelectScene"), {
      width: 150,
      height: 58,
      fill: COLORS.panel,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, 294, 1202, "重开", () => this.restartLevel("manual"), {
      width: 150,
      height: 58,
      fill: COLORS.orange,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, 466, 1202, "提示", () => this.showHint(), {
      width: 150,
      height: 58,
      fill: COLORS.yellow,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, 622, 1202, "暂停", () => this.pauseLevel(), {
      width: 118,
      height: 58,
      fill: COLORS.panel,
      textColor: "#263241",
      fontSize: 22
    });

    this.hintText = this.add
      .text(360, 104, this.level.hint, {
        color: "#263241",
        fontSize: "21px",
        fontStyle: "700",
        align: "center",
        wordWrap: { width: 560 }
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui)
      .setAlpha(0);
  }

  private startCountdown(): void {
    let count = 3;
    this.countdownText = this.add
      .text(360, 598, `${count}`, {
        color: "#263241",
        fontSize: "120px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal);

    this.time.addEvent({
      delay: 650,
      repeat: 3,
      callback: () => {
        count -= 1;

        if (count > 0) {
          this.countdownText.setText(`${count}`);
          return;
        }

        if (count === 0) {
          this.countdownText.setText("GO");
          return;
        }

        this.countdownText.destroy();
        this.startPlaying();
      }
    });
  }

  private startPlaying(): void {
    this.state = "playing";
    this.startedAt = this.time.now;
    this.matter.world.setGravity(0, 1.05);
  }

  private updateGoalPulse(): void {
    if (!this.goalRing) {
      return;
    }

    this.goalRing.setScale(1 + Math.sin(this.time.now / 220) * 0.035);
  }

  private completeLevel(): void {
    if (this.state !== "playing") {
      return;
    }

    const stars = getStarsForTime(this.elapsed, this.level.starTimes);
    if (stars === 0) {
      this.failLevel("overtime_goal");
      return;
    }

    this.state = "complete";
    this.matter.world.pause();
    PlatformService.getInstance().vibrateShort();
    this.playConfetti();

    const previousBest = SaveManager.load().levels[this.level.id]?.bestTime ?? null;
    const updated = SaveManager.updateLevel(this.level.id, this.elapsed, stars);
    const result: LevelResult = {
      levelId: this.level.id,
      elapsed: this.elapsed,
      stars,
      bestTime: updated.bestTime,
      isNewBest: previousBest === null || this.elapsed <= previousBest
    };

    EventTracker.track("level_complete", {
      level_id: this.level.id,
      time: Number(this.elapsed.toFixed(1)),
      stars
    });
    this.showResultPanel(result);
  }

  private failLevel(reason: string): void {
    if (this.state === "failed" || this.state === "complete") {
      return;
    }

    this.state = "failed";
    this.matter.world.pause();
    PlatformService.getInstance().vibrateShort();
    this.cameras.main.shake(140, 0.006);
    EventTracker.track("level_fail", {
      level_id: this.level.id,
      reason,
      time: Number(this.elapsed.toFixed(1))
    });
    this.showFailPanel(reason);
  }

  private restartLevel(reason: string): void {
    EventTracker.track("level_restart", { level_id: this.level.id, fail_reason: reason });
    this.scene.restart({ levelId: this.level.id });
  }

  private pauseLevel(): void {
    if (this.state !== "playing") {
      return;
    }

    this.state = "paused";
    this.pauseStartedAt = this.time.now;
    this.matter.world.pause();

    const shade = this.add.rectangle(360, 640, 720, 1280, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(360, 640, 480, 350, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    const title = this.add
      .text(360, 540, "已暂停", {
        color: "#263241",
        fontSize: "40px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);

    const controls: Phaser.GameObjects.Container[] = [];
    const cleanup = () => {
      shade.destroy();
      panel.destroy();
      title.destroy();
      for (const control of controls) {
        control.destroy();
      }
    };
    const resumeButton = createButton(this, 360, 638, "继续", () => {
      cleanup();
      this.startedAt += this.time.now - this.pauseStartedAt;
      this.state = "playing";
      this.matter.world.resume();
    }, {
      width: 280,
      height: 68,
      fill: COLORS.green,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    const selectButton = createButton(this, 360, 728, "返回选关", () => this.scene.start("LevelSelectScene"), {
      width: 280,
      height: 68,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    controls.push(resumeButton, selectButton);
  }

  private showHint(): void {
    EventTracker.track("hint_click", { level_id: this.level.id });
    this.hintText.setAlpha(1);
    this.tweens.add({
      targets: this.hintText,
      alpha: 0,
      delay: 2400,
      duration: 320,
      ease: "Quad.Out"
    });
  }

  private showResultPanel(result: LevelResult): void {
    const shade = this.add.rectangle(360, 640, 720, 1280, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(360, 640, 530, 520, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    this.add
      .text(360, 450, "通关成功", {
        color: "#263241",
        fontSize: "42px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    this.add
      .text(360, 520, starText(result.stars), {
        color: "#ffb703",
        fontSize: "58px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    this.add
      .text(
        360,
        596,
        `用时 ${formatTime(result.elapsed)}\n最佳 ${result.bestTime === null ? "--" : formatTime(result.bestTime)}${
          result.isNewBest ? "\n新纪录" : ""
        }`,
        {
          color: "#263241",
          fontSize: "26px",
          fontStyle: "700",
          align: "center"
        }
      )
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);

    const nextLevel = Math.min(result.levelId + 1, LEVELS.length);
    createButton(this, 360, 724, result.levelId === LEVELS.length ? "回到选关" : "下一关", () => {
      this.scene.start(result.levelId === LEVELS.length ? "LevelSelectScene" : "PlayScene", { levelId: nextLevel });
    }, {
      width: 300,
      height: 64,
      fill: COLORS.primary
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, 360, 804, "重玩", () => this.restartLevel("result_retry"), {
      width: 300,
      height: 64,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, 360, 884, "分享成绩", () => {
      PlatformService.getInstance().shareScore(result.levelId, result.elapsed, result.stars);
    }, {
      width: 300,
      height: 64,
      fill: COLORS.yellow,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);

    shade.setInteractive();
    panel.setInteractive();
  }

  private showFailPanel(reason: string): void {
    const reasonLabel = reason === "timeout" ? "时间耗尽" : "球球掉出机关";
    const shade = this.add.rectangle(360, 640, 720, 1280, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(360, 640, 520, 420, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    this.add
      .text(360, 520, "挑战失败", {
        color: "#263241",
        fontSize: "42px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    this.add
      .text(360, 585, reasonLabel, {
        color: "#65758b",
        fontSize: "26px",
        fontStyle: "700"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);

    createButton(this, 360, 680, "重新挑战", () => this.restartLevel(reason), {
      width: 300,
      height: 64,
      fill: COLORS.primary
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, 360, 760, "看广告复活", () => {
      void PlatformService.getInstance().showRewardedAd("revive").then(() => this.restartLevel("rewarded_revive"));
    }, {
      width: 300,
      height: 64,
      fill: COLORS.yellow,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, 360, 840, "返回选关", () => this.scene.start("LevelSelectScene"), {
      width: 300,
      height: 64,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);

    shade.setInteractive();
    panel.setInteractive();
  }

  private playConfetti(): void {
    for (let index = 0; index < 22; index += 1) {
      const angle = (Math.PI * 2 * index) / 22;
      const color = [COLORS.yellow, COLORS.green, COLORS.blue, COLORS.orange][index % 4];
      const piece = this.add.rectangle(this.level.goal.x, this.level.goal.y, 14, 22, color).setDepth(DEPTHS.effects);
      this.tweens.add({
        targets: piece,
        x: this.level.goal.x + Math.cos(angle) * Phaser.Math.Between(80, 180),
        y: this.level.goal.y + Math.sin(angle) * Phaser.Math.Between(80, 180),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: 720,
        ease: "Quad.Out",
        onComplete: () => piece.destroy()
      });
    }
  }
}
