import { describe, expect, test } from "vitest";

import {
  CAMPAIGNS,
  FROSTBOUND_VAULT_OPPONENTS,
  getCampaignFamilies,
  getOpeningItemIds,
  GRAND_TOURNAMENT_OPPONENTS,
  ITEM_BY_ID,
} from "../../core/data";

describe("campaign mechanics", () => {
  test("keeps two eight-fight campaigns with elite and boss finales", () => {
    expect(CAMPAIGNS).toHaveLength(2);
    for (const campaign of CAMPAIGNS) {
      expect(campaign.opponents).toHaveLength(8);
      expect(campaign.opponents.filter((opponent) => opponent.rank === "elite"))
        .toHaveLength(1);
      expect(campaign.opponents.at(-1)?.rank).toBe("boss");
    }

    expect(GRAND_TOURNAMENT_OPPONENTS[7].bossRule).toBe("rageAtHalf");
    expect(FROSTBOUND_VAULT_OPPONENTS[7].bossRule).toBe(
      "timeFractureAtHalf",
    );
  });

  test("uses valid five-slot boards and canonical item ids", () => {
    for (const campaign of CAMPAIGNS) {
      for (const opponent of campaign.opponents) {
        for (const candidate of [opponent.board, ...(opponent.boardVariants ?? [])]) {
          expect(candidate).toHaveLength(5);
          for (const item of candidate) {
            if (item) expect(ITEM_BY_ID[item.itemId]).toBeDefined();
          }
        }
      }
    }
  });

  test("keeps curated opening families and offers", () => {
    expect(getCampaignFamilies("grand-tournament")).toEqual([
      "fire",
      "poison",
      "guard",
    ]);
    expect(getCampaignFamilies("frostbound-vault", "poison")).toEqual([
      "frost",
      "echo",
      "poison",
    ]);
    expect(
      getOpeningItemIds("grand-tournament", ["fire", "poison", "guard"]),
    ).toEqual(["chili", "slime-shroom", "egg-shell"]);
  });

  test("contains no opponent presentation copy", () => {
    for (const campaign of CAMPAIGNS) {
      for (const opponent of campaign.opponents) {
        expect(opponent).not.toHaveProperty("name");
        expect(opponent).not.toHaveProperty("title");
        expect(opponent).not.toHaveProperty("icon");
        expect(opponent).not.toHaveProperty("quote");
        expect(opponent).not.toHaveProperty("threat");
      }
    }
  });
});
