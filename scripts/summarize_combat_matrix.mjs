import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

// Offline only: reads completed benchmark summaries and representative raw JSON.
// node scripts/summarize_combat_matrix.mjs path/summary.json other/summary.json --out=docs/qa/first-combat-performance
const argv = process.argv.slice(2);
async function readJson(path) {
  const bytes = await readFile(path);
  return JSON.parse((path.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8'));
}
const opt = (name, fallback) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const rawMode = opt('raw', 'representative');
if (!['representative', 'all'].includes(rawMode)) throw new Error('--raw must be representative or all');
const inputs = [...new Set(await Promise.all(argv.filter(a => !a.startsWith('--')).map(async name => {
  const path = resolve(name);
  return (await stat(path)).isDirectory() ? join(path, 'summary.json') : path;
})))];
if (!inputs.length) throw new Error('Pass one or more matrix summary.json files or their directories');
const out = resolve(opt('out', 'docs/qa/first-combat-performance'));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const keyOf = sample => [sample.build, sample.profile, sample.ingredients, sample.name].join('/');
const sources = [], samples = [], digestMap = new Map(), warnings = [], errors = [];
function addDigest(key, digest, evidence) {
  if (!digest) { errors.push({ type: 'missing-digest', key, evidence }); return; }
  const variants = digestMap.get(key) ?? new Map();
  const occurrences = variants.get(digest) ?? [];
  occurrences.push(evidence); variants.set(digest, occurrences); digestMap.set(key, variants);
}
for (const input of inputs) {
  const doc = await readJson(input);
  const index = sources.length;
  const source = {
    input, startedAt: doc.startedAt, completedAt: doc.completedAt, options: doc.options,
    expectedGroups: doc.expectedGroups ?? null, expectedSamples: doc.expectedSamples ?? null,
    groups: (doc.groups ?? []).map(g => ({ id: g.id, completed: g.completed, build: g.build, profile: g.profile, ingredients: g.ingredients, failure: g.failure ?? null, cancelledMediaRequests: g.cancelledMediaRequests ?? [] })),
    failureHistory: doc.failures ?? [], samples: doc.samples?.length ?? 0,
  };
  sources.push(source);
  if (!doc.completedAt || source.groups.some(g => !g.completed)) warnings.push({ type: 'incomplete-source', input });
  if (doc.expectedSamples !== undefined && doc.expectedSamples !== source.samples) warnings.push({ type: 'sample-count-mismatch', input, expected: doc.expectedSamples, actual: source.samples });
  for (const [key, digest] of Object.entries(doc.deterministicDigests ?? {})) addDigest(key, digest, { input, source: 'summary-dictionary' });
  for (const sample of doc.samples ?? []) {
    samples.push({ ...sample, sourceIndex: index, sourceInput: input, rawFile: resolve(dirname(input), sample.file), requestedWindowMs: doc.options?.activeMs, probeMode: doc.options?.mode, fixtureHash: doc.options?.fixtureHash });
    const expectedDigests = Object.entries(doc.deterministicDigests ?? {}).filter(([key]) => key.startsWith(`${sample.enemy}:`)).map(([, digest]) => digest);
    if (!expectedDigests.includes(sample.resultDigest)) errors.push({ type: 'sample-digest-not-in-summary-dictionary', input, sample: sample.id, digest: sample.resultDigest, expectedDigests });
    if (!sample.fullNativeResultReached) errors.push({ type: 'incomplete-native-result', input, sample: sample.id });
    if (sample.errors?.length) errors.push({ type: 'sample-runtime-errors', input, sample: sample.id, errors: sample.errors });
  }
}

const duplicateIds = Object.entries(Object.groupBy(samples, s => s.id)).filter(([, values]) => values.length > 1).map(([id, values]) => ({ id, inputs: values.map(s => s.sourceInput) }));
if (duplicateIds.length) warnings.push({ type: 'repeated-sample-ids-across-inputs', note: 'Independent input runs are retained. Do not include pilot runs accidentally.', occurrences: duplicateIds });
const configurations = [...new Set(samples.map(keyOf))].sort();
function range(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return { n: 0, min: null, median: null, max: null };
  const half = Math.floor(sorted.length / 2);
  return { n: sorted.length, min: sorted[0], median: sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2, max: sorted.at(-1) };
}
const metricGetters = {
  maxFrameMs: m => m.combat?.maxMs,
  p95FrameMs: m => m.combat?.p95Ms,
  p99FrameMs: m => m.combat?.p99Ms,
  meanFrameMs: m => m.combat?.meanMs,
  meanObservedFps: m => m.combat?.meanMs > 0 ? 1000 / m.combat.meanMs : null,
  maxActiveLongTaskMs: m => m.maxActiveLongTaskMs,
  maxPipelineFrameMs: m => m.pipeline?.maxMs,
  maxPipelineLongTaskMs: m => m.maxLongTaskMs,
  clickToReadyMs: m => m.clickToReadyMs,
  clickToFirstActiveRafMs: m => m.clickToFirstActiveRafMs,
  navigationToWorkshopUsableMs: m => m.navigationToWorkshopUsableMs,
  purchasePresentationMs: m => m.purchasePresentationMs,
  nativeSwapRoundTripMs: m => m.nativeSwapRoundTripMs,
  navigationToReadyMs: m => m.navigationToFirstActiveMs,
  navigationToFirstActiveRafMs: m => Number.isFinite(m.navigationToFirstActiveMs) && Number.isFinite(m.clickToFirstActiveRafMs) ? m.navigationToFirstActiveMs + m.clickToFirstActiveRafMs - m.clickToReadyMs : null,
  actualActiveWindowMs: m => m.activeObservationWallMs,
};
const aggregates = configurations.map(configuration => {
  const rows = samples.filter(s => keyOf(s) === configuration);
  const requestedWindows = [...new Set(rows.map(s => s.requestedWindowMs))];
  const probeModes = [...new Set(rows.map(s => s.probeMode))];
  const fixtureHashes = [...new Set(rows.map(s => s.fixtureHash))];
  if (requestedWindows.length > 1 || probeModes.length > 1 || fixtureHashes.length > 1) warnings.push({ type: 'mixed-configuration', configuration, requestedWindows, probeModes, fixtureHashes });
  return {
    configuration, build: rows[0].build, profile: rows[0].profile, ingredients: rows[0].ingredients, scenario: rows[0].name,
    n: rows.length, requestedWindows, probeModes, fixtureHashes,
    metrics: Object.fromEntries(Object.entries(metricGetters).map(([name, getter]) => [name, range(rows.map(s => getter(s.metrics)))])),
    framesAbove250: rows.reduce((sum, s) => sum + (s.metrics.combat?.above250 ?? 0), 0),
    framesAbove1000: rows.reduce((sum, s) => sum + (s.metrics.combat?.above1000 ?? 0), 0),
    samplesAbove250: rows.filter(s => s.metrics.combat?.above250 > 0).length,
    samplesAbove1000: rows.filter(s => s.metrics.combat?.above1000 > 0).length,
    rawFiles: rows.map(s => s.rawFile),
  };
});
for (const [comparison, rows] of Object.entries(Object.groupBy(samples, s => [s.profile, s.ingredients, s.name].join('/')))) {
  const signatures = [...new Set(rows.map(s => JSON.stringify({ windowMs: s.requestedWindowMs, probeMode: s.probeMode, fixtureHash: s.fixtureHash })))];
  if (signatures.length > 1) warnings.push({ type: 'cross-build-comparability-mismatch', comparison, signatures });
}

// First and last sample of every aggregate are independent raw-file spot checks.
// --raw=all expands the exact same checks to every recorded fight.
const auditSamples = rawMode === 'all' ? samples : [...new Set(configurations.flatMap(key => {
  const rows = samples.filter(s => keyOf(s) === key);
  return [rows[0], rows.at(-1)];
}))];
const rawAudits = [], bufferByProfile = new Map(), gpuByProfile = new Map();
for (const sample of auditSamples) {
  let raw;
  try { raw = await readJson(sample.rawFile); }
  catch (error) { errors.push({ type: 'raw-file-read', sample: sample.id, path: sample.rawFile, message: error.message }); continue; }
  const profile = typeof raw.profile === 'object' ? raw.profile : { viewport: raw.environment?.viewport, name: raw.profile };
  const expected = { width: profile.viewport?.width, height: profile.viewport?.height, dpr: raw.environment?.dpr ?? 1 };
  const buffer = raw.data?.currentBuffer ?? null;
  const initialBuffer = raw.data?.gpu?.drawingBuffer;
  const audit = { id: sample.id, file: sample.rawFile, configuration: keyOf(sample), expectedBuffer: expected, currentBuffer: buffer, initialBuffer, browserDpr: raw.data?.browser?.dpr, gpu: raw.data?.gpu?.renderer, nativeResult: raw.fullNativeResultReached, errors: [] };
  if (!buffer) warnings.push({ type: 'legacy-initial-buffer-only', file: sample.rawFile });
  else {
    if (buffer.width !== expected.width || buffer.height !== expected.height || buffer.dpr !== expected.dpr) audit.errors.push('Drawing buffer/DPR differs from requested viewport');
    if (raw.data?.browser?.dpr !== expected.dpr) audit.errors.push('Browser DPR differs from requested DPR');
    const entries = bufferByProfile.get(sample.profile) ?? [];
    entries.push({ buffer, build: sample.build, file: sample.rawFile }); bufferByProfile.set(sample.profile, entries);
  }
  const gpuEntries = gpuByProfile.get(sample.profile) ?? [];
  gpuEntries.push({ renderer: raw.data?.gpu?.renderer, browser: raw.environment?.browser?.product, file: sample.rawFile }); gpuByProfile.set(sample.profile, gpuEntries);
  if (raw.id !== sample.id) audit.errors.push('Raw and summary sample IDs differ');
  if (raw.resultDigest !== sample.resultDigest) audit.errors.push('Raw and summary combat digests differ');
  if (raw.pendingBattle && sha(raw.pendingBattle) !== sample.resultDigest) audit.errors.push('Recomputed raw pendingBattle digest differs');
  if (raw.fixture) addDigest(`${raw.enemy}:${sha(raw.fixture.board)}:${raw.fixture.rngState}:${raw.fixture.opponentVariant}`, raw.resultDigest, { file: sample.rawFile, source: 'raw-result' });
  for (const [name, getter] of Object.entries(metricGetters)) if (getter(raw.metrics) !== getter(sample.metrics)) audit.errors.push(`Raw and summary metric differ: ${name}`);
  if (audit.errors.length) errors.push({ type: 'raw-audit', ...audit });
  rawAudits.push(audit);
}
const bufferComparisons = [...bufferByProfile].map(([profile, entries]) => ({ profile, signatures: [...new Set(entries.map(e => JSON.stringify(e.buffer)))], filesChecked: entries.length, builds: [...new Set(entries.map(e => e.build))] }));
for (const comparison of bufferComparisons) if (comparison.signatures.length > 1) errors.push({ type: 'cross-build-buffer-mismatch', ...comparison });
const hardwareComparisons = [...gpuByProfile].map(([profile, entries]) => ({ profile, renderers: [...new Set(entries.map(e => e.renderer))], browsers: [...new Set(entries.map(e => e.browser))], filesChecked: entries.length }));
for (const comparison of hardwareComparisons) if (comparison.renderers.length > 1 || comparison.browsers.length > 1) warnings.push({ type: 'mixed-browser-or-gpu', ...comparison });
const digests = [...digestMap].map(([key, variants]) => ({ key, consistent: variants.size === 1, variants: [...variants].map(([digest, evidence]) => ({ digest, evidence })) }));
for (const digest of digests) if (!digest.consistent) errors.push({ type: 'deterministic-result-mismatch', ...digest });
const totals = {
  inputs: sources.length, samples: samples.length, configurations: aggregates.length,
  completedGroups: sources.reduce((sum, s) => sum + s.groups.filter(g => g.completed).length, 0),
  incompleteGroups: sources.reduce((sum, s) => sum + s.groups.filter(g => !g.completed).length, 0),
  failureHistory: sources.reduce((sum, s) => sum + s.failureHistory.length, 0),
  samplesWithRuntimeErrors: samples.filter(s => s.errors?.length).length,
  intentionalCancelledMediaRequests: sources.reduce((sum, s) => sum + s.groups.reduce((n, g) => n + g.cancelledMediaRequests.length, 0), 0),
  framesAbove250: aggregates.reduce((sum, a) => sum + a.framesAbove250, 0),
  framesAbove1000: aggregates.reduce((sum, a) => sum + a.framesAbove1000, 0),
  rawFilesAudited: rawAudits.length, digestKeys: digests.length, digestMismatches: digests.filter(d => !d.consistent).length,
  auditErrors: errors.length, warnings: warnings.length,
};
const result = { schemaVersion: 1, generatedAt: new Date().toISOString(), rawMode, totals, sources, aggregates, digests, bufferComparisons, hardwareComparisons, rawAudits, duplicateIds, warnings, errors };
await mkdir(out, { recursive: true });
await writeFile(join(out, 'matrix-summary.json'), JSON.stringify(result, null, 2));
const number = value => Number.isFinite(value) ? value.toFixed(1) : '—';
const triple = value => value.n ? `${number(value.min)} / ${number(value.median)} / ${number(value.max)}` : '—';
const cell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const table = (headers, rows) => `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map(row => `| ${row.map(cell).join(' | ')} |`).join('\n')}`;
const md = [
  '# Generierte Kampf-Performance-Matrix',
  '',
  `${totals.inputs} Eingabedateien, ${totals.completedGroups} vollständige Sitzungsgruppen, ${totals.samples} Kämpfe, ${totals.configurations} Konfigurationen. Alle Zeitspalten in Millisekunden als **Minimum / Median / Maximum** der unabhängigen Messungen.`,
  '',
  'rAF-Intervalle sind beobachtete Frameabstände einschließlich Browser-/Treiberwartezeit, keine isolierte GPU-Zeit. Mobile bedeutet Browseremulation auf dem Desktop-GPU-System. Combat enthält Phasengrenzen; Pipeline umfasst zusätzlich den Übergang ab nativem Klick und das Preparation-Gate. Ein blockierter Main Thread kann das tatsächliche Messfenster über die geplante Dauer hinaus verlängern; solche Intervalle werden erhalten.',
  '',
  '## Aktiver Kampf',
  '',
  table(['Build / Format / Zutaten / Szenario', 'n', 'Max. Frame', 'p95 Frame', 'Max. Long Task', 'Frames >250 / >1000', 'Betroffene Läufe >250 / >1000'], aggregates.map(a => [a.configuration, a.n, triple(a.metrics.maxFrameMs), triple(a.metrics.p95FrameMs), triple(a.metrics.maxActiveLongTaskMs), `${a.framesAbove250} / ${a.framesAbove1000}`, `${a.samplesAbove250} / ${a.samplesAbove1000}`])),
  '',
  '## Bereitschaft und Kauf',
  '',
  table(['Konfiguration', 'Klick → bereit', 'Klick → erster aktiver rAF', 'Navigation → Werkbank', 'Kauf / Merge', 'Navigation → bereit', 'Navigation → erster aktiver rAF'], aggregates.map(a => [a.configuration, triple(a.metrics.clickToReadyMs), triple(a.metrics.clickToFirstActiveRafMs), triple(a.metrics.navigationToWorkshopUsableMs), triple(a.metrics.purchasePresentationMs), triple(a.metrics.navigationToReadyMs), triple(a.metrics.navigationToFirstActiveRafMs)])),
  '',
  'Die Navigationszeiten schließen die automatisierten nativen UI-Schritte bis zum Kampf ein. Sie sind keine reine Download- oder GPU-Initialisierungsdauer. Folgekämpfe ohne Reload haben deshalb keine neue Navigationszeit.',
  '',
  '## Gesamter Übergang und Messdauer',
  '',
  table(['Konfiguration', 'Pipeline max. Frame', 'Pipeline max. Long Task', 'Tatsächliches aktives Fenster', 'Geplantes Fenster'], aggregates.map(a => [a.configuration, triple(a.metrics.maxPipelineFrameMs), triple(a.metrics.maxPipelineLongTaskMs), triple(a.metrics.actualActiveWindowMs), a.requestedWindows.join(', ')])),
  '',
  '## Offline-Prüfung',
  '',
  `Ergebnis-Hashes: ${totals.digestKeys} Fixture-/Gegner-Schlüssel, ${totals.digestMismatches} Widersprüche. ${totals.rawFilesAudited} Rohdateien geprüft (${rawMode}); ${totals.auditErrors} Prüffehler. ${totals.incompleteGroups} unvollständige Gruppen, ${totals.failureHistory} Einträge in der Fehlerhistorie, ${totals.samplesWithRuntimeErrors} Messungen mit Laufzeitfehlern. ${totals.intentionalCancelledMediaRequests} separat protokollierte, gezielt abgebrochene Musikstreams.`,
  '',
  table(['Format', 'Aktueller Drawing Buffer / DPR', 'Geprüfte Rohdateien', 'Builds'], bufferComparisons.map(b => [b.profile, b.signatures.join('; '), b.filesChecked, b.builds.join(', ')])),
  '',
  'Fehlende aktuelle Bufferdaten werden als historische Einschränkung ausgewiesen und nicht durch den beim Rendererstart erfassten Wert ersetzt. JSON enthält Hashnachweise, einzelne Rohdateiprüfungen, Browser-/GPU-Vergleich, Fehlerhistorie und Warnungen.',
  '',
  ...(warnings.length ? ['### Warnungen', '', ...warnings.map(w => `- ${cell(JSON.stringify(w))}`), ''] : []),
  ...(errors.length ? ['### Prüffehler', '', ...errors.map(e => `- ${cell(JSON.stringify(e))}`), ''] : []),
  '## Eingaben', '', ...sources.map(s => `- ${s.input}`), '',
].join('\n');
await writeFile(join(out, 'matrix-summary.md'), md);
console.log(JSON.stringify({ ...totals, json: join(out, 'matrix-summary.json'), markdown: join(out, 'matrix-summary.md') }));
if (errors.length) process.exitCode = 1;
