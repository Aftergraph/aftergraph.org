import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import SkeletonCard from './shared/SkeletonCard.jsx';
import EmptyState from './shared/EmptyState.jsx';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const MOTION_ITEM = { hidden: { opacity: 0, scale: 0.96 }, show: { opacity: 1, scale: 1, transition: { ...MOTION_SURFACE } } };

async function fetchModels() {
  const res = await fetch('/api/v3/models');
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

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
          style={{ fontSize: 9, color: 'var(--ag-authority)', background: 'var(--ag-authority-soft)', border: '1px solid color-mix(in srgb, var(--ag-authority) 30%, transparent)' }}
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
        {(model.lineage || []).map((l, i) => (
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
        <span>{model.params || '—'}</span>
        <span>·</span>
        <span>{model.assertionCount ?? 0} assertions</span>
      </div>
    </motion.div>
  );
}

function LineageGraph({ models, selected }) {
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



export default function ModelsView({ projection }) {
  const [selected, setSelected] = useState(null);

  // Try async fetch first, fall back to projection-derived data
  const { data: apiModels, isLoading } = useQuery({
    queryKey: ['atlas-models'],
    queryFn: fetchModels,
    staleTime: 30000,
    retry: 1,
  });

  const models = useMemo(() => {
    if (apiModels?.models) return apiModels.models;
    if (!projection) return [];
    // Derive from projection as fallback
    const result = [];
    const asserts = projection.assertions || [];
    const entities = projection.entities || [];
    const relations = projection.relations || [];

    // Prefer entity-based derivation when entities exist
    if (entities.length > 0) {
      for (const e of entities) {
        if (e.kind !== 'model' && e.kind !== 'afm') continue;
        const entAsserts = asserts.filter((a) => a.subject === e.id);
        const descAssert = entAsserts.find((a) => a.predicate === 'description' || a.predicate === 'summary');
        const archAssert = entAsserts.find((a) => a.predicate === 'architecture' || a.predicate === 'family');
        const paramsAssert = entAsserts.find((a) => a.predicate === 'parameters' || a.predicate === 'size');
        const lineageRels = relations.filter((r) => r.target === e.id && ['derives_from', 'fine_tuned_from', 'extends'].includes(r.relation));
        const lineageIds = lineageRels.map((r) => r.source);
        const lineageLabels = lineageIds.map((id) => {
          const ent = entities.find((x) => x.id === id);
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
          assertionCount: entAsserts.length,
        });
      }
    } else {
      // Fallback: derive from assertions where type==='model' or predicate includes 'model'
      const bySubject = new Map();
      for (const a of asserts) {
        if (a.type === 'model' || a.predicate?.includes('model')) {
          if (!bySubject.has(a.subject)) bySubject.set(a.subject, []);
          bySubject.get(a.subject).push(a);
        }
      }
      for (const [subjectId, subjectAsserts] of bySubject) {
        const labelAssert = subjectAsserts.find((a) => a.predicate === 'label' || a.predicate === 'name');
        const descAssert = subjectAsserts.find((a) => a.predicate === 'description' || a.predicate === 'summary');
        const archAssert = subjectAsserts.find((a) => a.predicate === 'architecture' || a.predicate === 'family');
        const paramsAssert = subjectAsserts.find((a) => a.predicate === 'parameters' || a.predicate === 'size');
        result.push({
          id: subjectId,
          label: labelAssert?.value || subjectId.split('/').pop(),
          architecture: archAssert?.value || 'AFM',
          description: descAssert?.value || '',
          params: paramsAssert?.value || '—',
          lineage: [],
          lineageIds: [],
          assertionCount: subjectAsserts.length,
        });
      }
    }

    result.sort((a, b) => a.label.localeCompare(b.label));
    return result;
  }, [apiModels, projection]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <div className="h-7 rounded animate-pulse" style={{ width: 220, background: 'var(--ag-border-strong)' }} />
          <div className="h-4 rounded animate-pulse" style={{ width: 340, background: 'var(--ag-border)' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
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
            {models.length} modeller
          </motion.p>
        </div>

        {models.length === 0 ? (
          <EmptyState
            variant="models"
            title="Ingen modeller endnu"
            description="Registrer din første model via API'et for at se den her."
          />
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
