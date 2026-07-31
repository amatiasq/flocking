# Plan: a slider to change boid size

**Status:** proposed, nothing implemented.
**Effort:** S · **Risk:** low, with one real trap (see "vision").

## What

A single slider down one side of the screen. No panel, no background, no label —
just the slider itself floating over the canvas. Drag it up and down and every
boid gets bigger or smaller, live.

The interesting direction is **smaller**. Today cells are created with
`radius: random(5, 20)` and at 50 of them the screen is busy; shrinking them is
what lets you see flocking as a flock rather than as a pile. Bigger than current
is not very useful, so the range should be generous downward and modest upward —
something like a multiplier from `0.1` to `2` over each cell's own radius,
default `1`.

**Scale, don't set.** Each cell has its own radius from `random(5, 20)`, and that
size variety is visible in the sim. A slider that assigns one absolute radius to
every cell would flatten it. The slider is a **multiplier** applied on top of the
cell's own radius, so the spread survives.

## The trap: `vision` does not follow `radius`

This is the whole reason this plan is longer than "add an `<input type=range>`".

`vision` is the look radius used by `flocking` (alignment, cohesion, separation)
and by the collision check. In `createCell` (`src/cell.ts`) it is computed
**once, at creation**:

```ts
vision: (partial?.radius ?? DEFAULT_RADIUS) * DEFAULT_VISION_FACTOR
```

Nothing recomputes it afterwards. So if the slider writes `cell.radius` and stops
there, you get cells drawn tiny while still seeing — and flocking with, and
colliding against — neighbours ten of their *old* radii away. The sim keeps
behaving as if the boids were big while looking small. It will read as "the
slider is broken" without being obviously wrong on any single frame.

Two ways out; pick one and write it down:

- **(a) Scale `vision` with `radius`** — keep `vision === radius *
  DEFAULT_VISION_FACTOR` as an invariant, recomputed whenever radius changes.
  Smaller boids also see less, so the flock breaks into more, smaller groups.
  This is the physically consistent choice.
- **(b) Scale only the drawn size** — leave `radius`/`vision` alone and give the
  renderer its own multiplier. Pure cosmetics, behaviour identical at every
  setting. Cheapest, and arguably what "change the size of the boids" means if
  the goal is just to see better.

(a) changes the simulation, (b) changes the picture. **(b) is the better default
for a first cut** — it is the one that cannot silently desync anything — but say
so in the UI or the commit, because someone will expect (a).

If you take (a), also note `solidBody` separates cells using `radius`, so
shrinking mid-run can leave pairs overlapping for a few ticks until they push
apart. Harmless, but it looks like a glitch on a big jump.

## Steps

1. **Decide (a) or (b)** and record it in `AGENTS.md` next to the `vision`
   description — that line currently states the invariant, and it must not become
   a lie.
2. **Add the control.** `index.html` has only the module script; `src/index.ts`
   builds the canvas in `start()` and sets fullscreen styles in `setStyles()`.
   Create the input there, next to the canvas:
   - `position: fixed`, one side, vertically centred, `writing-mode:
     vertical-lr` (or a rotation) so it reads as a vertical slider;
   - no background, no border, no track fill beyond the browser default —
     the ask is explicitly "just a slider";
   - `z-index` above the canvas, and make sure it does not swallow the clicks the
     `attractor`/mouse code will want later (`pointer-events` on the input only);
   - it must survive the black background set in the `setTimeout` in
     `src/index.ts` — pick a thumb/track colour that is visible on black.
3. **Apply the multiplier.**
   - For (b): pass it into `render()` / `renderCell` and multiply where the arc
     is drawn. Note `renderCell` uses `cell.radius + 10` as the wrap-redraw
     margin — that constant must scale too, or near-edge cells will stop being
     mirrored correctly at small sizes.
   - For (a): walk `game.cells` on change, set `radius` and recompute `vision`.
4. **Persist it** (optional, cheap): `localStorage`, so a reload keeps the size
   you were looking at.
5. **Spec it.** For (b) there is nothing behavioural to assert — a render test at
   two multipliers is enough. For (a), assert the invariant directly: after
   changing the multiplier, every cell satisfies `vision === radius *
   DEFAULT_VISION_FACTOR`.

## Watch out

- **`DEFAULT_VISION_FACTOR` is 10.** That is a big number: a radius-5 cell sees
  50px. It is why the flock is cohesive at all. Do not "fix" it as part of this.
- The slider is DOM, not canvas. It will not appear in any canvas-based test or
  screenshot of `dist/`; check it in the browser (`amq flocking dev`).
- Keep it out of `user-stories/` if it is purely cosmetic — those specs are the
  project's specification, and a range input is not a user story about flocking.
