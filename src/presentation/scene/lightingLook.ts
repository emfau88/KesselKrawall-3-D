import { isMockupCompositionEnabled } from "./compositionMode";

export type LightingLook = "reference" | "dark" | "warm" | "magical";

/** Warm Fantasy is approved for mockup; explicit comparison looks remain available. */
export function lightingLook(): LightingLook {
  if (!isMockupCompositionEnabled() || typeof window === "undefined") return "reference";
  const value = new URLSearchParams(window.location.search).get("look");
  return value === "reference" || value === "dark" || value === "magical" ? value : "warm";
}

// One shadow-casting key and two non-shadow accent lights in every new look.
// Existing candle/cauldron lights remain local; no postprocessing or new geometry.
export const LIGHTING_LOOKS = {
  dark: { label: "A · Dark Fantasy", exposure: 1.02, environment: 0.20, ambient: 0.055, hemisphere: 0.18,
    sky: "#9daac6", ground: "#38251d", key: "#ffd49d", keyIntensity: 3.5, angle: 0.72, keyX: -4.8, keyY: 6, keyZ: 2.6,
    accent: "#ffad5b", accentIntensity: 12, rim: "#8294c8", rimIntensity: 5, candle: 6.5 },
  warm: { label: "B · Warm Fantasy", exposure: 1.02, environment: 0.34, ambient: 0.10, hemisphere: 0.32,
    sky: "#c6c5d0", ground: "#453024", key: "#ffe0b5", keyIntensity: 3.8, angle: 0.76, keyX: -3.8, keyY: 7, keyZ: 5.2,
    accent: "#ffb970", accentIntensity: 14, rim: "#9fbbce", rimIntensity: 7, candle: 7.0 },
  magical: { label: "C · Magical Fantasy", exposure: 1.02, environment: 0.27, ambient: 0.075, hemisphere: 0.25,
    sky: "#9eabd0", ground: "#302441", key: "#ffe1b8", keyIntensity: 3.4, angle: 0.72, keyX: 3.8, keyY: 7, keyZ: 5.2,
    accent: "#a38aff", accentIntensity: 20, rim: "#66dbce", rimIntensity: 14, candle: 5.5 },
} as const;
