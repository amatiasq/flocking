# flocking — AGENTS.md

A boids simulation on canvas, built TDD-first: the specs in `user-stories/` are
the spec, and `src/simulation.ts` is the engine. The predator/prey simulation is
a different project, [`lulas/`](../lulas/); they share `@amatiasq/quadtree` and
nothing else.

## Glossary

- **Cell** — a boid. Its `position`, `velocity` and `acceleration` are the only
  mutable state in the simulation: forces accumulate in `acceleration`, `move`
  integrates it into the other two and zeroes it.
- **CellId** — a branded number, so an id cannot be passed where a plain number
  is meant. Only ever compared and printed.
- **vision** — how far a cell sees: `radius * DEFAULT_VISION_FACTOR`. Computed
  **once, in `createCell`**, and never recomputed.
- **Behavior** — `(cell, world) => void`, mutating the cell. A tick is an
  ordered list of them, run per cell.
- **The three classic rules**, summed into one force by `flocking`:
  `alignement` (steer as the neighbours do — note the code's spelling),
  `cohesion` (toward their average position), `separation` (away from the
  closest of them, those inside `FLOCKING_SEPARATION_VISION_LIMIT` of `vision`).
- **`world.look(cell, radius)`** — the cell's neighbours, from the **previous**
  frame: an index frozen at the top of `step()` and never updated during the
  pass, so nothing a behaviour does is visible to `look` until the next tick.
- **displayScale** — the size slider. Multiplies what is *drawn* and nothing
  else, so no setting of it can change the simulation.
- **quadrants** — the boxes the quadtree split itself into. Nothing in the
  simulation reads them; `d` draws them, which is the only way to see the index
  working.

## Invariants

1. **Behavior order is the physics.** Force-appliers (`flocking`, `attractor`,
   `solidBody`, `keyboardControl`) run before `move`, which consumes
   acceleration; `roundMap`/`bounceOnCorners` run after it, correcting the new
   position. Reordering the list in `src/index.ts` changes the simulation and
   nothing fails.
2. **Anything that changes a `radius` after creation must set `vision` too**, or
   the cell keeps seeing at its old size. That is why the size slider is a
   render-only multiplier: a slider that touched `radius` would leave tiny cells
   flocking at ten of their old radii, and it would read as a broken slider with
   no frame ever being wrong.
3. **`step()` never writes to the frame it was given** (`cloneCell`), which is
   what lets `look` freeze it. User story 8 asserts it — so a spec cannot read
   its result off the cell it passed in; read `sut.cells`.

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

**The payoff is set by `DEFAULT_VISION_FACTOR`, not by the cell count.** Vision
is `radius * 10`, so a fat cell asks for a box 400px wide in a 1440px world — a
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
- The flock is stepped 10 ticks before the clock starts. A scattered flock is
  not the interesting case: cells clump, and a clump is what a tree either
  handles or does not.
- Final positions differ in the last decimals between the two, and that is
  expected: the tree returns neighbours in tree order and the scan in array
  order, so the force sums round differently and a chaotic system walks away
  from itself. **The sets are identical** — that is what user story 8 proves,
  over seeded random layouts.

History: [`.agents/decisions/`](.agents/decisions).
