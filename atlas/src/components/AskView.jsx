import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { answerFromEvidence } from '../lib/derive.js';
import SkeletonCard from './shared/SkeletonCard.jsx';
import EmptyState from './shared/EmptyState.jsx';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const MOTION_ITEM = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { ...MOTION_SURFACE } } };

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
              borderRadius: 3,
              padding: '0 2px',
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
      className="px-2 py-1 rounded-md font-mono uppercase tracking-wider shrink-0"
      style={{ fontSize: 11, fontWeight: 600, color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
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
        <div className="flex items-center gap-3 min-w-0">
          <h3
            className="font-semibold truncate"
            style={{ fontSize: '17px', color: 'var(--ag-text)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.3 }}
          >
            <HighlightMatch text={assertion.subject} query={query} />
          </h3>
          <PlaneChip plane={assertion.truth_plane} />
        </div>
        <span
          className="shrink-0 font-mono"
          style={{ fontSize: 13, color: 'var(--ag-text-subtle)' }}
        >
          score: {hit.score}
        </span>
      </div>
      <p style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: 0, lineHeight: 1.6 }}>
        <HighlightMatch text={`${assertion.predicate}: ${valueStr}`} query={query} />
      </p>
      <div
        className="flex items-center gap-4 pt-4 mt-auto border-t"
        style={{ borderColor: 'var(--ag-border)', fontSize: 13, color: 'var(--ag-text-subtle)', fontFamily: 'var(--ag-font-code)' }}
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

export default function AskView({ projection }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['atlas-ask'],
    queryFn: fetchAsk,
    staleTime: 30000,
    retry: 1,
  });

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
      <div className="space-y-8 p-8">
        <div className="space-y-3">
          <div className="h-10 rounded animate-pulse" style={{ width: 220, background: 'var(--ag-border-strong)' }} />
          <div className="h-5 rounded animate-pulse" style={{ width: 360, background: 'var(--ag-border)' }} />
        </div>
        <div className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--ag-border)' }} />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
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
          Ask Atlas
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION_SURFACE, delay: 0.08 }}
          style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: '12px 0 0', lineHeight: 1.6 }}
        >
          Kun citerede assertions — ingen gæt
        </motion.p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...MOTION_SURFACE, delay: 0.12 }}
        onSubmit={run}
        className="flex gap-4"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. wi-backend head role, auth service owner…"
          aria-label="Ask Atlas"
          className="flex-1 rounded-xl px-6 py-4"
          style={{
            background: 'var(--ag-canvas-raised)',
            border: '1px solid var(--ag-border)',
            color: 'var(--ag-text)',
            fontSize: '17px',
            outline: 'none',
            boxShadow: 'var(--ag-shadow-raised)',
            transition: `border-color var(--ag-motion-state) var(--ag-ease-state), box-shadow var(--ag-motion-state) var(--ag-ease-state)`,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ag-control)'; e.currentTarget.style.boxShadow = 'var(--ag-shadow-focus)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ag-border)'; e.currentTarget.style.boxShadow = 'var(--ag-shadow-raised)'; }}
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-8 py-4 rounded-xl cursor-pointer"
          style={{
            fontSize: '17px',
            fontWeight: 'var(--ag-weight-semibold)',
            color: 'var(--ag-canvas)',
            background: query.trim() ? 'var(--ag-control)' : 'var(--ag-border)',
            border: 'none',
            boxShadow: query.trim() ? 'var(--ag-shadow-raised)' : 'none',
            transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
            opacity: query.trim() ? 1 : 0.5,
          }}
        >
          Ask
        </button>
      </motion.form>

      {!result && (
        <EmptyState
          variant="ask"
          title="Spørg Atlas"
          description="Søg i evidence graph'en. Du får kun svar med kildehenvisning — ingen gæt."
        />
      )}

      <AnimatePresence mode="wait">
        {result && result.hits.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-10 rounded-2xl border text-center"
            style={{ background: 'var(--ag-canvas-raised)', borderColor: 'var(--ag-border)', boxShadow: 'var(--ag-shadow-raised)', color: 'var(--ag-text-muted)', fontSize: '17px' }}
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
            className="space-y-4"
          >
            <div className="flex items-center gap-3" style={{ fontSize: 13, color: 'var(--ag-text-subtle)' }}>
              <span>{result.hits.length} evidence hits</span>
              {!result.valid && (
                <span className="px-3 py-1 rounded-md border" style={{ color: 'var(--ag-danger)', borderColor: 'color-mix(in srgb, var(--ag-danger) 30%, transparent)', background: 'var(--ag-danger-soft)', fontWeight: 600 }}>
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
