import { Rectangle } from '@amatiasq/geometry';
import { Cell } from './cell';
import { magnitude } from './vector';

// The measuring lives here and the DOM stays in `index.ts`, so a spec can reach
// all of it. A deliberate copy of `lulas/src/debug.ts`, not shared code: the two
// simulations have nothing else in common and watch different numbers.
export interface DebugStats {
  /** Animation frames per second — what the browser draws, not what it simulates. */
  fps: number;
  /** Milliseconds one simulation step costs, averaged. 0 before the first one. */
  msPerTick: number;
  cells: number;
  /** Pixels per tick. Collisions trade velocity, so a packed flock runs slow. */
  averageSpeed: number;
}

const PANEL_MARGIN = 12;
const PANEL_PADDING = 10;
const PANEL_WIDTH = 180;
const LINE_HEIGHT = 15;
const FONT = '12px ui-monospace, SFMono-Regular, Menlo, monospace';

// Dim on purpose: a hundred boxes must not outshine the cells under them.
const QUADRANT_COLOR = 'rgba(120, 160, 255, 0.28)';

const PANEL_BACKGROUND = 'rgba(0, 0, 0, 0.72)';
const PANEL_BORDER = '#333333';
const LABEL_COLOR = '#8c8c8c';
const VALUE_COLOR = '#e8e8e8';

/** A rolling mean, so a single slow frame does not make the panel jump. */
export function rollingAverage(size = 30) {
  const samples: number[] = [];

  return {
    add(value: number) {
      samples.push(value);
      if (samples.length > size) samples.shift();
    },
    get value() {
      if (samples.length === 0) return 0;
      return samples.reduce((total, sample) => total + sample, 0) / samples.length;
    },
  };
}

// Averaged over the frame gaps, not counted per second: a count needs a whole
// second to say anything, and the panel is opened to watch a number move.
export function fpsMeter(size = 30) {
  const gaps = rollingAverage(size);
  let previous = 0;

  return {
    sample(now: number) {
      // The first timestamp is a gap from nothing.
      if (previous) gaps.add(now - previous);
      previous = now;
    },
    get fps() {
      return gaps.value ? 1000 / gaps.value : 0;
    },
  };
}

export function averageSpeed(cells: Cell[]) {
  if (cells.length === 0) return 0;

  const total = cells.reduce((sum, cell) => sum + magnitude(cell.velocity), 0);
  return total / cells.length;
}

// The panel's text, apart from the drawing, so what it says needs no canvas.
export function debugRows(stats: DebugStats): [string, string][] {
  return [
    ['fps', Math.round(stats.fps).toString()],
    ['tick', `${stats.msPerTick.toFixed(2)} ms`],
    ['cells', stats.cells.toString()],
    ['speed', `${stats.averageSpeed.toFixed(2)} px`],
  ];
}

// Where the tree divided is invisible from the outside — `look` answers the same
// either way — so this is the only way to see the index working.
export function renderQuadrants(
  context: CanvasRenderingContext2D,
  quadrants: Rectangle[],
) {
  context.save();
  context.strokeStyle = QUADRANT_COLOR;
  context.lineWidth = 1;

  for (const { left, top, width, height } of quadrants) {
    context.strokeRect(left, top, width, height);
  }

  context.restore();
}

export function renderDebugPanel(
  context: CanvasRenderingContext2D,
  stats: DebugStats,
) {
  const rows = debugRows(stats);
  const height = PANEL_PADDING * 2 + rows.length * LINE_HEIGHT;

  context.save();

  context.fillStyle = PANEL_BACKGROUND;
  context.strokeStyle = PANEL_BORDER;
  context.lineWidth = 1;
  context.fillRect(PANEL_MARGIN, PANEL_MARGIN, PANEL_WIDTH, height);
  context.strokeRect(PANEL_MARGIN, PANEL_MARGIN, PANEL_WIDTH, height);

  context.font = FONT;
  context.textBaseline = 'top';

  const left = PANEL_MARGIN + PANEL_PADDING;
  const right = PANEL_MARGIN + PANEL_WIDTH - PANEL_PADDING;

  rows.forEach(([label, value], i) => {
    const y = PANEL_MARGIN + PANEL_PADDING + i * LINE_HEIGHT;

    context.textAlign = 'left';
    context.fillStyle = LABEL_COLOR;
    context.fillText(label, left, y);

    // Right-aligned, or a changing number shuffles the whole row sideways.
    context.textAlign = 'right';
    context.fillStyle = VALUE_COLOR;
    context.fillText(value, right, y);
  });

  context.restore();
}
