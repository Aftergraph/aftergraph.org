'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const ROOT=__dirname;
const DIST=path.join(ROOT,'dist');
let failures=0;
const fail=m=>{failures++;console.error('STEWARD-VERIFY-FAIL: '+m)};
const pass=m=>console.log('STEWARD-VERIFY-PASS: '+m);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

function parseGlb(buf){
  if(buf.length<20||buf.toString('ascii',0,4)!=='glTF') throw new Error('invalid GLB magic');
  const version=buf.readUInt32LE(4);
  const declared=buf.readUInt32LE(8);
  if(version!==2) throw new Error('GLB version '+version+' != 2');
  if(declared!==buf.length) throw new Error('GLB declared length mismatch');
  const jsonLen=buf.readUInt32LE(12);
  const jsonType=buf.readUInt32LE(16);
  if(jsonType!==0x4e4f534a) throw new Error('GLB first chunk is not JSON');
  return JSON.parse(buf.subarray(20,20+jsonLen).toString('utf8').replace(/\u0000+$/,'').trim());
}

function buildChecks(){
  for(const rel of ['index.html','app.js','security.html','evidence.json','package-lock.json','dist/asset-manifest.json','dist/assets/steward-rig-v1.glb','dist/assets/steward-rig-v1-verified-exports.zip','dist/vendor/three.module.js','dist/vendor/three.core.js','dist/vendor/GLTFLoader.js','dist/vendor/BufferGeometryUtils.js']){
    if(!fs.existsSync(path.join(ROOT,rel))) fail('missing '+rel);
  }
  if(failures) return;
  const evidence=JSON.parse(fs.readFileSync(path.join(ROOT,'evidence.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(DIST,'asset-manifest.json'),'utf8'));
  const glb=fs.readFileSync(path.join(DIST,'assets','steward-rig-v1.glb'));
  const zip=fs.readFileSync(path.join(DIST,'assets','steward-rig-v1-verified-exports.zip'));
  if(glb.length!==609908) fail('GLB size drift');
  if(sha(glb)!=='187819a9086b12366f33f5290db98f7921b55e0674bf4aaee000e76241cb605f') fail('GLB SHA drift');
  if(zip.length!==639339) fail('export pack size drift');
  if(sha(zip)!=='d10fc1d7b174630241dbde64a8cedba380e36dfaecc31ddb3bfe75d28b9b1024') fail('export pack SHA drift');
  if(evidence.exports?.glb?.sha256!==manifest.glb?.sha256) fail('evidence/manifest GLB SHA mismatch');
  if(evidence.exports?.package_zip?.sha256!==manifest.export_pack?.sha256) fail('evidence/manifest ZIP SHA mismatch');
  try{
    const doc=parseGlb(glb);
    const names=(doc.animations||[]).map(a=>a.name);
    for(const n of ['blink','idle','verify']) if(!names.includes(n)) fail('GLB missing clip '+n);
    if((doc.skins||[]).length!==1) fail('GLB skin count '+(doc.skins||[]).length+' != 1');
    if((doc.nodes||[]).length!==53) fail('GLB node count drift: '+(doc.nodes||[]).length);
    if((doc.meshes||[]).length!==28) fail('GLB mesh count drift: '+(doc.meshes||[]).length);
    pass('GLB structure and named clips');
  }catch(e){fail(e.message)}
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
  if(!html.includes('src="/steward/app.js"')) fail('surface does not load scoped app.js');
  if(!html.includes('/steward/assets/steward-rig-v1.glb')) fail('surface missing GLB download');
  if(!html.includes('/steward/assets/steward-rig-v1-verified-exports.zip')) fail('surface missing export pack');
  if(/<script[^>]+src=["']https?:\/\//i.test(html)) fail('runtime CDN script in surface');
  if(/from\s+['"]https?:\/\//i.test(app)) fail('runtime CDN import in app.js');
  for(const imp of ['/steward/vendor/three.module.js','/steward/vendor/GLTFLoader.js']) if(!app.includes(imp)) fail('missing self-hosted import '+imp);
  for(const file of ['GLTFLoader.js','BufferGeometryUtils.js']){
    const text=fs.readFileSync(path.join(DIST,'vendor',file),'utf8');
    if(/from ['"]three['"]/.test(text)) fail(file+' contains bare package import');
  }
  if(manifest.three_version!=='0.180.0') fail('Three.js pin drift');
  if(!failures) pass('build surface, assets, evidence and self-hosted runtime');
}

async function liveChecks(base){
  const origin=base.replace(/\/$/,'');
  const get=async p=>{const r=await fetch(origin+p,{cache:'no-store'});return {r,b:Buffer.from(await r.arrayBuffer())}};
  for(const p of ['/steward/','/steward/app.js','/steward/security','/steward/evidence.json','/steward/version.json']){
    const {r}=await get(p+'?verify='+Date.now());
    if(r.status!==200) fail('live '+p+' -> '+r.status); else pass('live '+p+' -> 200');
  }
  const glb=await get('/steward/assets/steward-rig-v1.glb?verify='+Date.now());
  if(glb.r.status!==200) fail('live GLB -> '+glb.r.status);
  else if(sha(glb.b)!=='187819a9086b12366f33f5290db98f7921b55e0674bf4aaee000e76241cb605f') fail('live GLB SHA mismatch');
  else pass('live GLB exact SHA');
  const zip=await get('/steward/assets/steward-rig-v1-verified-exports.zip?verify='+Date.now());
  if(zip.r.status!==200) fail('live export pack -> '+zip.r.status);
  else if(sha(zip.b)!=='d10fc1d7b174630241dbde64a8cedba380e36dfaecc31ddb3bfe75d28b9b1024') fail('live export pack SHA mismatch');
  else pass('live export pack exact SHA');
  const version=await get('/steward/version.json?verify='+Date.now());
  if(version.r.status===200){
    try{
      const v=JSON.parse(version.b.toString('utf8'));
      const expected=process.env.AG_SHA||'';
      if(expected&&v.sha!==expected) fail('live version SHA '+v.sha+' != '+expected);
      else pass('live version exact HEAD '+v.sha);
    }catch(e){fail('live version JSON: '+e.message)}
  }
}

(async()=>{
  const mode=process.argv[2]||'build';
  if(mode==='build') buildChecks();
  else if(mode==='live') await liveChecks(process.argv[3]||'https://aftergraph.org');
  else fail('unknown mode '+mode);
  if(failures){console.error('STEWARD-VERIFY-FAIL: '+failures+' gate(s)');process.exit(1)}
  console.log('STEWARD-VERIFY-OK ('+mode+')');
})().catch(e=>{console.error('STEWARD-VERIFY-FAIL: '+e.stack);process.exit(1)});
