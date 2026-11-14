# Rekatan v2.2.0 — Ciudades y Caballeros & Navegantes (Edición Interactiva)

> **Versión:** `v2.2.0`  
> **Fecha:** 14 de noviembre de 2026  
> **Versión Web:** [rekatan.onrender.com](https://rekatan.onrender.com)  
> **Pruebas verificadas:** 266/266 tests (`vitest run`) y build de producción (`tsc -b && vite build`)

---

## 📦 Descargas de Escritorio

| Plataforma | Paquete | Archivo |
| :--- | :--- | :--- |
| **macOS (Apple Silicon M1/M2/M3/M4)** | Instalador DMG | `Catan Tabletop-2.2.0-arm64.dmg` |
| **macOS (Apple Silicon M1/M2/M3/M4)** | Aplicación comprimida (ZIP) | `Catan Tabletop-2.2.0-arm64-mac.zip` |
| **Windows (x64)** | Instalador estándar (NSIS) | `Catan Tabletop Setup 2.2.0.exe` |
| **Windows (x64)** | Ejecutable Portable | `Catan Tabletop 2.2.0.exe` |

> **Nota de instalación:**
> - **Windows:** Si SmartScreen muestra una advertencia de editor desconocido, pulsa *Más información* → *Ejecutar de todas formas*.
> - **macOS:** Si macOS bloquea la apertura por no contar con notarización comercial, ve a *Ajustes del Sistema > Privacidad y Seguridad* → *Abrir de todos modos*, o ejecuta:
>   ```bash
>   xattr -cr "/Applications/Catan Tabletop.app"
>   ```

---

## ✨ Novedades Principales en v2.2.0

### 🎲 Dados 3D, Ataque Bárbaro y HUD de Ciudades y Caballeros
- **Dado de Acontecimientos 3D en el popup central:** Se muestran los 3 dados simultáneamente (2 dados numéricos + 1 dado de acontecimiento con Barco Bárbaro y Castillos de Ciencia, Política y Comercio), evitando repeticiones de animación al resolver elecciones posteriores.
- **Animación de degradación de ciudades:** Todas las ciudades reducidas a poblados tras un ataque bárbaro muestran simultáneamente una animación de onda de choque e insignia `🔥 CIUDAD → POBLADO` sobre el tablero.
- **HUD de Ciudades y Caballeros reubicado y clicable:** Situado a la derecha del bloque inferior para no solaparse con las ofertas de intercambio; hacer clic en cualquier punto del recuadro abre directamente el menú de mejoras de ciudad.
- **Controles de zoom reubicados:** Botones de *Zoom In*, *Zoom Out* y *Centrar* colocados a la izquierda del casillero de la Banca en Ciudades y Caballeros.
- **Fuerza defensiva y Campeador de Catán en perfiles:** Visualización directa del desglose de defensa de cada jugador, quién posee el título de Campeador de Catán y sus puntos adicionales.

### ⚔️ Acciones de Caballeros Directas en el Mapa
- **Menú inferior propio de Caballeros:** Botón dedicado con acciones de **Colocar**, **Ascender**, **Activar**, **Mover** (recorriendo rutas conectadas de caminos/poblados) y **Expulsar Ladrón/Pirata**, con costes visibles y resaltado de vértices válidos en el tablero.
- **Retirada de caballeros y expulsión corregidas:** Reparado el flujo de confirmación de retirada cuando un caballero es desplazado y corregida la expulsión del Ladrón/Pirata con caballeros activos adyacentes.

### 📜 Cartas de Progreso (Ciencia, Política y Comercio) y Menús Separados
- **Separación de menús:**
  - El menú de **Ciudades y Caballeros** muestra exclusivamente los niveles de los 3 sectores de mejora de ciudad (*Comercio*, *Política* y *Ciencia*).
  - El botón **Progreso (`D`)** abre el menú propio de Cartas de Progreso con los contadores restantes de los 3 mazos y las cartas en mano.
- **Cero selectores desplegables (`<select>`):** Sustituidos por selección directa sobre el tablero o por cajitas clicables de jugadores, materiales y dados (por ejemplo en **Alquimista**, **Espía**, **Deserción**, **Monopolio**, **Mercader**, **Puerto de Mercancías**, **Ingeniero**, **Herrero** e **Inventor**).
- **Cartas de Ciencia y Comercio operativas:** Reparadas todas las cartas de Ciencia (`ALCHEMIST`, `ENGINEER`, `SMITH`, `INVENTOR`, `CRANE`, `MEDICINE`, `ROAD_BUILDING`, `IRRIGATION`, `MINING`), las cartas de Política y el **Puerto de Mercancías**.
- **Alertas centrales coloreadas por rama:** Al jugar cualquier carta de progreso aparece un popup central al estilo del Ladrón con el color de su sector (**Verde** para Ciencia, **Azul** para Política, **Amarillo/Ámbar** para Comercio), imagen oficial de la carta, resumen en 1 línea y botón *«Entendido»*.
- **Dorsos escaneados en vuelos y perfiles:** Las cartas de progreso vuelan con su dorso escaneado hacia el casillero del jugador y se muestran en abanico junto a los materiales al acercar el cursor a los perfiles o al botón de **Progreso / Desarrollo**.
- **Cierre intuitivo de menús:** Hacer clic fuera de cualquier modal vuelve directamente al mapa.

### ⛵ Navegantes y Tablero General
- **Corredor marítimo al mover barcos (`MOVE_SHIP`):** Indicador visual iluminado con anillo pulsante y etiqueta clara `⇄ MOVER` / `⛵ ORIGEN` sustituyendo el antiguo óvalo punteado.
- **Recursos en la primera ronda de colocación:** En Ciudades y Caballeros, la colocación inicial del primer turno otorga correctamente los recursos de los hexágonos contiguos según las reglas de partida.
- **Visibilidad de `catan_chit.png` y estabilidad del Ladrón:** Mejorada la transparencia de la ficha Catán y corregido el bloqueo/pantalla en negro al mover el Ladrón.
- **Bots en Ciudades y Caballeros:** Eliminados los avisos erróneos de bots comprando cartas de desarrollo estándar cuando juegan con la expansión.

