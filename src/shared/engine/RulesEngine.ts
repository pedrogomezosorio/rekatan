import {
  ALL_RESOURCES,
  AVATAR_LIST,
  BOT_AVATAR_LIST,
  BUILDING_COSTS,
  countTotalResources,
  createEmptyResources,
  DEFAULT_GAME_CONFIG,
  PLAYER_COLORS,
  RESOURCE_META,
} from '../constants';
import {
  BoardState,
  DevCard,
  DevCardType,
  DiscardAnimationEvent,
  GameAction,
  GameConfig,
  GameLogEntry,
  GamePhase,
  GameState,
  Hex,
  PlayerColor,
  PlayerState,
  PortInfo,
  PortType,
  ResourceFlightEvent,
  ResourceType,
  TerrainType,
  TradeOffer,
} from '../types';
import {
  buildTopologyFromHexes,
  computeDockCenter,
  DEFAULT_HEX_SIZE,
  enforceDesertInCenterRule,
  generateBoard,
} from './HexGrid';
import { updateLongestRoadAward } from './LongestRoad';
import { evaluateBotTradeOffer, executeBotStep, pickBestSettlementVertex } from './BotEngine';

const VP_CARD_TITLES = [
  'Ayuntamiento',
  'Biblioteca',
  'Mercado',
  'Universidad de Catan',
  'Gran Catedral',
];

