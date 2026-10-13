import { getRuntimeQualityProfile, type RuntimeQualityProfile } from "./runtimeQuality";

export const MOCKUP_ASSET_SLUGS = [
  "witch-workbench", "ritual-platform", "triple-candleholder", "open-grimoire",
  "dungeon-wall-module", "dungeon-stone-arch", "alchemy-shelf",
  "wall-candle-sconce", "dungeon-stone-pillar",
  "dungeon-floor-module",
] as const;

export type MockupAssetSlug = typeof MOCKUP_ASSET_SLUGS[number];
export type MockupAssetId = `mockup-${MockupAssetSlug}-${"desktop" | "mobile"}`;

export function mockupAssetId(
  slug: MockupAssetSlug,
  tier: RuntimeQualityProfile["tier"] = getRuntimeQualityProfile().tier,
): MockupAssetId {
  return `mockup-${slug}-${tier === "mobile" ? "mobile" : "desktop"}`;
}

export const MOCKUP_ASSET_DEFINITIONS = Object.fromEntries(
  MOCKUP_ASSET_SLUGS.flatMap((slug) => (["desktop", "mobile"] as const).map((variant) => [
    `mockup-${slug}-${variant}`,
    {
      root: `environment/${slug}`,
      file: `${slug}-${variant}.glb`,
      source: slug === "dungeon-floor-module"
        ? "User-supplied reference-guided procedural floor; original LOD0/LOD1 and PBR maps"
        : "User-converted mockup asset via imagegen/to3D; technical preparation only",
      license: "User-provided/generated source; see art/source/batch-01, batch-02 and batch-03",
      materialPolicy: "authored" as const,
    },
  ])),
) as Record<MockupAssetId, {
  root: string; file: string; source: string; license: string; materialPolicy: "authored";
}>;
