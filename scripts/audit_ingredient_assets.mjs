import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

async function inspect(path){
 const b=await readFile(path),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),bin=28+b.readUInt32LE(12);
 const primitives=j.meshes.flatMap(m=>m.primitives),geometryViews=new Set(),morphViews=new Set();
 function addAccessorViews(set,index){
  const a=j.accessors[index];
  if(a.bufferView!==undefined)set.add(a.bufferView);
  if(a.sparse){set.add(a.sparse.indices.bufferView);set.add(a.sparse.values.bufferView);}
 }
 for(const p of primitives)for(const a of [p.indices,...Object.values(p.attributes)])addAccessorViews(geometryViews,a);
 for(const p of primitives)for(const t of p.targets??[])for(const a of Object.values(t))addAccessorViews(morphViews,a);
 const images=(j.images??[]).map(i=>{
  const v=j.bufferViews[i.bufferView],start=bin+(v.byteOffset??0),data=b.subarray(start,start+v.byteLength);
  const png=data.toString('hex',0,8)==='89504e470d0a1a0a';
  assert.ok(png,'audit expects embedded PNG images');
  return {width:data.readUInt32BE(16),height:data.readUInt32BE(20),compressedBytes:data.length};
 });
 const morphTextureBytesMinimum=primitives.reduce((sum,p)=>sum+(p.targets?.length??0)*j.accessors[p.attributes.POSITION].count*(p.targets?.[0].COLOR_0!==undefined?3:p.targets?.[0].NORMAL!==undefined?2:1)*16,0);
 return {path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),triangles:primitives.reduce((n,p)=>n+j.accessors[p.indices].count/3,0),drawPrimitives:primitives.length,geometryBufferBytes:[...geometryViews].reduce((n,v)=>n+j.bufferViews[v].byteLength,0),morphBufferBytes:[...morphViews].reduce((n,v)=>n+j.bufferViews[v].byteLength,0),morphTextureBytesMinimum,images,textureBytesEstimate:images.reduce((n,i)=>n+i.width*i.height*4*4/3,0)};
}
if(process.argv.includes('--polish')){
 const report={baseline:'1539387',note:'Unique offline asset buffers; morph bytes are additional. RGBA8 image estimates and RGBA32F morph textures are reported separately. Morph texture minimum follows installed Three.js WebGLMorphtargets: vertices * attribute stride * 16 * targets, before texture-row padding. Excludes driver and render targets. Original pedestal files are reused unchanged.',desktop:{before:[],after:[]},mobile:{before:[],after:[]}};
 for(const tier of ['desktop','mobile']){
  for(const name of ['chili','slime-shroom','egg-shell']){
   report[tier].before.push(await inspect(`public/assets/ingredient-phase3a/${name}-${tier}.glb`));
   report[tier].after.push(await inspect(`public/assets/ingredient-phase3a-polish/${name}-${tier}.glb`));
  }
  report[tier].mount=await inspect(`public/assets/ingredient-phase3a-polish/tier-mount-${tier}.glb`);
  report[tier].unchangedPedestal=await inspect(`public/assets/ingredient-phase3a/pedestal-${tier}.glb`);
 }
 await mkdir('docs/qa/ingredient-art-phase3a-polish',{recursive:true});
 await writeFile('docs/qa/ingredient-art-phase3a-polish/assets.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}else{
const report={note:'Offline single-instance geometry and RGBA8+mipmap estimates. Runtime reuse is measured separately. No driver/renderer allocation measurement.',legacy:[],desktop:[],mobile:[]};
for(const name of ['ingredient-chili','ingredient-slime-shroom','ingredient-rune-shell'])report.legacy.push(await inspect(`public/assets/hero/${name}.glb`));
for(const tier of ['desktop','mobile'])for(const name of ['pedestal','chili','slime-shroom','egg-shell'])report[tier].push(await inspect(`public/assets/ingredient-phase3a/${name}-${tier}.glb`));
for(const tier of ['legacy','desktop','mobile'])console.log(tier,JSON.stringify(report[tier].map(({path,triangles,drawPrimitives,bytes,geometryBufferBytes,textureBytesEstimate})=>({path,triangles,drawPrimitives,bytes,geometryBufferBytes,textureBytesEstimate}))));
await writeFile('docs/qa/ingredient-art-phase3a/assets.json',JSON.stringify(report,null,2));
}
