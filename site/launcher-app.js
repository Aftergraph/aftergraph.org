const REGISTRY_URL='/launcher-registry.json';
let PRODUCTS=[];
let ACTIONS=[];
let FEATURED_PRODUCTS=new Set();
let FEATURED_ACTIONS=new Set();
let COMMANDS=[];
const ICONS = {
  studio:'<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9z"/>',
  wie:'<path d="M6 17V9M12 17V5M18 17v-6"/>',
  sentinel:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
  works:'<path d="m4 8 8-4 8 4-8 4-8-4Zm0 5 8 4 8-4M4 18l8 4 8-4"/>',
  trust:'<path d="M9.5 14.5 7 17a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M14.5 9.5 17 7a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0M8.5 15.5l7-7"/>',
  aie:'<path d="m12 4 8 15H4L12 4Z"/><circle cx="12" cy="14" r="1"/>',
  runtime:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9"/>',
  atlas:'<circle cx="6" cy="12" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="18" cy="17" r="2"/><path d="m8 11 8-3M8 13l8 3"/>',
  docs:'<path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6M9 16h6"/>',
  brand:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><circle cx="12" cy="12" r="2.5"/>',
  research:'<path d="M7 4h10M9 4v6l-4 7a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-7V4M8 15h8"/>',
  governance:'<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Zm-3 9 2 2 4-4"/>',
  github:'<circle cx="12" cy="12" r="8"/><path d="M9 20v-3.5c-2 .4-2.5-.8-3-1.5M15 20v-3.5c0-1 .3-1.7.8-2.2 2.5-.3 5.2-1.2 5.2-5.1 0-1.1-.4-2-1.1-2.8.1-.3.5-1.5-.1-2.8 0 0-.9-.3-2.9 1.1a10 10 0 0 0-5.2 0C9.7 3.3 8.8 3.6 8.8 3.6c-.6 1.3-.2 2.5-.1 2.8A4 4 0 0 0 7.6 9.2c0 3.9 2.7 4.8 5.2 5.1"/>',
  verify:'<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  status:'<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  clear:'<path d="M7 7l10 10M17 7 7 17"/>'
};
const q=document.getElementById('q');
const results=document.getElementById('results');
const count=document.getElementById('count');
const focusKey=document.getElementById('focus-key');
let productById=new Map();
let itemByUrl=new Map();
let filtered=[];let active=0;let recentIds=[];let zeroResultTimer=null;
function hydrateRecents(){
  try{
    const raw=JSON.parse(localStorage.getItem('af-recent')||'[]');
    if(Array.isArray(raw)){
      recentIds=[...new Set(raw.map(value=>productById.has(value)?value:itemByUrl.get(value)?.rememberId||itemByUrl.get(value)?.id).filter(id=>productById.has(id)))].slice(0,5);
    }
  }catch(_){recentIds=[];}
}
function installRegistry(registry){
  PRODUCTS=(registry.entities||[]).map(item=>({...item,kind:'entity',group:'Products / Systems'}));
  ACTIONS=(registry.actions||[]).map(item=>({...item,rememberId:item.remember_id||item.rememberId,group:'Actions'}));
  FEATURED_PRODUCTS=new Set(registry.featured_entities||[]);
  FEATURED_ACTIONS=new Set(registry.featured_actions||[]);
  COMMANDS=[...ACTIONS,{id:'clear-recent',kind:'utility',group:'Actions',name:'Clear recent',description:'Forget launcher history stored on this device',action:'clearRecent',aliases:['clear','forget','history','recent'],icon:'clear'}];
  productById=new Map(PRODUCTS.map(item=>[item.id,item]));
  itemByUrl=new Map([...PRODUCTS,...ACTIONS].map(item=>[item.url,item]));
  hydrateRecents();
}
function esc(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function icon(name){const body=ICONS[name]||ICONS.runtime;return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';}
function badge(item){return item.maturity?'<span class="badge badge-'+esc(item.maturity)+'">'+esc(item.maturity)+'</span>':'';}
function haystack(item){return [item.name,item.description,item.group,...(item.aliases||[])].join(' ').toLowerCase();}
function fuzzy(hay,needle){let j=0;for(let i=0;i<hay.length&&j<needle.length;i++){if(hay[i]===needle[j])j++;}return j===needle.length;}
function score(item,needle){
  if(!needle)return 1;
  const n=needle.toLowerCase();const name=item.name.toLowerCase();const aliases=(item.aliases||[]).map(x=>x.toLowerCase());const hay=haystack(item);
  if(name===n)return 100;if(name.startsWith(n))return 90;if(name.includes(n))return 80;
  if(aliases.some(x=>x===n))return 76;if(aliases.some(x=>x.startsWith(n)))return 70;if(hay.includes(n))return 60;
  const fuzzyTokens=[name,...aliases].flatMap(value=>value.split(/\s+/));
  return fuzzyTokens.some(token=>fuzzy(token,n))?20:-1;
}
function ranked(source,needle){return source.map((item,index)=>({item,index,score:score(item,needle)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.item);}
function recentItems(){return recentIds.map(id=>productById.get(id)).filter(Boolean).map(item=>({...item,group:'Recent'}));}
function parseIntent(text){
  const trimmed=text.trim();
  if(trimmed.startsWith('>'))return {type:'action',needle:trimmed.slice(1).trim()};
  const evidence=trimmed.match(/^(?:evidence|inspect evidence|show evidence)\s+(.+)$/i);
  if(evidence)return {type:'evidence',needle:evidence[1].trim()};
  const verify=trimmed.match(/^verify\s+(.+)$/i);
  if(verify)return {type:'verify',needle:verify[1].trim()};
  return {type:'find',needle:trimmed};
}
function evidenceResults(needle){
  return ranked(PRODUCTS,needle).slice(0,6).map(item=>({
    id:'evidence-'+item.id,kind:'evidence',group:'Evidence',name:'Inspect evidence — '+item.name,
    description:'Open Atlas at the canonical/observed evidence boundary for '+item.name,
    url:item.evidence_url||'/atlas',aliases:['evidence',...(item.aliases||[])],icon:'atlas',rememberId:item.id
  }));
}
function matchSet(text){
  const intent=parseIntent(text);const needle=intent.needle;
  if(intent.type==='action')return ranked(COMMANDS,needle);
  if(intent.type==='evidence')return evidenceResults(needle);
  if(intent.type==='verify'){
    const target=ranked(PRODUCTS,needle)[0];const action=ACTIONS.find(item=>item.id==='intent-verify');
    return action?[{...action,name:target?'Verify — '+target.name:action.name,description:target?'Open Sentinel to verify evidence for '+target.name:action.description}]:[];
  }
  if(!needle)return [...recentItems(),...PRODUCTS.filter(item=>FEATURED_PRODUCTS.has(item.id)),...ACTIONS.filter(item=>FEATURED_ACTIONS.has(item.id))];
  return [...ranked(PRODUCTS,needle),...ranked(ACTIONS,needle)];
}
function groupMarkup(label,n){return '<div class="group-head" role="presentation"><span>'+esc(label)+'</span><span class="group-count">'+n+' item'+(n===1?'':'s')+'</span></div>';}
function telemetry(payload){
  try{
    const body=JSON.stringify(payload);
    if(body.length>1024)return;
    if(navigator.sendBeacon){navigator.sendBeacon('/api/launcher/telemetry',new Blob([body],{type:'application/json'}));return;}
    fetch('/api/launcher/telemetry',{method:'POST',headers:{'content-type':'application/json'},body,keepalive:true}).catch(()=>{});
  }catch(_){}
}
function latencyBucket(ms){if(ms<100)return 'lt100';if(ms<300)return '100-299';if(ms<1000)return '300-999';return 'gte1000';}
function resultBucket(n){if(n<=0)return '0';if(n<=5)return '1-5';if(n<=20)return '6-20';return 'gt20';}
function scheduleZeroResult(){
  clearTimeout(zeroResultTimer);const intent=parseIntent(q.value).type;
  if(q.value.trim().length<2)return;
  zeroResultTimer=setTimeout(()=>telemetry({event:'zero_result',intent,result_bucket:'0'}),500);
}
function cancelZeroResult(){clearTimeout(zeroResultTimer);zeroResultTimer=null;}
async function probeInternalDestinations(){
  try{if(sessionStorage.getItem('af-launcher-probed')==='1')return;sessionStorage.setItem('af-launcher-probed','1');}catch(_){}
  const targets=PRODUCTS.filter(item=>FEATURED_PRODUCTS.has(item.id)&&item.url.startsWith('/'));
  for(const item of targets){
    const started=performance.now();let status='fail';
    try{const response=await fetch(item.url,{method:'HEAD',cache:'no-store'});status=response.ok?'ok':'fail';}catch(_){}
    telemetry({event:'destination_probe',item_id:item.id,status,latency_bucket:latencyBucket(performance.now()-started)});
  }
}
function render(){
  filtered=matchSet(q.value.trim());active=0;
  count.textContent=filtered.length+' hit'+(filtered.length===1?'':'s');
  if(!filtered.length){scheduleZeroResult();results.innerHTML='<div class="empty"><strong>No matching destination.</strong>Try a product name, capability, repository, or action.</div>';q.removeAttribute('aria-activedescendant');return;}
  cancelZeroResult();
  const counts=new Map();for(const item of filtered)counts.set(item.group,(counts.get(item.group)||0)+1);
  let html='';let last='';
  filtered.forEach((item,index)=>{
    if(item.group!==last){html+=groupMarkup(item.group,counts.get(item.group));last=item.group;}
    const label=item.name+(item.description?', '+item.description:'');
    html+='<div class="item'+(index===0?' active':'')+'" role="option" id="launcher-option-'+index+'" aria-selected="'+(index===0)+'" aria-label="'+esc(label)+'" data-i="'+index+'" data-icon="'+esc(item.icon)+'">'
      +'<span class="item-icon">'+icon(item.icon)+'</span>'
      +'<span class="item-name">'+esc(item.name)+'</span>'
      +'<span class="item-desc">'+esc(item.description)+'</span>'
      +'<span class="item-right">'+badge(item)+'</span>'
      +'<span class="item-arrow" aria-hidden="true">→</span></div>';
  });
  results.innerHTML=html;syncActive(false);
}
function syncActive(scroll=true){
  const rows=[...results.querySelectorAll('.item')];
  rows.forEach((row,index)=>{const selected=index===active;row.classList.toggle('active',selected);row.setAttribute('aria-selected',String(selected));});
  if(filtered[active])q.setAttribute('aria-activedescendant','launcher-option-'+active);else q.removeAttribute('aria-activedescendant');
  if(scroll)rows[active]?.scrollIntoView({block:'nearest'});
}
function persistRecents(){try{localStorage.setItem('af-recent',JSON.stringify(recentIds));}catch(_){}}
function remember(item){
  const id=item.rememberId||item.id;if(!productById.has(id))return;
  recentIds=[id,...recentIds.filter(x=>x!==id)].slice(0,5);persistRecents();
}
function openItem(index){
  const item=filtered[index];if(!item)return;
  if(item.action==='clearRecent'){recentIds=[];try{localStorage.removeItem('af-recent');}catch(_){}q.value='';render();return;}
  remember(item);telemetry({event:'item_open',item_id:item.rememberId||item.id,item_kind:item.kind||'unknown',intent:parseIntent(q.value).type});window.location.assign(item.url);
}
results.addEventListener('click',event=>{const row=event.target.closest('.item');if(row)openItem(Number(row.dataset.i));});
if(window.matchMedia('(pointer:fine)').matches){results.addEventListener('mousemove',event=>{const row=event.target.closest('.item');if(!row)return;active=Number(row.dataset.i);syncActive(false);});}
q.addEventListener('input',render);
q.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'){event.preventDefault();active=Math.min(active+1,filtered.length-1);}
  else if(event.key==='ArrowUp'){event.preventDefault();active=Math.max(active-1,0);}
  else if(event.key==='Home'){event.preventDefault();active=0;}
  else if(event.key==='End'){event.preventDefault();active=Math.max(0,filtered.length-1);}
  else if(event.key==='Enter'){event.preventDefault();openItem(active);return;}
  else if(event.key==='Escape'){event.preventDefault();if(q.value){q.value='';render();}return;}
  else return;
  syncActive();
});
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();q.focus();q.select();}});
const mac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);focusKey.textContent=mac?'⌘ K':'Ctrl K';
async function bootstrap(){
  results.innerHTML='<div class="empty"><strong>Loading launcher registry…</strong></div>';
  try{
    const response=await fetch(REGISTRY_URL,{cache:'no-store'});
    if(!response.ok)throw new Error('registry HTTP '+response.status);
    const registry=await response.json();
    if(registry.schema!=='aftergraph-launcher-registry/1.0')throw new Error('unsupported launcher registry');
    installRegistry(registry);
    telemetry({event:'registry_loaded',result_bucket:resultBucket(PRODUCTS.length)});
  }catch(_){
    installRegistry({
      featured_entities:['atlas','knowledge-plane'],featured_actions:['open-status'],
      entities:[
        {id:'atlas',name:'Atlas',description:'Evidence-aware development observatory',url:'/atlas',maturity:'production',aliases:['graph','evidence'],icon:'atlas',evidence_url:'/atlas'},
        {id:'knowledge-plane',name:'Knowledge Plane (docs)',description:'Aftergraph documentation',url:'https://docs.aftergraph.org/',maturity:'production',aliases:['docs'],icon:'docs',evidence_url:'/atlas'}
      ],
      actions:[{id:'open-status',kind:'evidence',name:'Open public status evidence',description:'Inspect the public operational snapshot',url:'/status',aliases:['status','health'],icon:'status'}]
    });
    telemetry({event:'registry_failure'});
  }
  render();
  setTimeout(probeInternalDestinations,700);
  if(window.matchMedia('(pointer:fine)').matches)q.focus();
}
bootstrap();
