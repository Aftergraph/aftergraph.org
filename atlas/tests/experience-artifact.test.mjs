import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { deriveExperienceView } from '../src/lib/experience.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const projection = JSON.parse(fs.readFileSync(path.join(root, 'site/atlas-projection.json'), 'utf8'));

describe('tracked public experience artifact', () => {
  it('matches the deterministic projection adapter exactly', () => {
    const file = path.join(root, 'site/atlas-experience.json');
    const actual = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(actual).toEqual(deriveExperienceView(projection));
  });

  it('contains no exact refs for private repositories', () => {
    const privateRepos = new Set(projection.meta.private_repos || []);
    const view = deriveExperienceView(projection);
    for (const entity of view.entities) {
      for (const source of entity.sources || []) {
        if (privateRepos.has(source.repository) || privateRepos.has(source.source)) {
          expect(source.ref).toBeNull();
        }
      }
    }
  });
});
