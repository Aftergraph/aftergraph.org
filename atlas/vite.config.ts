import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Scoped Atlas build: compiles to immutable assets served by the existing
// Cloudflare Worker at /atlas. Nothing else in aftergraph.org is bundled.
export default defineConfig({
  plugins: [react()],
  base: '/atlas/',
  build: {
    outDir: '../site/atlas',
    // Wipe stale hashed bundles every build. projection.json is NOT build output:
    // it lives at site/atlas-projection.json and is copied in by build-worker.cjs.
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Function form: split by real package path (robust against deep imports
        // such as elkjs/lib/elk.bundled.js). Stable vendor hashes across deploys.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const segs = id.split(/[\\/]/);
          const nm = segs.lastIndexOf('node_modules');
          const first = segs[nm + 1] || '';
          const pkg = first.startsWith('@') ? `${first}/${segs[nm + 2] || ''}` : first;
          if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') return 'vendor-react';
          if (pkg === 'reactflow' || pkg.startsWith('@reactflow/') || pkg === 'zustand' || pkg === 'd3-dag') return 'vendor-flow';
          if (pkg === 'elkjs') return 'vendor-elk';
          if (pkg === 'd3' || pkg.startsWith('d3-') || pkg === 'internmap' || pkg === 'delaunator' || pkg === 'robust-predicates') return 'vendor-d3';
          return 'vendor-lib';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.mjs'],
  },
});
