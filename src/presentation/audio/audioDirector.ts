export type SoundCue =
  | "purchase"
  | "sell"
  | "merge"
  | "merge2"
  | "merge3"
  | "reroll"
  | "select"
  | "error"
  | "cauldronFull"
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

export type AudioScene = "shop" | "battle" | "boss" | "result";

export interface AudioSettings {
  readonly enabled: boolean;
  readonly master: number;
  readonly music: number;
  readonly sfx: number;
  readonly combat: number;
}

export interface AudioPlayOptions {
  readonly pan?: number;
  readonly emphasis?: "ambient" | "standard" | "hero";
  readonly gainScale?: number;
  readonly playbackRateScale?: number;
}

interface ItemAudioProfile {
  readonly rate: number;
  readonly gain: number;
  readonly accent?: SoundCue;
  readonly accentDelayMs?: number;
}

type AudioBusName = "music" | "ambience" | "ui" | "combat";

interface SoundSpec {
  readonly path: string;
  readonly bus: "ui" | "combat";
  readonly gain: number;
  readonly cooldownMs: number;
  readonly maxVoices: number;
  readonly pitchVariation?: number;
  readonly playbackRate?: number;
}

interface MediaVoice {
  readonly media: HTMLAudioElement;
  readonly source: MediaElementAudioSourceNode;
  readonly gain: GainNode;
  readonly track: "menu" | "battle" | "boss" | "ambience";
}

interface ToneOptions {
  readonly frequency: number;
  readonly endFrequency?: number;
  readonly duration: number;
  readonly gain: number;
  readonly type?: OscillatorType;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  enabled: true,
  master: 0.82,
  music: 0.56,
  sfx: 0.78,
  combat: 0.86,
};

const AUDIO_ROOT = "assets/audio";
const MUSIC_FADE_SECONDS = 0.75;
const AMBIENCE_FADE_SECONDS = 0.5;

const SOUND_SPECS: Readonly<Partial<Record<SoundCue, SoundSpec>>> = {
  purchase: { path: "sfx/coin-transfer.ogg", bus: "ui", gain: 0.72, cooldownMs: 90, maxVoices: 2 },
  sell: { path: "sfx/sell.ogg", bus: "ui", gain: 0.72, cooldownMs: 90, maxVoices: 2 },
  merge: { path: "sfx/merge-level-2.ogg", bus: "ui", gain: 0.82, cooldownMs: 120, maxVoices: 2 },
  merge2: { path: "sfx/merge-level-2.ogg", bus: "ui", gain: 0.84, cooldownMs: 120, maxVoices: 2 },
  merge3: { path: "sfx/merge-level-3.ogg", bus: "ui", gain: 0.92, cooldownMs: 180, maxVoices: 1 },
  reroll: { path: "sfx/reroll.ogg", bus: "ui", gain: 0.76, cooldownMs: 140, maxVoices: 1 },
  select: { path: "sfx/ui-select.ogg", bus: "ui", gain: 0.62, cooldownMs: 45, maxVoices: 2 },
  error: { path: "sfx/error.ogg", bus: "ui", gain: 0.78, cooldownMs: 160, maxVoices: 1 },
  cauldronFull: { path: "sfx/cauldron-full.ogg", bus: "ui", gain: 0.82, cooldownMs: 260, maxVoices: 1 },
  battleStart: { path: "sfx/cauldron-full.ogg", bus: "ui", gain: 0.9, cooldownMs: 700, maxVoices: 1, playbackRate: 0.88 },
  fire: { path: "combat/fire.ogg", bus: "combat", gain: 0.76, cooldownMs: 115, maxVoices: 2, pitchVariation: 0.025 },
  damage: { path: "combat/hit.ogg", bus: "combat", gain: 0.72, cooldownMs: 90, maxVoices: 3, pitchVariation: 0.035 },
  poison: { path: "combat/poison.ogg", bus: "combat", gain: 0.7, cooldownMs: 130, maxVoices: 2, pitchVariation: 0.02 },
  shield: { path: "combat/shield.ogg", bus: "combat", gain: 0.74, cooldownMs: 150, maxVoices: 2, pitchVariation: 0.015 },
  heal: { path: "combat/heal.ogg", bus: "combat", gain: 0.76, cooldownMs: 170, maxVoices: 2, pitchVariation: 0.012 },
  frost: { path: "combat/frost.ogg", bus: "combat", gain: 0.76, cooldownMs: 135, maxVoices: 2, pitchVariation: 0.018 },
  echo: { path: "combat/echo.ogg", bus: "combat", gain: 0.72, cooldownMs: 160, maxVoices: 2, pitchVariation: 0.012 },
  boss: { path: "combat/hit.ogg", bus: "combat", gain: 0.9, cooldownMs: 320, maxVoices: 1, playbackRate: 0.72 },
  victory: { path: "sfx/result-victory.ogg", bus: "ui", gain: 0.92, cooldownMs: 1000, maxVoices: 1 },
  defeat: { path: "sfx/result-defeat.ogg", bus: "ui", gain: 0.88, cooldownMs: 1000, maxVoices: 1 },
};

