import { deepStrictEqual, ok } from 'assert';

import { keyboardControl } from '../src/behaviors/keyboardControl';
import { move } from '../src/behaviors/move';
import { createCell } from '../src/cell';
import { MAX_FORCE } from '../src/CONFIGURATION';
import { isKeyDown, KeyboardKey } from '../src/user';
import { magnitude, vector } from '../src/vector';
import { setFilename, test } from '../test/index';
import { createTestSimulation } from '../test/test-duplicates';

setFilename(__dirname, __filename);

const held = (...keys: KeyboardKey[]) => (key: KeyboardKey) =>
  keys.includes(key);

const twoCells = () => [
  createCell({ position: vector(100), velocity: vector(0) }),
  createCell({ position: vector(500), velocity: vector(0) }),
];

test(
  'The held arrow accelerates the target that way',
  [
    // key, expected sign on [x, y]
    [KeyboardKey.ARROW_RIGHT, 1, 0],
    [KeyboardKey.ARROW_LEFT, -1, 0],
    [KeyboardKey.ARROW_DOWN, 0, 1],
    [KeyboardKey.ARROW_UP, 0, -1],
  ],
  (key: KeyboardKey, x: number, y: number) => {
    const cells = twoCells();
    const sim = createTestSimulation({
      cells,
      behaviors: [keyboardControl(cells[0].id, held(key)), move],
    });

    sim.step();

    const [target, other] = sim.cells;
    deepStrictEqual(sign(target.velocity), { x, y });

    // Only the target: the behavior must ignore every other cell.
    deepStrictEqual(other.velocity, vector(0));
  },
);

test('Nothing held steps exactly like an unwired simulation', () => {
  const wired = createTestSimulation({
    cells: twoCells(),
    behaviors: [keyboardControl(0 as any, held()), move],
  });
  const plain = createTestSimulation({
    cells: twoCells(),
    behaviors: [move],
  });

  wired.step();
  plain.step();

  deepStrictEqual(
    wired.cells.map((x) => [x.position, x.velocity]),
    plain.cells.map((x) => [x.position, x.velocity]),
  );
});

test('Diagonals are not faster than a single arrow', () => {
  const drive = (...keys: KeyboardKey[]) => {
    const cells = twoCells();
    const sim = createTestSimulation({
      cells,
      behaviors: [keyboardControl(cells[0].id, held(...keys))],
    });

    sim.step();
    return magnitude(sim.cells[0].acceleration);
  };

  const straight = drive(KeyboardKey.ARROW_RIGHT);
  const diagonal = drive(KeyboardKey.ARROW_RIGHT, KeyboardKey.ARROW_DOWN);

  ok(Math.abs(diagonal - straight) < 1e-9);
});

test('The steering force respects MAX_FORCE, like every other behavior', () => {
  const cells = twoCells();
  const sim = createTestSimulation({
    cells,
    behaviors: [keyboardControl(cells[0].id, held(KeyboardKey.ARROW_RIGHT))],
  });

  sim.step();

  ok(magnitude(sim.cells[0].acceleration) <= MAX_FORCE + 1e-9);
});

test('Opposite arrows cancel out', () => {
  const cells = twoCells();
  const sim = createTestSimulation({
    cells,
    behaviors: [
      keyboardControl(
        cells[0].id,
        held(KeyboardKey.ARROW_LEFT, KeyboardKey.ARROW_RIGHT),
      ),
    ],
  });

  sim.step();

  deepStrictEqual(sim.cells[0].acceleration, vector(0));
});

// Unclaimed, pressing right slides the page and leaves the cell where it was.
// `overflow: hidden` is belt and braces: it does not stop other listeners.
test('The keys it steers with are taken from the page', () => {
  // Any call wires the listeners up, once, for the whole module.
  isKeyDown(KeyboardKey.SPACE);

  const press = (code: string) => {
    const event = new KeyboardEvent('keydown', { code, cancelable: true });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  };

  for (const key of Object.values(KeyboardKey)) {
    ok(press(key), `${key} still belongs to the browser`);
  }

  ok(!press('KeyR'), 'every other key is the browser’s, ⌘R included');
});

function sign({ x, y }: { x: number; y: number }) {
  return { x: Math.sign(x), y: Math.sign(y) };
}
