import {
  DevCardType,
  ExpansionModule,
  GameConfig,
  PlayerColor,
  PortType,
  ResourceType,
  SeafarersBoardSize,
  SeafarersScenario,
  TerrainType,
  WonderId,
} from './types';

/**
 * Rutas de cartas de desarrollo originales extraídas del juego físico.
 */
export const DEV_CARD_IMAGE_PATHS: Record<DevCardType, string> = {
  KNIGHT: '/assets/devcards/knight.png',
  VICTORY_POINT: '/assets/devcards/victory_point.png',
  ROAD_BUILDING: '/assets/devcards/road_building.png',
  YEAR_OF_PLENTY: '/assets/devcards/year_of_plenty.png',
  MONOPOLY: '/assets/devcards/monopoly.png',
};

export const DEV_CARD_VP_TITLE_IMAGES: Record<string, string> = {
  Ayuntamiento: '/assets/devcards/vp_town_hall.png',
  Biblioteca: '/assets/devcards/vp_library.png',
  Mercado: '/assets/devcards/vp_market.png',
  'Universidad de Catan': '/assets/devcards/vp_university.png',
  'Gran Catedral': '/assets/devcards/vp_church.png',
};

export function getDevCardImagePath(type: DevCardType, title?: string): string {
  if (type === 'VICTORY_POINT' && title && DEV_CARD_VP_TITLE_IMAGES[title]) {
    return DEV_CARD_VP_TITLE_IMAGES[title];
  }
  return DEV_CARD_IMAGE_PATHS[type];
}

/**
 * Rutas de texturas de alta resolución (.jpg / .webp / .png) para cada tipo de terreno.
 */
export const TILE_TEXTURE_PATHS: Record<TerrainType, string> = {
  WOOD: '/assets/terrains/forest.png?v=3',
  BRICK: '/assets/terrains/hills.png?v=3',
  SHEEP: '/assets/terrains/pasture.png?v=3',
  WHEAT: '/assets/terrains/fields.png?v=3',
  ORE: '/assets/terrains/mountains.png?v=3',
  DESERT: '/assets/terrains/desert.png?v=3',
  SEA: '/assets/terrains/ocean.jpg?v=3',
  GOLD: '/assets/terrains/gold_river.png?v=4',
  FOG: '/assets/terrains/ocean.jpg?v=3',
};

/**
 * Rutas de logotipos/iconos oficiales para cada recurso en `/assets/icons/`.
 * Puedes sustituir los archivos en `/public/assets/icons/` por `.png`, `.webp` o `.svg`.
 */
export const RESOURCE_ICON_PATHS: Record<ResourceType, string> = {
  WOOD: '/assets/icons/wood.svg',
  BRICK: '/assets/icons/brick.svg',
  SHEEP: '/assets/icons/sheep.svg',
  WHEAT: '/assets/icons/wheat.svg',
  ORE: '/assets/icons/ore.svg',
};

/**
 * Diseños originales de las cartas de recursos en `/assets/cards/` para el abanico pixel-perfect
 * y para las animaciones de recolección.
 */
export const RESOURCE_CARD_PATHS: Record<ResourceType, string> = {
  WOOD: '/assets/cards/wood.jpg',
  BRICK: '/assets/cards/brick.jpg',
  SHEEP: '/assets/cards/sheep.jpg',
  WHEAT: '/assets/cards/wheat.jpg',
  ORE: '/assets/cards/ore.jpg',
};

export const EXPANSION_CATALOG: Array<{
  id: ExpansionModule;
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  lockedBase?: boolean;
}> = [
  {
    id: 'BASE',
    title: 'Juego Base (Colonos de Catan)',
    subtitle: 'Comercio, construcción, Gran Ruta y Gran Ejército (sin expansiones).',
    badge: 'Núcleo Oficial',
    icon: 'BASE',
  },
  {
    id: 'SEAFARERS',
    title: 'Navegantes de Catan',
    subtitle: 'Rutas marítimas con Barcos, Archipiélagos, El Pirata y Ríos de Oro.',
    badge: 'Expansión Marítima',
    icon: 'MAR',
  },
  {
    id: 'CITIES_AND_KNIGHTS',
    title: 'Ciudades y Caballeros',
    subtitle: 'Mercancías (Papel, Moneda, Tela), Metrópolis, Caballeros en tablero e Invasión.',
    badge: 'Expansión Táctica',
    icon: 'CYC',
  },
  {
    id: 'BARBARIANS',
    title: 'Mercaderes y Bárbaros',
    subtitle: 'Incursiones bárbaras, Pescadores de Catan, Ríos, Caravanas y Eventos.',
    badge: 'Módulos y Escenarios',
    icon: 'MYB',
  },
  {
    id: 'EXPLORERS_AND_PIRATES',
    title: 'Piratas y Exploradores',
    subtitle: 'Barcos con bodega de carga, Niebla de Guerra, bancos de peces y especias.',
    badge: 'Expansión de Aventura',
    icon: 'PYE',
  },
];

