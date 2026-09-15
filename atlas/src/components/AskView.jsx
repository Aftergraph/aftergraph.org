import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { answerFromEvidence } from '../lib/derive.js';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const MOTION_ITEM = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { ...MOTION_SURFACE } } };

async function fetchAsk() {
  const res = await fetch('/api/v3/ask');
  if (!res.ok) throw new Error('Failed to fetch ask data');
  return res.json();
}

function HighlightMatch({ text, query }) {
  if (!query.trim()) return <span>{text}</span>;
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  if (!tokens.length) return <span>{text}</span>;
  const regex = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = String(text).split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            style={{
              background: 'var(--ag-control-soft)',
              color: 'var(--ag-control)',
              borderRadius: 2,
              padding: '0 1px',
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
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
      className="px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0"
      style={{ fontSize: 9, color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {plane?.slice(0, 3)}
    </span>
  );
}

function HitCard({ hit, assertion, query }) {
  if (!assertion) return null;
  const valueStr = typeof assertion.value === 'string' ? assertion.value : JSON.stringify(assertion.value);
  return (
    <motion.div
      variants={MOTION_ITEM}
      layout
      className="rounded-xl border p-4 flex flex-col gap-2"
      style={{
        background: 'var(--ag-surface)',
        borderColor: 'var(--ag-border)',
        transition: `border-color var(--ag-motion-state) var(--ag-ease-state)`,
      }}
      whileHover={{ borderColor: 'var(--ag-control)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className="font-medium truncate"
            style={{ fontSize: 'var(--ag-type-body)', color: 'var(--ag-text)', margin: 0 }}
          >
            <HighlightMatch text={assertion.subject} query={query} />
          </h3>
          <PlaneChip plane={assertion.truth_plane} />
        </div>
        <span
          className="shrink-0 font-mono"
          style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)' }}
        >
          score: {hit.score}
        </span>
      </div>
      <p style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: 0 }}>
        <HighlightMatch text={`${assertion.predicate}: ${valueStr}`} query={query} />
      </p>
      <div
        className="flex items-center gap-3 pt-2 mt-1 border-t"
        style={{ borderColor: 'var(--ag-border)', fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)', fontFamily: 'var(--ag-font-code)' }}
      >
        <span title={assertion.provenance?.source || ''}>
          <HighlightMatch text={assertion.provenance?.source || '—'} query={query} />
        </span>
        <span>·</span>
        <span title={assertion.id}>{assertion.id.slice(0, 12)}</span>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}
    >
      <div className="flex items-center gap-2">
        <div className="h-4 rounded animate-pulse" style={{ width: '50%', background: 'var(--ag-border-strong)' }} />
        <div className="h-4 w-10 rounded animate-pulse" style={{ background: 'var(--ag-border-strong)' }} />
      </div>
      <div className="h-3 rounded animate-pulse" style={{ width: '80%', background: 'var(--ag-border)' }} />
      <div className="h-3 rounded animate-pulse" style={{ width: '30%', background: 'var(--ag-border)' }} />
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
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
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
        Spørg Atlas
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
        Søg i evidence graph'en. Du får kun svar med kildehenvisning — ingen gæt.
      </p>
    </motion.div>
  );
}

export default function AskView({ projection }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['atlas-ask'],
    queryFn: fetchAsk,
    staleTime: 30000,
    retry: 1,
  });

  // Use API data or fall back to projection for assertion lookup
  const effectiveProjection = useMemo(() => {
    if (apiData?.projection) return apiData.projection;
    return projection;
  }, [apiData, projection]);

  const byId = useMemo(() => {
    if (!effectiveProjection) return new Map();
    return new Map(effectiveProjection.assertions.map((a) => [a.id, a]));
  }, [effectiveProjection]);

  const run = useCallback(
    (e) => {
      e.preventDefault();
      if (!effectiveProjection || !query.trim()) return;
      const r = answerFromEvidence(effectiveProjection, query.trim());
      setResult(r);
    },
    [effectiveProjection, query]
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <div className="h-7 rounded animate-pulse" style={{ width: 180, background: 'var(--ag-border-strong)' }} />
          <div className="h-4 rounded animate-pulse" style={{ width: 300, background: 'var(--ag-border)' }} />
        </div>
        <div className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--ag-border)' }} />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={MOTION_SURFACE}
          style={{ fontSize: 'var(--ag-type-title)', fontWeight: 'var(--ag-weight-bold)', color: 'var(--ag-text)', margin: 0 }}
        >
          Ask Atlas
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION_SURFACE, delay: 0.08 }}
          style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: '4px 0 0' }}
        >
          Kun citerede assertions — ingen gæt
        </motion.p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...MOTION_SURFACE, delay: 0.12 }}
        onSubmit={run}
        className="flex gap-3"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. wi-backend head role, auth service owner…"
          aria-label="Ask Atlas"
          className="flex-1 rounded-lg px-4 py-2.5"
          style={{
            background: 'var(--ag-canvas-raised)',
            border: '1px solid var(--ag-border)',
            color: 'var(--ag-text)',
            fontSize: 'var(--ag-type-body)',
            outline: 'none',
            transition: `border-color var(--ag-motion-state) var(--ag-ease-state)`,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ag-control)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ag-border)'; }}
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-5 py-2.5 rounded-lg cursor-pointer"
          style={{
            fontSize: 'var(--ag-type-body-sm)',
            fontWeight: 'var(--ag-weight-semibold)',
            color: 'var(--ag-canvas)',
            background: query.trim() ? 'var(--ag-control)' : 'var(--ag-border)',
            border: 'none',
            transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
            opacity: query.trim() ? 1 : 0.5,
          }}
        >
          Ask
        </button>
      </motion.form>

      {!result && <EmptyState />}

      <AnimatePresence mode="wait">
        {result && result.hits.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 rounded-xl border text-center"
            style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)', color: 'var(--ag-text-muted)', fontSize: 'var(--ag-type-body-sm)' }}
          >
            Ingen matching assertions fundet. Prøv et andet søgeord.
          </motion.div>
        )}

        {result && result.hits.length > 0 && (
          <motion.div
            key="results"
            variants={MOTION_STAGGER}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2" style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)' }}>
              <span>{result.hits.length} evidence hits</span>
              {!result.valid && (
                <span className="px-2 py-0.5 rounded-full border" style={{ color: 'var(--ag-danger)', borderColor: 'color-mix(in srgb, var(--ag-danger) 30%, transparent)', background: 'var(--ag-danger-soft)' }}>
                  validation warning
                </span>
              )}
            </div>
            {result.hits.map((hit) => (
              <HitCard key={hit.id} hit={hit} assertion={byId.get(hit.id)} query={query} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
