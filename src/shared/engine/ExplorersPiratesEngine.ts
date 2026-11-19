import { ALL_RESOURCES, RESOURCE_META } from '../constants';
import {
  EXPLORERS_PIRATES_SCENARIOS,
  EP_BUILDING_COSTS,
  EP_MISSION_META,
  EP_SPICE_PERK_META,
  canFitCargoItem,
  createEmptyExplorersPiratesPlayer,
  getPlayerShipBaseMP,
  hasExplorersPirates,
} from '../expansionsConfig';
import type { RuleContext } from '../citiesKnightsTypes';
import type {
  EPCargoItem,
  EPMissionId,
  EPShipState,
  EPUnexploredTileSecret,
  GameAction,
  GameState,
  PlayerState,
  ResourceType,
  SpicePerkType,
} from '../types';

export interface ExplorersPiratesHooks {
  score: (state: GameState) => void;
}

function addLog(
  state: GameState,
  message: string,
  type: 'INFO' | 'DICE' | 'BUILD' | 'TRADE' | 'ROBBER' | 'DEV' | 'AWARD' | 'SYSTEM' = 'INFO',
  playerId?: string
): void {
  const index = (state.logs[0]?.timestamp || state.createdAt) + 1;
  state.logs.unshift({
    id: `EP_${index}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: index,
    message,
    type,
    playerId,
  });
  state.logs.length = Math.min(state.logs.length, 80);
}

function requireRule(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function getPlayer(state: GameState, playerId: string): PlayerState {
  const p = state.players.find((pl) => pl.id === playerId);
  if (!p) throw new Error('Jugador no encontrado.');
  return p;
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

export function advanceMissionTrack(
  state: GameState,
  playerId: string,
  missionId: EPMissionId,
  steps: number = 1
): void {
  const ep = state.explorersPirates;
  const p = state.players.find((pl) => pl.id === playerId);
  if (!ep || !p?.explorersPirates || !ep.activeMissions.includes(missionId)) return;

  const prevStep = p.explorersPirates.missionProgress[missionId] || 0;
  const nextStep = Math.min(7, prevStep + steps);
  p.explorersPirates.missionProgress[missionId] = nextStep;

  // Regla oficial (pág. 11): Si varios jugadores empatan en la casilla más avanzada,
  // la tarjeta de punto de victoria (+1 PV) pertenece al que llegó PRIMERO a esa casilla (ficha de abajo).
  const currentLeaderId = ep.missionLeaderPlayerIds[missionId];
  const currentLeader = state.players.find((pl) => pl.id === currentLeaderId);
  const currentMax = currentLeader?.explorersPirates?.missionProgress[missionId] || 0;

  if (nextStep > currentMax && nextStep >= 1) {
    ep.missionLeaderPlayerIds[missionId] = playerId;
    addLog(
      state,
      `🏅 ¡${p.name} toma la delantera en «${EP_MISSION_META[missionId].title}» y consigue la tarjeta «${EP_MISSION_META[missionId].cardTitle}»!`,
      'AWARD',
      p.id
    );
  }
}

export function initializeExplorersPirates(state: GameState, random: () => number): void {
  const scenarioId = state.config.explorersPiratesScenario || 'EXPLORERS_AND_PIRATES_FULL';
  const scenarioSpec =
    EXPLORERS_PIRATES_SCENARIOS.find((s) => s.id === scenarioId) ||
    EXPLORERS_PIRATES_SCENARIOS[4];

  const allHexes = Object.values(state.board.hexes).sort((a, b) => a.center.x - b.center.x);
  const minX = Math.min(...allHexes.map((h) => h.center.x));
  const maxX = Math.max(...allHexes.map((h) => h.center.x));
  const midY =
    allHexes.reduce((sum, h) => sum + h.center.y, 0) / Math.max(1, allHexes.length);
  const spanX = Math.max(1, maxX - minX);

  const startingIslandHexIds: string[] = [];
  const centralSeaHexIds: string[] = [];
  const northUnexploredHexIds: string[] = [];
  const southUnexploredHexIds: string[] = [];

  for (const h of allHexes) {
    const normX = (h.center.x - minX) / spanX;
    if (normX <= 0.36) {
      startingIslandHexIds.push(h.id);
    } else if (normX <= 0.52 || Math.abs(h.center.y - midY) < state.board.hexSize * 0.75) {
      centralSeaHexIds.push(h.id);
    } else if (h.center.y < midY) {
      northUnexploredHexIds.push(h.id);
    } else {
      southUnexploredHexIds.push(h.id);
    }
  }

  // Configurar la Isla Inicial al Oeste (sin desiertos; terrenos productivos con números oficiales)
  const startTerrains: ResourceType[] = [
    'WOOD',
    'WOOD',
    'WOOD',
    'WOOD',
    'SHEEP',
    'SHEEP',
    'SHEEP',
    'ORE',
    'ORE',
    'ORE',
    'WHEAT',
    'WHEAT',
    'WHEAT',
    'BRICK',
    'BRICK',
  ];
  const startNumbers = [3, 3, 4, 4, 5, 6, 6, 8, 8, 9, 10, 10, 11, 11, 12, 2, 4, 5, 6, 8, 9, 10];

  startingIslandHexIds.forEach((hid, idx) => {
    const h = state.board.hexes[hid];
    if (!h) return;
    h.terrain = startTerrains[idx % startTerrains.length];
    h.numberToken = startNumbers[idx % startNumbers.length];
    h.hasRobber = false;
  });

  // Configurar el Canal Marítimo Central y el Consejo de Catán (hexágono D2 / D3)
  let councilHexId: string | null = null;
  for (const hid of centralSeaHexIds) {
    const h = state.board.hexes[hid];
    if (!h) continue;
    h.terrain = 'SEA';
    h.numberToken = null;
    h.hasRobber = false;
  }
  if (centralSeaHexIds.length > 0) {
    // Elegir el hexágono central más cercano a la isla inicial para el Consejo de Catán
    const sortedCentral = [...centralSeaHexIds].sort((a, b) => {
      const ha = state.board.hexes[a];
      const hb = state.board.hexes[b];
      return Math.abs(ha.center.y - midY) - Math.abs(hb.center.y - midY);
    });
    councilHexId = sortedCentral[0];
  }

  // Construir pilas de hexágonos inexplorados (Norte Verde y Sur Naranja)
  const unexploredSecrets: Record<string, EPUnexploredTileSecret> = {};
  const assignUnexploredRegion = (
    hexIds: string[],
    region: 'NORTH_GREEN' | 'SOUTH_ORANGE'
  ) => {
    const secretsPool: EPUnexploredTileSecret[] = [];
    const activeMissions = scenarioSpec.missions;

    if (activeMissions.includes('PIRATE_LAIRS')) {
      const lairNumbers = region === 'NORTH_GREEN' ? [8, 9, 10] : [9, 10, 11];
      for (const num of lairNumbers) {
        secretsPool.push({
          region,
          kind: 'PIRATE_LAIR',
          terrain: 'GOLD',
          numberToken: num,
        });
      }
    }

    if (activeMissions.includes('FISH_FOR_CATAN')) {
      const fishRolls: Array<1 | 2 | 3 | 4 | 5 | 6> =
        region === 'NORTH_GREEN' ? [1, 2, 3] : [4, 5, 6];
      for (const roll of fishRolls) {
        secretsPool.push({
          region,
          kind: 'FISH',
          terrain: 'SEA',
          numberToken: roll,
          fishRollNumber: roll,
        });
      }
    }

    if (activeMissions.includes('SPICES_FOR_CATAN')) {
      const perks: SpicePerkType[] =
        region === 'NORTH_GREEN'
          ? ['SWIFT_VOYAGE_1', 'PIRATE_BONUS_5', 'GOLD_TRADE_1']
          : ['SWIFT_VOYAGE_2', 'PIRATE_BONUS_4', 'GOLD_TRADE_2'];
      for (const perk of perks) {
        secretsPool.push({
          region,
          kind: 'SPICE',
          terrain: 'WOOD',
          numberToken: null,
          spicePerk: perk,
          spiceName: EP_SPICE_PERK_META[perk].name,
        });
      }
    }

    const baseTerrains: ResourceType[] = ['WOOD', 'SHEEP', 'WHEAT', 'ORE', 'BRICK', 'WOOD', 'ORE'];
    const baseTokens = region === 'NORTH_GREEN' ? [3, 4, 5, 6, 9, 10, 2, 5, 9] : [4, 5, 8, 9, 10, 11, 3, 4, 10];
    let tIdx = 0;
    while (secretsPool.length < hexIds.length) {
      secretsPool.push({
        region,
        kind: 'TERRAIN',
        terrain: baseTerrains[tIdx % baseTerrains.length],
        numberToken: baseTokens[tIdx % baseTokens.length],
      });
      tIdx++;
    }

    // Mezclar secretos de la región
    for (let i = secretsPool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [secretsPool[i], secretsPool[j]] = [secretsPool[j], secretsPool[i]];
    }

    hexIds.forEach((hid, idx) => {
      const h = state.board.hexes[hid];
      if (!h) return;
      h.terrain = 'FOG';
      h.numberToken = null;
      h.hasRobber = false;
      unexploredSecrets[hid] = secretsPool[idx % secretsPool.length];
    });
  };

  assignUnexploredRegion(northUnexploredHexIds, 'NORTH_GREEN');
  assignUnexploredRegion(southUnexploredHexIds, 'SOUTH_ORANGE');

  // Recalcular isLand e isCoastal en vértices y aristas
  const startSet = new Set(startingIslandHexIds);
  for (const v of Object.values(state.board.vertices)) {
    const touchesLand = v.hexIds.some((hid) => startSet.has(hid));
    const touchesSeaOrFog =
      v.hexIds.length < 3 ||
      v.hexIds.some((hid) => {
        const t = state.board.hexes[hid]?.terrain;
        return t === 'SEA' || t === 'FOG';
      });
    v.isLand = touchesLand || v.hexIds.some((hid) => state.board.hexes[hid]?.terrain !== 'SEA');
    v.isCoastal = touchesLand && touchesSeaOrFog;
    // En Piratas y Exploradores no hay puertos clásicos (siempre 3:1)
    v.port = null;
  }
  state.board.ports = [];

  for (const e of Object.values(state.board.edges)) {
    const hexTerrains = e.hexIds.map((hid) => state.board.hexes[hid]?.terrain);
    const hasSea = hexTerrains.includes('SEA') || e.hexIds.length === 1;
    const hasLand = hexTerrains.some((t) => t && t !== 'SEA' && t !== 'FOG');
    e.isCoastal = hasSea && hasLand;
    e.isLand = hasLand;
  }

  const startingCoastalCityVertexIds = Object.values(state.board.vertices)
    .filter((v) => v.hexIds.some((hid) => startSet.has(hid)) && v.isCoastal)
    .map((v) => v.id);

  const councilDeliveryVertexIds = councilHexId
    ? Object.values(state.board.vertices)
        .filter((v) => v.hexIds.includes(councilHexId!))
        .map((v) => v.id)
    : [];

  state.board.robberHexId = '';
  state.devDeck = [];
  state.longestRoadPlayerId = null;
  state.largestArmyPlayerId = null;

  for (const p of state.players) {
    p.explorersPirates = createEmptyExplorersPiratesPlayer();
    p.devCards = [];
  }

  state.explorersPirates = {
    scenario: scenarioId,
    activeMissions: [...scenarioSpec.missions],
    turnSubPhase: 'TRADE_AND_BUILD',
    startingIslandHexIds,
    startingCoastalCityVertexIds,
    councilHexId,
    councilDeliveryVertexIds,
    unexploredSecrets,
    ships: {},
    harborBasins: {},
    pirateLairs: {},
    fishGrounds: {},
    spiceVillages: {},
    activePirateShip: null,
    hasRolledFishThisTurn: false,
    lastFishRoll: null,
    missionProgressOrder: {
      PIRATE_LAIRS: [],
      FISH_FOR_CATAN: [],
      SPICES_FOR_CATAN: [],
    },
    missionLeaderPlayerIds: {
      PIRATE_LAIRS: null,
      FISH_FOR_CATAN: null,
      SPICES_FOR_CATAN: null,
    },
  };

  // Pre-asignar dársena costera inicial y barco inicial por jugador (se actualiza al colocar la Ciudad Portuaria en SETUP_SETTLEMENT_1)
  state.players.forEach((p, idx) => {
    const vid = startingCoastalCityVertexIds[idx % Math.max(1, startingCoastalCityVertexIds.length)];
    if (!vid || !state.explorersPirates || !p.explorersPirates) return;
    state.explorersPirates.harborBasins[vid] = {
      vertexId: vid,
      playerId: p.id,
      cargo: [],
    };
    const seaEdge = Object.values(state.board.edges).find(
      (e) => (!e.isLand || e.isCoastal) && e.vertexIds.includes(vid)
    );
    if (seaEdge) {
      const shipId = `ep-ship-${p.id}-init`;
      state.explorersPirates.ships[shipId] = {
        id: shipId,
        playerId: p.id,
        edgeId: seaEdge.id,
        cargo: ['SETTLER'],
        mpRemaining: getPlayerShipBaseMP(p.explorersPirates),
        hasMovedThisTurn: false,
        boostedThisTurn: false,
        paidPirateTributeThisTurn: false,
      };
    }
  });
}

export function onExplorersPiratesTurnStart(state: GameState, activePlayerId: string): void {
  const ep = state.explorersPirates;
  if (!ep) return;
  ep.turnSubPhase = 'TRADE_AND_BUILD';
  ep.hasRolledFishThisTurn = false;
  ep.lastFishRoll = null;

  const p = state.players.find((pl) => pl.id === activePlayerId);
  if (p?.explorersPirates) {
    p.explorersPirates.goldPurchasesThisTurn = 0;
    p.explorersPirates.spiceGoldTradesThisTurn = 0;
    const baseMP = getPlayerShipBaseMP(p.explorersPirates);
    for (const ship of Object.values(ep.ships)) {
      if (ship.playerId === activePlayerId) {
        ship.mpRemaining = baseMP;
        ship.hasMovedThisTurn = false;
        ship.boostedThisTurn = false;
        ship.paidPirateTributeThisTurn = false;
      }
    }
  }
}

export function onExplorersPiratesDiceProduction(
  state: GameState,
  diceSum: number,
  playersWhoReceivedResources: Set<string>
): void {
  const ep = state.explorersPirates;
  if (!ep || diceSum === 7) return;

  // 1. Producción de Ríos Auríferos liberados (2 monedas de oro por cada poblado o ciudad portuaria adyacente)
  for (const lair of Object.values(ep.pirateLairs)) {
    if (!lair.conquered || lair.numberToken !== diceSum) continue;
    const adjVerts = Object.values(state.board.vertices).filter(
      (v) => v.hexIds.includes(lair.hexId) && v.building !== null && v.playerId !== null
    );
    for (const v of adjVerts) {
      const owner = state.players.find((p) => p.id === v.playerId);
      if (owner?.explorersPirates) {
        owner.explorersPirates.goldCoins += 2;
        playersWhoReceivedResources.add(owner.id);
        addLog(
          state,
          `🪙 Río Aurífero (${diceSum}): ${owner.name} recibió +2 monedas de oro.`,
          'DICE',
          owner.id
        );
      }
    }
  }

  // 2. Regla Oficial (pág. 6): Oro de compensación (+1 moneda de oro a todo jugador que no obtenga recursos en una tirada distinta de 7)
  const compensatedNames: string[] = [];
  for (const p of state.players) {
    if (!playersWhoReceivedResources.has(p.id) && p.explorersPirates) {
      p.explorersPirates.goldCoins += 1;
      compensatedNames.push(p.name);
    }
  }
  if (compensatedNames.length > 0) {
    addLog(
      state,
      `🪙 Oro de compensación (+1 oro por no producir con el ${diceSum}): ${compensatedNames.join(', ')}.`,
      'DICE'
    );
  }
}

export function calculateExplorersPiratesPlayerVP(
  state: GameState,
  player: PlayerState
): number {
  const ep = state.explorersPirates;
  const pep = player.explorersPirates;
  if (!ep || !pep) return 0;

  let missionVP = 0;
  for (const mId of ep.activeMissions) {
    const step = Math.min(7, Math.max(0, pep.missionProgress[mId] || 0));
    missionVP += EP_MISSION_META[mId].stepVP[step] || 0;
    if (ep.missionLeaderPlayerIds[mId] === player.id) {
      missionVP += 1; // Tarjeta de líder de misión (+1 PV)
    }
  }
  return missionVP;
}

export function discoverUnexploredHexWithShip(
  state: GameState,
  player: PlayerState,
  ship: EPShipState,
  fogHexId: string
): void {
  const ep = state.explorersPirates!;
  const pep = player.explorersPirates!;
  const hex = state.board.hexes[fogHexId];
  const secret = ep.unexploredSecrets[fogHexId];
  if (!hex || hex.terrain !== 'FOG') return;

  // Regla oficial (pág. 7): Al descubrir un hexágono finaliza inmediatamente el movimiento de ese barco
  ship.mpRemaining = 0;
  ship.hasMovedThisTurn = true;

  if (!secret || secret.kind === 'TERRAIN') {
    const terrain: ResourceType = (secret?.terrain as ResourceType) || 'WOOD';
    const token = secret?.numberToken || 6;
    hex.terrain = terrain;
    hex.numberToken = token;
    giveRes(state, player, terrain, 1);
    addLog(
      state,
      `🧭 ¡Tierra descubierta! ${player.name} exploró ${RESOURCE_META[terrain].terrainName} (${token}) y recibió +1 ${RESOURCE_META[terrain].name}.`,
      'BUILD',
      player.id
    );
  } else if (secret.kind === 'SEA') {
    hex.terrain = 'SEA';
    hex.numberToken = null;
    pep.goldCoins += 2;
    addLog(
      state,
      `🧭 ¡Mar abierto descubierto! ${player.name} recibió +2 monedas de oro por la exploración.`,
      'BUILD',
      player.id
    );
  } else if (secret.kind === 'PIRATE_LAIR') {
    hex.terrain = 'GOLD';
    hex.numberToken = null; // El número permanece oculto bajo la guarida hasta conquistarla
    pep.goldCoins += 2;
    ep.pirateLairs[fogHexId] = {
      hexId: fogHexId,
      numberToken: secret.numberToken || 9,
      conquered: false,
      unitsByPlayer: {},
      waitingPickupByPlayer: {},
    };
    addLog(
      state,
      `🏴‍☠️ ¡Guarida de Piratas avistada en un Río Aurífero! ${player.name} recibió +2 monedas de oro. Desembarcad 3 unidades para conquistarla.`,
      'BUILD',
      player.id
    );
  } else if (secret.kind === 'FISH') {
    hex.terrain = 'SEA';
    const rollNum = secret.fishRollNumber || 3;
    hex.numberToken = rollNum;
    pep.goldCoins += 2;
    ep.fishGrounds[fogHexId] = {
      hexId: fogHexId,
      rollNumber: rollNum,
      discovered: true,
      hasFishShoal: true, // Aparece con un banco listo para pescar
    };
    addLog(
      state,
      `🐟 ¡Caladero de alta mar descubierto (Dado ${rollNum})! ${player.name} recibió +2 monedas de oro.`,
      'BUILD',
      player.id
    );
  } else if (secret.kind === 'SPICE') {
    hex.terrain = 'WOOD';
    hex.numberToken = null;
    pep.goldCoins += 2;
    const perk = secret.spicePerk || 'SWIFT_VOYAGE_1';
    const meta = EP_SPICE_PERK_META[perk];
    ep.spiceVillages[fogHexId] = {
      hexId: fogHexId,
      name: meta.name,
      perk,
      perkLabel: meta.shortLabel,
      discovered: true,
      sacksRemaining: state.players.length,
      merchantsPlayerIds: [],
    };
    addLog(
      state,
      `🌶️ ¡Aldea de las Especias descubierta (${meta.name} · ${meta.shortLabel})! ${player.name} recibió +2 monedas de oro y se colocaron ${state.players.length} sacos de especias.`,
      'BUILD',
      player.id
    );
  }

  delete ep.unexploredSecrets[fogHexId];
}

export function applyExplorersPiratesAction(
  state: GameState,
  playerId: string,
  action: GameAction,
  hooks: ExplorersPiratesHooks,
  context: RuleContext
): boolean {
  if (!action.type.startsWith('EP_')) return false;
  const ep = state.explorersPirates;
  requireRule(ep && hasExplorersPirates(state.config), 'La expansión Piratas y Exploradores no está activa.');
  const actor = getPlayer(state, playerId);
  const pep = actor.explorersPirates!;
  requireRule(pep, 'Estado de jugador no inicializado para Piratas y Exploradores.');

  const isMyMainTurn = state.turn.activePlayerId === playerId && state.phase === 'MAIN_PHASE';
  const isMyBuildTurn =
    state.turn.activePlayerId === playerId &&
    (state.phase === 'MAIN_PHASE' || state.phase === 'SPECIAL_BUILD_PHASE');

  switch (action.type) {
    case 'EP_UPGRADE_HARBOR_CITY': {
      requireRule(isMyBuildTurn, 'Solo puedes construir Ciudades Portuarias durante tu fase de construcción.');
      requireRule(pep.harborCitiesLeft > 0, 'Ya has construido tus 4 Ciudades Portuarias.');
      const v = state.board.vertices[action.vertexId];
      requireRule(
        v && v.playerId === actor.id && v.building === 'SETTLEMENT',
        'Debes seleccionar uno de tus poblados.'
      );
      requireRule(v!.isCoastal, 'Las Ciudades Portuarias solo pueden construirse en la costa.');
      payRes(state, actor, EP_BUILDING_COSTS.HARBOR_CITY);
      v!.building = 'CITY';
      v!.isHarborCity = true;
      actor.settlementsLeft += 1;
      pep.harborCitiesLeft -= 1;
      ep!.harborBasins[v!.id] = {
        vertexId: v!.id,
        playerId: actor.id,
        cargo: [],
      };
      hooks.score(state);
      addLog(
        state,
        `⚓ ${actor.name} transformó un poblado costero en Ciudad Portuaria (+2 PV y dársena de carga).`,
        'BUILD',
        actor.id
      );
      return true;
    }

    case 'EP_BUILD_SHIP': {
      requireRule(isMyBuildTurn, 'Solo puedes construir barcos en tu fase de construcción.');
      const edge = state.board.edges[action.edgeId];
      requireRule(edge, 'Travesía marítima no encontrada.');
      // No puede limitar con hexágono inexplorado al construirse
      const touchesFog = edge!.hexIds.some((hid) => state.board.hexes[hid]?.terrain === 'FOG');
      requireRule(!touchesFog, 'No puedes construir un barco nuevo en una travesía que limite con un hexágono inexplorado.');
      // Debe limitar con una Ciudad Portuaria propia
      const adjacentOwnHarbor = edge!.vertexIds.some((vid) => {
        const v = state.board.vertices[vid];
        return v && v.playerId === actor.id && v.building === 'CITY';
      });
      requireRule(adjacentOwnHarbor, 'El barco debe construirse en una travesía marítima junto a una de tus Ciudades Portuarias.');
      const shipsOnEdge = Object.values(ep!.ships).filter((s) => s.edgeId === edge!.id);
      requireRule(shipsOnEdge.length < 2, 'En cada travesía marítima puede haber como máximo 2 barcos.');

      if (pep.shipsLeft <= 0) {
        requireRule(action.replaceShipId && ep!.ships[action.replaceShipId]?.playerId === actor.id, 'Todos tus barcos están en el mar. Elige uno de tus barcos para retirarlo y reconstruirlo.');
        delete ep!.ships[action.replaceShipId!];
        pep.shipsLeft += 1;
      }

      payRes(state, actor, EP_BUILDING_COSTS.SHIP);
      pep.shipsLeft -= 1;
      const shipId = `ep-ship-${actor.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      ep!.ships[shipId] = {
        id: shipId,
        playerId: actor.id,
        edgeId: edge!.id,
        cargo: [],
        mpRemaining: getPlayerShipBaseMP(pep),
        hasMovedThisTurn: false,
        boostedThisTurn: false,
        paidPirateTributeThisTurn: false,
      };
      edge!.building = 'SHIP';
      edge!.playerId = actor.id;
      addLog(state, `⛵ ${actor.name} botó un nuevo Barco junto a su Ciudad Portuaria.`, 'BUILD', actor.id);
      return true;
    }

    case 'EP_BUILD_SETTLER': {
      requireRule(isMyBuildTurn, 'Solo puedes reclutar colonos en tu fase de construcción.');
      requireRule(pep.settlersLeft > 0, 'Ya tienes tus 2 colonos en juego.');

      if (action.targetShipId) {
        const ship = ep!.ships[action.targetShipId];
        requireRule(ship && ship.playerId === actor.id, 'Barco no válido.');
        requireRule(canFitCargoItem(ship!.cargo, 'SETTLER'), 'El barco debe estar vacío para embarcar un Colono.');
        payRes(state, actor, EP_BUILDING_COSTS.SETTLER);
        pep.settlersLeft -= 1;
        ship!.cargo = ['SETTLER'];
      } else {
        const harborVertId =
          action.targetVertexId ||
          Object.keys(ep!.harborBasins).find(
            (vid) =>
              ep!.harborBasins[vid].playerId === actor.id &&
              canFitCargoItem(ep!.harborBasins[vid].cargo, 'SETTLER')
          );
        requireRule(harborVertId && ep!.harborBasins[harborVertId]?.playerId === actor.id, 'Necesitas una Ciudad Portuaria propia con la dársena libre.');
        const basin = ep!.harborBasins[harborVertId!];
        basin.cargo = ['SETTLER'];
        payRes(state, actor, EP_BUILDING_COSTS.SETTLER);
        pep.settlersLeft -= 1;
      }
      addLog(state, `🧑‍🌾 ${actor.name} equipó a un nuevo Colono listo para zarpar.`, 'BUILD', actor.id);
      return true;
    }

    case 'EP_BUILD_UNIT': {
      requireRule(isMyBuildTurn, 'Solo puedes reclutar unidades en tu fase de construcción.');
      requireRule(pep.unitsLeft > 0, 'No te quedan unidades en tu reserva (máx. 9).');

      if (action.targetShipId) {
        const ship = ep!.ships[action.targetShipId];
        requireRule(ship && ship.playerId === actor.id, 'Barco no válido.');
        requireRule(canFitCargoItem(ship!.cargo, 'CREW'), 'No queda espacio en la bodega de ese barco.');
        payRes(state, actor, EP_BUILDING_COSTS.UNIT);
        pep.unitsLeft -= 1;
        ship!.cargo.push('CREW');
      } else {
        const harborVertId =
          action.targetVertexId ||
          Object.keys(ep!.harborBasins).find(
            (vid) =>
              ep!.harborBasins[vid].playerId === actor.id &&
              canFitCargoItem(ep!.harborBasins[vid].cargo, 'CREW')
          );
        requireRule(harborVertId && ep!.harborBasins[harborVertId]?.playerId === actor.id, 'Necesitas espacio en la dársena de una de tus Ciudades Portuarias.');
        const basin = ep!.harborBasins[harborVertId!];
        requireRule(canFitCargoItem(basin.cargo, 'CREW'), 'La dársena de esa Ciudad Portuaria está llena.');
        payRes(state, actor, EP_BUILDING_COSTS.UNIT);
        pep.unitsLeft -= 1;
        basin.cargo.push('CREW');
      }
      addLog(state, `🛡️ ${actor.name} reclutó una Unidad (Guerrero / Mercader).`, 'BUILD', actor.id);
      return true;
    }

    case 'EP_START_MOVEMENT_PHASE': {
      requireRule(isMyMainTurn, 'Solo puedes pasar a la fase de movimiento en tu turno principal.');
      ep!.turnSubPhase = 'MOVEMENT';
      addLog(state, `🧭 ${actor.name} inició la Fase de Movimiento de su flota.`, 'INFO', actor.id);
      return true;
    }

    case 'EP_BOOST_SHIP': {
      requireRule(isMyMainTurn, 'Solo puedes impulsar barcos durante tu turno.');
      const ship = ep!.ships[action.shipId];
      requireRule(ship && ship.playerId === actor.id, 'Barco no encontrado.');
      requireRule(!ship!.boostedThisTurn, 'Solo puedes gastar 1 Lana por turno y barco para ganar +2 PM.');
      payRes(state, actor, EP_BUILDING_COSTS.SHIP_BOOST);
      ship!.mpRemaining += 2;
      ship!.boostedThisTurn = true;
      addLog(state, `🐑 ${actor.name} desplegó velas extra con 1 Lana (+2 puntos de movimiento para su barco).`, 'BUILD', actor.id);
      return true;
    }

    case 'EP_MOVE_SHIP': {
      requireRule(isMyMainTurn, 'Solo puedes mover tus barcos durante tu turno principal.');
      const ship = ep!.ships[action.shipId];
      requireRule(ship && ship.playerId === actor.id, 'Barco no encontrado.');
      requireRule(ship!.mpRemaining > 0, 'Este barco ya agotó sus puntos de movimiento en este turno.');

      const fromEdge = state.board.edges[ship!.edgeId];
      const toEdge = state.board.edges[action.toEdgeId];
      requireRule(fromEdge && toEdge, 'Travesía marítima no válida.');

      // Verificar que toEdge comparte un vértice con fromEdge
      const sharesVertex = fromEdge!.vertexIds.some((vid) => toEdge!.vertexIds.includes(vid));
      requireRule(sharesVertex && fromEdge!.id !== toEdge!.id, 'Debes mover el barco a una travesía marítima adyacente.');

      // Verificar límite de 2 barcos por travesía
      const shipsAtDest = Object.values(ep!.ships).filter((s) => s.edgeId === toEdge!.id && s.id !== ship!.id);
      requireRule(shipsAtDest.length < 2, 'Ya hay 2 barcos en esa travesía marítima.');

      // Verificar tributo pirata (1 oro si el hexágono tiene el barco pirata de un rival y aún no pagó este turno)
      const pirate = ep!.activePirateShip;
      if (
        pirate &&
        pirate.playerId !== actor.id &&
        (fromEdge!.hexIds.includes(pirate.hexId) || toEdge!.hexIds.includes(pirate.hexId)) &&
        !ship!.paidPirateTributeThisTurn
      ) {
        requireRule(pep.goldCoins >= 1, 'Necesitas 1 moneda de oro para pagar el tributo al Barco Pirata rival.');
        pep.goldCoins -= 1;
        ship!.paidPirateTributeThisTurn = true;
        addLog(state, `🏴‍☠️ ${actor.name} pagó 1 moneda de oro de tributo para navegar junto al Barco Pirata.`, 'INFO', actor.id);
      }

      // Actualizar marcadores visuales de arista
      const otherShipOnOldEdge = Object.values(ep!.ships).find(
        (s) => s.edgeId === fromEdge!.id && s.id !== ship!.id
      );
      if (!otherShipOnOldEdge) {
        fromEdge!.building = null;
        fromEdge!.playerId = null;
      }
      ship!.edgeId = toEdge!.id;
      ship!.mpRemaining -= 1;
      ship!.hasMovedThisTurn = true;
      toEdge!.building = 'SHIP';
      toEdge!.playerId = actor.id;
      ep!.turnSubPhase = 'MOVEMENT';

      // Comprobar si la punta del barco toca un hexágono inexplorado (FOG)
      for (const vid of toEdge!.vertexIds) {
        const v = state.board.vertices[vid];
        if (!v) continue;
        const fogHexId = v.hexIds.find((hid) => state.board.hexes[hid]?.terrain === 'FOG');
        if (fogHexId) {
          discoverUnexploredHexWithShip(state, actor, ship!, fogHexId);
          break;
        }
      }

      hooks.score(state);
      return true;
    }

    case 'EP_TRANSFER_CARGO': {
      requireRule(isMyMainTurn, 'Solo puedes transferir carga en tu turno.');
      const ship = ep!.ships[action.shipId];
      const basin = ep!.harborBasins[action.harborVertexId];
      requireRule(ship && ship.playerId === actor.id && basin && basin.playerId === actor.id, 'Barco o Ciudad Portuaria no válidos.');
      const shipEdge = state.board.edges[ship!.edgeId];
      requireRule(shipEdge?.vertexIds.includes(action.harborVertexId), 'El barco debe estar junto a la Ciudad Portuaria.');

      if (action.direction === 'SWAP') {
        const temp = [...ship!.cargo];
        ship!.cargo = [...basin!.cargo];
        basin!.cargo = temp;
      } else if (action.direction === 'HARBOR_TO_SHIP') {
        const item = action.item || basin!.cargo[0];
        requireRule(item && basin!.cargo.includes(item), 'No hay esa figura en la dársena.');
        requireRule(canFitCargoItem(ship!.cargo, item!), 'No cabe en la bodega del barco.');
        const idx = basin!.cargo.indexOf(item!);
        basin!.cargo.splice(idx, 1);
        ship!.cargo.push(item!);
      } else {
        const item = action.item || ship!.cargo[0];
        requireRule(item && ship!.cargo.includes(item), 'No hay esa figura en el barco.');
        requireRule(canFitCargoItem(basin!.cargo, item!), 'No cabe en la dársena de la ciudad.');
        const idx = ship!.cargo.indexOf(item!);
        ship!.cargo.splice(idx, 1);
        basin!.cargo.push(item!);
      }
      addLog(state, `⚓ ${actor.name} transfirió carga entre su Ciudad Portuaria y su Barco.`, 'INFO', actor.id);
      return true;
    }

    case 'EP_FOUND_SETTLEMENT_WITH_SHIP': {
      requireRule(isMyMainTurn, 'Solo puedes fundar poblados con un barco de colonos en tu turno.');
      requireRule(actor.settlementsLeft > 0, 'No te quedan poblados disponibles en tu reserva.');
      const ship = ep!.ships[action.shipId];
      requireRule(
        ship && ship.playerId === actor.id && ship.cargo.includes('SETTLER'),
        'Necesitas un Barco de Colonos propio.'
      );
      const v = state.board.vertices[action.vertexId];
      const shipEdge = state.board.edges[ship!.edgeId];
      requireRule(v && shipEdge?.vertexIds.includes(v.id), 'El barco de colonos debe estar junto a la encrucijada.');
      requireRule(v!.building === null, 'Esa encrucijada ya está ocupada.');

      // No puede fundarse en encrucijada con hexágono inexplorado ni guarida pirata sin conquistar
      const touchesFog = v!.hexIds.some((hid) => state.board.hexes[hid]?.terrain === 'FOG');
      requireRule(!touchesFog, 'No puedes fundar un poblado junto a un hexágono inexplorado.');
      const touchesUnconqueredLair = v!.hexIds.some(
        (hid) => ep!.pirateLairs[hid] && !ep!.pirateLairs[hid].conquered
      );
      requireRule(!touchesUnconqueredLair, 'Primero debes conquistar la Guarida de Piratas de ese hexágono.');

      // Regla de distancia
      const hasNeighborBuilding = v!.adjacentVertexIds.some(
        (adjId) => state.board.vertices[adjId]?.building !== null
      );
      requireRule(!hasNeighborBuilding, 'Regla de distancia: hay otro asentamiento demasiado cerca.');

      // Regla oficial (pág. 8): Retira tanto el barco como el colono a la reserva y coloca el poblado gratis
      delete ep!.ships[ship!.id];
      const otherShip = Object.values(ep!.ships).find((s) => s.edgeId === shipEdge!.id);
      if (!otherShip && shipEdge) {
        shipEdge.building = null;
        shipEdge.playerId = null;
      }
      pep.shipsLeft += 1;
      pep.settlersLeft += 1;
      v!.building = 'SETTLEMENT';
      v!.playerId = actor.id;
      actor.settlementsLeft -= 1;

      hooks.score(state);
      addLog(
        state,
        `🏝️ ¡${actor.name} desembarcó su Barco de Colonos y fundó un nuevo Poblado (+1 PV)!`,
        'BUILD',
        actor.id
      );
      return true;
    }

    case 'EP_LAND_UNIT_ON_LAIR': {
      requireRule(isMyMainTurn, 'Solo puedes desembarcar unidades durante tu turno.');
      const ship = ep!.ships[action.shipId];
      requireRule(ship && ship.playerId === actor.id && ship.cargo.includes('CREW'), 'Tu barco debe transportar al menos 1 Unidad.');
      const lair = ep!.pirateLairs[action.hexId];
      requireRule(lair && !lair.conquered, 'Ese hexágono no tiene una Guarida de Piratas activa.');

      const currentUnits = Object.values(lair!.unitsByPlayer).reduce((a, b) => a + b, 0);
      const shipUnits = ship!.cargo.filter((c) => c === 'CREW').length;
      const toLand = Math.min(action.count || shipUnits, shipUnits, 3 - currentUnits);
      requireRule(toLand > 0, 'La guarida ya tiene 3 unidades.');

      for (let i = 0; i < toLand; i++) {
        const idx = ship!.cargo.indexOf('CREW');
        if (idx >= 0) ship!.cargo.splice(idx, 1);
      }
      lair!.unitsByPlayer[actor.id] = (lair!.unitsByPlayer[actor.id] || 0) + toLand;

      const newTotal = Object.values(lair!.unitsByPlayer).reduce((a, b) => a + b, 0);
      if (newTotal >= 3) {
        // ¡Conquista de la Guarida de Piratas! (Pág. 13)
        lair!.conquered = true;
        const hex = state.board.hexes[lair!.hexId];
        if (hex) {
          hex.numberToken = lair!.numberToken;
        }

        const participantIds = Object.keys(lair!.unitsByPlayer).filter(
          (pid) => (lair!.unitsByPlayer[pid] || 0) > 0
        );

        let heroId = participantIds[0];
        let bestHeroScore = -1;
        let bestHeroUnits = -1;

        for (const pid of participantIds) {
          const pl = state.players.find((p) => p.id === pid);
          const uCount = lair!.unitsByPlayer[pid] || 0;
          if (pl?.explorersPirates) {
            pl.explorersPirates.goldCoins += 2;
            advanceMissionTrack(state, pid, 'PIRATE_LAIRS', 1);
          }
          const die = Math.floor(context.random() * 6) + 1;
          const score = die + uCount;
          if (score > bestHeroScore || (score === bestHeroScore && uCount > bestHeroUnits)) {
            bestHeroScore = score;
            bestHeroUnits = uCount;
            heroId = pid;
          }
          lair!.waitingPickupByPlayer[pid] = uCount;
        }

        // El Héroe avanza 1 casilla adicional y devuelve 1 de sus unidades a la reserva
        const heroPlayer = state.players.find((p) => p.id === heroId);
        if (heroPlayer?.explorersPirates) {
          advanceMissionTrack(state, heroId, 'PIRATE_LAIRS', 1);
          heroPlayer.explorersPirates.unitsLeft += 1;
          lair!.waitingPickupByPlayer[heroId] = Math.max(
            0,
            (lair!.waitingPickupByPlayer[heroId] || 1) - 1
          );
        }

        hooks.score(state);
        addLog(
          state,
          `🏴‍☠️ ¡Guarida Pirata conquistada! Todos los participantes ganan +2 oros y +1 casilla en la misión. ¡${heroPlayer?.name || 'El héroe'} gana el duelo de héroe (+1 casilla extra) y libera el Río Aurífero (${lair!.numberToken})!`,
          'AWARD',
          actor.id
        );
      } else {
        addLog(
          state,
          `⚔️ ${actor.name} desembarcó ${toLand} unidad(es) en la Guarida de Piratas (${newTotal}/3 unidades).`,
          'BUILD',
          actor.id
        );
      }
      return true;
    }

    case 'EP_ROLL_FISH_SHOAL': {
      requireRule(isMyMainTurn, 'Solo puedes buscar bancos de peces durante tu turno.');
      requireRule(!ep!.hasRolledFishThisTurn, 'Ya has lanzado el dado de bancos de peces en este turno.');
      const die = (Math.floor(context.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
      ep!.hasRolledFishThisTurn = true;
      ep!.lastFishRoll = die;

      const matchingGround = Object.values(ep!.fishGrounds).find(
        (fg) =>
          fg.discovered &&
          fg.rollNumber === die &&
          !fg.hasFishShoal &&
          ep!.activePirateShip?.hexId !== fg.hexId
      );
      if (matchingGround) {
        matchingGround.hasFishShoal = true;
        addLog(
          state,
          `🐟 Tirada de Pesca (${die}): ¡Ha aparecido un nuevo Banco de Peces en el caladero ${die}!`,
          'DICE',
          actor.id
        );
      } else {
        addLog(
          state,
          `🐟 Tirada de Pesca (${die}): No apareció ningún banco de peces nuevo en el caladero ${die}.`,
          'DICE',
          actor.id
        );
      }
      return true;
    }

    case 'EP_PICKUP_FISH_SHOAL': {
      requireRule(isMyMainTurn, 'Solo puedes pescar durante tu turno.');
      const ship = ep!.ships[action.shipId];
      requireRule(ship && ship.playerId === actor.id, 'Barco no válido.');
      requireRule(canFitCargoItem(ship!.cargo, 'FISH_HAUL'), 'El barco debe estar completamente vacío para cargar un Banco de Peces.');
      const fg = ep!.fishGrounds[action.hexId];
      requireRule(fg && fg.hasFishShoal, 'No hay un banco de peces en ese hexágono.');

      fg!.hasFishShoal = false;
      ship!.cargo = ['FISH_HAUL'];
      addLog(
        state,
        `🐟 ${actor.name} cargó un Banco de Peces en su barco. ¡Llévalo al Consejo de Catán!`,
        'INFO',
        actor.id
      );
      return true;
    }

    case 'EP_TRADE_WITH_SPICE_VILLAGE': {
      requireRule(isMyMainTurn, 'Solo puedes comerciar con las aldeas de especias en tu turno.');
      const ship = ep!.ships[action.shipId];
      requireRule(ship && ship.playerId === actor.id && ship.cargo.includes('CREW'), 'Tu barco debe llevar una Unidad (Mercader).');
      const village = ep!.spiceVillages[action.hexId];
      requireRule(village && village.discovered, 'Aldea de especias no encontrada.');
      requireRule(village!.sacksRemaining > 0, 'Ya no quedan sacos de especias en esta aldea.');
      requireRule(
        !village!.merchantsPlayerIds.includes(actor.id),
        'Ya tienes una unidad mercader establecida en esta aldea de especias.'
      );

      // Reemplaza 1 unidad en el barco por 1 saco de especias y desbloquea la ventaja permanente
      const uIdx = ship!.cargo.indexOf('CREW');
      ship!.cargo.splice(uIdx, 1, 'SPICE_SACK');
      village!.sacksRemaining -= 1;
      village!.merchantsPlayerIds.push(actor.id);

      if (!pep.unlockedSpicePerks.includes(village!.perk)) {
        pep.unlockedSpicePerks.push(village!.perk);
        if (village!.perk === 'SWIFT_VOYAGE_1' || village!.perk === 'SWIFT_VOYAGE_2') {
          for (const s of Object.values(ep!.ships)) {
            if (s.playerId === actor.id) s.mpRemaining += 1;
          }
        }
      }

      addLog(
        state,
        `🌶️ ¡${actor.name} estableció amistad con «${village!.name}»! Cargó 1 Saco de Especias y desbloqueó permanentemente la ventaja «${village!.perkLabel}».`,
        'AWARD',
        actor.id
      );
      return true;
    }

    case 'EP_DELIVER_TO_COUNCIL': {
      requireRule(isMyMainTurn, 'Solo puedes entregar mercancías al Consejo de Catán en tu turno.');
      const ship = ep!.ships[action.shipId];
      requireRule(ship && ship.playerId === actor.id, 'Barco no válido.');

      const hasFish = ship!.cargo.includes('FISH_HAUL');
      const spiceCount = ship!.cargo.filter((c) => c === 'SPICE_SACK').length;
      requireRule(hasFish || spiceCount > 0, 'El barco no transporta Pescado ni Sacos de Especias.');

      if (hasFish) {
        ship!.cargo = [];
        advanceMissionTrack(state, actor.id, 'FISH_FOR_CATAN', 1);
        hooks.score(state);
        addLog(
          state,
          `🏛️ ¡${actor.name} descargó un Banco de Peces en el Consejo de Catán y avanzó +1 casilla en «Pescado para Catán»!`,
          'AWARD',
          actor.id
        );
      } else if (spiceCount > 0) {
        ship!.cargo = ship!.cargo.filter((c) => c !== 'SPICE_SACK');
        advanceMissionTrack(state, actor.id, 'SPICES_FOR_CATAN', spiceCount);
        hooks.score(state);
        addLog(
          state,
          `🏛️ ¡${actor.name} descargó ${spiceCount} Saco(s) de Especias en el Consejo de Catán y avanzó +${spiceCount} casilla(s) en «Especias para Catán»!`,
          'AWARD',
          actor.id
        );
      }
      return true;
    }

    case 'EP_PLACE_PIRATE_SHIP': {
      const hex = state.board.hexes[action.hexId];
      requireRule(hex && hex.terrain === 'SEA', 'El Barco Pirata solo puede colocarse en un hexágono de mar.');
      requireRule(action.hexId !== ep!.councilHexId, 'No se puede colocar el Barco Pirata en el Consejo de Catán.');

      ep!.activePirateShip = { playerId: actor.id, hexId: action.hexId };
      // Si había un banco de peces en ese hexágono, los piratas lo ahuyentan (pág. 16)
      if (ep!.fishGrounds[action.hexId]?.hasFishShoal) {
        ep!.fishGrounds[action.hexId].hasFishShoal = false;
      }

      // Robar 1 materia prima (o 1 oro si no tiene) a un rival con barco en el hexágono
      const hexEdges = Object.values(state.board.edges)
        .filter((e) => e.hexIds.includes(action.hexId))
        .map((e) => e.id);
      const rivalShips = Object.values(ep!.ships).filter(
        (s) => s.playerId !== actor.id && hexEdges.includes(s.edgeId)
      );
      const victimId = action.victimPlayerId || rivalShips[0]?.playerId;
      if (victimId) {
        const victim = state.players.find((p) => p.id === victimId);
        if (victim) {
          const totalRes = ALL_RESOURCES.reduce((s, r) => s + (victim.resources[r] || 0), 0);
          if (totalRes > 0) {
            const availRes = ALL_RESOURCES.filter((r) => (victim.resources[r] || 0) > 0);
            const stolenRes = availRes[Math.floor(context.random() * availRes.length)];
            victim.resources[stolenRes] -= 1;
            actor.resources[stolenRes] = (actor.resources[stolenRes] || 0) + 1;
          } else if ((victim.explorersPirates?.goldCoins || 0) > 0) {
            victim.explorersPirates!.goldCoins -= 1;
            pep.goldCoins += 1;
          }
        }
      }
      addLog(state, `🏴‍☠️ ${actor.name} posicionó su Barco Pirata en alta mar.`, 'ROBBER', actor.id);
      return true;
    }

    case 'EP_DRIVE_OFF_PIRATE': {
      requireRule(isMyMainTurn, 'Solo puedes combatir al Barco Pirata durante tu turno.');
      const pirate = ep!.activePirateShip;
      requireRule(pirate && pirate.playerId !== actor.id, 'No hay un Barco Pirata rival que ahuyentar.');
      const ship = ep!.ships[action.shipId];
      requireRule(ship && ship.playerId === actor.id && !ship.hasMovedThisTurn, 'El barco no debe haberse movido todavía en este turno para combatir al pirata.');

      const die = Math.floor(context.random() * 6) + 1;
      let minSuccess = 6;
      if (pep.unlockedSpicePerks.includes('PIRATE_BONUS_4')) minSuccess = 4;
      else if (pep.unlockedSpicePerks.includes('PIRATE_BONUS_5')) minSuccess = 5;

      if (die >= minSuccess) {
        ep!.activePirateShip = action.newPirateHexId
          ? { playerId: actor.id, hexId: action.newPirateHexId }
          : null;
        addLog(
          state,
          `⚔️ ¡Combate Naval (${die})! ${actor.name} ahuyentó al Barco Pirata rival (necesitaba ${minSuccess}+).`,
          'ROBBER',
          actor.id
        );
      } else {
        ship!.hasMovedThisTurn = true;
        addLog(
          state,
          `🎲 Combate Naval (${die}): ${actor.name} no logró ahuyentar al Barco Pirata (necesitaba ${minSuccess}+).`,
          'DICE',
          actor.id
        );
      }
      return true;
    }

    case 'EP_BUY_RESOURCE_WITH_GOLD': {
      requireRule(
        isMyMainTurn && ep!.turnSubPhase === 'TRADE_AND_BUILD',
        'Solo puedes comprar materias primas con oro en tu Fase de Comercio y Construcción.'
      );
      requireRule(pep.goldCoins >= 2, 'Necesitas al menos 2 monedas de oro.');
      requireRule(pep.goldPurchasesThisTurn < 2, 'Solo puedes comprar hasta 2 materias primas con oro por turno.');
      const gained = giveRes(state, actor, action.resource, 1);
      requireRule(gained > 0, 'No queda esa materia prima en la banca.');
      pep.goldCoins -= 2;
      pep.goldPurchasesThisTurn += 1;
      addLog(
        state,
        `🪙 ${actor.name} compró 1 ${RESOURCE_META[action.resource].name} por 2 monedas de oro.`,
        'TRADE',
        actor.id
      );
      return true;
    }

    case 'EP_TRADE_3_FOR_GOLD': {
      requireRule(
        isMyMainTurn && ep!.turnSubPhase === 'TRADE_AND_BUILD',
        'Solo puedes comerciar 3:1 en tu Fase de Comercio y Construcción.'
      );
      const r = action.giveResource;
      requireRule((actor.resources[r] || 0) >= 3, 'Necesitas 3 cartas iguales para cambiarlas por 1 oro.');
      actor.resources[r] = (actor.resources[r] || 0) - 3;
      state.bank[r] = (state.bank[r] || 0) + 3;
      pep.goldCoins += 1;
      addLog(state, `🪙 ${actor.name} entregó 3 materias primas iguales a cambio de +1 moneda de oro.`, 'TRADE', actor.id);
      return true;
    }

    case 'EP_SPICE_GOLD_TRADE': {
      requireRule(
        isMyMainTurn && ep!.turnSubPhase === 'TRADE_AND_BUILD',
        'Solo disponible en la Fase de Comercio y Construcción.'
      );
      const maxTrades =
        (pep.unlockedSpicePerks.includes('GOLD_TRADE_1') ? 1 : 0) +
        (pep.unlockedSpicePerks.includes('GOLD_TRADE_2') ? 1 : 0);
      requireRule(maxTrades > 0, 'Aún no has trabado amistad con una aldea de Comercio de Oro.');
      requireRule(
        pep.spiceGoldTradesThisTurn < maxTrades,
        `Ya has usado tu ventaja de Comercio de Oro (${maxTrades}x) en este turno.`
      );
      const r = action.giveResource;
      requireRule((actor.resources[r] || 0) >= 1, 'No tienes esa materia prima.');
      actor.resources[r] -= 1;
      state.bank[r] = (state.bank[r] || 0) + 1;
      pep.goldCoins += 1;
      pep.spiceGoldTradesThisTurn += 1;
      addLog(
        state,
        `🌶️ ${actor.name} usó «Comercio de Oro» y vendió 1 ${RESOURCE_META[r].name} por +1 moneda de oro.`,
        'TRADE',
        actor.id
      );
      return true;
    }

    default:
      return false;
  }
}

export function explorersPiratesBotActions(state: GameState, botPlayerId: string): GameAction[] {
  const ep = state.explorersPirates;
  const bot = state.players.find((p) => p.id === botPlayerId);
  const pep = bot?.explorersPirates;
  if (!ep || !bot || !pep) return [];

  const actions: GameAction[] = [];

  // 1. Comprar recursos escasos con 2 monedas de oro si tiene >= 4 oros
  if (ep.turnSubPhase === 'TRADE_AND_BUILD' && pep.goldCoins >= 4 && pep.goldPurchasesThisTurn < 2) {
    const scarceRes = ALL_RESOURCES.reduce((minR, r) =>
      (bot.resources[r] || 0) < (bot.resources[minR] || 0) ? r : minR
    );
    actions.push({ type: 'EP_BUY_RESOURCE_WITH_GOLD', resource: scarceRes });
  }

  // 2. Mejorar un poblado costero a Ciudad Portuaria si tiene 2 Trigos y 2 Minerales
  if (pep.harborCitiesLeft > 0 && hasRes(bot, EP_BUILDING_COSTS.HARBOR_CITY)) {
    const coastalSettlement = Object.values(state.board.vertices).find(
      (v) => v.playerId === bot.id && v.building === 'SETTLEMENT' && v.isCoastal
    );
    if (coastalSettlement) {
      actions.push({ type: 'EP_UPGRADE_HARBOR_CITY', vertexId: coastalSettlement.id });
    }
  }

  // 3. Tirar dado de pesca en escenarios con Pescado para Catán
  if (ep.activeMissions.includes('FISH_FOR_CATAN') && !ep.hasRolledFishThisTurn) {
    actions.push({ type: 'EP_ROLL_FISH_SHOAL' });
  }

  // 4. Mover barcos hacia hexágonos inexplorados (FOG)
  const myShips = Object.values(ep.ships).filter(
    (s) => s.playerId === bot.id && s.mpRemaining > 0
  );
  for (const ship of myShips) {
    const currentEdge = state.board.edges[ship.edgeId];
    if (!currentEdge) continue;

    // Si tiene un colono y hay un vértice libre adyacente, fundar poblado
    if (ship.cargo.includes('SETTLER') && bot.settlementsLeft > 0) {
      const validFoundVertex = currentEdge.vertexIds.find((vid) => {
        const v = state.board.vertices[vid];
        if (!v || v.building !== null) return false;
        const touchesFog = v.hexIds.some((hid) => state.board.hexes[hid]?.terrain === 'FOG');
        if (touchesFog) return false;
        const hasAdj = v.adjacentVertexIds.some(
          (adjId) => state.board.vertices[adjId]?.building !== null
        );
        return !hasAdj;
      });
      if (validFoundVertex) {
        actions.push({
          type: 'EP_FOUND_SETTLEMENT_WITH_SHIP',
          shipId: ship.id,
          vertexId: validFoundVertex,
        });
        continue;
      }
    }

    // Buscar travesía adyacente más cercana a un hexágono FOG
    const fogHexes = Object.values(state.board.hexes).filter((h) => h.terrain === 'FOG');
    const adjEdges = currentEdge.vertexIds
      .flatMap((vid) => state.board.vertices[vid]?.adjacentEdgeIds || [])
      .filter((eid) => eid !== currentEdge.id)
      .map((eid) => state.board.edges[eid])
      .filter((e): e is NonNullable<typeof e> => Boolean(e));

    if (adjEdges.length > 0 && fogHexes.length > 0) {
      const targetFog = fogHexes[0];
      const bestNextEdge = [...adjEdges].sort((a, b) => {
        const ax = (a.x1 + a.x2) / 2;
        const ay = (a.y1 + a.y2) / 2;
        const bx = (b.x1 + b.x2) / 2;
        const by = (b.y1 + b.y2) / 2;
        return (
          Math.hypot(ax - targetFog.center.x, ay - targetFog.center.y) -
          Math.hypot(bx - targetFog.center.x, by - targetFog.center.y)
        );
      })[0];
      if (bestNextEdge) {
        actions.push({ type: 'EP_MOVE_SHIP', shipId: ship.id, toEdgeId: bestNextEdge.id });
      }
    }
  }

  return actions;
}
