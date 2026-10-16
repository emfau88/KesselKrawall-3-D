import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright')}catch{playwright=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))}
process.env.PLAYWRIGHT_BROWSERS_PATH??=join(homedir(),'AppData/Local/ms-playwright');
const source=JSON.parse(await readFile('docs/qa/ingredient-art-phase3a/report.json','utf8'));
const target=process.argv[2]??'http://127.0.0.1:5173/';
const production=process.argv.includes('--production');
const args=[...(process.platform==='win32'?['--use-angle=d3d11']:[]),'--no-proxy-server'];
const report={target,browserArgs:args,cases:[],errors:[],warnings:[]};
const browser=await playwright.chromium.launch({headless:true,args});
try{
 for(const query of ['art=golden','art=legacy','art=ecosystem','art=mockup','art=mockup&look=reference','art=mockup&look=dark','art=mockup&look=magical','art=mockup&ingredients=before']){
  if(process.argv.includes('--golden-only')&&query!=='art=golden')continue;
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(f=>{localStorage.setItem('kessel-krawall-3d-run-v1',JSON.stringify(f));localStorage.setItem('kessel-krawall-3d-onboarding-v1','complete')},source.fixture);
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${query}: ${e.message}`));
  try{
  const loaded=[];page.on('response',r=>{if(r.url().includes('/assets/')&&/\.(glb|gltf)(\?|$)/.test(r.url())){assert.equal(r.status(),200);loaded.push(r.url())}});
  await page.goto(`${target}?${query}`);await page.getByRole('button',{name:/Fortsetzen/}).click();
  await page.locator('.shop-ribbon').waitFor();await page.waitForTimeout(1500);
  assert.ok(loaded.some(url=>url.includes('brasskin')),'player model is loaded');
  const refined=query.includes('art=mockup')&&!query.includes('ingredients=before');
  assert.equal(loaded.some(url=>url.includes('ingredient-phase3a')),refined,'new assets isolated to the requested art mode');
  await page.locator('.offer:not([disabled])').first().click();await page.locator('.purchase-feedback').waitFor();
  await page.waitForFunction(()=>!document.querySelector('.purchase-feedback')&&document.querySelector('.battle-button')?.disabled===false,null,{timeout:60000});
  const run=await page.evaluate(()=>JSON.parse(localStorage.getItem('kessel-krawall-3d-run-v1')));
  assert.equal(run.board[0].level,2);
  if(query==='art=mockup'){
   const slots=source.cases.find(c=>c.name==='workshop-after-desktop').snapshot.slots;
   for(const slot of [0,1]){const point=slots.find(s=>s.slot===slot).interaction;await page.mouse.click(point.x,point.y);if(slot===0)await page.locator('.selection-popover').waitFor();}
   const swapped=await page.evaluate(()=>JSON.parse(localStorage.getItem('kessel-krawall-3d-run-v1')));
   assert.equal(swapped.board[0].uid,run.board[1].uid);assert.equal(swapped.board[1].uid,run.board[0].uid);
   report.occupiedSlotSwap=true;
  }
  // Use the native pause control as soon as the battle appears. First-use stalls
  // can otherwise finish a short battle before Playwright observes its HUD.
  await page.evaluate(()=>{
   let timer;const observer=new MutationObserver(check);
   function check(){const button=document.querySelector('button[aria-label="Kampf pausieren"]');if(!document.querySelector('.phase-battle')||document.querySelector('.battle-preparation')||!button||button.disabled||!button.getClientRects().length)return;observer.disconnect();clearTimeout(timer);button.click();}
   observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-label','disabled']});timer=setTimeout(()=>observer.disconnect(),60000);check();
  });
  await page.locator('.battle-button').click();
  await page.waitForFunction(()=>document.querySelector('.battle-hud')?.getClientRects().length||document.querySelector('.continue-reduced')?.getClientRects().length,null,{timeout:60000});
  const gateFallback=await page.locator('.continue-reduced').count()>0;
  if(gateFallback){
   report.warnings.push(`${query}: existing readiness timeout reached; native reduced-graphics fallback tested, not an unconditional normal-entry pass`);
   await page.locator('.continue-reduced').click();
  }
  await page.locator('.battle-hud').waitFor({timeout:60000});
  await page.waitForFunction(()=>!document.querySelector('.battle-preparation'),null,{timeout:60000});
  assert.ok(loaded.some(url=>url.includes('zischbert')),'opponent loaded');
  report.cases.push({query,purchaseMerge:true,battleGate:!gateFallback,reducedGraphicsFallback:gateFallback,refinedAssets:refined,loadedModels:[...new Set(loaded)]});
  await context.close();console.log(`Variant passed${gateFallback?' with readiness fallback':''}: ${query}`);
  }catch(error){
   const directory='docs/qa/ingredient-art-phase3a/iterations';await mkdir(directory,{recursive:true});
   await page.screenshot({path:`${directory}/variant-failure.png`});
   const diagnostic={query,error:String(error),body:await page.locator('body').innerText(),runtimeErrors:report.errors};
   await writeFile(`${directory}/variant-failure.json`,JSON.stringify(diagnostic,null,2));console.error(JSON.stringify(diagnostic));throw error;
  }
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await browser.close();await writeFile(`docs/qa/ingredient-art-phase3a/variants${production?'-production':''}.json`,JSON.stringify(report,null,2))}
