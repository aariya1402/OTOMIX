import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const uiNodeModules = fileURLToPath(new URL('../packages/ui/node_modules/', import.meta.url));
const coreTimelineEntry = fileURLToPath(new URL('../packages/core/src/grid/t-of-i.ts', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [
      {
        find: /^@otomix\/core$/,
        replacement: coreTimelineEntry,
      },
      {
        find: /^react-dom\/client$/,
        replacement: `${uiNodeModules}react-dom/client.js`,
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: `${uiNodeModules}react/jsx-runtime.js`,
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: `${uiNodeModules}react/jsx-dev-runtime.js`,
      },
      {
        find: /^react$/,
        replacement: `${uiNodeModules}react/index.js`,
      },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
