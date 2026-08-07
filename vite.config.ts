import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Published under a subpath (amatiasq.github.io/flocking/), where Vite's
  // absolute `/assets/…` 404s: the page loads and the bundle silently does not,
  // which reads as a broken simulation rather than a broken deploy.
  base: './',

  // A local shim: the npm `assert` polyfill needs `process` and throws in the
  // browser bundle.
  resolve: {
    alias: {
      assert: fileURLToPath(new URL('./test/assert.ts', import.meta.url)),
    },
  },
  // The specs pass these to `setFilename`, which is a no-op, so empty is fine.
  define: {
    __dirname: '""',
    __filename: '""',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['user-stories/**/*.test.ts'],
  },
});
