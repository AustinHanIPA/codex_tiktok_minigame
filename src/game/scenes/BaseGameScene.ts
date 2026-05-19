import Phaser from "phaser";
import { SoundService } from "../audio/SoundService";
import { resetParticleCount, showComboImpact, showMergeParticles, showMergeValuePopup } from "../effects/ParticleEffects";
import { drawToyBackground } from "../ui/UiFactory";
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
  GAME_HEIGHT,
  GAME_WIDTH,
  GRID_COLS,
  GRID_ROWS
} from "../utils/constants";
import type { ActiveBlock, MergeGroup, PlayState } from "../utils/types";
import { canPlace, cloneGrid, getHardDropY, lockBlock, resolveGrid } from "../logic/gridLogic";

export const BOARD_WIDTH = GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP;
export const BOARD_HEIGHT = GRID_ROWS * CELL_SIZE + (GRID_ROWS - 1) * CELL_GAP;

interface PointerStart {
  x: number;
  y: number;
}

/**
 * 棋盘游戏场景基类。
 * 提取 PlayScene 和 EndlessScene 中完全相同的棋盘绘制、方块渲染、
 * 输入处理、动画工具方法，子类只负责游戏流程差异逻辑。
 */
export abstract class BaseGameScene extends Phaser.Scene {
  protected state: PlayState = "ready";
  protected grid: number[][] = [];
  protected activeBlock: ActiveBlock | null = null;
  protected isResolving = false;
  protected pointerStart: PointerStart | null = null;
  protected tilesLayer!: Phaser.GameObjects.Container;
  protected activeLayer!: Phaser.GameObjects.Container;
  protected previewLayer!: Phaser.GameObjects.Container;
  protected dropTimer: Phaser.Time.TimerEvent | null = null;

  /** 对象池：每个格子位置预分配一个 container slot */
  private tilePool: (Phaser.GameObjects.Container | null)[][] = [];
  /** 记录上一帧每个格子的值，用于 diff 更新 */
  private lastGridSnapshot: number[][] = [];

  // ─── 抽象方法：子类必须实现 ───

  /** 生成下一个方块 */
  protected abstract spawnNextBlock(): void;
  /** 处理失败/结束 */
  protected abstract onFail(reason: string): void;

  // ─── 公共初始化 ───

  protected setupBase(): void {
    drawToyBackground(this);
    this.drawBoard();
    this.tilesLayer = this.add.container(0, 0).setDepth(DEPTHS.ball);
    this.activeLayer = this.add.container(0, 0).setDepth(DEPTHS.ball + 2);
    this.previewLayer = this.add.container(0, 0).setDepth(DEPTHS.ui + 2);
    this.initTilePool();
  }