export const ALL_RESOURCES: ResourceType[] = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'];

export const RESOURCE_META: Record<
  ResourceType,
  {
    name: string;
    shortName: string;
    terrainName: string;
    color: string;
    bgHex: string;
    accentHex: string;
    badgeBg: string;
    badgeText: string;
    emoji: string;
    iconPath: string;
  }
> = {
  WOOD: {
    name: 'Madera',
    shortName: 'Madera',
    terrainName: 'Bosque',
    color: '#15803d',
    bgHex: '#166534',
    accentHex: '#22c55e',
    badgeBg: 'bg-emerald-900/80 border-emerald-500/50',
    badgeText: 'text-emerald-200',
    emoji: '🪵',
    iconPath: '/assets/icons/wood.svg',
  },
  BRICK: {
    name: 'Arcilla',
    shortName: 'Arcilla',
    terrainName: 'Colinas',
    color: '#b91c1c',
    bgHex: '#991b1b',
    accentHex: '#ef4444',
    badgeBg: 'bg-red-900/80 border-red-500/50',
    badgeText: 'text-red-200',
    emoji: '🧱',
    iconPath: '/assets/icons/brick.svg',
  },
  SHEEP: {
    name: 'Oveja',
    shortName: 'Oveja',
    terrainName: 'Pastos',
    color: '#65a30d',
    bgHex: '#4d7c0f',
    accentHex: '#84cc16',
    badgeBg: 'bg-lime-900/80 border-lime-500/50',
    badgeText: 'text-lime-200',
    emoji: '🐑',
    iconPath: '/assets/icons/sheep.svg',
  },
  WHEAT: {
    name: 'Trigo',
    shortName: 'Trigo',
    terrainName: 'Campos',
    color: '#ca8a04',
    bgHex: '#d97706',
    accentHex: '#facc15',
    badgeBg: 'bg-amber-900/80 border-amber-500/50',
    badgeText: 'text-amber-200',
    emoji: '🌾',
    iconPath: '/assets/icons/wheat.svg',
  },
  ORE: {
    name: 'Piedra',
    shortName: 'Piedra',
    terrainName: 'Montañas',
    color: '#475569',
    bgHex: '#334155',
    accentHex: '#94a3b8',
    badgeBg: 'bg-slate-800/90 border-slate-500/50',
    badgeText: 'text-slate-200',
    emoji: '⛰️',
    iconPath: '/assets/icons/ore.svg',
  },
};

export const TERRAIN_META: Record<
  TerrainType,
  { name: string; fill: string; stroke: string; emoji: string }
> = {
  WOOD: { name: 'Bosque (Madera)', fill: '#15803d', stroke: '#14532d', emoji: '🌲' },
  BRICK: { name: 'Colina (Arcilla)', fill: '#b45309', stroke: '#7c2d12', emoji: '🧱' },
  SHEEP: { name: 'Pasto (Oveja)', fill: '#65a30d', stroke: '#365314', emoji: '🐑' },
  WHEAT: { name: 'Campo (Trigo)', fill: '#eab308', stroke: '#a16207', emoji: '🌾' },
  ORE: { name: 'Montaña (Piedra)', fill: '#475569', stroke: '#1e293b', emoji: '⛰️' },
  DESERT: { name: 'Desierto', fill: '#d6bc8b', stroke: '#a68a56', emoji: '🏜️' },
  SEA: { name: 'Mar', fill: '#0c4a6e', stroke: '#075985', emoji: '🌊' },
  GOLD: { name: 'Río de Oro', fill: '#d97706', stroke: '#b45309', emoji: '✨' },
  FOG: { name: 'Niebla Marina (Tierra Ignota)', fill: '#334155', stroke: '#1e293b', emoji: '🌫️' },
};

