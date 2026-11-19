import type { GameConfig, ResourceType } from './types';
import type {
  BarbariansDevCard,
  BarbariansPlayer,
  BarbariansScenario,
  BarbariansVariants,
  CatanEventCard,
  CommodityDeliveryType,
  DestinationType,
  EPCargoItem,
  EPMissionId,
  ExplorersPiratesPlayer,
  ExplorersPiratesScenario,
  FishToken,
  SpicePerkType,
} from './expansionsTypes';

export const hasBarbarians = (config: GameConfig): boolean =>
  config.expansionModule === 'BARBARIANS' || Boolean(config.enabledExpansions?.includes('BARBARIANS'));

export const hasExplorersPirates = (config: GameConfig): boolean =>
  config.expansionModule === 'EXPLORERS_AND_PIRATES' ||
  Boolean(config.enabledExpansions?.includes('EXPLORERS_AND_PIRATES'));

// ============================================================================
// 1. MERCADERES Y BÁRBAROS (TRADERS & BARBARIANS) CATALOG & RULES
// ============================================================================

export interface BarbariansScenarioSpec {
  id: BarbariansScenario;
  title: string;
  subtitle: string;
  badge: string;
  recommendedVP: number;
  usesGold: boolean;
  usesRobber: boolean;
  setupCityOnRound2: boolean;
  specialVPRule: string;
  rulesSummary: string[];
}

export const BARBARIANS_SCENARIOS: BarbariansScenarioSpec[] = [
  {
    id: 'FISHERMEN_OF_CATAN',
    title: '1. Los pescadores de Catán',
    subtitle: 'El lago interior y los caladeros costeros producen fichas de pescado (1–3 peces) y la Bota vieja.',
    badge: 'Pescado y Lago',
    recommendedVP: 10,
    usesGold: false,
    usesRobber: true,
    setupCityOnRound2: false,
    specialVPRule: '10 PV para ganar (11 PV si posees la ficha de la «Bota vieja»).',
    rulesSummary: [
      'El desierto se sustituye por el Lago interior (2, 3, 11 y 12). En 5–6 jugadores hay 2 lagos.',
      'Los caladeros de pesca costeros producen fichas de 1, 2 o 3 pescados (1 ficha por poblado, 2 por ciudad).',
      'Gasta pescado en tu turno: 2 = retirar ladrón, 3 = robar recurso a un rival, 4 = recurso de la banca, 5 = carretera gratis, 7 = carta de desarrollo gratis.',
      'La «Bota vieja» exige +1 PV para ganar; puedes entregársela en tu turno a un rival con tantos o más PV que tú.',
    ],
  },
  {
    id: 'RIVERS_OF_CATAN',
    title: '2. Los ríos de Catán',
    subtitle: 'Construye carreteras, poblados y puentes sobre los ríos para ganar oro y ser el Colono más rico.',
    badge: 'Ríos, Puentes y Oro',
    recommendedVP: 10,
    usesGold: true,
    usesRobber: true,
    setupCityOnRound2: false,
    specialVPRule: '«Colono más rico» otorga +1 PV al líder en solitario de oro; «Colono pobre» resta -2 PV a quienes tengan menos oro.',
    rulesSummary: [
      '2 ríos en 3–4 jugadores y 3 ríos en 5–6 jugadores desembocando en pantanos.',
      'Cada carretera o poblado junto a un río otorga +1 moneda de oro. Las carreteras no pueden cruzar el río.',
      'Construye Puentes (2 Arcillas + 1 Madera) en los pasos del río para ganar +3 monedas de oro y conectar tu Gran Ruta.',
      'Hasta 2 veces en tu turno puedes comprar 1 materia prima cualquiera de la banca por 2 monedas de oro.',
    ],
  },
  {
    id: 'THE_CARAVANS',
    title: '3. La ruta de las caravanas',
    subtitle: 'Desde el Oasis central parten caravanas de camellos que duplican carreteras y dan +1 PV a tus poblados.',
    badge: 'Oasis y Camellos',
    recommendedVP: 12,
    usesGold: false,
    usesRobber: true,
    setupCityOnRound2: false,
    specialVPRule: '+1 PV por cada poblado o ciudad situado entre dos camellos. Las carreteras paralelas a camellos cuentan doble para la Gran Ruta.',
    rulesSummary: [
      'El Oasis sustituye al desierto en el centro de la isla (2 oasis y hasta 6 rutas en 5–6 jugadores).',
      'Cada vez que se construye un poblado o ciudad tras la fundación, se coloca 1 camello prolongando una caravana mediante votación con Lana o Trigo.',
      'Los poblados y ciudades entre dos camellos valen +1 PV adicional.',
      'Las carreteras en el mismo camino que un camello cuentan como 2 carreteras para la Gran Ruta Comercial.',
    ],
  },
  {
    id: 'BARBARIAN_ATTACK',
    title: '4. El ataque de los bárbaros',
    subtitle: 'Los bárbaros desembarcan en la costa al construir; arma caballeros en el Castillo y captura prisioneros.',
    badge: 'Castillo y Caballeros',
    recommendedVP: 12,
    usesGold: true,
    usesRobber: false,
    setupCityOnRound2: true,
    specialVPRule: '+1 PV por cada 2 prisioneros bárbaros capturados. Los poblados rodeados por costas conquistadas (3 bárbaros) valen 0 PV hasta ser liberados.',
    rulesSummary: [
      'Fundación: 1 poblado y 1 ciudad. Al construir poblado o ciudad, 3 tiradas de dados hacen desembarcar bárbaros en la costa.',
      'Con 3 bárbaros un hexágono costero queda conquistado (no produce ni permite construir).',
      'Las cartas de desarrollo se juegan al instante: Armar caballero, Caballero fuerte, Prisionero y Traición.',
      'Mueve tus caballeros por los caminos (3 pasos, o 5 pagando 1 Trigo) para superar en número a los bárbaros, capturarlos y cobrar oro.',
    ],
  },
  {
    id: 'TRADERS_AND_BARBARIANS',
    title: '5. Mercaderes y Bárbaros',
    subtitle: 'Mueve y mejora tu carromato entre el Castillo, la Cantera de Mármol y la Fábrica de Vidrio entregando mercancías.',
    badge: 'Carromatos y Mercancías',
    recommendedVP: 13,
    usesGold: true,
    usesRobber: false,
    setupCityOnRound2: true,
    specialVPRule: '+1 PV y pago de 1 a 5 oros por cada ficha de mercancía entregada en su hexágono de destino + 1 PV al mejorar el carromato a Nivel 5.',
    rulesSummary: [
      '3 hexágonos de destino en 3–4 jugadores (Castillo, Cantera de Mármol y Fábrica de Vidrio) y 7 en 5–6 jugadores.',
      'Tu carromato empieza junto a tu ciudad inicial con 4 puntos de movimiento (mejorable hasta Nivel 5 con 7 PM, 5 oros por entrega y +1 PV).',
      'Mover por camino sin carretera cuesta 2 PM, por carretera propia 1 PM, por carretera rival 1 PM + 1 oro de peaje al dueño, y +2 PM si hay un bárbaro.',
      'Llega a la encrucijada de destino de tu ficha de mercancía (Mármol, Vidrio, Herramientas o Arena) para ganar +1 PV, cobrar oro y tomar un nuevo encargo.',
    ],
  },
];

