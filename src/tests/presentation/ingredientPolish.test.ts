import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { ingredientArtAsset, ingredientPolishEnabled, ingredientMountAsset, ingredientUpgradeLevel, polishedIngredientBottom, INGREDIENT_ART_ASSETS, PHASE3A_ITEMS } from "../../presentation/scene/ingredientArt";
import { ITEMS } from "../../core/data";
import { getBattleCriticalAssetIds } from "../../presentation/scene/assetReadiness";
import type { Board } from "../../core/types";

afterEach(()=>vi.unstubAllGlobals());
describe("isolated ingredient polish",()=>{
  it.each(["", "?art=golden", "?art=legacy", "?art=ecosystem", "?art=mockup&ingredients=before", "?art=mockup&ingredients=phase3a", "?art=mockup&composition=before"])("does not affect %s",search=>{
    vi.stubGlobal("window",{location:{search}});expect(ingredientPolishEnabled()).toBe(false);
  });
  it.each(["warm","dark","reference","magical"])("supports %s without changing the lighting profile",look=>{
    vi.stubGlobal("window",{location:{search:`?art=mockup&look=${look}`}});
    expect(ingredientPolishEnabled()).toBe(true);
    expect(ingredientArtAsset("chili","mobile")).toBe("ingredient-polish-chili-mobile");
    expect(ingredientArtAsset("pedestal","mobile")).toBe("ingredient-phase3a-pedestal-mobile");
  });
  it("includes the reusable tier mount only for polished upgraded ingredients",()=>{
    vi.stubGlobal("window",{location:{search:"?art=mockup"}});
    const board:Board=[{uid:"a",itemId:"chili",level:2},{uid:"b",itemId:"slime-shroom",level:3},null,null,null];
    const ids=getBattleCriticalAssetIds(board,board,"zischbert","mockup","mobile");
    expect(ids.filter(id=>id===ingredientMountAsset("mobile"))).toHaveLength(1);
    expect(ids.some(id=>id.endsWith("desktop"))).toBe(false);
    const old:Board=[{uid:"o",itemId:"ember-core",level:3},null,null,null,null];
    expect(getBattleCriticalAssetIds(old,old,"zischbert","mockup","mobile")).not.toContain(ingredientMountAsset("mobile"));
  });
  const manifest=JSON.parse(readFileSync("public/assets/ingredient-phase3a-polish/manifest.json","utf8"));
  it("never assigns the new upgrade treatment to any other ingredient",()=>{
    vi.stubGlobal("window",{location:{search:"?art=mockup"}});
    for(const item of ITEMS)for(const level of [1,2,3] as const){
      const approved=PHASE3A_ITEMS.some(id=>id===item.id);
      expect(ingredientUpgradeLevel(item.id,level)).toBe(approved&&level>1?level:undefined);
    }
    vi.stubGlobal("window",{location:{search:"?art=golden"}});
    for(const id of PHASE3A_ITEMS)expect(ingredientUpgradeLevel(id,3)).toBeUndefined();
  });
  it("keeps the measured foot plane for every level and both LODs",()=>{
    for(const id of PHASE3A_ITEMS)for(const tier of ["desktop","mobile"] as const){
      const asset=manifest.assets.find((a:{file:string})=>a.file===`${id}-${tier}.glb`);
      for(const level of [1,2,3])expect(polishedIngredientBottom(id,level,tier==="mobile"?"mobile":"balanced")).toBeCloseTo(asset.restBottom[level-1],6);
    }
  });
  for(const [id,asset] of Object.entries(INGREDIENT_ART_ASSETS).filter(([id])=>id.startsWith("ingredient-polish-")))it(`${id} has bounded topology and real upgrade shapes`,()=>{
    const b=readFileSync(`public/assets/${asset.root}/${asset.file}`);
    const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
    const mount=id.includes("tier-mount");
    const primitives=gltf.meshes.flatMap((m:{primitives:unknown[]})=>m.primitives);
    expect(primitives).toHaveLength(mount?2:3);
    const triangles=primitives.reduce((n:number,p:{indices:number})=>n+gltf.accessors[p.indices].count/3,0);
    expect(triangles).toBeLessThan(mount?800:id.endsWith("mobile")?2300:2900);
    for(const mesh of gltf.meshes){
      expect(mesh.extras.targetNames).toEqual(["LevelII","LevelIII"]);
      for(const primitive of mesh.primitives){
        expect(primitive.targets).toHaveLength(2);
        for(const target of primitive.targets){
          expect(gltf.accessors[target.POSITION].count).toBe(gltf.accessors[primitive.attributes.POSITION].count);
          expect(target.NORMAL).toBeDefined();
        }
      }
    }
    expect(gltf.images.length).toBeLessThanOrEqual(mount?1:2);
    expect(b.length).toBeLessThan(550_000);
    expect(gltf.animations).toBeUndefined();expect(gltf.extensions?.KHR_lights_punctual).toBeUndefined();
  });
});
