import { MathUtils } from "three";

import type { CauldronReaction } from "../CauldronActor";
import type { LiquidPose } from "./LivingLiquid";

export interface BrasskinPose extends LiquidPose {
  blink: number;
  smile: number;
  surprise: number;
  hurt: number;
  neutral: number;
  lookLeft: number;
  lookRight: number;
  offsetY: number;
  rotationX: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
}

export function createBrasskinPose(): BrasskinPose {
  return {
    energy: 1, liquidEnergy: 1, splash: 0, glow: 1,
    blink: 0, smile: 0, surprise: 0, hurt: 0, neutral: 0.85,
    lookLeft: 0, lookRight: 0, offsetY: 0,
    rotationX: 0, rotationZ: 0, scaleX: 1, scaleY: 1,
  };
}

// Event-local action time stays separate from the continuous blink/brew clock.
// The caller reuses this object; combat frames never allocate React state.
export function updateBrasskinPose(
  pose: BrasskinPose,
  reaction: CauldronReaction,
  elapsed: number,
  time: number,
  reducedMotion: boolean,
): void {
  const t = Math.max(0, elapsed);
  const movement = reducedMotion ? 0.2 : 1;
  const action = t < 0.7 ? Math.sin((t / 0.7) * Math.PI) : 0;
  const recovery = Math.max(0, 1 - t / 0.7);
  const blinkTime = time % 4.65;
  const naturalBlink = blinkTime > 3.25 && blinkTime < 3.43
    ? Math.sin(((blinkTime - 3.25) / 0.18) * Math.PI)
    : 0;

  pose.energy = 1;
  pose.liquidEnergy = 1;
  pose.splash = 0;
  pose.glow = 1;
  pose.blink = naturalBlink;
  pose.smile = 0;
  pose.surprise = 0;
  pose.hurt = 0;
  pose.neutral = 0.85;
  const gaze = Math.sin(time * 0.47) * 0.1;
  pose.lookLeft = Math.max(0, -gaze);
  pose.lookRight = Math.max(0, gaze);
  pose.offsetY = Math.sin(time * 1.6) * 0.006;
  pose.rotationX = Math.sin(time * 0.7) * 0.008;
  pose.rotationZ = Math.sin(time * 0.95) * 0.005;
  pose.scaleX = 1;
  pose.scaleY = 1 + Math.sin(time * 1.75) * 0.006;

  switch (reaction) {
    case "cast":
      pose.rotationX += action * -0.12;
      pose.scaleX += action * 0.045;
      pose.scaleY -= action * 0.05;
      pose.surprise = action * 0.45;
      pose.neutral = 1;
      pose.liquidEnergy = 1 + action * 2.5;
      pose.glow = 1 + action * 2;
      pose.splash = action * 0.8;
      pose.lookLeft = pose.lookRight = 0;
      break;
    case "hit":
      pose.rotationZ += Math.sin(t * 35) * recovery * 0.09;
      pose.rotationX += recovery * 0.055;
      pose.scaleX += recovery * 0.025;
      pose.scaleY -= recovery * 0.04;
      pose.surprise = recovery * 0.2;
      pose.hurt = recovery * 0.9;
      pose.neutral = 0.85 * (1 - recovery) + 0.1 * recovery;
      pose.blink = Math.max(naturalBlink, recovery * 0.75);
      pose.splash = recovery;
      pose.liquidEnergy = 1 + recovery * 1.6;
      break;
    case "guard":
      pose.neutral = 1;
      pose.rotationX -= action * 0.05;
      pose.scaleY += action * 0.035;
      pose.glow = 1 + action * 1.3;
      pose.liquidEnergy = 1 + action * 0.8;
      break;
    case "heal":
      pose.offsetY += action * 0.055;
      pose.smile = action * 0.35;
      pose.neutral = 0.85 - action * 0.15;
      pose.glow = 1 + action * 1.1;
      pose.liquidEnergy = 1 + action * 0.6;
      break;
    case "victory": {
      const celebration = Math.max(0, 1 - t / 1.5);
      pose.offsetY += Math.abs(Math.sin(t * 5.4)) * celebration * 0.11;
      pose.rotationZ += Math.sin(t * 6.5) * celebration * 0.045;
      pose.smile = MathUtils.smoothstep(t, 0, 0.35) * 0.35;
      pose.neutral = 0.85 * (1 - MathUtils.smoothstep(t, 0, 0.35));
      pose.liquidEnergy = 1.3;
      pose.glow = 1.35;
      break;
    }
    case "defeat": {
      const slump = MathUtils.smoothstep(t, 0, 1.1);
      pose.rotationX += slump * 0.11;
      pose.rotationZ -= slump * 0.08;
      pose.scaleY -= slump * 0.1;
      pose.offsetY -= slump * 0.02;
      pose.energy = 1 - slump * 0.85;
      pose.liquidEnergy = 1 - slump * 0.8;
      pose.glow = 1 - slump * 0.8;
      pose.hurt = slump;
      pose.neutral = 0.85 * (1 - slump);
      pose.blink = Math.max(naturalBlink, slump * 0.55);
      break;
    }
    default:
      break;
  }

  pose.offsetY *= movement;
  pose.rotationX *= movement;
  pose.rotationZ *= movement;
  pose.scaleX = 1 + (pose.scaleX - 1) * movement;
  pose.scaleY = 1 + (pose.scaleY - 1) * movement;
}