export const BARBARIANS_VARIANTS_CATALOG: Array<{
  key: keyof BarbariansVariants;
  title: string;
  badge: string;
  description: string;
}> = [
  {
    key: 'friendlyRobber',
    title: 'Ladrón piadoso',
    badge: 'Variante Oficial',
    description: 'No se puede mover el ladrón a un hexágono donde tenga poblado o ciudad un jugador con 2 o menos Puntos de Victoria públicos.',
  },
  {
    key: 'catanEventsDeck',
    title: 'Eventos en Catán',
    badge: 'Mazo de 37 Cartas',
    description: 'Sustituye la tirada de dados por el mazo estadístico de Eventos (Terremoto, Epidemia, Año abundante, Torneo, Buenos vecinos, Nochevieja).',
  },
  {
    key: 'harborMaster',
    title: 'El capitán del puerto',
    badge: '+2 PV Especial',
    description: '1 punto de puerto por poblado en puerto y 2 por ciudad en puerto. El primero con 3+ puntos gana «Capitán del puerto» (+2 PV). Aumenta la meta en +1 PV.',
  },
  {
    key: 'catanForTwo',
    title: 'Catán para dos',
    badge: 'Modo 2 Jugadores',
    description: '20 fichas de comercio (obtenidas en costa/desierto) para forzar comercio obligatorio de 2 cartas o enviar al ladrón al desierto.',
  },
];

export interface WagonLevelSpec {
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  movementPoints: number;
  goldReward: number;
  expelBarbarianMinRoll: number | null; // null = no puede expulsar, 6 = con 6, 5 = 5-6, 4 = 4-6
  victoryPointBonus: number;
  upgradeCost: Partial<Record<ResourceType, number>>;
}

