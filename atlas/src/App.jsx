import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, Position, useNodesState, useEdgesState } from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
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
} from './lib/derive.js';

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

export default function App() {
  const { status, projection, origin } = useProjection();
  const [overlay, setOverlay] = useState(() => parseState(window.location.search).overlay);
  const [node, setNode] = useState(() => parseState(window.location.search).node);
  const [drift, setDrift] = useState(() => parseState(window.location.search).view === 'drift');
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
      setNodes(
        graph.nodes.map((n) => ({
          id: n.id,
          type: 'atlasNode',
          position: pos.get(n.id) || { x: 0, y: 0 },
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
  }, [graph, drift, node, setNodes, setEdges]);

  useEffect(() => {
    window.history.replaceState(null, '', serializeState({ node, overlay, view: drift ? 'drift' : 'topology' }));
  }, [node, overlay, drift]);

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
      <aside className="inspector" ref={inspectorRef} tabIndex={-1} aria-label="Inspector">
        {!node && <p className="prov">Select a node for assertions + provenance.</p>}
        {node && (
          <>
            <h2>{node}</h2>
            <div className="prov">{selected.length} assertion(s) · planes: {graph.planesUsed.join(', ')}</div>
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
