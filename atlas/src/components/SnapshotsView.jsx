import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { diffProjections } from '../lib/sliceC.js';
import SkeletonCard from './shared/SkeletonCard.jsx';
import EmptyState from './shared/EmptyState.jsx';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const MOTION_ITEM = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { ...MOTION_SURFACE } } };

async function fetchSnapshots() {
  const res = await fetch('/api/v3/snapshots');
  if (!res.ok) throw new Error('Failed to fetch snapshots');
  return res.json();
}

function DiffBadge({ label, count, type }) {
  if (count === 0) return null;
  const colors = {
    added: { bg: 'var(--ag-evidence-soft)', text: 'var(--ag-evidence)', border: 'color-mix(in srgb, var(--ag-evidence) 30%, transparent)' },
    removed: { bg: 'var(--ag-danger-soft)', text: 'var(--ag-danger)', border: 'color-mix(in srgb, var(--ag-danger) 30%, transparent)' },
    changed: { bg: 'var(--ag-decision-soft)', text: 'var(--ag-decision)', border: 'color-mix(in srgb, var(--ag-decision) 30%, transparent)' },
  };
  const c = colors[type] || colors.changed;
  return (
    <span
      className="px-3 py-1 rounded-md border font-mono"
      style={{ fontSize: 12, fontWeight: 600, background: c.bg, color: c.text, borderColor: c.border }}
    >
      {label} {count > 0 ? `+${count}` : count}
    </span>
  );
}

function SnapshotRow({ snapshot, onSelect, selected, loading }) {
  const isSelected = selected?.file === snapshot.file;
  return (
    <motion.div
      variants={MOTION_ITEM}
      layout
      onClick={() => !loading && onSelect(snapshot)}
      className="rounded-2xl border p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4"
      style={{
        background: isSelected ? 'var(--ag-control-soft)' : 'var(--ag-canvas-raised)',
        borderColor: isSelected ? 'var(--ag-control)' : 'var(--ag-border)',
        boxShadow: isSelected ? 'var(--ag-shadow-focus)' : 'var(--ag-shadow-raised)',
        opacity: loading ? 0.6 : 1,
        transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
      }}
      whileHover={!loading ? { borderColor: 'var(--ag-control)', boxShadow: 'var(--ag-shadow-focus)', y: -2 } : {}}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3
            className="font-mono truncate"
            style={{ fontSize: '17px', color: 'var(--ag-text)', margin: 0, fontWeight: 600 }}
          >
            {snapshot.evidence_cut}
          </h3>
          {isSelected && (
            <span
              className="shrink-0 px-2 py-1 rounded-md font-mono uppercase tracking-wider"
              style={{ fontSize: 11, fontWeight: 600, color: 'var(--ag-control)', background: 'var(--ag-control-soft)' }}
            >
              active
            </span>
          )}
        </div>
        <div className="flex items-center gap-4" style={{ fontSize: 13, color: 'var(--ag-text-subtle)', fontFamily: 'var(--ag-font-code)' }}>
          <span>gov: {String(snapshot.gov_sha || '').slice(0, 7)}</span>
          <span>·</span>
          <span>{snapshot.entities} entities</span>
          {(snapshot.conflicts || []).length > 0 && (
            <>
              <span>·</span>
              <span style={{ color: 'var(--ag-danger)' }}>{snapshot.conflicts.length} conflicts</span>
            </>
          )}
        </div>
      </div>
      {loading && selected?.file === snapshot.file && (
        <span className="text-sm animate-pulse" style={{ color: 'var(--ag-text-muted)' }}>Loading…</span>
      )}
    </motion.div>
  );
}

