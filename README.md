# Rekatan — Catan Tabletop

Implementación digital de Catan y sus expansiones **Navegantes** y **Ciudades y Caballeros** para escritorio (Windows y macOS) y navegador web, desarrollada con React, TypeScript, Node.js y Electron. El proyecto ofrece partidas multijugador en tiempo real a través de WebSockets y juego local asistido por bots con inteligencia artificial, recreando con fidelidad las mecánicas, tableros y escenarios oficiales del juego de mesa para 2 a 6 jugadores.

Acceso web directo: [rekatan.onrender.com](https://rekatan.onrender.com)

---

## Descargas (v3.0 — Expansión Ciudades y Caballeros & Navegantes)

Las versiones ejecutables para escritorio se encuentran disponibles en la sección de [Releases de GitHub](https://github.com/pedrogomezosorio/rekatan/releases/latest).

| Sistema Operativo | Tipo de Paquete | Archivo | Enlace de Descarga |
| :--- | :--- | :--- | :--- |
| **macOS** | Instalador DMG (Apple Silicon M1/M2/M3/M4) | `Catan Tabletop-3.0.0-arm64.dmg` | [Descargar DMG](https://github.com/pedrogomezosorio/rekatan/releases/latest/download/Catan.Tabletop-3.0.0-arm64.dmg) |
| **macOS** | Aplicación directa (ZIP) | `Catan Tabletop-3.0.0-arm64-mac.zip` | [Descargar ZIP](https://github.com/pedrogomezosorio/rekatan/releases/latest/download/Catan.Tabletop-3.0.0-arm64-mac.zip) |
| **Windows** | Instalador estándar (NSIS) | `Catan Tabletop Setup 3.0.0.exe` | [Descargar Instalador](https://github.com/pedrogomezosorio/rekatan/releases/latest/download/Catan.Tabletop.Setup.3.0.0.exe) |
| **Windows** | Ejecutable Portable | `Catan Tabletop 3.0.0.exe` | [Descargar Portable](https://github.com/pedrogomezosorio/rekatan/releases/latest/download/Catan.Tabletop.3.0.0.exe) |
| **Cualquier Sistema** | Versión Web (Navegador) | En línea | [Abrir en Navegador](https://rekatan.onrender.com) |

> 💡 **Todas las versiones y notas de la actualización:**  
> Puedes consultar el registro de cambios completo en [Releases de Rekatan](https://github.com/pedrogomezosorio/rekatan/releases).

> **Nota para la instalación en Windows y macOS:**
> - En **Windows**, si SmartScreen muestra la advertencia de editor desconocido al abrir el `.exe`, pulsar en *Más información* y seleccionar *Ejecutar de todas formas*.
> - En **macOS**, al no contar con firma de desarrollador comercial de Apple, si el sistema bloquea la apertura, ir a *Ajustes del Sistema > Privacidad y Seguridad* y hacer clic en *Abrir de todos modos*, o ejecutar en terminal:
>   ```bash
>   xattr -cr "/Applications/Catan Tabletop.app"
>   ```

---

## Funcionalidades del Sistema

### Motor de Reglas y Topología del Tablero
- **Generación matemática de malla hexagonal:** Cálculo de coordenadas cúbicas axiales `(q, r, s)` con topología continua de 54 vértices y 72 aristas interconectadas.
- **Modalidades de tablero:**
  - Tablero estándar oficial (3 a 4 jugadores, 19 hexágonos de tierra y 9 puertos).
  - Expansión de 5 a 6 jugadores (30 hexágonos y 11 puertos).
  - Tablero de radio ampliado para partidas multitudinarias.
- **Configuración de reglas en sala:**
  - Desierto central obligatorio con posicionamiento inicial del Ladrón en `(0, 0, 0)`.
  - Algoritmo de mitigación de fichas rojas (6 y 8) adyacentes.
  - Distancia mínima entre asentamientos (regla oficial de 2 aristas o variante reducida de 1 arista).
  - Restricciones de acciones por turno (libre, limitada o estricta).
- **Editor de tablero integrado en el lobby:** Capacidad para alterar manualmente el terreno de cada casilla, su número de probabilidad o reubicar puertos marítimos antes de iniciar la partida.

### Expansión: Los Navegantes de Catán (3, 4 y 5-6 Jugadores)
- **Selector de tamaño de isla en el lobby:** Alternancia directa entre **2-3 Jugadores**, **4 Jugadores** y **5-6 Jugadores**, ajustando automáticamente los marcos oficiales (`35`, `42`, `49`, `56` y `63` hexágonos), el número de jugadores y los componentes de escenario.
- **9 escenarios oficiales fieles a los manuales (`3-4J` y `5-6J`):**
  1. *Rumbo a nuevas orillas*
  2. *Las cuatro islas / Las seis islas*
  3. *Oceanía (Tierra Ignota)*
  4. *A través del desierto*
  5. *El pueblo perdido*
  6. *Telas para Catán*
  7. *Las islas de los piratas*
  8. *Las maravillas catanas* (incluyendo panel dedicado y *La Gran Biblioteca* para 5-6 jugadores)
  9. *Un nuevo mundo*
- **Mecánicas náuticas y fichas Catán:**
  - Construcción y desplazamiento de **barcos**, rutas comerciales marítimas y control de **El Pirata**.
  - Casillas de **Río de Oro** (elección libre de recurso) y hexágonos de **Niebla** explorable.
  - Sistema íntegro de **Fichas Catán**: bonificaciones de colonización insular (`+2 PV`), dones tribales (`+1 PV`, cartas y puertos), fardos de tela indígena, resistencia de fortalezas pirata frente a buques de guerra y fases de construcción de Maravillas.
- **Montaje Variable (Sección 4):** El botón *Regenerar Escenario de Navegantes* conserva intacta la silueta de las islas y el mar, barajando exclusivamente los terrenos, números o puertos permitidos por el reglamento de cada escenario.

### Expansión: Ciudades y Caballeros (3 a 6 Jugadores)
- **Economía y Nuevas Mercancías (Commodities):** Producción dual en ciudades para Bosque (**Papel**), Pastos (**Tela**) y Montañas (**Moneda**), con ilustraciones en alta resolución y abanico de recursos adaptativo.
- **Tirada de 3 Dados & Flota Bárbara:** Dado de Evento con caras de Barco Bárbaro y Castillos (Ciencia, Política y Comercio). Pista de ataque bárbaro de 7 casillas, cálculo de defensas (*Fuerza de Catán* vs *Fuerza Bárbara*), título de **Defensor de Catán** (+1 PV) y degradación de ciudades en caso de derrota.
- **Caballeros en el Tablero:** Emplazamiento en vértices, 3 rangos (**Básico**, **Fuerte**, **Poderoso**), estados activo/inactivo (activación con Trigo), combate/desplazamiento de caballeros rivales y expulsión del Ladrón.
- **Mejoras de Ciudad & Metrópolis:** 3 ramas de progreso (Ciencia, Política, Comercio) con 5 niveles de desarrollo, habilidades pasivas (*Acueducto*, *Fortaleza*, *Comercio Mercantil*) y disputa de **Metrópolis** (+2 PV).
- **Murallas de Ciudad:** Construcción bajo ciudades para aumentar en +2 el límite seguro de cartas ante el 7 (hasta 13 cartas).
- **3 Mazos de Cartas de Progreso:** Mazo de Ciencia (Verde), Política (Azul) y Comercio (Amarillo) con ilustraciones oficiales en PNG y cartas jugables según evento y dado rojo.
- **Fase Especial de Construcción (5-6 Jugadores):** Reglas oficiales para partidas de 5 y 6 jugadores, totalmente combinable con los escenarios de Navegantes.

### Dinámica de Juego y Notificaciones Visuales
- **Animación secuencial de recursos:** Al arrojar los dados, los materiales se distribuyen paulatinamente desde el hexágono productor hacia el casillero individual de cada jugador beneficiado en la interfaz.
- **Lanzamiento de dados central:** Ventana informativa en el eje central de la pantalla con visualización en gran escala de los resultados numéricos y tiempo de retención legible sin bloqueo de la vista de cartas.
- **Mazo de cartas de desarrollo físico:** Representación tridimensional en mesa del mazo restante con su ilustración original. Al comprar una carta, esta realiza una animación de giro y traslación directa hacia el inventario del comprador.
- **Resaltado de construcciones:** Iluminación localizada temporal sobre vértices y aristas al colocarse carreteras, poblados o catedrales para facilitar el seguimiento de las acciones de los rivales.
- **Alertas de eventos críticos:** Avisos destacados en pantalla ante el despliegue de cartas de Caballero o el asalto del Ladrón sobre parcelas ocupadas por el usuario.

### Inteligencia Artificial
- **Bots autónomos integrados:** Algoritmo de toma de decisiones heurístico que gestiona la fase de tiradas iniciales, colocación de poblados en puntos estratégicos de alta frecuencia estadística, construcción de infraestructuras y comercio marítimo.
- **Niveles de dificultad:** Perfiles Fácil, Medio y Difícil con ponderación diferenciada sobre recursos escasos, control de la Mayor Ruta Comercial y defensa contra el Ladrón.
- **Ritmo pausado y avisos de estado:** Temporización artificial entre acciones sucesivas para permitir a los jugadores humanos asimilar los movimientos de la IA en pantalla.

### Conectividad e Infraestructura
- **Multijugador en tiempo real:** Arquitectura cliente-servidor construida sobre WebSockets con Socket.io.
- **Persistencia de sesión y reconexión:** Mapeo de estados de juego para admitir desconexiones temporales y control de pausa global por el anfitrión de la sala.

---

## Estructura Tecnológica

- **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend:** Node.js, Express, Socket.io, Vite (en modo middleware para desarrollo).
- **Entorno de Escritorio:** Electron, Electron Builder.
- **Pruebas Unitarias:** Vitest (266 tests cubriendo reglas completas de Ciudades y Caballeros, creación de salas, contratos Socket.io, validación del motor de reglas, auditoría de los 24 tableros oficiales de Navegantes, maravillas, cámara, rutas continuas y reconexión).

---

## Ejecución en Entorno Local

### Requisitos Previos
- Node.js (versión 20.x o superior recomendada).
- npm (versión 10.x o superior).

### Instalación y Puesta en Marcha

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/pedrogomezosorio/rekatan.git
   cd rekatan
   ```

2. Instalar dependencias del proyecto:
   ```bash
   npm install
   ```

3. Iniciar el entorno de desarrollo (servidor Node + cliente Vite):
   ```bash
   npm run dev
   ```
   La aplicación estará disponible localmente en `http://localhost:3000`.

   Las salas se guardan automáticamente en `.rekatan/rooms.json`, con escritura atómica.
   Se conserva la configuración durante una reconexión del lobby de hasta 30 minutos y
   los jugadores pueden recuperar su sala después de reiniciar el proceso del servidor.
   Una partida restaurada espera a que regresen sus jugadores antes de continuar.
   En un alojamiento externo, configura `CATAN_ROOMS_FILE` con una ruta de disco
   persistente para conservar también las salas cuando se sustituye el contenedor.

4. (Opcional) Ejecutar la versión de escritorio de Electron sobre el entorno en marcha:
   ```bash
   npm run electron
   ```

### Pruebas de Software
Para ejecutar la batería de pruebas de reglas, conectividad y lógica de bots:
```bash
npm test
```

---

## Compilación y Empaquetado

Para generar los instaladores y binarios distribuidos:

- **Compilar cliente web:**
  ```bash
  npm run build
  ```

- **Generar binarios para Windows (Instalador NSIS + Portable):**
  ```bash
  npm run make:win
  ```

- **Generar aplicación para macOS (Apple Silicon arm64):**
  ```bash
  npm run make:mac
  ```

- **Compilar para múltiples plataformas:**
  ```bash
  npm run make:all
  ```
Los archivos compilados se guardarán dentro de la carpeta `release/`.

---

## Ciudades y Caballeros

Disponible para 3–4 y 5–6 jugadores, con mercancías, tres dados, caballeros sobre el tablero, invasiones, murallas, mejoras, metrópolis y los tres mazos oficiales de progreso. La ampliación utiliza la fase especial de construcción del PDF español aportado. En el menú de creación selecciona **Ciudades y Caballeros → 3–4 jugadores / 5–6 jugadores**. **Jugar con bots** inicia una partida lista para colocar piezas; **Crear sala multijugador** permite invitar amigos. El panel de la expansión y el atajo **D** gestionan sus acciones. La variante opcional **doña Urraca** permite elegir los caballeros defensores. El menú, lobby, tablero y paneles se adaptan a móvil, tablet y escritorio.

Consulta las [reglas implementadas y límites de combinación con Navegantes](docs/ciudades-caballeros.md) y el [catálogo de gráficos](docs/ciudades-caballeros-assets.md). Las cartas de recursos, mercancías, desarrollo y progreso usan PNG extraídos del PDF de componentes. La [guía de extracción e integración](docs/catan-assets.md) incluye el script, las procedencias y las fichas numéricas recreadas; los terrenos conservan las texturas transparentes existentes.

---

## Nota Legal
Este software es un proyecto independiente desarrollado exclusivamente con fines educativos y de investigación técnica. Catan es una marca registrada de Catan GmbH. El código y activos aquí contenidos no están afiliados, respaldados ni asociados formalmente con los titulares de la propiedad intelectual original.
