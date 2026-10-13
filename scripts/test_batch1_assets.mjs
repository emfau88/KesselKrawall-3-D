import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Run with: node --test scripts/test_batch1_assets.mjs
// These are technical acceptance checks, not a substitute for an in-game art review.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const variants = ['desktop', 'mobile'];
const assets = [
  {
    slug: 'witch-workbench',
    dimensions: [8.2, 1.18, 6.4],
    triangles: { desktop: 16_000, mobile: 8_000 },
    upload: 'C:/Users/madde/Downloads/task_f87f6fe1-203c-4e15-abd4-571abc1691fc_model.glb',
  },
  {
    slug: 'ritual-platform',
    dimensions: [11.1, 0.42, 11.1],
    triangles: { desktop: 20_000, mobile: 10_000 },
    upload: 'C:/Users/madde/Downloads/task_b9f38196-4550-4c39-95ab-76f8698bc49e_model.glb',
  },
];
const cache = new Map();
const componentReaders = {
  5120: { size: 1, read: (b, o) => b.readInt8(o), normalize: (v) => Math.max(v / 127, -1) },
  5121: { size: 1, read: (b, o) => b.readUInt8(o), normalize: (v) => v / 255 },
  5122: { size: 2, read: (b, o) => b.readInt16LE(o), normalize: (v) => Math.max(v / 32767, -1) },
  5123: { size: 2, read: (b, o) => b.readUInt16LE(o), normalize: (v) => v / 65535 },
  5125: { size: 4, read: (b, o) => b.readUInt32LE(o), normalize: (v) => v / 4294967295 },
  5126: { size: 4, read: (b, o) => b.readFloatLE(o), normalize: (v) => v },
};
const typeWidths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function loadGlb(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (cache.has(absolutePath)) return cache.get(absolutePath);
  const bytes = readFileSync(absolutePath);
  assert.ok(bytes.length >= 28, `${relativePath}: complete GLB header/chunks`);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'GLB version 2');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'declared GLB length');
  const chunks = [];
  let offset = 12;
  while (offset < bytes.length) {
    assert.ok(offset + 8 <= bytes.length, 'complete chunk header');
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    assert.equal(length % 4, 0, 'aligned chunk');
    assert.ok(offset + 8 + length <= bytes.length, 'chunk stays within GLB');
    chunks.push({ type, bytes: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  assert.equal(offset, bytes.length);
  assert.equal(chunks[0].type, 0x4e4f534a, 'JSON first');
  const json = JSON.parse(chunks[0].bytes.toString('utf8').trim());
  assert.equal(json.asset?.version, '2.0', 'glTF asset version');
  const binaries = chunks.filter((chunk) => chunk.type === 0x004e4942);
  assert.equal(binaries.length, 1, 'one embedded BIN chunk');
  assert.equal(json.buffers?.length, 1, 'one embedded buffer');
  assert.equal(json.buffers[0].uri, undefined, 'no external mesh buffer');
  const binary = binaries[0].bytes;
  const length = json.buffers[0].byteLength;
  assert.ok(Number.isInteger(length) && length > 0);
  assert.ok(length <= binary.length && binary.length - length <= 3, 'valid BIN padding');
  for (const view of json.bufferViews ?? []) {
    assert.equal(view.buffer, 0, 'bufferView uses embedded BIN');
    assert.ok(Number.isInteger(view.byteLength) && view.byteLength >= 0);
    const start = view.byteOffset ?? 0;
    assert.ok(Number.isInteger(start) && start >= 0);
    assert.ok(start + view.byteLength <= length, 'bufferView range is valid');
  }
  const result = { bytes, json, binary };
  cache.set(absolutePath, result);
  return result;
}

function readAccessor(glb, index) {
  const accessor = glb.json.accessors?.[index];
  assert.ok(accessor, `accessor ${index} exists`);
  assert.ok(Number.isInteger(accessor.count) && accessor.count > 0, 'nonempty accessor');
  const reader = componentReaders[accessor.componentType];
  const width = typeWidths[accessor.type];
  assert.ok(reader && width, 'supported accessor component/type');
  const result = new Float64Array(accessor.count * width);
  const readElement = (viewIndex, start, count, stride, outputOffset = 0) => {
    const view = glb.json.bufferViews?.[viewIndex];
    assert.ok(view, 'accessor bufferView exists');
    assert.ok(start >= 0 && start + (count - 1) * stride + width * reader.size <= view.byteLength,
      'accessor stays within its bufferView');
    for (let i = 0; i < count; i++) {
      for (let component = 0; component < width; component++) {
        const value = reader.read(glb.binary,
          (view.byteOffset ?? 0) + start + i * stride + component * reader.size);
        result[outputOffset + i * width + component] = accessor.normalized
          ? reader.normalize(value) : value;
      }
    }
  };
  if (accessor.bufferView !== undefined) {
    const view = glb.json.bufferViews[accessor.bufferView];
    readElement(accessor.bufferView, accessor.byteOffset ?? 0, accessor.count,
      view.byteStride ?? width * reader.size);
  } else {
    assert.ok(accessor.sparse, 'accessor has a bufferView or sparse data');
  }
  if (accessor.sparse) {
    const { count, indices, values } = accessor.sparse;
    assert.ok(Number.isInteger(count) && count > 0 && count <= accessor.count);
    const indexReader = componentReaders[indices.componentType];
    assert.ok([5121, 5123, 5125].includes(indices.componentType), 'unsigned sparse indices');
    const indexView = glb.json.bufferViews[indices.bufferView];
    const valueView = glb.json.bufferViews[values.bufferView];
    assert.ok(indexView && valueView, 'sparse bufferViews exist');
    const indexStart = indices.byteOffset ?? 0;
    const valueStart = values.byteOffset ?? 0;
    assert.ok(indexStart + count * indexReader.size <= indexView.byteLength);
    assert.ok(valueStart + count * width * reader.size <= valueView.byteLength);
    let previous = -1;
    for (let i = 0; i < count; i++) {
      const vertex = indexReader.read(glb.binary,
        (indexView.byteOffset ?? 0) + indexStart + i * indexReader.size);
      assert.ok(vertex > previous && vertex < accessor.count, 'ordered, in-range sparse indices');
      previous = vertex;
      for (let component = 0; component < width; component++) {
        const value = reader.read(glb.binary,
          (valueView.byteOffset ?? 0) + valueStart + (i * width + component) * reader.size);
        result[vertex * width + component] = accessor.normalized ? reader.normalize(value) : value;
      }
    }
  }
  return { values: result, accessor, width };
}

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a, b) {
  const out = Array(16).fill(0);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
  }
  return out;
}

