export interface RuntimeQualityProfile {
  readonly tier: "mobile" | "balanced";
  readonly maxDpr: number;
  readonly shadowMapSize: 512 | 1024;
  readonly ambientDetail: number;
}

export function getRuntimeQualityProfile(): RuntimeQualityProfile {
  if (typeof window === "undefined") {
    return { tier: "balanced", maxDpr: 1.25, shadowMapSize: 1024, ambientDetail: 1 };
  }
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  const constrainedHardware =
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    (navigatorWithMemory.deviceMemory !== undefined && navigatorWithMemory.deviceMemory <= 4);
  const compactViewport = Math.min(window.innerWidth, window.innerHeight) <= 720;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const mobile = constrainedHardware || (compactViewport && coarsePointer);
  return mobile
    ? { tier: "mobile", maxDpr: 1, shadowMapSize: 512, ambientDetail: 0.58 }
    : { tier: "balanced", maxDpr: 1.25, shadowMapSize: 1024, ambientDetail: 1 };
}