const ITEM_AUDIO_PROFILES: Readonly<Record<string, ItemAudioProfile>> = {
  chili: { rate: 1.12, gain: 0.94, accent: "damage", accentDelayMs: 92 },
  "dragon-tooth": { rate: 0.78, gain: 1.12, accent: "damage", accentDelayMs: 128 },
  "ember-core": { rate: 0.9, gain: 1.04, accent: "damage", accentDelayMs: 112 },
  "cinder-berry": { rate: 1.04, gain: 1, accent: "damage", accentDelayMs: 96 },
  "slime-shroom": { rate: 0.86, gain: 1.04, accent: "damage", accentDelayMs: 168 },
  nightwing: { rate: 1.16, gain: 0.92, accent: "echo", accentDelayMs: 78 },
  "witch-eye": { rate: 0.82, gain: 1.04, accent: "echo", accentDelayMs: 126 },
  "venom-bulb": { rate: 0.76, gain: 1.1, accent: "damage", accentDelayMs: 154 },
  "egg-shell": { rate: 1.08, gain: 0.94 },
  "healing-tuber": { rate: 0.84, gain: 1.02, accent: "shield", accentDelayMs: 144 },
  "gold-spoon": { rate: 1.2, gain: 0.9, accent: "heal", accentDelayMs: 86 },
  "moon-salt": { rate: 1.13, gain: 0.94, accent: "frost", accentDelayMs: 102 },
  "frost-shard": { rate: 1.18, gain: 0.94, accent: "damage", accentDelayMs: 76 },
  "ice-bell": { rate: 0.94, gain: 1.02, accent: "shield", accentDelayMs: 118 },
  "winter-bloom": { rate: 0.82, gain: 1.04, accent: "heal", accentDelayMs: 142 },
  "rime-clock": { rate: 1.08, gain: 0.94, accent: "echo", accentDelayMs: 104 },
  "mirror-shard": { rate: 1.2, gain: 0.94, accent: "damage", accentDelayMs: 82 },
  "echo-bell": { rate: 0.88, gain: 1.08, accent: "echo", accentDelayMs: 152 },
  "rune-cup": { rate: 0.9, gain: 1.02, accent: "shield", accentDelayMs: 126 },
  "time-thread": { rate: 0.74, gain: 1.12, accent: "echo", accentDelayMs: 178 },
};

const SCENE_TRACKS: Readonly<Record<AudioScene, "menu" | "battle" | "boss" | null>> = {
  shop: "menu",
  battle: "battle",
  boss: "boss",
  result: null,
};

const MUSIC_PATHS = {
  menu: "music/menu.ogg",
  battle: "music/battle.ogg",
  boss: "music/boss.ogg",
} as const;

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function normalizeAudioSettings(settings: Partial<AudioSettings>): AudioSettings {
  return {
    enabled: settings.enabled ?? DEFAULT_AUDIO_SETTINGS.enabled,
    master: clampVolume(settings.master ?? DEFAULT_AUDIO_SETTINGS.master),
    music: clampVolume(settings.music ?? DEFAULT_AUDIO_SETTINGS.music),
    sfx: clampVolume(settings.sfx ?? DEFAULT_AUDIO_SETTINGS.sfx),
    combat: clampVolume(settings.combat ?? DEFAULT_AUDIO_SETTINGS.combat),
  };
}

