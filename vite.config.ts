import { fileURLToPath } from 'node:url';
import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Published under a subpath (amatiasq.github.io/flocking/), where Vite's
  // absolute `/assets/…` 404s: the page loads and the bundle silently does not,
  // which reads as a broken simulation rather than a broken deploy.
  base: './',

  // A local shim: the npm `assert` polyfill needs `process` and throws in the
  // browser bundle.
  resolve: {
    // `bun` first, and load-bearing. The `exports` of `@amatiasq/geometry` and
    // `@amatiasq/quadtree` point at `./src/index.ts` under the `bun` condition
    // and at `./dist/index.js` otherwise, and `npm/*/dist/` is gitignored: without
    // this, vite and vitest ask for a `dist/` that only exists on the machine
    // that built it once. Green on the laptop, red anywhere else. Same reason as
    // `lulas/`, where CI caught it.
    conditions: ['bun', ...defaultClientConditions],
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
