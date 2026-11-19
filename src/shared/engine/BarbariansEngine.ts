import { ALL_RESOURCES, BUILDING_COSTS, RESOURCE_META } from '../constants';
import {
  BARBARIANS_SCENARIOS,
  COMMODITY_DELIVERY_META,
  DESTINATION_HEX_META,
  WAGON_LEVELS,
  createBarbariansScenarioDevDeck,
  createCatanEventsDeck,
  createEmptyBarbariansPlayer,
  createFishTokenDeck,
  hasBarbarians,
} from '../expansionsConfig';
import type { RuleContext } from '../citiesKnightsTypes';
import type {
  BarbariansDevCard,
  CommodityDeliveryType,
  DestinationType,
  Edge,
  FishingGround,
  FishToken,
  GameAction,
  GameState,
  PlayerState,
  ResourceType,
  Vertex,
} from '../types';
import { updateLongestRoadAward } from './LongestRoad';
import { DEFAULT_HEX_SIZE, generateBoard } from './HexGrid';

export interface BarbariansHooks {
  score: (state: GameState) => void;
  validRoads: (state: GameState, playerId: string) => string[];
  canSpend: (
    state: GameState,
    playerId: string,
    infrastructure: boolean
  ) => { allowed: boolean; reason?: string };
}

function addLog(
  state: GameState,
  message: string,
  type: 'INFO' | 'DICE' | 'BUILD' | 'TRADE' | 'ROBBER' | 'DEV' | 'AWARD' | 'SYSTEM' = 'INFO',
  playerId?: string
): void {
  const index = (state.logs[0]?.timestamp || state.createdAt) + 1;
  state.logs.unshift({
    id: `MB_${index}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: index,
    message,
    type,
    playerId,
  });
  state.logs.length = Math.min(state.logs.length, 80);
}

function getPlayer(state: GameState, playerId: string): PlayerState {
  const p = state.players.find((pl) => pl.id === playerId);
  if (!p) throw new Error('Jugador no encontrado.');
  return p;
}

function requireRule(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function hasRes(p: PlayerState, cost: Partial<Record<ResourceType, number>>): boolean {
  return ALL_RESOURCES.every((r) => (p.resources[r] || 0) >= (cost[r] || 0));
}

function payRes(state: GameState, p: PlayerState, cost: Partial<Record<ResourceType, number>>): void {
  requireRule(hasRes(p, cost), 'No tienes las materias primas necesarias.');
  for (const r of ALL_RESOURCES) {
    const n = cost[r] || 0;
    if (n > 0) {
      p.resources[r] = (p.resources[r] || 0) - n;
      state.bank[r] = (state.bank[r] || 0) + n;
    }
  }
  state.turn.hasSpentOrBuiltThisTurn = true;
}

function giveRes(state: GameState, p: PlayerState, r: ResourceType, amount: number): number {
  const available = Math.min(amount, state.bank[r] || 0);
  if (available > 0) {
    state.bank[r] = (state.bank[r] || 0) - available;
    p.resources[r] = (p.resources[r] || 0) + available;
  }
  return available;
}

function stealRandomResource(
  from: PlayerState,
  to: PlayerState,
  random: () => number
): ResourceType | null {
  const total = ALL_RESOURCES.reduce((s, r) => s + (from.resources[r] || 0), 0);
  if (total <= 0) return null;
  let ticket = Math.floor(random() * total);
  for (const r of ALL_RESOURCES) {
    const count = from.resources[r] || 0;
    if (ticket < count) {
      from.resources[r] -= 1;
      to.resources[r] = (to.resources[r] || 0) + 1;
      return r;
    }
    ticket -= count;
  }
  return null;
}

export function updateWealthiestAndPoorestTitles(state: GameState): void {
  const mb = state.barbarians;
  if (!mb || mb.scenario !== 'RIVERS_OF_CATAN') return;

  const goldAmounts = state.players.map((p) => p.barbarians?.goldCoins || 0);
  const maxGold = Math.max(...goldAmounts);
  const minGold = Math.min(...goldAmounts);
  const maxHolders = state.players.filter((p) => (p.barbarians?.goldCoins || 0) === maxGold);

  for (const p of state.players) {
    if (!p.barbarians) continue;
    // Regla oficial (pág. 9): Colono más rico (+1 PV) solo si tiene la mayor cantidad en solitario y > 0
    p.barbarians.isWealthiestSettler = maxGold > 0 && maxHolders.length === 1 && maxHolders[0].id === p.id;
    // Regla oficial (pág. 9): Todos los jugadores con la cantidad más pequeña (o si todos empatan/tienen 0) reciben Colono pobre (-2 PV)
    p.barbarians.isPoorestSettler = (p.barbarians.goldCoins || 0) === minGold;
  }
}

export function updateHarborMasterTitle(state: GameState): void {
  const mb = state.barbarians;
  if (!mb || !mb.variants.harborMaster) return;

  let currentLeaderId = mb.harborMasterPlayerId || null;
  let currentLeaderPoints = 0;

  for (const p of state.players) {
    if (!p.barbarians) continue;
    const pts = Object.values(state.board.vertices)
      .filter((v) => v.playerId === p.id && v.port !== null && v.building !== null)
      .reduce((sum, v) => sum + (v.building === 'CITY' ? 2 : 1), 0);
    p.barbarians.harborPoints = pts;
    if (p.id === currentLeaderId) {
      currentLeaderPoints = pts;
    }
  }

  if (currentLeaderId && currentLeaderPoints < 3) {
    currentLeaderId = null;
    currentLeaderPoints = 0;
  }

  for (const p of state.players) {
    const pts = p.barbarians?.harborPoints || 0;
    if (pts >= 3 && pts > currentLeaderPoints) {
      currentLeaderId = p.id;
      currentLeaderPoints = pts;
    }
  }

  mb.harborMasterPlayerId = currentLeaderId;
}

export function drawFishTokenForPlayer(
  state: GameState,
  playerId: string,
  count: number,
  random: () => number
): void {
  const mb = state.barbarians;
  const p = state.players.find((pl) => pl.id === playerId);
  if (!mb || !p?.barbarians) return;

  for (let i = 0; i < count; i++) {
    if (mb.fishDeck.length === 0) {
      if (mb.fishDiscard.length === 0) break;
      mb.fishDeck = [...mb.fishDiscard];
      mb.fishDiscard = [];
      for (let k = mb.fishDeck.length - 1; k > 0; k--) {
        const j = Math.floor(random() * (k + 1));
        [mb.fishDeck[k], mb.fishDeck[j]] = [mb.fishDeck[j], mb.fishDeck[k]];
      }
    }

    const token = mb.fishDeck.shift();
    if (!token) break;

    if (token.isOldBoot) {
      p.barbarians.hasOldBoot = true;
      addLog(
        state,
        `👢 ¡${p.name} ha pescado la «Bota vieja»! Necesita +1 PV adicional para ganar hasta que se la entregue a otro jugador con tantos o más PV.`,
        'INFO',
        p.id
      );
      continue;
    }

    // Regla oficial (pág. 7): Máximo 7 fichas de pescado en mano
    if (p.barbarians.fishTokens.length >= 7) {
      // Si ya tiene 7, cambia su ficha de menor valor si la nueva es mayor
      const minIdx = p.barbarians.fishTokens.reduce(
        (bestIdx, tok, idx, arr) => (tok.fishCount < arr[bestIdx].fishCount ? idx : bestIdx),
        0
      );
      if (token.fishCount > p.barbarians.fishTokens[minIdx].fishCount) {
        const replaced = p.barbarians.fishTokens[minIdx];
        p.barbarians.fishTokens[minIdx] = token;
        mb.fishDiscard.push(replaced);
      } else {
        mb.fishDiscard.push(token);
      }
    } else {
      p.barbarians.fishTokens.push(token);
    }
  }
}

export function getValidCamelEdges(state: GameState): string[] {
  const mb = state.barbarians;
  if (!mb || mb.scenario !== 'THE_CARAVANS' || mb.camelsRemaining <= 0) return [];

  const allLandEdges = Object.values(state.board.edges).filter((e) => e.isLand);
  if (mb.camelEdgeIds.length === 0) {
    // Primer camello: sale de cualquiera de los caminos que tocan un hexágono de Oasis
    const oasisSet = new Set(mb.oasisHexIds);
    return allLandEdges
      .filter(
        (e) =>
          !e.hexIds.every((hid) => oasisSet.has(hid)) &&
          e.vertexIds.some((vid) => {
            const v = state.board.vertices[vid];
            return v && v.hexIds.some((hid) => oasisSet.has(hid));
          })
      )
      .map((e) => e.id);
  }

  const camelSet = new Set(mb.camelEdgeIds);
  // Puntas abiertas de las rutas de caravanas o nuevas salidas desde el oasis (hasta 3 rutas por oasis)
  const oasisSet = new Set(mb.oasisHexIds);
  const oasisExitEdges = allLandEdges.filter(
    (e) =>
      camelSet.has(e.id) &&
      e.vertexIds.some((vid) => state.board.vertices[vid]?.hexIds.some((hid) => oasisSet.has(hid)))
  );

  const maxRoutes = mb.oasisHexIds.length * 3;
  const candidateIds = new Set<string>();

  if (oasisExitEdges.length < maxRoutes) {
    for (const e of allLandEdges) {
      if (camelSet.has(e.id)) continue;
      const touchesOasis = e.vertexIds.some((vid) =>
        state.board.vertices[vid]?.hexIds.some((hid) => oasisSet.has(hid))
      );
      if (touchesOasis) candidateIds.add(e.id);
    }
  }

  // Para cada extremo de camello existente, los 2 caminos que continúan sin cruzarse
  for (const camelEdgeId of mb.camelEdgeIds) {
    const cEdge = state.board.edges[camelEdgeId];
    if (!cEdge) continue;
    for (const vid of cEdge.vertexIds) {
      const v = state.board.vertices[vid];
      if (!v) continue;
      const incidentCamels = v.adjacentEdgeIds.filter((eid) => camelSet.has(eid));
      if (incidentCamels.length === 1) {
        for (const adjEid of v.adjacentEdgeIds) {
          const adjE = state.board.edges[adjEid];
          if (adjE && adjE.isLand && !camelSet.has(adjEid)) {
            candidateIds.add(adjEid);
          }
        }
      }
    }
  }

  return Array.from(candidateIds);
}

export function refreshConqueredHexesAndVertices(state: GameState): void {
  const mb = state.barbarians;
  if (!mb || mb.scenario !== 'BARBARIAN_ATTACK') return;

  const conqueredHexes: string[] = [];
  for (const [hexId, count] of Object.entries(mb.hexBarbarians)) {
    if (count >= 3) {
      conqueredHexes.push(hexId);
    }
  }
  mb.conqueredHexIds = conqueredHexes;
  const conqueredSet = new Set(conqueredHexes);
  const castleSet = new Set(mb.castleHexIds);

  // Regla oficial (pág. 13): Un poblado o ciudad queda conquistado si todos los hexágonos terrestres que lo rodean están conquistados (el desierto y el castillo protegen siempre)
  const conqueredVertices: string[] = [];
  for (const v of Object.values(state.board.vertices)) {
    if (!v.building || !v.playerId) continue;
    const landHexes = v.hexIds
      .map((hid) => state.board.hexes[hid])
      .filter((h) => h && h.terrain !== 'SEA');
    if (landHexes.length === 0) continue;

    const hasFreeLandHex = landHexes.some(
      (h) => h.terrain === 'DESERT' || castleSet.has(h.id) || !conqueredSet.has(h.id)
    );
    if (!hasFreeLandHex) {
      conqueredVertices.push(v.id);
    }
  }
  mb.conqueredVertexIds = conqueredVertices;
}

export function initializeBarbarians(state: GameState, random: () => number): void {
  const scenario = state.config.barbariansScenario || 'FISHERMEN_OF_CATAN';
  const variants = state.config.barbariansVariants || {};
  const isExtended56 =
    state.config.boardMode === 'EXPANSION_5_6' ||
    state.config.boardMode === 'MEGA_RADIUS_3' ||
    state.players.length > 4;

  // Regenerar siempre una base limpia del tamaño oficial (3-4J = 19 hex, 5-6J = 30 hex) antes de aplicar el escenario del PDF
  state.board = generateBoard(
    isExtended56 ? 'EXPANSION_5_6' : 'STANDARD_3_4',
    state.config.preventAdjacentRedNumbers,
    state.board?.hexSize || DEFAULT_HEX_SIZE,
    true,
    undefined,
    state.players.length,
    false,
    undefined,
    random
  );

  const landHexes = Object.values(state.board.hexes).filter((h) => h.terrain !== 'SEA');
  const vertices = Object.values(state.board.vertices);
  const edges = Object.values(state.board.edges);

  // Clasificar hexágonos costeros e interiores ordenados en sentido horario
  const coastalHexIds: string[] = [];
  const interiorHexIds: string[] = [];
  for (const h of landHexes) {
    const hexVertices = vertices.filter((v) => v.hexIds.includes(h.id));
    const isCoastal = hexVertices.some((v) => v.isCoastal || v.hexIds.length < 3);
    if (isCoastal) coastalHexIds.push(h.id);
    else interiorHexIds.push(h.id);
  }
  coastalHexIds.sort((a, b) => {
    const ha = state.board.hexes[a];
    const hb = state.board.hexes[b];
    return Math.atan2(ha.center.y, ha.center.x) - Math.atan2(hb.center.y, hb.center.x);
  });

  const mb: NonNullable<GameState['barbarians']> = {
    scenario,
    variants,
    fishDeck: [],
    fishDiscard: [],
    fishingGrounds: [],
    lakeHexIds: [],
    riverHexIds: [],
    swampHexIds: [],
    bridgeSiteEdgeIds: [],
    bridgeOwners: {},
    dualNumberHexId: null,
    oasisHexIds: [],
    camelEdgeIds: [],
    camelsRemaining: isExtended56 ? 33 : 22,
    pendingCamelVote: null,
    castleHexIds: [],
    coastalHexIds,
    hexBarbarians: {},
    conqueredHexIds: [],
    conqueredVertexIds: [],
    barbariansReserve: isExtended56 ? 48 : 36,
    edgeKnights: {},
    lastColorDie: null,
    lastBarbarianRolls: [],
    destinationHexes: {},
    edgeBarbarians: [],
    scenarioDevDeck: [],
    eventDeck: variants.catanEventsDeck ? createCatanEventsDeck(random) : [],
    eventDiscard: [],
    currentEventCard: null,
    epidemicActiveThisTurn: false,
    harborMasterPlayerId: null,
  };

  // Inicializar estado de jugador
  for (const p of state.players) {
    p.barbarians = createEmptyBarbariansPlayer(scenario, variants.catanForTwo);
  }

  if (scenario === 'FISHERMEN_OF_CATAN') {
    // =========================================================================
    // ESCENARIO 1: LOS PESCADORES DE CATÁN (PDF págs. 6-7 y 5-6J pág. 2)
    // =========================================================================
    mb.fishDeck = createFishTokenDeck(isExtended56, random);
    const exactLakeCoords = isExtended56 ? ['0,-1,1', '0,1,-1'] : ['0,0,0'];
    const deserts = landHexes.filter((h) => h.terrain === 'DESERT');

    exactLakeCoords.forEach((lakeId, i) => {
      const intHex = state.board.hexes[lakeId] || state.board.hexes[interiorHexIds[i]];
      const desHex = deserts[i];
      if (intHex && desHex && intHex.id !== desHex.id) {
        desHex.terrain = intHex.terrain === 'DESERT' ? 'WOOD' : intHex.terrain;
        desHex.numberToken = intHex.numberToken || 6;
      }
      if (intHex) {
        intHex.terrain = 'DESERT';
        intHex.numberToken = 12; // Produce pescado con 2, 3, 11 y 12
        intHex.hasRobber = false;
        mb.lakeHexIds.push(intHex.id);
        const lakeVerts = vertices.filter((v) => v.hexIds.includes(intHex.id)).map((v) => v.id);
        mb.fishingGrounds.push({
          id: `lake-${i + 1}`,
          hexId: intHex.id,
          numberToken: 12,
          vertexIds: lakeVerts,
          isLake: true,
        });
      }
    });

    // 6 caladeros costeros en 3-4J (4, 5, 6, 8, 9, 10) en las 6 esquinas; 8 en 5-6J (4, 5, 5, 6, 8, 9, 9, 10)
    const groundNumbers = isExtended56 ? [4, 5, 5, 6, 8, 9, 9, 10] : [4, 5, 6, 8, 9, 10];
    const cornerIds34 = ['0,-2,2', '2,-2,0', '2,0,-2', '0,2,-2', '-2,2,0', '-2,0,2'];
    const coastalSelection = isExtended56
      ? groundNumbers.map((_, idx) =>
          coastalHexIds[Math.floor((idx * coastalHexIds.length) / groundNumbers.length)]
        )
      : cornerIds34.filter((id) => Boolean(state.board.hexes[id]));

    coastalSelection.forEach((hid, idx) => {
      const cVerts = vertices
        .filter((v) => v.hexIds.includes(hid) && v.isCoastal)
        .map((v) => v.id);
      if (cVerts.length > 0) {
        mb.fishingGrounds.push({
          id: `fg-${idx + 1}`,
          hexId: hid,
          numberToken: groundNumbers[idx],
          vertexIds: cVerts,
        });
      }
    });

    for (const h of Object.values(state.board.hexes)) h.hasRobber = false;
    state.board.robberHexId = '';
  } else if (scenario === 'RIVERS_OF_CATAN') {
    // =========================================================================
    // ESCENARIO 2: LOS RÍOS DE CATÁN (PDF págs. 8-9 y 5-6J pág. 2)
    // =========================================================================
    // En 3-4J: Río superior de 3 hexágonos (Montaña 1,-1,0 -> Cerro 0,-1,1 -> Pantano -2,0,2)
    //          Río inferior de 4 hexágonos (Montaña 1,0,-1 -> Pasto 0,0,0 -> Cerro -1,1,0 -> Pantano -2,2,0)
    const riverPaths: Array<Array<{ id: string; terrain: ResourceType | 'DESERT' }>> = isExtended56
      ? [
          [
            { id: '2,-2,0', terrain: 'ORE' },
            { id: '1,-2,1', terrain: 'BRICK' },
            { id: '0,-2,2', terrain: 'DESERT' },
          ],
          [
            { id: '1,0,-1', terrain: 'ORE' },
            { id: '0,0,0', terrain: 'SHEEP' },
            { id: '-1,1,0', terrain: 'BRICK' },
            { id: '-2,2,0', terrain: 'DESERT' },
          ],
          [
            { id: '1,1,-2', terrain: 'ORE' },
            { id: '0,2,-2', terrain: 'BRICK' },
            { id: '-1,3,-2', terrain: 'DESERT' },
          ],
        ]
      : [
          [
            { id: '1,-1,0', terrain: 'ORE' },
            { id: '0,-1,1', terrain: 'BRICK' },
            { id: '-2,0,2', terrain: 'DESERT' },
          ],
          [
            { id: '1,0,-1', terrain: 'ORE' },
            { id: '0,0,0', terrain: 'SHEEP' },
            { id: '-1,1,0', terrain: 'BRICK' },
            { id: '-2,2,0', terrain: 'DESERT' },
          ],
        ];

    // Asegurar que ningún otro hexágono sea DESERT
    let fallbackNum = 4;
    for (const h of landHexes) {
      if (h.terrain === 'DESERT') {
        h.terrain = 'WOOD';
        h.numberToken = fallbackNum;
        fallbackNum = fallbackNum === 4 ? 9 : 5;
      }
      h.hasRobber = false;
    }

    for (const path of riverPaths) {
      for (const step of path) {
        const h = state.board.hexes[step.id];
        if (!h) continue;
        h.terrain = step.terrain;
        if (!mb.riverHexIds.includes(h.id)) mb.riverHexIds.push(h.id);
        if (step.terrain === 'DESERT') {
          h.numberToken = null;
          if (!mb.swampHexIds.includes(h.id)) mb.swampHexIds.push(h.id);
        } else if (h.numberToken === null) {
          h.numberToken = 5;
        }
      }
    }

    if (mb.swampHexIds[0] && state.board.hexes[mb.swampHexIds[0]]) {
      state.board.hexes[mb.swampHexIds[0]].hasRobber = true;
      state.board.robberHexId = mb.swampHexIds[0];
    }

    const riverSet = new Set(mb.riverHexIds);
    // Lugares de construcción de puente (7 en 3-4J, 10 en 5-6J) en las aristas de los ríos
    const sharedRiverEdges = edges.filter(
      (e) => e.isLand && e.hexIds.filter((hid) => riverSet.has(hid)).length >= 2
    );
    const bankRiverEdges = edges.filter(
      (e) => e.isLand && e.hexIds.filter((hid) => riverSet.has(hid)).length === 1
    );
    const targetBridges = isExtended56 ? 10 : 7;
    mb.bridgeSiteEdgeIds = [...sharedRiverEdges, ...bankRiverEdges]
      .slice(0, targetBridges)
      .map((e) => e.id);

    // En 3-4J la ficha del 2 comparte hexágono con el 12
    const hex12 = Object.values(state.board.hexes).find(
      (h) => h.terrain !== 'SEA' && h.terrain !== 'DESERT' && h.numberToken === 12
    );
    if (hex12 && !isExtended56) {
      mb.dualNumberHexId = hex12.id;
    }
    updateWealthiestAndPoorestTitles(state);
  } else if (scenario === 'THE_CARAVANS') {
    // =========================================================================
    // ESCENARIO 3: LA RUTA DE LAS CARAVANAS (PDF págs. 10-11 y 5-6J pág. 3)
    // =========================================================================
    const oasisCoords = isExtended56 ? ['1,-1,0', '-1,1,0'] : ['0,0,0'];
    for (const h of landHexes) {
      if (h.terrain === 'DESERT' && !oasisCoords.includes(h.id)) {
        h.terrain = 'SHEEP';
        h.numberToken = 9;
      }
      h.hasRobber = false;
    }
    for (const oid of oasisCoords) {
      const oh = state.board.hexes[oid];
      if (oh) {
        oh.terrain = 'DESERT';
        oh.numberToken = null;
        oh.hasRobber = false;
        mb.oasisHexIds.push(oh.id);
      }
    }
    state.board.robberHexId = '';
  } else if (scenario === 'BARBARIAN_ATTACK') {
    // =========================================================================
    // ESCENARIO 4: EL ATAQUE DE LOS BÁRBAROS (PDF págs. 12-13 y 5-6J pág. 4)
    // =========================================================================
    if (!isExtended56) {
      // Montaje oficial exacto 3-4J (pág. 13):
      // Costa (12 hexágonos): Desierto en (1,-2,1), Castillo en (-1,2,-1) y 10 terrenos costeros con números fijos
      const coastalOrder34: Array<{
        id: string;
        kind: 'CASTLE' | 'DESERT' | 'COAST';
        num: number | null;
      }> = [
        { id: '0,-2,2', kind: 'COAST', num: 8 },
        { id: '1,-2,1', kind: 'DESERT', num: null },
        { id: '2,-2,0', kind: 'COAST', num: 10 },
        { id: '2,-1,-1', kind: 'COAST', num: 11 },
        { id: '2,0,-2', kind: 'COAST', num: 5 },
        { id: '1,1,-2', kind: 'COAST', num: 2 },
        { id: '0,2,-2', kind: 'COAST', num: 6 },
        { id: '-1,2,-1', kind: 'CASTLE', num: null },
        { id: '-2,2,0', kind: 'COAST', num: 4 },
        { id: '-2,1,1', kind: 'COAST', num: 12 },
        { id: '-2,0,2', kind: 'COAST', num: 9 },
        { id: '-1,-1,2', kind: 'COAST', num: 3 },
      ];
      // 2 bosques, 2 cerros, 3 pastos, 1 montaña, 2 sembrados en el anillo costero
      const coastalTerrains: ResourceType[] = [
        'WOOD',
        'WOOD',
        'BRICK',
        'BRICK',
        'SHEEP',
        'SHEEP',
        'SHEEP',
        'ORE',
        'WHEAT',
        'WHEAT',
      ];
      for (let i = coastalTerrains.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [coastalTerrains[i], coastalTerrains[j]] = [coastalTerrains[j], coastalTerrains[i]];
      }
      let cIdx = 0;
      mb.coastalHexIds = [];
      for (const spec of coastalOrder34) {
        const h = state.board.hexes[spec.id];
        if (!h) continue;
        h.hasRobber = false;
        if (spec.kind === 'CASTLE') {
          h.terrain = 'GOLD';
          h.numberToken = null;
          mb.castleHexIds.push(h.id);
        } else if (spec.kind === 'DESERT') {
          h.terrain = 'DESERT';
          h.numberToken = null;
        } else {
          h.terrain = coastalTerrains[cIdx++ % coastalTerrains.length];
          h.numberToken = spec.num;
          mb.coastalHexIds.push(h.id);
          if (spec.num === 2 || spec.num === 12) {
            mb.hexBarbarians[h.id] = 1;
          }
        }
      }

      // Interior (7 hexágonos): 1 bosque, 1 pasto, 1 cerro, 2 montañas, 2 sembrados con números fijos (4, 5, 8, 3, 9, 6 y 10 en el centro)
      const interiorOrder34: Array<{ id: string; num: number }> = [
        { id: '0,-1,1', num: 4 },
        { id: '1,-1,0', num: 5 },
        { id: '1,0,-1', num: 8 },
        { id: '0,1,-1', num: 3 },
        { id: '-1,1,0', num: 9 },
        { id: '-1,0,1', num: 6 },
        { id: '0,0,0', num: 10 },
      ];
      const interiorTerrains: ResourceType[] = [
        'WOOD',
        'SHEEP',
        'BRICK',
        'ORE',
        'ORE',
        'WHEAT',
        'WHEAT',
      ];
      for (let i = interiorTerrains.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [interiorTerrains[i], interiorTerrains[j]] = [interiorTerrains[j], interiorTerrains[i]];
      }
      interiorOrder34.forEach((spec, idx) => {
        const h = state.board.hexes[spec.id];
        if (!h) return;
        h.terrain = interiorTerrains[idx % interiorTerrains.length];
        h.numberToken = spec.num;
        h.hasRobber = false;
      });
    } else {
      // Montaje oficial 5-6J (pág. 4): 2 Castillos (2,-3,1 y -1,3,-2) y 2 Desiertos (3,-1,-2 y -2,1,1)
      const castleCoords56 = ['2,-3,1', '-1,3,-2'];
      const desertCoords56 = ['3,-1,-2', '-2,1,1'];
      const coastalNums56 = [9, 10, 11, 5, 2, 6, 5, 4, 12, 9, 3, 8];
      let cNumIdx = 0;
      mb.coastalHexIds = [];
      for (const cid of coastalHexIds) {
        const h = state.board.hexes[cid];
        if (!h) continue;
        h.hasRobber = false;
        if (castleCoords56.includes(cid)) {
          h.terrain = 'GOLD';
          h.numberToken = null;
          mb.castleHexIds.push(cid);
        } else if (desertCoords56.includes(cid)) {
          h.terrain = 'DESERT';
          h.numberToken = null;
        } else {
          if (h.terrain === 'DESERT') h.terrain = 'WOOD';
          const num = coastalNums56[cNumIdx++ % coastalNums56.length];
          h.numberToken = num;
          mb.coastalHexIds.push(cid);
          if (num === 2 || num === 12) {
            mb.hexBarbarians[cid] = 1;
          }
        }
      }
      const interiorNums56 = [6, 11, 3, 10, 4, 9, 6, 8, 5, 10, 4, 11, 3, 8];
      interiorHexIds.forEach((iid, idx) => {
        const h = state.board.hexes[iid];
        if (!h) return;
        if (h.terrain === 'DESERT') h.terrain = 'WHEAT';
        h.numberToken = interiorNums56[idx % interiorNums56.length];
        h.hasRobber = false;
      });
    }

    const placedInitial = Object.values(mb.hexBarbarians).reduce((a, b) => a + b, 0);
    mb.barbariansReserve -= placedInitial;
    state.board.robberHexId = '';
    mb.scenarioDevDeck = createBarbariansScenarioDevDeck('BARBARIAN_ATTACK', isExtended56, random);
    state.devDeck = [];
    state.largestArmyPlayerId = null;
  } else if (scenario === 'TRADERS_AND_BARBARIANS') {
    // =========================================================================
    // ESCENARIO 5: MERCADERES Y BÁRBAROS (PDF pág. 17 y 5-6J pág. 1)
    // =========================================================================
    // En 3-4J: 3 hexágonos de destino en las 3 esquinas costeras del diagrama (2,-2,0 Castillo; -2,1,1 Fábrica de Vidrio; 0,2,-2 Cantera de Mármol)
    // En 5-6J: 1 Castillo central (0,0,0) + 3 Canteras + 3 Fábricas de Vidrio en la costa
    const destPlacements: Array<{ id: string; type: DestinationType }> = isExtended56
      ? [
          { id: '0,0,0', type: 'CASTLE' },
          { id: '1,-3,2', type: 'QUARRY' },
          { id: '3,-3,0', type: 'GLASSWORKS' },
          { id: '3,0,-3', type: 'QUARRY' },
          { id: '0,3,-3', type: 'GLASSWORKS' },
          { id: '-2,1,1', type: 'QUARRY' },
          { id: '-1,-1,2', type: 'GLASSWORKS' },
        ]
      : [
          { id: '2,-2,0', type: 'CASTLE' },
          { id: '-2,1,1', type: 'GLASSWORKS' },
          { id: '0,2,-2', type: 'QUARRY' },
        ];

    const destIdSet = new Set(destPlacements.map((d) => d.id));
    // En 3-4J no se usan ni el desierto ni las fichas 2 ni 12 (16 terrenos con 3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11)
    const tokens34 = [3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11];
    let tokIdx = 0;
    for (const h of landHexes) {
      h.hasRobber = false;
      if (destIdSet.has(h.id)) continue;
      if (!isExtended56) {
        if (h.terrain === 'DESERT') h.terrain = 'WOOD';
        h.numberToken = tokens34[tokIdx++ % tokens34.length];
      }
    }

    for (const spec of destPlacements) {
      const h = state.board.hexes[spec.id];
      if (!h) continue;
      h.terrain = 'GOLD';
      h.numberToken = null;
      h.hasRobber = false;

      const hexVerts = vertices.filter((v) => v.hexIds.includes(spec.id));
      const hexEdges = edges.filter((e) => e.hexIds.includes(spec.id));
      const seaEdges = hexEdges.filter((e) => e.isCoastal || e.hexIds.length === 1);
      // Elegir un vértice interior del hexágono de destino como punto de entrega
      const interiorVert = hexVerts.find((v) => !v.isCoastal) || hexVerts[0];
      const centerVert = interiorVert?.id || '';
      const meta = DESTINATION_HEX_META[spec.type];
      const stackSize = isExtended56 ? 8 : 12;
      const stack: CommodityDeliveryType[] = [];
      for (let i = 0; i < stackSize; i++) {
        stack.push(meta.produces[i % 2]);
      }
      for (let i = stack.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [stack[i], stack[j]] = [stack[j], stack[i]];
      }

      mb.destinationHexes[spec.id] = {
        hexId: spec.id,
        type: spec.type,
        name: meta.name,
        centerVertexId: centerVert,
        cornerVertexIds: hexVerts.map((v) => v.id),
        forbiddenSeaEdgeIds: isExtended56 ? [] : seaEdges.map((e) => e.id),
        stack,
      };
    }

    // 3 bárbaros iniciales en los 3 caminos marcados con X frente a los hexágonos de destino
    const xEdges = edges.filter(
      (e) =>
        e.isLand &&
        !e.isCoastal &&
        e.hexIds.some((hid) => destIdSet.has(hid) || ['1,-1,0', '-1,0,1', '0,1,-1'].includes(hid))
    );
    mb.edgeBarbarians = (xEdges.length >= 3 ? xEdges : edges.filter((e) => e.isLand && !e.isCoastal))
      .slice(0, 3)
      .map((e) => e.id);
    mb.scenarioDevDeck = createBarbariansScenarioDevDeck('TRADERS_AND_BARBARIANS', isExtended56, random);
    state.devDeck = [];
    state.board.robberHexId = '';

    // Inicializar posición por defecto del carromato y primera ficha de mercancía para cada jugador
    const destList = Object.values(mb.destinationHexes);
    state.players.forEach((p, idx) => {
      if (!p.barbarians || destList.length === 0) return;
      const startDest = destList[idx % destList.length];
      p.barbarians.wagonVertexId = startDest.centerVertexId;
      p.barbarians.wagonMpRemaining = WAGON_LEVELS[p.barbarians.wagonLevel].movementPoints;
      p.barbarians.activeCommodityTile =
        startDest.stack.shift() || DESTINATION_HEX_META[startDest.type].produces[0];
    });
  }

  state.barbarians = mb;
}

export function onBarbariansSetupSettlementPlaced(
  state: GameState,
  playerId: string,
  vertexId: string,
  isSecondRound: boolean,
  random: () => number
): void {
  const mb = state.barbarians;
  const p = state.players.find((pl) => pl.id === playerId);
  const v = state.board.vertices[vertexId];
  if (!mb || !p?.barbarians || !v) return;

  // 1. Los pescadores de Catán: si el 2º poblado inicial está en un caladero o en el lago, roba 1 ficha de pescado
  if (mb.scenario === 'FISHERMEN_OF_CATAN' && isSecondRound) {
    const onFishingGround = mb.fishingGrounds.some((fg) => fg.vertexIds.includes(vertexId));
    if (onFishingGround) {
      drawFishTokenForPlayer(state, playerId, 1, random);
      addLog(state, `🐟 ${p.name} fundó su 2º poblado en zona de pesca y recibió 1 ficha de pescado inicial.`, 'BUILD', p.id);
    }
  }

  // 2. Los ríos de Catán: construir poblado en encrucijada de río da +1 moneda de oro
  if (mb.scenario === 'RIVERS_OF_CATAN') {
    const touchesRiver = v.hexIds.some((hid) => mb.riverHexIds.includes(hid));
    if (touchesRiver) {
      p.barbarians.goldCoins += 1;
      updateWealthiestAndPoorestTitles(state);
      addLog(state, `🪙 ${p.name} recibió +1 moneda de oro por fundar junto al río.`, 'BUILD', p.id);
    }
  }

  // 3. Mercaderes y Bárbaros: al colocar la ciudad inicial (2ª ronda), coloca su carromato en ella
  if (mb.scenario === 'TRADERS_AND_BARBARIANS' && isSecondRound) {
    p.barbarians.wagonVertexId = vertexId;
    p.barbarians.wagonMpRemaining = WAGON_LEVELS[p.barbarians.wagonLevel].movementPoints;
  }

  // 4. Variante Catán para dos: fichas de comercio por fundar en costa (+1) o desierto (+2)
  if (mb.variants.catanForTwo) {
    let gainedTokens = 0;
    if (v.isCoastal) gainedTokens += 1;
    const touchesDesert = v.hexIds.some((hid) => state.board.hexes[hid]?.terrain === 'DESERT');
    if (touchesDesert) gainedTokens += 2;
    if (gainedTokens > 0) {
      p.barbarians.tradeTokens += gainedTokens;
    }
  }

  updateHarborMasterTitle(state);
}

export function onBarbariansBuildingPlaced(
  state: GameState,
  playerId: string,
  kind: 'ROAD' | 'SETTLEMENT' | 'CITY',
  targetId: string,
  random: () => number
): void {
  const mb = state.barbarians;
  const p = state.players.find((pl) => pl.id === playerId);
  if (!mb || !p?.barbarians) return;

  const isMainGameplay = state.phase === 'MAIN_PHASE' || state.phase === 'SPECIAL_BUILD_PHASE';

  // 1. Los ríos de Catán: carretera o poblado junto a un río otorga +1 moneda de oro
  if (mb.scenario === 'RIVERS_OF_CATAN' && (kind === 'ROAD' || kind === 'SETTLEMENT')) {
    const hexIds =
      kind === 'ROAD'
        ? state.board.edges[targetId]?.hexIds || []
        : state.board.vertices[targetId]?.hexIds || [];
    if (hexIds.some((hid) => mb.riverHexIds.includes(hid))) {
      p.barbarians.goldCoins += 1;
      updateWealthiestAndPoorestTitles(state);
      addLog(
        state,
        `🪙 ${p.name} ganó +1 moneda de oro por construir ${kind === 'ROAD' ? 'una carretera' : 'un poblado'} en la orilla del río.`,
        'BUILD',
        p.id
      );
    }
  }

  // 2. La ruta de las caravanas: construir poblado o ciudad tras la fundación activa colocación/votación de camello
  if (
    mb.scenario === 'THE_CARAVANS' &&
    isMainGameplay &&
    (kind === 'SETTLEMENT' || kind === 'CITY') &&
    mb.camelsRemaining > 0
  ) {
    const validCamelEdges = getValidCamelEdges(state);
    if (validCamelEdges.length > 0) {
      mb.pendingCamelVote = {
        initiatorPlayerId: playerId,
        currentVoterIndex: 0,
        votesByEdge: {},
        votesByPlayer: {},
        validEdgeIds: validCamelEdges,
      };
      addLog(
        state,
        `🐪 ¡Nueva caravana en marcha! ${p.name} construyó ${kind === 'CITY' ? 'una Ciudad' : 'un Poblado'}: elige o vota en qué camino iluminado colocar el siguiente camello.`,
        'INFO',
        p.id
      );
    }
  }

  // 3. El ataque de los bárbaros: al construir poblado o ciudad en fase principal llegan bárbaros (3 tiradas distintas != 7)
  if (
    mb.scenario === 'BARBARIAN_ATTACK' &&
    isMainGameplay &&
    (kind === 'SETTLEMENT' || kind === 'CITY') &&
    mb.barbariansReserve > 0
  ) {
    const distinctRolls: number[] = [];
    for (let attempt = 0; attempt < 40 && distinctRolls.length < 3; attempt++) {
      const r1 = Math.floor(random() * 6) + 1;
      const r2 = Math.floor(random() * 6) + 1;
      const sum = r1 + r2;
      if (sum !== 7 && !distinctRolls.includes(sum)) {
        distinctRolls.push(sum);
      }
    }
    mb.lastBarbarianRolls = distinctRolls;

    let spawnedTotal = 0;
    for (const rolledNum of distinctRolls) {
      const matchingCoastal = mb.coastalHexIds.filter((hid) => {
        const h = state.board.hexes[hid];
        return (
          h &&
          h.numberToken === rolledNum &&
          !mb.castleHexIds.includes(hid) &&
          (mb.hexBarbarians[hid] || 0) < 3
        );
      });
      for (const hid of matchingCoastal) {
        if (mb.barbariansReserve <= 0) break;
        mb.hexBarbarians[hid] = (mb.hexBarbarians[hid] || 0) + 1;
        mb.barbariansReserve -= 1;
        spawnedTotal += 1;
      }
    }
    refreshConqueredHexesAndVertices(state);
    addLog(
      state,
      `⚔️ ¡Incursión Bárbara tras construir! Tiradas costeras [${distinctRolls.join(', ')}]: desembarcaron ${spawnedTotal} bárbaro(s) en la costa.`,
      'ROBBER',
      p.id
    );
  }

  if (mb.variants.catanForTwo && kind === 'SETTLEMENT') {
    const v = state.board.vertices[targetId];
    if (v) {
      let gained = 0;
      if (v.isCoastal) gained += 1;
      if (v.hexIds.some((hid) => state.board.hexes[hid]?.terrain === 'DESERT')) gained += 2;
      p.barbarians.tradeTokens += gained;
    }
  }

  updateHarborMasterTitle(state);
}

export function onBarbariansDiceProduction(
  state: GameState,
  diceSum: number,
  random: () => number
): void {
  const mb = state.barbarians;
  if (!mb || diceSum === 7) return;

  // 1. Los pescadores de Catán: producción de fichas de pescado en el Lago (2, 3, 11, 12) y Caladeros (4, 5, 6, 8, 9, 10)
  if (mb.scenario === 'FISHERMEN_OF_CATAN') {
    for (const fg of mb.fishingGrounds) {
      const matches = fg.isLake ? [2, 3, 11, 12].includes(diceSum) : fg.numberToken === diceSum;
      if (!matches) continue;
      // Si el ladrón está en el lago, bloquea la pesca del lago
      if (fg.isLake && state.board.robberHexId === fg.hexId) continue;

      for (const vid of fg.vertexIds) {
        const v = state.board.vertices[vid];
        if (!v || !v.building || !v.playerId) continue;
        const fishTokensToDraw = v.building === 'CITY' ? 2 : 1;
        drawFishTokenForPlayer(state, v.playerId, fishTokensToDraw, random);
      }
    }
  }
}

export function resolveBarbarianAttackBattles(
  state: GameState,
  random: () => number,
  forceEqualAllowed: boolean = false
): void {
  const mb = state.barbarians;
  if (!mb || mb.scenario !== 'BARBARIAN_ATTACK') return;

  const hexIdsToCheck = Array.from(
    new Set([...mb.coastalHexIds, ...Object.keys(mb.hexBarbarians)])
  );

  for (const hexId of hexIdsToCheck) {
    const barbCount = mb.hexBarbarians[hexId] || 0;
    if (barbCount <= 0) continue;

    const hexEdges = Object.values(state.board.edges).filter((e) => e.hexIds.includes(hexId));
    const knightsOnHex = hexEdges
      .map((e) => mb.edgeKnights[e.id])
      .filter((k): k is NonNullable<typeof k> => Boolean(k));

    // Regla oficial (pág. 14): Hay victoria cuando en los caminos que rodean el hexágono hay MÁS caballeros que bárbaros (o al activar asalto directo con fuerza suficiente)
    if (
      knightsOnHex.length > barbCount ||
      (forceEqualAllowed && knightsOnHex.length >= barbCount)
    ) {
      const byPlayer: Record<string, number> = {};
      for (const k of knightsOnHex) {
        byPlayer[k.playerId] = (byPlayer[k.playerId] || 0) + 1;
      }
      const participantIds = Object.keys(byPlayer);

      if (participantIds.length === 1) {
        const winner = state.players.find((p) => p.id === participantIds[0]);
        if (winner?.barbarians) {
          winner.barbarians.prisonersCount += barbCount;
        }
      } else {
        let remainingPrisoners = barbCount;
        const sortedParticipants = [...participantIds].sort(
          (a, b) => (byPlayer[b] || 0) - (byPlayer[a] || 0)
        );
        for (const pid of sortedParticipants) {
          const pl = state.players.find((p) => p.id === pid);
          if (!pl?.barbarians) continue;
          if (remainingPrisoners > 0) {
            pl.barbarians.prisonersCount += 1;
            remainingPrisoners -= 1;
          } else {
            pl.barbarians.goldCoins += 3;
          }
        }
        if (remainingPrisoners > 0) {
          const topPlayer = state.players.find((p) => p.id === sortedParticipants[0]);
          if (topPlayer?.barbarians) {
            topPlayer.barbarians.prisonersCount += remainingPrisoners;
          }
        }
      }

      mb.hexBarbarians[hexId] = 0;

      // Tirada del dado de colores (pérdida de caballeros en 1 de las 3 direcciones y +3 oros de compensación)
      const colors: Array<'GREEN' | 'PURPLE' | 'BROWN'> = ['GREEN', 'PURPLE', 'BROWN'];
      const rolledColor = colors[Math.floor(random() * 3)];
      mb.lastColorDie = rolledColor;
      const colorDirIdx = colors.indexOf(rolledColor);

      hexEdges.forEach((edge, idx) => {
        if (idx % 3 === colorDirIdx && mb.edgeKnights[edge.id]) {
          const lostKnight = mb.edgeKnights[edge.id];
          const owner = state.players.find((p) => p.id === lostKnight.playerId);
          if (owner?.barbarians) {
            owner.barbarians.knightsReserve += 1;
            owner.barbarians.goldCoins += 3;
          }
          delete mb.edgeKnights[edge.id];
        }
      });

      addLog(
        state,
        `🛡️ ¡Victoria contra los bárbaros en la costa! Se capturaron ${barbCount} prisionero(s) y el dado de colores señaló ${rolledColor} (+3 oros por baja).`,
        'AWARD'
      );
    }
  }

  refreshConqueredHexesAndVertices(state);
}

export function onBarbariansTurnStart(state: GameState, activePlayerId: string): void {
  const mb = state.barbarians;
  if (!mb) return;
  mb.epidemicActiveThisTurn = false;

  const p = state.players.find((pl) => pl.id === activePlayerId);
  if (p?.barbarians) {
    p.barbarians.goldPurchasesThisTurn = 0;
    p.barbarians.wagonBoostedThisTurn = false;
    p.barbarians.wagonMpRemaining = WAGON_LEVELS[p.barbarians.wagonLevel].movementPoints;
  }

  for (const k of Object.values(mb.edgeKnights)) {
    if (k.playerId === activePlayerId) {
      k.mpRemaining = 3;
      k.boostedThisTurn = false;
      k.placedAtCastleThisTurn = false;
    }
  }
}

export function calculateBarbariansPlayerVP(state: GameState, player: PlayerState): {
  extraPublicVP: number;
  conqueredBuildingPenalty: number;
  requiredVPBoost: number;
} {
  const mb = state.barbarians;
  const pb = player.barbarians;
  if (!mb || !pb) {
    return { extraPublicVP: 0, conqueredBuildingPenalty: 0, requiredVPBoost: 0 };
  }

  if (mb.scenario === 'RIVERS_OF_CATAN') {
    updateWealthiestAndPoorestTitles(state);
  }
  if (mb.variants.harborMaster) {
    updateHarborMasterTitle(state);
  }

  let extraPublicVP = 0;
  let conqueredBuildingPenalty = 0;
  let requiredVPBoost = 0;

  // 1. Los pescadores de Catán: Bota vieja exige +1 PV para ganar
  if (pb.hasOldBoot) {
    requiredVPBoost += 1;
  }

  // 2. Los ríos de Catán: Colono más rico (+1 PV) y Colono pobre (-2 PV)
  if (mb.scenario === 'RIVERS_OF_CATAN') {
    if (pb.isWealthiestSettler) extraPublicVP += 1;
    if (pb.isPoorestSettler) extraPublicVP -= 2;
  }

  // 3. La ruta de las caravanas: poblados y ciudades entre 2 camellos valen +1 PV
  if (mb.scenario === 'THE_CARAVANS' && mb.camelEdgeIds.length >= 2) {
    const camelSet = new Set(mb.camelEdgeIds);
    for (const v of Object.values(state.board.vertices)) {
      if (v.playerId === player.id && v.building !== null) {
        const adjacentCamels = v.adjacentEdgeIds.filter((eid) => camelSet.has(eid)).length;
        if (adjacentCamels >= 2) {
          extraPublicVP += 1;
        }
      }
    }
  }

  // 4. El ataque de los bárbaros: cada 2 prisioneros = +1 PV; poblados/ciudades conquistados valen 0 PV
  if (mb.scenario === 'BARBARIAN_ATTACK') {
    extraPublicVP += Math.floor(pb.prisonersCount / 2);
    const conqueredVertSet = new Set(mb.conqueredVertexIds);
    for (const v of Object.values(state.board.vertices)) {
      if (v.playerId === player.id && v.building !== null && conqueredVertSet.has(v.id)) {
        conqueredBuildingPenalty += v.building === 'CITY' ? 2 : 1;
      }
    }
  }

  // 5. Mercaderes y Bárbaros: +1 PV por mercancía entregada, +1 PV por carromato Nivel 5, +1 PV por cartas Avance Tecnológico
  if (mb.scenario === 'TRADERS_AND_BARBARIANS') {
    extraPublicVP += pb.deliveredCommoditiesCount;
    if (pb.wagonLevel === 5) extraPublicVP += 1;
    extraPublicVP += pb.scenarioDevCards.filter((c) =>
      ['TECH_TOOLS', 'TECH_QUARRY', 'TECH_GLASS'].includes(c.type)
    ).length;
  }

  // 6. Variante El capitán del puerto (+2 PV)
  if (mb.variants.harborMaster && mb.harborMasterPlayerId === player.id) {
    extraPublicVP += 2;
  }

  return { extraPublicVP, conqueredBuildingPenalty, requiredVPBoost };
}

export function applyBarbariansAction(
  state: GameState,
  playerId: string,
  action: GameAction,
  hooks: BarbariansHooks,
  context: RuleContext
): boolean {
  if (!action.type.startsWith('MB_')) return false;
  const mb = state.barbarians;
  requireRule(mb && hasBarbarians(state.config), 'La expansión Mercaderes y Bárbaros no está activa.');
  const actor = getPlayer(state, playerId);
  const pb = actor.barbarians!;
  requireRule(pb, 'Estado de jugador no inicializado para Mercaderes y Bárbaros.');

  const isMyMainTurn = state.turn.activePlayerId === playerId && state.phase === 'MAIN_PHASE';
  const isMyBuildTurn =
    state.turn.activePlayerId === playerId &&
    (state.phase === 'MAIN_PHASE' || state.phase === 'SPECIAL_BUILD_PHASE');

  const spendFishTokens = (tokenIds: string[], requiredFish: number): void => {
    requireRule(isMyMainTurn, 'Solo puedes usar fichas de pescado durante tu turno principal.');
    const selected: FishToken[] = [];
    for (const tid of tokenIds) {
      const found = pb.fishTokens.find((t) => t.id === tid);
      requireRule(found && !found.isOldBoot, 'Ficha de pescado no válida.');
      selected.push(found!);
    }
    const sum = selected.reduce((acc, t) => acc + t.fishCount, 0);
    requireRule(sum >= requiredFish, `Necesitas al menos ${requiredFish} pescados para esta acción.`);
    pb.fishTokens = pb.fishTokens.filter((t) => !tokenIds.includes(t.id));
    mb!.fishDiscard.push(...selected);
  };

  switch (action.type) {
    case 'MB_FISH_REMOVE_ROBBER': {
      spendFishTokens(action.tokenIds, 2);
      for (const h of Object.values(state.board.hexes)) h.hasRobber = false;
      state.board.robberHexId = '';
      addLog(state, `🐟 ${actor.name} gastó pescado (2) para retirar al ladrón del tablero.`, 'ROBBER', actor.id);
      return true;
    }

    case 'MB_FISH_STEAL_RESOURCE': {
      const victim = getPlayer(state, action.targetPlayerId);
      requireRule(victim.id !== actor.id, 'Debes elegir a otro jugador.');
      spendFishTokens(action.tokenIds, 3);
      const stolen = stealRandomResource(victim, actor, context.random);
      requireRule(stolen !== null, 'Ese jugador no tiene cartas de materia prima.');
      addLog(state, `🐟 ${actor.name} gastó pescado (3) y robó 1 materia prima a ${victim.name}.`, 'ROBBER', actor.id);
      return true;
    }

    case 'MB_FISH_BANK_RESOURCE': {
      spendFishTokens(action.tokenIds, 4);
      const gained = giveRes(state, actor, action.resource, 1);
      requireRule(gained > 0, 'No queda esa materia prima en la banca.');
      addLog(
        state,
        `🐟 ${actor.name} gastó pescado (4) y tomó 1 ${RESOURCE_META[action.resource].name} de la banca.`,
        'TRADE',
        actor.id
      );
      return true;
    }

    case 'MB_FISH_FREE_ROAD': {
      const edge = state.board.edges[action.edgeId];
      requireRule(edge && edge.isLand && edge.building === null, 'Camino no válido para construir carretera.');
      requireRule(actor.roadsLeft > 0, 'No te quedan carreteras disponibles.');
      spendFishTokens(action.tokenIds, 5);
      edge!.building = 'ROAD';
      edge!.playerId = actor.id;
      actor.roadsLeft -= 1;
      state.longestRoadPlayerId = updateLongestRoadAward(
        state.board,
        state.players,
        state.longestRoadPlayerId,
        state.config.seafarersCoastConnection
      );
      hooks.score(state);
      addLog(state, `🐟 ${actor.name} gastó pescado (5) y construyó 1 Carretera gratis.`, 'BUILD', actor.id);
      return true;
    }

    case 'MB_FISH_FREE_DEV_CARD': {
      requireRule(state.devDeck.length > 0, 'No quedan cartas de desarrollo en el mazo.');
      spendFishTokens(action.tokenIds, 7);
      const card = state.devDeck.shift()!;
      card.boughtAtTurn = state.turn.turnNumber;
      actor.devCards.push(card);
      hooks.score(state);
      addLog(state, `🐟 ${actor.name} gastó pescado (7) y obtuvo 1 Carta de Desarrollo gratis.`, 'DEV', actor.id);
      return true;
    }

    case 'MB_PASS_OLD_BOOT': {
      requireRule(isMyMainTurn && pb.hasOldBoot, 'No tienes la Bota vieja o no es tu turno.');
      const target = getPlayer(state, action.targetPlayerId);
      requireRule(
        target.id !== actor.id && target.publicVictoryPoints >= actor.publicVictoryPoints,
        'Solo puedes entregar la Bota vieja a un jugador que tenga tantos o más Puntos de Victoria que tú.'
      );
      pb.hasOldBoot = false;
      target.barbarians!.hasOldBoot = true;
      hooks.score(state);
      addLog(state, `👢 ${actor.name} entregó la «Bota vieja» a ${target.name}.`, 'INFO', actor.id);
      return true;
    }

    case 'MB_PLACE_BRIDGE': {
      requireRule(isMyBuildTurn, 'Solo puedes construir puentes en tu fase de construcción.');
      requireRule(mb!.scenario === 'RIVERS_OF_CATAN', 'Los puentes son exclusivos de Los ríos de Catán.');
      requireRule(pb.bridgesLeft > 0, 'Ya has construido tus 3 puentes.');
      requireRule(
        mb!.bridgeSiteEdgeIds.includes(action.edgeId),
        'Solo puedes construir un puente en uno de los pasos de puente marcados sobre el río.'
      );
      const edge = state.board.edges[action.edgeId];
      requireRule(edge && edge.building === null, 'Ese lugar de puente ya está ocupado.');
      const connects = edge!.vertexIds.some((vid) => {
        const v = state.board.vertices[vid];
        if (!v) return false;
        if (v.playerId === actor.id && v.building !== null) return true;
        return v.adjacentEdgeIds.some((aeid) => {
          const ae = state.board.edges[aeid];
          return ae && ae.playerId === actor.id && ae.building === 'ROAD';
        });
      });
      requireRule(connects, 'El puente debe conectarse a una carretera, poblado o ciudad propia.');
      payRes(state, actor, { BRICK: 2, WOOD: 1 });
      edge!.building = 'ROAD';
      edge!.hasBridge = true;
      edge!.playerId = actor.id;
      pb.bridgesLeft -= 1;
      pb.goldCoins += 3;
      mb!.bridgeOwners[edge!.id] = actor.id;
      updateWealthiestAndPoorestTitles(state);
      state.longestRoadPlayerId = updateLongestRoadAward(
        state.board,
        state.players,
        state.longestRoadPlayerId,
        state.config.seafarersCoastConnection
      );
      hooks.score(state);
      addLog(
        state,
        `🌉 ${actor.name} construyó un Puente sobre el río y recibió +3 monedas de oro.`,
        'BUILD',
        actor.id
      );
      return true;
    }

    case 'MB_BUY_RESOURCE_WITH_GOLD': {
      // Regla oficial: hasta 2 veces por turno, 2 monedas de oro = 1 materia prima (no permitido en fase de construcción especial)
      requireRule(isMyMainTurn, 'Solo puedes comprar materias primas con oro durante tu turno principal.');
      requireRule(pb.goldCoins >= 2, 'Necesitas al menos 2 monedas de oro.');
      requireRule(pb.goldPurchasesThisTurn < 2, 'Solo puedes comprar hasta 2 materias primas con oro por turno.');
      const gained = giveRes(state, actor, action.resource, 1);
      requireRule(gained > 0, 'No queda esa materia prima en la banca.');
      pb.goldCoins -= 2;
      pb.goldPurchasesThisTurn += 1;
      updateWealthiestAndPoorestTitles(state);
      hooks.score(state);
      addLog(
        state,
        `🪙 ${actor.name} compró 1 ${RESOURCE_META[action.resource].name} por 2 monedas de oro.`,
        'TRADE',
        actor.id
      );
      return true;
    }

    case 'MB_SELL_RESOURCE_FOR_GOLD': {
      requireRule(isMyMainTurn, 'Solo puedes cambiar recursos por oro durante tu turno principal.');
      const ratio = action.ratio;
      requireRule((actor.resources[action.resource] || 0) >= ratio, `Necesitas ${ratio} cartas de ese recurso.`);
      actor.resources[action.resource] -= ratio;
      state.bank[action.resource] = (state.bank[action.resource] || 0) + ratio;
      pb.goldCoins += 1;
      updateWealthiestAndPoorestTitles(state);
      hooks.score(state);
      addLog(
        state,
        `🪙 ${actor.name} cambió ${ratio} ${RESOURCE_META[action.resource].name} por +1 moneda de oro.`,
        'TRADE',
        actor.id
      );
      return true;
    }

    case 'MB_VOTE_CAMEL': {
      requireRule(mb!.scenario === 'THE_CARAVANS', 'Acción exclusiva de La ruta de las caravanas.');
      const validEdges = mb!.pendingCamelVote?.validEdgeIds || getValidCamelEdges(state);
      requireRule(validEdges.includes(action.edgeId), 'Ese camino no es válido para continuar la caravana.');
      const sheep = Math.max(0, action.sheepCards || 0);
      const wheat = Math.max(0, action.wheatCards || 0);
      if (sheep > 0 || wheat > 0) {
        payRes(state, actor, { SHEEP: sheep, WHEAT: wheat });
      }
      mb!.camelEdgeIds.push(action.edgeId);
      mb!.camelsRemaining = Math.max(0, mb!.camelsRemaining - 1);
      mb!.pendingCamelVote = null;
      state.longestRoadPlayerId = updateLongestRoadAward(
        state.board,
        state.players,
        state.longestRoadPlayerId,
        state.config.seafarersCoastConnection
      );
      hooks.score(state);
      addLog(
        state,
        `🐪 ${actor.name} colocó un nuevo camello en la caravana${sheep + wheat > 0 ? ` aportando ${sheep + wheat} carta(s) en la votación` : ''}.`,
        'BUILD',
        actor.id
      );
      return true;
    }

    case 'MB_BUY_SCENARIO_DEV_CARD': {
      requireRule(isMyBuildTurn, 'Solo puedes comprar cartas de desarrollo en tu turno.');
      requireRule(
        mb!.scenario === 'BARBARIAN_ATTACK' || mb!.scenario === 'TRADERS_AND_BARBARIANS',
        'Este escenario usa el mazo estándar.'
      );
      requireRule(mb!.scenarioDevDeck.length > 0, 'No quedan cartas de desarrollo en el mazo del escenario.');
      payRes(state, actor, BUILDING_COSTS.DEV_CARD);
      const card = mb!.scenarioDevDeck.shift()!;
      pb.scenarioDevCards.push(card);

      // En El ataque de los bárbaros las cartas se juegan inmediatamente
      if (card.type === 'ARM_KNIGHT') {
        const castleEdge = Object.values(state.board.edges).find(
          (e) =>
            e.isLand &&
            e.hexIds.some((hid) => mb!.castleHexIds.includes(hid)) &&
            !mb!.edgeKnights[e.id]
        );
        if (castleEdge && pb.knightsReserve > 0) {
          pb.knightsReserve -= 1;
          mb!.edgeKnights[castleEdge.id] = {
            id: `ek-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            playerId: actor.id,
            edgeId: castleEdge.id,
            mpRemaining: 3,
            placedAtCastleThisTurn: true,
          };
        }
      } else if (card.type === 'STRONG_KNIGHT') {
        const freeEdge = Object.values(state.board.edges).find(
          (e) => e.isLand && !mb!.edgeKnights[e.id]
        );
        if (freeEdge && pb.knightsReserve > 0) {
          pb.knightsReserve -= 1;
          mb!.edgeKnights[freeEdge.id] = {
            id: `ek-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            playerId: actor.id,
            edgeId: freeEdge.id,
            mpRemaining: 3,
          };
        }
      } else if (card.type === 'PRISONER') {
        const hexWithBarb = mb!.coastalHexIds.find((hid) => (mb!.hexBarbarians[hid] || 0) > 0);
        if (hexWithBarb) {
          mb!.hexBarbarians[hexWithBarb] -= 1;
          pb.prisonersCount += 1;
          refreshConqueredHexesAndVertices(state);
        }
      } else if (card.type === 'TREASON') {
        pb.goldCoins += 2;
      } else if (card.type === 'GOOD_TRIP') {
        pb.wagonMpRemaining = WAGON_LEVELS[pb.wagonLevel].movementPoints;
      } else if (card.type === 'TB_ROAD_BUILDING') {
        state.turn.freeRoadsRemaining = 2;
        state.phase = 'ROAD_BUILDING_DEV';
      }

      hooks.score(state);
      addLog(
        state,
        `📜 ${actor.name} adquirió y activó la carta «${card.title}»: ${card.description}`,
        'DEV',
        actor.id
      );
      return true;
    }

    case 'MB_PLACE_EDGE_KNIGHT': {
      requireRule(isMyBuildTurn, 'Solo puedes desplegar caballeros en tu turno.');
      requireRule(pb.knightsReserve > 0, 'No te quedan caballeros en tu reserva.');
      const edge = state.board.edges[action.edgeId];
      requireRule(edge && edge.isLand && !mb!.edgeKnights[edge.id], 'Ese camino no está libre.');
      pb.knightsReserve -= 1;
      mb!.edgeKnights[edge!.id] = {
        id: `ek-${Date.now()}`,
        playerId: actor.id,
        edgeId: edge!.id,
        mpRemaining: 3,
      };
      resolveBarbarianAttackBattles(state, context.random);
      hooks.score(state);
      addLog(state, `騎士 ${actor.name} desplegó un Caballero en el camino.`, 'BUILD', actor.id);
      return true;
    }

    case 'MB_MOVE_EDGE_KNIGHT': {
      requireRule(isMyBuildTurn, 'Solo puedes mover caballeros en tu turno.');
      const knight = mb!.edgeKnights[action.fromEdgeId];
      requireRule(knight && knight.playerId === actor.id, 'No tienes un caballero en ese camino.');
      requireRule(knight!.mpRemaining > 0, 'Ese caballero ya agotó sus puntos de movimiento.');
      const toEdge = state.board.edges[action.toEdgeId];
      requireRule(toEdge && toEdge.isLand && !mb!.edgeKnights[toEdge.id], 'Camino de destino ocupado o inválido.');
      delete mb!.edgeKnights[action.fromEdgeId];
      knight!.edgeId = toEdge!.id;
      knight!.mpRemaining = Math.max(0, knight!.mpRemaining - 1);
      knight!.placedAtCastleThisTurn = false;
      mb!.edgeKnights[toEdge!.id] = knight!;
      resolveBarbarianAttackBattles(state, context.random);
      hooks.score(state);
      addLog(state, `⚔️ ${actor.name} desplazó a su Caballero por los caminos.`, 'BUILD', actor.id);
      return true;
    }

    case 'MB_BOOST_EDGE_KNIGHT': {
      requireRule(isMyBuildTurn, 'No es tu turno.');
      const knight = mb!.edgeKnights[action.edgeId];
      requireRule(knight && knight.playerId === actor.id && !knight.boostedThisTurn, 'Caballero no válido o ya potenciado.');
      payRes(state, actor, { WHEAT: 1 });
      knight!.mpRemaining += 2;
      knight!.boostedThisTurn = true;
      addLog(state, `🌾 ${actor.name} alimentó a su Caballero con 1 Trigo (+2 puntos de movimiento).`, 'BUILD', actor.id);
      return true;
    }

    case 'MB_EXPEL_HEX_BARBARIANS': {
      resolveBarbarianAttackBattles(state, context.random, true);
      hooks.score(state);
      return true;
    }

    case 'MB_UPGRADE_WAGON': {
      requireRule(isMyBuildTurn, 'Solo puedes mejorar tu carromato durante tu turno.');
      requireRule(mb!.scenario === 'TRADERS_AND_BARBARIANS', 'El carromato es exclusivo de Mercaderes y Bárbaros.');
      requireRule(pb.wagonLevel < 5, 'Tu carromato ya alcanzó el Nivel 5 máximo.');
      const nextLevel = (pb.wagonLevel + 1) as 2 | 3 | 4 | 5;
      const spec = WAGON_LEVELS[nextLevel];
      payRes(state, actor, spec.upgradeCost);
      pb.wagonLevel = nextLevel;
      pb.wagonMpRemaining += 1;
      hooks.score(state);
      addLog(
        state,
        `🛞 ${actor.name} mejoró su carromato a ${spec.title} (${spec.movementPoints} PM, +${spec.goldReward} oros por entrega).`,
        'BUILD',
        actor.id
      );
      return true;
    }

    case 'MB_BOOST_WAGON': {
      requireRule(isMyMainTurn, 'Solo puedes impulsar tu carromato durante tu turno principal.');
      requireRule(!pb.wagonBoostedThisTurn, 'Solo puedes gastar 1 Trigo por turno para impulsar tu carromato.');
      payRes(state, actor, { WHEAT: 1 });
      pb.wagonMpRemaining += 2;
      pb.wagonBoostedThisTurn = true;
      addLog(state, `🌾 ${actor.name} gastó 1 Trigo para sumar +2 puntos de movimiento a su carromato.`, 'BUILD', actor.id);
      return true;
    }

    case 'MB_MOVE_WAGON': {
      requireRule(isMyMainTurn, 'Solo puedes mover tu carromato durante tu turno principal (no en construcción adicional).');
      requireRule(mb!.scenario === 'TRADERS_AND_BARBARIANS', 'Acción exclusiva de Mercaderes y Bárbaros.');
      const fromVertexId = pb.wagonVertexId;
      requireRule(fromVertexId, 'Tu carromato aún no está en el tablero.');
      const toVertex = state.board.vertices[action.toVertexId];
      requireRule(toVertex && toVertex.isLand, 'Encrucijada de destino no válida.');

      // Buscar arista que conecta fromVertexId con action.toVertexId
      const connectingEdge = Object.values(state.board.edges).find(
        (e) =>
          (e.vertexIds[0] === fromVertexId && e.vertexIds[1] === action.toVertexId) ||
          (e.vertexIds[1] === fromVertexId && e.vertexIds[0] === action.toVertexId)
      );
      requireRule(connectingEdge, 'Debes mover tu carromato a una encrucijada adyacente conectada por un camino.');

      const hasRoad = connectingEdge!.building === 'ROAD';
      const isRivalRoad = hasRoad && connectingEdge!.playerId !== null && connectingEdge!.playerId !== actor.id;
      const hasBarbarian = mb!.edgeBarbarians.includes(connectingEdge!.id);
      const isDamagedRoad = pb.damagedRoadEdgeIds.includes(connectingEdge!.id);

      let mpCost = hasRoad && !isDamagedRoad ? 1 : 2;
      if (hasBarbarian) mpCost += 2;

      requireRule(
        pb.wagonMpRemaining >= mpCost,
        `Necesitas ${mpCost} puntos de movimiento para cruzar ese camino (tienes ${pb.wagonMpRemaining}).`
      );

      if (isRivalRoad) {
        requireRule(pb.goldCoins >= 1, 'Necesitas 1 moneda de oro para pagar el peaje de la carretera rival.');
        const roadOwner = state.players.find((p) => p.id === connectingEdge!.playerId);
        pb.goldCoins -= 1;
        if (roadOwner?.barbarians) {
          roadOwner.barbarians.goldCoins += 1;
        }
      }

      pb.wagonMpRemaining -= mpCost;
      pb.wagonVertexId = action.toVertexId;

      // Comprobar si ha llegado a un Hexágono de Destino
      const destEntry = Object.values(mb!.destinationHexes).find(
        (d) => d.centerVertexId === action.toVertexId || d.cornerVertexIds.includes(action.toVertexId)
      );

      if (destEntry) {
        if (!pb.activeCommodityTile) {
          // Primera visita a un hexágono de destino: roba su primera ficha de mercancía
          const nextTile = destEntry.stack.shift() || DESTINATION_HEX_META[destEntry.type].produces[0];
          pb.activeCommodityTile = nextTile;
          pb.wagonMpRemaining = 0;
          addLog(
            state,
            `📦 ${actor.name} llegó a ${destEntry.name} y recogió un cargamento de ${COMMODITY_DELIVERY_META[nextTile].name} (destino: ${COMMODITY_DELIVERY_META[nextTile].targetName}).`,
            'INFO',
            actor.id
          );
        } else {
          const requiredDestType = COMMODITY_DELIVERY_META[pb.activeCommodityTile].targetDestination;
          if (destEntry.type === requiredDestType) {
            const deliveredName = COMMODITY_DELIVERY_META[pb.activeCommodityTile].name;
            const goldEarned = WAGON_LEVELS[pb.wagonLevel].goldReward;
            pb.deliveredCommoditiesCount += 1;
            pb.goldCoins += goldEarned;
            const nextTile = destEntry.stack.shift() || DESTINATION_HEX_META[destEntry.type].produces[0];
            pb.activeCommodityTile = nextTile;
            pb.wagonMpRemaining = 0; // Regla oficial (pág. 18): al llegar a destino finaliza el movimiento
            hooks.score(state);
            addLog(
              state,
              `🏆 ¡${actor.name} entregó ${deliveredName} en ${destEntry.name}! Ganó +1 Punto de Victoria, +${goldEarned} monedas de oro y recogió ${COMMODITY_DELIVERY_META[nextTile].name}.`,
              'AWARD',
              actor.id
            );
          }
        }
      }
      return true;
    }

    case 'MB_MOVE_EDGE_BARBARIAN': {
      const idx = mb!.edgeBarbarians.indexOf(action.fromEdgeId);
      requireRule(idx >= 0, 'No hay un bárbaro en ese camino.');
      const toEdge = state.board.edges[action.toEdgeId];
      requireRule(toEdge && toEdge.isLand && !mb!.edgeBarbarians.includes(toEdge.id), 'Camino de destino no válido.');
      mb!.edgeBarbarians[idx] = toEdge!.id;
      if (toEdge!.building === 'ROAD' && toEdge!.playerId && toEdge!.playerId !== actor.id) {
        const victim = state.players.find((p) => p.id === toEdge!.playerId);
        if (victim) {
          stealRandomResource(victim, actor, context.random);
        }
      }
      addLog(state, `⚔️ ${actor.name} reubicó a un bárbaro en los caminos.`, 'ROBBER', actor.id);
      return true;
    }

    case 'MB_REPAIR_ROAD': {
      requireRule(isMyBuildTurn, 'Solo puedes reparar carreteras en tu turno.');
      requireRule(pb.damagedRoadEdgeIds.includes(action.edgeId), 'Esa carretera no está dañada.');
      payRes(state, actor, BUILDING_COSTS.ROAD);
      pb.damagedRoadEdgeIds = pb.damagedRoadEdgeIds.filter((id) => id !== action.edgeId);
      addLog(state, `🔨 ${actor.name} reparó su carretera dañada por el terremoto.`, 'BUILD', actor.id);
      return true;
    }

    case 'MB_TRADE_TOKEN_DISMISS_ROBBER': {
      requireRule(isMyMainTurn && mb!.variants.catanForTwo, 'Variante Catán para dos no activa.');
      const maxOtherVP = Math.max(
        ...state.players.filter((p) => p.id !== actor.id).map((p) => p.publicVictoryPoints)
      );
      const tokenCost = actor.publicVictoryPoints > maxOtherVP ? 2 : 1;
      requireRule(pb.tradeTokens >= tokenCost, `Necesitas ${tokenCost} ficha(s) de comercio.`);
      pb.tradeTokens -= tokenCost;
      const desertHex = Object.values(state.board.hexes).find((h) => h.terrain === 'DESERT');
      for (const h of Object.values(state.board.hexes)) h.hasRobber = false;
      if (desertHex) {
        desertHex.hasRobber = true;
        state.board.robberHexId = desertHex.id;
      } else {
        state.board.robberHexId = '';
      }
      addLog(state, `🪙 ${actor.name} usó ${tokenCost} ficha(s) de comercio para enviar al ladrón al desierto.`, 'ROBBER', actor.id);
      return true;
    }

    default:
      return false;
  }
}

export function barbariansBotActions(state: GameState, botPlayerId: string): GameAction[] {
  const mb = state.barbarians;
  const bot = state.players.find((p) => p.id === botPlayerId);
  const pb = bot?.barbarians;
  if (!mb || !bot || !pb) return [];

  const actions: GameAction[] = [];

  // 1. Si hay una votación de camello pendiente, colocar camello en el primer camino válido
  if (mb.pendingCamelVote && mb.pendingCamelVote.validEdgeIds.length > 0) {
    actions.push({
      type: 'MB_VOTE_CAMEL',
      edgeId: mb.pendingCamelVote.validEdgeIds[0],
      sheepCards: 0,
      wheatCards: 0,
    });
  }

  // 2. Si tiene la Bota vieja y hay un rival con >= PV, entregársela
  if (pb.hasOldBoot) {
    const candidate = state.players.find(
      (p) => p.id !== bot.id && p.publicVictoryPoints >= bot.publicVictoryPoints
    );
    if (candidate) {
      actions.push({ type: 'MB_PASS_OLD_BOOT', targetPlayerId: candidate.id });
    }
  }

  // 3. Si tiene >= 4 pescados en Los pescadores de Catán, cambiar por recurso de la banca
  if (mb.scenario === 'FISHERMEN_OF_CATAN') {
    const totalFish = pb.fishTokens.reduce((s, t) => s + t.fishCount, 0);
    if (totalFish >= 4) {
      let acc = 0;
      const ids: string[] = [];
      for (const t of pb.fishTokens) {
        ids.push(t.id);
        acc += t.fishCount;
        if (acc >= 4) break;
      }
      actions.push({ type: 'MB_FISH_BANK_RESOURCE', tokenIds: ids, resource: 'ORE' });
    }
  }

  // 4. Si tiene >= 4 monedas de oro y aún puede comprar recursos con oro
  if (pb.goldCoins >= 4 && pb.goldPurchasesThisTurn < 2) {
    const scarceRes = ALL_RESOURCES.reduce((minR, r) =>
      (bot.resources[r] || 0) < (bot.resources[minR] || 0) ? r : minR
    );
    actions.push({ type: 'MB_BUY_RESOURCE_WITH_GOLD', resource: scarceRes });
  }

  // 5. En Mercaderes y Bárbaros: mejorar carromato si tiene recursos, y mover carromato hacia el destino
  if (mb.scenario === 'TRADERS_AND_BARBARIANS') {
    if (pb.wagonLevel < 5) {
      const nextSpec = WAGON_LEVELS[(pb.wagonLevel + 1) as 2 | 3 | 4 | 5];
      if (hasRes(bot, nextSpec.upgradeCost)) {
        actions.push({ type: 'MB_UPGRADE_WAGON' });
      }
    }
    if (pb.wagonVertexId && pb.wagonMpRemaining >= 2) {
      const currentV = state.board.vertices[pb.wagonVertexId];
      if (currentV && currentV.adjacentVertexIds.length > 0) {
        const targetType = pb.activeCommodityTile
          ? COMMODITY_DELIVERY_META[pb.activeCommodityTile].targetDestination
          : null;
        const targetDest = Object.values(mb.destinationHexes).find(
          (d) => !targetType || d.type === targetType
        );
        const targetV = targetDest ? state.board.vertices[targetDest.centerVertexId] : null;
        let chosenNextId = currentV.adjacentVertexIds[0];
        if (targetV) {
          chosenNextId = [...currentV.adjacentVertexIds].sort((a, b) => {
            const va = state.board.vertices[a];
            const vb = state.board.vertices[b];
            if (!va || !vb) return 0;
            const da = Math.hypot(va.x - targetV.x, va.y - targetV.y);
            const db = Math.hypot(vb.x - targetV.x, vb.y - targetV.y);
            return da - db;
          })[0];
        }
        actions.push({ type: 'MB_MOVE_WAGON', toVertexId: chosenNextId });
      }
    }
  }

  return actions;
}
