# flocking

A boids simulation on canvas. Cells drift, steer by the three classic flocking
rules, collide as solid bodies, and wrap around the edges of a toroidal world.

Built TDD-first: the specs in `user-stories/` are the specification, written
before the code, and run under Vitest.

## Run it

`bun install`, then `amq flocking local|test|build|check`. `check` runs exactly
what CI runs.

## Controls

- **Space** — pause / resume.
- **← ↑ → ↓** — steer the white cell, the big one.
- **D** — debug overlay: the quadtree's grid over the flock, plus frame rate,
  ms per step, cell count and average speed.
- The slider on the right scales how big the cells are **drawn**. The simulation
  is the same at every setting; below 1 the swarm reads as a flock.

## Still on the list

Not yet written, as user stories:

- reject cells from a point;
- hover a cell for its velocity vector and vision radius;
- use all the space when the window is resized.

## Architecture

See [`AGENTS.md`](AGENTS.md) for the glossary, the invariants and what the
quadtree measured.
