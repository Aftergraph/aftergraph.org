import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import SkeletonCard from './shared/SkeletonCard.jsx';
import EmptyState from './shared/EmptyState.jsx';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const MOTION_ITEM = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { ...MOTION_SURFACE } } };

async function fetchCapabilities() {
  const res = await fetch('/api/v3/capabilities');
  if (!res.ok) throw new Error('Failed to fetch capabilities');
  return res.json();
}

function PlaneChip({ plane }) {
  const colors = {
    CANONICAL: { bg: 'var(--ag-authority-soft)', text: 'var(--ag-authority)', border: 'color-mix(in srgb, var(--ag-authority) 30%, transparent)' },
    OBSERVED: { bg: 'var(--ag-evidence-soft)', text: 'var(--ag-evidence)', border: 'color-mix(in srgb, var(--ag-evidence) 30%, transparent)' },
    PROPOSED: { bg: 'var(--ag-decision-soft)', text: 'var(--ag-decision)', border: 'color-mix(in srgb, var(--ag-decision) 30%, transparent)' },
  };
  const c = colors[plane] || colors.OBSERVED;
  return (
    <span
      className="px-2 py-1 rounded-md font-mono uppercase tracking-wider shrink-0"
      style={{ fontSize: 11, fontWeight: 600, color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {plane?.slice(0, 3)}
    </span>
  );
}

function CapabilityCard({ cap }) {
  return (
    <motion.div
      variants={MOTION_ITEM}
      layout
      className="rounded-2xl border p-8 flex flex-col gap-4"
      style={{
        background: 'var(--ag-canvas-raised)',
        borderColor: 'var(--ag-border)',
        boxShadow: 'var(--ag-shadow-raised)',
        transition: `border-color var(--ag-motion-state) var(--ag-ease-state), box-shadow var(--ag-motion-state) var(--ag-ease-state), transform var(--ag-motion-state) var(--ag-ease-state)`,
      }}
      whileHover={{ borderColor: 'var(--ag-control)', boxShadow: 'var(--ag-shadow-focus)', y: -2 }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className="font-semibold truncate"
          style={{ fontSize: '17px', color: 'var(--ag-text)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.3 }}
        >
          {cap.subject}
        </h3>
        <PlaneChip plane={cap.truth_plane} />
      </div>
      <p style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: 0, lineHeight: 1.6 }}>
        {cap.predicate}: {typeof cap.value === 'string' ? cap.value : JSON.stringify(cap.value)}
      </p>
      <div
        className="flex items-center gap-3 pt-4 mt-auto border-t"
        style={{ borderColor: 'var(--ag-border)', fontSize: 13, color: 'var(--ag-text-subtle)', fontFamily: 'var(--ag-font-code)' }}
      >
        <span title={cap.provenance?.source || ''}>{cap.provenance?.source || '—'}</span>
        <span>·</span>
        <span title={cap.id}>{cap.id.slice(0, 12)}</span>
      </div>
    </motion.div>
  );
}

export default function CapabilitiesView({ projection }) {
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['atlas-capabilities'],
    queryFn: fetchCapabilities,
    staleTime: 30000,
    retry: 1,
  });

  const caps = useMemo(() => {
    if (apiData?.capabilities) return apiData.capabilities;
    if (!projection?.assertions) return [];
    return projection.assertions.filter((a) => a.predicate?.startsWith('capable_of'));
  }, [apiData, projection]);

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="space-y-3">
          <div className="h-10 rounded animate-pulse" style={{ width: 280, background: 'var(--ag-border-strong)' }} />
          <div className="h-5 rounded animate-pulse" style={{ width: 400, background: 'var(--ag-border)' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={MOTION_SURFACE}
          style={{ fontSize: '42px', fontWeight: 'var(--ag-weight-bold)', color: 'var(--ag-text)', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.15 }}
        >
          Capabilities
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION_SURFACE, delay: 0.08 }}
          style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: '12px 0 0', lineHeight: 1.6 }}
        >
          Systemkapaciteter udledt fra evidence graph — ingen antagelser
        </motion.p>
      </div>

      {caps.length === 0 ? (
        <EmptyState
          variant="capabilities"
          title="Ingen kapaciteter fundet"
          description="Kør generatoren for at udlede kapaciteter fra din evidence graph."
        />
      ) : (
        <motion.div
          variants={MOTION_STAGGER}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <AnimatePresence>
            {caps.map((cap) => (
              <CapabilityCard key={cap.id} cap={cap} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
