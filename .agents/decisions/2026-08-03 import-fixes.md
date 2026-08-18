# 2026-08-03 — The three import-review fixes are in

#1 landed with the quadtree, because a frozen spatial index and a half-shared
frame cannot both be right — see
[`../../.agents/decisions/2026-08-03 quadtree-in-flocking-and-lulas.md`](../../../.agents/decisions/2026-08-03%20quadtree-in-flocking-and-lulas.md).

## #3 — `solidBody` resolves one cell, and only one

It used to push both members of a pair apart and swap their velocities, so a
pair was resolved twice (once per member) and — once the double buffer landed —
half that work corrupted the previous frame every other cell was still reading.
Now each cell pushes **itself** and adopts the neighbour's previous-frame
velocity damped; nothing writes to `other`.

**The plan was wrong about the magnitude and this deviates from it.** It said to
push by the *full* overlap "since the other cell pushes itself away
symmetrically" — which is exactly why it must be **half**: two cells each moving
half end up touching, full-overlap each separates them by twice what they need
and turns every graze into a bounce. Half also preserves the user story 5
numbers, which had been asserting the correct separation all along.

Two things left unfixed, deliberately:

- a cell overlapping **two** neighbours still ends up with whichever velocity it
  looked at last. The pair-level order-dependence is gone; this one needs a real
  decision about what colliding with two things at once should mean.
- two cells at *exactly* the same position never separate, because `normalize`
  of a zero vector is zero. `lulas/src/collision.ts` picks a fixed direction for
  that case; no spec here asks for it.

Two new specs in user story 5, both checked to fail when the writes to `other`
are put back: the neighbour is untouched, and a pair resolves identically
whichever member is stepped first. The pairs are deliberately far enough apart
that no cell has two neighbours — the spec claims what the fix delivers, no more.

## #4 — `CellId` is a branded number

It was declared as a string literal type while `getNextId` returned a number
through `as any`. Now `number & { __brand }`, no cast beyond the brand, no
runtime change. `Color` keeps the string-literal trick, as the plan said: there
the value really is a string, so it is ugly rather than untrue.
