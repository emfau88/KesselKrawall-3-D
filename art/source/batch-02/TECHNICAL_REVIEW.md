# Batch 2: architecture and alchemy shelf source-model audit

**Later update:** Technical runtime versions of all four Batch-2 sources,
including the subsequently received wall candle sconce, are now integrated
in `?art=mockup`. The raw-source checkpoint below is historical; the default
game remains unchanged. See [gameplay comparison and QA](../../../docs/qa/mockup-environment/README.md).

Audit date: 2026-10-13. This checkpoint covers the three received GLBs: the wall module, stone arch and stocked alchemy shelf. The wall candle sconce has a reference image, but no source-model findings are claimed for it here.

## Status and confirmed identities

- [x] Wall, arch and alchemy shelf source files received and copied under their verified identities.
- [x] Source glTF metadata, texture dimensions, mesh counts, bounds and SHA-256 inspected.
- [x] All three sources imported and rendered diagnostically in Blender without modifying or exporting them.
- [x] Arch inspected from its actual opening-facing direction, with additional through-opening geometry probes.
- [ ] Technical runtime exports, material/normal correction, pivots and LODs.
- [ ] Integration, wall seams, placement, readiness, final scene lighting and gameplay checks.
- [ ] Desktop/mobile visual acceptance and measured runtime performance.

**These new GLBs are not integrated into the playable game and have no completed LOD exports at this checkpoint.** Diagnostic renders are not in-game screenshots, proof of mobile performance or confirmation that the mockup target has already been achieved. No gameplay/browser tests were run for this audit.

| ID | Confirmed asset | User-uploaded filename | Preserved source |
| --- | --- | --- | --- |
| B2-01 | Volumetric stone masonry wall module | `task_027d0926-0199-4f99-a574-fa7401321bed_model.glb` | `dungeon-wall-module/source.glb` |
| B2-02 | Freestanding stone arch with open passage | `task_9e473102-4a86-4f68-96fe-e75cd3041488_model.glb` | `dungeon-stone-arch/source.glb` |
| B2-03 | Stocked wooden alchemy shelf | `task_d1f976ff-beaf-431c-85c4-d8b246ce7b99_model.glb` | `alchemy-shelf/source.glb` |

All three glTF 2.0 sources identify `trimesh` as their generator. Each contains one mesh, one triangle primitive, one material, one UV set and one embedded RGB PNG. A `world` node parents the `geometry_0` mesh without node transforms. There are no rigs, animation tracks, morph targets or dedicated effect anchors.

## Measured geometry and textures

| Asset | GLB bytes | Raw vertices | Triangles | Embedded PNG bytes | Texture |
| --- | ---: | ---: | ---: | ---: | --- |
| Wall module | 2,052,660 | 19,873 | 28,398 | 1,313,068 | 1024 x 1024 RGB |
| Stone arch | 1,741,008 | 11,459 | 16,880 | 1,307,912 | 1024 x 1024 RGB |
| Alchemy shelf | 2,245,944 | 27,443 | 38,590 | 1,232,648 | 1024 x 1024 RGB |

Raw vertex counts include UV-seam duplicates. One wall, one arch and one shelf total 83,868 triangles; repeated raw modules would multiply their geometry cost. One mesh/material per object is favorable for draw calls, but is not a performance measurement.

All three contain `POSITION` and `TEXCOORD_0` only: **normal and tangent attributes are absent**. The current Three `GLTFLoader` enables flat shading when normals are missing. Prepare seam-aware intentional normals while preserving UVs and hard/beveled stone or wood edges. The shelf's rounded bottles visibly need appropriate smoothing rather than accidental flat shading.

All three materials have a base-color texture, white color factor, `roughnessFactor: 1`, and `doubleSided: false`. **`metallicFactor` is omitted**, causing glTF/Three's default of **1.0**. Stone, wood, paper and the opaque bottle bodies should receive an explicit nonmetal baseline in prepared runtime assets. The shelf's single atlas/material mixes iron, wood, books and bottles; true per-surface material behavior is not supplied by this source. There are no normal, AO, emissive or metallic/roughness maps; the colored atlases are not finished PBR material sets. Authored-material policy alone does not correct the bad metallic default.

## Bounds and orientation

