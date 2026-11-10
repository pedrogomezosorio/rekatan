export type ResourceType = 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';

export type TerrainType = ResourceType | 'DESERT' | 'SEA' | 'GOLD' | 'FOG';

export type PortType = 'GENERIC' | ResourceType;

export type PlayerColor = 'RED' | 'BLUE' | 'ORANGE' | 'WHITE' | 'GREEN' | 'PURPLE';

export interface CubicCoord {
  q: number;
  r: number;
  s: number;
}

export interface Hex {
  id: string; // e.g. "0,0,0"
  q: number;
  r: number;
  s: number;
  terrain: TerrainType;
  numberToken: number | null; // 2..12 except 7, null on DESERT/SEA
  hasRobber: boolean;
  center: { x: number; y: number };
}

export interface PortInfo {
  id: string;
  type: PortType;
  ratio: 2 | 3;
  edgeId: string;
  vertexIds: [string, string];
  seaHexId?: string;
  dockCenter: { x: number; y: number };
}

export type VertexBuildingType = 'SETTLEMENT' | 'CITY';

export interface Vertex {
  id: string;
  x: number;
  y: number;
  hexIds: string[];
  adjacentVertexIds: string[];
  adjacentEdgeIds: string[];
  building: VertexBuildingType | null;
  playerId: string | null;
  port: { type: PortType; ratio: 2 | 3 } | null;
  isLand: boolean;
  isCoastal: boolean;
  catanChits?: number; // Fichas Catán colocadas bajo el poblado/ciudad o en la intersección
}

export type EdgeBuildingType = 'ROAD' | 'SHIP';

export interface Edge {
  id: string;
  vertexIds: [string, string];
  hexIds: string[];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  building: EdgeBuildingType | null;
  playerId: string | null;
  isLand: boolean;
  isCoastal: boolean;
  isWarship?: boolean; // Navegantes Escenario 7: Barco de Guerra
}

export type BoardMode =
  | 'STANDARD_3_4'
  | 'CUSTOM'
  | 'EXPANSION_5_6'
  | 'MEGA_RADIUS_3';

export type WonderId =
  | 'GREAT_BRIDGE'
  | 'GREAT_WALL'
  | 'CATHEDRAL'
  | 'GREAT_THEATRE'
  | 'COLOSSUS'
  | 'GREAT_LIBRARY';

export interface BoardState {
  mode: BoardMode;
  hexSize: number;
  hexes: Record<string, Hex>;
  vertices: Record<string, Vertex>;
  edges: Record<string, Edge>;
  ports: PortInfo[];
  robberHexId: string;
  pirateHexId?: string;
  // Navegantes Official Scenarios State:
  mainIslandHexIds?: string[];
  uninhabitableHexIds?: string[];
  foreignTerritoryMap?: Record<string, string>;
  fogDeck?: Array<{ terrain: TerrainType; numberToken: number | null }>;
  revealedHexIds?: string[];
  nativeVillages?: Record<
    string,
    { id: string; hexId: string; vertexId: string; numberToken: number; clothRemaining: number }
  >;
  forgottenGifts?: Record<
    string,
    {
      id: string;
      vertexId: string;
      type: 'CATAN_CHIT_1VP' | 'DEV_CARD' | 'PORT';
      portType?: PortType;
      claimed: boolean;
      claimedByPlayerId?: string;
    }
  >;
  pirateFleetHexId?: string;
  pirateFleetRouteHexIds?: string[];
  pirateFortresses?: Record<
    string,
    { id: string; hexId: string; vertexId: string; targetPlayerColor: PlayerColor; chitsRemaining: number }
  >;
  safePirateHexId?: string;
  clothCommonReserve?: number;
  wonderMarkers?: {
    greatBridgeVertexIds: string[];
    greatWallVertexIds: string[];
    forbiddenSetupVertexIds: string[];
  };
  wondersState?: Record<
    string,
    { wonderId: WonderId; claimedByPlayerId: string; stage: number }
  >;
}

