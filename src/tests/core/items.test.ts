import { describe, expect, test } from "vitest";

import { ITEM_BY_ID, ITEMS } from "../../core/data";
import { FAMILIES } from "../../core/types";

describe("canonical item mechanics", () => {
  test("preserves twenty unique items with four entries per family", () => {
    expect(ITEMS).toHaveLength(20);
    expect(new Set(ITEMS.map((item) => item.id)).size).toBe(ITEMS.length);

    for (const family of FAMILIES) {
      expect(ITEMS.filter((item) => item.family === family)).toHaveLength(4);
    }
  });

  test("uses complete three-level numeric progressions", () => {
    for (const item of ITEMS) {
      expect(item.cooldown).toHaveLength(3);
      expect(item.values).toHaveLength(3);
      expect(item.cooldown.every((value) => value > 0)).toBe(true);
      expect(item.values.every((value) => value > 0)).toBe(true);
      expect(item.cost === 3 || item.cost === 4).toBe(true);

      if ("secondaryValues" in item) {
        expect(item.secondaryValues).toHaveLength(3);
      }
      if ("passive" in item) {
        expect(item.passive.values).toHaveLength(3);
      }
    }
  });

  test("keeps the reference slice anchors and trigger rules", () => {
    expect(ITEM_BY_ID.chili?.levelThreeBonus).toBe("burn");
    expect(ITEM_BY_ID["slime-shroom"]?.effect).toBe("poison");
    expect(ITEM_BY_ID["egg-shell"]?.levelThreeBonus).toBe(
      "cleansePoison",
    );
    expect(ITEM_BY_ID["moon-salt"]?.trigger?.type).toBe("onGuardedHit");
    expect(ITEM_BY_ID["healing-tuber"]?.trigger).toEqual({
      type: "emergency",
      threshold: 0.5,
      multiplier: 1.5,
    });
  });

  test("contains no legacy display text or image paths", () => {
    for (const item of ITEMS) {
      expect(item).not.toHaveProperty("name");
      expect(item).not.toHaveProperty("icon");
      expect(item).not.toHaveProperty("descriptions");
      expect(JSON.stringify(item)).not.toMatch(/\.(png|webp|svg)/i);
    }
  });
});
