// Aliased over the `assert` module (see vite.config.ts) because the npm polyfill
// drags in `process`, undefined in the browser bundle. Only what the specs use.

export class AssertionError extends Error {
  constructor(message?: string) {
    super(message || 'Assertion failed');
    this.name = 'AssertionError';
  }
}

function assert(value: unknown, message?: string): asserts value {
  if (!value) throw new AssertionError(message);
}

export function ok(value: unknown, message?: string): asserts value {
  assert(value, message);
}

// Node's assert.equal uses loose (`==`) comparison; match that.
export function equal(actual: unknown, expected: unknown, message?: string) {
  assert(actual == expected, message ?? `${actual} == ${expected}`);
}

export function notEqual(actual: unknown, expected: unknown, message?: string) {
  assert(actual != expected, message ?? `${actual} != ${expected}`);
}

// Enough for the shapes the specs compare: no cycles, no Map/Set, no prototypes.
export function deepStrictEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
) {
  assert(
    isDeepEqual(actual, expected),
    message ?? `${JSON.stringify(actual)} deepEquals ${JSON.stringify(expected)}`,
  );
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;

  return keys.every((key) =>
    isDeepEqual((a as any)[key], (b as any)[key]),
  );
}

assert.ok = ok;
assert.equal = equal;
assert.notEqual = notEqual;
assert.deepStrictEqual = deepStrictEqual;
assert.AssertionError = AssertionError;

export default assert;
