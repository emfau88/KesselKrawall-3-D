# Batch 1: audit of the user-supplied to3D source models

Audit date: 2026-10-13. These are the original image-to-3D results, not finished runtime assets.

**Later update:** The raw-source checkpoint below is historical. Technical
runtime versions are now integrated in the opt-in `?art=mockup` preview;
the default game remains unchanged. See [gameplay comparison and QA](../../../docs/qa/mockup-environment/README.md).

## Status and identity

- [x] Four individually generated reference images are saved beside their prompts.
- [x] Four user-supplied GLBs are saved under the correct asset identities.
- [x] Embedded glTF data, geometry counts, bounds, texture atlases and source hashes have been inspected.
- [x] The open grimoire was imported and rendered diagnostically in Blender without changing or exporting its source.
- [ ] Technical runtime preparation: normals, material correction, pivot normalization and LODs.
- [ ] Runtime placement, candle-flame anchors and readiness integration.
- [ ] In-game desktop/mobile visual acceptance, loading checks and performance measurement.

**None of these four new source models is integrated into the playable game at this checkpoint.** Existing game assets remain the baseline. A standalone Blender render does not establish in-game lighting, gameplay placement, mobile performance or the mockup-quality target. No runtime test results are claimed here.

The first upload was the **wood workbench**, not the ritual platform. Its original filename is an opaque task ID; actual identity was checked from the wood/metal texture atlas and rectangular mesh bounds. The second upload contains the stone platform. The third contains the three unlit wax candles; the fourth contains the open illustrated grimoire.

| ID | Confirmed asset | Original user-uploaded filename | Preserved project source |
| --- | --- | --- | --- |
| B1-01 | Stone ritual platform | `task_b9f38196-4550-4c39-95ab-76f8698bc49e_model.glb` | `ritual-platform/source.glb` |
| B1-02 | Wood witch workbench | `task_f87f6fe1-203c-4e15-abd4-571abc1691fc_model.glb` | `witch-workbench/source.glb` |
| B1-03 | Triple candleholder | `task_c3c6cf97-6fc9-4fba-bba5-05c2b1ca48ed_model.glb` | `triple-candleholder/source.glb` |
| B1-04 | Open grimoire | `task_d8a5d1bd-8b50-4aca-908a-759337edf5d9_model.glb` | `open-grimoire/source.glb` |

Each source is a glTF 2.0 binary generated through `trimesh`, with one mesh, one triangle primitive, one material, one UV set and one embedded PNG. The scene contains a `world` node and its `geometry_0` mesh child without node transforms. There are no animation tracks, rigs, morph targets, named wick nodes or separate glow/rune geometry.

## Measured source geometry and textures

Counts below are read from the actual glTF accessors, not estimated from file size. Raw vertex counts include UV-seam duplicates.

| Asset | GLB bytes | Raw vertices | Triangles | Embedded RGB PNG bytes | PNG resolution |
| --- | ---: | ---: | ---: | ---: | --- |
| Ritual platform | 2,157,488 | 25,072 | 34,134 | 1,245,080 | 1024 x 1024 |
| Workbench | 1,883,188 | 17,624 | 25,780 | 1,220,020 | 1024 x 1024 |
| Triple candleholder | 2,983,928 | 42,751 | 67,290 | 1,320,100 | 1024 x 1024 |
| Open grimoire | 1,808,492 | 15,033 | 22,762 | 1,233,328 | 1024 x 1024 |

One copy of each totals **149,966 triangles** before technical optimization. One mesh/material per object is favorable for draw calls, but does not make their triangle cost negligible. Ten copies of the raw candleholder alone would contain 672,900 triangles, before the rest of the scene, shadow rendering or effects. These are cost observations, not measured FPS.

The 1024-square atlases are plausible for small decorations. The workbench and platform occupy a much larger screen/world area; their perceived detail and baked lighting must be checked at the real camera distances. No higher-resolution material or full PBR bake has been produced during this audit.

### Bounds and coordinate basis

