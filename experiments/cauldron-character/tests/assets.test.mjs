import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const profileCatalog = {
  brasskin: { minHeight: 0.8, charmRequired: true, expressionDifference: 0.005, defaultNeutral: 0.85 },
  zischbert: { minHeight: 0.65, charmRequired: false, expressionDifference: 0.001 },
  'moor-martha': { minHeight: 0.65, charmRequired: false, expressionDifference: 0.001 },
};
const profileNames = (process.env.CHARACTER_PROFILE ?? Object.keys(profileCatalog).join(',')).split(',');
for (const name of profileNames) assert.ok(profileCatalog[name], `known character profile: ${name}`);
const requiredNodes = ['CharacterRoot', 'Body', 'LiquidRoot', 'LiquidSurface'];
const requiredMorphs = ['Blink_L', 'Blink_R', 'FaceNeutral', 'Smile', 'Surprise', 'Hurt', 'Look_L', 'Look_R'];
const componentTypes = {
  5120: [1, 'getInt8'], 5121: [1, 'getUint8'],
  5122: [2, 'getInt16'], 5123: [2, 'getUint16'],
  5125: [4, 'getUint32'], 5126: [4, 'getFloat32'],
};
const componentCounts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function parseGlb(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'glTF 2');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'declared file length');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset);
    assert.equal(length % 4, 0, 'chunk alignment');
    assert.ok(offset + 8 + length <= bytes.length, 'chunk stays inside file');
    chunks.push({ type: bytes.readUInt32LE(offset + 4), data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  assert.equal(chunks.length, 2, 'one JSON and one embedded BIN chunk');
  assert.equal(chunks[0].type, 0x4e4f534a, 'JSON first');
  assert.equal(chunks[1].type, 0x004e4942, 'BIN second');
  const document = JSON.parse(chunks[0].data.toString('utf8').trim());
  assert.equal(document.asset.version, '2.0');
  assert.equal(document.buffers.length, 1, 'a portable asset embeds its buffer');
  assert.equal(document.buffers[0].uri, undefined, 'no external buffer');
  assert.ok(chunks[1].data.length - document.buffers[0].byteLength >= 0);
  assert.ok(chunks[1].data.length - document.buffers[0].byteLength <= 3);
  for (const image of document.images ?? []) assert.ok(image.bufferView !== undefined, 'textures are embedded');
  return { document, binary: new DataView(chunks[1].data.buffer, chunks[1].data.byteOffset, chunks[1].data.byteLength) };
}

function readAccessor(asset, index) {
  const { document, binary } = asset;
  const accessor = document.accessors[index];
  assert.ok(accessor, `accessor ${index} exists`);
  const [size, reader] = componentTypes[accessor.componentType] ?? [];
  const components = componentCounts[accessor.type];
  assert.ok(size && components, `supported accessor ${index}`);
  assert.ok(accessor.count > 0, 'nonempty accessor');
  const output = Array.from({ length: accessor.count }, () => Array(components).fill(0));
  if (accessor.bufferView !== undefined) {
    const view = document.bufferViews[accessor.bufferView];
    const stride = view.byteStride ?? size * components;
    const first = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    assert.ok((accessor.byteOffset ?? 0) + (accessor.count - 1) * stride + size * components <= view.byteLength, 'accessor stays inside buffer view');
    for (let vertex = 0; vertex < accessor.count; vertex++) {
      for (let component = 0; component < components; component++) {
        output[vertex][component] = binary[reader](first + vertex * stride + component * size, true);
      }
    }
  }
  if (accessor.sparse) {
    const sparse = accessor.sparse;
    const [indexSize, indexReader] = componentTypes[sparse.indices.componentType];
    const indexView = document.bufferViews[sparse.indices.bufferView];
    const valueView = document.bufferViews[sparse.values.bufferView];
    for (let replacement = 0; replacement < sparse.count; replacement++) {
      const vertex = binary[indexReader]((indexView.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0) + replacement * indexSize, true);
      assert.ok(vertex < accessor.count, 'sparse vertex stays inside accessor');
      for (let component = 0; component < components; component++) {
        output[vertex][component] = binary[reader]((valueView.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0) + (replacement * components + component) * size, true);
      }
    }
  }
  if (accessor.normalized && accessor.componentType !== 5126) {
    const signed = accessor.componentType === 5120 || accessor.componentType === 5122;
    const denominator = signed ? 2 ** (size * 8 - 1) - 1 : 2 ** (size * 8) - 1;
    for (const values of output) for (let component = 0; component < components; component++) values[component] = Math.max(signed ? -1 : 0, values[component] / denominator);
  }
  assert.ok(output.every((values) => values.every(Number.isFinite)), `accessor ${index} contains finite values`);
  return output;
}

function multiply(a, b) {
  return Array.from({ length: 16 }, (_, index) => {
    const row = index % 4;
    const column = Math.floor(index / 4);
    return a[row] * b[column * 4] + a[row + 4] * b[column * 4 + 1] + a[row + 8] * b[column * 4 + 2] + a[row + 12] * b[column * 4 + 3];
  });
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function inspectAsset(asset, profile, contract) {
  const { document } = asset;
  const names = document.nodes.map((node) => node.name);
  for (const name of requiredNodes) assert.equal(names.filter((candidate) => candidate === name).length, 1, `${name} exists exactly once`);
  if (profile.charmRequired) assert.equal(names.filter((name) => name === 'CharmGlow').length, 1, 'Brasskin charm exists exactly once');
  assert.ok(!names.some((name) => /source|original|duplicate/i.test(name)), 'source model is not duplicated in runtime asset');
  assert.ok(!names.some((name) => /^(FacePlate|EyeWhite|Iris|Pupil|LidUpper|Brow|Mouth)(_|$)/.test(name)), 'no replacement face modules cover the original sculpt');
  const seenNodes = new Set();
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  let triangles = 0;
  let vertices = 0;
  let meshCount = 0;
  const nodeBounds = {};
  const nodeMatrices = {};
  const bodyTriangles = [];
  function visit(index, parent) {
    assert.ok(!seenNodes.has(index), 'single-parent, acyclic node hierarchy');
    seenNodes.add(index);
    const node = document.nodes[index];
    const matrix = multiply(parent, nodeMatrix(node));
    assert.ok(matrix.every(Number.isFinite), 'finite node transform');
    if (node.mesh !== undefined) {
      meshCount++;
      const localBounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      const mesh = document.meshes[node.mesh];
      for (const primitive of mesh.primitives) {
        assert.equal(primitive.mode ?? 4, 4, 'triangle topology');
        const positions = readAccessor(asset, primitive.attributes.POSITION);
        const normals = readAccessor(asset, primitive.attributes.NORMAL);
        assert.equal(normals.length, positions.length, `${node.name} has one normal per vertex`);
        assert.ok(normals.every((normal) => Math.abs(Math.hypot(...normal) - 1) < 0.02), `${node.name} normals are unit length`);
        if (node.name === 'Body') {
          assert.ok(primitive.attributes.TEXCOORD_0 !== undefined, `${node.name} has texture coordinates`);
          const material = document.materials[primitive.material];
          assert.ok(material?.pbrMetallicRoughness?.baseColorTexture, 'original painted face is still textured');
        }
        if (primitive.attributes.TEXCOORD_0 !== undefined) assert.equal(readAccessor(asset, primitive.attributes.TEXCOORD_0).length, positions.length);
        let indices;
        if (primitive.indices !== undefined) {
          indices = readAccessor(asset, primitive.indices).flat();
          assert.equal(indices.length % 3, 0);
          assert.ok(indices.every((vertex) => Number.isInteger(vertex) && vertex < positions.length), 'valid indexed topology');
          triangles += indices.length / 3;
        } else {
          assert.equal(positions.length % 3, 0);
          triangles += positions.length / 3;
          indices = positions.map((_, index) => index);
        }
        vertices += positions.length;
        for (const target of primitive.targets ?? []) {
          assert.ok(target.POSITION !== undefined, 'facial morph has position deltas');
          for (const accessor of Object.values(target)) assert.equal(readAccessor(asset, accessor).length, positions.length, 'morph matches base vertex count');
        }
        const worldPositions = positions.map(([x, y, z]) => {
          const point = [matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12], matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13], matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]];
          point.forEach((value, axis) => {
            bounds.min[axis] = Math.min(bounds.min[axis], value);
            bounds.max[axis] = Math.max(bounds.max[axis], value);
            localBounds.min[axis] = Math.min(localBounds.min[axis], value);
            localBounds.max[axis] = Math.max(localBounds.max[axis], value);
          });
          return point;
        });
        if (node.name === 'Body') for (let index = 0; index < indices.length; index += 3) bodyTriangles.push([worldPositions[indices[index]], worldPositions[indices[index + 1]], worldPositions[indices[index + 2]]]);
      }
      nodeBounds[node.name] = localBounds;
      nodeMatrices[node.name] = matrix;
    }
    for (const child of node.children ?? []) visit(child, matrix);
  }
  const scene = document.scenes[document.scene ?? 0];
  assert.equal(scene.nodes.length, 1, 'one portable character root');
  assert.equal(document.nodes[scene.nodes[0]].name, 'CharacterRoot');
  visit(scene.nodes[0], identity);
  assert.equal(seenNodes.size, document.nodes.length, 'no orphan source geometry');
  assert.ok(bounds.min[1] >= -0.04 && bounds.min[1] <= 0.04, 'Y-up feet are close to ground');
  assert.ok(bounds.max[1] >= profile.minHeight && bounds.max[1] <= 1.35, 'character height is within its measured profile');
  assert.ok(nodeBounds.LiquidSurface.min[1] > bounds.max[1] * 0.6, 'liquid is in the upper bowl');
  const liquid = nodeBounds.LiquidSurface;
  const centerX = (liquid.min[0] + liquid.max[0]) / 2;
  const centerZ = (liquid.min[2] + liquid.max[2]) / 2;
  const probeRadius = Math.min(0.12, Math.min(liquid.max[0] - liquid.min[0], liquid.max[2] - liquid.min[2]) * 0.22);
  const diagonal = probeRadius / Math.sqrt(2);
  const probes = [[centerX, centerZ], [centerX - probeRadius, centerZ], [centerX + probeRadius, centerZ], [centerX, centerZ - probeRadius], [centerX, centerZ + probeRadius], ...[-1, 1].flatMap((x) => [-1, 1].map((z) => [centerX + x * diagonal, centerZ + z * diagonal]))];
  for (const [x, z] of probes) {
    let blockingHeight = -Infinity;
    for (const [a, b, c] of bodyTriangles) {
      const denominator = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
      if (Math.abs(denominator) < 1e-12) continue;
      const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / denominator;
      const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / denominator;
      if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
      const height = u * a[1] + v * b[1] + (1 - u - v) * c[1];
      if (height > liquid.max[1] + 0.007) blockingHeight = Math.max(blockingHeight, height);
    }
    assert.equal(blockingHeight, -Infinity, `bowl has no baked cap at world X/Z (${x.toFixed(3)}, ${z.toFixed(3)}): blocking Y=${blockingHeight.toFixed(4)}, fluid Y=${liquid.max[1].toFixed(4)}`);
  }
  for (const [name, morphs] of [['Body', requiredMorphs]]) {
    const node = document.nodes.find((candidate) => candidate.name === name);
    const mesh = document.meshes[node.mesh];
    const targetNames = mesh.extras?.targetNames ?? [];
    for (const morph of morphs) assert.ok(targetNames.includes(morph), `${name} exposes ${morph}`);
    if (mesh.weights) assert.equal(mesh.weights.length, targetNames.length, 'exported defaults map one-to-one to named morph targets');
    const declaredDefaults = contract.defaultWeights?.[name] ?? contract.defaultWeights ?? {};
    for (const [index, targetName] of targetNames.entries()) {
      const actual = mesh.weights?.[index] ?? 0;
      const expected = declaredDefaults[targetName] ?? (targetName === 'FaceNeutral' ? profile.defaultNeutral ?? 0 : 0);
      assert.ok(Number.isFinite(actual) && actual >= 0 && actual <= 1, `${targetName} has a valid exported default weight`);
      if (targetName !== 'FaceNeutral') assert.equal(expected, 0, `${targetName} must not activate by default in a resting asset`);
      assert.ok(Math.abs(actual - expected) < 1e-6, `${targetName} default ${actual} matches declared rest ${expected}`);
    }
    for (const primitive of mesh.primitives) {
      assert.equal(primitive.targets.length, targetNames.length, 'all morph names map to targets');
      const basePositions = readAccessor(asset, primitive.attributes.POSITION);
      for (const morph of morphs) {
        const deltas = readAccessor(asset, primitive.targets[targetNames.indexOf(morph)].POSITION);
        const affected = deltas.filter((delta) => Math.hypot(...delta) > 1e-6);
        assert.ok(affected.length > 0, `${morph} moves actual vertices`);
        assert.ok(affected.length < deltas.length * 0.5, `${morph} is localized to the face`);
        assert.ok(affected.every((delta) => Math.hypot(...delta) < 0.2), `${morph} deformation is bounded at metre scale`);
        const matrix = nodeMatrices[name];
        const affectedFront = deltas.reduce((sum, delta, index) => {
          if (Math.hypot(...delta) <= 1e-6) return sum;
          const [x, y, z] = basePositions[index];
          return sum + matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
        }, 0) / affected.length;
        assert.ok(affectedFront > (nodeBounds.Body.min[2] + nodeBounds.Body.max[2]) / 2, `${morph} is on the +Z front of the character`);
      }
      const neutral = readAccessor(asset, primitive.targets[targetNames.indexOf('FaceNeutral')].POSITION);
      for (const alternative of ['Smile', 'Hurt']) {
        const deltas = readAccessor(asset, primitive.targets[targetNames.indexOf(alternative)].POSITION);
        const difference = Math.max(...deltas.map((delta, vertex) => Math.hypot(...delta.map((value, axis) => value - neutral[vertex][axis]))));
        assert.ok(difference > profile.expressionDifference, `${alternative} is a distinct expression rather than a copy of the neutral mouth`);
      }
    }
  }
  return { triangles, vertices, meshCount, bounds, nodeBounds };
}

