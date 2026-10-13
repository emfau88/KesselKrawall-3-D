import { describe, expect, test } from "vitest";

import { createBrasskinPose, updateBrasskinPose } from "../../presentation/scene/character/brasskinMotion";

describe("Brasskin combat presentation", () => {
  test("idle uses the neutral mouth rather than a permanent victory smile", () => {
    const pose = createBrasskinPose();
    updateBrasskinPose(pose, "idle", 2, 2, false);
    expect(pose.neutral).toBe(0.85);
    expect(pose.smile).toBe(0);
    expect(pose.hurt).toBe(0);
  });

  test("defeat closes/downturns the mouth and quietens the brew", () => {
    const pose = createBrasskinPose();
    updateBrasskinPose(pose, "defeat", 2, 2, false);
    expect(pose.neutral).toBe(0);
    expect(pose.hurt).toBe(1);
    expect(pose.smile).toBe(0);
    expect(pose.liquidEnergy).toBeCloseTo(0.2);
    expect(pose.energy).toBeCloseTo(0.15);
  });

  test("hit crossfades expressions and recovers to neutral after the event", () => {
    const pose = createBrasskinPose();
    updateBrasskinPose(pose, "hit", 0, 1, false);
    expect(pose.hurt).toBe(0.9);
    expect(pose.neutral).toBe(0.1);
    expect(pose.hurt + pose.neutral).toBeCloseTo(1);
    expect(pose.splash).toBe(1);
    updateBrasskinPose(pose, "hit", 1, 2, false);
    expect(pose.hurt).toBe(0);
    expect(pose.neutral).toBe(0.85);
    expect(pose.splash).toBe(0);
  });

  test("victory deliberately smiles and does not retain the neutral/dejected mouth", () => {
    const pose = createBrasskinPose();
    updateBrasskinPose(pose, "victory", 1, 2, false);
    expect(pose.neutral).toBe(0);
    expect(pose.smile).toBe(0.35);
    expect(pose.hurt).toBe(0);
  });

  test("reduced motion limits body movement without dropping combat meaning", () => {
    const full = createBrasskinPose();
    const reduced = createBrasskinPose();
    updateBrasskinPose(full, "cast", 0.35, 1, false);
    updateBrasskinPose(reduced, "cast", 0.35, 1, true);
    expect(reduced.rotationX).toBeCloseTo(full.rotationX * 0.2);
    expect(reduced.liquidEnergy).toBe(full.liquidEnergy);
    expect(reduced.neutral).toBe(1);
    expect(reduced.surprise).toBeGreaterThan(0);
  });
});