export const WAGON_LEVELS: Record<1 | 2 | 3 | 4 | 5, WagonLevelSpec> = {
  1: {
    level: 1,
    title: 'Carromato Nivel 1',
    movementPoints: 4,
    goldReward: 1,
    expelBarbarianMinRoll: null,
    victoryPointBonus: 0,
    upgradeCost: {},
  },
  2: {
    level: 2,
    title: 'Carromato Nivel 2',
    movementPoints: 5,
    goldReward: 2,
    expelBarbarianMinRoll: 6,
    victoryPointBonus: 0,
    upgradeCost: { SHEEP: 1, WOOD: 1 },
  },
  3: {
    level: 3,
    title: 'Carromato Nivel 3',
    movementPoints: 5,
    goldReward: 3,
    expelBarbarianMinRoll: 5,
    victoryPointBonus: 0,
    upgradeCost: { SHEEP: 1, BRICK: 1 },
  },
  4: {
    level: 4,
    title: 'Carromato Nivel 4',
    movementPoints: 6,
    goldReward: 4,
    expelBarbarianMinRoll: 4,
    victoryPointBonus: 0,
    upgradeCost: { WHEAT: 1, ORE: 1 },
  },
  5: {
    level: 5,
    title: 'Carromato Nivel 5 (+1 PV)',
    movementPoints: 7,
    goldReward: 5,
    expelBarbarianMinRoll: 4,
    victoryPointBonus: 1,
    upgradeCost: { WOOD: 1, BRICK: 1, ORE: 1 },
  },
};

export const COMMODITY_DELIVERY_META: Record<
  CommodityDeliveryType,
  {
    name: string;
    emoji: string;
    targetDestination: DestinationType;
    targetName: string;
    color: string;
  }
> = {
  MARBLE: {
    name: 'Mármol',
    emoji: '🏛️',
    targetDestination: 'CASTLE',
    targetName: 'El Castillo',
    color: '#cbd5e1',
  },
  GLASS: {
    name: 'Vidrio',
    emoji: '🪟',
    targetDestination: 'CASTLE',
    targetName: 'El Castillo',
    color: '#38bdf8',
  },
  TOOLS: {
    name: 'Herramientas',
    emoji: '⚒️',
    targetDestination: 'QUARRY',
    targetName: 'Cantera de Mármol',
    color: '#f59e0b',
  },
  SAND: {
    name: 'Arena',
    emoji: '⏳',
    targetDestination: 'GLASSWORKS',
    targetName: 'Fábrica de Vidrio',
    color: '#fde047',
  },
};

export const DESTINATION_HEX_META: Record<
  DestinationType,
  {
    name: string;
    emoji: string;
    needsLabel: string;
    produces: [CommodityDeliveryType, CommodityDeliveryType];
    color: string;
  }
> = {
  CASTLE: {
    name: 'El Castillo',
    emoji: '🏰',
    needsLabel: 'Necesita Mármol y Vidrio',
    produces: ['TOOLS', 'SAND'],
    color: '#eab308',
  },
  QUARRY: {
    name: 'Cantera de Mármol',
    emoji: '⛏️',
    needsLabel: 'Necesita Herramientas',
    produces: ['MARBLE', 'SAND'],
    color: '#94a3b8',
  },
  GLASSWORKS: {
    name: 'Fábrica de Vidrio',
    emoji: '🏺',
    needsLabel: 'Necesita Arena',
    produces: ['GLASS', 'TOOLS'],
    color: '#0ea5e9',
  },
};

