import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Scene inspection is read-only. All save fixtures live exclusively in this
// isolated browser's localStorage. Captures are actual native-gameplay frames.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arguments_ = process.argv.slice(2);
const positional = arguments_.filter(argument => !argument.startsWith('--'));
const target = positional[0] ?? 'http://127.0.0.1:5173/';
const out = resolve(root, positional[1] ?? 'docs/qa/environment-composition');
const flag = name => arguments_.includes(`--${name}`);
const option = name => arguments_.find(argument => argument.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const ingredientArt = flag('ingredient-art');
const lighting = flag('lighting') || ingredientArt;
const workshopOnly = flag('workshop-only');
const quick = flag('quick');
const sampleFrames = (!quick || flag('measure-frames')) && !flag('skip-frame-sampling');
const strictLayout = !flag('relaxed-layout');
const cameraOverride = option('camera');
const passageOverride = option('passage');
assert.ok(!cameraOverride || ['orthographic', 'perspective'].includes(cameraOverride), 'camera must be orthographic or perspective');
assert.ok(!passageOverride || ['door', 'corridor'].includes(passageOverride), 'passage must be door or corridor');
const runKey = 'kessel-krawall-3d-run-v1';
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, variant: 'desktop' },
  { name: 'mobile-portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, variant: 'mobile' },
  { name: 'mobile-landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, variant: 'mobile' },
].filter(profile => !(quick || flag('desktop-only')) || profile.name === 'desktop');
const opponents = workshopOnly ? [] : quick ? [[1, 'zischbert']] : [[1, 'zischbert'], [2, 'moor-martha']];
const modes = ingredientArt ? ['before','after'] : lighting ? (option('looks') ?? 'reference,dark,warm,magical').split(',') : flag('after-only') ? ['after'] : flag('before-only') ? ['before'] : ['before', 'after'];
if (lighting && !ingredientArt) assert.ok(modes.every(mode => ['reference', 'dark', 'warm', 'magical'].includes(mode)));
const phaseOneEvidence = lighting ? JSON.parse(await readFile(join(root,'docs/qa/environment-composition/report.json'),'utf8')) : null;
if (!existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(homedir(), 'AppData/Local/ms-playwright');
}
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
await mkdir(out, { recursive: true });
const report = {
  target,
  date: new Date().toISOString(),
  baseline: 'art=mockup&composition=before (prior architecture and orthographic camera)',
  after: 'art=mockup (composition rework; camera explicitly recorded per capture)',
  scope: 'Architecture, room closure, passage, camera and scoped landscape HUD placement. Identical new GLBs, material policy and lights, no gameplay or VFX replacement.',
  renderer: 'Automated Chromium, viewport/touch emulation; GPU recorded per scene. NOT a physical-phone benchmark.',
  comparability: 'Identical saved run, RNG, inventory, opponent variant, viewport, DPR, gameplay and controls. Landscape battle controls are intentionally repositioned to free the central scene. Native UI observer pauses immediately after readiness; ambient idle animations remain live. Camera and architecture are intentionally different.',
  options: { quick, sampleFrames, strictLayout, cameraOverride, passageOverride, modes },
  cases: [],
  comparisons: [],
  errors: [],
};
if (lighting) Object.assign(report, {
  baseline: 'ae4e37e Phase-1 composition, look=reference',
  after: 'look=dark / warm / magical; reference remains the default',
  scope: 'Lighting and cloned material settings only; no camera, UI, geometry or gameplay changes.',
  comparability: 'Identical camera, viewport, DPR, saved state, RNG, inventory and HUD. Native pause at battle entry; ambient idle animation remains live.',
});
if (ingredientArt) Object.assign(report, {baseline:'4980b81 master assets with approved Warm Fantasy',after:'Phase 3A ingredients and pedestals',scope:'Only mockup ingredients/pedestals; same lighting, camera, UI and gameplay.',comparability:'Same saved state, camera, resolution, RNG and Warm Fantasy. Ambient animations remain live.'});
const browser = await playwright.chromium.launch({
  headless: true,
  args: process.env.QA_SOFTWARE_RENDERER === '1'
    ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-proxy-server']
    : [...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []), '--no-proxy-server'],
});
let activePage;
let activeLabel = 'bootstrap';

function modeUrl(mode) {
  const url = new URL(target);
  url.searchParams.set('art', 'mockup');
  if (ingredientArt) {url.searchParams.set('look','warm');url.searchParams.set('ingredients',mode);return url.href;}
  if (lighting) {
    url.searchParams.delete('composition'); url.searchParams.delete('camera'); url.searchParams.delete('passage');
    url.searchParams.set('look', mode);
    return url.href;
  }
  if (mode === 'before') {
    url.searchParams.set('composition', 'before');
    // A comparison baseline must never inherit the new camera override.
    url.searchParams.delete('camera');
    url.searchParams.delete('passage');
  } else {
    url.searchParams.delete('composition');
    if (cameraOverride) url.searchParams.set('camera', cameraOverride);
    if (passageOverride) url.searchParams.set('passage', passageOverride);
  }
  return url.href;
}

function captureErrors(page, label) {
  page.on('pageerror', error => report.errors.push({ case: label, message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push({ case: label, message: message.text() });
  });
  page.on('response', response => {
    if (response.status() >= 400) report.errors.push({ case: label, message: `${response.status()} ${response.url()}` });
  });
}

async function readRun(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), runKey);
}

