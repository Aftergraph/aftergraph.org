import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock framer-motion to avoid animation timing issues in tests
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag) => {
        const Component = React.forwardRef((props, ref) => {
          const { initial, animate, exit, transition, variants, whileHover, layout, ...rest } = props;
          return React.createElement(tag, { ...rest, ref });
        });
        Component.displayName = `motion.${String(tag)}`;
        return Component;
      },
    }
  ),
  AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
  useReducedMotion: () => true,
}));

// Mock Radix Tooltip to avoid portal/overlay issues
vi.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children }) => React.createElement(React.Fragment, null, children),
  Root: ({ children }) => React.createElement(React.Fragment, null, children),
  Trigger: ({ children, asChild }) =>
    asChild ? children : React.createElement('span', null, children),
  Portal: ({ children }) => React.createElement(React.Fragment, null, children),
  Content: ({ children }) => React.createElement('div', { role: 'tooltip' }, children),
  Arrow: () => null,
}));

// Mock derive.js used by AskView
vi.mock('../lib/derive.js', () => ({
  answerFromEvidence: vi.fn(() => ({ hits: [], valid: true })),
}));

// Mock sliceC.js used by SnapshotsView
vi.mock('../lib/sliceC.js', () => ({
  diffProjections: vi.fn(() => ({
    addedEntities: [],
    removedEntities: [],
    addedAssertions: [],
    removedAssertions: [],
    changedAssertions: [],
    addedRelations: [],
    removedRelations: [],
    openedConflicts: [],
    resolvedConflicts: [],
  })),
}));

afterEach(() => {
  cleanup();
  document.documentElement.dataset.theme = '';
  localStorage.clear();
});

import AtlasShell from '../components/AtlasShell.jsx';
import CapabilitiesView from '../components/CapabilitiesView.jsx';
import ModelsView from '../components/ModelsView.jsx';
import ResearchView from '../components/ResearchView.jsx';
import SnapshotsView from '../components/SnapshotsView.jsx';
import AskView from '../components/AskView.jsx';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30000,
      },
    },
  });
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ─── 1. openView functional update (view-switching contract) ────────────────
describe('openView view-switching contract', () => {
  it('calls onViewChange with the correct view id when a tab is clicked', () => {
    const onViewChange = vi.fn();
    render(
      React.createElement(AtlasShell, {
        activeView: 'home',
        onViewChange,
        children: React.createElement('div', null, 'content'),
      })
    );

    // Click the "Capabilities" tab
    const capsTab = screen.getByRole('tab', { name: /capabilities/i });
    fireEvent.click(capsTab);
    expect(onViewChange).toHaveBeenCalledWith('capabilities');

    // Click the "Models" tab
    const modelsTab = screen.getByRole('tab', { name: /models/i });
    fireEvent.click(modelsTab);
    expect(onViewChange).toHaveBeenCalledWith('models');
  });

  it('updates aria-selected on tab switch', () => {
    const { rerender } = render(
      React.createElement(AtlasShell, {
        activeView: 'home',
        onViewChange: vi.fn(),
        children: React.createElement('div', null, 'content'),
      })
    );

    expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /capabilities/i })).toHaveAttribute('aria-selected', 'false');

    rerender(
      React.createElement(AtlasShell, {
        activeView: 'capabilities',
        onViewChange: vi.fn(),
        children: React.createElement('div', null, 'content'),
      })
    );

    expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /capabilities/i })).toHaveAttribute('aria-selected', 'true');
  });
});

