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
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.mjs'],
  },
});
