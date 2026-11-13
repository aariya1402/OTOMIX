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
        '**/rt-audit/test/audit.spec.ts'
      ]
    }
  },
  {
    test: {
      name: 'p01-integration',
      include: [
        'packages/db/test/migrate.spec.ts',
        'packages/db/test/rls.spec.ts',
        'packages/db/test/with-tenant.spec.ts',
        'packages/gateway/test/idem-store.spec.ts',
        'packages/contracts/test/p01-it.spec.ts',
        'packages/contracts/test/x-p01-*.spec.ts'
      ],
      environment: 'node',
      testTimeout: 300000
    }
  },
  {
    test: {
      name: 'p06-integration',
      include: [
        'packages/db/test/migrate.spec.ts',
        'packages/db/test/rls.spec.ts',
        'packages/db/test/with-tenant.spec.ts',
        'packages/db/test/rbac.migration.spec.ts',
        'packages/db/test/rbac.seed.spec.ts',
        'packages/db/test/rbac.roles.seed.spec.ts',
        'packages/db/test/global-features.spec.ts',
        'packages/access/test/audit.spec.ts',
        'packages/access/test/rbac.grant-service.spec.ts',
        'packages/access/test/rbac.cache.spec.ts',
        'packages/access/test/rbac.bootstrap.spec.ts',
        'packages/access/test/rbac.groups.spec.ts',
        'packages/access/test/token.refresh.spec.ts',
        'packages/access/test/token.denylist.spec.ts',
        'packages/access/test/token.revoke-user.spec.ts',
        'packages/gateway/test/idem-store.spec.ts',
        'packages/gateway/test/dsp-propagate.spec.ts',
        'packages/contracts/test/p06-it.spec.ts',
        'packages/contracts/test/x-p05-p06.spec.ts',
        'packages/contracts/test/x-p06-p07.spec.ts',
        'packages/contracts/test/x-p06-p08.spec.ts',
        'packages/contracts/test/x-p06-p09.spec.ts',
        'packages/contracts/test/x-p06-p10.spec.ts',
        'packages/contracts/test/x-p06-p11.spec.ts'
      ],
      environment: 'node',
      testTimeout: 300000
    }
  }
])