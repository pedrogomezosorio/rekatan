# Arte de componentes de Catan

La extracción se ejecutó con `scripts/extract-catan-assets.py`, después de revisar
visualmente las 28 páginas de `252848213-Cartas-de-Colonos-de-Catan-para-imprimir.pdf`.
El PDF no se incorpora al repositorio.

## Fase 1: extracción y preparación

El PDF **contiene cartas, pero no contiene hexágonos de terreno ni fichas numéricas**.
No se atribuyen a ese documento imágenes que no aparecen en él.

| Directorio | Contenido | Procedencia |
| --- | --- | --- |
| `public/assets/resources/` | 5 recursos, papel, tela, moneda y reverso | Páginas 1, 6 y 17 del PDF |
| `public/assets/devcards/` | 5 tipos, 5 edificios de victoria, reverso y 2 premios | Páginas 11–13 del PDF |
| `public/assets/cities-knights/progress/` | Los 25 tipos de progreso y sus 3 reversos | Páginas 21–26 del PDF |
| `public/assets/terrains/` | Bosque, colinas, pastos, campos, montañas y desierto | PNG transparentes que ya existían en el proyecto; conservados |
| `public/assets/tokens/2.png` … `12.png` | Discos transparentes con número y puntos de probabilidad | Recreación con Pillow; **no son recortes oficiales** |

Son 50 imágenes de cartas extraídas, 11 fichas recreadas y 6 terrenos existentes
validados. El 7 se incluye como recurso gráfico, pero no se asigna a terrenos.
Los 6 y 8 y sus cinco puntos se dibujan en rojo.

Las cartas se recortan de los mapas de bits incrustados, sin rasterizar la página
completa ni aumentar artificialmente la resolución. Cada frente tiene unos
151–152 × 227 píxeles: esa es la resolución disponible en el documento. Se retiran
los márgenes de impresión de los reversos y se aplica una máscara de transparencia
a las esquinas, conservando las zonas blancas del dibujo y del texto.

`public/assets/catan-assets-manifest.json` registra el SHA-256 del PDF, página,
rectángulo de recorte en píxeles nativos, dimensiones y SHA-256 de cada PNG. También
distingue `pdf`, `existing-repository` y `recreated`. El script verifica el documento
antes de aplicar los recortes para evitar usar estas coordenadas en otro archivo.

Para repetirlo desde la raíz del repositorio:

```sh
python3 -m venv .venv-assets
.venv-assets/bin/python -m pip install -r scripts/requirements-assets.txt
.venv-assets/bin/python scripts/extract-catan-assets.py \
  "/ruta/252848213-Cartas-de-Colonos-de-Catan-para-imprimir.pdf" \
  --preview /tmp/catan-assets-contact.png
```

Para reproducir las fichas con la misma tipografía en otra plataforma, utiliza
`--font /ruta/Georgia\ Bold.ttf`. El manifiesto identifica la fuente utilizada y su
hash. Existe una alternativa automática con DejaVu Serif Bold en Linux.
`--output /ruta/assets` permite extraer a otro destino; los terrenos solo se
validan si ya están presentes allí.

## Fase 2: integración React

- `src/shared/constants.ts` centraliza terrenos, recursos, mercancías, desarrollo,
  progreso, reversos y números. La versión de las URL renueva la caché del arte.
- `Hexagon.tsx` usa la textura con `<image>` y recorte hexagonal SVG; se elimina la
  base de color según recurso y se conserva la proporción con `xMidYMid slice`.
  Mar, niebla y señales de selección/producción conservan su comportamiento.
- `NumberToken.tsx` sustituye círculo, texto y puntos SVG por un PNG transparente.
  Su etiqueta accesible comunica número y probabilidad; el conflicto entre 6/8
  adyacentes conserva su aro de aviso.
- `ResourceHandFan.tsx` utiliza las ocho cartas PNG con proporción 2:3 y
  `object-contain`. Conserva el abanico, agrupación, animación, hover y ampliación
  táctil; las cartas también se pueden enfocar con teclado.
- `GameModals.tsx` muestra las caras de desarrollo sin deformarlas y mantiene el
  nombre, efecto y botón de juego debajo. El diálogo y cada carta tienen etiquetas
  accesibles. Se corrige también el cierre tras abrir el selector de Monopolio o
  Descubrimiento: la transición anterior podía dejar una capa invisible que
  bloqueaba los controles del tablero.
- `CitiesKnightsPanel.tsx` usa el arte de los 25 progresos, sus efectos legibles y
  los tres reversos; se reemplazan las anteriores ilustraciones SVG planas.
- `GameScreen.tsx` y `OverlayAnimations.tsx` consumen los mismos reversos y rutas
  para que el mazo y la recogida de recursos coincidan con las cartas de la mano.
  La mano compacta de móvil también usa los PNG, con cantidades y nombres accesibles.

El menú principal y las reglas del motor no se modifican.

## Verificación

- Compilación de producción correcta y 266 pruebas existentes superadas.
- Los 67 PNG del manifiesto tienen dimensiones, hashes y transparencia verificados.
- Una segunda extracción genera los mismos hashes para los 61 PNG preparados.
- Revisión con Chromium a 390, 768 y 1440 píxeles, en base y Ciudades y Caballeros:
  texturas hexagonales, 18 fichas del tablero base, cinco u ocho recursos según
  modalidad, desarrollo/progreso, ampliación táctil del abanico en tablet y zoom
  después de cerrar los paneles. Sin imágenes ausentes ni errores de JavaScript.
