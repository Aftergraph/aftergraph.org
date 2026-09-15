import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  deriveGraph,
  focusGraph,
  indexAssertions,
  moveSelection,
  serializeState,
  parseState,
  shortLabel,
  impactSet,
  answerFromEvidence,
  filterEntities,
  cutAge,
  tracePath,
  validateProjection,
} from './lib/derive.js';
import { fetchLatestCut, fetchEnvelope, envelopeToProjection } from './lib/atlas-api.js';
import enrichFixtures from '../../docs/atlas/enrich/fixtures.json';
import { pulseRows, contractRows, diffProjections } from './lib/sliceC.js';
import Home from './Home.jsx';
import ReconciliationPanel from './components/ReconciliationPanel.jsx';
import AtlasShell from './components/AtlasShell.jsx';
import CapabilitiesView from './components/CapabilitiesView.jsx';
import ModelsView from './components/ModelsView.jsx';
import ResearchViewNew from './components/ResearchView.jsx';
import SnapshotsViewNew from './components/SnapshotsView.jsx';
import AskViewNew from './components/AskView.jsx';

const LazyTopologyView = React.lazy(() => import('./components/TopologyView.jsx'));

const VIEWS = ['home', 'topology', 'pulse', 'contracts', 'capabilities', 'models', 'research', 'snapshots', 'ask', 'reconciliation'];

const GENERATOR_CMD =
  'node site/generate-atlas-projection.mjs --ledger <ledger-dir> --gov <governance-clone> --out site/atlas-projection.json';

