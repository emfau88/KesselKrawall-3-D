import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Render a labelled side-by-side panel from the actual QA screenshots. No
// scene synthesis, image editing, frame substitution or shader postprocessing.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arguments_ = process.argv.slice(2);
const positional = arguments_.filter(argument => !argument.startsWith('--'));
const target = positional[0] ?? 'http://127.0.0.1:5173/';
const out = resolve(root, positional[1] ?? 'docs/qa/environment-composition');
const profiles = arguments_.includes('--all-profiles') ? ['desktop', 'mobile-portrait', 'mobile-landscape'] : ['desktop'];
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
if (!existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '')) process.env.PLAYWRIGHT_BROWSERS_PATH = join(homedir(), 'AppData/Local/ms-playwright');
const browser = await playwright.chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1120 }, deviceScaleFactor: 1 });
  await page.goto(new URL('docs/qa/environment-composition/compare.html', target).href);
  for (const profile of profiles) for (const [scene, stem] of [['workshop', 'workshop'], ['battle-zischbert', 'arena-zischbert'], ['battle-moor-martha', 'arena-moor-martha']]) {
    await page.locator('#scene').selectOption(scene);
    await page.locator('#profile').selectOption(profile);
    await page.waitForFunction(() => [...document.querySelectorAll('.comparison img')].every(image => image.complete && image.naturalWidth > 0), undefined, { timeout: 15_000 });
    const filename = `compare-${stem}-${profile}.png`;
    await page.locator('.comparison').screenshot({ path: join(out, filename) });
    console.log(`Created ${filename} from actual paired gameplay screenshots; cameras explicitly labelled.`);
  }
} finally { await browser.close(); }
