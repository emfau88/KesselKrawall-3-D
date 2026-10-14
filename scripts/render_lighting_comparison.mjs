import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(homedir(), 'AppData/Local/ms-playwright');
const browser = await playwright.chromium.launch({ headless: true });
try {
  const page = await browser.newPage({viewport:{width:1800,height:1500},deviceScaleFactor:1});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/docs/qa/environment-lighting/compare.html?layout=grid2');
  for(const profile of ['desktop','mobile-portrait','mobile-landscape']) for(const scene of ['workshop','battle-zischbert','battle-moor-martha']) {
    await page.selectOption('#scene',scene); await page.selectOption('#profile',profile);
    await page.waitForFunction(()=>[...document.querySelectorAll('.comparison img')].every(image=>image.complete&&image.naturalWidth>0));
    await page.waitForFunction(()=>!document.querySelector('.metrics').textContent.includes('geladen'));
    await page.locator('.comparison').screenshot({path:resolve(`docs/qa/environment-lighting/compare-${scene}-${profile}.png`)});
    console.log(`Rendered real-game comparison: ${scene} ${profile}`);
  }
  if(errors.length)throw new Error(errors.join('\n'));
} finally { await browser.close(); }
