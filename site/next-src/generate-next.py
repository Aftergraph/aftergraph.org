import os
import json, html
c=json.load(open('site/platform-catalog.json'))
repos={r['name']:r for r in c['repositories']}
grp={k:{i['name']:i for i in v} for k,v in c['groups'].items()}
def info(n):
    d=dict(repos[n])
    for g in grp.values():
        if n in g: d.update({k:v for k,v in g[n].items() if v is not None})
    return d
NAMES={'aie':'AIE','trust-gateway':'Trust Gateway','runtime':'Runtime','works-execution':'WORKS','relay':'Relay','studio':'Studio','fihim':'FIHIM','war-room':'War Room','wi-backend':'Wie engine','wi-frontend':'Wie','sentinel':'Sentinel','renos':'RenOS','context-continuity':'Context Continuity','continuum':'Continuum','intelligence-systems-research':'ISR','skills-vault':'Skills Vault','llm-research-development':'LLM R&D','afm':'AFM','model-registry':'Model Registry','aftergraph-cron-fabric':'Cron Fabric','docs':'Docs','skill-abi':'Skill ABI','core':'CORE','after-graph-governance':'Governance','aftergraph.org':'aftergraph.org','brand':'Brand OS','.github':'Community','business-ops':'Business Ops','rendetalje':'Rendetalje','skillport':'Skillport','veranza':'Veranza','autonomous-venture-company':'AVC'}
products=list(grp['products'])+['sentinel']
platform=[n for n in grp['platform'] if n not in products]
caps=list(grp['capabilities'])
perm=[r['name'] for r in c['repositories'] if r.get('lifecycle')!='temporary']
found=[n for n in perm if n not in set(products+platform+caps)]
nodes=[]
for g,names in [('product',products),('platform',platform),('capability',caps),('foundation',found)]:
    for n in names:
        d=info(n); nodes.append({'id':n,'name':NAMES.get(n,n),'g':g,'vis':d['visibility'],'role':(d.get('role') or '').replace('-',' '),'owns':d.get('owns') or '','url':d.get('source_url') or f'/atlas?view=topology&node=repo%3AAftergraph%2F{n}','lc':d.get('lifecycle')})
assert len(nodes)==len(perm)
COPY={
'relay':('Supervise autonomous work','Mission control for agents. Every mission, agent and machine in one governed plane, with a clear way to step in.','#42c7e8'),
'studio':('Work with agents, see the evidence','Chat, work and evidence side by side, so you see what was done and not only what was said.','#24c4ad'),
'fihim':('A personal agent that remembers','Your context and identity carry across agents and devices, under rules you set.','#7759e8'),
'war-room':('Operational intelligence','Ask what is really happening across missions, agents and compute, answered from evidence.','#f0a64a'),
'wi-frontend':('See how work really happens','Work intelligence on least privilege, read straight from the source of truth.','#4c8bd8'),
'renos':('Run a service business on agents','Scheduling, customers and day-to-day operations for real-world service companies.','#e86aa6'),
'sentinel':('Code review that checks the exact commit','Verdicts go stale when the base moves, and every claim cites its evidence.','#2fd6a0')}
def slug(n): return {'wi-frontend':'wie'}.get(n,n)
cards=[]
for i,n in enumerate(products):
    t,dsc,col=COPY[n]; d=info(n); vis=d['visibility']
    link=f'<a href="{html.escape(d["source_url"])}" target="_blank" rel="noopener">Source →</a>' if d.get('source_url') else f'<a href="/atlas?view=topology&amp;node=repo%3AAftergraph%2F{n}">In Atlas →</a>'
    cards.append(f'<article class="prod" data-product="{n}" style="--c:{col}"><div class="orb" aria-hidden="true" style="view-transition-name:orb-{slug(n)}"></div><div class="pmeta"><span class="pill {vis}">{vis}</span><span class="idx">0{i+1} / 0{len(products)}</span></div><h3 style="view-transition-name:t-{slug(n)}">{NAMES[n]}</h3><p class="tag">{t}</p><p>{dsc}</p><a class="more" href="/next/products/{slug(n)}">Explore {NAMES[n]} →</a>{link}</article>')
