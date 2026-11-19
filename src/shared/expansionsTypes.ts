import type { CardBundle, ResourceType, TradeCardType } from './types';

// ============================================================================
// 1. MERCADERES Y BÁRBAROS (TRADERS & BARBARIANS) TYPES
// ============================================================================

export type BarbariansScenario =
  | 'FISHERMEN_OF_CATAN' // Escenario 1: Los pescadores de Catán (10 PV / 11 con Bota vieja)
  | 'RIVERS_OF_CATAN' // Escenario 2: Los ríos de Catán (10 PV)
  | 'THE_CARAVANS' // Escenario 3: La ruta de las caravanas (12 PV)
  | 'BARBARIAN_ATTACK' // Escenario 4: El ataque de los bárbaros (12 PV)
  | 'TRADERS_AND_BARBARIANS'; // Escenario 5: Mercaderes y Bárbaros (13 PV)

export interface BarbariansVariants {
  friendlyRobber?: boolean; // Ladrón piadoso (no roba ni bloquea a jugadores con <= 2 PV)
  catanEventsDeck?: boolean; // Eventos en Catán (mazo de 36 cartas + Nochevieja sustituye dados)
  harborMaster?: boolean; // El capitán del puerto (+2 PV al primero con >= 3 puntos de puerto, +1 PV meta)
  catanForTwo?: boolean; // Catán para dos (fichas de comercio y colonos neutrales)
}

export interface FishToken {
  id: string;
  fishCount: 1 | 2 | 3;
  isOldBoot?: boolean;
}

export interface FishingGround {
  id: string;
  hexId: string;
  numberToken: number;
  vertexIds: string[];
  isLake?: boolean;
}

export type CatanEventType =
  | 'ROBBER_ATTACK' // Asalto del ladrón (7)
  | 'EPIDEMIC' // Epidemia (6, 8)
  | 'EARTHQUAKE' // Terremoto (6)
  | 'GOOD_NEIGHBORS' // Buenos vecinos (6)
  | 'KNIGHT_TOURNAMENT' // Torneo de caballeros (5)
  | 'TRADE_ADVANTAGE' // Beneficio comercial (5)
  | 'CALM_SEA' // Mar en calma (9, 12)
  | 'ROBBER_RETREATS' // El ladrón se retira (4)
  | 'NEIGHBORLY_HELP' // Ayuda vecinal (10, 11)
  | 'CONFLICT' // Conflicto (3)
  | 'PLENTIFUL_YEAR' // Año abundante (2)
  | 'CALM_WORK' // Los colonos son trabajadores y Catán prospera
  | 'NEW_YEAR'; // Nochevieja

export interface CatanEventCard {
  id: string;
  numberToken: number;
  dicePair: [number, number];
  eventType: CatanEventType;
  title: string;
  description: string;
}

export type DestinationType = 'CASTLE' | 'QUARRY' | 'GLASSWORKS';
export type CommodityDeliveryType = 'MARBLE' | 'GLASS' | 'TOOLS' | 'SAND';

export type BarbariansDevCardType =
  // El ataque de los bárbaros:
  | 'ARM_KNIGHT' // Armar caballero (coloca 1 caballero en el castillo)
  | 'STRONG_KNIGHT' // Caballero fuerte (coloca 1 caballero en cualquier camino libre)
  | 'PRISONER' // Prisionero (captura 1 bárbaro de un hexágono de costa)
  | 'TREASON' // Traición (+2 oros y reubica hasta 2 bárbaros)
  // Mercaderes y Bárbaros:
  | 'TB_ROAD_BUILDING' // Construcción de carreteras (2 carreteras gratis)
  | 'TB_KNIGHT' // Caballero (mueve 1 bárbaro de camino y roba si cae en carretera rival)
  | 'GOOD_TRIP' // Buen viaje (renueva puntos de movimiento del carromato)
  | 'TECH_TOOLS' // Avance tecnológico: Herramientas (+1 PV)
  | 'TECH_QUARRY' // Avance tecnológico: Cantera (+1 PV)
  | 'TECH_GLASS'; // Avance tecnológico: Vidrio (+1 PV)

export interface BarbariansDevCard {
  id: string;
  type: BarbariansDevCardType;
  title: string;
  description: string;
  played?: boolean;
}

export interface EdgeKnight {
  id: string;
  playerId: string;
  edgeId: string;
  mpRemaining: number;
  boostedThisTurn?: boolean;
  placedAtCastleThisTurn?: boolean;
}

