import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { adaptGovernanceTopology } from './governance-topology-adapter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_CONFIG = path.join(ROOT, 'data', 'public-topology-source.json');
const OUTPUT = path.join(ROOT, 'site', 'public-repository-catalog.json');
const GOVERNANCE_ROOT = path.resolve(process.argv[2] || path.join(ROOT, 'governance-source'));

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const source = readJson(SOURCE_CONFIG);
let checkedOutRef;
try {
  checkedOutRef = execFileSync('git', ['-C', GOVERNANCE_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  throw new Error('public topology catalog: Governance source checkout is unavailable');
}
if (checkedOutRef !== source.ref) {
  throw new Error('public topology catalog: Governance source checkout does not match the pinned ref');
}

const topologyPath = path.join(GOVERNANCE_ROOT, source.topology_path);
const schemaPath = path.join(GOVERNANCE_ROOT, 'docs', 'platform-topology', '2.0.schema.json');
const orgStateSchemaPath = path.join(GOVERNANCE_ROOT, source.org_state_schema_path);
const topology = readJson(topologyPath);
const topologySchema = readJson(schemaPath);
const orgStateSchema = readJson(orgStateSchemaPath);
const catalog = adaptGovernanceTopology(topology, topologySchema, orgStateSchema, source);

fs.writeFileSync(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`wrote ${path.relative(ROOT, OUTPUT)} (${catalog.repositories.length} public repositories)`);
