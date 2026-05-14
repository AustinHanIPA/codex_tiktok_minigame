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
    console.info(`[platform:${this.platform}] vibrateShort`);
    window.navigator.vibrate?.(20);
  }

  getLaunchOptions(): Record<string, unknown> {
    console.info(`[platform:${this.platform}] getLaunchOptions`);
    return {};
  }

  async login(): Promise<{ anonymous: boolean }> {
    console.info(`[platform:${this.platform}] login`);
    return { anonymous: true };
  }
}