function DiffPanel({ diff, snapshotFile }) {
  if (!diff) return null;
  if (diff.error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 rounded-2xl border"
        style={{ background: 'var(--ag-danger-soft)', borderColor: 'color-mix(in srgb, var(--ag-danger) 30%, transparent)', color: 'var(--ag-danger)', fontSize: '17px' }}
      >
        {diff.error}
      </motion.div>
    );
  }
  const totalChanges =
    diff.addedEntities.length +
    diff.removedEntities.length +
    diff.addedAssertions.length +
    diff.removedAssertions.length +
    diff.changedAssertions.length +
    diff.addedRelations.length +
    diff.removedRelations.length +
    diff.openedConflicts.length +
    diff.resolvedConflicts.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={MOTION_SURFACE}
      className="rounded-2xl border p-8 space-y-6"
      style={{ background: 'var(--ag-canvas-raised)', borderColor: 'var(--ag-border)', boxShadow: 'var(--ag-shadow-raised)' }}
    >
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: '17px', fontWeight: 'var(--ag-weight-semibold)', color: 'var(--ag-text)', margin: 0 }}>
          Diff: {snapshotFile} → current
        </h3>
        <span className="font-mono" style={{ fontSize: 13, color: 'var(--ag-text-subtle)' }}>
          {totalChanges} changes
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        <DiffBadge label="entities" count={diff.addedEntities.length} type="added" />
        <DiffBadge label="entities" count={-diff.removedEntities.length} type="removed" />
        <DiffBadge label="assertions" count={diff.addedAssertions.length} type="added" />
        <DiffBadge label="assertions" count={-diff.removedAssertions.length} type="removed" />
        <DiffBadge label="changed" count={diff.changedAssertions.length} type="changed" />
        <DiffBadge label="relations" count={diff.addedRelations.length} type="added" />
        <DiffBadge label="relations" count={-diff.removedRelations.length} type="removed" />
        <DiffBadge label="conflicts opened" count={diff.openedConflicts.length} type="changed" />
        <DiffBadge label="conflicts resolved" count={diff.resolvedConflicts.length} type="added" />
      </div>
      {totalChanges === 0 && (
        <p style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: 0 }}>
          No differences — this snapshot matches the current projection.
        </p>
      )}
    </motion.div>
  );
}

export default function SnapshotsView({ projection }) {
  const [selected, setSelected] = useState(null);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['atlas-snapshots'],
    queryFn: fetchSnapshots,
    staleTime: 30000,
    retry: 1,
  });

  const index = useMemo(() => {
    if (apiData?.snapshots) return apiData.snapshots;
    if (!projection) return [];
    if (projection.meta?.evidence_cut) {
      return [{
        file: 'current',
        evidence_cut: projection.meta.evidence_cut,
        gov_sha: projection.meta.gov_sha,
        entities: projection.entities?.length || 0,
        conflicts: [],
      }];
    }
    return [];
  }, [apiData, projection]);

  const inspect = async (snapshot) => {
    setSelected(snapshot);
    setDiff(null);
    setLoading(true);
    try {
      const res = await fetch(`snapshots/${snapshot.file}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const old = await res.json();
      setDiff(diffProjections(old, projection));
    } catch (e) {
      setDiff({ error: `Cannot load ${snapshot.file}: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="space-y-3">
          <div className="h-10 rounded animate-pulse" style={{ width: 280, background: 'var(--ag-border-strong)' }} />
          <div className="h-5 rounded animate-pulse" style={{ width: 420, background: 'var(--ag-border)' }} />
        </div>
        <div className="space-y-4">
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
          Snapshots
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION_SURFACE, delay: 0.08 }}
          style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: '12px 0 0', lineHeight: 1.6 }}
        >
          Versionerede snapshots — historikken overskrives aldrig
        </motion.p>
      </div>

      {projection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION_SURFACE, delay: 0.12 }}
          className="flex flex-wrap gap-6 p-6 rounded-2xl border"
          style={{ background: 'var(--ag-canvas-raised)', borderColor: 'var(--ag-border)', boxShadow: 'var(--ag-shadow-raised)', fontSize: 13, fontFamily: 'var(--ag-font-code)', color: 'var(--ag-text-subtle)' }}
        >
          <span>current cut: <span style={{ color: 'var(--ag-text)' }}>{projection.meta?.evidence_cut || '—'}</span></span>
          <span>gov SHA: <span style={{ color: 'var(--ag-text)' }}>{String(projection.meta?.gov_sha || '').slice(0, 7)}</span></span>
        </motion.div>
      )}

      {index.length === 0 ? (
        <EmptyState
          variant="snapshots"
          title="Ingen snapshots endnu"
          description="Kør generatoren med --snapshot-dir for at oprette dit første snapshot."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            variants={MOTION_STAGGER}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <AnimatePresence>
              {index.map((s) => (
                <SnapshotRow
                  key={s.file}
                  snapshot={s}
                  onSelect={inspect}
                  selected={selected}
                  loading={loading}
                />
              ))}
            </AnimatePresence>
          </motion.div>
          <div className="lg:sticky lg:top-6 self-start">
            <AnimatePresence mode="wait">
              {diff && <DiffPanel key={selected?.file} diff={diff} snapshotFile={selected?.file} />}
            </AnimatePresence>
            {!diff && !loading && selected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 rounded-2xl border text-center"
                style={{ background: 'var(--ag-canvas-raised)', borderColor: 'var(--ag-border)', boxShadow: 'var(--ag-shadow-raised)', color: 'var(--ag-text-muted)', fontSize: '17px' }}
              >
                Vælg et snapshot for at se diff mod nuværende projection.
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
