import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const MOTION_ITEM = { hidden: { opacity: 0, scale: 0.96 }, show: { opacity: 1, scale: 1, transition: { ...MOTION_SURFACE } } };

function ModelCard({ model, onSelect, selected }) {
  return (
    <motion.div
      variants={MOTION_ITEM}
      layout
      onClick={() => onSelect(model)}
      className="rounded-xl border p-5 cursor-pointer flex flex-col gap-3"
      style={{
        background: selected ? 'var(--ag-control-soft)' : 'var(--ag-surface)',
        borderColor: selected ? 'var(--ag-control)' : 'var(--ag-border)',
        transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
      }}
      whileHover={{ borderColor: 'var(--ag-control)', boxShadow: 'var(--ag-shadow-raised)' }}
    >
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 'var(--ag-type-body)', fontWeight: 'var(--ag-weight-semibold)', color: 'var(--ag-text)', margin: 0 }}>
          {model.label}
        </h3>
        <span
          className="font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ fontSize: 9, color: 'var(--ag-authority)', background: 'var(--ag-authority-soft)', border: '1px solid rgba(119,89,232,0.3)' }}
        >
          {model.architecture || 'AFM'}
        </span>
      </div>
      {model.description && (
        <p style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: 0, lineHeight: 'var(--ag-leading-relaxed)' }}>
          {model.description}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-auto">
        {model.lineage.map((l, i) => (
          <span
            key={i}
            className="font-mono px-2 py-0.5 rounded-full border"
            style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)', borderColor: 'var(--ag-border)', background: 'var(--ag-canvas-raised)' }}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-2 mt-1 border-t" style={{ borderColor: 'var(--ag-border)', fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)' }}>
        <span>{model.params}</span>
        <span>·</span>
        <span>{model.assertionCount} assertions</span>
      </div>
    </motion.div>
  );
}

