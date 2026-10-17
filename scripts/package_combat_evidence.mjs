import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

// Offline packaging only. Source files are read unchanged; gzip contains their
// exact original JSON bytes. Run after the benchmark has finished writing.
// node scripts/package_combat_evidence.mjs outputs/.../matrix-desktop outputs/.../matrix-mobile --out=docs/qa/first-combat-performance/measurements
const argv = process.argv.slice(2);
const opt = (name, fallback) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const inputPaths = argv.filter(a => !a.startsWith('--')).map(name => resolve(name));
assert.ok(inputPaths.length > 0, 'Pass one or more completed matrix directories');
const out = resolve(opt('out', 'docs/qa/first-combat-performance/measurements'));
const inputNames = inputPaths.map(path => basename(path));
assert.equal(new Set(inputNames.map(name => name.toLowerCase())).size, inputNames.length, 'Input directory basenames must be unique');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function inside(directory, path) {
  const rel = relative(directory, path);
  return rel !== '' && !rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel);
}
const manifest = {
  schemaVersion: 1, generatedAt: new Date().toISOString(),
  description: 'Lossless gzip copies of completed combat benchmark raw JSON. Decompressing each .json.gz reproduces the source JSON bytes exactly. Original source directories are not modified.',
  compression: 'gzip, level 9', matrices: [], totals: { matrices: 0, samples: 0, rawFiles: 0, originalBytes: 0, compressedBytes: 0 },
};

// Validate completion, references and output names before producing artifacts.
const matrices = [];
for (const input of inputPaths) {
  assert.ok((await stat(input)).isDirectory(), `Input must be a matrix directory: ${input}`);
  const summaryPath = join(input, 'summary.json');
  const summaryBytes = await readFile(summaryPath);
  const summary = JSON.parse(summaryBytes.toString('utf8'));
  assert.ok(summary.completedAt, `Matrix lacks completion timestamp: ${summaryPath}`);
  assert.ok(summary.groups?.length > 0 && summary.groups.every(group => group.completed), `Matrix has incomplete groups: ${summaryPath}`);
  assert.ok(summary.samples?.length > 0 && summary.samples.every(sample => sample.fullNativeResultReached && !sample.errors?.length), `Matrix contains incomplete or erroneous native results: ${summaryPath}`);
  if (summary.expectedSamples !== undefined) assert.equal(summary.samples.length, summary.expectedSamples, `Matrix sample count differs from expectation: ${summaryPath}`);
  if (summary.expectedGroups !== undefined) assert.equal(summary.groups.length, summary.expectedGroups, `Matrix group count differs from expectation: ${summaryPath}`);
  const references = [...new Set(summary.samples.map(sample => sample.file))];
  const packedReferences = references.map(file => String(file).endsWith('.gz') ? file : `${file}.gz`);
  assert.equal(new Set(packedReferences.map(file => file.toLowerCase())).size, packedReferences.length, `Raw output filenames collide: ${summaryPath}`);
  for (const file of references) {
    assert.ok(typeof file === 'string' && file.length > 0, 'Every sample must reference its raw file');
    assert.ok(inside(input, resolve(input, file)), `Raw reference escapes input matrix: ${file}`);
  }
  const destination = join(out, basename(input));
  assert.notEqual(destination.toLowerCase(), input.toLowerCase(), 'Output must not overwrite its source matrix');
  matrices.push({ input, destination, summaryPath, summaryBytes, summary, references });
}

