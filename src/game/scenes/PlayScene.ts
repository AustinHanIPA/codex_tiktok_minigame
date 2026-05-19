import { EventTracker } from "../data/EventTracker";
import { SaveManager } from "../data/SaveManager";
import { showFailEffect, showStarAnimation } from "../effects/ParticleEffects";
import { getLevel, LEVELS } from "../levels";
import { ensureBonusBlocks as computeBonusBlocks } from "../logic/blockQueue";
import { canPlace, cloneGrid, getMaxValue } from "../logic/gridLogic";
import { PlatformService } from "../platform/PlatformService";
import { createButton } from "../ui/UiFactory";
import { SoundService } from "../audio/SoundService";
import {
  CELL_SIZE,
  COLORS,
  DEPTHS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRID_COLS
} from "../utils/constants";
import { getDefeatedPercent, getStarsForSteps } from "../utils/scoring";
import type { LevelConfig, LevelResult } from "../utils/types";
import { BaseGameScene } from "./BaseGameScene";

interface PlaySceneData {
  levelId?: number;
}

export class PlayScene extends BaseGameScene {
  private level!: LevelConfig;
  private nextBlockIndex = 0;
  private bonusBlocks: number[] = [];
  private stepsUsed = 0;
  private bonusSteps = 0;
  private hammerArmed = false;
  private targetText!: Phaser.GameObjects.Text;
  private stepsText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private hammerHintText!: Phaser.GameObjects.Text;

  constructor() {
    super("PlayScene");
  }

  init(data: PlaySceneData): void {
    this.level = getLevel(data.levelId ?? 1);
    this.state = "ready";
    this.grid = cloneGrid(this.level.initialGrid);
    this.activeBlock = null;
    this.nextBlockIndex = 0;
    this.bonusBlocks = [];
    this.stepsUsed = 0;
    this.bonusSteps = 0;
    this.hammerArmed = false;
    this.isResolving = false;
    this.pointerStart = null;
    this.dropTimer = null;
  }

  create(): void {
    this.setupBase();
    this.createHud();
    this.registerBaseInput();
    this.renderGridFull();
    this.startPlaying();

    EventTracker.track("level_start", { level_id: this.level.id, target_value: this.level.targetValue });
  }

  // ─── 抽象方法实现 ───

  protected spawnNextBlock(): void {
    if (this.state !== "playing") {
      return;
    }

    this.ensureBonusBlocks(1);
    const value = this.getBlockQueue()[this.nextBlockIndex];

    if (value === undefined) {
      this.onFail("no_blocks");
      return;
    }

    const spawnX = Math.floor(GRID_COLS / 2);

    if (!canPlace(this.grid, spawnX, 0)) {
      this.onFail("top_blocked");
      return;
    }

    this.nextBlockIndex += 1;
    this.activeBlock = { x: spawnX, y: 0, value };
    this.renderActiveBlock();
    this.updateHud();
  }

  protected onFail(reason: string): void {
    this.failLevel(reason);
  }

  protected onLockComplete(): void {
    this.stepsUsed += 1;
    this.updateHud();
    void this.resolveAfterLock();
  }

  protected override processSwipe(dx: number, dy: number, pointer: Phaser.Input.Pointer): void {
    if (this.hammerArmed) {
      this.tryUseHammer(pointer);
      return;
    }

    super.processSwipe(dx, dy, pointer);
  }

  // ─── 私有方法 ───

  private startPlaying(): void {
    this.state = "playing";
    this.spawnNextBlock();

    if (this.state !== "playing") {
      return;
    }

    this.startDropTimer();
  }

  private async resolveAfterLock(): Promise<void> {
    const result = await this.animateResolution();
    this.isResolving = false;

    const hasBigCombo = result.comboCount >= 3;

    if (hasBigCombo) {
      this.showComboLabel(result.comboCount);
    }

    if (getMaxValue(this.grid) >= this.level.targetValue) {
      if (hasBigCombo) {
        await this.wait(520);
      }

      this.completeLevel();
      return;
    }

    if (this.stepsUsed >= this.getStepLimit()) {
      this.failLevel("step_limit");
      return;
    }

    this.spawnNextBlock();
  }

  private completeLevel(): void {
    if (this.state !== "playing") {
      return;
    }

    this.state = "complete";
    this.dropTimer?.remove(false);
    this.dropTimer = null;
    PlatformService.getInstance().vibrateShort();
    SoundService.play("success");
    this.playConfetti();

    const rawStars = getStarsForSteps(this.stepsUsed, this.level.starSteps);
    const stars = Math.max(1, rawStars) as 1 | 2 | 3;
    const previousBest = SaveManager.load().levels[this.level.id]?.bestSteps ?? null;
    const updated = SaveManager.updateLevel(this.level.id, this.stepsUsed, stars);
    const result: LevelResult = {
      levelId: this.level.id,
      stepsUsed: this.stepsUsed,
      stars,
      targetValue: this.level.targetValue,
      defeatedPercent: getDefeatedPercent(stars, this.stepsUsed),
      bestSteps: updated.bestSteps,
      isNewBestSteps: previousBest === null || this.stepsUsed <= previousBest
    };

    EventTracker.track("level_complete", {
      level_id: this.level.id,
      steps_used: this.stepsUsed,
      stars,
      target_value: this.level.targetValue
    });
    this.showResultPanel(result);
  }

