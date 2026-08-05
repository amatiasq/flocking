# flocking — AGENTS.md

A boids/flocking simulation: cells drift on a canvas, steer by flocking rules,
collide as solid bodies, and wrap around the edges of a toroidal world. Built
TDD-first (specs in `user-stories/`, run under Vitest). [`README.md`](README.md)
is the intent and the spec; this file is the architecture and the things easy to
break.

The predator/prey simulation is a different project, [`lulas/`](../lulas/).

## Architecture

`src/simulation.ts` is the engine. `simulation(config)` returns
`{ cells, step, render }`:

- **`step()`** advances one tick: `cells.map(x => { cell = cloneCell(x);
  behaviors.forEach(b => b(cell, world)); return cell })`. Behaviors are pure-ish
  `(cell, world) => void` functions that mutate the cell (apply forces, move,
  wrap). They run **in array order per cell** — order matters (see invariants). It
  is a **double buffer**: `cloneCell` deep-copies the three mutable vectors, so the
  frame that went in is never written to.
- **`world.look(cell, radius)`** returns cells within `radius`, excluding it (by
  `id`). Answered by a **quadtree** (`src/spatial.ts`, `@amatiasq/quadtree`)
  rebuilt from the previous frame at the top of every `step()`: a box query of side
  `2*radius`, then a distance filter. ~O(log n + k) instead of O(n) per call.
  **`d` draws the tree's own grid**, which is the only way to see it working.
  Measured — see "What the quadtree is actually worth" below.
- The index's root is **the world**, widened to hold anything that walked past an
  edge before `roundMap` pulled it back (`Quadnode` throws on an entity its root
  does not contain). It used to be the bounding box of the cells, which moves
  every tick: every quadrant line drifts and a cell changes quadrant because a
  DIFFERENT cell moved. Same answers either way — it went unnoticed until the
  overlay drew the grid and it crawled. Callers that pass no world (story 8) still
  get a tree sized to the cells.
- **`render()`** draws each cell as a rotated arc, re-drawing near-edge cells on
  the opposite side so the wrap looks seamless.

A **Cell** (`src/cell.ts`) is `{ id, color, position, velocity, acceleration,
radius, vision }`. Forces accumulate in `acceleration`; `move` integrates it into
`velocity` (capped at `MAX_SPEED`) then `position`, and zeroes it.

`vision` = `radius * DEFAULT_VISION_FACTOR`, **computed once in `createCell` and
never recomputed**. Anything that changes a cell's `radius` after creation has to
set `vision` too or the cell keeps seeing at its old size. That is why the size
slider (`createSizeSlider` in `src/index.ts`) is a **render-only multiplier** and
touches neither: it scales the picture, not the simulation, so no setting of it can
desync the two.

`CellId` is a **branded number** (`number & { __brand }`) — only ever compared and
printed.

All tuning knobs live in `src/CONFIGURATION.ts` (speeds, forces, flocking weights,
collision friction). Vector math is in `src/vector.ts`; everything routes through
`vectorAxis` (apply an op to both `x` and `y`).

### Behaviors (`src/behaviors/`)

| behavior | effect |
| --- | --- |
| `flocking` | alignment + cohesion + separation, summed and applied as one force |
| `move` | integrate acceleration → velocity → position; the mover |
| `solidBody` | push overlapping cells apart + swap velocities (collision) |
| `roundMap` | wrap position around world edges (toroidal) |
| `bounceOnCorners` | reflect velocity at edges (alternative to `roundMap`) |
| `attractor(point)` | steer toward a point (tested; commented out in `index.ts`) |
| `flocking2` | alternate flocking implementation (not wired in) |

