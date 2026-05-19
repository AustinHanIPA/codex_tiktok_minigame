import type Phaser from "phaser";
import { EventTracker } from "../data/EventTracker";
import { SaveManager } from "../data/SaveManager";
import { showFailEffect } from "../effects/ParticleEffects";
import { canPlace, cloneGrid, createEmptyGrid, getMaxValue, resolveGrid } from "../logic/gridLogic";
import { rollNextValue } from "../logic/blockQueue";
import { PlatformService } from "../platform/PlatformService";
import { createButton } from "../ui/UiFactory";
import { SoundService } from "../audio/SoundService";
import {
  COLORS,
  COMBO_STEP_DELAY_MS,
  DEPTHS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRID_COLS,
  GRID_ROWS
} from "../utils/constants";
import type { EndlessResult, MergeGroup } from "../utils/types";
import { BaseGameScene } from "./BaseGameScene";

export class EndlessScene extends BaseGameScene {
  private nextBlocks: number[] = [];
  private nextBlockIndex = 0;
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private bestTileText!: Phaser.GameObjects.Text;

  constructor() {
    super("EndlessScene");
  }

  init(): void {
    this.state = "ready";
    this.grid = this.createStartGrid();
    this.activeBlock = null;
    this.nextBlocks = [];
    this.nextBlockIndex = 0;
    this.score = 0;
    this.isResolving = false;
    this.pointerStart = null;
    this.dropTimer = null;
    this.fillQueue();
  }

  create(): void {
    this.setupBase();
    this.createHud();
    this.registerBaseInput();
    this.renderGridFull();
    this.startPlaying();

    EventTracker.track("endless_start");
  }

  // ─── 抽象方法实现 ───

  protected spawnNextBlock(): void {
    if (this.state !== "playing") {
      return;
    }

    this.fillQueue();
    const value = this.nextBlocks[this.nextBlockIndex];
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
    this.endRun(reason);
  }

  protected onLockComplete(): void {
    void this.resolveAfterLock();
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
    const result = resolveGrid(this.grid);
    let comboDepth = 0;

    for (const step of result.steps) {
      if (step.mergeGroups.length > 0) {
        comboDepth += 1;
        this.awardMergeScore(step.mergeGroups, comboDepth);
        this.showMergeBursts(step.mergeGroups);
      }

      await this.wait(COMBO_STEP_DELAY_MS);
      this.grid = cloneGrid(step.grid);
      this.renderGrid();
      this.updateHud();
    }

    this.grid = result.grid;
    this.renderGrid();
    this.isResolving = false;

    if (result.comboCount >= 3) {
      this.showComboLabel(result.comboCount);
    }

    this.spawnNextBlock();
  }

  private awardMergeScore(groups: MergeGroup[], comboDepth: number): void {
    const baseScore = groups.reduce((sum, group) => sum + group.value * 2 * Math.max(1, group.cells.length - 1), 0);
    const gained = baseScore * comboDepth;
    this.score += gained;
    this.showScoreGain(gained);
  }

  private endRun(reason: string): void {
    if (this.state === "failed" || this.state === "complete") {
      return;
    }

    this.state = "failed";
    this.dropTimer?.remove(false);
    this.activeBlock = null;
    this.renderActiveBlock();
    PlatformService.getInstance().vibrateShort();
    SoundService.play("fail");
    showFailEffect(this);

    const bestTile = getMaxValue(this.grid);
    const previousBestScore = SaveManager.load().endless.bestScore;
    const updated = SaveManager.updateEndless(this.score, bestTile);
    const result: EndlessResult = {
      score: this.score,
      bestScore: updated.bestScore,
      bestTile: updated.bestTile,
      isNewBestScore: this.score > previousBestScore
    };

    EventTracker.track("endless_end", {
      reason,
      score: this.score,
      best_tile: bestTile
    });
    this.showEndlessResult(result);
  }

  private restartMode(reason: string): void {
    EventTracker.track("endless_restart", { reason });
    this.scene.restart();
  }

