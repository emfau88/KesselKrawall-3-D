import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(resolve(here, path), 'utf8');

test('the bakeoff builds for a relative static-hosting base', () => {
    const viteConfig = read('../vite.config.ts');
    assert.match(viteConfig, /base:\s*['"]\.\/['"]/);
    assert.match(viteConfig, /copyPublicDir:\s*false/);
    assert.match(read('../src/assets/sharedAssets.ts'), /new URL\(`\.\.\/\$\{assetPath\}`/);
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

test('PC-C2 references shared hero assets without copying them', () => {
    const registry = read('../src/assets/sharedAssets.ts');
    for (const filename of [
        'hero-workbench.glb',
        'hero-cauldron-player.glb',
        'ingredient-chili.glb',
        'ingredient-slime-shroom.glb',
        'ingredient-rune-shell.glb'
    ]) {
        assert.match(registry, new RegExp(filename.replaceAll('.', '\\.')));
        assert.equal(existsSync(resolve(here, `../../../public/assets/hero/${filename}`)), true);
        assert.equal(existsSync(resolve(here, `../public/assets/hero/${filename}`)), false);
    }
});

test('PC-C2 keeps five centralized ingredient slots', () => {
    const layout = read('../src/scene/layout.ts');
    assert.equal((layout.match(/index:\s*[0-4]/g) ?? []).length, 5);
});
