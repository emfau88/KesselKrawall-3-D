import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// node --test scripts/test_supplied_floor.mjs
// This floor was supplied separately with PBR maps and two authored LODs.
// Verify that runtime preparation changes only its bottom-pivot translation.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'art/source/mockup-runtime-manifest.json'), 'utf8'));
const floor = manifest.floorModule;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const cache = new Map();
const close = (actual, expected, label, tolerance = 1e-6) => assert.ok(
  Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
  `${label}: ${actual} differs from ${expected}`,
);

function loadGlb(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const bytes = readFileSync(path.join(root, relative));
  assert.ok(bytes.length >= 28, `${relative}: complete binary header`);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'GLB version');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'declared complete file length');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    assert.ok(offset + 8 <= bytes.length, 'complete chunk header');
    const size = bytes.readUInt32LE(offset);
    assert.equal(size % 4, 0, 'aligned GLB chunk');
    assert.ok(offset + 8 + size <= bytes.length, 'chunk remains inside file');
    chunks.push({ type: bytes.readUInt32LE(offset + 4), data: bytes.subarray(offset + 8, offset + 8 + size) });
    offset += 8 + size;
  }
  assert.equal(chunks.length, 2, 'one JSON and one embedded BIN chunk');
  assert.equal(chunks[0].type, 0x4e4f534a, 'JSON first');
  assert.equal(chunks[1].type, 0x004e4942, 'embedded BIN second');
  const json = JSON.parse(chunks[0].data.toString('utf8').trim());
  assert.equal(json.asset.version, '2.0');
  assert.equal(json.buffers.length, 1);
  assert.equal(json.buffers[0].uri, undefined, 'no external geometry dependency');
  const binary = chunks[1].data;
  assert.ok(json.buffers[0].byteLength <= binary.length);
  assert.ok(binary.length - json.buffers[0].byteLength <= 3, 'valid BIN padding');
  for (const view of json.bufferViews) {
    assert.equal(view.buffer, 0);
    assert.ok(Number.isInteger(view.byteLength) && view.byteLength > 0);
    assert.ok(Number.isInteger(view.byteOffset ?? 0) && (view.byteOffset ?? 0) >= 0);
    assert.ok((view.byteOffset ?? 0) + view.byteLength <= json.buffers[0].byteLength, 'view in buffer');
  }
  const result = { bytes, json, binary };
  cache.set(relative, result);
  return result;
}

function accessor(glb, index) {
  const description = glb.json.accessors[index];
  assert.ok(description, `accessor ${index} exists`);
  assert.equal(description.sparse, undefined, 'explicit supplied attribute data');
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[description.type];
  const reader = {
    5121: [1, (b, o) => b.readUInt8(o)],
    5123: [2, (b, o) => b.readUInt16LE(o)],
    5125: [4, (b, o) => b.readUInt32LE(o)],
    5126: [4, (b, o) => b.readFloatLE(o)],
  }[description.componentType];
  assert.ok(width && reader, 'supported supplied component/type');
  const view = glb.json.bufferViews[description.bufferView];
  assert.ok(view && Number.isInteger(description.count) && description.count > 0);
  const stride = view.byteStride ?? width * reader[0];
  assert.ok(stride >= width * reader[0]);
  assert.ok((description.byteOffset ?? 0) + (description.count - 1) * stride + width * reader[0] <= view.byteLength);
  const values = new Float64Array(description.count * width);
  for (let index = 0; index < description.count; index++) {
    for (let component = 0; component < width; component++) {
      values[index * width + component] = reader[1](
        glb.binary, (view.byteOffset ?? 0) + (description.byteOffset ?? 0) + index * stride + component * reader[0],
      );
    }
  }
  assert.ok(values.every(Number.isFinite), 'finite attribute/index values');
  return { description, width, values };
}

function embeddedImage(glb, image) {
  assert.equal(image.uri, undefined, 'no external texture dependency');
  assert.equal(image.mimeType, 'image/png');
  const view = glb.json.bufferViews[image.bufferView];
  assert.ok(view?.byteLength > 24);
  const bytes = glb.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'valid original PNG signature');
  assert.equal(bytes.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0, 'positive atlas dimensions');
  return bytes;
}

