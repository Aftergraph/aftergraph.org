import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'data', 'launcher-surfaces.json');
const PROJECTION = path.join(ROOT, 'site', 'atlas-projection.json');
const OUTPUT = path.join(ROOT, 'site', 'launcher-registry.json');

const fail = (message) => {
  throw new Error(`launcher registry: ${message}`);
};
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const source = readJson(SOURCE);
const projection = readJson(PROJECTION);

if (source.schema !== 'aftergraph-launcher-surfaces/1.0') fail(`unexpected source schema ${source.schema}`);
if (projection.schema !== 'atlas-projection/0.2') fail(`unexpected Atlas schema ${projection.schema}`);

const assertionsBySubject = new Map();
for (const assertion of projection.assertions || []) {
  if (assertion.truth_plane !== 'CANONICAL') continue;
  const bucket = assertionsBySubject.get(assertion.subject) || [];
  bucket.push(assertion);
  assertionsBySubject.set(assertion.subject, bucket);
}

function canonicalRepo(slug) {
  const subject = `repo:Aftergraph/${slug}`;
  const assertions = assertionsBySubject.get(subject) || [];
  const byPredicate = new Map(assertions.map((item) => [item.predicate, item]));
  const slugAssertion = byPredicate.get('slug');
  if (!slugAssertion || slugAssertion.value !== slug) fail(`unknown canonical repository ${slug}`);
  const required = ['role', 'owns', 'visibility'];
  for (const predicate of required) {
    if (!byPredicate.has(predicate)) fail(`${slug} missing canonical ${predicate}`);
  }
  const sourceAssertion = byPredicate.get('owns') || slugAssertion;
  return {
    subject,
    role: byPredicate.get('role').value,
    description: byPredicate.get('owns').value,
    visibility: byPredicate.get('visibility').value,
    plane: byPredicate.get('plane')?.value ?? null,
    evidence: {
      source: sourceAssertion.provenance?.source || 'Atlas canonical projection',
      ref: sourceAssertion.provenance?.ref || null,
      cut: projection.meta?.evidence_cut || null,
    },
  };
}
const ids = new Set();
const entities = source.entities.map((entry) => {
  if (!entry.id || ids.has(entry.id)) fail(`duplicate or missing entity id ${entry.id || '<empty>'}`);
  ids.add(entry.id);
  if (!entry.name || !entry.url || !entry.icon) fail(`${entry.id} missing presentation fields`);

  let canonical = null;
  if (entry.repo) {
    canonical = canonicalRepo(entry.repo);
    if (canonical.visibility === 'private' && /^https:\/\/github\.com\/Aftergraph\//i.test(entry.url)) {
      fail(`${entry.id} exposes a private repository URL`);
    }
  }
  const description = entry.description || canonical?.description;
  if (!description) fail(`${entry.id} has no public description`);

  return {
    id: entry.id,
    kind: 'entity',
    group: 'Products / Systems',
    name: entry.name,
    description,
    url: entry.url,
    maturity: entry.maturity || null,
    aliases: entry.aliases || [],
    icon: entry.icon,
    repo: entry.repo || null,
    canonical_role: canonical?.role || null,
    canonical_plane: canonical?.plane || null,
    source_visibility: canonical?.visibility || 'public-surface',
    evidence_url: canonical ? `/atlas/?node=${encodeURIComponent(canonical.subject)}&overlay=CANONICAL%2COBSERVED%2CPROPOSED&view=home&lens=SYSTEM` : '/atlas',
    evidence: canonical?.evidence || { source: 'Aftergraph public surface registry', ref: null, cut: projection.meta?.evidence_cut || null },
  };
});

const allowedActionKinds = new Set(['navigate', 'evidence']);
const actions = source.actions.map((entry) => {
  if (!entry.id || ids.has(entry.id)) fail(`duplicate or missing action id ${entry.id || '<empty>'}`);
  ids.add(entry.id);
  if (!allowedActionKinds.has(entry.kind)) fail(`${entry.id} has unsupported action kind ${entry.kind}`);
  if (!entry.name || !entry.description || !entry.url || !entry.icon) fail(`${entry.id} missing action fields`);
  return {
    ...entry,
    group: 'Actions',
  };
});
for (const featured of source.featured_entities || []) {
  if (!entities.some((item) => item.id === featured)) fail(`unknown featured entity ${featured}`);
}
for (const featured of source.featured_actions || []) {
  if (!actions.some((item) => item.id === featured)) fail(`unknown featured action ${featured}`);
}

const output = {
  schema: 'aftergraph-launcher-registry/1.0',
  generated_from: {
    surface_schema: source.schema,
    atlas_schema: projection.schema,
    evidence_cut: projection.meta?.evidence_cut || null,
  },
  featured_entities: source.featured_entities || [],
  featured_actions: source.featured_actions || [],
  entities,
  actions,
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`wrote ${path.relative(ROOT, OUTPUT)} (${entities.length} entities, ${actions.length} actions)`);
