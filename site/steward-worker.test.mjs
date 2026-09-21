import test from 'node:test';
import assert from 'node:assert/strict';

const workerModule = await import('./worker.js');
const worker = workerModule.default;

function baseEnv(overrides={}) {
  return { AG_STATS:null, ATLAS_V3_DB:null, ATLAS_V3_ARTIFACTS:null, ...overrides };
}

async function request(path, method='GET', env=baseEnv()) {
  return worker.fetch(new Request('https://aftergraph.org'+path,{method}),env);
}

test('STEWARD public text/runtime routes are GET/HEAD only and self-hosted', async()=>{
  const home=await request('/steward/');
  assert.equal(home.status,200);
  const html=await home.text();
  assert.match(html,/STEWARD/);
  assert.match(html,/\/steward\/app\.js/);

  const version=await request('/steward/version.json');
  assert.equal(version.status,200);
  const payload=await version.json();
  assert.equal(payload.schema,'steward-public-surface/1.0');
  assert.equal(payload.projection_contract,'steward.presence-projection/1.0');

  const vendor=await request('/steward/vendor/GLTFLoader.js');
  assert.equal(vendor.status,200);
  assert.match(vendor.headers.get('content-type'),/javascript/);

  const denied=await request('/steward/','POST');
  assert.equal(denied.status,405);
  assert.equal(denied.headers.get('allow'),'GET, HEAD');
});

test('STEWARD binary distribution fails closed without exact R2 object size', async()=>{
  const missing=await request('/steward/assets/steward-rig-v1.glb');
  assert.equal(missing.status,503);

  const wrong=await request('/steward/assets/steward-rig-v1.glb','GET',baseEnv({
    ATLAS_V3_ARTIFACTS:{async get(){return {body:new Uint8Array(1),size:1,httpEtag:'"bad"'};}}
  }));
  assert.equal(wrong.status,503);
});

test('STEWARD binary distribution streams exact-size R2 objects with immutable headers', async()=>{
  let seenKey='';
  const body=new Uint8Array(609908);
  const env=baseEnv({ATLAS_V3_ARTIFACTS:{async get(key){seenKey=key;return {body,size:body.byteLength,httpEtag:'"ok"'};}}});
  const response=await request('/steward/assets/steward-rig-v1.glb','GET',env);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'model/gltf-binary');
  assert.equal(response.headers.get('content-length'),'609908');
  assert.match(response.headers.get('cache-control'),/immutable/);
  assert.match(seenKey,/steward\/v1\/sha256\/187819a9086b12366f33f5290db98f7921b55e0674bf4aaee000e76241cb605f/);
  assert.equal((await response.arrayBuffer()).byteLength,609908);
});
