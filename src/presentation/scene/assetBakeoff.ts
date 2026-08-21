export type AssetBakeoffMode = "legacy" | "ecosystem" | "golden";

/**
 * Reproducible screenshot switch for the Phase-2 bake-off.
 *
 * - ?art=legacy keeps the former KayKit environment.
 * - ?art=ecosystem shows the selected Quaternius ecosystem before hero polish.
 * - the default golden mode adds the KesselKrawall-specific character pass.
 */
export function assetBakeoffMode(): AssetBakeoffMode {
  if (typeof window === "undefined") return "golden";
  const requested = new URLSearchParams(window.location.search).get("art");
  if (requested === "legacy" || requested === "ecosystem") return requested;
  return "golden";
}