  private pauseMode(): void {
    if (this.state !== "playing") {
      return;
    }

    this.state = "paused";

    if (this.dropTimer) {
      this.dropTimer.paused = true;
    }

    const cx = GAME_WIDTH / 2;
    const shade = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(cx, 640, 480, 350, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    const title = this.add
      .text(cx, 540, "已暂停", {
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
    const resumeButton = createButton(this, cx, 638, "继续", () => {
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
    const homeButton = createButton(this, cx, 728, "返回首页", () => this.scene.start("MenuScene"), {
      width: 280,
      height: 68,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    controls.push(resumeButton, homeButton);
  }

  private showEndlessResult(result: EndlessResult): void {
    const cx = GAME_WIDTH / 2;
    const shade = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(cx, 640, 530, 500, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    this.add
      .text(cx, 458, "本局结束", {
        color: "#263241",
        fontSize: "42px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    this.add
      .text(
        cx,
        568,
        `分数 ${result.score}\n最高 ${result.bestScore}\n最大方块 ${result.bestTile}${result.isNewBestScore ? "\n新纪录" : ""}`,
        {
          color: "#263241",
          fontSize: "26px",
          fontStyle: "700",
          align: "center",
          lineSpacing: 10
        }
      )
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);

    createButton(this, cx, 724, "再来一局", () => this.restartMode("result_retry"), {
      width: 300,
      height: 64,
      fill: COLORS.primary
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, cx, 804, "分享成绩", () => {
      PlatformService.getInstance().shareEndlessScore(result.score, result.bestTile);
      EventTracker.track("endless_share_click", { score: result.score, best_tile: result.bestTile });
    }, {
      width: 300,
      height: 64,
      fill: COLORS.yellow,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, cx, 884, "返回首页", () => this.scene.start("MenuScene"), {
      width: 300,
      height: 64,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);

    shade.setInteractive();
    panel.setInteractive();
  }

  private showScoreGain(score: number): void {
    const text = this.add
      .text(GAME_WIDTH / 2, 218, `+${score}`, {
        color: "#ffffff",
        fontSize: "34px",
        fontStyle: "900",
        stroke: "#263241",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.effects + 1);
    this.tweens.add({
      targets: text,
      y: 182,
      alpha: 0,
      duration: 620,
      ease: "Quad.Out",
      onComplete: () => text.destroy()
    });
  }

  private fillQueue(): void {
    while (this.nextBlocks.length < this.nextBlockIndex + 4) {
      this.nextBlocks.push(rollNextValue(getMaxValue(this.grid), this.score));
    }
  }

  private createStartGrid(): number[][] {
    const grid = createEmptyGrid();
    grid[GRID_ROWS - 1][1] = 2;
    grid[GRID_ROWS - 1][3] = 2;
    grid[GRID_ROWS - 2][2] = 4;
    return grid;
  }

  private createHud(): void {
    this.add
      .text(56, 30, "无尽模式", {
        color: "#263241",
        fontSize: "34px",
        fontStyle: "900"
      })
      .setDepth(DEPTHS.ui);

    this.scoreText = this.add
      .text(56, 84, "", {
        color: "#263241",
        fontSize: "24px",
        fontStyle: "900"
      })
      .setDepth(DEPTHS.ui);

    this.bestScoreText = this.add
      .text(GAME_WIDTH / 2, 84, "", {
        color: "#263241",
        fontSize: "23px",
        fontStyle: "900",
        align: "center"
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTHS.ui);

    this.bestTileText = this.add
      .text(664, 84, "", {
        color: "#65758b",
        fontSize: "20px",
        fontStyle: "700",
        align: "right"
      })
      .setOrigin(1, 0)
      .setDepth(DEPTHS.ui);

    this.add
      .text(56, 136, "尽量合成更大的数字，入口被堵住即结束。", {
        color: "#65758b",
        fontSize: "21px",
        fontStyle: "700",
        wordWrap: { width: 420 }
      })
      .setDepth(DEPTHS.ui);

    this.add
      .text(526, 136, "下一个", {
        color: "#65758b",
        fontSize: "19px",
        fontStyle: "800",
        align: "right"
      })
      .setDepth(DEPTHS.ui);

    createButton(this, 118, 1212, "首页", () => this.scene.start("MenuScene"), {
      width: 136,
      height: 58,
      fill: COLORS.panel,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, 274, 1212, "重开", () => this.restartMode("manual"), {
      width: 136,
      height: 58,
      fill: COLORS.orange,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, 430, 1212, "暂停", () => this.pauseMode(), {
      width: 136,
      height: 58,
      fill: COLORS.panel,
      textColor: "#263241",
      fontSize: 22
    });
    createButton(this, 594, 1212, "落下", () => this.hardDrop(), {
      width: 150,
      height: 58,
      fill: COLORS.primary,
      fontSize: 22
    });

    this.updateHud();
  }

  private updateHud(): void {
    const save = SaveManager.load();
    this.scoreText.setText(`分数 ${this.score}`);
    this.bestScoreText.setText(`最高 ${save.endless.bestScore}`);
    this.bestTileText.setText(`最大 ${Math.max(save.endless.bestTile, getMaxValue(this.grid)) || "--"}`);
    this.renderPreview();
  }

  private renderPreview(): void {
    this.previewLayer.removeAll(true);
    this.fillQueue();

    this.nextBlocks.slice(this.nextBlockIndex, this.nextBlockIndex + 3).forEach((value, index) => {
      this.previewLayer.add(this.createMiniBlock(558 + index * 46, 164, value));
    });
  }
}
