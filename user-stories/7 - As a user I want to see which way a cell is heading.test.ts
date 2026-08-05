import assert from 'assert';

import { CanvasRenderingContext2DEvent } from '../node_modules/jest-canvas-mock/types/index.d';
import { Color } from '../src/color';
import { createCell, renderCell } from '../src/cell';
import { vector } from '../src/vector';
import { setFilename, test } from '../test/index';

setFilename(__dirname, __filename);

const COLOR = '#abcdef' as Color;
const WORLD = { size: vector(1000, 1000), look: () => [] };

function draw(displayScale?: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const cell = createCell({
    position: vector(500, 500),
    velocity: vector(3, 0),
    radius: 20,
    color: COLOR,
  });

  renderCell(context, WORLD, cell, displayScale);

  return (context as any).__getEvents() as CanvasRenderingContext2DEvent[];
}

const eventsOfType = (events: CanvasRenderingContext2DEvent[], type: string) =>
  events.filter((event) => event.type === type);

// A cell is a DROP, not a disc: three quarters of a circle plus a corner where
// the missing quarter would be, rotated by the heading. That is the only thing
// on screen that says which way anything is going.
//
// It was turned off for five years by a work-in-progress commit ("I was doing
// something here...", 2021-04-16) that put it behind a `const withBeak = false`,
// and nobody noticed — the project's own screenshot on amatiasq.com still showed
// the drops. Hence this spec.
test('A cell is drawn as a drop, with a nose', () => {
  const events = draw();
  const arcs = eventsOfType(events, 'arc');

  assert(arcs.length > 0, 'something round was drawn');

  const [arc] = arcs;
  const endAngle = (arc.props as any).endAngle;

  assert.equal(
    endAngle,
    Math.PI * 1.5,
    `the arc stops three quarters round, leaving room for the nose (got ${endAngle})`,
  );
  assert(
    eventsOfType(events, 'lineTo').length > 0,
    'and the nose itself is a line to the corner',
  );
});

test('The drop points where the cell is going', () => {
  const events = draw();
  const rotations = eventsOfType(events, 'rotate');

  assert(rotations.length > 0, 'the shape is rotated by the heading');
});

// The size slider. It is a RENDER multiplier: `radius` and `vision` never move,
// so no setting of it can change how the flock behaves — see AGENTS.md.
test(
  'The display scale multiplies the drawn size and nothing else',
  [
    // scale, expected drawn radius for a radius-20 cell
    [0.1, 2],
    [1, 20],
    [2, 40],
  ],
  (scale: number, expected: number) => {
    const [arc] = eventsOfType(draw(scale), 'arc');
    assert.equal((arc.props as any).radius, expected);
  },
);

test('Omitting the display scale draws the cell at its own radius', () => {
  const [arc] = eventsOfType(draw(), 'arc');
  assert.equal((arc.props as any).radius, 20);
});

test('Each cell wears its own colour, not one colour for all of them', () => {
  const events = draw();
  const strokes = eventsOfType(events, 'strokeStyle').map(
    (event) => (event.props as any).value,
  );

  assert(
    strokes.includes(COLOR),
    `expected the cell's own colour as its outline, got ${strokes.join()}`,
  );
});
