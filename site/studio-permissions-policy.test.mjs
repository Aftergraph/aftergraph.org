import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const builder=readFileSync(new URL('./studio-build.cjs',import.meta.url),'utf8');

test('Studio artifact emits a parseable Permissions-Policy opt-out header',()=>{
  assert.match(
    builder,
    /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\), interest-cohort=\(\)/,
  );
  assert.doesNotMatch(builder,/interest-cohort\(\)/);
});
