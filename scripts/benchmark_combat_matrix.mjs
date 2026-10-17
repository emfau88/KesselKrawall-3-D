import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installCombatProbe } from './combat_performance_probe.mjs';

// Serial, production-browser benchmark. Only isolated browser saves and the
// benchmark's React DevTools fixture hook are changed; combat uses native UI.
// Example smoke run (the full default is 60 launches / 240 measured fights):
// node scripts/benchmark_combat_matrix.mjs --url=http://127.0.0.1:5197/ --label=baseline --profiles=desktop --ingredients=polish --repeats=1 --out=outputs/first-combat-performance/matrix-pilot
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (key, fallback) => argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const flag = key => argv.includes(`--${key}`);
const split = value => value.split(',').filter(Boolean);
const count = Number(opt('repeats', '5'));
const activeMs = Number(opt('window-ms', opt('active-ms', '12000')));
const finishSpeed = Number(opt('finish-speed', '4'));
const mode = opt('mode', 'light');
const out = resolve(root, opt('out', 'outputs/first-combat-performance/matrix'));
const fixturePath = resolve(root, opt('fixture', 'docs/qa/ingredient-art-phase3a-polish/report.json'));
const fixtureDocument = JSON.parse(await readFile(fixturePath, 'utf8'));
const initialFixture = structuredClone(fixtureDocument.fixture ?? fixtureDocument);
const runKey = 'kessel-krawall-3d-run-v1';
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'portrait', viewport: { width: 390, height: 844 }, mobile: true },
  { name: 'landscape', viewport: { width: 844, height: 390 }, mobile: true },
].filter(p => split(opt('profiles', 'desktop,portrait,landscape')).includes(p.name));
const ingredients = split(opt('ingredients', 'phase3a,polish'));
const scenarioOrder = ['cold', 'warm-reload', 'second-moor', 'repeat-zischbert'];
const requestedScenarios = split(opt('scenarios', scenarioOrder.join(',')));
const scenarios = scenarioOrder.filter(name => requestedScenarios.includes(name));
const targetEntries = opt('url', '')
  ? [[opt('label', 'candidate'), opt('url', '')]]
  : split(opt('targets', 'baseline=http://127.0.0.1:5197/,fix=http://127.0.0.1:5198/')).map(entry => {
    const equals = entry.indexOf('=');
    assert.ok(equals > 0, `Target must be label=url: ${entry}`);
    return [entry.slice(0, equals), entry.slice(equals + 1)];
  });