export const PLAYER_COLORS: Record<
  PlayerColor,
  {
    name: string;
    primary: string;
    secondary: string;
    stroke: string;
    twBg: string;
    twBorder: string;
    twText: string;
  }
> = {
  RED: {
    name: 'Rojo Imperial',
    primary: '#ef4444',
    secondary: '#991b1b',
    stroke: '#fef2f2',
    twBg: 'bg-red-600',
    twBorder: 'border-red-500',
    twText: 'text-red-400',
  },
  BLUE: {
    name: 'Azul Real',
    primary: '#3b82f6',
    secondary: '#1e40af',
    stroke: '#eff6ff',
    twBg: 'bg-blue-600',
    twBorder: 'border-blue-500',
    twText: 'text-blue-400',
  },
  ORANGE: {
    name: 'Naranja Ámbar',
    primary: '#f97316',
    secondary: '#9a3412',
    stroke: '#fff7ed',
    twBg: 'bg-orange-500',
    twBorder: 'border-orange-500',
    twText: 'text-orange-400',
  },
  WHITE: {
    name: 'Blanco Marfil',
    primary: '#f1f5f9',
    secondary: '#475569',
    stroke: '#0f172a',
    twBg: 'bg-slate-200',
    twBorder: 'border-slate-300',
    twText: 'text-slate-100',
  },
  GREEN: {
    name: 'Verde Esmeralda',
    primary: '#10b981',
    secondary: '#065f46',
    stroke: '#ecfdf5',
    twBg: 'bg-emerald-600',
    twBorder: 'border-emerald-500',
    twText: 'text-emerald-400',
  },
  PURPLE: {
    name: 'Púrpura Noble',
    primary: '#a855f7',
    secondary: '#581c87',
    stroke: '#faf5ff',
    twBg: 'bg-purple-600',
    twBorder: 'border-purple-500',
    twText: 'text-purple-400',
  },
};

export const CUSTOM_AVATAR_PONTEVEDRA = '/assets/avatars/pontevedra.png';
export const CUSTOM_AVATAR_CELTA = '/assets/avatars/celta.png';
export const DEPOR_AVATAR = '/assets/avatars/depor.png';

export const PONFE_AVATAR = '/assets/avatars/ponfe.png';

export const BOT_AVATAR_LIST = [
  '👑',
  '⚔️',
  '🦁',
  '🐺',
  '🦅',
  '⚓',
  '🌲',
  '🌾',
  '🛡️',
  '⚡',
  '🔥',
  '🧙',
];

export const AVATAR_LIST = [
  ...BOT_AVATAR_LIST,
  CUSTOM_AVATAR_PONTEVEDRA,
  CUSTOM_AVATAR_CELTA,
  DEPOR_AVATAR,
  PONFE_AVATAR,
];

export function isImageAvatar(avatar?: string): boolean {
  return Boolean(avatar && (avatar.startsWith('/') || avatar.startsWith('http')));
}

export const BUILDING_COSTS: Record<
  'ROAD' | 'SHIP' | 'SETTLEMENT' | 'CITY' | 'DEV_CARD',
  Record<ResourceType, number>
> = {
  ROAD: { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 },
  SHIP: { WOOD: 1, BRICK: 0, SHEEP: 1, WHEAT: 0, ORE: 0 },
  SETTLEMENT: { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 },
  CITY: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 },
  DEV_CARD: { WOOD: 0, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 1 },
};

export interface SeafarersScenarioMeta {
  id: SeafarersScenario;
  number: number;
  title: string;
  subtitle: string;
  badge: string;
  recommendedVP: number;
  category: 'BÁSICO' | 'AVANZADO' | 'MUNDO LIBRE';
  description: string;
  specialVPRule: string;
  variableSetupRule: string;
  catanChitsCount: { '3P': number; '4P': number; '5_6P': number };
}

