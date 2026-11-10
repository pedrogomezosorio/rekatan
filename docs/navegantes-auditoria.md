**Auditoría de Navegantes — 10 de noviembre de 2026**

Revisión del 11 de noviembre: se ha contrastado de nuevo el montaje inicial de
«A través del desierto» de cuatro jugadores con la página 11, confirmada por el
usuario. Su esquina jugable inferior derecha contiene trigo 12, junto a mineral 6;
la capa exterior de mar se distingue con el borde azul del marco jugable. El lobby
indica si está mostrando el montaje inicial o el opcional, permite restaurar el
inicial y ofrece el dibujo original para compararlo.

Se han añadido las dos cartas originales de la ampliación 5/6, extraídas del PDF:
Gran Puente del norte y Gran Biblioteca. Son maravillas independientes del puente
del sur; tienen sus costes por fase y sus requisitos impresos, y se pueden elegir
y construir desde «Maravillas» durante la partida.

La revisión incluye pruebas de reconexión real con WebSockets, recuperación de
salas tras reiniciar el servidor, recuperación del zoom después de un SVG de
tamaño cero y construcción de ambas cartas con sus costes originales en Chromium.

Se han contrastado los diagramas, tablas de materiales, puertos y apartados de montaje de los dos PDF aportados. Las coordenadas axiales se transcriben por filas en `src/shared/engine/seafarersBoardsData.ts`; el inventario independiente utilizado por las pruebas está en `src/shared/__tests__/fixtures/seafarers-pdf-audit.json`.

La modalidad del mapa es una regla de la sala: 2/3 admite hasta 3 jugadores, 4 admite hasta 4, y 5/6 hasta 6. Se puede empezar con menos ocupantes. Añadir, retirar o conectar jugadores no cambia el tablero ni el montaje opcional escogido.

**Adaptación solicitada: sin desiertos**

Los PDF sí contienen desiertos. Por petición expresa del usuario, todos se sustituyen por un recurso básico y una ficha numerada. Cada sustitución elige el material menos abundante del inventario original; en los empates se priorizan arcilla, mineral, trigo, lana y madera. Se asigna un número no rojo poco repetido. La transcripción conserva los desiertos originales para auditar la fuente y mantener fijas las franjas y marcadores que dependen de su posición.

Las fichas numeradas y aldeas especiales del manual se conservan: los islotes del pueblo perdido siguen inhabitables y las aldeas textiles siguen usando sus números en las intersecciones. Sustituir un desierto no habilita nuevas zonas para fundar poblados.

**Inventario visible del montaje inicial después de las sustituciones**

El mar de esta tabla es exclusivamente el mar jugable del marco. La capa exterior decorativa se dibuja aparte; no añade aristas para barcos, destinos del pirata ni recursos. Los signos de interrogación de Oceanía se contabilizan como niebla.

