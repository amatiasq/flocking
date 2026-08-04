# 2026-08-03 — The three import-review fixes are in

Completes `.agents/plans/import-fixes.md` (now deleted). #1 landed earlier today
with the quadtree, because a frozen spatial index and a half-shared frame cannot
both be right — see
[`../../.agents/decisions/2026-08-03 quadtree-in-flocking-and-lulas.md`](../../.agents/decisions/2026-08-03%20quadtree-in-flocking-and-lulas.md).
This records #3 and #4.

## #3 — `solidBody` resolves one cell, and only one

Neighbours come from `look()`, so they are previous-frame cells: the frame every
*other* cell in the same pass is still reading. The old behaviour pushed both
members of a pair apart and swapped their velocities, which meant the pair was
resolved twice (once per member) and, after the double-buffer landed, that half
of the work also corrupted the frame everyone else was perceiving.

Now each cell pushes **itself** away and adopts the neighbour's previous-frame
velocity damped by `COLLISION_FRICTION`. Nothing writes to `other`.

**The plan was wrong about the magnitude and this deviates from it.** It said to
push by the *full* overlap, "since the other cell pushes itself away
symmetrically when it is stepped" — but that is exactly why it must be **half**:
two cells each moving half the overlap in opposite directions end up exactly
touching, and full-overlap each would separate them by twice what they need,
turning every graze into a bounce. Half also preserves the existing user story 5
numbers, which had been asserting the correct separation all along.

Not fixed, and now written down instead: a cell overlapping **two** neighbours
still ends up with whichever velocity it looked at last. The pair-level
order-dependence is gone; that one is not, and it needs a real decision about
what colliding with two things at once should mean.

Also unchanged: two cells at *exactly* the same position never separate, because
`normalize` of a zero vector is a zero vector. `lulas/src/collision.ts` picks a
fixed direction for that case and says why; this one has no spec asking for it.

### Verification
Two new specs in user story 5, both checked to fail when the writes to `other`
are put back:
- the neighbour is untouched by the collision (position and velocity);
- a pair resolves identically whichever member is stepped first — three
  overlapping pairs, run forwards and reversed, compared by id.

The pairs are deliberately far enough apart that no cell has two neighbours: the
spec claims what the fix delivers, not more.

## #4 — `CellId` is a branded number

`export type CellId = '[number CellId]'` described a string literal while
`getNextId` returned a number through `as any`. Now
`number & { readonly __brand: 'CellId' }` with no cast beyond the brand. Nothing
changed at runtime; the ids are only ever compared and interpolated.

`Color` keeps the same trick in `color.ts`, as the plan said: there the value
really is a string, so it is ugly rather than untrue.

## State of the suite
64 tests, 10 files, green. `tsc --noEmit` clean, `bun run build` fine.