The values below are raw **glTF Y-up** source coordinates, not Blender Z-up coordinates or established physical meters. The origins sit near the centers, rather than the bottom. Normalize pivots to the base and choose dimensions explicitly before placing any of these models.

| Asset | Minimum XYZ | Maximum XYZ | Size XYZ |
| --- | --- | --- | --- |
| Wall module | `[-0.499984, -0.376444, -0.098698]` | `[0.499940, 0.377806, 0.098876]` | `[0.999924, 0.754249, 0.197574]` |
| Stone arch | `[-0.101063, -0.499769, -0.368231]` | `[0.100922, 0.499681, 0.367919]` | `[0.201985, 0.999450, 0.736150]` |
| Alchemy shelf | `[-0.131457, -0.500328, -0.345536]` | `[0.128141, 0.500165, 0.345472]` | `[0.259598, 1.000493, 0.691009]` |

**Their horizontal axes are different.** Wall width is X and thickness is Z. Arch and shelf width are Z and thickness is X, so their opening/stocked faces look along X. They need a deliberate Y-axis quarter-turn before treating their width axis like the wall's width axis. The rotation sign depends on the desired visible side. An automatic identical placement rotation for all assets would show the arch and shelf edge-on.

Blender converts raw glTF `(x, y, z)` to `(x, -z, y)` on import. Its diagnostic bounds therefore use Blender Z for height. Do not mix those bounds with raw glTF positions when preparing pivots or transforms.

## Wall: usable relief, seams and proportion mismatch

The texture and clay renders confirm a real solid masonry segment with six readable courses and beveled individual stone relief. It is not a flat texture plane. Blender's tolerance-based diagnostic weld produces 14,201 vertices, zero boundary edges and zero edges linked to more than two faces. Direct source-triangle inspection found zero degenerate triangles.

The outer ends are approximately straight. Axis-facing triangles near the left/right outer planes have area-weighted coordinate standard deviations of approximately 0.00163 and 0.00112 source units. Across horizontal bands, left/right extents vary slightly due to the bevels and irregular stone surfaces. Copies can plausibly be arranged as modules, but **mathematically seamless tiling has not been demonstrated**. Actual repeated joins, visible mortar gaps, base/top alignment and repeating texture patterns need scene-level inspection. Do not flatten or creatively rebuild the source to conceal this acceptance work.

The proportions differ from the image prompt. The prompt requested approximately 2.8 m width, 3 m height and 0.4 m thickness; the reconstructed width/height ratio is **1.326**, not 0.933. Uniformly scaling this raw mesh to 3 m height would give approximately **3.98 m width and 0.79 m thickness**. The final scene dimensions therefore require a deliberate fitting decision; nonuniform scaling can change the stone proportions and must be visually checked.

## Arch: free through-opening verified

Additional renders looking along the actual thickness axis show two stone jambs, a rounded wedge-stone arch and keystone, with an open center. The standard diagnostic `front.png` looks along Z and therefore shows the narrow side; use `opening-front.png` and `opening-clay.png` for the opening-facing view.

The opening was also probed directly against source triangles: rays through the entire X thickness were sampled at all combinations of these raw coordinates:

```text
Y = [-0.45, -0.30, -0.15, 0.00, 0.15, 0.25]
Z = [-0.18, -0.09, 0.00, 0.09, 0.18]
```

All 30 probes had zero triangle intersections. The upper stone band at `Y = 0.40` gave intersections as a positive control. At `Y = 0.32`, outer probes hit the curved arch while the center remained clear. This is evidence of a genuinely free passage, not a transparent material painted over a solid panel. It is a finite sampling check plus visual review, not a proof of every point in the opening or a finished gameplay collision test.

Blender's diagnostic weld produces 8,442 vertices, zero boundary edges and zero edges linked to more than two faces. Source-triangle inspection found zero degenerate triangles. A closed, watertight **stone-frame volume** is compatible with its open passage: “zero boundary edges” does not mean a panel fills the doorway.

After orienting width along X, its width/height ratio is about 0.736, reasonably close to the requested 2.4/3.5 = 0.686, but its relative depth is larger. Uniformly scaling to 3.5 m height gives approximately 2.58 m width and 0.71 m thickness, rather than the requested 0.45 m depth. Keep this explicit during scene fitting.

## Shelf: recognizable volumetric contents, one static assembly