export function createFishTokenDeck(isExtended56: boolean, random: () => number): FishToken[] {
  const counts: Array<{ fishCount: 1 | 2 | 3; total: number }> = [
    { fishCount: 1, total: isExtended56 ? 15 : 11 },
    { fishCount: 2, total: isExtended56 ? 15 : 10 },
    { fishCount: 3, total: isExtended56 ? 13 : 8 },
  ];
  const deck: FishToken[] = [];
  let seq = 1;
  for (const item of counts) {
    for (let i = 0; i < item.total; i++) {
      deck.push({ id: `fish-${seq++}`, fishCount: item.fishCount });
    }
  }
  deck.push({ id: 'fish-old-boot', fishCount: 1, isOldBoot: true });
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createCatanEventsDeck(random: () => number): CatanEventCard[] {
  const rawCards: Omit<CatanEventCard, 'id'>[] = [
    // 2 (1x)
    { numberToken: 2, dicePair: [1, 1], eventType: 'PLENTIFUL_YEAR', title: 'Año abundante', description: 'Cada jugador recibe 1 carta de materia prima de la banca.' },
    // 3 (2x: 1 Conflicto, 1 Calma)
    { numberToken: 3, dicePair: [1, 2], eventType: 'CONFLICT', title: 'Conflicto', description: 'El jugador con más caballeros roba 1 carta al azar a un rival.' },
    { numberToken: 3, dicePair: [2, 1], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    // 4 (3x: 2 El ladrón se retira, 1 Calma)
    { numberToken: 4, dicePair: [2, 2], eventType: 'ROBBER_RETREATS', title: 'El ladrón se retira', description: 'El ladrón regresa inmediatamente al desierto.' },
    { numberToken: 4, dicePair: [1, 3], eventType: 'ROBBER_RETREATS', title: 'El ladrón se retira', description: 'El ladrón regresa inmediatamente al desierto.' },
    { numberToken: 4, dicePair: [3, 1], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    // 5 (4x: 1 Torneo de caballeros, 1 Beneficio comercial, 2 Calma)
    { numberToken: 5, dicePair: [2, 3], eventType: 'KNIGHT_TOURNAMENT', title: 'Torneo de caballeros', description: 'El jugador con más caballeros recibe 1 materia prima.' },
    { numberToken: 5, dicePair: [3, 2], eventType: 'TRADE_ADVANTAGE', title: 'Beneficio comercial', description: 'Quien tenga la Gran Ruta Comercial roba 1 carta a un rival.' },
    { numberToken: 5, dicePair: [1, 4], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    { numberToken: 5, dicePair: [4, 1], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    // 6 (5x: 1 Epidemia, 1 Terremoto, 1 Buenos vecinos, 2 Calma)
    { numberToken: 6, dicePair: [3, 3], eventType: 'EPIDEMIC', title: 'Epidemia', description: 'En este turno las ciudades solo producen 1 materia prima.' },
    { numberToken: 6, dicePair: [2, 4], eventType: 'EARTHQUAKE', title: 'Terremoto', description: 'Una carretera de cada jugador queda dañada (cuesta 1 Madera y 1 Arcilla repararla).' },
    { numberToken: 6, dicePair: [4, 2], eventType: 'GOOD_NEIGHBORS', title: 'Buenos vecinos', description: 'Cada jugador entrega 1 materia prima a su vecino de la izquierda.' },
    { numberToken: 6, dicePair: [1, 5], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    { numberToken: 6, dicePair: [5, 1], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    // 7 (6x: Asalto del ladrón)
    { numberToken: 7, dicePair: [3, 4], eventType: 'ROBBER_ATTACK', title: 'Asalto del ladrón', description: 'Quien tenga más de 7 cartas descarta la mitad y se mueve el ladrón.' },
    { numberToken: 7, dicePair: [4, 3], eventType: 'ROBBER_ATTACK', title: 'Asalto del ladrón', description: 'Quien tenga más de 7 cartas descarta la mitad y se mueve el ladrón.' },
    { numberToken: 7, dicePair: [2, 5], eventType: 'ROBBER_ATTACK', title: 'Asalto del ladrón', description: 'Quien tenga más de 7 cartas descarta la mitad y se mueve el ladrón.' },
    { numberToken: 7, dicePair: [5, 2], eventType: 'ROBBER_ATTACK', title: 'Asalto del ladrón', description: 'Quien tenga más de 7 cartas descarta la mitad y se mueve el ladrón.' },
    { numberToken: 7, dicePair: [1, 6], eventType: 'ROBBER_ATTACK', title: 'Asalto del ladrón', description: 'Quien tenga más de 7 cartas descarta la mitad y se mueve el ladrón.' },
    { numberToken: 7, dicePair: [6, 1], eventType: 'ROBBER_ATTACK', title: 'Asalto del ladrón', description: 'Quien tenga más de 7 cartas descarta la mitad y se mueve el ladrón.' },
    // 8 (5x: 1 Epidemia, 4 Calma)
    { numberToken: 8, dicePair: [4, 4], eventType: 'EPIDEMIC', title: 'Epidemia', description: 'En este turno las ciudades solo producen 1 materia prima.' },
    { numberToken: 8, dicePair: [3, 5], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    { numberToken: 8, dicePair: [5, 3], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    { numberToken: 8, dicePair: [2, 6], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    { numberToken: 8, dicePair: [6, 2], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    // 9 (4x: 1 Mar en calma, 3 Calma)
    { numberToken: 9, dicePair: [4, 5], eventType: 'CALM_SEA', title: 'Mar en calma', description: 'Quien tenga más edificios en puertos recibe 1 materia prima.' },
    { numberToken: 9, dicePair: [5, 4], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    { numberToken: 9, dicePair: [3, 6], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    { numberToken: 9, dicePair: [6, 3], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    // 10 (3x: 1 Ayuda vecinal, 2 Calma)
    { numberToken: 10, dicePair: [5, 5], eventType: 'NEIGHBORLY_HELP', title: 'Ayuda vecinal', description: 'El jugador con más PV entrega 1 recurso a un jugador con menos PV.' },
    { numberToken: 10, dicePair: [4, 6], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    { numberToken: 10, dicePair: [6, 4], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    // 11 (2x: 1 Ayuda vecinal, 1 Calma)
    { numberToken: 11, dicePair: [5, 6], eventType: 'NEIGHBORLY_HELP', title: 'Ayuda vecinal', description: 'El jugador con más PV entrega 1 recurso a un jugador con menos PV.' },
    { numberToken: 11, dicePair: [6, 5], eventType: 'CALM_WORK', title: 'Catán prospera', description: 'Los colonos son trabajadores y Catán prospera.' },
    // 12 (1x: Mar en calma)
    { numberToken: 12, dicePair: [6, 6], eventType: 'CALM_SEA', title: 'Mar en calma', description: 'Quien tenga más edificios en puertos recibe 1 materia prima.' },
  ];

  const cards: CatanEventCard[] = rawCards.map((c, idx) => ({ ...c, id: `ev-${idx + 1}` }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  const newYearCard: CatanEventCard = {
    id: 'ev-new-year',
    numberToken: 7,
    dicePair: [3, 4],
    eventType: 'NEW_YEAR',
    title: 'Nochevieja',
    description: 'Se baraja de nuevo el mazo de Eventos dejando 5 cartas al fondo y se revela una nueva carta.',
  };
  // Regla oficial (pág. 3): 31 cartas arriba, luego Nochevieja, y 5 cartas al fondo que no se llegan a usar
  return [...cards.slice(0, 31), newYearCard, ...cards.slice(31)];
}

export function createBarbariansScenarioDevDeck(
  scenario: BarbariansScenario,
  isExtended56: boolean,
  random: () => number
): BarbariansDevCard[] {
  const multiplier = isExtended56 ? 1.5 : 1;
  const deck: BarbariansDevCard[] = [];
  let seq = 1;

  if (scenario === 'BARBARIAN_ATTACK') {
    const specs: Array<{ type: BarbariansDevCard['type']; count: number; title: string; description: string }> = [
      {
        type: 'ARM_KNIGHT',
        count: Math.round(14 * multiplier),
        title: 'Armar caballero',
        description: 'Coloca inmediatamente 1 caballero de tu reserva en uno de los caminos del Castillo.',
      },
      {
        type: 'STRONG_KNIGHT',
        count: Math.round(4 * multiplier),
        title: 'Caballero fuerte',
        description: 'Coloca inmediatamente 1 caballero de tu reserva en cualquier camino libre del tablero.',
      },
      {
        type: 'PRISONER',
        count: Math.round(4 * multiplier),
        title: 'Prisionero',
        description: 'Retira 1 bárbaro de cualquier hexágono de costa y súmalo a tus prisioneros capturados.',
      },
      {
        type: 'TREASON',
        count: Math.round(4 * multiplier),
        title: 'Traición',
        description: 'Recibes +2 monedas de oro y reubicas hasta 2 bárbaros en otros hexágonos de costa.',
      },
    ];
    for (const s of specs) {
      for (let i = 0; i < s.count; i++) {
        deck.push({ id: `ba-dev-${seq++}`, type: s.type, title: s.title, description: s.description });
      }
    }
  } else if (scenario === 'TRADERS_AND_BARBARIANS') {
    const specs: Array<{ type: BarbariansDevCard['type']; count: number; title: string; description: string }> = [
      {
        type: 'TB_KNIGHT',
        count: Math.round(12 * multiplier),
        title: 'Caballero escolta',
        description: 'Mueve 1 bárbaro a otro camino. Si lo colocas en una carretera rival, robas 1 materia prima a su dueño.',
      },
      {
        type: 'GOOD_TRIP',
        count: Math.round(6 * multiplier),
        title: 'Buen viaje',
        description: 'Renueva todos los puntos de movimiento de tu carromato para desplazarte de nuevo en este turno.',
      },
      {
        type: 'TB_ROAD_BUILDING',
        count: Math.round(5 * multiplier),
        title: 'Construcción de carreteras',
        description: 'Construye inmediatamente hasta 2 carreteras sin coste.',
      },
      {
        type: 'TECH_TOOLS',
        count: 1,
        title: 'Avance tecnológico: Herramientas',
        description: '+1 Punto de Victoria inmediato.',
      },
      {
        type: 'TECH_QUARRY',
        count: 1,
        title: 'Avance tecnológico: Cantera',
        description: '+1 Punto de Victoria inmediato.',
      },
      {
        type: 'TECH_GLASS',
        count: 1,
        title: 'Avance tecnológico: Vidrio',
        description: '+1 Punto de Victoria inmediato.',
      },
    ];
    for (const s of specs) {
      for (let i = 0; i < s.count; i++) {
        deck.push({ id: `tb-dev-${seq++}`, type: s.type, title: s.title, description: s.description });
      }
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createEmptyBarbariansPlayer(scenario: BarbariansScenario, catanForTwo?: boolean): BarbariansPlayer {
  return {
    goldCoins: scenario === 'TRADERS_AND_BARBARIANS' ? 5 : 0,
    goldPurchasesThisTurn: 0,
    fishTokens: [],
    hasOldBoot: false,
    bridgesLeft: 3,
    isWealthiestSettler: false,
    isPoorestSettler: false,
    prisonersCount: 0,
    knightsReserve: 6,
    wagonLevel: 1,
    wagonVertexId: null,
    wagonMpRemaining: 4,
    wagonBoostedThisTurn: false,
    activeCommodityTile: null,
    deliveredCommoditiesCount: 0,
    scenarioDevCards: [],
    tradeTokens: catanForTwo ? 5 : 0,
    damagedRoadEdgeIds: [],
    harborPoints: 0,
  };
}

// ============================================================================
// 2. PIRATAS Y EXPLORADORES (EXPLORERS & PIRATES) CATALOG & RULES
// ============================================================================

export interface ExplorersPiratesScenarioSpec {
  id: ExplorersPiratesScenario;
  title: string;
  subtitle: string;
  badge: string;
  recommendedVP: number;
  missions: EPMissionId[];
  supports56Players: boolean;
  specialVPRule: string;
  rulesSummary: string[];
}

export const EXPLORERS_PIRATES_SCENARIOS: ExplorersPiratesScenarioSpec[] = [
  {
    id: 'LAND_HO',
    title: 'Escenario 1: ¡Tierra a la vista!',
    subtitle: 'Escenario de introducción: construye barcos, embarca colonos, explora el norte y el sur y funda ciudades portuarias.',
    badge: 'Introducción · 8 PV',
    recommendedVP: 8,
    missions: [],
    supports56Players: true,
    specialVPRule: '8 PV mediante Poblados (1 PV) y Ciudades Portuarias (2 PV).',
    rulesSummary: [
      'Cada jugador empieza con 1 Ciudad Portuaria, 1 Barco con Colono, 1 Poblado, 1 Carretera y 2 monedas de oro.',
      'Oro de compensación: si sale cualquier número distinto de 7 y no produces recursos, recibes +1 moneda de oro.',
      'Comercio marítimo 3:1 siempre disponible (también puedes cambiar 3 recursos iguales por 1 oro) y compra de 1 recurso por 2 oros (hasta 2 veces/turno).',
      'En la Fase de Movimiento tus barcos tienen 4 PM (+2 PM pagando 1 Lana). Descubre hexágonos inexplorados para ganar recursos u oro y desembarca tu Colono para fundar nuevos poblados.',
    ],
  },
  {
    id: 'PIRATE_LAIRS',
    title: 'Escenario 2: Las guaridas de piratas',
    subtitle: 'Recluta unidades de combate, aborda el barco pirata y conquista las guaridas de los ríos auríferos.',
    badge: 'Misión 1 · 12 PV',
    recommendedVP: 12,
    missions: ['PIRATE_LAIRS'],
    supports56Players: true,
    specialVPRule: '12 PV combinando asentamientos, casillas del marcador «Las guaridas de piratas» (hasta 4 PV) y la tarjeta de líder «El azote de los piratas» (+1 PV).',
    rulesSummary: [
      'Añade Unidades (1 Mineral + 1 Lana) y el Barco Pirata al sacar un 7 (roba recurso u oro a barcos rivales y cobra 1 oro de tributo).',
      'Al descubrir un Río Aurífero aparece una Guarida de Piratas. Desembarca unidades hasta reunir 3 para conquistarla.',
      'Al conquistar una guarida: cada participante recibe +2 oros y avanza 1 casilla en la misión; el héroe del duelo de dados avanza +1 casilla extra.',
      'La guarida liberada revela su número y pasa a ser un Río Aurífero que produce 2 monedas de oro por edificio.',
    ],
  },
  {
    id: 'FISH_FOR_CATAN',
    title: 'Escenario 3: Pescado para Catán',
    subtitle: 'Conquista las guaridas piratas y pesca bancos de peces en alta mar para abastecer al Consejo de Catán.',
    badge: 'Misiones 1 y 2 · 15 PV',
    recommendedVP: 15,
    missions: ['PIRATE_LAIRS', 'FISH_FOR_CATAN'],
    supports56Players: true,
    specialVPRule: '15 PV con las misiones «Las guaridas de piratas» y «Pescado para Catán» (+1 PV al líder «El mejor pescador»).',
    rulesSummary: [
      'Incluye el hexágono central del Consejo de Catán con sus puertos de descarga.',
      'Al descubrir hexágonos de peces (numerados 1–6) recibes +2 oros.',
      'En tu fase de movimiento tira 1 dado para hacer aparecer bancos de peces; recógelos con un barco vacío y descárgalos en el Consejo de Catán para avanzar en el marcador de pesca.',
    ],
  },
  {
    id: 'SPICES_FOR_CATAN',
    title: 'Escenario 4: Especias para Catán',
    subtitle: 'Pesca para el Consejo y envía mercaderes a las aldeas de las especias para obtener sacos y ventajas permanentes.',
    badge: 'Misiones 2 y 3 · 15 PV',
    recommendedVP: 15,
    missions: ['FISH_FOR_CATAN', 'SPICES_FOR_CATAN'],
    supports56Players: true,
    specialVPRule: '15 PV con las misiones «Pescado para Catán» y «Especias para Catán» (+1 PV al líder «El mejor mercader de especias»).',
    rulesSummary: [
      'Al descubrir una aldea de especias recibes +2 oros y se colocan tantos sacos de especias como jugadores haya.',
      'Desembarca 1 unidad en la aldea para cargar 1 saco de especias en tu barco y desbloquear permanentemente su ventaja:',
      '• A toda vela: +1 punto de movimiento permanente para todos tus barcos (hasta +2 con dos aldeas).',
      '• Bonificación contra piratas: ahuyenta al barco pirata sacando 5 o 4 en el dado además del 6.',
      '• Comercio de oro: cambia 1 materia prima cualquiera por 1 moneda de oro durante tu turno.',
    ],
  },
  {
    id: 'EXPLORERS_AND_PIRATES_FULL',
    title: 'Escenario 5: Piratas y exploradores',
    subtitle: 'La gran campaña completa con las tres misiones simultáneas: Guaridas Piratas, Pescado y Especias para Catán.',
    badge: 'Las 3 Misiones · 17 PV',
    recommendedVP: 17,
    missions: ['PIRATE_LAIRS', 'FISH_FOR_CATAN', 'SPICES_FOR_CATAN'],
    supports56Players: true,
    specialVPRule: '17 PV combinando asentamientos, los 3 marcadores de misión (hasta 4 PV cada uno) y las 3 tarjetas de campeón (+1 PV cada una).',
    rulesSummary: [
      'Combina las 3 misiones oficiales de la expansión en el mapa oceánico completo (disponible para 2–4 y 5–6 jugadores).',
      'Gestiona tu flota de barcos, colonos y unidades entre la conquista de guaridas en ríos de oro, la pesca en alta mar y el comercio de especias hacia el Consejo de Catán.',
    ],
  },
];

export const EP_MISSION_META: Record<
  EPMissionId,
  {
    id: EPMissionId;
    title: string;
    cardTitle: string;
    emoji: string;
    color: string;
    badgeBg: string;
    description: string;
    stepVP: number[]; // index 0..7 -> VP earned on track
  }
> = {
  PIRATE_LAIRS: {
    id: 'PIRATE_LAIRS',
    title: 'Las guaridas de piratas',
    cardTitle: 'El azote de los piratas (+1 PV)',
    emoji: '🏴‍☠️',
    color: '#ef4444',
    badgeBg: 'bg-red-950 border-red-500/60 text-red-200',
    description: 'Conquista guaridas piratas en los ríos auríferos desembarcando unidades.',
    stepVP: [0, 1, 1, 2, 2, 3, 3, 4],
  },
  FISH_FOR_CATAN: {
    id: 'FISH_FOR_CATAN',
    title: 'Pescado para Catán',
    cardTitle: 'El mejor pescador (+1 PV)',
    emoji: '🐟',
    color: '#38bdf8',
    badgeBg: 'bg-sky-950 border-sky-500/60 text-sky-200',
    description: 'Pesca bancos de peces y descárgalos en los puertos del Consejo de Catán.',
    stepVP: [0, 1, 1, 2, 2, 3, 3, 4],
  },
  SPICES_FOR_CATAN: {
    id: 'SPICES_FOR_CATAN',
    title: 'Especias para Catán',
    cardTitle: 'El mejor mercader de especias (+1 PV)',
    emoji: '🌶️',
    color: '#22c55e',
    badgeBg: 'bg-emerald-950 border-emerald-500/60 text-emerald-200',
    description: 'Traba amistad con las aldeas de las especias y entrega los sacos en el Consejo de Catán.',
    stepVP: [0, 1, 1, 2, 2, 3, 3, 4],
  },
};

export const EP_SPICE_PERK_META: Record<
  SpicePerkType,
  {
    name: string;
    shortLabel: string;
    description: string;
    emoji: string;
  }
> = {
  SWIFT_VOYAGE_1: {
    name: 'Aldea A Toda Vela I',
    shortLabel: '+1 PM Barcos',
    description: 'Aumenta permanentemente en +1 los puntos de movimiento de todos tus barcos.',
    emoji: '⛵',
  },
  SWIFT_VOYAGE_2: {
    name: 'Aldea A Toda Vela II',
    shortLabel: '+1 PM Barcos',
    description: 'Aumenta permanentemente en +1 adicional los puntos de movimiento de todos tus barcos.',
    emoji: '⛵',
  },
  PIRATE_BONUS_5: {
    name: 'Aldea Antipiratas (Dado 5)',
    shortLabel: 'Pirata 5–6',
    description: 'Tus barcos ahuyentan al barco pirata rival sacando un 5 o un 6 en el dado.',
    emoji: '⚔️',
  },
  PIRATE_BONUS_4: {
    name: 'Aldea Antipiratas (Dado 4)',
    shortLabel: 'Pirata 4–6',
    description: 'Tus barcos ahuyentan al barco pirata rival sacando un 4, 5 o 6 en el dado.',
    emoji: '⚔️',
  },
  GOLD_TRADE_1: {
    name: 'Aldea Mercader de Oro I',
    shortLabel: '1 Recurso → 1 Oro',
    description: 'Una vez por turno puedes vender 1 materia prima cualquiera a cambio de 1 moneda de oro.',
    emoji: '🪙',
  },
  GOLD_TRADE_2: {
    name: 'Aldea Mercader de Oro II',
    shortLabel: '1 Recurso → 1 Oro',
    description: 'Te permite vender una segunda materia prima por 1 moneda de oro en tu turno.',
    emoji: '🪙',
  },
};

export const EP_BUILDING_COSTS: Record<
  'HARBOR_CITY' | 'SHIP' | 'SETTLER' | 'UNIT' | 'SHIP_BOOST',
  Partial<Record<ResourceType, number>>
> = {
  HARBOR_CITY: { WHEAT: 2, ORE: 2 },
  SHIP: { WOOD: 1, SHEEP: 1 },
  SETTLER: { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 },
  UNIT: { ORE: 1, SHEEP: 1 },
  SHIP_BOOST: { SHEEP: 1 },
};

export function getCargoSlotSize(item: EPCargoItem): 1 | 2 {
  return item === 'SETTLER' || item === 'FISH_HAUL' ? 2 : 1;
}

export function getCargoUsedSlots(cargo: EPCargoItem[]): number {
  return cargo.reduce((sum, item) => sum + getCargoSlotSize(item), 0);
}

export function canFitCargoItem(cargo: EPCargoItem[], item: EPCargoItem): boolean {
  return getCargoUsedSlots(cargo) + getCargoSlotSize(item) <= 2;
}

export function getPlayerShipBaseMP(epPlayer: ExplorersPiratesPlayer): number {
  let mp = 4;
  if (epPlayer.unlockedSpicePerks.includes('SWIFT_VOYAGE_1')) mp += 1;
  if (epPlayer.unlockedSpicePerks.includes('SWIFT_VOYAGE_2')) mp += 1;
  return mp;
}

export function createEmptyExplorersPiratesPlayer(): ExplorersPiratesPlayer {
  return {
    goldCoins: 2, // Regla oficial: cada jugador empieza con 2 oros
    goldPurchasesThisTurn: 0,
    spiceGoldTradesThisTurn: 0,
    harborCitiesLeft: 4,
    shipsLeft: 3,
    settlersLeft: 2,
    unitsLeft: 9,
    missionProgress: {
      PIRATE_LAIRS: 0,
      FISH_FOR_CATAN: 0,
      SPICES_FOR_CATAN: 0,
    },
    unlockedSpicePerks: [],
    colonizedRegions: [],
  };
}