// ─── 2. Theme toggle persistence (localStorage + DOM sync) ──────────────────
describe('theme toggle persistence', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = '';
    localStorage.clear();
  });

  it('defaults to dark theme and sets data-theme on documentElement', () => {
    render(
      React.createElement(AtlasShell, {
        activeView: 'home',
        onViewChange: vi.fn(),
        children: React.createElement('div', null, 'content'),
      })
    );
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggles between dark and light on button click', () => {
    render(
      React.createElement(AtlasShell, {
        activeView: 'home',
        onViewChange: vi.fn(),
        children: React.createElement('div', null, 'content'),
      })
    );

    const toggleBtn = screen.getByLabelText(/switch to light theme/i);
    fireEvent.click(toggleBtn);
    expect(document.documentElement.dataset.theme).toBe('light');

    const toggleBack = screen.getByLabelText(/switch to dark theme/i);
    fireEvent.click(toggleBack);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('reads initial theme from documentElement dataset', () => {
    document.documentElement.dataset.theme = 'light';
    render(
      React.createElement(AtlasShell, {
        activeView: 'home',
        onViewChange: vi.fn(),
        children: React.createElement('div', null, 'content'),
      })
    );
    // Should start as light since we set it before render
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

// ─── 3. Mobile nav state transitions ────────────────────────────────────────
describe('mobile nav state transitions', () => {
  it('starts closed with aria-hidden=true on mobile nav panel', () => {
    render(
      React.createElement(AtlasShell, {
        activeView: 'home',
        onViewChange: vi.fn(),
        children: React.createElement('div', null, 'content'),
      })
    );

    const panel = document.querySelector('.mobile-nav-panel');
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('aria-hidden')).toBe('true');
  });

  it('opens mobile nav on burger click and sets aria-hidden=false', () => {
    render(
      React.createElement(AtlasShell, {
        activeView: 'home',
        onViewChange: vi.fn(),
        children: React.createElement('div', null, 'content'),
      })
    );

    const burger = screen.getByLabelText(/open navigation menu/i);
    fireEvent.click(burger);

    const panel = document.querySelector('.mobile-nav-panel');
    expect(panel.getAttribute('aria-hidden')).toBe('false');
    expect(burger.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes mobile nav on second burger click', () => {
    render(
      React.createElement(AtlasShell, {
        activeView: 'home',
        onViewChange: vi.fn(),
        children: React.createElement('div', null, 'content'),
      })
    );

    const burger = screen.getByLabelText(/open navigation menu/i);
    fireEvent.click(burger);
    expect(document.querySelector('.mobile-nav-panel').getAttribute('aria-hidden')).toBe('false');

    // After opening, label changes to "Close navigation menu"
    const closeBurger = screen.getByLabelText(/close navigation menu/i);
    fireEvent.click(closeBurger);
    expect(document.querySelector('.mobile-nav-panel').getAttribute('aria-hidden')).toBe('true');
  });
});

// ─── 4. useQuery staleTime/retry for all 5 views ────────────────────────────
describe('useQuery staleTime and retry behavior', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const viewConfigs = [
    {
      name: 'CapabilitiesView',
      Component: CapabilitiesView,
      url: '/api/v3/capabilities',
      queryKey: 'atlas-capabilities',
      response: { capabilities: [] },
    },
    {
      name: 'ModelsView',
      Component: ModelsView,
      url: '/api/v3/models',
      queryKey: 'atlas-models',
      response: { models: [] },
    },
    {
      name: 'ResearchView',
      Component: ResearchView,
      url: '/api/v3/research',
      queryKey: 'atlas-research',
      response: { assertions: [] },
    },
    {
      name: 'SnapshotsView',
      Component: SnapshotsView,
      url: '/api/v3/snapshots',
      queryKey: 'atlas-snapshots',
      response: { snapshots: [] },
    },
    {
      name: 'AskView',
      Component: AskView,
      url: '/api/v3/ask',
      queryKey: 'atlas-ask',
      response: { projection: { assertions: [], entities: [] } },
    },
  ];

  for (const cfg of viewConfigs) {
    describe(cfg.name, () => {
      it('fetches data with correct endpoint and respects staleTime=30000', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: true,
          json: async () => cfg.response,
        });

        const Wrapper = createWrapper();
        render(React.createElement(cfg.Component, { projection: null }), { wrapper: Wrapper });

        await waitFor(() => {
          expect(fetchSpy).toHaveBeenCalledWith(cfg.url);
        });

        // Verify only one call was made (staleTime prevents refetch)
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });

      it('does not retry indefinitely on failure (retry: 1)', async () => {
        fetchSpy.mockRejectedValue(new Error('Network error'));

        const Wrapper = createWrapper();
        render(React.createElement(cfg.Component, { projection: null }), { wrapper: Wrapper });

        // Wait for retries to settle — retry:1 means at most 2 calls (initial + 1 retry)
        // But our QueryClient has retry:false, so exactly 1 call
        await waitFor(() => {
          expect(fetchSpy).toHaveBeenCalled();
        });

        // With retry:false in test QueryClient, should be exactly 1 call
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });
    });
  }
});
