import assert from 'assert';

import { solidBody } from '../src/behaviors/solidBody';
import { Cell, cloneCell, createCell } from '../src/cell';
import { vector, vectorAxis } from '../src/vector';
import { setFilename, test } from '../test/index';
import { createTestSimulation } from '../test/test-duplicates';

setFilename(__dirname, __filename);

test(
  'Cells should immediately separate each other if they overlap',
  [
    [vector(1, 0), vector(-1, 0), vector(5, 0)],
    [vector(0, 1), vector(0, -1), vector(0, 5)],
    [vector(1), vector(-1), vector(3.5355339059327378)],
  ],
  (pos1, pos2, expected) => {
    const sim = createTestSimulation({
      behaviors: [solidBody],
      cells: [
        createCell({ position: { ...pos1 }, velocity: vector(0) }),
        createCell({ position: { ...pos2 }, velocity: vector(0) }),
      ],
    });

    sim.step();
    const sut = sim.cells[0];

    vectorAxis((axis) => assert.equal(sut.position[axis], expected[axis]));
  },
);

test('Cells should stop if they collide on each other', () => {
  const sim = createTestSimulation({
    behaviors: [solidBody],
    cells: [
      createCell({ position: vector(1), velocity: vector(-1) }),
      createCell({ position: vector(-1), velocity: vector(0) }),
    ],
  });

  sim.step();
  const sut = sim.cells[0];

  vectorAxis((axis) => assert(sut.velocity[axis] >= 0));
});

test('A colliding cell does not touch the neighbour it collided with', () => {
  // The neighbour comes from `look()`, so it belongs to the previous frame —
  // the one every other cell is still reading from this pass. Writing to it
  // also resolved the pair twice, once per member.
  const left = createCell({ position: vector(1, 0), velocity: vector(2, 3) });
  const right = createCell({ position: vector(-1, 0), velocity: vector(4, 5) });
  const before = [left, right].map(cloneCell);

  const sim = createTestSimulation({
    behaviors: [solidBody],
    cells: [left, right],
  });

  sim.step();

  [left, right].forEach((cell, i) =>
    vectorAxis((axis) => {
      assert.equal(cell.position[axis], before[i].position[axis]);
      assert.equal(cell.velocity[axis], before[i].velocity[axis]);
    }),
  );
});

test('A pair resolves the same whoever is stepped first', () => {
  // Three overlapping pairs, far enough apart that no cell has two neighbours:
  // this is about the pair, and a cell caught between two others still adopts
  // the velocity of whichever it looked at last.
  const layout = [
    createCell({ position: vector(100, 100), velocity: vector(1, 0) }),
    createCell({ position: vector(104, 100), velocity: vector(-2, 1) }),
    createCell({ position: vector(300, 300), velocity: vector(0, 3) }),
    createCell({ position: vector(300, 305), velocity: vector(1, -1) }),
    createCell({ position: vector(500, 100), velocity: vector(-1, -1) }),
    createCell({ position: vector(497, 103), velocity: vector(2, 2) }),
  ];

  const run = (cells: Cell[]) => {
    const sim = createTestSimulation({
      behaviors: [solidBody],
      cells: cells.map(cloneCell),
    });

    sim.step();
    return new Map(sim.cells.map((cell) => [cell.id, cell]));
  };

  const ordered = run(layout);
  // Reversed rather than randomised: every pair is visited in the opposite
  // order, which is the whole space of orderings that matters here.
  const reversed = run([...layout].reverse());

  assert.equal(ordered.size, reversed.size);

  for (const [id, cell] of ordered) {
    const other = reversed.get(id)!;
    assert(other, `cell ${id} missing from the reversed run`);

    vectorAxis((axis) => {
      assert.equal(cell.position[axis], other.position[axis], `position.${axis}`);
      assert.equal(cell.velocity[axis], other.velocity[axis], `velocity.${axis}`);
    });
  }
});