assert.ok(Number.isInteger(count) && count > 0);
assert.ok(Number.isFinite(activeMs) && activeMs > 0);
assert.ok([1, 4].includes(finishSpeed), 'Finish speed must be native 1× or 4×, applied only after measurement');
assert.ok(['light', 'minimal', 'diagnostic'].includes(mode), 'Use light for headline comparisons; diagnostic is only for isolated debugging');
assert.ok(profiles.length > 0);
assert.ok(ingredients.length > 0 && ingredients.every(a => ['phase3a', 'polish'].includes(a)));
assert.ok(requestedScenarios.length > 0 && requestedScenarios.every(name => scenarioOrder.includes(name)), 'Unknown or empty benchmark scenario');
assert.equal(scenarios.length, requestedScenarios.length, 'Scenario names must not be duplicated');
assert.ok(scenarios.includes('cold'), 'Include cold as the cache/first-fight prerequisite for subsequent scenarios');
assert.ok(targetEntries.every(([label, url]) => /^[a-z0-9-]+$/i.test(label) && new URL(url).protocol.startsWith('http')));
assert.ok(initialFixture.phase === 'shop' && initialFixture.board[0]?.itemId === 'chili' && initialFixture.board[0]?.level === 1);
assert.ok(initialFixture.board[1]?.itemId === 'slime-shroom' && initialFixture.board[2]?.itemId === 'egg-shell');

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); }
catch { pw = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(homedir(), 'AppData/Local/ms-playwright');
await mkdir(out, { recursive: true });
const sha = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const summaryPath = join(out, 'summary.json');
const options = { count, activeMs, finishSpeed, mode, profiles, ingredients, scenarios, targetEntries, fixtureHash: sha(initialFixture) };
const expectedGroups = count * profiles.length * ingredients.length * targetEntries.length;
const expectedSamples = expectedGroups * scenarios.length;
const report = flag('resume') && existsSync(summaryPath)
  ? JSON.parse(await readFile(summaryPath, 'utf8'))
  : {
    schemaVersion: 1, startedAt: new Date().toISOString(), options, expectedGroups, expectedSamples,
    baselineCommit: '353d154524cb9490b3db07a46bcafc8fe17179e1',
    cacheDefinition: {
      cold: 'Fresh browser process, isolated context, empty HTTP cache, fresh JS and WebGL. GPU-driver/ANGLE caches are not forcibly reset.',
      warmReload: 'Same browser/context, reload with HTTP cache preserved; fresh JS and WebGL.',
      second: 'Moor-Martha after native result and workshop return; no reload, same renderer. Exact QA save restored in isolated React state.',
      repeat: 'Zischbert repeated after prior native fight(s) and workshop return; no reload, same renderer and identical Zischbert fixture. Selected scenarios identify whether Moor-Martha preceded it.',
    },
    measurement: 'Continuous rAF and Long Task observation before app startup. No dropped warm-up frames; active measurement at native 1×. Headless Chromium on desktop GPU, mobile viewport/touch emulation only. No CPU throttle.',
    groups: [], samples: [], deterministicDigests: {}, failures: [],
  };
if (flag('resume')) assert.deepEqual(report.options, options, 'Resume must use the exact same configuration and fixture');
async function checkpoint() {
  report.updatedAt = new Date().toISOString();
  await writeFile(summaryPath, JSON.stringify(report, null, 2));
}

function statistics(frames) {
  const values = frames.map(f => f.ms).filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = p => values.length ? values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)] : null;
  return {
    frames: values.length, p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99), maxMs: values.at(-1) ?? null,
    meanMs: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    above50: values.filter(v => v > 50).length, above100: values.filter(v => v > 100).length,
    above250: values.filter(v => v > 250).length, above1000: values.filter(v => v > 1000).length,
  };
}
function summarize(data, bounds) {
  // Include intervals crossing a phase boundary in the pipeline metric. Keeping
  // both endpoint phases avoids silently assigning a preparation stall to combat.
  const frames = data.frames.filter(f => f.t >= bounds.start && f.t - f.ms <= bounds.end);
  const combat = frames.filter(f => f.t >= bounds.ready && (f.phase === 'combat' || f.phaseStart === 'combat'));
  const strictCombat = combat.filter(f => f.phase === 'combat' && f.phaseStart === 'combat');
  const longTasks = data.longTasks.filter(t => t.t < bounds.end && t.t + t.ms >= bounds.start);
  const activeLongTasks = longTasks.filter(t => t.t + t.ms >= bounds.ready && t.t <= bounds.end);
  const readyFrame = frames.find(f => f.t >= bounds.ready && (f.phase === 'combat' || f.phaseStart === 'combat'));
  return {
    pipeline: statistics(frames), combat: statistics(combat), strictCombat: statistics(strictCombat),
    longTaskCount: longTasks.length, maxLongTaskMs: Math.max(0, ...longTasks.map(t => t.ms)),
    totalBlockingTimeMs: longTasks.reduce((sum, t) => sum + Math.max(0, t.ms - 50), 0),
    activeLongTaskCount: activeLongTasks.length, maxActiveLongTaskMs: Math.max(0, ...activeLongTasks.map(t => t.ms)),
    strictActiveLongTaskCount: activeLongTasks.filter(t => t.phase === 'combat').length,
    phaseBoundaryLongTasks: activeLongTasks.filter(t => t.t < bounds.ready),
    clickToReadyMs: bounds.ready - bounds.start,
    clickToFirstActiveRafMs: readyFrame ? readyFrame.t - bounds.start : null,
    activeObservationWallMs: bounds.end - bounds.ready,
    phaseBoundaryFrames: frames.filter(f => f.phaseStart !== undefined && f.phaseStart !== f.phase),
  };
}
function sliceData(data, start, end) {
  const byTime = key => (data[key] ?? []).filter(v => v.t >= start && v.t <= end);
  return {
    ...data,
    frames: data.frames.filter(v => v.t >= start && v.t - v.ms <= end),
    longTasks: data.longTasks.filter(v => v.t <= end && v.t + v.ms >= start),
    marks: byTime('marks'), renders: byTime('renders'), shadow: byTime('shadow'), glSlow: byTime('glSlow'),
    gpuTimes: byTime('gpuTimes'), programs: byTime('programs'),
    phases: (data.phases ?? []).filter((v, i, list) => v.t <= end && (v.t >= start || list[i + 1]?.t > start)),
  };
}
async function readRun(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), runKey); }
async function mark(page, name, detail) { return page.evaluate(({ name, detail }) => { window.__combatProbe.mark(name, detail); return performance.now(); }, { name, detail }); }
async function waitWorkshop(page) {
  await page.locator('.shop-ribbon').waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => {
    const probe = window.__combatProbe;
    if (!probe?.state()?.scene || probe.slots().length < 5) return false;
    const found = new Set();
    probe.state().scene.traverse(n => {
      if (n.userData.productionAsset) found.add(n.userData.productionAsset);
      // Authored characters have their own loader and tag the cloned GLB root.
      if (n.userData.characterAsset) found.add(n.userData.characterAsset);
    });
    return [...found].some(id => id.startsWith('character-brasskin') || id.startsWith('brasskin'))
      && [...found].filter(id => /ingredient-(?:(?:polish|phase3a)-)?(?:chili|slime-shroom|egg-shell)/.test(id)).length >= 3;
  }, undefined, { timeout: 90_000 });
  await page.waitForFunction(() => document.querySelector('.battle-button')?.disabled === false, undefined, { timeout: 60_000 });
}
async function nativeSlot(page, slot, profile) {
  const p = await page.evaluate(slot => window.__combatProbe.slots().find(s => s.slot === slot), slot);
  assert.ok(p && Number.isFinite(p.x) && Number.isFinite(p.y), `Slot ${slot} has a valid projection`);
  if (profile.mobile) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}
