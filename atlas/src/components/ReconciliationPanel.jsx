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

function ConflictBadge({ status }) {
  const colors = {
    open: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    acknowledged: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[status] || colors.open}`}>
      {status}
    </span>
  );
}

function PlaneTag({ plane }) {
  const planeColors = {
    CANONICAL: 'text-blue-300',
    OBSERVED: 'text-cyan-300',
    INFERRED: 'text-purple-300',
    PROPOSED: 'text-amber-300',
    VERIFIED: 'text-emerald-300',
    EXECUTED: 'text-rose-300',
  };
  return <span className={`text-xs font-mono ${planeColors[plane] || 'text-gray-400'}`}>{plane}</span>;
}

function ConflictDetailDialog({ conflict, open, onOpenChange }) {
  if (!conflict) return null;
  const planes = typeof conflict.planes === 'string' ? JSON.parse(conflict.planes) : conflict.planes;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl p-6 z-50">
          <Dialog.Title className="text-lg font-semibold text-white mb-1">{conflict.claim_key}</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-400 mb-4">First seen: {new Date(conflict.first_seen).toLocaleString()}</Dialog.Description>
          <div className="space-y-4">
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Conflicting Planes</h4>
              <div className="flex flex-wrap gap-2">
                {(planes || []).map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <PlaneTag plane={p} />
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20">
              <h4 className="text-xs uppercase tracking-wider text-rose-400 mb-1">Resolution Required</h4>
              <p className="text-sm text-gray-300">This claim has conflicting evidence across truth planes. Manual reconciliation or adapter re-run needed.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Dialog.Close className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors">Close</Dialog.Close>
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
            <h2 className="text-xl font-bold text-white">Reconciliation</h2>
            <p className="text-sm text-gray-400">{filtered.length} active conflicts across truth planes</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                Filter: {filter}
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[120px] bg-gray-900 border border-white/10 rounded-lg shadow-xl p-1 z-50" sideOffset={4}>
                  {['all', 'open', 'resolved', 'acknowledged'].map(f => (
                    <DropdownMenu.Item key={f} onClick={() => setFilter(f)}
                      className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded cursor-pointer outline-none capitalize">
                      {f}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <button onClick={() => refetch()} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Refresh">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4" /><path d="M12.5 1v3h-3M3.5 15v-3h3" /></svg>
            </button>
          </div>
        </div>

        {/* Loading / Error / Empty */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            Failed to load conflicts: {error.message}
          </div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="py-12 text-center text-gray-500 text-sm">
            No conflicts found. All truth planes aligned. ✨
          </motion.div>
        )}

        {/* Conflict List */}
        <AnimatePresence mode="popLayout">
          {filtered.map((conflict, i) => (
            <motion.div key={conflict.id} layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedConflict(conflict)}
              className="group p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 cursor-pointer transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white truncate">{conflict.claim_key}</span>
                    <ConflictBadge status={conflict.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>ID: {conflict.id.slice(0, 8)}</span>
                    <span>·</span>
                    <span>{new Date(conflict.first_seen).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400"><path d="M6 4l4 4-4 4" /></svg>
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
