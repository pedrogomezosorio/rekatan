import {
  ALL_RESOURCES,
  BUILDING_COSTS,
  countTotalResources,
  createEmptyResources,
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
  getPotentialSettlementVertices,
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

function withBotNotice(state: GameState, notice: string | null): GameState {
  state.turn.botStatusMessage = notice;
  if (state.lastEvent && notice) {
    state.lastEvent.botActionNotice = notice;
  }
  return state;
}

/**
 * Executes a full or partial turn step for an AI bot depending on its difficulty setting:
 * - EASY: Basic decisions, builds roads/settlements/cities, trades with bank and players.
 * - MEDIUM: Heuristic evaluation, prioritizes high-probability numbers (6, 8, 5, 9), active trading & building.
 * - HARD: Strategic leader targeting, longest road pursuit, 2:1 port monopolies, tight trade evaluation.
 */
export function executeBotStep(state: GameState, botPlayerId: string): GameState {
  const bot = state.players.find((p) => p.id === botPlayerId);
  if (!bot || !bot.isBot) return state;

  const difficulty: BotDifficulty = bot.botDifficulty || state.config.defaultBotDifficulty || 'MEDIUM';

  // 1. ORDER ROLL PHASE
  if (state.phase === 'ORDER_ROLL') {
    if (!state.turn.orderRolls?.[bot.id]) {
      const next = applyGameAction(state, bot.id, { type: 'ROLL_FOR_ORDER' }).state;
      return withBotNotice(next, `${bot.name} lanza los dados de iniciativa`);
    }
    return state;
  }

  // 2. SETUP PHASES (Snake Draft)
  if (state.phase === 'SETUP_SETTLEMENT_1' || state.phase === 'SETUP_SETTLEMENT_2') {
    const validVertices = getValidSettlementVertices(state, bot.id);
    if (validVertices.length === 0) return state;
    const chosenVertex = pickBestSettlementVertex(state, validVertices, difficulty, bot.id);
    const next = applyGameAction(state, bot.id, {
      type: 'PLACE_SETTLEMENT',
      vertexId: chosenVertex,
    }).state;
    return withBotNotice(next, `${bot.name} coloca un Poblado inicial`);
  }

  if (state.phase === 'SETUP_ROAD_1' || state.phase === 'SETUP_ROAD_2') {
    const validRoads = getValidRoadEdges(state, bot.id);
    if (validRoads.length === 0) return state;
    const chosenRoad = pickBestRoadEdge(state, validRoads, difficulty, bot.id);
    const next = applyGameAction(state, bot.id, {
      type: 'PLACE_ROAD',
      edgeId: chosenRoad,
    }).state;
    return withBotNotice(next, `${bot.name} coloca una Carretera inicial`);
  }

  // 3. MANDATORY DICE ROLL PHASE
  if (state.phase === 'WAITING_FOR_DICE') {
    const next = applyGameAction(state, bot.id, { type: 'ROLL_DICE' }).state;
    return withBotNotice(next, `${bot.name} ha lanzado los dados`);
  }

  // 4. ROBBER PHASES
  if (state.phase === 'ROBBER_MOVE') {
    const targetHexId = pickRobberTargetHex(state, bot.id, difficulty);
    const next = applyGameAction(state, bot.id, {
      type: 'MOVE_ROBBER',
      hexId: targetHexId,
    }).state;
    return withBotNotice(next, `${bot.name} desplaza al Ladrón`);
  }

  if (state.phase === 'ROBBER_STEAL') {
    if (state.robberStealCandidates.length > 0) {
      const victimId = pickRobberStealVictim(state, state.robberStealCandidates, difficulty);
      const victim = state.players.find((p) => p.id === victimId);
      const next = applyGameAction(state, bot.id, {
        type: 'STEAL_RESOURCE',
        victimPlayerId: victimId,
      }).state;
      return withBotNotice(
        next,
        `${bot.name} roba un recurso${victim ? ` a ${victim.name}` : ''}`
      );
    }
    return state;
  }

  // 5. FREE ROAD BUILDING FROM DEV CARD
  if (state.phase === 'ROAD_BUILDING_DEV') {
    const validRoads = getValidRoadEdges(state, bot.id);
    if (validRoads.length > 0) {
      const chosenRoad = pickBestRoadEdge(state, validRoads, difficulty, bot.id);
      const next = applyGameAction(state, bot.id, {
        type: 'PLACE_ROAD',
        edgeId: chosenRoad,
      }).state;
      return withBotNotice(next, `${bot.name} construye una Carretera gratuita`);
    } else {
      state.turn.freeRoadsRemaining = 0;
      state.phase = 'MAIN_PHASE';
      return state;
    }
  }

  // 6. MAIN PHASE
  if (state.phase === 'MAIN_PHASE') {
    const currentState = state;
    const activeBot = currentState.players.find((p) => p.id === bot.id)!;

    // A0. Manage any active trade offer created by this bot
    const existingBotOffer = currentState.activeTradeOffers.find(
      (o) => o.fromPlayerId === activeBot.id
    );
    if (existingBotOffer) {
      const offerAgeMs = Date.now() - existingBotOffer.createdAt;

      // 1. Check if any human or bot player has already accepted
      let acceptedEntry = Object.entries(existingBotOffer.responses).find(
        ([, status]) => status === 'ACCEPTED'
      );

      // 2. If no player has accepted yet, but 3.5 seconds have passed (3500ms delay for other bots),
      // any other bot that is still PENDING can now accept if the trade is favorable!
      if (!acceptedEntry && offerAgeMs >= 3500) {
        for (const otherBot of currentState.players.filter((p) => p.isBot && p.id !== activeBot.id)) {
          if (existingBotOffer.responses[otherBot.id] === 'PENDING') {
            if (evaluateBotTradeOffer(currentState, otherBot.id, existingBotOffer) === 'ACCEPT') {
              existingBotOffer.responses[otherBot.id] = 'ACCEPTED';
              acceptedEntry = [otherBot.id, 'ACCEPTED'];
              break;
            } else {
              existingBotOffer.responses[otherBot.id] = 'REJECTED';
            }
          }
        }
      }

      if (acceptedEntry) {
        const [partnerId] = acceptedEntry;
        const partner = currentState.players.find((p) => p.id === partnerId);
        const execRes = applyGameAction(currentState, activeBot.id, {
          type: 'EXECUTE_TRADE_OFFER',
          offerId: existingBotOffer.id,
          partnerPlayerId: partnerId,
        });
        if (!execRes.error) {
          return withBotNotice(
            execRes.state,
            `${activeBot.name} cierra un trato con ${partner?.name || 'un jugador'}`
          );
        }
      }

      // Check if all other players have already rejected the offer
      const targetPlayers = existingBotOffer.targetPlayerId
        ? currentState.players.filter((p) => p.id === existingBotOffer.targetPlayerId)
        : currentState.players.filter((p) => p.id !== activeBot.id && (p.connected || p.isBot));

      const allRejected =
        targetPlayers.length > 0 &&
        targetPlayers.every((p) => existingBotOffer.responses[p.id] === 'REJECTED');

      if (allRejected) {
        // If rejected by all, cancel immediately at that exact moment
        const cancelled = applyGameAction(currentState, activeBot.id, {
          type: 'CANCEL_TRADE_OFFER',
          offerId: existingBotOffer.id,
        }).state;
        return withBotNotice(
          cancelled,
          `${activeBot.name} retira su oferta comercial (rechazada por todos)`
        );
      }

      // Bot offers stay active for 7.5 seconds (7500ms) unless rejected by all
      if (offerAgeMs < 7500) {
        const remainingSec = Math.max(1, Math.ceil((7500 - offerAgeMs) / 1000));
        const waitingState = structuredClone(currentState);
        return withBotNotice(
          waitingState,
          `${activeBot.name} propone un trato (${remainingSec}s restantes)...`
        );
      }

      // Cancel expired offer after 7.5 seconds
      const cancelled = applyGameAction(currentState, activeBot.id, {
        type: 'CANCEL_TRADE_OFFER',
        offerId: existingBotOffer.id,
      }).state;
      return withBotNotice(cancelled, `${activeBot.name} retira su oferta comercial`);
    }

    // A. Play Dev Card if useful (Knight, Year of Plenty, Monopoly, Road Building)
    const canPlayDev =
      (!currentState.config.maxOneDevCardPerTurn || !currentState.turn.devCardPlayedThisTurn) &&
      activeBot.devCards.some(
        (c) =>
          !c.played &&
          c.type !== 'VICTORY_POINT' &&
          (currentState.config.allowInstantDevCards ||
            c.boughtAtTurn !== currentState.turn.turnNumber)
      );
    if (canPlayDev) {
      const devState = tryPlayBotDevCard(currentState, activeBot, difficulty);
      if (devState !== currentState) {
        return withBotNotice(devState, `${activeBot.name} usa una Carta de Desarrollo`);
      }
    }

    // B. 1st Build Priority: Upgrade Settlement to City (costs 2 WHEAT, 3 ORE)
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
      const next = applyGameAction(currentState, activeBot.id, {
        type: 'UPGRADE_CITY',
        vertexId: chosenCityVertex,
      }).state;
      return withBotNotice(next, `${activeBot.name} construye una Ciudad`);
    }

    // C. 2nd Build Priority: Build Settlement (costs 1 WOOD, 1 BRICK, 1 SHEEP, 1 WHEAT)
    const validSettlements = getValidSettlementVertices(currentState, activeBot.id);
    if (
      validSettlements.length > 0 &&
      activeBot.settlementsLeft > 0 &&
      hasResources(activeBot.resources, BUILDING_COSTS.SETTLEMENT) &&
      canSpendOrBuildThisTurn(currentState, activeBot.id, true).allowed
    ) {
      const chosenVertex = pickBestSettlementVertex(
        currentState,
        validSettlements,
        difficulty,
        activeBot.id
      );
      const next = applyGameAction(currentState, activeBot.id, {
        type: 'PLACE_SETTLEMENT',
        vertexId: chosenVertex,
      }).state;
      return withBotNotice(next, `${activeBot.name} construye un Poblado`);
    }

    // D. If no potential settlement spot is currently reachable, build a Road to expand!
    const potentialSettlements = getPotentialSettlementVertices(currentState, activeBot.id);
    const validRoads = getValidRoadEdges(currentState, activeBot.id);
    if (
      potentialSettlements.length === 0 &&
      validRoads.length > 0 &&
      activeBot.roadsLeft > 0 &&
      hasResources(activeBot.resources, BUILDING_COSTS.ROAD) &&
      canSpendOrBuildThisTurn(currentState, activeBot.id, true).allowed
    ) {
      const chosenRoad = pickBestRoadEdge(currentState, validRoads, difficulty, activeBot.id);
      const next = applyGameAction(currentState, activeBot.id, {
        type: 'PLACE_ROAD',
        edgeId: chosenRoad,
      }).state;
      return withBotNotice(next, `${activeBot.name} construye una Carretera para expandirse`);
    }

    // E. Trading Phase: Propose trade to players OR trade with Bank/Ports if missing resources
    if (canTradeThisTurn(currentState, activeBot.id).allowed) {
      // E1. Propose a player-to-player trade once per turn when missing 1 resource for a build
      if (!currentState.turn.botProposedTradeThisTurn) {
        const proposedState = tryProposeBotPlayerTrade(currentState, activeBot);
        if (proposedState !== currentState) {
          proposedState.turn.botProposedTradeThisTurn = true;
          return withBotNotice(proposedState, `${activeBot.name} propone un trato comercial`);
        }
      }

      // E2. Bank / Port Trade to unlock City, Settlement, Road, or Dev Card
      const tradedState = trySmartBankTrade(currentState, activeBot);
      if (tradedState !== currentState) {
        return withBotNotice(tradedState, `${activeBot.name} comercia con la Banca`);
      }
    }

    // F. Build Road if bot has resources for Road (costs 1 WOOD, 1 BRICK)
    if (
      validRoads.length > 0 &&
      activeBot.roadsLeft > 0 &&
      hasResources(activeBot.resources, BUILDING_COSTS.ROAD) &&
      canSpendOrBuildThisTurn(currentState, activeBot.id, true).allowed
    ) {
      const chosenRoad = pickBestRoadEdge(currentState, validRoads, difficulty, activeBot.id);
      const next = applyGameAction(currentState, activeBot.id, {
        type: 'PLACE_ROAD',
        edgeId: chosenRoad,
      }).state;
      return withBotNotice(next, `${activeBot.name} construye una Carretera`);
    }

    // G. Buy Development Card (costs 1 SHEEP, 1 WHEAT, 1 ORE)
    if (canBuyDevCard(currentState, activeBot.id).allowed) {
      const next = applyGameAction(currentState, activeBot.id, { type: 'BUY_DEV_CARD' }).state;
      return withBotNotice(next, `${activeBot.name} compra una Carta de Desarrollo`);
    }

    // H. Nothing more to do -> End Turn
    const ended = applyGameAction(currentState, activeBot.id, { type: 'END_TURN' }).state;
    return withBotNotice(ended, `${activeBot.name} finaliza su turno`);
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
    (h) => h.terrain !== 'SEA' && h.terrain !== 'DESERT'
  );
  if (candidateHexes.length === 0) return state.board.robberHexId;

  if (difficulty === 'EASY') {
    return candidateHexes[Math.floor(Math.random() * candidateHexes.length)].id;
  }

  // Fairly identify opponent leaders (human or bot without bias towards player 0)
  const opponents = state.players.filter((p) => p.id !== botPlayerId);
  if (opponents.length === 0) return state.board.robberHexId;

  const maxVP = Math.max(...opponents.map((p) => p.totalVictoryPoints));
  const leadingOpponents = opponents.filter((p) => p.totalVictoryPoints === maxVP);
  const leadingIds = new Set(leadingOpponents.map((p) => p.id));

  let bestHexCandidates: string[] = [candidateHexes[0].id];
  let bestScore = -9999;

  for (const hex of candidateHexes) {
    const pips = hex.numberToken ? PIP_WEIGHTS[hex.numberToken] || 0 : 0;
    let touchesBot = false;
    let touchesLeadingOpponent = false;
    let touchesOpponentsCount = 0;

    const touchingVertices = Object.values(state.board.vertices).filter((v) =>
      v.hexIds.includes(hex.id)
    );
    for (const v of touchingVertices) {
      if (!v || !v.building) continue;
      if (v.playerId === botPlayerId) touchesBot = true;
      if (v.playerId && leadingIds.has(v.playerId)) touchesLeadingOpponent = true;
      if (v.playerId !== botPlayerId) touchesOpponentsCount++;
    }

    let score = pips * 2;

    if (difficulty === 'HARD') {
      if (touchesBot) score -= 60; // Hard bot never blocks itself!
      if (touchesLeadingOpponent) score += 25; // Targets leaders fairly (bot or human)
      score += touchesOpponentsCount * 8;
    } else {
      // MEDIUM: Balanced pressure without focusing solely on any single player
      if (touchesBot) score -= 20;
      if (touchesLeadingOpponent) score += 10;
      score += touchesOpponentsCount * 6;
    }

    if (score > bestScore) {
      bestScore = score;
      bestHexCandidates = [hex.id];
    } else if (Math.abs(score - bestScore) < 0.1) {
      bestHexCandidates.push(hex.id);
    }
  }

  // Pick randomly among tied best candidates to avoid deterministic targeting
  return bestHexCandidates[Math.floor(Math.random() * bestHexCandidates.length)];
}

