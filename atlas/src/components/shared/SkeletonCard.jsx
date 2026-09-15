export default function SkeletonCard({ count = 1, variant = 'card' }) {
  const base = (
    <div
      className="rounded-xl border p-5 space-y-3"
      style={{ background: 'var(--ag-surface)', borderColor: 'var(--ag-border)' }}
    >
      <div className="h-4 rounded animate-pulse" style={{ width: '60%', background: 'var(--ag-border-strong)' }} />
      <div className="h-3 rounded animate-pulse" style={{ width: '90%', background: 'var(--ag-border)' }} />
      <div className="h-3 rounded animate-pulse" style={{ width: '40%', background: 'var(--ag-border)' }} />
      <div className="flex gap-2 pt-2">
        <div className="h-5 w-12 rounded-full animate-pulse" style={{ background: 'var(--ag-border)' }} />
        <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: 'var(--ag-border)' }} />
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
