import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tools/test/**/*.spec.ts', 'packages/**/test/**/*.spec.ts', 'scripts/test/**/*.spec.ts'],
    environment: 'node',
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

