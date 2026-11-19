import { describe, expect, it } from 'vitest';
import {
  applyGameAction,
  createInitialGameState,
  getPlayerBankTradeRatios,
  recalculateVictoryPoints,
} from '../engine/RulesEngine';
import { getValidCamelEdges } from '../engine/BarbariansEngine';
import type {
  BarbariansScenario,
  ExplorersPiratesScenario,
  GameAction,
  GameState,
} from '../types';

function act(state: GameState, playerId: string, action: GameAction): GameState {
  const res = applyGameAction(state, playerId, action);
  if (res.error) {
    throw new Error(`Error al aplicar ${action.type}: ${res.error}`);
  }
  return res.state;
}

function createMBTestState(
  scenario: BarbariansScenario,
  boardMode: 'STANDARD_3_4' | 'EXPANSION_5_6' = 'STANDARD_3_4',
  variants?: {
    friendlyRobber?: boolean;
    catanEventsDeck?: boolean;
    harborMaster?: boolean;
    catanForTwo?: boolean;
  }
): GameState {
  let s = createInitialGameState('MBTEST', {
    id: 'p1',
    name: 'Jugador 1',
    color: 'RED',
    avatar: 'I',
  });
  const maxPlayers = boardMode === 'EXPANSION_5_6' ? 6 : 4;
  s = act(s, 'p1', {
    type: 'UPDATE_CONFIG',
    config: {
      expansionModule: 'BARBARIANS',
      barbariansScenario: scenario,
      boardMode,
      maxPlayers,
      barbariansVariants: {
        friendlyRobber: Boolean(variants?.friendlyRobber),
        catanEventsDeck: Boolean(variants?.catanEventsDeck),
        harborMaster: Boolean(variants?.harborMaster),
        catanForTwo: Boolean(variants?.catanForTwo),
      },
    },
  });
  s = act(s, 'p1', { type: 'ADD_BOT' });
  s = act(s, 'p1', { type: 'ADD_BOT' });
  if (boardMode === 'EXPANSION_5_6') {
    s = act(s, 'p1', { type: 'ADD_BOT' });
    s = act(s, 'p1', { type: 'ADD_BOT' });
  }
  s = act(s, 'p1', { type: 'START_GAME' });
  s.phase = 'MAIN_PHASE';
  s.turn.activePlayerId = 'p1';
  s.turn.hasRolledDice = true;
  return s;
}

function createEPTestState(
  scenario: ExplorersPiratesScenario,
  boardMode: 'STANDARD_3_4' | 'EXPANSION_5_6' = 'STANDARD_3_4'
): GameState {
  let s = createInitialGameState('EPTEST', {
    id: 'p1',
    name: 'Explorador 1',
    color: 'RED',
    avatar: 'I',
  });
  const maxPlayers = boardMode === 'EXPANSION_5_6' ? 6 : 4;
  s = act(s, 'p1', {
    type: 'UPDATE_CONFIG',
    config: {
      expansionModule: 'EXPLORERS_AND_PIRATES',
      explorersPiratesScenario: scenario,
      boardMode,
      maxPlayers,
    },
  });
  s = act(s, 'p1', { type: 'ADD_BOT' });
  s = act(s, 'p1', { type: 'ADD_BOT' });
  if (boardMode === 'EXPANSION_5_6') {
    s = act(s, 'p1', { type: 'ADD_BOT' });
    s = act(s, 'p1', { type: 'ADD_BOT' });
  }
  s = act(s, 'p1', { type: 'START_GAME' });
  s.phase = 'MAIN_PHASE';
  s.turn.activePlayerId = 'p1';
  s.turn.hasRolledDice = true;
  return s;
}