function nodeMatrix(node) {
  if (node.matrix) {
    assert.equal(node.matrix.length, 16);
    assert.ok(node.matrix.every(Number.isFinite), 'finite node matrix');
    return node.matrix;
  }
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const out = [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
  assert.ok(out.every(Number.isFinite), 'finite node transform');
  return out;
}

function scenePrimitives(glb) {
  const nodes = glb.json.nodes ?? [];
  const scene = glb.json.scenes?.[glb.json.scene ?? 0];
  assert.ok(scene?.nodes?.length, 'nonempty default scene');
  const primitives = [];
  const visit = (index, parent, ancestors) => {
    assert.ok(!ancestors.has(index), 'acyclic node hierarchy');
    const node = nodes[index];
    assert.ok(node, 'scene node exists');
    const world = multiply(parent, nodeMatrix(node));
    if (node.mesh !== undefined) {
      const mesh = glb.json.meshes?.[node.mesh];
      assert.ok(mesh?.primitives?.length, 'nonempty mesh');
      for (const primitive of mesh.primitives) primitives.push({ primitive, world });
    }
    const next = new Set(ancestors).add(index);
    for (const child of node.children ?? []) visit(child, world, next);
  };
  for (const index of scene.nodes) visit(index, identity, new Set());
  assert.ok(primitives.length > 0, 'visible mesh primitives');
  return primitives;
}

function worldBounds(glb) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const { primitive, world } of scenePrimitives(glb)) {
    const { values, width } = readAccessor(glb, primitive.attributes?.POSITION);
    assert.equal(width, 3, 'VEC3 positions');
    for (let i = 0; i < values.length; i += 3) {
      const [x, y, z] = values.subarray(i, i + 3);
      const position = [
        world[0] * x + world[4] * y + world[8] * z + world[12],
        world[1] * x + world[5] * y + world[9] * z + world[13],
        world[2] * x + world[6] * y + world[10] * z + world[14],
      ];
      assert.ok(position.every(Number.isFinite), 'finite world positions');
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], position[axis]);
        max[axis] = Math.max(max[axis], position[axis]);
      }
    }
  }
  return { min, max, size: max.map((value, axis) => value - min[axis]) };
}

