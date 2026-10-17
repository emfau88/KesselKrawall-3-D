import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Functional smoke only. Inputs use native game controls; only the initial save
// belongs to this isolated context. No scene, simulation or playback-clock edits.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const option = (key, fallback) => process.argv.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const target = option('url', 'http://127.0.0.1:5198/');
const output = resolve(root, option('out', 'docs/qa/first-combat-performance/graphics-variants'));
const gateTimeout = Number(option('gate-timeout-ms', '45000'));
const resultTimeout = Number(option('result-timeout-ms', '90000'));
assert.ok(Number.isFinite(gateTimeout) && gateTimeout > 0);
assert.ok(Number.isFinite(resultTimeout) && resultTimeout > 0);
const screenshotGolden = process.argv.includes('--golden-screenshot');
const fixtureSource = 'docs/qa/ingredient-art-phase3a-polish/report.json';
const { fixture } = JSON.parse(await readFile(join(root, fixtureSource), 'utf8'));
assert.equal(fixture.phase, 'shop');
assert.equal(fixture.round, 1, 'The original fixture must select Zischbert');
assert.equal(fixture.pendingBattle, null);
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(homedir(), 'AppData/Local/ms-playwright');
const browserArgs = [...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []), '--no-proxy-server'];
const variants = [
  ...['reference', 'dark', 'magical', 'warm'].map(look => ({ id: `mockup-${look}`, art: 'mockup', look })),
  ...['golden', 'legacy', 'ecosystem'].map(art => ({ id: art, art })),
];
const report = {
  generatedAt: new Date().toISOString(), target, fixtureSource, fixtureHash: sha(fixture),
  scope: 'Native full Zischbert playback, preparation gate and deterministic results across seven supported graphics variants.',
  limitation: 'Functional browser smoke, not a performance benchmark. HTTP, browser and GPU-driver caches are not controlled; desktop browser only.',
  browserArgs, viewport: { width: 1440, height: 900 }, dpr: 1,
  cases: [], errors: [], passed: false,
};
await mkdir(output, { recursive: true });
const browser = await playwright.chromium.launch({ headless: true, args: browserArgs });
let expectedResultHash;
try {
  const session = await browser.newBrowserCDPSession();
  report.browser = await session.send('Browser.getVersion');
  report.system = await session.send('SystemInfo.getInfo');
  for (const variant of variants) {
    const entry = { ...variant, errors: [], cancelledMedia: [], loadedModels: [], passed: false };
    report.cases.push(entry);
    const context = await browser.newContext({ viewport: report.viewport, deviceScaleFactor: report.dpr });
    await context.addInitScript(saved => {
      localStorage.setItem('kessel-krawall-3d-run-v1', JSON.stringify(saved));
      localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete');
      window.__graphicsSmoke = { transitions: [] };
      document.addEventListener('DOMContentLoaded', () => {
        let previous;
        function observe() {
          const gate = document.querySelector('.battle-preparation');
          const phase = gate ? 'preparation' : document.querySelector('.result-panel') ? 'result'
            : document.querySelector('.phase-battle') ? 'battle' : document.querySelector('.shop-ribbon') ? 'shop' : 'menu';
          if (phase !== previous) {
            window.__graphicsSmoke.transitions.push({ phase, t: performance.now() });
            previous = phase;
          }
        }
        new MutationObserver(observe).observe(document.documentElement, {
          subtree: true, childList: true, attributes: true, attributeFilter: ['class'],
        });
        observe();
      });
    }, fixture);
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    page.on('pageerror', error => entry.errors.push({ type: 'pageerror', message: error.message }));
    page.on('console', message => {
      if (message.type() === 'error') entry.errors.push({ type: 'console', message: message.text() });
    });
    page.on('response', response => {
      if (response.status() >= 400) entry.errors.push({ type: 'http', status: response.status(), url: response.url() });
      if (/\.(?:glb|gltf)(?:\?|$)/i.test(response.url())) entry.loadedModels.push({ url: response.url(), status: response.status() });
    });
    page.on('requestfailed', request => {
      const failure = { url: request.url(), message: request.failure()?.errorText ?? 'request failed' };
      if (/\.(?:mp3|ogg|wav|m4a)(?:\?|$)/i.test(failure.url) && /ERR_ABORTED/.test(failure.message)) entry.cancelledMedia.push(failure);
      else entry.errors.push({ type: 'requestfailed', ...failure });
    });
    try {
      const url = new URL(target);
      url.search = '';
      url.searchParams.set('art', variant.art);
      if (variant.look) url.searchParams.set('look', variant.look);
      entry.url = url.href;
      await page.goto(entry.url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Fortsetzen/ }).click();
      await page.locator('.shop-ribbon').waitFor();
      await page.locator('.battle-button:not([disabled])').waitFor();
      await page.locator('.battle-button').click();
      await page.waitForFunction(() => {
        if (document.querySelector('.continue-reduced')) return true;
        return !document.querySelector('.battle-preparation') && Boolean(document.querySelector('.phase-battle, .result-panel'));
      }, null, { timeout: gateTimeout });
      assert.equal(await page.locator('.battle-preparation').count(), 0, 'Normal preparation must complete; reduced-graphics fallback is not a pass');
      const started = await page.evaluate(() => JSON.parse(localStorage.getItem('kessel-krawall-3d-run-v1')));
      assert.ok(started.pendingBattle, 'Native battle must create its deterministic result');
      entry.resultHash = sha(started.pendingBattle);
      if (expectedResultHash === undefined) expectedResultHash = entry.resultHash;
      assert.equal(entry.resultHash, expectedResultHash, 'Graphics variants must retain the same combat simulation');
      const fast = page.getByRole('button', { name: '4×', exact: true });
      await fast.click();
      await page.waitForFunction(() => [...document.querySelectorAll('.battle-playback-controls button')]
        .some(button => button.textContent.trim() === '4×' && button.getAttribute('aria-pressed') === 'true'));
      await page.getByRole('dialog', { name: 'Kampfergebnis', exact: true }).waitFor({ timeout: resultTimeout });
      assert.match(await page.locator('.result-opponent').innerText(), /Zischbert/i);
      assert.equal(await page.locator('.battle-preparation').count(), 0);
      const completed = await page.evaluate(() => ({
        run: JSON.parse(localStorage.getItem('kessel-krawall-3d-run-v1')),
        transitions: window.__graphicsSmoke.transitions,
        resultText: document.querySelector('.result-panel')?.textContent,
      }));
      assert.ok(['result', 'victory', 'gameover'].includes(completed.run.phase), 'Native playback reaches a terminal battle phase');
      assert.equal(sha(completed.run.pendingBattle), entry.resultHash, 'The complete result retains identical events and combat timings');
      assert.ok(completed.transitions.some(item => item.phase === 'preparation'), 'The preparation gate is observed');
      assert.ok(entry.loadedModels.some(item => /brasskin/.test(item.url)), 'Brasskin is loaded');
      assert.ok(entry.loadedModels.some(item => /zischbert/.test(item.url)), 'Zischbert is loaded');
      assert.ok(entry.loadedModels.every(item => item.status === 200), 'Every model request succeeds');
      assert.deepEqual(entry.errors, [], 'No page, WebGL, HTTP or unexpected request errors');
      Object.assign(entry, {
        preparationGate: true, nativeSpeed: 4, fullPlayback: true,
        transitions: completed.transitions, resultText: completed.resultText,
        winner: completed.run.pendingBattle.winner, duration: completed.run.pendingBattle.duration,
      });
      if (variant.art === 'golden' && screenshotGolden) {
        entry.screenshot = 'golden-zischbert-result.png';
        await page.screenshot({ path: join(output, entry.screenshot) });
      }
      entry.passed = true;
      console.log(JSON.stringify({ variant: variant.id, passed: true, resultHash: entry.resultHash }));
    } catch (error) {
      entry.failure = String(error);
      entry.body = await page.locator('body').innerText({ timeout: 3000 }).catch(() => 'Unavailable');
      report.errors.push({ variant: variant.id, message: entry.failure });
      console.error(JSON.stringify({ variant: variant.id, passed: false, failure: entry.failure }));
    } finally {
      await context.close();
      if (entry.passed && entry.errors.length > 0) {
        entry.passed = false;
        entry.failure = 'Runtime or request errors arrived during final context cleanup';
        report.errors.push({ variant: variant.id, message: entry.failure });
      }
      await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
    }
  }
  report.expectedResultHash = expectedResultHash;
  report.passed = report.cases.length === variants.length && report.cases.every(entry => entry.passed) && report.errors.length === 0;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
}
if (!report.passed) process.exitCode = 1;
