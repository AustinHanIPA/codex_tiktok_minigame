import Phaser from "phaser";
import { EventTracker } from "../data/EventTracker";
import { SaveManager } from "../data/SaveManager";
import { getLevel, LEVELS } from "../levels";
import {
  canPlace,
  cloneGrid,
  getHardDropY,
  getMaxValue,
  lockBlock,
  resolveGrid
} from "../logic/gridLogic";
import { PlatformService } from "../platform/PlatformService";
import { createButton, drawToyBackground, starText } from "../ui/UiFactory";
import {
  BLOCK_COLORS,
  BOARD_X,
  BOARD_Y,
  CELL_GAP,
  CELL_SIZE,
  COLORS,
  COMBO_STEP_DELAY_MS,
  DEPTHS,
  DROP_INTERVAL_MS,
  GAME_WIDTH,
  GRID_COLS,
  GRID_ROWS
} from "../utils/constants";
import { getDefeatedPercent, getStarsForSteps } from "../utils/scoring";
import type { ActiveBlock, LevelConfig, LevelResult, MergeGroup, PlayState } from "../utils/types";

interface PlaySceneData {
  levelId?: number;
}

interface PointerStart {
  x: number;
  y: number;
}

const BOARD_WIDTH = GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP;
const BOARD_HEIGHT = GRID_ROWS * CELL_SIZE + (GRID_ROWS - 1) * CELL_GAP;

export class PlayScene extends Phaser.Scene {
  private level!: LevelConfig;
  private state: PlayState = "ready";
  private grid: number[][] = [];
  private activeBlock: ActiveBlock | null = null;
  private nextBlockIndex = 0;
  private bonusBlocks: number[] = [];
  private stepsUsed = 0;
  private bonusSteps = 0;
  private hammerArmed = false;
  private isResolving = false;
  private pointerStart: PointerStart | null = null;
  private tilesLayer!: Phaser.GameObjects.Container;
  private activeLayer!: Phaser.GameObjects.Container;
  private previewLayer!: Phaser.GameObjects.Container;
  private targetText!: Phaser.GameObjects.Text;
  private stepsText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private hammerHintText!: Phaser.GameObjects.Text;
  private dropTimer: Phaser.Time.TimerEvent | null = null;

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
    drawToyBackground(this);
    this.drawBoard();
    this.tilesLayer = this.add.container(0, 0).setDepth(DEPTHS.ball);
    this.activeLayer = this.add.container(0, 0).setDepth(DEPTHS.ball + 2);
    this.previewLayer = this.add.container(0, 0).setDepth(DEPTHS.ui + 2);
    this.createHud();
    this.registerInput();
    this.renderGrid();
    this.startPlaying();