await mkdir(out, { recursive: true });
for (const { input, destination, summaryPath, summaryBytes, summary, references } of matrices) {
  await mkdir(destination, { recursive: true });
  const matrix = {
    name: basename(input), sourceDirectory: input, samples: summary.samples.length,
    completedGroups: summary.groups.length, summary: { sourceFile: summaryPath, originalSha256: sha256(summaryBytes), originalBytes: summaryBytes.length },
    files: [], originalBytes: 0, compressedBytes: 0,
  };
  const packedNames = new Map();
  for (const file of references) {
    const source = resolve(input, file);
    const encoded = await readFile(source);
    // Repack already-gzipped input losslessly too, without a double .gz suffix.
    const original = file.endsWith('.gz') ? gunzipSync(encoded) : encoded;
    const compressed = gzipSync(original, { level: 9 });
    assert.ok(gunzipSync(compressed).equals(original), `Gzip round-trip mismatch: ${file}`);
    const packedFile = file.endsWith('.gz') ? file : `${file}.gz`;
    const packedPath = resolve(destination, packedFile);
    assert.ok(inside(destination, packedPath), `Raw output escapes packaged matrix: ${packedFile}`);
    await mkdir(dirname(packedPath), { recursive: true });
    await writeFile(packedPath, compressed);
    packedNames.set(file, packedFile);
    matrix.files.push({
      sourceFile: file, file: relative(out, packedPath).split(sep).join('/'),
      originalSha256: sha256(original), compressedSha256: sha256(compressed),
      originalBytes: original.length, compressedBytes: compressed.length,
    });
    matrix.originalBytes += original.length; matrix.compressedBytes += compressed.length;
  }
  const portable = structuredClone(summary);
  for (const sample of portable.samples) sample.file = packedNames.get(sample.file);
  portable.evidencePackage = {
    format: 'gzip-json', lossless: true,
    originalSummarySha256: matrix.summary.originalSha256,
    manifest: '../manifest.json',
  };
  const portableBytes = Buffer.from(`${JSON.stringify(portable, null, 2)}\n`);
  const packedSummary = join(destination, 'summary.json');
  await writeFile(packedSummary, portableBytes);
  Object.assign(matrix.summary, { file: relative(out, packedSummary).split(sep).join('/'), portableSha256: sha256(portableBytes), portableBytes: portableBytes.length });
  manifest.matrices.push(matrix);
  manifest.totals.matrices++; manifest.totals.samples += matrix.samples; manifest.totals.rawFiles += matrix.files.length;
  manifest.totals.originalBytes += matrix.originalBytes; manifest.totals.compressedBytes += matrix.compressedBytes;
  console.log(JSON.stringify({ matrix: matrix.name, files: matrix.files.length, originalBytes: matrix.originalBytes, compressedBytes: matrix.compressedBytes }));
}
await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const mib = bytes => (bytes / 1024 / 1024).toFixed(2);
const markdown = [
  '# Komprimierte Rohmessungen', '',
  `${manifest.totals.samples} abgeschlossene Kämpfe in ${manifest.totals.matrices} Matrizen. ${manifest.totals.rawFiles} Rohdateien: ${mib(manifest.totals.originalBytes)} MiB JSON → ${mib(manifest.totals.compressedBytes)} MiB gzip.`, '',
  'Die ursprünglichen JSON-Bytes bleiben beim Entpacken vollständig erhalten. SHA-256-Werte prüfen sowohl die entpackte Originaldatei als auch das gespeicherte gzip. Die portablen summary.json-Dateien verweisen direkt auf die komprimierten Dateien und funktionieren mit scripts/summarize_combat_matrix.mjs.', '',
  '| Matrix | Kämpfe | Rohdateien | Original MiB | gzip MiB |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...manifest.matrices.map(m => `| [${m.name}](${m.name}/summary.json) | ${m.samples} | ${m.files.length} | ${mib(m.originalBytes)} | ${mib(m.compressedBytes)} |`), '',
  'Vollständige Dateigrößen und SHA-256-Nachweise stehen in [manifest.json](manifest.json). Die Quellverzeichnisse wurden nicht geändert.', '',
].join('\n');
await writeFile(join(out, 'manifest.md'), markdown);
console.log(JSON.stringify({ ...manifest.totals, manifest: join(out, 'manifest.json') }));
