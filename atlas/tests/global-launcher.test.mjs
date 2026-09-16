import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(resolve(__dirname, '../src/components/AtlasShell.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../src/app.css'), 'utf8');

describe('Atlas global launcher entry', () => {
  it('has a Launch nav item pointing to /launch', () => {
    // NAV_ITEMS array contains { label: 'Launch', href: '/launch' }
    expect(shell).toMatch(/['"]Launch['"]/);
    expect(shell).toMatch(/['"]\/launch['"]/);
  });

  it('renders navigation with proper aria labels', () => {
    expect(shell).toMatch(/aria-label/);
    expect(shell).toMatch(/nav/i);
  });
});
