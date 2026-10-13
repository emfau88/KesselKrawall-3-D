import { MathUtils, Mesh, Object3D, Vector3 } from "three";

export const moods = [
  "idle",
  "joy",
  "charge",
  "attack",
  "hit",
  "defeat",
] as const;
export type Mood = (typeof moods)[number];
export const moodLabels: Record<Mood, string> = {
  idle: "Er beobachtet die Welt, blinzelt und lässt seinen Trank leise köcheln.",
  joy: "Ein zufriedener Blick, ein breites Grinsen und ein hüpfendes Dankeschön.",
  charge:
    "Konzentrierte Augen. Der Trank sammelt Kraft und beginnt zu leuchten.",
  attack:
    "Er holt aus, richtet den Blick auf sein Ziel und entlädt seine Magie.",
  hit: "Ein kurzer Schreck, ein beleidigtes Gesicht und ein überschwappender Trank.",
  defeat:
    "Die Brauen sinken. Der Kessel sackt zusammen, sein Trank kommt zur Ruhe.",
};

export interface CharacterPose {
  energy: number;
  liquidEnergy: number;
  splash: number;
  smile: number;
  surprise: number;
  hurt: number;
  blink: number;
  gazeX: number;
  gazeY: number;
  glow: number;
}

const smooth = (a: number, b: number, t: number) =>
  MathUtils.smoothstep(t, a, b);
const pulse = (t: number, start: number, duration: number) =>
  t < start || t > start + duration
    ? 0
    : Math.sin(((t - start) / duration) * Math.PI);

export class CharacterAnimator {
  readonly pose: CharacterPose = {
    energy: 1,
    liquidEnergy: 1,
    splash: 0,
    smile: 0,
    surprise: 0,
    hurt: 0,
    blink: 0,
    gazeX: 0,
    gazeY: 0,
    glow: 1,
  };
  private readonly faces: Mesh[] = [];
  private readonly rootScale: Vector3;
  private readonly rootPosition: Vector3;

  constructor(private readonly root: Object3D) {
    this.rootScale = root.scale.clone();
    this.rootPosition = root.position.clone();
    root.traverse((node) => {
      if (
        node.name === "Body" &&
        node instanceof Mesh &&
        node.morphTargetDictionary
      )
        this.faces.push(node);
    });
  }

  apply(
    mood: Mood,
    seconds: number,
    reducedMotion: boolean,
    gazeX: number,
    gazeY: number,
  ) {
    const t = Math.max(0, seconds);
    const movement = reducedMotion ? 0.22 : 1;
    const p = this.pose;
    p.energy = 1;
    p.liquidEnergy = 1;
    p.splash = 0;
    p.smile = 0;
    p.surprise = 0;
    p.hurt = 0;
    p.glow = 1;
    p.gazeX = gazeX * 0.012 + Math.sin(t * 0.47) * 0.003;
    p.gazeY = gazeY * 0.008;
    const blinkClock = t % 4.65;
    p.blink = pulse(blinkClock, 3.25, 0.18);
    let bounce = 0;
    let lean = Math.sin(t * 0.7) * 0.012;
    let roll = Math.sin(t * 0.95) * 0.008;
    let squash = Math.sin(t * 1.75) * 0.009;

    switch (mood) {
      case "joy": {
        p.smile = smooth(0, 0.4, t);
        p.gazeY += 0.005;
        p.liquidEnergy = 1.55;
        const hop = pulse(t, 0.4, 0.7) + pulse(t, 1.25, 0.7);
        bounce = hop * 0.18;
        squash = pulse(t, 0.12, 0.3) * -0.075 + hop * 0.04;
        roll = Math.sin(t * 5) * 0.025 * Math.exp(-t * 0.4);
        break;
      }
      case "charge": {
        const charge = smooth(0, 2.4, t);
        p.liquidEnergy = 1 + charge * 2.1;
        p.glow = 1 + charge * 2.2;
        p.gazeX *= 0.2;
        p.gazeY = 0.006;
        p.smile = charge * 0.16;
        lean = -charge * 0.035;
        squash = -charge * 0.028 + Math.sin(t * 26) * 0.005 * charge;
        break;
      }
      case "attack": {
        const anticipation = pulse(t, 0, 0.65);
        const release = pulse(t, 0.65, 0.6);
        const recover = smooth(1.15, 2.1, t);
        lean = -0.13 * anticipation + 0.21 * release;
        squash = -0.075 * anticipation + release * 0.045;
        p.gazeX = 0;
        p.gazeY = 0.008;
        p.surprise = release * 0.7;
        p.smile = recover * 0.3;
        p.splash = release;
        p.liquidEnergy = 1 + anticipation * 2.1 + release * 2.5;
        p.glow = 1 + release * 3 + anticipation * 1.6;
        break;
      }
      case "hit": {
        const shock = pulse(t, 0, 0.35);
        const recoil = Math.sin(t * 25) * Math.exp(-t * 2.9);
        p.surprise = shock;
        p.hurt = smooth(0.25, 0.7, t) * (1 - smooth(2.6, 4, t));
        p.blink = Math.max(p.blink, shock * 0.85);
        p.gazeX = -0.008 * Math.exp(-t * 0.5);
        p.splash = shock;
        p.liquidEnergy = 1 + shock * 2;
        roll = recoil * 0.1;
        lean = -shock * 0.13;
        squash = -shock * 0.085;
        break;
      }
      case "defeat": {
        const slump = smooth(0, 1.7, t);
        p.energy = 1 - slump * 0.9;
        p.liquidEnergy = 1 - slump * 0.83;
        p.glow = 1 - slump * 0.8;
        p.hurt = slump * 0.9;
        p.blink = Math.max(p.blink, slump * 0.5);
        p.gazeY = -0.007 * slump;
        lean = slump * 0.15;
        roll = -slump * 0.07;
        squash = -slump * 0.075;
        break;
      }
      default:
        break;
    }

    this.root.position.copy(this.rootPosition);
    this.root.position.y += bounce * movement;
    this.root.rotation.set(lean * movement, 0, roll * movement);
    this.root.scale.set(
      this.rootScale.x * (1 - squash * 0.4 * movement),
      this.rootScale.y * (1 + squash * movement),
      this.rootScale.z * (1 - squash * 0.4 * movement),
    );
    for (const face of this.faces) {
      // Localized shape keys preserve the original sculpt and painted character.
      this.setMorph(face, "Blink_L", p.blink);
      this.setMorph(face, "Blink_R", p.blink);
      this.setMorph(face, "Smile", p.smile);
      this.setMorph(face, "Surprise", p.surprise);
      this.setMorph(face, "Hurt", p.hurt);
      this.setMorph(face, "Look_L", Math.max(0, -p.gazeX / 0.014));
      this.setMorph(face, "Look_R", Math.max(0, p.gazeX / 0.014));
    }
    return p;
  }

  private setMorph(mesh: Mesh, name: string, value: number) {
    const index = mesh.morphTargetDictionary?.[name];
    if (index !== undefined && mesh.morphTargetInfluences)
      mesh.morphTargetInfluences[index] = MathUtils.clamp(value, 0, 1);
  }
}
