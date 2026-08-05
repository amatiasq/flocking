import { Cell, CellId, steer } from '../cell';
import { MAX_SPEED } from '../CONFIGURATION';
import { Behavior } from '../simulation';
import { isKeyDown, KeyboardKey } from '../user';
import { isZero, normalize, vector } from '../vector';

/**
 * Steer one cell with the arrow keys. It keeps flocking, colliding and wrapping
 * like any other cell — the arrows add one more force, they do not take over.
 *
 * A force, not a velocity: `steer` limits the correction to `MAX_FORCE` and
 * `move` caps the result at `MAX_SPEED`, so the driven cell obeys the same
 * limits as the rest. Writing `velocity` directly would make it a different
 * kind of object, and `solidBody` would hand that illegal velocity to whatever
 * it hit.
 *
 * `isDown` is a parameter so a spec can drive it without a keyboard.
 */
export function keyboardControl(
  target: CellId,
  isDown: (key: KeyboardKey) => boolean = isKeyDown,
): Behavior {
  return (cell: Cell) => {
    if (cell.id !== target) {
      return;
    }

    const direction = vector(
      axis(isDown(KeyboardKey.ARROW_RIGHT), isDown(KeyboardKey.ARROW_LEFT)),
      axis(isDown(KeyboardKey.ARROW_DOWN), isDown(KeyboardKey.ARROW_UP)),
    );

    if (isZero(direction)) {
      return;
    }

    // Normalised, or holding two arrows would be √2 times faster than one.
    steer(cell, normalize(direction, MAX_SPEED));
  };
}

function axis(positive: boolean, negative: boolean): number {
  return (positive ? 1 : 0) - (negative ? 1 : 0);
}
