import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const MOTION_ITEM = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { ...MOTION_SURFACE } } };

const FILTERS = ['all', 'CANONICAL', 'OBSERVED', 'PROPOSED'];

function ResearchRow({ item }) {
  const planeColors = {
    CANONICAL: { text: 'var(--ag-authority)', bg: 'var(--ag-authority-soft)' },
    OBSERVED: { text: 'var(--ag-evidence)', bg: 'var(--ag-evidence-soft)' },
    PROPOSED: { text: 'var(--ag-decision)', bg: 'var(--ag-decision-soft)' },
  };
  const pc = planeColors[item.plane] || planeColors.OBSERVED;

  return (
    <motion.div
      variants={MOTION_ITEM}
      layout
      className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{
        background: 'var(--ag-surface)',
        borderColor: 'var(--ag-border)',
        transition: `border-color var(--ag-motion-state) var(--ag-ease-state)`,
      }}
      whileHover={{ borderColor: 'var(--ag-control)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3
            className="font-medium truncate"
            style={{ fontSize: 'var(--ag-type-body)', color: 'var(--ag-text)', margin: 0 }}
          >
            {item.subject}
          </h3>
          <span
            className="shrink-0 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
            style={{ fontSize: 9, color: pc.text, background: pc.bg }}
          >
            {item.plane?.slice(0, 3)}
          </span>
        </div>
        <p
          className="truncate"
          style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: 0 }}
        >
          {item.predicate}: {typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0" style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)', fontFamily: 'var(--ag-font-code)' }}>
        <span title={item.source}>{item.source?.slice(0, 16) || '—'}</span>
        <span title={item.ref}>{String(item.ref || '').slice(0, 7)}</span>
      </div>
    </motion.div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-2" style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}>
          <div className="flex items-center gap-2">
            <div className="h-4 rounded animate-pulse" style={{ width: '40%', background: 'var(--ag-border-strong)', animationDuration: 'var(--ag-motion-surface)' }} />
            <div className="h-4 w-10 rounded animate-pulse" style={{ background: 'var(--ag-border-strong)', animationDuration: 'var(--ag-motion-surface)' }} />
          </div>
          <div className="h-3 rounded animate-pulse" style={{ width: '65%', background: 'var(--ag-border)', animationDuration: 'var(--ag-motion-surface)' }} />
        </div>
      ))}
    </div>
  );
}

export default function ResearchView({ projection }) {
  const [query, setQuery] = useState('');
  const [planeFilter, setPlaneFilter] = useState('all');

  const items = useMemo(() => {
    if (!projection) return [];
    return projection.assertions.map((a) => ({
      id: a.id,
      subject: a.subject,
      predicate: a.predicate,
      value: a.value,
      plane: a.truth_plane,
      source: a.provenance?.source || '',
      ref: a.provenance?.ref || '',
    }));
  }, [projection]);

  const filtered = useMemo(() => {
    let result = items;
    if (planeFilter !== 'all') {
      result = result.filter((i) => i.plane === planeFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.subject.toLowerCase().includes(q) ||
          i.predicate.toLowerCase().includes(q) ||
          JSON.stringify(i.value).toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, planeFilter, query]);

  if (!projection) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 rounded animate-pulse" style={{ width: 160, background: 'var(--ag-border-strong)' }} />
        <SkeletonRows />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={MOTION_SURFACE}
          style={{ fontSize: 'var(--ag-type-title)', fontWeight: 'var(--ag-weight-bold)', color: 'var(--ag-text)', margin: 0 }}
        >
          Research Index
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION_SURFACE, delay: 0.08 }}
          style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: '4px 0 0' }}
        >
          {filtered.length} of {items.length} assertions
        </motion.p>
      </div>

      {/* Search + Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...MOTION_SURFACE, delay: 0.12 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subjects, predicates, values…"
          aria-label="Search research index"
          className="flex-1 rounded-lg px-3 py-2"
          style={{
            background: 'var(--ag-canvas-raised)',
            border: '1px solid var(--ag-border)',
            color: 'var(--ag-text)',
            fontSize: 'var(--ag-type-body-sm)',
            outline: 'none',
            transition: `border-color var(--ag-motion-state) var(--ag-ease-state)`,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ag-control)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ag-border)'; }}
        />
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setPlaneFilter(f)}
              className="px-3 py-1.5 rounded-lg cursor-pointer"
              style={{
                fontSize: 'var(--ag-type-ui)',
                fontWeight: 'var(--ag-weight-medium)',
                color: planeFilter === f ? 'var(--ag-text)' : 'var(--ag-text-muted)',
                background: planeFilter === f ? 'var(--ag-control-soft)' : 'var(--ag-surface)',
                border: `1px solid ${planeFilter === f ? 'var(--ag-control)' : 'var(--ag-border)'}`,
                transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
              }}
            >
              {f === 'all' ? 'All' : f.slice(0, 3)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Results list */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-8 rounded-xl border text-center"
          style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)', color: 'var(--ag-text-muted)', fontSize: 'var(--ag-type-body-sm)' }}
        >
          No assertions match your filters.
        </motion.div>
      ) : (
        <motion.div
          variants={MOTION_STAGGER}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {filtered.slice(0, 100).map((item) => (
              <ResearchRow key={item.id} item={item} />
            ))}
          </AnimatePresence>
          {filtered.length > 100 && (
            <p style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)', textAlign: 'center', padding: '8px 0' }}>
              Showing first 100 of {filtered.length} results. Refine your search to narrow.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