export type ExpansionModule =
  | 'BASE'
  | 'SEAFARERS'
  | 'CITIES_AND_KNIGHTS'
  | 'BARBARIANS'
  | 'EXPLORERS_AND_PIRATES';

export type SeafarersScenario =
  | 'HEADING_FOR_NEW_SHORES' // Escenario 1: Rumbo a nuevas orillas (14 PV)
  | 'THE_FOUR_ISLANDS' // Escenario 2: Las cuatro islas (13 PV)
  | 'OCEANIA' // Escenario 3: Oceanía / Tierra ignota (12 PV)
  | 'THROUGH_THE_DESERT' // Escenario 4: A través del desierto (14 PV)
  | 'THE_FORGOTTEN_TRIBE' // Escenario 5: El pueblo perdido (13 PV)
  | 'CLOTH_FOR_CATAN' // Escenario 6: Telas para Catán (14 PV)
  | 'THE_PIRATE_ISLANDS' // Escenario 7: Las islas de los piratas (10 PV)
  | 'WONDERS_OF_CATAN' // Escenario 8: Las maravillas catanas (10 PV / Nivel 4)
  | 'NEW_WORLD' // Escenario 9: Un nuevo mundo (12 PV)
  | 'PROCEDURAL_ARCHIPELAGO'; // Archipiélago libre procedural

export type TurnActionRestrictionLevel =
  | 'LEVEL_1_FREE'
  | 'LEVEL_2_LIMITED'
  | 'LEVEL_3_STRICT';

export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type SeafarersBoardSize = '3P' | '4P' | '5_6P';

export interface GameConfig {
  boardMode: BoardMode;
  preventAdjacentRedNumbers: boolean;
  desertInCenter: boolean;
  // Escenario de Navegantes y Tamaño de Isla (2-3, 4, o 5-6 jugadores)
  seafarersScenario?: SeafarersScenario;
  seafarersBoardSize?: SeafarersBoardSize;
  // Variantes oficiales y reglas de la expansión Navegantes
  seafarersMoveShipAllowed?: boolean;
  seafarersCoastConnection?: 'REQUIRE_SETTLEMENT' | 'FREE_CONNECTION';
  seafarersPirateMode?: 'ACTIVE' | 'PACIFIC_NO_PIRATE';
  seafarersDiscoveryVPMode?: 'STANDARD_2VP' | 'PROGRESSIVE' | 'DISABLED';
  seafarersSetupShipRule?: 'ANY_ROUND' | 'ROUND_2_ONLY';
  // 1. Distancia mínima entre casas
  minSettlementDistance: 1 | 2;
  // 2. Uso Inmediato de Cartas de Desarrollo (true = jugables en el mismo turno de compra)
  allowInstantDevCards: boolean;
  // Límite de cartas de desarrollo por turno (false = ilimitadas por defecto, true = máx 1 por turno)
  maxOneDevCardPerTurn?: boolean;
  // Recursos en las 2 casas iniciales (true = ambas casas dan recursos por defecto, false = ninguna da recursos)
  initialSettlementsGiveResources?: boolean;
  // 3. Niveles de Acción por Turno (3 Sectores: Libre, Limitado, Estricto)
  turnActionRestriction: TurnActionRestrictionLevel;
  // Compatibilidad con selectores individuales previos
  maxInfrastructurePerTurn: 'UNLIMITED' | 1;
  exclusiveTradeOrSpend: boolean;
  // 4. Modo de descarte al salir un 7
  robberDiscardMode: 'MANUAL' | 'RANDOM';
  // 5. Puntos de Victoria para ganar
  victoryPointsTarget: number;
  // 6. Temporizador de Turno
  turnTimerSeconds: 30 | 60 | 90 | 120 | null;
  // Modular expansion readiness (Casillas de Expansiones seleccionadas en el Lobby)
  expansionModule: ExpansionModule;
  enabledExpansions: ExpansionModule[];
  maxPlayers: number;
  defaultBotDifficulty?: BotDifficulty;
}