for (const [variant, count, ceiling] of [['desktop', 5072, 6000], ['mobile', 2432, 3000]]) {
  const expected = floor.lods[variant];
  const sourcePath = `art/source/batch-03/dungeon-floor-module/${variant === 'desktop' ? 'source.glb' : 'source-mobile.glb'}`;
  const runtimePath = `public/assets/environment/dungeon-floor-module/dungeon-floor-module-${variant}.glb`;
  const source = () => loadGlb(sourcePath);
  const runtime = () => loadGlb(runtimePath);
  const label = `supplied floor ${variant}`;

  test(`${label}: intact source/runtime hashes; JSON changes only the bottom pivot`, () => {
    assert.equal(floor.runtimeReplacementCreated, true);
    assert.equal(manifest.rawSourcesUnmodified, true);
    assert.equal(expected.source, sourcePath);
    assert.equal(expected.path, runtimePath);
    assert.equal(sha256(source().bytes), expected.sourceSha256);
    assert.equal(sha256(runtime().bytes), expected.sha256);
    assert.equal(runtime().bytes.length, expected.bytes);
    if (variant === 'desktop') assert.equal(sha256(source().bytes), floor.sourceSha256);
    const restored = structuredClone(runtime().json);
    for (const [index, node] of restored.nodes.entries()) {
      if (node.mesh === undefined) continue;
      assert.deepEqual(node.translation, [0, expected.groundShiftY, 0]);
      if (source().json.nodes[index].translation === undefined) delete node.translation;
      else node.translation = source().json.nodes[index].translation;
    }
    assert.deepEqual(restored, source().json, 'no geometry/material/metadata JSON rewrite');
  });

  test(`${label}: byte-identical original BIN and all three encoded PBR PNGs`, () => {
    const original = source(), prepared = runtime();
    assert.ok(prepared.binary.equals(original.binary), 'entire original padded BIN preserved');
    assert.equal(prepared.json.images.length, 3);
    assert.equal(original.json.images.length, 3);
    const hashes = prepared.json.images.map((image, index) => {
      const bytes = embeddedImage(prepared, image);
      assert.ok(bytes.equals(embeddedImage(original, original.json.images[index])), `source PNG ${index} not re-encoded`);
      return sha256(bytes);
    });
    assert.deepEqual(hashes, expected.sourceEmbeddedAtlasSha256);
    assert.deepEqual(hashes, expected.embeddedAtlasSha256);
    assert.equal(expected.binChunkRetained, true);
    assert.equal(expected.originalEncodedAtlasRetained, true);
  });

  test(`${label}: NORMAL, TANGENT, COLOR_0, UVs and valid indexed triangles retained`, () => {
    const glb = runtime();
    assert.equal(glb.json.meshes.length, 1);
    assert.equal(glb.json.meshes[0].primitives.length, 1);
    const primitive = glb.json.meshes[0].primitives[0];
    assert.equal(primitive.mode ?? 4, 4);
    const positions = accessor(glb, primitive.attributes.POSITION);
    assert.equal(positions.width, 3);
    assert.equal(positions.description.count, expected.vertices);
    for (const [name, width] of [['NORMAL', 3], ['TANGENT', 4], ['COLOR_0', 4], ['TEXCOORD_0', 2]]) {
      assert.notEqual(primitive.attributes[name], undefined, `${name} must be explicit`);
      const values = accessor(glb, primitive.attributes[name]);
      assert.equal(values.width, width);
      assert.equal(values.description.count, positions.description.count);
    }
    const indices = accessor(glb, primitive.indices);
    assert.equal(indices.width, 1);
    assert.ok([5121, 5123, 5125].includes(indices.description.componentType));
    assert.ok(indices.values.every((value) => Number.isInteger(value) && value >= 0 && value < positions.description.count));
    assert.equal(indices.description.count % 3, 0);
    assert.equal(indices.description.count / 3, count);
    assert.equal(count, expected.triangles);
    assert.ok(count <= ceiling, `${count} triangles exceed ${ceiling} budget`);
    assert.equal(glb.json.animations?.length ?? 0, 0);
    assert.equal(glb.json.skins?.length ?? 0, 0);
    for (const node of glb.json.nodes) assert.equal(node.skin, undefined);
    for (const mesh of glb.json.meshes) {
      assert.equal(mesh.weights?.length ?? 0, 0);
      for (const part of mesh.primitives) assert.equal(part.targets?.length ?? 0, 0);
    }
  });

  test(`${label}: authored nonmetal roughness and normal/MR map bindings unchanged`, () => {
    const glb = runtime();
    assert.deepEqual(glb.json.materials, source().json.materials);
    assert.deepEqual(glb.json.textures, source().json.textures);
    assert.deepEqual(glb.json.samplers, source().json.samplers);
    assert.equal(glb.json.materials.length, 1);
    const material = glb.json.materials[0];
    const pbr = material.pbrMetallicRoughness;
    assert.equal(pbr.metallicFactor, 0);
    assert.equal(pbr.roughnessFactor, 1);
    assert.deepEqual(pbr.baseColorFactor, [1, 1, 1, 1]);
    assert.equal(material.normalTexture.scale, 0.7);
    assert.equal(glb.json.textures[pbr.baseColorTexture.index].source, 0, 'base color source retained');
    assert.equal(glb.json.textures[material.normalTexture.index].source, 1, 'OpenGL normal source retained');
    assert.equal(glb.json.textures[pbr.metallicRoughnessTexture.index].source, 2, 'metallic-roughness source retained');
    assert.equal(expected.authoredPbrMapsRetained, true);
  });

  test(`${label}: measured 2m tile, centered X/Z, world bottom at Y=0`, () => {
    const glb = runtime();
    assert.equal(glb.json.nodes.length, 1, 'supplied single-mesh scene');
    assert.deepEqual(glb.json.scenes[glb.json.scene ?? 0].nodes, [0]);
    const node = glb.json.nodes[0];
    assert.equal(node.mesh, 0);
    assert.equal(node.matrix, undefined);
    assert.equal(node.rotation, undefined);
    assert.equal(node.scale, undefined);
    const positions = accessor(glb, glb.json.meshes[0].primitives[0].attributes.POSITION);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.values.length; i++) {
      const axis = i % 3, value = positions.values[i] + node.translation[axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
    close(min[1], 0, 'actual minimum world Y');
    for (const axis of [0, 2]) {
      close(max[axis] - min[axis], 2, `${'XYZ'[axis]} tile size`);
      close((max[axis] + min[axis]) / 2, 0, `${'XYZ'[axis]} centered pivot`);
    }
    for (let axis = 0; axis < 3; axis++) {
      close(min[axis], expected.boundsMinXYZ[axis], `${'XYZ'[axis]} manifest minimum`);
      close(max[axis], expected.boundsMaxXYZ[axis], `${'XYZ'[axis]} manifest maximum`);
    }
    close(node.translation[1], -positions.description.min[1], 'bottom pivot shift');
    assert.ok(max[1] > 0.17 && max[1] < 0.19, 'source-derived nominal thickness near 18cm');
    assert.equal(floor.tileSize, 2);
    assert.equal(floor.bottomPivotY, 0);
  });
}
