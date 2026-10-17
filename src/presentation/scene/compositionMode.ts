import { assetBakeoffMode } from "./assetBakeoff";

export type MockupPassage = "door" | "corridor";
export type MockupCamera = "perspective" | "orthographic";

/** Approved browser default; composition=before keeps the previous GLB layout. */
export function isMockupCompositionEnabled(): boolean {
  return assetBakeoffMode() === "mockup" && (
    typeof window === "undefined" || new URLSearchParams(window.location.search).get("composition") !== "before"
  );
}

export function mockupPassageMode(fallback: MockupPassage = "door"): MockupPassage {
  if (typeof window === "undefined") return fallback;
  const requested = new URLSearchParams(window.location.search).get("passage");
  return requested === "door" || requested === "corridor" ? requested : fallback;
}

export function mockupCameraMode(): MockupCamera {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("camera") === "orthographic"
    ? "orthographic" : "perspective";
}