async function sceneSnapshot(page) {
  return page.evaluate(async () => {
    const dependency = performance.getEntriesByType('resource').find(entry => /@react-three_fiber\.js\?/.test(entry.name))?.name;
    if (!dependency) return null;
    const { _roots } = await import(dependency);
    const canvas = document.querySelector('canvas');
    const state = _roots.get(canvas)?.store.getState();
    if (!state) return null;
    state.scene.updateMatrixWorld(true);
    state.camera.updateMatrixWorld(true);
    const canvasRect = canvas.getBoundingClientRect();
    const emptyBounds = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
    const mergePoint = (bounds, point) => {
      for (const [axis, component] of ['x', 'y', 'z'].entries()) {
        bounds.min[axis] = Math.min(bounds.min[axis], point[component]);
        bounds.max[axis] = Math.max(bounds.max[axis], point[component]);
      }
    };
    const objectBounds = node => {
      const bounds = emptyBounds();
      let meshCount = 0;
      node.traverse(child => {
        if (!child.isMesh || !child.geometry.attributes.position) return;
        meshCount++;
        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        const local = child.geometry.boundingBox;
        const point = child.position.clone();
        // Bounding-box corner transforms avoid repeatedly copying multi-million
        // vertex scenes out of the renderer. Boxes conservatively enclose meshes.
        for (const x of [local.min.x, local.max.x]) for (const y of [local.min.y, local.max.y]) for (const z of [local.min.z, local.max.z]) {
          point.set(x, y, z).applyMatrix4(child.matrixWorld);
          mergePoint(bounds, point);
        }
      });
      return meshCount ? bounds : null;
    };
    const project = bounds => {
      if (!bounds) return null;
      const result = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity, minDepth: Infinity, maxDepth: -Infinity };
      const point = state.camera.position.clone();
      for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) {
        point.set(x, y, z).project(state.camera);
        const sx = canvasRect.left + (point.x + 1) * canvasRect.width / 2;
        const sy = canvasRect.top + (1 - point.y) * canvasRect.height / 2;
        result.left = Math.min(result.left, sx);
        result.top = Math.min(result.top, sy);
        result.right = Math.max(result.right, sx);
        result.bottom = Math.max(result.bottom, sy);
        result.minDepth = Math.min(result.minDepth, point.z);
        result.maxDepth = Math.max(result.maxDepth, point.z);
      }
      result.width = result.right - result.left;
      result.height = result.bottom - result.top;
      return result;
    };
    const centerProjection = node => {
      const point = node.position.clone().setFromMatrixPosition(node.matrixWorld).project(state.camera);
      return { x: canvasRect.left + (point.x + 1) * canvasRect.width / 2, y: canvasRect.top + (1 - point.y) * canvasRect.height / 2, depth: point.z };
    };
    const rect = element => {
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
    };
    const overlays = [];
    for (const [role, selector] of [
      ['top-header', '.game-title, .battle-hud > .combatant, .battle-hud > .battle-clock, .battle-playback-controls'],
      ['run-stats', '.run-stats'],
      ['utility', '.utility-controls'],
      ['bottom-rail', '.shop-ribbon, .combat-ingredient-rail'],
      ['synergy', '.synergy-strip'],
      ['board-control', '.board-controls'],
    ]) {
      for (const element of document.querySelectorAll(selector)) {
        const style = getComputedStyle(element);
        if (!element.getClientRects().length || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
        overlays.push({ role, selector: element.className, rect: rect(element) });
      }
    }
    const characters = [];
    const productionAssets = [];
    const slots = [];
    const architecture = [];
    const lights = [];
    const cooldowns = [];
    const architectureRayMeshes = new Set();
    let archNode = null;
    state.scene.traverse(node => {
      if (node.name === 'ingredient-cooldown') cooldowns.push({...node.userData,arc:node.children[1]?.geometry?.parameters?.arc});
      if (node.userData.characterAsset) {
        const body = node.getObjectByName('Body');
        const m = node.matrixWorld.elements;
        const length = Math.hypot(m[8], m[9], m[10]);
        const bounds = objectBounds(node);
        const bodyBounds = body ? objectBounds(body) : bounds;
        characters.push({
          asset: node.userData.characterAsset,
          position: [m[12], m[13], m[14]],
          front: [m[8] / length, m[9] / length, m[10] / length],
          hasLiquid: Boolean(node.getObjectByName('LiquidSurface')),
          morphs: Object.fromEntries(Object.entries(body?.morphTargetDictionary ?? {}).map(([name, index]) => [name, body.morphTargetInfluences[index]])),
          bounds,
          screen: project(bounds),
          bodyScreen: project(bodyBounds),
        });
      }
      const slotMarker = node.userData.ingredientSlot ?? node.userData.compositionSlot;
      if (slotMarker !== undefined || /^ingredient-slot-/.test(node.name)) {
        const bounds = objectBounds(node);
        const interaction = node.position.clone().set(0, 0.14, 0).applyMatrix4(node.matrixWorld).project(state.camera);
        slots.push({ name: node.name, slot: slotMarker ?? node.name, side: node.userData.ingredientSide ?? node.userData.side ?? 'workshop', reserve: node.userData.reserveSlot ?? slotMarker === 5, bounds, screen: project(bounds), anchor: centerProjection(node),
          interaction: { x: canvasRect.left + (interaction.x + 1) * canvasRect.width / 2, y: canvasRect.top + (1 - interaction.y) * canvasRect.height / 2 },
        });
      }
      if (node.userData.compositionArchitecture || node.userData.compositionRole) {
        const bounds = objectBounds(node);
        architecture.push({ name: node.name, role: node.userData.compositionRole ?? node.userData.compositionArchitecture, bounds, screen: project(bounds), metadata: node.userData });
        node.traverse(child => { if (child.isMesh) architectureRayMeshes.add(child); });
      }
      if (node.userData.productionAsset) {
        if (/^mockup-dungeon-(wall-module|stone-arch)-/.test(node.userData.productionAsset)) {
          node.traverse(child => { if (child.isMesh) architectureRayMeshes.add(child); });
        }
        if (node.userData.productionAsset.startsWith('mockup-dungeon-stone-arch-')) archNode = node;
        const meshes = [];
        node.traverse(child => {
          if (!child.isMesh) return;
          const position = child.geometry.attributes.position;
          meshes.push({ name: child.name, triangles: (child.geometry.index?.count ?? position.count) / 3, normals: Boolean(child.geometry.attributes.normal), castShadow: child.castShadow, receiveShadow: child.receiveShadow,
            materials: (Array.isArray(child.material) ? child.material : [child.material]).map(material => ({ name: material.name, type: material.type, metalness: material.metalness ?? null, roughness: material.roughness ?? null, color: material.color?.getHexString(), envMapIntensity: material.envMapIntensity, colorMap: Boolean(material.map), normalMap: Boolean(material.normalMap), aoMap: Boolean(material.aoMap) })),
          });
        });
        const bounds = objectBounds(node);
        productionAssets.push({ asset: node.userData.productionAsset, bounds, screen: project(bounds), meshes });
      }
      if (node.isLight) {
        const m = node.matrixWorld.elements;
        lights.push({ type: node.type, color: node.color.getHexString(), intensity: node.intensity, distance: node.distance ?? null, decay: node.decay ?? null, castShadow: node.castShadow, shadowMap: node.castShadow ? node.shadow.mapSize.toArray() : null, localPosition: node.position.toArray(), worldPosition: [m[12], m[13], m[14]] });
      }
    });
    const direction = state.camera.getWorldDirection(state.camera.position.clone());
    const context = state.gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    const metadata = state.camera.userData;
    const camera = {
      type: state.camera.type,
      position: state.camera.position.toArray(),
      quaternion: state.camera.quaternion.toArray(),
      direction: direction.toArray(),
      target: metadata.compositionTarget ?? metadata.target ?? null,
      targetNote: 'Explicit camera metadata when supplied; direction is always recorded and does not imply a unique look-at distance.',
      fov: state.camera.fov ?? null,
      zoom: state.camera.zoom,
      near: state.camera.near,
      far: state.camera.far,
      aspect: state.camera.aspect ?? canvasRect.width / canvasRect.height,
      metadata,
    };
    const architectureRays = [];
    if (archNode) {
      const archBounds = objectBounds(archNode);
      const base = archBounds.min[1];
      const originZ = archBounds.max[2] + 0.9;
      // A separate Raycaster is used: the live game's pointer raycaster is not
      // touched. Triangle hits establish closure, unlike nominal box overlap.
      const raycaster = new state.raycaster.constructor();
      const direction = state.camera.position.clone().set(0, 0, -1);
      const origin = state.camera.position.clone();
      const meshLabel = mesh => {
        for (let node = mesh; node; node = node.parent) {
          if (node.userData.compositionRole) return node.userData.compositionRole;
          if (node.userData.productionAsset) return node.userData.productionAsset;
        }
        return mesh.name;
      };
      const samples = [
        ...[-1, 1].map(side => ({ label: `side-seam-${side < 0 ? 'left' : 'right'}`, x: side * 1.5, y: base + 2.0, far: 2.0 })),
        ...[-1, 1].map(side => ({ label: `upper-spandrel-${side < 0 ? 'left' : 'right'}`, x: side * 1.12, y: base + 3.8, far: 2.0 })),
        { label: 'above-arch-crown', x: 0, y: base + 4.7, far: 2.0 },
        { label: 'passage-terminal', x: 0, y: base + 1.4, far: 8.0 },
      ];
      for (const sample of samples) {
        origin.set(sample.x, sample.y, originZ);
        raycaster.set(origin, direction);
        raycaster.near = 0.01;
        raycaster.far = sample.far;
        const hits = raycaster.intersectObjects([...architectureRayMeshes], false);
        architectureRays.push({ label: sample.label, origin: origin.toArray(), direction: direction.toArray(), far: sample.far, closed: hits.length > 0, nearest: hits[0] ? { distance: hits[0].distance, point: hits[0].point.toArray(), object: meshLabel(hits[0].object) } : null,
          note: 'Six diagnostic triangle-ray samples, not an exhaustive proof of every possible camera sightline.',
        });
      }
    }
    const geometries = new Set(), textures = new Set(), arrays = new Set();
    state.scene.traverse(node => {
      if (!node.isMesh) return;
      geometries.add(node.geometry);
      for (const mat of Array.isArray(node.material) ? node.material : [node.material]) for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
    });
    for (const geometry of geometries) {
      for (const attr of Object.values(geometry.attributes)) arrays.add(attr.array ?? attr.data?.array);
      if (geometry.index) arrays.add(geometry.index.array);
    }
    const geometryBytes = [...arrays].reduce((n,array)=>n+(array?.byteLength??0),0);
    const textureBytesEstimate = [...textures].reduce((n,texture)=>n+(texture.image?.width??0)*(texture.image?.height??0)*4*(texture.generateMipmaps?4/3:1),0);
    return {
      characters, productionAssets, slots, architecture, lights, camera, overlays, cooldowns,
      viewport: { width: innerWidth, height: innerHeight, canvas: rect(canvas) },
      floorTiles: productionAssets.filter(asset => asset.asset.startsWith('mockup-dungeon-floor-module')),
      architectureRays,
      render: { calls: state.gl.info.render.calls, triangles: state.gl.info.render.triangles },
      memory: { geometries: state.gl.info.memory.geometries, textures: state.gl.info.memory.textures, geometryBytes, textureBytesEstimate,
        estimateNote:'Scene-referenced unique attribute/index arrays and RGBA8 texture sizes incl generated mipmaps; excludes driver copies, cache-only assets, render targets and morph buffers. Not measured VRAM.' },
      lighting: { environmentIntensity: state.scene.environmentIntensity, toneMapping: state.gl.toneMapping, exposure: state.gl.toneMappingExposure, shadowType: state.gl.shadowMap.type },
      dpr: state.gl.getPixelRatio(),
      gpu: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
      hud: { phase: document.querySelector('main')?.className ?? null, pause: document.querySelector('.battle-clock > span')?.textContent ?? null },
    };
  });
}

