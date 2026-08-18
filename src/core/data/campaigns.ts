import type {
  CampaignDefinition,
  CampaignId,
  Family,
  LegacyFamily,
} from "../types";
import {
  FROSTBOUND_VAULT_OPPONENTS,
  GRAND_TOURNAMENT_OPPONENTS,
} from "./opponents";

export const LEGACY_FAMILIES: readonly LegacyFamily[] = [
  "fire",
  "poison",
  "guard",
];

export const CAMPAIGNS = [
  {
    id: "grand-tournament",
    number: 1,
    opponents: GRAND_TOURNAMENT_OPPONENTS,
    fixedFamilies: ["fire", "poison", "guard"],
    selectableLegacyFamily: false,
    defaultFamilies: ["fire", "poison", "guard"],
    openingItemByFamily: {
      fire: "chili",
      poison: "slime-shroom",
      guard: "egg-shell",
    },
  },
  {
    id: "frostbound-vault",
    number: 2,
    opponents: FROSTBOUND_VAULT_OPPONENTS,
    fixedFamilies: ["frost", "echo"],
    selectableLegacyFamily: true,
    defaultFamilies: ["frost", "echo", "fire"],
    openingItemByFamily: {
      frost: "frost-shard",
      echo: "mirror-shard",
      fire: "chili",
      poison: "slime-shroom",
      guard: "egg-shell",
    },
  },
] as const satisfies readonly CampaignDefinition[];

export const CAMPAIGN_BY_ID = {
  "grand-tournament": CAMPAIGNS[0],
  "frostbound-vault": CAMPAIGNS[1],
} as const satisfies Readonly<Record<CampaignId, CampaignDefinition>>;

export function getCampaign(campaignId: CampaignId): CampaignDefinition {
  return CAMPAIGN_BY_ID[campaignId];
}

export function getCampaignFamilies(
  campaignId: CampaignId,
  legacyFamily: LegacyFamily = "fire",
): Family[] {
  const campaign = getCampaign(campaignId);
  return campaign.selectableLegacyFamily
    ? [...campaign.fixedFamilies, legacyFamily]
    : [...campaign.defaultFamilies];
}

export function getOpeningItemIds(
  campaignId: CampaignId,
  families: readonly Family[],
): string[] {
  const campaign = getCampaign(campaignId);
  return families
    .map((family) => campaign.openingItemByFamily[family])
    .filter((itemId): itemId is string => itemId !== undefined)
    .slice(0, 3);
}
