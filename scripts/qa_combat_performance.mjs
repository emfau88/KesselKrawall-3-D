import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { installCombatProbe } from './combat_performance_probe.mjs';

// Functional/visual QA, deliberately separate from headline timing benchmarks.
// Browser scene traversal and screenshots add overhead. No game code, clock,
// camera, lights, textures, simulation result or renderer setting is modified.
// Fixture replacement uses the existing isolated probe only after native return
// to the workshop; purchases, merges, swaps and battles use real UI handlers.
const opt = (key, fallback) => process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const out = resolve(opt('out', 'outputs/first-combat-performance/functional'));
const runKey = 'kessel-krawall-3d-run-v1';
const initial = JSON.parse(await readFile('docs/qa/ingredient-art-phase3a-polish/report.json', 'utf8')).fixture;
const targets = opt('targets', 'baseline=http://127.0.0.1:5197/,candidate=http://127.0.0.1:5198/').split(',').map(entry => {
  const i = entry.indexOf('='); assert.ok(i > 0, 'Targets use label=url');
  return { name: entry.slice(0, i), url: entry.slice(i + 1) };
});
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'landscape', viewport: { width: 844, height: 390 }, mobile: true },
  { name: 'portrait', viewport: { width: 390, height: 844 }, mobile: true },
].filter(p => opt('profiles', 'desktop,landscape,portrait').split(',').includes(p.name));
assert.ok(profiles.length && targets.length);
const require = createRequire(import.meta.url); let pw;
try { pw = require('playwright'); }
catch { pw = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(homedir(), 'AppData/Local/ms-playwright');
await mkdir(out, { recursive: true });
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report = {
  startedAt: new Date().toISOString(), baselineCommit: '353d154524cb9490b3db07a46bcafc8fe17179e1',
  options: { targets, profiles, art: 'mockup', look: 'warm', ingredients: 'polish', dpr: 1, playback: 'native 1×' },
  limits: [
    'This script verifies behavior and images, not acceptance frame-time benchmarks; scene traversal and screenshots add overhead.',
    'Mobile profiles emulate viewport, touch and DPR on the desktop GPU; they are not smartphone benchmarks.',
    'Native pause freezes combat playback, but existing ambient clock animations continue. Image comparisons report an explicit idle tolerance.',
    'Runtime observation can miss a short activation during a baseline stall; missed evidence is reported instead of inferred from a successful simulation.',
    'VFX evidence checks visible real projectile/impact light parents and geometry; it is not a pixel-perfect claim for every animation frame.',
    'The cancellation check holds only the KHR completion response false in this isolated QA browser, then restores it. This is a lifecycle test and is excluded from all performance conclusions.',
  ], runs: [], comparisons: [], failures: [], passed: false,
};
async function checkpoint() { await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); }
const readRun = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), runKey);

