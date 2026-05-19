/**
 * 纯函数：方块队列补充逻辑。
 * 从 PlayScene / EndlessScene 中抽出以便单元测试可直接复用。
 */

/** 根据场上最大值确定候选补充方块池（带权重） */
export function getRollPool(maxBoardValue: number): number[] {
  if (maxBoardValue >= 128) {
    return [2, 2, 4, 4, 8, 8, 16];
  }

  if (maxBoardValue >= 32) {
    return [2, 2, 4, 4, 8];
  }

  return [2, 2, 2, 4, 4];
}

/**
 * 从池中随机选一个值。
 * 接受可选的 randomFn 方便测试注入确定性随机。
 */
export function rollExtraBlockValue(
  maxBoardValue: number,
  randomFn: () => number = Math.random
): number {
  const pool = getRollPool(maxBoardValue);
  const normalizedRandom = Math.min(Math.max(randomFn(), 0), 1 - Number.EPSILON);
  const index = Math.floor(normalizedRandom * pool.length);
  return pool[index];
}

/**
 * 确保队列中有足够块供后续使用。
 * 返回新增的 bonus 块数组（追加到已有 bonusBlocks）。
 *
 * @param totalQueueLength - 当前 nextBlocks.length + bonusBlocks.length
 * @param nextBlockIndex - 下一个待消费的索引
 * @param count - 需要确保的前瞻块数
 * @param maxBoardValue - 当前棋盘最大值
 * @param randomFn - 可选随机源
 */
export function ensureBonusBlocks(
  totalQueueLength: number,
  nextBlockIndex: number,
  count: number,
  maxBoardValue: number,
  randomFn: () => number = Math.random
): number[] {
  const newBlocks: number[] = [];

  while (totalQueueLength + newBlocks.length < nextBlockIndex + count) {
    newBlocks.push(rollExtraBlockValue(maxBoardValue, randomFn));
  }

  return newBlocks;
}

/**
 * 无尽模式专用：根据棋盘最大值和当前得分，确定下一个方块的值。
 * 从 EndlessScene.rollNextValue 中提取为纯函数，便于测试。
 *
 * @param maxBoardValue - 当前棋盘中最大的方块数值
 * @param score - 当前累计得分
 * @param randomFn - 可选随机源
 */
export function rollNextValue(
  maxBoardValue: number,
  score: number,
  randomFn: () => number = Math.random
): number {
  const pool = getEndlessRollPool(maxBoardValue, score);
  const normalizedRandom = Math.min(Math.max(randomFn(), 0), 1 - Number.EPSILON);
  const index = Math.floor(normalizedRandom * pool.length);
  return pool[index];
}

/** 无尽模式的候选方块池 */
export function getEndlessRollPool(maxBoardValue: number, score: number): number[] {
  if (maxBoardValue >= 512) {
    return [2, 2, 4, 4, 8, 8, 16, 32];
  }

  if (maxBoardValue >= 128) {
    return [2, 2, 2, 4, 4, 8, 8, 16];
  }

  if (maxBoardValue >= 32 || score >= 160) {
    return [2, 2, 2, 4, 4, 4, 8];
  }

  return [2, 2, 2, 4, 4];
}