| Escenario | Modalidad | PDF / páginas | Casillas | Mar | Niebla | Oro | Trigo | Arcilla | Mineral | Lana | Madera | Puertos |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Rumbo a nuevas orillas | 2/3 | base / 4, 5 | 35 | 13 | 0 | 2 | 4 | 4 | 4 | 5 | 3 | 8 |
| Rumbo a nuevas orillas | 4 | base / 4, 5 | 42 | 14 | 0 | 2 | 5 | 6 | 5 | 5 | 5 | 9 |
| Rumbo a nuevas orillas | 5/6 | 56 / 2, 3 | 56 | 16 | 0 | 3 | 7 | 8 | 8 | 7 | 7 | 11 |
| Las cuatro / seis islas | 2/3 | base / 6, 7 | 35 | 15 | 0 | 0 | 4 | 4 | 4 | 4 | 4 | 9 |
| Las cuatro / seis islas | 4 | base / 6, 7 | 35 | 12 | 0 | 0 | 5 | 4 | 4 | 5 | 5 | 9 |
| Las cuatro / seis islas | 5/6 | 56 / 4 | 56 | 24 | 0 | 0 | 6 | 6 | 6 | 7 | 7 | 11 |
| Oceanía | 2/3 | base / 8, 9 | 42 | 16 | 12 | 0 | 2 | 2 | 2 | 4 | 4 | 8 |
| Oceanía | 4 | base / 8, 9 | 42 | 13 | 12 | 0 | 3 | 3 | 3 | 4 | 4 | 9 |
| Oceanía | 5/6 | 56 / 5 | 56 | 14 | 18 | 0 | 5 | 5 | 4 | 5 | 5 | 11 |
| A través del desierto | 2/3 | base / 10, 11 | 35 | 10 | 0 | 2 | 4 | 5 | 5 | 4 | 5 | 8 |
| A través del desierto | 4 | base / 10, 11 | 42 | 12 | 0 | 2 | 6 | 6 | 6 | 5 | 5 | 9 |
| A través del desierto | 5/6 | 56 / 6 | 63 | 20 | 0 | 3 | 8 | 8 | 8 | 8 | 8 | 11 |
| El pueblo perdido | 2/3 | base / 12, 13 | 49 | 19 | 0 | 2 | 6 | 6 | 6 | 5 | 5 | 6 recogibles |
| El pueblo perdido | 4 | base / 12, 13 | 49 | 19 | 0 | 2 | 6 | 6 | 6 | 5 | 5 | 6 recogibles |
| El pueblo perdido | 5/6 | 56 / 7 | 63 | 22 | 0 | 3 | 8 | 8 | 8 | 7 | 7 | 8 recogibles |
| Telas para Catán | 2/3 | base / 14, 15 | 42 | 18 | 0 | 2 | 5 | 5 | 4 | 4 | 4 | 9 |
| Telas para Catán | 4 | base / 14, 15 | 42 | 18 | 0 | 2 | 5 | 5 | 4 | 4 | 4 | 9 |
| Telas para Catán | 5/6 | 56 / 8 | 56 | 24 | 0 | 2 | 6 | 6 | 6 | 6 | 6 | 11 |
| Las islas de los piratas | 2/3 | base / 15, 16, 17 | 49 | 19 | 0 | 2 | 6 | 6 | 6 | 5 | 5 | 8 |
| Las islas de los piratas | 4 | base / 15, 16, 17 | 49 | 19 | 0 | 2 | 6 | 6 | 6 | 5 | 5 | 8 |
| Las islas de los piratas | 5/6 | 56 / 9 | 63 | 26 | 0 | 4 | 7 | 7 | 7 | 6 | 6 | 9 |
| Las maravillas catanas | 2/3 | base / 17, 18 | 49 | 19 | 0 | 2 | 6 | 6 | 6 | 5 | 5 | 9 |
| Las maravillas catanas | 4 | base / 17, 18 | 49 | 19 | 0 | 2 | 6 | 6 | 6 | 5 | 5 | 9 |
| Las maravillas catanas | 5/6 | 56 / 10 | 63 | 24 | 0 | 3 | 7 | 8 | 7 | 7 | 7 | 11 |
| Un nuevo mundo | 2/3 | base / 18, 19 | 42 | 19 | 0 | 0 | 5 | 4 | 4 | 5 | 5 | 10 |
| Un nuevo mundo | 4 | base / 18, 19 | 42 | 19 | 0 | 0 | 5 | 4 | 4 | 5 | 5 | 10 |
| Un nuevo mundo | 5/6 | 56 / 11 | 63 | 21 | 0 | 4 | 8 | 8 | 8 | 7 | 7 | 11 |

Los inventarios de descubrimiento de Oceanía se guardan completos: para 2/3 y 4, 12 hexágonos (2 de mar y 10 de tierra); para 5/6, 18 (3 de mar y 15 de tierra tras sustituir el desierto). Las dos pilas, terrenos y fichas, se mezclan por separado al empezar la partida. Regenerar las islas conocidas conserva dichas pilas.

**Diferencias reales entre las modalidades**

