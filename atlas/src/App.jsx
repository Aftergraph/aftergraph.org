import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, Position, useNodesState, useEdgesState } from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import * as d3 from 'd3';
import 'reactflow/dist/style.css';
import {
  deriveGraph,
  focusGraph,
  indexAssertions,
  moveSelection,
  serializeState,
  parseState,
  elkOptions,
  shortLabel,
  impactSet,
  askRetrieve,
  validateAnswer,
} from './lib/derive.js';
import enrichFixtures from '../../docs/atlas/enrich/fixtures.json';

const VIEWS = ['topology', 'pulse', 'contracts', 'capabilities', 'models', 'research', 'snapshots', 'ask'];

const GENERATOR_CMD =
  'node site/generate-atlas-projection.mjs --ledger <ledger-dir> --gov <governance-clone> --out site/atlas/projection.json';

function useProjection() {
  const [state, setState] = useState({ status: 'loading', projection: null, origin: null });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('../../site/atlas/projection.json');
        if (!cancelled) setState({ status: 'ready', projection: mod.default, origin: 'build' });
        return;
      } catch {
        /* fall through to runtime fetch */
      }
      try {
        const res = await fetch('./projection.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const projection = await res.json();
        if (!cancelled) setState({ status: 'ready', projection, origin: 'fetch' });
      } catch {
        if (!cancelled) setState({ status: 'empty', projection: null, origin: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

function NodeCard({ data }) {
  return (
    <div className={`rf-node${data.conflict ? ' conflict' : ''}${data.selected ? ' selected' : ''}`} title={data.id}>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <div className="prov">{data.planes.join(' + ')}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { atlasNode: NodeCard };
const elk = new ELK();

async function layouted(graph) {
  const elkGraph = {
    id: 'root',
    layoutOptions: elkOptions(),
    children: graph.nodes.map((n) => ({ id: n.id, width: 190, height: 54 })),
    edges: graph.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };
  const laid = await elk.layout(elkGraph);
  const pos = new Map((laid.children || []).map((c) => [c.id, { x: c.x || 0, y: c.y || 0 }]));
  return { pos };
}

function PulseView({ projection, bySubject, onSelect }) {
  const repos = projection.entities.filter((e) => e.kind === 'repository');
  const rows = repos.map((e) => {
    const list = bySubject.get(e.id) || [];
    const get = (p, plane) => list.find((a) => a.predicate === p && (!plane || a.truth_plane === plane))?.value;
    const prs = list.filter((a) => a.predicate === 'open_pr');
    return {
      id: e.id,
      label: shortLabel(e),
      head: get('head_sha', 'OBSERVED') ? String(get('head_sha', 'OBSERVED')).slice(0, 7) : 'withheld',
      pushed: get('pushed_at', 'OBSERVED') || '—',
      prs: prs.length,
    };
  }).sort((a, b) => (a.pushed < b.pushed ? 1 : -1));
  return (
    <div className="panel" aria-label="Development pulse">
      <h2>Pulse <span className="prov">OBSERVED heads + PROPOSED PRs, sorted by push</span></h2>
      <table>
        <thead><tr><th>repo</th><th>head</th><th>pushed</th><th>open PRs</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><button className="link" onClick={() => onSelect(r.id)}>{r.label}</button></td>
              <td className="prov">{r.head}</td><td className="prov">{r.pushed}</td><td>{r.prs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractsView({ projection, onSelect }) {
  const contracts = projection.entities.filter((e) => e.kind === 'contract');
  const rels = projection.relations;
  return (
    <div className="panel" aria-label="Contract explorer">
      <h2>Contracts <span className="prov">{contracts.length} registered</span></h2>
      <table>
        <thead><tr><th>contract</th><th>owners</th><th>consumers</th></tr></thead>
        <tbody>
          {contracts.map((c) => {
            const owners = rels.filter((r) => r.target === c.id && (r.relation === 'owns' || r.relation === 'provides'));
            const consumers = rels.filter((r) => r.target === c.id && r.relation === 'consumes');
            return (
              <tr key={c.id}>
                <td><button className="link" onClick={() => onSelect(c.id)}>{shortLabel(c)}</button></td>
                <td className="prov">{owners.map((r) => shortLabel({ identity: { full_name: r.source.split(':')[1] } })).join(', ') || '—'}</td>
                <td>{consumers.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PreviewView({ title, draft, kind }) {
  return (
    <div className="panel" aria-label={title}>
      <h2>{title} <span className="prov">PREVIEW — survey fixture, not generated assertions</span></h2>
      <p className="prov">{draft.note}</p>
      <dl className="prov">
        <dt>example subject</dt><dd>{draft.subject}</dd>
        <dt>predicate</dt><dd>{draft.predicate}</dd>
        <dt>value</dt><dd>{JSON.stringify(draft.value)}</dd>
        <dt>plane</dt><dd>{draft.truth_plane}</dd>
        <dt>boundary</dt><dd>{draft.boundary_flag}</dd>
      </dl>
      <p className="prov">Activates with generator v0.3 ({kind} entity set). See docs/atlas/enrich/SOURCES.md.</p>
    </div>
  );
}

function ResearchView({ projection }) {
  const ref = React.useRef(null);
  const proposes = projection.relations.filter((r) => r.relation === 'proposes' && r.source !== r.target);
  const selfProposes = projection.relations.filter((r) => r.relation === 'proposes' && r.source === r.target);
  const ids = new Set();
  proposes.forEach((r) => { ids.add(r.source); ids.add(r.target); });
  selfProposes.forEach((r) => ids.add(r.source));
  const nodes = [...ids].map((id) => ({ id }));
  const links = proposes.map((r) => ({ source: r.source, target: r.target }));
  React.useEffect(() => {
    if (!ref.current || !nodes.length) return;
    const w = 600, h = 420;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${w} ${h}`);
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .stop();
    for (let i = 0; i < 250; i++) sim.tick();
    svg.append('g').selectAll('line').data(links).join('line').attr('stroke', '#f0a64a')
      .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
    svg.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('r', 5).attr('fill', '#42c7e8')
      .attr('cx', (d) => d.x).attr('cy', (d) => d.y)
      .append('title').text((d) => d.id);
  }, [projection]);
  return (
    <div className="panel" aria-label="Research constellation">
      <h2>Proposal constellation <span className="prov">EXPLORATORY force layout — not canonical topology</span></h2>
      <p className="prov">{selfProposes.length} open-PR proposals across {ids.size} repos (PROPOSED plane). Studies map here with generator v0.3.</p>
      <svg ref={ref} width="100%" role="img" aria-label="Exploratory proposal graph" />
    </div>
  );
}

function SnapshotsView({ projection }) {
  return (
    <div className="panel" aria-label="Snapshots">
      <h2>Snapshots</h2>
      <dl className="prov">
        <dt>current cut</dt><dd>{projection.meta.evidence_cut}</dd>
        <dt>gov SHA</dt><dd>{projection.meta.gov_sha}</dd>
        <dt>entities / assertions / relations / conflicts</dt>
        <dd>{projection.entities.length} / {projection.assertions.length} / {projection.relations.length} / {projection.conflicts.length}</dd>
      </dl>
      <p className="prov">No prior snapshot files in this build — diff view activates once versioned projection-&lt;cut&gt;.json files ship alongside.</p>
    </div>
  );
}

function AskView({ projection, q, setQ, hits, setHits }) {
  const byId = new Map(projection.assertions.map((a) => [a.id, a]));
  const run = (e) => {
    e.preventDefault();
    const found = askRetrieve(projection, q);
    const v = validateAnswer(projection, new Set(found.map((h) => h.id)), found.map((h) => h.id));
    setHits({ found, valid: v.ok });
  };
  return (
    <div className="panel" aria-label="Ask Atlas">
      <h2>Ask Atlas <span className="prov">V0 extractive — cited assertions only</span></h2>
      <form onSubmit={run}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. wi-backend head role" aria-label="Question" />
        <button type="submit">Ask</button>
      </form>
      {hits && (
        hits.found.length === 0 ? (
          <p className="prov">Unanswerable from this projection — no supporting assertions found.</p>
        ) : (
          <dl className="prov">
            {hits.found.map((h) => {
              const a = byId.get(h.id);
              return (
                <React.Fragment key={h.id}>
                  <dt>{a.subject} · {a.predicate} <span className={`plane-tag plane-${a.truth_plane}`}>{a.truth_plane}</span> ({h.id}, score {h.score})</dt>
                  <dd>{JSON.stringify(a.value)} — {a.provenance.source} @ {String(a.provenance.ref).slice(0, 7)}</dd>
                </React.Fragment>
              );
            })}
          </dl>
        )
      )}
    </div>
  );
}

export default function App() {
  const { status, projection, origin } = useProjection();
  const [overlay, setOverlay] = useState(() => parseState(window.location.search).overlay);
  const [node, setNode] = useState(() => parseState(window.location.search).node);
  const initialView = parseState(window.location.search).view;
  const [drift, setDrift] = useState(() => initialView === 'drift');
  const [view, setView] = useState(() => (VIEWS.includes(initialView) ? initialView : 'topology'));
  const [impact, setImpact] = useState(null);
  const [askQ, setAskQ] = useState('');
  const [askHits, setAskHits] = useState(null);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const inspectorRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const fn = (e) => setNarrow(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const bySubject = useMemo(() => (projection ? indexAssertions(projection) : new Map()), [projection]);

  const graph = useMemo(() => {
    if (!projection) return { nodes: [], edges: [], planesUsed: overlay };
    if (narrow && node) return focusGraph(projection, overlay, node, 1);
    return deriveGraph(projection, overlay);
  }, [projection, overlay, narrow, node]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { pos } = await layouted(graph);
      if (cancelled) return;
      const hot = impact ? new Set([...impact.upstream, ...impact.downstream, node]) : null;
      setNodes(
        graph.nodes.map((n) => ({
          id: n.id,
          type: 'atlasNode',
          position: pos.get(n.id) || { x: 0, y: 0 },
          style: hot && !hot.has(n.id) ? { opacity: 0.25 } : undefined,
          data: { label: n.label, id: n.id, planes: n.planes, conflict: drift && n.inConflict, selected: n.id === node },
        }))
      );
      setEdges(
        graph.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          label: e.relation,
          animated: false,
          style: { stroke: drift && e.conflict ? '#f0a64a' : undefined },
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [graph, drift, node, impact, setNodes, setEdges]);

  useEffect(() => {
    window.history.replaceState(null, '', serializeState({ node, overlay, view: drift && view === 'topology' ? 'drift' : view }));
  }, [node, overlay, drift, view]);

  const sortedIds = useMemo(() => graph.nodes.map((n) => n.id), [graph]);
  const onKey = useCallback(
    (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setNode(moveSelection(sortedIds, node, e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter') {
        inspectorRef.current?.focus();
      } else if (e.key === 'Escape') {
        setNode(null);
      }
    },
    [sortedIds, node]
  );

  const togglePlane = (p) =>
    setOverlay((o) => (o.includes(p) ? o.filter((x) => x !== p) : [...o, p]));

  if (status === 'loading') return <div className="empty"><p>Loading Atlas projection…</p></div>;
  if (status === 'empty' || !projection) {
    return (
      <div className="empty">
        <h1>Atlas has no projection yet</h1>
        <p>The UI is read-only and renders only generated evidence. Build it first:</p>
        <code>{GENERATOR_CMD}</code>
      </div>
    );
  }

  const treeRepos = graph.nodes.filter((n) => {
    const e = projection.entities.find((x) => x.id === n.id);
    return e && e.kind === 'repository';
  });
  const treeContracts = graph.nodes.filter((n) => {
    const e = projection.entities.find((x) => x.id === n.id);
    return e && e.kind === 'contract';
  });
  const selected = node ? bySubject.get(node) || [] : [];
  const conflicts = projection.conflicts || [];
  const assertionById = new Map(projection.assertions.map((a) => [a.id, a]));

  return (
    <div className="atlas">
      <header className="atlas-head">
        <h1>Aftergraph Atlas</h1>
        <span className="cut">
          cut {projection.meta.evidence_cut} · gov {String(projection.meta.gov_sha).slice(0, 7)}
          {origin === 'fetch' ? ' · live fetch (may be stale)' : ''}
        </span>
        <div className="overlays" role="group" aria-label="Truth plane overlays">
          {['CANONICAL', 'OBSERVED', 'PROPOSED'].map((p) => (
            <button key={p} aria-pressed={overlay.includes(p)} onClick={() => togglePlane(p)} title={`Toggle ${p} assertions`}>
              {p}
            </button>
          ))}
          <button aria-pressed={drift} onClick={() => setDrift((d) => !d)} title="Highlight canonical/observed disagreements">
            Drift
          </button>
        </div>
      </header>
      <nav className="views" aria-label="Views">
        {VIEWS.map((v) => (
          <button key={v} aria-selected={view === v} onClick={() => setView(v)}>
            {v}
          </button>
        ))}
      </nav>
      {origin === 'fetch' && (
        <div className="banner" role="status">Serving runtime-fetched projection — rebuild for a pinned cut.</div>
      )}
      <nav className="tree" aria-label="Entities">
        <div className="prov">repositories ({treeRepos.length})</div>
        {treeRepos.map((n) => (
          <button key={n.id} aria-selected={n.id === node} onClick={() => setNode(n.id)}>
            {n.label}
            {n.inConflict && <span className="conf"> ⚠</span>}
          </button>
        ))}
        <div className="prov">contracts ({treeContracts.length})</div>
        {treeContracts.slice(0, 60).map((n) => (
          <button key={n.id} aria-selected={n.id === node} onClick={() => setNode(n.id)}>
            {n.label}
            <span className="kind">contract</span>
          </button>
        ))}
        {treeContracts.length > 60 && <div className="prov">+ {treeContracts.length - 60} more (refine via search in Slice C)</div>}
      </nav>
      {view === 'topology' ? (
      <div className="graph" tabIndex={0} onKeyDown={onKey} aria-label="Directed topology. Arrow keys move selection, Enter focuses inspector, Escape clears.">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, n) => setNode(n.id)}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: false }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      ) : (
      <div className="center">
        {view === 'pulse' && <PulseView projection={projection} bySubject={bySubject} onSelect={(id) => { setNode(id); setView('topology'); }} />}
        {view === 'contracts' && <ContractsView projection={projection} onSelect={(id) => { setNode(id); setView('topology'); }} />}
        {view === 'capabilities' && <PreviewView title="Capabilities" draft={enrichFixtures.capability_example} kind="capability" />}
        {view === 'models' && <PreviewView title="AFM lineage" draft={enrichFixtures.model_example} kind="model" />}
        {view === 'research' && <ResearchView projection={projection} />}
        {view === 'snapshots' && <SnapshotsView projection={projection} />}
        {view === 'ask' && <AskView projection={projection} q={askQ} setQ={setAskQ} hits={askHits} setHits={setAskHits} />}
      </div>
      )}
      <aside className="inspector" ref={inspectorRef} tabIndex={-1} aria-label="Inspector">
        {!node && <p className="prov">Select a node for assertions + provenance.</p>}
        {node && (
          <>
            <h2>{node}</h2>
            <div className="prov">{selected.length} assertion(s) · planes: {graph.planesUsed.join(', ')}</div>
            <div>
              {!impact ? (
                <button onClick={() => setImpact(impactSet(projection, node, 2))}>Show impact (2-hop)</button>
              ) : (
                <button onClick={() => setImpact(null)}>Clear impact highlight</button>
              )}
            </div>
            {impact && (
              <div className="prov">
                <div>dependents ({impact.upstream.length}): {impact.upstream.map((id) => shortLabel({ identity: { full_name: id.split(':')[1] } })).join(', ') || '—'}</div>
                <div>dependencies ({impact.downstream.length}): {impact.downstream.map((id) => shortLabel({ identity: { full_name: id.split(':')[1] } })).join(', ') || '—'}</div>
              </div>
            )}
            {['CANONICAL', 'OBSERVED', 'PROPOSED'].map((p) => {
              const list = selected.filter((a) => a.truth_plane === p);
              if (!list.length) return null;
              return (
                <section key={p}>
                  <h3><span className={`plane-tag plane-${p}`}>{p}</span></h3>
                  <dl className="prov">
                    {list.map((a) => (
                      <React.Fragment key={a.id}>
                        <dt>{a.predicate} <span className="prov">({a.id})</span></dt>
                        <dd>value: {JSON.stringify(a.value)}</dd>
                        <dd>source: {a.provenance.source} [{a.provenance.source_type}]</dd>
                        <dd>ref: {a.provenance.ref} · observed: {a.observed_at}{a.valid_at ? ` · valid: ${a.valid_at}` : ''}</dd>
                        <dd>evidence: {a.provenance.evidence_level} · freshness: {a.freshness}{a.conflict_id ? ` · conflict: ${a.conflict_id}` : ''}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </section>
              );
            })}
          </>
        )}
      </aside>
      {drift && (
        <section className="drift-list" aria-label="Drift: open disagreements">
          <h3>Drift ({conflicts.length} open)</h3>
          {conflicts.map((c) => (
            <div key={c.id}>
              <strong>{c.id}</strong> <span className="prov">{c.kind} · {c.status}</span>
              <p>{c.note}</p>
              {(c.pairs || []).map((p, i) => (
                <p key={i} className="prov">
                  A {p.a}: {JSON.stringify(assertionById.get(p.a)?.value)} ← {assertionById.get(p.a)?.provenance.ref.slice(0, 7)} ·{' '}
                  B {p.b}: {JSON.stringify(assertionById.get(p.b)?.value)} ← {assertionById.get(p.b)?.provenance.ref.slice(0, 7)}
                </p>
              ))}
              {(c.subjects || []).map((s) => (
                <p key={s} className="prov">subject: {s} ({shortLabel(projection.entities.find((e) => e.id === s) || { id: s })})</p>
              ))}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
