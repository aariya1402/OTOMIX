import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'default',
      include: ['packages/**/test/**/*.spec.ts', 'tools/test/**/*.spec.ts', 'scripts/test/**/*.spec.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/p01-it.spec.ts',
        '**/x-p01-*.spec.ts',
        '**/migrate.spec.ts',
        '**/rls.spec.ts',
        '**/with-tenant.spec.ts',
        '**/idem-store.spec.ts',
        '**/global-features.spec.ts',
        '**/rt-audit/test/audit.spec.ts',
        '**/token.refresh.spec.ts',
      ]
    }
  },
  {
    // NOTE: no 'extends' here on purpose. When extending, Vitest concatenates
    // the parent's `include` array with the child's, which would cause this
    // project to run every test in the repo. We want it isolated.
    test: {
      name: 'p01-integration',
      include: [
        'packages/db/test/migrate.spec.ts',
        'packages/db/test/rls.spec.ts',
        'packages/db/test/with-tenant.spec.ts',
        'packages/gateway/test/idem-store.spec.ts',
        'packages/db/test/global-features.spec.ts',
        'tools/rt-audit/test/audit.spec.ts',
        'packages/access/test/token.refresh.spec.ts',
        'packages/contracts/test/p01-it.spec.ts',
        'packages/contracts/test/x-p01-*.spec.ts'
      ],
      environment: 'node',
      testTimeout: 300000
    }
  }
])