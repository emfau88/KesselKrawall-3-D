import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { installCombatProbe } from './combat_performance_probe.mjs';
import { installWorkshopProbe } from './workshop_performance_probe.mjs';

const opt = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const out = resolve(opt('out', 'outputs/workshop-purchase-performance/functional-workshop'));
const profiles = opt('profiles', 'desktop,portrait,landscape').split(',');
const targets = opt('targets', 'baseline=http://127.0.0.1:5201/,candidate=http://127.0.0.1:5202/').split(',').map(s => { const i = s.indexOf('='); return { label: s.slice(0, i), url: s.slice(i + 1) }; });
const key = 'kessel-krawall-3d-run-v1';
const initial = { ...JSON.parse(await readFile('docs/qa/ingredient-art-phase3a-polish/report.json', 'utf8')).fixture, gold: 40 };
const require = createRequire(import.meta.url); let pw;
try { pw = require('playwright'); } catch { pw = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(homedir(), 'AppData/Local/ms-playwright');
await mkdir(out, { recursive: true });
const report = { runs: [], passed: false, limits: ['Native interaction QA, not a headline timing benchmark. Fixture changes occur only in the shop.', 'Mobile viewport/touch emulation on the desktop GPU, not smartphone measurement.'] };
for (const target of targets) for (const profile of profiles) {
  const browser = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--no-proxy-server'] });
  const viewport = profile === 'desktop' ? { width: 1440, height: 900 } : profile === 'portrait' ? { width: 390, height: 844 } : { width: 844, height: 390 };
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: profile !== 'desktop', isMobile: profile !== 'desktop' });
  await context.addInitScript(installCombatProbe, { mode: 'light' });
  await context.addInitScript(installWorkshopProbe);
  await context.addInitScript(({ key, initial }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial)); localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete'); }, { key, initial });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  const row = { label: `${target.label}-${profile}`, errors: [], checks: [], purchases: [] }; report.runs.push(row);
  page.on('pageerror', e => row.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) row.errors.push(`${r.status()} ${r.url()}`); });
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const idle = () => page.waitForFunction(() => document.querySelector('.shop-ribbon') && !document.querySelector('.purchase-feedback') && !document.querySelector('.battle-button')?.disabled, null, { timeout: 120000 });
  async function restore(fixture) {
    await page.evaluate(f => window.__combatProbe.restoreFixture(f), fixture);
    await page.waitForFunction(({ key, fixture }) => localStorage.getItem(key) === JSON.stringify(fixture), { key, fixture });
    await idle();
  }
  async function slot(index) {
    const p = await page.evaluate(i => window.__combatProbe.slots().find(s => s.slot === i), index);
    assert.ok(p && p.x >= 0 && p.y >= 0 && p.x <= viewport.width && p.y <= viewport.height);
    if (profile === 'desktop') await page.mouse.click(p.x, p.y); else await page.touchscreen.tap(p.x, p.y);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
  }
  async function buy(index, name) {
    const from = await page.evaluate(() => window.__workshopProbe.data.purchases.length);
    await page.locator('.offer').nth(index).click();
    await idle();
    const phases = await page.evaluate(i => window.__workshopProbe.data.purchases.slice(i), from);
    for (const phase of ['flight', 'landing', 'reveal']) assert.ok(phases.some(p => p.purchase?.phase === phase), `${name} has ${phase}`);
    row.purchases.push({ name, phases: phases.map(p => p.phase), after: await read() });
  }
  try {
    await page.goto(`${target.url}?art=mockup&look=warm`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Fortsetzen/ }).click(); await idle();
    row.checks.push('menu-and-shop');
    row.heapBefore = await cdp.send('Runtime.getHeapUsage');
    await buy(0, 'merge-I-II'); assert.equal((await read()).board[0].level, 2);
    const upgrade = { ...initial, board: [{ uid: 'chili-II', itemId: 'chili', level: 2 }, { uid: 'chili-I', itemId: 'chili', level: 1 }, ...initial.board.slice(1, 3), null] };
    await restore(upgrade); await buy(0, 'cascade-I-II-III');
    assert.equal((await read()).board.find(i => i?.itemId === 'chili').level, 3);
    assert.equal(row.purchases.at(-1).phases.filter(p => p.includes(':merge:')).length, 2);
    row.checks.push('merge-I-II-and-cascade-II-III');
    const saved = await read();
    await page.getByRole('button', { name: 'Zum Hauptmenü', exact: true }).click();
    await page.getByRole('button', { name: /Fortsetzen/ }).click(); await idle();
    assert.deepEqual(await read(), saved); row.checks.push('save-and-native-continue');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Fortsetzen/ }).click(); await idle();
    assert.deepEqual(await read(), saved); row.checks.push('save-survives-browser-reload');
    const occupied = ['chili', 'slime-shroom', 'egg-shell', 'dragon-tooth', 'witch-eye'].map((itemId, i) => ({ uid: `reserve-${i}`, itemId, level: 1 }));
    const reserve = { ...initial, round: 5, board: occupied, reserve: null, offers: ['healing-tuber', 'venom-bulb', 'chili'].map((itemId, i) => ({ uid: `reserve-offer-${i}`, itemId, bought: false })) };
    await restore(reserve);
    await page.waitForFunction(() => window.__combatProbe.slots().length === 6);
    await buy(0, 'purchase-to-reserve'); assert.equal((await read()).reserve.itemId, 'healing-tuber');
    const purchased = await read();
    await slot(0); await slot(5);
    assert.equal((await read()).reserve.itemId, 'chili'); assert.equal((await read()).board[0].itemId, 'healing-tuber');
    await slot(0); await slot(5); assert.deepEqual((await read()).board, purchased.board);
    await slot(0); await slot(1);
    assert.equal((await read()).board[1].uid, purchased.board[0].uid);
    await slot(1); await slot(0); assert.deepEqual((await read()).board, purchased.board);
    row.checks.push('reserve-purchase-and-native-swaps');
    const synergy = { ...initial, board: ['chili', 'ember-core', 'dragon-tooth', 'egg-shell', 'slime-shroom'].map((itemId, i) => ({ uid: `synergy-${i}`, itemId, level: 1 })) };
    await restore(synergy); await slot(1);
    assert.ok((await page.locator('.selection-popover').innerText()).length > 0);
    row.synergyText = await page.locator('.selection-popover').innerText();
    assert.match(row.synergyText, /Nachbarn|Feuer|Tempo|schneller/i);
    row.checks.push('synergy-and-adjacency-presentation');
    row.heapAfter = await cdp.send('Runtime.getHeapUsage');
    row.probe = await page.evaluate(() => window.__combatProbe.snapshot());
    await page.screenshot({ path: join(out, `${row.label}.png`) });
    assert.deepEqual(row.errors, []); row.passed = true;
  } catch (e) { row.failure = e.stack; row.passed = false; }
  finally { await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log(JSON.stringify({ label: row.label, passed: row.passed, checks: row.checks, failure: row.failure }));
}
report.passed = report.runs.every(r => r.passed);
await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
assert.equal(report.passed, true);
