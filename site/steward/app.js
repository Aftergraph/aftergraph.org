import * as THREE from '/steward/vendor/three.module.js';
import { GLTFLoader } from '/steward/vendor/GLTFLoader.js';

const stage=document.querySelector('#steward-stage');
const canvas=document.querySelector('#steward-canvas');
const fallback=document.querySelector('#steward-fallback');
const status=document.querySelector('#steward-status');
const release=document.querySelector('#release-label');
const required=['idle','blink','verify'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

async function boot(){
  const version=await fetch('/steward/version.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  if(version?.sha) release.textContent='cloudflare-edge · '+version.sha.slice(0,12)+' · projection-only';

  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(32,1,.1,100);
  camera.position.set(0,.18,6.2);
  scene.add(new THREE.HemisphereLight(0xffffff,0x29313a,1.35));
  const key=new THREE.DirectionalLight(0xfff7ea,3);key.position.set(-3.2,5.2,4.6);scene.add(key);
  const fill=new THREE.DirectionalLight(0x9fe6df,1.0);fill.position.set(4.2,2,2.8);scene.add(fill);
  const rim=new THREE.PointLight(0xc2703d,3.1,9,2);rim.position.set(-1.8,3.5,-2.4);scene.add(rim);

  const gltf=await new GLTFLoader().loadAsync('/steward/assets/steward-rig-v1.glb');
  const names=gltf.animations.map(c=>c.name);
  for(const name of required) if(!names.includes(name)) throw new Error('verified rig missing clip '+name);

  const root=new THREE.Group();
  scene.add(root);
  const model=gltf.scene;
  root.add(model);
  model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model);
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const scale=3.65/Math.max(size.y,.001);
  model.scale.setScalar(scale);
  model.position.set(-center.x*scale,-center.y*scale-.05,-center.z*scale);

  const mixer=new THREE.AnimationMixer(model);
  const clips=new Map(gltf.animations.map(c=>[c.name,c]));
  const idle=mixer.clipAction(clips.get('idle'));
  const blink=mixer.clipAction(clips.get('blink'));
  const verify=mixer.clipAction(clips.get('verify'));
  idle.setLoop(THREE.LoopRepeat,Infinity);
  blink.setLoop(THREE.LoopOnce,1);
  verify.setLoop(THREE.LoopOnce,1);
  if(!reduced) idle.play();

  const resize=()=>{const r=stage.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();};
  new ResizeObserver(resize).observe(stage);resize();

  let px=0,py=0,nextBlink=3.8,previous='';
  stage.addEventListener('pointermove',event=>{const r=stage.getBoundingClientRect();px=((event.clientX-r.left)/r.width-.5)*2;py=((event.clientY-r.top)/r.height-.5)*2;});

  const clock=new THREE.Clock();
  stage.dataset.ready='true';
  stage.dataset.model='verified-rig-glb';
  stage.dataset.clips=names.join(',');
  fallback.classList.add('hidden');
  status.textContent='Verified rig · '+required.join(' · ');

  function frame(){
    const delta=Math.min(clock.getDelta(),.05);
    const t=clock.elapsedTime;
    const phase=t%10<6?'idle':t%10<9?'verifying':'succeeded';
    if(!reduced){
      mixer.update(delta);
      if(t>=nextBlink&&phase!=='verifying'){blink.reset().play();nextBlink=t+4.1+(Math.floor(t/10)%3)*.4;}
      if(phase==='verifying'&&previous!=='verifying') verify.reset().play();
      root.rotation.y+=(px*.10-root.rotation.y)*.045;
      root.rotation.x+=(-py*.035-root.rotation.x)*.045;
      root.position.y=Math.sin(t*.8)*.025;
    }
    previous=phase;
    renderer.render(scene,camera);
    requestAnimationFrame(frame);
  }
  frame();
}

boot().catch(error=>{
  console.error('STEWARD presence failed closed',error);
  stage.dataset.ready='false';
  stage.dataset.model='fallback-2d';
  stage.dataset.clips='';
  status.textContent='Static governed presence';
});