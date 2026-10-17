export type AssetBakeoffMode = "legacy" | "ecosystem" | "golden" | "mockup";

/**
 * Reproducible screenshot switch for the Phase-2 bake-off.
 *
 * - ?art=legacy keeps the former KayKit environment.
 * - ?art=ecosystem shows the selected Quaternius ecosystem before hero polish.
 * - ?art=golden keeps the previous KesselKrawall-specific character pass.
 * - the browser default is the approved mockup environment, Warm Fantasy and polish.
 */
export function assetBakeoffMode(): AssetBakeoffMode {
  if (typeof window === "undefined") return "golden";
  const requested = new URLSearchParams(window.location.search).get("art");
  if (requested === "legacy" || requested === "ecosystem" || requested === "golden" || requested === "mockup") return requested;
  return "mockup";
}
