import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';

async function fetchConflicts() {
  const res = await fetch('/api/v3/conflicts');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STATE = { duration: 0.2, ease: [0.2, 0.7, 0.2, 1] };
const MOTION_MICRO = { duration: 0.12, ease: [0.2, 0.8, 0.2, 1] };

function SkeletonRow() {
  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        background: 'var(--ag-surface)',
        borderColor: 'var(--ag-border)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-4 rounded animate-pulse"
          style={{ width: '60%', background: 'var(--ag-border-strong)', animationDuration: 'var(--ag-motion-surface)' }}
        />
        <div
          className="h-5 w-16 rounded-full animate-pulse"
          style={{ background: 'var(--ag-border-strong)', animationDuration: 'var(--ag-motion-surface)' }}
        />
      </div>
      <div
        className="h-3 rounded animate-pulse"
        style={{ width: '40%', background: 'var(--ag-border)', animationDuration: 'var(--ag-motion-surface)' }}
      />
    </div>
  );
}

function ConflictBadge({ status }) {
  const colors = {
    open: { bg: 'var(--ag-danger-soft)', text: 'var(--ag-danger)', border: 'color-mix(in srgb, var(--ag-danger) 30%, transparent)' },
    resolved: { bg: 'var(--ag-evidence-soft)', text: 'var(--ag-evidence)', border: 'color-mix(in srgb, var(--ag-evidence) 30%, transparent)' },
    acknowledged: { bg: 'var(--ag-decision-soft)', text: 'var(--ag-decision)', border: 'color-mix(in srgb, var(--ag-decision) 30%, transparent)' },
  };
  const c = colors[status] || colors.open;
  return (
    <span
      className="px-2 py-0.5 rounded-full border font-medium"
      style={{
        fontSize: 'var(--ag-type-ui)',
        background: c.bg,
        color: c.text,
        borderColor: c.border,
      }}
    >
      {status}
    </span>
  );
}

function PlaneTag({ plane }) {
  const planeColors = {
    CANONICAL: 'var(--ag-authority)',
    OBSERVED: 'var(--ag-control)',
    INFERRED: 'var(--ag-authority)',
    PROPOSED: 'var(--ag-decision)',
    VERIFIED: 'var(--ag-evidence)',
    EXECUTED: 'var(--ag-danger)',
  };
  return (
    <span
      className="font-mono"
      style={{
        fontSize: 'var(--ag-type-ui)',
        color: planeColors[plane] || 'var(--ag-text-muted)',
      }}
    >
      {plane}
    </span>
  );
}

