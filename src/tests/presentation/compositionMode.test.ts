import { afterEach, describe, expect, it, vi } from "vitest";
import { assetBakeoffMode } from "../../presentation/scene/assetBakeoff";
import { isMockupCompositionEnabled, mockupCameraMode, mockupPassageMode } from "../../presentation/scene/compositionMode";

function useQuery(search: string) {
  vi.stubGlobal("window", { location: { search } });
}

afterEach(() => vi.unstubAllGlobals());

describe("approved composition and explicit comparison isolation", () => {
  for (const search of ["?art=golden", "?art=legacy", "?art=ecosystem"]) {
    it(`does not alter the existing art variant ${search || "(default)"}`, () => {
      useQuery(`${search}${search ? "&" : "?"}camera=perspective&passage=corridor&composition=after`);
      expect(isMockupCompositionEnabled()).toBe(false);
      // GreyboxStage must keep its previous orthographic projection even if a
      // camera comparison option appears in a link for another art variant.
      const orthographic = !isMockupCompositionEnabled() || mockupCameraMode() === "orthographic";
      expect(orthographic).toBe(true);
    });
  }

  it("enables the new composition only in mockup mode", () => {
    useQuery("?art=mockup");
    expect(assetBakeoffMode()).toBe("mockup");
    expect(isMockupCompositionEnabled()).toBe(true);
    expect(mockupCameraMode()).toBe("perspective");
  });

  it("keeps the previous mockup composition and projection directly accessible", () => {
    useQuery("?art=mockup&composition=before&camera=perspective&passage=corridor");
    expect(assetBakeoffMode()).toBe("mockup");
    expect(isMockupCompositionEnabled()).toBe(false);
    expect(!isMockupCompositionEnabled() || mockupCameraMode() === "orthographic").toBe(true);
  });

  it("lets the new composition compare both projections", () => {
    useQuery("?art=mockup&camera=orthographic");
    expect(isMockupCompositionEnabled()).toBe(true);
    expect(mockupCameraMode()).toBe("orthographic");
    useQuery("?art=mockup&camera=unknown");
    expect(mockupCameraMode()).toBe("perspective");
  });

  it("lets the same room compare a door and corridor, with explicit room defaults", () => {
    useQuery("?art=mockup");
    expect(mockupPassageMode("door")).toBe("door");
    expect(mockupPassageMode("corridor")).toBe("corridor");
    useQuery("?art=mockup&passage=door");
    expect(mockupPassageMode("corridor")).toBe("door");
    useQuery("?art=mockup&passage=corridor");
    expect(mockupPassageMode("door")).toBe("corridor");
    useQuery("?art=mockup&passage=unknown");
    expect(mockupPassageMode("corridor")).toBe("corridor");
  });

  it("does not opt into the rework in a browserless environment", () => {
    vi.stubGlobal("window", undefined);
    expect(assetBakeoffMode()).toBe("golden");
    expect(isMockupCompositionEnabled()).toBe(false);
    expect(mockupCameraMode()).toBe("perspective");
    expect(mockupPassageMode("corridor")).toBe("corridor");
  });
});
