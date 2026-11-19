// P01-T01-S02-M01 (coverage threshold traceability)
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    poolOptions: {
      threads: { execArgv: ['--expose-gc'] },
      forks: { execArgv: ['--expose-gc'] }
    },
    benchmark: { include: ['bench/**/*.bench.ts'] },
    include: [
      'bench/**/*.spec.ts','tools/test/**/*.spec.ts', 'packages/**/test/**/*.spec.ts', 'scripts/test/**/*.spec.ts', 'tools/rt-audit/**/*.spec.ts', 'tools/eslint-rules/**/*.spec.ts'],
    environment: 'node',
    hookTimeout: 300000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        'packages/core/src/**/*.ts': {
          branches: 90,
        },
        'packages/access/src/**/*.ts': {
          branches: 100,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