for (const asset of assets) {
  test(`${asset.slug}: source GLB is a byte-for-byte copy of the upload`, (t) => {
    const source = loadGlb(`art/source/batch-01/${asset.slug}/source.glb`);
    if (!existsSync(asset.upload)) {
      t.skip('Original user Downloads file is not present on this machine.');
      return;
    }
    const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha256(source.bytes), sha256(readFileSync(asset.upload)), 'source was not overwritten by cleanup');
  });

  for (const variant of variants) {
    const label = `${asset.slug} ${variant}`;
    const get = () => loadGlb(`public/assets/environment/${asset.slug}/${asset.slug}-${variant}.glb`);

    test(`${label}: valid self-contained GLB`, () => {
      const glb = get();
      assert.ok(glb.json.meshes?.length > 0);
      assert.ok(!glb.json.extensionsRequired?.includes('KHR_draco_mesh_compression'), 'no undeclared decoder dependency');
      for (const { primitive } of scenePrimitives(glb)) {
        assert.equal(primitive.mode ?? 4, 4, 'triangle primitive');
        const position = readAccessor(glb, primitive.attributes?.POSITION);
        assert.equal(position.width, 3);
        assert.ok(position.values.every(Number.isFinite));
        if (primitive.indices !== undefined) {
          const indices = readAccessor(glb, primitive.indices);
          assert.equal(indices.width, 1);
          assert.ok([5121, 5123, 5125].includes(indices.accessor.componentType));
          assert.ok(indices.values.every((value) => Number.isInteger(value) && value >= 0 && value < position.accessor.count));
        }
      }
    });

    test(`${label}: floor pivot and intended world dimensions`, () => {
      const bounds = worldBounds(get());
      assert.ok(Math.abs(bounds.min[1]) < 0.002, `floor Y is ${bounds.min[1]}`);
      for (let axis = 0; axis < 3; axis++) {
        const tolerance = Math.max(0.01, asset.dimensions[axis] * 0.005);
        assert.ok(Math.abs(bounds.size[axis] - asset.dimensions[axis]) <= tolerance,
          `${'XYZ'[axis]} size ${bounds.size[axis]} should be ${asset.dimensions[axis]} ± ${tolerance}`);
      }
    });

    test(`${label}: triangle budget`, () => {
      let triangles = 0;
      for (const { primitive } of scenePrimitives(get())) {
        const accessorIndex = primitive.indices ?? primitive.attributes.POSITION;
        const count = get().json.accessors[accessorIndex].count;
        assert.equal(count % 3, 0, 'whole triangles');
        triangles += count / 3;
      }
      assert.ok(triangles > 0 && triangles <= asset.triangles[variant],
        `${triangles} triangles exceed ${asset.triangles[variant]} budget`);
    });

    test(`${label}: normals exported, finite and approximately unit length`, () => {
      const glb = get();
      for (const { primitive } of scenePrimitives(glb)) {
        assert.notEqual(primitive.attributes?.NORMAL, undefined, 'NORMAL accessor is explicit');
        const normal = readAccessor(glb, primitive.attributes.NORMAL);
        assert.equal(normal.width, 3);
        assert.equal(normal.accessor.count, glb.json.accessors[primitive.attributes.POSITION].count);
        for (let i = 0; i < normal.values.length; i += 3) {
          const length = Math.hypot(normal.values[i], normal.values[i + 1], normal.values[i + 2]);
          assert.ok(Number.isFinite(length) && Math.abs(length - 1) < 0.025,
            `normal ${i / 3} length is ${length}`);
        }
      }
    });

    test(`${label}: UVs, embedded base color and explicit non-metal material retained`, () => {
      const glb = get();
      for (const { primitive } of scenePrimitives(glb)) {
        const material = glb.json.materials?.[primitive.material];
        const pbr = material?.pbrMetallicRoughness;
        assert.ok(pbr, 'PBR material exists');
        assert.equal(pbr.metallicFactor, 0, 'stone/wood material explicitly non-metal');
        const baseColor = pbr.baseColorTexture;
        assert.ok(baseColor, 'base-color texture is retained');
        const texture = glb.json.textures?.[baseColor.index];
        assert.ok(texture, 'base-color texture exists');
        const image = glb.json.images?.[texture.source];
        assert.ok(image, 'base-color image exists');
        assert.equal(image.uri, undefined, 'image does not depend on an external path');
        assert.notEqual(image.bufferView, undefined, 'image is embedded');
        assert.ok(['image/png', 'image/jpeg'].includes(image.mimeType));
        const view = glb.json.bufferViews[image.bufferView];
        assert.ok(view?.byteLength > 16, 'embedded image is nonempty');
        const imageBytes = glb.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
        if (image.mimeType === 'image/png') {
          assert.equal(imageBytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
        } else {
          assert.equal(imageBytes.subarray(0, 2).toString('hex'), 'ffd8', 'JPEG signature');
        }
        const uv = readAccessor(glb, primitive.attributes?.[`TEXCOORD_${baseColor.texCoord ?? 0}`]);
        assert.equal(uv.width, 2);
        assert.equal(uv.accessor.count, glb.json.accessors[primitive.attributes.POSITION].count);
        assert.ok(uv.values.every(Number.isFinite), 'finite UVs');
        let minimum = Infinity;
        let maximum = -Infinity;
        for (const value of uv.values) {
          minimum = Math.min(minimum, value);
          maximum = Math.max(maximum, value);
        }
        assert.ok(maximum - minimum > 0.05, 'UVs are not collapsed to a point');
      }
    });

    test(`${label}: static asset without a rig or animation`, () => {
      const glb = get();
      assert.equal(glb.json.animations?.length ?? 0, 0);
      assert.equal(glb.json.skins?.length ?? 0, 0);
      for (const node of glb.json.nodes ?? []) assert.equal(node.skin, undefined);
      for (const mesh of glb.json.meshes ?? []) {
        assert.equal(mesh.weights?.length ?? 0, 0, 'no unused morph state');
        for (const primitive of mesh.primitives) assert.equal(primitive.targets?.length ?? 0, 0);
      }
    });
  }
}
