import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Matrix4, Quaternion, Ray, Vector3 } from 'three';

// node --test scripts/test_mockup_assets.mjs
// Source integrity and technical export checks, not a claim of final art or FPS.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'art/source/mockup-runtime-manifest.json'), 'utf8'));
const variants = ['desktop', 'mobile'];
const ceilings = {
  'ritual-platform': [20_000, 10_000],
  'witch-workbench': [16_000, 8_000],
  'triple-candleholder': [4_000, 2_000],
  'open-grimoire': [6_000, 3_000],
  'dungeon-wall-module': [6_000, 3_000],
  'dungeon-stone-arch': [8_000, 4_000],
  'alchemy-shelf': [12_000, 6_000],
  'wall-candle-sconce': [3_000, 1_500],
  'dungeon-stone-pillar': [6_000, 3_000],
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const cache = new Map();
const componentReaders = {
  5121: { bytes: 1, read: (b, o) => b.readUInt8(o) },
  5123: { bytes: 2, read: (b, o) => b.readUInt16LE(o) },
  5125: { bytes: 4, read: (b, o) => b.readUInt32LE(o) },
  5126: { bytes: 4, read: (b, o) => b.readFloatLE(o) },
};
const typeWidths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const nearlyEqual = (actual, expected, tolerance, label) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `${label}: ${actual} differs from ${expected} by more than ${tolerance}`,
);

function loadGlb(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const bytes = readFileSync(path.join(root, relative));
  assert.ok(bytes.length >= 28, `${relative}: complete binary header`);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'GLB version');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'declared GLB length');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    assert.ok(offset + 8 <= bytes.length, 'complete chunk header');
    const length = bytes.readUInt32LE(offset);
    assert.equal(length % 4, 0, 'aligned chunk');
    assert.ok(offset + 8 + length <= bytes.length, 'chunk remains in file');
    chunks.push({ type: bytes.readUInt32LE(offset + 4), data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  assert.equal(chunks[0].type, 0x4e4f534a, 'JSON first');
  const json = JSON.parse(chunks[0].data.toString('utf8').trim());
  assert.equal(json.asset.version, '2.0', 'glTF version');
  const binaries = chunks.filter((chunk) => chunk.type === 0x004e4942);
  assert.equal(binaries.length, 1, 'one embedded binary chunk');
  assert.equal(json.buffers.length, 1, 'one embedded buffer');
  assert.equal(json.buffers[0].uri, undefined, 'no external mesh dependency');
  const binary = binaries[0].data;
  assert.ok(json.buffers[0].byteLength <= binary.length, 'buffer fits in BIN');
  assert.ok(binary.length - json.buffers[0].byteLength <= 3, 'valid binary padding');
  for (const view of json.bufferViews) {
    assert.equal(view.buffer, 0);
    assert.ok(Number.isInteger(view.byteLength) && view.byteLength > 0);
    assert.ok(Number.isInteger(view.byteOffset ?? 0) && (view.byteOffset ?? 0) >= 0);
    assert.ok((view.byteOffset ?? 0) + view.byteLength <= json.buffers[0].byteLength, 'view in buffer');
  }
  const result = { bytes, json, binary, accessorCache: new Map() };
  cache.set(relative, result);
  return result;
}

function accessor(glb, index) {
  if (glb.accessorCache.has(index)) return glb.accessorCache.get(index);
  const description = glb.json.accessors[index];
  assert.ok(description, `accessor ${index} exists`);
  const reader = componentReaders[description.componentType];
  const width = typeWidths[description.type];
  assert.ok(reader && width, 'export uses supported component/type');
  assert.ok(!description.sparse, 'prepared static exports do not need sparse accessors');
  assert.ok(!description.normalized, 'prepared exports use explicit float attributes and integer indices');
  assert.ok(Number.isInteger(description.count) && description.count > 0);
  const view = glb.json.bufferViews[description.bufferView];
  assert.ok(view, 'accessor view exists');
  const start = description.byteOffset ?? 0;
  const stride = view.byteStride ?? width * reader.bytes;
  assert.ok(stride >= width * reader.bytes, 'stride contains a complete element');
  assert.ok(start + (description.count - 1) * stride + width * reader.bytes <= view.byteLength, 'accessor in view');
  const values = new Float64Array(description.count * width);
  for (let i = 0; i < description.count; i++) {
    for (let component = 0; component < width; component++) {
      values[i * width + component] = reader.read(
        glb.binary, (view.byteOffset ?? 0) + start + i * stride + component * reader.bytes,
      );
    }
  }
  const result = { values, width, description };
  glb.accessorCache.set(index, result);
  return result;
}

function nodeMatrix(node) {
  if (node.matrix) {
    assert.equal(node.matrix.length, 16);
    assert.ok(node.matrix.every(Number.isFinite));
    return new Matrix4().fromArray(node.matrix);
  }
  const t = node.translation ?? [0, 0, 0];
  const r = node.rotation ?? [0, 0, 0, 1];
  const s = node.scale ?? [1, 1, 1];
  assert.ok([...t, ...r, ...s].every(Number.isFinite), 'finite node TRS');
  return new Matrix4().compose(new Vector3(...t), new Quaternion(...r), new Vector3(...s));
}

function sceneNodes(glb) {
  if (glb.sceneNodes) return glb.sceneNodes;
  const scene = glb.json.scenes[glb.json.scene ?? 0];
  assert.ok(scene.nodes.length > 0, 'nonempty default scene');
  const found = [];
  function visit(index, parent, ancestors) {
    assert.ok(!ancestors.has(index), 'acyclic node tree');
    const node = glb.json.nodes[index];
    assert.ok(node, 'node exists');
    const world = parent.clone().multiply(nodeMatrix(node));
    found.push({ node, world });
    const next = new Set(ancestors).add(index);
    for (const child of node.children ?? []) visit(child, world, next);
  }
  for (const index of scene.nodes) visit(index, new Matrix4(), new Set());
  glb.sceneNodes = found;
  return found;
}

function primitives(glb) {
  return sceneNodes(glb).flatMap(({ node, world }) => node.mesh === undefined ? []
    : glb.json.meshes[node.mesh].primitives.map((primitive) => ({ primitive, world })));
}

function geometry(glb) {
  if (glb.geometry) return glb.geometry;
  const found = primitives(glb).map(({ primitive, world }) => {
    assert.equal(primitive.mode ?? 4, 4, 'triangle primitive');
    const positions = accessor(glb, primitive.attributes.POSITION);
    assert.equal(positions.width, 3);
    const worldPositions = new Float64Array(positions.values.length);
    const p = new Vector3();
    for (let i = 0; i < positions.values.length; i += 3) {
      p.fromArray(positions.values, i).applyMatrix4(world).toArray(worldPositions, i);
    }
    assert.ok(worldPositions.every(Number.isFinite), 'finite world positions');
    const indices = primitive.indices === undefined ? null : accessor(glb, primitive.indices);
    if (indices) {
      assert.equal(indices.width, 1);
      assert.ok([5121, 5123, 5125].includes(indices.description.componentType));
      assert.ok(indices.values.every((i) => Number.isInteger(i) && i >= 0 && i < positions.description.count), 'indices in vertex range');
    }
    const count = indices?.description.count ?? positions.description.count;
    assert.equal(count % 3, 0, 'whole triangles');
    return { primitive, positions, worldPositions, indices: indices?.values, count };
  });
  assert.ok(found.length > 0, 'mesh geometry exists');
  glb.geometry = found;
  return found;
}

function bounds(glb) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const item of geometry(glb)) {
    for (let i = 0; i < item.worldPositions.length; i++) {
      min[i % 3] = Math.min(min[i % 3], item.worldPositions[i]);
      max[i % 3] = Math.max(max[i % 3], item.worldPositions[i]);
    }
  }
  return { min, max, size: max.map((v, i) => v - min[i]) };
}