/**
 * Robber steal victim picker:
 * - Fairly distributes stealing across all opponents (human or bot) touching the hex.
 * - EASY: random candidate.
 * - MEDIUM: random candidate among those who currently hold resources.
 * - HARD: selects among leading opponents with cards, picking randomly if tied.
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

  if (candidates.length === 0) return '';
  if (candidates.length === 1) return candidates[0].id;

  const withCards = candidates.filter((p) => countTotalResources(p.resources) > 0);
  const activePool = withCards.length > 0 ? withCards : candidates;

  if (difficulty === 'MEDIUM') {
    // Fairly pick randomly among all candidates who have cards (human or bot equally)
    return activePool[Math.floor(Math.random() * activePool.length)].id;
  }

  // HARD: Target the player(s) with highest VP, randomizing fairly on ties
  const maxVP = Math.max(...activePool.map((p) => p.totalVictoryPoints));
  const leaders = activePool.filter((p) => p.totalVictoryPoints === maxVP);
  return leaders[Math.floor(Math.random() * leaders.length)].id;
}

/**
 * Tries playing a development card smartly:
 * - Knight: plays to move the robber and build Largest Army.
 * - Road Building: places up to 2 free roads immediately.
 * - Year of Plenty / Monopoly: extracts needed resources.
 */
