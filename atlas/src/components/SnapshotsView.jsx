import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { diffProjections } from '../lib/sliceC.js';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const MOTION_ITEM = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { ...MOTION_SURFACE } } };

function DiffBadge({ label, count, type }) {
  if (count === 0) return null;
  const colors = {
    added: { bg: 'var(--ag-evidence-soft)', text: 'var(--ag-evidence)', border: 'rgba(36,196,173,0.3)' },
    removed: { bg: 'var(--ag-danger-soft)', text: 'var(--ag-danger)', border: 'rgba(255,107,122,0.3)' },
    changed: { bg: 'var(--ag-decision-soft)', text: 'var(--ag-decision)', border: 'rgba(240,166,74,0.3)' },
  };
  const c = colors[type] || colors.changed;
  return (
    <span
      className="px-2 py-0.5 rounded-full border font-mono"
      style={{ fontSize: 'var(--ag-type-caption)', background: c.bg, color: c.text, borderColor: c.border }}
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
      className="rounded-xl border p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-3"
      style={{
        background: isSelected ? 'var(--ag-control-soft)' : 'var(--ag-surface)',
        borderColor: isSelected ? 'var(--ag-control)' : 'var(--ag-border)',
        opacity: loading ? 0.6 : 1,
        transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
      }}
      whileHover={!loading ? { borderColor: 'var(--ag-control)' } : {}}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3
            className="font-mono truncate"
            style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text)', margin: 0 }}
          >
            {snapshot.evidence_cut}
          </h3>
          {isSelected && (
            <span
              className="shrink-0 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
              style={{ fontSize: 9, color: 'var(--ag-control)', background: 'var(--ag-control-soft)' }}
            >
              active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)', fontFamily: 'var(--ag-font-code)' }}>
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
        <span className="text-xs animate-pulse" style={{ color: 'var(--ag-text-muted)' }}>Loading…</span>
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
        className="p-4 rounded-xl border"
        style={{ background: 'var(--ag-danger-soft)', borderColor: 'rgba(255,107,122,0.3)', color: 'var(--ag-danger)', fontSize: 'var(--ag-type-body-sm)' }}
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
      className="rounded-xl border p-5 space-y-4"
      style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}
    >
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 'var(--ag-type-body)', fontWeight: 'var(--ag-weight-semibold)', color: 'var(--ag-text)', margin: 0 }}>
          Diff: {snapshotFile} → current
        </h3>
        <span className="font-mono" style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)' }}>
          {totalChanges} changes
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
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
        <p style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: 0 }}>
          No differences — this snapshot matches the current projection.
        </p>
      )}
    </motion.div>
  );
}

function SkeletonTimeline() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-2" style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}>
          <div className="h-4 rounded animate-pulse" style={{ width: '35%', background: 'var(--ag-border-strong)', animationDuration: 'var(--ag-motion-surface)' }} />
          <div className="h-3 rounded animate-pulse" style={{ width: '55%', background: 'var(--ag-border)', animationDuration: 'var(--ag-motion-surface)' }} />
        </div>
      ))}
    </div>
  );
}

export default function SnapshotsView({ projection }) {
  const [index, setIndex] = useState(null);
  const [selected, setSelected] = useState(null);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('snapshots/index.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const idx = await res.json();
        if (!cancelled) setIndex(Array.isArray(idx) ? idx : []);
      } catch {
        if (!cancelled) setIndex([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  if (!projection) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 rounded animate-pulse" style={{ width: 160, background: 'var(--ag-border-strong)' }} />
        <SkeletonTimeline />
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
          Snapshots
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION_SURFACE, delay: 0.08 }}
          style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)', margin: '4px 0 0' }}
        >
          Immutable versioned cuts — history is never rewritten
        </motion.p>
      </div>

      {/* Current cut metadata */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...MOTION_SURFACE, delay: 0.12 }}
        className="flex flex-wrap gap-4 p-4 rounded-xl border"
        style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)', fontSize: 'var(--ag-type-caption)', fontFamily: 'var(--ag-font-code)', color: 'var(--ag-text-subtle)' }}
      >
        <span>current cut: <span style={{ color: 'var(--ag-text)' }}>{projection.meta?.evidence_cut || '—'}</span></span>
        <span>gov SHA: <span style={{ color: 'var(--ag-text)' }}>{String(projection.meta?.gov_sha || '').slice(0, 7)}</span></span>
      </motion.div>

      {index === null && <SkeletonTimeline />}

      {index !== null && index.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-8 rounded-xl border text-center"
          style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)', color: 'var(--ag-text-muted)', fontSize: 'var(--ag-type-body-sm)' }}
        >
          No versioned snapshots ship with this build yet — run the generator with --snapshot-dir.
        </motion.div>
      )}

      {index !== null && index.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            variants={MOTION_STAGGER}
            initial="hidden"
            animate="show"
            className="space-y-2"
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
          <div className="lg:sticky lg:top-4 self-start">
            <AnimatePresence mode="wait">
              {diff && <DiffPanel key={selected?.file} diff={diff} snapshotFile={selected?.file} />}
            </AnimatePresence>
            {!diff && !loading && selected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 rounded-xl border text-center"
                style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)', color: 'var(--ag-text-muted)', fontSize: 'var(--ag-type-body-sm)' }}
              >
                Select a snapshot to view its diff against the current projection.
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
