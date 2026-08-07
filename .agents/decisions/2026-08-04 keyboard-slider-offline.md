# 2026-08-04 — Teclado, slider y offline, de una tacada

Tres planes pequeños e independientes, hechos a la vez. Commits `3dc89a2`
(teclado), `c26d190` (slider), `0ec937f` (offline). Sin revisar por un humano.

## Conducir un boid con las flechas

`keyboardControl(target)` es una fuerza más, aplicada con `steer` antes de
`move`, así que la celda conducida respeta `MAX_FORCE` y `MAX_SPEED` y sigue
haciendo flocking, chocando y dando la vuelta al mundo.

`src/user.ts` era el bloqueante y se arregló entero antes: `keyup` y un `Set` de
teclas mantenidas detrás de `isKeyDown`, teclas identificadas por `event.code` en
vez del `keyCode` deprecado, el `undefined.forEach` de una tecla sin listeners, y
el vaciado en `blur` (alt-tab con una flecha pulsada no entrega nunca su `keyup`).

**Decisión no prevista por el plan**: `keyboardControl` recibe el lector de
teclas como segundo parámetro, con `isKeyDown` por defecto. Sin eso la historia
de usuario tendría que sintetizar eventos de teclado contra el `document` de
jsdom para probar un cálculo de vectores.

## El slider de tamaño

**Opción (b) del plan: multiplica lo dibujado, no la simulación.** `vision` se
calcula una sola vez en `createCell`; un slider que tocara `radius` dejaría
celdas dibujadas diminutas mirando, volando en grupo y chocando a diez de sus
radios viejos. Se leería como "el slider está roto" sin que ningún fotograma
estuviera mal.

Dos cosas que el plan solo insinuaba y que hacen falta: el margen del redibujado
en los bordes escala también, o con el slider arriba las celdas dejan de
reflejarse al otro lado; y el grosor del trazo escala con suelo de un píxel, o a
tamaño pequeño una celda es todo contorno y nada de cuerpo.

## Offline

**El subpath era el punto delicado, y el plan lo avisaba.** El sitio se publica
en `amatiasq.github.io/flocking/`, y ni sanremo ni lulas tienen ese problema: sus
scripts asumen la raíz del dominio. Aquí las URLs del precache son relativas al
scope del worker y el registro es `'./sw.js'`, relativo a la página —
`new URL('sw.js', import.meta.url)` habría resuelto a `assets/sw.js`, que no
existe.

### Verificado sin red de verdad

"Una build verde no prueba nada aquí". Servido bajo `/flocking/` con
`python3 -m http.server` y cargado en Chromium vía Playwright: worker activo con
el scope correcto, caché `flocking-<hash>` con las tres URLs, y tras
`setOffline(true)` + recarga el canvas y el slider siguen ahí con píxeles
pintados (o sea, el bundle se ejecutó) y cero errores. En `vite dev`, cero
workers registrados.

## Lo que no se hizo

El "later" del plan del teclado — el mismo control en el simulador de
presa/depredador — es de `lulas`, no de aquí. Y el slider no tiene etiqueta ni
panel, que es exactamente lo que pedía el plan.
