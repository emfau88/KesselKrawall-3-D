import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const output = resolve(repository, 'docs/qa/cauldron-character/diagnostics');
if (!existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '')) process.env.PLAYWRIGHT_BROWSERS_PATH = join(homedir(), 'AppData/Local/ms-playwright');
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(process.env.PLAYWRIGHT_MODULE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
await mkdir(output, { recursive: true });
const browser = await playwright.chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-proxy-server'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${process.argv[2] ?? 'http://127.0.0.1:5194/'}?quality=desktop`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__CAULDRON_REVIEW__?.snapshot().ready, undefined, { timeout: 45_000 });
  await page.evaluate(() => { window.__CAULDRON_REVIEW__.setView('front'); window.__CAULDRON_REVIEW__.selectState('idle'); window.__CAULDRON_REVIEW__.seek(0.7); });
  const cases = [];
  for (const [name, showBody, diagnosticRed] of [['baseline', true, false], ['body-hidden-red', false, true], ['body-shown-red', true, true]]) {
    const snapshot = await page.evaluate(({ showBody, diagnosticRed }) => window.__CAULDRON_REVIEW__.diagnoseLiquid(showBody, diagnosticRed), { showBody, diagnosticRed });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
    cases.push({ name, showBody, diagnosticRed, snapshot });
  }
  await page.evaluate(() => window.__CAULDRON_REVIEW__.diagnoseLiquid(true, false));
  await writeFile(join(output, 'report.json'), JSON.stringify({ cases, errors, passed: errors.length === 0 }, null, 2));
  if (errors.length) throw new Error(`Diagnostic browser errors: ${errors.join('; ')}`);
  console.log(output);
} finally { await browser.close(); }