export interface BarbariansPlayer {
  goldCoins: number;
  goldPurchasesThisTurn: number;
  fishTokens: FishToken[];
  hasOldBoot: boolean;
  bridgesLeft: number;
  isWealthiestSettler: boolean; // Colono más rico (+1 PV)
  isPoorestSettler: boolean; // Colono pobre (-2 PV)
  prisonersCount: number; // Cada 2 prisioneros = +1 PV
  knightsReserve: number; // 6 caballeros en reserva
  wagonLevel: 1 | 2 | 3 | 4 | 5;
  wagonVertexId: string | null;
  wagonMpRemaining: number;
  wagonBoostedThisTurn: boolean;
  activeCommodityTile: CommodityDeliveryType | null;
  deliveredCommoditiesCount: number; // +1 PV por cada entrega completada
  scenarioDevCards: BarbariansDevCard[];
  tradeTokens: number; // Catán para dos
  damagedRoadEdgeIds: string[]; // Terremoto (Eventos en Catán)
  harborPoints: number; // Puntos de puerto (El capitán del puerto)
}

export interface BarbariansState {
  scenario: BarbariansScenario;
  variants: BarbariansVariants;
  // 1. Los pescadores de Catán
  fishDeck: FishToken[];
  fishDiscard: FishToken[];
  fishingGrounds: FishingGround[];
  lakeHexIds: string[];
  // 2. Los ríos de Catán
  riverHexIds: string[];
  swampHexIds: string[];
  bridgeSiteEdgeIds: string[];
  bridgeOwners: Record<string, string>; // edgeId -> playerId
  dualNumberHexId?: string | null; // Hexágono que produce con 2 y 12 en 3-4J
  // 3. La ruta de las caravanas
  oasisHexIds: string[];
  camelEdgeIds: string[];
  camelsRemaining: number;
  pendingCamelVote?: {
    initiatorPlayerId: string;
    currentVoterIndex: number;
    votesByEdge: Record<string, number>;
    votesByPlayer: Record<string, { edgeId: string; cardsSpent: number }>;
    validEdgeIds: string[];
  } | null;
  // 4. El ataque de los bárbaros
  castleHexIds: string[];
  coastalHexIds: string[];
  hexBarbarians: Record<string, number>; // hexId -> 0..3 bárbaros
  conqueredHexIds: string[];
  conqueredVertexIds: string[];
  barbariansReserve: number;
  edgeKnights: Record<string, EdgeKnight>; // edgeId -> EdgeKnight
  lastColorDie?: 'GREEN' | 'PURPLE' | 'BROWN' | null;
  lastBarbarianRolls?: number[];
  // 5. Mercaderes y Bárbaros
  destinationHexes: Record<
    string,
    {
      hexId: string;
      type: DestinationType;
      name: string;
      centerVertexId: string;
      cornerVertexIds: string[];
      forbiddenSeaEdgeIds: string[];
      stack: CommodityDeliveryType[];
    }
  >;
  edgeBarbarians: string[]; // edgeIds con 1 bárbaro
  scenarioDevDeck: BarbariansDevCard[];
  // Variantes
  eventDeck: CatanEventCard[];
  eventDiscard: CatanEventCard[];
  currentEventCard?: CatanEventCard | null;
  epidemicActiveThisTurn?: boolean;
  harborMasterPlayerId?: string | null;
}