function assetUrl(path: string): string {
  return new URL(`${AUDIO_ROOT}/${path}`, document.baseURI).href;
}

class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<AudioBusName, GainNode>> = {};
  private settings = DEFAULT_AUDIO_SETTINGS;
  private desiredScene: AudioScene = "shop";
  private currentMusic: MediaVoice | null = null;
  private currentAmbience: MediaVoice | null = null;
  private rawAudio = new Map<string, Promise<ArrayBuffer>>();
  private decodedAudio = new Map<string, Promise<AudioBuffer>>();
  private activeVoices = new Map<SoundCue, number>();
  private lastPlayedAt = new Map<SoundCue, number>();
  private sceneTransition: Promise<void> = Promise.resolve();

  setSettings(settings: AudioSettings): void {
    const wasEnabled = this.settings.enabled;
    this.settings = normalizeAudioSettings(settings);
    this.applyBusLevels();
    if (!this.settings.enabled) {
      this.pauseMedia();
      return;
    }
    if (!wasEnabled) void this.activate();
  }

  setEnabled(enabled: boolean): void {
    this.setSettings({ ...this.settings, enabled });
  }

  isEnabled(): boolean {
    return this.settings.enabled;
  }

  setScene(scene: AudioScene): void {
    this.desiredScene = scene;
    if (this.context && this.settings.enabled) void this.queueSceneTransition();
  }

  warm(): void {
    if (typeof window === "undefined") return;
    for (const spec of Object.values(SOUND_SPECS)) {
      if (spec) void this.fetchAudio(spec.path).catch(() => undefined);
    }
    for (const path of Object.values(MUSIC_PATHS)) {
      const media = new Audio(assetUrl(path));
      media.preload = "metadata";
    }
  }

  async activate(): Promise<void> {
    if (!this.settings.enabled || typeof window === "undefined") return;
    const context = this.ensureContext();
    if (context.state === "suspended") await context.resume();
    this.applyBusLevels();
    await this.queueSceneTransition();
    void this.predecodeCommonSounds();
  }

  play(cue: SoundCue, options: AudioPlayOptions = {}): void {
    if (!this.settings.enabled || typeof window === "undefined") return;
    void this.activate().then(async () => {
      const spec = SOUND_SPECS[cue];
      if (!spec) {
        this.playFallbackTone(cue);
        return;
      }
      const now = performance.now();
      const emphasis = options.emphasis ?? "standard";
      const cooldown = emphasis === "hero" ? spec.cooldownMs * 0.45 : spec.cooldownMs;
      if (now - (this.lastPlayedAt.get(cue) ?? Number.NEGATIVE_INFINITY) < cooldown) return;
      if ((this.activeVoices.get(cue) ?? 0) >= spec.maxVoices && emphasis !== "hero") return;
      this.lastPlayedAt.set(cue, now);
      try {
        const buffer = await this.decodeAudio(spec.path);
        this.playBuffer(cue, spec, buffer, options);
      } catch {
        this.playFallbackTone(cue);
      }
    }).catch(() => this.playFallbackTone(cue));
  }

  playCombat(cue: SoundCue, itemId: string | undefined, options: AudioPlayOptions = {}): void {
    const profile = itemId ? ITEM_AUDIO_PROFILES[itemId] : undefined;
    this.play(cue, {
      ...options,
      gainScale: (options.gainScale ?? 1) * (profile?.gain ?? 1),
      playbackRateScale: (options.playbackRateScale ?? 1) * (profile?.rate ?? 1),
    });
    if (!profile?.accent || profile.accent === cue) return;
    window.setTimeout(() => this.play(profile.accent as SoundCue, {
      ...options,
      emphasis: options.emphasis === "hero" ? "hero" : "ambient",
      gainScale: (options.gainScale ?? 1) * 0.48,
      playbackRateScale: profile.rate,
    }), profile.accentDelayMs ?? 100);
  }

  private ensureContext(): AudioContext {
    if (this.context) return this.context;
    const Context = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) throw new Error("Web Audio wird von diesem Browser nicht unterstützt.");
    const context = new Context({ latencyHint: "interactive" });
    const master = context.createGain();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 4;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.16;
    master.connect(limiter).connect(context.destination);
    this.context = context;
    this.master = master;
    for (const name of ["music", "ambience", "ui", "combat"] as const) {
      const bus = context.createGain();
      bus.connect(master);
      this.buses[name] = bus;
    }
    this.applyBusLevels();
    return context;
  }

  private applyBusLevels(): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.settings.enabled ? this.settings.master : 0, now, 0.025);
    this.buses.music?.gain.setTargetAtTime(this.settings.music, now, 0.025);
    this.buses.ambience?.gain.setTargetAtTime(this.settings.music * 0.38, now, 0.025);
    this.buses.ui?.gain.setTargetAtTime(this.settings.sfx, now, 0.025);
    this.buses.combat?.gain.setTargetAtTime(this.settings.sfx * this.settings.combat, now, 0.025);
  }

  private fetchAudio(path: string): Promise<ArrayBuffer> {
    const existing = this.rawAudio.get(path);
    if (existing) return existing;
    const request = fetch(assetUrl(path), { cache: "force-cache" }).then(async (response) => {
      if (!response.ok) throw new Error(`${response.status}: ${path}`);
      return response.arrayBuffer();
    }).catch((error: unknown) => {
      this.rawAudio.delete(path);
      throw error;
    });
    this.rawAudio.set(path, request);
    return request;
  }

  private decodeAudio(path: string): Promise<AudioBuffer> {
    const existing = this.decodedAudio.get(path);
    if (existing) return existing;
    const context = this.ensureContext();
    const request = this.fetchAudio(path).then((data) => context.decodeAudioData(data.slice(0))).catch((error: unknown) => {
      this.decodedAudio.delete(path);
      throw error;
    });
    this.decodedAudio.set(path, request);
    return request;
  }

  private async predecodeCommonSounds(): Promise<void> {
    const common: SoundCue[] = ["select", "purchase", "merge2", "merge3", "reroll", "error", "damage"];
    await Promise.all(common.flatMap((cue) => {
      const spec = SOUND_SPECS[cue];
      return spec ? [this.decodeAudio(spec.path).catch(() => undefined)] : [];
    }));
  }

  private playBuffer(cue: SoundCue, spec: SoundSpec, buffer: AudioBuffer, options: AudioPlayOptions): void {
    if (!this.context) return;
    const bus = this.buses[spec.bus];
    if (!bus) return;
    const source = this.context.createBufferSource();
    const voiceGain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    const pitchVariation = spec.pitchVariation ?? 0;
    source.buffer = buffer;
    source.playbackRate.value = (spec.playbackRate ?? 1) * (options.playbackRateScale ?? 1) * (1 + (Math.random() * 2 - 1) * pitchVariation);
    voiceGain.gain.value = spec.gain * (options.gainScale ?? 1) * (options.emphasis === "hero" ? 1.08 : 1);
    panner.pan.value = Math.max(-0.4, Math.min(0.4, options.pan ?? 0));
    source.connect(voiceGain).connect(panner).connect(bus);
    this.activeVoices.set(cue, (this.activeVoices.get(cue) ?? 0) + 1);
    source.onended = () => {
      this.activeVoices.set(cue, Math.max(0, (this.activeVoices.get(cue) ?? 1) - 1));
      source.disconnect();
      voiceGain.disconnect();
      panner.disconnect();
    };
    source.start();
    if (spec.bus === "combat") this.duckMusic(options.emphasis === "hero" ? 0.72 : 0.84);
  }

  private duckMusic(multiplier: number): void {
    if (!this.context || !this.buses.music) return;
    const bus = this.buses.music;
    const now = this.context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(this.settings.music * multiplier, now + 0.018);
    bus.gain.linearRampToValueAtTime(this.settings.music, now + 0.19);
  }

  private async transitionScene(): Promise<void> {
    if (!this.context || !this.settings.enabled) return;
    const desiredTrack = SCENE_TRACKS[this.desiredScene];
    if (this.currentMusic?.track !== desiredTrack) {
      const previous = this.currentMusic;
      this.currentMusic = desiredTrack ? await this.createMediaVoice(desiredTrack, MUSIC_PATHS[desiredTrack], "music") : null;
      if (previous) this.fadeOutAndStop(previous, MUSIC_FADE_SECONDS);
      if (this.currentMusic) await this.fadeIn(this.currentMusic, MUSIC_FADE_SECONDS);
    } else if (this.currentMusic?.media.paused) {
      await this.currentMusic.media.play().catch(() => undefined);
    }

    const wantsAmbience = this.desiredScene === "shop";
    if (wantsAmbience && !this.currentAmbience) {
      this.currentAmbience = await this.createMediaVoice("ambience", "ambience/cauldron-bubbles.ogg", "ambience");
      await this.fadeIn(this.currentAmbience, AMBIENCE_FADE_SECONDS);
    } else if (wantsAmbience && this.currentAmbience?.media.paused) {
      await this.currentAmbience.media.play().catch(() => undefined);
    } else if (!wantsAmbience && this.currentAmbience) {
      const previous = this.currentAmbience;
      this.currentAmbience = null;
      this.fadeOutAndStop(previous, AMBIENCE_FADE_SECONDS);
    }
  }

  private queueSceneTransition(): Promise<void> {
    this.sceneTransition = this.sceneTransition
      .then(() => this.transitionScene())
      .catch(() => undefined);
    return this.sceneTransition;
  }

  private async createMediaVoice(track: MediaVoice["track"], path: string, busName: "music" | "ambience"): Promise<MediaVoice> {
    const context = this.ensureContext();
    const media = new Audio(assetUrl(path));
    media.loop = true;
    media.preload = "auto";
    const source = context.createMediaElementSource(media);
    const gain = context.createGain();
    gain.gain.value = 0.0001;
    source.connect(gain).connect(this.buses[busName] as GainNode);
    return { media, source, gain, track };
  }

  private async fadeIn(voice: MediaVoice, seconds: number): Promise<void> {
    if (!this.context) return;
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(0.0001, now);
    voice.gain.gain.exponentialRampToValueAtTime(1, now + seconds);
    await voice.media.play().catch(() => undefined);
  }

  private fadeOutAndStop(voice: MediaVoice, seconds: number): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    window.setTimeout(() => {
      voice.media.pause();
      voice.media.currentTime = 0;
      voice.source.disconnect();
      voice.gain.disconnect();
    }, seconds * 1000 + 80);
  }

  private pauseMedia(): void {
    this.currentMusic?.media.pause();
    this.currentAmbience?.media.pause();
  }

  private playFallbackTone(cue: SoundCue): void {
    if (!this.settings.enabled || !this.context || !this.buses.ui) return;
    const combat = ["fire", "damage", "poison", "shield", "heal", "frost", "echo", "boss"].includes(cue);
    const options: ToneOptions = combat
      ? { frequency: cue === "boss" ? 82 : 180, endFrequency: cue === "heal" ? 520 : 110, duration: 0.14, gain: 0.035, type: "triangle" }
      : { frequency: cue === "error" ? 170 : 520, endFrequency: cue === "error" ? 120 : 660, duration: 0.1, gain: 0.025, type: "sine" };
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime;
    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(options.frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency ?? options.frequency), start + options.duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.gain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
    oscillator.connect(gain).connect(combat ? (this.buses.combat as GainNode) : this.buses.ui);
    oscillator.start(start);
    oscillator.stop(start + options.duration + 0.02);
  }
}

export const audioDirector = new AudioDirector();