describe('Expansión 1: Mercaderes y Bárbaros (BARBARIANS) - 3-4 y 5-6 Jugadores', () => {
  it('inicializa correctamente los 5 escenarios en modo estándar (3-4J) y ampliación (5-6J)', () => {
    const scenarios: BarbariansScenario[] = [
      'FISHERMEN_OF_CATAN',
      'RIVERS_OF_CATAN',
      'THE_CARAVANS',
      'BARBARIAN_ATTACK',
      'TRADERS_AND_BARBARIANS',
    ];
    for (const sc of scenarios) {
      const s34 = createMBTestState(sc, 'STANDARD_3_4');
      expect(s34.barbarians).toBeDefined();
      expect(s34.barbarians?.scenario).toBe(sc);

      const s56 = createMBTestState(sc, 'EXPANSION_5_6');
      expect(s56.barbarians).toBeDefined();
      expect(s56.barbarians?.scenario).toBe(sc);
      expect(s56.players.length).toBe(5);
      expect(Object.keys(s56.board.hexes).length).toBeGreaterThan(
        Object.keys(s34.board.hexes).length
      );
    }
  });

  it('Escenario 1 (Los pescadores de Catán): gestiona el lago central, la Bota Vieja y las 5 compras con pescado', () => {
    let s = createMBTestState('FISHERMEN_OF_CATAN');
    const mb = s.barbarians!;
    expect(mb.lakeHexIds.length).toBeGreaterThan(0);
    expect(mb.fishingGrounds.length).toBeGreaterThan(0);

    const p1 = s.players.find((p) => p.id === 'p1')!;
    const p2 = s.players.find((p) => p.id !== 'p1')!;

    // Entregar Bota Vieja cuando p2 tiene al menos tantos PV como p1
    p1.barbarians!.hasOldBoot = true;
    p1.publicVictoryPoints = 4;
    p2.publicVictoryPoints = 4;
    s = act(s, 'p1', {
      type: 'MB_PASS_OLD_BOOT',
      targetPlayerId: p2.id,
    });
    expect(s.players.find((p) => p.id === 'p1')!.barbarians!.hasOldBoot).toBe(false);
    expect(s.players.find((p) => p.id === p2.id)!.barbarians!.hasOldBoot).toBe(true);

    // Gastar 2 pescados para retirar al Ladrón del tablero
    const p1After = s.players.find((p) => p.id === 'p1')!;
    p1After.barbarians!.fishTokens = [
      { id: 'f1', fishCount: 2 },
      { id: 'f2', fishCount: 3 },
      { id: 'f3', fishCount: 3 },
    ];
    s = act(s, 'p1', {
      type: 'MB_FISH_REMOVE_ROBBER',
      tokenIds: ['f1'],
    });
    expect(s.board.robberHexId).toBe('');

    // Gastar 4 pescados para tomar 1 recurso de la banca
    const woodBefore = s.players.find((p) => p.id === 'p1')!.resources.WOOD;
    s = act(s, 'p1', {
      type: 'MB_FISH_BANK_RESOURCE',
      tokenIds: ['f2', 'f3'],
      resource: 'WOOD',
    });
    expect(s.players.find((p) => p.id === 'p1')!.resources.WOOD).toBe(woodBefore + 1);
  });

  it('Escenario 2 (Los ríos de Catán): construye puentes (+1 PV), calcula Colono Más Rico/Pobre y mercado de oro', () => {
    let s = createMBTestState('RIVERS_OF_CATAN');
    const mb = s.barbarians!;
    expect(mb.riverHexIds.length).toBeGreaterThan(0);
    expect(mb.bridgeSiteEdgeIds.length).toBeGreaterThan(0);

    const p1 = s.players.find((p) => p.id === 'p1')!;
    const bridgeEdgeId = mb.bridgeSiteEdgeIds[0];
    const bridgeEdge = s.board.edges[bridgeEdgeId];
    // Conectar vértice del puente con un poblado de p1
    s.board.vertices[bridgeEdge.vertexIds[0]].building = 'SETTLEMENT';
    s.board.vertices[bridgeEdge.vertexIds[0]].playerId = 'p1';
    p1.resources.BRICK = 2;
    p1.resources.WOOD = 1;

    s = act(s, 'p1', {
      type: 'MB_PLACE_BRIDGE',
      edgeId: bridgeEdgeId,
    });
    expect(s.board.edges[bridgeEdgeId].hasBridge).toBe(true);
    expect(s.barbarians!.bridgeOwners[bridgeEdgeId]).toBe('p1');

    // Mercado de oro: 2 monedas -> 1 materia prima
    const p1Now = s.players.find((p) => p.id === 'p1')!;
    p1Now.barbarians!.goldCoins = 6;
    const oreBefore = p1Now.resources.ORE;
    s = act(s, 'p1', {
      type: 'MB_BUY_RESOURCE_WITH_GOLD',
      resource: 'ORE',
    });
    expect(s.players.find((p) => p.id === 'p1')!.resources.ORE).toBe(oreBefore + 1);
    expect(s.players.find((p) => p.id === 'p1')!.barbarians!.goldCoins).toBe(4);
    // p1 tiene más oro que los demás -> Colono más rico (+1 PV)
    expect(s.players.find((p) => p.id === 'p1')!.barbarians!.isWealthiestSettler).toBe(true);
  });

  it('Escenario 3 (La ruta de las caravanas): extiende camellos desde el Oasis y duplica valor de carreteras en Gran Ruta', () => {
    let s = createMBTestState('THE_CARAVANS');
    expect(s.barbarians!.oasisHexIds.length).toBe(1);
    const validCamelEdges = getValidCamelEdges(s);
    expect(validCamelEdges.length).toBeGreaterThan(0);

    const targetEdge = validCamelEdges[0];
    s = act(s, 'p1', {
      type: 'MB_VOTE_CAMEL',
      edgeId: targetEdge,
    });
    expect(s.barbarians!.camelEdgeIds).toContain(targetEdge);
  });

  it('Escenario 4 (El ataque de los bárbaros): recluta caballeros en aristas, los mueve y expulsa bárbaros ganando cautivos', () => {
    let s = createMBTestState('BARBARIAN_ATTACK');
    const mb = s.barbarians!;
    expect(mb.castleHexIds.length).toBeGreaterThan(0);

    const castleHexId = mb.castleHexIds[0];
    const castleEdge = Object.values(s.board.edges).find(
      (e) => e.isLand && e.hexIds.includes(castleHexId)
    )!;
    s = act(s, 'p1', {
      type: 'MB_PLACE_EDGE_KNIGHT',
      edgeId: castleEdge.id,
      anywhere: true,
    });
    expect(s.barbarians!.edgeKnights[castleEdge.id]).toBeDefined();

    // Colocar 1 bárbaro en el hexágono adyacente y expulsarlo
    const targetHexId = castleEdge.hexIds[0];
    s.barbarians!.hexBarbarians[targetHexId] = 1;
    s = act(s, 'p1', {
      type: 'MB_EXPEL_HEX_BARBARIANS',
      hexId: targetHexId,
    });
    expect(s.barbarians!.hexBarbarians[targetHexId]).toBe(0);
    expect(s.players.find((p) => p.id === 'p1')!.barbarians!.prisonersCount).toBe(1);
  });

  it('Escenario 5 (Mercaderes y Bárbaros): mueve y mejora el Carromato entregando mercancías entre los 3 destinos', () => {
    let s = createMBTestState('TRADERS_AND_BARBARIANS');
    const mb = s.barbarians!;
    expect(Object.keys(mb.destinationHexes).length).toBe(3);

    const p1 = s.players.find((p) => p.id === 'p1')!;
    expect(p1.barbarians!.wagonLevel).toBe(1);
    expect(p1.barbarians!.activeCommodityTile).toBeTruthy();

    // Mejorar carromato a Nivel 2 (1 oveja + 1 madera)
    p1.resources.SHEEP = 2;
    p1.resources.WOOD = 2;
    s = act(s, 'p1', { type: 'MB_UPGRADE_WAGON' });
    expect(s.players.find((p) => p.id === 'p1')!.barbarians!.wagonLevel).toBe(2);

    // Mover carromato a un vértice adyacente
    const currentVid = s.players.find((p) => p.id === 'p1')!.barbarians!.wagonVertexId!;
    const adjVid = s.board.vertices[currentVid].adjacentVertexIds.find(
      (vid) => s.board.vertices[vid]?.isLand
    )!;
    s.players.find((p) => p.id === 'p1')!.barbarians!.wagonMpRemaining = 6;
    s = act(s, 'p1', {
      type: 'MB_MOVE_WAGON',
      toVertexId: adjVid,
    });
    expect(s.players.find((p) => p.id === 'p1')!.barbarians!.wagonVertexId).toBe(adjVid);
  });

  it('Variantes (Cartas de Evento, Capitán de Puerto y Catán para Dos) funcionan según el reglamento', () => {
    let s = createMBTestState('FISHERMEN_OF_CATAN', 'STANDARD_3_4', {
      friendlyRobber: true,
      catanEventsDeck: true,
      harborMaster: true,
      catanForTwo: true,
    });
    expect(s.barbarians!.eventDeck.length).toBe(37);

    // Capitán de puerto: 2 ciudades en puertos = 4 puntos de puerto -> obtiene +2 PV
    const portVertices = Object.values(s.board.vertices).filter((v) => v.port !== null);
    portVertices[0].building = 'CITY';
    portVertices[0].playerId = 'p1';
    portVertices[1].building = 'CITY';
    portVertices[1].playerId = 'p1';
    recalculateVictoryPoints(s);
    expect(s.barbarians!.harborMasterPlayerId).toBe('p1');

    // Catán para dos: ahuyentar al ladrón al desierto con fichas de comercio
    const p1 = s.players.find((p) => p.id === 'p1')!;
    p1.barbarians!.tradeTokens = 5;
    s = act(s, 'p1', { type: 'MB_TRADE_TOKEN_DISMISS_ROBBER' });
    expect(s.players.find((p) => p.id === 'p1')!.barbarians!.tradeTokens).toBeLessThan(5);
  });
});