function createDevDeck(isExpansion56: boolean = false): DevCard[] {
  const specs: Array<{ type: DevCardType; title: string; count: number }> = [
    { type: 'KNIGHT', title: 'Caballero', count: isExpansion56 ? 20 : 14 },
    { type: 'VICTORY_POINT', title: 'Punto de Victoria', count: 5 },
    { type: 'ROAD_BUILDING', title: 'Construcción de Carreteras', count: isExpansion56 ? 3 : 2 },
    { type: 'YEAR_OF_PLENTY', title: 'Año de la Abundancia (Invento)', count: isExpansion56 ? 3 : 2 },
    { type: 'MONOPOLY', title: 'Monopolio', count: isExpansion56 ? 3 : 2 },
  ];

  const deck: DevCard[] = [];
  let vpIdx = 0;
  let counter = 1;

  for (const spec of specs) {
    for (let i = 0; i < spec.count; i++) {
      const title =
        spec.type === 'VICTORY_POINT'
          ? VP_CARD_TITLES[vpIdx++ % VP_CARD_TITLES.length]
          : spec.title;
      deck.push({
        id: `DEV_${counter++}_${spec.type}`,
        type: spec.type,
        title,
        boughtAtTurn: -1,
        played: false,
      });
    }
  }

  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function createInitialGameState(
  roomCode: string,
  hostPlayer: { id: string; name: string; color: PlayerColor; avatar: string }
): GameState {
  const config: GameConfig = { ...DEFAULT_GAME_CONFIG };
  const board = generateBoard(
    config.boardMode,
    config.preventAdjacentRedNumbers,
    DEFAULT_HEX_SIZE,
    config.desertInCenter
  );

  const host: PlayerState = {
    id: hostPlayer.id,
    name: hostPlayer.name || 'Anfitrión',
    color: hostPlayer.color || 'RED',
    avatar: hostPlayer.avatar || 'I',
    isHost: true,
    isBot: false,
    connected: true,
    status: 'ACTIVE',
    resources: createEmptyResources(),
    devCards: [],
    knightsPlayed: 0,
    longestRoadLength: 0,
    longestRoadEdgeIds: [],
    settlementsLeft: 5,
    citiesLeft: 4,
    roadsLeft: 15,
    shipsLeft: 15,
    hasMovedShipThisTurn: false,
    discoveryVictoryPoints: 0,
    publicVictoryPoints: 0,
    totalVictoryPoints: 0,
    mustDiscardCount: 0,
  };

  return {
    roomCode,
    createdAt: Date.now(),
    phase: 'LOBBY',
    config,
    board,
    players: [host],
    turn: {
      turnNumber: 0,
      activePlayerId: host.id,
      setupStepIndex: 0,
      setupOrder: [],
      lastPlacedSetupSettlementId: null,
      diceRoll: null,
      hasRolledDice: false,
      devCardPlayedThisTurn: false,
      infrastructureBuiltThisTurn: 0,
      tradesAndBurnsThisTurn: 0,
      hasTradedThisTurn: false,
      hasSpentOrBuiltThisTurn: false,
      freeRoadsRemaining: 0,
      turnDeadlineMs: null,
      botStatusMessage: null,
      botProposedTradeThisTurn: false,
    },
    bank: { WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 },
    devDeck: createDevDeck(false),
    longestRoadPlayerId: null,
    largestArmyPlayerId: null,
    activeTradeOffers: [],
    robberStealCandidates: [],
    winnerId: null,
    logs: [
      {
        id: `LOG_${Date.now()}`,
        timestamp: Date.now(),
        message: `Sala ${roomCode} creada por ${host.name}. Configura las reglas y el tablero antes de iniciar.`,
        type: 'SYSTEM',
        playerId: host.id,
      },
    ],
  };
}

export function addLog(
  state: GameState,
  message: string,
  type: GameLogEntry['type'] = 'INFO',
  playerId?: string
): void {
  state.logs.unshift({
    id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    message,
    type,
    playerId,
  });
  if (state.logs.length > 80) {
    state.logs.length = 80;
  }
}

export function hasResources(
  hand: Record<ResourceType, number>,
  cost: Record<ResourceType, number>
): boolean {
  for (const r of ALL_RESOURCES) {
    if ((hand[r] || 0) < (cost[r] || 0)) return false;
  }
  return true;
}

export function deductResources(
  hand: Record<ResourceType, number>,
  bank: Record<ResourceType, number>,
  cost: Record<ResourceType, number>
): void {
  for (const r of ALL_RESOURCES) {
    const amt = cost[r] || 0;
    hand[r] -= amt;
    bank[r] += amt;
  }
}

/**
 * Recalculates publicVictoryPoints and totalVictoryPoints for all players,
 * and checks if any player has reached victoryPointsTarget on their turn.
 */
export function recalculateVictoryPoints(state: GameState): void {
  for (const p of state.players) {
    let publicVP = 0;

    for (const v of Object.values(state.board.vertices)) {
      if (v.playerId === p.id) {
        if (v.building === 'SETTLEMENT') publicVP += 1;
        else if (v.building === 'CITY') publicVP += 2;
      }
    }

    if (state.longestRoadPlayerId === p.id) {
      publicVP += 2;
    }
    if (state.largestArmyPlayerId === p.id) {
      publicVP += 2;
    }
    if (p.discoveryVictoryPoints) {
      publicVP += p.discoveryVictoryPoints;
    }

    const hiddenVP = p.devCards.filter((c) => c.type === 'VICTORY_POINT').length;

    p.publicVictoryPoints = publicVP;
    p.totalVictoryPoints = publicVP + hiddenVP;
  }

  // Official Catan Rule: A player wins immediately during their turn if totalVictoryPoints >= victoryPointsTarget
  if (state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER') {
    const activePlayer = state.players.find((p) => p.id === state.turn.activePlayerId);
    if (
      activePlayer &&
      activePlayer.totalVictoryPoints >= state.config.victoryPointsTarget
    ) {
      state.winnerId = activePlayer.id;
      state.phase = 'GAME_OVER';
      state.turn.turnDeadlineMs = null;
      addLog(
        state,
        `¡${activePlayer.name} ha alcanzado ${activePlayer.totalVictoryPoints} Puntos de Victoria y gana la partida!`,
        'AWARD',
        activePlayer.id
      );
    }
  }
}

export function updateLargestArmyAward(state: GameState): void {
  let currentHolder = state.players.find((p) => p.id === state.largestArmyPlayerId) || null;
  let currentMax = currentHolder ? currentHolder.knightsPlayed : 2; // Minimum 3 knights required

  for (const p of state.players) {
    if (p.knightsPlayed >= 3 && p.knightsPlayed > currentMax) {
      currentMax = p.knightsPlayed;
      currentHolder = p;
    }
  }

  const newHolderId = currentHolder && currentHolder.knightsPlayed >= 3 ? currentHolder.id : null;
  if (newHolderId !== state.largestArmyPlayerId) {
    state.largestArmyPlayerId = newHolderId;
    if (newHolderId) {
      const winner = state.players.find((p) => p.id === newHolderId);
      if (winner) {
        addLog(
          state,
          `${winner.name} obtiene el Gran Ejército de Caballería (${winner.knightsPlayed} caballeros, +2 PV).`,
          'AWARD',
          winner.id
        );
      }
    }
  }
}

/**
 * Computes the best trade ratio (2:1, 3:1, or 4:1) for each resource for a player based on their ports.
 */
export function getPlayerBankTradeRatios(
  state: GameState,
  playerId: string
): Record<ResourceType, 2 | 3 | 4> {
  const ratios: Record<ResourceType, 2 | 3 | 4> = {
    WOOD: 4,
    BRICK: 4,
    SHEEP: 4,
    WHEAT: 4,
    ORE: 4,
  };

  for (const v of Object.values(state.board.vertices)) {
    if (v.playerId === playerId && v.building !== null && v.port) {
      if (v.port.type === 'GENERIC') {
        for (const r of ALL_RESOURCES) {
          if (ratios[r] > 3) ratios[r] = 3;
        }
      } else {
        ratios[v.port.type] = 2;
      }
    }
  }

  return ratios;
}

/**
 * Checks whether a player is allowed to trade or burn cards with the bank/ports right now,
 * respecting strict WAITING_FOR_DICE and the 3 levels of `turnActionRestriction`.
 */
export function canTradeThisTurn(
  state: GameState,
  playerId: string
): { allowed: boolean; reason?: string } {
  if (state.phase === 'WAITING_FOR_DICE' || !state.turn.hasRolledDice) {
    return {
      allowed: false,
      reason: 'Primero debes lanzar los dados obligatoriamente antes de comerciar o quemar cartas.',
    };
  }
  if (state.phase !== 'MAIN_PHASE') {
    return {
      allowed: false,
      reason: 'Solo puedes comerciar o quemar cartas en la fase principal de tu turno.',
    };
  }
  if (state.turn.activePlayerId !== playerId) {
    return { allowed: false, reason: 'No es tu turno.' };
  }

  const level = state.config.turnActionRestriction || 'LEVEL_1_FREE';

  // Nivel 3 (Estricto) o regla exclusiva: O solo Construyes, O solo Quemas/Comercias
  if (
    (level === 'LEVEL_3_STRICT' || state.config.exclusiveTradeOrSpend) &&
    state.turn.hasSpentOrBuiltThisTurn
  ) {
    return {
      allowed: false,
      reason:
        'Nivel 3 (Estricto): Ya has construido o comprado desarrollo en este turno; Quemar Cartas y Comerciar está bloqueado.',
    };
  }

  // Nivel 2 (Limitado): Límite de Comerciar O Quemar 1 sola vez por turno
  if (level === 'LEVEL_2_LIMITED' && (state.turn.tradesAndBurnsThisTurn || 0) >= 1) {
    return {
      allowed: false,
      reason:
        'Nivel 2 (Limitado): Solo puedes Comerciar o Quemar Cartas 1 sola vez por turno.',
    };
  }

  return { allowed: true };
}

/**
 * Checks whether a player can build infrastructure or buy a Dev Card,
 * respecting strict WAITING_FOR_DICE and the 3 levels of `turnActionRestriction`.
 */
export function canSpendOrBuildThisTurn(
  state: GameState,
  playerId: string,
  isInfrastructure: boolean
): { allowed: boolean; reason?: string } {
  if (state.phase === 'WAITING_FOR_DICE' || !state.turn.hasRolledDice) {
    return {
      allowed: false,
      reason: 'Primero debes lanzar los dados obligatoriamente antes de construir.',
    };
  }
  if (state.phase !== 'MAIN_PHASE') {
    return { allowed: false, reason: 'Solo puedes construir en la fase principal de tu turno.' };
  }
  if (state.turn.activePlayerId !== playerId) {
    return { allowed: false, reason: 'No es tu turno.' };
  }

  const level = state.config.turnActionRestriction || 'LEVEL_1_FREE';

  // Nivel 3 (Estricto) o regla exclusiva: O solo Construyes, O solo Quemas/Comercias
  if (
    (level === 'LEVEL_3_STRICT' || state.config.exclusiveTradeOrSpend) &&
    (state.turn.hasTradedThisTurn || (state.turn.tradesAndBurnsThisTurn || 0) > 0)
  ) {
    return {
      allowed: false,
      reason:
        'Nivel 3 (Estricto): Ya has Quemado Cartas o Comerciado en este turno; la ruta de Construcción está bloqueada.',
    };
  }

  // Nivel 2 (Limitado) o límite de infraestructura: máximo 1 unidad de infraestructura por turno
  if (
    isInfrastructure &&
    (level === 'LEVEL_2_LIMITED' || state.config.maxInfrastructurePerTurn === 1) &&
    state.turn.infrastructureBuiltThisTurn >= 1
  ) {
    return {
      allowed: false,
      reason:
        'Nivel 2 (Limitado): Solo puedes construir 1 unidad de infraestructura por turno.',
    };
  }

  return { allowed: true };
}

/**
 * Validates whether `playerId` can build a Settlement at `vertexId`.
 * Except during initial setup (SETUP_SETTLEMENT_1 / SETUP_SETTLEMENT_2),
 * a player CANNOT place a settlement on an empty vertex unless it is connected
 * to at least one of their own roads.
 */
export function canBuildSettlement(
  state: GameState,
  playerId: string,
  vertexId: string,
  ignoreResources: boolean = false
): { allowed: boolean; reason?: string } {
  if (state.turn.activePlayerId !== playerId) {
    return { allowed: false, reason: 'No es tu turno.' };
  }

  const isSetup =
    state.phase === 'SETUP_SETTLEMENT_1' || state.phase === 'SETUP_SETTLEMENT_2';
  const isMain = state.phase === 'MAIN_PHASE';

  if (!isSetup && !isMain) {
    return { allowed: false, reason: 'Fase inválida para colocar un poblado.' };
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.settlementsLeft <= 0) {
    return { allowed: false, reason: 'No te quedan piezas de poblado disponibles.' };
  }

  const v = state.board.vertices[vertexId];
  if (!v || !v.isLand || v.building !== null) {
    return { allowed: false, reason: 'Intersección inválida u ocupada.' };
  }

  if (isMain && !ignoreResources) {
    const check = canSpendOrBuildThisTurn(state, playerId, true);
    if (!check.allowed) return check;
    if (!hasResources(player.resources, BUILDING_COSTS.SETTLEMENT)) {
      return {
        allowed: false,
        reason: 'No tienes los recursos necesarios (1 Madera, 1 Arcilla, 1 Oveja, 1 Trigo).',
      };
    }
  }

  // Strictly verify connection to at least one road or ship owned by `playerId`
  // by checking both adjacentEdgeIds and edge endpoint vertices directly.
  const connectedToOwnRoadOrShip = Object.values(state.board.edges).some(
    (edge) =>
      (edge.building === 'ROAD' || edge.building === 'SHIP') &&
      edge.playerId === playerId &&
      (edge.vertexIds[0] === vertexId || edge.vertexIds[1] === vertexId)
  );

  // CRITICAL RULE: Except in initial setup, a settlement MUST connect to one of the player's own roads or ships!
  if (!isSetup && !connectedToOwnRoadOrShip) {
    return {
      allowed: false,
      reason: 'Solo puedes construir un poblado en un vértice conectado a una de tus propias carreteras o barcos.',
    };
  }

  // Check minimum settlement distance rule using all edges incident to `vertexId`
  const neighborVertexIds = new Set<string>(v.adjacentVertexIds);
  for (const edge of Object.values(state.board.edges)) {
    if (edge.vertexIds[0] === vertexId) neighborVertexIds.add(edge.vertexIds[1]);
    if (edge.vertexIds[1] === vertexId) neighborVertexIds.add(edge.vertexIds[0]);
  }

  const hasAdjacentBuilding = Array.from(neighborVertexIds).some((adjId) => {
    const adj = state.board.vertices[adjId];
    return Boolean(adj && adj.building !== null);
  });

  if (hasAdjacentBuilding) {
    if (state.config.minSettlementDistance === 2) {
      return {
        allowed: false,
        reason: 'Regla de distancia: no puedes construir a menos de 2 caminos de otro poblado o ciudad.',
      };
    } else if (!connectedToOwnRoadOrShip) {
      return {
        allowed: false,
        reason: 'Con distancia mínima de 1 arista debes conectar mediante carretera o barco propio.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Returns all valid vertex IDs where `playerId` can currently place a new Settlement.
 * Used both by the UI for real-time pulsing highlights and by the Server for authoritative validation.
 */
export function getValidSettlementVertices(
  state: GameState,
  playerId: string
): string[] {
  const validIds: string[] = [];
  for (const v of Object.values(state.board.vertices)) {
    if (canBuildSettlement(state, playerId, v.id).allowed) {
      validIds.push(v.id);
    }
  }
  return validIds;
}

/**
 * Returns all potential vertex IDs connected to playerId's road network that satisfy
 * the distance rule, regardless of whether the player currently holds the resources.
 */
export function getPotentialSettlementVertices(
  state: GameState,
  playerId: string
): string[] {
  const validIds: string[] = [];
  for (const v of Object.values(state.board.vertices)) {
    if (canBuildSettlement(state, playerId, v.id, true).allowed) {
      validIds.push(v.id);
    }
  }
  return validIds;
}

/**
 * Returns all valid edge IDs where `playerId` can currently place a Road.
 */
export function getValidRoadEdges(state: GameState, playerId: string): string[] {
  if (state.turn.activePlayerId !== playerId) return [];

  const isSetup = state.phase === 'SETUP_ROAD_1' || state.phase === 'SETUP_ROAD_2';
  const isFreeDev = state.phase === 'ROAD_BUILDING_DEV';
  const isMain = state.phase === 'MAIN_PHASE';

  if (!isSetup && !isFreeDev && !isMain) return [];

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.roadsLeft <= 0) return [];

  if (isSetup) {
    const lastVertexId = state.turn.lastPlacedSetupSettlementId;
    if (!lastVertexId) return [];
    const lastVertex = state.board.vertices[lastVertexId];
    if (!lastVertex) return [];
    return lastVertex.adjacentEdgeIds.filter((eId) => {
      const edge = state.board.edges[eId];
      return edge && edge.isLand && edge.building === null;
    });
  }

  if (isMain) {
    const check = canSpendOrBuildThisTurn(state, playerId, true);
    if (!check.allowed) return [];
    if (!hasResources(player.resources, BUILDING_COSTS.ROAD)) return [];
  }

  if (isFreeDev && state.turn.freeRoadsRemaining <= 0) {
    return [];
  }

  const validEdgeIds: string[] = [];

  for (const edge of Object.values(state.board.edges)) {
    if (!edge.isLand || edge.building !== null) continue;

    // Must connect to at least one vertex that either:
    // a) has a building owned by playerId, OR
    // b) has an adjacent road owned by playerId AND is not blocked by an opponent's building
    const connects = edge.vertexIds.some((vId) => {
      const v = state.board.vertices[vId];
      if (!v) return false;
      if (v.playerId === playerId && v.building !== null) return true;
      if (v.playerId !== null && v.playerId !== playerId && v.building !== null) {
        return false; // Blocked by opponent's settlement/city
      }
      return v.adjacentEdgeIds.some((adjEdgeId) => {
        if (adjEdgeId === edge.id) return false;
        const adjEdge = state.board.edges[adjEdgeId];
        return adjEdge && adjEdge.playerId === playerId && adjEdge.building !== null;
      });
    });

    if (connects) {
      validEdgeIds.push(edge.id);
    }
  }

  return validEdgeIds;
}

/**
 * Validates whether `playerId` can build a Ship on `edgeId`.
 */
export function canBuildShip(
  state: GameState,
  playerId: string,
  edgeId: string,
  ignoreResources: boolean = false
): { allowed: boolean; reason?: string } {
  const isSetup =
    state.phase === 'SETUP_ROAD_1' || state.phase === 'SETUP_ROAD_2';
  const isMain = state.phase === 'MAIN_PHASE';

  if (!isSetup && !isMain) {
    return { allowed: false, reason: 'Fase inválida para construir un barco.' };
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player || (player.shipsLeft ?? 15) <= 0) {
    return { allowed: false, reason: 'No te quedan barcos disponibles (límite de 15).' };
  }

  const edge = state.board.edges[edgeId];
  if (!edge || edge.building !== null) {
    return { allowed: false, reason: 'Camino marítimo no válido u ocupado.' };
  }

  // Ship must be on sea or coastal edge (cannot be built on pure inland land-land edge)
  const isWaterOrCoastal = !edge.isLand || edge.isCoastal;
  if (!isWaterOrCoastal) {
    return { allowed: false, reason: 'Los barcos solo pueden colocarse en el mar o en la costa.' };
  }

  // Pirate blocks building on adjacent edges
  if (state.board.pirateHexId && edge.hexIds.includes(state.board.pirateHexId)) {
    return { allowed: false, reason: 'El Pirata bloquea la construcción de barcos en este hexágono.' };
  }

  if (isSetup) {
    const lastVertexId = state.turn.lastPlacedSetupSettlementId;
    if (!lastVertexId) return { allowed: false, reason: 'No hay poblado inicial colocado.' };
    if (!edge.vertexIds.includes(lastVertexId)) {
      return { allowed: false, reason: 'El barco inicial debe conectarse al último poblado costero colocado.' };
    }
    return { allowed: true };
  }

  if (isMain && !ignoreResources) {
    const check = canSpendOrBuildThisTurn(state, playerId, true);
    if (!check.allowed) return check;
    if (!hasResources(player.resources, BUILDING_COSTS.SHIP)) {
      return {
        allowed: false,
        reason: 'No tienes los recursos necesarios (1 Madera, 1 Oveja).',
      };
    }
  }

  // In MAIN_PHASE: must connect to player's network:
  // a) Connects to player's settlement or city at one endpoint
  // b) OR connects to another ship owned by player, without an opponent building blocking the vertex
  // Note: A ship CANNOT branch directly from a road without a settlement/city!
  const connects = edge.vertexIds.some((vId) => {
    const v = state.board.vertices[vId];
    if (!v) return false;
    if (v.playerId === playerId && v.building !== null) return true;
    if (v.playerId !== null && v.playerId !== playerId && v.building !== null) {
      return false; // Opponent building blocks continuation
    }
    return v.adjacentEdgeIds.some((adjEdgeId) => {
      if (adjEdgeId === edge.id) return false;
      const adjEdge = state.board.edges[adjEdgeId];
      return adjEdge && adjEdge.playerId === playerId && adjEdge.building === 'SHIP';
    });
  });

  if (!connects) {
    return {
      allowed: false,
      reason: 'El barco debe conectarse a un poblado/ciudad propio o a otra línea de barcos propia.',
    };
  }

  return { allowed: true };
}

/**
 * Returns all valid edge IDs where `playerId` can currently build a Ship.
 */
export function getValidShipEdges(state: GameState, playerId: string): string[] {
  if (state.turn.activePlayerId !== playerId) return [];

  const isSetup = state.phase === 'SETUP_ROAD_1' || state.phase === 'SETUP_ROAD_2';
  const isMain = state.phase === 'MAIN_PHASE';
  if (!isSetup && !isMain) return [];

  const player = state.players.find((p) => p.id === playerId);
  if (!player || (player.shipsLeft ?? 15) <= 0) return [];

  if (isMain) {
    const check = canSpendOrBuildThisTurn(state, playerId, true);
    if (!check.allowed) return [];
    if (!hasResources(player.resources, BUILDING_COSTS.SHIP)) return [];
  }

  const valid: string[] = [];
  for (const edge of Object.values(state.board.edges)) {
    if (canBuildShip(state, playerId, edge.id, true).allowed) {
      valid.push(edge.id);
    }
  }
  return valid;
}

/**
 * Returns all potential ship edges regardless of current player resources.
 */
export function getPotentialShipEdges(state: GameState, playerId: string): string[] {
  const valid: string[] = [];
  for (const edge of Object.values(state.board.edges)) {
    if (canBuildShip(state, playerId, edge.id, true).allowed) {
      valid.push(edge.id);
    }
  }
  return valid;
}

/**
 * Returns all edge IDs with an "open" ship belonging to `playerId` that can be moved.
 */
export function getMovableShipEdges(state: GameState, playerId: string): string[] {
  if (state.phase !== 'MAIN_PHASE' || state.turn.activePlayerId !== playerId) {
    return [];
  }
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.hasMovedShipThisTurn) return [];

  const movableEdges: string[] = [];

  for (const edge of Object.values(state.board.edges)) {
    if (edge.building !== 'SHIP' || edge.playerId !== playerId) continue;

    // Pirate blocks moving adjacent ships!
    if (state.board.pirateHexId && edge.hexIds.includes(state.board.pirateHexId)) {
      continue;
    }

    // A ship is open if at least one of its endpoint vertices has NO other ship of the player
    // AND NO settlement/city of the player.
    const [v1Id, v2Id] = edge.vertexIds;
    const v1 = state.board.vertices[v1Id];
    const v2 = state.board.vertices[v2Id];

    const v1HasOtherShipOrBuilding =
      (v1?.playerId === playerId && v1?.building !== null) ||
      (v1?.adjacentEdgeIds.some(
        (adjId) =>
          adjId !== edge.id &&
          state.board.edges[adjId]?.building === 'SHIP' &&
          state.board.edges[adjId]?.playerId === playerId
      ) ?? false);

    const v2HasOtherShipOrBuilding =
      (v2?.playerId === playerId && v2?.building !== null) ||
      (v2?.adjacentEdgeIds.some(
        (adjId) =>
          adjId !== edge.id &&
          state.board.edges[adjId]?.building === 'SHIP' &&
          state.board.edges[adjId]?.playerId === playerId
      ) ?? false);

    // If either v1 or v2 has no other ship/building, this ship is at the end of an open line!
    if (!v1HasOtherShipOrBuilding || !v2HasOtherShipOrBuilding) {
      movableEdges.push(edge.id);
    }
  }

  return movableEdges;
}

/**
 * Returns valid destinations when moving an open ship from `fromEdgeId`.
 */
export function getValidShipMoveDestinations(
  state: GameState,
  playerId: string,
  fromEdgeId: string
): string[] {
  const fromEdge = state.board.edges[fromEdgeId];
  if (!fromEdge || fromEdge.building !== 'SHIP' || fromEdge.playerId !== playerId) {
    return [];
  }

  // Temporarily remove ship to test valid placement destinations (ignoring resource costs)
  fromEdge.building = null;
  fromEdge.playerId = null;

  const validDestinations: string[] = [];
  for (const edge of Object.values(state.board.edges)) {
    if (edge.id !== fromEdgeId && canBuildShip(state, playerId, edge.id, true).allowed) {
      validDestinations.push(edge.id);
    }
  }

  // Restore ship
  fromEdge.building = 'SHIP';
  fromEdge.playerId = playerId;

  return validDestinations;
}

/**
 * Maps each land hex to an Island ID (connected component of non-SEA hexes).
 */
export function computeIslandComponents(board: BoardState): Map<string, number> {
  const hexIslandMap = new Map<string, number>();
  const landHexes = Object.values(board.hexes).filter((h) => h.terrain !== 'SEA');
  let currentIslandId = 0;

  const visited = new Set<string>();

  for (const startHex of landHexes) {
    if (visited.has(startHex.id)) continue;

    const queue: Hex[] = [startHex];
    visited.add(startHex.id);
    hexIslandMap.set(startHex.id, currentIslandId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      // Find adjacent land hexes (distance 1 in hex grid)
      for (const other of landHexes) {
        if (visited.has(other.id)) continue;
        const dist =
          (Math.abs(curr.q - other.q) +
            Math.abs(curr.r - other.r) +
            Math.abs(curr.s - other.s)) /
          2;
        if (dist === 1) {
          visited.add(other.id);
          hexIslandMap.set(other.id, currentIslandId);
          queue.push(other);
        }
      }
    }
    currentIslandId++;
  }

  return hexIslandMap;
}

/**
 * Returns the Island ID of a given vertex (based on touching land hexes), or null if purely sea.
 */
export function getVertexIslandId(
  board: BoardState,
  vertexId: string,
  islandMap?: Map<string, number>
): number | null {
  const vertex = board.vertices[vertexId];
  if (!vertex) return null;
  const map = islandMap || computeIslandComponents(board);
  for (const hId of vertex.hexIds) {
    if (map.has(hId)) {
      return map.get(hId)!;
    }
  }
  return null;
}

/**
 * Returns all valid vertex IDs where `playerId` can upgrade a Settlement to a City.
 */
export function getValidCityVertices(state: GameState, playerId: string): string[] {
  if (state.phase !== 'MAIN_PHASE' || state.turn.activePlayerId !== playerId) {
    return [];
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.citiesLeft <= 0) return [];

  const check = canSpendOrBuildThisTurn(state, playerId, true);
  if (!check.allowed) return [];

  if (!hasResources(player.resources, BUILDING_COSTS.CITY)) return [];

  return Object.values(state.board.vertices)
    .filter((v) => v.playerId === playerId && v.building === 'SETTLEMENT')
    .map((v) => v.id);
}

export function canBuyDevCard(
  state: GameState,
  playerId: string
): { allowed: boolean; reason?: string } {
  const check = canSpendOrBuildThisTurn(state, playerId, false);
  if (!check.allowed) return check;

  if (state.devDeck.length === 0) {
    return { allowed: false, reason: 'El mazo de Cartas de Desarrollo está agotado.' };
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player || !hasResources(player.resources, BUILDING_COSTS.DEV_CARD)) {
    return { allowed: false, reason: 'No tienes suficientes recursos (1 Oveja, 1 Trigo, 1 Piedra).' };
  }

  return { allowed: true };
}

export function refreshTurnDeadline(state: GameState): void {
  if (state.turn.isPausedByHost) {
    state.turn.turnDeadlineMs = null;
    return;
  }
  if (
    state.config.turnTimerSeconds &&
    state.phase !== 'LOBBY' &&
    state.phase !== 'GAME_OVER' &&
    state.phase !== 'PAUSED_DISCONNECT'
  ) {
    state.turn.turnDeadlineMs = Date.now() + state.config.turnTimerSeconds * 1000;
  } else {
    state.turn.turnDeadlineMs = null;
  }
}

function sortPlayersByOrderRolls(state: GameState): void {
  const rolls = state.turn.orderRolls || {};
  state.players.sort((a, b) => {
    const rollA = rolls[a.id];
    const rollB = rolls[b.id];
    const sumA = rollA ? rollA[0] + rollA[1] : -1;
    const sumB = rollB ? rollB[0] + rollB[1] : -1;
    return sumB - sumA;
  });
  const playerIds = state.players.map((p) => p.id);
  state.turn.setupOrder = [...playerIds, ...[...playerIds].reverse()];
  if (state.players.length > 0) {
    state.turn.activePlayerId = state.players[0].id;
  }
}

function advanceToNextTurn(state: GameState): void {
  state.activeTradeOffers = [];
  const activeIdx = state.players.findIndex((p) => p.id === state.turn.activePlayerId);
  const count = state.players.length;

  let nextPlayer = state.players[(activeIdx + 1) % count];
  for (let offset = 1; offset <= count; offset++) {
    const candidate = state.players[(activeIdx + offset) % count];
    if (candidate.status !== 'FROZEN_SKIP' && candidate.status !== 'ABANDONED') {
      nextPlayer = candidate;
      break;
    }
  }

  state.turn.turnNumber += 1;
  state.turn.activePlayerId = nextPlayer.id;
  state.turn.diceRoll = null;
  state.turn.hasRolledDice = false;
  state.turn.devCardPlayedThisTurn = false;
  state.turn.infrastructureBuiltThisTurn = 0;
  state.turn.tradesAndBurnsThisTurn = 0;
  state.turn.hasTradedThisTurn = false;
  state.turn.hasSpentOrBuiltThisTurn = false;
  state.turn.freeRoadsRemaining = 0;
  state.turn.botStatusMessage = null;
  state.turn.botProposedTradeThisTurn = false;
  state.turn.pendingGoldClaims = [];
  state.turn.robberOrPirateMode = null;
  for (const p of state.players) {
    p.hasMovedShipThisTurn = false;
  }
  state.phase = 'WAITING_FOR_DICE';
  refreshTurnDeadline(state);

  addLog(state, `Turno #${state.turn.turnNumber}: Es el turno de ${nextPlayer.name}. Debe lanzar los dados.`, 'INFO', nextPlayer.id);
}

/**
 * Authoritative reducer that validates and applies a GameAction for `playerId`.
 */
export function applyGameAction(
  prevState: GameState,
  playerId: string,
  action: GameAction
): { state: GameState; error?: string } {
  const state: GameState = structuredClone(prevState);
  const actor = state.players.find((p) => p.id === playerId);

  if (!actor) {
    return { state: prevState, error: 'Jugador no encontrado en la sala.' };
  }

  // If the game is paused by the Host, block all actions except TOGGLE_HOST_PAUSE, RESUME_GAME and ABANDON_GAME
  if (
    state.turn.isPausedByHost &&
    action.type !== 'TOGGLE_HOST_PAUSE' &&
    action.type !== 'RESUME_GAME' &&
    action.type !== 'ABANDON_GAME'
  ) {
    return {
      state: prevState,
      error: 'El juego está pausado por el anfitrión. Espera a que se reanude.',
    };
  }

  const nextNonce = (state.lastEvent?.nonce || 0) + 1;

  switch (action.type) {
    case 'UPDATE_CONFIG': {
      if (state.phase !== 'LOBBY') {
        return { state: prevState, error: 'Solo se puede configurar la sala en el lobby.' };
      }
      if (!actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede modificar las reglas.' };
      }

      const prevBoardMode = state.config.boardMode;
      const prevPreventRed = state.config.preventAdjacentRedNumbers;
      const prevDesertInCenter = state.config.desertInCenter;

      state.config = {
        ...state.config,
        ...action.config,
      };

      // Sync turnActionRestriction with legacy flags
      if (action.config.turnActionRestriction) {
        if (action.config.turnActionRestriction === 'LEVEL_1_FREE') {
          state.config.maxInfrastructurePerTurn = 'UNLIMITED';
          state.config.exclusiveTradeOrSpend = false;
        } else if (action.config.turnActionRestriction === 'LEVEL_2_LIMITED') {
          state.config.maxInfrastructurePerTurn = 1;
          state.config.exclusiveTradeOrSpend = false;
        } else if (action.config.turnActionRestriction === 'LEVEL_3_STRICT') {
          state.config.maxInfrastructurePerTurn = 'UNLIMITED';
          state.config.exclusiveTradeOrSpend = true;
        }
      }

      if (
        state.config.boardMode === 'EXPANSION_5_6' ||
        state.config.boardMode === 'MEGA_RADIUS_3'
      ) {
        state.config.maxPlayers = 6;
      } else if (action.config.maxPlayers === undefined && state.players.length <= 4) {
        state.config.maxPlayers = Math.max(4, state.players.length);
      }

      // If expansionModule or seafarersScenario changed, handle Seafarers board setup
      if (
        action.config.expansionModule !== undefined ||
        action.config.seafarersScenario !== undefined
      ) {
        if (action.config.expansionModule === 'SEAFARERS') {
          state.config.seafarersScenario =
            action.config.seafarersScenario ||
            state.config.seafarersScenario ||
            'HEADING_FOR_NEW_SHORES';
          state.config.victoryPointsTarget = 13;
          state.config.desertInCenter = false;
          state.board = generateBoard(
            state.config.boardMode,
            state.config.preventAdjacentRedNumbers,
            DEFAULT_HEX_SIZE,
            false,
            state.config.seafarersScenario
          );
        } else if (action.config.expansionModule === 'BASE') {
          state.config.victoryPointsTarget = 10;
          state.config.desertInCenter = true;
          state.board = generateBoard(
            state.config.boardMode,
            state.config.preventAdjacentRedNumbers,
            DEFAULT_HEX_SIZE,
            true
          );
        } else if (
          state.config.expansionModule === 'SEAFARERS' &&
          action.config.seafarersScenario
        ) {
          state.config.seafarersScenario = action.config.seafarersScenario;
          state.board = generateBoard(
            state.config.boardMode,
            state.config.preventAdjacentRedNumbers,
            DEFAULT_HEX_SIZE,
            false,
            action.config.seafarersScenario
          );
        }
      }

      const isSeaf = state.config.expansionModule === 'SEAFARERS';

      // If boardMode, preventAdjacentRedNumbers, or desertInCenter changed, update or regenerate board
      const desertChanged =
        action.config.desertInCenter !== undefined &&
        action.config.desertInCenter !== prevDesertInCenter;
      const redRuleChanged =
        action.config.preventAdjacentRedNumbers !== undefined &&
        action.config.preventAdjacentRedNumbers !== prevPreventRed;
      const modeChanged =
        action.config.boardMode !== undefined &&
        action.config.boardMode !== prevBoardMode;

      if (!isSeaf) {
        if (modeChanged && action.config.boardMode !== 'CUSTOM') {
          state.board = generateBoard(
            state.config.boardMode,
            state.config.preventAdjacentRedNumbers,
            DEFAULT_HEX_SIZE,
            state.config.desertInCenter
          );
        } else if (redRuleChanged) {
          if (state.config.boardMode === 'CUSTOM') {
            state.config.boardMode = state.players.length > 4 ? 'EXPANSION_5_6' : 'STANDARD_3_4';
          }
          state.board = generateBoard(
            state.config.boardMode,
            state.config.preventAdjacentRedNumbers,
            DEFAULT_HEX_SIZE,
            state.config.desertInCenter
          );
        }

        // Reorganize existing board in-place whenever desertInCenter is clicked/configured
        if (action.config.desertInCenter !== undefined) {
          state.board = enforceDesertInCenterRule(state.board, action.config.desertInCenter);
        }
      }

      addLog(state, `${actor.name} actualizó la configuración de la sala.`, 'SYSTEM', actor.id);
      return { state };
    }

    case 'GENERATE_BOARD': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede regenerar el tablero en el lobby.' };
      }
      const modeToGenerate =
        action.mode && action.mode !== 'CUSTOM'
          ? action.mode
          : state.config.boardMode === 'CUSTOM'
          ? 'STANDARD_3_4'
          : state.config.boardMode;
      const preventRed =
        action.preventAdjacentRedNumbers ?? state.config.preventAdjacentRedNumbers;
      const desertCenter =
        action.desertInCenter ?? state.config.desertInCenter;

      const isSeaf = state.config.expansionModule === 'SEAFARERS';
      state.board = generateBoard(
        modeToGenerate,
        preventRed,
        DEFAULT_HEX_SIZE,
        isSeaf ? false : desertCenter,
        isSeaf ? (state.config.seafarersScenario || 'HEADING_FOR_NEW_SHORES') : undefined
      );
      if (!isSeaf) {
        state.board = enforceDesertInCenterRule(state.board, desertCenter);
      }
      if (action.mode) {
        state.config.boardMode = action.mode;
      }
      if (action.desertInCenter !== undefined && !isSeaf) {
        state.config.desertInCenter = action.desertInCenter;
      }
      addLog(state, `${actor.name} generó un nuevo mapa aleatorio.`, 'SYSTEM', actor.id);
      return { state };
    }

    case 'CUSTOM_SET_HEX_TERRAIN': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede editar el tablero.' };
      }
      const hex = state.board.hexes[action.hexId];
      if (!hex || hex.terrain === 'SEA') {
        return { state: prevState, error: 'Hexágono inválido.' };
      }
      state.config.boardMode = 'CUSTOM';
      hex.terrain = action.terrain;
      if (action.terrain === 'DESERT') {
        hex.numberToken = null;
        // Move robber to this desert
        for (const h of Object.values(state.board.hexes)) {
          h.hasRobber = false;
        }
        hex.hasRobber = true;
        state.board.robberHexId = hex.id;
      } else if (hex.numberToken === null) {
        hex.numberToken = 6;
      }
      return { state };
    }

    case 'CUSTOM_SET_HEX_NUMBER': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede editar el tablero.' };
      }
      const hex = state.board.hexes[action.hexId];
      if (!hex || hex.terrain === 'SEA') {
        return { state: prevState, error: 'Hexágono inválido.' };
      }
      state.config.boardMode = 'CUSTOM';
      if (hex.terrain === 'DESERT') {
        hex.numberToken = null;
      } else {
        hex.numberToken = action.numberToken;
      }
      return { state };
    }

    case 'CUSTOM_SWAP_HEXES': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede editar el tablero.' };
      }
      const hexA = state.board.hexes[action.hexIdA];
      const hexB = state.board.hexes[action.hexIdB];
      if (!hexA || !hexB || hexA.terrain === 'SEA' || hexB.terrain === 'SEA') {
        return { state: prevState, error: 'No se pueden intercambiar hexágonos de mar.' };
      }
      state.config.boardMode = 'CUSTOM';
      const tempTerrain = hexA.terrain;
      const tempNum = hexA.numberToken;
      const tempRobber = hexA.hasRobber;

      hexA.terrain = hexB.terrain;
      hexA.numberToken = hexB.numberToken;
      hexA.hasRobber = hexB.hasRobber;

      hexB.terrain = tempTerrain;
      hexB.numberToken = tempNum;
      hexB.hasRobber = tempRobber;

      if (hexA.hasRobber) state.board.robberHexId = hexA.id;
      if (hexB.hasRobber) state.board.robberHexId = hexB.id;

      return { state };
    }

    case 'CUSTOM_SET_PORT': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede editar puertos.' };
      }
      const edge = state.board.edges[action.edgeId];
      if (!edge || !edge.isCoastal) {
        return { state: prevState, error: 'Los puertos solo pueden colocarse en aristas costeras.' };
      }
      state.config.boardMode = 'CUSTOM';

      // Remove any existing port on this edge or sharing vertices with this edge
      state.board.ports = state.board.ports.filter(
        (p) =>
          p.edgeId !== action.edgeId &&
          !p.vertexIds.includes(edge.vertexIds[0]) &&
          !p.vertexIds.includes(edge.vertexIds[1])
      );

      if (action.portType !== null) {
        const ratio: 2 | 3 = action.portType === 'GENERIC' ? 3 : 2;
        const dockCenter = computeDockCenter(edge, state.board.hexes, state.board.hexSize);
        state.board.ports.push({
          id: `PORT_CUSTOM_${action.edgeId}`,
          type: action.portType,
          ratio,
          edgeId: action.edgeId,
          vertexIds: edge.vertexIds,
          dockCenter,
        });
      }

      // Rebuild vertex port references
      for (const v of Object.values(state.board.vertices)) {
        v.port = null;
      }
      for (const p of state.board.ports) {
        for (const vId of p.vertexIds) {
          if (state.board.vertices[vId]) {
            state.board.vertices[vId].port = { type: p.type, ratio: p.ratio };
          }
        }
      }

      return { state };
    }

    case 'ADD_BOT': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede añadir bots.' };
      }
      if (state.players.length >= state.config.maxPlayers) {
        return { state: prevState, error: `La sala ya alcanzó el máximo de ${state.config.maxPlayers} jugadores.` };
      }
      const usedColors = new Set(state.players.map((p) => p.color));
      const availableColor =
        (Object.keys(PLAYER_COLORS) as PlayerColor[]).find((c) => !usedColors.has(c)) || 'BLUE';
      const botNames = ['Bot Carlos', 'Bot Elena', 'Bot Marco', 'Bot Sofía', 'Bot Diego'];
      const botIdx = state.players.filter((p) => p.isBot).length;
      const botDifficulty = action.difficulty || state.config.defaultBotDifficulty || 'MEDIUM';

      const bot: PlayerState = {
        id: `BOT_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        name: botNames[botIdx % botNames.length],
        color: availableColor,
        avatar: BOT_AVATAR_LIST[(state.players.length + 2) % BOT_AVATAR_LIST.length],
        isHost: false,
        isBot: true,
        botDifficulty,
        connected: true,
        status: 'ACTIVE',
        resources: createEmptyResources(),
        devCards: [],
        knightsPlayed: 0,
        longestRoadLength: 0,
        longestRoadEdgeIds: [],
        settlementsLeft: 5,
        citiesLeft: 4,
        roadsLeft: 15,
        shipsLeft: 15,
        hasMovedShipThisTurn: false,
        discoveryVictoryPoints: 0,
        publicVictoryPoints: 0,
        totalVictoryPoints: 0,
        mustDiscardCount: 0,
      };

      state.players.push(bot);
      addLog(state, `Se añadió a ${bot.name} (${botDifficulty}) a la sala.`, 'SYSTEM', actor.id);
      return { state };
    }

    case 'FILL_ROOM_WITH_BOTS': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede rellenar la sala con bots.' };
      }
      const targetSlots = Math.min(state.config.maxPlayers, 4);
      const needed = targetSlots - state.players.length;
      if (needed <= 0) {
        return { state: prevState, error: 'La sala ya tiene el número necesario de jugadores.' };
      }
      const botDifficulty = action.difficulty || state.config.defaultBotDifficulty || 'MEDIUM';
      const botNames = ['Bot Carlos', 'Bot Elena', 'Bot Marco', 'Bot Sofía', 'Bot Diego'];

      for (let i = 0; i < needed; i++) {
        const usedColors = new Set(state.players.map((p) => p.color));
        const availableColor =
          (Object.keys(PLAYER_COLORS) as PlayerColor[]).find((c) => !usedColors.has(c)) || 'BLUE';
        const botIdx = state.players.filter((p) => p.isBot).length;

        const bot: PlayerState = {
          id: `BOT_${Date.now()}_${Math.random().toString(36).slice(2, 5)}_${i}`,
          name: botNames[botIdx % botNames.length],
          color: availableColor,
          avatar: AVATAR_LIST[(state.players.length + 2) % AVATAR_LIST.length],
          isHost: false,
          isBot: true,
          botDifficulty,
          connected: true,
          status: 'ACTIVE',
          resources: createEmptyResources(),
          devCards: [],
          knightsPlayed: 0,
          longestRoadLength: 0,
          longestRoadEdgeIds: [],
          settlementsLeft: 5,
          citiesLeft: 4,
          roadsLeft: 15,
          shipsLeft: 15,
          hasMovedShipThisTurn: false,
          discoveryVictoryPoints: 0,
          publicVictoryPoints: 0,
          totalVictoryPoints: 0,
          mustDiscardCount: 0,
        };
        state.players.push(bot);
      }
      addLog(state, `Se rellenó la sala con ${needed} Bot(s) (${botDifficulty}).`, 'SYSTEM', actor.id);
      return { state };
    }

    case 'SET_BOT_DIFFICULTY': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede configurar la dificultad del bot.' };
      }
      const bot = state.players.find((p) => p.id === action.targetPlayerId && p.isBot);
      if (bot) {
        bot.botDifficulty = action.difficulty;
        addLog(state, `Dificultad de ${bot.name} ajustada a: ${action.difficulty}.`, 'SYSTEM', actor.id);
      }
      return { state };
    }

    case 'SET_GLOBAL_BOT_DIFFICULTY': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede configurar la dificultad global.' };
      }
      state.config.defaultBotDifficulty = action.difficulty;
      for (const p of state.players) {
        if (p.isBot) {
          p.botDifficulty = action.difficulty;
        }
      }
      addLog(state, `Dificultad global de bots establecida a: ${action.difficulty}.`, 'SYSTEM', actor.id);
      return { state };
    }

    case 'REMOVE_PLAYER': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'No autorizado.' };
      }
      if (action.targetPlayerId === actor.id) {
        return { state: prevState, error: 'No puedes expulsarte a ti mismo.' };
      }
      state.players = state.players.filter((p) => p.id !== action.targetPlayerId);
      return { state };
    }

    case 'START_GAME': {
      if (state.phase !== 'LOBBY' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede iniciar la partida.' };
      }
      if (state.players.length < 2) {
        return {
          state: prevState,
          error: 'Se necesitan al menos 2 jugadores (humanos o bots) para comenzar la partida.',
        };
      }

      const isExpansion = state.players.length > 4 || state.config.boardMode === 'EXPANSION_5_6';
      state.devDeck = createDevDeck(isExpansion);
      state.bank = isExpansion
        ? { WOOD: 24, BRICK: 24, SHEEP: 24, WHEAT: 24, ORE: 24 }
        : { WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 };

      // Strictly ensure Desert in center and initial Robber placement if desertInCenter option is active (non-Seafarers only)
      if (state.config.expansionModule !== 'SEAFARERS' && state.config.desertInCenter !== false) {
        state.board = enforceDesertInCenterRule(state.board, true);
      }

      for (const p of state.players) {
        p.shipsLeft = state.config.expansionModule === 'SEAFARERS' ? 15 : undefined;
        p.hasMovedShipThisTurn = false;
        p.discoveryVictoryPoints = 0;
      }

      const playerIds = state.players.map((p) => p.id);
      const snakeOrder = [...playerIds, ...[...playerIds].reverse()];

      state.turn = {
        turnNumber: 1,
        activePlayerId: state.players[0].id,
        setupStepIndex: 0,
        setupOrder: snakeOrder,
        orderRolls: {},
        lastPlacedSetupSettlementId: null,
        diceRoll: null,
        hasRolledDice: false,
        devCardPlayedThisTurn: false,
        infrastructureBuiltThisTurn: 0,
        tradesAndBurnsThisTurn: 0,
        hasTradedThisTurn: false,
        hasSpentOrBuiltThisTurn: false,
        freeRoadsRemaining: 0,
        turnDeadlineMs: null,
        botStatusMessage: null,
        botProposedTradeThisTurn: false,
      };
      state.phase = 'ORDER_ROLL';
      refreshTurnDeadline(state);

      addLog(
        state,
        `Fase de Orden de Turno: lanzad los dados de iniciativa o elegid el orden de salida.`,
        'SYSTEM'
      );
      return { state };
    }

    case 'ROLL_FOR_ORDER': {
      if (state.phase !== 'ORDER_ROLL') {
        return { state: prevState, error: 'No estamos en la fase de decidir el orden.' };
      }
      if (!state.turn.orderRolls) {
        state.turn.orderRolls = {};
      }
      if (state.turn.orderRolls[playerId]) {
        return { state: prevState, error: 'Ya has lanzado los dados de iniciativa.' };
      }

      const usedSums = new Set(
        Object.values(state.turn.orderRolls).map((pair) => pair[0] + pair[1])
      );

      let d1 = 1;
      let d2 = 1;
      for (let attempt = 0; attempt < 25; attempt++) {
        d1 = Math.floor(Math.random() * 6) + 1;
        d2 = Math.floor(Math.random() * 6) + 1;
        if (!usedSums.has(d1 + d2)) break;
      }

      state.turn.orderRolls[playerId] = [d1, d2];
      state.lastEvent = { nonce: nextNonce, type: 'ORDER_DICE_ROLLED' };

      // Sort players who have rolled by highest sum first
      sortPlayersByOrderRolls(state);

      addLog(
        state,
        `Iniciativa: ${actor.name} obtuvo ${d1 + d2} (${d1} + ${d2}).`,
        'DICE',
        actor.id
      );
      return { state };
    }

    case 'AUTO_ROLL_ALL_ORDER': {
      if (state.phase !== 'ORDER_ROLL' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede tirar por todos.' };
      }
      if (!state.turn.orderRolls) {
        state.turn.orderRolls = {};
      }

      // If everyone already rolled, clear to re-roll a fresh random order for all!
      const allRolled = state.players.every((p) => Boolean(state.turn.orderRolls?.[p.id]));
      if (allRolled) {
        state.turn.orderRolls = {};
      }

      const usedSums = new Set(
        Object.values(state.turn.orderRolls).map((pair) => pair[0] + pair[1])
      );

      for (const p of state.players) {
        if (!state.turn.orderRolls[p.id]) {
          let d1 = 1;
          let d2 = 1;
          for (let attempt = 0; attempt < 25; attempt++) {
            d1 = Math.floor(Math.random() * 6) + 1;
            d2 = Math.floor(Math.random() * 6) + 1;
            if (!usedSums.has(d1 + d2)) break;
          }
          usedSums.add(d1 + d2);
          state.turn.orderRolls[p.id] = [d1, d2];
        }
      }

      sortPlayersByOrderRolls(state);
      addLog(
        state,
        `Sorteo de orden completado: ${state.players.map((p, i) => `${i + 1}º ${p.name}`).join(', ')}.`,
        'DICE',
        actor.id
      );
      return { state };
    }

    case 'SET_CUSTOM_PLAYER_ORDER': {
      if (state.phase !== 'ORDER_ROLL' || !actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede cambiar el orden manualmente.' };
      }
      const reordered: PlayerState[] = [];
      for (const id of action.playerIds) {
        const found = state.players.find((p) => p.id === id);
        if (found) reordered.push(found);
      }
      if (reordered.length === state.players.length) {
        state.players = reordered;
        const playerIds = state.players.map((p) => p.id);
        state.turn.setupOrder = [...playerIds, ...[...playerIds].reverse()];
        state.turn.activePlayerId = state.players[0].id;
      }
      return { state };
    }

    case 'CONFIRM_TURN_ORDER': {
      if (state.phase !== 'ORDER_ROLL') {
        return { state: prevState, error: 'El orden ya fue confirmado.' };
      }
      if (!actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión puede confirmar el orden de salida.' };
      }

      const playerIds = state.players.map((p) => p.id);
      const snakeOrder = [...playerIds, ...[...playerIds].reverse()];
      state.turn.setupOrder = snakeOrder;
      state.turn.setupStepIndex = 0;
      state.turn.activePlayerId = snakeOrder[0];
      state.phase = 'SETUP_SETTLEMENT_1';
      state.lastEvent = { nonce: nextNonce, type: 'ORDER_CONFIRMED' };
      refreshTurnDeadline(state);

      addLog(
        state,
        `Orden confirmado (${state.players.map((p, i) => `${i + 1}º ${p.name}`).join(' → ')}). Comienza la Colocación Inicial con ${state.players[0].name}.`,
        'SYSTEM'
      );
      return { state };
    }

    case 'PLACE_SETTLEMENT': {
      const checkSettlement = canBuildSettlement(state, playerId, action.vertexId);
      if (!checkSettlement.allowed) {
        return {
          state: prevState,
          error: checkSettlement.reason || 'No puedes construir un poblado en esa intersección.',
        };
      }

      const vertex = state.board.vertices[action.vertexId];
      vertex.building = 'SETTLEMENT';
      vertex.playerId = playerId;
      actor.settlementsLeft -= 1;

      if (state.phase === 'SETUP_SETTLEMENT_1' || state.phase === 'SETUP_SETTLEMENT_2') {
        const isFirstSetup = state.phase === 'SETUP_SETTLEMENT_1';
        state.turn.lastPlacedSetupSettlementId = vertex.id;
        state.phase = isFirstSetup ? 'SETUP_ROAD_1' : 'SETUP_ROAD_2';
        refreshTurnDeadline(state);

        const giveInitialResources = state.config.initialSettlementsGiveResources !== false;
        const flights: ResourceFlightEvent[] = [];
        const gainedNames: string[] = [];

        if (giveInitialResources) {
          for (const hId of vertex.hexIds) {
            const hex = state.board.hexes[hId];
            if (
              hex &&
              hex.terrain !== 'DESERT' &&
              hex.terrain !== 'SEA' &&
              hex.terrain !== 'GOLD' &&
              state.bank[hex.terrain as ResourceType] > 0
            ) {
              const res = hex.terrain as ResourceType;
              state.bank[res] -= 1;
              actor.resources[res] += 1;
              gainedNames.push(RESOURCE_META[res].name);
              flights.push({
                id: `FLIGHT_SETUP_${isFirstSetup ? '1' : '2'}_${hId}_${actor.id}`,
                hexId: hId,
                playerId: actor.id,
                resource: res,
                amount: 1,
              });
            }
          }
        }

        // During initial placement, hexagons must NOT glow or illuminate (producingHexIds: [])
        state.lastEvent = {
          nonce: nextNonce,
          type: flights.length > 0 ? 'RESOURCES_PRODUCED' : 'BUILDING_PLACED',
          producingHexIds: [],
          flights,
          builtItem: {
            type: 'SETTLEMENT',
            vertexId: vertex.id,
            playerId: actor.id,
          },
        };

        addLog(
          state,
          giveInitialResources
            ? `${actor.name} colocó su ${isFirstSetup ? 'primer' : 'segundo'} poblado inicial y recibió recursos: ${
                gainedNames.length > 0 ? gainedNames.join(', ') : 'ninguno'
              }.`
            : `${actor.name} colocó su ${isFirstSetup ? 'primer' : 'segundo'} poblado inicial (sin recursos iniciales).`,
          'BUILD',
          actor.id
        );
      } else if (state.phase === 'MAIN_PHASE') {
        deductResources(actor.resources, state.bank, BUILDING_COSTS.SETTLEMENT);
        state.turn.infrastructureBuiltThisTurn += 1;
        state.turn.hasSpentOrBuiltThisTurn = true;
        state.lastEvent = {
          nonce: nextNonce,
          type: 'BUILDING_PLACED',
          builtItem: {
            type: 'SETTLEMENT',
            vertexId: vertex.id,
            playerId: actor.id,
          },
        };
        addLog(state, `${actor.name} construyó un nuevo Poblado.`, 'BUILD', actor.id);

        // Seafarers Discovery Victory Points: award +2 VP if this is the player's first settlement on a foreign island
        if (state.config.expansionModule === 'SEAFARERS' || state.board.pirateHexId) {
          const islandMap = computeIslandComponents(state.board);
          const targetIsland = getVertexIslandId(state.board, vertex.id, islandMap);
          if (targetIsland !== null) {
            const hadPriorSettlementOnIsland = Object.values(state.board.vertices).some(
              (otherV) =>
                otherV.id !== vertex.id &&
                otherV.playerId === actor.id &&
                otherV.building !== null &&
                getVertexIslandId(state.board, otherV.id, islandMap) === targetIsland
            );

            const settlementsOnOtherIslands = Object.values(state.board.vertices).filter(
              (otherV) =>
                otherV.id !== vertex.id &&
                otherV.playerId === actor.id &&
                otherV.building !== null
            ).length;

            if (!hadPriorSettlementOnIsland && settlementsOnOtherIslands > 0) {
              actor.discoveryVictoryPoints = (actor.discoveryVictoryPoints || 0) + 2;
              addLog(
                state,
                `¡Descubrimiento marítimo! ${actor.name} colonizó una nueva isla exterior y obtuvo +2 Puntos de Victoria.`,
                'AWARD',
                actor.id
              );
            }
          }
        }
      }

      // Placing a settlement can break an opponent's Longest Road!
      state.longestRoadPlayerId = updateLongestRoadAward(
        state.board,
        state.players,
        state.longestRoadPlayerId
      );
      recalculateVictoryPoints(state);
      return { state };
    }

    case 'PLACE_ROAD': {
      const validEdges = getValidRoadEdges(state, playerId);
      if (!validEdges.includes(action.edgeId)) {
        return { state: prevState, error: 'No puedes construir una carretera en ese camino.' };
      }

      const edge = state.board.edges[action.edgeId];
      edge.building = 'ROAD';
      edge.playerId = playerId;
      actor.roadsLeft -= 1;

      const prevLongestId = state.longestRoadPlayerId;
      state.longestRoadPlayerId = updateLongestRoadAward(
        state.board,
        state.players,
        state.longestRoadPlayerId
      );
      if (state.longestRoadPlayerId && state.longestRoadPlayerId !== prevLongestId) {
        const holder = state.players.find((p) => p.id === state.longestRoadPlayerId);
        if (holder) {
          addLog(
            state,
            `${holder.name} obtiene la Gran Ruta Comercial (${holder.longestRoadLength} carreteras, +2 PV).`,
            'AWARD',
            holder.id
          );
        }
      }

      if (state.phase === 'SETUP_ROAD_1' || state.phase === 'SETUP_ROAD_2') {
        state.turn.lastPlacedSetupSettlementId = null;
        state.turn.setupStepIndex += 1;
        state.lastEvent = {
          nonce: nextNonce,
          type: 'BUILDING_PLACED',
          builtItem: {
            type: 'ROAD',
            edgeId: edge.id,
            playerId: actor.id,
          },
        };
        const totalSetupSteps = state.turn.setupOrder.length;
        const playerCount = state.players.length;

        if (state.turn.setupStepIndex < totalSetupSteps) {
          const nextPlayerId = state.turn.setupOrder[state.turn.setupStepIndex];
          state.turn.activePlayerId = nextPlayerId;
          state.phase =
            state.turn.setupStepIndex < playerCount
              ? 'SETUP_SETTLEMENT_1'
              : 'SETUP_SETTLEMENT_2';
          refreshTurnDeadline(state);

          const nextPlayer = state.players.find((p) => p.id === nextPlayerId);
          addLog(
            state,
            `${actor.name} colocó su carretera inicial. Turno de colocación para ${nextPlayer?.name}.`,
            'BUILD',
            actor.id
          );
        } else {
          // Snake Draft finished! Start Turn 1 with first player in strict WAITING_FOR_DICE phase
          const firstPlayer = state.players[0];
          state.turn.turnNumber = 1;
          state.turn.activePlayerId = firstPlayer.id;
          state.turn.diceRoll = null;
          state.turn.hasRolledDice = false;
          state.turn.tradesAndBurnsThisTurn = 0;
          state.turn.botStatusMessage = null;
          state.turn.botProposedTradeThisTurn = false;
          state.phase = 'WAITING_FOR_DICE';
          refreshTurnDeadline(state);

          addLog(
            state,
            `Fase inicial completada. Comienza el Turno #1 de ${firstPlayer.name}. Debe lanzar los dados.`,
            'SYSTEM',
            firstPlayer.id
          );
        }
      } else if (state.phase === 'ROAD_BUILDING_DEV') {
        state.turn.freeRoadsRemaining -= 1;
        state.lastEvent = {
          nonce: nextNonce,
          type: 'BUILDING_PLACED',
          builtItem: {
            type: 'ROAD',
            edgeId: edge.id,
            playerId: actor.id,
          },
        };
        addLog(
          state,
          `${actor.name} colocó una carretera gratis (Construcción de Carreteras).`,
          'BUILD',
          actor.id
        );
        const remainingValid = getValidRoadEdges(state, playerId);
        if (state.turn.freeRoadsRemaining <= 0 || remainingValid.length === 0) {
          state.turn.freeRoadsRemaining = 0;
          state.phase = 'MAIN_PHASE';
        }
      } else if (state.phase === 'MAIN_PHASE') {
        deductResources(actor.resources, state.bank, BUILDING_COSTS.ROAD);
        state.turn.infrastructureBuiltThisTurn += 1;
        state.turn.hasSpentOrBuiltThisTurn = true;
        state.lastEvent = {
          nonce: nextNonce,
          type: 'BUILDING_PLACED',
          builtItem: {
            type: 'ROAD',
            edgeId: edge.id,
            playerId: actor.id,
          },
        };
        addLog(state, `${actor.name} construyó una Carretera.`, 'BUILD', actor.id);
      }

      recalculateVictoryPoints(state);
      return { state };
    }

    case 'PLACE_SHIP': {
      const validShips = getValidShipEdges(state, playerId);
      if (!validShips.includes(action.edgeId)) {
        return { state: prevState, error: 'No puedes construir un barco en ese camino marítimo.' };
      }

      const edge = state.board.edges[action.edgeId];
      edge.building = 'SHIP';
      edge.playerId = playerId;
      actor.shipsLeft = Math.max(0, (actor.shipsLeft ?? 15) - 1);

      const prevLongestId = state.longestRoadPlayerId;
      state.longestRoadPlayerId = updateLongestRoadAward(
        state.board,
        state.players,
        state.longestRoadPlayerId
      );
      if (state.longestRoadPlayerId && state.longestRoadPlayerId !== prevLongestId) {
        const holder = state.players.find((p) => p.id === state.longestRoadPlayerId);
        if (holder) {
          addLog(
            state,
            `${holder.name} obtiene la Gran Ruta Comercial (${holder.longestRoadLength} rutas/barcos, +2 PV).`,
            'AWARD',
            holder.id
          );
        }
      }

      if (state.phase === 'SETUP_ROAD_1' || state.phase === 'SETUP_ROAD_2') {
        state.turn.lastPlacedSetupSettlementId = null;
        state.turn.setupStepIndex += 1;
        state.lastEvent = {
          nonce: nextNonce,
          type: 'BUILDING_PLACED',
          builtItem: {
            type: 'SHIP',
            edgeId: edge.id,
            playerId: actor.id,
          },
        };
        const totalSetupSteps = state.turn.setupOrder.length;
        const playerCount = state.players.length;

        if (state.turn.setupStepIndex < totalSetupSteps) {
          const nextPlayerId = state.turn.setupOrder[state.turn.setupStepIndex];
          state.turn.activePlayerId = nextPlayerId;
          state.phase =
            state.turn.setupStepIndex < playerCount
              ? 'SETUP_SETTLEMENT_1'
              : 'SETUP_SETTLEMENT_2';
          refreshTurnDeadline(state);

          const nextPlayer = state.players.find((p) => p.id === nextPlayerId);
          addLog(
            state,
            `${actor.name} botó su barco inicial. Turno de colocación para ${nextPlayer?.name}.`,
            'BUILD',
            actor.id
          );
        } else {
          // Snake Draft finished! Start Turn 1 with first player in strict WAITING_FOR_DICE phase
          const firstPlayer = state.players[0];
          state.turn.turnNumber = 1;
          state.turn.activePlayerId = firstPlayer.id;
          state.turn.diceRoll = null;
          state.turn.hasRolledDice = false;
          state.turn.tradesAndBurnsThisTurn = 0;
          state.turn.botStatusMessage = null;
          state.turn.botProposedTradeThisTurn = false;
          state.phase = 'WAITING_FOR_DICE';
          refreshTurnDeadline(state);

          addLog(
            state,
            `Fase inicial completada. Comienza el Turno #1 de ${firstPlayer.name}. Debe lanzar los dados.`,
            'SYSTEM',
            firstPlayer.id
          );
        }
      } else if (state.phase === 'MAIN_PHASE') {
        deductResources(actor.resources, state.bank, BUILDING_COSTS.SHIP);
        state.turn.infrastructureBuiltThisTurn += 1;
        state.turn.hasSpentOrBuiltThisTurn = true;
        state.lastEvent = {
          nonce: nextNonce,
          type: 'BUILDING_PLACED',
          builtItem: {
            type: 'SHIP',
            edgeId: edge.id,
            playerId: actor.id,
          },
        };
        addLog(state, `${actor.name} botó un nuevo Barco.`, 'BUILD', actor.id);
      }

      recalculateVictoryPoints(state);
      return { state };
    }

    case 'MOVE_SHIP': {
      if (state.phase !== 'MAIN_PHASE' || state.turn.activePlayerId !== playerId) {
        return { state: prevState, error: 'Solo puedes mover un barco en tu fase principal.' };
      }
      if (actor.hasMovedShipThisTurn) {
        return { state: prevState, error: 'Solo puedes mover un barco por turno.' };
      }
      const movableEdges = getMovableShipEdges(state, playerId);
      if (!movableEdges.includes(action.fromEdgeId)) {
        return { state: prevState, error: 'Ese barco no está en el extremo de una ruta abierta o está bloqueado.' };
      }
      const validDestinations = getValidShipMoveDestinations(state, playerId, action.fromEdgeId);
      if (!validDestinations.includes(action.toEdgeId)) {
        return { state: prevState, error: 'Destino no válido para reubicar el barco.' };
      }

      const fromEdge = state.board.edges[action.fromEdgeId];
      const toEdge = state.board.edges[action.toEdgeId];

      fromEdge.building = null;
      fromEdge.playerId = null;

      toEdge.building = 'SHIP';
      toEdge.playerId = playerId;

      actor.hasMovedShipThisTurn = true;
      state.longestRoadPlayerId = updateLongestRoadAward(
        state.board,
        state.players,
        state.longestRoadPlayerId
      );
      recalculateVictoryPoints(state);

      state.lastEvent = {
        nonce: nextNonce,
        type: 'BUILDING_PLACED',
        builtItem: {
          type: 'SHIP',
          edgeId: toEdge.id,
          playerId: actor.id,
        },
      };
      addLog(state, `${actor.name} zarpó y reubicó un Barco en su ruta.`, 'BUILD', actor.id);
      return { state };
    }

    case 'UPGRADE_CITY': {
      const validCities = getValidCityVertices(state, playerId);
      if (!validCities.includes(action.vertexId)) {
        return { state: prevState, error: 'No puedes mejorar ese poblado a ciudad.' };
      }

      const vertex = state.board.vertices[action.vertexId];
      vertex.building = 'CITY';
      actor.settlementsLeft += 1; // Settlement piece returns to player's supply
      actor.citiesLeft -= 1;

      deductResources(actor.resources, state.bank, BUILDING_COSTS.CITY);
      state.turn.infrastructureBuiltThisTurn += 1;
      state.turn.hasSpentOrBuiltThisTurn = true;
      state.lastEvent = {
        nonce: nextNonce,
        type: 'BUILDING_PLACED',
        builtItem: {
          type: 'CITY',
          vertexId: vertex.id,
          playerId: actor.id,
        },
      };

      addLog(state, `${actor.name} mejoró un Poblado a Ciudad (+2 PV).`, 'BUILD', actor.id);
      recalculateVictoryPoints(state);
      return { state };
    }

    case 'ROLL_DICE': {
      if (state.phase !== 'WAITING_FOR_DICE' || state.turn.activePlayerId !== playerId) {
        return { state: prevState, error: 'No puedes lanzar los dados en este momento.' };
      }

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;

      state.turn.diceRoll = [d1, d2];
      state.turn.hasRolledDice = true;

      if (sum === 7) {
        addLog(
          state,
          `${actor.name} obtuvo un 7 (${d1} + ${d2}). Se activa el Ladrón.`,
          'ROBBER',
          actor.id
        );

        // Check players with > 7 resource cards
        const playersOver7 = state.players.filter(
          (p) => p.status !== 'ABANDONED' && countTotalResources(p.resources) > 7
        );

        if (playersOver7.length === 0) {
          state.phase = 'ROBBER_MOVE';
          state.lastEvent = {
            nonce: nextNonce,
            type: 'DICE_ROLLED',
            dice: [d1, d2],
            producingHexIds: [],
          };
          refreshTurnDeadline(state);
          return { state };
        }

        // House Rule 4: robberDiscardMode = 'RANDOM' vs 'MANUAL'
        if (state.config.robberDiscardMode === 'RANDOM') {
          const discardEvents: DiscardAnimationEvent[] = [];

          for (const p of playersOver7) {
            const total = countTotalResources(p.resources);
            const toDiscard = Math.floor(total / 2);
            const discarded = performRandomDiscardForPlayer(p, state.bank, toDiscard);
            discardEvents.push({
              id: `DISC_${Date.now()}_${p.id}`,
              playerId: p.id,
              playerName: p.name,
              discarded,
              mode: 'RANDOM',
            });
            addLog(
              state,
              `Descarte aleatorio automático: ${p.name} perdió ${toDiscard} cartas por tener ${total} en mano.`,
              'ROBBER',
              p.id
            );
          }

          state.phase = 'ROBBER_MOVE';
          state.lastEvent = {
            nonce: nextNonce,
            type: 'ROBBER_DISCARDED',
            dice: [d1, d2],
            discards: discardEvents,
          };
          refreshTurnDeadline(state);
          return { state };
        } else {
          // MANUAL mode: players with >7 cards must choose which cards to discard
          const discardEvents: DiscardAnimationEvent[] = [];
          for (const p of playersOver7) {
            const total = countTotalResources(p.resources);
            const toDiscard = Math.floor(total / 2);
            if (p.isBot || p.status === 'FROZEN_SKIP') {
              const discarded = performRandomDiscardForPlayer(p, state.bank, toDiscard);
              p.mustDiscardCount = 0;
              discardEvents.push({
                id: `DISC_${Date.now()}_${p.id}`,
                playerId: p.id,
                playerName: p.name,
                discarded,
                mode: 'RANDOM',
              });
              addLog(
                state,
                `${p.name} descartó ${toDiscard} cartas.`,
                'ROBBER',
                p.id
              );
            } else {
              p.mustDiscardCount = toDiscard;
            }
          }

          const stillMustDiscard = state.players.some((p) => p.mustDiscardCount > 0);
          state.phase = stillMustDiscard ? 'ROBBER_DISCARD' : 'ROBBER_MOVE';
          state.lastEvent = {
            nonce: nextNonce,
            type: 'DICE_ROLLED',
            dice: [d1, d2],
            discards: discardEvents.length > 0 ? discardEvents : undefined,
          };
          refreshTurnDeadline(state);
          return { state };
        }
      } else {
        // Produce resources on hexes matching `sum` that do not have the Robber
        const producingHexes = Object.values(state.board.hexes).filter(
          (h) => h.terrain !== 'SEA' && h.terrain !== 'DESERT' && h.numberToken === sum && !h.hasRobber
        );

        const flights: ResourceFlightEvent[] = [];
        const summaryPerPlayer = new Map<string, string[]>();

        for (const hex of producingHexes) {
          if (hex.terrain === 'GOLD') {
            for (const v of Object.values(state.board.vertices)) {
              if (v.building && v.playerId && v.hexIds.includes(hex.id)) {
                const owner = state.players.find((p) => p.id === v.playerId);
                if (!owner || owner.status === 'ABANDONED') continue;
                const wantedAmount = v.building === 'CITY' ? 2 : 1;

                if (owner.isBot) {
                  for (let i = 0; i < wantedAmount; i++) {
                    const chosenRes: ResourceType =
                      (['ORE', 'WHEAT', 'SHEEP', 'WOOD', 'BRICK'] as ResourceType[]).find(
                        (r) => state.bank[r] > 0
                      ) || 'WOOD';
                    if (state.bank[chosenRes] > 0) {
                      state.bank[chosenRes]--;
                      owner.resources[chosenRes]++;
                      flights.push({
                        id: `FLIGHT_${nextNonce}_${hex.id}_${v.id}_gold_${i}`,
                        hexId: hex.id,
                        playerId: owner.id,
                        resource: chosenRes,
                        amount: 1,
                      });
                      const list = summaryPerPlayer.get(owner.name) || [];
                      list.push(`+1 ${RESOURCE_META[chosenRes].name} (Oro)`);
                      summaryPerPlayer.set(owner.name, list);
                    }
                  }
                } else {
                  if (!state.turn.pendingGoldClaims) {
                    state.turn.pendingGoldClaims = [];
                  }
                  const existingClaim = state.turn.pendingGoldClaims.find((c) => c.playerId === owner.id);
                  if (existingClaim) {
                    existingClaim.amount += wantedAmount;
                  } else {
                    state.turn.pendingGoldClaims.push({
                      playerId: owner.id,
                      amount: wantedAmount,
                    });
                  }
                  const list = summaryPerPlayer.get(owner.name) || [];
                  list.push(`+${wantedAmount} Oro a elegir`);
                  summaryPerPlayer.set(owner.name, list);
                }
              }
            }
            continue;
          }

          const res = hex.terrain as ResourceType;
          // Find all vertices touching this hex that have a building
          for (const v of Object.values(state.board.vertices)) {
            if (v.building && v.playerId && v.hexIds.includes(hex.id)) {
              const owner = state.players.find((p) => p.id === v.playerId);
              if (!owner || owner.status === 'ABANDONED') continue;
              const wantedAmount = v.building === 'CITY' ? 2 : 1;
              const actualAmount = Math.min(wantedAmount, state.bank[res]);
              if (actualAmount > 0) {
                state.bank[res] -= actualAmount;
                owner.resources[res] += actualAmount;
                flights.push({
                  id: `FLIGHT_${nextNonce}_${hex.id}_${v.id}`,
                  hexId: hex.id,
                  playerId: owner.id,
                  resource: res,
                  amount: actualAmount,
                });
                const list = summaryPerPlayer.get(owner.name) || [];
                list.push(`+${actualAmount} ${RESOURCE_META[res].name}`);
                summaryPerPlayer.set(owner.name, list);
              }
            }
          }
        }

        const prodDetails = Array.from(summaryPerPlayer.entries())
          .map(([name, items]) => `${name} (${items.join(', ')})`)
          .join(', ');

        addLog(
          state,
          `${actor.name} obtuvo ${sum} (${d1} + ${d2}). ${
            prodDetails ? `Producción: ${prodDetails}.` : 'Ningún terreno produjo recursos.'
          }`,
          'DICE',
          actor.id
        );

        state.phase = 'MAIN_PHASE';
        state.lastEvent = {
          nonce: nextNonce,
          type: 'RESOURCES_PRODUCED',
          dice: [d1, d2],
          producingHexIds: producingHexes.map((h) => h.id),
          flights,
        };
        refreshTurnDeadline(state);
        return { state };
      }
    }

    case 'DISCARD_RESOURCES': {
      if (state.phase !== 'ROBBER_DISCARD') {
        return { state: prevState, error: 'No estamos en fase de descarte.' };
      }
      if (actor.mustDiscardCount <= 0) {
        return { state: prevState, error: 'No tienes descartes pendientes.' };
      }

      const totalSelected = countTotalResources(action.resources);
      if (totalSelected !== actor.mustDiscardCount) {
        return {
          state: prevState,
          error: `Debes descartar exactamente ${actor.mustDiscardCount} cartas.`,
        };
      }
      if (!hasResources(actor.resources, action.resources)) {
        return { state: prevState, error: 'No posees esas cartas para descartar.' };
      }

      deductResources(actor.resources, state.bank, action.resources);
      actor.mustDiscardCount = 0;

      const discEvent: DiscardAnimationEvent = {
        id: `DISC_${Date.now()}_${actor.id}`,
        playerId: actor.id,
        playerName: actor.name,
        discarded: action.resources,
        mode: 'MANUAL',
      };

      addLog(
        state,
        `${actor.name} descartó ${totalSelected} cartas.`,
        'ROBBER',
        actor.id
      );

      const anyoneLeft = state.players.some((p) => p.mustDiscardCount > 0);
      if (!anyoneLeft) {
        state.phase = 'ROBBER_MOVE';
        refreshTurnDeadline(state);
      }

      state.lastEvent = {
        nonce: nextNonce,
        type: 'ROBBER_DISCARDED',
        discards: [discEvent],
      };

      return { state };
    }

    case 'MOVE_ROBBER': {
      if (state.phase !== 'ROBBER_MOVE' || state.turn.activePlayerId !== playerId) {
        return { state: prevState, error: 'No puedes mover el Ladrón ahora.' };
      }
      const targetHex = state.board.hexes[action.hexId];
      if (!targetHex || targetHex.terrain === 'SEA') {
        return { state: prevState, error: 'El Ladrón solo puede colocarse en un terreno terrestre.' };
      }

      const keptSameHex = action.hexId === state.board.robberHexId;

      for (const h of Object.values(state.board.hexes)) {
        h.hasRobber = false;
      }
      targetHex.hasRobber = true;
      state.board.robberHexId = targetHex.id;

      // Find all opponent players with a building on a vertex touching targetHex
      const affectedPlayersSet = new Set<string>();
      const candidateSet = new Set<string>();
      for (const v of Object.values(state.board.vertices)) {
        if (
          v.building &&
          v.playerId &&
          v.playerId !== playerId &&
          v.hexIds.includes(targetHex.id)
        ) {
          affectedPlayersSet.add(v.playerId);
          const victim = state.players.find((p) => p.id === v.playerId);
          if (victim && countTotalResources(victim.resources) > 0) {
            candidateSet.add(victim.id);
          }
        }
      }

      const robberAffectedPlayerIds = Array.from(affectedPlayersSet);
      const candidates = Array.from(candidateSet);
      const hexLabel =
        targetHex.terrain === 'DESERT'
          ? 'el Desierto'
          : `${RESOURCE_META[targetHex.terrain as ResourceType].terrainName} (${targetHex.numberToken})`;

      if (candidates.length === 0) {
        state.robberStealCandidates = [];
        state.phase = 'MAIN_PHASE';
        state.lastEvent = {
          nonce: nextNonce,
          type: 'ROBBER_MOVED',
          robberTargetHexId: targetHex.id,
          robberAffectedPlayerIds,
          robberMovedByPlayerId: actor.id,
        };
        addLog(
          state,
          `${actor.name} ${keptSameHex ? 'mantuvo el Ladrón en' : 'movió el Ladrón a'} ${hexLabel} (sin víctimas con cartas para robar).`,
          'ROBBER',
          actor.id
        );
        refreshTurnDeadline(state);
        return { state };
      } else if (candidates.length === 1) {
        // Automatically steal 1 random card from the single candidate
        const victim = state.players.find((p) => p.id === candidates[0])!;
        const stolenRes = stealRandomCard(victim, actor);
        state.robberStealCandidates = [];
        state.phase = 'MAIN_PHASE';
        state.lastEvent = {
          nonce: nextNonce,
          type: 'CARD_STOLEN',
          robberTargetHexId: targetHex.id,
          robberAffectedPlayerIds,
          robberMovedByPlayerId: actor.id,
          steal: stolenRes
            ? {
                id: `STEAL_${nextNonce}`,
                thiefId: actor.id,
                victimId: victim.id,
                resource: stolenRes,
                hexId: targetHex.id,
              }
            : undefined,
        };
        addLog(
          state,
          `${actor.name} ${keptSameHex ? 'mantuvo el Ladrón en' : 'movió el Ladrón a'} ${hexLabel} y robó 1 carta aleatoria a ${victim.name}.`,
          'ROBBER',
          actor.id
        );
        refreshTurnDeadline(state);
        return { state };
      } else {
        state.robberStealCandidates = candidates;
        state.phase = 'ROBBER_STEAL';
        state.lastEvent = {
          nonce: nextNonce,
          type: 'ROBBER_MOVED',
          robberTargetHexId: targetHex.id,
          robberAffectedPlayerIds,
          robberMovedByPlayerId: actor.id,
        };
        addLog(
          state,
          `${actor.name} ${keptSameHex ? 'mantuvo el Ladrón en' : 'movió el Ladrón a'} ${hexLabel}. Debe elegir a qué jugador adyacente robarle 1 carta.`,
          'ROBBER',
          actor.id
        );
        refreshTurnDeadline(state);
        return { state };
      }
    }

    case 'STEAL_RESOURCE': {
      if (state.phase !== 'ROBBER_STEAL' || state.turn.activePlayerId !== playerId) {
        return { state: prevState, error: 'No estás en fase de robo.' };
      }
      if (!state.robberStealCandidates.includes(action.victimPlayerId)) {
        return { state: prevState, error: 'Ese jugador no es una víctima válida en este hexágono.' };
      }

      const victim = state.players.find((p) => p.id === action.victimPlayerId);
      if (!victim) {
        return { state: prevState, error: 'Víctima no encontrada.' };
      }

      const stolenRes = stealRandomCard(victim, actor);
      state.robberStealCandidates = [];
      state.phase = 'MAIN_PHASE';
      state.lastEvent = {
        nonce: nextNonce,
        type: 'CARD_STOLEN',
        steal: stolenRes
          ? {
              id: `STEAL_${nextNonce}`,
              thiefId: actor.id,
              victimId: victim.id,
              resource: stolenRes,
              hexId: state.board.robberHexId,
            }
          : undefined,
      };

      addLog(
        state,
        `${actor.name} robó 1 carta de recurso a ${victim.name}.`,
        'ROBBER',
        actor.id
      );
      refreshTurnDeadline(state);
      return { state };
    }

    case 'MOVE_PIRATE': {
      if (state.phase !== 'ROBBER_MOVE' || state.turn.activePlayerId !== playerId) {
        return { state: prevState, error: 'No puedes mover el Barco Pirata en este momento.' };
      }
      const targetHex = state.board.hexes[action.hexId];
      if (!targetHex || targetHex.terrain !== 'SEA') {
        return { state: prevState, error: 'El Barco Pirata solo puede colocarse en un hexágono de mar.' };
      }

      const keptSameHex = action.hexId === state.board.pirateHexId;
      state.board.pirateHexId = targetHex.id;

      // Find all opponent players with a ship bordering targetHex
      const candidateSet = new Set<string>();
      for (const edge of Object.values(state.board.edges)) {
        if (
          edge.building === 'SHIP' &&
          edge.playerId &&
          edge.playerId !== playerId &&
          edge.hexIds.includes(targetHex.id)
        ) {
          const victim = state.players.find((p) => p.id === edge.playerId);
          if (victim && countTotalResources(victim.resources) > 0) {
            candidateSet.add(victim.id);
          }
        }
      }

      const candidates = Array.from(candidateSet);

      if (candidates.length === 0) {
        state.robberStealCandidates = [];
        state.phase = 'MAIN_PHASE';
        state.lastEvent = {
          nonce: nextNonce,
          type: 'ROBBER_MOVED',
          robberTargetHexId: targetHex.id,
          robberAffectedPlayerIds: [],
          robberMovedByPlayerId: actor.id,
        };
        addLog(
          state,
          `${actor.name} ${keptSameHex ? 'mantuvo el Barco Pirata en' : 'movió el Barco Pirata al'} Mar (sin barcos rivales con cartas para saquear).`,
          'ROBBER',
          actor.id
        );
        refreshTurnDeadline(state);
        return { state };
      } else if (candidates.length === 1) {
        const victim = state.players.find((p) => p.id === candidates[0])!;
        const stolenRes = stealRandomCard(victim, actor);
        state.robberStealCandidates = [];
        state.phase = 'MAIN_PHASE';
        state.lastEvent = {
          nonce: nextNonce,
          type: 'CARD_STOLEN',
          robberTargetHexId: targetHex.id,
          robberAffectedPlayerIds: [victim.id],
          robberMovedByPlayerId: actor.id,
          steal: stolenRes
            ? {
                id: `STEAL_${nextNonce}`,
                thiefId: actor.id,
                victimId: victim.id,
                resource: stolenRes,
                hexId: targetHex.id,
              }
            : undefined,
        };
        addLog(
          state,
          `${actor.name} abordó a ${victim.name} con el Barco Pirata y saqueó 1 ${
            stolenRes ? RESOURCE_META[stolenRes].name : 'carta'
          }.`,
          'ROBBER',
          actor.id
        );
        refreshTurnDeadline(state);
        return { state };
      } else {
        state.robberStealCandidates = candidates;
        state.phase = 'ROBBER_STEAL';
        state.lastEvent = {
          nonce: nextNonce,
          type: 'ROBBER_MOVED',
          robberTargetHexId: targetHex.id,
          robberAffectedPlayerIds: candidates,
          robberMovedByPlayerId: actor.id,
        };
        addLog(
          state,
          `${actor.name} movió el Barco Pirata al Mar. Debe elegir a qué flota rival saquearle 1 carta.`,
          'ROBBER',
          actor.id
        );
        refreshTurnDeadline(state);
        return { state };
      }
    }

    case 'SET_ROBBER_OR_PIRATE_MODE': {
      if (state.phase !== 'ROBBER_MOVE' || state.turn.activePlayerId !== playerId) {
        return { state: prevState, error: 'Acción no válida en esta fase.' };
      }
      state.turn.robberOrPirateMode = action.mode;
      return { state };
    }

    case 'CLAIM_GOLD_RESOURCE': {
      if (!state.turn.pendingGoldClaims || state.turn.pendingGoldClaims.length === 0) {
        return { state: prevState, error: 'No hay recursos de Río de Oro pendientes de reclamar.' };
      }
      const claimIdx = state.turn.pendingGoldClaims.findIndex((c) => c.playerId === playerId);
      if (claimIdx === -1 || state.turn.pendingGoldClaims[claimIdx].amount <= 0) {
        return { state: prevState, error: 'No tienes cosechas de Río de Oro pendientes.' };
      }
      if (state.bank[action.resource] <= 0) {
        return { state: prevState, error: `No quedan cartas de ${RESOURCE_META[action.resource].name} en la banca.` };
      }

      state.bank[action.resource]--;
      actor.resources[action.resource]++;
      state.turn.pendingGoldClaims[claimIdx].amount--;
      if (state.turn.pendingGoldClaims[claimIdx].amount <= 0) {
        state.turn.pendingGoldClaims.splice(claimIdx, 1);
      }

      addLog(
        state,
        `${actor.name} extrajo 1 ${RESOURCE_META[action.resource].name} del Río de Oro.`,
        'TRADE',
        actor.id
      );
      return { state };
    }

    case 'BUY_DEV_CARD': {
      const check = canBuyDevCard(state, playerId);
      if (!check.allowed) {
        return { state: prevState, error: check.reason };
      }

      deductResources(actor.resources, state.bank, BUILDING_COSTS.DEV_CARD);
      const card = state.devDeck.pop()!;
      card.boughtAtTurn = state.turn.turnNumber;
      actor.devCards.push(card);

      state.turn.hasSpentOrBuiltThisTurn = true;
      state.lastEvent = {
        nonce: nextNonce,
        type: 'DEV_CARD_BOUGHT',
        buyerPlayerId: actor.id,
        buyerPlayerName: actor.name,
      };

      addLog(
        state,
        `${actor.name} compró una Carta de Desarrollo.`,
        'DEV',
        actor.id
      );

      recalculateVictoryPoints(state);
      return { state };
    }

    case 'PLAY_DEV_CARD': {
      if (state.turn.activePlayerId !== playerId) {
        return { state: prevState, error: 'No es tu turno.' };
      }
      if (state.phase === 'WAITING_FOR_DICE' || !state.turn.hasRolledDice) {
        return {
          state: prevState,
          error: 'Debes lanzar los dados obligatoriamente antes de jugar Cartas de Desarrollo.',
        };
      }
      if (state.phase !== 'MAIN_PHASE') {
        return { state: prevState, error: 'Solo puedes jugar Cartas de Desarrollo en la fase principal.' };
      }
      if (state.config.maxOneDevCardPerTurn && state.turn.devCardPlayedThisTurn) {
        return {
          state: prevState,
          error: 'Solo puedes jugar un máximo de 1 Carta de Desarrollo por turno.',
        };
      }

      const card = actor.devCards.find((c) => c.id === action.cardId);
      if (!card || card.played) {
        return { state: prevState, error: 'Carta de desarrollo no disponible.' };
      }
      if (card.type === 'VICTORY_POINT') {
        return {
          state: prevState,
          error: 'Las cartas de Punto de Victoria se suman automáticamente para ganar.',
        };
      }
      if (!state.config.allowInstantDevCards && card.boughtAtTurn === state.turn.turnNumber) {
        return {
          state: prevState,
          error: 'No puedes jugar una Carta de Desarrollo comprada en este mismo turno (Uso Inmediato desactivado).',
        };
      }

      card.played = true;
      state.turn.devCardPlayedThisTurn = true;
      state.lastEvent = {
        nonce: nextNonce,
        type: 'DEV_CARD_PLAYED',
        devCardType: card.type,
        devCardPlayerId: actor.id,
        devCardPlayerName: actor.name,
        devCardTitle: card.title,
      };

      if (card.type === 'KNIGHT') {
        actor.knightsPlayed += 1;
        addLog(
          state,
          `${actor.name} jugó un Caballero (Total: ${actor.knightsPlayed}). Debe mover o mantener el Ladrón.`,
          'DEV',
          actor.id
        );
        updateLargestArmyAward(state);
        recalculateVictoryPoints(state);
        if ((state.phase as GamePhase) !== 'GAME_OVER') {
          state.phase = 'ROBBER_MOVE';
          refreshTurnDeadline(state);
        }
        return { state };
      }

      if (card.type === 'ROAD_BUILDING') {
        const maxPossible = Math.min(2, actor.roadsLeft);
        state.turn.freeRoadsRemaining = maxPossible;
        const validRoads = getValidRoadEdges(
          { ...state, phase: 'ROAD_BUILDING_DEV' },
          playerId
        );
        if (maxPossible > 0 && validRoads.length > 0) {
          state.phase = 'ROAD_BUILDING_DEV';
          addLog(
            state,
            `${actor.name} jugó Construcción de Carreteras: puede colocar hasta 2 carreteras gratis.`,
            'DEV',
            actor.id
          );
        } else {
          state.turn.freeRoadsRemaining = 0;
          addLog(
            state,
            `${actor.name} jugó Construcción de Carreteras, pero no tiene espacios o piezas disponibles.`,
            'DEV',
            actor.id
          );
        }
        return { state };
      }

      if (card.type === 'YEAR_OF_PLENTY') {
        if (!action.yearOfPlentyResources || action.yearOfPlentyResources.length !== 2) {
          return { state: prevState, error: 'Debes elegir 2 recursos de la banca para Año de la Abundancia.' };
        }
        const [r1, r2] = action.yearOfPlentyResources;
        if (r1 === r2 && state.bank[r1] < 2) {
          return { state: prevState, error: 'La banca no tiene 2 cartas de ese recurso.' };
        }
        if (state.bank[r1] < 1 || state.bank[r2] < 1) {
          return { state: prevState, error: 'La banca no tiene reservas suficientes de esos recursos.' };
        }
        state.bank[r1] -= 1;
        actor.resources[r1] += 1;
        state.bank[r2] -= 1;
        actor.resources[r2] += 1;
        state.lastEvent.yearOfPlentyResources = [r1, r2];

        addLog(
          state,
          `${actor.name} jugó Año de la Abundancia y tomó ${RESOURCE_META[r1].name} y ${RESOURCE_META[r2].name} de la banca.`,
          'DEV',
          actor.id
        );
        return { state };
      }

      if (card.type === 'MONOPOLY') {
        const targetRes = action.monopolyResource;
        if (!targetRes || !ALL_RESOURCES.includes(targetRes)) {
          return { state: prevState, error: 'Debes elegir un recurso para el Monopolio.' };
        }
        let totalClaimed = 0;
        for (const p of state.players) {
          if (p.id !== actor.id && p.resources[targetRes] > 0) {
            const count = p.resources[targetRes];
            p.resources[targetRes] = 0;
            actor.resources[targetRes] += count;
            totalClaimed += count;
          }
        }
        state.lastEvent.monopolyResource = targetRes;
        state.lastEvent.monopolyTotalClaimed = totalClaimed;
        addLog(
          state,
          `${actor.name} jugó Monopolio de ${RESOURCE_META[targetRes].name} y confiscó ${totalClaimed} cartas en total.`,
          'DEV',
          actor.id
        );
        return { state };
      }

      return { state };
    }

    case 'BANK_TRADE': {
      const check = canTradeThisTurn(state, playerId);
      if (!check.allowed) {
        return { state: prevState, error: check.reason };
      }
      const { giveResource, giveAmount, receiveResource, receiveAmount } = action;
      if (giveResource === receiveResource) {
        return { state: prevState, error: 'El recurso entregado y recibido deben ser distintos.' };
      }
      const ratios = getPlayerBankTradeRatios(state, playerId);
      const ratio = ratios[giveResource];

      if (receiveAmount < 1 || giveAmount !== ratio * receiveAmount) {
        return {
          state: prevState,
          error: `La tasa de cambio para ${RESOURCE_META[giveResource].name} es ${ratio}:1.`,
        };
      }
      if (actor.resources[giveResource] < giveAmount) {
        return { state: prevState, error: 'No tienes suficientes cartas para este intercambio.' };
      }
      if (state.bank[receiveResource] < receiveAmount) {
        return { state: prevState, error: 'La banca no dispone de suficientes cartas de ese recurso.' };
      }

      actor.resources[giveResource] -= giveAmount;
      state.bank[giveResource] += giveAmount;
      state.bank[receiveResource] -= receiveAmount;
      actor.resources[receiveResource] += receiveAmount;

      state.turn.hasTradedThisTurn = true;
      state.turn.tradesAndBurnsThisTurn = (state.turn.tradesAndBurnsThisTurn || 0) + 1;
      const bankNoticeMsg =
        ratio === 4
          ? `${actor.name} quemó ${giveAmount} de ${RESOURCE_META[giveResource].name} (4:1) por ${receiveAmount} de ${RESOURCE_META[receiveResource].name}`
          : `${actor.name} comerció en puerto (${ratio}:1): ${giveAmount} de ${RESOURCE_META[giveResource].name} por ${receiveAmount} de ${RESOURCE_META[receiveResource].name}`;
      state.lastEvent = {
        nonce: nextNonce,
        type: 'TRADE_COMPLETED',
        bankTradeNotice: {
          playerName: actor.name,
          giveResource,
          giveAmount,
          receiveResource,
          receiveAmount,
          ratio,
          message: bankNoticeMsg,
        },
      };

      addLog(
        state,
        `${actor.name} comerció con la Banca/Puerto (${ratio}:1): entregó ${giveAmount} de ${RESOURCE_META[giveResource].name} por ${receiveAmount} de ${RESOURCE_META[receiveResource].name}.`,
        'TRADE',
        actor.id
      );
      return { state };
    }

    case 'CREATE_TRADE_OFFER': {
      // Either the active player creates an offer, OR another player creates a counter-offer directed at the active player!
      const isCounterOffer = Boolean(action.parentOfferId);
      if (!isCounterOffer) {
        const check = canTradeThisTurn(state, playerId);
        if (!check.allowed) {
          return { state: prevState, error: check.reason };
        }
      } else {
        // Counter-offer: verify active player can still trade this turn
        const check = canTradeThisTurn(state, state.turn.activePlayerId);
        if (!check.allowed) {
          return { state: prevState, error: check.reason };
        }
      }

      const offerTotal = countTotalResources(action.offer);
      const requestTotal = countTotalResources(action.request);
      if (offerTotal <= 0 || requestTotal <= 0) {
        return {
          state: prevState,
          error: 'La oferta debe incluir al menos 1 recurso ofrecido y 1 recurso solicitado.',
        };
      }
      if (!hasResources(actor.resources, action.offer)) {
        return { state: prevState, error: 'No tienes en tu mano los recursos que estás ofreciendo.' };
      }

      const responses: TradeOffer['responses'] = {};
      for (const p of state.players) {
        if (p.id === actor.id) continue;
        if (!action.targetPlayerId || action.targetPlayerId === p.id) {
          responses[p.id] = 'PENDING';
        }
      }

      if (action.parentOfferId) {
        const parent = state.activeTradeOffers.find((o) => o.id === action.parentOfferId);
        if (parent) {
          parent.responses[actor.id] = 'COUNTERED';
        }
      }

      const newOffer: TradeOffer = {
        id: `TRADE_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fromPlayerId: actor.id,
        targetPlayerId: isCounterOffer ? state.turn.activePlayerId : action.targetPlayerId,
        offer: { ...action.offer },
        request: { ...action.request },
        responses,
        parentOfferId: action.parentOfferId,
        createdAt: Date.now(),
      };

      state.activeTradeOffers.push(newOffer);

      // Bots evaluate trade offers automatically via BotEngine heuristics!
      for (const bot of state.players.filter((p) => p.isBot)) {
        if (newOffer.responses[bot.id] === 'PENDING') {
          if (actor.isBot) {
            // When a BOT proposes a trade, other bots do not accept immediately.
            // They wait 3.5 seconds in BotEngine so human players have ample time to see and accept the deal!
            const botDecision = evaluateBotTradeOffer(state, bot.id, newOffer);
            if (botDecision === 'REJECT') {
              newOffer.responses[bot.id] = 'REJECTED';
            }
            // If botDecision === 'ACCEPT', keep status 'PENDING' until offerAgeMs >= 3500
          } else {
            newOffer.responses[bot.id] =
              evaluateBotTradeOffer(state, bot.id, newOffer) === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
          }
        }
      }

      addLog(
        state,
        `${actor.name} propuso una ${isCounterOffer ? 'contraoferta' : 'oferta comercial'}.`,
        'TRADE',
        actor.id
      );
      return { state };
    }

    case 'RESPOND_TRADE_OFFER': {
      const offer = state.activeTradeOffers.find((o) => o.id === action.offerId);
      if (!offer) {
        return { state: prevState, error: 'La oferta comercial ya no está activa.' };
      }
      if (offer.fromPlayerId === playerId) {
        return { state: prevState, error: 'No puedes responder a tu propia oferta.' };
      }

      if (action.response === 'REJECT') {
        offer.responses[playerId] = 'REJECTED';

        // Check if all potential trading partners have rejected the offer
        const targetIds = offer.targetPlayerId
          ? [offer.targetPlayerId]
          : state.players
              .filter((p) => p.id !== offer.fromPlayerId && (p.connected || p.isBot))
              .map((p) => p.id);

        const allRejected =
          targetIds.length > 0 &&
          targetIds.every((id) => offer.responses[id] === 'REJECTED');

        if (allRejected) {
          // If everyone has rejected, automatically cancel the offer right at that moment!
          state.activeTradeOffers = state.activeTradeOffers.filter((o) => o.id !== offer.id);
          const creator = state.players.find((p) => p.id === offer.fromPlayerId);
          addLog(
            state,
            `La oferta comercial de ${creator?.name || 'un jugador'} ha sido rechazada por todos los jugadores y se cancela automáticamente.`,
            'SYSTEM'
          );
        }
        return { state };
      }

      // ACCEPT: verify responder has the requested resources and execute the trade immediately!
      if (!hasResources(actor.resources, offer.request)) {
        return { state: prevState, error: 'No tienes los recursos solicitados para aceptar esta oferta.' };
      }
      offer.responses[playerId] = 'ACCEPTED';
      return executeTradeBetweenPlayers(state, offer, actor.id, nextNonce);
    }

    case 'EXECUTE_TRADE_OFFER': {
      const offer = state.activeTradeOffers.find((o) => o.id === action.offerId);
      if (!offer) {
        return { state: prevState, error: 'La oferta ya no existe.' };
      }
      if (offer.fromPlayerId !== playerId) {
        return { state: prevState, error: 'Solo el creador de la oferta puede confirmarla.' };
      }
      if (offer.responses[action.partnerPlayerId] !== 'ACCEPTED') {
        return { state: prevState, error: 'Ese jugador aún no ha aceptado la oferta.' };
      }
      return executeTradeBetweenPlayers(state, offer, action.partnerPlayerId, nextNonce);
    }

    case 'CANCEL_TRADE_OFFER': {
      state.activeTradeOffers = state.activeTradeOffers.filter(
        (o) => !(o.id === action.offerId && o.fromPlayerId === playerId)
      );
      return { state };
    }

    case 'END_TURN': {
      if (state.phase !== 'MAIN_PHASE' || state.turn.activePlayerId !== playerId) {
        return { state: prevState, error: 'Solo puedes finalizar tu turno en la fase principal.' };
      }
      advanceToNextTurn(state);
      return { state };
    }

    case 'HANDLE_DISCONNECTED_PLAYER': {
      const target = state.players.find((p) => p.id === action.targetPlayerId);
      if (!target) {
        return { state: prevState, error: 'Jugador no encontrado.' };
      }

      if (action.resolution === 'WAIT_PAUSE') {
        if (state.phase !== 'PAUSED_DISCONNECT') {
          state.turn.phaseBeforePause = state.phase;
          state.turn.pausedForPlayerId = target.id;
          state.phase = 'PAUSED_DISCONNECT';
          state.turn.turnDeadlineMs = null;
        }
        target.status = 'DISCONNECTED_WAITING';
        addLog(
          state,
          `Partida en pausa esperando la reconexión de ${target.name}.`,
          'SYSTEM'
        );
      } else if (action.resolution === 'FREEZE_SKIP') {
        target.status = 'FROZEN_SKIP';
        if (state.phase === 'PAUSED_DISCONNECT') {
          state.phase = state.turn.phaseBeforePause || 'MAIN_PHASE';
          state.turn.phaseBeforePause = undefined;
          state.turn.pausedForPlayerId = null;
        }
        if (target.mustDiscardCount > 0) {
          performRandomDiscardForPlayer(target, state.bank, target.mustDiscardCount);
          target.mustDiscardCount = 0;
          if (state.phase === 'ROBBER_DISCARD' && !state.players.some((p) => p.mustDiscardCount > 0)) {
            state.phase = 'ROBBER_MOVE';
          }
        }
        if (state.turn.activePlayerId === target.id && state.phase !== 'LOBBY') {
          autoResolveCurrentTurn(state);
        }
        addLog(
          state,
          `Los turnos de ${target.name} han sido congelados para que la partida continúe.`,
          'SYSTEM'
        );
      } else if (action.resolution === 'CONVERT_TO_BOT') {
        target.isBot = true;
        target.status = 'ACTIVE';
        if (state.phase === 'PAUSED_DISCONNECT') {
          state.phase = state.turn.phaseBeforePause || 'MAIN_PHASE';
          state.turn.phaseBeforePause = undefined;
          state.turn.pausedForPlayerId = null;
        }
        addLog(
          state,
          `${target.name} ahora es controlado por la IA hasta que se reconecte.`,
          'SYSTEM'
        );
      }
      refreshTurnDeadline(state);
      return { state };
    }

    case 'RESUME_GAME': {
      if (state.phase === 'PAUSED_DISCONNECT') {
        state.phase = state.turn.phaseBeforePause || 'MAIN_PHASE';
        state.turn.phaseBeforePause = undefined;
        state.turn.pausedForPlayerId = null;
      }
      if (state.turn.isPausedByHost) {
        state.turn.isPausedByHost = false;
        state.turn.pausedRemainingTimerMs = null;
      }
      for (const p of state.players) {
        if (p.connected && !p.isBot) {
          p.status = 'ACTIVE';
        }
      }
      refreshTurnDeadline(state);
      addLog(state, `La partida se ha reanudado.`, 'SYSTEM');
      return { state };
    }

    case 'TOGGLE_HOST_PAUSE': {
      if (!actor.isHost) {
        return { state: prevState, error: 'Solo el anfitrión de la sala puede pausar o reanudar la partida.' };
      }
      if (state.phase === 'LOBBY' || state.phase === 'GAME_OVER') {
        return { state: prevState, error: 'No se puede pausar fuera de la partida activa.' };
      }

      if (state.turn.isPausedByHost || state.phase === 'PAUSED_DISCONNECT') {
        state.turn.isPausedByHost = false;
        if (state.phase === 'PAUSED_DISCONNECT') {
          state.phase = state.turn.phaseBeforePause || 'MAIN_PHASE';
          state.turn.phaseBeforePause = undefined;
          state.turn.pausedForPlayerId = null;
        }
        for (const p of state.players) {
          if (p.connected && !p.isBot) {
            p.status = 'ACTIVE';
          }
        }
        if (state.turn.pausedRemainingTimerMs) {
          state.turn.turnDeadlineMs = Date.now() + state.turn.pausedRemainingTimerMs;
        } else {
          refreshTurnDeadline(state);
        }
        state.turn.pausedRemainingTimerMs = null;
        addLog(state, `El anfitrión (${actor.name}) ha reanudado la partida.`, 'SYSTEM', actor.id);
        return { state };
      }

      state.turn.isPausedByHost = true;
      const remainingMs = state.turn.turnDeadlineMs
        ? Math.max(1000, state.turn.turnDeadlineMs - Date.now())
        : null;
      state.turn.pausedRemainingTimerMs = remainingMs;
      state.turn.turnDeadlineMs = null;
      addLog(state, `El anfitrión (${actor.name}) ha pausado la partida.`, 'SYSTEM', actor.id);
      return { state };
    }

    case 'ABANDON_GAME': {
      if (state.phase === 'LOBBY') {
        state.players = state.players.filter((p) => p.id !== playerId);
        if (state.players.length > 0 && !state.players.some((p) => p.isHost)) {
          state.players[0].isHost = true;
        }
        return { state };
      }

      actor.connected = false;
      actor.status = 'FROZEN_SKIP';
      if (actor.isHost) {
        const nextHuman = state.players.find((p) => p.id !== actor.id && !p.isBot && p.connected);
        if (nextHuman) {
          actor.isHost = false;
          nextHuman.isHost = true;
        }
      }

      if (actor.mustDiscardCount > 0) {
        performRandomDiscardForPlayer(actor, state.bank, actor.mustDiscardCount);
        actor.mustDiscardCount = 0;
        if (state.phase === 'ROBBER_DISCARD' && !state.players.some((p) => p.mustDiscardCount > 0)) {
          state.phase = 'ROBBER_MOVE';
        }
      }

      addLog(
        state,
        `${actor.name} abandonó la partida. Sus turnos se omitirán automáticamente.`,
        'SYSTEM',
        actor.id
      );

      if (state.turn.activePlayerId === actor.id) {
        autoResolveCurrentTurn(state);
      }

      return { state };
    }

    case 'FINISH_ROAD_BUILDING': {
      if (state.turn.activePlayerId !== playerId) {
        return { state: prevState, error: 'No es tu turno.' };
      }
      if (state.phase !== 'ROAD_BUILDING_DEV') {
        return { state: prevState, error: 'No estás en la fase de Construcción de Carreteras.' };
      }
      state.turn.freeRoadsRemaining = 0;
      state.phase = 'MAIN_PHASE';
      addLog(
        state,
        `${actor.name} finalizó la colocación gratuita de carreteras (Construcción de Carreteras).`,
        'BUILD',
        actor.id
      );
      return { state };
    }
  }

  return { state };
}

function executeTradeBetweenPlayers(
  state: GameState,
  offer: TradeOffer,
  partnerId: string,
  nextNonce: number
): { state: GameState; error?: string } {
  const proposer = state.players.find((p) => p.id === offer.fromPlayerId);
  const partner = state.players.find((p) => p.id === partnerId);

  if (!proposer || !partner) {
    return { state, error: 'Jugadores del intercambio no encontrados.' };
  }
  const check = canTradeThisTurn(state, state.turn.activePlayerId);
  if (!check.allowed) {
    return { state, error: check.reason };
  }
  if (!hasResources(proposer.resources, offer.offer)) {
    return { state, error: `${proposer.name} ya no tiene los recursos ofrecidos.` };
  }
  if (!hasResources(partner.resources, offer.request)) {
    return { state, error: `${partner.name} ya no tiene los recursos solicitados.` };
  }

  for (const r of ALL_RESOURCES) {
    const giveAmt = offer.offer[r] || 0;
    const reqAmt = offer.request[r] || 0;
    proposer.resources[r] = proposer.resources[r] - giveAmt + reqAmt;
    partner.resources[r] = partner.resources[r] + giveAmt - reqAmt;
  }

  state.turn.hasTradedThisTurn = true;
  state.turn.tradesAndBurnsThisTurn = (state.turn.tradesAndBurnsThisTurn || 0) + 1;
  state.activeTradeOffers = state.activeTradeOffers.filter((o) => o.id !== offer.id);
  const completedTradeSummary = {
    proposerId: proposer.id,
    proposerName: proposer.name,
    proposerAvatar: proposer.avatar,
    accepterId: partner.id,
    accepterName: partner.name,
    accepterAvatar: partner.avatar,
    offered: { ...offer.offer },
    requested: { ...offer.request },
  };
  state.lastCompletedTrade = {
    nonce: nextNonce,
    ...completedTradeSummary,
  };
  state.lastEvent = {
    nonce: nextNonce,
    type: 'TRADE_COMPLETED',
    completedTrade: completedTradeSummary,
  };

  addLog(
    state,
    `Comercio completado entre ${proposer.name} y ${partner.name}.`,
    'TRADE',
    proposer.id
  );
  return { state };
}

export function performRandomDiscardForPlayer(
  player: PlayerState,
  bank: Record<ResourceType, number>,
  count: number
): Partial<Record<ResourceType, number>> {
  const pool: ResourceType[] = [];
  for (const r of ALL_RESOURCES) {
    for (let i = 0; i < player.resources[r]; i++) {
      pool.push(r);
    }
  }

  const discarded: Partial<Record<ResourceType, number>> = {};
  const actualCount = Math.min(count, pool.length);

  for (let i = 0; i < actualCount; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [res] = pool.splice(idx, 1);
    player.resources[res] -= 1;
    bank[res] += 1;
    discarded[res] = (discarded[res] || 0) + 1;
  }

  return discarded;
}

function stealRandomCard(
  victim: PlayerState,
  thief: PlayerState
): ResourceType | null {
  const pool: ResourceType[] = [];
  for (const r of ALL_RESOURCES) {
    for (let i = 0; i < victim.resources[r]; i++) {
      pool.push(r);
    }
  }
  if (pool.length === 0) return null;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  victim.resources[chosen] -= 1;
  thief.resources[chosen] += 1;
  return chosen;
}

/**
 * Automatically resolves pending actions when the turn timer expires (House Rule 6)
 * or when a frozen/bot player needs their turn resolved.
 */
export function autoResolveCurrentTurn(state: GameState): GameState {
  if (
    state.turn.isPausedByHost ||
    state.phase === 'LOBBY' ||
    state.phase === 'GAME_OVER' ||
    state.phase === 'PAUSED_DISCONNECT'
  ) {
    return state;
  }

  const activeId = state.turn.activePlayerId;

  if (state.phase === 'ORDER_ROLL') {
    const hostPlayer = state.players.find((p) => p.isHost) || state.players[0];
    if (hostPlayer) {
      let nextState = applyGameAction(state, hostPlayer.id, {
        type: 'AUTO_ROLL_ALL_ORDER',
      }).state;
      nextState = applyGameAction(nextState, hostPlayer.id, {
        type: 'CONFIRM_TURN_ORDER',
      }).state;
      return nextState;
    }
    return state;
  }

  if (state.phase === 'SETUP_SETTLEMENT_1' || state.phase === 'SETUP_SETTLEMENT_2') {
    const validVertices = getValidSettlementVertices(state, activeId);
    if (validVertices.length > 0) {
      // Pick vertex using BotEngine heuristic
      const bestVertexId = pickBestSettlementVertex(state, validVertices, 'MEDIUM', activeId);
      const res = applyGameAction(state, activeId, {
        type: 'PLACE_SETTLEMENT',
        vertexId: bestVertexId,
      });
      state = res.state;
    }
    if ((state.phase as GamePhase) === 'SETUP_ROAD_1' || (state.phase as GamePhase) === 'SETUP_ROAD_2') {
      const validEdges = getValidRoadEdges(state, activeId);
      if (validEdges.length > 0) {
        const chosenEdge = validEdges[Math.floor(Math.random() * validEdges.length)];
        const res = applyGameAction(state, activeId, {
          type: 'PLACE_ROAD',
          edgeId: chosenEdge,
        });
        state = res.state;
      }
    }
    return state;
  }

  if (state.phase === 'SETUP_ROAD_1' || state.phase === 'SETUP_ROAD_2') {
    const validEdges = getValidRoadEdges(state, activeId);
    if (validEdges.length > 0) {
      const chosenEdge = validEdges[Math.floor(Math.random() * validEdges.length)];
      const res = applyGameAction(state, activeId, {
        type: 'PLACE_ROAD',
        edgeId: chosenEdge,
      });
      Object.assign(state, res.state);
    }
    return state;
  }

  if (state.phase === 'WAITING_FOR_DICE') {
    const res = applyGameAction(state, activeId, { type: 'ROLL_DICE' });
    Object.assign(state, res.state);
  }

  if (state.phase === 'ROBBER_DISCARD') {
    for (const p of state.players) {
      if (p.mustDiscardCount > 0) {
        performRandomDiscardForPlayer(p, state.bank, p.mustDiscardCount);
        p.mustDiscardCount = 0;
        addLog(
          state,
          `Tiempo agotado: se descartaron automáticamente las cartas pendientes de ${p.name}.`,
          'ROBBER',
          p.id
        );
      }
    }
    state.phase = 'ROBBER_MOVE';
  }

  if (state.phase === 'ROBBER_MOVE') {
    const candidateHexes = Object.values(state.board.hexes).filter(
      (h) => h.terrain !== 'SEA'
    );
    if (candidateHexes.length > 0) {
      const chosenHex = candidateHexes[Math.floor(Math.random() * candidateHexes.length)];
      const res = applyGameAction(state, activeId, {
        type: 'MOVE_ROBBER',
        hexId: chosenHex.id,
      });
      Object.assign(state, res.state);
    }
  }

  if (state.phase === 'ROBBER_STEAL') {
    if (state.robberStealCandidates.length > 0) {
      const victimId = state.robberStealCandidates[0];
      const res = applyGameAction(state, activeId, {
        type: 'STEAL_RESOURCE',
        victimPlayerId: victimId,
      });
      Object.assign(state, res.state);
    }
  }

  if (state.phase === 'ROAD_BUILDING_DEV') {
    state.turn.freeRoadsRemaining = 0;
    state.phase = 'MAIN_PHASE';
  }

  if (state.phase === 'MAIN_PHASE') {
    const res = applyGameAction(state, activeId, { type: 'END_TURN' });
    Object.assign(state, res.state);
  }

  return state;
}

/**
 * Smart AI Bot turn executor with difficulty settings (EASY, MEDIUM, HARD) powered by BotEngine.
 */
export function executeBotStepIfNeeded(state: GameState): GameState {
  if (
    state.turn.isPausedByHost ||
    state.phase === 'LOBBY' ||
    state.phase === 'GAME_OVER' ||
    state.phase === 'PAUSED_DISCONNECT'
  ) {
    return state;
  }

  if (state.phase === 'ORDER_ROLL') {
    const unrolledBot = state.players.find(
      (p) => p.isBot && !state.turn.orderRolls?.[p.id]
    );
    if (unrolledBot) {
      return executeBotStep(state, unrolledBot.id);
    }
    return state;
  }

  const activePlayer = state.players.find((p) => p.id === state.turn.activePlayerId);
  if (!activePlayer || !activePlayer.isBot) {
    return state;
  }

  return executeBotStep(state, activePlayer.id);
}