async function waitScene(page, expectedCharacters) {
  const started = Date.now();
  let latest;
  while (Date.now() - started < 60_000) {
    latest = await sceneSnapshot(page);
    const charactersReady = latest?.characters.length === expectedCharacters && latest.characters.every(character => character.hasLiquid && Number.isFinite(character.morphs.FaceNeutral));
    const slugs = [
      'dungeon-wall-module', 'dungeon-stone-arch', 'dungeon-stone-pillar', 'alchemy-shelf', 'wall-candle-sconce',
      'dungeon-floor-module', 'open-grimoire', 'triple-candleholder', expectedCharacters === 1 ? 'witch-workbench' : 'ritual-platform',
    ];
    const assetsReady = slugs.every(slug => latest?.productionAssets.some(asset => asset.asset.startsWith(`mockup-${slug}-`) && asset.meshes.length > 0));
    if (charactersReady && assetsReady && latest.render.triangles > 0) {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      return sceneSnapshot(page);
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`Scene did not become ready (${expectedCharacters} characters): ${JSON.stringify(latest)}`);
}

function assertCharacter(snapshot, id, variant) {
  const character = snapshot.characters.find(entry => entry.asset === `${id}-${variant}`);
  assert.ok(character, `${id}-${variant} renders in the real game scene`);
  assert.ok(character.hasLiquid, 'living brew retained');
  return character;
}

function assertMockupMaterials(snapshot) {
  const assets = snapshot.productionAssets.filter(asset => asset.asset.startsWith('mockup-'));
  assert.ok(assets.length >= 5, 'the supplied GLBs appear in both composition variants');
  for (const asset of assets) {
    assert.ok(asset.meshes.length > 0);
    for (const mesh of asset.meshes) {
      assert.ok(mesh.normals && mesh.triangles > 0, `${asset.asset} keeps complete GLB geometry`);
      for (const material of mesh.materials) {
        assert.ok(material.colorMap, `${asset.asset} keeps its color atlas`);
        assert.ok(material.metalness !== null && material.metalness <= 0.1, `${asset.asset} keeps the established non-metallic policy`);
      }
    }
  }
}

function intersection(a, b) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function layoutChecks(snapshot) {
  const viewport = { left: 0, top: 0, right: snapshot.viewport.width, bottom: snapshot.viewport.height };
  const objects = [
    ...snapshot.characters.map(character => ({ id: character.asset, type: 'character', screen: character.bodyScreen ?? character.screen })),
    ...snapshot.slots.map(slot => ({ id: `${slot.side}-slot-${slot.slot}`, type: 'ingredient-slot', screen: slot.screen, anchor: slot.anchor })),
  ];
  return objects.map(object => {
    const box = object.screen;
    if (!box || box.width <= 0 || box.height <= 0) return { id: object.id, failed: true, reason: 'No finite projected geometry bounds' };
    const area = box.width * box.height;
    const center = object.anchor ?? { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
    const collisions = snapshot.overlays.map(overlay => ({ role: overlay.role, selector: overlay.selector, area: intersection(box, overlay.rect), objectFraction: intersection(box, overlay.rect) / area,
      coversCenter: center.x >= overlay.rect.left && center.x <= overlay.rect.right && center.y >= overlay.rect.top && center.y <= overlay.rect.bottom,
    })).filter(collision => collision.area > 0.1);
    const visibleFraction = intersection(box, viewport) / area;
    const centerInViewport = center.x >= 0 && center.x <= viewport.right && center.y >= 0 && center.y <= viewport.bottom;
    const majorCollision = collisions.some(collision => collision.coversCenter || collision.objectFraction > 0.25);
    return { ...object, visibleFraction, centerInViewport, collisions, failed: !centerInViewport || visibleFraction < 0.8 || majorCollision,
      note: 'Conservative projected mesh AABBs, not pixel masks. Actor Body only; named top-header and bottom-rail DOM rectangles are excluded from available play space, not treated as scene geometry.',
    };
  });
}

async function frameSample(page, activeOnly = false) {
  if (!sampleFrames) return { skipped: true };
  return page.evaluate(async ({measureShadows,activeOnly}) => {
    const deltas = [];
    const shadowSamples = [];
    const longTasks = [];
    const observer = typeof PerformanceObserver !== 'undefined' ? new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry=>({start:entry.startTime,duration:entry.duration})))) : null;
    observer?.observe({entryTypes:['longtask']});
    let shadowMap, originalShadowRender, renderer, programsBefore;
    if (measureShadows) {
      const dependency = performance.getEntriesByType('resource').find(entry => /@react-three_fiber\.js\?/.test(entry.name))?.name;
      const { _roots } = await import(dependency);
      const gl = _roots.get(document.querySelector('canvas')).store.getState().gl;
      renderer = gl; programsBefore = gl.info.programs.length;
      shadowMap = gl.shadowMap; originalShadowRender = shadowMap.render;
      // Instrument the existing render pass; no extra draws or scene mutation.
      shadowMap.render = function(...args) {
        const start = performance.now(), calls = gl.info.render.calls, triangles = gl.info.render.triangles;
        try { return originalShadowRender.apply(this,args); }
        finally { shadowSamples.push({calls:gl.info.render.calls-calls,triangles:gl.info.render.triangles-triangles,cpuSubmissionMs:performance.now()-start}); }
      };
    }
    try { await new Promise(resolve => {
      let previous;
      let warmup = 20;
      function frame(now) {
        if (activeOnly && (!document.querySelector('.phase-battle') || document.querySelector('.result-panel'))) { resolve(); return; }
        if (previous !== undefined && warmup <= 0) deltas.push(now - previous);
        previous = now;
        warmup--;
        if (deltas.length >= 120) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }); } finally { if (shadowMap) shadowMap.render = originalShadowRender; observer?.disconnect(); }
    const sorted = [...deltas].sort((a, b) => a - b);
    const percentile = fraction => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
    const meanMs = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
    const median = values => values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
    const shadow = shadowSamples.length ? Object.fromEntries(['calls','triangles','cpuSubmissionMs'].map(key=>[key,median(shadowSamples.slice(-120).map(sample=>sample[key]))])) : null;
    return { frames: deltas.length, medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: sorted.at(-1), meanMs, observedRafFps: 1000 / meanMs,
      shadow, shadowNote: 'Median existing shadow pass draws and CPU submission time, NOT GPU elapsed time; wrapper restored after sample.',
      programsBefore, programsAfter: renderer?.info.programs.length, longTasks: longTasks.sort((a,b)=>b.duration-a.duration).slice(0,6),
      activeOnly,
      note: 'Up to 120 rAF intervals after 20 warm-up frames; active-only samples stop before result UI. Includes vsync/headless scheduling, NOT isolated GPU render time or physical-phone performance.',
    };
  }, {measureShadows:lighting,activeOnly});
}

