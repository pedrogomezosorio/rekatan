# Rekatan — Catan Tabletop

Implementación digital de Catan para escritorio (Windows y macOS) y navegador web, desarrollada con React, TypeScript, Node.js y Electron. El proyecto ofrece partidas multijugador en tiempo real a través de WebSockets y juego local asistido por bots con inteligencia artificial, recreando con fidelidad las mecánicas y la experiencia del juego de mesa.

Acceso web directo: [rekatan.onrender.com](https://rekatan.onrender.com)

---

## Descargas

Las versiones ejecutables para escritorio se encuentran disponibles en la sección de [Releases de GitHub](https://github.com/pedrogomezosorio/rekatan/releases/latest).

| Sistema Operativo | Tipo de Paquete | Archivo | Enlace |
| :--- | :--- | :--- | :--- |
| **Windows** | Instalador estándar (NSIS) | `Catan Tabletop Setup 1.0.0.exe` | [Descargar Instalador](https://github.com/pedrogomezosorio/rekatan/releases/latest/download/Catan.Tabletop.Setup.1.0.0.exe) |
| **Windows** | Ejecutable Portable | `Catan Tabletop 1.0.0.exe` | [Descargar Portable](https://github.com/pedrogomezosorio/rekatan/releases/latest/download/Catan.Tabletop.1.0.0.exe) |
| **macOS** | Apple Silicon (M1/M2/M3/M4) | `Catan Tabletop-mac.zip` | [Descargar ZIP](https://github.com/pedrogomezosorio/rekatan/releases/latest/download/Catan.Tabletop-mac.zip) |
| **Cualquier Sistema** | Versión Web (Navegador) | En línea | [Abrir en Navegador](https://rekatan.onrender.com) |

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
- **Pruebas Unitarias:** Vitest (suite con validación del motor de reglas, caminos continuos y topología).

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

## Nota Legal
Este software es un proyecto independiente desarrollado exclusivamente con fines educativos y de investigación técnica. Catan es una marca registrada de Catan GmbH. El código y activos aquí contenidos no están afiliados, respaldados ni asociados formalmente con los titulares de la propiedad intelectual original.