function tryPlayBotDevCard(
  state: GameState,
  bot: PlayerState,
  difficulty: BotDifficulty
): GameState {
  if (state.config.maxOneDevCardPerTurn && state.turn.devCardPlayedThisTurn) {
    return state;
  }

  const playableCards = bot.devCards.filter(
    (c) =>
      !c.played &&
      c.type !== 'VICTORY_POINT' &&
      (state.config.allowInstantDevCards || c.boughtAtTurn !== state.turn.turnNumber)
  );
  if (playableCards.length === 0) return state;

  // 1. Knight card: play to remove robber from bot's hex or attack opponents / pursue Largest Army
  const knightCard = playableCards.find((c) => c.type === 'KNIGHT');
  if (knightCard) {
    const res = applyGameAction(state, bot.id, {
      type: 'PLAY_DEV_CARD',
      cardId: knightCard.id,
    });
    if (!res.error) return res.state;
  }

  // 2. Road Building: play if bot has road pieces and valid road spots
  const roadBuildingCard = playableCards.find((c) => c.type === 'ROAD_BUILDING');
  if (roadBuildingCard && bot.roadsLeft > 0) {
    const validRoads = getValidRoadEdges(
      {
        ...state,
        phase: 'ROAD_BUILDING_DEV',
        turn: { ...state.turn, freeRoadsRemaining: Math.min(2, bot.roadsLeft) },
      },
      bot.id
    );
    if (validRoads.length > 0) {
      const res = applyGameAction(state, bot.id, {
        type: 'PLAY_DEV_CARD',
        cardId: roadBuildingCard.id,
      });
      if (!res.error) return res.state;
    }
  }

  // 3. Year of Plenty: pick 2 needed resources that are available in the bank
  const yopCard = playableCards.find((c) => c.type === 'YEAR_OF_PLENTY');
  if (yopCard) {
    const neededCity = getMissingResourcesForTarget(bot.resources, BUILDING_COSTS.CITY);
    const neededSettlement = getMissingResourcesForTarget(bot.resources, BUILDING_COSTS.SETTLEMENT);
    const neededRoad = getMissingResourcesForTarget(bot.resources, BUILDING_COSTS.ROAD);
    const desiredPool = [...neededCity, ...neededSettlement, ...neededRoad, ...ALL_RESOURCES];

    const chosen: ResourceType[] = [];
    const simulatedBank = { ...state.bank };
    for (const r of desiredPool) {
      if (chosen.length >= 2) break;
      if ((simulatedBank[r] || 0) >= 1) {
        chosen.push(r);
        simulatedBank[r] -= 1;
      }
    }

    if (chosen.length === 2) {
      const res = applyGameAction(state, bot.id, {
        type: 'PLAY_DEV_CARD',
        cardId: yopCard.id,
        yearOfPlentyResources: [chosen[0], chosen[1]],
      });
      if (!res.error) return res.state;
    }
  }

  // 4. Monopoly: check which resource opponents hold in total
  const monopolyCard = playableCards.find((c) => c.type === 'MONOPOLY');
  if (monopolyCard) {
    const opponentTotals: Record<ResourceType, number> = {
      WOOD: 0,
      BRICK: 0,
      SHEEP: 0,
      WHEAT: 0,
      ORE: 0,
    };
    let totalOpponentCards = 0;
    for (const p of state.players) {
      if (p.id !== bot.id) {
        for (const res of ALL_RESOURCES) {
          const count = p.resources[res] || 0;
          opponentTotals[res] += count;
          totalOpponentCards += count;
        }
      }
    }

    if (totalOpponentCards > 0) {
      const availableResources = ALL_RESOURCES.filter((r) => opponentTotals[r] > 0);
      const bestRes =
        difficulty === 'EASY'
          ? availableResources[Math.floor(Math.random() * availableResources.length)] || 'WHEAT'
          : ALL_RESOURCES.reduce((prev, curr) => {
              return opponentTotals[curr] > opponentTotals[prev] ? curr : prev;
            }, 'WHEAT' as ResourceType);

      const res = applyGameAction(state, bot.id, {
        type: 'PLAY_DEV_CARD',
        cardId: monopolyCard.id,
        monopolyResource: bestRes,
      });
      if (!res.error) return res.state;
    }
  }

  return state;
}

