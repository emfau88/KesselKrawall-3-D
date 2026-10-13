import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = resolve(root, process.argv[3] ?? 'docs/qa/character-integration');
const workshopOnly = process.argv.includes('--workshop-only');
if (!existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(homedir(), 'AppData/Local/ms-playwright');
}
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
await mkdir(out, { recursive: true });
const software = process.env.QA_SOFTWARE_RENDERER === '1';
const report = { target, date: new Date().toISOString(), renderer: 'Automated Chromium; inspect snapshot GPU. Not a physical-phone performance benchmark', cases: [], errors: [] };
const browser = await playwright.chromium.launch({ headless: true, args: software ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-proxy-server'] : [...(process.platform==='win32' ? ['--use-angle=d3d11'] : []), '--no-proxy-server'] });

// Read-only inspection of the installed R3F root, not a production QA global.
async function sceneSnapshot(page) {
  return page.evaluate(async () => {
    const dependency = performance.getEntriesByType('resource').find(entry=>/@react-three_fiber\.js\?/.test(entry.name))?.name;
    if (!dependency) return null;
    const { _roots } = await import(dependency);
    const canvas = document.querySelector('canvas');
    const state = _roots.get(canvas)?.store.getState();
    if (!state) return null;
    state.scene.updateMatrixWorld(true);
    const characters = [];
    state.scene.traverse((node) => {
      if (!node.userData.characterAsset) return;
      const body = node.getObjectByName('Body');
      const liquid = node.getObjectByName('LiquidSurface');
      const m = node.matrixWorld.elements;
      const length = Math.hypot(m[8], m[9], m[10]);
      const morphs = Object.fromEntries(Object.entries(body?.morphTargetDictionary ?? {}).map(([name, index]) => [name, body.morphTargetInfluences[index]]));
      // BufferGeometry.computeBoundingBox includes every morph at once, even
      // when its runtime weight is zero. Measure the actually posed vertices.
      let bottom=Infinity, top=-Infinity;
      const point = body?.position.clone();
      if (body && point) for (let index=0;index<body.geometry.attributes.position.count;index++) {
        body.getVertexPosition(index,point);
        body.localToWorld(point);
        bottom=Math.min(bottom,point.y); top=Math.max(top,point.y);
      }
      characters.push({
        asset: node.userData.characterAsset,
        position: [m[12],m[13],m[14]], front: [m[8]/length,m[9]/length,m[10]/length], morphs,
        hasLiquid: Boolean(liquid),
        bottom: Number.isFinite(bottom) ? bottom : null,
        top: Number.isFinite(top) ? top : null,
        meshes: (()=>{ const names=[]; node.traverse(child=>{if(child.isMesh)names.push(child.name)}); return names; })(),
      });
    });
    const context=state.gl.getContext();
    const debug=context.getExtension('WEBGL_debug_renderer_info');
    return { characters, render: { calls: state.gl.info.render.calls, triangles: state.gl.info.render.triangles }, dpr: state.gl.getPixelRatio(), gpu:debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER) };
  });
}
async function waitCharacters(page, expected) {
  const started = Date.now();
  let latest;
  while (Date.now() - started < 45_000) {
    const snapshot = await sceneSnapshot(page);
    latest = snapshot;
    if (snapshot?.characters.length === expected && snapshot.render.triangles > 0 && snapshot.characters.every(c=>c.morphs.Smile<.99 && c.morphs.Look_L<.99)) {
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      return sceneSnapshot(page);
    }
    await page.waitForTimeout(150);
  }
  await page.screenshot({path:join(out,'failure.png'),fullPage:true});
  throw new Error(`Expected ${expected} rendered character(s): ${JSON.stringify(latest)}`);
}
function assertCharacter(snapshot, id, variant) {
  const character = snapshot.characters.find(c=>c.asset === `${id}-${variant}`);
  assert.ok(character, `${id}-${variant} is in the actual rendered scene`);
  assert.ok(character.hasLiquid);
  assert.equal(character.meshes.filter(name=>name === 'Body').length,1,'one character body');
  assert.equal(character.meshes.filter(name=>name === 'LiquidSurface').length,1,'one brew surface');
  assert.ok(Number.isFinite(character.morphs.FaceNeutral));
  assert.ok(character.top-character.bottom > 1.6 && character.top-character.bottom < 2.7,`sensible scene scale: ${JSON.stringify(character)}`);
  return character;
}

try {
  for (const profile of [
    { name:'desktop', viewport:{width:1440,height:900}, isMobile:false, hasTouch:false, variant:'desktop' },
    { name:'mobile-portrait', viewport:{width:390,height:844}, isMobile:true, hasTouch:true, variant:'mobile' },
    { name:'mobile-landscape', viewport:{width:844,height:390}, isMobile:true, hasTouch:true, variant:'mobile' },
  ]) {
    const context = await browser.newContext({ viewport:profile.viewport, isMobile:profile.isMobile, hasTouch:profile.hasTouch, deviceScaleFactor:1 });
    await context.addInitScript(()=>localStorage.setItem('kessel-krawall-3d-onboarding-v1','complete'));
    const page = await context.newPage();
    page.on('pageerror', error=>report.errors.push(error.message));
    page.on('console', message=>{if(message.type()==='error')report.errors.push(message.text())});
    page.on('response', response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`)});
    await page.goto(target,{waitUntil:'domcontentloaded'});
    if (profile.name==='desktop' && !workshopOnly) {
      await waitCharacters(page,1);
      await page.screenshot({path:join(out,'main-menu-desktop.png'),fullPage:true});
    }
    await page.getByRole('button',{name:/Spielen/}).click();
    await page.getByRole('button',{name:'Turnier beginnen',exact:true}).click();
    await page.locator('.shop-ribbon').waitFor();
    console.log(`QA ${profile.name}: workshop`);
    const workshop = await waitCharacters(page,1);
    report.cases.push({name:`workshop-${profile.name}`,snapshot:workshop});
    await page.screenshot({path:join(out,`workshop-${profile.name}.png`),fullPage:true});
    const player = assertCharacter(workshop,'brasskin',profile.variant);
    assert.ok(player.front[2]>.8,'workshop face looks toward player');
    assert.ok(player.morphs.FaceNeutral>=.8 && player.morphs.Smile<.05,'neutral resting mouth');
    await page.screenshot({path:join(out,`workshop-${profile.name}.png`),fullPage:true});
    if (workshopOnly) { await context.close(); continue; }

    // One real purchase ensures this is a gameplay flow, not only a scene demo.
    await page.locator('.offer:not([disabled])').first().click();
    // A brief animation may finish before a slow screenshot/browser resumes.
    // Assert its completed transaction, not observing a transient DOM frame.
    await page.waitForFunction(()=>!document.querySelector('.purchase-feedback') && document.querySelector('.battle-button')?.disabled===false,undefined,{timeout:15_000});
    assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('kessel-krawall-3d-run-v1')).board.some(Boolean)),'purchase populated the real inventory');
    assert.equal(await page.locator('.battle-button').isDisabled(),false);
    for (const [round,enemy] of [[1,'zischbert'],[2,'moor-martha']]) {
      console.log(`QA ${profile.name}: ${enemy}`);
      if (round===2) {
        await page.evaluate(()=>{
          const key='kessel-krawall-3d-run-v1';
          const state=JSON.parse(localStorage.getItem(key));
          state.round=2; state.phase='shop'; state.pendingBattle=null; state.selectedSlot=null;
          state.board=[{uid:'qa-chili',itemId:'chili',level:2},{uid:'qa-shroom',itemId:'slime-shroom',level:2},{uid:'qa-shell',itemId:'egg-shell',level:1},null,null];
          localStorage.setItem(key,JSON.stringify(state)); location.reload();
        });
        await page.getByRole('button',{name:/Fortsetzen/}).click();
        await page.locator('.shop-ribbon').waitFor();
        await waitCharacters(page,1);
      }
      await page.locator('.battle-button').click();
      await page.locator('.battle-hud').waitFor({timeout:45_000});
      // The loading dialog must be gone before combat is playable.
      assert.equal(await page.locator('.battle-preparation').count(),0);
      await page.getByRole('button',{name:'Kampf pausieren',exact:true}).click();
      const battle=await waitCharacters(page,2);
      const p=assertCharacter(battle,'brasskin',profile.variant);
      const e=assertCharacter(battle,enemy,profile.variant);
      assert.ok(p.front[2]<-.8,'player faces enemy, showing rear to combat camera');
      assert.ok(e.front[2]>.8,'enemy face looks toward player');
      assert.ok(p.position[2]-e.position[2]>7,'clear effect travel lane');
      await page.screenshot({path:join(out,`battle-${enemy}-${profile.name}.png`),fullPage:true});
      report.cases.push({name:`battle-${enemy}-${profile.name}`,snapshot:battle});
      await page.getByRole('button',{name:'Kampf fortsetzen',exact:true}).click();
      if (round===1) {
        await page.getByRole('button',{name:'4×',exact:true}).click();
        await page.locator('.result-panel').waitFor({timeout:45_000});
        await page.getByRole('button',{name:'Zurück zur Werkbank',exact:true}).click();
        await page.locator('.shop-ribbon').waitFor();
        const returned=await waitCharacters(page,1);
        assertCharacter(returned,'brasskin',profile.variant);
        report.cases.push({name:`result-and-return-${profile.name}`});
      }
      if (round===2) {
        await page.locator('.combat-floating-number').first().waitFor({timeout:20_000});
        report.cases.push({name:`damage-feedback-${profile.name}`,text:await page.locator('.combat-floating-number').first().textContent()});
      }
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
    await context.close();
  }
  assert.deepEqual(report.errors,[],'no failed assets or runtime errors');
  report.passed=true;
} catch(error) {
  report.passed=false; report.failure=error.stack;
  throw error;
} finally {
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
}
console.log(`Character integration QA: ${report.cases.length} cases passed; no runtime errors.`);
