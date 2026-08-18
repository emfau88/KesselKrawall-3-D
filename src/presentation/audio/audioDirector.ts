export type SoundCue =
  | "purchase"
  | "merge"
  | "reroll"
  | "select"
  | "error"
  | "battleStart"
  | "fire"
  | "damage"
  | "poison"
  | "shield"
  | "heal"
  | "frost"
  | "echo"
  | "boss"
  | "victory"
  | "defeat";

interface ToneOptions {
  readonly frequency: number;
  readonly endFrequency?: number;
  readonly duration: number;
  readonly gain: number;
  readonly delay?: number;
  readonly type?: OscillatorType;
}

class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private ambienceTimer: number | null = null;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      if (this.master && this.context) {
        this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.02);
      }
      this.stopAmbience();
      return;
    }
    void this.ensureContext().then(() => {
      if (this.master && this.context) {
        this.master.gain.setTargetAtTime(0.28, this.context.currentTime, 0.03);
      }
      this.startAmbience();
      this.play("select");
    }).catch(() => undefined);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(cue: SoundCue): void {
    if (!this.enabled) return;
    void this.ensureContext().then(() => {
      switch (cue) {
        case "purchase":
          this.tone({ frequency: 420, endFrequency: 690, duration: 0.16, gain: 0.12, type: "triangle" });
          this.tone({ frequency: 820, duration: 0.08, gain: 0.06, delay: 0.1, type: "sine" });
          break;
        case "merge":
          [360, 540, 760].forEach((frequency, index) =>
            this.tone({ frequency, endFrequency: frequency * 1.18, duration: 0.28, gain: 0.1, delay: index * 0.055, type: "triangle" }),
          );
          break;
        case "reroll":
          this.tone({ frequency: 720, endFrequency: 260, duration: 0.22, gain: 0.08, type: "sine" });
          this.noise(0.16, 0.035, 1200);
          break;
        case "select":
          this.tone({ frequency: 560, duration: 0.055, gain: 0.055, type: "sine" });
          break;
        case "error":
          this.tone({ frequency: 180, endFrequency: 135, duration: 0.14, gain: 0.09, type: "square" });
          break;
        case "battleStart":
          this.tone({ frequency: 110, endFrequency: 190, duration: 0.42, gain: 0.15, type: "sawtooth" });
          this.tone({ frequency: 330, endFrequency: 520, duration: 0.3, gain: 0.08, delay: 0.18, type: "triangle" });
          break;
        case "fire":
          this.noise(0.14, 0.09, 2_600);
          this.tone({ frequency: 220, endFrequency: 610, duration: 0.19, gain: 0.1, type: "sawtooth" });
          this.tone({ frequency: 780, endFrequency: 420, duration: 0.13, gain: 0.055, delay: 0.11, type: "triangle" });
          break;
        case "damage":
          this.noise(0.11, 0.12, 950);
          this.tone({ frequency: 145, endFrequency: 90, duration: 0.12, gain: 0.12, type: "square" });
          break;
        case "poison":
          this.tone({ frequency: 210, endFrequency: 390, duration: 0.2, gain: 0.075, type: "sine" });
          this.tone({ frequency: 310, endFrequency: 180, duration: 0.17, gain: 0.05, delay: 0.07, type: "sine" });
          break;
        case "shield":
          this.tone({ frequency: 520, endFrequency: 780, duration: 0.25, gain: 0.09, type: "triangle" });
          this.tone({ frequency: 1040, duration: 0.18, gain: 0.04, delay: 0.05, type: "sine" });
          break;
        case "heal":
          [440, 550, 660].forEach((frequency, index) =>
            this.tone({ frequency, duration: 0.18, gain: 0.055, delay: index * 0.06, type: "sine" }),
          );
          break;
        case "frost":
          this.noise(0.17, 0.045, 3600);
          this.tone({ frequency: 1150, endFrequency: 620, duration: 0.22, gain: 0.055, type: "sine" });
          break;
        case "echo":
          this.tone({ frequency: 610, duration: 0.14, gain: 0.07, type: "triangle" });
          this.tone({ frequency: 610, duration: 0.18, gain: 0.04, delay: 0.16, type: "triangle" });
          break;
        case "boss":
          this.tone({ frequency: 90, endFrequency: 62, duration: 0.55, gain: 0.16, type: "sawtooth" });
          this.noise(0.3, 0.06, 500);
          break;
        case "victory":
          [330, 440, 554, 660].forEach((frequency, index) =>
            this.tone({ frequency, duration: 0.34, gain: 0.085, delay: index * 0.09, type: "triangle" }),
          );
          break;
        case "defeat":
          [260, 205, 150].forEach((frequency, index) =>
            this.tone({ frequency, endFrequency: frequency * 0.82, duration: 0.34, gain: 0.08, delay: index * 0.11, type: "triangle" }),
          );
          break;
      }
    }).catch(() => undefined);
  }

  private async ensureContext(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.28 : 0;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
    this.startAmbience();
  }

  private tone(options: ToneOptions): void {
    if (!this.context || !this.master) return;
    const start = this.context.currentTime + (options.delay ?? 0);
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(options.frequency, start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + options.duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.gain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + options.duration + 0.03);
  }

  private noise(duration: number, gainValue: number, cutoff: number): void {
    if (!this.context || !this.master) return;
    const length = Math.ceil(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(gainValue, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }

  private startAmbience(): void {
    if (!this.enabled || this.ambienceTimer !== null || !this.context) return;
    this.ambienceTimer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const frequency = 115 + Math.random() * 55;
      this.tone({ frequency, endFrequency: frequency * 1.7, duration: 0.32, gain: 0.018, type: "sine" });
    }, 3200);
  }

  private stopAmbience(): void {
    if (this.ambienceTimer === null) return;
    window.clearInterval(this.ambienceTimer);
    this.ambienceTimer = null;
  }
}

export const audioDirector = new AudioDirector();
