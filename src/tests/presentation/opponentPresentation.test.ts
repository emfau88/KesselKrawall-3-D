import { describe, expect, it } from "vitest";

import { GRAND_TOURNAMENT_OPPONENTS } from "../../core/data/opponents";
import { simulateBattle } from "../../core/simulation";
import type { Board } from "../../core/types";
import { getOpponentPresentation, isGrandTournamentPresentation } from "../../presentation/content/opponentPresentation";

describe("grand tournament presentation roster", () => {
  it("gives every campaign-one opponent a unique identity", () => {
    const profiles = GRAND_TOURNAMENT_OPPONENTS.map((opponent) => getOpponentPresentation(opponent.id));
    expect(profiles.every((profile) => isGrandTournamentPresentation(profile.id))).toBe(true);
    expect(new Set(profiles.map((profile) => profile.regalia)).size).toBe(profiles.length);
    expect(new Set(profiles.map((profile) => profile.arena)).size).toBe(profiles.length);
    expect(new Set(profiles.map((profile) => profile.signature)).size).toBe(profiles.length);
  });

  it("keeps a production fallback for the archive campaign", () => {
    const profile = getOpponentPresentation("reif-rudi");
    expect(profile.arena).toBe("frost-archive");
    expect(profile.id).toBe("reif-rudi");
  });

  it("builds a complete deterministic combat timeline for every tournament identity", () => {
    const showcaseBoard: Board = [
      { uid: "showcase-fire", itemId: "chili", level: 3 },
      { uid: "showcase-poison", itemId: "slime-shroom", level: 3 },
      { uid: "showcase-guard", itemId: "egg-shell", level: 3 },
      { uid: "showcase-support", itemId: "gold-spoon", level: 2 },
      { uid: "showcase-finisher", itemId: "dragon-tooth", level: 2 },
    ];
    for (const opponent of GRAND_TOURNAMENT_OPPONENTS) {
      const result = simulateBattle(showcaseBoard, opponent);
      const presentation = getOpponentPresentation(opponent.id);
      expect(result.events.length, opponent.id).toBeGreaterThan(0);
      expect(result.duration, opponent.id).toBeGreaterThan(0);
      expect(presentation.signature, opponent.id).toBeTruthy();
      expect(presentation.arena, opponent.id).toBeTruthy();
    }
  });
});
