import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { installCombatProbe } from './combat_performance_probe.mjs';

// Focused layout/interaction acceptance, not a phone hardware benchmark.
// Fixtures are isolated from the user's save. No camera, clock, shader, model,
// simulation or preparation behavior is patched by this script.
const opt = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const url = opt('url', 'http://127.0.0.1:5210/');
const out = resolve(opt('out', 'outputs/repository-consolidation/mobile-layout-pass'));
const key = 'kessel-krawall-3d-run-v1';
const fixture = { ...JSON.parse(await readFile('docs/qa/ingredient-art-phase3a-polish/report.json', 'utf8')).fixture, gold: 40, selectedSlot: null };
const full = { ...fixture, round: 5, board: ['chili', 'slime-shroom', 'egg-shell', 'dragon-tooth', 'witch-eye'].map((itemId, i) => ({ uid: `layout-${i}`, itemId, level: 1 })), reserve: { uid: 'layout-reserve', itemId: 'healing-tuber', level: 1 } };
const profiles = [
  { name: 'portrait-390', width: 390, height: 844 },
  { name: 'landscape-844', width: 844, height: 390 },
  { name: 'portrait-430', width: 430, height: 932 },
  { name: 'landscape-932', width: 932, height: 430 },
].filter(p => opt('profiles', 'portrait-390,landscape-844,portrait-430,landscape-932').split(',').includes(p.name));
const require = createRequire(import.meta.url); let pw;
try { pw = require('playwright'); }
catch { pw = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(homedir(), 'AppData/Local/ms-playwright');
await mkdir(out, { recursive: true });
const report = { url, at: new Date().toISOString(), limits: ['Chromium viewport/touch emulation, DPR 1, desktop GPU. Not physical smartphones.', 'Preparation timeouts are recorded separately. If encountered, only the existing explicit reduced-graphics button is used; this is not a preparation fix.'], runs: [], passed: false };
const browser = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--no-proxy-server'] });

function inspectLayout() {
  const box = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const visible = e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
  const rect = selector => { const e = document.querySelector(selector); return e && visible(e) ? box(e) : null; };
  const s = window.__combatProbe.state();
  const slots = window.__combatProbe.slots().map(p => ({ ...p, unobstructed: document.elementFromPoint(p.x, p.y) === s.gl.domElement }));
  return { viewport: [innerWidth, innerHeight], slots, rects: Object.fromEntries(['.utility-controls', '.selection-popover', '.shop-ribbon', '.audio-mixer', '.player-health', '.enemy-health', '.battle-playback-controls'].map(selector => [selector, rect(selector)])) };
}
function separated(a, b) {
  return !a || !b || a.x + a.w <= b.x + .5 || b.x + b.w <= a.x + .5 || a.y + a.h <= b.y + .5 || b.y + b.h <= a.y + .5;
}
async function armNativePause(page, onStatus = false) {
  // Same real pause handler as the UI, observed at DOM commit so a short
  // fight cannot finish between an arbitrary delay and a remote touch call.
  await page.evaluate(onStatus => {
    let timer; window.__layoutPaused = false;
    const observer = new MutationObserver(check);
    function check() {
      const button = document.querySelector('button[aria-label="Kampf pausieren"]');
      if (!button || document.querySelector('.battle-preparation') || (onStatus && !document.querySelector('.combat-status-badge'))) return;
      observer.disconnect(); clearTimeout(timer); button.click(); window.__layoutPaused = true;
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label', 'class'] });
    timer = setTimeout(() => observer.disconnect(), 45000); check();
  }, onStatus);
}
try {
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await context.addInitScript(installCombatProbe, { mode: 'light' });
    await context.addInitScript(({ key, full }) => { localStorage.setItem(key, JSON.stringify(full)); localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete'); }, { key, full });
    const page = await context.newPage(); page.setDefaultTimeout(45000);
    const row = { profile, checks: [], screenshots: [], errors: [], usedPreparationFallback: false }; report.runs.push(row);
    page.on('pageerror', e => row.errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) row.errors.push(`${r.status()} ${r.url()}`); });
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    const idle = () => page.waitForFunction(() => document.querySelector('.shop-ribbon') && !document.querySelector('.purchase-feedback') && !document.querySelector('.battle-button')?.disabled);
    const settled = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const shot = async name => { const file = `${profile.name}-${name}.png`; await page.screenshot({ path: join(out, file) }); row.screenshots.push(file); };
    const restore = async f => { await page.evaluate(f => window.__combatProbe.restoreFixture(f), f); await page.waitForFunction(({ key, f }) => localStorage.getItem(key) === JSON.stringify(f), { key, f }); await idle(); };
    const slot = async index => {
      const point = await page.evaluate(index => {
        const s = window.__combatProbe.state(); s.scene.updateMatrixWorld(true); let n;
        s.scene.traverse(x => { if (x.userData.ingredientSlot === index) n = x; });
        const p = n.position.clone().set(0, .72, 0).applyMatrix4(n.matrixWorld).project(s.camera);
        const x = (p.x + 1) * innerWidth / 2, y = (1 - p.y) * innerHeight / 2;
        if (document.elementFromPoint(x, y) !== s.gl.domElement) throw new Error(`Slot ${index} is covered`);
        return { x, y };
      }, index);
      await page.touchscreen.tap(point.x, point.y); await settled();
    };
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Fortsetzen/ }).tap(); await idle();
      await page.waitForFunction(() => window.__combatProbe.slots().length === 6);
      await page.waitForFunction(() => {
        const ids = []; window.__combatProbe.state()?.scene.traverse(n => { const id = n.userData.productionAsset ?? n.userData.characterAsset; if (id) ids.push(id); });
        return ['brasskin-', 'mockup-witch-workbench-', 'mockup-dungeon-wall-', 'ingredient-polish-chili-'].every(prefix => ids.some(id => id.startsWith(prefix)));
      });
      await slot(0); assert.equal((await read()).selectedSlot, 0); await settled();
      row.workshop = await page.evaluate(inspectLayout);
      const r = row.workshop.rects;
      assert.ok(row.workshop.slots.every(p => p.unobstructed), 'All five slot bases and the reserve remain free of DOM overlays');
      assert.ok(separated(r['.selection-popover'], r['.shop-ribbon']));
      assert.ok(separated(r['.selection-popover'], r['.utility-controls']));
      assert.ok(await page.locator('.selection-popover button:not(.selection-close)').evaluate(e => {
        const r = e.getBoundingClientRect();
        return r.height >= 44 && [.1, .5, .9].every(t => e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height * t)));
      }), 'Sell action remains completely exposed, not hidden in the scroll area');
      assert.equal(await page.locator('.offer-cost:visible').count(), 3);
      assert.equal(await page.locator('.offer-level:visible').count(), 3);
      assert.ok(await page.locator('.offer-level').first().innerText().then(t => t.includes('→ II')));
      row.checks.push('all-six-touch-targets-uncovered', 'info-separated-from-shop-and-menu', 'prices-and-merge-levels-visible'); await shot('selected');

      await page.getByRole('button', { name: 'Audiomischung öffnen', exact: true }).tap();
      await page.waitForFunction(() => document.querySelector('.audio-mixer')?.matches(':modal'));
      assert.equal(await page.locator('.selection-popover').count(), 0);
      const mixer = await page.locator('.audio-mixer').boundingBox();
      assert.ok(mixer.x >= 0 && mixer.y >= 0 && mixer.x + mixer.width <= profile.width && mixer.y + mixer.height <= profile.height);
      const before = await read(), reroll = await page.locator('.mobile-reroll').boundingBox();
      await page.touchscreen.tap(reroll.x + reroll.width / 2, reroll.y + reroll.height / 2); assert.deepEqual(await read(), before);
      await shot('mixer'); await page.getByRole('button', { name: 'Audiomischung schließen', exact: true }).tap();
      await page.getByRole('button', { name: 'Audiomischung öffnen', exact: true }).tap(); await page.keyboard.press('Escape');
      await page.locator('.audio-mixer').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Kurzeinführung anzeigen', exact: true }).tap();
      assert.equal(await page.locator('.selection-popover').count(), 0); await page.locator('.onboarding-skip').tap();
      await page.getByRole('button', { name: 'Zutateninfo schließen', exact: true }).tap(); assert.equal((await read()).selectedSlot, null);
      row.checks.push('modal-mixer-blocks-background-and-fits', 'mixer-close-and-escape', 'help-and-info-mutually-exclusive', 'selection-close');

      await slot(0); await slot(5); assert.equal((await read()).reserve.itemId, 'chili');
      await slot(0); await slot(5); assert.deepEqual((await read()).board, full.board);
      await slot(0); await slot(1); assert.equal((await read()).board[1].itemId, 'chili');
      row.checks.push('native-reserve-and-board-swaps');
      await restore(fixture); await page.locator('.offer').first().tap(); await idle();
      assert.equal((await read()).board[0].level, 2); row.checks.push('native-purchase-and-merge');
      await armNativePause(page);
      await page.locator('.battle-button').tap();
      await page.waitForFunction(() => document.querySelector('.battle-playback-controls') || document.querySelector('.continue-reduced'), null, { timeout: 45000 });
      if (await page.locator('.continue-reduced').count()) {
        row.usedPreparationFallback = true; row.preparationMessage = await page.locator('.battle-preparation').innerText();
        await page.locator('.continue-reduced').tap();
      }
      await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).waitFor();
      if (!await page.locator('.combat-status-badge').count()) {
        await armNativePause(page, true);
        await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).tap();
        await page.waitForFunction(() => window.__layoutPaused);
        await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).waitFor();
      }
      await settled();
      row.battle = await page.evaluate(inspectLayout);
      for (const selector of ['.player-health', '.enemy-health']) assert.ok(separated(row.battle.rects[selector], row.battle.rects['.battle-playback-controls']), `Playback is separate from ${selector}`);
      assert.ok(await page.locator('.combat-status-badge').count() > 0, 'Status layout is checked with a real active status');
      await shot('battle'); row.checks.push('battle-status-and-playback-separated');
      assert.deepEqual(row.errors, []); row.passed = true;
    } catch (e) { row.passed = false; row.failure = e.stack; await shot('failure'); }
    finally { await context.close(); await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); }
    console.log(JSON.stringify({ profile: profile.name, passed: row.passed, checks: row.checks, usedPreparationFallback: row.usedPreparationFallback, failure: row.failure }));
  }
  report.passed = report.runs.length > 0 && report.runs.every(r => r.passed);
} finally { await browser.close(); await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); }
assert.equal(report.passed, true);
