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

test('PC-C3 defines deterministic desktop, landscape and portrait cameras', () => {
    const data = JSON.parse(read('../src/camera/cameraProfiles.json'));
    assert.deepEqual(Object.keys(data), ['desktop', 'landscape', 'portrait']);
    const implementation = read('../src/camera/cameraProfiles.ts');
    assert.match(implementation, /aspect < 0\.8/);
    assert.match(implementation, /height <= 500 && aspect >= 1\.5/);
    assert.match(implementation, /requestedFov >= 35 && requestedFov <= 45/);
    assert.match(implementation, /orientationchange/);
});

test('PC-C3 uses an explicit look target and automatic canvas resolution', () => {
    const camera = read('../src/camera/ResponsiveCamera.tsx');
    assert.match(camera, /lookAt\(\.\.\.profile\.target\)/);
    assert.match(camera, /Math\.exp\(-7\.5/);
    assert.match(camera, /useAppEvent\('update'/);
    const app = read('../src/App.tsx');
    assert.match(app, /fillMode=\{FILLMODE_FILL_WINDOW\}/);
    assert.match(app, /resolutionMode=\{RESOLUTION_AUTO\}/);
});

test('PC-C3 camera profiles mathematically contain the cauldron and all five slots', () => {
    const profiles = JSON.parse(read('../src/camera/cameraProfiles.json'));
    const viewports = { desktop: [1280, 720], landscape: [844, 390], portrait: [390, 844] };
    const criticalPoints = [
        [-2.75, 2.735, 1.45],
        [-1.48, 2.735, 2.28],
        [0, 2.735, 2.62],
        [1.48, 2.735, 2.28],
        [2.75, 2.735, 1.45],
        [-1.32, 2.735, -1.8],
        [1.32, 5.15, 0.93]
    ];
    const subtract = (left, right) => left.map((value, index) => value - right[index]);
    const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
    const normalize = (vector) => {
        const length = Math.sqrt(dot(vector, vector));
        return vector.map((value) => value / length);
    };
    const cross = (left, right) => [
        left[1] * right[2] - left[2] * right[1],
        left[2] * right[0] - left[0] * right[2],
        left[0] * right[1] - left[1] * right[0]
    ];

    for (const [id, profile] of Object.entries(profiles)) {
        const [width, height] = viewports[id];
        const forward = normalize(subtract(profile.target, profile.position));
        const right = normalize(cross(forward, [0, 1, 0]));
        const up = cross(right, forward);
        const tangent = Math.tan((profile.fov * Math.PI) / 360);
        for (const point of criticalPoints) {
            const relative = subtract(point, profile.position);
            const depth = dot(relative, forward);
            const ndcX = dot(relative, right) / (depth * tangent * (width / height));
            const ndcY = dot(relative, up) / (depth * tangent);
            assert.ok(depth > profile.nearClip && depth < profile.farClip, `${id}: depth outside clipping range`);
            assert.ok(Math.abs(ndcX) <= 0.92, `${id}: horizontal framing exceeded (${ndcX})`);
            assert.ok(Math.abs(ndcY) <= 0.92, `${id}: vertical framing exceeded (${ndcY})`);
        }
    }
});
