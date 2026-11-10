import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'default',
      include: ['packages/**/test/**/*.spec.ts', 'tools/test/**/*.spec.ts', 'scripts/test/**/*.spec.ts'],
      exclude: ['**/p01-it.spec.ts', '**/x-p01-*.spec.ts', '**/migrate.spec.ts', '**/rls.spec.ts', '**/with-tenant.spec.ts', '**/idem-store.spec.ts']
    }
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'p01-integration',
      include: [
        'packages/db/test/migrate.spec.ts',
        'packages/db/test/rls.spec.ts',
        'packages/db/test/with-tenant.spec.ts',
        'packages/gateway/test/idem-store.spec.ts',
        'packages/contracts/test/p01-it.spec.ts'
      ],
      testTimeout: 300000
    }
  }
])