export type ResourceType = 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';

export type TerrainType = ResourceType | 'DESERT' | 'SEA';

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
}

export type BoardMode =
  | 'STANDARD_3_4'
  | 'CUSTOM'
  | 'EXPANSION_5_6'
  | 'MEGA_RADIUS_3';

export interface BoardState {
  mode: BoardMode;
  hexSize: number;
  hexes: Record<string, Hex>;
  vertices: Record<string, Vertex>;
  edges: Record<string, Edge>;
  ports: PortInfo[];
  robberHexId: string;
}

export type ExpansionModule =
  | 'BASE'
  | 'SEAFARERS'
  | 'CITIES_AND_KNIGHTS'
  | 'BARBARIANS';

export type TurnActionRestrictionLevel =
  | 'LEVEL_1_FREE'
  | 'LEVEL_2_LIMITED'
  | 'LEVEL_3_STRICT';

export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface GameConfig {
  boardMode: BoardMode;
  preventAdjacentRedNumbers: boolean;
  desertInCenter: boolean;
  // 1. Distancia mínima entre casas
  minSettlementDistance: 1 | 2;
  // 2. Uso Inmediato de Cartas de Desarrollo (true = jugables en el mismo turno de compra)
  allowInstantDevCards: boolean;
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
  | 'WAITING_FOR_DICE'
  | 'ROBBER_DISCARD'
  | 'ROBBER_MOVE'
  | 'ROBBER_STEAL'
  | 'MAIN_PHASE'
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
    buyerPlayerId?: string;
    buyerPlayerName?: string;
    builtItem?: {
      type: 'SETTLEMENT' | 'CITY' | 'ROAD';
      vertexId?: string;
      edgeId?: string;
      playerId: string;
    };
    botActionNotice?: string;
  };
}

export type GameAction =
  | { type: 'UPDATE_CONFIG'; config: Partial<GameConfig> }
  | { type: 'GENERATE_BOARD'; mode?: BoardMode; preventAdjacentRedNumbers?: boolean; desertInCenter?: boolean }
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
  | { type: 'UPGRADE_CITY'; vertexId: string }
  | { type: 'ROLL_DICE' }
  | { type: 'DISCARD_RESOURCES'; resources: Record<ResourceType, number> }
  | { type: 'MOVE_ROBBER'; hexId: string }
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
  | { type: 'ABANDON_GAME' };