  protected registerBaseInput(): void {
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
      resetParticleCount();
    });
  }

  protected startDropTimer(): void {
    this.dropTimer?.remove(false);
    this.dropTimer = this.time.addEvent({
      delay: DROP_INTERVAL_MS,
      loop: true,
      callback: () => this.dropOneRow()
    });
  }

  // ─── 棋盘绘制 ───

  protected drawBoard(): void {
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

  // ─── 对象池 & Diff 渲染 ───

  private initTilePool(): void {
    this.tilePool = [];
    this.lastGridSnapshot = [];
    for (let row = 0; row < GRID_ROWS; row += 1) {
      this.tilePool.push(Array.from({ length: GRID_COLS }, () => null));
      this.lastGridSnapshot.push(Array.from({ length: GRID_COLS }, () => 0));
    }
  }

  protected renderGrid(): void {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const value = this.grid[row][col];
        const prevValue = this.lastGridSnapshot[row][col];

        if (value === prevValue) {
          continue;
        }

        // 移除旧方块
        const existing = this.tilePool[row][col];
        if (existing) {
          existing.destroy();
          this.tilePool[row][col] = null;
        }

        // 创建新方块
        if (value !== 0) {
          const { x, y } = this.cellToCenter(col, row);
          const sprite = this.createBlockSprite(x, y, value);
          this.tilesLayer.add(sprite);
          this.tilePool[row][col] = sprite;
        }

        this.lastGridSnapshot[row][col] = value;
      }
    }
  }

  /** 强制全量重绘（场景初始化或重开时使用） */
  protected renderGridFull(): void {
    // 清空池
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        this.lastGridSnapshot[row][col] = -1; // 强制 diff 认为全部变化
      }
    }
    this.tilesLayer.removeAll(true);
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        this.tilePool[row][col] = null;
      }
    }
    this.renderGrid();
  }

  protected renderActiveBlock(): void {
    this.activeLayer.removeAll(true);

    if (!this.activeBlock) {
      return;
    }

    const { x, y } = this.cellToCenter(this.activeBlock.x, this.activeBlock.y);
    const block = this.createBlockSprite(x, y, this.activeBlock.value);
    block.setScale(1.04);
    this.activeLayer.add(block);
  }

  // ─── 方块渲染 ───

  protected createBlockSprite(x: number, y: number, value: number): Phaser.GameObjects.Container {
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

  protected createMiniBlock(x: number, y: number, value: number): Phaser.GameObjects.Container {
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

  protected getBlockFontSize(value: number): number {
    if (value >= 1024) {
      return 28;
    }

    if (value >= 128) {
      return 34;
    }

    return 42;
  }

  // ─── 游戏操作 ───

  protected dropOneRow(): void {
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

  protected moveActiveBlock(deltaX: number): void {
    if (!this.canControlActiveBlock()) {
      return;
    }

    const block = this.activeBlock;

    if (!block) {
      return;
    }

    const nextX = block.x + deltaX;

    if (!canPlace(this.grid, nextX, block.y)) {
      SoundService.play("blocked");
      this.pulseBlockedMove(block.x, block.y);
      return;
    }

    this.activeBlock = { ...block, x: nextX };
    SoundService.play("move");
    this.renderActiveBlock();
  }

  protected hardDrop(): void {
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

  protected lockActiveBlock(): void {
    if (!this.activeBlock || this.state !== "playing") {
      return;
    }

    this.grid = lockBlock(this.grid, this.activeBlock);
    this.activeBlock = null;
    this.isResolving = true;
    SoundService.play("drop");
    this.renderActiveBlock();
    this.renderGrid();
    this.onLockComplete();
  }

  /** 子类在方块锁定后做后续处理（连锁、计分等） */
  protected abstract onLockComplete(): void;

  protected canControlActiveBlock(): boolean {
    return this.state === "playing" && !this.isResolving && this.activeBlock !== null;
  }

  // ─── 连锁动画 ───

  protected async animateResolution(): Promise<ReturnType<typeof resolveGrid>> {
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

  protected showMergeBursts(groups: MergeGroup[]): void {
    SoundService.playMerge(groups.length);

    for (const group of groups) {
      const { x, y } = this.cellToCenter(group.anchor.x, group.anchor.y);
      showMergeParticles(this, x, y, group.value, group.cells.length);
      showMergeValuePopup(this, x, y, group.value * 2);
    }
  }

  protected showComboLabel(comboCount: number): void {
    const label = comboCount >= 7 ? "Unbelievable!" : comboCount >= 5 ? "Excellent!" : "Good!";
    const text = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, label, {
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
      y: GAME_HEIGHT / 2 - 46,
      alpha: 0,
      duration: 720,
      ease: "Quad.Out",
      onComplete: () => text.destroy()
    });
    showComboImpact(this, comboCount, this.tilesLayer);
  }

  protected pulseBlockedMove(col: number, row: number): void {
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

  // ─── 输入处理 ───

  protected handleKeyDown(event: KeyboardEvent): void {
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

  protected handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.pointerStart = { x: pointer.x, y: pointer.y };
  }

  protected handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerStart) {
      return;
    }

    const dx = pointer.x - this.pointerStart.x;
    const dy = pointer.y - this.pointerStart.y;
    this.pointerStart = null;

    this.processSwipe(dx, dy, pointer);
  }

  /** 处理滑动手势，子类可覆盖（PlayScene 需处理锤子逻辑） */
  protected processSwipe(dx: number, dy: number, pointer: Phaser.Input.Pointer): void {
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

  // ─── 格子坐标工具 ───

  protected cellToCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: BOARD_X + col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
      y: BOARD_Y + row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
    };
  }

  protected pointerToCell(pointer: Phaser.Input.Pointer): { col: number; row: number } | null {
    if (pointer.x < BOARD_X || pointer.x > BOARD_X + BOARD_WIDTH || pointer.y < BOARD_Y || pointer.y > BOARD_Y + BOARD_HEIGHT) {
      return null;
    }

    const stride = CELL_SIZE + CELL_GAP;
    const localX = pointer.x - BOARD_X;
    const localY = pointer.y - BOARD_Y;
    const col = Math.floor(localX / stride);
    const row = Math.floor(localY / stride);

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return null;
    }

    // 点击落在格子间 gap 区域时视为无效
    const offsetInCellX = localX - col * stride;
    const offsetInCellY = localY - row * stride;

    if (offsetInCellX > CELL_SIZE || offsetInCellY > CELL_SIZE) {
      return null;
    }

    return { col, row };
  }

  // ─── 通用工具 ───

  protected wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, () => resolve());
    });
  }
}
