# Plan: make it work offline

**Status:** not started.
**Effort:** S · **Risk:** low — with one cache-invalidation trap worth respecting.

## Why

Root `AGENTS.md` now requires it: a web project that doesn't handle data ships a
service worker. This one qualifies with nothing to weigh up — it is a canvas, a
few KB of JS and no server state whatsoever. `dist/` is currently
`index.html` + one ~5 KB bundle. There is no reason it shouldn't run on a plane.

## The pattern

A plain generated `sw.js`, **not** VitePWA or Workbox. Those exist for `pensieve`
and `soliluna`, which sync data and need background updates and an offline write
story; pulling that dependency in here would be more configuration than the app.

`sanremo` is the reference implementation and this project is a strictly simpler
case — copy it rather than inventing:

- `sanremo/scripts/build-sw.ts` walks `dist/` after the bundler, precaches every
  emitted file, and derives the cache name from a SHA of the sorted file list.
- `sanremo/src/main.ts` registers it behind `import.meta.env.PROD`.

`sanremo` also splits core from optional bulk (city photos load best-effort after
install). **This project has no such split** — everything is core. Drop that half
rather than porting it as dead code.

## Steps

1. **Add `scripts/build-sw.ts`**, adapted from sanremo: walk `dist/`, filter out
   `sw.js` itself and `*.map`, fold `/index.html` to `/`, hash the list into the
   cache name, emit `dist/sw.js`. Cache-first, with navigations falling back to
   the cached shell.
2. **Hook it into the build.** `package.json` `build` is currently
   `tsc --noEmit && vite build`; append the generator so it runs on the finished
   `dist/`. `amq flocking check` runs `bun run build`, so CI covers it for free.
3. **Register in `src/index.ts`**, production only:
   ```ts
   if (import.meta.env.PROD && 'serviceWorker' in navigator) {
     window.addEventListener('load', () => {
       void navigator.serviceWorker.register('/sw.js');
     });
   }
   ```
4. **Verify offline for real**: `bun run build`, serve `dist/`, load it, kill the
   network, reload. It must still run. A green build proves nothing here.

## Watch out

- **Never register in dev.** A service worker in `vite dev` serves stale modules
  and you end up debugging the cache instead of the code. The `PROD` guard is the
  whole defence — don't "temporarily" remove it to test, build and serve instead.
- **The cache name must change when any file changes.** That is the entire point
  of hashing the file list. Vite's hashed asset names make this automatic; the
  one file that keeps a stable name is `index.html`, which is exactly why the
  hash covers the *list* and not just individual names.
- **This project deploys to GitHub Pages** under a subpath
  (`amatiasq.github.io/flocking/`), not to a domain root. Scope and the precache
  URLs must respect that base — hardcoding `/` will register a worker scoped to
  the whole `amatiasq.github.io` origin, or fail to. Check what `vite build`
  emits as `base` before writing the paths; sanremo does not have this problem
  and its script assumes a root deploy.
- Keep `sw.js` out of its own precache list.