/**
 * Proposes a 1:1 trade offer to other players when the bot is missing 1 resource
 * for a Settlement, City, or Road and holds a spare resource to offer.
 */
function tryProposeBotPlayerTrade(
  state: GameState,
  bot: PlayerState
): GameState {
  const otherPlayersHaveCards = state.players.some(
    (p) => p.id !== bot.id && p.status === 'ACTIVE' && countTotalResources(p.resources) > 0
  );
  if (!otherPlayersHaveCards) return state;

  const hasValidSettlementSpot = getPotentialSettlementVertices(state, bot.id).length > 0;
  const hasOwnSettlement = Object.values(state.board.vertices).some(
    (v) => v.playerId === bot.id && v.building === 'SETTLEMENT'
  );

  const prioritizedTargets: Array<Record<ResourceType, number>> = [];
  if (hasValidSettlementSpot && bot.settlementsLeft > 0) {
    prioritizedTargets.push(BUILDING_COSTS.SETTLEMENT);
  }
  if (hasOwnSettlement && bot.citiesLeft > 0) {
    prioritizedTargets.push(BUILDING_COSTS.CITY);
  }
  if (bot.roadsLeft > 0) {
    prioritizedTargets.push(BUILDING_COSTS.ROAD);
  }

  for (const targetCost of prioritizedTargets) {
    const missing = getMissingResourcesForTarget(bot.resources, targetCost);
    if (missing.length === 1) {
      const neededRes = missing[0];
      // Find a resource the bot has in excess over targetCost
      const spareRes = ALL_RESOURCES.find((r) => {
        if (r === neededRes) return false;
        const required = targetCost[r] || 0;
        return (bot.resources[r] || 0) > required;
      });

      if (spareRes) {
        const offer = createEmptyResources();
        const request = createEmptyResources();
        offer[spareRes] = 1;
        request[neededRes] = 1;

        const res = applyGameAction(state, bot.id, {
          type: 'CREATE_TRADE_OFFER',
          targetPlayerId: null,
          offer,
          request,
        });
        if (!res.error) {
          return res.state;
        }
      }
    }
  }

  return state;
}

