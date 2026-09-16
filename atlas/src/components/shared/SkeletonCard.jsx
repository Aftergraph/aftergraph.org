export default function SkeletonCard({ count = 1, variant = 'card' }) {
  const base = (
    <div
      className="rounded-2xl border p-8 space-y-4"
      style={{
        background: 'var(--ag-canvas-raised)',
        borderColor: 'var(--ag-border)',
        boxShadow: 'var(--ag-shadow-raised)',
      }}
    >
      <div className="h-5 rounded animate-pulse" style={{ width: '55%', background: 'var(--ag-border-strong)' }} />
      <div className="h-4 rounded animate-pulse" style={{ width: '85%', background: 'var(--ag-border)' }} />
      <div className="h-4 rounded animate-pulse" style={{ width: '40%', background: 'var(--ag-border)' }} />
      <div className="flex gap-3 pt-3">
        <div className="h-6 w-14 rounded-full animate-pulse" style={{ background: 'var(--ag-border)' }} />
        <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: 'var(--ag-border)' }} />
      </div>
    </div>
  );

  if (count <= 1) return base;
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i}>{base}</div>
      ))}
    </>
  );
}
