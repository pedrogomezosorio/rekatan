import { describe, it, expect } from 'vitest';
import {
  applyGameAction,
  canBuildShip,
  createInitialGameState,
  getMovableShipEdges,
  getValidShipEdges,
  getValidShipMoveDestinations,
  computeIslandComponents,
  getVertexIslandId,
} from '../engine/RulesEngine';
import { generateSeafarersBoard } from '../engine/HexGrid';
import { BUILDING_COSTS } from '../constants';
import { GameState } from '../types';

describe('Navegantes de Catán (Seafarers Expansion)', () => {
  it('generates the 3 official scenarios with gold hexes, sea hexes, and pirate', () => {
    const headingBoard = generateSeafarersBoard('HEADING_FOR_NEW_SHORES');
    expect(headingBoard.pirateHexId).toBeDefined();
    expect(headingBoard.hexes[headingBoard.pirateHexId!].terrain).toBe('SEA');
    expect(Object.values(headingBoard.hexes).some((h) => h.terrain === 'GOLD')).toBe(true);

    const fourIslandsBoard = generateSeafarersBoard('THE_FOUR_ISLANDS');
    expect(fourIslandsBoard.pirateHexId).toBeDefined();
    expect(Object.values(fourIslandsBoard.hexes).some((h) => h.terrain === 'GOLD')).toBe(true);

    const proceduralBoard = generateSeafarersBoard('PROCEDURAL_ARCHIPELAGO');
    expect(proceduralBoard.pirateHexId).toBeDefined();
    expect(Object.values(proceduralBoard.hexes).some((h) => h.terrain === 'GOLD')).toBe(true);
  });

  it('correctly configures Seafarers in lobby with 13 VP default and scenario board', () => {
    let state = createInitialGameState('TEST_ROOM', {
      id: 'HOST_P1',
      name: 'Capitán',
      color: 'BLUE',
      avatar: 'I',
    });

    // Host selects Seafarers expansion
    const res = applyGameAction(state, 'HOST_P1', {
      type: 'UPDATE_CONFIG',
      config: {
        expansionModule: 'SEAFARERS',
        seafarersScenario: 'HEADING_FOR_NEW_SHORES',
      },
    });

    state = res.state;
    expect(state.config.expansionModule).toBe('SEAFARERS');
    expect(state.config.victoryPointsTarget).toBe(13);
    expect(state.board.pirateHexId).toBeDefined();
    expect(state.players[0].shipsLeft).toBe(15);
  });

  it('allows building a ship in MAIN_PHASE with 1 Wood and 1 Sheep and connects to player network', () => {
    let state = createInitialGameState('ROOM_SHIPS', {
      id: 'P1',
      name: 'Navegante 1',
      color: 'BLUE',
      avatar: 'I',
    });

    state = applyGameAction(state, 'P1', {
      type: 'UPDATE_CONFIG',
      config: {
        expansionModule: 'SEAFARERS',
        seafarersScenario: 'HEADING_FOR_NEW_SHORES',
      },
    }).state;

    // Start game & setup settlement on a coastal vertex
    state.phase = 'MAIN_PHASE';
    state.turn.hasRolledDice = true;
    state.turn.activePlayerId = 'P1';

    // Find a coastal vertex
    const coastalVertex = Object.values(state.board.vertices).find((v) => v.isCoastal && v.isLand)!;
    coastalVertex.building = 'SETTLEMENT';
    coastalVertex.playerId = 'P1';

    // Find an adjacent water/coastal edge
    const coastalEdgeId = coastalVertex.adjacentEdgeIds.find((eId) => {
      const e = state.board.edges[eId];
      return e && (!e.isLand || e.isCoastal);
    })!;

    // Give player resources for a ship
    state.players[0].resources.WOOD = 1;
    state.players[0].resources.SHEEP = 1;

    const validShips = getValidShipEdges(state, 'P1');
    expect(validShips).toContain(coastalEdgeId);

    const buildRes = applyGameAction(state, 'P1', {
      type: 'PLACE_SHIP',
      edgeId: coastalEdgeId,
    });

    state = buildRes.state;
    expect(state.board.edges[coastalEdgeId].building).toBe('SHIP');
    expect(state.board.edges[coastalEdgeId].playerId).toBe('P1');
    expect(state.players[0].resources.WOOD).toBe(0);
    expect(state.players[0].resources.SHEEP).toBe(0);
    expect(state.players[0].shipsLeft).toBe(14);
  });

  it('supports moving an open ship once per turn', () => {
    let state = createInitialGameState('ROOM_MOVE_SHIP', {
      id: 'P1',
      name: 'Navegante 1',
      color: 'BLUE',
      avatar: 'I',
    });

    state = applyGameAction(state, 'P1', {
      type: 'UPDATE_CONFIG',
      config: {
        expansionModule: 'SEAFARERS',
        seafarersScenario: 'HEADING_FOR_NEW_SHORES',
      },
    }).state;

    state.phase = 'MAIN_PHASE';
    state.turn.hasRolledDice = true;
    state.turn.activePlayerId = 'P1';

    // Place coastal settlement
    const coastalVertex = Object.values(state.board.vertices).find((v) => v.isCoastal && v.isLand)!;
    coastalVertex.building = 'SETTLEMENT';
    coastalVertex.playerId = 'P1';

    // Place ship 1
    const edge1Id = coastalVertex.adjacentEdgeIds[0];
    state.board.edges[edge1Id].building = 'SHIP';
    state.board.edges[edge1Id].playerId = 'P1';

    // Ship 1 has an open end
    const movable = getMovableShipEdges(state, 'P1');
    expect(movable).toContain(edge1Id);

    // Another coastal edge adjacent to the settlement
    const edge2Id = coastalVertex.adjacentEdgeIds.find((eId) => eId !== edge1Id && (!state.board.edges[eId].isLand || state.board.edges[eId].isCoastal))!;

    const moveRes = applyGameAction(state, 'P1', {
      type: 'MOVE_SHIP',
      fromEdgeId: edge1Id,
      toEdgeId: edge2Id,
    });

    state = moveRes.state;
    expect(state.board.edges[edge1Id].building).toBeNull();
    expect(state.board.edges[edge2Id].building).toBe('SHIP');
    expect(state.players[0].hasMovedShipThisTurn).toBe(true);

    // Cannot move a second time in the same turn
    const secondMove = applyGameAction(state, 'P1', {
      type: 'MOVE_SHIP',
      fromEdgeId: edge2Id,
      toEdgeId: edge1Id,
    });
    expect(secondMove.error).toBeDefined();
  });

  it('moves the pirate to a sea hex and steals resources from opponents with adjacent ships', () => {
    let state = createInitialGameState('ROOM_PIRATE', {
      id: 'P1',
      name: 'Capitán 1',
      color: 'BLUE',
      avatar: 'I',
    });

    state.players.push({
      id: 'P2',
      name: 'Rival 2',
      color: 'RED',
      avatar: 'II',
      isHost: false,
      isBot: false,
      connected: true,
      status: 'ACTIVE',
      resources: { WOOD: 2, BRICK: 1, SHEEP: 1, WHEAT: 0, ORE: 0 },
      devCards: [],
      knightsPlayed: 0,
      longestRoadLength: 0,
      longestRoadEdgeIds: [],
      settlementsLeft: 5,
      citiesLeft: 4,
      roadsLeft: 15,
      shipsLeft: 14,
      publicVictoryPoints: 0,
      totalVictoryPoints: 0,
      mustDiscardCount: 0,
    });

    state = applyGameAction(state, 'P1', {
      type: 'UPDATE_CONFIG',
      config: {
        expansionModule: 'SEAFARERS',
        seafarersScenario: 'HEADING_FOR_NEW_SHORES',
      },
    }).state;

    // Place P2 ship on an edge bordering a sea hex
    const seaHex = Object.values(state.board.hexes).find((h) => h.terrain === 'SEA')!;
    const borderingEdge = Object.values(state.board.edges).find((e) => e.hexIds.includes(seaHex.id))!;
    borderingEdge.building = 'SHIP';
    borderingEdge.playerId = 'P2';

    state.phase = 'ROBBER_MOVE';
    state.turn.activePlayerId = 'P1';

    // P1 moves Pirate onto seaHex
    const pirateRes = applyGameAction(state, 'P1', {
      type: 'MOVE_PIRATE',
      hexId: seaHex.id,
    });

    state = pirateRes.state;
    expect(state.board.pirateHexId).toBe(seaHex.id);
    // Since P2 was the only victim, automatically stole 1 card
    expect(state.players[1].resources.WOOD + state.players[1].resources.BRICK + state.players[1].resources.SHEEP).toBe(3);
    expect(state.players[0].resources.WOOD + state.players[0].resources.BRICK + state.players[0].resources.SHEEP).toBe(1);
    expect(state.phase).toBe('MAIN_PHASE');
  });

  it('claims gold resources when rolling numbers on Río de Oro', () => {
    let state = createInitialGameState('ROOM_GOLD', {
      id: 'P1',
      name: 'P1',
      color: 'BLUE',
      avatar: 'I',
    });

    state = applyGameAction(state, 'P1', {
      type: 'UPDATE_CONFIG',
      config: {
        expansionModule: 'SEAFARERS',
        seafarersScenario: 'HEADING_FOR_NEW_SHORES',
      },
    }).state;

    state.turn.pendingGoldClaims = [{ playerId: 'P1', amount: 2 }];

    const claimRes = applyGameAction(state, 'P1', {
      type: 'CLAIM_GOLD_RESOURCE',
      resource: 'ORE',
    });

    state = claimRes.state;
    expect(state.players[0].resources.ORE).toBe(1);
    expect(state.turn.pendingGoldClaims?.[0]?.amount).toBe(1);

    // Claim second resource
    const claimRes2 = applyGameAction(state, 'P1', {
      type: 'CLAIM_GOLD_RESOURCE',
      resource: 'WHEAT',
    });
    state = claimRes2.state;
    expect(state.players[0].resources.WHEAT).toBe(1);
    expect(state.turn.pendingGoldClaims?.length).toBe(0);
  });

  it('awards +2 Discovery Victory Points for colonizing a foreign island', () => {
    let state = createInitialGameState('ROOM_DISCOVERY', {
      id: 'P1',
      name: 'Colono',
      color: 'BLUE',
      avatar: 'I',
    });

    state = applyGameAction(state, 'P1', {
      type: 'UPDATE_CONFIG',
      config: {
        expansionModule: 'SEAFARERS',
        seafarersScenario: 'HEADING_FOR_NEW_SHORES',
      },
    }).state;

    state.phase = 'MAIN_PHASE';
    state.turn.hasRolledDice = true;
    state.turn.activePlayerId = 'P1';

    const islandMap = computeIslandComponents(state.board);
    const islandIds = Array.from(new Set(islandMap.values()));
    expect(islandIds.length).toBeGreaterThan(1);

    const islandA = islandIds[0];
    const islandB = islandIds[1];

    // Player already has a starting settlement on islandA
    const vertexA = Object.values(state.board.vertices).find(
      (v) => v.isLand && getVertexIslandId(state.board, v.id, islandMap) === islandA
    )!;
    vertexA.building = 'SETTLEMENT';
    vertexA.playerId = 'P1';

    // Player connects and builds a new settlement on islandB
    const vertexB = Object.values(state.board.vertices).find(
      (v) => v.isLand && getVertexIslandId(state.board, v.id, islandMap) === islandB
    )!;

    // Connect a ship to vertexB so settlement building rule is satisfied
    const adjEdgeToB = state.board.edges[vertexB.adjacentEdgeIds[0]];
    adjEdgeToB.building = 'SHIP';
    adjEdgeToB.playerId = 'P1';

    // Give player resources for settlement
    state.players[0].resources = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 };

    const placeRes = applyGameAction(state, 'P1', {
      type: 'PLACE_SETTLEMENT',
      vertexId: vertexB.id,
    });

    state = placeRes.state;
    expect(state.players[0].discoveryVictoryPoints).toBe(2);
    // 1 VP from settlement A + 1 VP from settlement B + 2 Discovery VP = 4 VP
    expect(state.players[0].publicVictoryPoints).toBe(4);
    expect(state.players[0].totalVictoryPoints).toBe(4);
  });
});
