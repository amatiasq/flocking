# flocking

A boids simulation on canvas. Cells drift, steer by the three classic flocking
rules, collide as solid bodies, and wrap around the edges of a toroidal world.

Built TDD-first: the specs in `user-stories/` are the specification, written
before the code, and run under Vitest.

> **Name.** This project used to be called *lulas*. It was renamed to *flocking*
> because that is what it actually is. The *lulas* name went back to the older,
> different simulation it originally belonged to — cells that hunt and eat each
> other — which lives in its own project.

## Run it

```sh
bun install
bun run dev      # vite dev server
bun run test     # vitest
bun run build    # tsc --noEmit && vite build
```

Or through the `amq` dispatcher: `amq flocking dev|test|build|check`.
`check` runs exactly what CI runs.

## What it does

Every tick, each cell is advanced by an ordered list of behaviors:

| behavior | effect |
| --- | --- |
| `flocking` | alignment + cohesion + separation, summed into one force |
| `move` | integrate acceleration → velocity → position |
| `solidBody` | push overlapping cells apart and swap their velocities |
| `roundMap` | wrap position around the world edges |
| `bounceOnCorners` | reflect velocity at the edges (alternative to `roundMap`) |
| `attractor(point)` | steer toward a point |

`src/CONFIGURATION.ts` holds every tuning knob: speeds, force caps, the three
flocking weights, collision friction.

## Controls

- **Space** — pause / resume.

## The spec (`user-stories/`)

These were written first, as tests:

- As a user I want to see cells
- As a user I want to watch them move
- As a user I want them to bounce on the corners
- As a user I want them to navigate to the other side of the screen
- As a user I want to watch them follow flocking behaviour
  (alignment, cohesion, separation)
- As a user I want to watch the cells not overlap
- As a user I want to attract cells when I click

Still on the list, not yet written:

- As a user I want to reject them from a point
- As a user I want to see detailed cell information
  (hover shows velocity vector and vision radius)
- As a user I want the cells to use all the space when I resize the window

## Architecture

See [`AGENTS.md`](AGENTS.md) for the engine, the behavior contract, and the
invariants that are easy to break.
