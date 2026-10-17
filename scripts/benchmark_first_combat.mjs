import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {installCombatProbe} from './combat_performance_probe.mjs';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright')}catch{pw=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))}
process.env.PLAYWRIGHT_BROWSERS_PATH??=join(homedir(),'AppData/Local/ms-playwright');
const opt=(key,fallback)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3)??fallback;
const target=opt('url','http://127.0.0.1:5197/'),out=resolve(opt('out','outputs/first-combat-performance/diagnostic'));
const repeats=Number(opt('repeats','1')),profile=opt('profile','desktop'),art=opt('ingredients','polish'),experiment=opt('experiment','none');
const trace=process.argv.includes('--trace'),activeMs=Number(opt('active-ms','10000'));
const viewport=profile==='desktop'?{width:1440,height:900}:profile==='portrait'?{width:390,height:844}:{width:844,height:390};
const base=JSON.parse(await readFile('docs/qa/ingredient-art-phase3a-polish/report.json','utf8')).fixture;
await mkdir(out,{recursive:true});
const browser=await pw.chromium.launch({headless:true,args:['--use-angle=d3d11','--no-proxy-server']});
const bc=await browser.newBrowserCDPSession();
const environment={browser:await bc.send('Browser.getVersion'),system:await bc.send('SystemInfo.getInfo'),target,profile,viewport,dpr:1,art,experiment,trace,activeMs,cacheNote:'Cold = cleared Chromium HTTP cache/fresh JS and WebGL context; GPU driver/ANGLE shader caches are not forcibly reset. Warm reload preserves HTTP cache but creates fresh JS/WebGL. No CPU throttling.'};
await writeFile(join(out,'environment.json'),JSON.stringify(environment,null,2));
async function run(index,cache='cold'){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:profile!=='desktop',hasTouch:profile!=='desktop'});
 await context.addInitScript(installCombatProbe,{experiment,mode:opt('mode','diagnostic')});
 await context.addInitScript(f=>{localStorage.setItem('kessel-krawall-3d-run-v1',JSON.stringify(f));localStorage.setItem('kessel-krawall-3d-onboarding-v1','complete')},base);
 const page=await context.newPage(),cdp=await context.newCDPSession(page);const errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));await cdp.send('Network.enable');await cdp.send('Network.clearBrowserCache');
 cdp.on('Network.responseReceived',e=>{if(e.type==='Fetch'||e.type==='Image'||e.type==='Script')network.push({url:e.response.url,disk:e.response.fromDiskCache,serviceWorker:e.response.fromServiceWorker,status:e.response.status})});
 let chunks=[];
 if(trace){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:500});await cdp.send('Profiler.start');await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing,toplevel,gpu,disabled-by-default-v8.cpu_profiler',options:'sampling-frequency=2000',transferMode:'ReturnAsStream'});}
 const label=`${profile}-${art}-${cache}-${index}`;
 try{
  await page.goto(`${target}?art=mockup&look=warm&ingredients=${art}`,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Fortsetzen/}).click();await page.locator('.shop-ribbon').waitFor();
  await page.waitForFunction(()=>window.__combatProbe?.state()?.scene&&window.__combatProbe.slots().length>=5,null,{timeout:60000});
  await page.waitForTimeout(500);
  await page.evaluate(()=>window.__combatProbe.mark('workshop-usable'));
  if(process.argv.includes('--interactions')){
   await page.evaluate(()=>window.__combatProbe.mark('purchase-start'));
   await page.locator('.offer:not([disabled])').first().click();
   await page.waitForFunction(()=>!document.querySelector('.purchase-feedback')&&!document.querySelector('.battle-button')?.disabled,null,{timeout:60000});
   await page.evaluate(()=>window.__combatProbe.mark('purchase-end'));
   const slots=await page.evaluate(()=>window.__combatProbe.slots());
   for(const slot of [0,1,1,0]){const p=slots.find(s=>s.slot===slot);await page.mouse.click(p.x,p.y);await page.waitForTimeout(80);}
   await page.evaluate(()=>window.__combatProbe.mark('swap-end'));
  }
  if(experiment!=='none')await page.evaluate(kind=>{
    const probe=window.__combatProbe,s=probe.state();
    if(kind==='no-shadow')s.gl.shadowMap.enabled=false;
    if(kind==='no-vfx'){
      const original=s.gl.render;s.gl.render=function(scene,camera){const hidden=[];scene.traverse(n=>{if(n.isPointLight&&n.distance<4&&n.intensity>0){hidden.push([n,n.intensity]);n.intensity=0;}});try{return original.call(this,scene,camera)}finally{hidden.forEach(([n,i])=>n.intensity=i)}};
    }
  },experiment);
  await page.evaluate(()=>window.__combatProbe.mark('battle-click'));
  await page.locator('.battle-button').click();
  await page.waitForFunction(()=>document.querySelector('.phase-battle')&&!document.querySelector('.battle-preparation'),null,{timeout:60000});
  await page.evaluate(()=>window.__combatProbe.mark('native-active-observed'));
  await page.waitForTimeout(activeMs);
  const data=await page.evaluate(()=>window.__combatProbe.snapshot());
  const run=await page.evaluate(()=>JSON.parse(localStorage.getItem('kessel-krawall-3d-run-v1')));
  await writeFile(join(out,`${label}.json`),JSON.stringify({label,errors,network,run,data},null,2));
  await page.screenshot({path:join(out,`${label}.png`)});
  const combat=data.frames.filter(f=>f.phase==='combat'),slow=data.glSlow.sort((a,b)=>b.ms-a.ms).slice(0,8);
  console.log(JSON.stringify({label,combatMax:Math.max(...combat.map(f=>f.ms)),longTasks:data.longTasks.filter(t=>t.phase==='combat').sort((a,b)=>b.ms-a.ms).slice(0,4),slow,programs:data.renderer?.programs,errors}));
 }finally{
  if(trace){const {profile}=await cdp.send('Profiler.stop');await writeFile(join(out,`${label}.cpuprofile`),JSON.stringify(profile));
   const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await done;
   for(;;){const item=await cdp.send('IO.read',{handle:stream});chunks.push(Buffer.from(item.data,item.base64Encoded?'base64':'utf8'));if(item.eof)break;}
   await cdp.send('IO.close',{handle:stream});await writeFile(join(out,`${label}.trace.json.gz`),gzipSync(Buffer.concat(chunks)));
  }
  await context.close();
 }
}
try{for(let i=1;i<=repeats;i++)await run(i)}finally{await browser.close()}
