# Brasskin character: verification

This review covers the prepared character assets and the isolated character preview. It does not certify game integration, an engine migration, or real-device performance.

## Asset checks

Run from the repository root:

```powershell
node --test experiments/cauldron-character/tests/assets.test.mjs
```

The test reads the actual binary GLBs, including index and attribute buffers. It verifies:

- A self-contained glTF 2.0 file with embedded buffers and images.
- One character hierarchy with the required body, liquid and charm nodes, without orphaned or duplicated source geometry.
- Finite position, normal, texture and morph attributes; valid indices; unit normals; matching morph vertex counts.
- The seven localized Body morphs Blink_L, Blink_R, Smile, Surprise, Hurt, Look_L and Look_R; actual nonzero, bounded deformation is checked while the original textured face is retained.
- Actual world-space Y-up bounds, feet near ground, approximately metre-scale height and face towards +Z.
- Nine vertical ray probes through the interior at the fluid center and offsets up to 0.12 m: no remaining source-body cap can sit above and conceal the animated surface.
- Desktop geometry at or below 30,000 triangles and mobile geometry at or below 20,000, with a meaningful reduction for mobile.
- Generated contract counts matching the binary files and a SHA-256 checksum matching the preserved original source.

## Browser checks

The browser smoke runner uses Playwright, either installed locally or supplied through `PLAYWRIGHT_MODULE`. Its browser cache can be selected with `PLAYWRIGHT_BROWSERS_PATH`.

```powershell
node experiments/cauldron-character/tests/browser-smoke.mjs http://127.0.0.1:5194/ docs/qa/cauldron-character/screenshots
```

The runner saves screenshots and a JSON report. It checks desktop expressions, mobile portrait/landscape layout, the renderer readiness gate and the single liquid surface. A separate browser page blocks the character request to verify the visible failure state and successful retry.

The temporary material diagnostic can be repeated while the development helper is available:

```powershell
node experiments/cauldron-character/tests/diagnose-liquid.mjs http://127.0.0.1:5194/
```

It takes normal, body-hidden/red-liquid and body-visible/red-liquid screenshots. On 13 October both red views displayed the same unobstructed surface, agreeing with the ray probes: the initially pale potion was caused by reflection and shading, not a duplicate mesh above it.

Screenshots establish the rendered behavior and composition. Headless browser frame timings are diagnostic only: the software-rendered automated session is not evidence for FPS on a phone. Real Android/iPhone and hardware desktop measurements remain necessary before selecting production budgets.

## Current results

On 13 October 2026 the three binary asset checks passed for the face-preserving character:

| Variant | Triangles | Exported vertices | Meshes |
| --- | ---: | ---: | ---: |
| Desktop | 26,452 | 20,593 | 4 |
| Mobile | 18,451 | 15,542 | 4 |

The mobile variant contains 30.2% fewer triangles. Both assets expose all seven localized face morphs with nonzero bounded deltas on the +Z front, valid unit normals and embedded texture data. The fourth mesh is a dark internal mouth cavity; it does not cover or replace the original face. The source SHA-256 is `38a551e9d45d3856af33461c21ea86f4cffcd0d52476c2f241fb43ee6c2fe462`.

The final coherent browser run passed all 16 cases with no unexpected errors. Eleven screenshots and applied morph/renderer snapshots are saved in [screenshots/report.json](screenshots/report.json). The checks cover the pending-asset gate, six expressions, actual Blink/Smile/Surprise/Hurt weights, automatic mobile selection, asset switching, portrait/landscape layout, reduced motion, a deliberate load failure and successful retry.

Manual inspection of the final idle, blink and mobile screenshots confirmed that the original face is retained, the blink visibly closes the pupils, and the potion reads as teal with a visible swirl and bubbles. The small white crescent under closed eyes comes from the source texture and remains a limitation of this mesh-deformation approach; this is not a newly retopologized facial rig. Portrait uses a separate scrollable controls section; landscape uses a scrollable side panel. The character and title are readable without the former portrait overlap.

The initially weak blink and washed-out potion were corrected before these final captures. Numeric morph weights alone were not used as visual acceptance. Real Android/iPhone and hardware GPU performance remain unverified; the recorded headless timings must not be presented as phone FPS.

Review images:

- [Idle/front](screenshots/idle-desktop.png)
- [Blink](screenshots/blink-desktop.png)
- [Mobile portrait](screenshots/mobile-portrait.png)
- [Mobile landscape](screenshots/mobile-landscape.png)
