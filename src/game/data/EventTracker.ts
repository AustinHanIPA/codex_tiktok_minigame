type EventPayload = Record<string, string | number | boolean | null | undefined>;

export class EventTracker {
  static track(name: string, payload: EventPayload = {}): void {
    console.info(`[track] ${name}`, payload);
  }
}