function imageBytes(glb, image) {
  assert.equal(image.uri, undefined, 'atlas is embedded, not an external path');
  assert.equal(image.mimeType, 'image/png', 'original PNG atlas retained');
  const view = glb.json.bufferViews[image.bufferView];
  assert.ok(view?.byteLength > 24, 'nonempty embedded image');
  const bytes = glb.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
  assert.equal(bytes.subarray(12, 16).toString('ascii'), 'IHDR', 'PNG image header');
  assert.equal(bytes.readUInt32BE(16), 1024, 'source atlas width');
  assert.equal(bytes.readUInt32BE(20), 1024, 'source atlas height');
  return bytes;
}

function rayHeight(glb, x, z) {
  const ray = new Ray(new Vector3(x, 8, z), new Vector3(0, -1, 0));
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), hit = new Vector3();
  let highest = -Infinity;
  for (const item of geometry(glb)) {
    for (let i = 0; i < item.count; i += 3) {
      const ia = item.indices ? item.indices[i] : i;
      const ib = item.indices ? item.indices[i + 1] : i + 1;
      const ic = item.indices ? item.indices[i + 2] : i + 2;
      a.fromArray(item.worldPositions, ia * 3);
      b.fromArray(item.worldPositions, ib * 3);
      c.fromArray(item.worldPositions, ic * 3);
      if (ray.intersectTriangle(a, b, c, false, hit)) highest = Math.max(highest, hit.y);
    }
  }
  assert.ok(Number.isFinite(highest), `bench ray hits tabletop at X=${x}, Z=${z}`);
  return highest;
}

