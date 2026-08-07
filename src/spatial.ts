import { Rectangle } from '@amatiasq/geometry';
import { IQuadEntity, Quadtree } from '@amatiasq/quadtree';
import { Cell } from './cell';
import { Vector } from './vector';

// A frozen snapshot of where every cell was. Rebuilt once per tick and never
// updated in place: a tree half last frame and half this one is worse than none.
export interface CellIndex {
  /** Cells whose centre is within `radius` of `centre`. Not toroidal — see `look`. */
  within(centre: Vector, radius: number): Cell[];
  /** The boxes the tree split itself into. Only the debug overlay reads them. */
  quadrants(): Rectangle[];
}

interface CellEntity extends IQuadEntity {
  cell: Cell;
}

const EMPTY: Cell[] = [];
const NO_QUADRANTS: Rectangle[] = [];

export function indexCells(cells: Cell[], worldSize?: Vector): CellIndex {
  if (cells.length === 0) {
    return { within: () => EMPTY, quadrants: () => NO_QUADRANTS };
  }

  // The world when the caller knows it, widened to hold a cell that walked past
  // an edge before `roundMap` pulled it back (`Quadnode` throws on an entity its
  // root does not contain). Not the cells' bounding box: that moves every tick,
  // so quadrant lines drift and the debug grid crawls.
  let left = worldSize ? 0 : Infinity;
  let top = worldSize ? 0 : Infinity;
  let right = worldSize ? worldSize.x : -Infinity;
  let bottom = worldSize ? worldSize.y : -Infinity;

  for (const cell of cells) {
    if (cell.position.x < left) left = cell.position.x;
    if (cell.position.x > right) right = cell.position.x;
    if (cell.position.y < top) top = cell.position.y;
    if (cell.position.y > bottom) bottom = cell.position.y;
  }

  // `Rectangle` derives its edges from a centre and a half-width, so a cell
  // exactly on the box it was measured from can round its way outside it.
  const pad = 1;

  const tree = new Quadtree(
    // A flock in a perfect row is a zero-width world, halving forever.
    Math.max(right - left, 1) + pad * 2,
    Math.max(bottom - top, 1) + pad * 2,
    { offsetX: left - pad, offsetY: top - pad },
  );

  for (const cell of cells) {
    // Points, not discs: every predicate in the sim measures centre to centre.
    const entity: CellEntity = {
      cell,
      top: cell.position.y,
      bottom: cell.position.y,
      left: cell.position.x,
      right: cell.position.x,
    };

    tree.add(entity);
  }

  return {
    quadrants() {
      return tree.quadrants;
    },

    within(centre: Vector, radius: number) {
      const range = Rectangle.fromCoords(
        centre.y - radius,
        centre.x - radius,
        centre.x + radius,
        centre.y + radius,
      );

      return (tree.getAt(range) as CellEntity[]).map((entity) => entity.cell);
    },
  };
}
