// Wraps Vitest's global `test` to add the table-driven signature the specs use,
// which Vitest has no equivalent for. Specs import `test` from here, not vitest.

type TestRun<T extends any[]> = (...args: T) => Promise<any> | void;

// Specs branch on this to pick the jsdom/canvas-mock path. Always true.
export const isJestTesting = true;

export function test(message: string, run: TestRun<[]>): void;
export function test<T extends any[]>(
  message: string,
  table: T[],
  run: TestRun<T>,
): void;
export function test<T extends any[]>(
  message: string,
  first: TestRun<[]> | T[],
  second?: TestRun<T>,
): void {
  const runnerTest = (globalThis as any).test as (
    name: string,
    fn: TestRun<[]>,
  ) => void;
  const table = Array.isArray(first) ? first : null;
  const run = (table ? second : first) as TestRun<any>;

  if (table) {
    table.forEach((row, i) =>
      runnerTest(`${message} [${i}]`, () => run(...row)),
    );
  } else {
    runnerTest(message, run as TestRun<[]>);
  }
}

// A no-op kept so the specs need no editing: Vitest groups by file itself.
export function setFilename(_dirname: string, _filename: string): void {}
