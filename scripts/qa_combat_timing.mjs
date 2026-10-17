import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { installCombatProbe } from './combat_performance_probe.mjs';

const opt = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const url = opt('url', 'http://127.0.0.1:5210/'), out = resolve(opt('out', 'outputs/repository-consolidation/combat-timing'));
const key = 'kessel-krawall-3d-run-v1';
const initial = JSON.parse(await readFile('docs/qa/ingredient-art-phase3a-polish/report.json', 'utf8')).fixture;
const require = createRequire(import.meta.url); let pw;
try { pw = require('playwright'); } catch { pw = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(homedir(), 'AppData/Local/ms-playwright');
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const report = { url, at: new Date().toISOString(), limits: ['Focused functional/trajectory checks, not a new performance benchmark.', 'Mobile is viewport/touch emulation on desktop GPU, not a smartphone test.', 'Pause is triggered through existing UI handlers, no clock/GL/simulation overrides.'], runs: [], passed: false };
await mkdir(out, { recursive: true });
const browser = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--no-proxy-server'] });
try {
  for (const test of [{ name: 'desktop-zischbert-1x', round: 1, speed: 1, viewport: { width: 1440, height: 900 } }, { name: 'desktop-zischbert-4x', round: 1, speed: 4, viewport: { width: 1440, height: 900 } }, { name: 'mobile-martha-2x', round: 2, speed: 2, viewport: { width: 844, height: 390 } }]) {
    if (opt('cases', '') && !opt('cases', '').split(',').includes(test.name)) continue;
    const fixture = { ...initial, round: test.round, board: initial.board.map(i => i && ({ ...i, level: test.round === 2 && i.itemId !== 'egg-shell' ? 2 : 1 })) };
    const context = await browser.newContext({ viewport: test.viewport, deviceScaleFactor: 1, isMobile: test.name.startsWith('mobile'), hasTouch: test.name.startsWith('mobile') });
    await context.addInitScript(installCombatProbe, { mode: 'light' });
    await context.addInitScript(({ key, fixture }) => { localStorage.setItem(key, JSON.stringify(fixture)); localStorage.setItem('kessel-krawall-3d-onboarding-v1', 'complete'); }, { key, fixture });
    const page = await context.newPage(); page.setDefaultTimeout(90000);
    const row = { ...test, errors: [] }; report.runs.push(row);
    page.on('pageerror', e => row.errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) row.errors.push(`${r.status()} ${r.url()}`); });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Fortsetzen/ }).click();
      await page.waitForFunction(() => document.querySelector('.battle-button')?.disabled === false);
      await page.evaluate(() => {
        const observer = new MutationObserver(() => {
          const button = document.querySelector('button[aria-label="Kampf pausieren"]');
          if (button && !document.querySelector('.battle-preparation')) { observer.disconnect(); button.click(); }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      });
      await page.locator('.battle-button').click();
      await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).waitFor();
      row.defaultSpeed = await page.getByRole('button', { name: '1×', exact: true }).getAttribute('aria-pressed');
      assert.equal(row.defaultSpeed, 'true', 'Later rounds no longer silently auto-accelerate');
      row.resultHash = hash(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).pendingBattle, key));
      await page.getByRole('button', { name: `${test.speed}×`, exact: true }).click();
      await page.evaluate(() => {
        const state = window.__combatProbe.state(), scene = state.scene, previous = scene.onAfterRender;
        const d = window.__timing = { effects: {}, maxTransientLights: 0, pauseOnFlight: true, pausedFlight: false };
        const hp = side => document.querySelector(`.${side}-health > div:first-of-type > span`)?.textContent;
        scene.onAfterRender = function (...args) {
          previous?.apply(this, args);
          let active = 0;
          scene.traverseVisible(n => { if (n.isPointLight && n.userData.combatTransientLight) active++; });
          d.maxTransientLights = Math.max(d.maxTransientLights, active);
          const effect = scene.getObjectByName('combat-vfx'); if (!effect || effect.userData.progress === undefined) return;
          const v = effect.userData, projectile = effect.children[2], impact = effect.children[3], now = performance.now();
          const entry = d.effects[v.eventIndex] ??= { index: v.eventIndex, item: v.itemId, travels: v.travels, firstAt: now, hpBefore: [hp('player'), hp('enemy')], maxProgress: 0, flightFrames: 0, impactFrames: 0 };
          entry.maxProgress = Math.max(entry.maxProgress, v.progress);
          if (projectile.visible) entry.flightFrames++;
          if (impact.visible) entry.impactFrames++;
          if (v.landed && !entry.contactAt) { entry.contactAt = now; entry.contactProgress = v.progress; entry.contactDistance = projectile.position.distanceTo(impact.position); }
          if (!entry.hpChangedAt && (entry.hpBefore[0] !== hp('player') || entry.hpBefore[1] !== hp('enemy'))) entry.hpChangedAt = now;
          if (d.pauseOnFlight && v.travels && v.progress >= .3 && v.progress < 1) {
            d.pauseOnFlight = false; document.querySelector('button[aria-label="Kampf pausieren"]')?.click(); d.pausedFlight = true;
          }
          if (d.pauseOnImpact && v.landed && v.impactProgress >= .2 && v.impactProgress < .9) {
            d.pauseOnImpact = false; document.querySelector('button[aria-label="Kampf pausieren"]')?.click(); d.pausedImpact = true;
          }
        };
      });
      await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).click();
      await page.waitForFunction(() => window.__timing.pausedFlight);
      await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).waitFor();
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const readFlight = () => page.evaluate(() => {
        const n = window.__combatProbe.state().scene.getObjectByName('combat-vfx');
        return { id: n.userData.eventIndex, progress: n.userData.progress, position: n.children[2].position.toArray(), rotation: n.children[2].rotation.toArray(), elapsedMs: n.userData.elapsedMs };
      });
      const paused = await readFlight(); await page.waitForTimeout(250); assert.deepEqual(await readFlight(), paused, 'Pause freezes real projectile transform/time');
      await page.getByRole('button', { name: test.speed === 4 ? '1×' : '4×', exact: true }).click();
      assert.deepEqual(await readFlight(), paused, 'Changing speed while paused does not reset the projectile');
      await page.getByRole('button', { name: `${test.speed}×`, exact: true }).click();
      row.pauseAndSpeedChange = { passed: true, sample: paused };
      await page.screenshot({ path: join(out, `${test.name}-flight.png`) });
      await page.evaluate(() => { window.__timing.pauseOnImpact = true; });
      await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).click();
      await page.waitForFunction(() => window.__timing.pausedImpact);
      await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).waitFor();
      await page.screenshot({ path: join(out, `${test.name}-impact.png`) });
      await page.getByRole('button', { name: 'Kampf fortsetzen', exact: true }).click();
      await page.locator('.result-panel').waitFor();
      row.observations = await page.evaluate(() => window.__timing);
      const effects = Object.values(row.observations.effects);
      assert.ok(effects.length > 0);
      for (const effect of effects) {
        assert.ok(effect.impactFrames > 0, `Visible impact exists for effect ${effect.index}`);
        if (effect.travels) {
          assert.ok(effect.flightFrames > 0, `Visible flight exists for effect ${effect.index}`);
          assert.equal(effect.maxProgress, 1, `No premature projectile cutoff at ${test.speed}x`);
          assert.equal(effect.contactProgress, 1, 'Impact never starts before the projectile arrives');
          assert.ok(effect.contactDistance < .001, 'Projectile endpoint and impact anchor coincide');
        }
        if (effect.hpChangedAt && effect.contactAt) assert.ok(effect.hpChangedAt >= effect.contactAt - 50, 'HP/shield update is not ahead of visible impact (one-frame observation tolerance)');
      }
      assert.ok(row.observations.maxTransientLights <= 5, 'Existing light budget is preserved');
      assert.equal(hash(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).pendingBattle, key)), row.resultHash, 'Deterministic battle result is unchanged by presentation');
      row.frames = await page.evaluate(() => { const frames = window.__combatProbe.snapshot().frames.filter(f => f.phase === 'combat').map(f => f.ms); return { maxMs: Math.max(...frames), over250: frames.filter(ms => ms > 250).length, over1000: frames.filter(ms => ms > 1000).length }; });
      await page.getByRole('button', { name: 'Zurück zur Werkbank', exact: true }).click(); await page.locator('.shop-ribbon').waitFor();
      assert.deepEqual(row.errors, []); row.passed = true;
    } catch (e) { row.passed = false; row.failure = e.stack; await page.screenshot({ path: join(out, `${test.name}-failure.png`) }); }
    finally { await context.close(); await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); }
    console.log(JSON.stringify({ name: row.name, passed: row.passed, effects: Object.keys(row.observations?.effects ?? {}).length, frames: row.frames, failure: row.failure }));
  }
  report.passed = report.runs.length > 0 && report.runs.every(r => r.passed);
} finally { await browser.close(); await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); }
assert.equal(report.passed, true);
