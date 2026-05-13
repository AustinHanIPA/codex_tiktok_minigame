import type { SaveData, StarTimes } from "./types";

export function getStarsForTime(elapsed: number, starTimes: StarTimes): 0 | 1 | 2 | 3 {
  if (elapsed <= starTimes.three) {
    return 3;
  }

  if (elapsed <= starTimes.two) {
    return 2;
  }

  if (elapsed <= starTimes.one) {
    return 1;
  }

  return 0;
}

export function formatTime(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

export function createDefaultSave(totalLevels: number): SaveData {
  const levels = Object.fromEntries(
    Array.from({ length: totalLevels }, (_, index) => [
      index + 1,
      {
        completed: false,
        bestTime: null,
        stars: 0
      }
    ])
  ) as SaveData["levels"];

  return {
    unlockedLevel: 1,
    levels,
    settings: {
      sound: true,
      vibration: true
    }
  };
}

export function mergeSaveData(existing: Partial<SaveData> | null, totalLevels: number): SaveData {
  const fallback = createDefaultSave(totalLevels);

  if (!existing) {
    return fallback;
  }

  return {
    unlockedLevel: Math.min(Math.max(existing.unlockedLevel ?? 1, 1), totalLevels),
    levels: {
      ...fallback.levels,
      ...existing.levels
    },
    settings: {
      ...fallback.settings,
      ...existing.settings
    }
  };
}
