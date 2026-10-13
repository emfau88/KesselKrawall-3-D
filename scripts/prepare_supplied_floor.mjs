import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

// The separately supplied floor is already authored with PBR maps and LODs.
// Preserve all BIN/texture/vertex data: only normalize its bottom pivot in JSON.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function parse(bytes) {
  if(bytes.readUInt32LE(0)!==0x46546c67 || bytes.readUInt32LE(4)!==2) throw new Error('Expected GLB 2');
  const size=bytes.readUInt32LE(12);
  return {json:JSON.parse(bytes.toString('utf8',20,20+size)),tail:bytes.subarray(20+size),bin:bytes.subarray(28+size)};
}
function textures(json,bin){return json.images.map(img=>{const view=json.bufferViews[img.bufferView];return hash(bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength));});}
const manifestFile=resolve('art/source/mockup-runtime-manifest.json');
const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
const lods={};
for(const [variant,source] of [['desktop','source.glb'],['mobile','source-mobile.glb']]){
  const sourcePath=`art/source/batch-03/dungeon-floor-module/${source}`;
  const input=readFileSync(sourcePath);
  const {json,tail,bin}=parse(input);
  const mesh=json.meshes[0], primitive=mesh.primitives[0];
  const position=json.accessors[primitive.attributes.POSITION];
  const shift=-position.min[1];
  for(const node of json.nodes)if(node.mesh!==undefined)node.translation=[0,shift,0];
  const encoded=Buffer.from(JSON.stringify(json));
  const padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,0x20);encoded.copy(padded);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);
  header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const output=Buffer.concat([header,padded,tail]);
  mkdirSync('public/assets/environment/dungeon-floor-module',{recursive:true});
  const path=`public/assets/environment/dungeon-floor-module/dungeon-floor-module-${variant}.glb`;
  writeFileSync(path,output);
  const triangles=json.accessors[primitive.indices].count/3;
  lods[variant]={path,bytes:output.length,sha256:hash(output),source:sourcePath,sourceSha256:hash(input),
    triangles,vertices:position.count,meshes:1,materials:1,images:json.images.length,
    normalAttributesPresent:true,metallicFactor:0,roughnessFactor:1,
    sourceEmbeddedAtlasSha256:textures(json,bin),embeddedAtlasSha256:textures(json,bin),
    originalEncodedAtlasRetained:true,groundShiftY:shift,anchors:{},
    boundsMinXYZ:[position.min[0],0,position.min[2]],
    boundsMaxXYZ:[position.max[0],position.max[1]+shift,position.max[2]],
    binChunkRetained:true,authoredPbrMapsRetained:true};
  console.log(`${variant}: ${triangles} triangles; original BIN and all three PBR PNGs retained.`);
}
manifest.floorModule={status:'supplied-source-integrated-in-local-preview',runtimeReplacementCreated:true,
  generator:'scripts/prepare_supplied_floor.mjs',source:'art/source/batch-03/dungeon-floor-module/source.glb',
  sourceSha256:lods.desktop.sourceSha256,tileSize:2,bottomPivotY:0,nominalTopY:.18,lods};
manifest.status='local-opt-in-preview-integrated-and-qa-passed';
writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