export const SEAFARERS_SCENARIOS: SeafarersScenarioMeta[] = [
  {
    id: 'HEADING_FOR_NEW_SHORES',
    number: 1,
    title: 'Rumbo a nuevas orillas',
    subtitle: '1 Isla principal donde todos inician + islotes exteriores separados por mar con Ríos de Oro (+2 PV).',
    badge: 'Escenario 1',
    recommendedVP: 14,
    category: 'BÁSICO',
    description: 'Los colonos parten de su isla madre hacia el horizonte marítimo en busca de islas exteriores con ricos yacimientos de oro.',
    specialVPRule: '+2 PV (2 Fichas Catán) bajo el primer poblado que construyas en cada uno de los islotes exteriores.',
    variableSetupRule: 'Se barajan por separado los terrenos, números y puertos de la Isla Principal y los terrenos/números de los islotes exteriores.',
    catanChitsCount: { '3P': 18, '4P': 24, '5_6P': 48 },
  },
  {
    id: 'THE_FOUR_ISLANDS',
    number: 2,
    title: 'Las cuatro islas (3-4J) / Las seis islas (5-6J)',
    subtitle: '4 islas (ó 6 en 5-6J) separadas por canales oceánicos. +2 PV por cada isla extranjera colonizada.',
    badge: 'Escenario 2',
    recommendedVP: 13,
    category: 'BÁSICO',
    description: 'Un archipiélago de cuatro (o seis) islas separadas por canales de mar donde la expansión hacia islas extrañas otorga +2 PV.',
    specialVPRule: '+2 PV (2 Fichas Catán) bajo el primer poblado que construyas en cada isla "extraña" (donde no hayas fundado en la fase inicial).',
    variableSetupRule: 'Se mantiene intacta la silueta de las 4 (o 6) islas y se barajan sus terrenos, fichas numeradas y puertos (evitando 2 y 12 en bosque/pasto).',
    catanChitsCount: { '3P': 18, '4P': 24, '5_6P': 60 },
  },
  {
    id: 'OCEANIA',
    number: 3,
    title: 'Oceanía (Tierra ignota)',
    subtitle: 'Dos islas costeras en los extremos y una franja central de Tierra Ignota (niebla marina). 1 recurso gratis al descubrir.',
    badge: 'Escenario 3',
    recommendedVP: 12,
    category: 'BÁSICO',
    description: 'Dos franjas insulares en los extremos del tablero separadas por mar de la Tierra Ignota central. Al llegar con un barco o carretera a la niebla, se revela el terreno y recibes 1 recurso gratis.',
    specialVPRule: 'No se usan Fichas Catán; cada terreno fértil o río aurífero descubierto en la niebla otorga 1 materia prima inmediata.',
    variableSetupRule: 'Solo cambian terrenos, números y tipos de puerto de las islas conocidas. La zona de descubrimiento se conserva. Se permiten números rojos contiguos.',
    catanChitsCount: { '3P': 0, '4P': 0, '5_6P': 0 },
  },
  {
    id: 'THROUGH_THE_DESERT',
    number: 4,
    title: 'A través del desierto',
    subtitle: 'Un cinturón de desiertos divide la isla junto a un entrante de mar, más islotes orientales de oro. +2 PV.',
    badge: 'Escenario 4',
    recommendedVP: 14,
    category: 'BÁSICO',
    description: 'Los colonos inician en la isla principal. Al otro lado del cinturón de desiertos y en los islotes orientales esperan tierras vírgenes y ríos auríferos.',
    specialVPRule: '+2 PV (2 Fichas Catán) por el primer poblado en cada islote exterior y +2 PV por el primer poblado en la franja al otro lado del desierto.',
    variableSetupRule: 'Los desiertos quedan fijos; se barajan por un lado los terrenos/números/puertos de la Isla Principal y por otro los de la franja noroeste e islotes (sin 6 ni 8 en ríos de oro).',
    catanChitsCount: { '3P': 24, '4P': 32, '5_6P': 60 },
  },
  {
    id: 'THE_FORGOTTEN_TRIBE',
    number: 5,
    title: 'El pueblo perdido',
    subtitle: 'Isla central alargada rodeada de mar y 6 islotes inhabitables con Fichas Catán (+1 PV), Cartas de Desarrollo y Puertos.',
    badge: 'Escenario 5',
    recommendedVP: 13,
    category: 'AVANZADO',
    description: 'En los 6 islotes exteriores sin números no se pueden fundar poblados, pero al conectar un barco a sus costas reclamas regalos del pueblo perdido.',
    specialVPRule: '+1 PV por cada Ficha Catán reclamada en las costas de los islotes, más Cartas de Desarrollo gratis y Puertos colocables en tus poblados costeros.',
    variableSetupRule: 'Solo se barajan los hexágonos de terreno y fichas numeradas de la Isla Principal (procurando que los hexágonos del extremo derecho no reciban 5, 6, 8 ó 9).',
    catanChitsCount: { '3P': 8, '4P': 8, '5_6P': 10 },
  },
  {
    id: 'CLOTH_FOR_CATAN',
    number: 6,
    title: 'Telas para Catán',
    subtitle: '3 poblados iniciales. Islas principales e islotes centrales con aldeas indígenas que producen balas de tela (2 Fichas Catán = 1 PV).',
    badge: 'Escenario 6',
    recommendedVP: 14,
    category: 'AVANZADO',
    description: 'Cada aldea indígena comienza con 5 Fichas Catán (balas de tela). Al conectar con barco recibes 1 tela y cada vez que sale el número de la aldea produce telas.',
    specialVPRule: 'Cada 2 Fichas Catán (balas de tela) valen 1 Punto de Victoria. Termina a 14 PV o cuando solo queden fichas en 3 aldeas.',
    variableSetupRule: 'Solo se barajan los terrenos y números de las dos islas principales; los puertos, islotes centrales y fichas de las aldeas permanecen fijos.',
    catanChitsCount: { '3P': 50, '4P': 50, '5_6P': 70 },
  },
  {
    id: 'THE_PIRATE_ISLANDS',
    number: 7,
    title: 'Las islas de los piratas',
    subtitle: 'Flota pirata en circuito horario, Barcos de Guerra con caballeros y Fortalezas Piratas con 3 Fichas Catán por jugador.',
    badge: 'Escenario 7',
    recommendedVP: 10,
    category: 'AVANZADO',
    description: 'Todos comienzan con 3 poblados en la isla del este. Convierte barcos en Barcos de Guerra jugando Caballeros, resiste las incursiones piratas y conquista tu Fortaleza Pirata.',
    specialVPRule: 'Cada Fortaleza Pirata tiene 3 Fichas Catán de defensa. Al derrotarla 3 veces se convierte en poblado propio (+1 PV). Para ganar necesitas conquistarla Y tener 10 PV.',
    variableSetupRule: 'Para mantener el equilibrio del escenario, todos los terrenos y números permanecen fijos y solo se barajan los puertos.',
    catanChitsCount: { '3P': 9, '4P': 12, '5_6P': 18 },
  },
  {
    id: 'WONDERS_OF_CATAN',
    number: 8,
    title: 'Las maravillas catanas',
    subtitle: 'Construye las 4 fases de una Maravilla legendaria (marcada con tu Ficha Catán) o gana con 10 PV y la maravilla más avanzada.',
    badge: 'Escenario 8',
    recommendedVP: 10,
    category: 'AVANZADO',
    description: 'Gran Isla con estrechos para el Gran Puente, desiertos para la Gran Muralla e islotes exteriores (+1 PV con Ficha Catán al colonizarlos).',
    specialVPRule: '1 Ficha Catán marca el nivel (1..4) de tu Maravilla; además recibes +1 PV (1 Ficha Catán) por cada poblado construido en un islote exterior.',
    variableSetupRule: 'Se barajan los terrenos fértiles y números de la isla principal; los puertos, islotes y franja que sustituye a los desiertos quedan fijos y junto a ella no hay 6 ni 8.',
    catanChitsCount: { '3P': 10, '4P': 10, '5_6P': 18 },
  },
  {
    id: 'NEW_WORLD',
    number: 9,
    title: 'Un nuevo mundo',
    subtitle: 'Archipiélago abierto donde todas las casillas de mar, tierra, números y puertos se mezclan al azar. +1 PV por isla extraña.',
    badge: 'Escenario 9',
    recommendedVP: 12,
    category: 'MUNDO LIBRE',
    description: 'Exploración libre en un archipiélago irrepetible donde cada isla "extraña" colonizada después de la fundación otorga +1 PV.',
    specialVPRule: '+1 PV (1 Ficha Catán) bajo el primer poblado que construyas en cada isla "extraña".',
    variableSetupRule: 'Todos los hexágonos de mar y terreno, fichas numeradas y puertos se regeneran al azar (evitando 6 y 8 juntos o en ríos de oro).',
    catanChitsCount: { '3P': 16, '4P': 16, '5_6P': 50 },
  },
  {
    id: 'PROCEDURAL_ARCHIPELAGO',
    number: 0,
    title: 'Archipiélago Libre',
    subtitle: 'Mapa dinámico con múltiples atolones dispersos, ríos de oro y canales oceánicos abiertos.',
    badge: 'Generador Libre',
    recommendedVP: 13,
    category: 'MUNDO LIBRE',
    description: 'Configuración equilibrada de islas y canales de libre navegación.',
    specialVPRule: '+1 PV (1 Ficha Catán) bajo el primer poblado en cada isla exterior.',
    variableSetupRule: 'Generación procedural completa de islas, recursos, números y puertos.',
    catanChitsCount: { '3P': 16, '4P': 16, '5_6P': 30 },
  },
];

