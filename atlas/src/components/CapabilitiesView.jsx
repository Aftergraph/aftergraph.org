import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const MOTION_ITEM = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { ...MOTION_SURFACE } } };

async function fetchCapabilities() {
  const res = await fetch('/api/v3/capabilities');
  if (!res.ok) throw new Error('Failed to fetch capabilities');
  return res.json();
}

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
      <div className="h-4 rounded animate-pulse" style={{ width: '60%', background: 'var(--ag-border-strong)' }} />
      <div className="h-3 rounded animate-pulse" style={{ width: '90%', background: 'var(--ag-border)' }} />
      <div className="h-3 rounded animate-pulse" style={{ width: '40%', background: 'var(--ag-border)' }} />
      <div className="flex gap-2 pt-2">
        <div className="h-5 w-12 rounded-full animate-pulse" style={{ background: 'var(--ag-border)' }} />
        <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: 'var(--ag-border)' }} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={MOTION_SURFACE}
      className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border"
      style={{
        background: 'linear-gradient(135deg, var(--ag-surface) 0%, var(--ag-canvas-raised) 100%)',
        borderColor: 'var(--ag-border)',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--ag-control-soft)', color: 'var(--ag-control)' }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h3
        style={{
          fontSize: 'var(--ag-type-title-sm)',
          fontWeight: 'var(--ag-weight-semibold)',
          color: 'var(--ag-text)',
          margin: '0 0 8px',
        }}
      >
        No capabilities yet
      </h3>
      <p
        style={{
          fontSize: 'var(--ag-type-body-sm)',
          color: 'var(--ag-text-muted)',
          margin: 0,
          maxWidth: 360,
          lineHeight: 1.5,
        }}
      >
        Capabilities are derived from evidence-backed assertions across the topology.
        Publish your first capability via the API to see it here.
      </p>
    </motion.div>
  );
}

export default function CapabilitiesView({ projection }) {
  // Try async fetch first, fall back to projection-derived data
  const { data: apiCaps, isLoading } = useQuery({
    queryKey: ['atlas-capabilities'],
    queryFn: fetchCapabilities,
    staleTime: 30000,
    retry: 1,
  });

  const caps = useMemo(() => {
    if (apiCaps?.capabilities) return apiCaps.capabilities;
    if (!projection) return [];
    // Derive from projection as fallback
    const result = [];
    const asserts = projection.assertions || [];
    const byId = new Map(asserts.map((a) => [a.id, a]));
    for (const a of asserts) {
      if (a.type === 'capability' || a.predicate === 'has_capability') {
        result.push({
          id: a.id,
          label: a.label || a.object || a.id,
          confidence: a.confidence ?? 0.5,
          plane: a.plane || 'OBSERVED',
          source: a.provenance?.source,
        });
      }
    }
    result.sort((a, b) => b.confidence - a.confidence || a.label.localeCompare(b.label));
    return result;
  }, [apiCaps, projection]);

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
            Capabilities
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...MOTION_SURFACE, delay: 0.08 }}
            style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: '4px 0 0' }}
          >
            {caps.length} capabilities with evidence-backed confidence scores
          </motion.p>
        </div>

        {caps.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            variants={MOTION_STAGGER}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {caps.map((cap) => (
              <motion.div
                key={cap.id}
                variants={MOTION_ITEM}
                className="rounded-xl border p-5 space-y-3"
                style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    style={{
                      fontSize: 'var(--ag-type-body)',
                      fontWeight: 'var(--ag-weight-semibold)',
                      color: 'var(--ag-text)',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {cap.label}
                  </h3>
                  <EvidenceBadge plane={cap.plane} source={cap.source} />
                </div>
                <ConfidenceBar score={cap.confidence} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </Tooltip.Provider>
  );
}
