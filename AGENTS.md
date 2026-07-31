# flocking — AGENTS.md

A boids/flocking simulation: cells drift on a canvas, steer by flocking rules,
collide as solid bodies, and wrap around the edges of a toroidal world. Built
TDD-first (specs in `user-stories/`, run under Vitest). Read
[`README.md`](README.md) for intent and the spec; this file is the architecture
and the things easy to break.

**The project was renamed from `lulas` to `flocking`.** The old name belonged to
a different, older simulation — cells that hunt and eat each other — which now
owns it again. Inside the code the rename went further than the folder: the
engine module is `src/simulation.ts` exporting `simulation()`, and its config
type is `SimulationConfig` (was `src/lulas.ts` / `lulas()` / `LulasConfig`).
`src/behaviors/flocking.ts` already existed, which is why the engine did not
take the `flocking` name.

## Architecture

`src/simulation.ts` is the engine. `simulation(config)` returns `{ cells, step, render }`:

- **`step()`** advances one tick: `cells.map(x => { cell = {...x}; behaviors
  .forEach(b => b(cell, world)); return cell })`. Behaviors are pure-ish
  functions `(cell, world) => void` that mutate the cell (apply forces, move,
  wrap). They run **in array order per cell** — order matters (see invariants).
- **`world.look(cell, radius)`** returns cells within `radius` of `cell`,
  excluding it (by `id` — see invariant 1). Reads the previous-frame `cells`
  array. O(n²); see [`.agents/plans/quadtree.md`](.agents/plans/quadtree.md).
- **`render()`** draws each cell as a rotated arc, re-drawing near-edge cells on
  the opposite side so the wrap looks seamless.

A **Cell** (`src/cell.ts`) is `{ id, color, position, velocity, acceleration,
radius, vision }`. Forces accumulate in `acceleration`; `move` integrates it
into `velocity` (capped at `MAX_SPEED`) then `position`, and zeroes it. `vision`
= `radius * DEFAULT_VISION_FACTOR` — the flocking/collision look radius.

All the tuning knobs live in `src/CONFIGURATION.ts` (speeds, forces, flocking
weights, collision friction). Vector math is in `src/vector.ts`; everything
routes through `vectorAxis` (apply an op to both `x` and `y`).

### Behaviors (`src/behaviors/`)

| behavior | effect |
| --- | --- |
| `flocking` | alignment + cohesion + separation, summed and applied as one force |
| `move` | integrate acceleration → velocity → position; the mover |
| `solidBody` | push overlapping cells apart + swap velocities (collision) |
| `roundMap` | wrap position around world edges (toroidal) |
| `bounceOnCorners` | reflect velocity at edges (alternative to `roundMap`) |
| `attractor(point)` | steer toward a point (exists + tested; commented out in `index.ts`) |
| `flocking2` | alternate flocking implementation (not wired in) |

`src/index.ts` wires the live sim: `[flocking, move, solidBody, roundMap]`.
Space pauses. It runs the test suite first via `runTests()`.

## Easy to break

1. **`step()` shallow-copies cells (`{...x}`), so nested vectors are shared.**
   `position`/`velocity`/`acceleration` are the *same objects* on the old and
   new cell. Behaviors that mutate a vector in place (`applyForce` does
   `acceleration.x += …`; `solidBody` writes both cells' positions) therefore
   also mutate the previous frame's cell. Known bug, fix planned —
   [`.agents/plans/import-fixes.md`](.agents/plans/import-fixes.md) #1 (move to
   a real double-buffer). Don't deep-copy piecemeal before reading that.

2. **Behavior order is the physics.** Force-appliers (`flocking`, `attractor`,
   `solidBody`) must run before `move` (which consumes acceleration), and
   `roundMap`/`bounceOnCorners` must run after `move` (they correct the new
   position). Reordering silently changes behaviour.

3. **`solidBody` double-counts collisions.** Runs per-cell but mutates both
   members of a pair, so each pair resolves twice and non-deterministically.
   Fix planned — `import-fixes.md` #3.

## The test harness (`test/index.ts`)

Specs live in `user-stories/*.test.ts` and import `test` from `test/index.ts`,
**not** from Vitest. That wrapper is a thin shim over Vitest's global `test`,
kept only for the **table-driven** signature `test(msg, rows[], run)` (Vitest
has no native equivalent). `setFilename()` is a no-op kept so specs don't need
editing; `isJestTesting` is a constant `true`.

Historically the same harness also ran the specs *in the browser* on page load
(painting the body green/red) — the "the app is the test suite" gimmick. That
was removed: Vitest is the only runner now, and `src/index.ts` just starts the
sim. Don't reintroduce browser-side test running.

## Toolchain — landmines from the webpack→Vite migration

Runs on **Bun + Vite 8 + Vitest 4 + TypeScript 7** (`bun.lock`; never npm).
`amq flocking dev|test|build|check` (`check` mirrors `.github/workflows/ci.yml`).

- **`assert` is a local shim** (`test/assert.ts`), aliased in `vite.config.ts`.
  Do **not** re-add the npm `assert` package — its polyfill pulls in `process`,
  which is undefined in the browser bundle and crashes every test on load.
- **`__dirname`/`__filename`** come from Vite `define` (empty strings) +
  `env.d.ts` ambient decls — a webpack `node`-shim relic the harness uses only
  to derive a spec's display label. Empty is fine.
- **`jest-canvas-mock`** wants a `jest` global; `test/setup.ts` aliases it to
  `vi` before importing it. Vitest env is `jsdom`.
- `build` is `tsc --noEmit && vite build` — typecheck then bundle.

## Deployment

`.github/workflows/ci.yml` builds and deploys to GitHub Pages. It is the
repository's own CI — the source of truth for this project lives upstream and is
replicated here, so edits made directly in this repo are overwritten on the next
sync.