export interface WonderMeta {
  id: WonderId;
  name: string;
  description: string;
  prerequisiteDescription: string;
  icon: string;
  cardImage?: string;
  stageCost?: Partial<Record<ResourceType, number>>;
  onlyExtended?: boolean;
}

export const WONDERS_CATALOG: Record<WonderId, WonderMeta> = {
  GREAT_BRIDGE: {
    id: 'GREAT_BRIDGE',
    name: 'El Gran Puente',
    description: 'Un monumental viaducto que une dos islas a través de un canal estrecho.',
    prerequisiteDescription: 'Requiere tener un poblado o ciudad en uno de los marcadores violetas del estrecho.',
    icon: '🌉',
  },
  GREAT_BRIDGE_NORTH: {
    id: 'GREAT_BRIDGE_NORTH',
    name: 'Gran Puente del norte',
    description: 'La maravilla del estrecho norte de la ampliación para 5 y 6 jugadores.',
    prerequisiteDescription: 'Un poblado o ciudad en un cuadrado violeta del estrecho del norte.',
    icon: '🌉',
    cardImage: '/assets/wonders/great_bridge_north.png',
    stageCost: { WOOD: 3, WHEAT: 1, SHEEP: 1 },
    onlyExtended: true,
  },
  GREAT_WALL: {
    id: 'GREAT_WALL',
    name: 'La Gran Muralla',
    description: 'Una colosal fortificación de piedra que protege las fronteras de Catán.',
    prerequisiteDescription: 'Requiere tener un poblado o ciudad en uno de los marcadores marrones.',
    icon: '🧱',
  },
  CATHEDRAL: {
    id: 'CATHEDRAL',
    name: 'La Catedral',
    description: 'Un majestuoso templo de fe y arquitectura gótica catana.',
    prerequisiteDescription: 'Requiere al menos 1 Ciudad construida y tener al menos 6 PV.',
    icon: '⛪',
  },
  GREAT_THEATRE: {
    id: 'GREAT_THEATRE',
    name: 'El Gran Teatro',
    description: 'Un coliseo de artes y espectáculos para todo el archipiélago.',
    prerequisiteDescription: 'Requiere al menos 2 Ciudades construidas.',
    icon: '🎭',
  },
  COLOSSUS: {
    id: 'COLOSSUS',
    name: 'El Coloso',
    description: 'Una estatua de bronce colosal que vigila la bocana del puerto principal.',
    prerequisiteDescription: 'Requiere tener una Ciudad portuaria y una ruta de al menos 5 segmentos.',
    icon: '🗽',
  },
  GREAT_LIBRARY: {
    id: 'GREAT_LIBRARY',
    name: 'La Gran Biblioteca',
    description: 'El mayor archivo de sabiduría y cartografía marítima de Catán (Ampliación 5-6J).',
    prerequisiteDescription: 'Requiere al menos 2 Ciudades construidas.',
    icon: '🏛️',
    cardImage: '/assets/wonders/great_library.png',
    stageCost: { WOOD: 1, BRICK: 1, SHEEP: 3 },
    onlyExtended: true,
  },
};

