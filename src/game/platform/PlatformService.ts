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

  shareScore(levelId: number, time: number, stars: number): void {
    console.info(`[platform:${this.platform}] share score`, { levelId, time, stars });
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
