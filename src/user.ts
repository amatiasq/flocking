const keyListeners: { [key: string]: Listener[] } = {};
const keysDown = new Set<KeyboardKey>();

/** `KeyboardEvent.code` values: the physical key, so it does not move with the layout. */
export enum KeyboardKey {
  SPACE = 'Space',
  ARROW_UP = 'ArrowUp',
  ARROW_DOWN = 'ArrowDown',
  ARROW_LEFT = 'ArrowLeft',
  ARROW_RIGHT = 'ArrowRight',
  D = 'KeyD',
}

export function onKeyPress(key: KeyboardKey, action: Listener) {
  initKeyboardDetection();

  const list = keyListeners[key] || [];
  list.push(action);
  keyListeners[key] = list;
}

// Held right now, unlike `onKeyPress`: steering off key repeats is jerky and
// depends on the OS's repeat rate.
export function isKeyDown(key: KeyboardKey): boolean {
  initKeyboardDetection();
  return keysDown.has(key);
}

/** The keys the simulation drives with — the ones it must take from the page. */
const HANDLED_KEYS = new Set<string>(Object.values(KeyboardKey));

function initKeyboardDetection() {
  document.addEventListener('keydown', (event) => {
    // The arrows scroll and space pages down, so unclaimed the browser wins and
    // the page slides instead of the cell. Unmodified only: `d` is ours, `⌘D`
    // bookmarks.
    const modified = event.metaKey || event.ctrlKey || event.altKey;
    if (!modified && HANDLED_KEYS.has(event.code)) event.preventDefault();

    keysDown.add(event.code as KeyboardKey);
    // A key nobody registered has no list.
    keyListeners[event.code]?.forEach((listener) => listener());
  });

  document.addEventListener('keyup', (event) =>
    keysDown.delete(event.code as KeyboardKey),
  );

  // Alt-tabbing while holding a key never delivers its `keyup`.
  window.addEventListener('blur', () => keysDown.clear());

  // @ts-ignore
  initKeyboardDetection = () => {};
}

type Listener = () => void;
