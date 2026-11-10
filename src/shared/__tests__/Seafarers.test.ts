import { describe, it, expect } from 'vitest';
import {
  applyGameAction,
  canBuildShip,
  createInitialGameState,
  getMovableShipEdges,
  getValidRoadEdges,
  getValidShipEdges,
  getValidShipMoveDestinations,
  computeIslandComponents,
  getVertexIslandId,
} from '../engine/RulesEngine';
import { generateSeafarersBoard } from '../engine/HexGrid';
import { BUILDING_COSTS } from '../constants';
import { GameState } from '../types';

describe('Navegantes de Catán (Seafarers Expansion)', () => {
  it('generates the official scenarios with gold hexes, sea hexes, and pirate', () => {
    const headingBoard = generateSeafarersBoard('HEADING_FOR_NEW_SHORES');
    expect(headingBoard.pirateHexId).toBeDefined();
    expect(headingBoard.hexes[headingBoard.pirateHexId!].terrain).toBe('SEA');
    expect(Object.values(headingBoard.hexes).some((h) => h.terrain === 'GOLD')).toBe(true);

    const fourIslandsBoard = generateSeafarersBoard('THE_FOUR_ISLANDS');
    expect(fourIslandsBoard.pirateHexId).toBeDefined();
    // In official rules, The Four Islands has 4 balanced resource islands without gold rivers
    expect(Object.values(fourIslandsBoard.hexes).filter((h) => h.terrain !== 'SEA').length).toBe(23);

    const proceduralBoard = generateSeafarersBoard('PROCEDURAL_ARCHIPELAGO');
    expect(proceduralBoard.pirateHexId).toBeDefined();
    expect(Object.values(proceduralBoard.hexes).some((h) => h.terrain === 'GOLD')).toBe(true);
  });

  it('differentiates 3-player vs 4-player layouts according to the official manual', () => {
    // Escenario 1: Rumbo a nuevas orillas
    const s1_3p = generateSeafarersBoard('HEADING_FOR_NEW_SHORES', true, 62, 3);
    const s1_4p = generateSeafarersBoard('HEADING_FOR_NEW_SHORES', true, 62, 4);
    // 3 jugadores: 14 isla principal + 8 islotes = 22 hexes terrestres, sin desierto, ladrón en cerro 12
    const s1_3p_land = Object.values(s1_3p.hexes).filter((h) => h.terrain !== 'SEA');
    expect(s1_3p_land.length).toBe(22);
    expect(s1_3p_land.some((h) => h.terrain === 'DESERT')).toBe(false);
    expect(s1_3p_land.filter((h) => h.terrain === 'GOLD').length).toBe(2);
    expect(s1_3p.hexes['-3,0,3'].hasRobber).toBe(true); // Cerro 12

    // 4 jugadores: 19 isla principal + 9 islotes = 28 hexes terrestres, desierto con ladrón
    const s1_4p_land = Object.values(s1_4p.hexes).filter((h) => h.terrain !== 'SEA');
    expect(s1_4p_land.length).toBe(28);
    expect(s1_4p_land.some((h) => h.terrain === 'DESERT')).toBe(true);
    expect(s1_4p.hexes['-1,0,1'].hasRobber).toBe(true); // Desierto central

    // Escenario 2: Las cuatro islas
    const s2_3p = generateSeafarersBoard('THE_FOUR_ISLANDS', true, 62, 3);
    const s2_4p = generateSeafarersBoard('THE_FOUR_ISLANDS', true, 62, 4);
    // 3 jugadores: 4 islas de 5 hexes = 20 hexes terrestres
    expect(Object.values(s2_3p.hexes).filter((h) => h.terrain !== 'SEA').length).toBe(20);
    expect(s2_3p.hexes['-2,3,-1'].hasRobber).toBe(true); // Bosque 12 en SO
    // 4 jugadores: 23 hexes terrestres
    expect(Object.values(s2_4p.hexes).filter((h) => h.terrain !== 'SEA').length).toBe(23);
    expect(s2_4p.hexes['1,-1,0'].hasRobber).toBe(true); // Sembrado 12 en NE

    // Escenario 3: Oceanía
    const s3_3p = generateSeafarersBoard('OCEANIA', true, 62, 3);
    const s3_4p = generateSeafarersBoard('OCEANIA', true, 62, 4);
    expect(Object.values(s3_3p.hexes).filter((h) => h.terrain !== 'SEA' && h.terrain !== 'FOG').length).toBe(14);
    expect(Object.values(s3_4p.hexes).filter((h) => h.terrain !== 'SEA' && h.terrain !== 'FOG').length).toBe(17);

    // Escenario 7: Las islas de los piratas
    const s7_3p = generateSeafarersBoard('THE_PIRATE_ISLANDS', true, 62, 3);
    const s7_4p = generateSeafarersBoard('THE_PIRATE_ISLANDS', true, 62, 4);
    expect(s7_3p.pirateFortresses?.['FORTRESS_WHITE']).toBeUndefined();
    expect(s7_4p.pirateFortresses?.['FORTRESS_WHITE']).toBeDefined();
  });

  it('allows building ships with Road Building dev card (Carta Construcción de Carreteras)', () => {
    let state = createInitialGameState('ROOM_ROAD_DEV', {
      id: 'P1',
      name: 'Explorador',
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

    state.phase = 'ROAD_BUILDING_DEV';
    state.turn.activePlayerId = 'P1';
    state.turn.freeRoadsRemaining = 2;

    const p1 = state.players.find((p) => p.id === 'P1')!;
    p1.resources = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 }; // 0 recursos!

    // Find a coastal edge to place a settlement for connectivity
    const coastalEdge = Object.values(state.board.edges).find((e) => e.isCoastal)!;
    const vertex = state.board.vertices[coastalEdge.vertexIds[0]];
    vertex.building = 'SETTLEMENT';
    vertex.playerId = 'P1';

    // Player should be able to build a ship for FREE
    const validShips = getValidShipEdges(state, 'P1');
    expect(validShips.includes(coastalEdge.id)).toBe(true);

    const res = applyGameAction(state, 'P1', {
      type: 'PLACE_SHIP',
      edgeId: coastalEdge.id,
    });

    expect(res.error).toBeUndefined();
    expect(res.state.board.edges[coastalEdge.id].building).toBe('SHIP');
    expect(res.state.turn.freeRoadsRemaining).toBe(1);
    expect(res.state.phase).toBe('ROAD_BUILDING_DEV');
  });

  it('enforces that roads cannot branch directly from ships without a settlement', () => {
    let state = createInitialGameState('ROOM_ROAD_SHIP', {
      id: 'P1',
      name: 'Navegante',
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
    state.turn.activePlayerId = 'P1';
    const p1 = state.players.find((p) => p.id === 'P1')!;
    p1.resources = { WOOD: 10, BRICK: 10, SHEEP: 10, WHEAT: 10, ORE: 10 };

    // Place an isolated ship on a coastal edge without a settlement
    const coastalEdge = Object.values(state.board.edges).find((e) => e.isCoastal)!;
    coastalEdge.building = 'SHIP';
    coastalEdge.playerId = 'P1';

    // Check adjacent land edge
    const v0 = state.board.vertices[coastalEdge.vertexIds[0]];
    v0.building = null;
    v0.playerId = null;

    const adjLandEdgeId = v0.adjacentEdgeIds.find((id) => id !== coastalEdge.id && state.board.edges[id]?.isLand);
    if (adjLandEdgeId) {
      // Trying to place a road directly off the ship without a settlement should NOT be in valid road edges
      const validRoads = getValidRoadEdges(state, 'P1');
      expect(validRoads.includes(adjLandEdgeId)).toBe(false);
    }
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

  it('respects official variants: static ships, pacific mode, and progressive discovery', () => {
    let state = createInitialGameState('ROOM_VARIANTS', {
      id: 'P1',
      name: 'Explorador',
      color: 'BLUE',
      avatar: 'I',
    });

    state = applyGameAction(state, 'P1', {
      type: 'UPDATE_CONFIG',
      config: {
        expansionModule: 'SEAFARERS',
        seafarersMoveShipAllowed: false,
        seafarersPirateMode: 'PACIFIC_NO_PIRATE',
        seafarersDiscoveryVPMode: 'PROGRESSIVE',
      },
    }).state;

    expect(state.config.seafarersMoveShipAllowed).toBe(false);
    expect(state.config.seafarersPirateMode).toBe('PACIFIC_NO_PIRATE');
    expect(state.config.seafarersDiscoveryVPMode).toBe('PROGRESSIVE');

    state.phase = 'MAIN_PHASE';
    state.turn.activePlayerId = 'P1';
    state.turn.hasRolledDice = true;

    // Moving ship should be rejected when seafarersMoveShipAllowed is false
    const moveRes = applyGameAction(state, 'P1', {
      type: 'MOVE_SHIP',
      fromEdgeId: Object.keys(state.board.edges)[0],
      toEdgeId: Object.keys(state.board.edges)[1],
    });
    expect(moveRes.error).toBe('El movimiento de barcos está desactivado en esta partida.');

    // Moving pirate should be rejected in pacific mode
    state.phase = 'ROBBER_MOVE';
    const seaHex = Object.values(state.board.hexes).find((h) => h.terrain === 'SEA')!;
    const pirateRes = applyGameAction(state, 'P1', {
      type: 'MOVE_PIRATE',
      hexId: seaHex.id,
    });
    expect(pirateRes.error).toBe('El Barco Pirata está desactivado en esta partida.');
  });

  it('generates all 9 official scenarios with authentic structures from official manual', () => {
    // Escenario 1: Rumbo a nuevas orillas
    const s1 = generateSeafarersBoard('HEADING_FOR_NEW_SHORES');
    expect(s1.pirateHexId).toBeDefined();

    // Escenario 2: Las cuatro islas
    const s2 = generateSeafarersBoard('THE_FOUR_ISLANDS');
    expect(s2.pirateHexId).toBeDefined();

    // Escenario 3: Oceanía (Tierra ignota)
    const s3 = generateSeafarersBoard('OCEANIA');
    expect(s3.fogDeck).toBeDefined();
    expect(s3.fogDeck!.length).toBeGreaterThan(0);
    expect(Object.values(s3.hexes).some((h) => h.terrain === 'FOG')).toBe(true);

    // Escenario 4: A través del desierto
    const s4 = generateSeafarersBoard('THROUGH_THE_DESERT');
    const desertCount = Object.values(s4.hexes).filter((h) => h.terrain === 'DESERT').length;
    expect(desertCount).toBeGreaterThanOrEqual(3);

    // Escenario 5: El pueblo perdido
    const s5 = generateSeafarersBoard('THE_FORGOTTEN_TRIBE');
    expect(s5.forgottenGifts).toBeDefined();
    expect(Object.keys(s5.forgottenGifts!).length).toBe(4);

    // Escenario 6: Telas para Catán
    const s6 = generateSeafarersBoard('CLOTH_FOR_CATAN');
    expect(s6.nativeVillages).toBeDefined();
    expect(Object.keys(s6.nativeVillages!).length).toBe(4);

    // Escenario 7: Las islas de los piratas
    const s7 = generateSeafarersBoard('THE_PIRATE_ISLANDS');
    expect(s7.pirateFleetRouteHexIds).toBeDefined();
    expect(s7.pirateFleetHexId).toBeDefined();
    expect(s7.pirateFortresses).toBeDefined();
    expect(s7.robberHexId).toBe(''); // Oficial: sin ladrón en escenario 7

    // Escenario 8: Las maravillas catanas
    const s8 = generateSeafarersBoard('WONDERS_OF_CATAN');
    expect(s8.wondersState).toBeDefined();

    // Escenario 9: Un nuevo mundo
    const s9 = generateSeafarersBoard('NEW_WORLD');
    expect(Object.values(s9.hexes).some((h) => h.terrain === 'GOLD')).toBe(true);
  });

  it('uncovers fog and awards free resource upon reaching a fog hex in Oceania', () => {
    let state = createInitialGameState('ROOM_OCEANIA', {
      id: 'P1',
      name: 'Explorador',
      color: 'BLUE',
      avatar: 'I',
    });

    state.config.expansionModule = 'SEAFARERS';
    state.config.seafarersScenario = 'OCEANIA';
    state.board = generateSeafarersBoard('OCEANIA');

    state.phase = 'MAIN_PHASE';
    state.turn.activePlayerId = 'P1';
    state.turn.hasRolledDice = true;

    // Find an edge adjacent to a FOG hex
    const fogHex = Object.values(state.board.hexes).find((h) => h.terrain === 'FOG')!;
    const adjacentEdge = Object.values(state.board.edges).find((e) => e.hexIds.includes(fogHex.id))!;

    // Player builds a ship on that edge
    adjacentEdge.building = 'SHIP';
    adjacentEdge.playerId = 'P1';

    // Place a ship via PLACE_SHIP or trigger fog uncover
    state.players[0].resources.WOOD = 1;
    state.players[0].resources.SHEEP = 1;

    // Setup an adjacent settlement to make edge valid
    const v = state.board.vertices[adjacentEdge.vertexIds[0]];
    v.building = 'SETTLEMENT';
    v.playerId = 'P1';

    // Another coastal edge adjacent to settlement and touching fog
    const fogEdge2 = Object.values(state.board.edges).find(
      (e) => e.id !== adjacentEdge.id && e.hexIds.includes(fogHex.id) && (e.vertexIds[0] === v.id || e.vertexIds[1] === v.id)
    );

    if (fogEdge2) {
      const res = applyGameAction(state, 'P1', {
        type: 'PLACE_SHIP',
        edgeId: fogEdge2.id,
      });
      state = res.state;
      expect(state.board.hexes[fogHex.id].terrain).not.toBe('FOG');
      expect(state.board.revealedHexIds).toContain(fogHex.id);
    }
  });

  it('collects cloth bales in Cloth for Catan and converts 2 cloth = 1 VP', () => {
    let state = createInitialGameState('ROOM_CLOTH', {
      id: 'P1',
      name: 'Mercader',
      color: 'BLUE',
      avatar: 'I',
    });

    state.config.expansionModule = 'SEAFARERS';
    state.config.seafarersScenario = 'CLOTH_FOR_CATAN';
    state.board = generateSeafarersBoard('CLOTH_FOR_CATAN');

    state.phase = 'MAIN_PHASE';
    state.turn.activePlayerId = 'P1';

    // Player collects 4 cloth bales
    state.players[0].clothBales = 4;
    // Recalculate VP
    state = applyGameAction(state, 'P1', {
      type: 'END_TURN',
    }).state;

    // 4 cloth bales = 2 Victory Points!
    expect(state.players[0].publicVictoryPoints).toBe(2);
    expect(state.players[0].totalVictoryPoints).toBe(2);
  });

  it('manages wonders in Wonders of Catan and wins upon completing stage 4', () => {
    let state = createInitialGameState('ROOM_WONDERS', {
      id: 'P1',
      name: 'Arquitecto',
      color: 'BLUE',
      avatar: 'I',
    });

    state.config.expansionModule = 'SEAFARERS';
    state.config.seafarersScenario = 'WONDERS_OF_CATAN';
    state.board = generateSeafarersBoard('WONDERS_OF_CATAN');

    state.phase = 'MAIN_PHASE';
    state.turn.activePlayerId = 'P1';
    state.turn.hasRolledDice = true;

    // Place a settlement touching desert for GREAT_WALL
    const desertHex = Object.values(state.board.hexes).find((h) => h.terrain === 'DESERT')!;
    const desertVertex = Object.values(state.board.vertices).find((v) => v.hexIds.includes(desertHex.id))!;
    desertVertex.building = 'SETTLEMENT';
    desertVertex.playerId = 'P1';

    // Start Great Wall wonder
    const startRes = applyGameAction(state, 'P1', {
      type: 'START_WONDER',
      wonderId: 'GREAT_WALL',
    });

    state = startRes.state;
    expect(state.players[0].activeWonderId).toBe('GREAT_WALL');
    expect(state.players[0].wonderStage).toBe(0);

    // Provide resources to build Stage 1
    state.players[0].resources = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 1 };
    const stage1Res = applyGameAction(state, 'P1', {
      type: 'BUILD_WONDER_STAGE',
    });
    state = stage1Res.state;
    expect(state.players[0].wonderStage).toBe(1);

    // Advance to Stage 4 and verify immediate victory!
    state.players[0].wonderStage = 3;
    state.players[0].resources = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 1 };

    const stage4Res = applyGameAction(state, 'P1', {
      type: 'BUILD_WONDER_STAGE',
    });
    state = stage4Res.state;
    expect(state.players[0].wonderStage).toBe(4);
    expect(state.winnerId).toBe('P1');
    expect(state.phase).toBe('GAME_OVER');
  });

  it('supports pirate islands warfare: convert warship, attack fortress, and victory upon conquest', () => {
    let state = createInitialGameState('ROOM_PIRATE_ISLANDS', {
      id: 'P1',
      name: 'Almirante',
      color: 'BLUE',
      avatar: 'I',
    });

    state.config.expansionModule = 'SEAFARERS';
    state.config.seafarersScenario = 'THE_PIRATE_ISLANDS';
    state.config.victoryPointsTarget = 10;
    state.board = generateSeafarersBoard('THE_PIRATE_ISLANDS');

    state.phase = 'MAIN_PHASE';
    state.turn.activePlayerId = 'P1';
    state.turn.hasRolledDice = true;

    // Convert ship to warship with Knight card
    state.players[0].devCards.push({
      id: 'DEV_KNIGHT_1',
      type: 'KNIGHT',
      title: 'Caballero',
      boughtAtTurn: 1,
      played: false,
    });

    const anyEdge = Object.values(state.board.edges)[0];
    anyEdge.building = 'SHIP';
    anyEdge.playerId = 'P1';

    const warshipRes = applyGameAction(state, 'P1', {
      type: 'CONVERT_SHIP_TO_WARSHIP',
      edgeId: anyEdge.id,
    });
    state = warshipRes.state;
    expect(state.board.edges[anyEdge.id].isWarship).toBe(true);
    expect(state.players[0].warshipsCount).toBe(1);

    // Place warship adjacent to fortress BLUE
    const fortress = state.board.pirateFortresses!['FORTRESS_BLUE'];
    const fVertex = state.board.vertices[fortress.vertexId];
    const adjFortressEdge = state.board.edges[fVertex.adjacentEdgeIds[0]];
    adjFortressEdge.building = 'SHIP';
    adjFortressEdge.playerId = 'P1';

    // Attack fortress 3 times to destroy it
    state = applyGameAction(state, 'P1', {
      type: 'ATTACK_PIRATE_FORTRESS',
      fortressId: 'FORTRESS_BLUE',
    }).state;
    expect(state.board.pirateFortresses!['FORTRESS_BLUE'].chitsRemaining).toBe(2);

    state = applyGameAction(state, 'P1', {
      type: 'ATTACK_PIRATE_FORTRESS',
      fortressId: 'FORTRESS_BLUE',
    }).state;
    expect(state.board.pirateFortresses!['FORTRESS_BLUE'].chitsRemaining).toBe(1);

    state = applyGameAction(state, 'P1', {
      type: 'ATTACK_PIRATE_FORTRESS',
      fortressId: 'FORTRESS_BLUE',
    }).state;
    expect(state.board.pirateFortresses!['FORTRESS_BLUE'].chitsRemaining).toBe(0);
    expect(state.players[0].conqueredPirateFortress).toBe(true);

    // With 10 VP and conquered fortress, player wins!
    state.players[0].discoveryVictoryPoints = 10;
    state = applyGameAction(state, 'P1', {
      type: 'END_TURN',
    }).state;
    expect(state.winnerId).toBe('P1');
    expect(state.phase).toBe('GAME_OVER');
  });
});
