import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import SkeletonCard from './shared/SkeletonCard.jsx';
import EmptyState from './shared/EmptyState.jsx';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const MOTION_ITEM = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { ...MOTION_SURFACE } } };

async function fetchResearch() {
  const res = await fetch('/api/v3/research');
  if (!res.ok) throw new Error('Failed to fetch research');
  return res.json();
}

function ResearchCard({ item }) {
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
          className="font-semibold"
          style={{ fontSize: '17px', color: 'var(--ag-text)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.3 }}
        >
          {item.title || item.id}
        </h3>
        {item.status && (
          <span
            className="px-2 py-1 rounded-md font-mono uppercase tracking-wider shrink-0"
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--ag-evidence)', background: 'var(--ag-evidence-soft)', border: '1px solid color-mix(in srgb, var(--ag-evidence) 30%, transparent)' }}
          >
            {item.status}
          </span>
        )}
      </div>
      {item.summary && (
        <p style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: 0, lineHeight: 1.6 }}>
          {item.summary}
        </p>
      )}
      <div
        className="flex flex-wrap items-center gap-3 pt-4 mt-auto border-t"
        style={{ borderColor: 'var(--ag-border)', fontSize: 13, color: 'var(--ag-text-subtle)', fontFamily: 'var(--ag-font-code)' }}
      >
        {item.source && <span title={item.source}>{item.source}</span>}
        {item.source && item.date && <span>·</span>}
        {item.date && <span>{item.date}</span>}
        {item.confidence != null && (
          <>
            <span>·</span>
            <span>confidence: {item.confidence}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function ResearchView({ projection }) {
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['atlas-research'],
    queryFn: fetchResearch,
    staleTime: 30000,
    retry: 1,
  });

  const items = useMemo(() => {
    if (apiData?.research) return apiData.research;
    if (!projection?.assertions) return [];
    return projection.assertions.filter((a) => a.predicate?.startsWith('research_'));
  }, [apiData, projection]);

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="space-y-3">
          <div className="h-10 rounded animate-pulse" style={{ width: 260, background: 'var(--ag-border-strong)' }} />
          <div className="h-5 rounded animate-pulse" style={{ width: 380, background: 'var(--ag-border)' }} />
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
          Research
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION_SURFACE, delay: 0.08 }}
          style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: '12px 0 0', lineHeight: 1.6 }}
        >
          Forskningsresultater og eksterne kilder med fuld proveniens
        </motion.p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          variant="research"
          title="Ingen forskningsdata"
          description="Tilføj research assertions til din evidence graph for at se dem her."
        />
      ) : (
        <motion.div
          variants={MOTION_STAGGER}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <AnimatePresence>
            {items.map((item) => (
              <ResearchCard key={item.id} item={item} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
