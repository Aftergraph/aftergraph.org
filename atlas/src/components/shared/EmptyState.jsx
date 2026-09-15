import { motion } from 'framer-motion';

const MOTION_SURFACE = { duration: 0.34, ease: [0.16, 1, 0.3, 1] };

const DEFAULT_ICONS = {
  capabilities: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  models: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  research: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  snapshots: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  ask: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  ),
};

export default function EmptyState({ icon, title, description, variant = 'capabilities' }) {
  const resolvedIcon = icon || DEFAULT_ICONS[variant] || DEFAULT_ICONS.capabilities;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={MOTION_SURFACE}
      className="flex flex-col items-center justify-center py-20 px-8 text-center rounded-2xl border"
      style={{
        background: 'linear-gradient(135deg, var(--ag-canvas-raised) 0%, var(--ag-surface) 100%)',
        borderColor: 'var(--ag-border)',
        boxShadow: 'var(--ag-shadow-raised)',
      }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
        style={{ background: 'var(--ag-control-soft)', color: 'var(--ag-control)' }}
      >
        {resolvedIcon}
      </div>
      {title && (
        <h3
          style={{
            fontSize: '24px',
            fontWeight: 'var(--ag-weight-semibold)',
            color: 'var(--ag-text)',
            margin: '0 0 12px',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          style={{
            fontSize: '17px',
            color: 'var(--ag-text-muted)',
            margin: 0,
            maxWidth: 420,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}
    </motion.div>
  );
}
