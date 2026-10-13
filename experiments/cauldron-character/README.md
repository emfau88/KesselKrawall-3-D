# Brasskin character review

An isolated character study using the existing Three.js/Vite dependencies. The original generated sculpt and painted face are preserved. Local `Body` morph targets drive expression; the separate potion surface receives waves, a moving jade spiral, reusable bubbles and steam.

The GLBs contain the optimized sculpt, its existing color texture, localized face morphs and a separate liquid mesh. Their expressions are a first sculpt-preserving pass, not a fully authored facial rig. The original painted highlights are still present; dedicated roughness and normal texture maps have not been authored. Liquid shaders, bubbles, steam, whole-body motion and the six state timelines are preview runtime behavior, not animations baked into the GLB. Another engine can reuse the meshes and morph targets but needs corresponding animation and effect code.

Run these commands from the repository root:

```powershell
.\node_modules\.bin\vite.cmd --config experiments/cauldron-character/vite.config.ts
.\node_modules\.bin\tsc.cmd -p experiments/cauldron-character/tsconfig.json --pretty false
.\node_modules\.bin\vite.cmd build --config experiments/cauldron-character/vite.config.ts
```

The local preview is `http://127.0.0.1:5194/`. Use `?quality=desktop` or `?quality=mobile` to select an asset explicitly; automatic mode also applies the mobile budget to narrow landscape viewports. `?view=front`, `?view=rear`, or `?view=three-quarter` selects the camera.

The production build in `dist/` includes only this review and `public/assets/characters/brasskin/`, rather than copying the game's entire asset library. It can be served as a static folder, including at a nested path.

Controls cover idle, joy, charge, attack, hit and defeat, plus replay, pause, an automatic sequence, reduced movement, model quality and camera views. State controls stay disabled until the GLB, liquid and shader warmup are complete. A failed load offers an accessible retry.

The frozen `window.__CAULDRON_REVIEW__` test interface provides `snapshot()`, `selectState()`, `setExpression()`, `seek(seconds)`, `setView()` and asynchronous `selectAsset()`. `seek` renders a deterministic pose and pauses the timeline. `diagnoseLiquid(showBody, diagnosticRed)` is a development-only helper for checking material color versus hidden geometry; call `diagnoseLiquid(true, false)` to restore normal appearance.

The performance panel reports measured browser frame intervals and JS/render-call submission time, including averages and P95. It does not measure GPU time. Paused scenes redraw only for camera changes or explicit pose updates. Automated Chromium software rendering is functional evidence, not a mobile hardware benchmark.

The preview remains an independent entry point. The root game's player now
uses the same Brasskin GLBs and the shared `LivingLiquid` helper; combat motion
is implemented separately in `src/presentation/scene/character/brasskinMotion.ts`.
The game's menus and combat rules do not depend on this preview. See
`docs/CHARACTER_RECONSTRUCTION.md` and the character QA documentation for
integration checks, visual evidence and remaining limits.
