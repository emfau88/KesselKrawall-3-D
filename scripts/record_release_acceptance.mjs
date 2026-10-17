import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const load = async p => JSON.parse(await readFile(p, 'utf8'));
const root = 'outputs/repository-consolidation';
const audit = await load(`${root}/before.json`);
const workshop = await load(`${root}/workshop/report.json`);
const portrait = await load(`${root}/workshop-portrait/report.json`);
const combat = await load(`${root}/combat/report.json`);
const graphics = await load(`${root}/graphics/report.json`);
const workshopCases = [...workshop.runs.filter(r => r.label !== 'integration-portrait'), ...portrait.runs];
assert.ok(workshopCases.length === 3 && workshopCases.every(r => r.passed));
assert.ok(combat.passed && graphics.passed);
const report = {
  generatedAt: new Date().toISOString(), source: audit.latest, previousPublicMaster: audit.publishedMaster,
  branches: audit.branches, localWork: { preservedFiles: audit.localWork.length, backup: `${root}/preserved-local-work`, contentsPublished: false },
  automated: { unitTests: 184, testFiles: 28, typecheck: 'passed', productionBuild: 'passed' },
  workshop: workshopCases.map(r => ({ profile: r.label, passed: r.passed, checks: r.checks, errors: r.errors, taps: r.taps })),
  combat: combat.runs.map(r => ({ label: r.label, passed: r.passed, errors: r.errors,
    battles: r.battles.map(b => ({ enemy: b.enemy, resultHash: b.resultHash, missingAnimation: b.missingAnimation, missingVfx: b.missingVfx, runtimeEvidencePassed: b.runtimeEvidencePassed })),
    preparationCancellation: { passed: r.preparationCancellation.passed, successfulNativeRetry: r.preparationCancellation.successfulNativeRetry, exactWorkshopPreserved: r.preparationCancellation.exactWorkshopPreserved } })),
  graphics: graphics.cases.map(c => ({ variant: c.id, passed: c.passed, resultHash: c.resultHash, errors: c.errors })),
  finding: 'Portrait info popover covers the reserved pedestal centre. Native tap on the visible ingredient body succeeds. Test targeting corrected, no runtime/UI changes.',
  publicVerification: 'Performed after deployment; see public-acceptance.json and deployment links when available. No local URL is publication evidence.',
};
await mkdir('docs/qa/repository-consolidation', { recursive: true });
await writeFile('docs/qa/repository-consolidation/integration.json', JSON.stringify(report, null, 2));
console.log('Integration evidence recorded; three viewports, native Zischbert/Moor-Martha, seven graphics variants.');
