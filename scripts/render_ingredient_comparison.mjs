import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright')}catch{playwright=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))}
process.env.PLAYWRIGHT_BROWSERS_PATH??=join(homedir(),'AppData/Local/ms-playwright');
const browser=await playwright.chromium.launch({headless:true});
const polish=process.argv.includes('--polish');
const folder=`docs/qa/ingredient-art-phase3a${polish?'-polish':''}`;
try{
 const page=await browser.newPage({viewport:{width:1900,height:1400},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:5173/${folder}/compare.html`);
 await page.waitForFunction(()=>document.querySelector('#before-metrics').textContent.includes('Draw Calls'));
 for(const value of await page.locator('#view option').evaluateAll(options=>options.map(o=>o.value))){
  await page.selectOption('#view',value);
  await page.waitForFunction(()=>[...document.querySelectorAll('.comparison img')].every(i=>i.complete&&i.naturalWidth>0));
 }
 for(const [view,name] of [[polish?'levels-1|desktop':'workshop|desktop','workshop'],[polish?'levels-3|desktop':'battle-zischbert|desktop',polish?'levels-3':'battle'],['closeup','closeup']]){
  await page.selectOption('#view',view);
  await page.waitForFunction(()=>[...document.querySelectorAll('.comparison img')].every(i=>i.complete&&i.naturalWidth>0));
  await page.locator('.comparison').screenshot({path:resolve(`${folder}/compare-${name}.png`)});
 }
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('All comparison views load; three README panels rendered.');
}finally{await browser.close()}
