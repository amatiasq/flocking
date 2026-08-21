import { equal, ok } from 'assert';

import { Cell, cellDistance, createCell } from '../src/cell';
import { World } from '../src/simulation';
import { vector, vectorAxis } from '../src/vector';
import { setFilename, test } from '../test/index';
import { createTestSimulation } from '../test/test-duplicates';

setFilename(__dirname, __filename);

const SIZE = 400;

/**
 * `look()` is answered by a quadtree now, so "same answer as scanning every
 * cell" became something to prove: a missing neighbour is invisible in the
 * running sim. Deterministic on purpose — a seeded generator makes a failure
 * reproducible.
 */
function randoms(seed: number) {
  let state = seed;
  return () => {
    // Numerical Recipes' LCG. Any decent one would do; this one is short.
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function ids(cells: Cell[]) {
  return cells
    .map((cell) => String(cell.id))
    .sort()
    .join(',');
}

test('look() sees exactly what a full scan would see', () => {
  const random = randoms(20260803);

  for (let trial = 0; trial < 40; trial++) {
    const cells = Array.from({ length: 60 }, () =>
      createCell({ position: vector(random() * SIZE, random() * SIZE) }),
    );

    // Everything from "nobody is in range" to "the whole flock is".
    const radius = 5 + random() * (SIZE * 1.5);
    const seen = new Map<Cell['id'], Cell[]>();

    const sut = createTestSimulation({
      cells,
      worldSize: vector(SIZE),
      behaviors: [
        (cell: Cell, world: World) => {
          seen.set(cell.id, world.look(cell, radius));
        },
      ],
    });

    sut.step();

    for (const cell of cells) {
      const expected = cells.filter(
        (x) => x.id !== cell.id && cellDistance(cell, x) < radius,
      );

      equal(
        ids(seen.get(cell.id)!),
        ids(expected),
        `trial ${trial}, radius ${radius}, cell ${cell.id}`,
      );
    }
  }
});

test('look() finds a neighbour sitting exactly on top of the target', () => {
  // Degenerate on both counts: zero distance, and a flock whose bounding box
  // has no width at all — the tree still has to be built and still has to
  // answer.
  const [left, right] = [createCell(), createCell()];
  const seen = new Map<Cell['id'], Cell[]>();

  const sut = createTestSimulation({
    cells: [left, right],
    behaviors: [
      (cell: Cell, world: World) => {
        seen.set(cell.id, world.look(cell, 1));
      },
    ],
  });

  sut.step();

  equal(ids(seen.get(left.id)!), String(right.id));
  equal(ids(seen.get(right.id)!), String(left.id));
});

test('step() does not touch the frame it was given', () => {
  // The double buffer, stated. Behaviours write vectors in place, so a shallow
  // `{ ...cell }` would have them scribbling on the previous frame — the one
  // `look()` is still handing to every other cell in the same pass.
  const cell = createCell({
    position: vector(10, 20),
    velocity: vector(1, 2),
  });

  const before = {
    position: { ...cell.position },
    velocity: { ...cell.velocity },
    acceleration: { ...cell.acceleration },
  };

  const sut = createTestSimulation({
    cells: [cell],
    behaviors: [
      (target: Cell) => {
        target.position.x += 100;
        target.velocity.y += 100;
        target.acceleration.x += 100;
      },
    ],
  });

  sut.step();

  vectorAxis((axis) => {
    equal(cell.position[axis], before.position[axis], `position.${axis}`);
    equal(cell.velocity[axis], before.velocity[axis], `velocity.${axis}`);
    equal(
      cell.acceleration[axis],
      before.acceleration[axis],
      `acceleration.${axis}`,
    );
  });

  const [stepped] = sut.cells;
  ok(stepped.position.x === before.position.x + 100, 'the next frame moved');
});
