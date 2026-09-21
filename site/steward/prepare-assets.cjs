'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const ROOT=__dirname;
const CHUNKS=path.join(ROOT,'chunks');
const DIST=path.join(ROOT,'dist');
const ASSETS=path.join(DIST,'assets');
const VENDOR=path.join(DIST,'vendor');

const EXPECTED={
  glb:{bytes:609908,sha256:'187819a9086b12366f33f5290db98f7921b55e0674bf4aaee000e76241cb605f'},
  zip:{bytes:639339,sha256:'d10fc1d7b174630241dbde64a8cedba380e36dfaecc31ddb3bfe75d28b9b1024'}
};
const fail=(m)=>{throw new Error('STEWARD-ASSET-PREP-FAIL: '+m)};
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const parts=(prefix)=>{
  if(!fs.existsSync(CHUNKS)) fail('chunks directory missing');
  const files=fs.readdirSync(CHUNKS).filter(f=>f.startsWith(prefix+'.part')&&f.endsWith('.b64')).sort();
  if(!files.length) fail('no '+prefix+' chunks');
  for(let i=0;i<files.length;i++){
    const want=prefix+'.part'+String(i).padStart(3,'0')+'.b64';
    if(files[i]!==want) fail('non-contiguous '+prefix+' chunk sequence at '+i+': '+files[i]);
  }
  return files;
};
const decode=(prefix)=>{
  const files=parts(prefix);
  const encoded=files.map(f=>fs.readFileSync(path.join(CHUNKS,f),'utf8').trim()).join('');
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) fail(prefix+' chunks are not canonical base64');
  const out=Buffer.from(encoded,'base64');
  return {out,files};
};
const verify=(name,buf,expected)=>{
  if(buf.length!==expected.bytes) fail(name+' bytes '+buf.length+' != '+expected.bytes);
  const digest=sha(buf);
  if(digest!==expected.sha256) fail(name+' sha256 '+digest+' != '+expected.sha256);
  return digest;
};

fs.rmSync(DIST,{recursive:true,force:true});
fs.mkdirSync(ASSETS,{recursive:true});
fs.mkdirSync(VENDOR,{recursive:true});

const glb=decode('glb');
const zip=decode('zip');
const glbSha=verify('glb',glb.out,EXPECTED.glb);
const zipSha=verify('zip',zip.out,EXPECTED.zip);
fs.writeFileSync(path.join(ASSETS,'steward-rig-v1.glb'),glb.out);
fs.writeFileSync(path.join(ASSETS,'steward-rig-v1-verified-exports.zip'),zip.out);
fs.copyFileSync(path.join(ROOT,'evidence.json'),path.join(DIST,'evidence.json'));

const THREE=path.join(ROOT,'node_modules','three');
const required=[
  ['build/three.module.js','three.module.js'],
  ['build/three.core.js','three.core.js'],
  ['examples/jsm/loaders/GLTFLoader.js','GLTFLoader.js'],
  ['examples/jsm/utils/BufferGeometryUtils.js','BufferGeometryUtils.js']
];
for(const [srcRel,destName] of required){
  const src=path.join(THREE,srcRel);
  if(!fs.existsSync(src)) fail('missing pinned Three.js file '+srcRel);
  let text=fs.readFileSync(src,'utf8');
  if(destName==='GLTFLoader.js'){
    text=text.replace("from 'three';","from './three.module.js';")
             .replace("from '../utils/BufferGeometryUtils.js';","from './BufferGeometryUtils.js';");
  }
  if(destName==='BufferGeometryUtils.js') text=text.replace("from 'three';","from './three.module.js';");
  if(/from ['"]three['"]/.test(text)) fail(destName+' still contains bare three import');
  fs.writeFileSync(path.join(VENDOR,destName),text);
}

const manifest={
  schema:'steward-cloudflare-assets/1.0',
  three_version:'0.180.0',
  glb:{
    ...EXPECTED.glb,
    sha256:glbSha,
    chunks:glb.files.length,
    r2_key:'steward/v1/sha256/'+glbSha+'/steward-rig-v1.glb'
  },
  export_pack:{
    ...EXPECTED.zip,
    sha256:zipSha,
    chunks:zip.files.length,
    r2_key:'steward/v1/sha256/'+zipSha+'/steward-rig-v1-verified-exports.zip'
  }
};
fs.writeFileSync(path.join(DIST,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('STEWARD-ASSET-PREP-PASS glb_chunks='+glb.files.length+' zip_chunks='+zip.files.length);
