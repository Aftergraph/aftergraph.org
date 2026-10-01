(()=>{const L={passing:['passing','#2fbf71'],failing:['failing','#e5484d'],pending:['running','#f0a64a'],'no-ci':['no CI','#8a8f98'],unknown:['unknown','#8a8f98'],private:['private','#5b6070']};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ago=t=>{if(!t)return'';const m=Math.round((Date.now()-Date.parse(t))/6e4);return m<60?m+' min ago':m<2880?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
const chip=r=>{const[l,c]=L[r.status]||L.unknown;return`<span class="lc" style="--lc:${c}"><i></i>${l}</span>`};
const row=r=>r.visibility==='private'?`<li class="lr pv"><b>${esc(r.name)}</b>${chip(r)}<span class="lm">activity not published</span></li>`:
`<li class="lr"><a href="https://github.com/Aftergraph/${esc(r.name)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b></a>${chip(r)}<span class="lm">${r.head?`<code>${esc(r.head.slice(0,7))}</code> ${esc(ago(r.headAt))}`:'HEAD unknown'}${r.release?` · ${esc(r.release.tag)}`:''}${r.openPRs!=null?` · ${esc(r.openPRs)} open PR${r.openPRs===1?'':'s'}`:''}${r.checks&&r.checks.failing.length?` · failing: ${esc(r.checks.failing.join(', '))}`:''}</span></li>`;
fetch('/next/ecosystem-state.json').then(x=>x.ok?x.json():Promise.reject()).then(s=>{
const when=s.generatedAt?new Date(s.generatedAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'unknown';
document.querySelectorAll('[data-live-meta]').forEach(e=>{const c=s.counts||{};e.textContent=`Verified at ${when} from GitHub. ${c.passing??0} passing, ${c.failing??0} failing, ${(c.pending??0)} running, ${(c.noCi??0)+(c.unknown??0)} without a verdict, ${c.private??0} private.`});
const g=document.getElementById('livegrid');if(g){const o={failing:0,pending:1,passing:2,'no-ci':3,unknown:4,private:5};g.innerHTML=[...s.repos].sort((a,b)=>(o[a.status]??9)-(o[b.status]??9)||a.name.localeCompare(b.name)).map(row).join('')}
document.querySelectorAll('[data-live-repo]').forEach(e=>{const r=s.repos.find(x=>x.name===e.dataset.liveRepo);e.innerHTML=r?`<ul class="lg one">${row(r)}</ul><small>Verified at ${esc(when)} from GitHub.</small>`:'<small>No live record for this system yet.</small>'});
}).catch(()=>{document.querySelectorAll('[data-live-meta],[data-live-repo]').forEach(e=>e.textContent='Live state could not be loaded. Nothing is shown rather than a guess.')})})();