function ConflictDetailDialog({ conflict, open, onOpenChange }) {
  if (!conflict) return null;
  const planes = typeof conflict.planes === 'string' ? JSON.parse(conflict.planes) : conflict.planes;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 backdrop-blur-sm"
          style={{ background: 'color-mix(in srgb, var(--ag-canvas) 60%, transparent)' }}
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[80vh] overflow-y-auto z-50 p-6"
          style={{
            background: 'var(--ag-surface-strong)',
            border: '1px solid var(--ag-border)',
            borderRadius: 'var(--ag-radius-card)',
            boxShadow: 'var(--ag-shadow-overlay)',
          }}
        >
          <Dialog.Title
            className="mb-1"
            style={{ fontSize: 'var(--ag-type-title)', fontWeight: 'var(--ag-weight-semibold)', color: 'var(--ag-text)' }}
          >
            {conflict.claim_key}
          </Dialog.Title>
          <Dialog.Description
            className="mb-4"
            style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text-muted)' }}
          >
            First seen: {new Date(conflict.first_seen).toLocaleString()}
          </Dialog.Description>
          <div className="space-y-4">
            <div>
              <h4
                className="uppercase tracking-wider mb-2"
                style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-text-subtle)' }}
              >
                Conflicting Planes
              </h4>
              <div className="flex flex-wrap gap-2">
                {(planes || []).map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...MOTION_MICRO, delay: i * 0.05 }}
                    className="px-3 py-1.5 rounded-lg border"
                    style={{
                      background: 'var(--ag-surface)',
                      borderColor: 'var(--ag-border)',
                    }}
                  >
                    <PlaneTag plane={p} />
                  </motion.div>
                ))}
              </div>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{
                background: 'var(--ag-danger-soft)',
                borderColor: 'color-mix(in srgb, var(--ag-danger) 20%, transparent)',
              }}
            >
              <h4
                className="uppercase tracking-wider mb-1"
                style={{ fontSize: 'var(--ag-type-caption)', color: 'var(--ag-danger)' }}
              >
                Resolution Required
              </h4>
              <p style={{ fontSize: 'var(--ag-type-body-sm)', color: 'var(--ag-text)' }}>
                This claim has conflicting evidence across truth planes. Manual reconciliation or adapter re-run needed.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Dialog.Close
              className="px-4 py-2 rounded-lg cursor-pointer"
              style={{
                fontSize: 'var(--ag-type-body-sm)',
                fontWeight: 'var(--ag-weight-medium)',
                color: 'var(--ag-text)',
                background: 'var(--ag-surface)',
                border: '1px solid var(--ag-border)',
                transition: `background var(--ag-motion-state) var(--ag-ease-state), border-color var(--ag-motion-state) var(--ag-ease-state)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ag-surface-strong)';
                e.currentTarget.style.borderColor = 'var(--ag-control)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--ag-surface)';
                e.currentTarget.style.borderColor = 'var(--ag-border)';
              }}
            >
              Close
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function ReconciliationPanel() {
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [filter, setFilter] = useState('all');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['atlas-conflicts'], queryFn: fetchConflicts, refetchInterval: 30000 });

  const conflicts = data?.conflicts || [];
  const filtered = filter === 'all' ? conflicts : conflicts.filter(c => c.status === filter);

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2
              style={{
                fontSize: 'var(--ag-type-title)',
                fontWeight: 'var(--ag-weight-bold)',
                color: 'var(--ag-text)',
                margin: 0,
              }}
            >
              Reconciliation
            </h2>
            <p
              style={{
                fontSize: 'var(--ag-type-body-sm)',
                color: 'var(--ag-text-muted)',
                margin: 0,
              }}
            >
              {filtered.length} active conflicts across truth planes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                className="px-3 py-1.5 rounded-lg cursor-pointer"
                style={{
                  fontSize: 'var(--ag-type-ui)',
                  fontWeight: 'var(--ag-weight-medium)',
                  color: 'var(--ag-text)',
                  background: 'var(--ag-surface)',
                  border: '1px solid var(--ag-border)',
                  transition: `background var(--ag-motion-state) var(--ag-ease-state)`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ag-surface-strong)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ag-surface)'; }}
              >
                Filter: {filter}
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[120px] p-1 z-50"
                  sideOffset={4}
                  style={{
                    background: 'var(--ag-canvas-raised)',
                    border: '1px solid var(--ag-border)',
                    borderRadius: 'var(--ag-radius-control)',
                    boxShadow: 'var(--ag-shadow-overlay)',
                  }}
                >
                  {['all', 'open', 'resolved', 'acknowledged'].map(f => (
                    <DropdownMenu.Item
                      key={f}
                      onClick={() => setFilter(f)}
                      className="px-3 py-1.5 rounded cursor-pointer outline-none capitalize"
                      style={{
                        fontSize: 'var(--ag-type-body-sm)',
                        color: 'var(--ag-text)',
                        transition: `background var(--ag-motion-micro) var(--ag-ease-micro), color var(--ag-motion-micro) var(--ag-ease-micro)`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--ag-surface)';
                        e.currentTarget.style.color = 'var(--ag-text)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {f}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg cursor-pointer"
              title="Refresh"
              style={{
                color: 'var(--ag-text-muted)',
                background: 'transparent',
                border: 'none',
                transition: `color var(--ag-motion-state) var(--ag-ease-state)`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ag-text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ag-text-muted)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4" /><path d="M12.5 1v3h-3M3.5 15v-3h3" /></svg>
            </button>
          </div>
        </div>

        {/* Loading / Error / Empty */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        )}
        {error && (
          <div
            className="p-4 rounded-xl border"
            style={{
              background: 'var(--ag-danger-soft)',
              borderColor: 'color-mix(in srgb, var(--ag-danger) 20%, transparent)',
              color: 'var(--ag-danger)',
              fontSize: 'var(--ag-type-body-sm)',
            }}
          >
            Failed to load conflicts: {error.message}
          </div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={MOTION_SURFACE}
            className="py-12 text-center"
            style={{ color: 'var(--ag-text-subtle)', fontSize: 'var(--ag-type-body-sm)' }}
          >
            No conflicts found. All truth planes aligned. ✨
          </motion.div>
        )}

        {/* Conflict List */}
        <AnimatePresence mode="popLayout">
          {filtered.map((conflict, i) => (
            <motion.div
              key={conflict.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ ...MOTION_STATE, delay: i * 0.03 }}
              onClick={() => setSelectedConflict(conflict)}
              className="group p-4 rounded-xl cursor-pointer border"
              style={{
                background: 'var(--ag-surface)',
                borderColor: 'var(--ag-border)',
                transition: `background var(--ag-motion-state) var(--ag-ease-state), border-color var(--ag-motion-state) var(--ag-ease-state)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ag-surface-strong)';
                e.currentTarget.style.borderColor = 'var(--ag-border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--ag-surface)';
                e.currentTarget.style.borderColor = 'var(--ag-border)';
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="truncate"
                      style={{
                        fontSize: 'var(--ag-type-body)',
                        fontWeight: 'var(--ag-weight-medium)',
                        color: 'var(--ag-text)',
                      }}
                    >
                      {conflict.claim_key}
                    </span>
                    <ConflictBadge status={conflict.status} />
                  </div>
                  <div
                    className="flex items-center gap-2"
                    style={{ fontSize: 'var(--ag-type-ui)', color: 'var(--ag-text-subtle)' }}
                  >
                    <span>ID: {conflict.id.slice(0, 8)}</span>
                    <span>·</span>
                    <span>{new Date(conflict.first_seen).toLocaleDateString()}</span>
                  </div>
                </div>
                <div
                  className="opacity-0 group-hover:opacity-100"
                  style={{ transition: `opacity var(--ag-motion-state) var(--ag-ease-state)` }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--ag-text-muted)' }}><path d="M6 4l4 4-4 4" /></svg>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Detail Dialog */}
        <ConflictDetailDialog conflict={selectedConflict} open={!!selectedConflict} onOpenChange={(v) => !v && setSelectedConflict(null)} />
      </div>
    </Tooltip.Provider>
  );
}
