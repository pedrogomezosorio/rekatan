import type { GameConfig, GameState, PlayerState, TradeCardType } from './types';
import type { CommodityType, ImprovementBranch, ProgressCardType } from './citiesKnightsTypes';

export const hasCitiesKnights = (config: GameConfig): boolean => config.expansionModule === 'CITIES_AND_KNIGHTS' || config.enabledExpansions?.includes('CITIES_AND_KNIGHTS');
export const CK_BRANCHES: ImprovementBranch[] = ['SCIENCE', 'POLITICS', 'TRADE'];
export const COMMODITIES: CommodityType[] = ['PAPER', 'CLOTH', 'COIN'];
// These scenarios depend on buying/playing development cards. The supplied
// combination rules do not define their replacement with progress cards.
export const CK_CONFLICTING_SCENARIOS = ['THE_FORGOTTEN_TRIBE', 'THE_PIRATE_ISLANDS'] as const;
export const BRANCH_META = {
  SCIENCE: { name: 'Ciencia', commodity: 'PAPER', color: '#16a34a', levels: ['Monasterio', 'Biblioteca', 'Acueducto', 'Teatro', 'Universidad'] },
  POLITICS: { name: 'Política', commodity: 'COIN', color: '#2563eb', levels: ['Ayuntamiento', 'Iglesia', 'Fortaleza', 'Catedral', 'Consejo de Catán'] },
  TRADE: { name: 'Comercio', commodity: 'CLOTH', color: '#eab308', levels: ['Mercado', 'Gremio', 'Guilda', 'Banco', 'Centro de comercio'] },
} satisfies Record<ImprovementBranch, { name: string; commodity: CommodityType; color: string; levels: string[] }>;
export const PROGRESS_CARDS: Record<ProgressCardType, { name: string; branch: ImprovementBranch; count: number; description: string }> = {
  ALCHEMIST: { name: 'Alquimista', branch: 'SCIENCE', count: 2, description: 'Antes de tirar, elige los dados rojo y blanco. El dado de evento se lanza normalmente.' },
  ROAD_BUILDING: { name: 'Construcción de carreteras', branch: 'SCIENCE', count: 2, description: 'Construye gratis dos carreteras o barcos.' },
  SMITH: { name: 'Fragua', branch: 'SCIENCE', count: 2, description: 'Promociona gratis hasta dos caballeros distintos. El rango 3 requiere Fortaleza.' },
  CRANE: { name: 'Grúa', branch: 'SCIENCE', count: 2, description: 'La siguiente mejora de ciudad este turno cuesta una mercancía menos.' },
  PRINTER: { name: 'Imprenta', branch: 'SCIENCE', count: 1, description: 'Un punto de victoria público inmediato.' },
  ENGINEER: { name: 'Ingeniero', branch: 'SCIENCE', count: 1, description: 'Construye una muralla gratis.' },
  INVENTOR: { name: 'Inventor', branch: 'SCIENCE', count: 2, description: 'Intercambia dos fichas de número del tablero, excepto 2, 12, 6 y 8.' },
  IRRIGATION: { name: 'Irrigación', branch: 'SCIENCE', count: 2, description: 'Dos trigos por cada campo distinto junto a tus edificios.' },
  MEDICINE: { name: 'Medicina', branch: 'SCIENCE', count: 2, description: 'La siguiente ciudad cuesta dos minerales y un trigo.' },
  MINING: { name: 'Minería', branch: 'SCIENCE', count: 2, description: 'Dos minerales por cada montaña distinta junto a tus edificios.' },
  WEDDING: { name: 'Boda', branch: 'POLITICS', count: 2, description: 'Cada rival con más puntos te da dos cartas a su elección.' },
  CONSTITUTION: { name: 'Constitución', branch: 'POLITICS', count: 1, description: 'Un punto de victoria público inmediato.' },
  DESERTER: { name: 'Desertor', branch: 'POLITICS', count: 2, description: 'Un rival elige un caballero para retirar; puedes colocar uno del mismo rango y estado.' },
  DIPLOMAT: { name: 'Diplomático', branch: 'POLITICS', count: 2, description: 'Retira una carretera o barco abierto; si es tuyo puedes recolocarlo gratis.' },
  SPY: { name: 'Espía', branch: 'POLITICS', count: 3, description: 'Mira las cartas de progreso de un rival y roba una.' },
  WARLORD: { name: 'Estratega', branch: 'POLITICS', count: 2, description: 'Activa todos tus caballeros gratis.' },
  INTRIGUE: { name: 'Intriga', branch: 'POLITICS', count: 2, description: 'Expulsa un caballero rival conectado con tu red. Su dueño elige su retirada.' },
  BISHOP: { name: 'Obispo', branch: 'POLITICS', count: 2, description: 'Mueve el ladrón y roba una carta a cada rival adyacente.' },
  SABOTEUR: { name: 'Saboteador', branch: 'POLITICS', count: 2, description: 'Cada rival con tantos puntos como tú o más descarta la mitad de su mano.' },
  MERCHANT: { name: 'Comerciante', branch: 'TRADE', count: 6, description: 'Coloca el comerciante junto a un edificio tuyo: +1 PV y cambio 2:1 del recurso de ese terreno.' },
  MERCHANT_FLEET: { name: 'Flota mercante', branch: 'TRADE', count: 2, description: 'Un tipo de recurso o mercancía se cambia 2:1 hasta el final del turno.' },
  MASTER_MERCHANT: { name: 'Maestro comerciante', branch: 'TRADE', count: 2, description: 'Mira la mano de un rival con más puntos y toma dos cartas a tu elección.' },
  COMMODITY_MONOPOLY: { name: 'Monopolio de mercancías', branch: 'TRADE', count: 2, description: 'Elige una mercancía; toma una de cada rival que tenga.' },
  RESOURCE_MONOPOLY: { name: 'Monopolio de materias primas', branch: 'TRADE', count: 4, description: 'Elige un recurso; toma hasta dos de cada rival.' },
  COMMERCIAL_HARBOR: { name: 'Puerto de mercancías', branch: 'TRADE', count: 2, description: 'Una vez por rival este turno: ofrece un recurso a cambio de una mercancía que el rival elige.' },
};
export function safeHandLimit(state: GameState, playerId: string): number {
  return 7 + 2 * Object.values(state.board.vertices).filter(v => v.playerId === playerId && v.building === 'CITY' && v.cityWall).length;
}
export function cardCount(cards: Partial<Record<TradeCardType, number>>): number {
  return Object.values(cards).reduce((sum, n) => sum + (n || 0), 0);
}
export function emptyCKPlayer(): NonNullable<PlayerState['citiesKnights']> {
  return { improvements: { SCIENCE: 0, POLITICS: 0, TRADE: 0 }, progressCards: [], defenderPoints: 0, progressPoints: 0 };
}
