import React, { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, Position, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { elkOptions } from '../lib/derive.js';

function NodeCard({ data }) {
  return (
    <div className={`rf-node${data.conflict ? ' conflict' : ''}${data.selected ? ' selected' : ''}`} title={data.id}>
      <Handle type="target" position={Position.Top} />
      <div className="rf-label">{data.label}</div>
      <div className="rf-planes">
        {data.planes.map((p) => (
          <span key={p} title={p} className={`plane-chip chip-${p}`}>{p.slice(0, 3)}</span>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { atlasNode: NodeCard };

let elkInstancePromise;
function getElk() {
  if (!elkInstancePromise) {
    elkInstancePromise = import('elkjs/lib/elk.bundled.js').then(({ default: ELK }) => new ELK());
  }
  return elkInstancePromise;
}

async function layouted(graph) {
  const elkGraph = {
    id: 'root',
    layoutOptions: elkOptions(),
    children: graph.nodes.map((n) => ({ id: n.id, width: 190, height: 54 })),
    edges: graph.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };
  const elk = await getElk();
  const laid = await elk.layout(elkGraph);
  const pos = new Map((laid.children || []).map((c) => [c.id, { x: c.x || 0, y: c.y || 0 }]));
  return { pos };
}

export default function TopologyView({ graph, drift, node, impact, xray, onNodeSelect, graphRef }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { pos } = await layouted(graph);
      if (cancelled) return;
      const hot = impact
        ? new Set([...impact.upstream, ...impact.downstream, node])
        : xray
          ? new Set(xray.path)
          : null;
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
          style: { stroke: drift && e.conflict ? 'var(--ag-decision)' : undefined },
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [graph, drift, node, impact, xray, setNodes, setEdges]);

  return (
    <div className="graph" ref={graphRef} tabIndex={0} aria-label="Directed topology. Arrow keys move selection, Enter focuses inspector, Escape clears.">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, n) => onNodeSelect && onNodeSelect(n.id)}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: false }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
