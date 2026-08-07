import { equal, ok } from 'assert';

import { createCell } from '../src/cell';
import {
  averageSpeed,
  debugRows,
  fpsMeter,
  renderDebugPanel,
  renderQuadrants,
  rollingAverage,
} from '../src/debug';
import { indexCells } from '../src/spatial';
import { vector } from '../src/vector';
import { setFilename, test } from '../test/index';
import { createTestSimulation } from '../test/test-duplicates';

setFilename(__dirname, __filename);

const WORLD = vector(1000, 1000);

test('The frame rate comes off the gaps between frames', () => {
  const fps = fpsMeter();

  equal(fps.fps, 0, 'one timestamp is a gap from nothing');

  // 60 fps is a frame every 16.667 ms.
  for (let i = 0; i <= 10; i++) fps.sample(i * (1000 / 60));

  ok(Math.abs(fps.fps - 60) < 0.5, `expected ~60, got ${fps.fps}`);
});

test('The average forgets samples older than its window', () => {
  const average = rollingAverage(3);

  equal(average.value, 0, 'nothing measured yet');

  average.add(100);
  average.add(1);
  average.add(1);
  average.add(1);

  equal(average.value, 1, 'the 100 fell out of the window');
});

// Collisions trade velocity, so a packed flock runs well under MAX_SPEED. That
// is the number to look at when the sim feels sluggish — before the frame time.
test('The speed is the average over the flock, not the fastest cell', () => {
  const cells = [
    createCell({ velocity: vector(3, 4) }), // 5
    createCell({ velocity: vector(0, 0) }),
  ];

  equal(averageSpeed(cells), 2.5);
  equal(averageSpeed([]), 0);
});

test('The panel shows what is going on', () => {
  const game = createTestSimulation({
    cells: [createCell({ velocity: vector(3, 4) })],
  });

  const rows = new Map(debugRows(game.debug(60)));

  equal(rows.get('fps'), '60');
  equal(rows.get('cells'), '1');
  equal(rows.get('speed'), '5.00 px');
  ok(rows.get('tick')!.endsWith('ms'), rows.get('tick'));
});

test('It measures how long a step takes, once one has been taken', () => {
  const game = createTestSimulation();

  equal(game.debug(60).msPerTick, 0, 'nothing has been stepped yet');

  game.step();
  ok(game.debug(60).msPerTick > 0, 'a step is not free');
});

// The whole point of a quadtree is where it decided to split, and that is
// invisible from the outside: `look` answers the same with it and without it.
test('The index hands out the boxes it split itself into', () => {
  equal(indexCells([], WORLD).quadrants().length, 0, 'no cells, no tree');

  const alone = indexCells([createCell({ position: vector(500, 500) })], WORLD);
  equal(alone.quadrants().length, 1, 'one cell never splits anything');

  const crowd = Array.from({ length: 40 }, (_, i) =>
    createCell({ position: vector(10 + (i % 8), 10 + Math.floor(i / 8)) }),
  );

  const index = indexCells(crowd, WORLD);
  ok(index.quadrants().length > 1, 'a crowd splits the tree');

  const [root] = index.quadrants();

  for (const box of index.quadrants()) {
    ok(
      box.left >= root.left &&
        box.top >= root.top &&
        box.right <= root.right &&
        box.bottom <= root.bottom,
      `a quadrant outside the root: ${box}`,
    );
  }
});

// Not the bounding box of the cells, which moves every tick: every line on the
// screen drifts, and a cell changes quadrant because another moved.
test('The grid stands still while the cells move', () => {
  const box = (position: ReturnType<typeof vector>) =>
    String(indexCells([createCell({ position })], WORLD).quadrants()[0]);

  equal(box(vector(100, 100)), box(vector(900, 900)));
  equal(box(vector(100, 100)), box(vector(500, 500)));
});

// Callers that do not know the world — the specs in story 8 — still get a tree
// sized to the cells. The root moves with them, and for a lookup that is fine.
test('Without a world it still indexes whatever it was given', () => {
  const index = indexCells([createCell({ position: vector(5000, 5000) })]);

  equal(index.quadrants().length, 1);
  equal(index.within(vector(5000, 5000), 10).length, 1);
});

test('The grid draws one box per quadrant and leaves the context alone', () => {
  const calls: string[] = [];
  const context = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    set strokeStyle(value: string) {},
    set lineWidth(value: number) {},
    strokeRect: () => calls.push('strokeRect'),
  } as unknown as CanvasRenderingContext2D;

  const boxes = indexCells(
    Array.from({ length: 40 }, (_, i) =>
      createCell({ position: vector(10 + (i % 8), 10) }),
    ),
    WORLD,
  ).quadrants();

  renderQuadrants(context, boxes);

  equal(calls[0], 'save');
  equal(calls[calls.length - 1], 'restore');
  equal(calls.filter((call) => call === 'strokeRect').length, boxes.length);
});

test('Drawing the panel leaves the context as it found it', () => {
  const calls: string[] = [];
  const context = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    fillRect: () => calls.push('fillRect'),
    strokeRect: () => calls.push('strokeRect'),
    fillText: (text: string) => calls.push(`fillText(${text})`),
  } as unknown as CanvasRenderingContext2D;

  renderDebugPanel(context, {
    fps: 60,
    msPerTick: 0.5,
    cells: 50,
    averageSpeed: 2.2,
  });

  equal(calls[0], 'save');
  equal(calls[calls.length - 1], 'restore');
  ok(calls.some((call) => call.startsWith('fillText(fps')), 'the fps row is drawn');
});
