import { describe, expect, it } from "vitest";
import {
  ensureBonusBlocks,
  getEndlessRollPool,
  getRollPool,
  rollExtraBlockValue,
  rollNextValue
} from "./blockQueue";

describe("blockQueue", () => {
  describe("getRollPool", () => {
    it("returns small pool for low maxValue", () => {
      expect(getRollPool(4)).toEqual([2, 2, 2, 4, 4]);
    });

    it("adds 8 for maxValue >= 32", () => {
      expect(getRollPool(32)).toEqual([2, 2, 4, 4, 8]);
    });

    it("adds 16 for maxValue >= 128", () => {
      expect(getRollPool(128)).toEqual([2, 2, 4, 4, 8, 8, 16]);
    });
  });

  describe("rollExtraBlockValue", () => {
    it("returns first pool element when random returns 0", () => {
      expect(rollExtraBlockValue(4, () => 0)).toBe(2);
    });

    it("returns last pool element when random returns near 1", () => {
      const pool = getRollPool(4);
      expect(rollExtraBlockValue(4, () => 0.9999)).toBe(pool[pool.length - 1]);
    });

    it("handles random = 1.0 safely (no index out of bounds)", () => {
      // 1 - Number.EPSILON 保证 index 不会 === pool.length
      const result = rollExtraBlockValue(128, () => 1.0);
      const pool = getRollPool(128);
      expect(pool).toContain(result);
    });

    it("handles negative random safely", () => {
      const result = rollExtraBlockValue(32, () => -0.5);
      expect(result).toBe(getRollPool(32)[0]);
    });
  });

  describe("ensureBonusBlocks", () => {
    it("returns empty array when queue already has enough", () => {
      const blocks = ensureBonusBlocks(10, 5, 3, 4);
      expect(blocks).toHaveLength(0);
    });

    it("fills to meet count requirement", () => {
      const blocks = ensureBonusBlocks(2, 3, 3, 64, () => 0.5);
      // totalQueueLength=2, need nextBlockIndex+count=6, so need 4 blocks
      expect(blocks).toHaveLength(4);
    });
  });

  describe("rollNextValue (endless mode)", () => {
    it("returns value from the correct pool for low score", () => {
      const result = rollNextValue(4, 0, () => 0.5);
      expect([2, 4]).toContain(result);
    });

    it("includes 8 when maxValue >= 32 or score >= 160", () => {
      const pool = getEndlessRollPool(16, 160);
      expect(pool).toContain(8);
    });

    it("includes 16 when maxValue >= 128", () => {
      const pool = getEndlessRollPool(128, 0);
      expect(pool).toContain(16);
    });

    it("includes 32 when maxValue >= 512", () => {
      const pool = getEndlessRollPool(512, 0);
      expect(pool).toContain(32);
    });

    it("handles random = 1.0 safely", () => {
      const result = rollNextValue(512, 500, () => 1.0);
      const pool = getEndlessRollPool(512, 500);
      expect(pool).toContain(result);
    });
  });
});
