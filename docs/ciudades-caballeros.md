# Ciudades y Caballeros

Implementación para tres a seis jugadores, con el reglamento español de 2010–2011 aportado por el usuario como referencia. Los documentos se usan como fuente de reglas; sus indicaciones a quien monta el juego físico no son instrucciones de ejecución para el agente.

## Uso

En **Crear partida** selecciona **Ciudades y Caballeros**, después **3–4 jugadores** o **5–6 jugadores**. **Jugar con bots** crea los participantes, inicializa las mercancías y el progreso, sortea la iniciativa e inicia la fundación en una sola operación. **Crear sala multijugador** conserva esa selección y abre el lobby para invitar jugadores. El lobby permite completar las plazas con bots e iniciar. El tablero estándar admite tres o cuatro jugadores; **Ampliación 5–6** permite hasta seis y añade construcción especial. También puedes activar Navegantes. Su escenario y silueta se conservan al añadir o quitar Ciudades y Caballeros. Cambiar de Navegantes a la isla base restaura el tablero base.

Durante la partida, el panel de la esquina superior izquierda muestra el viaje bárbaro, defensa, ciudades, límite de mano y mejoras. Ábrelo para gestionar caballeros, murallas, metrópolis y progreso. El atajo **D** abre Progreso. Las decisiones de los demás jugadores se resuelven con sus propias sesiones, antes de continuar el evento. La construcción normal sigue usando los controles del tablero.

El material gráfico es provisional, funcional y sustituible. El [catálogo de gráficos](ciudades-caballeros-assets.md) enumera los archivos solicitados, formatos, transparencia y resoluciones. Incluye 36 combinaciones de caballeros, 25 anversos de progreso y tres reversos, además de mercancías, murallas, metrópolis, mejoras y bárbaros.

## Criterios del reglamento

| Tema | Regla aplicada y referencia en el PDF base |
|---|---|
| Montaje | Los tableros de 19 y 30 terrenos usan la secuencia de números en espiral antihoraria, saltando los desiertos. La modalidad 5–6 conserva las filas 3–4–5–6–5–4–3, dos desiertos y 28 fichas numeradas. PDF de ampliación, pág. 2. |
| Fundación | Poblado y después ciudad; recursos iniciales solamente con la ciudad, una materia prima por terreno. Págs. 4–5. |
| Mercancías | Ciudades: madera+papel, oveja+tela, mineral+moneda; trigo y arcilla siguen produciendo dos. Comercio, descarte y robo incluyen mercancías. Págs. 5–6. |
| Dados | Rojo y blanco, más tres caras de barco y una por rama. Primero evento/asalto/elecciones; después producción o siete. Págs. 5 y 8–9. |
| Caballeros | Reclutar y ascender cuesta **oveja + mineral**. Activar cuesta trigo. Dos piezas por rango. Un ascenso por turno; Fortaleza para rango tres. Págs. 6–8. |
| Acciones | Un caballero activado este turno defiende pero no actúa aún. Se puede reactivar tras actuar sin obtener una segunda acción. Los caballeros propios se pueden atravesar, los enemigos no. Págs. 6 y 8. |
| Derrota | Compara contribuciones de jugadores con ciudades ordinarias. **También puede perderse la única ciudad**. Metrópolis y jugadores sin ciudades ordinarias quedan protegidos. Pág. 9. |
| Última ciudad | Esta edición del PDF indica que se pierden las mejoras al perder todas las ciudades; se aplica esa edición. Pág. 9. |
| Sin poblados en reserva | La ciudad queda reducida a poblado usando su pieza de ciudad. Debe repararse antes de construir otra ciudad y no puede recibir una metrópolis mientras esté reducida. Pág. 9. |
| Defensa | Igualar la fuerza bárbara es suficiente. Único máximo: Campeador +1 PV. Empate: cada máximo elige progreso. Por defecto se desactivan todos los caballeros activos. La variante opcional **doña Urraca**, activable antes de empezar, deja elegir participantes en orden de turno; sólo esos caballeros contribuyen y se agotan. Págs. 8–9. |
| Ladrón y pirata | No se mueven ni roban antes del primer asalto. El siete sigue descartando. Un primer asalto simultáneo al siete habilita el movimiento tras resolver el combate. Págs. 5 y 9. |
| Mejoras | Costes 1–5. Acueducto con elección de un recurso básico; Fortaleza; mercancías 2:1. Metrópolis en cuatro, robo sólo por superar al dueño con cinco, una ciudad diferente por metrópolis. Págs. 7–8. |
| Murallas | Dos arcillas, una por ciudad, tres por jugador. Límite de mano 7+2 por muralla; desaparecen si la ciudad se degrada. Pág. 6. |
| Progreso | 18 cartas por rama, 54 en total, 25 tipos; anexo completo, no la lista abreviada del texto pegado. Imprenta y Constitución se muestran descubiertas y no entran en la mano. Puntos inmediatos públicos; demás cartas hasta cuatro al acabar el turno. Cartas jugadas o descartadas vuelven al fondo de su mazo. Págs. 7–11. |
| Cinco/seis | El PDF de ampliación, pág. 2, especifica **construcción especial**, no turnos emparejados. Prohíbe comercio, progreso y acciones de caballeros; permite construcción, reclutamiento, activación, ascensos y mejoras. |
| Victoria | Trece PV, en el turno propio. Con Navegantes, objetivo del escenario +2. No hay Gran Ejército ni compras de desarrollo. Pág. 9. |

