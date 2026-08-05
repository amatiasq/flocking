import { Vector, vector } from './vector';

const mouseDownListeners: Listener[] = [];
const mouseUpListeners: Listener[] = [];
const keyListeners: { [key: string]: Listener[] } = {};
const keysDown = new Set<KeyboardKey>();

let mouse = vector(0);

export enum MouseButton {
  LEFT,
  MIDDLE,
  RIGHT,
}

/** `KeyboardEvent.code` values: the physical key, so it does not move with the layout. */
export enum KeyboardKey {
  SPACE = 'Space',
  ARROW_UP = 'ArrowUp',
  ARROW_DOWN = 'ArrowDown',
  ARROW_LEFT = 'ArrowLeft',
  ARROW_RIGHT = 'ArrowRight',
  D = 'KeyD',
}

export function onClick(activate: Listener, deactivate: Listener) {
  initMouseDetection();
}

export function onKeyPress(key: KeyboardKey, action: Listener) {
  initKeyboardDetection();

  const list = keyListeners[key] || [];
  list.push(action);
  keyListeners[key] = list;
}

/**
 * Whether the key is held right now, as opposed to `onKeyPress`, which fires
 * once per press. Steering needs the held state: one nudge per key repeat is
 * jerky and depends on the OS's repeat rate.
 */
export function isKeyDown(key: KeyboardKey): boolean {
  initKeyboardDetection();
  return keysDown.has(key);
}

function initMouseDetection() {
  document.addEventListener('mousedown', () =>
    emit(mouseDownListeners, { mouse }),
  );
  document.addEventListener('mouseup', () => emit(mouseUpListeners, { mouse }));
  document.addEventListener(
    'mousemove',
    (event) => (mouse = vector(event.clientX, event.clientY)),
  );

  // @ts-ignore
  initMouseDetection = () => {};
}

/** The keys the simulation drives with — the ones it must take from the page. */
const HANDLED_KEYS = new Set<string>(Object.values(KeyboardKey));

function initKeyboardDetection() {
  document.addEventListener('keydown', (event) => {
    // The arrows scroll and space pages down. They are exactly the keys this
    // steers with, so without claiming them the browser wins: you press right
    // and the page slides instead of the cell. Only the keys in `KeyboardKey` —
    // every other one is the browser's.
    //
    // And only unmodified: `d` toggles the debug overlay but `⌘D` bookmarks the
    // page, and taking a shortcut the simulation does not use is a bug of its
    // own.
    const modified = event.metaKey || event.ctrlKey || event.altKey;
    if (!modified && HANDLED_KEYS.has(event.code)) event.preventDefault();

    keysDown.add(event.code as KeyboardKey);
    emit(keyListeners[event.code], { mouse });
  });

  document.addEventListener('keyup', (event) =>
    keysDown.delete(event.code as KeyboardKey),
  );

  // Alt-tabbing while holding a key never delivers its `keyup`, so without this
  // the key stays down forever.
  window.addEventListener('blur', () => keysDown.clear());

  // @ts-ignore
  initKeyboardDetection = () => {};
}

function emit(listeners: Listener[] | undefined, event: Event) {
  // A key nobody registered has no list. With only SPACE registered and nothing
  // else taking focus this never fired, but it was a TypeError waiting for the
  // first stray keystroke.
  if (!listeners) {
    return;
  }

  listeners.forEach((x) => x(event));
}

type Listener = (event: Event) => void;

interface Event {
  mouse: Vector;
}