function useProjection() {
  const [state, setState] = useState({ status: 'loading', projection: null, origin: null, errors: [] });
  useEffect(() => {
    let cancelled = false;
    const accept = (projection, origin) => {
      const v = validateProjection(projection);
      if (cancelled) return true;
      if (!v.ok) setState({ status: 'malformed', projection: null, origin, errors: v.errors });
      else setState({ status: 'ready', projection, origin, errors: [] });
      return true;
    };
    (async () => {
      // Priority 1: Live V3 API (D1-backed cuts)
      try {
        const cut = await fetchLatestCut();
        if (cut && cut.id) {
          const envelope = await fetchEnvelope(cut.id);
          if (envelope) {
            const projection = envelopeToProjection(envelope, cut);
            if (projection && accept(projection, 'v3-api')) return;
          }
        }
      } catch {
        /* fall through to static sources */
      }
      // Priority 2: Build-time embedded projection
      try {
        const mod = await import('../../site/atlas-projection.json');
        if (accept(mod.default, 'build')) return;
      } catch {
        /* fall through to runtime fetch */
      }
      // Priority 3: Runtime static fetch
      try {
        const res = await fetch('./projection.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const projection = await res.json();
        accept(projection, 'fetch');
      } catch {
        if (!cancelled) setState({ status: 'empty', projection: null, origin: null, errors: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

function PulseView({ projection, onSelect }) {
  const rows = pulseRows(projection);
  return (
    <div className="panel" aria-label="Development pulse">
      <h2>Pulse <span className="prov">OBSERVED heads + PROPOSED PRs, sorted by activity</span></h2>
      <table>
        <thead><tr><th>repo</th><th>head</th><th>pushed</th><th>open PRs</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><button className="link" onClick={() => onSelect(r.id)}>{r.label}</button></td>
              <td className="prov">{r.headSha ? r.headSha.slice(0, 7) : (r.withheld ? `withheld (${r.withheld})` : '—')}</td>
              <td className="prov">{r.pushedAt || '—'}</td><td>{r.openPrs.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractsView({ projection, onSelect }) {
  const rows = contractRows(projection);
  return (
    <div className="panel" aria-label="Contract explorer">
      <h2>Contracts <span className="prov">{rows.length} registered</span></h2>
      <table>
        <thead><tr><th>contract</th><th>owners</th><th>consumers</th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td><button className="link" onClick={() => onSelect(c.id)}>{c.label}</button></td>
              <td className="prov">{[...c.owners, ...c.providers].map((o) => o.label).join(', ') || '—'}</td>
              <td>{c.consumers.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewView({ title, draft, kind }) {
  // Fixtures carry their own publication boundary: when flagged, neither the
  // example subject nor its value is publishable — show shape only + reason.
  const gated = !!draft.boundary_flag;
  const withhold = (content) =>
    gated ? <span>withheld — {draft.boundary_flag}</span> : <span>{content}</span>;
  return (
    <div className="panel" aria-label={title}>
      <h2>{title} <span className="prov">PREVIEW — survey fixture, not generated assertions</span></h2>
      <dl className="prov">
        <dt>example subject</dt><dd>{withhold(draft.subject)}</dd>
        <dt>predicate</dt><dd>{draft.predicate}</dd>
        <dt>value</dt><dd>{gated ? withhold(null) : JSON.stringify(draft.value)}</dd>
        <dt>plane</dt><dd>{draft.truth_plane}</dd>
        <dt>boundary</dt><dd>{draft.boundary_flag || 'none'}</dd>
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
    svg.append('g').selectAll('line').data(links).join('line').attr('stroke', 'var(--ag-decision)')
      .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
    svg.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('r', 5).attr('fill', 'var(--ag-control)')
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
  const [index, setIndex] = React.useState(null);
  const [sel, setSel] = React.useState(null);
  const [diff, setDiff] = React.useState(null);
  const [loading, setLoading] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('snapshots/index.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const idx = await res.json();
        if (!cancelled) setIndex(idx);
      } catch {
        if (!cancelled) setIndex([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const inspect = async (file) => {
    setSel(file);
    setDiff(null);
    setLoading(file);
    try {
      const res = await fetch(`snapshots/${file}`, { cache: 'no-store' });
      const old = await res.json();
      setDiff(diffProjections(old, projection));
    } catch {
      setDiff({ error: `cannot load ${file}` });
    } finally {
      setLoading(null);
    }
  };
  return (
    <div className="panel" aria-label="Snapshots">
      <h2>Snapshots <span className="prov">immutable versioned cuts — history is never rewritten</span></h2>
      <dl className="prov">
        <dt>current cut</dt><dd>{projection.meta.evidence_cut}</dd>
        <dt>gov SHA</dt><dd>{projection.meta.gov_sha}</dd>
      </dl>
      {index === null && <p className="prov">Loading snapshot index…</p>}
      {index !== null && index.length === 0 && (
        <p className="prov">No versioned snapshots ship with this build yet — run the generator with --snapshot-dir.</p>
      )}
      {index !== null && index.length > 0 && (
        <table>
          <thead><tr><th>cut</th><th>gov</th><th>entities</th><th>conflicts</th><th></th></tr></thead>
          <tbody>
            {index.map((s) => (
              <tr key={s.file}>
                <td className="prov">{s.evidence_cut}</td>
                <td className="prov">{String(s.gov_sha).slice(0, 7)}</td>
                <td>{s.entities}</td>
                <td className="prov">{(s.conflicts || []).join(', ')}</td>
                <td><button className="link" onClick={() => inspect(s.file)}>diff vs current</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {loading && <p className="prov" role="status">Loading {loading}…</p>}
      {diff && !diff.error && (
        <dl className="prov">
          <dt>comparing {sel} → current</dt>
          <dd>added entities: {diff.addedEntities.join(', ') || '—'}</dd>
          <dd>removed entities: {diff.removedEntities.join(', ') || '—'}</dd>
          <dd>changed assertions: {diff.changedAssertions.join(', ') || '—'}</dd>
          <dd>assertions +{diff.addedAssertions.length}/−{diff.removedAssertions.length} (value changes re-id; observed_at churn ignored)</dd>
          <dd>relations +{diff.addedRelations.length}/−{diff.removedRelations.length}</dd>
          <dd>opened conflicts: {diff.openedConflicts.join(', ') || '—'} · resolved: {diff.resolvedConflicts.join(', ') || '—'}</dd>
        </dl>
      )}
      {diff && diff.error && <p className="prov">{diff.error}</p>}
    </div>
  );
}

function AskView({ projection, q, setQ, hits, setHits }) {
  const byId = new Map(projection.assertions.map((a) => [a.id, a]));
  const run = (e) => {
    e.preventDefault();
    const r = answerFromEvidence(projection, q);
    setHits({ found: r.hits, valid: r.valid });
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
  const { status, projection, origin, errors } = useProjection();
  const initialState = useMemo(() => parseState(window.location.search), []);
  const [overlay, setOverlay] = useState(() => initialState.overlay);
  const [node, setNode] = useState(() => initialState.node);
  const [lens, setLens] = useState(() => initialState.lens || 'SYSTEM');
  const [related] = useState(() => initialState.related || null);
  const [snapshot] = useState(() => initialState.snapshot || null);
  const initialView = initialState.view;
  const [drift, setDrift] = useState(() => initialView === 'drift');
  const [view, setView] = useState(() => {
    if (initialView === 'drift') return 'topology';
    return VIEWS.includes(initialView) ? initialView : 'home';
  });
  const [impact, setImpact] = useState(null);
  const [askQ, setAskQ] = useState('');
  const [askHits, setAskHits] = useState(null);
  const [search, setSearch] = useState('');
  const [xray, setXray] = useState(null);
  const [xFrom, setXFrom] = useState('');
  const [xTo, setXTo] = useState('');
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const inspectorRef = useRef(null);
  const graphRef = useRef(null);
  const graphEngaged = useRef(false);

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
    window.history.replaceState(null, '', serializeState({
      node,
      overlay,
      view: drift && view === 'topology' ? 'drift' : view,
      lens,
      related,
      snapshot,
    }));
  }, [node, overlay, drift, view, lens, related, snapshot]);

  const sortedIds = useMemo(() => graph.nodes.map((n) => n.id), [graph]);
  // Keyboard traversal scoped to the graph pane. Window-capture (not div
  // onKeyDown): React Flow stops propagation of some keys (notably Escape),
  // which would otherwise never reach a bubble-phase pane handler. Scoped by
  // event target so panel scrolling/inputs are never hijacked. Escape additionally
  // honors graph engagement: after pointer interaction with the pane, focus often
  // rests on BODY (React Flow does not retain pane focus), and Escape has no
  // scroll side effect to protect — arrows stay strictly in-pane.
  useEffect(() => {
    const onPointer = (e) => {
      graphEngaged.current = !!(graphRef.current && e.target instanceof Node && graphRef.current.contains(e.target));
    };
    const h = (e) => {
      if (!graphRef.current || !(e.target instanceof Node)) return;
      const inPane = graphRef.current.contains(e.target);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!inPane) return;
        e.preventDefault();
        setNode(moveSelection(sortedIds, node, e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter') {
        if (!inPane) return;
        inspectorRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (!inPane && !(e.target === document.body && graphEngaged.current)) return;
        setNode(null);
      }
    };
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('keydown', h, true);
    return () => {
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('keydown', h, true);
    };
  }, [sortedIds, node]);

  const togglePlane = (p) =>
    setOverlay((o) => (o.includes(p) ? o.filter((x) => x !== p) : [...o, p]));

  const openView = useCallback((v) => {
    if (v === 'drift') {
      setDrift(true);
      setView('topology');
      return;
    }
    if (v === 'home') setDrift(false);
    setView((prev) => {
      // Functional update avoids stale closure
      console.log('[Atlas] setView:', prev, '→', v);
      return v;
    });
  }, []);

  if (status === 'loading') return <div className="empty"><p>Loading Atlas projection…</p></div>;
  if (status === 'malformed') {
    return (
      <div className="empty">
        <h1>Atlas projection is malformed</h1>
        <p>
          The UI is read-only and renders only valid generated evidence. This projection
          failed shape validation{origin ? ` (source: ${origin})` : ''} — nothing is rendered
          rather than guessing:
        </p>
        <ul>
          {(errors || []).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p>Regenerate it with the audited generator:</p>
        <code>{GENERATOR_CMD}</code>
      </div>
    );
  }
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
  const age = cutAge(projection.meta.evidence_cut, new Date(nowTick).toISOString());
  const matched = new Set(filterEntities(projection, search));

  return (
    <AtlasShell activeView={view} onViewChange={openView}>
      {/* Legacy header hidden — AtlasShell provides top bar */}
      <div className="hidden">
        <header className="atlas-head">
          <h1>Aftergraph Atlas</h1>
          <span className="cut">
            cut {projection.meta.evidence_cut} ({age.label} old{age.stale ? ', STALE — regenerate' : ''}) · gov {String(projection.meta.gov_sha).slice(0, 7)}
            {origin === 'fetch' ? ' · live fetch (may be stale)' : ''}
          </span>
        </header>
      </div>

      {/* Experience lenses + overlays as compact toolbar inside shell content */}
      {view !== 'home' && (
      <div
        className="flex flex-wrap items-center gap-2 mb-4"
        style={{ fontSize: 'var(--ag-type-ui)' }}
      >
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-lg border"
          style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}
        >
          <span className="mr-1" style={{ color: 'var(--ag-text-subtle)' }}>Lens:</span>
          {['SYSTEM', 'AUTHORITY', 'EVIDENCE', 'COST', 'SOURCE'].map((name) => {
            const active = lens === name;
            return (
              <button
                key={name}
                aria-pressed={active}
                onClick={() => setLens(name)}
                className="px-2 py-0.5 rounded cursor-pointer border border-transparent"
                style={{
                  background: active ? 'var(--ag-system-soft)' : 'transparent',
                  color: active ? 'var(--ag-system)' : 'var(--ag-text-muted)',
                  transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--ag-text)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--ag-text-muted)'; }}
              >
                {name}
              </button>
            );
          })}
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-lg border"
          style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}
        >
          <span className="mr-1" style={{ color: 'var(--ag-text-subtle)' }}>Planes:</span>
          {['CANONICAL', 'OBSERVED', 'PROPOSED'].map((p) => {
            const active = overlay.includes(p);
            return (
              <button
                key={p}
                aria-pressed={active}
                onClick={() => togglePlane(p)}
                className="px-2 py-0.5 rounded cursor-pointer border border-transparent"
                style={{
                  background: active ? 'var(--ag-authority-soft)' : 'transparent',
                  color: active ? 'var(--ag-authority)' : 'var(--ag-text-muted)',
                  transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--ag-text)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--ag-text-muted)'; }}
              >
                {p}
              </button>
            );
          })}
          <button
            aria-pressed={drift}
            onClick={() => setDrift((d) => !d)}
            className="px-2 py-0.5 rounded cursor-pointer border border-transparent"
            style={{
              background: drift ? 'var(--ag-decision-soft)' : 'transparent',
              color: drift ? 'var(--ag-decision)' : 'var(--ag-text-muted)',
              transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
            }}
            onMouseEnter={(e) => { if (!drift) e.currentTarget.style.color = 'var(--ag-text)'; }}
            onMouseLeave={(e) => { if (!drift) e.currentTarget.style.color = 'var(--ag-text-muted)'; }}
          >
            Drift
          </button>
        </div>
        <span className="ml-auto" style={{ color: 'var(--ag-text-subtle)' }}>cut {String(projection.meta.evidence_cut || '').slice(0, 8)}</span>
      </div>
      )}
      {origin === 'fetch' && (
        <div className="banner" role="status">Serving runtime-fetched projection — rebuild for a pinned cut.</div>
      )}
      {view !== 'home' && (
      <nav className="tree" aria-label="Entities">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter entities… (live filter)" aria-label="Filter entities" />
        {search.trim() && [...treeRepos, ...treeContracts].filter((n) => matched.has(n.id)).length === 0 && (
          <p className="prov" role="status"><img src="assets/empty-no-result.svg" width="80" height="60" alt="" aria-hidden="true" />No entities match “{search.trim()}”.</p>
        )}
        <div className="prov">repositories ({treeRepos.length})</div>
        {treeRepos.filter((n) => matched.has(n.id)).map((n) => (
          <button key={n.id} aria-selected={n.id === node} onClick={() => setNode(n.id)}>
            {n.label}
            {n.inConflict && <span className="conf"> ⚠</span>}
          </button>
        ))}
        <div className="prov">contracts ({treeContracts.length})</div>
        {treeContracts.filter((n) => matched.has(n.id)).slice(0, 60).map((n) => (
          <button key={n.id} aria-selected={n.id === node} onClick={() => setNode(n.id)}>
            {n.label}
            <span className="kind">contract</span>
          </button>
        ))}
        {treeContracts.length > 60 && <div className="prov">+ {treeContracts.length - 60} more (refine via search in Slice C)</div>}
      </nav>
      )}
      {view === 'home' ? (
      <div className="ag-home-wrap">
        <Home onNavigate={openView} />
      </div>
      ) : view === 'topology' ? (
      <React.Suspense fallback={<div className="panel"><p>Loading topology…</p></div>}>
        <LazyTopologyView
          graph={graph}
          drift={drift}
          node={node}
          impact={impact}
          xray={xray}
          onNodeSelect={(id) => setNode(id)}
          graphRef={graphRef}
        />
      </React.Suspense>
      ) : (
      <div className="center">
        {view === 'pulse' && <PulseView projection={projection} onSelect={(id) => { setNode(id); setView('topology'); }} />}
        {view === 'contracts' && <ContractsView projection={projection} onSelect={(id) => { setNode(id); setView('topology'); }} />}
        {view === 'capabilities' && <CapabilitiesView projection={projection} />}
        {view === 'models' && <ModelsView projection={projection} />}
        {view === 'research' && <ResearchViewNew projection={projection} />}
        {view === 'snapshots' && <SnapshotsViewNew projection={projection} />}
        {view === 'ask' && <AskViewNew projection={projection} />}
        {view === 'reconciliation' && <ReconciliationPanel />}
      </div>
      )}
      {/* Inspector panel removed in V3 redesign — detail view deferred to dedicated panels */}
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
              {(c.proposed || []).map((pr) => (
                <p key={pr.assertion} className="prov">
                  proposed candidate (not a resolution): {pr.repo} #{pr.number} {pr.title} ({pr.assertion})
                </p>
              ))}
            </div>
          ))}
        </section>
      )}
    </AtlasShell>
  );
}
