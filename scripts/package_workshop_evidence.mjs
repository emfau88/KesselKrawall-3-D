import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, dirname, resolve } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { existsSync } from 'node:fs';

// Offline, lossless evidence packaging; never modifies the source recordings.
const source = resolve(process.argv[2] ?? 'outputs/workshop-purchase-performance');
const out = resolve(process.argv[3] ?? 'docs/qa/workshop-purchase-performance/evidence');
assert.notEqual(source, out);
const sha = b => createHash('sha256').update(b).digest('hex');
const manifest = { generatedAt: new Date().toISOString(), source, files: [], totalBytes: 0,
  description: 'Exact original JSON/CPU-profile bytes in gzip; traces already compressed. SHA-256 verifies compressed and original bytes. Browser data is isolated to this local game.' };
async function packDirectory(name, filter = () => true) {
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (filter(entry.name) && /\.(json|cpuprofile|gz|png)$/.test(entry.name)) {
        const bytes = await readFile(path);
        const compressed = !/\.(gz|png)$/.test(entry.name);
        const packed = compressed ? gzipSync(bytes, { level: 9 }) : bytes;
        if (compressed) assert.ok(gunzipSync(packed).equals(bytes));
        const file = relative(source, path).replaceAll('\\', '/') + (compressed ? '.gz' : '');
        const destination = join(out, file);
        await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, packed);
        manifest.files.push({ file, originalBytes: bytes.length, bytes: packed.length, sha256: sha(bytes), packedSha256: sha(packed), gzip: compressed || entry.name.endsWith('.gz') });
        manifest.totalBytes += packed.length;
      }
    }
  }
  await walk(join(source, name));
}
for (const name of ['baseline-trace', 'constant-light-control', 'final-trace', 'gpu-baseline', 'gpu-control', 'matrix', 'combat-regression', 'combat-smoke', 'functional-workshop']) {
  if (existsSync(join(source, name))) await packDirectory(name, file => name !== 'combat-regression' || file === 'summary.json' || file === 'baseline-desktop-polish-r1-cold.json');
}
await mkdir(out, { recursive: true });
await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ files: manifest.files.length, bytes: manifest.totalBytes }));
