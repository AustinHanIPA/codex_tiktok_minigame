import Phaser from "phaser";
import { EventTracker } from "../data/EventTracker";
import { SaveManager } from "../data/SaveManager";
import {
  canPlace,
  cloneGrid,
  createEmptyGrid,
  getHardDropY,
  getMaxValue,
  lockBlock,
  resolveGrid
} from "../logic/gridLogic";
import { PlatformService } from "../platform/PlatformService";
import { createButton, drawToyBackground } from "../ui/UiFactory";
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
import type { ActiveBlock, EndlessResult, MergeGroup, PlayState } from "../utils/types";

interface PointerStart {
  x: number;
  y: number;
}

const BOARD_WIDTH = GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP;
const BOARD_HEIGHT = GRID_ROWS * CELL_SIZE + (GRID_ROWS - 1) * CELL_GAP;

export class EndlessScene extends Phaser.Scene {
  private state: PlayState = "ready";
  private grid: number[][] = [];
  private activeBlock: ActiveBlock | null = null;
  private nextBlocks: number[] = [];
  private nextBlockIndex = 0;
  private score = 0;
  private isResolving = false;
  private pointerStart: PointerStart | null = null;
  private tilesLayer!: Phaser.GameObjects.Container;
  private activeLayer!: Phaser.GameObjects.Container;
  private previewLayer!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private bestTileText!: Phaser.GameObjects.Text;
  private dropTimer: Phaser.Time.TimerEvent | null = null;

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
    drawToyBackground(this);
    this.drawBoard();
    this.tilesLayer = this.add.container(0, 0).setDepth(DEPTHS.ball);
    this.activeLayer = this.add.container(0, 0).setDepth(DEPTHS.ball + 2);
    this.previewLayer = this.add.container(0, 0).setDepth(DEPTHS.ui + 2);
    this.createHud();
    this.registerInput();
    this.renderGrid();
    this.startPlaying();

    EventTracker.track("endless_start");
  }

  private startPlaying(): void {
    this.state = "playing";
    this.spawnNextBlock();

    if (this.state !== "playing") {
      return;
    }

    this.dropTimer = this.time.addEvent({
      delay: DROP_INTERVAL_MS,
      loop: true,
      callback: () => this.dropOneRow()
    });
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
      .text(360, 84, "", {
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
    this.fillQueue();

    this.nextBlocks.slice(this.nextBlockIndex, this.nextBlockIndex + 3).forEach((value, index) => {
      this.previewLayer.add(this.createMiniBlock(558 + index * 46, 164, value));
    });
  }

  private spawnNextBlock(): void {
    if (this.state !== "playing") {
      return;
    }

    this.fillQueue();
    const value = this.nextBlocks[this.nextBlockIndex];
    const spawnX = Math.floor(GRID_COLS / 2);

    if (!canPlace(this.grid, spawnX, 0)) {
      this.endRun("top_blocked");
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
    this.isResolving = true;
    this.renderActiveBlock();
    this.renderGrid();
    void this.resolveAfterLock();
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
    this.cameras.main.shake(140, 0.004);

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
    const homeButton = createButton(this, 360, 728, "返回首页", () => this.scene.start("MenuScene"), {
      width: 280,
      height: 68,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    controls.push(resumeButton, homeButton);
  }

  private showEndlessResult(result: EndlessResult): void {
    const shade = this.add.rectangle(360, 640, 720, 1280, 0x101722, 0.42).setDepth(DEPTHS.modal);
    const panel = this.add.rectangle(360, 640, 530, 500, COLORS.panel).setStrokeStyle(4, COLORS.ink).setDepth(DEPTHS.modal + 1);
    this.add
      .text(360, 458, "本局结束", {
        color: "#263241",
        fontSize: "42px",
        fontStyle: "900"
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.modal + 2);
    this.add
      .text(
        360,
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

    createButton(this, 360, 724, "再来一局", () => this.restartMode("result_retry"), {
      width: 300,
      height: 64,
      fill: COLORS.primary
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, 360, 804, "分享成绩", () => {
      PlatformService.getInstance().shareEndlessScore(result.score, result.bestTile);
    }, {
      width: 300,
      height: 64,
      fill: COLORS.yellow,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);
    createButton(this, 360, 884, "返回首页", () => this.scene.start("MenuScene"), {
      width: 300,
      height: 64,
      fill: COLORS.panel,
      textColor: "#263241"
    }).setDepth(DEPTHS.modal + 2);

    shade.setInteractive();
    panel.setInteractive();
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

  private showScoreGain(score: number): void {
    const text = this.add
      .text(360, 218, `+${score}`, {
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

  private fillQueue(): void {
    while (this.nextBlocks.length < this.nextBlockIndex + 4) {
      this.nextBlocks.push(this.rollNextValue());
    }
  }

  private rollNextValue(): number {
    const maxValue = getMaxValue(this.grid);

    if (maxValue >= 512) {
      return Phaser.Utils.Array.GetRandom([2, 2, 4, 4, 8, 8, 16, 32]);
    }

    if (maxValue >= 128) {
      return Phaser.Utils.Array.GetRandom([2, 2, 2, 4, 4, 8, 8, 16]);
    }

    if (maxValue >= 32 || this.score >= 160) {
      return Phaser.Utils.Array.GetRandom([2, 2, 2, 4, 4, 4, 8]);
    }

    return Phaser.Utils.Array.GetRandom([2, 2, 2, 4, 4]);
  }

  private createStartGrid(): number[][] {
    const grid = createEmptyGrid();
    grid[GRID_ROWS - 1][1] = 2;
    grid[GRID_ROWS - 1][3] = 2;
    grid[GRID_ROWS - 2][2] = 4;
    return grid;
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

  private getBlockFontSize(value: number): number {
    if (value >= 1024) {
      return 28;
    }

    if (value >= 128) {
      return 34;
    }

    return 42;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, () => resolve());
    });
  }
}
