import type { ProductionAssetId } from "../ProductionAsset";
import type { RuntimeQualityProfile } from "../runtimeQuality";

export function brasskinAssetId(tier: RuntimeQualityProfile["tier"]): ProductionAssetId {
  return characterAssetId("brasskin", tier);
}

export type CauldronCharacterId = "brasskin" | "zischbert" | "moor-martha";

export function characterAssetId(character: CauldronCharacterId, tier: RuntimeQualityProfile["tier"]): ProductionAssetId {
  return `${character}-${tier === "mobile" ? "mobile" : "desktop"}`;
}
