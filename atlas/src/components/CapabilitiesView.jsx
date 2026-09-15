import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const MOTION_ITEM = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { ...MOTION_SURFACE } } };

function ConfidenceBar({ score }) {
  const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
  const color = pct >= 80 ? 'var(--ag-evidence)' : pct >= 50 ? 'var(--ag-decision)' : 'var(--ag-danger)';
  return (
    <div className="flex items-center gap-2" style={{ fontSize: 'var(--ag-type-caption)' }}>
      <div
        className="h-1.5 rounded-full flex-1"
        style={{ background: 'var(--ag-border)', maxWidth: 80 }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span style={{ color, fontFamily: 'var(--ag-font-code)' }}>{pct}%</span>
    </div>
  );
}

function EvidenceBadge({ plane, source }) {
  const colors = {
    CANONICAL: { bg: 'var(--ag-authority-soft)', text: 'var(--ag-authority)', border: 'rgba(119,89,232,0.3)' },
    OBSERVED: { bg: 'var(--ag-evidence-soft)', text: 'var(--ag-evidence)', border: 'rgba(36,196,173,0.3)' },
    PROPOSED: { bg: 'var(--ag-decision-soft)', text: 'var(--ag-decision)', border: 'rgba(240,166,74,0.3)' },
  };
  const c = colors[plane] || colors.OBSERVED;
  return (
    <Tooltip.Root delayDuration={200}>
      <Tooltip.Trigger asChild>
        <span
          className="px-2 py-0.5 rounded-full border font-medium cursor-default"
          style={{
            fontSize: 'var(--ag-type-caption)',
            background: c.bg,
            color: c.text,
            borderColor: c.border,
            fontFamily: 'var(--ag-font-code)',
          }}
        >
          {plane?.slice(0, 3)}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={4}
          className="px-3 py-1.5 rounded-lg z-50"
          style={{
            background: 'var(--ag-canvas-raised)',
            border: '1px solid var(--ag-border)',
            color: 'var(--ag-text)',
            fontSize: 'var(--ag-type-caption)',
            boxShadow: 'var(--ag-shadow-overlay)',
          }}
        >
          {source || plane}
          <Tooltip.Arrow style={{ fill: 'var(--ag-canvas-raised)' }} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl border p-5 space-y-3"
      style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}
    >
      <div className="flex items-center gap-2">
        <div className="h-4 rounded animate-pulse" style={{ width: '50%', background: 'var(--ag-border-strong)', animationDuration: 'var(--ag-motion-surface)' }} />
        <div className="h-5 w-12 rounded-full animate-pulse ml-auto" style={{ background: 'var(--ag-border-strong)', animationDuration: 'var(--ag-motion-surface)' }} />
      </div>
      <div className="h-3 rounded animate-pulse" style={{ width: '70%', background: 'var(--ag-border)', animationDuration: 'var(--ag-motion-surface)' }} />
      <div className="h-3 rounded animate-pulse" style={{ width: '40%', background: 'var(--ag-border)', animationDuration: 'var(--ag-motion-surface)' }} />
    </div>
  );
}

export default function CapabilitiesView({ projection }) {
  const capabilities = useMemo(() => {
    if (!projection) return [];
    const entityById = new Map(projection.entities.map((e) => [e.id, e]));
    const caps = [];
    for (const e of projection.entities) {
      if (e.kind !== 'capability' && e.kind !== 'module') continue;
      const asserts = projection.assertions.filter((a) => a.subject === e.id);
      const confidenceAssert = asserts.find((a) => a.predicate === 'confidence' || a.predicate === 'maturity');
      const descAssert = asserts.find((a) => a.predicate === 'description' || a.predicate === 'summary');
      const evidencePlanes = [...new Set(asserts.map((a) => a.truth_plane))];
      const provRefs = [...new Set(asserts.map((a) => a.provenance?.ref).filter(Boolean))];
      const confidence = confidenceAssert?.value ?? (asserts.length > 0 ? 0.6 : 0.3);
      caps.push({
        id: e.id,
        label: e.identity?.full_name || e.id.split('/').pop(),
        kind: e.kind,
        description: descAssert?.value || '',
        confidence: typeof confidence === 'number' ? confidence : parseFloat(confidence) || 0.5,
        planes: evidencePlanes.sort(),
        sources: asserts.map((a) => a.provenance?.source).filter(Boolean),
        refs: provRefs.slice(0, 3),
        assertionCount: asserts.length,
      });
    }
    caps.sort((a, b) => b.confidence - a.confidence || a.label.localeCompare(b.label));
    return caps;
  }, [projection]);

  if (!projection) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 rounded animate-pulse" style={{ width: 200, background: 'var(--ag-border-strong)' }} />
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
            Capabilities
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...MOTION_SURFACE, delay: 0.08 }}
            style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: '4px 0 0' }}
          >
            {capabilities.length} capabilities with evidence-backed confidence scores
          </motion.p>
        </div>

        {capabilities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 rounded-xl border text-center"
            style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)', color: 'var(--ag-text-muted)', fontSize: 'var(--ag-type-body-sm)' }}
          >
            No capability entities in this projection. Generator v0.3+ required.
          </motion.div>
        ) : (
          <motion.div
            variants={MOTION_STAGGER}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence>
              {capabilities.map((cap) => (
                <motion.div
                  key={cap.id}
                  variants={MOTION_ITEM}
                  layout
                  className="rounded-xl border p-5 flex flex-col gap-3"
                  style={{
                    background: 'var(--ag-surface)',
                    borderColor: 'var(--ag-border)',
                    transition: `border-color var(--ag-motion-state) var(--ag-ease-state), box-shadow var(--ag-motion-state) var(--ag-ease-state)`,
                  }}
                  whileHover={{ borderColor: 'var(--ag-control)', boxShadow: 'var(--ag-shadow-raised)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-medium leading-snug"
                      style={{ fontSize: 'var(--ag-type-body)', color: 'var(--ag-text)', margin: 0 }}
                    >
                      {cap.label}
                    </h3>
                    <span
                      className="shrink-0 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
                      style={{ fontSize: 9, color: 'var(--ag-text-subtle)', background: 'var(--ag-canvas-raised)', border: '1px solid var(--ag-border)' }}
                    >
                      {cap.kind}
                    </span>
                  </div>

                  {cap.description && (
                    <p style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: 0, lineHeight: 'var(--ag-leading-relaxed)' }}>
                      {cap.description}
                    </p>
                  )}

                  <ConfidenceBar score={cap.confidence} />

                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {cap.planes.map((p) => (
                      <EvidenceBadge key={p} plane={p} source={cap.sources[0]} />
                    ))}
                  </div>

                  {cap.refs.length > 0 && (
                    <div className="pt-2 mt-1 border-t flex flex-wrap gap-x-3 gap-y-1" style={{ borderColor: 'var(--ag-border)' }}>
                      {cap.refs.map((ref, i) => (
                        <span
                          key={i}
                          className="font-mono truncate max-w-[140px]"
                          style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)' }}
                          title={ref}
                        >
                          {String(ref).slice(0, 12)}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </Tooltip.Provider>
  );
}
