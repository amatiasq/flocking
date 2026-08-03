import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Emit relative asset paths. This is published to GitHub Pages under a
  // SUBPATH (amatiasq.github.io/flocking/), where Vite's default absolute
  // `/assets/...` resolves against the domain root and 404s — the page loads and
  // the bundle silently does not, which looks like a broken simulation rather
  // than a broken deploy. `./` works from any prefix, including file://.
  base: './',

  // Point `assert` at a tiny local shim. The npm polyfill needs `process`/`util`
  // and throws in the browser bundle; the shim works in both browser and node.
  resolve: {
    alias: {
      assert: fileURLToPath(new URL('./test/assert.ts', import.meta.url)),
    },
  },
  // Test files call `setFilename(__dirname, __filename)`, shims webpack used to
  // inject via `node: { __dirname, __filename }`. They only feed a display label
  // for console grouping, so empty strings are fine in the browser.
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