export type BarbariansAction =
  // Acciones de Los pescadores de Catán:
  | { type: 'MB_FISH_REMOVE_ROBBER'; tokenIds: string[] }
  | { type: 'MB_FISH_STEAL_RESOURCE'; tokenIds: string[]; targetPlayerId: string }
  | { type: 'MB_FISH_BANK_RESOURCE'; tokenIds: string[]; resource: ResourceType }
  | { type: 'MB_FISH_FREE_ROAD'; tokenIds: string[]; edgeId: string }
  | { type: 'MB_FISH_FREE_DEV_CARD'; tokenIds: string[] }
  | { type: 'MB_PASS_OLD_BOOT'; targetPlayerId: string }
  // Acciones de Los ríos de Catán y Oro general:
  | { type: 'MB_PLACE_BRIDGE'; edgeId: string }
  | { type: 'MB_BUY_RESOURCE_WITH_GOLD'; resource: ResourceType }
  | { type: 'MB_SELL_RESOURCE_FOR_GOLD'; resource: ResourceType; ratio: 2 | 3 | 4 }
  // Acciones de La ruta de las caravanas:
  | {
      type: 'MB_VOTE_CAMEL';
      edgeId: string;
      sheepCards?: number;
      wheatCards?: number;
    }
  // Acciones de El ataque de los bárbaros:
  | { type: 'MB_BUY_SCENARIO_DEV_CARD' }
  | { type: 'MB_PLACE_EDGE_KNIGHT'; edgeId: string; anywhere?: boolean }
  | { type: 'MB_MOVE_EDGE_KNIGHT'; fromEdgeId: string; toEdgeId: string; payWheat?: boolean }
  | { type: 'MB_BOOST_EDGE_KNIGHT'; edgeId: string }
  | { type: 'MB_EXPEL_HEX_BARBARIANS'; hexId?: string }
  | { type: 'MB_TREASON_MOVE_BARBARIAN'; fromHexId: string; toHexId: string }
  // Acciones de Mercaderes y Bárbaros (Carromatos):
  | { type: 'MB_UPGRADE_WAGON' }
  | { type: 'MB_MOVE_WAGON'; toVertexId: string }
  | { type: 'MB_BOOST_WAGON' }
  | { type: 'MB_WAGON_EXPEL_BARBARIAN'; edgeId: string; moveBarbarianToEdgeId?: string }
  | { type: 'MB_MOVE_EDGE_BARBARIAN'; fromEdgeId: string; toEdgeId: string; stealFromPlayerId?: string }
  // Acciones de Variantes:
  | { type: 'MB_REPAIR_ROAD'; edgeId: string }
  | { type: 'MB_TRADE_TOKEN_FORCE_SWAP'; targetPlayerId: string; giveResources: CardBundle }
  | { type: 'MB_TRADE_TOKEN_DISMISS_ROBBER' }
  | { type: 'MB_DISCARD_KNIGHT_FOR_TOKENS' };

// ============================================================================
// 2. PIRATAS Y EXPLORADORES (EXPLORERS & PIRATES) TYPES
// ============================================================================

export type ExplorersPiratesScenario =
  | 'LAND_HO' // Escenario 1: ¡Tierra a la vista! (8 PV)
  | 'PIRATE_LAIRS' // Escenario 2: Las guaridas de piratas (12 PV)
  | 'FISH_FOR_CATAN' // Escenario 3: Pescado para Catán (15 PV)
  | 'SPICES_FOR_CATAN' // Escenario 4: Especias para Catán (15 PV)
  | 'EXPLORERS_AND_PIRATES_FULL'; // Escenario 5: Piratas y exploradores (17 PV)

export type EPMissionId = 'PIRATE_LAIRS' | 'FISH_FOR_CATAN' | 'SPICES_FOR_CATAN';

export type SpicePerkType =
  | 'SWIFT_VOYAGE_1' // A toda vela I (+1 movimiento a todos tus barcos)
  | 'SWIFT_VOYAGE_2' // A toda vela II (+1 movimiento a todos tus barcos)
  | 'PIRATE_BONUS_5' // Bonificación contra piratas (ahuyentar con 5 ó 6)
  | 'PIRATE_BONUS_4' // Bonificación contra piratas (ahuyentar con 4, 5 ó 6)
  | 'GOLD_TRADE_1' // Comercio de oro I (cambiar 1 materia prima por 1 oro 1x/turno)
  | 'GOLD_TRADE_2'; // Comercio de oro II (cambiar 1 materia prima por 1 oro 1x/turno)

export type EPCargoItem = 'SETTLER' | 'CREW' | 'FISH_HAUL' | 'SPICE_SACK';

export interface EPShipState {
  id: string;
  playerId: string;
  edgeId: string;
  cargo: EPCargoItem[]; // Máx 1 grande (SETTLER / FISH_HAUL) o 2 pequeñas (CREW / SPICE_SACK)
  mpRemaining: number;
  hasMovedThisTurn: boolean;
  boostedThisTurn: boolean;
  paidPirateTributeThisTurn: boolean;
}

export interface EPHarborBasin {
  vertexId: string;
  playerId: string;
  cargo: EPCargoItem[]; // Máx 1 grande (SETTLER / FISH_HAUL) o 2 pequeñas (CREW / SPICE_SACK)
}

export interface EPPirateLair {
  hexId: string;
  numberToken: number; // Revelado al conquistar (río aurífero que produce 2 oros)
  conquered: boolean;
  unitsByPlayer: Record<string, number>; // Unidades desembarcadas (máx 3 en total)
  waitingPickupByPlayer: Record<string, number>; // Unidades listas para recoger tras conquista
}

export interface EPFishGround {
  hexId: string;
  rollNumber: 1 | 2 | 3 | 4 | 5 | 6;
  discovered: boolean;
  hasFishShoal: boolean;
}

export interface EPSpiceVillage {
  hexId: string;
  name: string;
  perk: SpicePerkType;
  perkLabel: string;
  discovered: boolean;
  sacksRemaining: number;
  merchantsPlayerIds: string[]; // Jugadores que ya desembarcaron 1 unidad permanente aquí
}

