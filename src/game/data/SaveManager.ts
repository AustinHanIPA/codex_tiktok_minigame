import { LEVELS } from "../levels";
import { createDefaultSave, mergeSaveData } from "../utils/scoring";
import type { LevelSave, SaveData } from "../utils/types";

const SAVE_KEY = "mechanical-ball-run.save.v1";

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

  static updateLevel(levelId: number, elapsed: number, stars: 1 | 2 | 3): LevelSave {
    const save = this.load();
    const current = save.levels[levelId] ?? {
      completed: false,
      bestTime: null,
      stars: 0
    };

    const bestTime = current.bestTime === null ? elapsed : Math.min(current.bestTime, elapsed);
    const updated: LevelSave = {
      completed: true,
      bestTime,
      stars: Math.max(current.stars, stars) as LevelSave["stars"]
    };

    save.levels[levelId] = updated;
    save.unlockedLevel = Math.min(Math.max(save.unlockedLevel, levelId + 1), LEVELS.length);
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
