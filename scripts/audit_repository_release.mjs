import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const out = resolve('outputs/repository-consolidation');
const snapshotPath = join(out, 'before.json');
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
if (process.argv.includes('--verify-local')) {
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  for (const file of snapshot.localWork) if (await hash(file.path) !== file.sha256) throw new Error(`Local work changed: ${file.path}`);
  console.log(`Preserved ${snapshot.localWork.length} pre-existing local files byte-for-byte.`);
} else {
  const latest = git('rev-parse', 'origin/codex/workshop-purchase-performance');
  const refs = git('for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes/origin').split('\n').filter(r => r !== 'refs/remotes/origin/HEAD');
  const branches = refs.map(ref => ({ ref, commit: git('rev-parse', ref),
    countsLatestVsRef: git('rev-list', '--left-right', '--count', `${latest}...${ref}`),
    containedInLatest: execFileSync('git', ['merge-base', latest, ref], { encoding: 'utf8' }).trim() === git('rev-parse', ref) }));
  const tracked = git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean);
  const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(p => p && p !== 'scripts/audit_repository_release.mjs');
  const localWork = [];
  for (const path of new Set([...tracked, ...untracked])) {
    const destination = join(out, 'preserved-local-work', path);
    await mkdir(dirname(destination), { recursive: true }); await copyFile(path, destination);
    localWork.push({ path, sha256: await hash(path), tracked: tracked.includes(path) });
  }
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'preserved-local-work.patch'), execFileSync('git', ['diff', '--binary', 'HEAD']));
  const snapshot = { createdAt: new Date().toISOString(), latest, publishedMaster: git('rev-parse', 'origin/master'), localMaster: git('rev-parse', 'master'), branches, localWork };
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify(snapshot, null, 2));
}
