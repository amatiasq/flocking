import { Cell, cellDistance, cloneCell, renderCell } from './cell';
import { CellIndex, indexCells } from './spatial';
import { Vector } from './vector';

export interface World {
  size: Vector;
  look: (cell: Cell, radius: number) => Cell[];
}

export type Behavior = (cell: Cell, world: World) => void;

export interface SimulationConfig {
  canvas: HTMLCanvasElement;
  cells: Cell[];
  behaviors: Behavior[];
  worldSize?: Vector;
}

export function simulation({
  canvas,
  cells,
  behaviors,
  worldSize = { x: canvas.width, y: canvas.height },
}: SimulationConfig) {
  const world: World = {
    size: worldSize,
    look,
  };

  const context = canvas.getContext('2d')!;
  const renderCellToContext = renderCell.bind(null, context, world);

  // The previous frame, indexed. Rebuilt at the top of every step because every
  // cell has just moved; `look` reads it for the whole pass.
  let index: CellIndex = indexCells(cells);

  return {
    get cells() {
      return cells;
    },
    step() {
      index = indexCells(cells);

      cells = cells.map((x) => {
        const cell = cloneCell(x);
        behaviors.forEach((b) => b(cell, world));
        return cell;
      });
    },
    render() {
      context.strokeStyle = 'blue';
      context.fillStyle = 'blue';
      context.clearRect(0, 0, canvas.width, canvas.height);
      cells.forEach(renderCellToContext);
    },
  };

  function look(target: Cell, radius: number): Cell[] {
    // The tree answers with a SQUARE of side 2*radius; the distance filter cuts
    // it down to the circle. Same predicate as the old full-flock scan, only
    // the candidate set is smaller — O(log n + k) instead of O(n).
    //
    // Compare by id: `target` is the mid-step copy, never identity-equal to the
    // originals in the index.
    //
    // Known limitation, unchanged from the brute-force version: neighbours
    // across a `roundMap` seam are not seen. Fixing it means querying up to
    // four wrapped boxes, the way `lulas/src/spatial.ts` does.
    return index
      .within(target.position, radius)
      .filter((x) => x.id !== target.id && cellDistance(target, x) < radius);
  }
}

export default simulation;
