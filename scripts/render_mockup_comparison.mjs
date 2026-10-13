import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Compose the actual browser screenshots in an HTML comparison panel. This
// neither edits their pixels nor synthesizes a better-looking game scene.
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
if (!existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '')) process.env.PLAYWRIGHT_BROWSERS_PATH = join(homedir(), 'AppData/Local/ms-playwright');
const browser = await playwright.chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:1800,height:1050},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:5173/docs/qa/mockup-environment/compare.html');
  for (const [scene,file] of [['workshop','compare-workshop-desktop.png'],['battle-zischbert','compare-arena-desktop.png']]) {
    await page.locator('#scene').selectOption(scene);
    await page.waitForFunction(() => [...document.querySelectorAll('.comparison img')].every(img=>img.complete && img.naturalWidth>0));
    await page.locator('.comparison').screenshot({path:resolve('docs/qa/mockup-environment',file)});
    console.log(`Created ${file} from actual paired gameplay screenshots.`);
  }
} finally {await browser.close();}
