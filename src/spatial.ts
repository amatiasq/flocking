import { Rectangle } from '@amatiasq/geometry';
import { IQuadEntity, Quadtree } from '@amatiasq/quadtree';
import { Cell } from './cell';
import { Vector } from './vector';

/**
 * A frozen snapshot of where every cell was, answering "who is near here?"
 * without walking the whole flock.
 *
 * Rebuilt once per tick and never updated in place: positions change every
 * frame, and a tree that is half last frame and half this one is worse than no
 * tree at all. That is the same double-buffer `step()` commits to.
 */
export interface CellIndex {
  /** Cells whose centre is within `radius` of `centre`. Not toroidal — see `look`. */
  within(centre: Vector, radius: number): Cell[];
  /**
   * Every box the tree split itself into, for the debug overlay. Nothing in the
   * simulation reads it: where the tree divided is invisible from the outside —
   * the answers are the same either way — and an index you cannot see is one you
   * have to take on faith.
   */
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

  // The world when the caller knows it, widened to hold anything outside it. A
  // cell that has walked past an edge and not yet been pulled back by `roundMap`
  // sits outside the world, and `Quadnode` throws on an entity its root does not
  // contain rather than clamping it.
  //
  // The bounding box of the cells alone would also be safe, and that is what
  // this used to be — but it moves a pixel or two every tick, so every quadrant
  // line drifts and a cell changes quadrant because a DIFFERENT cell moved.
  // Same answers either way, which is why it went unnoticed until the debug
  // overlay drew the grid and the whole thing crawled.
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

  // A pixel of air on every side. `Rectangle` stores a centre and a half-width
  // and derives the edges back from them, so a cell sitting exactly on the
  // bounding box it was measured from can land a rounding error outside it —
  // and `Quadnode` throws rather than clamp.
  const pad = 1;

  const tree = new Quadtree(
    // A flock in a perfect row is a zero-width world, which halves into
    // zero-width quadrants forever.
    Math.max(right - left, 1) + pad * 2,
    Math.max(bottom - top, 1) + pad * 2,
    { offsetX: left - pad, offsetY: top - pad },
  );

  for (const cell of cells) {
    // Cells go in as points, not as discs: every predicate in the sim measures
    // centre-to-centre distance, so a disc would only widen the candidate set.
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
