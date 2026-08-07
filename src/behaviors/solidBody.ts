import { Cell, cellDistance } from '../cell';
import { COLLISION_FRICTION } from '../CONFIGURATION';
import { World } from '../simulation';
import { multiplyVectors, normalize } from '../vector';

// Resolves only the cell it was given, by half the overlap: the neighbour is a
// previous-frame cell everyone else is still reading, and it applies its own
// half when its turn comes. That makes the pair order-independent and leaves it
// exactly touching.
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
