import { lowerColor, Color } from './color';
import {
  DEFAULT_RADIUS,
  DEFAULT_VISION_FACTOR,
  MAX_FORCE,
} from './CONFIGURATION';
import { World } from './simulation';
import {
  logVector,
  magnitude,
  radians,
  subtractVectors,
  Vector,
  vector,
  limitVector,
} from './vector';

const ANGLE_CORRECTION = Math.PI / 4;

/** A number, branded so one cannot be passed where a plain number is meant. */
export type CellId = number & { readonly __brand: 'CellId' };

let lastId = 0;

function getNextId(): CellId {
  return lastId++ as CellId;
}

export interface Cell {
  id: CellId;
  color: Color;
  position: Vector;
  velocity: Vector;
  acceleration: Vector;
  radius: number;
  vision: number;
}

export function createCell(partial?: Partial<Cell>): Cell {
  return {
    id: getNextId(),
    color: '#ffffff' as Color,
    position: vector(0),
    velocity: vector(0),
    acceleration: vector(0),
    radius: DEFAULT_RADIUS,
    vision:
      (partial && partial.radius ? partial.radius : DEFAULT_RADIUS) *
      DEFAULT_VISION_FACTOR,
    ...partial,
  };
}

// Deep on the three mutable vectors: `{ ...cell }` shares them with the previous
// frame, which `look()` is still handing to everyone else in the same pass.
export function cloneCell(cell: Cell): Cell {
  return {
    ...cell,
    position: { ...cell.position },
    velocity: { ...cell.velocity },
    acceleration: { ...cell.acceleration },
  };
}

export function applyForce(cell: Cell, force: Vector) {
  cell.acceleration.x += force.x;
  cell.acceleration.y += force.y;
}

export function steer(cell: Cell, direction: Vector) {
  const steering = subtractVectors(direction, cell.velocity);
  applyForce(cell, limitVector(steering, MAX_FORCE));
}

export function cellDistance(left: Cell, right: Cell) {
  return magnitude(subtractVectors(left.position, right.position));
}

// `displayScale` multiplies the drawn size and nothing else: `radius` and
// `vision` are untouched, so the simulation is identical at every setting.
export function renderCell(
  context: CanvasRenderingContext2D,
  { size }: World,
  cell: Cell,
  displayScale = 1,
) {
  // Decides when a cell near an edge is mirrored on the other side, so it has
  // to cover what is actually drawn.
  const renderRadius = cell.radius * displayScale + 10;
  const { position: pos } = cell;

  renderAt(context, cell, displayScale);

  if (pos.x - renderRadius < 0) {
    renderAt(context, cell, displayScale, { x: pos.x + size.x, y: pos.y });
  }
  if (pos.x + renderRadius > size.x) {
    renderAt(context, cell, displayScale, { x: pos.x - size.x, y: pos.y });
  }

  if (pos.y - renderRadius < 0) {
    renderAt(context, cell, displayScale, { x: pos.x, y: pos.y + size.y });
  }
  if (pos.y + renderRadius > size.y) {
    renderAt(context, cell, displayScale, { x: pos.x, y: pos.y - size.y });
  }
}

function renderAt(
  context: CanvasRenderingContext2D,
  cell: Cell,
  displayScale: number,
  pos = cell.position,
) {
  const radius = cell.radius * displayScale;

  context.save();
  context.translate(pos.x, pos.y);

  context.rotate(radians(cell.velocity) + ANGLE_CORRECTION);
  context.beginPath();

  // A drop, not a disc: rotated by the heading, the corner is a nose, and the
  // flock reads as a direction instead of as confetti.
  context.arc(0, 0, radius, 0, Math.PI * 1.5);
  context.lineTo(radius, -radius);

  context.closePath();
  // Scaled too, or at small sizes a cell is all outline and no body.
  context.lineWidth = Math.max(1, 5 * displayScale);

  context.strokeStyle = cell.color;
  context.fillStyle = lowerColor(cell.color, 0.5);
  context.stroke();
  context.fill();

  context.restore();
}

export function logCell(cell: Cell) {
  return `Cell(${cell.id}) ${cell.radius} { pos: ${logVector(
    cell.position,
  )}, vel: ${logVector(cell.velocity)} }`;
}
