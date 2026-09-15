import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';

const SITE_NAV = [
  { label: 'AFTERGRAPH.', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Platform', href: '/platform' },
  { label: 'Research', href: '/research' },
  { label: 'Docs', href: '/docs' },
  { label: 'Community', href: '/community' },
  { label: 'Status', href: '/status' },
  { label: 'Launch', href: '/launch' },
];

const ATLAS_VIEWS = [
  { id: 'home', label: 'Overview' },
  { id: 'topology', label: 'Topology' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'models', label: 'Models' },
  { id: 'research', label: 'Research' },
  { id: 'snapshots', label: 'Snapshots' },
  { id: 'ask', label: 'Ask' },
  { id: 'reconciliation', label: 'Conflicts' },
];

export default function AtlasShell({ activeView, onViewChange, children }) {
  const shouldReduceMotion = useReducedMotion();
  const [theme, setTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.dataset.theme || 'dark';
    }
    return 'dark';
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const shellTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.34, ease: [0.16, 1, 0.3, 1] };

  const pageInitial = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };
  const pageAnimate = { opacity: 1, y: 0 };
  const pageExit = shouldReduceMotion ? { opacity: 0, y: 0 } : { opacity: 0, y: -8 };

  return (
    <Tooltip.Provider delayDuration={300}>
      <div
        className="min-h-screen font-sans selection:bg-blue-500/30"
        style={{
          background: 'var(--ag-canvas)',
          color: 'var(--ag-text)',
          fontFamily: 'var(--ag-font-interface)',
        }}
      >
        {/* Top bar */}
        <header
          className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b"
          style={{
            background: 'color-mix(in srgb, var(--ag-canvas) 80%, transparent)',
            borderColor: 'var(--ag-border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center font-bold"
                style={{
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--ag-system), var(--ag-authority))',
                  fontSize: 'var(--ag-type-body-sm)',
                  color: '#fff',
                }}
              >
                A
              </div>
              <span
                className="tracking-tight"
                style={{
                  fontSize: 'var(--ag-type-body)',
                  fontWeight: 'var(--ag-weight-semibold)',
                }}
              >
                Atlas V3
              </span>
            </div>

            {/* Desktop site nav */}
            <nav className="hidden md:flex items-center gap-1">
              {SITE_NAV.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3 py-1.5 no-underline"
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: 'var(--ag-text)',
                    borderRadius: '12px',
                    transition: `color var(--ag-motion-state) var(--ag-ease-state)`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ag-control)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ag-text)'; }}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                className="p-2 cursor-pointer border-none bg-transparent"
                style={{
                  color: 'var(--ag-text-muted)',
                  borderRadius: 'var(--ag-radius-control)',
                  transition: `color var(--ag-motion-state) var(--ag-ease-state)`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ag-text)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ag-text-muted)'; }}
              >
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              {/* Mobile menu toggle — JS-driven */}
              <button
                onClick={() => setMobileNavOpen((v) => !v)}
                className="burger md:hidden cursor-pointer border-none bg-transparent p-1.5"
                aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileNavOpen}
                style={{ borderRadius: '12px' }}
              >
                <span style={{ transform: mobileNavOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
                <span style={{ opacity: mobileNavOpen ? 0 : 1 }} />
                <span style={{ transform: mobileNavOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
              </button>
            </div>
          </div>

          {/* Mobile nav dropdown — JS-driven visibility */}
          <div className="md:hidden border-t backdrop-blur-xl overflow-hidden"
            style={{
              borderColor: 'var(--ag-border)',
              background: 'color-mix(in srgb, var(--ag-canvas) 95%, transparent)',
              maxHeight: mobileNavOpen ? '60vh' : '0',
              transition: 'max-height var(--ag-motion-surface) var(--ag-ease-surface)',
            }}
          >
            <nav className="p-2 space-y-1">
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ag-text-muted)' }}>Site</div>
              {SITE_NAV.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block w-full text-left px-3 py-2.5 no-underline"
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: 'var(--ag-text)',
                    borderRadius: '12px',
                  }}
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-3 px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ag-text-muted)' }}>Atlas</div>
              {ATLAS_VIEWS.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className="w-full text-left px-3 py-2.5 cursor-pointer border-none bg-transparent"
                    style={{
                      fontSize: '16px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--ag-control)' : 'var(--ag-text)',
                      borderRadius: '12px',
                      background: isActive ? 'var(--ag-control-soft)' : 'transparent',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Atlas view tabs */}
        <div
          className="fixed top-14 left-0 right-0 z-30 border-b backdrop-blur-md"
          style={{
            background: 'color-mix(in srgb, var(--ag-canvas) 90%, transparent)',
            borderColor: 'var(--ag-border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {ATLAS_VIEWS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className="px-3 py-2 cursor-pointer border-none bg-transparent whitespace-nowrap"
                  style={{
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--ag-control)' : 'var(--ag-text-muted)',
                    borderBottom: isActive ? '2px solid var(--ag-control)' : '2px solid transparent',
                    transition: `all var(--ag-motion-state) var(--ag-ease-state)`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--ag-text)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--ag-text-muted)';
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content area with page transitions */}
        <main className="pt-28 min-h-screen">
          <motion.div
            initial={pageInitial}
            animate={pageAnimate}
            transition={shellTransition}
            className="max-w-7xl mx-auto px-4 py-6"
          >
            {children}
          </motion.div>
        </main>

        {/* Subtle gradient overlay for depth */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `linear-gradient(to bottom, color-mix(in srgb, var(--ag-system) 2%, transparent), transparent 40%, color-mix(in srgb, var(--ag-authority) 2%, transparent))`,
          }}
        />
      </div>
    </Tooltip.Provider>
  );
}