Front-facing diagnostic views from both raw X directions show a sturdy wooden shelving frame with three stocked levels, diagonal braces, dark iron fasteners, colored corked bottles and thick aged books. Emerald/green, amber, teal/blue and purple bottle colors remain distinguishable. The clay view confirms real bottle bodies/necks/corks and book volumes rather than pictures painted onto flat shelf backings. Visible items sit on the shelf levels in these views; complete scene placement still needs acceptance.

The reconstruction is **one mesh with one material**, not a collection of named bottle/book nodes. No separate bottle, book, cork or liquid animation can be inferred from the source. The bottle appearance is opaque and atlas-colored as intended for reconstruction; it is not a transparent glass shader or a separately modeled animated liquid surface. Any later shelf interaction would require deliberate technical separation or additional runtime anchors/effects, not merely enabling an existing animation.

Blender's diagnostic weld produces 19,259 vertices, zero boundary edges and zero edges linked to more than two faces. Direct source-triangle inspection found zero degenerate triangles. The frame/contents are recognizable, but the raw 38,590-triangle model should not be repeated around the room without an appropriate runtime LOD.

Its width/height ratio is approximately 0.691, versus the requested 1.5/2.5 = 0.600. Uniformly scaling it to 2.5 m height gives approximately 1.73 m width and 0.65 m depth, rather than the requested 1.5 m width and 0.45 m depth. Ground the source's minimum Y (-0.500328), choose the visible X-facing side explicitly, and verify fitting behind the actual arena/workbench camera. The ordinary Z-facing diagnostic `front.png` is a narrow side view; use the `shelf-positive-x.png` and `shelf-negative-x.png` views for the stocked faces.

## Proposed follow-up budgets and acceptance

These are **provisional targets to test**, not completed exports:

| Asset | Desktop target triangles | Mobile target triangles | Preserve |
| --- | ---: | ---: | --- |
| Wall module | 3,000-8,000 | 1,000-3,000 | Stone relief/silhouette, module ends, UV fidelity and readable joints. |
| Stone arch | 4,000-8,000 | 2,000-4,000 | Truly empty passage, arch curvature, keystone, both level bases and visible bevels. |
| Alchemy shelf | 8,000-15,000 | 4,000-8,000 | Braced wood frame, open shelf gaps, bottle/cork silhouettes, book thickness and atlas colors. |

Preserve unmodified sources. Blender is for technical normals, material repair, grounding/orientation, small cleanup and LOD export, not replacement primitive-based art. Check the 1024-square atlases at actual camera distances before claiming sufficient detail. Repeated walls should share geometry/materials where appropriate; evaluate combined triangles, shadows, effects, loading and lighting in the complete desktop/mobile scene.

Follow-up order: technical preparation; matched-view comparison; explicit dimension/orientation fitting; repeated-wall seam and arch-opening checks; readiness integration; real desktop/mobile gameplay and performance tests. A raw-source visual pass is not the final mockup-quality gate.

## Integrity and local diagnostic evidence

SHA-256:

```text
dungeon-wall-module/source.glb
cb924480d8a510a9ae8b3d0f0441a50b19e0af3121afb8c201922837d22fbe32

dungeon-stone-arch/source.glb
9de460f913d0e4d9a214b375fbdaf90bb835ceb2e79bdb47dc8cdbf18f2e1ddb

alchemy-shelf/source.glb
e04f8ddcd4dda61f9b9f08b6ca4baa69af4023c5c81b9f307f200687f37e04a0
```

All three models were imported with the existing `.tmp-qa/inspect_generated_glb.py` in Blender 5.2.0 LTS. Temporary outputs:

- `.tmp-qa/batch-02-wall-review/front.png`, `clay.png`, `blender-metrics.json`.
- `.tmp-qa/batch-02-arch-review/front.png`, `clay.png`, `opening-front.png`, `opening-clay.png`, `blender-metrics.json`.
- `.tmp-qa/batch-02-shelf-review/front.png`, `clay.png`, `shelf-positive-x.png`, `shelf-negative-x.png`, `shelf-negative-x-clay.png`, `blender-metrics.json`.

The opening-facing arch and shelf renders change only the diagnostic camera/material override in memory. No source GLB was exported or overwritten. No runtime, manifest or README files were edited by this audit.
