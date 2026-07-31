# Plan: drive one boid with the arrow keys

**Status:** proposed, nothing implemented.
**Effort:** S–M · **Risk:** low (additive; no existing behavior changes).

## What

Pick one cell and let the arrow keys steer it. It keeps its normal behavior by
default — it flocks, collides and wraps like any other — but while the user is
pressing an arrow, the input wins. Release the keys and it goes back to the
flock without any state to reset.

The point is to feel the flock from the inside: shove one boid through the swarm
and watch alignment and separation react.

## Why it isn't just "set the velocity"

`move` (`src/behaviors/move.ts`) integrates `acceleration` → `velocity` →
`position` and then zeroes acceleration. Every other force in the sim is applied
as an **acceleration**, capped by `MAX_FORCE`, and `move` caps the resulting
speed at `MAX_SPEED`. If the keyboard writes `velocity` (or `position`)
directly, the controlled cell stops obeying those caps and it will look and
behave like a different kind of object — and `solidBody`, which swaps velocities
on collision, will happily hand that illegal velocity to whatever it hits.

So: the keyboard is **one more force-applying behavior**, using
`applyForce`/`steer` from `src/cell.ts` exactly like `flocking` and `attractor`
do, and it must run **before `move`** (invariant 2 in `AGENTS.md`).

## Blocker — the input layer only sees `keydown`

`src/user.ts` is not good enough as it stands. Three problems, all of which must
be fixed first:

1. **No `keyup`.** `initKeyboardDetection` registers `keydown` only (the `keyup`
   line is commented out). Steering needs *held* keys — "is right pressed right
   now" — not discrete presses. Without it you get one nudge per key repeat,
   which is jerky and OS-dependent.
2. **`KeyboardKey` has one member.** `enum KeyboardKey { SPACE = 32 }`. The
   arrows need adding (37–40 as `keyCode`, or better: migrate to `event.key` /
   `event.code`, since `keyCode` is deprecated. If you migrate, `SPACE`'s
   existing use in `src/index.ts` moves with it).
3. **Unregistered keys throw.** `emit(keyListeners[event.keyCode], …)` passes
   `undefined` to `emit`, which does `listeners.forEach(…)`. Press any key with
   no listener and it is a `TypeError`. It goes unnoticed today because the page
   registers `SPACE` and nothing else grabs focus, but adding four more keys
   makes it much easier to hit. Guard it.

Suggested shape — add a held-keys set alongside the existing listener API rather
than replacing it, so `onKeyPress(SPACE, …)` keeps working:

```ts
export function isKeyDown(key: KeyboardKey): boolean;
```

backed by a `Set` filled on `keydown` and drained on `keyup`. Also drain it on
`window.blur` — otherwise alt-tabbing while holding an arrow leaves the key
stuck down forever.

## Steps

1. **Fix `src/user.ts`**: add `keyup`, add the arrow keys to `KeyboardKey`, guard
   the `undefined` listener list, expose `isKeyDown`, clear held keys on
   `blur`. This is the only change to existing code.
2. **Add `src/behaviors/keyboardControl.ts`** — a behavior factory, like
   `attractor(point)`:

   ```ts
   export function keyboardControl(target: CellId): Behavior
   ```

   For a cell whose `id` is not `target`, do nothing. For the target, read the
   arrows into a direction vector, and if it is non-zero `steer(cell, direction
   scaled to MAX_SPEED)` — `steer` already limits the correction to `MAX_FORCE`,
   so the controlled boid accelerates at the same rate everything else does.
   Diagonals must be normalised or holding two arrows is faster than one.
3. **Wire it in `src/index.ts`**, in the behavior list *before* `move`:
   `[keyboardControl(id), flocking, move, solidBody, roundMap]`. Which cell?
   Simplest is `game.cells[0]`. Make it visible — the user has to know which one
   they are driving; give it a fixed colour, or a ring, in `renderCell`.
4. **Spec it** as a user story, matching the existing style
   (`user-stories/*.test.ts`, `test` imported from `test/index.ts`, not Vitest):
   *As a user I want to control one cell with the arrow keys*. Assert the
   mechanism, not the rendering — with right held for one `step()`, the target's
   velocity gains `+x` and no other cell's does; with nothing held, the target
   steps identically to an unwired sim.

## Watch out

- **Don't fight the flock — join it.** The controlled cell still has `flocking`
  applied, so the two forces sum. That is the intended feel. If it turns out to
  be too sluggish to drive, the fix is a bigger steering force for the target,
  **not** skipping `flocking` for it.
- The cell is still a `solidBody` and still wraps: drive it off the right edge
  and it comes back on the left, mid-collision. That is correct.
- `step()` shallow-copies cells and shares the nested vectors
  (`AGENTS.md` "Easy to break" #1). A behavior that mutates `acceleration` via
  `applyForce` is safe — that is what every existing behavior does. Don't
  reassign `cell.velocity`/`cell.position` to fresh objects here without reading
  that section, and don't try to fix the double-buffer as part of this plan; it
  has its own (`import-fixes.md` #1).

## Later

The original sketch called this "phase 2" of a bigger idea: the same control
scheme, but driving a cell in the predator/prey simulation — where being steered
into a bigger cell gets you eaten. That belongs to that project, not here; this
plan is only the flocking version.
