import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const topology = readFileSync(resolve(__dirname, '../src/components/TopologyView.jsx'), 'utf8');

describe('Atlas initial bundle boundaries', () => {
  it('loads ELK only when graph layout is requested', () => {
    // ELK should NOT be in main App.jsx (lazy loaded)
    const app = readFileSync(resolve(__dirname, '../src/App.jsx'), 'utf8');
    expect(app).not.toMatch(/import\s+ELK\s+from\s+['"]elkjs/);
    // ELK IS in TopologyView.jsx (lazy component)
    expect(topology).toMatch(/elkjs/);
  });
});
