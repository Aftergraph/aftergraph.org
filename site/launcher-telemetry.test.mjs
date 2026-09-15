import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./launcher-app.js', import.meta.url), 'utf8');
const workerBuilder = fs.readFileSync(new URL('./build-worker.cjs', import.meta.url), 'utf8');

test('launcher telemetry schema excludes raw query and URL fields', () => {
  const fieldMatch = workerBuilder.match(/const TELEMETRY_FIELDS = new Set\(\[([^\]]+)\]\)/);
  assert.ok(fieldMatch, 'telemetry field allow-list must exist');
  assert.doesNotMatch(fieldMatch[1], /query|search_text|url|href/i);
  for (const field of ['event', 'item_id', 'intent', 'status', 'latency_bucket', 'result_bucket']) {
    assert.match(fieldMatch[1], new RegExp(`['"]${field}['"]`));
  }
});

test('launcher client emits only bounded telemetry dimensions', () => {
  assert.match(app, /event:'zero_result',intent,result_bucket:'0'/);
  assert.match(app, /event:'item_open',item_id:item\.rememberId\|\|item\.id/);
  assert.match(app, /event:'destination_probe',item_id:item\.id,status,latency_bucket:/);
  assert.doesNotMatch(app, /telemetry\(\{[^}]*query\s*:/s);
  assert.doesNotMatch(app, /telemetry\(\{[^}]*url\s*:/s);
});