async function capture(page, label, snapshot, mode) {
  // Avoid comparing a blink to open eyes, without freezing or editing the scene.
  if (lighting) for (let attempt = 0; attempt < 8 && snapshot.characters.some(character => (character.morphs.Blink_L ?? 0) > 0.15); attempt++) {
    await page.waitForTimeout(80);
    snapshot = await sceneSnapshot(page);
  }
  assertMockupMaterials(snapshot);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: no horizontal page overflow`);
  const layout = layoutChecks(snapshot);
  const screenshot = `${label}.png`;
  await page.screenshot({ path: join(out, screenshot), fullPage: true });
  const entry = { name: label, screenshot, snapshot, layout, frameTiming: await frameSample(page) };
  report.cases.push(entry);
  if (mode === 'before' && !ingredientArt) assert.equal(snapshot.camera.type, 'OrthographicCamera', 'comparison baseline retains its old orthographic camera');
  if ((lighting || mode === 'after') && strictLayout) {
    assert.ok(snapshot.slots.length >= 5, 'readable real ingredient-slot markers are available for composition QA');
    assert.deepEqual(layout.filter(check => check.failed).map(check => ({ id: check.id, visibleFraction: check.visibleFraction, centerInViewport: check.centerInViewport, collisions: check.collisions })), [], `${label}: actors and ingredient slots fit the viewport without major HUD occlusion`);
  }
  if (lighting || mode === 'after') {
    assert.ok(snapshot.architecture.some(part => part.role === 'room-floor'), 'continuous floor is present, not just cropped tile bounds');
    assert.ok(snapshot.architecture.some(part => part.role === 'wall-fill'), 'actual arch masonry infill is present');
    assert.ok(snapshot.architectureRays.length >= 6, 'actual architecture triangle-ray probes are recorded');
    assert.deepEqual(snapshot.architectureRays.filter(ray => !ray.closed).map(ray => ray.label), [], `${label}: masonry seams, upper arch regions and passage terminal are physically closed`);
  }
}

async function reloadRun(page, snapshot) {
  await page.evaluate(({ key, snapshot }) => { localStorage.setItem(key, JSON.stringify(snapshot)); location.reload(); }, { key: runKey, snapshot });
  await page.getByRole('button', { name: /Fortsetzen/ }).click();
  await page.locator('.shop-ribbon').waitFor();
  return waitScene(page, 1);
}

async function clickProjected(page, point, profile) {
  assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), 'native interaction target has a finite projection');
  if (profile.hasTouch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

async function verifyUnlockedReserve(page, purchased, profile, mode) {
  const reserveFixture = {
    ...purchased, round: 5, selectedSlot: null, pendingBattle: null,
    board: [...purchased.board.slice(0, 4), { uid: 'qa-last-slot', itemId: 'slime-shroom', level: 1 }],
    reserve: { uid: 'qa-reserve', itemId: 'egg-shell', level: 2 },
  };
  const snapshot = await reloadRun(page, reserveFixture);
  const lastSlot = snapshot.slots.find(slot => slot.slot === 4);
  const reserve = snapshot.slots.find(slot => slot.slot === 5);
  assert.ok(lastSlot && reserve, 'native unlocked reserve and last board slot exist');
  const layout = layoutChecks(snapshot);
  if (mode === 'after' && strictLayout) assert.deepEqual(layout.filter(check => check.failed).map(check => check.id), [], 'unlocked reserve fits the viewport and avoids major HUD coverage');
  await clickProjected(page, lastSlot.interaction, profile);
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.selectedSlot === 4, runKey, { timeout: 10_000 });
  await clickProjected(page, lastSlot.interaction, profile);
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.selectedSlot === null, runKey, { timeout: 10_000 });
  await clickProjected(page, reserve.interaction, profile);
  await page.locator('.reserve-popover').waitFor({ timeout: 10_000 });
  const verified = { round: 5, screenshot: null, profile: profile.name, input: profile.hasTouch ? 'native touchscreen tap' : 'native mouse click', snapshot, layout,
    selectedLastSlot: true, deselectedLastSlot: true, selectedReserve: true, reserveSelectionEvidence: 'Actual native .reserve-popover becomes visible; reserve selection is transient UI state, not a field in the persisted domain save.',
  };
  await reloadRun(page, purchased);
  assert.deepEqual(await readRun(page), purchased, 'round-one fixture restored exactly after isolated reserve test');
  return verified;
}

async function armEntryPause(page) {
  // Click the actual native UI in the same DOM turn as battle HUD entry. No
  // scene mutation, global test hook or simulated combat replacement is used.
  await page.evaluate(() => {
    let timer;
    const observer = new MutationObserver(check);
    function stop() { observer.disconnect(); clearTimeout(timer); }
    function check() {
      const button = document.querySelector('button[aria-label="Kampf pausieren"]');
      if (!document.querySelector('.phase-battle') || document.querySelector('.battle-preparation') || !button || button.disabled || !button.getClientRects().length) return;
      stop(); button.click();
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-label', 'disabled'] });
    timer = setTimeout(stop, 60_000);
    check();
  });
}

async function verifyIngredientControls(page, purchased, profile, mode) {
  const label=`${mode}-${profile.name}`;
  const snapshot=await sceneSnapshot(page);
  await clickProjected(page,snapshot.slots.find(s=>s.slot===0).interaction,profile);
  await page.locator('.selection-popover').waitFor();
  assert.match(await page.locator('.selection-popover').innerText(),/Stufe II/);
  await clickProjected(page,snapshot.slots.find(s=>s.slot===3).interaction,profile);
  const moved=await readRun(page);
  assert.equal(moved.board[3]?.uid,'qa-chili','native slot swap moves the real ingredient');
  assert.equal(moved.board[0],null);
  await reloadRun(page,purchased);
  const mergeFixture={...purchased,gold:20,selectedSlot:null,board:[
    {uid:'qa-merge-2',itemId:'chili',level:2},{uid:'qa-merge-1',itemId:'chili',level:1},null,null,null,
  ],offers:[{uid:'qa-upgrade',itemId:'chili',bought:false},...purchased.offers.slice(1)]};
  await reloadRun(page,mergeFixture);
  await page.locator('.offer:not([disabled])').first().click();
  await page.locator('.purchase-feedback').waitFor();
  await page.waitForFunction(()=>!document.querySelector('.purchase-feedback')&&!document.querySelector('.battle-button')?.disabled);
  const merged=await readRun(page);
  assert.equal(merged.board.filter(Boolean).length,1);
  assert.equal(merged.board.find(Boolean).level,3,'purchase drives complete I→II→III cascade');
  assert.ok(await page.locator('.synergy.is-active').count()>0,'level III fire synergy remains active');
  const stageCaptures=[];
  for(const level of [1,2,3]) {
    const levels={...purchased,selectedSlot:null,board:['chili','slime-shroom','egg-shell'].map((itemId,i)=>({uid:`qa-stage-${i}`,itemId,level})).concat([null,null])};
    const state=await reloadRun(page,levels);
    for(let slot=0;slot<3;slot++) {
      await clickProjected(page,state.slots.find(s=>s.slot===slot).interaction,profile);
      await page.locator('.selection-popover').waitFor();
      assert.match(await page.locator('.selection-popover').innerText(),new RegExp(`Stufe ${['','I','II','III'][level]}(?:\\s|$)`));
      await clickProjected(page,state.slots.find(s=>s.slot===slot).interaction,profile);
    }
    if(profile.name==='desktop') {
      const path=join(out,`levels-${level}-${label}.png`);await page.screenshot({path});stageCaptures.push(path);
      if(level===1) {
        await page.setViewportSize({width:2880,height:1800});await page.waitForTimeout(500);await waitScene(page,1);
        await page.screenshot({path:join(out,`closeup-${mode}.png`),clip:{x:580,y:700,width:1120,height:690}});
        await page.setViewportSize(profile.viewport);await page.waitForTimeout(300);
      }
    }
  }
  // A real existing passive source; its model is deliberately NOT part of this art pass.
  const buffFixture={...purchased,selectedSlot:null,board:[{uid:'qa-haste',itemId:'ember-core',level:1},{uid:'qa-chili',itemId:'chili',level:1},purchased.board[2],null,null]};
  const buffState=await reloadRun(page,buffFixture);
  await clickProjected(page,buffState.slots.find(s=>s.slot===0).interaction,profile);
  assert.match(await page.locator('.placement-insights').innerText(),/Platz 2/);
  await clickProjected(page,buffState.slots.find(s=>s.slot===0).interaction,profile);
  await clickProjected(page,buffState.slots.find(s=>s.slot===1).interaction,profile);
  assert.match(await page.locator('.placement-insights').innerText(),/→/,'buff changes the displayed cooldown');
  await reloadRun(page,purchased);
  report.cases.push({name:`ingredient-interactions-${label}`,swap:true,mergeToIII:true,allThreeItemsAllLevels:true,activeSynergy:true,placementBuff:true,stageCaptures});
}

function compareScenes() {
  if (ingredientArt) {
    for (const profile of profiles) for (const scene of ['workshop',...opponents.map(([,enemy])=>`battle-${enemy}`)]) {
      const b=report.cases.find(c=>c.name===`${scene}-before-${profile.name}`),a=report.cases.find(c=>c.name===`${scene}-after-${profile.name}`);
      assert.deepEqual(a.snapshot.camera,b.snapshot.camera,'ingredient pass preserves camera exactly');
      assert.deepEqual(a.snapshot.overlays,b.snapshot.overlays,'ingredient pass preserves UI');
      assert.deepEqual(a.snapshot.lighting,b.snapshot.lighting,'no lighting change');
      const signature=s=>s.lights.map(({worldPosition,...rest})=>rest);
      assert.deepEqual(signature(a.snapshot),signature(b.snapshot),'no new light or changed light parameters');
      report.comparisons.push({scene,profile:profile.name,cameraIdentical:true,hudIdentical:true,lightingIdentical:true,beforeRender:b.snapshot.render,afterRender:a.snapshot.render,beforeMemory:b.snapshot.memory,afterMemory:a.snapshot.memory,beforeTiming:b.frameTiming,afterTiming:a.frameTiming});
    }
    return;
  }
  if (lighting) {
    for (const profile of profiles) for (const scene of ['workshop', ...opponents.map(([, enemy]) => `battle-${enemy}`)]) {
      const reference = report.cases.find(entry => entry.name === `${scene}-reference-${profile.name}`);
      if (!reference) continue;
      const phaseOne = phaseOneEvidence.cases.find(entry => entry.name === `${scene}-after-${profile.name}`);
      assert.deepEqual(reference.snapshot.camera, phaseOne.snapshot.camera, 'reference camera matches committed Phase 1');
      assert.deepEqual(reference.snapshot.render, phaseOne.snapshot.render, 'reference draw/triangle counts match committed Phase 1');
      const stableLights = snapshot => snapshot.lights.map(({worldPosition,shadowMap,...light})=>light);
      assert.deepEqual(stableLights(reference.snapshot),stableLights(phaseOne.snapshot),'reference light parameters match committed Phase 1');
      for (const look of modes.filter(mode => mode !== 'reference')) {
        const entry = report.cases.find(entry => entry.name === `${scene}-${look}-${profile.name}`);
        const before = reference.snapshot, after = entry.snapshot;
        assert.deepEqual(after.camera, before.camera, 'lighting comparison preserves exact camera');
        assert.deepEqual(after.overlays, before.overlays, 'lighting comparison preserves HUD');
        assert.equal(after.dpr, before.dpr);
        assert.equal(after.lights.length, before.lights.length, 'no additional light count');
        assert.equal(after.lights.filter(light => light.castShadow).length, 1, 'one shadow light only');
        assert.deepEqual(after.lights.find(light => light.castShadow).shadowMap, before.lights.find(light => light.castShadow).shadowMap, 'shadow texture resolution unchanged');
        const topology = s => s.productionAssets.map(asset => ({ asset: asset.asset, meshes: asset.meshes.map(mesh => ({ name: mesh.name, triangles: mesh.triangles })) }));
        assert.deepEqual(topology(after), topology(before), 'original GLB topology unchanged');
        report.comparisons.push({scene, profile: profile.name, look, cameraIdentical:true, hudIdentical:true, geometryIdentical:true,
          beforeRender: before.render, afterRender: after.render, beforeTiming:reference.frameTiming, afterTiming:entry.frameTiming,
          beforeMemory:before.memory, afterMemory:after.memory, shadowMap:after.lights.find(light=>light.castShadow).shadowMap, shadowLights:1 });
      }
    }
    return;
  }
  for (const profile of profiles) for (const scene of ['workshop', ...opponents.map(([, enemy]) => `battle-${enemy}`)]) {
    const before = report.cases.find(entry => entry.name === `${scene}-before-${profile.name}`);
    const after = report.cases.find(entry => entry.name === `${scene}-after-${profile.name}`);
    if (!before || !after) continue;
    assert.equal(before.snapshot.dpr, after.snapshot.dpr, 'comparison DPR identical');
    const lightSignature = snapshot => snapshot.lights.map(({ worldPosition, ...light }) => light);
    assert.deepEqual(lightSignature(before.snapshot), lightSignature(after.snapshot), 'composition phase preserves light types, colors, intensities and local placement');
    const materialSignature = snapshot => Object.fromEntries(snapshot.productionAssets.filter(asset => asset.asset.startsWith('mockup-')).map(asset => [asset.asset, asset.meshes.map(mesh => mesh.materials)]));
    const beforeMaterials = materialSignature(before.snapshot);
    const afterMaterials = materialSignature(after.snapshot);
    for (const [id, signature] of Object.entries(beforeMaterials)) if (afterMaterials[id]) assert.deepEqual(afterMaterials[id], signature, `${id}: existing GLB material policy preserved`);
    report.comparisons.push({ scene, profile: profile.name,
      beforeCamera: before.snapshot.camera, afterCamera: after.snapshot.camera,
      beforeRender: before.snapshot.render, afterRender: after.snapshot.render,
      renderTriangleRatio: after.snapshot.render.triangles / before.snapshot.render.triangles,
      renderCallRatio: after.snapshot.render.calls / before.snapshot.render.calls,
      beforeTiming: before.frameTiming, afterTiming: after.frameTiming,
      beforeLayoutWarnings: before.layout.filter(check => check.failed).map(check => check.id),
      afterLayoutWarnings: after.layout.filter(check => check.failed).map(check => check.id),
      lightingPreserved: true, sharedMaterialsPreserved: true,
      lightPositionNote: 'Local light placement is asserted. World positions are separately recorded because ingredient/cauldron idle animation can move a light-bearing parent.',
    });
  }
}

try {
  const bootstrap = await browser.newContext({ viewport: profiles[0].viewport, deviceScaleFactor: 1 });
  await bootstrap.addInitScript(() => localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete'));
  activePage = await bootstrap.newPage();
  captureErrors(activePage, 'bootstrap');
  await activePage.goto(modeUrl('before'), { waitUntil: 'domcontentloaded' });
  await activePage.getByRole('button', { name: /Spielen/ }).click();
  await activePage.getByRole('button', { name: 'Turnier beginnen', exact: true }).click();
  await activePage.locator('.shop-ribbon').waitFor();
  const fixture = await readRun(activePage);
  assert.equal(fixture.phase, 'shop');
  Object.assign(fixture, {
    rngState: 0x4b4b2026, opponentVariant: 0, selectedSlot: null, pendingBattle: null, gold: 7,
    board: [
      { uid: 'qa-chili', itemId: 'chili', level: 1 },
      { uid: 'qa-shroom', itemId: 'slime-shroom', level: 1 },
      { uid: 'qa-shell', itemId: 'egg-shell', level: 1 }, null, null,
    ],
    offers: [
      { uid: 'qa-offer-chili', itemId: 'chili', bought: false },
      { uid: 'qa-offer-shroom', itemId: 'slime-shroom', bought: false },
      { uid: 'qa-offer-shell', itemId: 'egg-shell', bought: false },
    ],
  });
  report.fixture = fixture;
  await bootstrap.close();

  for (const profile of profiles) {
    let purchasedBaseline;
    const battleBaselines = new Map();
    for (const mode of modes) {
      activeLabel = `${mode}-${profile.name}`;
      console.log(`Composition QA: ${activeLabel}`);
      const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile, hasTouch: profile.hasTouch, deviceScaleFactor: 1 });
      await context.addInitScript(({ key, snapshot }) => {
        localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete');
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(snapshot));
      }, { key: runKey, snapshot: fixture });
      const page = await context.newPage();
      activePage = page;
      captureErrors(page, activeLabel);
      await page.goto(modeUrl(mode), { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Fortsetzen/ }).click();
      await page.locator('.shop-ribbon').waitFor();
      await waitScene(page, 1);
      assert.deepEqual(await readRun(page), fixture, 'both compositions begin from an identical sanitized valid save');
      await page.locator('.offer:not([disabled])').first().click();
      await page.locator('.purchase-feedback').waitFor({ timeout: 10_000 });
      assert.equal(await page.locator('.battle-button').isDisabled(), true, 'battle entry is blocked while purchase/merge presentation is pending');
      await page.waitForFunction(() => !document.querySelector('.purchase-feedback') && document.querySelector('.battle-button')?.disabled === false, undefined, { timeout: 20_000 });
      const purchased = await readRun(page);
      assert.ok(purchased.gold < fixture.gold, 'native purchase deducts gold');
      assert.equal(purchased.board[0]?.itemId, 'chili');
      assert.equal(purchased.board[0]?.level, 2, 'native purchase merges level I chili into level II');
      assert.equal(purchased.offers[0].bought, true, 'native offer is sold after purchase');
      if (mode === 'before' || (lighting && mode === modes[0])) purchasedBaseline = purchased;
      else if (purchasedBaseline) assert.deepEqual(purchased, purchasedBaseline, 'purchase/merge and inventory unchanged by composition');
      const purchaseCase = { name: `purchase-and-merge-${activeLabel}`, goldBefore: fixture.gold, goldAfter: purchased.gold, board: purchased.board, blockedBattleDuringPurchase: true };
      report.cases.push(purchaseCase);
      const workshop = await waitScene(page, 1);
      assert.ok(assertCharacter(workshop, 'brasskin', profile.variant).front[2] > 0.8, 'workshop character faces the user');
      await capture(page, `workshop-${activeLabel}`, workshop, mode);
      if (ingredientArt) await verifyIngredientControls(page,purchased,profile,mode);
      if (workshopOnly) { await context.close(); continue; }
      purchaseCase.unlockedReserve = await verifyUnlockedReserve(page, purchased, profile, mode);

      for (const [round, enemy] of opponents) {
        if (round === 2) {
          await reloadRun(page, { ...purchased, phase: 'shop', round: 2, opponentVariant: 0, pendingBattle: null, selectedSlot: null,
              board: [{ uid: 'qa-chili', itemId: 'chili', level: 2 }, { uid: 'qa-shroom', itemId: 'slime-shroom', level: 2 }, { uid: 'qa-shell', itemId: 'egg-shell', level: 1 }, null, null],
          });
        }
        await armEntryPause(page);
        await page.locator('.battle-button').click();
        await page.locator('.battle-hud').waitFor({ timeout: 60_000 });
        await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).waitFor({ timeout: 60_000 });
        assert.equal(await page.locator('.battle-preparation').count(), 0, 'readiness gate completes before playable combat');
        const battleRun = await readRun(page);
        if (mode === 'before' || (lighting && mode === modes[0])) battleBaselines.set(enemy, battleRun);
        else if (battleBaselines.has(enemy)) assert.deepEqual(battleRun, battleBaselines.get(enemy), 'domain battle result and RNG unchanged by composition');
        const battle = await waitScene(page, 2);
        if (ingredientArt) {
          assert.ok(battle.cooldowns.filter(c=>c.side==='player').length>=3,'three real 3D cooldown dials exist');
          for(const c of battle.cooldowns) assert.ok(Math.abs(c.arc-Math.max(.02,Math.PI*2*c.cooldownProgress))<.0001,'3D cooldown arc matches the unchanged progress');
        }
        const player = assertCharacter(battle, 'brasskin', profile.variant);
        const opponent = assertCharacter(battle, enemy, profile.variant);
        assert.ok(player.front[2] < -0.8 && opponent.front[2] > 0.8, 'combatants still face each other');
        assert.ok(player.position[2] - opponent.position[2] > 7, 'the seven-unit VFX travel lane is preserved');
        await capture(page, `battle-${enemy}-${activeLabel}`, battle, mode);
        let activeTiming;
        if (lighting && sampleFrames && !ingredientArt) {
          await page.getByRole('button', { name: '1×', exact: true }).click();
          await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).click();
          await page.waitForTimeout(700);
          activeTiming = await frameSample(page, true);
          assert.ok(activeTiming.frames >= 30, 'active combat performance sample contains at least 30 real battle frames');
        } else {
          await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).click();
          if (ingredientArt) {
            await page.waitForTimeout(550);
            const live=await sceneSnapshot(page);
            assert.ok(live.cooldowns.some(c=>c.side==='player'&&c.cooldownProgress>0),'live 3D cooldowns advance');
            assert.ok((await page.locator('.combat-ingredient').first().getAttribute('style')).includes('--cooldown-turn'),'HUD cooldown rendering retained');
          }
        }
        // Native UI activation in one DOM turn: a first-use stall can finish the
        // short fight between a locator's existence check and its stable click.
        const spedUp = await page.evaluate(() => {
          if (document.querySelector('.result-panel')) return false;
          const button=[...document.querySelectorAll('.battle-playback-controls button')].find(b=>b.textContent==='4×');
          if (!button) return false;
          button.click(); return true;
        });
        await page.locator('.result-panel').waitFor({ timeout: 60_000 });
        await page.getByRole('button', { name: 'Zurück zur Werkbank', exact: true }).click();
        await page.locator('.shop-ribbon').waitFor();
        assertCharacter(await waitScene(page, 1), 'brasskin', profile.variant);
        report.cases.push({ name: `combat-result-and-return-${enemy}-${activeLabel}`, pauseThroughNativeUi: true, native4xPlayback: spedUp, returnedToWorkshop: true, activeTiming });
      }
      await context.close();
    }
  }
  compareScenes();
  const renderedMockupIds = [...new Set(report.cases.flatMap(entry => entry.snapshot?.productionAssets ?? []).map(asset => asset.asset).filter(id => id.startsWith('mockup-')))];
  report.renderedMockupKinds = [...new Set(renderedMockupIds.map(id => id.replace(/-(desktop|mobile)$/, '')))];
  assert.ok(report.renderedMockupKinds.length >= (workshopOnly ? 9 : 10), 'supplied asset types retained across gameplay scenes');
  assert.deepEqual(report.errors, [], 'no missing assets or runtime errors');
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: join(out, `failure-${activeLabel}.png`), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(`Composition QA: ${report.cases.length} cases passed; ${report.cases.filter(entry => entry.screenshot).length} actual game captures; ${report.comparisons.length} paired comparisons; no runtime errors.`);
