import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

describe('Atlas initial bundle boundaries', () => {
  it('loads ELK only when graph layout is requested', () => {
    expect(app).not.toMatch(/import\s+ELK\s+from\s+['"]elkjs/);
    expect(app).toMatch(/import\(['"]elkjs\/lib\/elk\.bundled\.js['"]\)/);
    expect(app).toMatch(/const elk = await getElk\(\)/);
  });
});