`src/index.ts` wires the live sim: `[flocking, move, solidBody, roundMap]`. Space
pauses, the arrows steer the white cell, `d` toggles the debug overlay
(`src/debug.ts`: the quadtree's grid, fps, ms/tick, cell count, average speed).
Every key the simulation uses is `preventDefault`ed in `src/user.ts` — unmodified
only, so `⌘D` still bookmarks — because they are the browser's scrolling keys
first.

The panel is a **separate copy of `lulas/src/debug.ts`**, not shared code: the two
simulations have nothing else in common, and what is worth watching differs —
there is no energy budget here, and average speed is the number that says whether
the flock is flowing or grinding against itself (`solidBody` trades velocity, so a
packed flock runs well under `MAX_SPEED`).

## What the quadtree is actually worth

Measured against `ef656891^` with the same seeded `Math.random`, four behaviours
wired (`flocking, move, solidBody, roundMap`) in a 1440×900 world, ms per tick:

Mixed radii, 5 to 20 — vision 50 to 200:

| cells | full scan | quadtree | |
| --- | --- | --- | --- |
| 50 | 0.17 | 0.11 | ×1.6 |
| 250 | 3.08 | 0.76 | ×4.0 |
| 1000 | 45.5 | 8.05 | ×5.6 |
| 3000 | 394 | 62.4 | ×6.3 |

Every cell at `DEFAULT_RADIUS` — vision 50, a third of the width of the first
table's fattest cells:

| cells | full scan | quadtree | |
| --- | --- | --- | --- |
| 50 | 0.15 | 0.11 | ×1.4 |
| 250 | 2.90 | 0.47 | ×6.2 |
| 1000 | 39.3 | 3.25 | ×12.1 |
| 3000 | 349 | 16.4 | ×21.3 |

**The payoff is set by `DEFAULT_VISION_FACTOR`, not by the cell count.** Vision is
`radius * 10`, so a fat cell asks for a box 400px wide in a 1440px world — a
sixth of the map — and a broad phase that hands back a sixth of the flock has
little left to prune. Halve the vision and the same tree is twice as good. This
is why the win here (×6) is nothing like `lulas`'s (×33) with the same library:
there the vision ranges are small against the world.

Two things the comparison had to control for, and one it cannot:

- The double buffer landed in the same commit, so `ef656891^` is measured with
  its aliasing bug. The middle column above is the **current** code with `look`
  swapped back to a full scan — same simulation, only the index removed. Cloning
  three vectors per cell per tick costs nothing measurable (0.15 vs 0.15 at 50
  cells, 372 vs 349 at 3000, inside the noise).
- The flock is stepped 10 ticks before the clock starts. A scattered flock is not
  the interesting case: cells clump, and a clump is what a tree either handles or
  does not.
- Final positions differ in the last decimals between the two, and that is
  expected: the tree returns neighbours in tree order and the scan in array
  order, so the force sums round differently and a chaotic system walks away from
  itself. **The sets are identical** — that is what user story 8 proves, over
  seeded random layouts.

## Easy to break

1. **`step()` does not touch the frame it was given.** `cloneCell` deep-copies
   `position`/`velocity`/`acceleration`, so behaviours that write a vector in place
   (`applyForce` does `acceleration.x += …`) only write to their own copy. The
   quadtree depends on this: it freezes the previous frame, so a behaviour
   scribbling on that frame would make the index disagree with the cells it indexed.
   **A spec asserts it** (user story 8); don't "optimise" the clone away. It also
   means a test cannot read its result off the cell it passed in — read `sut.cells`.

2. **Behavior order is the physics.** Force-appliers (`flocking`, `attractor`,
   `solidBody`) run before `move` (which consumes acceleration), and
   `roundMap`/`bounceOnCorners` run after `move` (they correct the new position).
   Reordering silently changes behaviour.

3. **`solidBody` resolves only the cell it was given.** It reads neighbours from
   `look()` — previous-frame cells, which every other cell is still reading this pass
   — and must never write to one. Each member of a pair pushes *itself* away by
   **half** the overlap and adopts the other's previous velocity damped; the pair
   ends up exactly touching, in either order. Two specs in user story 5 hold the
   line: the neighbour is untouched, and a pair resolves the same whichever member is
   stepped first. A cell overlapping *two* others still adopts the velocity of
   whichever it looked at last — order-dependent, and out of scope.

4. **`look()` does not wrap.** The quadtree is queried with one box, so a cell by an
   edge does not see its neighbours across the seam, and the flock thins at the
   borders. `lulas/src/spatial.ts` shows the fix: split the query at the seams and
   ask up to four boxes.

5. **The spatial index is a snapshot.** Rebuilt at the top of `step()` and never
   updated during the pass. Anything that moves a cell mid-pass is invisible to
   `look()` until the next tick — the double buffer's promise, not a defect. Don't
   add an incremental update without re-reading user story 8.

## The test harness (`test/index.ts`)

Specs live in `user-stories/*.test.ts` and import `test` from `test/index.ts`,
**not** from Vitest. That wrapper is a thin shim over Vitest's global `test`, kept
for the **table-driven** signature `test(msg, rows[], run)`, which Vitest has no
equivalent for. `setFilename()` is a no-op and `isJestTesting` is a constant `true`,
so specs need no editing.

Vitest is the only runner; `src/index.ts` just starts the sim. Don't add
browser-side test running.

## Toolchain

**Bun + Vite + Vitest + TypeScript** (`bun.lock`; never npm).
`amq flocking dev|test|build|check` (`check` mirrors `.github/workflows/ci.yml`).
`build` is `tsc --noEmit && vite build`.

- **This project joins the `mono/npm` workspace** (`"workspaces": ["../npm/*"]`) to
  depend on `@amatiasq/quadtree` and `@amatiasq/geometry` as `workspace:*`. The
  standalone repo has neither, so `amq mono push-subtree` strips `workspaces` and
  pins the published versions on the way out — **the libs must be published before
  the mirror runs**, or `bun install` there 404s. `file:../npm/quadtree` is not an
  option: it cannot resolve a lib's own `workspace:*` deps from outside the
  workspace.
- **`assert` is a local shim** (`test/assert.ts`), aliased in `vite.config.ts`. Do
  **not** add the npm `assert` package — its polyfill pulls in `process`, which is
  undefined in the browser bundle and crashes every test on load.
- **`__dirname`/`__filename`** come from Vite `define` (empty strings) + `env.d.ts`
  ambient decls; the harness only uses them to derive a spec's display label, so
  empty is fine.
- **`jest-canvas-mock`** wants a `jest` global; `test/setup.ts` aliases it to `vi`
  before importing it. Vitest env is `jsdom`.

## Offline

`amq/amq-flocking-build-sw` walks `dist/` after `vite build` and emits a `sw.js`
that precaches everything, with the cache name hashed from the file list **and
their contents** — `index.html` keeps a stable name, so a list-only hash would not
change when only the HTML did. Chained into `bun run build`; `src/index.ts`
registers it behind `import.meta.env.PROD`. Never register in dev: a worker there
serves stale modules and you debug the cache instead of the code.

**Every URL in it is relative to the worker's scope**, resolved at runtime against
`self.registration.scope`, because the site is published under a subpath
(`amatiasq.github.io/flocking/`) — which is also why `vite.config.ts` sets
`base: './'`. Absolute `/asset` paths would point at the origin root and cache
nothing. For the same reason the registration is `'./sw.js'`, relative to the page,
not to `import.meta.url`, which resolves inside `assets/`.

## Deployment

`.github/workflows/ci.yml` builds and deploys to GitHub Pages. It runs in the
mirrored standalone repo, so edits made directly there are overwritten by the next
sync from mono.