NPUB=sum(1 for n in nodes if n['vis']=='public')
tpl=open('site/next-src/next.tpl.html').read()
PAGES=[('The proof','/next#story','page'),('Try to break it','/next#break','page'),('Products','/next#products','page'),('Company map','/next#company','page'),('Atlas','/atlas','page'),('Community','/community','page'),('Status','/status','page'),('Current site','/','page')]
items=''.join(f'<li><a href="{u}" data-k="{html.escape(t.lower())}">{html.escape(t)}<span>{k}</span></a></li>' for t,u,k in PAGES)
for nd in nodes:
    u=('/next/products/'+slug(nd['id'])) if nd['id'] in products else nd['url']
    items+=f'<li><a href="{html.escape(u)}" data-k="{html.escape((nd["name"]+" "+nd["id"]+" "+nd["role"]+" "+nd["g"]).lower())}">{html.escape(nd["name"])}<span>{html.escape(nd["g"])} · {nd["vis"]}</span></a></li>'
LIVE=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'live.js')).read().replace('</','<\\/')
PALETTE='<dialog class="pal" id="pal" aria-label="Search Aftergraph"><input id="palq" type="search" placeholder="Search systems, products and pages…" aria-label="Search" autocomplete="off"><ul id="pall" role="listbox">'+items+'</ul><div class="hint">↑↓ to move · Enter to open · Esc to close</div></dialog>'
PALJS=open('site/next-src/palette.js').read()
out=tpl.replace('__LIVE__',LIVE).replace('__PRODUCTS__','\n'.join(cards)).replace('__NODES__',json.dumps(nodes,separators=(',',':')).replace('</','<\\/')).replace('__NPUB__',str(NPUB)).replace('__NP__',str(len(nodes))).replace('__NPROD__',str(len(products))).replace('__PALETTE__',PALETTE).replace('</body></html>','<script>'+PALJS+'</script>\n</body></html>')
open('site/next.html','w').write(out); print(len(out))