    EventTracker.track("level_start", { level_id: this.level.id, target_value: this.level.targetValue });
  }

  private startPlaying(): void {
    this.state = "playing";
    this.spawnNextBlock();

    if (this.state !== "playing") {
      return;
    }

    this.startDropTimer();
  }

  private registerInput(): void {
    const input = this.input;
    const keyboard = input.keyboard;
    keyboard?.on("keydown", this.handleKeyDown, this);
    input.on("pointerdown", this.handlePointerDown, this);
    input.on("pointerup", this.handlePointerUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dropTimer?.remove(false);
      keyboard?.off("keydown", this.handleKeyDown, this);
      input.off("pointerdown", this.handlePointerDown, this);
      input.off("pointerup", this.handlePointerUp, this);
    });
  }

  private drawBoard(): void {
    const boardCenterX = BOARD_X + BOARD_WIDTH / 2;
    const boardCenterY = BOARD_Y + BOARD_HEIGHT / 2;

    this.add
      .rectangle(boardCenterX + 6, boardCenterY + 8, BOARD_WIDTH + 28, BOARD_HEIGHT + 28, COLORS.shadow, 0.12)
      .setDepth(DEPTHS.board);
    this.add
      .rectangle(boardCenterX, boardCenterY, BOARD_WIDTH + 28, BOARD_HEIGHT + 28, COLORS.board)
      .setStrokeStyle(5, COLORS.ink, 0.16)
      .setDepth(DEPTHS.board + 1);

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const { x, y } = this.cellToCenter(col, row);
        this.add
          .rectangle(x, y, CELL_SIZE, CELL_SIZE, COLORS.boardCell, 0.94)
          .setStrokeStyle(2, COLORS.ink, 0.08)
          .setDepth(DEPTHS.board + 2);
      }
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
      .text(360, 82, "", {
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
    createButton(this, 360, 1212, "锤子", () => this.armHammer(), {
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
      .text(360, 214, "", {
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

  private renderGrid(): void {
    this.tilesLayer.removeAll(true);

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const value = this.grid[row][col];

        if (value === 0) {
          continue;
        }

        const { x, y } = this.cellToCenter(col, row);
        this.tilesLayer.add(this.createBlockSprite(x, y, value));
      }
    }
  }

  private renderActiveBlock(): void {
    this.activeLayer.removeAll(true);

    if (!this.activeBlock) {
      return;
    }

    const { x, y } = this.cellToCenter(this.activeBlock.x, this.activeBlock.y);
    const block = this.createBlockSprite(x, y, this.activeBlock.value);
    block.setScale(1.04);
    this.activeLayer.add(block);
  }

  private renderPreview(): void {
    this.previewLayer.removeAll(true);

    const upcoming = this.getBlockQueue().slice(this.nextBlockIndex, this.nextBlockIndex + 3);
    upcoming.forEach((value, index) => {
      const x = 558 + index * 46;
      const y = 164;
      this.previewLayer.add(this.createMiniBlock(x, y, value));
    });
  }

  private spawnNextBlock(): void {
    if (this.state !== "playing") {
      return;
    }

    const value = this.getBlockQueue()[this.nextBlockIndex];

    if (value === undefined) {
      this.failLevel("no_blocks");
      return;
    }

    const spawnX = Math.floor(GRID_COLS / 2);

    if (!canPlace(this.grid, spawnX, 0)) {
      this.failLevel("top_blocked");
      return;
    }

    this.nextBlockIndex += 1;
    this.activeBlock = { x: spawnX, y: 0, value };
    this.renderActiveBlock();
    this.updateHud();
  }

  private dropOneRow(): void {
    if (!this.canControlActiveBlock()) {
      return;
    }

    const block = this.activeBlock;

    if (!block) {
      return;
    }

    if (canPlace(this.grid, block.x, block.y + 1)) {
      this.activeBlock = { ...block, y: block.y + 1 };
      this.renderActiveBlock();
      return;
    }

    this.lockActiveBlock();
  }

  private moveActiveBlock(deltaX: number): void {
    if (!this.canControlActiveBlock()) {
      return;
    }

    const block = this.activeBlock;

    if (!block) {
      return;
    }

    const nextX = block.x + deltaX;

    if (!canPlace(this.grid, nextX, block.y)) {
      this.pulseBlockedMove(block.x, block.y);
      return;
    }

    this.activeBlock = { ...block, x: nextX };
    this.renderActiveBlock();
  }

  private hardDrop(): void {
    if (!this.canControlActiveBlock() || !this.activeBlock) {
      return;
    }

    this.activeBlock = {
      ...this.activeBlock,
      y: getHardDropY(this.grid, this.activeBlock)
    };
    this.renderActiveBlock();
    this.lockActiveBlock();
  }

  private lockActiveBlock(): void {
    if (!this.activeBlock || this.state !== "playing") {
      return;
    }

    this.grid = lockBlock(this.grid, this.activeBlock);
    this.activeBlock = null;
    this.stepsUsed += 1;
    this.isResolving = true;
    this.renderActiveBlock();
    this.renderGrid();
    this.updateHud();
    void this.resolveAfterLock();
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
    this.cameras.main.shake(140, 0.004);
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
    const selectButton = createButton(this, 360, 728, "返回选关", () => this.scene.start("LevelSelectScene"), {
      width: 280,
      height: 68,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    controls.push(resumeButton, selectButton);
  }

  private showResultPanel(result: LevelResult): void {
    const shade = this.add.rectangle(360, 640, 720, 1280, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(360, 640, 530, 590, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    this.add
      .text(360, 402, "合成成功", {
        color: "#263241",
        fontSize: "42px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    this.add
      .text(360, 478, `击败 ${result.defeatedPercent}% 玩家`, {
        color: "#f65e3b",
        fontSize: "42px",
        fontStyle: "900",
        stroke: "#ffffff",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    this.add
      .text(360, 548, starText(result.stars), {
        color: "#ffb703",
        fontSize: "54px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    this.add
      .text(
        360,
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
    createButton(this, 360, 766, result.levelId === LEVELS.length ? "回到选关" : "下一关", () => {
      this.scene.start(result.levelId === LEVELS.length ? "LevelSelectScene" : "PlayScene", { levelId: nextLevel });
    }, {
      width: 300,
      height: 64,
      fill: COLORS.primary
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, 360, 846, "重玩", () => this.restartLevel("result_retry"), {
      width: 300,
      height: 64,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, 360, 926, "炫耀战绩", () => {
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
    const reasonLabel = this.getFailReasonLabel(reason);
    const shade = this.add.rectangle(360, 640, 720, 1280, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(360, 640, 520, 430, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    const title = this.add
      .text(360, 510, "挑战失败", {
        color: "#263241",
        fontSize: "42px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    const label = this.add
      .text(360, 576, reasonLabel, {
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
      createButton(this, 360, 674, "重新挑战", () => this.restartLevel(reason), {
        width: 300,
        height: 64,
        fill: COLORS.primary
      }).setDepth(DEPTHS.modal + 2)
    );
    controls.push(
      createButton(this, 360, 754, "看视频加 3 步", () => {
        this.reviveWithExtraSteps(cleanup);
      }, {
        width: 300,
        height: 64,
        fill: COLORS.yellow,
        textColor: "#263241"
      }).setDepth(DEPTHS.modal + 2)
    );
    controls.push(
      createButton(this, 360, 834, "返回选关", () => this.scene.start("LevelSelectScene"), {
        width: 300,
        height: 64,
        fill: COLORS.panel,
        textColor: "#263241"
      }).setDepth(DEPTHS.modal + 2)
    );

    shade.setInteractive();
    panel.setInteractive();
  }

  private startDropTimer(): void {
    this.dropTimer?.remove(false);
    this.dropTimer = this.time.addEvent({
      delay: DROP_INTERVAL_MS,
      loop: true,
      callback: () => this.dropOneRow()
    });
  }

  private getBlockQueue(): number[] {
    return [...this.level.nextBlocks, ...this.bonusBlocks];
  }

  private ensureBonusBlocks(count: number): void {
    while (this.getBlockQueue().length < this.nextBlockIndex + count) {
      this.bonusBlocks.push(this.rollExtraBlockValue());
    }
  }

  private rollExtraBlockValue(): number {
    const maxValue = Math.max(getMaxValue(this.grid), this.activeBlock?.value ?? 0);

    if (maxValue >= 128) {
      return Phaser.Utils.Array.GetRandom([2, 2, 4, 4, 8, 8, 16]);
    }

    if (maxValue >= 32) {
      return Phaser.Utils.Array.GetRandom([2, 2, 4, 4, 8]);
    }

    return Phaser.Utils.Array.GetRandom([2, 2, 2, 4, 4]);
  }

  private reviveWithExtraSteps(cleanup: () => void): void {
    void PlatformService.getInstance().showRewardedAd("extra_steps").then((ok) => {
      if (!ok) {
        return;
      }

      cleanup();
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

  private async animateResolution(): Promise<ReturnType<typeof resolveGrid>> {
    const result = resolveGrid(this.grid);

    for (const step of result.steps) {
      if (step.mergeGroups.length > 0) {
        this.showMergeBursts(step.mergeGroups);
      }

      await this.wait(COMBO_STEP_DELAY_MS);
      this.grid = cloneGrid(step.grid);
      this.renderGrid();
    }

    this.grid = result.grid;
    this.renderGrid();
    return result;
  }

  private pointerToCell(pointer: Phaser.Input.Pointer): { col: number; row: number } | null {
    if (pointer.x < BOARD_X || pointer.x > BOARD_X + BOARD_WIDTH || pointer.y < BOARD_Y || pointer.y > BOARD_Y + BOARD_HEIGHT) {
      return null;
    }

    const col = Math.floor((pointer.x - BOARD_X) / (CELL_SIZE + CELL_GAP));
    const row = Math.floor((pointer.y - BOARD_Y) / (CELL_SIZE + CELL_GAP));

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return null;
    }

    return { col, row };
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

  private createBlockSprite(x: number, y: number, value: number): Phaser.GameObjects.Container {
    const color = BLOCK_COLORS[value] ?? { fill: COLORS.purple, text: "#ffffff", glow: 0xffffff };
    const pieces: Phaser.GameObjects.GameObject[] = [];

    if (color.glow) {
      pieces.push(this.add.rectangle(0, 0, CELL_SIZE + 30, CELL_SIZE + 30, color.glow, 0.14));
      pieces.push(this.add.rectangle(0, 0, CELL_SIZE + 16, CELL_SIZE + 16, color.glow, 0.24));
    }

    pieces.push(this.add.rectangle(0, 0, CELL_SIZE - 4, CELL_SIZE - 4, color.fill).setStrokeStyle(4, COLORS.ink, 0.14));
    pieces.push(
      this.add
        .text(0, 0, `${value}`, {
          color: color.text,
          fontSize: `${this.getBlockFontSize(value)}px`,
          fontStyle: "900",
          align: "center"
        })
        .setOrigin(0.5)
    );

    const block = this.add.container(x, y, pieces);
    block.setSize(CELL_SIZE, CELL_SIZE);
    return block;
  }

  private createMiniBlock(x: number, y: number, value: number): Phaser.GameObjects.Container {
    const color = BLOCK_COLORS[value] ?? { fill: COLORS.purple, text: "#ffffff" };
    const pieces: Phaser.GameObjects.GameObject[] = [];

    if (color.glow) {
      pieces.push(this.add.rectangle(0, 0, 52, 52, color.glow, 0.18));
    }

    const rect = this.add.rectangle(0, 0, 42, 42, color.fill).setStrokeStyle(2, COLORS.ink, 0.14);
    const text = this.add
      .text(0, 0, `${value}`, {
        color: color.text,
        fontSize: value >= 128 ? "14px" : "17px",
        fontStyle: "900"
      })
      .setOrigin(0.5);
    return this.add.container(x, y, [...pieces, rect, text]);
  }

  private showMergeBursts(groups: MergeGroup[]): void {
    for (const group of groups) {
      const { x, y } = this.cellToCenter(group.anchor.x, group.anchor.y);
      const burst = this.add.circle(x, y, 18, COLORS.yellow, 0.38).setDepth(DEPTHS.effects);
      this.tweens.add({
        targets: burst,
        scale: 4,
        alpha: 0,
        duration: 260,
        ease: "Quad.Out",
        onComplete: () => burst.destroy()
      });
    }
  }

  private showComboLabel(comboCount: number): void {
    const label = comboCount >= 7 ? "Unbelievable!" : comboCount >= 5 ? "Excellent!" : "Good!";
    const text = this.add
      .text(360, 660, label, {
        color: "#ffffff",
        fontSize: "46px",
        fontStyle: "900",
        stroke: "#263241",
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.effects + 1);
    this.tweens.add({
      targets: text,
      y: 594,
      alpha: 0,
      duration: 720,
      ease: "Quad.Out",
      onComplete: () => text.destroy()
    });
  }

  private pulseBlockedMove(col: number, row: number): void {
    const { x, y } = this.cellToCenter(col, row);
    const marker = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, COLORS.red, 0.16).setDepth(DEPTHS.effects);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      duration: 150,
      ease: "Quad.Out",
      onComplete: () => marker.destroy()
    });
  }

  private playConfetti(): void {
    for (let index = 0; index < 28; index += 1) {
      const color = [COLORS.yellow, COLORS.green, COLORS.blue, COLORS.orange, COLORS.red][index % 5];
      const piece = this.add.rectangle(360, 600, 14, 22, color).setDepth(DEPTHS.effects);
      this.tweens.add({
        targets: piece,
        x: 360 + Phaser.Math.Between(-260, 260),
        y: 600 + Phaser.Math.Between(-280, 220),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: 820,
        ease: "Quad.Out",
        onComplete: () => piece.destroy()
      });
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      this.moveActiveBlock(-1);
      return;
    }

    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      this.moveActiveBlock(1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S" || event.key === " ") {
      this.hardDrop();
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.pointerStart = { x: pointer.x, y: pointer.y };
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerStart) {
      return;
    }

    const dx = pointer.x - this.pointerStart.x;
    const dy = pointer.y - this.pointerStart.y;
    this.pointerStart = null;

    if (this.hammerArmed) {
      this.tryUseHammer(pointer);
      return;
    }

    if (Math.abs(dy) > 50 && dy > Math.abs(dx)) {
      this.hardDrop();
      return;
    }

    if (Math.abs(dx) > 36) {
      this.moveActiveBlock(dx > 0 ? 1 : -1);
      return;
    }

    if (pointer.y < BOARD_Y || pointer.y > BOARD_Y + BOARD_HEIGHT) {
      return;
    }

    if (pointer.x < GAME_WIDTH / 2 - 80) {
      this.moveActiveBlock(-1);
      return;
    }

    if (pointer.x > GAME_WIDTH / 2 + 80) {
      this.moveActiveBlock(1);
      return;
    }

    this.hardDrop();
  }

  private cellToCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: BOARD_X + col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
      y: BOARD_Y + row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
    };
  }

  private canControlActiveBlock(): boolean {
    return this.state === "playing" && !this.isResolving && this.activeBlock !== null;
  }

  private getStepLimit(): number {
    return this.level.starSteps.one + this.bonusSteps;
  }

  private getBlockFontSize(value: number): number {
    if (value >= 1024) {
      return 28;
    }

    if (value >= 128) {
      return 34;
    }

    return 42;
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

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, () => resolve());
    });
  }
}
