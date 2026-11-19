# Rekatan v2.3.1 — Arte Oficial Integrado y Tableros Exactos (Mercaderes y Bárbaros + Piratas y Exploradores)

> **Versión:** `v2.3.1`  
> **Fecha:** 19 de noviembre de 2026  
> **Versión Web:** [rekatan.onrender.com](https://rekatan.onrender.com)  
> **Pruebas verificadas:** 275/275 tests (`vitest run`) y build de producción (`tsc -b && vite build`)

---

## 📦 Descargas de Escritorio

| Plataforma | Paquete | Archivo |
| :--- | :--- | :--- |
| **macOS (Apple Silicon M1/M2/M3/M4)** | Instalador DMG | `Catan Tabletop-2.3.1-arm64.dmg` |
| **macOS (Apple Silicon M1/M2/M3/M4)** | Aplicación comprimida (ZIP) | `Catan Tabletop-2.3.1-arm64-mac.zip` |
| **Windows (x64)** | Instalador estándar (NSIS) | `Catan Tabletop Setup 2.3.1.exe` |
| **Windows (x64)** | Ejecutable Portable | `Catan Tabletop 2.3.1.exe` |

> **Nota de instalación:**
> - **Windows:** Si SmartScreen muestra una advertencia de editor desconocido, pulsa *Más información* → *Ejecutar de todas formas*.
> - **macOS:** Si macOS bloquea la apertura por no contar con notarización comercial, ve a *Ajustes del Sistema > Privacidad y Seguridad* → *Abrir de todos modos*, o ejecuta:
>   ```bash
>   xattr -cr "/Applications/Catan Tabletop.app"
>   ```

---

## ✨ Novedades Principales en v2.3.1

### 🗺️ Tableros de Piratas y Exploradores Calcados al Reglamento Oficial (2–4J y 5–6J)
Reconstrucción hexágono a hexágono de los **10 mapas oficiales** de *Piratas y Exploradores* (sin anillos decorativos extra de mar):
- **2–4 Jugadores (7 filas):**
  - *¡Tierra a la vista!* (escenario por defecto): **50 hexágonos** (`6-7-8-8-8-7-6`, 12 inexplorados).
  - *Las guaridas de piratas* y *Pescado para Catán*: **57 hexágonos** (`7-8-9-9-9-8-7`, 18 inexplorados).
  - *Especias para Catán*: **64 hexágonos** (`8-9-10-10-10-9-8`, 24 inexplorados).
  - *Piratas y Exploradores (Completo)*: **71 hexágonos** (`9-10-11-11-11-10-9`, 30 inexplorados).
- **5–6 Jugadores (9 filas):**
  - *¡Tierra a la vista!* y *Las guaridas de piratas*: **78 hexágonos** (`7-8-9-10-10-10-9-8-7`, 24 inexplorados).
  - *Pescado para Catán* y *Especias para Catán*: **87 hexágonos** (`8-9-10-11-11-11-10-9-8`, 32 inexplorados).
  - *Piratas y Exploradores (Completo)*: **96 hexágonos** (`9-10-11-12-12-12-11-10-9`, 40 inexplorados).

### 🎨 Arte Oficial Integrado — Mercaderes y Bárbaros (105 piezas)
- **9 losetas hexagonales oficiales** (`641×740` RGBA): Lago interior (`11, 12, 2, 3`), ríos de arcilla y pradera, pantanos superior e inferior, Castillo de *El ataque de los bárbaros* y destinos (*El Castillo*, *Fábrica de Vidrio* y *Cantera de Mármol*).
- **29 fichas y piezas de tablero:** caladeros costeros en chevrón (`4, 5, 6, 8, 9, 10`), fichas de pescado, **Bota vieja**, títulos *El colono más rico* y *Colono pobre*, carromatos en 4 colores, puentes de piedra en 4 colores, bárbaros, camellos, fichas de comercio, monedas de oro (`1` y `5`), mercancías (*Mármol, Vidrio, Herramientas, Arena*) y emblemas de destino.
- **41 cartas oficiales en español:** baraja completa de **36 + 1 cartas de Eventos en Catán** (más reverso y resumen), cartas de desarrollo de *El ataque de los bárbaros* y *Mercaderes y Bárbaros*, tarjeta oficial de costes de pesca y tarjeta de **El capitán del puerto**.
- **26 cartas de carromato:** Niveles 1 a 5 en los 4 colores de jugador, reverso y 5 cartas sepia de coste de mejora.

### ⚓ Arte Oficial Integrado — Piratas y Exploradores (42 piezas)
- **Losetas hexagonales activas en tablero:** **Consejo de Catán**, **Guarida de Piratas / Río Aurífero** (mostrando nuestra ficha numérica de pergamino al conquistarse), las **3 variantes de Aldeas de Especias** (*A toda vela*, *Antipiratas* y *Comercio de oro*) y los **6 Caladeros de Peces** con dado `1`–`6`.
- **Fichas circulares en mapa, flota y paneles:** **Ciudades Portuarias**, **Barcos de Flota**, **Colonos** y **Unidades** en los 4 colores oficiales, además de **Banco de Peces** y **Saco de Especias** en bodegas, dársenas y menú desplegable.
- **Tarjetas de misión y referencia:** Las **3 tarjetas de Punto de Victoria de campeón** (*El azote de los piratas*, *El mejor pescador*, *El mejor mercader de especias*) integradas en cada pista de misión, junto con visor desplegable de **Resumen del Turno**, pistas originales y guías de misión.
- **Catálogo en reserva (`EP_STANDBY_ASSETS`):** Loseta de mar `sea_ep.png`, monedas numeradas `1`/`3`, pistas verticales y tarjetas de bolsa extraídas limpiamente y listas para intercambiar bajo demanda manteniendo coherencia visual con el océano y fichas numéricas del tablero.