These bounds are the raw **glTF Y-up** positions, in unspecified source units. They are not Blender Z-up coordinates or final world-space meters. The longest horizontal dimension is approximately one source unit. Pivots are near the object center, not at the feet/base.

| Asset | Minimum XYZ | Maximum XYZ | Size XYZ |
| --- | --- | --- | --- |
| Ritual platform | `[-0.499913, -0.057718, -0.499857]` | `[0.499735, 0.058338, 0.499745]` | `[0.999648, 0.116055, 0.999602]` |
| Workbench | `[-0.500168, -0.155428, -0.285004]` | `[0.500910, 0.151057, 0.285401]` | `[1.001078, 0.306485, 0.570405]` |
| Triple candleholder | `[-0.500267, -0.499736, -0.464422]` | `[0.499834, 0.499175, 0.464290]` | `[1.000101, 0.998911, 0.928712]` |
| Open grimoire | `[-0.497265, -0.085053, -0.315522]` | `[0.498494, 0.071647, 0.315392]` | `[0.995760, 0.156700, 0.630914]` |

Runtime normalization should center X/Z and ground minimum Y, with explicit desired dimensions. Blender's importer converts glTF `(x, y, z)` to Blender `(x, -z, y)`; all anchor transforms must use the same basis as the imported mesh. An object's front-facing presentation is a placement decision, not something proven merely by the Y-up bounds.

### Lightweight topology diagnostics

For this audit, vertices were grouped by positions rounded to a 1e-6 source-unit grid; triangle edges were counted after that diagnostic grouping. Degenerate triangles use a cross-product magnitude threshold of 1e-12. These operations do not modify the source. The results are local diagnostics, not a formal glTF validation or a reason to rebuild the asset.

| Asset | Unique grouped positions | Degenerate triangles | Boundary edges after grouping | Edges used by more than two faces |
| --- | ---: | ---: | ---: | ---: |
| Ritual platform | 17,025 | 0 | 0 | 2 |
| Workbench | 12,880 | 0 | 0 | 0 |
| Triple candleholder | 33,636 | 2 | 0 | 2 |
| Open grimoire | 11,361 | 0 | 0 | 1 |

UV seams create many boundaries in the raw index topology; those are not automatically physical holes. The book's Blender diagnostic independently reports 11,361 vertices after a tolerance-based weld, zero welded boundary edges and one welded edge with more than two linked faces. Small flagged locations should be inspected during cleanup; rounding/tolerance can also merge near-coincident positions.

## Required material and normal corrections

All four source primitives contain `POSITION` and `TEXCOORD_0`, but **no `NORMAL` or `TANGENT` attribute**. The current Three `GLTFLoader` enables `flatShading` when normal attributes are absent. Prepare and export intentional normals before visual acceptance. A naive normal calculation on UV-separated vertices can leave visible shading seams; use seam-aware normal preparation while preserving UVs and intended hard edges.

All four material definitions contain only a base-color texture, white base-color factor, `roughnessFactor: 1` and `doubleSided: false`. **`metallicFactor` is omitted.** In glTF and the current Three loader, the missing metallic factor defaults to **1.0**, not 0. This is wrong for stone, wood, paper and wax and must be corrected explicitly in the prepared asset; marking it as an authored material does not repair the source default.

There are no normal, occlusion, emissive or metallic/roughness maps. The colored atlases visually contain shading, but are not equivalent to authored PBR maps. Do not describe these sources as finished PBR assets. The candleholder also mixes wax and metal in a single atlas/material: use a sensible nonmetal baseline first, then assess whether technically separating existing surface regions or authoring a material mask is worthwhile. Do not invent uniform metallic behavior across the wax.

Preserve the generated shape and colored reference identity. Blender is reserved for technical cleanup, material repair, export, anchors and LODs, **not a creative primitive-based replacement**.

## Candle flame anchors

The candles are unlit in both reference and source. Flame, smoke and local-light animation remain runtime effects. The three wicks occupy a triangular footprint and unequal heights; reusing the old equal-offset flame positions would make flames float beside them.

