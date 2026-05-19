type EventPayload = Record<string, string | number | boolean | null | undefined>;

interface TrackEvent {
  name: string;
  payload: EventPayload;
  timestamp: number;
}

interface EventTrackerConfig {
  /** 是否启用网络上报（默认 false，通过 VITE_ENABLE_REPORT=true 开启） */
  enableReport: boolean;
  /** 是否打印到 console（默认 true） */
  enableConsole: boolean;
  /** 网络失败后是否重新入队重试（独立于 console 配置） */
  enableRetry: boolean;
  /** 上报接口地址 */
  endpoint: string;
  /** 自动 flush 间隔 (ms) */
  flushInterval: number;
  /** 队列最大条数，满时触发 flush */
  maxQueueSize: number;
}

const DEFAULT_CONFIG: EventTrackerConfig = {
  enableReport: import.meta.env.VITE_ENABLE_REPORT === "true",
  enableConsole: true,
  enableRetry: true,
  endpoint: import.meta.env.VITE_REPORT_ENDPOINT as string || "/api/events",
  flushInterval: 5000,
  maxQueueSize: 20
};

class EventTrackerService {
  private queue: TrackEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private config: EventTrackerConfig;
  private handleVisibilityChange: (() => void) | null = null;
  private handlePageHide: (() => void) | null = null;

  constructor(config: Partial<EventTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableReport) {
      this.startAutoFlush();
      this.bindPageHide();
    }
  }

  track(name: string, payload: EventPayload = {}): void {
    if (this.config.enableConsole) {
      console.info(`[track] ${name}`, payload);
    }

    if (!this.config.enableReport) {
      return;
    }

    this.queue.push({ name, payload, timestamp: Date.now() });

    if (this.queue.length >= this.config.maxQueueSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);

    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
        keepalive: true
      });

      if (!response.ok && this.config.enableRetry) {
        this.requeue(batch);
      }
    } catch {
      if (this.config.enableRetry) {
        this.requeue(batch);
      }
    }
  }

  setConsole(enabled: boolean): void {
    this.config.enableConsole = enabled;
  }

  setRetry(enabled: boolean): void {
    this.config.enableRetry = enabled;
  }

  destroy(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.handleVisibilityChange) {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      this.handleVisibilityChange = null;
    }
    if (this.handlePageHide) {
      window.removeEventListener("pagehide", this.handlePageHide);
      this.handlePageHide = null;
    }

    this.beaconFlush();
  }

  /**
   * 使用 sendBeacon 做离页/销毁最终上报，保证数据不丢。
   * sendBeacon 失败或不可用时 fallback 到 fetch keepalive (best-effort)。
   */
  private beaconFlush(): void {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);
    const payload = JSON.stringify({ events: batch });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon(this.config.endpoint, blob);

      if (!sent) {
        // sendBeacon 失败 → 尝试 fetch keepalive 作为最后手段
        this.keepaliveFallback(payload);
      }
    } else {
      this.keepaliveFallback(payload);
    }
  }

  /** fetch keepalive best-effort 兜底 */
  private keepaliveFallback(payload: string): void {
    void fetch(this.config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => { /* page is unloading, nothing we can do */ });
  }

  private requeue(batch: TrackEvent[]): void {
    if (this.queue.length + batch.length <= this.config.maxQueueSize * 2) {
      this.queue.unshift(...batch);
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval);
  }

  private bindPageHide(): void {
    if (typeof document === "undefined") {
      return;
    }

    this.handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        this.beaconFlush();
      }
    };

    this.handlePageHide = () => {
      this.beaconFlush();
    };

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pagehide", this.handlePageHide);
  }
}

export const EventTracker: EventTrackerService =
  typeof window !== "undefined" ? new EventTrackerService() : ({
    track: () => {},
    flush: () => Promise.resolve()
  } as unknown as EventTrackerService);
