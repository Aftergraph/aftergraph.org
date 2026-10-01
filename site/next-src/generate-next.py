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
cards=[]
for i,n in enumerate(products):
    t,dsc,col=COPY[n]; d=info(n); vis=d['visibility']
    link=f'<a href="{html.escape(d["source_url"])}" target="_blank" rel="noopener">Source →</a>' if d.get('source_url') else f'<a href="/atlas?view=topology&amp;node=repo%3AAftergraph%2F{n}">In Atlas →</a>'
    cards.append(f'<article class="prod" data-product="{n}" style="--c:{col}"><div class="orb" aria-hidden="true"></div><div class="pmeta"><span class="pill {vis}">{vis}</span><span class="idx">0{i+1} / 0{len(products)}</span></div><h3>{NAMES[n]}</h3><p class="tag">{t}</p><p>{dsc}</p>{link}</article>')
NPUB=sum(1 for n in nodes if n['vis']=='public')
tpl=open('site/next-src/next.tpl.html').read()
out=tpl.replace('__PRODUCTS__','\n'.join(cards)).replace('__NODES__',json.dumps(nodes,separators=(',',':')).replace('</','<\\/')).replace('__NPUB__',str(NPUB)).replace('__NP__',str(len(nodes))).replace('__NPROD__',str(len(products)))
open('site/next.html','w').write(out); print(len(out))
