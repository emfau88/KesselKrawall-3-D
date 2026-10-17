import { afterEach, describe, expect, it, vi } from "vitest";
import { assetBakeoffMode } from "../../presentation/scene/assetBakeoff";
import { isMockupCompositionEnabled, mockupCameraMode } from "../../presentation/scene/compositionMode";
import { lightingLook } from "../../presentation/scene/lightingLook";
import { ingredientArtEnabled, ingredientArtAsset, ingredientPolishEnabled } from "../../presentation/scene/ingredientArt";

afterEach(() => vi.unstubAllGlobals());
describe("approved public release defaults", () => {
  it.each(["", "?art=unknown", "?look=warm"])("enables the approved stack without an art opt-in: %s", search => {
    vi.stubGlobal("window", { location: { search } });
    expect(assetBakeoffMode()).toBe("mockup");
    expect(isMockupCompositionEnabled()).toBe(true);
    expect(mockupCameraMode()).toBe("perspective");
    expect(lightingLook()).toBe("warm");
    expect(ingredientArtEnabled()).toBe(true);
    expect(ingredientPolishEnabled()).toBe(true);
    for (const id of ["chili", "slime-shroom", "egg-shell"] as const)
      expect(ingredientArtAsset(id, "balanced")).toBe(`ingredient-polish-${id}-desktop`);
  });
  it.each(["golden", "legacy", "ecosystem"])("preserves explicit %s including original lighting and ingredients", art => {
    vi.stubGlobal("window", { location: { search: `?art=${art}&look=warm` } });
    expect(assetBakeoffMode()).toBe(art);
    expect(isMockupCompositionEnabled()).toBe(false);
    expect(lightingLook()).toBe("reference");
    expect(ingredientPolishEnabled()).toBe(false);
  });
  it.each(["reference", "dark", "magical"])("keeps the explicit %s light profile", look => {
    vi.stubGlobal("window", { location: { search: `?look=${look}` } });
    expect(lightingLook()).toBe(look);
  });
  it.each(["before", "phase3a"])("keeps the previous %s ingredient state", ingredients => {
    vi.stubGlobal("window", { location: { search: `?ingredients=${ingredients}` } });
    expect(ingredientPolishEnabled()).toBe(false);
    expect(ingredientArtEnabled()).toBe(ingredients !== "before");
  });
});
