import { describe, expect, it } from 'vitest';
import {
  generateBoard,
  hasAdjacentRedNumbers,
} from '../engine/HexGrid';
import { calculatePlayerLongestRoad } from '../engine/LongestRoad';
import { executeBotStep } from '../engine/BotEngine';
import {
  applyGameAction,
  canBuyDevCard,
  canSpendOrBuildThisTurn,
  canTradeThisTurn,
  createInitialGameState,
  getValidSettlementVertices,
} from '../engine/RulesEngine';

describe('HexGrid Mathematical Engine & Board Generator', () => {
  it('generates Standard 3-4-5-4-3 board with 19 land hexes, 54 vertices, 72 edges, and 9 ports', () => {
    const board = generateBoard('STANDARD_3_4', true, 64, true);
    const landHexes = Object.values(board.hexes).filter((h) => h.terrain !== 'SEA');
    const seaHexes = Object.values(board.hexes).filter((h) => h.terrain === 'SEA');

    expect(landHexes.length).toBe(19);
    expect(seaHexes.length).toBe(18);
    expect(Object.keys(board.vertices).length).toBe(54);
    expect(Object.keys(board.edges).length).toBe(72);
    expect(board.ports.length).toBe(9);
    expect(hasAdjacentRedNumbers(board.hexes)).toBe(false);
    expect(board.hexes['0,0,0'].terrain).toBe('DESERT');
    expect(board.hexes['0,0,0'].hasRobber).toBe(true);
    expect(board.robberHexId).toBe('0,0,0');
  });

  it('generates 5-6 Players Expansion 3-4-5-6-5-4-3 board with 30 land hexes and 11 ports', () => {
    const board = generateBoard('EXPANSION_5_6', false);
    const landHexes = Object.values(board.hexes).filter((h) => h.terrain !== 'SEA');
    expect(landHexes.length).toBe(30);
    expect(board.ports.length).toBe(11);
  });

  it('generates Radius-3 board with 37 land hexes', () => {
    const board = generateBoard('MEGA_RADIUS_3', false);
    const landHexes = Object.values(board.hexes).filter((h) => h.terrain !== 'SEA');
    expect(landHexes.length).toBe(37);
  });
});

describe('Longest Road DFS & Enemy Settlement Interruption', () => {
  it('computes continuous road length and breaks when an enemy settlement occupies an intermediate vertex', () => {
    const board = generateBoard('STANDARD_3_4', false);
    // Find a chain of 5 connected edges around hex 0,0,0
    const centerHex = board.hexes['0,0,0'];
    const hexEdges = Object.values(board.edges).filter((e) =>
      e.hexIds.includes(centerHex.id)
    );
    expect(hexEdges.length).toBe(6);

    // Assign 5 edges around center hex to P1
    for (let i = 0; i < 5; i++) {
      hexEdges[i].building = 'ROAD';
      hexEdges[i].playerId = 'P1';
    }

    const resBefore = calculatePlayerLongestRoad(board, 'P1');
    expect(resBefore.length).toBe(5);

    // Now place an enemy settlement ('P2') on the shared middle vertex between step 1 and step 2 of the path
    const edgeA = board.edges[resBefore.edgeIds[1]];
    const edgeB = board.edges[resBefore.edgeIds[2]];
    const sharedVertexId = edgeA.vertexIds.find((vId) =>
      edgeB.vertexIds.includes(vId)
    )!;
    board.vertices[sharedVertexId].building = 'SETTLEMENT';
    board.vertices[sharedVertexId].playerId = 'P2';

    const resAfter = calculatePlayerLongestRoad(board, 'P1');
    expect(resAfter.length).toBeLessThan(5);
  });
});