export interface EPUnexploredTileSecret {
  region: 'NORTH_GREEN' | 'SOUTH_ORANGE';
  kind: 'TERRAIN' | 'SEA' | 'PIRATE_LAIR' | 'FISH' | 'SPICE';
  terrain: ResourceType | 'SEA' | 'GOLD';
  numberToken: number | null;
  fishRollNumber?: 1 | 2 | 3 | 4 | 5 | 6;
  spicePerk?: SpicePerkType;
  spiceName?: string;
}

export interface ExplorersPiratesPlayer {
  goldCoins: number;
  goldPurchasesThisTurn: number;
  spiceGoldTradesThisTurn: number;
  harborCitiesLeft: number; // 4 ciudades portuarias
  shipsLeft: number; // 3 barcos
  settlersLeft: number; // 2 colonos
  unitsLeft: number; // 9 unidades
  missionProgress: Record<EPMissionId, number>; // 0..7 casillas por misión
  unlockedSpicePerks: SpicePerkType[];
  colonizedRegions: Array<'NORTH_GREEN' | 'SOUTH_ORANGE'>;
}

export interface ExplorersPiratesState {
  scenario: ExplorersPiratesScenario;
  activeMissions: EPMissionId[];
  turnSubPhase: 'TRADE_AND_BUILD' | 'MOVEMENT';
  startingIslandHexIds: string[];
  startingCoastalCityVertexIds: string[];
  councilHexId: string | null;
  councilDeliveryVertexIds: string[];
  unexploredSecrets: Record<string, EPUnexploredTileSecret>; // hexId -> secreto
  ships: Record<string, EPShipState>; // shipId -> EPShipState
  harborBasins: Record<string, EPHarborBasin>; // vertexId -> EPHarborBasin
  pirateLairs: Record<string, EPPirateLair>; // hexId -> EPPirateLair
  fishGrounds: Record<string, EPFishGround>; // hexId -> EPFishGround
  spiceVillages: Record<string, EPSpiceVillage>; // hexId -> EPSpiceVillage
  activePirateShip?: { playerId: string; hexId: string } | null;
  hasRolledFishThisTurn: boolean;
  lastFishRoll?: number | null;
  missionProgressOrder: Record<EPMissionId, string[]>;
  missionLeaderPlayerIds: Record<EPMissionId, string | null>;
}

export type ExplorersPiratesAction =
  | { type: 'EP_UPGRADE_HARBOR_CITY'; vertexId: string }
  | { type: 'EP_BUILD_SHIP'; edgeId: string; replaceShipId?: string }
  | { type: 'EP_BUILD_SETTLER'; targetVertexId?: string; targetShipId?: string }
  | { type: 'EP_BUILD_UNIT'; targetVertexId?: string; targetShipId?: string }
  | { type: 'EP_START_MOVEMENT_PHASE' }
  | { type: 'EP_MOVE_SHIP'; shipId: string; toEdgeId: string; payPirateTribute?: boolean }
  | { type: 'EP_BOOST_SHIP'; shipId: string }
  | {
      type: 'EP_TRANSFER_CARGO';
      shipId: string;
      harborVertexId: string;
      direction: 'HARBOR_TO_SHIP' | 'SHIP_TO_HARBOR' | 'SWAP';
      item?: EPCargoItem;
    }
  | { type: 'EP_FOUND_SETTLEMENT_WITH_SHIP'; shipId: string; vertexId: string }
  | { type: 'EP_LAND_UNIT_ON_LAIR'; shipId: string; hexId: string; count?: 1 | 2 }
  | { type: 'EP_PICKUP_LAIR_UNIT'; shipId: string; hexId: string }
  | { type: 'EP_ROLL_FISH_SHOAL' }
  | { type: 'EP_PICKUP_FISH_SHOAL'; shipId: string; hexId: string }
  | { type: 'EP_DELIVER_TO_COUNCIL'; shipId: string }
  | { type: 'EP_TRADE_WITH_SPICE_VILLAGE'; shipId: string; hexId: string }
  | { type: 'EP_PLACE_PIRATE_SHIP'; hexId: string; victimPlayerId?: string }
  | { type: 'EP_DRIVE_OFF_PIRATE'; shipId: string; newPirateHexId?: string }
  | { type: 'EP_BUY_RESOURCE_WITH_GOLD'; resource: ResourceType }
  | { type: 'EP_TRADE_3_FOR_GOLD'; giveResource: TradeCardType }
  | { type: 'EP_SPICE_GOLD_TRADE'; giveResource: ResourceType };
