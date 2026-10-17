import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { installCombatProbe } from './combat_performance_probe.mjs';
import { installWorkshopProbe } from './workshop_performance_probe.mjs';

const opt = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const trace = process.argv.includes('--trace'), profile = opt('profile', 'desktop');
const out = resolve(opt('out', 'outputs/workshop-purchase-performance/diagnostic'));
const url = opt('url', 'http://127.0.0.1:5201/');
const mode = opt('mode', trace ? 'diagnostic' : 'light');
const repeats = Number(opt('repeats', '1'));
const viewport = profile === 'desktop' ? { width: 1440, height: 900 } : profile === 'portrait' ? { width: 390, height: 844 } : { width: 844, height: 390 };
const source = JSON.parse(await readFile('docs/qa/ingredient-art-phase3a-polish/report.json', 'utf8')).fixture;
const initial = { ...source, gold: 40 };
const key = 'kessel-krawall-3d-run-v1';
const require = createRequire(import.meta.url); let pw;
try { pw = require('playwright'); } catch { pw = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(homedir(), 'AppData/Local/ms-playwright');
await mkdir(out, { recursive: true });
const report = { baseCommit: '0456d1ff338de797102aac6d4f6c8664a23f22c2', url, viewport, dpr: 1, profile, mode, trace, runs: [] };
for (let repetition = 1; repetition <= repeats; repetition++) {
  const browser = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--no-proxy-server'] });
  const bc = await browser.newBrowserCDPSession();
  report.environment ??= { browser: await bc.send('Browser.getVersion'), system: await bc.send('SystemInfo.getInfo') };
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: profile !== 'desktop', hasTouch: profile !== 'desktop', serviceWorkers: 'block' });
  await context.addInitScript(installCombatProbe, { mode, gpuPhases: ['workshop'] });
  await context.addInitScript(installWorkshopProbe, { constantLights: Number(opt('constant-lights', '0')) });
  await context.addInitScript(({ fixture, key }) => { localStorage.setItem(key, JSON.stringify(fixture)); localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete'); }, { fixture: initial, key });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  const errors = [], cancelledAudio = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => { const e = { url: r.url(), error: r.failure()?.errorText }; if (e.error === 'net::ERR_ABORTED' && /\/assets\/audio\//.test(e.url)) cancelledAudio.push(e); else errors.push(e); });
  await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache');
  let traced = false;
  const mark = (name, detail) => page.evaluate(({ name, detail }) => { window.__combatProbe.mark(name, detail); return performance.now(); }, { name, detail });
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const idle = () => page.waitForFunction(() => document.querySelector('.shop-ribbon') && !document.querySelector('.purchase-feedback') && !document.querySelector('.battle-button')?.disabled, null, { timeout: 90000 });
  async function stableScene() {
    await page.waitForFunction(() => {
      const p = window.__combatProbe, s = p?.state();
      if (!s || p.slots().length < 5) return false;
      let char = false, items = new Set();
      s.scene.traverse(n => { if (n.userData.characterAsset?.startsWith('brasskin')) char = true; if (n.userData.productionAsset?.startsWith('ingredient-polish-')) items.add(n.userData.productionAsset); });
      return char && ['chili', 'slime-shroom', 'egg-shell'].every(id => [...items].some(asset => asset.startsWith(`ingredient-polish-${id}-`)));
    }, null, { timeout: 90000 });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  async function buy(index, name) {
    const before = await read();
    await page.locator('.offer').nth(index).evaluate((el, name) => el.addEventListener('click', () => window.__combatProbe.mark(`${name}:click`), { once: true, capture: true }), name);
    await page.locator('.offer').nth(index).click();
    await page.waitForFunction(() => window.__workshopProbe.data.purchases.at(-1)?.purchase, null, { timeout: 30000 });
    await idle(); await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
    await mark(`${name}:ready`);
    const after = await read();
    assert.ok(after.gold < before.gold && after.offers[index].bought);
    return { name, before, after };
  }
  try {
    for (const cache of ['cold', ...(process.argv.includes('--cold-only') ? [] : ['warm'])]) {
      const label = `${opt('label', 'baseline')}-${profile}-r${repetition}-${cache}`;
      if (trace) {
        await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
        await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8,blink.user_timing,toplevel,gpu,disabled-by-default-v8.cpu_profiler', transferMode: 'ReturnAsStream' }); traced = true;
      }
      if (cache === 'cold') await page.goto(`${url}?art=mockup&look=warm`, { waitUntil: 'domcontentloaded' }); else await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Fortsetzen/ }).waitFor(); await mark('menu-dom');
      await stableScene(); await mark('menu-scene-ready');
      await mark('continue-intent');
      await page.getByRole('button', { name: /Fortsetzen/ }).evaluate(el => el.addEventListener('click', () => window.__combatProbe.mark('continue-click'), { once: true, capture: true }));
      await page.getByRole('button', { name: /Fortsetzen/ }).click(); await idle(); await stableScene(); await mark('workshop-ready');
      const drawingBufferAtReady = await page.evaluate(() => window.__combatProbe.snapshot().currentBuffer);
      const actions = [];
      actions.push(await buy(0, 'merge-first'));
      actions.push(await buy(1, 'merge-repeat'));
      actions.push(await buy(2, 'merge-third'));
      const cascade = { ...initial, board: [{ uid: 'cascade-a', itemId: 'chili', level: 1 }, { uid: 'cascade-b', itemId: 'chili', level: 2 }, { uid: 'cascade-shroom', itemId: 'slime-shroom', level: 1 }, null, null] };
      for (const name of ['cascade-first', 'cascade-repeat']) {
        await mark(`${name}:fixture-start`);
        await page.evaluate(f => window.__combatProbe.restoreFixture(f), cascade); await idle(); await mark(`${name}:fixture-ready`);
        actions.push(await buy(0, name));
        assert.equal((await read()).board.find(i => i?.itemId === 'chili')?.level, 3);
      }
      const plain = { ...initial, board: [null, ...initial.board.slice(1)] };
      await page.evaluate(f => window.__combatProbe.restoreFixture(f), plain); await idle();
      actions.push(await buy(0, 'purchase-empty'));
      const beforeSwap = (await read()).board;
      for (const slot of [0, 1, 1, 0]) {
        await mark(`slot-${slot}:intent`);
        const point = await page.evaluate(i => window.__combatProbe.slots().find(s => s.slot === i), slot);
        if (profile === 'desktop') await page.mouse.click(point.x, point.y); else await page.touchscreen.tap(point.x, point.y);
        await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      }
      await mark('swap-complete');
      assert.deepEqual((await read()).board, beforeSwap, 'Native occupied-slot swap roundtrip preserves all instances');
      await mark('idle-start');
      await page.waitForTimeout(2000);
      await mark('idle-end');
      const data = await page.evaluate(() => window.__combatProbe.snapshot());
      const workshop = await page.evaluate(() => window.__workshopProbe.data);
      const record = { label, errors, cancelledAudio, viewport, drawingBufferAtReady, profile, dpr: 1, cache, actions, data, workshop };
      await writeFile(join(out, `${label}.json`), JSON.stringify(record, null, 2));
      if (trace) {
        const { profile } = await cdp.send('Profiler.stop'); await writeFile(join(out, `${label}.cpuprofile`), JSON.stringify(profile));
        const done = new Promise(r => cdp.once('Tracing.tracingComplete', r)); await cdp.send('Tracing.end'); const { stream } = await done; const chunks = [];
        for (;;) { const p = await cdp.send('IO.read', { handle: stream }); chunks.push(Buffer.from(p.data, p.base64Encoded ? 'base64' : 'utf8')); if (p.eof) break; }
        await cdp.send('IO.close', { handle: stream }); await writeFile(join(out, `${label}.trace.json.gz`), gzipSync(Buffer.concat(chunks))); traced = false;
      }
      const starts = data.marks.filter(m => m.name.endsWith(':click'));
      const timings = starts.map(m => ({ name: m.name, ms: data.marks.find(x => x.name === m.name.replace(':click', ':ready'))?.t - m.t }));
      report.runs.push({ label, timings, errors, file: `${label}.json` });
      await writeFile(join(out, 'summary.json'), JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ label, timings, worstTask: Math.max(0, ...data.longTasks.map(t => t.ms)), slowGl: data.glSlow.sort((a, b) => b.ms - a.ms).slice(0, 3), errors }));
      assert.deepEqual(data.currentBuffer, drawingBufferAtReady, 'No unrecorded drawing-buffer change during interactions');
      assert.deepEqual(errors, []);
    }
  } finally {
    if (traced) { try { await cdp.send('Tracing.end'); } catch {} }
    await browser.close();
  }
}
