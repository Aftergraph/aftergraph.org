import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

// Observational pilot. Deterministic tests only: no agent steps, so no model
// and no API key are needed. Not a required gate (RFC 0001, .github#60).
export default {
  targets: [
    {
      engine: web(),
      app: {
        url: 'http://localhost:8471',
        command: { executable: 'node', args: ['../site/serve-local.cjs', '8471', '../site'] },
        readyUrl: 'http://localhost:8471/index.html',
      },
    },
  ],
} satisfies E2EConfig;