These approximate centerline tip anchors were measured in **raw glTF Y-up** coordinates by sampling the base-color atlas at mesh UVs, selecting dark vertices (`max(R,G,B) < 100`), separating the three physical candle regions, and averaging unique X/Z positions within 0.004 source units of the highest dark point and an X/Z radius of 0.05. Anchor Y is the highest dark point. This identifies the existing black wick geometry rather than guessing table-relative offsets. Final visual verification is still required.

| Anchor | Raw glTF XYZ |
| --- | --- |
| `Wick_L` | `[-0.243562013, 0.498299986, 0.164998204]` |
| `Wick_C` | `[0.002618057, 0.183923662, -0.236622483]` |
| `Wick_R` | `[0.252544224, 0.277291417, 0.166225955]` |

For an **illustrative** preparation centered in X/Z, grounded in Y and uniformly scaled to a total height of 1.1, use:

```text
scale = 1.1 / (maxY - minY) = approximately 1.101199
origin = [(minX + maxX)/2, minY, (minZ + maxZ)/2]
preparedPoint = (rawPoint - origin) * scale

Wick_L = [-0.267972082, 1.099036694,  0.181768417]
Wick_C = [ 0.003121264, 0.752845705, -0.260496050]
Wick_R = [ 0.278339803, 0.855662167,  0.183120415]
```

These values are not yet applied in the game and do not imply 1.1 is the accepted final scene height. Create exported `Wick_L`, `Wick_C`, `Wick_R` empty nodes in the prepared GLB; parent runtime flames to their measured transforms. Protect wick geometry when decimating and retain the anchor nodes across LODs.

## Proposed runtime preparation budgets

The following are **targets to test**, not completed exports or guaranteed quality. Preserve silhouette, UV fidelity, book edge thickness, tabletop readability, platform relief and candle wicks. Reject a reduction if it visibly harms the accepted camera views.

| Asset | Desktop target triangles | Mobile target triangles | Important acceptance constraint |
| --- | ---: | ---: | --- |
| Ritual platform | 12,000-20,000 | 6,000-10,000 | Stone rim remains volumetric; floor/cauldron anchors and clear projectile lane remain valid. |
| Workbench | 8,000-15,000 | 4,000-8,000 | Broad tabletop supports existing ingredient slots, cauldron, purchase arrival and merge effects. |
| Triple candleholder | 2,000-4,000 | 1,000-2,000 | Wax silhouette and all three wick tips remain readable; do not duplicate 67k-triangle raw models around the arena. |
| Open grimoire | 3,000-6,000 | 1,500-3,000 | Open-page silhouette, illustrations and page-stack depth survive; it is not an upright book stand. |

Follow-up order: technical exports and small local topology repair; matched-view visual comparison; tabletop/arena fitting and measured wick effects; preload/readiness; desktop/mobile gameplay and performance tests. Shared geometry/materials help repeated decorations, but shadows, light count, effect overdraw and the complete scene must also be measured. The mockups remain the visual target, not a quality claim already met by these raw files.

## Source integrity and diagnostic evidence

SHA-256 of the preserved source GLBs:

```text
witch-workbench/source.glb
45e6285c5381c6e27a2d92b7bf627a73dfa11ae2de3dbc5779e8ff7eba835aa6

ritual-platform/source.glb
6d89d69f311093335fe448942e753b476e2dff01047fe31020cf3b50936daf28

triple-candleholder/source.glb
57ce8080b131600ad0fa759d6075f0a5e6abdcecf8838d000b60bd4bf51f2192

open-grimoire/source.glb
a1e36ce715acbaeb38a3f8c523cb3d7a56338fcf1b3cd6900b281ef545ecedab
```

Local diagnostic renders are temporary, not README screenshots or published in-game proof. The open book was rendered with the existing `.tmp-qa/inspect_generated_glb.py` in Blender 5.2.0 LTS; outputs are `.tmp-qa/batch-01-book-review/front.png`, `clay.png` and `blender-metrics.json`. The front render shows the open book, page stacks, leather cover and illustrations. Earlier standalone diagnostic output directories exist for the workbench, platform and candles; their presence must not be confused with successful integration or runtime testing.
