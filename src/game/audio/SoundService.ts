import { SaveManager } from "../data/SaveManager";

export type SoundCue = "click" | "move" | "drop" | "blocked" | "hammer" | "reward" | "success" | "fail";

interface Tone {
  frequency: number;
  duration: number;
  delay?: number;
  volume?: number;
  type?: OscillatorType;
}

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const CUES: Record<SoundCue, Tone[]> = {
  click: [{ frequency: 540, duration: 0.045, volume: 0.035, type: "triangle" }],
  move: [{ frequency: 360, duration: 0.055, volume: 0.03, type: "square" }],
  drop: [{ frequency: 160, duration: 0.075, volume: 0.045, type: "triangle" }],
  blocked: [{ frequency: 120, duration: 0.08, volume: 0.04, type: "sawtooth" }],
  hammer: [
    { frequency: 210, duration: 0.055, volume: 0.055, type: "square" },
    { frequency: 92, duration: 0.08, delay: 0.045, volume: 0.04, type: "triangle" }
  ],
  reward: [
    { frequency: 520, duration: 0.08, volume: 0.04, type: "triangle" },
    { frequency: 720, duration: 0.09, delay: 0.07, volume: 0.04, type: "triangle" }
  ],
  success: [
    { frequency: 440, duration: 0.08, volume: 0.04, type: "triangle" },
    { frequency: 660, duration: 0.09, delay: 0.075, volume: 0.045, type: "triangle" },
    { frequency: 880, duration: 0.13, delay: 0.155, volume: 0.045, type: "triangle" }
  ],
  fail: [
    { frequency: 220, duration: 0.12, volume: 0.045, type: "sawtooth" },
    { frequency: 140, duration: 0.16, delay: 0.09, volume: 0.04, type: "sawtooth" }
  ]
};

export class SoundService {
  private static context: AudioContext | null = null;

  static play(cue: SoundCue): void {
    this.playTones(CUES[cue]);
  }

  static playMerge(groupCount: number): void {
    const lift = Math.min(groupCount, 5) * 42;
    this.playTones([
      { frequency: 430 + lift, duration: 0.07, volume: 0.04, type: "triangle" },
      { frequency: 620 + lift, duration: 0.095, delay: 0.055, volume: 0.035, type: "triangle" }
    ]);
  }

  private static playTones(tones: Tone[]): void {
    if (!this.isEnabled()) {
      return;
    }

    const context = this.getContext();

    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    for (const tone of tones) {
      this.playTone(context, tone);
    }
  }

  private static getContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }

    if (this.context) {
      return this.context;
    }

    const audioWindow = window as AudioWindow;
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    this.context = new AudioContextConstructor();
    return this.context;
  }

  private static isEnabled(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return SaveManager.load().settings.sound;
    } catch {
      return true;
    }
  }

  private static playTone(context: AudioContext, tone: Tone): void {
    const startAt = context.currentTime + (tone.delay ?? 0);
    const stopAt = startAt + tone.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const volume = tone.volume ?? 0.04;

    oscillator.type = tone.type ?? "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.02);
  }
}