test('manifest covers nine image-to-3D models and the separately supplied authored floor', () => {
  assert.equal(manifest.version, 1);
  assert.equal(manifest.rawSourcesUnmodified, true);
  assert.deepEqual(manifest.assets.map((a) => a.slug).sort(), Object.keys(ceilings).sort());
  assert.equal(manifest.floorModule.status, 'supplied-source-integrated-in-local-preview');
  assert.equal(manifest.floorModule.runtimeReplacementCreated, true);
  assert.equal(existsSync(path.join(root, manifest.floorModule.lods.desktop.path)), true);
  assert.equal(existsSync(path.join(root, manifest.floorModule.lods.mobile.path)), true);
});

for (const asset of manifest.assets) {
  test(`${asset.slug}: preserved raw source hash and source atlas provenance`, () => {
    const source = loadGlb(asset.source);
    assert.equal(sha256(source.bytes), asset.sourceSha256, 'original source bytes were never overwritten');
    const hashes = source.json.images.map((image) => sha256(imageBytes(source, image)));
    assert.deepEqual(hashes, asset.sourceEmbeddedAtlasSha256);
  });

  for (const [variantIndex, variant] of variants.entries()) {
    const expected = asset.lods[variant];
    const get = () => loadGlb(expected.path);
    const label = `${asset.slug} ${variant}`;

    test(`${label}: valid self-contained binary and manifest integrity`, () => {
      const glb = get();
      assert.equal(glb.bytes.length, expected.bytes);
      assert.equal(sha256(glb.bytes), expected.sha256);
      assert.equal(glb.json.meshes.length, 1, 'one prepared source mesh');
      assert.equal(glb.json.materials.length, 1, 'one retained atlas material');
      assert.equal(glb.json.images.length, 1, 'one original atlas');
      assert.equal(glb.json.extensionsRequired?.length ?? 0, 0, 'no decoder or extra extension dependency');
      assert.equal(geometry(glb).length, 1);
    });

    test(`${label}: measured world bounds, base pivot and intended dimensions`, () => {
      const actual = bounds(get());
      nearlyEqual(actual.min[1], 0, 1e-6, 'grounded minimum Y');
      for (let axis = 0; axis < 3; axis++) {
        nearlyEqual(actual.min[axis], expected.boundsMinXYZ[axis], 3e-6, `${'XYZ'[axis]} manifest minimum`);
        nearlyEqual(actual.max[axis], expected.boundsMaxXYZ[axis], 3e-6, `${'XYZ'[axis]} manifest maximum`);
        nearlyEqual(actual.size[axis], asset.preparedSizeXYZ[axis], Math.max(.008, asset.preparedSizeXYZ[axis] * .005), `${'XYZ'[axis]} intended size`);
      }
      for (const axis of [0, 2]) nearlyEqual((actual.min[axis] + actual.max[axis]) / 2, 0, .006, `${'XYZ'[axis]} centered pivot`);
    });

    test(`${label}: actual triangle count stays inside the LOD ceiling`, () => {
      const count = geometry(get()).reduce((sum, item) => sum + item.count / 3, 0);
      assert.equal(count, expected.triangles);
      assert.ok(count > 0 && count <= ceilings[asset.slug][variantIndex], `${count} triangles exceed LOD ceiling`);
      if (variant === 'mobile') assert.ok(count <= asset.lods.desktop.triangles, 'mobile LOD is no heavier than desktop');
    });

    test(`${label}: explicit finite, approximately unit-length seam-aware normals`, () => {
      for (const { primitive, positions } of geometry(get())) {
        assert.notEqual(primitive.attributes.NORMAL, undefined, 'normals prevent loader flat-shading fallback');
        const normals = accessor(get(), primitive.attributes.NORMAL);
        assert.equal(normals.width, 3);
        assert.equal(normals.description.count, positions.description.count);
        for (let i = 0; i < normals.values.length; i += 3) {
          const length = Math.hypot(...normals.values.subarray(i, i + 3));
          assert.ok(Number.isFinite(length) && Math.abs(length - 1) < .015, `normal ${i / 3} has invalid length ${length}`);
        }
      }
    });

    test(`${label}: explicit nonmetal material and intended roughness`, () => {
      for (const material of get().json.materials) {
        const pbr = material.pbrMetallicRoughness;
        assert.ok(pbr);
        assert.equal(pbr.metallicFactor, 0, 'omitted glTF metallic factor would incorrectly default to1');
        nearlyEqual(pbr.roughnessFactor, asset.roughnessFactor, 1e-6, 'authored roughness');
        assert.deepEqual(pbr.baseColorFactor ?? [1, 1, 1, 1], [1, 1, 1, 1], 'atlas is not additionally tinted');
      }
    });

    test(`${label}: finite UVs and byte-identical embedded source PNG atlas`, () => {
      const glb = get();
      const source = loadGlb(asset.source);
      const runtimeHashes = glb.json.images.map((image) => sha256(imageBytes(glb, image)));
      const sourceHashes = source.json.images.map((image) => sha256(imageBytes(source, image)));
      assert.deepEqual(runtimeHashes, sourceHashes, 'no texture regeneration or re-encoding');
      assert.deepEqual(runtimeHashes, expected.embeddedAtlasSha256);
      for (const { primitive, positions } of geometry(glb)) {
        const baseColor = glb.json.materials[primitive.material].pbrMetallicRoughness.baseColorTexture;
        assert.ok(baseColor && glb.json.textures[baseColor.index], 'base color texture bound');
        const uv = accessor(glb, primitive.attributes[`TEXCOORD_${baseColor.texCoord ?? 0}`]);
        assert.equal(uv.width, 2);
        assert.equal(uv.description.count, positions.description.count);
        assert.ok(uv.values.every(Number.isFinite));
        assert.ok(uv.values.every((value) => value >= -.001 && value <= 1.001), 'source atlas UVs stay in range');
        let lo = Infinity, hi = -Infinity;
        for (const value of uv.values) { lo = Math.min(lo, value); hi = Math.max(hi, value); }
        assert.ok(hi - lo > .05, 'UV mapping is not collapsed');
      }
    });

    test(`${label}: measured wick nodes survive the LOD and remain near their mesh tips`, () => {
      const glb = get();
      const names = Object.keys(expected.anchors);
      const wickNodes = sceneNodes(glb).filter(({ node }) => /^Wick(?:_[LCR])?$/.test(node.name ?? ''));
      assert.deepEqual(wickNodes.map(({ node }) => node.name).sort(), names.sort());
      for (const { node, world } of wickNodes) {
        assert.equal(node.mesh, undefined, 'wick anchor is an effect socket, not invented mesh geometry');
        const position = new Vector3().setFromMatrixPosition(world);
        const expectedPosition = expected.anchors[node.name];
        position.toArray().forEach((value, i) => nearlyEqual(value, expectedPosition[i], 2e-6, `${node.name} world ${'XYZ'[i]}`));
        let nearest = Infinity;
        const point = new Vector3();
        for (const item of geometry(glb)) {
          for (let i = 0; i < item.worldPositions.length; i += 3) nearest = Math.min(nearest, point.fromArray(item.worldPositions, i).distanceTo(position));
        }
        assert.ok(nearest < .035, `${node.name} is ${nearest} units from source wick geometry`);
        assert.ok(position.y > asset.preparedSizeXYZ[1] * .6, 'wick belongs to a candle top');
      }
      if (asset.slug === 'triple-candleholder') assert.equal(names.length, 3);
      if (asset.slug === 'wall-candle-sconce') assert.equal(names.length, 1);
    });

    test(`${label}: static source-derived object, no fabricated rig or animations`, () => {
      assert.equal(get().json.animations?.length ?? 0, 0);
      assert.equal(get().json.skins?.length ?? 0, 0);
      for (const { node } of sceneNodes(get())) assert.equal(node.skin, undefined);
      for (const mesh of get().json.meshes) {
        assert.equal(mesh.weights?.length ?? 0, 0);
        for (const primitive of mesh.primitives) assert.equal(primitive.targets?.length ?? 0, 0);
      }
    });

    if (asset.slug === 'witch-workbench') {
      test(`${label}: actual tabletop mesh supports the existing player and ingredient positions`, () => {
        // Mirrors workshopLayout.ts positions and the current [0,-.62,.55] bench
        // transform. These are mesh-triangle ray hits, not bounding-box guesses.
        const worldProbes = [
          ['benchCenter', 0, .55], ['player', 0, -.05],
          ['slot1', -2.75, 1.45], ['slot2', -1.48, 2.28], ['slot3', 0, 2.62],
          ['slot4', 1.48, 2.28], ['slot5', 2.75, 1.45], ['reserve', 3.42, 2.85],
        ];
        const samples = worldProbes.map(([name, x, z]) => {
          const localY = rayHeight(get(), x, z - .55);
          const worldY = localY - .62;
          assert.ok(worldY >= .48 && worldY <= .53, `${name} tabletop at worldY=${worldY}`);
          if (name.startsWith('slot') || name === 'reserve') {
            assert.ok(.55 - worldY >= .02 && .55 - worldY <= .075, 'existing slot base sits slightly above the irregular tabletop');
          }
          return { name, localY: Number(localY.toFixed(6)), worldY: Number(worldY.toFixed(6)) };
        });
        console.log(`BENCH_TABLETOP_${variant.toUpperCase()} ${JSON.stringify(samples)}`);
      });
    }
  }
}
