import { Cell, CellId, steer } from '../cell';
import { MAX_SPEED } from '../CONFIGURATION';
import { Behavior } from '../simulation';
import { isKeyDown, KeyboardKey } from '../user';
import { isZero, normalize, vector } from '../vector';

// A force and not a velocity, so the driven cell obeys the same MAX_FORCE and
// MAX_SPEED as the rest — otherwise `solidBody` hands an illegal velocity to
// whatever it hits. `isDown` is a parameter so a spec can drive it.
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
