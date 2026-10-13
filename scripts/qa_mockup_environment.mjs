import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// All scene access below is read-only. Fixtures are written only to the test
// browser's own localStorage, never to a production scene/global or real save.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const positional = process.argv.slice(2).filter(argument => !argument.startsWith('--'));
const target = positional[0] ?? 'http://127.0.0.1:5173/';
const out = resolve(root, positional[1] ?? 'docs/qa/mockup-environment');
const sampleFrames = !process.argv.includes('--skip-frame-sampling');
const runKey = 'kessel-krawall-3d-run-v1';
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, variant: 'desktop' },
  { name: 'mobile-portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, variant: 'mobile' },
  { name: 'mobile-landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, variant: 'mobile' },
].filter(profile => !process.argv.includes('--desktop-only') || profile.name === 'desktop');
if (!existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(homedir(), 'AppData/Local/ms-playwright');
}
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
await mkdir(out, { recursive: true });
const software = process.env.QA_SOFTWARE_RENDERER === '1';
const report = {
  target,
  date: new Date().toISOString(),
  baseline: 'art=golden',
  after: 'art=mockup',
  renderer: 'Automated Chromium, viewport/touch emulation; GPU is recorded per scene. This is NOT a physical-phone performance benchmark.',
  comparability: 'Same saved run, RNG, inventory, opponent variant, viewport, DPR, camera and HUD state in both modes. A one-time DOM observer clicks the actual pause UI immediately after the readiness gate; ambient animation is not frozen.',
  floor: 'Supplied 2-metre authored stone tiles use original LOD0/LOD1, three preserved PBR maps and bottom-pivot normalization; old Golden floor remains only in baseline.',
  cases: [],
  errors: [],
};
const browser = await playwright.chromium.launch({
  headless: true,
  args: software
    ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-proxy-server']
    : [...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []), '--no-proxy-server'],
});
let activePage;
let activeLabel = 'bootstrap';

function modeUrl(mode) {
  const url = new URL(target);
  url.searchParams.set('art', mode);
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
    const characters = [];
    const productionAssets = [];
    const candleGroups = [];
    state.scene.traverse(node => {
      if (node.userData.characterAsset) {
        const body = node.getObjectByName('Body');
        const m = node.matrixWorld.elements;
        const length = Math.hypot(m[8], m[9], m[10]);
        characters.push({
          asset: node.userData.characterAsset,
          position: [m[12], m[13], m[14]],
          front: [m[8] / length, m[9] / length, m[10] / length],
          hasLiquid: Boolean(node.getObjectByName('LiquidSurface')),
          morphs: Object.fromEntries(Object.entries(body?.morphTargetDictionary ?? {}).map(([name, index]) => [name, body.morphTargetInfluences[index]])),
        });
      }
      if (node.userData.productionAsset) {
        const meshes = [];
        const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
        node.traverse(child => {
          if (!child.isMesh) return;
          const materials = (Array.isArray(child.material) ? child.material : [child.material]).map(material => ({
            name: material.name,
            type: material.type,
            metalness: material.metalness ?? null,
            roughness: material.roughness ?? null,
            colorMap: Boolean(material.map),
            normalMap: Boolean(material.normalMap),
            aoMap: Boolean(material.aoMap),
          }));
          const position = child.geometry.attributes.position;
          const point = child.position.clone();
          // Use transformed geometry vertices, not the complete scene's bounds.
          for (let index = 0; index < position.count; index++) {
            point.fromBufferAttribute(position, index);
            child.localToWorld(point);
            for (const [axis, component] of ['x', 'y', 'z'].entries()) {
              bounds.min[axis] = Math.min(bounds.min[axis], point[component]);
              bounds.max[axis] = Math.max(bounds.max[axis], point[component]);
            }
          }
          meshes.push({
            name: child.name,
            vertices: position.count,
            triangles: (child.geometry.index?.count ?? position.count) / 3,
            normals: Boolean(child.geometry.attributes.normal),
            materials,
          });
        });
        productionAssets.push({
          asset: node.userData.productionAsset,
          bounds: meshes.length ? bounds : null,
          meshes,
        });
      }
      if (node.userData.mockupCandles || node.userData.mockupCandleflames || node.userData.mockupCandleFlames) {
        candleGroups.push({
          asset: node.userData.mockupCandles ?? node.userData.mockupCandleflames ?? node.userData.mockupCandleFlames,
          anchors: node.userData.flameAnchors ?? null,
        });
      }
    });
    const context = state.gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    return {
      characters,
      productionAssets,
      candleGroups,
      render: { calls: state.gl.info.render.calls, triangles: state.gl.info.render.triangles },
      memory: { geometries: state.gl.info.memory.geometries, textures: state.gl.info.memory.textures },
      dpr: state.gl.getPixelRatio(),
      gpu: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
    };
  });
}

