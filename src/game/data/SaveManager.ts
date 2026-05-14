import { LEVELS } from "../levels";
import { createDefaultSave, mergeSaveData } from "../utils/scoring";
import type { EndlessSave, LevelSave, SaveData } from "../utils/types";

const SAVE_KEY = "drop-merge.save.v1";

export class SaveManager {
  private static cached: SaveData | null = null;

  static load(): SaveData {
    if (this.cached) {
      return structuredClone(this.cached);
    }

    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<SaveData>) : null;
      this.cached = mergeSaveData(parsed, LEVELS.length);
    } catch {
      this.cached = createDefaultSave(LEVELS.length);
    }

    this.persist(this.cached);
    return structuredClone(this.cached);
  }

  static save(data: SaveData): void {
    this.cached = mergeSaveData(data, LEVELS.length);
    this.persist(this.cached);
  }

  static updateLevel(levelId: number, stepsUsed: number, stars: 1 | 2 | 3): LevelSave {
    const save = this.load();
    const current = save.levels[levelId] ?? {
      completed: false,
      bestSteps: null,
      stars: 0
    };

    const bestSteps = current.bestSteps === null ? stepsUsed : Math.min(current.bestSteps, stepsUsed);
    const updated: LevelSave = {
      completed: true,
      bestSteps,
      stars: Math.max(current.stars, stars) as LevelSave["stars"]
    };

    save.levels[levelId] = updated;
    save.unlockedLevel = Math.min(Math.max(save.unlockedLevel, levelId + 1), LEVELS.length);
    this.save(save);
    return updated;
  }

  static updateEndless(score: number, bestTile: number): EndlessSave {
    const save = this.load();
    const updated: EndlessSave = {
      bestScore: Math.max(save.endless.bestScore, score),
      bestTile: Math.max(save.endless.bestTile, bestTile),
      gamesPlayed: save.endless.gamesPlayed + 1
    };

    save.endless = updated;
    this.save(save);
    return updated;
  }

  static setSettings(settings: SaveData["settings"]): void {
    const save = this.load();
    save.settings = settings;
    this.save(save);
  }

  static reset(): void {
    this.cached = createDefaultSave(LEVELS.length);
    this.persist(this.cached);
  }

  private static persist(data: SaveData): void {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }
}
