import type { SaveData, StarSteps } from "./types";

export function getStarsForSteps(stepsUsed: number, starSteps: StarSteps): 0 | 1 | 2 | 3 {
  if (stepsUsed <= starSteps.three) {
    return 3;
  }

  if (stepsUsed <= starSteps.two) {
    return 2;
  }

  if (stepsUsed <= starSteps.one) {
    return 1;
  }

  return 0;
}

export function getDefeatedPercent(stars: number, stepsUsed: number): number {
  return Math.min(99, Math.max(52, 56 + stars * 12 + Math.max(0, 12 - stepsUsed) * 2));
}

export function createDefaultSave(totalLevels: number): SaveData {
  const levels = Object.fromEntries(
    Array.from({ length: totalLevels }, (_, index) => [
      index + 1,
      {
        completed: false,
        bestSteps: null,
        stars: 0
      }
    ])
  ) as SaveData["levels"];

  return {
    unlockedLevel: 1,
    levels,
    endless: {
      bestScore: 0,
      bestTile: 0,
      gamesPlayed: 0
    },
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
    endless: {
      ...fallback.endless,
      ...existing.endless
    },
    settings: {
      ...fallback.settings,
      ...existing.settings
    }
  };
}
