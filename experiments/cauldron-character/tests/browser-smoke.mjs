import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const target = process.argv[2] ?? 'http://127.0.0.1:5194/';
const outputDirectory = resolve(repository, process.argv[3] ?? 'docs/qa/cauldron-character/screenshots');
if (!existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(homedir(), 'AppData/Local/ms-playwright');
}
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch {
  const bundled = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  playwright = require(process.env.PLAYWRIGHT_MODULE ?? bundled);
}
await mkdir(outputDirectory, { recursive: true });

const report = { target, generatedAt: new Date().toISOString(), renderer: 'automated Chromium; timings are not real-device performance evidence', cases: [], errors: [], screenshots: [] };
const browser = await playwright.chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-proxy-server'],
});
const readSnapshot = (page) => page.evaluate(() => window.__CAULDRON_REVIEW__.snapshot());
const waitReady = (page) => page.waitForFunction(() => window.__CAULDRON_REVIEW__?.snapshot().ready === true, undefined, { timeout: 45_000 });
const saveScreenshot = async (page, name) => {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(outputDirectory, name), fullPage: true });
  report.screenshots.push(name);
};
function recordErrors(page, expected = false) {
  page.on('pageerror', (error) => report.errors.push({ expected, type: 'page', message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') report.errors.push({ expected, type: 'console', message: message.text() });
  });
}
function assertReady(snapshot, variant) {
  assert.equal(snapshot.ready, true, 'all assets and shaders are ready');
  assert.equal(snapshot.error, null);
  assert.equal(snapshot.variant, variant);
  assert.equal(snapshot.liquidSurfaceCount, 1, 'one animated liquid surface');
  assert.ok(snapshot.triangleCount > 0 && snapshot.triangleCount <= (variant === 'desktop' ? 30_000 : 20_000));
  for (const name of ['Body', 'LiquidSurface', 'CharmGlow']) {
    assert.ok(snapshot.meshNames.includes(name), `${name} reached renderer`);
    assert.equal(snapshot.meshVisibility[name], true, `${name} is enabled`);
  }
  assert.ok(snapshot.frames > 0, 'renderer produced frames');
  assert.ok(snapshot.render.calls > 0 && snapshot.render.triangles > snapshot.triangleCount, 'character and environment rendered');
  assert.ok(snapshot.canvas.width > 250 && snapshot.canvas.height > 250, 'stage has a usable area');
  assert.ok(snapshot.faceMorphs?.Body, 'actual body morph weights are inspectable');
  for (const name of ['Blink_L', 'Blink_R', 'Smile', 'Surprise', 'Hurt', 'Look_L', 'Look_R']) {
    const weight = snapshot.faceMorphs.Body[name];
    assert.ok(Number.isFinite(weight) && weight >= 0 && weight <= 1, `${name} has a valid applied weight`);
  }
}
async function assertLayout(page, label) {
  const result = await page.evaluate(() => {
    const canvas = document.getElementById('scene').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('[data-state]')].map((button) => {
      const rect = button.getBoundingClientRect();
      return { state: button.dataset.state, x: rect.x, right: rect.right, width: rect.width, height: rect.height };
    });
    return { viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth, canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height }, buttons };
  });
  assert.ok(result.scrollWidth <= result.viewport.width + 1, `${label}: no horizontal overflow`);
  assert.ok(result.canvas.width <= result.viewport.width + 1 && result.canvas.x >= -1, `${label}: stage fits width`);
  for (const button of result.buttons) {
    assert.ok(button.x >= -1 && button.right <= result.viewport.width + 1, `${label}: ${button.state} stays in screen`);
    assert.ok(button.width >= 44 && button.height >= 44, `${label}: ${button.state} has a touch target`);
  }
  report.cases.push({ name: label, layout: result });
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  recordErrors(page);
  let releaseInitialLoad;
  const initialGate = new Promise((resolve) => { releaseInitialLoad = resolve; });
  await page.route('**/brasskin-desktop.glb', async (route) => { await initialGate; await route.continue(); });
  await page.goto(`${target}${target.includes('?') ? '&' : '?'}quality=desktop`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__CAULDRON_REVIEW__), undefined, { timeout: 15_000 });
  const loading = await readSnapshot(page);
  assert.equal(loading.ready, false, 'loading cannot become ready before the asset arrives');
  assert.equal(loading.meshNames.length, 0, 'loading has no placeholder duplicate');
  assert.equal(await page.locator('[data-state="attack"]').isDisabled(), true, 'attack blocked while asset pending');
  report.cases.push({ name: 'pending-asset-gate', snapshot: loading });
  releaseInitialLoad();
  await waitReady(page);
  await page.unroute('**/brasskin-desktop.glb');
  await page.locator('[data-view="front"]').click();
  const cases = [
    ['idle', 0.7, null], ['joy', 1.0, ['smile', 0.9]],
    ['charge', 2.2, ['glow', 2]], ['attack', 0.95, ['splash', 0.7]],
    ['hit', 1.0, ['hurt', 0.9]], ['defeat', 2.1, ['hurt', 0.8]],
  ];
  for (const [state, seconds, expectedPose] of cases) {
    await page.locator(`[data-state="${state}"]`).click();
    const snapshot = await page.evaluate((seconds) => window.__CAULDRON_REVIEW__.seek(seconds), seconds);
    assertReady(snapshot, 'desktop');
    assert.equal(snapshot.expression, state);
    assert.equal(await page.locator(`[data-state="${state}"]`).getAttribute('aria-pressed'), 'true');
    if (expectedPose) assert.ok(snapshot.pose[expectedPose[0]] >= expectedPose[1], `${state}: expression/energy actually advances`);
    if (state === 'joy') assert.ok(snapshot.faceMorphs.Body.Smile > 0.9, 'smile reaches actual mesh');
    if (state === 'attack') assert.ok(snapshot.faceMorphs.Body.Surprise > 0.6, 'attack reaches actual mouth deformation');
    if (state === 'hit' || state === 'defeat') assert.ok(snapshot.faceMorphs.Body.Hurt > 0.8, 'hurt reaches actual mesh');
    report.cases.push({ name: state, snapshot });
    await saveScreenshot(page, `${state}-desktop.png`);
  }
  await page.evaluate(() => { window.__CAULDRON_REVIEW__.selectState('idle'); window.__CAULDRON_REVIEW__.seek(3.34); });
  const blink = await readSnapshot(page);
  assert.ok(blink.pose.blink > 0.95, 'blink happens at its expected peak');
  assert.ok(blink.faceMorphs.Body.Blink_L > 0.95);
  assert.ok(blink.faceMorphs.Body.Blink_R > 0.95);
  report.cases.push({ name: 'blink', snapshot: blink });
  await saveScreenshot(page, 'blink-desktop.png');
  await page.locator('[data-view="rear"]').click();
  await saveScreenshot(page, 'rear-desktop.png');
  await page.locator('[data-view="three-quarter"]').click();
  await assertLayout(page, 'desktop');

  const geometryCounts = {};
  for (const variant of ['mobile', 'desktop', 'mobile']) {
    const snapshot = await page.evaluate((variant) => window.__CAULDRON_REVIEW__.selectAsset(variant), variant);
    assertReady(snapshot, variant);
    assert.equal(snapshot.meshNames.filter((name) => name === 'Body').length, 1, 'asset switching leaves one body');
    geometryCounts[variant] = snapshot.triangleCount;
    report.cases.push({ name: `switch-${variant}`, snapshot });
  }
  assert.ok(geometryCounts.mobile < geometryCounts.desktop * 0.85, 'mobile selects a reduced asset');
  for (const [width, height, label] of [[390, 844, 'mobile-portrait'], [844, 390, 'mobile-landscape']]) {
    await page.setViewportSize({ width, height });
    if (label === 'mobile-portrait') {
      await page.locator('#asset-quality').selectOption('auto');
      await waitReady(page);
      assert.equal((await readSnapshot(page)).variant, 'mobile', 'automatic quality chooses the mobile asset');
    }
    await page.evaluate(() => { window.__CAULDRON_REVIEW__.setView('three-quarter'); window.__CAULDRON_REVIEW__.selectState('joy'); window.__CAULDRON_REVIEW__.seek(1); });
    await page.waitForTimeout(100);
    assertReady(await readSnapshot(page), 'mobile');
    await assertLayout(page, label);
    await saveScreenshot(page, `${label}.png`);
  }
  await page.locator('#reduced-motion').check();
  await page.evaluate(() => { window.__CAULDRON_REVIEW__.selectState('joy'); window.__CAULDRON_REVIEW__.seek(1); });
  const reduced = await readSnapshot(page);
  assert.equal(reduced.reducedMotion, true);
  report.cases.push({ name: 'reduced-motion', snapshot: reduced });
  await context.close();

  const failureContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const failurePage = await failureContext.newPage();
  recordErrors(failurePage, true);
  await failurePage.route('**/brasskin-desktop.glb', (route) => route.abort('failed'));
  await failurePage.goto(`${target}${target.includes('?') ? '&' : '?'}quality=desktop`, { waitUntil: 'domcontentloaded' });
  await failurePage.locator('#retry-load').waitFor({ state: 'visible', timeout: 30_000 });
  const failure = await readSnapshot(failurePage);
  assert.equal(failure.ready, false, 'failure cannot become ready');
  assert.ok(failure.error, 'load error is available for diagnostics');
  assert.equal(failure.meshNames.length, 0, 'failed load leaves no ghost model');
  assert.equal(await failurePage.locator('#load-status').getAttribute('role'), 'alert', 'failure is accessible');
  for (const state of ['idle', 'joy', 'attack']) assert.equal(await failurePage.locator(`[data-state="${state}"]`).isDisabled(), true, 'state blocked until ready');
  await saveScreenshot(failurePage, 'load-error.png');
  await failurePage.unroute('**/brasskin-desktop.glb');
  await failurePage.locator('#retry-load').click();
  await waitReady(failurePage);
  assertReady(await readSnapshot(failurePage), 'desktop');
  assert.equal(await failurePage.locator('#retry-load').count(), 0, 'retry state clears after success');
  report.cases.push({ name: 'failure-and-retry', failure, recovered: await readSnapshot(failurePage) });
  await failureContext.close();
  assert.equal(report.errors.filter((entry) => !entry.expected).length, 0, 'no unexpected browser errors');
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack ?? String(error);
  process.exitCode = 1;
} finally {
  await writeFile(join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, screenshots: report.screenshots, failure: report.failure ?? null, report: join(outputDirectory, 'report.json') }, null, 2));