/**
 * Attempts a bank trade (4:1, 3:1, or 2:1 port) if it directly unlocks a city, settlement, road, or dev card,
 * or reduces excess hand size when holding >= 8 cards.
 */
function trySmartBankTrade(
  state: GameState,
  bot: PlayerState
): GameState {
  const ratios = getPlayerBankTradeRatios(state, bot.id);
  const hasValidSettlementSpot = getPotentialSettlementVertices(state, bot.id).length > 0;
  const hasOwnSettlement = Object.values(state.board.vertices).some(
    (v) => v.playerId === bot.id && v.building === 'SETTLEMENT'
  );

  const targets: Array<Record<ResourceType, number>> = [];
  if (hasOwnSettlement && bot.citiesLeft > 0) {
    targets.push(BUILDING_COSTS.CITY);
  }
  if (hasValidSettlementSpot && bot.settlementsLeft > 0) {
    targets.push(BUILDING_COSTS.SETTLEMENT);
  }
  if (bot.roadsLeft > 0) {
    targets.push(BUILDING_COSTS.ROAD);
  }
  if (state.devDeck.length > 0) {
    targets.push(BUILDING_COSTS.DEV_CARD);
  }

  for (const targetCost of targets) {
    const missing = getMissingResourcesForTarget(bot.resources, targetCost);
    if (missing.length === 1) {
      const neededRes = missing[0];
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

  // Also trade if bot has a large stockpile of a single resource and 0 of another
  for (const giveRes of ALL_RESOURCES) {
    const ratio = ratios[giveRes];
    if (bot.resources[giveRes] >= ratio + 1) {
      const scarceRes = ALL_RESOURCES.find(
        (r) => r !== giveRes && bot.resources[r] === 0 && state.bank[r] >= 1
      );
      if (scarceRes) {
        return applyGameAction(state, bot.id, {
          type: 'BANK_TRADE',
          giveResource: giveRes,
          giveAmount: ratio,
          receiveResource: scarceRes,
          receiveAmount: 1,
        }).state;
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
 * - Much more open, frequent and logical trade acceptance!
 * - EASY: Accepts almost any trade as long as the bot has the requested cards and receives >= 1 card.
 * - MEDIUM:
 *     - ALWAYS accepts if receiving MORE cards than giving (e.g. 2:1, 3:1).
 *     - ALWAYS accepts if the trade enables building a City, Settlement, Road, or Dev Card.
 *     - Accepts 1:1 if receiving a resource it has 0 or 1 of, or if it has surplus of what is requested.
 *     - Does NOT require having 2+ cards of the requested resource.
 * - HARD:
 *     - Accepts favorable trades (receiving > giving).
 *     - Accepts if the trade enables any build (City, Settlement, Road, Dev card).
 *     - Only blocks if the proposer is within 1-2 VP of winning (e.g. >= 9 VP in a 10 VP game).
 */
export function evaluateBotTradeOffer(
  state: GameState,
  botPlayerId: string,
  offer: TradeOffer
): 'ACCEPT' | 'REJECT' {
  const bot = state.players.find((p) => p.id === botPlayerId);
  if (!bot || !bot.isBot) return 'REJECT';

  const difficulty: BotDifficulty = bot.botDifficulty || state.config.defaultBotDifficulty || 'MEDIUM';

  // Physical rule: Bot MUST have enough resources to give what is requested
  for (const [res, count] of Object.entries(offer.request) as Array<[ResourceType, number]>) {
    if ((bot.resources[res] || 0) < count) {
      return 'REJECT';
    }
  }

  const proposer = state.players.find((p) => p.id === offer.fromPlayerId);
  if (!proposer) return 'REJECT';

  const totalGiving = countTotalResources(offer.request);
  const totalReceiving = countTotalResources(offer.offer);

  // Proposer must be offering at least one resource
  if (totalReceiving === 0) return 'REJECT';

  // EASY difficulty: very friendly and collaborative
  if (difficulty === 'EASY') {
    return 'ACCEPT';
  }

  // Check if simulated resources enable any build
  const simulatedResources: Record<ResourceType, number> = { ...bot.resources };
  for (const [res, count] of Object.entries(offer.request) as Array<[ResourceType, number]>) {
    simulatedResources[res] -= count;
  }
  for (const [res, count] of Object.entries(offer.offer) as Array<[ResourceType, number]>) {
    simulatedResources[res] = (simulatedResources[res] || 0) + count;
  }

  const enablesSettlement =
    hasResources(simulatedResources, BUILDING_COSTS.SETTLEMENT) && bot.settlementsLeft > 0;
  const enablesCity =
    hasResources(simulatedResources, BUILDING_COSTS.CITY) && bot.citiesLeft > 0;
  const enablesRoad =
    hasResources(simulatedResources, BUILDING_COSTS.ROAD) && bot.roadsLeft > 0;
  const enablesDevCard =
    hasResources(simulatedResources, BUILDING_COSTS.DEV_CARD) && state.devDeck.length > 0;
  const enablesAnyBuild = enablesSettlement || enablesCity || enablesRoad || enablesDevCard;

  const isFavorableCount = totalReceiving > totalGiving;
  const isOneForOne = totalReceiving === totalGiving;

  // HARD difficulty: Strategic, accepts helpful or favorable trades, only wary of imminent winners
  if (difficulty === 'HARD') {
    // Only block if proposer is 1 or 2 points away from winning
    const isImminentWinner = proposer.totalVictoryPoints >= state.config.victoryPointsTarget - 2;
    if (isImminentWinner && !enablesCity && !enablesSettlement) {
      return 'REJECT';
    }

    if (isFavorableCount || enablesAnyBuild) {
      return 'ACCEPT';
    }

    // Accept 1:1 if receiving a resource bot currently has 0 of
    if (isOneForOne) {
      const receivingNeededZero = Object.entries(offer.offer).some(
        ([res, count]) => count > 0 && (bot.resources[res as ResourceType] || 0) === 0
      );
      if (receivingNeededZero) return 'ACCEPT';
    }

    return 'REJECT';
  }

  // MEDIUM difficulty: highly cooperative, accepts trades that make sense
  // 1. If receiving more cards than giving, always accept!
  if (isFavorableCount) {
    return 'ACCEPT';
  }

  // 2. If it enables building anything, always accept!
  if (enablesAnyBuild) {
    return 'ACCEPT';
  }

  // 3. For 1:1 trades: accept if receiving a resource the bot has few of (<= 1)
  if (isOneForOne) {
    const receivesScarceResource = Object.entries(offer.offer).some(
      ([res, count]) => count > 0 && (bot.resources[res as ResourceType] || 0) <= 1
    );
    if (receivesScarceResource) {
      return 'ACCEPT';
    }

    // Also accept if bot has 2+ of the requested card (surplus trade)
    const givesSurplus = Object.entries(offer.request).every(
      ([res, count]) => (bot.resources[res as ResourceType] || 0) >= count + 1
    );
    if (givesSurplus) {
      return 'ACCEPT';
    }

    // Default friendly rate for balanced 1:1 trades: 75% accept
    return Math.random() < 0.75 ? 'ACCEPT' : 'REJECT';
  }

  return 'REJECT';
}