async function purchaseAndSwap(page, profile, label) {
  await mark(page, `${label}:purchase-start`);
  await page.locator('.offer:not([disabled])').first().click();
  await page.waitForFunction(key => {
    const run = JSON.parse(localStorage.getItem(key));
    return run?.board?.[0]?.level === 2 && !document.querySelector('.purchase-feedback') && document.querySelector('.battle-button')?.disabled === false;
  }, runKey, { timeout: 90_000 });
  await mark(page, `${label}:purchase-end`);
  const purchased = await readRun(page);
  assert.equal(purchased.board[0].itemId, 'chili');
  assert.equal(purchased.board[0].level, 2);
  assert.ok(purchased.gold < initialFixture.gold);
  await mark(page, `${label}:swap-start`);
  await nativeSlot(page, 0, profile);
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.selectedSlot === 0, runKey);
  await nativeSlot(page, 3, profile);
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.board?.[3]?.uid === 'qa-chili', runKey);
  await nativeSlot(page, 3, profile);
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.selectedSlot === 3, runKey);
  await nativeSlot(page, 0, profile);
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.board?.[0]?.uid === 'qa-chili', runKey);
  await mark(page, `${label}:swap-end`);
  const restored = await readRun(page);
  assert.deepEqual(restored.board, purchased.board, 'Native swap to empty slot and back restores the exact board');
  assert.equal(restored.selectedSlot, null);
  return restored;
}
async function armNativeSpeed(page, label) {
  await page.evaluate(label => {
    document.querySelector('.battle-button').addEventListener('click', () => window.__combatProbe.mark(`${label}:battle-click`), { once: true, capture: true });
    let timer;
    const observer = new MutationObserver(check);
    function stop() { observer.disconnect(); clearTimeout(timer); }
    function check() {
      if (!document.querySelector('.phase-battle') || document.querySelector('.battle-preparation')) return;
      const button = [...document.querySelectorAll('.battle-playback-controls button')].find(b => b.textContent.trim() === '1×');
      if (!button || button.disabled) return;
      stop(); button.click(); window.__combatProbe.mark(`${label}:native-1x`);
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });
    timer = setTimeout(stop, 90_000); check();
  }, label);
}
async function restoreFixture(page, fixture) {
  assert.ok(await page.locator('.shop-ribbon').count(), 'Restore occurs only after native workshop return');
  await page.evaluate(fixture => window.__combatProbe.restoreFixture(fixture), fixture);
  await page.waitForFunction(({ key, fixture }) => {
    const run = JSON.parse(localStorage.getItem(key));
    return JSON.stringify(run) === JSON.stringify(fixture);
  }, { key: runKey, fixture }, { timeout: 30_000 });
  await waitWorkshop(page);
}
async function finishAndReturn(page) {
  if (finishSpeed === 4 && !(await page.locator('.result-panel').count())) {
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('.battle-playback-controls button')].find(b => b.textContent.trim() === '4×');
      if (button) button.click();
    });
  }
  await page.locator('.result-panel').waitFor({ timeout: 120_000 });
  const completed = await readRun(page);
  await page.getByRole('button', { name: 'Zurück zur Werkbank', exact: true }).click();
  await waitWorkshop(page);
  return completed;
}

