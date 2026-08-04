import { Cell, cellDistance } from '../cell';
import { COLLISION_FRICTION } from '../CONFIGURATION';
import { World } from '../simulation';
import { multiplyVectors, normalize } from '../vector';

/**
 * Cells are solid: two of them cannot stand in the same place.
 *
 * This resolves **only the cell it was called with**. Neighbours come from
 * `look()`, which means they belong to the previous frame — writing to one is
 * writing to the frame every other cell is still reading from, and the pair
 * would be resolved twice anyway (once per member) with the outcome depending
 * on array order. Each cell pushing only itself, off the same frozen frame,
 * makes the result order-independent by construction.
 *
 * Half the overlap each, therefore, not all of it: the neighbour applies the
 * other half to itself when its own turn comes, and the pair ends up exactly
 * touching. (The plan this came from said to push by the full overlap; that
 * separates the pair by twice what it needs and would have made every
 * collision a bounce.)
 */
export function solidBody(cell: Cell, { look }: World) {
  const neighbors = look(cell, cell.radius * 2);

  for (let i = 0; i < neighbors.length; i++) {
    const other = neighbors[i];
    const minDistance = other.radius + cell.radius;
    const distance = cellDistance(other, cell);

    if (distance < minDistance) {
      separate(cell, other, (minDistance - distance) / 2);
    }
  }
}

function separate(cell: Cell, other: Cell, correction: number) {
  const adjustment = normalize(
    {
      x: cell.position.x - other.position.x,
      y: cell.position.y - other.position.y,
    },
    correction,
  );

  cell.position.x += adjustment.x;
  cell.position.y += adjustment.y;

  // Take the neighbour's previous-frame velocity, damped — the half of the
  // old swap that belongs to this cell. Two cells meeting head-on still stop,
  // because each adopts a velocity pointing the other way.
  cell.velocity = multiplyVectors(other.velocity, 1 - COLLISION_FRICTION);
}