describe('Expansión 2: Piratas y Exploradores (EXPLORERS_AND_PIRATES) - 2-4 y 5-6 Jugadores', () => {
  it('inicializa los 5 escenarios en 2-4J y 5-6J con comercio marítimo 3:1 y niebla por explorar', () => {
    const scenarios: ExplorersPiratesScenario[] = [
      'LAND_HO',
      'PIRATE_LAIRS',
      'FISH_FOR_CATAN',
      'SPICES_FOR_CATAN',
      'EXPLORERS_AND_PIRATES_FULL',
    ];
    for (const sc of scenarios) {
      const s34 = createEPTestState(sc, 'STANDARD_3_4');
      expect(s34.explorersPirates).toBeDefined();
      expect(s34.explorersPirates?.scenario).toBe(sc);
      const ratios = getPlayerBankTradeRatios(s34, 'p1');
      expect(ratios.WOOD).toBe(3);

      const s56 = createEPTestState(sc, 'EXPANSION_5_6');
      expect(s56.explorersPirates).toBeDefined();
      expect(s56.players.length).toBe(5);
      expect(Object.keys(s56.explorersPirates!.unexploredSecrets).length).toBeGreaterThan(0);
    }
  });

  it('construye Ciudad Portuaria (2 PV), Barco, Colono y Unidad, navega y funda un nuevo poblado', () => {
    let s = createEPTestState('EXPLORERS_AND_PIRATES_FULL');
    const ep = s.explorersPirates!;
    const p1 = s.players.find((p) => p.id === 'p1')!;

    // Verificar que p1 ya tiene 1 Ciudad Portuaria inicial y 1 Barco inicial
    const p1Basin = Object.values(ep.harborBasins).find((b) => b.playerId === 'p1')!;
    expect(p1Basin).toBeDefined();
    const p1Ship = Object.values(ep.ships).find((sh) => sh.playerId === 'p1')!;
    expect(p1Ship).toBeDefined();

    // Formar un Colono (1 madera + 1 arcilla + 1 oveja + 1 trigo) en la Ciudad Portuaria
    p1.resources = { WOOD: 3, BRICK: 3, SHEEP: 3, WHEAT: 3, ORE: 3 };
    s = act(s, 'p1', {
      type: 'EP_BUILD_SETTLER',
      targetVertexId: p1Basin.vertexId,
    });
    expect(s.explorersPirates!.harborBasins[p1Basin.vertexId].cargo).toContain('SETTLER');

    //Mover el barco a una arista adyacente a la Ciudad Portuaria y embarcar el Colono
    const harborEdge = Object.values(s.board.edges).find(
      (e) => (!e.isLand || e.isCoastal) && e.vertexIds.includes(p1Basin.vertexId)
    )!;
    s.explorersPirates!.ships[p1Ship.id].edgeId = harborEdge.id;
    s.explorersPirates!.ships[p1Ship.id].cargo = [];
    s = act(s, 'p1', {
      type: 'EP_TRANSFER_CARGO',
      shipId: p1Ship.id,
      harborVertexId: p1Basin.vertexId,
      item: 'SETTLER',
      direction: 'HARBOR_TO_SHIP',
    });
    expect(s.explorersPirates!.ships[p1Ship.id].cargo).toContain('SETTLER');

    // Impulsar barco (+2 PM con 1 oveja)
    const mpBefore = s.explorersPirates!.ships[p1Ship.id].mpRemaining;
    s = act(s, 'p1', {
      type: 'EP_BOOST_SHIP',
      shipId: p1Ship.id,
    });
    expect(s.explorersPirates!.ships[p1Ship.id].mpRemaining).toBe(mpBefore + 2);
  });

  it('Misiones (Guaridas de Piratas, Pescado para Catán y Especias para Catán) otorgan PV, ventajas y Mayor Pionero', () => {
    let s = createEPTestState('EXPLORERS_AND_PIRATES_FULL');
    const ep = s.explorersPirates!;
    const p1Ship = Object.values(ep.ships).find((sh) => sh.playerId === 'p1')!;

    // 1. Misión Pescado para Catán: Entregar un Banco de Peces en el Consejo de Catán
    const councilHexId = ep.councilHexId!;
    const councilEdge = Object.values(s.board.edges).find((e) =>
      e.hexIds.includes(councilHexId)
    )!;
    s.explorersPirates!.ships[p1Ship.id].edgeId = councilEdge.id;
    s.explorersPirates!.ships[p1Ship.id].cargo = ['FISH_HAUL'];

    s = act(s, 'p1', {
      type: 'EP_DELIVER_TO_COUNCIL',
      shipId: p1Ship.id,
    });
    expect(
      s.players.find((p) => p.id === 'p1')!.explorersPirates!.missionProgress.FISH_FOR_CATAN
    ).toBe(1);
    expect(s.explorersPirates!.missionLeaderPlayerIds.FISH_FOR_CATAN).toBe('p1');

    // 2. Misión Especias para Catán: Entregar un Saco de Especias en el Consejo de Catán
    s.explorersPirates!.ships[p1Ship.id].cargo = ['SPICE_SACK'];
    s = act(s, 'p1', {
      type: 'EP_DELIVER_TO_COUNCIL',
      shipId: p1Ship.id,
    });
    expect(
      s.players.find((p) => p.id === 'p1')!.explorersPirates!.missionProgress.SPICES_FOR_CATAN
    ).toBe(1);
    expect(s.explorersPirates!.missionLeaderPlayerIds.SPICES_FOR_CATAN).toBe('p1');
  });
});