async function waitScene(page, expectedCharacters, mode) {
  const started = Date.now();
  let latest;
  while (Date.now() - started < 60_000) {
    latest = await sceneSnapshot(page);
    const charactersReady = latest?.characters.length === expectedCharacters
      && latest.characters.every(character => character.hasLiquid && Number.isFinite(character.morphs.FaceNeutral));
    const assetsReady = mode !== 'mockup'
      || latest?.productionAssets.some(asset => asset.asset.startsWith('mockup-') && asset.meshes.length > 0);
    if (charactersReady && assetsReady && latest.render.triangles > 0) {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      return sceneSnapshot(page);
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`Scene did not become ready (${expectedCharacters} characters, ${mode}): ${JSON.stringify(latest)}`);
}

function assertCharacter(snapshot, id, variant) {
  const character = snapshot.characters.find(entry => entry.asset === `${id}-${variant}`);
  assert.ok(character, `${id}-${variant} renders in the real gameplay scene`);
  assert.ok(character.hasLiquid, 'living brew is retained');
  return character;
}

function assertMockupMaterials(snapshot, mode) {
  const assets = snapshot.productionAssets.filter(asset => asset.asset.startsWith('mockup-'));
  if (mode === 'golden') {
    assert.equal(assets.length, 0, 'baseline does not render the new asset set');
    return;
  }
  assert.ok(assets.length >= 5, `mockup scene has at least five new environment instances: ${assets.map(asset => asset.asset).join(', ')}`);
  for (const asset of assets) {
    assert.ok(asset.meshes.length > 0, `${asset.asset} has real GLB geometry`);
    for (const mesh of asset.meshes) {
      assert.ok(mesh.normals, `${asset.asset} ${mesh.name} retains normals`);
      assert.ok(mesh.triangles > 0);
      for (const material of mesh.materials) {
        assert.ok(material.colorMap, `${asset.asset} keeps its image-derived color texture`);
        assert.ok(material.metalness !== null && material.metalness <= 0.1, `${asset.asset} stone/wood/wax/parchment is non-metallic`);
      }
    }
  }
}

async function frameSample(page) {
  if (!sampleFrames) return { skipped: true };
  return page.evaluate(async () => {
    const deltas = [];
    await new Promise(resolve => {
      let previous;
      let warmup = 20;
      function frame(now) {
        if (previous !== undefined && warmup <= 0) deltas.push(now - previous);
        previous = now;
        warmup--;
        if (deltas.length >= 120) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    const sorted = [...deltas].sort((a, b) => a - b);
    const percentile = fraction => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
    const meanMs = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
    return {
      frames: deltas.length,
      medianMs: percentile(0.5),
      p95Ms: percentile(0.95),
      maxMs: sorted.at(-1),
      meanMs,
      observedRafFps: 1000 / meanMs,
      note: 'rAF intervals after 20 warm-up frames; includes vsync/headless scheduling and is not isolated GPU render time.',
    };
  });
}

async function capture(page, label, snapshot, mode) {
  assertMockupMaterials(snapshot, mode);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: no horizontal overflow`);
  const screenshot = `${label}.png`;
  await page.screenshot({ path: join(out, screenshot), fullPage: true });
  report.cases.push({ name: label, screenshot, snapshot, frameTiming: await frameSample(page) });
}

async function armEntryPause(page) {
  // Native UI automation installed before the battle starts. A Playwright
  // locator click can wait on layout stability long enough for a short fight
  // to finish; this observer runs in the same DOM turn as the playable HUD.
  // It neither patches playback nor touches the Three/R3F scene.
  await page.evaluate(() => {
    let timer;
    const observer = new MutationObserver(check);
    function stop() {
      observer.disconnect();
      clearTimeout(timer);
    }
    function check() {
      const button = document.querySelector('button[aria-label="Kampf pausieren"]');
      if (!document.querySelector('.phase-battle') || document.querySelector('.battle-preparation') || !button || button.disabled || button.getClientRects().length === 0) return;
      stop();
      button.click();
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-label', 'disabled'] });
    timer = setTimeout(stop, 60_000);
    check();
  });
}

try {
  // Establish a valid save through the normal UI rather than duplicating the
  // game's save schema. It is then reused by both art modes and every viewport.
  const bootstrap = await browser.newContext({ viewport: profiles[0].viewport, deviceScaleFactor: 1 });
  await bootstrap.addInitScript(() => localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete'));
  activePage = await bootstrap.newPage();
  captureErrors(activePage, 'bootstrap');
  await activePage.goto(modeUrl('golden'), { waitUntil: 'domcontentloaded' });
  await activePage.getByRole('button', { name: /Spielen/ }).click();
  await activePage.getByRole('button', { name: 'Turnier beginnen', exact: true }).click();
  await activePage.locator('.shop-ribbon').waitFor();
  const fixture = await readRun(activePage);
  assert.equal(fixture.phase, 'shop');
  fixture.rngState = 0x4b4b2026;
  fixture.opponentVariant = 0;
  fixture.board = [
    { uid: 'qa-chili', itemId: 'chili', level: 1 },
    { uid: 'qa-shroom', itemId: 'slime-shroom', level: 1 },
    { uid: 'qa-shell', itemId: 'egg-shell', level: 1 },
    null,
    null,
  ];
  fixture.selectedSlot = null;
  fixture.pendingBattle = null;
  fixture.gold = 7;
  report.fixture = fixture;
  await bootstrap.close();

  for (const profile of profiles) {
    let baselinePurchasedRun;
    for (const mode of ['golden', 'mockup']) {
      activeLabel = `${mode}-${profile.name}`;
      console.log(`Environment QA: ${activeLabel}`);
      const context = await browser.newContext({
        viewport: profile.viewport,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        deviceScaleFactor: 1,
      });
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
      await waitScene(page, 1, mode);
      assert.deepEqual(await readRun(page), fixture, 'both modes begin from the identical valid save');

      await page.locator('.offer:not([disabled])').first().click();
      await page.waitForFunction(() => !document.querySelector('.purchase-feedback') && document.querySelector('.battle-button')?.disabled === false, undefined, { timeout: 20_000 });
      const purchased = await readRun(page);
      assert.ok(purchased.gold < fixture.gold, 'actual purchase deducts gold');
      assert.notDeepEqual(purchased.board, fixture.board, 'actual purchase updates inventory or merges an ingredient');
      if (mode === 'golden') baselinePurchasedRun = purchased;
      else assert.deepEqual(purchased, baselinePurchasedRun, 'purchase and resulting inventory remain identical across art modes');
      report.cases.push({ name: `purchase-${activeLabel}`, goldBefore: fixture.gold, goldAfter: purchased.gold, board: purchased.board });
      const workshop = await waitScene(page, 1, mode);
      const workshopPlayer = assertCharacter(workshop, 'brasskin', profile.variant);
      assert.ok(workshopPlayer.front[2] > 0.8, 'workshop face looks toward player');
      await capture(page, `workshop-${activeLabel}`, workshop, mode);

      for (const [round, enemy] of [[1, 'zischbert'], [2, 'moor-martha']]) {
        if (round === 2) {
          // Only the isolated test save is advanced. Every mode gets the same
          // representative three-ingredient board and deterministic opponent.
          await page.evaluate(({ key, snapshot }) => {
            localStorage.setItem(key, JSON.stringify(snapshot));
            location.reload();
          }, {
            key: runKey,
            snapshot: {
              ...purchased,
              phase: 'shop', round: 2, opponentVariant: 0, pendingBattle: null, selectedSlot: null,
              board: [
                { uid: 'qa-chili', itemId: 'chili', level: 2 },
                { uid: 'qa-shroom', itemId: 'slime-shroom', level: 2 },
                { uid: 'qa-shell', itemId: 'egg-shell', level: 1 },
                null, null,
              ],
            },
          });
          await page.getByRole('button', { name: /Fortsetzen/ }).click();
          await page.locator('.shop-ribbon').waitFor();
          await waitScene(page, 1, mode);
        }
        await armEntryPause(page);
        await page.locator('.battle-button').click();
        await page.locator('.battle-hud').waitFor({ timeout: 60_000 });
        await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).waitFor({ timeout: 60_000 });
        assert.equal(await page.locator('.battle-preparation').count(), 0, 'battle readiness gate completes before playable combat');
        const battle = await waitScene(page, 2, mode);
        const player = assertCharacter(battle, 'brasskin', profile.variant);
        const opponent = assertCharacter(battle, enemy, profile.variant);
        assert.ok(player.front[2] < -0.8, 'player presents its rear while facing the opponent');
        assert.ok(opponent.front[2] > 0.8, 'opponent faces the player');
        assert.ok(player.position[2] - opponent.position[2] > 7, 'at least seven units of readable VFX travel lane');
        await capture(page, `battle-${enemy}-${activeLabel}`, battle, mode);
        await page.getByRole('button', { name: '4×', exact: true }).click();
        await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).click();
        await page.locator('.result-panel').waitFor({ timeout: 60_000 });
        await page.getByRole('button', { name: 'Zurück zur Werkbank', exact: true }).click();
        await page.locator('.shop-ribbon').waitFor();
        assertCharacter(await waitScene(page, 1, mode), 'brasskin', profile.variant);
        report.cases.push({ name: `combat-result-and-return-${enemy}-${activeLabel}` });
      }
      await context.close();
    }
  }
  const renderedMockupIds = [...new Set(report.cases.flatMap(entry => entry.snapshot?.productionAssets ?? []).map(asset => asset.asset).filter(id => id.startsWith('mockup-')))];
  report.renderedMockupIds = renderedMockupIds;
  const newAssetKinds = [...new Set(renderedMockupIds.map(id => id.replace(/-(desktop|mobile)$/, '')))];
  report.renderedMockupKinds = newAssetKinds;
  assert.ok(newAssetKinds.length >= 10, `all ten supplied asset types appear across the real scenes: ${newAssetKinds.join(', ')}`);
  assert.deepEqual(report.errors, [], 'no missing assets or runtime errors');
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: join(out, `failure-${activeLabel}.png`), fullPage: true }).catch(() => {});
  }
  throw error;
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(`Mockup environment QA: ${report.cases.length} cases passed; ${profiles.length * 6} paired scene screenshots; no runtime errors.`);
