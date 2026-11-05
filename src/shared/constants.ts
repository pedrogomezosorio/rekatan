import {
  ExpansionModule,
  GameConfig,
  PlayerColor,
  PortType,
  ResourceType,
  TerrainType,
} from './types';

/**
 * Rutas de texturas de alta resolución (.jpg / .webp / .png) para cada tipo de terreno.
 */
export const TILE_TEXTURE_PATHS: Record<TerrainType, string> = {
  WOOD: '/assets/terrains/forest.jpg?v=2',
  BRICK: '/assets/terrains/hills.jpg?v=2',
  SHEEP: '/assets/terrains/pasture.jpg?v=2',
  WHEAT: '/assets/terrains/fields.jpg?v=2',
  ORE: '/assets/terrains/mountains.jpg?v=2',
  DESERT: '/assets/terrains/desert.jpg?v=2',
  SEA: '/assets/terrains/ocean.jpg?v=2',
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
    subtitle: 'Comercio, construcción, Gran Ruta y Gran Ejército.',
    badge: 'Núcleo Oficial',
    icon: '🏝️',
    lockedBase: true,
  },
  {
    id: 'SEAFARERS',
    title: 'Navegantes de Catan',
    subtitle: 'Rutas marítimas con Barcos, Archipiélagos, El Pirata y Ríos de Oro.',
    badge: 'Expansión Marítima',
    icon: '⛵',
  },
  {
    id: 'CITIES_AND_KNIGHTS',
    title: 'Ciudades y Caballeros',
    subtitle: 'Mercancías (Papel, Moneda, Tela), Metrópolis, Caballeros en tablero e Invasión.',
    badge: 'Expansión Táctica',
    icon: '🏰',
  },
  {
    id: 'BARBARIANS',
    title: 'Mercaderes y Bárbaros',
    subtitle: 'Incursiones bárbaras, Pescadores de Catan, Ríos, Caravanas y Eventos.',
    badge: 'Módulos y Escenarios',
    icon: '⚔️',
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
    emoji: '🌲',
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

export const AVATAR_LIST = ['👑', '⚔️', '🛡️', '⛵', '🏰', '🐉', '🦊', '🦁', '🧙‍♂️', '🧭'];

export const BUILDING_COSTS: Record<
  'ROAD' | 'SETTLEMENT' | 'CITY' | 'DEV_CARD',
  Record<ResourceType, number>
> = {
  ROAD: { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 },
  SETTLEMENT: { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 },
  CITY: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 },
  DEV_CARD: { WOOD: 0, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 1 },
};

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
  minSettlementDistance: 2,
  allowInstantDevCards: false,
  turnActionRestriction: 'LEVEL_1_FREE',
  maxInfrastructurePerTurn: 'UNLIMITED',
  exclusiveTradeOrSpend: false,
  robberDiscardMode: 'MANUAL',
  victoryPointsTarget: 10,
  turnTimerSeconds: 90,
  expansionModule: 'BASE',
  enabledExpansions: ['BASE'],
  maxPlayers: 4,
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

