# Brasskin character: verification

This review covers the prepared character assets and the isolated Brasskin character preview. It does not certify game integration, an engine migration, or real-device performance.

## Asset checks

Run from the repository root:

```powershell
node --test experiments/cauldron-character/tests/assets.test.mjs
```

The default asset run covers Brasskin, Zischbert and Moor-Martha when all three contracts have been generated. To inspect just one character, set `CHARACTER_PROFILE=brasskin`, `zischbert` or `moor-martha`; comma-separated selections are also supported. The two enemy profiles allow their measured 0.65–0.8 m height and do not require Brasskin's charm.

The test reads the actual binary GLBs, including index and attribute buffers. It verifies:

- A self-contained glTF 2.0 file with embedded buffers and images.
- One character hierarchy with the required body, liquid and charm nodes, without orphaned or duplicated source geometry.
- Finite position, normal, texture and morph attributes; valid indices; unit normals; matching morph vertex counts.
- The eight localized Body morphs Blink_L, Blink_R, FaceNeutral, Smile, Surprise, Hurt, Look_L and Look_R; actual nonzero, bounded deformation is checked while the original textured face is retained. Neutral, smiling and hurt target data must differ. Raw GLB default weights must match the declared rest expression, stay finite within [0, 1], and leave every non-neutral target at zero. This prevents importing a model with blink, smile, surprise and hurt activated simultaneously.
- Actual world-space Y-up bounds, feet near ground, approximately metre-scale height and face towards +Z.
- Nine vertical ray probes through the interior at the fluid center and offsets up to 0.12 m: no remaining source-body cap can sit above and conceal the animated surface.
- Desktop geometry at or below 30,000 triangles and mobile geometry at or below 20,000, with a meaningful reduction for mobile.
- Generated contract counts and byte lengths matching the binary files, optional processed-file SHA-256 checksums, and a SHA-256 checksum matching each preserved original source.

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

On 13 October 2026 all nine binary asset checks passed for the six final character GLBs and their three preserved sources. Brasskin uses contract version 3; Zischbert and Moor-Martha use contract version 2.

| Character | Variant | Triangles | Exported vertices | Meshes |
| --- | --- | ---: | ---: | ---: |
| Brasskin | Desktop | 26,452 | 20,593 | 4 |
| Brasskin | Mobile | 18,451 | 15,542 | 4 |
| Zischbert | Desktop | 28,511 | 20,799 | 3 |
| Zischbert | Mobile | 18,512 | 14,618 | 3 |
| Moor-Martha | Desktop | 27,984 | 19,639 | 2 |
| Moor-Martha | Mobile | 17,983 | 13,471 | 2 |

Brasskin's mobile variant contains 30.2% fewer triangles; Zischbert's and Moor-Martha's also remove more than 30%. All assets expose the eight localized face morphs with nonzero bounded deltas on the +Z front, valid unit normals and embedded texture data. Raw exported defaults were checked: `FaceNeutral` is approximately 0.85 and all seven other targets are zero. Brasskin's fourth mesh is a dark internal mouth cavity; it does not cover or replace the original face. Its original source SHA-256 is `38a551e9d45d3856af33461c21ea86f4cffcd0d52476c2f241fb43ee6c2fe462`; each enemy source and processed-file checksum is recorded in its own contract and verified by the test.

The refreshed mouth browser run passed all 18 cases with no unexpected errors. Eleven screenshots and applied morph/renderer snapshots are saved in [screenshots/report.json](screenshots/report.json). The checks cover the pending-asset gate, six expressions, actual FaceNeutral/Blink/Smile/Surprise/Hurt weights, automatic mobile selection, asset switching, portrait/landscape layout, reduced motion, a deliberate load failure and successful retry. Rest uses a strong neutral weight; joy releases it and applies the happy shape; hit/defeat apply the hurt shape without retaining a smile or stacking two full mouth expressions. Mobile captures separately verify resting and hurt mouth states.

Manual inspection of the refreshed frontal idle/joy/hit/defeat shots confirmed a narrower resting mouth, a wide happy mouth on joy, and a closed/slack mouth with drooping expression on hit/defeat. The original gold face, eyes and texture are retained. Some cheek/corner highlights are baked into the source and visibly stretch with the mouth shapes, so this is not a newly retopologized facial rig with independently redrawn textures. The earlier blink visibly closes the pupils but retains a small white crescent from the source texture. The potion remains teal with a visible swirl and bubbles. Portrait uses a separate scrollable controls section; landscape uses a scrollable side panel.

The initially weak blink and washed-out potion were corrected before these final captures. Numeric morph weights alone were not used as visual acceptance. Real Android/iPhone and hardware GPU performance remain unverified; the recorded headless timings must not be presented as phone FPS.

Review images:

- [Idle/front](screenshots/idle-desktop.png)
- [Joy](screenshots/joy-desktop.png)
- [Hit](screenshots/hit-desktop.png)
- [Defeat](screenshots/defeat-desktop.png)
- [Blink](screenshots/blink-desktop.png)
- [Mobile portrait](screenshots/mobile-portrait.png)
- [Mobile landscape](screenshots/mobile-landscape.png)