for (const profile of profiles) for (const art of ingredients) for (let repetition = 1; repetition <= count; repetition++) {
  // Alternating target order reduces a fixed baseline-first thermal/cache bias.
  const orderedTargets = repetition % 2 ? targetEntries : [...targetEntries].reverse();
  for (const [build, target] of orderedTargets) {
    const groupId = `${build}-${profile.name}-${art}-r${repetition}`;
    if (report.groups.some(g => g.id === groupId && g.completed)) { console.log(`Skip completed ${groupId}`); continue; }
    const group = { id: groupId, build, target, profile: profile.name, ingredients: art, repetition, startedAt: new Date().toISOString(), completed: false, samples: [] };
    const prior = report.groups.findIndex(g => g.id === groupId);
    if (prior >= 0) report.groups[prior] = group; else report.groups.push(group);
    report.samples = report.samples.filter(s => s.groupId !== groupId);
    await checkpoint();
    const browser = await pw.chromium.launch({ headless: true, args: [...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []), '--no-proxy-server'] });
    let page, context, fatal;
    try {
      const browserCdp = await browser.newBrowserCDPSession();
      group.environment = { browser: await browserCdp.send('Browser.getVersion'), system: await browserCdp.send('SystemInfo.getInfo'), viewport: profile.viewport, dpr: 1, mobileEmulation: profile.mobile, headless: true, cpuThrottlingRate: 1, probeMode: mode, sourceCommit: opt(`source-${build}`, build === 'baseline' ? report.baselineCommit : 'working-tree-candidate; bundle names and HTML SHA recorded below') };
      context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1, isMobile: profile.mobile, hasTouch: profile.mobile, serviceWorkers: 'block' });
      await context.addInitScript(installCombatProbe, { mode, experiment: 'none' });
      await context.addInitScript(({ key, fixture }) => {
        localStorage.setItem(key, JSON.stringify(fixture));
        localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete');
      }, { key: runKey, fixture: initialFixture });
      page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.clearBrowserCache');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const errors = [], network = [], servedFromCache = new Set();
      let navigation = 'cold';
      page.on('pageerror', e => errors.push({ navigation, type: 'pageerror', message: e.message }));
      page.on('console', message => { if (message.type() === 'error') errors.push({ navigation, type: 'console', message: message.text() }); });
      group.cancelledMediaRequests=[];
      page.on('requestfailed', request => {
        const event={ navigation, type: 'requestfailed', url: request.url(), message: request.failure()?.errorText };
        // The audio director intentionally cancels the previous music stream
        // when changing track or navigating. Keep evidence separate from failed
        // HTTP/asset loads; only this exact cancellation is expected.
        if(event.message==='net::ERR_ABORTED'&&/\/assets\/audio\/.*\.(ogg|mp3)(\?|$)/.test(event.url))group.cancelledMediaRequests.push(event);
        else errors.push(event);
      });
      cdp.on('Network.requestServedFromCache', e => servedFromCache.add(e.requestId));
      cdp.on('Network.responseReceived', e => network.push({ navigation, requestId: e.requestId, url: e.response.url, type: e.type, status: e.response.status, diskCache: Boolean(e.response.fromDiskCache), serviceWorker: Boolean(e.response.fromServiceWorker), timestamp: e.timestamp }));
      page.on('response', response => { if (response.status() >= 400) errors.push({ navigation, type: 'http', status: response.status(), url: response.url() }); });
      const url = new URL(target); url.searchParams.set('art', 'mockup'); url.searchParams.set('look', 'warm'); url.searchParams.set('ingredients', art);

      async function navigate(cache) {
        navigation = cache;
        const response = cache === 'cold' ? await page.goto(url.href, { waitUntil: 'domcontentloaded' }) : await page.reload({ waitUntil: 'domcontentloaded' });
        assert.ok(response?.ok(), 'Production navigation succeeds');
        const html = await response.text();
        group.bundleIdentity ??= { htmlSha256: sha(html), scripts: [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]) };
        assert.equal(sha(html), group.bundleIdentity.htmlSha256, 'Production build must not change during benchmark');
        await page.getByRole('button', { name: /Fortsetzen/ }).click();
        await waitWorkshop(page);
        await mark(page, `${cache}:workshop-usable`);
        assert.deepEqual(await readRun(page), initialFixture, 'Each new JS/WebGL session starts from the same save');
        return purchaseAndSwap(page, profile, cache);
      }

      async function fight({ name, enemy, fixture, navigationCost = false }) {
        const sampleId = `${groupId}-${name}`;
        const errorStart = errors.length;
        const before = await page.evaluate(() => window.__combatProbe.snapshot());
        const rendererBefore = before.renderer;
        await armNativeSpeed(page, sampleId);
        await mark(page, `${sampleId}:battle-click-intent`);
        await page.locator('.battle-button').click();
        const start = await page.evaluate(label => window.__combatProbe.snapshot().marks.find(m => m.name === `${label}:battle-click`)?.t, sampleId);
        assert.ok(Number.isFinite(start), 'Native click event timestamp was captured before the app handler');
        await page.waitForFunction(() => (document.querySelector('.phase-battle') && !document.querySelector('.battle-preparation')) || document.querySelector('.battle-preparation button')?.textContent?.includes('reduzierter'), undefined, { timeout: 120_000 });
        assert.equal(await page.locator('.battle-preparation').count(), 0, 'Preparation finishes without timeout/reduced-graphics fallback');
        const ready = await page.evaluate(({ start, label }) => {
          window.__combatProbe.mark(`${label}:active-observed`);
          return window.__combatProbe.snapshot().marks.find(m => m.name === 'combat' && m.t >= start)?.t ?? performance.now();
        }, { start, label: sampleId });
        const run = await readRun(page);
        assert.ok(run.pendingBattle, 'Native battle creates a deterministic combat result');
        const resultDigest = sha(run.pendingBattle);
        const deterministicKey = `${enemy}:${sha(fixture.board)}:${fixture.rngState}:${fixture.opponentVariant}`;
        if (report.deterministicDigests[deterministicKey]) assert.equal(resultDigest, report.deterministicDigests[deterministicKey], 'Deterministic combat result remains identical across cache, build and ingredient graphics');
        else report.deterministicDigests[deterministicKey] = resultDigest;
        // Browser-side deadline uses the active mark; any main-thread stall counts
        // against real wall time and stays present in the continuous raw intervals.
        await page.waitForFunction(({ ready, activeMs }) => Boolean(document.querySelector('.result-panel')) || performance.now() - ready >= activeMs, { ready, activeMs }, { timeout: activeMs + 120_000 });
        const end = await mark(page, `${sampleId}:measurement-end`);
        // Let the PerformanceObserver deliver a task that ended at this boundary.
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
        const data = await page.evaluate(() => window.__combatProbe.snapshot());
        assert.deepEqual(data.currentBuffer, { width: profile.viewport.width, height: profile.viewport.height, dpr: 1 }, 'Measured fight uses the exact requested drawing buffer');
        assert.deepEqual(before.currentBuffer, data.currentBuffer, 'Drawing buffer stays identical from workshop through measured combat');
        const sceneEvidence = await page.evaluate(() => {
          const cooldowns = [], assets = [], actors = [], characters = [];
          window.__combatProbe.state()?.scene.traverse(node => {
            if (node.userData.productionAsset) assets.push(node.userData.productionAsset);
            if (node.userData.characterAsset) characters.push(node.userData.characterAsset);
            if (node.userData.ingredientActor) actors.push({ ...node.userData, rotation: node.rotation.toArray(), scale: node.scale.toArray() });
            if (node.name === 'ingredient-cooldown') cooldowns.push({ ...node.userData, arc: node.children[1]?.geometry?.parameters?.arc });
          });
          return { assets, characters, actors, cooldowns };
        });
        for (const cooldown of sceneEvidence.cooldowns) assert.ok(Math.abs(cooldown.arc - Math.max(.02, Math.PI * 2 * cooldown.cooldownProgress)) < .0001, 'Actual cooldown ring matches unchanged progress');
        const resultVisibleAtMeasurementEnd = Boolean(await page.locator('.result-panel').count());
        const oneXMark = data.marks.find(m => m.name === `${sampleId}:native-1x`);
        assert.ok(oneXMark, 'Native 1× playback was selected at HUD entry');
        const metrics = summarize(data, { start, ready, end });
        const workshopMark = navigationCost ? data.marks.find(m => m.name === `${navigation}:workshop-usable`) : null;
        const purchaseStart = navigationCost ? data.marks.find(m => m.name === `${navigation}:purchase-start`)?.t : undefined;
        const purchaseEnd = navigationCost ? data.marks.find(m => m.name === `${navigation}:purchase-end`)?.t : undefined;
        const swapStart = navigationCost ? data.marks.find(m => m.name === `${navigation}:swap-start`)?.t : undefined;
        const swapEnd = navigationCost ? data.marks.find(m => m.name === `${navigation}:swap-end`)?.t : undefined;
        Object.assign(metrics, {
          navigationToWorkshopUsableMs: workshopMark?.t ?? null,
          navigationToFirstActiveMs: navigationCost ? ready : null,
          purchasePresentationMs: purchaseStart === undefined ? null : purchaseEnd - purchaseStart,
          nativeSwapRoundTripMs: swapStart === undefined ? null : swapEnd - swapStart,
          speedSelectionAfterReadyMs: oneXMark.t - ready,
        });
        const captureStart = navigationCost ? 0 : start;
        const record = {
          id: sampleId, groupId, build, target, profile, ingredients: art, repetition, name, enemy,
          cache: report.cacheDefinition[name === 'cold' ? 'cold' : name === 'warm-reload' ? 'warmReload' : name === 'second-moor' ? 'second' : 'repeat'],
          fixture, resultDigest, pendingBattle: run.pendingBattle, metrics, sceneEvidence,
          actorFirstActivations: Object.fromEntries(['chili', 'slime-shroom', 'egg-shell'].map(item => {
            const activation = data.marks.find(m => m.name === 'ingredient-activation' && m.t >= ready && m.t <= end && m.detail?.actors?.some(a => a.ingredientActor === item && a.active));
            return [item, activation ? { sinceReadyMs: activation.t - ready, ...activation } : null];
          })),
          bounds: { start, ready, end, captureStart }, rendererBefore, rendererAfter: data.renderer,
          resultVisibleAtMeasurementEnd, fullNativeResultReached: false,
          errors: errors.slice(errorStart), navigationErrors: navigationCost ? errors.filter(e => e.navigation === navigation) : [],
          network: navigationCost ? network.filter(n => n.navigation === navigation).map(n => ({ ...n, servedFromCache: servedFromCache.has(n.requestId) })) : [],
          environment: group.environment, bundleIdentity: group.bundleIdentity,
          data: sliceData(data, captureStart, end),
        };
        const samplePath = join(out, `${sampleId}.json`);
        await writeFile(samplePath, JSON.stringify(record, null, 2));
        const completed = await finishAndReturn(page);
        assert.equal(sha(completed.pendingBattle), resultDigest, 'Full native combat result agrees with the initial deterministic simulation');
        record.fullNativeResultReached = true;
        record.completionPlaybackSpeed = finishSpeed;
        record.errors = errors.slice(errorStart);
        record.completedPhase = completed.phase;
        assert.deepEqual(record.errors, [], 'No new runtime or asset errors during native battle');
        await writeFile(samplePath, JSON.stringify(record, null, 2));
        const compact = { id: sampleId, groupId, build, profile: profile.name, ingredients: art, repetition, name, enemy, metrics, resultDigest, fullNativeResultReached: true, errors: record.errors, file: `${sampleId}.json` };
        report.samples.push(compact); group.samples.push(sampleId);
        await checkpoint();
        console.log(JSON.stringify({ id: sampleId, maxFrameMs: metrics.combat.maxMs, maxTaskMs: metrics.maxActiveLongTaskMs, above250: metrics.combat.above250, clickToReadyMs: metrics.clickToReadyMs, clickToFirstActiveRafMs: metrics.clickToFirstActiveRafMs, resultDigest: resultDigest.slice(0, 12) }));
      }

      const purchasedCold = await navigate('cold');
      await fight({ name: 'cold', enemy: 'zischbert', fixture: purchasedCold, navigationCost: true });
      let currentPurchased = purchasedCold;
      if (scenarios.includes('warm-reload')) {
        const purchasedWarm = await navigate('warm-reload');
        assert.deepEqual(purchasedWarm, purchasedCold, 'Cold and warm sessions use an identical purchased and swapped state');
        await fight({ name: 'warm-reload', enemy: 'zischbert', fixture: purchasedWarm, navigationCost: true });
        currentPurchased = purchasedWarm;
      }
      if (scenarios.includes('second-moor') || scenarios.includes('repeat-zischbert')) {
        await page.evaluate(() => { window.__matrixRenderer = window.__combatProbe.state().gl; });
      }
      if (scenarios.includes('second-moor')) {
        const moorFixture = { ...structuredClone(currentPurchased), phase: 'shop', round: 2, selectedSlot: null, pendingBattle: null, opponentVariant: 0 };
        await restoreFixture(page, moorFixture);
        assert.ok(await page.evaluate(() => window.__matrixRenderer === window.__combatProbe.state().gl), 'Second fight retains the same WebGL renderer');
        await fight({ name: 'second-moor', enemy: 'moor-martha', fixture: moorFixture });
      }
      if (scenarios.includes('repeat-zischbert')) {
        await restoreFixture(page, currentPurchased);
        assert.ok(await page.evaluate(() => window.__matrixRenderer === window.__combatProbe.state().gl), 'Repeated opponent retains the same WebGL renderer');
        await fight({ name: 'repeat-zischbert', enemy: 'zischbert', fixture: currentPurchased });
      }
      group.allNavigationErrors = errors;
      assert.deepEqual(errors, [], 'No runtime, network or asset errors throughout session group');
      assert.equal(group.samples.length, scenarios.length, 'Every selected scenario has one complete native result');
      group.completed = true;
      group.completedAt = new Date().toISOString();
    } catch (error) {
      fatal = error;
      group.failure = { message: error.message, stack: error.stack, at: new Date().toISOString() };
      report.failures.push({ groupId, ...group.failure });
      if (page) {
        try { await writeFile(join(out, `${groupId}-failure-probe.json`), JSON.stringify(await page.evaluate(() => window.__combatProbe?.snapshot()), null, 2)); } catch {}
        try { await page.screenshot({ path: join(out, `${groupId}-failure.png`) }); } catch {}
      }
      console.error(`${groupId}: ${error.stack}`);
    } finally {
      await context?.close(); await browser.close(); await checkpoint();
    }
    if (fatal && !flag('continue-on-error')) throw fatal;
  }
}
report.completedAt = new Date().toISOString();
const configKeys = [...new Set(report.samples.map(s => `${s.build}/${s.profile}/${s.ingredients}/${s.name}`))];
report.aggregates = configKeys.map(configuration => {
  const samples = report.samples.filter(s => `${s.build}/${s.profile}/${s.ingredients}/${s.name}` === configuration);
  const range = values => ({ min: Math.min(...values), median: [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)], max: Math.max(...values) });
  return {
    configuration, measurements: samples.length,
    maxFrameMs: range(samples.map(s => s.metrics.combat.maxMs).filter(Number.isFinite)),
    clickToReadyMs: range(samples.map(s => s.metrics.clickToReadyMs)),
    above250Total: samples.reduce((sum, s) => sum + s.metrics.combat.above250, 0),
    maxActiveLongTaskMs: range(samples.map(s => s.metrics.maxActiveLongTaskMs)),
  };
});
await checkpoint();
console.log(`Completed ${report.groups.filter(g => g.completed).length}/${expectedGroups} groups / ${report.samples.length}/${expectedSamples} native fights. ${summaryPath}`);
if (report.groups.some(g => !g.completed) || report.groups.filter(g => g.completed).length !== expectedGroups || report.samples.length !== expectedSamples) process.exitCode = 1;