export type DevCardType =
  | 'KNIGHT'
  | 'VICTORY_POINT'
  | 'ROAD_BUILDING'
  | 'YEAR_OF_PLENTY'
  | 'MONOPOLY';

export interface DevCard {
  id: string;
  type: DevCardType;
  title: string;
  boughtAtTurn: number;
  played: boolean;
}

export type PlayerConnectionStatus =
  | 'ACTIVE'
  | 'DISCONNECTED_WAITING'
  | 'FROZEN_SKIP'
  | 'ABANDONED';

export interface PlayerState {
  id: string;
  name: string;
  color: PlayerColor;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  connected: boolean;
  status: PlayerConnectionStatus;
  resources: Record<ResourceType, number>;
  devCards: DevCard[];
  knightsPlayed: number;
  longestRoadLength: number;
  longestRoadEdgeIds: string[];
  settlementsLeft: number;
  citiesLeft: number;
  roadsLeft: number;
  shipsLeft?: number;
  hasMovedShipThisTurn?: boolean;
  homeIslandIds?: string[];
  colonizedForeignIds?: string[];
  discoveryVictoryPoints?: number;
  clothBales?: number; // Navegantes Escenario 6: Telas (2 fardos = 1 PV)
  warshipsCount?: number; // Navegantes Escenario 7: Barcos de Guerra
  conqueredPirateFortress?: boolean; // Navegantes Escenario 7: Fortaleza Conquistada
  activeWonderId?: WonderId | null; // Navegantes Escenario 8: Maravilla
  wonderStage?: number; // Navegantes Escenario 8: Nivel 0..4
  publicVictoryPoints: number;
  totalVictoryPoints: number;
  mustDiscardCount: number;
}

export type GamePhase =
  | 'LOBBY'
  | 'ORDER_ROLL'
  | 'SETUP_SETTLEMENT_1'
  | 'SETUP_ROAD_1'
  | 'SETUP_SETTLEMENT_2'
  | 'SETUP_ROAD_2'
  | 'SETUP_SETTLEMENT_3'
  | 'SETUP_ROAD_3'
  | 'WAITING_FOR_DICE'
  | 'ROBBER_DISCARD'
  | 'ROBBER_MOVE'
  | 'ROBBER_STEAL'
  | 'MAIN_PHASE'
  | 'SPECIAL_BUILD_PHASE'
  | 'ROAD_BUILDING_DEV'
  | 'PAUSED_DISCONNECT'
  | 'GAME_OVER';

export interface TurnState {
  turnNumber: number;
  activePlayerId: string;
  setupStepIndex: number;
  setupOrder: string[];
  orderRolls?: Record<string, [number, number]>;
  lastPlacedSetupSettlementId: string | null;
  diceRoll: [number, number] | null;
  hasRolledDice: boolean;
  devCardPlayedThisTurn: boolean;
  infrastructureBuiltThisTurn: number;
  tradesAndBurnsThisTurn: number;
  hasTradedThisTurn: boolean;
  hasSpentOrBuiltThisTurn: boolean;
  freeRoadsRemaining: number;
  turnDeadlineMs: number | null;
  phaseBeforePause?: GamePhase;
  pausedForPlayerId?: string | null;
  isPausedByHost?: boolean;
  pausedRemainingTimerMs?: number | null;
  botStatusMessage?: string | null;
  botProposedTradeThisTurn?: boolean;
  pendingGoldClaims?: Array<{
    playerId: string;
    amount: number;
  }>;
  robberOrPirateMode?: 'ROBBER' | 'PIRATE' | null;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  targetPlayerId: string | null; // null means open to everyone
  offer: Record<ResourceType, number>;
  request: Record<ResourceType, number>;
  responses: Record<string, 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED'>;
  parentOfferId?: string;
  createdAt: number;
}

export interface ResourceFlightEvent {
  id: string;
  hexId: string;
  playerId: string;
  resource: ResourceType;
  amount: number;
}

