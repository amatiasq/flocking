import { Cell, cellDistance, cloneCell, renderCell } from './cell';
import {
  averageSpeed,
  DebugStats,
  renderDebugPanel,
  renderQuadrants,
  rollingAverage,
} from './debug';
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
  const tickTime = rollingAverage();

  // The previous frame, indexed. Rebuilt at the top of every step because every
  // cell has just moved; `look` reads it for the whole pass.
  let index: CellIndex = indexCells(cells, worldSize);

  return {
    get cells() {
      return cells;
    },
    /** The panel's numbers. `fps` is the page's to measure, not this module's. */
    debug: stats,
    step() {
      const start = performance.now();

      index = indexCells(cells, worldSize);

      cells = cells.map((x) => {
        const cell = cloneCell(x);
        behaviors.forEach((b) => b(cell, world));
        return cell;
      });

      tickTime.add(performance.now() - start);
    },
    // Passing `fps` is how the page asks for the overlay: the frame rate is the
    // only part of it this module cannot measure itself.
    render(displayScale = 1, fps?: number) {
      context.strokeStyle = 'blue';
      context.fillStyle = 'blue';
      context.clearRect(0, 0, canvas.width, canvas.height);
      cells.forEach((cell) => renderCell(context, world, cell, displayScale));

      if (fps == null) return;

      // The tree of the frame on screen, not the one `step` built over the
      // positions before anything moved. Rebuilding costs a fraction of a tick.
      renderQuadrants(context, indexCells(cells, worldSize).quadrants());
      renderDebugPanel(context, stats(fps));
    },
  };

  function stats(fps: number): DebugStats {
    return {
      fps,
      msPerTick: tickTime.value,
      cells: cells.length,
      averageSpeed: averageSpeed(cells),
    };
  }

  function look(target: Cell, radius: number): Cell[] {
    // The tree answers with a square of side 2*radius and the filter cuts it to
    // the circle, by id — `target` is the mid-step copy, never identity-equal.
    // Does not wrap: neighbours across a `roundMap` seam are not seen, and the
    // fix is querying up to four boxes, the way `lulas/src/spatial.ts` does.
    return index
      .within(target.position, radius)
      .filter((x) => x.id !== target.id && cellDistance(target, x) < radius);
  }
}

export default simulation;
