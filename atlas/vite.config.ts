import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Scoped Atlas build: compiles to immutable assets served by the existing
// Cloudflare Worker at /atlas. Nothing else in aftergraph.org is bundled.
export default defineConfig({
  plugins: [react()],
  base: '/atlas/',
  build: {
    outDir: '../site/atlas',
    emptyOutDir: false,
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
