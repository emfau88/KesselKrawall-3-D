import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Offline analysis only: consumes the benchmark's browser probe, CDP trace and
// sampled CPU profile. No browser, renderer or game state is changed.
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/analyze_combat_trace.mjs run.json [output.json]');
const stem = input.replace(/\.json$/, '');
const run = JSON.parse(fs.readFileSync(input, 'utf8'));
const data = run.data;
const tracePath = `${stem}.trace.json.gz`;
const profilePath = `${stem}.cpuprofile`;
const events = fs.existsSync(tracePath)
  ? JSON.parse(zlib.gunzipSync(fs.readFileSync(tracePath))).traceEvents : [];
const profile = fs.existsSync(profilePath)
  ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : null;
const round = n => Math.round(n * 1000) / 1000;
const median = values => {
  const a = [...values].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : null;
};
const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const unionDuration = ranges => {
  const sorted = ranges.filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let total = 0, end = -Infinity;
  for (const [a, b] of sorted) {
    total += Math.max(0, b - Math.max(a, end));
    end = Math.max(end, b);
  }
  return total;
};

// performance.now() and trace timestamps have different origins. Match the
// User Timing markers instead of assuming navigationStart is exactly timeOrigin.
const remainingMarks = [...(data.marks ?? [])];
const matched = [];
for (const event of events.filter(e => e.name.startsWith('kk:'))) {
  const index = remainingMarks.findIndex(m => `kk:${m.name}` === event.name);
  if (index >= 0) {
    const [mark] = remainingMarks.splice(index, 1);
    matched.push(event.ts - mark.t * 1000);
  }
}
const originUs = median(matched);
const rendererThread = events.find(e => e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
const gpuThread = events.find(e => e.name === 'thread_name' && e.args?.name === 'CrGpuMain');
const mainEvents = events.filter(e => e.ph === 'X' && e.pid === rendererThread?.pid && e.tid === rendererThread?.tid);
const angleWorkers = events.filter(e => e.ph === 'X' && e.name === 'ANGLEPlatformImpl::RunWorkerTask');
const gcEvents = mainEvents.filter(e => /^(V8\.GC|MajorGC|MinorGC|GCEvent)/.test(e.name));
const nodes = new Map(profile?.nodes.map(n => [n.id, n]) ?? []);
let sampleTime = profile?.startTime ?? 0;
const samples = profile?.samples.map((id, i) => {
  const delta = profile.timeDeltas[i];
  const sample = { id, start: sampleTime, end: sampleTime + delta };
  sampleTime += delta;
  return sample;
}) ?? [];

function sampledWallAttribution(startUs, endUs) {
  const totals = new Map();
  for (const sample of samples) {
    const us = overlap(startUs, endUs, sample.start, sample.end);
    if (!us) continue;
    const frame = nodes.get(sample.id)?.callFrame;
    const name = frame?.functionName || '(anonymous)';
    const key = `${name}|${frame?.url ?? ''}`;
    const entry = totals.get(key) ?? { name, url: frame?.url ?? '', ms: 0 };
    entry.ms += us / 1000;
    totals.set(key, entry);
  }
  return [...totals.values()].sort((a, b) => b.ms - a.ms).slice(0, 12).map(e => ({ ...e, ms: round(e.ms) }));
}

function intervalEvidence(t, ms) {
  const end = t + ms;
  const calls = (data.glSlow ?? []).filter(c => overlap(t, end, c.t, c.t + c.ms) > 0);
  const byName = {};
  for (const call of calls) {
    const e = byName[call.name] ??= { calls: 0, overlappedWallMs: 0, maxCallMs: 0 };
    e.calls++;
    e.overlappedWallMs += overlap(t, end, call.t, call.t + call.ms);
    e.maxCallMs = Math.max(e.maxCallMs, call.ms);
  }
  for (const e of Object.values(byName)) {
    e.overlappedWallMs = round(e.overlappedWallMs);
    e.maxCallMs = round(e.maxCallMs);
  }
  const startUs = originUs === null ? null : originUs + t * 1000;
  const endUs = startUs === null ? null : startUs + ms * 1000;
  const task = startUs === null ? null : mainEvents
    .filter(e => e.name === 'ThreadControllerImpl::RunTask' && overlap(startUs, endUs, e.ts, e.ts + e.dur) > ms * 900)
    .sort((a, b) => b.dur - a.dur)[0];
  const workers = startUs === null ? [] : angleWorkers.filter(e => overlap(startUs, endUs, e.ts, e.ts + e.dur));
  const gcRanges = startUs === null ? [] : gcEvents.map(e => [Math.max(startUs, e.ts), Math.min(endUs, e.ts + e.dur)]);
  return {
    glSlow: byName,
    programIds: calls.filter(c => c.name === 'getProgramInfoLog').map(c => c.program?.id).filter(Boolean),
    mainTask: task ? { wallMs: round(task.dur / 1000), threadCpuMs: round((task.tdur ?? 0) / 1000) } : null,
    angleWorkerTasks: workers.length,
    // Worker task CPU is clipped proportionally at boundaries; tasks are not
    // nested because only the ANGLE leaf event is selected.
    angleWorkerThreadCpuMs: round(workers.reduce((sum, e) => sum + (e.tdur ?? 0) * overlap(startUs, endUs, e.ts, e.ts + e.dur) / e.dur / 1000, 0)),
    mainThreadGcUnionMs: round(unionDuration(gcRanges) / 1000),
    cpuProfileSampledWallAttribution: startUs === null ? [] : sampledWallAttribution(startUs, endUs),
    resourceCompletions: (data.resources ?? []).filter(r => r.start + r.ms >= t && r.start + r.ms <= end)
      .map(r => ({ name: r.name, completionMs: round(r.start + r.ms), durationMs: round(r.ms) })),
  };
}

const phases = [...new Set((data.frames ?? []).map(f => f.phase))];
const summary = {
  label: run.label,
  input: path.relative(process.cwd(), input).replaceAll('\\', '/'),
  alignment: { originUs, matchedUserTimingMarks: matched.length, markerSpreadUs: matched.length ? round(Math.max(...matched) - Math.min(...matched)) : null },
  rendererThread: rendererThread ? { pid: rendererThread.pid, tid: rendererThread.tid } : null,
  gpuThread: gpuThread ? { pid: gpuThread.pid, tid: gpuThread.tid } : null,
  environment: { browser: data.browser, gpu: data.gpu, experiments: data.experiments },
  marks: data.marks,
  phases: phases.map(phase => {
    const frames = data.frames.filter(f => f.phase === phase).map(f => f.ms);
    const tasks = data.longTasks.filter(f => f.phase === phase);
    const gpuMs = (data.gpuTimes ?? []).filter(g => {
      const frame = data.frames.find(f => f.t >= g.t);
      return frame?.phase === phase;
    }).map(g => g.ms);
    return { phase, frameCount: frames.length, medianFrameMs: median(frames), maxFrameMs: Math.max(...frames), framesOver250ms: frames.filter(ms => ms > 250).length,
      longTaskCount: tasks.length, longTaskTotalMs: round(tasks.reduce((sum, t) => sum + t.ms, 0)), maxLongTaskMs: Math.max(0, ...tasks.map(t => t.ms)),
      gpuSampleCount: gpuMs.length, gpuMedianMs: median(gpuMs), gpuMaxMs: gpuMs.length ? Math.max(...gpuMs) : null };
  }),
  glTotals: data.glTotals,
  slowRenders: (data.renders ?? []).filter(r => r.ms > 250).map(r => ({ ...r, ms: round(r.ms), evidence: intervalEvidence(r.t, r.ms) })),
  slowTasks: (data.longTasks ?? []).filter(r => r.ms > 250).map(r => ({ ...r, evidence: intervalEvidence(r.t, r.ms) })),
  fullProfileSampledWallAttribution: profile ? sampledWallAttribution(profile.startTime, profile.endTime) : [],
  limits: [
    'CPU-profile sample time is wall-time attribution, not thread CPU consumption; native synchronous waits accrue samples.',
    'Main-task tdur is renderer-thread CPU time. ANGLE worker tdur belongs to GPU-process CPU threads, not GPU hardware execution.',
    'ANGLE worker trace names expose work scheduling but not internal D3D compiler or driver call stacks.',
    'GPU timer queries measure submitted GPU draw work, not CPU shader compilation or synchronous GL API waits; unavailable/lost queries must not be treated as zero.',
    'Timer query data is sparse and asynchronous. The final outstanding queries may not have completed when the snapshot was taken.',
    'Nested trace events are not added together. GC uses the union of renderer-main GC spans.',
    'glSlow only stores calls above the probe threshold; its sum can be lower than glTotals.',
    'Instrumentation and simultaneous CDP tracing/CPU profiling can perturb timing. Use repeated minimally instrumented measurements for acceptance.',
  ],
};
const output = JSON.stringify(summary, null, 2);
if (process.argv[3]) fs.writeFileSync(process.argv[3], `${output}\n`);
else console.log(output);