export const CATAN_CHIT_IMAGE_PATH = '/assets/tokens/catan_chit.png';

export const WONDER_STAGE_COST: Record<ResourceType, number> = {
  WOOD: 1,
  BRICK: 1,
  SHEEP: 1,
  WHEAT: 1,
  ORE: 1,
};

export function getWonderStageCost(wonderId: WonderId): Record<ResourceType, number> {
  const cost = WONDERS_CATALOG[wonderId].stageCost;
  return cost ? Object.fromEntries(ALL_RESOURCES.map(resource => [resource, cost[resource] || 0])) as Record<ResourceType, number> : { ...WONDER_STAGE_COST };
}

export function getAvailableWonders(size: SeafarersBoardSize = '4P'): WonderMeta[] {
  return Object.values(WONDERS_CATALOG).filter(wonder => !wonder.onlyExtended || size === '5_6P');
}

export const PROBABILITY_PIPS: Record<number, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  boardMode: 'STANDARD_3_4',
  preventAdjacentRedNumbers: true,
  desertInCenter: true,
  minSettlementDistance: 2,
  allowInstantDevCards: false,
  maxOneDevCardPerTurn: false,
  initialSettlementsGiveResources: true,
  turnActionRestriction: 'LEVEL_1_FREE',
  maxInfrastructurePerTurn: 'UNLIMITED',
  exclusiveTradeOrSpend: false,
  robberDiscardMode: 'MANUAL',
  victoryPointsTarget: 10,
  turnTimerSeconds: 90,
  expansionModule: 'BASE',
  enabledExpansions: ['BASE'],
  maxPlayers: 4,
  seafarersScenario: 'HEADING_FOR_NEW_SHORES',
  seafarersBoardSize: '4P',
  seafarersMoveShipAllowed: true,
  seafarersCoastConnection: 'REQUIRE_SETTLEMENT',
  seafarersPirateMode: 'ACTIVE',
  seafarersDiscoveryVPMode: 'STANDARD_2VP',
  seafarersSetupShipRule: 'ANY_ROUND',
};

