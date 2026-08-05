# Los tres planes pendientes de flocking, de una tacada

**Estado**: hecho, sin revisar por un humano. Commits `3dc89a2` (teclado),
`c26d190` (slider), `0ec937f` (offline). 76 tests en verde, build limpio.

Ejecuta `plans/keyboard-controlled-boid.md`, `plans/boid-size-slider.md` y
`plans/offline-sw.md`, que se van los tres a la vez porque son independientes y
pequeños.

## Conducir un boid con las flechas

Tal cual lo planteaba el plan: `keyboardControl(target)` es una fuerza más,
aplicada con `steer` antes de `move`, así que la celda conducida respeta
`MAX_FORCE` y `MAX_SPEED` y sigue haciendo flocking, chocando y dando la vuelta
al mundo.

`src/user.ts` era el bloqueante y se arregló entero antes: `keyup` y un `Set` de
teclas mantenidas detrás de `isKeyDown`, las teclas identificadas por
`event.code` en vez del `keyCode` deprecado, el `undefined.forEach` de una tecla
sin listeners, y el vaciado en `blur` (alt-tab con una flecha pulsada no entrega
nunca su `keyup`).

**Decisión no prevista por el plan**: `keyboardControl` recibe el lector de
teclas como segundo parámetro, con `isKeyDown` por defecto. Sin eso la historia
de usuario tendría que sintetizar eventos de teclado contra el `document` de
jsdom para probar un cálculo de vectores. La producción sigue escribiendo
`keyboardControl(player.id)`.

La celda conducida es la primera, blanca y de radio 25 — más que cualquier
aleatoria (`random(5, 20)`) — porque si no, no se sabe cuál se está llevando.

## El slider de tamaño

**Opción (b) del plan: multiplica lo dibujado, no la simulación.** `vision` se
calcula una sola vez en `createCell` y no lo recalcula nadie; un slider que
tocara `radius` dejaría celdas dibujadas diminutas mirando, volando en grupo y
chocando a diez de sus radios viejos. Se leería como "el slider está roto" sin
que ningún fotograma estuviera mal.

Queda escrito en `AGENTS.md` junto a la línea de `vision`, que era literalmente
el paso 1 del plan: esa línea enunciaba una invariante que un slider de tipo (a)
habría convertido en mentira.

Dos cosas que el plan solo insinuaba y que hacen falta:

- el margen del redibujado en los bordes (`cell.radius + 10`) escala también, o
  con el slider arriba las celdas dejan de reflejarse al otro lado;
- el grosor del trazo escala con suelo de un píxel, o a tamaño pequeño una celda
  es todo contorno y nada de cuerpo.

## Offline

`amq/amq-flocking-build-sw`, encadenado en `bun run build`, registrado detrás de
`import.meta.env.PROD`.

**El subpath era el punto delicado, y el plan lo avisaba.** El sitio se publica
en `amatiasq.github.io/flocking/`. Ni sanremo ni lulas tienen ese problema y sus
scripts asumen la raíz del dominio, así que aquí:

- todas las URLs del precache son relativas y se resuelven contra
  `self.registration.scope`;
- el registro es `'./sw.js'`, relativo a la página. `new URL('sw.js',
  import.meta.url)` habría resuelto a `assets/sw.js`, dentro del bundle, que no
  existe.

El hash de la caché cubre lista **y contenidos**, como el de lulas y al
contrario que el de sanremo: `index.html` conserva un nombre estable.

### Verificado sin red de verdad

El plan dice "una build verde no prueba nada aquí", y tiene razón. Servido bajo
`/flocking/` con `python3 -m http.server`, cargado en Chromium (el de
`soliluna`, vía Playwright), `context.setOffline(true)` y recarga:

- worker activo con scope `http://localhost:8877/flocking/`;
- caché `flocking-<hash>` con las tres URLs (`/flocking/`,
  `/flocking/index.html`, el bundle);
- tras la recarga sin red: canvas presente, slider presente, píxeles pintados
  (es decir, el bundle se ejecutó), cero errores de página.

Y en `vite dev`, cero workers registrados.

## Lo que no se ha hecho

- El "later" del plan del teclado — llevar el mismo control al simulador de
  presa/depredador — es de `lulas`, no de aquí.
- El slider no tiene etiqueta ni panel, que es exactamente lo que pedía el plan.
