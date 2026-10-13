export type AssetBakeoffMode = "legacy" | "ecosystem" | "golden" | "mockup";

/**
 * Reproducible screenshot switch for the Phase-2 bake-off.
 *
 * - ?art=legacy keeps the former KayKit environment.
 * - ?art=ecosystem shows the selected Quaternius ecosystem before hero polish.
 * - the default golden mode adds the KesselKrawall-specific character pass.
 * - ?art=mockup is an opt-in local comparison of the new image-to-3D environment.
 */
export function assetBakeoffMode(): AssetBakeoffMode {
  if (typeof window === "undefined") return "golden";
  const requested = new URLSearchParams(window.location.search).get("art");
  if (requested === "legacy" || requested === "ecosystem" || requested === "mockup") return requested;
  return "golden";
}
