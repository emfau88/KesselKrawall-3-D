import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(resolve(here, path), 'utf8');

test('the bakeoff builds for a relative static-hosting base', () => {
    assert.match(read('../vite.config.ts'), /base:\s*['"]\.\/['"]/);
});

test('the bakeoff does not require Editor or MCP state', () => {
    const contract = read('../src/app/experimentContract.ts');
    assert.match(contract, /editorRequired:\s*false/);
    assert.match(contract, /mcpRequired:\s*false/);
    assert.match(contract, /productionEntryUntouched:\s*true/);
});

test('the product core is not imported before PC-C7', () => {
    assert.doesNotMatch(read('../src/App.tsx'), /src\/core|@kessel\/core/);
});
