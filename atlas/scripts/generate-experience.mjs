import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveExperienceView } from '../src/lib/experience.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const input = path.join(root, 'site/atlas-projection.json');
const output = path.join(root, 'site/atlas-experience.json');
const projection = JSON.parse(fs.readFileSync(input, 'utf8'));
const rendered = `${JSON.stringify(deriveExperienceView(projection), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '';
  if (current !== rendered) {
    console.error('EXPERIENCE-FAIL: site/atlas-experience.json is stale; run node atlas/scripts/generate-experience.mjs');
    process.exit(1);
  }
  console.log('EXPERIENCE-CHECK PASS: site/atlas-experience.json is current');
} else {
  fs.writeFileSync(output, rendered);
  console.log(`wrote ${path.relative(root, output)} (${Buffer.byteLength(rendered)} bytes)`);
}