function LineageGraph({ models, selected }) {
  // Simple SVG lineage visualization: nodes + arrows showing derivation
  const sorted = useMemo(() => [...models].sort((a, b) => a.label.localeCompare(b.label)), [models]);
  const nodeH = 44;
  const gap = 16;
  const padX = 20;
  const padY = 20;
  const w = 320;
  const h = padY * 2 + sorted.length * (nodeH + gap);

  const positions = new Map();
  sorted.forEach((m, i) => {
    positions.set(m.id, { x: padX, y: padY + i * (nodeH + gap), w: w - padX * 2, h: nodeH });
  });

  const edges = [];
  for (const m of sorted) {
    for (const parentId of m.lineageIds || []) {
      const from = positions.get(parentId);
      const to = positions.get(m.id);
      if (from && to) {
        edges.push({ from, to, id: `${parentId}->${m.id}` });
      }
    }
  }

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="AFM lineage graph" style={{ maxHeight: 400 }}>
      {edges.map((e) => (
        <line
          key={e.id}
          x1={e.from.x + e.from.w / 2}
          y1={e.from.y + e.from.h}
          x2={e.to.x + e.to.w / 2}
          y2={e.to.y}
          stroke="var(--ag-border-strong)"
          strokeWidth={1.5}
          markerEnd="url(#arrowhead)"
        />
      ))}
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--ag-border-strong)" />
        </marker>
      </defs>
      {sorted.map((m) => {
        const pos = positions.get(m.id);
        const isSelected = selected?.id === m.id;
        return (
          <g key={m.id}>
            <rect
              x={pos.x}
              y={pos.y}
              width={pos.w}
              height={pos.h}
              rx={8}
              fill={isSelected ? 'var(--ag-control-soft)' : 'var(--ag-surface)'}
              stroke={isSelected ? 'var(--ag-control)' : 'var(--ag-border)'}
              strokeWidth={isSelected ? 2 : 1}
            />
            <text
              x={pos.x + 12}
              y={pos.y + pos.h / 2 + 1}
              dominantBaseline="middle"
              fill="var(--ag-text)"
              fontSize={12}
              fontFamily="var(--ag-font-interface)"
              fontWeight={500}
            >
              {m.label.length > 28 ? m.label.slice(0, 26) + '…' : m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SkeletonModel() {
  return (
    <div className="rounded-xl border p-5 space-y-3" style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}>
      <div className="flex items-center gap-2">
        <div className="h-4 rounded animate-pulse" style={{ width: '45%', background: 'var(--ag-border-strong)', animationDuration: 'var(--ag-motion-surface)' }} />
        <div className="h-5 w-14 rounded animate-pulse ml-auto" style={{ background: 'var(--ag-border-strong)', animationDuration: 'var(--ag-motion-surface)' }} />
      </div>
      <div className="h-3 rounded animate-pulse" style={{ width: '65%', background: 'var(--ag-border)', animationDuration: 'var(--ag-motion-surface)' }} />
      <div className="flex gap-2">
        <div className="h-4 w-16 rounded-full animate-pulse" style={{ background: 'var(--ag-border)', animationDuration: 'var(--ag-motion-surface)' }} />
        <div className="h-4 w-12 rounded-full animate-pulse" style={{ background: 'var(--ag-border)', animationDuration: 'var(--ag-motion-surface)' }} />
      </div>
    </div>
  );
}

export default function ModelsView({ projection }) {
  const [selected, setSelected] = useState(null);

  const models = useMemo(() => {
    if (!projection) return [];
    const result = [];
    for (const e of projection.entities) {
      if (e.kind !== 'model' && e.kind !== 'afm') continue;
      const asserts = projection.assertions.filter((a) => a.subject === e.id);
      const descAssert = asserts.find((a) => a.predicate === 'description' || a.predicate === 'summary');
      const archAssert = asserts.find((a) => a.predicate === 'architecture' || a.predicate === 'family');
      const paramsAssert = asserts.find((a) => a.predicate === 'parameters' || a.predicate === 'size');
      // Lineage: relations where this model is target and relation is 'derives_from' or 'fine_tuned_from'
      const lineageRels = projection.relations.filter((r) => r.target === e.id && ['derives_from', 'fine_tuned_from', 'extends'].includes(r.relation));
      const lineageIds = lineageRels.map((r) => r.source);
      const lineageLabels = lineageIds.map((id) => {
        const ent = projection.entities.find((x) => x.id === id);
        return ent?.identity?.full_name || id.split('/').pop();
      });
      result.push({
        id: e.id,
        label: e.identity?.full_name || e.id.split('/').pop(),
        architecture: archAssert?.value || 'AFM',
        description: descAssert?.value || '',
        params: paramsAssert?.value || '—',
        lineage: lineageLabels,
        lineageIds,
        assertionCount: asserts.length,
      });
    }
    result.sort((a, b) => a.label.localeCompare(b.label));
    return result;
  }, [projection]);

  if (!projection) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 rounded animate-pulse" style={{ width: 180, background: 'var(--ag-border-strong)' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonModel key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="space-y-6">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={MOTION_SURFACE}
            style={{ fontSize: 'var(--ag-type-title)', fontWeight: 'var(--ag-weight-bold)', color: 'var(--ag-text)', margin: 0 }}
          >
            AFM Lineage
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...MOTION_SURFACE, delay: 0.08 }}
            style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: '4px 0 0' }}
          >
            {models.length} models with derivation lineage and metadata
          </motion.p>
        </div>

        {models.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 rounded-xl border text-center"
            style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)', color: 'var(--ag-text-muted)', fontSize: 'var(--ag-type-body-sm)' }}
          >
            No model entities in this projection. Generator v0.3+ required.
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lineage graph panel */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={MOTION_SURFACE}
              className="lg:col-span-1 rounded-xl border p-4"
              style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}
            >
              <h3
                className="uppercase tracking-wider mb-3"
                style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)', margin: '0 0 12px' }}
              >
                Derivation Graph
              </h3>
              <LineageGraph models={models} selected={selected} />
            </motion.div>

            {/* Model cards grid */}
            <motion.div
              variants={MOTION_STAGGER}
              initial="hidden"
              animate="show"
              className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start"
            >
              <AnimatePresence>
                {models.map((m) => (
                  <ModelCard key={m.id} model={m} onSelect={setSelected} selected={selected} />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
}
