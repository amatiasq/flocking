/* istanbul ignore file */

import { flocking } from './behaviors/flocking';
import { keyboardControl } from './behaviors/keyboardControl';
import { move } from './behaviors/move';
import { roundMap } from './behaviors/roundMap';
import { solidBody } from './behaviors/solidBody';
import { createCell, logCell } from './cell';
import { Color, randomColor } from './color';
import { fpsMeter } from './debug';
import simulation from './simulation';
import { random } from './math';
import { vector } from './vector';
import { KeyboardKey, onKeyPress } from './user';

// Above `start()`, which runs at import time: functions hoist, a `const` does
// not, so declared below the slider would read it before it exists and throw.
const SIZE_STORAGE_KEY = 'flocking:display-scale';

setStyles();
start();
registerServiceWorker();

setTimeout(() => {
  document.body.style.backgroundColor = 'black';
});

function start() {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Block, or the inline line box adds a few pixels under it — see `setStyles`.
  canvas.style.display = 'block';

  const center = vector(canvas.width / 2, canvas.height / 2);
  const createRandomCell = (i: number) =>
    createCell({
      position: { ...center },
      velocity: vector(random(10), random(10)),
      radius: random(5, 20),
      color: randomColor(),
    });

  const cells = array(50, createRandomCell);

  // The one the arrows drive: white and bigger than any random cell, so you can
  // tell which one you are steering.
  const [player] = cells;
  player.color = '#ffffff' as Color;
  player.radius = 25;

  const game = simulation({
    canvas,
    cells,
    // Order is the physics: forces first, `move`, then the position fixups.
    behaviors: [
      keyboardControl(player.id),
      flocking,
      move,
      solidBody,
      roundMap,
    ],
  });

  console.log('Initial state');
  logState();

  let isPaused = false;
  onKeyPress(KeyboardKey.SPACE, () => (isPaused = !isPaused));

  let isDebug = false;
  onKeyPress(KeyboardKey.D, () => (isDebug = !isDebug));

  const sizeSlider = createSizeSlider();
  const fps = fpsMeter();

  game.render(sizeSlider.value);
  requestAnimationFrame(function frame(now) {
    fps.sample(now);

    if (!isPaused) {
      game.step();
    }

    // `undefined` hides the overlay; passing the fps is how it is asked for.
    game.render(sizeSlider.value, isDebug ? fps.fps : undefined);
    requestAnimationFrame(frame);
  });

  function logState() {
    console.log(game.cells.map(logCell).join('\n'));
  }
}

// Production only: in dev a worker serves stale modules. The URL is relative to
// the PAGE because the site lives under a subpath — `/sw.js` would look at the
// origin root and `import.meta.url` would resolve inside `assets/`.
function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js');
  });
}

// Scales the picture, never the simulation: `radius` and `vision` never change.
// Down is where it is interesting — at 0.2 the swarm reads as a flock.
function createSizeSlider() {
  const input = document.createElement('input');

  input.type = 'range';
  input.min = '0.1';
  input.max = '2';
  input.step = '0.05';
  input.value = localStorage.getItem(SIZE_STORAGE_KEY) || '1';

  Object.assign(input.style, {
    position: 'fixed',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    writingMode: 'vertical-lr',
    direction: 'rtl',
    height: '40vh',
    // The body turns black a tick after load; the default thumb is invisible on it.
    accentColor: 'white',
    background: 'none',
    zIndex: '1',
  });

  input.addEventListener('input', () =>
    localStorage.setItem(SIZE_STORAGE_KEY, input.value),
  );

  document.body.appendChild(input);

  return {
    get value() {
      return Number(input.value);
    },
  };
}

function array<T>(size: number, operator: (pos: number) => T): T[] {
  return Array(size)
    .fill(null)
    .map((_, i) => i + 1)
    .map(operator);
}

function setStyles() {
  const fullscreen = {
    margin: 0,
    padding: 0,
    height: '100%',
    // The canvas's inline line box makes the page a few pixels too tall, and a
    // page that scrolls eats the arrow keys.
    overflow: 'hidden',
  };

  for (const el of [document.documentElement, document.body]) {
    Object.assign(el.style, fullscreen);
  }
}
