import {
  ALL_RESOURCES,
  BUILDING_COSTS,
  countTotalResources,
  RESOURCE_META,
} from '../constants';
import {
  BotDifficulty,
  GameState,
  PlayerState,
  ResourceType,
  TradeOffer,
} from '../types';
import {
  applyGameAction,
  canBuyDevCard,
  canSpendOrBuildThisTurn,
  canTradeThisTurn,
  getPlayerBankTradeRatios,
  getValidCityVertices,
  getValidRoadEdges,
  getValidSettlementVertices,
  hasResources,
} from './RulesEngine';

export const PIP_WEIGHTS: Record<number, number> = {
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

/**
 * Executes a full or partial turn step for an AI bot depending on its difficulty setting:
 * - EASY: Almost random decisions, no port prioritization, basic trades.
 * - MEDIUM: Heuristic evaluation, prioritizes high-probability numbers (6, 8, 5, 9), standard robber.
 * - HARD: Strategic leader targeting, longest road pursuit, 2:1 port monopolies, tight trade evaluation.
 */
export function executeBotStep(state: GameState, botPlayerId: string): GameState {
  const bot = state.players.find((p) => p.id === botPlayerId);
  if (!bot || !bot.isBot) return state;

  const difficulty: BotDifficulty = bot.botDifficulty || state.config.defaultBotDifficulty || 'MEDIUM';

  // 1. ORDER ROLL PHASE
  if (state.phase === 'ORDER_ROLL') {
    if (!state.turn.orderRolls?.[bot.id]) {
      return applyGameAction(state, bot.id, { type: 'ROLL_FOR_ORDER' }).state;
    }
    return state;
  }

  // 2. SETUP PHASES (Snake Draft)
  if (state.phase === 'SETUP_SETTLEMENT_1' || state.phase === 'SETUP_SETTLEMENT_2') {
    const validVertices = getValidSettlementVertices(state, bot.id);
    if (validVertices.length === 0) return state;
    const chosenVertex = pickBestSettlementVertex(state, validVertices, difficulty, bot.id);
    return applyGameAction(state, bot.id, {
      type: 'PLACE_SETTLEMENT',
      vertexId: chosenVertex,
    }).state;
  }

  if (state.phase === 'SETUP_ROAD_1' || state.phase === 'SETUP_ROAD_2') {
    const validRoads = getValidRoadEdges(state, bot.id);
    if (validRoads.length === 0) return state;
    const chosenRoad = pickBestRoadEdge(state, validRoads, difficulty, bot.id);
    return applyGameAction(state, bot.id, {
      type: 'PLACE_ROAD',
      edgeId: chosenRoad,
    }).state;
  }

  // 3. MANDATORY DICE ROLL PHASE
  if (state.phase === 'WAITING_FOR_DICE') {
    return applyGameAction(state, bot.id, { type: 'ROLL_DICE' }).state;
  }

  // 4. ROBBER PHASES
  if (state.phase === 'ROBBER_MOVE') {
    const targetHexId = pickRobberTargetHex(state, bot.id, difficulty);
    return applyGameAction(state, bot.id, {
      type: 'MOVE_ROBBER',
      hexId: targetHexId,
    }).state;
  }

  if (state.phase === 'ROBBER_STEAL') {
    if (state.robberStealCandidates.length > 0) {
      const victimId = pickRobberStealVictim(state, state.robberStealCandidates, difficulty);
      return applyGameAction(state, bot.id, {
        type: 'STEAL_RESOURCE',
        victimPlayerId: victimId,
      }).state;
    }
    return state;
  }

  // 5. FREE ROAD BUILDING FROM DEV CARD
  if (state.phase === 'ROAD_BUILDING_DEV') {
    const validRoads = getValidRoadEdges(state, bot.id);
    if (validRoads.length > 0) {
      const chosenRoad = pickBestRoadEdge(state, validRoads, difficulty, bot.id);
      return applyGameAction(state, bot.id, {
        type: 'PLACE_ROAD',
        edgeId: chosenRoad,
      }).state;
    } else {
      state.turn.freeRoadsRemaining = 0;
      state.phase = 'MAIN_PHASE';
      return state;
    }
  }

  // 6. MAIN PHASE
  if (state.phase === 'MAIN_PHASE') {
    let currentState = state;
    const activeBot = currentState.players.find((p) => p.id === bot.id)!;

    // A. Play Dev Card if useful (Knight, Year of Plenty, Monopoly)
    if (!currentState.turn.devCardPlayedThisTurn && activeBot.devCards.some((c) => !c.played)) {
      const devState = tryPlayBotDevCard(currentState, activeBot, difficulty);
      if (devState !== currentState) {
        return devState;
      }
    }

    // B. Check if Bank Trade can enable a major build (City or Settlement)
    if (difficulty !== 'EASY' && canTradeThisTurn(currentState, activeBot.id).allowed) {
      const tradedState = trySmartBankTrade(currentState, activeBot, difficulty);
      if (tradedState !== currentState) {
        return tradedState;
      }
    }

    // C. 1st Build Priority: Upgrade Settlement to City (costs 2 WHEAT, 3 ORE)
    const validCities = getValidCityVertices(currentState, activeBot.id);
    if (
      validCities.length > 0 &&
      activeBot.citiesLeft > 0 &&
      hasResources(activeBot.resources, BUILDING_COSTS.CITY) &&
      canSpendOrBuildThisTurn(currentState, activeBot.id, true).allowed
    ) {
      const chosenCityVertex =
        difficulty === 'EASY'
          ? validCities[0]
          : pickBestCityUpgradeVertex(currentState, validCities, difficulty);
      return applyGameAction(currentState, activeBot.id, {
        type: 'UPGRADE_CITY',
        vertexId: chosenCityVertex,
      }).state;
    }

    // D. 2nd Build Priority: Build Settlement (costs 1 WOOD, 1 BRICK, 1 SHEEP, 1 WHEAT)
    const validSettlements = getValidSettlementVertices(currentState, activeBot.id);
    if (
      validSettlements.length > 0 &&
      activeBot.settlementsLeft > 0 &&
      hasResources(activeBot.resources, BUILDING_COSTS.SETTLEMENT) &&
      canSpendOrBuildThisTurn(currentState, activeBot.id, true).allowed
    ) {
      const chosenVertex = pickBestSettlementVertex(currentState, validSettlements, difficulty, activeBot.id);
      return applyGameAction(currentState, activeBot.id, {
        type: 'PLACE_SETTLEMENT',
        vertexId: chosenVertex,
      }).state;
    }

    // E. 3rd Build Priority: Buy Development Card (costs 1 SHEEP, 1 WHEAT, 1 ORE)
    if (canBuyDevCard(currentState, activeBot.id).allowed) {
      const shouldBuy =
        difficulty === 'EASY'
          ? Math.random() < 0.45
          : difficulty === 'MEDIUM'
          ? Math.random() < 0.7
          : true; // Hard bots value dev cards highly for Knights/VP
      if (shouldBuy) {
        return applyGameAction(currentState, activeBot.id, { type: 'BUY_DEV_CARD' }).state;
      }
    }

    // F. 4th Build Priority: Build Road (costs 1 WOOD, 1 BRICK)
    const validRoads = getValidRoadEdges(currentState, activeBot.id);
    if (
      validRoads.length > 0 &&
      activeBot.roadsLeft > 0 &&
      hasResources(activeBot.resources, BUILDING_COSTS.ROAD) &&
      canSpendOrBuildThisTurn(currentState, activeBot.id, true).allowed
    ) {
      const shouldBuildRoad =
        difficulty === 'EASY'
          ? Math.random() < 0.6
          : difficulty === 'HARD' || activeBot.roadsLeft > 4;
      if (shouldBuildRoad) {
        const chosenRoad = pickBestRoadEdge(currentState, validRoads, difficulty, activeBot.id);
        return applyGameAction(currentState, activeBot.id, {
          type: 'PLACE_ROAD',
          edgeId: chosenRoad,
        }).state;
      }
    }

    // G. Nothing more to do -> End Turn
    return applyGameAction(currentState, activeBot.id, { type: 'END_TURN' }).state;
  }

  return state;
}

/**
 * Heuristic scoring for settlement vertices based on difficulty:
 * - EASY: random or first vertex.
 * - MEDIUM: total probability pips + port presence.
 * - HARD: weighted resource diversity, synergized 2:1 ports, high pips (6, 8, 5, 9).
 */
export function pickBestSettlementVertex(
  state: GameState,
  vertexIds: string[],
  difficulty: BotDifficulty,
  botPlayerId: string
): string {
  if (vertexIds.length === 0) return '';
  if (difficulty === 'EASY') {
    return vertexIds[Math.floor(Math.random() * vertexIds.length)];
  }

  const bot = state.players.find((p) => p.id === botPlayerId);
  let bestId = vertexIds[0];
  let bestScore = -999;

  for (const vId of vertexIds) {
    const v = state.board.vertices[vId];
    if (!v) continue;

    let score = 0;
    const resourcesCovered = new Set<ResourceType>();

    for (const hId of v.hexIds) {
      const hex = state.board.hexes[hId];
      if (!hex || hex.terrain === 'SEA' || hex.terrain === 'DESERT') continue;
      const pips = hex.numberToken ? PIP_WEIGHTS[hex.numberToken] || 0 : 0;
      score += pips * (difficulty === 'HARD' ? 2.5 : 1.8);
      resourcesCovered.add(hex.terrain as ResourceType);
    }

    // Resource diversity bonus
    score += resourcesCovered.size * 2.5;

    // Port evaluation
    if (v.port) {
      if (difficulty === 'HARD') {
        if (v.port.type === 'GENERIC') {
          score += 4.5;
        } else {
          // If bot already produces this resource or this vertex produces it, 2:1 port is massive!
          const producesThisRes = Array.from(resourcesCovered).includes(v.port.type as ResourceType);
          score += producesThisRes ? 8.5 : 3.0;
        }
      } else {
        score += 2.0;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = vId;
    }
  }

  return bestId;
}

/**
 * Pick best edge for road placement:
 * - HARD: Targets cutting enemy longest road or expanding toward highest value uncolonized vertex.
 */
export function pickBestRoadEdge(
  state: GameState,
  edgeIds: string[],
  difficulty: BotDifficulty,
  botPlayerId: string
): string {
  if (edgeIds.length === 0) return '';
  if (difficulty === 'EASY') {
    return edgeIds[Math.floor(Math.random() * edgeIds.length)];
  }

  let bestId = edgeIds[0];
  let bestScore = -999;

  for (const eId of edgeIds) {
    const edge = state.board.edges[eId];
    if (!edge) continue;

    let score = Math.random() * 2; // small tie-breaker

    for (const vId of edge.vertexIds) {
      const v = state.board.vertices[vId];
      if (!v) continue;
      if (v.building === null) {
        // Points for expanding toward open vertices
        score += 3;
        if (v.port) score += difficulty === 'HARD' ? 4 : 2;
        for (const hId of v.hexIds) {
          const hex = state.board.hexes[hId];
          if (hex && hex.numberToken) {
            score += (PIP_WEIGHTS[hex.numberToken] || 0) * 0.8;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = eId;
    }
  }

  return bestId;
}

/**
 * Pick best city upgrade vertex (settlement that has highest production pips).
 */
function pickBestCityUpgradeVertex(
  state: GameState,
  validCities: string[],
  difficulty: BotDifficulty
): string {
  if (difficulty === 'EASY' || validCities.length <= 1) {
    return validCities[0];
  }

  let bestId = validCities[0];
  let bestPips = -1;

  for (const vId of validCities) {
    const v = state.board.vertices[vId];
    if (!v) continue;
    let pips = 0;
    for (const hId of v.hexIds) {
      const hex = state.board.hexes[hId];
      if (hex && hex.numberToken) {
        pips += PIP_WEIGHTS[hex.numberToken] || 0;
      }
    }
    if (pips > bestPips) {
      bestPips = pips;
      bestId = vId;
    }
  }

  return bestId;
}

/**
 * Robber target hex picker:
 * - EASY: random land hex.
 * - MEDIUM: hex with most total pips without checking owners.
 * - HARD: hex that blocks the winning player (highest VP or most cards) and does NOT block the bot itself.
 */
export function pickRobberTargetHex(
  state: GameState,
  botPlayerId: string,
  difficulty: BotDifficulty
): string {
  const candidateHexes = Object.values(state.board.hexes).filter(
    (h) => h.terrain !== 'SEA' && h.id !== state.board.robberHexId
  );
  if (candidateHexes.length === 0) return state.board.robberHexId;

  if (difficulty === 'EASY') {
    return candidateHexes[Math.floor(Math.random() * candidateHexes.length)].id;
  }

  // Find leader player (highest public/total victory points among opponents)
  const opponents = state.players.filter((p) => p.id !== botPlayerId);
  const leader = opponents.reduce((prev, curr) => {
    return curr.totalVictoryPoints > prev.totalVictoryPoints ? curr : prev;
  }, opponents[0]);

  let bestHexId = candidateHexes[0].id;
  let bestScore = -9999;

  for (const hex of candidateHexes) {
    const pips = hex.numberToken ? PIP_WEIGHTS[hex.numberToken] || 0 : 0;
    let touchesBot = false;
    let touchesLeader = false;
    let touchesOpponentsCount = 0;

    const touchingVertices = Object.values(state.board.vertices).filter((v) =>
      v.hexIds.includes(hex.id)
    );
    for (const v of touchingVertices) {
      if (!v || !v.building) continue;
      if (v.playerId === botPlayerId) touchesBot = true;
      if (leader && v.playerId === leader.id) touchesLeader = true;
      if (v.playerId !== botPlayerId) touchesOpponentsCount++;
    }

    let score = pips * 2;

    if (difficulty === 'HARD') {
      if (touchesBot) score -= 50; // Hard bot never blocks itself!
      if (touchesLeader) score += 35; // Strongly targets the leader
      score += touchesOpponentsCount * 8;
    } else {
      // MEDIUM
      if (touchesBot) score -= 15;
      score += touchesOpponentsCount * 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestHexId = hex.id;
    }
  }

  return bestHexId;
}

/**
 * Robber steal victim picker:
 * - HARD: steals from the leader or player with most cards.
 */
export function pickRobberStealVictim(
  state: GameState,
  candidateIds: string[],
  difficulty: BotDifficulty
): string {
  if (candidateIds.length === 0) return '';
  if (difficulty === 'EASY' || candidateIds.length === 1) {
    return candidateIds[Math.floor(Math.random() * candidateIds.length)];
  }

  const candidates = candidateIds
    .map((id) => state.players.find((p) => p.id === id))
    .filter(Boolean) as PlayerState[];

  // Sort by highest victory points first, then by most resource cards
  candidates.sort((a, b) => {
    if (difficulty === 'HARD') {
      if (b.totalVictoryPoints !== a.totalVictoryPoints) {
        return b.totalVictoryPoints - a.totalVictoryPoints;
      }
    }
    return countTotalResources(b.resources) - countTotalResources(a.resources);
  });

  return candidates[0].id;
}

/**
 * Tries playing a development card smartly:
 * - Knight: plays to remove robber if blocking bot's productive hex.
 * - Year of Plenty / Monopoly: extracts needed resources.
 */
function tryPlayBotDevCard(
  state: GameState,
  bot: PlayerState,
  difficulty: BotDifficulty
): GameState {
  if (state.turn.devCardPlayedThisTurn) return state;

  const robberTouchesBot = Object.values(state.board.vertices).some(
    (v) =>
      v.hexIds.includes(state.board.robberHexId) &&
      v.playerId === bot.id &&
      v.building !== null
  );

  // Knight card
  const knightCard = bot.devCards.find((c) => !c.played && c.type === 'KNIGHT');
  if (knightCard && (robberTouchesBot || difficulty === 'HARD')) {
    return applyGameAction(state, bot.id, {
      type: 'PLAY_DEV_CARD',
      cardId: knightCard.id,
    }).state;
  }

  // Year of Plenty
  const yopCard = bot.devCards.find((c) => !c.played && c.type === 'YEAR_OF_PLENTY');
  if (yopCard) {
    const needed = getMissingResourcesForTarget(bot.resources, BUILDING_COSTS.CITY);
    const r1 = needed[0] || 'WHEAT';
    const r2 = needed[1] || 'ORE';
    return applyGameAction(state, bot.id, {
      type: 'PLAY_DEV_CARD',
      cardId: yopCard.id,
      yearOfPlentyResources: [r1, r2],
    }).state;
  }

  // Monopoly (Hard bot checks which resource has circulated most)
  const monopolyCard = bot.devCards.find((c) => !c.played && c.type === 'MONOPOLY');
  if (monopolyCard && difficulty === 'HARD') {
    // Check which resource the opponents hold most in total
    const opponentTotals: Record<ResourceType, number> = {
      WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0,
    };
    for (const p of state.players) {
      if (p.id !== bot.id) {
        for (const res of ALL_RESOURCES) {
          opponentTotals[res] += p.resources[res] || 0;
        }
      }
    }
    const bestRes = ALL_RESOURCES.reduce((prev, curr) => {
      return opponentTotals[curr] > opponentTotals[prev] ? curr : prev;
    }, 'WHEAT');

    return applyGameAction(state, bot.id, {
      type: 'PLAY_DEV_CARD',
      cardId: monopolyCard.id,
      monopolyResource: bestRes,
    }).state;
  }

  return state;
}

/**
 * Attempts a bank trade (4:1, 3:1, or 2:1 port) if it directly unlocks a city or settlement.
 */
function trySmartBankTrade(
  state: GameState,
  bot: PlayerState,
  difficulty: BotDifficulty
): GameState {
  const ratios = getPlayerBankTradeRatios(state, bot.id);
  const targets = [BUILDING_COSTS.CITY, BUILDING_COSTS.SETTLEMENT];

  for (const targetCost of targets) {
    const missing = getMissingResourcesForTarget(bot.resources, targetCost);
    if (missing.length === 1) {
      const neededRes = missing[0];
      // Find a resource that the bot has in excess
      for (const giveRes of ALL_RESOURCES) {
        if (giveRes === neededRes) continue;
        const ratio = ratios[giveRes];
        const minKeep = (targetCost[giveRes] || 0) + ratio;
        if (bot.resources[giveRes] >= minKeep && state.bank[neededRes] >= 1) {
          return applyGameAction(state, bot.id, {
            type: 'BANK_TRADE',
            giveResource: giveRes,
            giveAmount: ratio,
            receiveResource: neededRes,
            receiveAmount: 1,
          }).state;
        }
      }
    }
  }

  return state;
}

function getMissingResourcesForTarget(
  current: Record<ResourceType, number>,
  cost: Partial<Record<ResourceType, number>>
): ResourceType[] {
  const missing: ResourceType[] = [];
  for (const [res, needed] of Object.entries(cost) as Array<[ResourceType, number]>) {
    if ((current[res] || 0) < needed) {
      for (let i = 0; i < needed - (current[res] || 0); i++) {
        missing.push(res);
      }
    }
  }
  return missing;
}

/**
 * Evaluates whether a bot should accept a trade offer from another player:
 * - EASY: accepts if it doesn't leave the bot with 0 cards.
 * - MEDIUM: accepts if receiving a needed resource and giving one with count >= 2.
 * - HARD: accepts ONLY if it immediately enables a city/settlement build this turn,
 *         and NEVER accepts if the offer benefits the game leader!
 */
export function evaluateBotTradeOffer(
  state: GameState,
  botPlayerId: string,
  offer: TradeOffer
): 'ACCEPT' | 'REJECT' {
  const bot = state.players.find((p) => p.id === botPlayerId);
  if (!bot || !bot.isBot) return 'REJECT';

  const difficulty: BotDifficulty = bot.botDifficulty || state.config.defaultBotDifficulty || 'MEDIUM';

  // Check if bot can afford what is requested
  for (const [res, count] of Object.entries(offer.request) as Array<[ResourceType, number]>) {
    if ((bot.resources[res] || 0) < count) {
      return 'REJECT';
    }
  }

  const proposer = state.players.find((p) => p.id === offer.fromPlayerId);
  if (!proposer) return 'REJECT';

  if (difficulty === 'EASY') {
    const totalRemaining = countTotalResources(bot.resources) - countTotalResources(offer.request);
    return totalRemaining > 0 ? 'ACCEPT' : 'REJECT';
  }

  if (difficulty === 'HARD') {
    // Never help the player who is in the lead
    const leader = state.players.reduce((prev, curr) => {
      return curr.totalVictoryPoints > prev.totalVictoryPoints ? curr : prev;
    }, state.players[0]);
    if (proposer.id === leader.id && leader.id !== bot.id) {
      return 'REJECT';
    }

    // Only accept if this trade allows bot to build city or settlement immediately!
    const simulatedResources = { ...bot.resources };
    for (const [res, count] of Object.entries(offer.request) as Array<[ResourceType, number]>) {
      simulatedResources[res] -= count;
    }
    for (const [res, count] of Object.entries(offer.offer) as Array<[ResourceType, number]>) {
      simulatedResources[res] += count;
    }

    const enablesCity = hasResources(simulatedResources, BUILDING_COSTS.CITY);
    const enablesSettlement = hasResources(simulatedResources, BUILDING_COSTS.SETTLEMENT);
    return enablesCity || enablesSettlement ? 'ACCEPT' : 'REJECT';
  }

  // MEDIUM
  let givesSpare = true;
  for (const [res, count] of Object.entries(offer.request) as Array<[ResourceType, number]>) {
    if ((bot.resources[res] || 0) - count < 1) {
      givesSpare = false;
    }
  }
  return givesSpare ? 'ACCEPT' : 'REJECT';
}
