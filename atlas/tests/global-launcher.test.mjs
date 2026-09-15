import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');

describe('Atlas global launcher entry', () => {
  it('links to the canonical same-origin Aftergraph Launcher', () => {
    expect(app).toMatch(/href="\/launch"/);
    expect(app).toMatch(/aria-label="Open Aftergraph Launcher"/);
    expect(app).toMatch(/>Launcher<\/a>/);
  });

  it('uses the shared header layout instead of replacing Atlas navigation', () => {
    expect(app).toMatch(/className="atlas-launcher-link"/);
    expect(css).toMatch(/\.atlas-launcher-link/);
    expect(app).toMatch(/<nav className="views" aria-label="Views">/);
  });
});