export interface DiscardAnimationEvent {
  id: string;
  playerId: string;
  playerName: string;
  discarded: Partial<Record<ResourceType, number>>;
  mode: 'MANUAL' | 'RANDOM';
}

export interface RobberStealEvent {
  id: string;
  thiefId: string;
  victimId: string;
  resource: ResourceType;
  hexId: string;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'INFO' | 'DICE' | 'BUILD' | 'TRADE' | 'ROBBER' | 'DEV' | 'AWARD' | 'SYSTEM';
  playerId?: string;
}

export interface GameState {
  roomCode: string;
  createdAt: number;
  phase: GamePhase;
  config: GameConfig;
  board: BoardState;
  players: PlayerState[];
  turn: TurnState;
  bank: Record<ResourceType, number>;
  devDeck: DevCard[];
  longestRoadPlayerId: string | null;
  largestArmyPlayerId: string | null;
  activeTradeOffers: TradeOffer[];
  robberStealCandidates: string[]; // playerIds adjacent to robber hex with >0 resources
  winnerId: string | null;
  logs: GameLogEntry[];
  lastCompletedTrade?: {
    nonce: number;
    proposerId: string;
    proposerName: string;
    proposerAvatar: string;
    accepterId: string;
    accepterName: string;
    accepterAvatar: string;
    offered: Record<ResourceType, number>;
    requested: Record<ResourceType, number>;
  };
  // Transient animation payloads (incrementing event nonce so frontend animates once per event)
  lastEvent?: {
    nonce: number;
    type:
      | 'DICE_ROLLED'
      | 'ORDER_DICE_ROLLED'
      | 'ORDER_CONFIRMED'
      | 'RESOURCES_PRODUCED'
      | 'ROBBER_DISCARDED'
      | 'ROBBER_MOVED'
      | 'CARD_STOLEN'
      | 'BUILDING_PLACED'
      | 'DEV_CARD_BOUGHT'
      | 'DEV_CARD_PLAYED'
      | 'TRADE_COMPLETED'
      | 'TURN_TIMEOUT';
    producingHexIds?: string[];
    flights?: ResourceFlightEvent[];
    discards?: DiscardAnimationEvent[];
    steal?: RobberStealEvent;
    dice?: [number, number];
    robberTargetHexId?: string;
    robberAffectedPlayerIds?: string[];
    robberMovedByPlayerId?: string;
    devCardType?: DevCardType;
    devCardPlayerId?: string;
    devCardPlayerName?: string;
    devCardTitle?: string;
    monopolyResource?: ResourceType;
    monopolyTotalClaimed?: number;
    yearOfPlentyResources?: [ResourceType, ResourceType];
    buyerPlayerId?: string;
    buyerPlayerName?: string;
    builtItem?: {
      type: 'SETTLEMENT' | 'CITY' | 'ROAD' | 'SHIP';
      vertexId?: string;
      edgeId?: string;
      playerId: string;
    };
    completedTrade?: {
      proposerId: string;
      proposerName: string;
      proposerAvatar: string;
      accepterId: string;
      accepterName: string;
      accepterAvatar: string;
      offered: Record<ResourceType, number>;
      requested: Record<ResourceType, number>;
    };
    bankTradeNotice?: {
      playerName: string;
      giveResource: ResourceType;
      giveAmount: number;
      receiveResource: ResourceType;
      receiveAmount: number;
      ratio: 2 | 3 | 4;
      message: string;
    };
    botActionNotice?: string;
  };
}