- Los escenarios 1–4 tienen dibujos distintos para 3 y 4 jugadores. El mapa para dos utiliza el dibujo de tres, como adaptación de capacidad de esta aplicación. Las cuatro islas de cuatro jugadores tienen tamaños 8, 7, 4 y 4, tal como están dibujadas; no son cuatro islas iguales.
- Los escenarios 5–8 presentan un único dibujo para 3 y 4 jugadores: ambas modalidades conservan ese mismo mapa. La modalidad sigue imponiendo su límite de plazas.
- Rumbo a nuevas orillas de 5/6 muestra la isla principal en gris: son 30 terrenos del juego básico ampliado, no casillas de niebla. Se proporciona un montaje válido con su inventario y sus seis números rojos separados.
- Un nuevo mundo solo prescribe el marco y los inventarios. Su tierra y mar se mezclan dentro de 42 casillas para 2/3 y 4, o de 63 para 5/6. El mapa reducido no incluye oro ni desiertos en la tabla del PDF.

**Regeneración: límites del apartado 4**

| Escenario | Elementos que cambian | Elementos fijos relevantes |
| --- | --- | --- |
| Rumbo a nuevas orillas | Terrenos y números de la isla principal; todos los hexágonos de las zonas de islotes delimitadas en oscuro, incluido el mar que contienen; tipos de puerto. | Marco, costas de la isla principal y posiciones de puerto. |
| Cuatro / seis islas | Terrenos, números y tipos de puerto. Se evitan 2 y 12 en bosque/pasto. | Siluetas de las islas y aristas de los puertos. |
| Oceanía | Terrenos, números y tipos de puerto de las islas conocidas; se admiten números rojos contiguos. | Siluetas, zonas de niebla e inventarios de descubrimiento. |
| A través del desierto | Terrenos y números en grupos separados de isla principal y territorios exteriores; tipos de puerto. En 5/6 se incluyen los cuatro mares exteriores delimitados. No hay rojos contiguos ni sobre oro. | La franja que sustituye a los desiertos; el resto del mar. |
| El pueblo perdido | Terrenos y números de la isla principal; sus tres terrenos del extremo derecho no reciben 5, 6, 8 ni 9. | Islotes, regalos, cartas y puertos recogibles. |
| Telas para Catán | Terrenos y números de las dos islas principales. | Puertos y 4/6 islotes centrales, con 8/12 aldeas y sus números exactos. |
| Islas de los piratas | Solo tipos de puerto. | Todos los terrenos y números, fortalezas, circuito de 14 mares y casilla segura de 5/6. |
| Maravillas catanas | Terrenos fértiles y números de la isla principal; sin 6/8 junto a la antigua franja de desiertos. | Puertos, islotes, franja sustituida y marcadores de puente/muralla/fundación. |
| Un nuevo mundo | Toda la distribución de tierra/mar, números y puertos. | Marco e inventarios. |

Los diagramas que dibujan puertos sin indicar su tipo se completan con los tipos del inventario del escenario. Los puertos del pueblo perdido son regalos recogibles; no son puertos comerciales activos desde el inicio.

**Comprobaciones**

Se comprueban las 24 variantes con dibujos, sus inventarios y coordenadas, cada arista de puerto, las restricciones y zonas de regeneración, la ausencia de desiertos, la separación del mar decorativo y la capacidad de las salas. Hay comprobaciones adicionales para Un nuevo mundo, las pilas de Oceanía, las aldeas, las fortalezas y la ruta pirata. La suite contiene 152 pruebas. Se han generado además 1.620 montajes aleatorios sin errores de marco, desiertos o números rojos. Se han renderizado las 27 combinaciones en Chromium y comprobado el selector y el llenado de salas de 3 y 6 plazas.

Fuentes: `base` = `CatanNavegantes-Reglas1.pdf` (20 páginas); `56` = `CatanNavegantes56-Reglas.pdf` (12 páginas). Huellas SHA-256 de los archivos revisados:

```text
base 6fa353a8d302a803d83f3d4c61689127cfa494e687b3dc36096699f6a24a6e56
56   8527408950ab58881b65e7636f1c49e11a0488fb2abe7dc7aa7e1c415b29e297
```
