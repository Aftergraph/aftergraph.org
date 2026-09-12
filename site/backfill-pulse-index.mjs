#!/usr/bin/env node
// One-time migration (idempotent): attach the public `pulse` summary to every
// entry of site/atlas-snapshots/index.json, recomputed from the immutable
// snapshot files. Snapshot files are NEVER rewritten — index.json is derived
// data. A repo "change" is an OBSERVED head_sha that differs from the previous
// cut, stamped with the newer cut. Private repos carry no head_sha assertions,
// so they are structurally absent from pulse. Run: node site/backfill-pulse-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.dirname(fileURLToPath(import.meta.url));
const SNAP_DIR = path.join(SITE, 'atlas-snapshots');
const INDEX = path.join(SNAP_DIR, 'index.json');

const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const ordered = [...index].sort((a, b) => (a.evidence_cut < b.evidence_cut ? -1 : 1));

let prevHeads = null;
for (const entry of ordered) {
  const snap = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, entry.file), 'utf8'));
  const heads = new Map();
  for (const a of snap.assertions || []) {
    if (a.predicate === 'head_sha' && a.truth_plane === 'OBSERVED') heads.set(a.subject, String(a.value));
  }
  const activity = [];
  if (prevHeads) {
    for (const [subject, head] of [...heads.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (prevHeads.has(subject) && prevHeads.get(subject) !== head) {
        activity.push({ subject, cuts: [entry.evidence_cut] });
      }
    }
  }
  entry.pulse = { repos: [...heads.keys()].sort(), activity };
  prevHeads = heads;
}

fs.writeFileSync(INDEX, JSON.stringify(index, null, 2) + '\n');
const moved = ordered.reduce((n, e) => n + e.pulse.activity.length, 0);
console.log(`backfilled ${ordered.length} index entries (${moved} head-change events total)`);