import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/studio-production-deploy.yml',import.meta.url),'utf8');

test('Studio production smoke builds path URLs with explicit PowerShell interpolation',()=>{
  assert.match(workflow,/Invoke-WebRequest -Uri "\$\{base\}\$\{path\}\?verify=\$nonce"/);
  assert.doesNotMatch(workflow,/Invoke-WebRequest -Uri "\$base\$path\?verify=\$nonce"/);
});
