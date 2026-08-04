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

/**
 * A number, branded so one cannot be passed where a plain number is meant.
 *
 * It used to be declared as the string literal `'[number CellId]'` while
 * holding a number forced through `as any` — the type said one thing, the
 * runtime held another, and the cast switched off the checking that would have
 * said so. Anything that trusted the type (a string operation on an id) was
 * wrong and compiled anyway.
 */
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

/**
 * The next frame's copy of a cell. Deep on the three mutable vectors and only
 * those: `{ ...cell }` shares them with the previous frame, so a behaviour that
 * writes `position.x` in place scribbles on the very cell `look()` is still
 * handing to everyone else in the same pass. Kept here, next to `Cell`, so the
 * copy list cannot drift from the shape.
 */
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

export function renderCell(
  context: CanvasRenderingContext2D,
  { size }: World,
  cell: Cell,
) {
  const renderRadius = cell.radius + 10;
  const { position: pos } = cell;

  renderAt(context, cell);

  if (pos.x - renderRadius < 0) {
    renderAt(context, cell, { x: pos.x + size.x, y: pos.y });
  }
  if (pos.x + renderRadius > size.x) {
    renderAt(context, cell, { x: pos.x - size.x, y: pos.y });
  }

  if (pos.y - renderRadius < 0) {
    renderAt(context, cell, { x: pos.x, y: pos.y + size.y });
  }
  if (pos.y + renderRadius > size.y) {
    renderAt(context, cell, { x: pos.x, y: pos.y - size.y });
  }
}

function renderAt(
  context: CanvasRenderingContext2D,
  cell: Cell,
  pos = cell.position,
) {
  context.save();
  context.translate(pos.x, pos.y);

  context.rotate(radians(cell.velocity) + ANGLE_CORRECTION);
  context.beginPath();

  // A drop, not a disc: three quarters of a circle, then a corner where the
  // remaining quarter would be. Rotated by the heading, that corner is the nose,
  // and the flock reads as a direction instead of as confetti.
  context.arc(0, 0, cell.radius, 0, Math.PI * 1.5);
  context.lineTo(cell.radius, -cell.radius);

  context.closePath();
  context.lineWidth = 5;

  // Each cell outlined in its own colour, filled with the same colour darkened.
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
