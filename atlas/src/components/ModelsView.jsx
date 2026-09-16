import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import SkeletonCard from './shared/SkeletonCard.jsx';
import EmptyState from './shared/EmptyState.jsx';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };
const MOTION_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const MOTION_ITEM = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { ...MOTION_SURFACE } } };

async function fetchModels() {
  const res = await fetch('/api/v3/models');
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

function StatusBadge({ status }) {
  const colors = {
    active: { bg: 'var(--ag-evidence-soft)', text: 'var(--ag-evidence)', border: 'color-mix(in srgb, var(--ag-evidence) 30%, transparent)' },
    draft: { bg: 'var(--ag-decision-soft)', text: 'var(--ag-decision)', border: 'color-mix(in srgb, var(--ag-decision) 30%, transparent)' },
    deprecated: { bg: 'var(--ag-danger-soft)', text: 'var(--ag-danger)', border: 'color-mix(in srgb, var(--ag-danger) 30%, transparent)' },
  };
  const c = colors[status] || colors.draft;
  return (
    <span
      className="px-2 py-1 rounded-md font-mono uppercase tracking-wider shrink-0"
      style={{ fontSize: 11, fontWeight: 600, color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {status}
    </span>
  );
}

function ModelCard({ model }) {
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
          {model.name || model.id}
        </h3>
        <StatusBadge status={model.status || 'draft'} />
      </div>
      {model.description && (
        <p style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: 0, lineHeight: 1.6 }}>
          {model.description}
        </p>
      )}
      <div
        className="flex flex-wrap items-center gap-3 pt-4 mt-auto border-t"
        style={{ borderColor: 'var(--ag-border)', fontSize: 13, color: 'var(--ag-text-subtle)', fontFamily: 'var(--ag-font-code)' }}
      >
        {model.version && <span>v{model.version}</span>}
        {model.version && model.updated_at && <span>·</span>}
        {model.updated_at && <span>{new Date(model.updated_at).toLocaleDateString()}</span>}
        {model.entity_count != null && (
          <>
            <span>·</span>
            <span>{model.entity_count} entities</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function ModelsView({ projection }) {
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['atlas-models'],
    queryFn: fetchModels,
    staleTime: 30000,
    retry: 1,
  });

  const models = useMemo(() => {
    if (apiData?.models) return apiData.models;
    if (!projection?.meta) return [];
    return [{
      id: 'current',
      name: projection.meta.evidence_cut || 'Current Model',
      status: 'active',
      version: projection.meta.gov_sha?.slice(0, 7),
      entity_count: projection.entities?.length || 0,
      updated_at: projection.meta.generated_at,
    }];
  }, [apiData, projection]);

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="space-y-3">
          <div className="h-10 rounded animate-pulse" style={{ width: 240, background: 'var(--ag-border-strong)' }} />
          <div className="h-5 rounded animate-pulse" style={{ width: 360, background: 'var(--ag-border)' }} />
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
          Models
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION_SURFACE, delay: 0.08 }}
          style={{ fontSize: '17px', color: 'var(--ag-text-muted)', margin: '12px 0 0', lineHeight: 1.6 }}
        >
          Versionerede modeller med governance SHA og entitetsoverblik
        </motion.p>
      </div>

      {models.length === 0 ? (
        <EmptyState
          variant="models"
          title="Ingen modeller endnu"
          description="Generer din første model for at se den her."
        />
      ) : (
        <motion.div
          variants={MOTION_STAGGER}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <AnimatePresence>
            {models.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