async function waitWorkshop(page, expected = ['chili', 'slime-shroom', 'egg-shell']) {
  await page.locator('.shop-ribbon').waitFor({ timeout: 120_000 });
  await page.waitForFunction(ids => {
    const p = window.__combatProbe, s = p?.state();
    if (!s?.scene || p.slots().length < 5 || document.querySelector('.battle-button')?.disabled) return false;
    const actors = p.actors().map(a => a.ingredientActor);
    return ids.every(id => actors.includes(id));
  }, expected, { timeout: 120_000 });
}
async function clickSlot(page, slot, profile) {
  const point = await page.evaluate(index => window.__combatProbe.slots().find(s => s.slot === index), slot);
  assert.ok(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  if (profile.mobile) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
}
async function restoreFixture(page, fixture) {
  assert.ok(await page.locator('.shop-ribbon').count(), 'Fixture restore only occurs in workshop');
  await page.evaluate(fixture => window.__combatProbe.restoreFixture(fixture), fixture);
  await page.waitForFunction(({ key, fixture }) => localStorage.getItem(key) === JSON.stringify(fixture), { key: runKey, fixture });
  await waitWorkshop(page, fixture.board.filter(Boolean).map(item => item.itemId));
  assert.deepEqual(await readRun(page), fixture, 'Isolated React-state fixture replacement persists the exact source-validated legal fixture');
}
async function purchaseAndSwap(page, profile) {
  await page.locator('.offer:not([disabled])').first().click();
  await page.locator('.purchase-feedback').waitFor({ timeout: 30_000 });
  assert.equal(await page.locator('.battle-button').isDisabled(), true, 'Pending purchase blocks battle');
  await page.waitForFunction(key => {
    const s = JSON.parse(localStorage.getItem(key));
    return s?.board?.[0]?.level === 2 && !document.querySelector('.purchase-feedback') && !document.querySelector('.battle-button')?.disabled;
  }, runKey, { timeout: 120_000 });
  const purchased = await readRun(page);
  assert.equal(purchased.board[0].itemId, 'chili'); assert.equal(purchased.board[0].level, 2);
  assert.ok(purchased.gold < initial.gold); assert.equal(purchased.offers[0].bought, true);
  for (const [slot, destination] of [[0, null], [3, 3], [3, null], [0, 0]]) {
    await clickSlot(page, slot, profile);
    if (destination === null) await page.waitForFunction(({ key, slot }) => JSON.parse(localStorage.getItem(key))?.selectedSlot === slot, { key: runKey, slot });
    else await page.waitForFunction(({ key, destination }) => JSON.parse(localStorage.getItem(key))?.board?.[destination]?.uid === 'qa-chili', { key: runKey, destination });
  }
  assert.deepEqual((await readRun(page)).board, purchased.board, 'Native swap preserves all instances and levels');
  return purchased;
}
async function armPause(page) {
  await page.evaluate(() => {
    let timer; const observer = new MutationObserver(check);
    function stop() { observer.disconnect(); clearTimeout(timer); }
    function check() {
      const button = document.querySelector('button[aria-label="Kampf pausieren"]');
      if (!document.querySelector('.phase-battle') || document.querySelector('.battle-preparation') || !button || button.disabled) return;
      stop();
      const one = [...document.querySelectorAll('.battle-playback-controls button')].find(b => b.textContent.trim() === '1×');
      one?.click(); button.click(); window.__combatProbe.mark('qa-native-entry-paused');
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-label'] });
    timer = setTimeout(stop, 120_000); check();
  });
}
async function snapshotScene(page) {
  return page.evaluate(() => {
    const state = window.__combatProbe.state(), scene = state.scene;
    scene.updateMatrixWorld(true);
    const assets = [], characters = [], actors = [], cooldowns = [], lights = [], materialFingerprints = new Set();
    scene.traverse(node => {
      if (node.userData.productionAsset) {
        const meshes = []; node.traverse(m => { if (m.isMesh) meshes.push({ vertices: m.geometry?.attributes?.position?.count, morphs: m.morphTargetInfluences ?? null, materials: (Array.isArray(m.material) ? m.material : [m.material]).map(a => ({ type: a.type, name: a.name, color: a.color?.getHexString(), roughness: a.roughness, metalness: a.metalness, map: a.map?.source?.data?.width ? [a.map.source.data.width, a.map.source.data.height] : null })) }); });
        assets.push({ id: node.userData.productionAsset, meshes });
      }
      if (node.userData.characterAsset) characters.push(node.userData.characterAsset);
      if (node.userData.ingredientActor) actors.push({ ...node.userData, rotation: node.rotation.toArray(), scale: node.scale.toArray() });
      if (node.name === 'ingredient-cooldown') cooldowns.push({ ...node.userData, arc: node.children[1]?.geometry?.parameters?.arc });
      // Existing liquid/charm emissiveIntensity is animated by the live ambient
      // clock even during native pause. Compare authored color/PBR parameters;
      // screenshot metrics retain the actual animated intensity differences.
      if (node.isMesh) for (const material of Array.isArray(node.material) ? node.material : [node.material]) materialFingerprints.add(JSON.stringify({ type: material.type, name: material.name, color: material.color?.getHexString(), roughness: material.roughness, metalness: material.metalness, emissive: material.emissive?.getHexString() }));
    });
    scene.traverseVisible(node => {
      if (!node.isPointLight || node.intensity <= 0) return;
      lights.push({ name: node.name, color: node.color.getHexString(), intensity: node.intensity, distance: node.distance, decay: node.decay, localPosition: node.position.toArray(), position: node.position.clone().setFromMatrixPosition(node.matrixWorld).toArray(), castShadow: node.castShadow, transient: Boolean(node.userData.combatTransientLight) });
    });
    lights.sort((a, b) => JSON.stringify([a.position, a.color, a.distance]).localeCompare(JSON.stringify([b.position, b.color, b.distance])));
    return {
      camera: { type: state.camera.type, position: state.camera.position.toArray(), quaternion: state.camera.quaternion.toArray(), projection: state.camera.projectionMatrix.toArray(), zoom: state.camera.zoom },
      assets: assets.sort((a, b) => a.id.localeCompare(b.id)), characters: characters.sort(), actors, cooldowns, lights,
      materials: [...materialFingerprints].sort(), hudClock: document.querySelector('.battle-clock')?.innerText,
      hudCooldowns: [...document.querySelectorAll('.combat-ingredient')].map(n => ({ classes: n.className, style: n.getAttribute('style') })),
      renderer: { memory: { ...state.gl.info.memory }, programs: state.gl.info.programs.length },
    };
  });
}
async function beginObservation(page, expected, events) {
  await page.evaluate(({ expected, events }) => {
    const observations = { expected, actors: {}, vfx: {}, cooldownAdvanced: false, invalidCooldowns: [], frames: 0, startedAt: performance.now(), endedAt: null };
    window.__combatQa = observations;
    function frame() {
      const state = window.__combatProbe.state(); observations.frames++;
      if (state?.scene) {
        const vfx = [];
        state.scene.traverseVisible(n => {
          const isProjectile = n.isPointLight && n.distance === 2.4 && Math.abs(n.intensity - 1.3) < .001;
          const isImpact = n.isPointLight && n.distance === 3.2 && Math.abs(n.intensity - 1.75) < .001;
          if (isProjectile || isImpact) {
            let meshes = 0; n.parent.traverseVisible(m => { if (m.isMesh) meshes++; });
            vfx.push({ kind: isProjectile ? 'projectile' : 'impact', meshes, color: n.color.getHexString(), position: n.parent.position.toArray() });
          }
        });
        state.scene.traverse(n => {
          if (n.name === 'ingredient-cooldown' && n.userData.side === 'player') {
            const p = n.userData.cooldownProgress, arc = n.children[1]?.geometry?.parameters?.arc;
            if (p > .02 && p < .98) observations.cooldownAdvanced = true;
            if (Math.abs(arc - Math.max(.02, Math.PI * 2 * p)) >= .0001 && observations.invalidCooldowns.length < 5) observations.invalidCooldowns.push({ p, arc });
          }
          if (!n.userData.ingredientActor || !n.userData.active) return;
          const event = events[n.userData.animationKey];
          if (!event || event.actor !== 'player' || !expected.includes(event.sourceItemId)) return;
          const id = event.sourceItemId;
          const motion = Math.max(Math.abs(n.rotation.x), Math.abs(n.rotation.z), ...n.scale.toArray().map(v => Math.abs(v - 1)));
          const entry = observations.actors[id] ??= { eventIndex: n.userData.animationKey, eventTimeMs: event.time, firstObservedAt: performance.now(), maxMotion: 0, frames: 0 };
          if (motion > entry.maxMotion) entry.transformAtMaxMotion = { rotation: n.rotation.toArray(), scale: n.scale.toArray() };
          entry.maxMotion = Math.max(entry.maxMotion, motion); entry.frames++;
          if (vfx.some(v => v.meshes > 0)) observations.vfx[id] ??= { eventIndex: n.userData.animationKey, eventTimeMs: event.time, observedAt: performance.now(), lights: vfx };
        });
      }
      if (document.querySelector('.result-panel')) { observations.endedAt = performance.now(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }, { expected, events });
}
async function combat(page, profile, label, fixture, enemy) {
  await armPause(page);
  const intent = await page.evaluate(() => performance.now());
  await page.locator('.battle-button').click();
  await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).waitFor({ timeout: 120_000 });
  assert.equal(await page.getByRole('button', { name: '1×', exact: true }).getAttribute('aria-pressed'), 'true', 'Native entry pause retains explicitly selected 1× playback');
  assert.equal(await page.locator('.battle-preparation').count(), 0, 'Preparation gate finishes before native pause is available');
  const ready = await page.evaluate(() => performance.now());
  const run = await readRun(page); assert.ok(run.pendingBattle);
  const pending = structuredClone(run.pendingBattle), expected = fixture.board.filter(Boolean).map(item => item.itemId);
  const scene = await snapshotScene(page);
  for (const item of expected) assert.ok(scene.actors.some(actor => actor.ingredientActor === item), `Decoded actor ${item} exists at ready`);
  if (fixture.campaignId === 'grand-tournament') for (const item of ['chili', 'slime-shroom', 'egg-shell']) assert.ok(scene.assets.some(a => a.id.includes(`ingredient-polish-${item}-`)), `Polished ${item} model is loaded`);
  assert.ok(scene.characters.some(id => id.includes('brasskin')), 'Actual Brasskin GLB is present');
  for (const c of scene.cooldowns) assert.ok(Math.abs(c.arc - Math.max(.02, Math.PI * 2 * c.cooldownProgress)) < .0001, 'Cooldown mesh matches progress');
  assert.ok(scene.cooldowns.filter(c => c.side === 'player').length >= expected.length);
  const filename = `${label}-${enemy}-paused.png`;
  await page.screenshot({ path: join(out, filename), fullPage: true });
  await beginObservation(page, expected, pending.events);
  const resumedAt = await page.evaluate(() => { document.querySelector('button[aria-label="Kampf fortsetzen"]').click(); return performance.now(); });
  await page.locator('.result-panel').waitFor({ timeout: Math.max(120_000, pending.duration * 3 + 60_000) });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const observation = await page.evaluate(() => window.__combatQa);
  const finishedAt = await page.evaluate(() => performance.now());
  const completed = await readRun(page);
  assert.deepEqual(completed.pendingBattle, pending, 'Full native playback preserves the precomputed deterministic result');
  const simulationActivations = Object.fromEntries(expected.map(id => [id, pending.events.filter(e => e.actor === 'player' && e.sourceItemId === id).map(e => ({ time: e.time, kind: e.kind, code: e.code }))]));
  for (const id of expected) assert.ok(simulationActivations[id].length > 0, `${id} actually activates in the legal deterministic combat`);
  assert.equal(observation.invalidCooldowns.length, 0, 'Live cooldown rings retain correct geometry');
  assert.equal(observation.cooldownAdvanced, true, 'Cooldowns progress during native playback');
  const missingAnimation = expected.filter(id => !observation.actors[id] || observation.actors[id].maxMotion < .001);
  const missingVfx = expected.filter(id => !observation.vfx[id]);
  const data = await page.evaluate(() => window.__combatProbe.snapshot());
  const result = {
    label, enemy, fixture, fixtureHash: sha(fixture), resultHash: sha(pending), pendingBattle: pending,
    pause: { nativeUi: true, preparationAbsent: true, clickIntentAt: intent, readyObservedAt: ready, clickToObservedReadyMs: ready - intent },
    playback: { nativeSpeed: 1, resumedAt, finishedAt, observedWallMs: finishedAt - resumedAt, simulationDurationMs: pending.duration },
    screenshot: filename, opponentHudText: await page.locator('.enemy-health strong').innerText().catch(() => null), scene, simulationActivations, observation, missingAnimation, missingVfx,
    runtimeEvidencePassed: missingAnimation.length === 0 && missingVfx.length === 0,
    note: 'Missed runtime samples are explicit; deterministic event existence alone is not used as proof of a visible animation.',
  };
  await writeFile(join(out, `${label}-${enemy}-raw.json`), JSON.stringify({ result, probe: data }, null, 2));
  await page.getByRole('button', { name: 'Zurück zur Werkbank', exact: true }).click();
  await waitWorkshop(page, expected);
  return result;
}
async function verifyPreparationCancellation(page, profile, label, fixture, controlledCandidate) {
  await restoreFixture(page, fixture);
  const before = await readRun(page);
  const held = await page.evaluate(controlledCandidate => {
    const gl = window.__combatProbe.state().gl.getContext();
    // The historical baseline has no async program gate, so a forced pending
    // completion would not be queried there. Only the candidate exercises it.
    const extension = controlledCandidate ? gl.getExtension('KHR_parallel_shader_compile') : null;
    const control = { gl, original: gl.getProgramParameter, enabled: true, queries: 0, supported: Boolean(extension) };
    window.__combatQaCompletionHold = control;
    if (extension) gl.getProgramParameter = function (program, parameter) {
      if (parameter === extension.COMPLETION_STATUS_KHR) {
        control.queries++;
        if (control.enabled) return false;
      }
      return control.original.call(this, program, parameter);
    };
    // Browsers without KHR cannot exercise the asynchronous poll. They still
    // exercise native cancellation at the first preparation DOM commit.
    if (!extension) {
      const observer = new MutationObserver(() => {
        const button = document.querySelector('.battle-preparation button');
        if (button) { observer.disconnect(); button.click(); }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    return { supported: Boolean(extension) };
  }, controlledCandidate);
  let queriesAtCancel = 0, queriesAfterCancel = 0;
  try {
    await page.locator('.battle-button').click();
    if (held.supported) {
      await page.locator('.battle-preparation').waitFor({ timeout: 120_000 });
      await page.waitForFunction(() => window.__combatQaCompletionHold.queries > 0, undefined, { timeout: 120_000 });
      queriesAtCancel = await page.evaluate(() => window.__combatQaCompletionHold.queries);
      assert.ok(queriesAtCancel > 0, 'Controlled test reaches the actual asynchronous KHR completion poll');
      assert.equal(await page.locator('.battle-preparation').count(), 1, 'Gate stays visible while controlled completion is outstanding');
      await page.locator('.battle-preparation').getByRole('button', { name: 'Zurück zur Werkbank', exact: true }).click();
    }
    await page.locator('.battle-preparation').waitFor({ state: 'detached', timeout: 30_000 });
    await waitWorkshop(page, fixture.board.filter(Boolean).map(item => item.itemId));
    const atReturn = await page.evaluate(() => window.__combatQaCompletionHold.queries);
    // Give a mistakenly uncancelled ten-ms timer several chances to fire.
    await page.waitForTimeout(100);
    queriesAfterCancel = await page.evaluate(() => window.__combatQaCompletionHold.queries);
    assert.equal(queriesAfterCancel, atReturn, 'No completion polling survives native cancellation and scene disposal');
    assert.deepEqual(await readRun(page), before, 'Cancellation preserves the exact workshop inventory, RNG, gold and phase');
  } finally {
    await page.evaluate(() => {
      const control = window.__combatQaCompletionHold;
      if (control) { control.enabled = false; control.gl.getProgramParameter = control.original; }
    });
  }
  // This retry now uses the real restored GL API and the actual native controls.
  const retry = await combat(page, profile, `${label}-after-cancel`, fixture, 'zischbert');
  return {
    passed: true, controlledQaOnly: controlledCandidate, includedInPerformanceMetrics: false,
    controlledCandidate, khrCompletionHoldAvailable: held.supported, pendingPollCancellationTested: held.supported,
    queriesAtCancel, queriesAfterCancel, exactWorkshopPreserved: true, successfulNativeRetry: true, retry,
  };
}
async function comparePixels(page, beforePath, afterPath) {
  const before = (await readFile(beforePath)).toString('base64'), after = (await readFile(afterPath)).toString('base64');
  return page.evaluate(async ({ before, after }) => {
    async function pixels(base64) {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
      return { width: image.width, height: image.height, data: ctx.getImageData(0, 0, image.width, image.height).data };
    }
    const a = await pixels(before), b = await pixels(after);
    if (a.width !== b.width || a.height !== b.height) return { sameDimensions: false, before: [a.width, a.height], after: [b.width, b.height] };
    let sum = 0, strong = 0, different = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      const channels = [0, 1, 2].map(c => Math.abs(a.data[i + c] - b.data[i + c]));
      sum += channels.reduce((a, b) => a + b, 0);
      if (Math.max(...channels) > 40) strong++;
      if (Math.max(...channels) > 8) different++;
    }
    const count = a.width * a.height, mean = sum / count / 3, fraction = strong / count;
    return { sameDimensions: true, size: [a.width, a.height], meanAbsoluteChannelError255: mean, fractionPixelsDeltaAbove8: different / count, fractionPixelsDeltaAbove40: fraction,
      idleTolerance: { maxMeanChannelError: 14, maxStrongDifferenceFraction: .15 }, withinIdleTolerance: mean <= 14 && fraction <= .15 };
  }, { before, after });
}

const browser = await pw.chromium.launch({ headless: true, args: [...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []), '--no-proxy-server'] });
try {
  const browserCdp = await browser.newBrowserCDPSession();
  report.environment = { browser: await browserCdp.send('Browser.getVersion'), system: await browserCdp.send('SystemInfo.getInfo') };
  for (const profile of profiles) for (const target of targets) {
    const label = `${target.name}-${profile.name}`, entry = { label, target, profile, errors: [], cancelledMediaRequests: [], battles: [] };
    report.runs.push(entry); await checkpoint();
    const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1, isMobile: profile.mobile, hasTouch: profile.mobile, serviceWorkers: 'block' });
    try {
      await context.addInitScript(installCombatProbe, { mode: 'light', experiment: 'none' });
      await context.addInitScript(({ key, fixture }) => { localStorage.setItem(key, JSON.stringify(fixture)); localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete'); }, { key: runKey, fixture: initial });
      const page = await context.newPage();
      page.on('pageerror', e => entry.errors.push({ type: 'pageerror', message: e.message }));
      page.on('console', e => { if (e.type() === 'error') entry.errors.push({ type: 'console', message: e.text() }); });
      page.on('requestfailed', r => {
        const event = { type: 'requestfailed', url: r.url(), message: r.failure()?.errorText };
        // The audio director intentionally stops streamed tracks on transitions.
        // Exclude only that exact cancellation signature; HTTP errors and every
        // other failed asset request remain failures.
        if (event.message === 'net::ERR_ABORTED' && /\/assets\/audio\/.*\.(ogg|mp3)(\?|$)/.test(event.url)) entry.cancelledMediaRequests.push(event);
        else entry.errors.push(event);
      });
      page.on('response', r => { if (r.status() >= 400) entry.errors.push({ type: 'http', status: r.status(), url: r.url() }); });
      const url = new URL(target.url); url.search = process.argv.includes('--default') ? '' : 'art=mockup&look=warm&ingredients=polish';
      await page.goto(url.href, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Fortsetzen/ }).click(); await waitWorkshop(page);
      assert.deepEqual(await readRun(page), initial);
      const purchased = await purchaseAndSwap(page, profile);
      entry.purchaseMergeSwap = { passed: true, fixture: purchased };
      entry.workshop = await snapshotScene(page);
      entry.workshopScreenshot = `${label}-workshop.png`;
      await page.screenshot({ path: join(out, entry.workshopScreenshot), fullPage: true });
      entry.battles.push(await combat(page, profile, label, purchased, 'zischbert')); await checkpoint();
      const martha = { ...purchased, phase: 'shop', round: 2, opponentVariant: 0, pendingBattle: null, selectedSlot: null,
        board: [{ uid: 'qa-chili', itemId: 'chili', level: 2 }, { uid: 'qa-shroom', itemId: 'slime-shroom', level: 2 }, { uid: 'qa-shell', itemId: 'egg-shell', level: 1 }, null, null] };
      await restoreFixture(page, martha);
      entry.battles.push(await combat(page, profile, label, martha, 'moor-martha')); await checkpoint();
      // Campaign II explicitly permits frost + echo + one selected legacy family.
      // These are unmodified legal items, not extra cross-campaign ingredients.
      const frost = { ...initial, campaignId: 'frostbound-vault', activeFamilies: ['frost', 'echo', 'guard'], gold: 12,
        board: ['ice-bell', 'echo-bell', 'egg-shell'].map((itemId, i) => ({ uid: `qa-frost-${i}`, itemId, level: 1 })).concat([null, null]),
        offers: ['ice-bell', 'echo-bell', 'egg-shell'].map((itemId, i) => ({ uid: `qa-frost-offer-${i}`, itemId, bought: false })) };
      if (!process.argv.includes('--skip-frost')) {
        await restoreFixture(page, frost);
        entry.battles.push(await combat(page, profile, label, frost, 'reif-rudi'));
      }
      entry.preparationCancellation = await verifyPreparationCancellation(page, profile, label, purchased, !target.name.includes('baseline'));
      entry.probe = await page.evaluate(() => window.__combatProbe.snapshot());
      assert.deepEqual(entry.errors, [], 'No runtime errors, failed requests or missing assets');
      entry.passed = true; console.log(JSON.stringify({ label, passed: true, battles: entry.battles.map(b => ({ enemy: b.enemy, digest: b.resultHash, missingAnimation: b.missingAnimation, missingVfx: b.missingVfx })) }));
    } catch (error) {
      entry.passed = false; entry.failure = String(error.stack ?? error); report.failures.push({ label, error: entry.failure });
      console.error(`${label}: ${error.message}`);
    } finally { await checkpoint(); await context.close(); }
  }
  const comparisonContext = await browser.newContext(); const comparisonPage = await comparisonContext.newPage();
  for (const profile of profiles) {
    const entries = report.runs.filter(r => r.profile.name === profile.name && r.passed);
    if (entries.length < 2) continue;
    const [baseline, ...candidates] = entries;
    for (const candidate of candidates) {
      const scenes = [['workshop', baseline.workshop, candidate.workshop, baseline.workshopScreenshot, candidate.workshopScreenshot],
        ...baseline.battles.flatMap(b => { const c = candidate.battles.find(c => c.enemy === b.enemy); return c ? [[b.enemy, b.scene, c.scene, b.screenshot, c.screenshot]] : []; })];
      for (const [name, before, after, beforeImage, afterImage] of scenes) {
        assert.deepEqual(after.camera, before.camera, `${name}: camera is exactly preserved`);
        assert.deepEqual(after.assets, before.assets, `${name}: authored model, material and morph state is exactly preserved`);
        assert.deepEqual(after.materials, before.materials, `${name}: authored material values are preserved`);
        assert.deepEqual(after.characters, before.characters, `${name}: character models are preserved`);
        const lightKey = l => JSON.stringify([l.position.map(v => Math.round(v * 1000) / 1000), l.color, l.distance, l.decay, l.castShadow]);
        const a = before.lights.map(lightKey).sort(), b = after.lights.map(lightKey).sort();
        const lightGeometryMatches = JSON.stringify(a) === JSON.stringify(b);
        const lightIntensityDifferences = before.lights.map(l => { const other = after.lights.find(o => lightKey(o) === lightKey(l)); return other ? Math.abs(other.intensity - l.intensity) : null; });
        const remaining = [...after.lights];
        const lightMatches = before.lights.map(light => {
          const matches = remaining.map((other, index) => ({ other, index,
            delta: Math.hypot(...other.position.map((v, i) => v - light.position[i])) }))
            .filter(({ other }) => other.color === light.color && other.distance === light.distance && other.decay === light.decay && other.castShadow === light.castShadow)
            .sort((a, b) => a.delta - b.delta);
          const match = matches[0];
          if (!match) return { matched: false, before: light };
          remaining.splice(match.index, 1);
          return { matched: true, worldPositionDelta: match.delta, intensityDelta: Math.abs(light.intensity - match.other.intensity), localPositionExact: JSON.stringify(light.localPosition) === JSON.stringify(match.other.localPosition) };
        });
        const pixel = await comparePixels(comparisonPage, join(out, beforeImage), join(out, afterImage));
        report.comparisons.push({ profile: profile.name, scene: name, before: baseline.label, after: candidate.label, cameraExact: true, assetMaterialsExact: true,
          nonzeroLightGeometryMatches: lightGeometryMatches, lightIntensityDifferences,
          nonzeroLightIdleComparison: { matches: lightMatches, unmatchedAfter: remaining, worldPositionTolerance: .06, intensityTolerance: .25,
            passed: remaining.length === 0 && lightMatches.every(m => m.matched && m.localPositionExact && m.worldPositionDelta <= .06 && m.intensityDelta <= .25) },
          pixel, images: [beforeImage, afterImage] });
      }
      for (const b of baseline.battles) {
        const c = candidate.battles.find(c => c.enemy === b.enemy); if (c) assert.equal(c.resultHash, b.resultHash, `${b.enemy}: deterministic result/timings match baseline`);
      }
    }
  }
  await comparisonContext.close();
  const candidates = report.runs.filter(r => !r.target.name.includes('baseline'));
  report.runtimeEvidenceComplete = candidates.length > 0 && candidates.every(r => r.passed && r.battles.every(b => b.runtimeEvidencePassed)
    && r.preparationCancellation?.successfulNativeRetry && r.preparationCancellation.retry.runtimeEvidencePassed);
  // Baseline stalls may prevent observing a short animation. Keep those gaps
  // explicit without treating them as a new native functional regression.
  report.baselineObservationGaps = report.runs.filter(r => r.target.name.includes('baseline')).flatMap(r => r.battles
    .filter(b => !b.runtimeEvidencePassed).map(b => ({ label: r.label, enemy: b.enemy, missingAnimation: b.missingAnimation, missingVfx: b.missingVfx })));
  report.visualComparisonsPassed = report.comparisons.length > 0
    ? report.comparisons.every(c => c.cameraExact && c.assetMaterialsExact && c.nonzeroLightIdleComparison.passed && c.pixel.withinIdleTolerance)
    : null;
  const candidateEvidencePassed = candidates.length === 0 || report.runtimeEvidenceComplete;
  const pairedVisualPassed = targets.length < 2 || (report.comparisons.length > 0 && report.visualComparisonsPassed);
  report.passed = report.failures.length === 0 && candidateEvidencePassed && pairedVisualPassed;
} catch (error) { report.failures.push({ stage: 'comparison', error: String(error.stack ?? error) }); }
finally { report.finishedAt = new Date().toISOString(); await checkpoint(); await browser.close(); }
console.log(JSON.stringify({ passed: report.passed, runtimeEvidenceComplete: report.runtimeEvidenceComplete, visualComparisonsPassed: report.visualComparisonsPassed, runs: report.runs.length, comparisons: report.comparisons.length, failures: report.failures.length, report: join(out, 'report.json') }));
if (!report.passed) process.exitCode = 1;
