import { SaveManager } from "../data/SaveManager";

export type PlatformType = "browser" | "douyin";

export class PlatformService {
  private static instance: PlatformService | null = null;

  private readonly platform: PlatformType;

  private constructor() {
    this.platform = "browser";
  }

  static getInstance(): PlatformService {
    this.instance ??= new PlatformService();
    return this.instance;
  }

  getPlatform(): PlatformType {
    return this.platform;
  }

  async showRewardedAd(scene: string): Promise<boolean> {
    console.info(`[platform:${this.platform}] rewarded ad`, { scene });
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    return true;
  }

  shareScore(levelId: number, stepsUsed: number, stars: number): void {
    console.info(`[platform:${this.platform}] share score`, { levelId, stepsUsed, stars });
  }

  boastLevelResult(levelId: number, stepsUsed: number, defeatedPercent: number): string {
    const topPercent = Math.max(1, 100 - defeatedPercent);
    const text = `我只用 ${stepsUsed} 步解开了第 ${levelId} 关，全网排名前 ${topPercent}%！`;
    console.log(`[platform:${this.platform}] boast level result`, { text });
    return text;
  }

  shareEndlessScore(score: number, bestTile: number): void {
    console.info(`[platform:${this.platform}] share endless score`, { score, bestTile });
  }

  vibrateShort(): void {
    if (!this.canVibrate()) {
      return;
    }

    console.info(`[platform:${this.platform}] vibrateShort`);
    window.navigator.vibrate?.(20);
  }

  getLaunchOptions(): Record<string, unknown> {
    const options = this.readBrowserLaunchOptions();
    console.info(`[platform:${this.platform}] getLaunchOptions`, options);
    return options;
  }

  async login(): Promise<{ anonymous: boolean }> {
    console.info(`[platform:${this.platform}] login`);
    return { anonymous: true };
  }

  private canVibrate(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return SaveManager.load().settings.vibration;
    } catch {
      return true;
    }
  }

  private readBrowserLaunchOptions(): Record<string, string> {
    if (typeof window === "undefined") {
      return {};
    }

    return Object.fromEntries(new URLSearchParams(window.location.search).entries());
  }
}