describe('Official Rules & House Rules Engine', () => {
  it('executes Snake Draft setup, disables hex glow during setup, and grants initial resources on second settlement', () => {
    let state = createInitialGameState('TEST01', {
      id: 'P1',
      name: 'Alice',
      color: 'RED',
      avatar: 'A',
    });
    expect(state.config.desertInCenter).toBe(true);
    expect(state.board.hexes['0,0,0'].terrain).toBe('DESERT');
    expect(state.board.robberHexId).toBe('0,0,0');

    state = applyGameAction(state, 'P1', { type: 'ADD_BOT' }).state;
    const p2Id = state.players[1].id;

    state = applyGameAction(state, 'P1', { type: 'START_GAME' }).state;
    expect(state.phase).toBe('ORDER_ROLL');

    // Test rolling for initiative and confirming turn order
    state = applyGameAction(state, 'P1', { type: 'ROLL_FOR_ORDER' }).state;
    expect(state.turn.orderRolls?.['P1']).toBeDefined();

    // Host sets explicit order ['P1', p2Id] and confirms
    state = applyGameAction(state, 'P1', {
      type: 'SET_CUSTOM_PLAYER_ORDER',
      playerIds: ['P1', p2Id],
    }).state;
    state = applyGameAction(state, 'P1', { type: 'CONFIRM_TURN_ORDER' }).state;

    expect(state.phase).toBe('SETUP_SETTLEMENT_1');
    expect(state.turn.setupOrder).toEqual(['P1', p2Id, p2Id, 'P1']);

    // P1 places 1st settlement & road
    const v1 = getValidSettlementVertices(state, 'P1')[0];
    state = applyGameAction(state, 'P1', { type: 'PLACE_SETTLEMENT', vertexId: v1 }).state;
    expect(state.phase).toBe('SETUP_ROAD_1');
    const e1 = state.board.vertices[v1].adjacentEdgeIds[0];
    state = applyGameAction(state, 'P1', { type: 'PLACE_ROAD', edgeId: e1 }).state;

    // P2 places 1st settlement & road
    const v2 = getValidSettlementVertices(state, p2Id)[0];
    state = applyGameAction(state, p2Id, { type: 'PLACE_SETTLEMENT', vertexId: v2 }).state;
    const e2 = state.board.vertices[v2].adjacentEdgeIds[0];
    state = applyGameAction(state, p2Id, { type: 'PLACE_ROAD', edgeId: e2 }).state;

    // Snake Draft reverses: P2 places 2nd settlement & road (no hex glow during setup!)
    expect(state.phase).toBe('SETUP_SETTLEMENT_2');
    expect(state.turn.activePlayerId).toBe(p2Id);
    const v3 = getValidSettlementVertices(state, p2Id)[0];
    state = applyGameAction(state, p2Id, { type: 'PLACE_SETTLEMENT', vertexId: v3 }).state;
    expect(state.lastEvent?.producingHexIds).toEqual([]);
    const e3 = state.board.vertices[v3].adjacentEdgeIds[0];
    state = applyGameAction(state, p2Id, { type: 'PLACE_ROAD', edgeId: e3 }).state;

    // P1 places 2nd settlement & road -> game enters strict WAITING_FOR_DICE phase
    const v4 = getValidSettlementVertices(state, 'P1')[0];
    state = applyGameAction(state, 'P1', { type: 'PLACE_SETTLEMENT', vertexId: v4 }).state;
    const e4 = state.board.vertices[v4].adjacentEdgeIds[0];
    state = applyGameAction(state, 'P1', { type: 'PLACE_ROAD', edgeId: e4 }).state;

    expect(state.phase).toBe('WAITING_FOR_DICE');
    expect(state.turn.activePlayerId).toBe('P1');
    expect(state.turn.hasRolledDice).toBe(false);

    // Verify NO action is allowed before ROLL_DICE
    state.players[0].resources = { WOOD: 5, BRICK: 5, SHEEP: 5, WHEAT: 5, ORE: 5 };
    expect(applyGameAction(state, 'P1', { type: 'BUY_DEV_CARD' }).error).toBeDefined();
    expect(
      applyGameAction(state, 'P1', {
        type: 'BANK_TRADE',
        giveResource: 'WOOD',
        giveAmount: 4,
        receiveResource: 'ORE',
        receiveAmount: 1,
      }).error
    ).toBeDefined();
    expect(applyGameAction(state, 'P1', { type: 'END_TURN' }).error).toBeDefined();
  });

  it('enforces House Rule 1 (minSettlementDistance = 1 vs 2)', () => {
    let state = createInitialGameState('HR1', {
      id: 'P1',
      name: 'Host',
      color: 'RED',
      avatar: 'H',
    });
    state = applyGameAction(state, 'P1', { type: 'ADD_BOT' }).state;
    state = applyGameAction(state, 'P1', { type: 'START_GAME' }).state;

    // Put state in MAIN_PHASE for P1 with plenty of resources
    state.phase = 'MAIN_PHASE';
    state.turn.hasRolledDice = true;
    state.turn.activePlayerId = 'P1';
    state.players[0].resources = { WOOD: 5, BRICK: 5, SHEEP: 5, WHEAT: 5, ORE: 5 };

    // Place a settlement at V0 and a road along an adjacent edge E0 to V_adj
    const v0 = Object.values(state.board.vertices)[0];
    v0.building = 'SETTLEMENT';
    v0.playerId = 'P1';

    const e0Id = v0.adjacentEdgeIds[0];
    const e0 = state.board.edges[e0Id];
    e0.building = 'ROAD';
    e0.playerId = 'P1';

    const vAdjId = e0.vertexIds[0] === v0.id ? e0.vertexIds[1] : e0.vertexIds[0];

    // With Standard Rule (minSettlementDistance = 2), vAdjId is NOT allowed
    state.config.minSettlementDistance = 2;
    expect(getValidSettlementVertices(state, 'P1')).not.toContain(vAdjId);

    // With Custom House Rule (minSettlementDistance = 1), vAdjId IS allowed because connected by own road!
    state.config.minSettlementDistance = 1;
    expect(getValidSettlementVertices(state, 'P1')).toContain(vAdjId);
  });

  it('enforces 3-Sector Turn Action Restrictions (LEVEL_1_FREE, LEVEL_2_LIMITED, LEVEL_3_STRICT)', () => {
    let state = createInitialGameState('HR23', {
      id: 'P1',
      name: 'Host',
      color: 'RED',
      avatar: 'H',
    });
    state.config.turnActionRestriction = 'LEVEL_3_STRICT';
    state.phase = 'MAIN_PHASE';
    state.turn.hasRolledDice = true;
    state.turn.activePlayerId = 'P1';
    state.players[0].resources = { WOOD: 10, BRICK: 10, SHEEP: 10, WHEAT: 10, ORE: 10 };

    // Initially both trading/burning and building are allowed
    expect(canTradeThisTurn(state, 'P1').allowed).toBe(true);
    expect(canSpendOrBuildThisTurn(state, 'P1', true).allowed).toBe(true);

    // Execute a bank burn ("Quemar Cartas") -> building and buying dev cards are locked in LEVEL_3_STRICT!
    state = applyGameAction(state, 'P1', {
      type: 'BANK_TRADE',
      giveResource: 'WOOD',
      giveAmount: 4,
      receiveResource: 'ORE',
      receiveAmount: 1,
    }).state;

    expect(state.turn.hasTradedThisTurn).toBe(true);
    expect(state.turn.tradesAndBurnsThisTurn).toBe(1);
    expect(canSpendOrBuildThisTurn(state, 'P1', true).allowed).toBe(false);
    expect(canBuyDevCard(state, 'P1').allowed).toBe(false);

    // Test LEVEL_2_LIMITED: 1 infrastructure + 1 trade/burn allowed, 2nd trade/burn blocked
    state.config.turnActionRestriction = 'LEVEL_2_LIMITED';
    expect(canTradeThisTurn(state, 'P1').allowed).toBe(false); // already did 1 burn this turn
    expect(canSpendOrBuildThisTurn(state, 'P1', true).allowed).toBe(true); // can still build 1 infrastructure!
  });

  it('audits Maritime Ports (4:1 default, 3:1 general port, 2:1 specific resource port)', () => {
    let state = createInitialGameState('PORTS1', {
      id: 'P1',
      name: 'Marinero',
      color: 'BLUE',
      avatar: 'M',
    });
    state.phase = 'MAIN_PHASE';
    state.turn.hasRolledDice = true;
    state.turn.activePlayerId = 'P1';
    state.players[0].resources = { WOOD: 6, BRICK: 4, SHEEP: 4, WHEAT: 4, ORE: 4 };

    // Find a 3:1 GENERIC port and a 2:1 WOOD port on the board
    const genericPort = state.board.ports.find((p) => p.type === 'GENERIC')!;
    const woodPort = state.board.ports.find((p) => p.type === 'WOOD')!;

    // Place P1 settlement on generic 3:1 port vertex
    const genVertex = state.board.vertices[genericPort.vertexIds[0]];
    genVertex.building = 'SETTLEMENT';
    genVertex.playerId = 'P1';

    // Execute 3:1 trade with BRICK (3 BRICK -> 1 WHEAT)
    const res3to1 = applyGameAction(state, 'P1', {
      type: 'BANK_TRADE',
      giveResource: 'BRICK',
      giveAmount: 3,
      receiveResource: 'WHEAT',
      receiveAmount: 1,
    });
    expect(res3to1.error).toBeUndefined();
    state = res3to1.state;
    expect(state.players[0].resources.BRICK).toBe(1);
    expect(state.players[0].resources.WHEAT).toBe(5);

    // Place P1 settlement on 2:1 WOOD port vertex
    const woodVertex = state.board.vertices[woodPort.vertexIds[0]];
    woodVertex.building = 'SETTLEMENT';
    woodVertex.playerId = 'P1';

    // Execute 2:1 trade with WOOD (2 WOOD -> 1 ORE)
    const res2to1 = applyGameAction(state, 'P1', {
      type: 'BANK_TRADE',
      giveResource: 'WOOD',
      giveAmount: 2,
      receiveResource: 'ORE',
      receiveAmount: 1,
    });
    expect(res2to1.error).toBeUndefined();
    state = res2to1.state;
    expect(state.players[0].resources.WOOD).toBe(4);
    expect(state.players[0].resources.ORE).toBe(5);
  });

  it('audits Development Cards (Buy, allowInstantDevCards false vs true, Monopoly)', () => {
    let state = createInitialGameState('DEV01', {
      id: 'P1',
      name: 'Estratega',
      color: 'RED',
      avatar: 'E',
    });
    state = applyGameAction(state, 'P1', { type: 'ADD_BOT' }).state;
    state.players[1].resources = { WOOD: 3, BRICK: 0, SHEEP: 0, WHEAT: 4, ORE: 0 };

    state.phase = 'MAIN_PHASE';
    state.turn.hasRolledDice = true;
    state.turn.turnNumber = 2;
    state.turn.activePlayerId = 'P1';
    state.players[0].resources = { WOOD: 0, BRICK: 0, SHEEP: 2, WHEAT: 2, ORE: 2 };

    // Force top of devDeck to be a MONOPOLY card so we can test buying + restrictions
    state.devDeck.push({
      id: 'DEV_TEST_MONO',
      type: 'MONOPOLY',
      title: 'Monopolio',
      boughtAtTurn: -1,
      played: false,
    });

    // 1. Buy Dev Card (costs 1 SHEEP, 1 WHEAT, 1 ORE)
    const buyRes = applyGameAction(state, 'P1', { type: 'BUY_DEV_CARD' });
    expect(buyRes.error).toBeUndefined();
    state = buyRes.state;
    expect(state.players[0].devCards.length).toBe(1);

    // 2. Attempt to play on the exact same turn when allowInstantDevCards is false -> must be blocked!
    expect(state.config.allowInstantDevCards).toBe(false);
    const sameTurnPlay = applyGameAction(state, 'P1', {
      type: 'PLAY_DEV_CARD',
      cardId: 'DEV_TEST_MONO',
      monopolyResource: 'WHEAT',
    });
    expect(sameTurnPlay.error).toBeDefined();

    // 3. Enable House Rule allowInstantDevCards = true -> now can be played on the same turn!
    state.config.allowInstantDevCards = true;
    const instantPlay = applyGameAction(state, 'P1', {
      type: 'PLAY_DEV_CARD',
      cardId: 'DEV_TEST_MONO',
      monopolyResource: 'WHEAT',
    });
    expect(instantPlay.error).toBeUndefined();
    state = instantPlay.state;
    // P1 had 1 WHEAT left + 4 confiscated from P2 = 5 WHEAT
    expect(state.players[0].resources.WHEAT).toBe(5);
    expect(state.players[1].resources.WHEAT).toBe(0);
    expect(state.turn.devCardPlayedThisTurn).toBe(true);
    expect(state.lastEvent?.devCardType).toBe('MONOPOLY');
  });

  it('allows keeping the Robber on the same hex and still stealing a card from an adjacent player', () => {
    let state = createInitialGameState('ROBBER01', {
      id: 'P1',
      name: 'Host',
      color: 'RED',
      avatar: 'H',
    });
    state = applyGameAction(state, 'P1', { type: 'ADD_BOT' }).state;
    const p2Id = state.players[1].id;
    state.players[1].resources = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 3, ORE: 0 };

    const currentRobberHexId = state.board.robberHexId;
    const adjVertex = Object.values(state.board.vertices).find((v) =>
      v.hexIds.includes(currentRobberHexId)
    )!;
    adjVertex.building = 'SETTLEMENT';
    adjVertex.playerId = p2Id;

    state.phase = 'ROBBER_MOVE';
    state.turn.activePlayerId = 'P1';
    state.turn.hasRolledDice = true;

    const robRes = applyGameAction(state, 'P1', {
      type: 'MOVE_ROBBER',
      hexId: currentRobberHexId,
    });
    expect(robRes.error).toBeUndefined();
    expect(robRes.state.board.robberHexId).toBe(currentRobberHexId);
    // Since p2 is the sole adjacent victim, card is stolen immediately and phase becomes MAIN_PHASE
    expect(robRes.state.players[0].resources.WHEAT).toBe(1);
    expect(robRes.state.players[1].resources.WHEAT).toBe(2);
    expect(robRes.state.phase).toBe('MAIN_PHASE');
    expect(robRes.state.lastEvent?.type).toBe('CARD_STOLEN');
  });

  it('enforces road connectivity for canBuildSettlement in MAIN_PHASE and validates 54-vertex / 72-edge topology', () => {
    let state = createInitialGameState('TOPO01', {
      id: 'P1',
      name: 'Constructor',
      color: 'RED',
      avatar: 'C',
    });
    state = applyGameAction(state, 'P1', { type: 'ADD_BOT' }).state;

    // A standard 19-land-hex Catan board has exactly 54 land vertices and 72 land edges
    expect(Object.keys(state.board.vertices).length).toBe(54);
    expect(Object.keys(state.board.edges).length).toBe(72);

    state.phase = 'MAIN_PHASE';
    state.turn.hasRolledDice = true;
    state.turn.activePlayerId = 'P1';
    state.players[0].resources = { WOOD: 3, BRICK: 3, SHEEP: 3, WHEAT: 3, ORE: 0 };

    const allVertices = Object.values(state.board.vertices);
    const unconnectedVertex = allVertices[0];

    // Without any owned roads, P1 cannot build a settlement anywhere in MAIN_PHASE
    expect(getValidSettlementVertices(state, 'P1')).toEqual([]);
    const illegalAttempt = applyGameAction(state, 'P1', {
      type: 'PLACE_SETTLEMENT',
      vertexId: unconnectedVertex.id,
    });
    expect(illegalAttempt.error).toBeDefined();

    // Give P1 an owned road connected to unconnectedVertex
    const connectedEdgeId = unconnectedVertex.adjacentEdgeIds[0];
    state.board.edges[connectedEdgeId].building = 'ROAD';
    state.board.edges[connectedEdgeId].playerId = 'P1';

    // Now unconnectedVertex is valid for settlement placement!
    const validAfterRoad = getValidSettlementVertices(state, 'P1');
    expect(validAfterRoad).toContain(unconnectedVertex.id);

    const legalAttempt = applyGameAction(state, 'P1', {
      type: 'PLACE_SETTLEMENT',
      vertexId: unconnectedVertex.id,
    });
    expect(legalAttempt.error).toBeUndefined();
    expect(legalAttempt.state.board.vertices[unconnectedVertex.id].building).toBe('SETTLEMENT');
  });

  it('allows only the Host to pause/resume the game and blocks actions while paused', () => {
    let state = createInitialGameState('PAUSE1', {
      id: 'P1',
      name: 'Host',
      color: 'RED',
      avatar: 'H',
    });
    state = applyGameAction(state, 'P1', { type: 'ADD_BOT' }).state;
    const botId = state.players[1].id;

    state.phase = 'WAITING_FOR_DICE';
    state.turn.activePlayerId = 'P1';

    // Non-host cannot pause
    const nonHostAttempt = applyGameAction(state, botId, { type: 'TOGGLE_HOST_PAUSE' });
    expect(nonHostAttempt.error).toBeDefined();

    // Host pauses the game
    const pauseRes = applyGameAction(state, 'P1', { type: 'TOGGLE_HOST_PAUSE' });
    expect(pauseRes.error).toBeUndefined();
    state = pauseRes.state;
    expect(state.turn.isPausedByHost).toBe(true);
    expect(state.turn.turnDeadlineMs).toBeNull();

    // Rolling dice while paused must be blocked
    const blockedRoll = applyGameAction(state, 'P1', { type: 'ROLL_DICE' });
    expect(blockedRoll.error).toBeDefined();

    // Host resumes the game
    const resumeRes = applyGameAction(state, 'P1', { type: 'TOGGLE_HOST_PAUSE' });
    expect(resumeRes.error).toBeUndefined();
    state = resumeRes.state;
    expect(state.turn.isPausedByHost).toBe(false);
  });

  it('configures bots with difficulty levels (EASY, MEDIUM, HARD) and evaluates BotEngine building & trading behaviors', () => {
    let state = createInitialGameState('BOT_TEST', {
      id: 'P1',
      name: 'Host',
      color: 'RED',
      avatar: 'H',
    });

    // 1. Add bot with explicit HARD difficulty
    state = applyGameAction(state, 'P1', { type: 'ADD_BOT', difficulty: 'HARD' }).state;
    expect(state.players[1].isBot).toBe(true);
    expect(state.players[1].botDifficulty).toBe('HARD');

    // 2. Fill room with bots
    state = applyGameAction(state, 'P1', { type: 'FILL_ROOM_WITH_BOTS', difficulty: 'EASY' }).state;
    expect(state.players.length).toBe(4);
    expect(state.players[2].botDifficulty).toBe('EASY');
    expect(state.players[3].botDifficulty).toBe('EASY');

    // 3. Change individual bot difficulty
    state = applyGameAction(state, 'P1', {
      type: 'SET_BOT_DIFFICULTY',
      targetPlayerId: state.players[2].id,
      difficulty: 'HARD',
    }).state;
    expect(state.players[2].botDifficulty).toBe('HARD');

    // 4. Verify BotEngine trades when missing 1 resource for a Settlement
    const botId = state.players[1].id;
    state.phase = 'MAIN_PHASE';
    state.turn.activePlayerId = botId;
    state.turn.hasRolledDice = true;

    const v0 = Object.values(state.board.vertices)[0];
    const e0Id = v0.adjacentEdgeIds[0];
    state.board.edges[e0Id].building = 'ROAD';
    state.board.edges[e0Id].playerId = botId;

    // Bot has 5 WOOD, 1 BRICK, 1 SHEEP, 0 WHEAT (needs 1 WHEAT to build a settlement, has surplus WOOD)
    state.players[1].resources = { WOOD: 5, BRICK: 1, SHEEP: 1, WHEAT: 0, ORE: 0 };
    // Give P1 some resources so bot proposes a trade first
    state.players[0].resources = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 0 };

    const botStep1 = executeBotStep(state, botId);
    expect(botStep1).not.toBeNull();
    expect(botStep1.activeTradeOffers.length).toBeGreaterThan(0);
    expect(botStep1.turn.botStatusMessage).toContain('propone un trato comercial');
  });
});
