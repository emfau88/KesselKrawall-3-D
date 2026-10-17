import { afterEach, describe, expect, it, vi } from "vitest";
import { LIGHTING_LOOKS, lightingLook } from "../../presentation/scene/lightingLook";
import { applyLightingMaterial } from "../../presentation/scene/lightingMaterials";
import { MeshStandardMaterial, Texture } from "three";

afterEach(() => vi.unstubAllGlobals());
describe("isolated Phase-2 lighting", () => {
  it.each(["?art=golden&look=warm", "?art=legacy&look=dark", "?art=ecosystem&look=magical", "?art=mockup&composition=before&look=warm", "?art=mockup&look=reference"])("preserves the reference in %s", search => {
    vi.stubGlobal("window", {location:{search}});
    expect(lightingLook()).toBe("reference");
  });
  it.each(["", "?art=mockup", "?art=mockup&look=unknown"])("defaults approved mockup lighting to Warm Fantasy: %s", search => {
    vi.stubGlobal("window", {location:{search}});
    expect(lightingLook()).toBe("warm");
  });
  it.each(["dark", "warm", "magical"] as const)("enables only the requested %s look", look => {
    vi.stubGlobal("window", {location:{search:`?art=mockup&look=${look}`}});
    expect(lightingLook()).toBe(look);
    expect(LIGHTING_LOOKS[look].exposure).toBe(1.02);
    expect(LIGHTING_LOOKS[look].environment).toBeLessThan(1);
  });
  it("preserves the source material and all texture references", () => {
    const source = new MeshStandardMaterial({roughness:0.82,metalness:0,map:new Texture()});
    const before = source.toJSON();
    const clone = source.clone();
    applyLightingMaterial(clone, "mockup-witch-workbench-desktop", "warm");
    expect(source.toJSON()).toEqual(before);
    expect(clone.map).toBe(source.map);
    expect(clone.color.getHexString()).toBe("dbb78e");
    expect(clone.metalness).toBe(0);
    expect(clone.roughness).toBe(0.76);
  });
  it("does not regrade the reference or unrelated ingredients", () => {
    for (const [asset,look] of [["mockup-dungeon-wall-module", "reference"], ["ingredient-chili", "warm"]] as const) {
      const material = new MeshStandardMaterial({color:"#e83921",metalness:0.1,roughness:0.4});
      const before = material.toJSON();
      applyLightingMaterial(material,asset,look);
      expect(material.toJSON()).toEqual(before);
    }
  });
  it("does not turn mixed atlases into brass or amplify baked shadows", () => {
    const material = new MeshStandardMaterial({map:new Texture(),aoMap:new Texture(),aoMapIntensity:0.8});
    applyLightingMaterial(material,"mockup-wall-candle-sconce-mobile","dark");
    expect(material.metalness).toBe(0);
    expect(material.aoMapIntensity).toBe(0.8);
    expect(material.emissive.getHex()).toBe(0);
  });
  it("keeps character metal/ceramic identity and live liquid separate", () => {
    const brass = new MeshStandardMaterial({name:"Brasskin_PaintedShell"});
    applyLightingMaterial(brass,"brasskin-desktop","warm");
    expect(brass.metalness).toBe(0.38);
    expect(brass.roughness).toBe(0.46);
    const moss = new MeshStandardMaterial({name:"Moor-Martha_OriginalPaintedSculpt",metalness:0.08,roughness:0.72});
    applyLightingMaterial(moss,"moor-martha-desktop","warm");
    expect(moss.metalness).toBe(0.08);
    expect(moss.roughness).toBe(0.72);
    const liquid = new MeshStandardMaterial({name:"Brasskin_Liquid"});
    const before = liquid.toJSON();
    applyLightingMaterial(liquid,"brasskin-desktop","magical");
    expect(liquid.toJSON()).toEqual(before);
  });
});