const inspections = {};
for (const profileName of profileNames) {
  const profile = profileCatalog[profileName];
  const assetDirectory = resolve(repository, 'public/assets/characters', profileName);
  const loadContract = async () => {
    const contract = JSON.parse(await readFile(resolve(assetDirectory, 'character-contract.json'), 'utf8'));
    assert.ok(requiredMorphs.every((name) => contract.morphs.Body.includes(name)), 'published contract includes the neutral rest expression');
    return contract;
  };
  inspections[profileName] = {};
  for (const [variant, budget] of [['desktop', 30_000], ['mobile', 20_000]]) {
    test(`${profileName} ${variant} is portable, animated, normalized and within geometry budget`, async () => {
      const contract = await loadContract();
      const bytes = await readFile(resolve(assetDirectory, contract.variants[variant].file));
      const inspection = inspectAsset(parseGlb(bytes), profile, contract);
      assert.equal(bytes.length, contract.variants[variant].bytes, 'contract byte count');
      if (contract.variants[variant].sha256) assert.equal(createHash('sha256').update(bytes).digest('hex'), contract.variants[variant].sha256, 'processed asset checksum');
      assert.ok(inspection.triangles <= budget, `${inspection.triangles} triangles exceed ${budget}`);
      assert.equal(inspection.triangles, contract.variants[variant].triangles, 'contract triangle count');
      assert.equal(inspection.vertices, contract.variants[variant].vertices, 'contract vertex count');
      assert.equal(inspection.meshCount, contract.variants[variant].meshCount, 'contract mesh count');
      inspections[profileName][variant] = inspection;
      console.log(`${profileName} ${variant}: ${inspection.triangles} triangles, ${inspection.vertices} vertices, ${inspection.meshCount} meshes`);
    });
  }

  test(`${profileName} source is preserved byte-for-byte and mobile is a real optimized variant`, async () => {
    const contract = await loadContract();
    const source = await readFile(resolve(repository, contract.source.file));
    assert.equal(createHash('sha256').update(source).digest('hex'), contract.source.sha256, 'source checksum');
    assert.equal(source.length, contract.source.bytes, 'source byte count');
    const variants = inspections[profileName];
    if (variants.desktop && variants.mobile) assert.ok(variants.mobile.triangles < variants.desktop.triangles * 0.85, 'mobile removes meaningful geometry');
  });
}