  private failLevel(reason: string): void {
    if (this.state === "failed" || this.state === "complete") {
      return;
    }

    this.state = "failed";
    this.dropTimer?.remove(false);
    this.dropTimer = null;
    this.hammerArmed = false;
    this.activeBlock = null;
    this.renderActiveBlock();
    PlatformService.getInstance().vibrateShort();
    SoundService.play("fail");
    showFailEffect(this);
    EventTracker.track("level_fail", {
      level_id: this.level.id,
      reason,
      steps_used: this.stepsUsed
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
    this.hammerArmed = false;
    this.hammerHintText.setAlpha(0);

    if (this.dropTimer) {
      this.dropTimer.paused = true;
    }

    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(GAME_WIDTH / 2, 640, 480, 350, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    const title = this.add
      .text(GAME_WIDTH / 2, 540, "已暂停", {
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
    const resumeButton = createButton(this, GAME_WIDTH / 2, 638, "继续", () => {
      cleanup();
      this.state = "playing";

      if (this.dropTimer) {
        this.dropTimer.paused = false;
      }
    }, {
      width: 280,
      height: 68,
      fill: COLORS.green,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    const selectButton = createButton(this, GAME_WIDTH / 2, 728, "返回选关", () => this.scene.start("LevelSelectScene"), {
      width: 280,
      height: 68,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    controls.push(resumeButton, selectButton);
  }

  private showResultPanel(result: LevelResult): void {
    const cx = GAME_WIDTH / 2;
    const shade = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(cx, 640, 530, 590, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    this.add
      .text(cx, 402, "合成成功", {
        color: "#263241",
        fontSize: "42px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    this.add
      .text(cx, 478, `击败 ${result.defeatedPercent}% 玩家`, {
        color: "#f65e3b",
        fontSize: "42px",
        fontStyle: "900",
        stroke: "#ffffff",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    showStarAnimation(this, cx, 548, result.stars);
    this.add
      .text(
        cx,
        632,
        `目标 ${result.targetValue}\n步数 ${result.stepsUsed} / 最佳 ${
          result.bestSteps === null ? "--" : result.bestSteps
        }${result.isNewBestSteps ? "\n新纪录" : ""}`,
        {
          color: "#263241",
          fontSize: "25px",
          fontStyle: "700",
          align: "center",
          lineSpacing: 8
        }
      )
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);

    const nextLevel = Math.min(result.levelId + 1, LEVELS.length);
    createButton(this, cx, 766, result.levelId === LEVELS.length ? "回到选关" : "下一关", () => {
      this.scene.start(result.levelId === LEVELS.length ? "LevelSelectScene" : "PlayScene", { levelId: nextLevel });
    }, {
      width: 300,
      height: 64,
      fill: COLORS.primary
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, cx, 846, "重玩", () => this.restartLevel("result_retry"), {
      width: 300,
      height: 64,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, cx, 926, "炫耀战绩", () => {
      PlatformService.getInstance().boastLevelResult(result.levelId, result.stepsUsed, result.defeatedPercent);
      EventTracker.track("boast_click", { level_id: result.levelId, steps_used: result.stepsUsed });
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
    const cx = GAME_WIDTH / 2;
    const reasonLabel = this.getFailReasonLabel(reason);
    const shade = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(cx, 640, 520, 430, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    const title = this.add
      .text(cx, 510, "挑战失败", {
        color: "#263241",
        fontSize: "42px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    const label = this.add
      .text(cx, 576, reasonLabel, {
        color: "#65758b",
        fontSize: "26px",
        fontStyle: "700",
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);

    const controls: Phaser.GameObjects.Container[] = [];
    const cleanup = () => {
      shade.destroy();
      panel.destroy();
      title.destroy();
      label.destroy();
      for (const control of controls) {
        control.destroy();
      }
    };

    controls.push(
      createButton(this, cx, 674, "重新挑战", () => this.restartLevel(reason), {
        width: 300,
        height: 64,
        fill: COLORS.primary
      }).setDepth(DEPTHS.modal + 2)
    );
    controls.push(
      createButton(this, cx, 754, "看视频加 3 步", () => {
        this.reviveWithExtraSteps(cleanup);
      }, {
        width: 300,
        height: 64,
        fill: COLORS.yellow,
        textColor: "#263241"
      }).setDepth(DEPTHS.modal + 2)
    );
    controls.push(
      createButton(this, cx, 834, "返回选关", () => this.scene.start("LevelSelectScene"), {
        width: 300,
        height: 64,
        fill: COLORS.panel,
        textColor: "#263241"
      }).setDepth(DEPTHS.modal + 2)
    );

    shade.setInteractive();
    panel.setInteractive();
  }

  private getBlockQueue(): number[] {
    return [...this.level.nextBlocks, ...this.bonusBlocks];
  }

  private ensureBonusBlocks(count: number): void {
    const maxValue = Math.max(getMaxValue(this.grid), this.activeBlock?.value ?? 0);
    const totalLength = this.level.nextBlocks.length + this.bonusBlocks.length;
    const newBlocks = computeBonusBlocks(totalLength, this.nextBlockIndex, count, maxValue);
    this.bonusBlocks.push(...newBlocks);
  }

  private reviveWithExtraSteps(cleanup: () => void): void {
    EventTracker.track("ad_button_click", { scene: "extra_steps", level_id: this.level.id });
    void PlatformService.getInstance().showRewardedAd("extra_steps").then((ok) => {
      if (!ok) {
        return;
      }

      cleanup();
      SoundService.play("reward");
      this.bonusSteps += 3;
      this.ensureBonusBlocks(3);
      this.state = "playing";
      this.activeBlock = null;
      this.isResolving = false;
      this.hammerArmed = false;
      this.updateHud();
      this.spawnNextBlock();

      if (this.state === "playing") {
        this.startDropTimer();
      }

      EventTracker.track("rewarded_extra_steps", { level_id: this.level.id, bonus_steps: 3 });
    });
  }

  private armHammer(): void {
    if (this.state !== "playing" || this.isResolving || !this.activeBlock) {
      return;
    }

    if (this.hammerArmed) {
      this.hammerArmed = false;
      this.dropTimer?.remove(false);
      this.startDropTimer();
      this.showHammerHint("已取消锤子", false);
      return;
    }

    if (!this.grid.some((row) => row.some((value) => value > 0))) {
      this.showHammerHint("当前没有可敲碎的占位方块", false);
      return;
    }

    if (this.dropTimer) {
      this.dropTimer.paused = true;
    }

    EventTracker.track("ad_button_click", { scene: "hammer", level_id: this.level.id });
    void PlatformService.getInstance().showRewardedAd("hammer").then((ok) => {
      if (!ok || this.state !== "playing") {
        if (this.dropTimer) {
          this.dropTimer.paused = false;
        }
        return;
      }

      this.hammerArmed = true;
      this.showHammerHint("点击任意占位方块敲碎", true);
      EventTracker.track("hammer_armed", { level_id: this.level.id });
    });
  }

  private tryUseHammer(pointer: Phaser.Input.Pointer): void {
    const cell = this.pointerToCell(pointer);

    if (!cell) {
      this.showHammerHint("请选择棋盘里的占位方块", false);
      return;
    }

    const value = this.grid[cell.row][cell.col];

    if (value === 0) {
      this.pulseBlockedMove(cell.col, cell.row);
      this.showHammerHint("这里没有占位方块", false);
      return;
    }

    const next = cloneGrid(this.grid);
    next[cell.row][cell.col] = 0;
    this.grid = next;
    this.hammerArmed = false;
    this.isResolving = true;
    this.renderGrid();
    SoundService.play("hammer");
    this.showHammerSmash(cell.col, cell.row, value);
    this.showHammerHint(`已敲碎 ${value}`, false);
    this.updateHud();
    void this.resolveAfterHammer();
  }

  private async resolveAfterHammer(): Promise<void> {
    const result = await this.animateResolution();
    this.isResolving = false;

    const hasBigCombo = result.comboCount >= 3;

    if (hasBigCombo) {
      this.showComboLabel(result.comboCount);
    }

    if (getMaxValue(this.grid) >= this.level.targetValue) {
      if (hasBigCombo) {
        await this.wait(520);
      }

      this.completeLevel();
      return;
    }

    if (this.dropTimer) {
      this.dropTimer.paused = false;
    }

    this.updateHud();
  }

  private showHammerSmash(col: number, row: number, value: number): void {
    const { x, y } = this.cellToCenter(col, row);
    const flash = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, COLORS.yellow, 0.34).setDepth(DEPTHS.effects);
    const label = this.add
      .text(x, y, `-${value}`, {
        color: "#ffffff",
        fontSize: "34px",
        fontStyle: "900",
        stroke: "#263241",
        strokeThickness: 7
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.effects + 1);

    this.tweens.add({
      targets: flash,
      scale: 1.4,
      alpha: 0,
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => flash.destroy()
    });
    this.tweens.add({
      targets: label,
      y: y - 42,
      alpha: 0,
      duration: 520,
      ease: "Quad.Out",
      onComplete: () => label.destroy()
    });
  }

  private showHammerHint(message: string, persistent: boolean): void {
    this.tweens.killTweensOf(this.hammerHintText);
    this.hammerHintText.setText(message).setAlpha(1);

    if (persistent) {
      return;
    }

    this.tweens.add({
      targets: this.hammerHintText,
      alpha: 0,
      delay: 900,
      duration: 220,
      ease: "Quad.Out"
    });
  }

  private playConfetti(): void {
    const cx = GAME_WIDTH / 2;
    for (let index = 0; index < 28; index += 1) {
      const color = [COLORS.yellow, COLORS.green, COLORS.blue, COLORS.orange, COLORS.red][index % 5];
      const piece = this.add.rectangle(cx, 600, 14, 22, color).setDepth(DEPTHS.effects);
      this.tweens.add({
        targets: piece,
        x: cx + Phaser.Math.Between(-260, 260),
        y: 600 + Phaser.Math.Between(-280, 220),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: 820,
        ease: "Quad.Out",
        onComplete: () => piece.destroy()
      });
    }
  }

  private createHud(): void {
    this.add
      .text(56, 30, `第 ${this.level.id} 关  ${this.level.name}`, {
        color: "#263241",
        fontSize: "28px",
        fontStyle: "900"
      })
      .setDepth(DEPTHS.ui);

    this.targetText = this.add
      .text(56, 82, "", {
        color: "#263241",
        fontSize: "23px",
        fontStyle: "900"
      })
      .setDepth(DEPTHS.ui);

    this.stepsText = this.add
      .text(GAME_WIDTH / 2, 82, "", {
        color: "#263241",
        fontSize: "23px",
        fontStyle: "900",
        align: "center"
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTHS.ui);

    this.bestText = this.add
      .text(664, 82, "", {
        color: "#65758b",
        fontSize: "20px",
        fontStyle: "700",
        align: "right"
      })
      .setOrigin(1, 0)
      .setDepth(DEPTHS.ui);

    this.add
      .text(56, 134, this.level.description, {
        color: "#65758b",
        fontSize: "21px",
        fontStyle: "700",
        wordWrap: { width: 420 }
      })
      .setDepth(DEPTHS.ui);

    this.add
      .text(526, 134, "下一个", {
        color: "#65758b",
        fontSize: "19px",
        fontStyle: "800",
        align: "right"
      })
      .setDepth(DEPTHS.ui);

    createButton(this, 82, 1212, "选关", () => this.scene.start("LevelSelectScene"), {
      width: 118,
      height: 58,
      fill: COLORS.panel,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, 220, 1212, "重开", () => this.restartLevel("manual"), {
      width: 118,
      height: 58,
      fill: COLORS.orange,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, GAME_WIDTH / 2, 1212, "锤子", () => this.armHammer(), {
      width: 118,
      height: 58,
      fill: COLORS.yellow,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, 500, 1212, "暂停", () => this.pauseLevel(), {
      width: 118,
      height: 58,
      fill: COLORS.panel,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, 638, 1212, "落下", () => this.hardDrop(), {
      width: 118,
      height: 58,
      fill: COLORS.primary,
      fontSize: 22
    });

    this.hammerHintText = this.add
      .text(GAME_WIDTH / 2, 214, "", {
        color: "#263241",
        fontSize: "24px",
        fontStyle: "900",
        align: "center",
        stroke: "#ffffff",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.effects + 1)
      .setAlpha(0);

    this.updateHud();
  }

  private updateHud(): void {
    const save = SaveManager.load();
    const bestSteps = save.levels[this.level.id]?.bestSteps ?? null;
    this.targetText.setText(`目标 ${this.level.targetValue}`);
    this.stepsText.setText(`步数 ${this.stepsUsed}/${this.getStepLimit()}`);
    this.bestText.setText(`最佳 ${bestSteps === null ? "--" : `${bestSteps} 步`}`);
    this.renderPreview();
  }

  private renderPreview(): void {
    this.previewLayer.removeAll(true);

    this.ensureBonusBlocks(3);
    const upcoming = this.getBlockQueue().slice(this.nextBlockIndex, this.nextBlockIndex + 3);
    upcoming.forEach((value, index) => {
      const x = 558 + index * 46;
      const y = 164;
      this.previewLayer.add(this.createMiniBlock(x, y, value));
    });
  }

  private getStepLimit(): number {
    return this.level.starSteps.one + this.bonusSteps;
  }

  private getFailReasonLabel(reason: string): string {
    if (reason === "step_limit") {
      return "方块用完前还没达成目标";
    }

    if (reason === "top_blocked") {
      return "入口被堵住了";
    }

    return "没有可用方块了";
  }
}
