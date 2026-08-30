# 2026-08-04 — Teclado, slider y offline, de una tacada

Tres planes pequeños hechos a la vez, en producción sin revisar por un humano.
Commits `3dc89a2` (teclado), `c26d190` (slider), `0ec937f` (offline).

- **`keyboardControl(target)` es una fuerza más**, con `steer` antes de `move`,
  y recibe el lector de teclas como segundo parámetro (`isKeyDown` por defecto):
  si no, la historia de usuario tendría que sintetizar eventos contra jsdom.
- `src/user.ts` era el bloqueante: sin `keyup`, con `keyCode` deprecado y **sin
  vaciar en `blur`** — alt-tab con una flecha pulsada no entrega su `keyup`.
- Del slider, que multiplica lo dibujado: **el margen del redibujado en los
  bordes escala también**, o las celdas dejan de reflejarse al otro lado, y el
  trazo escala con suelo de un píxel.
- **El sitio se publica en un subpath** (`amatiasq.github.io/flocking/`), al
  revés que sanremo y lulas: el precache va relativo al scope y el registro es
  `'./sw.js'`, porque `new URL('sw.js', import.meta.url)` daría `assets/sw.js`.
