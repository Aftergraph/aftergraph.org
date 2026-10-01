(function(){
var d=document.getElementById('pal');if(!d||!d.showModal)return;
var q=document.getElementById('palq'),list=[].slice.call(d.querySelectorAll('li a')),sel=0;
function vis(){return list.filter(function(a){return a.parentNode.style.display!=='none'})}
function mark(){var v=vis();v.forEach(function(a,i){a.setAttribute('aria-selected',i===sel?'true':'false')});if(v[sel])v[sel].scrollIntoView({block:'nearest'})}
function filter(){var t=q.value.trim().toLowerCase();list.forEach(function(a){a.parentNode.style.display=!t||(a.dataset.k+' '+a.textContent.toLowerCase()).indexOf(t)>=0?'':'none'});sel=0;mark()}
function open(){if(d.open)return;d.showModal();q.value='';filter();q.focus()}
document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();d.open?d.close():open()}else if(e.key==='/'&&!d.open&&!/input|textarea/i.test((e.target.tagName||''))){e.preventDefault();open()}});
[].forEach.call(document.querySelectorAll('[data-pal]'),function(b){b.addEventListener('click',open)});
q.addEventListener('input',filter);
q.addEventListener('keydown',function(e){var v=vis();if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(v.length-1,sel+1);mark()}else if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,sel-1);mark()}else if(e.key==='Enter'&&v[sel]){e.preventDefault();d.close();v[sel].click()}});
d.addEventListener('click',function(e){if(e.target===d)d.close()});
list.forEach(function(a){a.addEventListener('click',function(){d.close()})});
})();