El PDF recomienda especialmente **Rumbo a nuevas orillas** y **A través del desierto** para combinar expansiones. Oro produce sólo materias primas y no admite comerciante. Los caballeros pueden viajar por barcos, cerrar rutas e interrumpir rutas enemigas. Diplomático también funciona con barcos y Obispo sólo mueve al ladrón, conforme a las [aclaraciones oficiales de CATAN](https://www.catan.com/faq/cities-knights).

**Límite de combinación:** El pueblo perdido y Las islas de los piratas dependen de cartas de desarrollo, sustituidas por progreso en Ciudades y Caballeros. Los PDF aportados no definen cómo adaptar esos regalos/barcos de guerra. El motor rechaza esas dos combinaciones con un mensaje explicativo y conserva la sala y su mapa. Cada expansión puede jugar esos escenarios por separado; no se ha inventado una adaptación doméstica silenciosa.

## Arquitectura y persistencia

`citiesKnightsTypes.ts` define estado, elecciones y acciones. Las mercancías amplían los conjuntos de cartas, sin convertirse en tipos de terreno. Los campos nuevos son opcionales para poder recuperar partidas antiguas del juego base y de Navegantes.

`CitiesAndKnights.ts` implementa los reductores de la expansión. `RulesEngine.ts` conserva el despachador y la producción de los escenarios, integra las elecciones antes de continuar los dados y sigue validando construcción/comercio. Las acciones inválidas devuelven el estado anterior. `executeAction` admite contexto explícito de tiempo, dados y función aleatoria; para una reproducción determinista se proporciona `now` y un generador nuevo con la misma semilla para cada ejecución. Los generadores de mapas admiten esa misma fuente aleatoria.

Las decisiones pendientes y los dados aún sin producir forman parte de `GameState`. `RoomStore` los serializa con la misma escritura atómica que el resto de la partida. El servidor atiende al dueño de la decisión, aunque no sea el jugador activo. Bots y jugadores congelados resuelven sus elecciones; los límites de tiempo también tienen una salida automática. Las acciones recibidas se vinculan a la sesión del jugador conectado.

## Verificación

`src/shared/__tests__/CitiesAndKnights.test.ts` cubre economía, falta de existencias, fundación, cobertura del dado rojo, orden de eventos, asaltos, agotamiento, protección de metrópolis, ciudades reducidas, pérdida de mejoras, Acueducto, muros y descartes, movimiento y bloqueo por caballeros, ascensos, cartas de progreso, costes de mejoras, metrópolis, construcción especial y persistencia.

El contrato `CREATE_ROOM` recibe una modalidad validada y aplica su configuración antes de emitir el primer `ROOM_JOINED`. `roomCreation.test.ts` prueba las dos modalidades y los cuatro tamaños efectivos de partida, además de entradas inválidas. La prueba de Socket.io comprueba también la creación real de una sala de la expansión y una partida rápida con seis participantes.

Se ejecutan `npm test` y `npm run build`. La comprobación de navegador recorre compra de mejoras, uso de Ingeniero, mercancías en comercio y zoom; comprueba errores de JavaScript y recursos nuevos ausentes.

La interfaz se comprueba a 360, 390, 768 y 1440 píxeles: selección de modalidades, creación rápida real, mercancías, paneles y zoom, sin desbordamiento horizontal ni recursos de la expansión ausentes. Los móviles muestran las ocho cantidades de cartas en una barra propia, reducen el HUD y permiten ocultar jugadores para mantener accesible el tablero.