export const STANDARD_TERRAINS_19: TerrainType[] = [
  'WOOD', 'WOOD', 'WOOD', 'WOOD',
  'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP',
  'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT',
  'BRICK', 'BRICK', 'BRICK',
  'ORE', 'ORE', 'ORE',
  'DESERT',
];

export const STANDARD_NUMBERS_18: number[] = [
  5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11,
];

export const STANDARD_PORTS_9: PortType[] = [
  'GENERIC',
  'WOOD',
  'BRICK',
  'GENERIC',
  'SHEEP',
  'GENERIC',
  'ORE',
  'WHEAT',
  'GENERIC',
];

export const EXPANSION_TERRAINS_30: TerrainType[] = [
  ...STANDARD_TERRAINS_19,
  'WOOD', 'WOOD',
  'SHEEP', 'SHEEP',
  'WHEAT', 'WHEAT',
  'BRICK', 'BRICK',
  'ORE', 'ORE',
  'DESERT',
];

export const EXPANSION_NUMBERS_28: number[] = [
  2, 5, 4, 6, 3, 9, 8, 11, 11, 10, 6, 3, 8, 4, 8, 10, 11, 12, 10, 5, 4, 9, 5, 9, 12, 3, 2, 6,
];

export const EXPANSION_PORTS_11: PortType[] = [
  'GENERIC',
  'WOOD',
  'BRICK',
  'GENERIC',
  'SHEEP',
  'GENERIC',
  'ORE',
  'WHEAT',
  'GENERIC',
  'SHEEP',
  'GENERIC',
];

export const MEGA_TERRAINS_37: TerrainType[] = [
  ...EXPANSION_TERRAINS_30,
  'WOOD', 'SHEEP', 'WHEAT', 'BRICK', 'ORE', 'WOOD', 'DESERT',
];

export const MEGA_NUMBERS_34: number[] = [
  ...EXPANSION_NUMBERS_28,
  3, 4, 5, 9, 10, 11,
];

export function createEmptyResources(): Record<ResourceType, number> {
  return { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 };
}

export function countTotalResources(res: Record<ResourceType, number>): number {
  return res.WOOD + res.BRICK + res.SHEEP + res.WHEAT + res.ORE;
}

