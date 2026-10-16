import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ingredientArtAsset, ingredientArtEnabled, ingredientRestHeight, INGREDIENT_ART_ASSETS, isPhase3AItem } from "../../presentation/scene/ingredientArt";
import { getBattleCriticalAssetIds } from "../../presentation/scene/assetReadiness";
import type { Board } from "../../core/types";

afterEach(()=>vi.unstubAllGlobals());
describe("Phase 3A isolation and asset contracts",()=>{
  it.each(["","?art=golden","?art=legacy","?art=ecosystem","?art=mockup&ingredients=before","?art=mockup&composition=before"])("keeps previous assets for %s",search=>{
    vi.stubGlobal("window",{location:{search}});expect(ingredientArtEnabled()).toBe(false);
  });
  it("enables only the three approved ingredients in mockup",()=>{
    vi.stubGlobal("window",{location:{search:"?art=mockup"}});
    expect(ingredientArtEnabled()).toBe(true);
    for(const id of ["chili","slime-shroom","egg-shell"])expect(isPhase3AItem(id)).toBe(true);
    for(const id of ["ember-core","nightwing","gold-spoon"])expect(isPhase3AItem(id)).toBe(false);
  });
  it("loads the exact mobile assets through the existing gate",()=>{
    vi.stubGlobal("window",{location:{search:"?art=mockup"}});
    const board:Board=[{uid:"c",itemId:"chili",level:1},{uid:"m",itemId:"slime-shroom",level:2},{uid:"s",itemId:"egg-shell",level:3},null,null];
    const ids=getBattleCriticalAssetIds(board,board,"zischbert","mockup","mobile");
    for(const item of ["pedestal","chili","slime-shroom","egg-shell"] as const)expect(ids).toContain(ingredientArtAsset(item,"mobile"));
    expect(ids.some(id=>id.startsWith("ingredient-phase3a-")&&id.endsWith("desktop"))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("keeps growing ingredients on the same pedestal plane",()=>{
    for(const level of [1,2,3])for(const arena of [false,true]){
      const foot=ingredientRestHeight(level,arena)-.52*.98*(.78+level*.14);
      expect(foot).toBeCloseTo(arena?-.245:.225,6);
    }
  });
  for(const [id,asset] of Object.entries(INGREDIENT_ART_ASSETS).filter(([id])=>id.startsWith("ingredient-phase3a-")))it(`${id}: valid bounded PBR GLB`,()=>{
    const b=readFileSync(join(process.cwd(),"public/assets",asset.root,asset.file));
    expect(b.toString("ascii",0,4)).toBe("glTF");expect(b.readUInt32LE(8)).toBe(b.length);
    const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
    const primitives=gltf.meshes.flatMap((m:{primitives:unknown[]})=>m.primitives);
    expect(primitives).toHaveLength(3);
    const triangles=primitives.reduce((n:number,p:{indices:number})=>n+gltf.accessors[p.indices].count/3,0);
    expect(triangles).toBeLessThan(id.endsWith("mobile")?2000:3000);
    for(const p of primitives){expect(p.attributes.NORMAL).toBeDefined();expect(p.attributes.TEXCOORD_0).toBeDefined();}
    for(const m of gltf.materials){expect(m.pbrMetallicRoughness.baseColorTexture).toBeDefined();expect(m.normalTexture).toBeDefined();}
    expect(gltf.images.every((image:{bufferView?:number})=>image.bufferView!==undefined)).toBe(true);
    expect(gltf.animations).toBeUndefined();expect(gltf.extensions?.KHR_lights_punctual).toBeUndefined();
    expect(b.length).toBeLessThan(600_000);
  });
});
