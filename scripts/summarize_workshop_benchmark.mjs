import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const root = resolve(process.argv[2] ?? 'outputs/workshop-purchase-performance/matrix');
const output = process.argv[3];
const round = n => Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
const quantile = (v, p) => v.length ? [...v].sort((a, b) => a - b)[Math.max(0, Math.ceil(v.length * p) - 1)] : null;
const stats = values => ({ n: values.length, median: round(quantile(values, .5)), p95: round(quantile(values, .95)), max: round(Math.max(...values)) });
const documents = [];
async function walk(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, file.name);
    if (file.isDirectory()) await walk(path);
    else if (/-(cold|warm)\.json(?:\.gz)?$/.test(file.name)) {
      const bytes = await readFile(path);
      documents.push({ path, ...JSON.parse((file.name.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8')) });
    }
  }
}
await walk(root);
const runs = documents.map(x => {
  const { data: d, workshop: w } = x;
  const mark = name => d.marks.find(m => m.name === name)?.t;
  function window(start, end) {
    const frames = d.frames.filter(f => f.t >= start && f.t - f.ms <= end).map(f => f.ms);
    const tasks = d.longTasks.filter(t => t.t >= start && t.t < end);
    const renders = d.renders.filter(r => r.t >= start && r.t < end);
    const gl = d.glSlow.filter(g => g.t >= start && g.t < end);
    const samples = w.scenes.filter(s => s.t >= start && s.t < end);
    const gpu = (d.gpuTimes ?? []).filter(g => g.t >= start && g.t < end).map(g => g.ms);
    return { frames: stats(frames), framesOver250: frames.filter(f => f > 250).length, framesOver1000: frames.filter(f => f > 1000).length,
      longTasks: { count: tasks.length, totalMs: round(tasks.reduce((s, t) => s + t.ms, 0)), maxMs: round(Math.max(0, ...tasks.map(t => t.ms))) },
      renderMaxMs: round(Math.max(0, ...renders.map(r => r.ms))), slowGlTotalMs: round(gl.reduce((s, g) => s + g.ms, 0)),
      gpuMs: stats(gpu), programsMax: Math.max(0, ...samples.map(s => s.programs)),
      callsMax: Math.max(0, ...samples.map(s => s.calls)), trianglesMax: Math.max(0, ...samples.map(s => s.triangles)),
      geometriesMax: Math.max(0, ...samples.map(s => s.geometries)), texturesMax: Math.max(0, ...samples.map(s => s.textures)) };
  }
  const actions = x.actions.map(a => {
    const start = mark(`${a.name}:click`), end = mark(`${a.name}:ready`);
    const phases = w.purchases.filter(p => p.t >= start && p.t < end);
    const timer = w.timers.filter(t => t.created >= start && t.created < end);
    const authoredMs = phases.some(p => p.purchase?.phase === 'merge') ? a.name.startsWith('cascade') ? 2360 : 1740 : 1120;
    return { name: a.name, totalMs: round(end - start), authoredMs,
      firstReactCommitMs: round(phases[0]?.t - start),
      phases: phases.map((p, i) => ({ phase: p.phase, ms: round((phases[i + 1]?.t ?? end) - p.t) })),
      timerOverdueMs: timer.map(t => ({ requested: t.duration, overdue: round(t.fired === null ? null : t.fired - t.created - t.duration) })),
      ...window(start, end) };
  });
  return { label: x.label, target: x.label.split('-')[0], profile: x.profile, cache: x.cache, buffer: x.drawingBufferAtReady,
    navigationToMenuDomMs: round(mark('menu-dom')), navigationToFirstSceneSampleMs: round(mark('menu-scene-ready')),
    navigationToWorkshopReadyMs: round(mark('workshop-ready')), continueIntentToClickMs: round(mark('continue-click') - mark('continue-intent')),
    continueClickToReadyMs: round(mark('workshop-ready') - mark('continue-click')),
    startup: window(0, mark('workshop-ready')), interactions: window(mark('workshop-ready'), mark('swap-complete')),
    idle: window(mark('idle-start'), mark('idle-end')), actions, errors: x.errors,
    reactCommitCount: w.commits.length, rendererFinal: d.renderer, resources: d.resources.length };
});
const groups = [];
for (const key of [...new Set(runs.map(r => `${r.target}/${r.profile}/${r.cache}`))]) {
  const rows = runs.filter(r => `${r.target}/${r.profile}/${r.cache}` === key);
  const actionNames = [...new Set(rows.flatMap(r => r.actions.map(a => a.name)))];
  groups.push({ key, n: rows.length, buffers: [...new Set(rows.map(r => JSON.stringify(r.buffer)))],
    workshopReadyMs: stats(rows.map(r => r.navigationToWorkshopReadyMs)),
    startupWorstFrameMs: stats(rows.map(r => r.startup.frames.max)),
    interactionWorstFrameMs: stats(rows.map(r => r.interactions.frames.max)),
    framesOver250: rows.reduce((s, r) => s + r.interactions.framesOver250, 0),
    framesOver1000: rows.reduce((s, r) => s + r.interactions.framesOver1000, 0),
    longTaskTotalMs: stats(rows.map(r => r.interactions.longTasks.totalMs)),
    maxLongTaskMs: stats(rows.map(r => r.interactions.longTasks.maxMs)),
    programsMax: stats(rows.map(r => r.interactions.programsMax)), callsMax: stats(rows.map(r => r.interactions.callsMax)),
    geometriesMax: stats(rows.map(r => r.interactions.geometriesMax)), texturesMax: stats(rows.map(r => r.interactions.texturesMax)),
    idleFrameMedianMs: stats(rows.map(r => r.idle.frames.median)),
    actions: actionNames.map(name => {
      const actions = rows.flatMap(r => r.actions.filter(a => a.name === name));
      return { name, totalMs: stats(actions.map(a => a.totalMs)), authoredMs: actions[0].authoredMs,
        firstReactCommitMs: stats(actions.map(a => a.firstReactCommitMs)), worstFrameMs: stats(actions.map(a => a.frames.max)),
        timerOverdueMaxMs: stats(actions.map(a => Math.max(0, ...a.timerOverdueMs.map(t => t.overdue)))) };
    }) });
}
const result = { schemaVersion: 1, generatedAt: new Date().toISOString(), root, totalRuns: runs.length, groups, runs,
  limitations: ['P95 uses the nearest rank; n=5 cannot establish a population tail. Maxima and raw runs remain available.',
    'Frame intervals overlap action boundaries and are not summed with animation durations. React commits are not measured render CPU time.',
    'Shader program counts are Three live registrations, not a count of native compilations. GPU timing is only present in diagnostic runs.',
    'Geometry/texture counts are retained Three resources, not GPU bytes or total process memory.',
    'Cold means fresh Chromium process/context/HTTP/JS/WebGL, not a reset of OS/driver caches. Mobile means desktop browser emulation.',
    'Fixture restores between cascade cases are excluded from individual action windows; whole interaction windows include them.',
    'Menu-scene-ready is the first Brasskin/three-ingredient sample, not a promise that all background GLBs have loaded. Workshop-ready follows the native continue click and two animation frames.'] };
if (process.argv.includes('--compact')) delete result.runs; // Complete raw runs remain in the lossless evidence package.
if (output) await writeFile(output, JSON.stringify(result, null, 2));
else console.log(JSON.stringify(result, null, 2));
