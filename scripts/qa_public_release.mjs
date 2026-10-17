import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { installCombatProbe } from './combat_performance_probe.mjs';

const opt = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const url = opt('url', 'https://emfau88.github.io/KesselKrawall-3-D/');
const expectedCommit = opt('commit', '');
const out = resolve(opt('out', 'outputs/repository-consolidation/public'));
assert.ok(new URL(url).hostname.endsWith('github.io'), 'Publication evidence must use the public Pages URL');
await mkdir(out, { recursive: true });
const require = createRequire(import.meta.url); let pw;
try { pw = require('playwright'); } catch { pw = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(homedir(), 'AppData/Local/ms-playwright');
const report = { url, expectedCommit, at: new Date().toISOString(), profiles: [], passed: false,
  limits: ['Fresh isolated browser contexts, no seeded run. Native new-campaign, onboarding, purchase and persistence controls.', 'Mobile viewport/touch emulation uses the desktop GPU, not real smartphones. This is a functional smoke, not a new performance benchmark.'] };
const browser = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--no-proxy-server'] });
try {
  const api = await browser.newContext();
  const identityResponse = await api.request.get(`${url}build-info.json?verify=${expectedCommit}`);
  assert.equal(identityResponse.status(), 200);
  report.identity = await identityResponse.json(); assert.equal(report.identity.commit, expectedCommit);
  const html = await api.request.get(url); assert.equal(html.status(), 200);
  report.htmlScripts = [...(await html.text()).matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
  await api.close();
  for (const profile of opt('profiles', 'desktop,portrait,landscape').split(',')) {
    const viewport = profile === 'desktop' ? { width: 1440, height: 900 } : profile === 'portrait' ? { width: 390, height: 844 } : { width: 844, height: 390 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: profile !== 'desktop', hasTouch: profile !== 'desktop', serviceWorkers: 'block' });
    await context.addInitScript(installCombatProbe, { mode: 'light' });
    const page = await context.newPage(); page.setDefaultTimeout(90000);
    const row = { profile, viewport, errors: [], models: [], cancelledAudio: [] }; report.profiles.push(row);
    page.on('pageerror', e => row.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') row.errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) row.errors.push(`${r.status()} ${r.url()}`); if (/[.](glb|gltf)([?]|$)/.test(r.url())) row.models.push({ url: r.url(), status: r.status() }); });
    page.on('requestfailed', r => { const e = r.failure()?.errorText; if (e === 'net::ERR_ABORTED' && r.url().includes('/assets/audio/')) row.cancelledAudio.push(r.url()); else row.errors.push(`${e} ${r.url()}`); });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' }); assert.equal(new URL(page.url()).search, '');
      await page.waitForFunction(() => {
        const s = window.__combatProbe.state(); if (!s) return false;
        const ids = []; s.scene.traverse(n => { if (n.userData.productionAsset) ids.push(n.userData.productionAsset); });
        return ids.some(id => id.startsWith('mockup-witch-workbench-')) && ['chili', 'slime-shroom', 'egg-shell'].every(id => ids.some(asset => asset.startsWith(`ingredient-polish-${id}-`)));
      });
      row.menuAssets = await page.evaluate(() => { const ids = []; window.__combatProbe.state().scene.traverse(n => { if (n.userData.productionAsset) ids.push(n.userData.productionAsset); }); return ids; });
      await page.getByRole('button', { name: /Spielen/ }).click();
      await page.getByRole('button', { name: 'Turnier beginnen', exact: true }).click();
      await page.locator('.onboarding-skip').click();
      await page.locator('.shop-ribbon').waitFor();
      await page.locator('.offer:not([disabled])').first().click();
      await page.waitForFunction(() => !document.querySelector('.purchase-feedback') && document.querySelector('.battle-button')?.disabled === false);
      await page.waitForFunction(() => {
        const s = window.__combatProbe.state(); if (!s) return false;
        const ids = new Set(); s.scene.traverse(n => { if (n.userData.productionAsset) ids.add(n.userData.productionAsset); });
        return [...ids].some(id => id.startsWith('mockup-witch-workbench-'));
      });
      row.scene = await page.evaluate(() => {
        const s = window.__combatProbe.state(), assets = [], lights = [];
        s.scene.traverse(n => { if (n.userData.productionAsset) assets.push(n.userData.productionAsset); if (['fantasy-rear-accent', 'fantasy-readable-rim'].includes(n.name)) lights.push({ name: n.name, intensity: n.intensity }); });
        return { assets, lights, camera: s.camera.type, buffer: [s.gl.domElement.width, s.gl.domElement.height] };
      });
      assert.equal(row.scene.camera, 'PerspectiveCamera');
      assert.equal(row.scene.lights.find(l => l.name === 'fantasy-rear-accent')?.intensity, 14);
      assert.equal(row.scene.lights.find(l => l.name === 'fantasy-readable-rim')?.intensity, 7);
      const saved = await page.evaluate(() => localStorage.getItem('kessel-krawall-3d-run-v1'));
      assert.ok(JSON.parse(saved).board.some(Boolean));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Fortsetzen/ }).click(); await page.locator('.shop-ribbon').waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('kessel-krawall-3d-run-v1')), saved);
      await page.screenshot({ path: join(out, `${profile}.png`) });
      assert.deepEqual(row.errors, []); row.passed = true;
    } catch (e) { row.passed = false; row.failure = e.stack; }
    finally { await context.close(); await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); }
    console.log(JSON.stringify({ profile, passed: row.passed, failure: row.failure, models: row.models.length }));
  }
  report.passed = report.profiles.every(p => p.passed);
} finally { await browser.close(); await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); }
assert.equal(report.passed, true);