export type GameAction =
  | { type: 'UPDATE_CONFIG'; config: Partial<GameConfig> }
  | {
      type: 'GENERATE_BOARD';
      mode?: BoardMode;
      preventAdjacentRedNumbers?: boolean;
      desertInCenter?: boolean;
      randomizeVariableSetup?: boolean;
    }
  | { type: 'CUSTOM_SET_HEX_TERRAIN'; hexId: string; terrain: TerrainType }
  | { type: 'CUSTOM_SET_HEX_NUMBER'; hexId: string; numberToken: number | null }
  | { type: 'CUSTOM_SWAP_HEXES'; hexIdA: string; hexIdB: string }
  | { type: 'CUSTOM_SET_PORT'; edgeId: string; portType: PortType | null }
  | { type: 'ADD_BOT'; difficulty?: BotDifficulty }
  | { type: 'FILL_ROOM_WITH_BOTS'; difficulty?: BotDifficulty }
  | { type: 'SET_BOT_DIFFICULTY'; targetPlayerId: string; difficulty: BotDifficulty }
  | { type: 'SET_GLOBAL_BOT_DIFFICULTY'; difficulty: BotDifficulty }
  | { type: 'REMOVE_PLAYER'; targetPlayerId: string }
  | { type: 'START_GAME' }
  | { type: 'ROLL_FOR_ORDER' }
  | { type: 'AUTO_ROLL_ALL_ORDER' }
  | { type: 'SET_CUSTOM_PLAYER_ORDER'; playerIds: string[] }
  | { type: 'CONFIRM_TURN_ORDER' }
  | { type: 'PLACE_SETTLEMENT'; vertexId: string }
  | { type: 'PLACE_ROAD'; edgeId: string }
  | { type: 'PLACE_SHIP'; edgeId: string }
  | { type: 'MOVE_SHIP'; fromEdgeId: string; toEdgeId: string }
  | { type: 'UPGRADE_CITY'; vertexId: string }
  | { type: 'ROLL_DICE' }
  | { type: 'DISCARD_RESOURCES'; resources: Record<ResourceType, number> }
  | { type: 'MOVE_ROBBER'; hexId: string }
  | { type: 'MOVE_PIRATE'; hexId: string }
  | { type: 'SET_ROBBER_OR_PIRATE_MODE'; mode: 'ROBBER' | 'PIRATE' }
  | { type: 'CLAIM_GOLD_RESOURCE'; resource: ResourceType }
  | { type: 'STEAL_RESOURCE'; victimPlayerId: string }
  | { type: 'BUY_DEV_CARD' }
  | {
      type: 'PLAY_DEV_CARD';
      cardId: string;
      // Optional payload depending on card type
      monopolyResource?: ResourceType;
      yearOfPlentyResources?: [ResourceType, ResourceType];
    }
  | {
      type: 'CREATE_TRADE_OFFER';
      targetPlayerId: string | null;
      offer: Record<ResourceType, number>;
      request: Record<ResourceType, number>;
      parentOfferId?: string;
    }
  | { type: 'RESPOND_TRADE_OFFER'; offerId: string; response: 'ACCEPT' | 'REJECT' }
  | { type: 'EXECUTE_TRADE_OFFER'; offerId: string; partnerPlayerId: string }
  | { type: 'CANCEL_TRADE_OFFER'; offerId: string }
  | {
      type: 'BANK_TRADE';
      giveResource: ResourceType;
      giveAmount: number;
      receiveResource: ResourceType;
      receiveAmount: number;
    }
  | { type: 'END_TURN' }
  | {
      type: 'HANDLE_DISCONNECTED_PLAYER';
      targetPlayerId: string;
      resolution: 'WAIT_PAUSE' | 'FREEZE_SKIP' | 'CONVERT_TO_BOT' | 'REMOVE';
    }
  | { type: 'RESUME_GAME' }
  | { type: 'TOGGLE_HOST_PAUSE' }
  | { type: 'ABANDON_GAME' }
  | { type: 'FINISH_ROAD_BUILDING' }
  // Acciones Oficiales Navegantes (Escenarios 3, 5, 7, 8):
  | { type: 'CLAIM_FORGOTTEN_GIFT'; giftId: string }
  | { type: 'CONVERT_SHIP_TO_WARSHIP'; edgeId: string }
  | { type: 'ATTACK_PIRATE_FORTRESS'; fortressId: string }
  | { type: 'START_WONDER'; wonderId: WonderId }
  | { type: 'BUILD_WONDER_STAGE' };