# ---------- product pages ----------
style=tpl[tpl.index('<style>')+7:tpl.index('</style>')]
head_html=tpl[:tpl.index('<title>')]
pcss="""
.phero{min-height:78vh;display:flex;align-items:flex-end;padding:120px 0 80px;position:relative;overflow:hidden}
.phero .orb{position:absolute;right:-160px;top:-120px;width:640px;height:640px;border-radius:50%;background:radial-gradient(circle at 35% 35%,color-mix(in srgb,var(--c) 90%,white 10%),color-mix(in srgb,var(--c) 30%,transparent) 45%,transparent 70%);filter:blur(6px);opacity:.8}
.phero h1{font:700 clamp(64px,13vw,190px)/.88 var(--display);letter-spacing:-.06em;margin:18px 0 18px;max-width:none}
.phero .tag{font:600 clamp(22px,3vw,34px)/1.2 var(--display);color:var(--c);margin:0 0 18px;max-width:22em}
.phero .lede{opacity:1;animation:none}
.crumb{font:700 12px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.crumb a{color:var(--muted)}
.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:0 0 70px}
.fact{padding:22px;border-radius:18px;border:1px solid var(--line);background:rgba(255,255,255,.03)}
.fact small{display:block;font:700 10px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.fact b{font:600 18px/1.3 var(--display);overflow-wrap:anywhere}
.owns{font:500 clamp(22px,2.6vw,32px)/1.35 var(--display);letter-spacing:-.01em;max-width:30em;margin:0 0 60px;color:#dfe5ee}
.pn{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:40px}
.pn a{display:flex;flex-direction:column;gap:6px;padding:22px 24px;border-radius:18px;border:1px solid var(--line);min-width:220px;color:var(--text)}
.pn a:hover{text-decoration:none;border-color:rgba(66,199,232,.5)}.pn small{color:var(--muted);font:700 10px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase}.pn b{font:700 24px/1 var(--display)}
@media(max-width:900px){.facts{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.facts{grid-template-columns:1fr}.pn a{flex:1 1 100%;min-width:0}.phero{min-height:70vh;padding:90px 0 50px}.phero .orb{width:420px;height:420px;right:-180px}}
"""
hdr=tpl[tpl.index('<header id="hdr">'):tpl.index('</header>')+9].replace('href="#story"','href="/next#story"').replace('href="#break"','href="/next#break"').replace('href="#products"','href="/next#products"').replace('href="#company"','href="/next#company"').replace('href="#talk"','href="/next#talk"')
foot=tpl[tpl.index('<footer>'):tpl.index('</footer>')+9]
pages={}
for i,n in enumerate(products):
    t,dsc,col=COPY[n]; d=info(n); sl=slug(n)
    prv=products[i-1]; nxt=products[(i+1)%len(products)]
    src=f'<a class="btn primary" href="{html.escape(d["source_url"])}" target="_blank" rel="noopener">View source</a>' if d.get('source_url') else '<span class="btn" aria-disabled="true">Private repository</span>'
    body=f"""<a class="skip" href="#main">Skip to content</a>
{hdr}
{PALETTE}
<script>{LIVE}</script>
<main id="main">
<section class="phero" style="--c:{col}"><div class="orb" aria-hidden="true" style="view-transition-name:orb-{sl}"></div><div class="wrap" style="position:relative">
<p class="crumb"><a href="/next#products">Products</a> / 0{i+1}</p>
<h1 style="view-transition-name:t-{sl}">{NAMES[n]}</h1>
<p class="tag">{t}</p>
<p class="lede">{dsc}</p>
<div class="ctas" style="opacity:1;animation:none">{src}<a class="btn" href="/atlas?view=topology&amp;node=repo%3AAftergraph%2F{n}">See it in Atlas</a></div>
</div></section>
<section class="band dark" style="--c:{col}"><div class="wrap">
<p class="kicker">From the governance catalog</p>
<p class="owns">{html.escape(d.get('owns') or '')}</p>
<div class="facts">
<div class="fact"><small>Visibility</small><b>{d['visibility']}</b></div>
<div class="fact"><small>Lifecycle</small><b>{html.escape((d.get('lifecycle') or '').replace('-',' '))}</b></div>
<div class="fact"><small>Role</small><b>{html.escape((d.get('role') or '').replace('-',' '))}</b></div>
<div class="fact"><small>Repository</small><b>Aftergraph/{html.escape(n)}</b></div>
</div>
<div class="live1" data-live-repo="{html.escape(n)}" style="margin:0 0 28px"><small>Loading live state…</small></div>
<p class="intro" style="margin-bottom:28px">Being in the catalog is not a production claim. Maturity, ownership and contracts live in the catalog and Atlas, and this page is generated from them.</p>
<div class="ctas" style="opacity:1;animation:none"><a class="btn" href="/next#story">See how Aftergraph proves work</a><a class="btn" href="/platform/catalog.json">Raw catalog</a></div>
<nav class="pn" aria-label="More products"><a href="/next/products/{slug(prv)}"><small>← Previous</small><b>{NAMES[prv]}</b></a><a href="/next/products/{slug(nxt)}" style="text-align:right"><small>Next →</small><b>{NAMES[nxt]}</b></a></nav>
</div></section>
</main>
{foot}
<script>{PALJS}</script>"""
    doc=head_html+f'<title>{NAMES[n]} · Aftergraph</title>\n<meta name="robots" content="noindex, nofollow">\n<meta name="description" content="{html.escape(t)}. {html.escape(dsc)}">\n<meta name="theme-color" content="#04060c">\n<style>'+style+pcss+'</style>\n<script type="speculationrules">{"prerender":[{"where":{"href_matches":"/next/products/*"},"eagerness":"moderate"}]}</script>\n</head>\n<body>\n'+body+'\n</body></html>'
    pages['/next/products/'+sl]=doc
json.dump(pages,open('site/next-products.json','w'))
print('product pages',len(pages))
