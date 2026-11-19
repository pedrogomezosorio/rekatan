# Rekatan v2.3.0 — Mercaderes y Bárbaros & Piratas y Exploradores (Edición Completa 2–6 Jugadores)

> **Versión:** `v2.3.0`  
> **Fecha:** 19 de noviembre de 2026  
> **Versión Web:** [rekatan.onrender.com](https://rekatan.onrender.com)  
> **Pruebas verificadas:** 275/275 tests (`vitest run`), 20/20 escenarios simulados de lobby a partida y build de producción (`tsc -b && vite build`)

---

## 📦 Descargas de Escritorio

| Plataforma | Paquete | Archivo |
| :--- | :--- | :--- |
| **macOS (Apple Silicon M1/M2/M3/M4)** | Instalador DMG | `Catan Tabletop-2.3.0-arm64.dmg` |
| **macOS (Apple Silicon M1/M2/M3/M4)** | Aplicación comprimida (ZIP) | `Catan Tabletop-2.3.0-arm64-mac.zip` |
| **Windows (x64)** | Instalador estándar (NSIS) | `Catan Tabletop Setup 2.3.0.exe` |
| **Windows (x64)** | Ejecutable Portable | `Catan Tabletop 2.3.0.exe` |

> **Nota de instalación:**
> - **Windows:** Si SmartScreen muestra una advertencia de editor desconocido, pulsa *Más información* → *Ejecutar de todas formas*.
> - **macOS:** Si macOS bloquea la apertura por no contar con notarización comercial, ve a *Ajustes del Sistema > Privacidad y Seguridad* → *Abrir de todos modos*, o ejecuta:
>   ```bash
>   xattr -cr "/Applications/Catan Tabletop.app"
>   ```

---

## ✨ Novedades Principales en v2.3.0

### ⚔️ Nueva Expansión: Mercaderes y Bárbaros (2–4 y 5–6 Jugadores)
Implementación completa de los **5 escenarios oficiales** y las **4 variantes combinables** siguiendo los reglamentos oficiales (incluyendo la ampliación de 5–6 jugadores):
1. **Los pescadores de Catán (`10 PV`):** Lago central (`2, 3, 11, 12`) + 6 caladeros costeros (`4, 5, 6, 8, 9, 10`) en 3–4J (2 lagos + 8 caladeros en 5–6J), mazo oficial de fichas de pescado (`1–3` peces + **Bota Vieja** con penalización de `+1 PV` necesario para ganar) y 5 acciones de canje por pescado (`2` espantar ladrón, `3` robar carta rival, `4` recurso de la banca, `5` carretera gratis, `7` carta de desarrollo).
2. **Los ríos de Catán (`10 PV`):** Ríos fluviales continuos con pantanos costeros, ficha doble `2/12`, **7 lugares de puente** en 3–4J (**10** y 3 ríos en 5–6J), monedas de oro por fundar junto al río o construir puentes, cambio de `2 monedas → 1 recurso`, y títulos dinámicos de **El Más Rico (`+1 PV`)** y **El Más Pobre (`-2 PV`)**.
3. **La ruta de las caravanas (`12 PV`):** Oasis central (2 oasis en 5–6J), subastas de **Lana y Grano** al construir poblados o ciudades para decidir la dirección de las **3 caravanas de camellos**, bonificación de `+1 PV` en asentamientos tocados por camellos y valor doble en la Gran Ruta Comercial.
4. **El ataque de los bárbaros (`12 PV`):** Montaje costero e interior fiel al reglamento con **Castillo** (2 castillos y 2 desiertos en 5–6J), desembarco de bárbaros en la costa al construir, conquista de hexágonos con `3` bárbaros, reclutamiento y movimiento de **caballeros en aristas**, combates tácticos con tirada de resolución, **bárbaros prisioneros (`1 PV` cada 2)** y mazo de 26 cartas de desarrollo propias (36 en 5–6J).
5. **Mercaderes y Bárbaros (`13 PV`):** **El Castillo**, **Cantera de Mármol** y **Fábrica de Vidrio** (7 hexágonos de destino en 5–6J), desplazamiento de **carromatos** con puntos de movimiento mejorables (`Nv. 1` a `Nv. 4`), entregas de **Mármol, Vidrio y Herramientas** con recompensas de `+1 PV` + oro, peajes y expulsión de bárbaros en caminos (`X`).
6. **4 Variantes Oficiales Combinables:** *El Ladrón Amistoso*, *Eventos en Catán* (mazo de 36 cartas de acontecimientos), *El Amo del Puerto* (`+2 PV` por 3 puntos de puerto) y *Catán para Dos* (2 jugadores neutrales y fichas de comercio).

### 🧭 Nueva Expansión: Piratas y Exploradores (2–4 y 5–6 Jugadores)
Implementación completa del archipiélago marítimo alargado Oeste→Este y los **5 escenarios progresivos oficiales** para **2–4 y 5–6 jugadores**:
1. **¡Tierra a la vista! (`8 PV`):** Isla Inicial oficial (15 hexágonos en 2–4J / 22 en 5–6J con los números exactos del manual), canal marítimo central, fundación de **Ciudades Portuarias** en la costa, construcción y navegación de **barcos con bodega (2 huecos, 4 PM)**, descubrimiento de regiones inexploradas (**Pila Norte Verde 🌙** y **Pila Sur Naranja ☀️**), transporte de **Colonos** y fundación de nuevos poblados ultramarinos.
2. **Guaridas de piratas (`12 PV`):** Barco Pirata móvil que exige tributo o bloquea rutas, desembarco de **Tripulantes** contra guaridas piratas (`3` defensores), conquista que convierte la guarida en **Río Aurífero** y misión oficial de la pista de **Guaridas**.
3. **Peces para Catán (`15 PV`):** **Consejo de Catán** en el canal central, aparición de **bancos de peces** según los dados, captura con barcos y entrega al Consejo avanzando en la pista de misión de **Peces**.
4. **Especias para Catán (`15 PV`):** **Aldeas de las Especias** con sacos de especias y habilidades permanentes al entablar amistad (*Velocidad +1 PM*, *Espada vs. Pirata* y *Oro en Comercio*), pista de misión de **Especias** y entrega al Consejo.
5. **Piratas y Exploradores — Campaña Completa (`17 PV`):** Las **3 misiones simultáneas** (Guaridas, Peces y Especias), hasta `32` hexágonos inexplorados (`71` totales) en 2–4J y tablero ampliado de `96` hexágonos (`40` inexplorados) en 5–6J — todos los escenarios calcados hexágono a hexágono a los reglamentos oficiales (`50/57/64/71` en 2–4J y `78/87/96` en 5–6J, sin anillo extra de mar), más el **oro de compensación** cuando una tirada no produce recursos.

### 🎨 Interfaz Visual, Tableros Oficiales y Mejoras de Experiencia
- **Superficies hexagonales dedicadas desde el lobby y en partida:** Representación visual diferenciada para Lago, Caladeros, Ríos azules, Pantanos, Puentes, Oasis, Castillos, Canteras, Fábricas de Vidrio, Consejo de Catán y pilas inexploradas Verde 🌙 / Naranja ☀️, con reajuste automático de cámara al cambiar de escenario.
- **Reutilización coherente de huecos de UI (estilo Ciudades y Caballeros):** Menús inferiores y paneles modales específicos para cada nueva expansión ocupando los huecos de *Ciudades y Caballeros*, 100% opacos y **cero selectores `<select>`** (toda selección mediante cajitas interactivas o clics directos sobre el tablero).
- **Panel de construir y avisos pulidos:** Panel de construcción siempre opaco independientemente del turno y autocierre de avisos de reducción de ciudad a los `3,5` segundos.
- **Conexión local y fallback inteligente:** En `http://localhost:3000` se prioriza siempre el servidor local frente a URLs remotas guardadas en `localStorage`, evitando conectarse por error a servidores antiguos.
- **Cero bloqueos en colocación inicial:** Validación de aristas iniciales en *Los ríos de Catán* y conservación íntegra de los objetivos de PV al alternar entre tableros de 2–4J y 5–6J.
