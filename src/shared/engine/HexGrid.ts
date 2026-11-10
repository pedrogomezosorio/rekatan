import {
  BoardMode,
  BoardState,
  CubicCoord,
  Edge,
  Hex,
  PlayerColor,
  PortInfo,
  PortType,
  SeafarersBoardSize,
  SeafarersScenario,
  TerrainType,
  Vertex,
} from '../types';
import { SEAFARERS_BOARDS_DATA } from './seafarersBoardsData';
import {
  EXPANSION_NUMBERS_28,
  EXPANSION_PORTS_11,
  EXPANSION_TERRAINS_30,
  MEGA_NUMBERS_34,
  MEGA_TERRAINS_37,
  STANDARD_NUMBERS_18,
  STANDARD_PORTS_9,
  STANDARD_TERRAINS_19,
} from '../constants';

export const DEFAULT_HEX_SIZE = 62;

export const isRealLand = (t: TerrainType) => t !== 'SEA' && t !== 'FOG';

// 6 axial/cubic neighbor directions for pointy-top hexes
export const CUBIC_DIRECTIONS: CubicCoord[] = [
  { q: 1, r: 0, s: -1 },   // East
  { q: 1, r: -1, s: 0 },   // North-East
  { q: 0, r: -1, s: 1 },   // North-West
  { q: -1, r: 0, s: 1 },   // West
  { q: -1, r: 1, s: 0 },   // South-West
  { q: 0, r: 1, s: -1 },   // South-East
];

export function coordToId(q: number, r: number, s: number): string {
  // Normalize -0 to 0
  const nq = q === 0 ? 0 : q;
  const nr = r === 0 ? 0 : r;
  const ns = s === 0 ? 0 : s;
  return `${nq},${nr},${ns}`;
}

export function idToCoord(id: string): CubicCoord {
  const [q, r, s] = id.split(',').map(Number);
  return { q, r, s };
}

export function getHexNeighbors(coord: CubicCoord): CubicCoord[] {
  return CUBIC_DIRECTIONS.map((d) => ({
    q: coord.q + d.q,
    r: coord.r + d.r,
    s: coord.s + d.s,
  }));
}

/**
 * Converts cubic/axial (q, r) to 2D pixel center for pointy-top hexagon.
 */
export function hexToPixel(
  q: number,
  r: number,
  size: number = DEFAULT_HEX_SIZE
): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
  };
}

/**
 * Returns the 6 corner points of a pointy-top hexagon centered at (cx, cy).
 */
export function getHexCornerPoints(
  cx: number,
  cy: number,
  size: number = DEFAULT_HEX_SIZE
): Array<{ x: number; y: number }> {
  const corners: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = ((60 * i - 30) * Math.PI) / 180;
    corners.push({
      x: Math.round((cx + size * Math.cos(angleRad)) * 100) / 100,
      y: Math.round((cy + size * Math.sin(angleRad)) * 100) / 100,
    });
  }
  return corners;
}

/**
 * Returns the land hex coordinates for the requested board layout:
 * - STANDARD_3_4 / CUSTOM: 3-4-5-4-3 (19 land hexes)
 * - EXPANSION_5_6: 3-4-5-6-5-4-3 (30 land hexes)
 * - MEGA_RADIUS_3: 4-5-6-7-6-5-4 (37 land hexes)
 */
export function getLandCoordsForMode(mode: BoardMode): CubicCoord[] {
  if (mode === 'EXPANSION_5_6') {
    // 3-4-5-6-5-4-3 layout (30 hexes)
    const rowRanges: Array<{ r: number; qMin: number; qMax: number }> = [
      { r: -3, qMin: 1, qMax: 3 },  // 3
      { r: -2, qMin: 0, qMax: 3 },  // 4
      { r: -1, qMin: -1, qMax: 3 }, // 5
      { r: 0, qMin: -2, qMax: 3 },  // 6
      { r: 1, qMin: -2, qMax: 2 },  // 5
      { r: 2, qMin: -2, qMax: 1 },  // 4
      { r: 3, qMin: -2, qMax: 0 },  // 3
    ];
    const coords: CubicCoord[] = [];
    for (const row of rowRanges) {
      for (let q = row.qMin; q <= row.qMax; q++) {
        coords.push({ q, r: row.r, s: -q - row.r });
      }
    }
    return coords;
  }

  const radius = mode === 'MEGA_RADIUS_3' ? 3 : 2;
  const coords: CubicCoord[] = [];
  for (let r = -radius; r <= radius; r++) {
    for (let q = -radius; q <= radius; q++) {
      const s = -q - r;
      if (Math.abs(s) <= radius) {
        coords.push({ q, r, s });
      }
    }
  }
  return coords;
}

/**
 * Computes the outer ring of SEA hexes surrounding a set of land coordinates.
 */
export function getSurroundingSeaCoords(landCoords: CubicCoord[]): CubicCoord[] {
  const landSet = new Set(landCoords.map((c) => coordToId(c.q, c.r, c.s)));
  const seaMap = new Map<string, CubicCoord>();

  for (const land of landCoords) {
    for (const n of getHexNeighbors(land)) {
      const id = coordToId(n.q, n.r, n.s);
      if (!landSet.has(id) && !seaMap.has(id)) {
        seaMap.set(id, n);
      }
    }
  }
  return Array.from(seaMap.values());
}

/**
 * Rebuilds topological vertices, edges, and port connections from a dictionary of Hexes.
 * Preserves existing buildings on vertices/edges if passed.
 */
export function buildTopologyFromHexes(
  hexes: Record<string, Hex>,
  hexSize: number = DEFAULT_HEX_SIZE,
  existingVertices?: Record<string, Vertex>,
  existingEdges?: Record<string, Edge>,
  existingPorts?: PortInfo[],
  isSeafarers: boolean = false
): {
  vertices: Record<string, Vertex>;
  edges: Record<string, Edge>;
  coastalEdgeIdsOrdered: string[];
  ports: PortInfo[];
} {
  const vertices: Record<string, Vertex> = {};
  const edges: Record<string, Edge> = {};

  const findExistingVertexNear = (x: number, y: number): Vertex | undefined => {
    for (const v of Object.values(vertices)) {
      if (Math.hypot(v.x - x, v.y - y) < 2.5) {
        return v;
      }
    }
    return undefined;
  };

  const getOrCreateVertex = (x: number, y: number): Vertex => {
    const existing = findExistingVertexNear(x, y);
    if (existing) {
      return existing;
    }

    const vId = `V_${Math.round(x)}_${Math.round(y)}`;
    const prev = existingVertices?.[vId];
    vertices[vId] = {
      id: vId,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      hexIds: [],
      adjacentVertexIds: [],
      adjacentEdgeIds: [],
      building: prev ? prev.building : null,
      playerId: prev ? prev.playerId : null,
      port: prev ? prev.port : null,
      isLand: false,
      isCoastal: false,
      catanChits: prev ? prev.catanChits : undefined,
    };
    return vertices[vId];
  };

  const isRealLand = (t: TerrainType) => t !== 'SEA' && t !== 'FOG';

  // In Base Game: only non-SEA hexes generate playable topology
  // In Seafarers: both land and navigable sea hexes generate topological vertices and edges
  const isSeafarersMode = isSeafarers || Object.values(hexes).some((h) => h.terrain === 'GOLD' || h.terrain === 'FOG');
  const playableHexes = isSeafarersMode
    ? Object.values(hexes)
    : Object.values(hexes).filter((h) => h.terrain !== 'SEA');
  const allHexes = Object.values(hexes);

  // Track which hexes touch each vertex/edge
  for (const hex of playableHexes) {
    const corners = getHexCornerPoints(hex.center.x, hex.center.y, hexSize);
    const cornerVertices = corners.map((pt) => getOrCreateVertex(pt.x, pt.y));

    for (const v of cornerVertices) {
      if (isRealLand(hex.terrain)) {
        v.isLand = true;
      }
      if (!v.hexIds.includes(hex.id)) {
        v.hexIds.push(hex.id);
      }
    }

    for (let i = 0; i < 6; i++) {
      const v1 = cornerVertices[i];
      const v2 = cornerVertices[(i + 1) % 6];
      const [idA, idB] = v1.id < v2.id ? [v1.id, v2.id] : [v2.id, v1.id];
      const edgeId = `E_${idA}__${idB}`;

      if (!edges[edgeId]) {
        const prevEdge = existingEdges?.[edgeId];
        edges[edgeId] = {
          id: edgeId,
          vertexIds: [idA, idB],
          hexIds: [hex.id],
          x1: vertices[idA].x,
          y1: vertices[idA].y,
          x2: vertices[idB].x,
          y2: vertices[idB].y,
          building: prevEdge ? prevEdge.building : null,
          playerId: prevEdge ? prevEdge.playerId : null,
          isLand: isRealLand(hex.terrain),
          isCoastal: false,
          isWarship: prevEdge ? prevEdge.isWarship : undefined,
        };
      } else {
        if (!edges[edgeId].hexIds.includes(hex.id)) {
          edges[edgeId].hexIds.push(hex.id);
        }
        if (isRealLand(hex.terrain)) {
          edges[edgeId].isLand = true;
        }
      }

      if (!v1.adjacentVertexIds.includes(v2.id)) v1.adjacentVertexIds.push(v2.id);
      if (!v2.adjacentVertexIds.includes(v1.id)) v2.adjacentVertexIds.push(v1.id);
      if (!v1.adjacentEdgeIds.includes(edgeId)) v1.adjacentEdgeIds.push(edgeId);
      if (!v2.adjacentEdgeIds.includes(edgeId)) v2.adjacentEdgeIds.push(edgeId);
    }
  }

  // Second pass: associate SEA hexes with existing land vertices & edges so we know coastal status
  const seaHexes = allHexes.filter((h) => h.terrain === 'SEA');
  for (const seaHex of seaHexes) {
    const corners = getHexCornerPoints(seaHex.center.x, seaHex.center.y, hexSize);
    for (const pt of corners) {
      const v = findExistingVertexNear(pt.x, pt.y);
      if (v) {
        if (!v.hexIds.includes(seaHex.id)) {
          v.hexIds.push(seaHex.id);
        }
      }
    }
  }

  // Mark coastal edges and vertices (FOG is NEVER treated as land for coastal/port purposes!)
  const coastalEdges: Edge[] = [];
  for (const edge of Object.values(edges)) {
    const landCount = edge.hexIds.filter(
      (hId) => hexes[hId] && isRealLand(hexes[hId].terrain)
    ).length;
    const touchesSea = edge.hexIds.some(
      (hId) => hexes[hId] && hexes[hId].terrain === 'SEA'
    );
    const touchesFog = edge.hexIds.some(
      (hId) => hexes[hId] && hexes[hId].terrain === 'FOG'
    );
    const touchesOuterEdge = edge.hexIds.length === 1;
    const isCoastal = isSeafarersMode
      ? landCount >= 1 && (touchesSea || touchesFog || touchesOuterEdge)
      : landCount === 1;

    edge.isLand = landCount >= 1;
    edge.isCoastal = isCoastal;
    if (edge.isCoastal && (touchesSea || touchesOuterEdge || !isSeafarersMode)) {
      coastalEdges.push(edge);
      const [vA, vB] = edge.vertexIds;
      if (vertices[vA]) {
        vertices[vA].isCoastal = true;
        vertices[vA].isLand = true;
      }
      if (vertices[vB]) {
        vertices[vB].isCoastal = true;
        vertices[vB].isLand = true;
      }
    }
  }

  for (const vertex of Object.values(vertices)) {
    vertex.isLand = vertex.hexIds.some((hId) => hexes[hId] && isRealLand(hexes[hId].terrain));
    vertex.isCoastal = isSeafarersMode
      ? vertex.isLand &&
        (vertex.hexIds.some((hId) => hexes[hId] && (hexes[hId].terrain === 'SEA' || hexes[hId].terrain === 'FOG')) ||
          vertex.hexIds.length < 3)
      : vertex.isCoastal;
  }

  // Order coastal edges clockwise around the board center (0, 0) for uniform port placement
  coastalEdges.sort((a, b) => {
    const midAx = (a.x1 + a.x2) / 2;
    const midAy = (a.y1 + a.y2) / 2;
    const midBx = (b.x1 + b.x2) / 2;
    const midBy = (b.y1 + b.y2) / 2;
    return Math.atan2(midAy, midAx) - Math.atan2(midBy, midBx);
  });

  const coastalEdgeIdsOrdered = coastalEdges.map((e) => e.id);

  // Re-attach existing ports if provided
  const validPorts: PortInfo[] = [];
  if (existingPorts) {
    for (const p of existingPorts) {
      const edge = edges[p.edgeId];
      if (edge && edge.isCoastal) {
        const dockCenter = computeDockCenter(edge, hexes, hexSize);
        const portObj: PortInfo = {
          ...p,
          vertexIds: edge.vertexIds,
          dockCenter,
        };
        validPorts.push(portObj);
        for (const vId of edge.vertexIds) {
          if (vertices[vId]) {
            vertices[vId].port = { type: p.type, ratio: p.ratio };
          }
        }
      }
    }
  }

  return {
    vertices,
    edges,
    coastalEdgeIdsOrdered,
    ports: validPorts,
  };
}

/**
 * Computes the visual dock center in the sea for a given coastal edge.
 */
export function computeDockCenter(
  edge: Edge,
  hexes: Record<string, Hex>,
  hexSize: number = DEFAULT_HEX_SIZE
): { x: number; y: number } {
  const midX = (edge.x1 + edge.x2) / 2;
  const midY = (edge.y1 + edge.y2) / 2;

  const landHexId = edge.hexIds.find(
    (id) => hexes[id] && hexes[id].terrain !== 'SEA' && hexes[id].terrain !== 'FOG'
  );
  const landHex = landHexId ? hexes[landHexId] : null;

  if (landHex) {
    const dx = midX - landHex.center.x;
    const dy = midY - landHex.center.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: Math.round((midX + (dx / len) * (hexSize * 0.52)) * 10) / 10,
      y: Math.round((midY + (dy / len) * (hexSize * 0.52)) * 10) / 10,
    };
  }

  return { x: midX, y: midY };
}

/**
 * Checks if any two adjacent land hexes both have red numbers (6 or 8).
 */
export function hasAdjacentRedNumbers(hexes: Record<string, Hex>): boolean {
  const redHexes = Object.values(hexes).filter(
    (h) => h.terrain !== 'SEA' && (h.numberToken === 6 || h.numberToken === 8)
  );
  for (const hex of redHexes) {
    for (const n of getHexNeighbors(hex)) {
      const nId = coordToId(n.q, n.r, n.s);
      const neighbor = hexes[nId];
      if (
        neighbor &&
        neighbor.terrain !== 'SEA' &&
        (neighbor.numberToken === 6 || neighbor.numberToken === 8)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns pairs of hexIds that violate the red number (6/8) adjacency rule.
 */
export function getRedNumberConflictHexIds(hexes: Record<string, Hex>): string[] {
  const conflicts = new Set<string>();
  const redHexes = Object.values(hexes).filter(
    (h) => h.terrain !== 'SEA' && (h.numberToken === 6 || h.numberToken === 8)
  );
  for (const hex of redHexes) {
    for (const n of getHexNeighbors(hex)) {
      const nId = coordToId(n.q, n.r, n.s);
      const neighbor = hexes[nId];
      if (
        neighbor &&
        neighbor.terrain !== 'SEA' &&
        (neighbor.numberToken === 6 || neighbor.numberToken === 8)
      ) {
        conflicts.add(hex.id);
        conflicts.add(neighbor.id);
      }
    }
  }
  return Array.from(conflicts);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type SeafarersFrameType = 'FRAME_35' | 'FRAME_42' | 'FRAME_49' | 'FRAME_56' | 'FRAME_63';

function getSeafarersFrameCoords(frameType: SeafarersFrameType): CubicCoord[] {
  const rowRanges: Record<SeafarersFrameType, Record<number, [number, number]>> = {
    FRAME_35: {
      [-3]: [0, 3],
      [-2]: [-1, 3],
      [-1]: [-2, 3],
      [0]: [-2, 2],
      [1]: [-3, 2],
      [2]: [-3, 1],
      [3]: [-3, 0],
    },
    FRAME_42: {
      [-3]: [0, 4],
      [-2]: [-1, 4],
      [-1]: [-2, 4],
      [0]: [-2, 3],
      [1]: [-3, 3],
      [2]: [-3, 2],
      [3]: [-3, 1],
    },
    FRAME_49: {
      [-3]: [-1, 4],
      [-2]: [-2, 4],
      [-1]: [-3, 4],
      [0]: [-3, 3],
      [1]: [-4, 3],
      [2]: [-4, 2],
      [3]: [-4, 1],
    },
    FRAME_56: {
      [-3]: [-1, 5],
      [-2]: [-2, 5],
      [-1]: [-3, 5],
      [0]: [-3, 4],
      [1]: [-4, 4],
      [2]: [-4, 3],
      [3]: [-4, 2],
    },
    FRAME_63: {
      [-3]: [-2, 5],
      [-2]: [-3, 5],
      [-1]: [-4, 5],
      [0]: [-4, 4],
      [1]: [-5, 4],
      [2]: [-5, 3],
      [3]: [-5, 2],
    },
  };

  const coords: CubicCoord[] = [];
  const ranges = rowRanges[frameType];
  for (let r = -3; r <= 3; r++) {
    const [qMin, qMax] = ranges[r];
    for (let q = qMin; q <= qMax; q++) {
      coords.push({ q, r, s: -q - r });
    }
  }
  return coords;
}

interface HexConfigItem {
  q: number;
  r: number;
  terrain: TerrainType;
  num: number | null;
  hasRobber?: boolean;
  territoryId?: string;
  isMainIsland?: boolean;
  isUninhabitable?: boolean;
}

function randomizeHexGroup(
  group: HexConfigItem[],
  options: {
    shuffleTerrains?: boolean;
    shuffleNumbers?: boolean;
    preventRedAdjacent?: boolean;
  } = { shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true }
): HexConfigItem[] {
  const copy = group.map((g) => ({ ...g }));
  if (options.shuffleTerrains) {
    const terrains = shuffle(copy.map((g) => g.terrain));
    for (let i = 0; i < copy.length; i++) {
      copy[i].terrain = terrains[i];
    }
  }
  if (options.shuffleNumbers) {
    const numberBearingIndices = copy
      .map((g, idx) => (g.terrain !== 'DESERT' && g.terrain !== 'SEA' && g.terrain !== 'FOG' ? idx : -1))
      .filter((idx) => idx !== -1);
    const originalNumbers = group
      .filter((g) => g.num !== null)
      .map((g) => g.num as number);

    let bestNums = shuffle(originalNumbers);
    for (let attempt = 0; attempt < 60; attempt++) {
      const candidate = shuffle(originalNumbers);
      let redConflict = false;
      if (options.preventRedAdjacent) {
        for (let a = 0; a < numberBearingIndices.length; a++) {
          const nA = candidate[a];
          if (nA !== 6 && nA !== 8) continue;
          const hA = copy[numberBearingIndices[a]];
          for (let b = a + 1; b < numberBearingIndices.length; b++) {
            const nB = candidate[b];
            if (nB !== 6 && nB !== 8) continue;
            const hB = copy[numberBearingIndices[b]];
            const dq = Math.abs(hA.q - hB.q);
            const dr = Math.abs(hA.r - hB.r);
            const ds = Math.abs(-hA.q - hA.r - (-hB.q - hB.r));
            if (Math.max(dq, dr, ds) === 1) {
              redConflict = true;
              break;
            }
          }
          if (redConflict) break;
        }
      }
      if (!redConflict) {
        bestNums = candidate;
        break;
      }
    }

    for (let i = 0; i < copy.length; i++) {
      copy[i].num = null;
      copy[i].hasRobber = false;
    }
    for (let i = 0; i < numberBearingIndices.length; i++) {
      copy[numberBearingIndices[i]].num = bestNums[i] ?? null;
    }
    const desertItem = copy.find((g) => g.terrain === 'DESERT');
    if (desertItem) {
      desertItem.hasRobber = true;
    } else {
      const twelveItem = copy.find((g) => g.num === 12);
      if (twelveItem) twelveItem.hasRobber = true;
    }
  }
  return copy;
}

/**
 * Generates an authentic Seafarers scenario board for 2-3, 4, or 5-6 players
 * matching 100% the exact island and sea shapes of the official manuals
 * (`CatanNavegantes-Reglas1.pdf` and `CatanNavegantes56-Reglas.pdf`),
 * plus scenario-specific Section 4 ("4. MONTAJE VARIABLE") when `randomizeVariableSetup === true`.
 */
export function generateSeafarersBoard(
  scenario: SeafarersScenario = 'HEADING_FOR_NEW_SHORES',
  preventAdjacentRedNumbers: boolean = true,
  hexSize: number = DEFAULT_HEX_SIZE,
  playerCount: number = 4,
  randomizeVariableSetup: boolean = false,
  boardSizeOverride?: SeafarersBoardSize
): BoardState {
  const hexes: Record<string, Hex> = {};
  let robberHexId = '';
  let pirateHexId = '';

  const effectiveSize: SeafarersBoardSize =
    boardSizeOverride ||
    (playerCount <= 3 ? '3P' : playerCount >= 5 ? '5_6P' : '4P');
  const is56 = effectiveSize === '5_6P';
  const is3P = effectiveSize === '3P';

  // Choose the exact frame size from the official manuals
  let frameType: SeafarersFrameType = 'FRAME_49';
  if (is56) {
    frameType =
      scenario === 'HEADING_FOR_NEW_SHORES' || scenario === 'THE_FOUR_ISLANDS'
        ? 'FRAME_56'
        : 'FRAME_63';
  } else if (is3P) {
    frameType =
      scenario === 'HEADING_FOR_NEW_SHORES' || scenario === 'THE_FOUR_ISLANDS'
        ? 'FRAME_35'
        : 'FRAME_49';
  } else {
    frameType =
      scenario === 'HEADING_FOR_NEW_SHORES' ? 'FRAME_42' : 'FRAME_49';
  }

  const allCoords = getSeafarersFrameCoords(frameType);
  for (const c of allCoords) {
    const id = coordToId(c.q, c.r, c.s);
    hexes[id] = {
      id,
      q: c.q,
      r: c.r,
      s: c.s,
      terrain: 'SEA',
      numberToken: null,
      hasRobber: false,
      center: hexToPixel(c.q, c.r, hexSize),
    };
  }

  const mainIslandHexIds: string[] = [];
  const uninhabitableHexIds: string[] = [];
  const foreignTerritoryMap: Record<string, string> = {};
  const portEligibleHexIds = new Set<string>();

  let fogDeck: Array<{ terrain: TerrainType; numberToken: number | null }> | undefined;
  let nativeVillages: Record<string, { id: string; hexId: string; vertexId: string; numberToken: number; clothRemaining: number }> | undefined;
  let forgottenGifts: Record<string, { id: string; vertexId: string; type: 'CATAN_CHIT_1VP' | 'DEV_CARD' | 'PORT'; portType?: PortType; claimed: boolean; claimedByPlayerId?: string }> | undefined;
  let pirateFleetHexId: string | undefined;
  let pirateFleetRouteHexIds: string[] | undefined;
  let pirateFortresses: Record<string, { id: string; hexId: string; vertexId: string; targetPlayerColor: PlayerColor; chitsRemaining: number }> | undefined;
  let safePirateHexId: string | undefined;

  let rawPortsToPlace: Array<{ type: PortType; landQ: number; landR: number; seaQ: number; seaR: number }> = [];

  const scenarioKey = `${scenario}__${effectiveSize}`;
  const boardData = SEAFARERS_BOARDS_DATA[scenarioKey] || SEAFARERS_BOARDS_DATA[`${scenario}__4P`];

  if (scenario === 'NEW_WORLD' || !boardData) {
    // Escenario 9: Un nuevo mundo
    const isLarge = is56;
    let archConfigs: HexConfigItem[] = !isLarge
      ? [
          { q: -1, r: -2, terrain: 'WOOD', num: 4, territoryId: 'NW_CLUSTER_1' },
          { q: 0, r: -2, terrain: 'SHEEP', num: 9, territoryId: 'NW_CLUSTER_1' },
          { q: -2, r: -1, terrain: 'BRICK', num: 5, territoryId: 'NW_CLUSTER_1' },
          { q: -1, r: -1, terrain: 'WHEAT', num: 8, territoryId: 'NW_CLUSTER_1' },
          { q: 2, r: -2, terrain: 'GOLD', num: 10, territoryId: 'NW_CLUSTER_2' },
          { q: 3, r: -2, terrain: 'WHEAT', num: 6, territoryId: 'NW_CLUSTER_2' },
          { q: 2, r: -1, terrain: 'SHEEP', num: 3, territoryId: 'NW_CLUSTER_2' },
          { q: 3, r: -1, terrain: 'BRICK', num: 11, territoryId: 'NW_CLUSTER_2' },
          { q: 0, r: 0, terrain: 'DESERT', num: null, hasRobber: true, territoryId: 'NW_CLUSTER_3' },
          { q: 1, r: 0, terrain: 'WOOD', num: 8, territoryId: 'NW_CLUSTER_3' },
          { q: -1, r: 1, terrain: 'SHEEP', num: 4, territoryId: 'NW_CLUSTER_3' },
          { q: 0, r: 1, terrain: 'WHEAT', num: 10, territoryId: 'NW_CLUSTER_3' },
          { q: -3, r: 1, terrain: 'ORE', num: 3, territoryId: 'NW_CLUSTER_4' },
          { q: -2, r: 1, terrain: 'WOOD', num: 9, territoryId: 'NW_CLUSTER_4' },
          { q: -3, r: 2, terrain: 'GOLD', num: 2, territoryId: 'NW_CLUSTER_4' },
          { q: -2, r: 2, terrain: 'SHEEP', num: 12, territoryId: 'NW_CLUSTER_4' },
          { q: 2, r: 1, terrain: 'GOLD', num: 11, territoryId: 'NW_CLUSTER_5' },
          { q: 3, r: 1, terrain: 'WHEAT', num: 4, territoryId: 'NW_CLUSTER_5' },
          { q: 0, r: 3, terrain: 'ORE', num: 5, territoryId: 'NW_CLUSTER_5' },
          { q: 1, r: 3, terrain: 'BRICK', num: 10, territoryId: 'NW_CLUSTER_5' },
        ]
      : [
          { q: -1, r: -3, terrain: 'WOOD', num: 5, territoryId: 'NW_CLUSTER_1' },
          { q: 0, r: -3, terrain: 'SHEEP', num: 9, territoryId: 'NW_CLUSTER_1' },
          { q: -2, r: -2, terrain: 'BRICK', num: 4, territoryId: 'NW_CLUSTER_1' },
          { q: -1, r: -2, terrain: 'WHEAT', num: 8, territoryId: 'NW_CLUSTER_1' },
          { q: -3, r: -1, terrain: 'ORE', num: 10, territoryId: 'NW_CLUSTER_1' },
          { q: -2, r: -1, terrain: 'WOOD', num: 3, territoryId: 'NW_CLUSTER_1' },
          { q: 2, r: -3, terrain: 'GOLD', num: 11, territoryId: 'NW_CLUSTER_2' },
          { q: 3, r: -3, terrain: 'WHEAT', num: 6, territoryId: 'NW_CLUSTER_2' },
          { q: 4, r: -3, terrain: 'WOOD', num: 10, territoryId: 'NW_CLUSTER_2' },
          { q: 2, r: -2, terrain: 'SHEEP', num: 4, territoryId: 'NW_CLUSTER_2' },
          { q: 3, r: -2, terrain: 'BRICK', num: 9, territoryId: 'NW_CLUSTER_2' },
          { q: 4, r: -2, terrain: 'ORE', num: 5, territoryId: 'NW_CLUSTER_2' },
          { q: 0, r: 0, terrain: 'DESERT', num: null, hasRobber: true, territoryId: 'NW_CLUSTER_3' },
          { q: 1, r: 0, terrain: 'WOOD', num: 8, territoryId: 'NW_CLUSTER_3' },
          { q: 2, r: 0, terrain: 'SHEEP', num: 3, territoryId: 'NW_CLUSTER_3' },
          { q: -1, r: 1, terrain: 'SHEEP', num: 10, territoryId: 'NW_CLUSTER_3' },
          { q: 0, r: 1, terrain: 'WHEAT', num: 11, territoryId: 'NW_CLUSTER_3' },
          { q: 1, r: 1, terrain: 'BRICK', num: 6, territoryId: 'NW_CLUSTER_3' },
          { q: -4, r: 1, terrain: 'ORE', num: 3, territoryId: 'NW_CLUSTER_4' },
          { q: -3, r: 1, terrain: 'WOOD', num: 9, territoryId: 'NW_CLUSTER_4' },
          { q: -5, r: 2, terrain: 'GOLD', num: 5, territoryId: 'NW_CLUSTER_4' },
          { q: -4, r: 2, terrain: 'SHEEP', num: 12, territoryId: 'NW_CLUSTER_4' },
          { q: -3, r: 2, terrain: 'WHEAT', num: 4, territoryId: 'NW_CLUSTER_4' },
          { q: 3, r: 1, terrain: 'GOLD', num: 2, territoryId: 'NW_CLUSTER_5' },
          { q: 4, r: 1, terrain: 'WHEAT', num: 9, territoryId: 'NW_CLUSTER_5' },
          { q: 1, r: 3, terrain: 'ORE', num: 5, territoryId: 'NW_CLUSTER_5' },
          { q: 2, r: 3, terrain: 'BRICK', num: 10, territoryId: 'NW_CLUSTER_5' },
        ];

    if (randomizeVariableSetup) {
      archConfigs = randomizeHexGroup(archConfigs, {
        shuffleTerrains: true,
        shuffleNumbers: true,
        preventRedAdjacent: preventAdjacentRedNumbers,
      });
    }

    for (const item of archConfigs) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.num;
        if (item.hasRobber) {
          hexes[id].hasRobber = true;
          robberHexId = id;
        }
        mainIslandHexIds.push(id);
        portEligibleHexIds.add(id);
        if (item.territoryId) foreignTerritoryMap[id] = item.territoryId;
      }
    }
    pirateHexId = '1,-1,0';
  } else {
    // 100% Authentic scenario from official PDFs
    let hexSpecs: HexConfigItem[] = boardData.hexes.map((h) => ({
      q: h.q,
      r: h.r,
      terrain: h.terrain,
      num: h.num,
      hasRobber: h.hasRobber,
      territoryId: h.territoryId,
      isMainIsland: h.isMainIsland,
      isUninhabitable: h.isUninhabitable,
    }));

    // Section 4 "Montaje variable": only randomize what the scenario allows!
    if (randomizeVariableSetup && boardData.variableSetup) {
      if (scenario === 'HEADING_FOR_NEW_SHORES') {
        let main = hexSpecs.filter((h) => h.isMainIsland && h.terrain !== 'SEA');
        let islets = hexSpecs.filter((h) => !h.isMainIsland && h.terrain !== 'SEA');
        main = randomizeHexGroup(main, {
          shuffleTerrains: true,
          shuffleNumbers: true,
          preventRedAdjacent: preventAdjacentRedNumbers,
        });
        islets = randomizeHexGroup(islets, {
          shuffleTerrains: true,
          shuffleNumbers: true,
          preventRedAdjacent: preventAdjacentRedNumbers,
        });
        const sea = hexSpecs.filter((h) => h.terrain === 'SEA');
        hexSpecs = [...main, ...islets, ...sea];
      } else if (scenario === 'THE_FOUR_ISLANDS') {
        let land = hexSpecs.filter((h) => h.terrain !== 'SEA');
        land = randomizeHexGroup(land, {
          shuffleTerrains: true,
          shuffleNumbers: true,
          preventRedAdjacent: preventAdjacentRedNumbers,
        });
        const sea = hexSpecs.filter((h) => h.terrain === 'SEA');
        hexSpecs = [...land, ...sea];
      } else if (scenario === 'OCEANIA') {
        let land = hexSpecs.filter((h) => h.terrain !== 'SEA' && h.terrain !== 'FOG');
        land = randomizeHexGroup(land, {
          shuffleTerrains: true,
          shuffleNumbers: true,
          preventRedAdjacent: preventAdjacentRedNumbers,
        });
        const other = hexSpecs.filter((h) => h.terrain === 'SEA' || h.terrain === 'FOG');
        hexSpecs = [...land, ...other];
      } else if (scenario === 'THROUGH_THE_DESERT') {
        const fixed = hexSpecs.filter((h) => h.terrain === 'DESERT' || h.terrain === 'SEA');
        let main = hexSpecs.filter((h) => h.isMainIsland && h.terrain !== 'DESERT' && h.terrain !== 'SEA');
        let islets = hexSpecs.filter((h) => !h.isMainIsland && h.terrain !== 'DESERT' && h.terrain !== 'SEA');
        main = randomizeHexGroup(main, {
          shuffleTerrains: true,
          shuffleNumbers: true,
          preventRedAdjacent: preventAdjacentRedNumbers,
        });
        islets = randomizeHexGroup(islets, {
          shuffleTerrains: true,
          shuffleNumbers: true,
          preventRedAdjacent: preventAdjacentRedNumbers,
        });
        hexSpecs = [...fixed, ...main, ...islets];
      } else if (scenario === 'THE_FORGOTTEN_TRIBE') {
        const fixed = hexSpecs.filter((h) => !h.isMainIsland || h.terrain === 'SEA');
        let main = hexSpecs.filter((h) => h.isMainIsland && h.terrain !== 'SEA');
        main = randomizeHexGroup(main, {
          shuffleTerrains: true,
          shuffleNumbers: true,
          preventRedAdjacent: preventAdjacentRedNumbers,
        });
        hexSpecs = [...fixed, ...main];
      } else if (scenario === 'CLOTH_FOR_CATAN') {
        // Village islets are fixed
        const fixed = hexSpecs.filter((h) => !h.isMainIsland || h.terrain === 'SEA');
        let main = hexSpecs.filter((h) => h.isMainIsland && h.terrain !== 'SEA');
        main = randomizeHexGroup(main, {
          shuffleTerrains: true,
          shuffleNumbers: true,
          preventRedAdjacent: preventAdjacentRedNumbers,
        });
        hexSpecs = [...fixed, ...main];
      } else if (scenario === 'THE_PIRATE_ISLANDS') {
        // Terrains fixed; ports will be shuffled
      } else if (scenario === 'WONDERS_OF_CATAN') {
        const fixed = hexSpecs.filter((h) => h.terrain === 'DESERT' || h.terrain === 'SEA' || !h.isMainIsland);
        let main = hexSpecs.filter((h) => h.isMainIsland && h.terrain !== 'DESERT' && h.terrain !== 'SEA');
        main = randomizeHexGroup(main, {
          shuffleTerrains: true,
          shuffleNumbers: true,
          preventRedAdjacent: preventAdjacentRedNumbers,
        });
        hexSpecs = [...fixed, ...main];
      }
    }

    // Apply hexes to board
    for (const item of hexSpecs) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (!hexes[id]) {
        hexes[id] = {
          id,
          q: item.q,
          r: item.r,
          s: -item.q - item.r,
          terrain: 'SEA',
          numberToken: null,
          hasRobber: false,
          center: hexToPixel(item.q, item.r, hexSize),
        };
      }
      hexes[id].terrain = item.terrain;
      hexes[id].numberToken = item.num;
      if (item.hasRobber) {
        hexes[id].hasRobber = true;
        robberHexId = id;
      }
      if (item.isMainIsland && item.terrain !== 'SEA' && item.terrain !== 'FOG') {
        mainIslandHexIds.push(id);
      }
      if (item.terrain !== 'SEA' && item.terrain !== 'FOG' && !item.isUninhabitable) {
        portEligibleHexIds.add(id);
      }
      if (item.isUninhabitable) {
        uninhabitableHexIds.push(id);
      }
      if (item.territoryId) {
        foreignTerritoryMap[id] = item.territoryId;
      }
    }

    // Robber & Pirate
    if (!robberHexId && boardData.robberCoord) {
      const rId = coordToId(boardData.robberCoord.q, boardData.robberCoord.r, -boardData.robberCoord.q - boardData.robberCoord.r);
      if (hexes[rId]) {
        hexes[rId].hasRobber = true;
        robberHexId = rId;
      }
    }
    if (!robberHexId && scenario !== 'THE_PIRATE_ISLANDS') {
      const desert = Object.values(hexes).find((h) => h.terrain === 'DESERT');
      if (desert) {
        desert.hasRobber = true;
        robberHexId = desert.id;
      } else {
        const twelve = Object.values(hexes).find((h) => h.numberToken === 12);
        if (twelve) {
          twelve.hasRobber = true;
          robberHexId = twelve.id;
        }
      }
    }

    if (boardData.pirateCoord) {
      const pId = coordToId(boardData.pirateCoord.q, boardData.pirateCoord.r, -boardData.pirateCoord.q - boardData.pirateCoord.r);
      if (hexes[pId]) {
        pirateHexId = pId;
      }
    }
    if (!pirateHexId) {
      pirateHexId = Object.values(hexes).find((h) => h.terrain === 'SEA')?.id || '';
    }

    if (boardData.safePirateCoord) {
      safePirateHexId = coordToId(boardData.safePirateCoord.q, boardData.safePirateCoord.r, -boardData.safePirateCoord.q - boardData.safePirateCoord.r);
    }

    rawPortsToPlace = boardData.ports ? [...boardData.ports] : [];

    // Entities
    if (boardData.fogDeck) {
      fogDeck = boardData.fogDeck.map((f) => ({ terrain: f.terrain, numberToken: f.num }));
      if (randomizeVariableSetup) {
        fogDeck = shuffle(fogDeck);
      }
    }

    if (boardData.pirateFleetRoute) {
      pirateFleetRouteHexIds = boardData.pirateFleetRoute.map((c) => coordToId(c.q, c.r, -c.q - c.r));
      pirateFleetHexId = pirateFleetRouteHexIds[0];
    }
  }

  // Build Seafarers Topology
  const { vertices, edges, coastalEdgeIdsOrdered } = buildTopologyFromHexes(
    hexes,
    hexSize,
    undefined,
    undefined,
    undefined,
    true
  );

  const ports: PortInfo[] = [];
  const usedVertices = new Set<string>();

  if (rawPortsToPlace.length > 0) {
    let portTypes = rawPortsToPlace.map((p) => p.type);
    if (randomizeVariableSetup && boardData?.variableSetup?.shuffleMainPorts) {
      portTypes = shuffle(portTypes);
    }

    for (let i = 0; i < rawPortsToPlace.length; i++) {
      const pSpec = rawPortsToPlace[i];
      const pType = portTypes[i];
      const ratio: 2 | 3 = pType === 'GENERIC' ? 3 : 2;
      const landId = coordToId(pSpec.landQ, pSpec.landR, -pSpec.landQ - pSpec.landR);
      const seaId = coordToId(pSpec.seaQ, pSpec.seaR, -pSpec.seaQ - pSpec.seaR);

      let edge = Object.values(edges).find(
        (e) => e.hexIds.includes(landId) && e.hexIds.includes(seaId)
      );

      // If exact edge with seaId not found (e.g. sea coordinate is off-board frame boundary),
      // search for the coastal edge of landId whose midpoint is closest to the sea coordinate.
      if (!edge || usedVertices.has(edge.vertexIds[0]) || usedVertices.has(edge.vertexIds[1])) {
        const seaPixel = hexToPixel(pSpec.seaQ, pSpec.seaR, hexSize);
        // First try candidate coastal edges that have no used vertices
        let candidates = Object.values(edges).filter(
          (e) =>
            e.hexIds.includes(landId) &&
            (e.isCoastal || e.hexIds.length === 1 || e.hexIds.some((h) => hexes[h]?.terrain === 'SEA')) &&
            e.hexIds.filter((h) => hexes[h] && isRealLand(hexes[h].terrain)).length === 1 &&
            !usedVertices.has(e.vertexIds[0]) &&
            !usedVertices.has(e.vertexIds[1])
        );

        // If no candidate without used vertices, allow an edge where at least one vertex is not used yet
        if (candidates.length === 0) {
          candidates = Object.values(edges).filter(
            (e) =>
              e.hexIds.includes(landId) &&
              (e.isCoastal || e.hexIds.length === 1 || e.hexIds.some((h) => hexes[h]?.terrain === 'SEA')) &&
              e.hexIds.filter((h) => hexes[h] && isRealLand(hexes[h].terrain)).length === 1 &&
              (!usedVertices.has(e.vertexIds[0]) || !usedVertices.has(e.vertexIds[1]))
          );
        }

        candidates.sort((a, b) => {
          const vA0 = vertices[a.vertexIds[0]];
          const vA1 = vertices[a.vertexIds[1]];
          const midAx = ((vA0?.x || 0) + (vA1?.x || 0)) / 2;
          const midAy = ((vA0?.y || 0) + (vA1?.y || 0)) / 2;
          const distA = Math.hypot(midAx - seaPixel.x, midAy - seaPixel.y);

          const vB0 = vertices[b.vertexIds[0]];
          const vB1 = vertices[b.vertexIds[1]];
          const midBx = ((vB0?.x || 0) + (vB1?.x || 0)) / 2;
          const midBy = ((vB0?.y || 0) + (vB1?.y || 0)) / 2;
          const distB = Math.hypot(midBx - seaPixel.x, midBy - seaPixel.y);
          return distA - distB;
        });

        if (candidates.length > 0) {
          edge = candidates[0];
        }
      }

      if (edge) {
        const dockCenter = computeDockCenter(edge, hexes, hexSize);
        ports.push({
          id: `PORT_${i}_${edge.id}`,
          type: pType,
          ratio,
          edgeId: edge.id,
          vertexIds: edge.vertexIds,
          dockCenter,
        });
        usedVertices.add(edge.vertexIds[0]);
        usedVertices.add(edge.vertexIds[1]);
        if (vertices[edge.vertexIds[0]]) vertices[edge.vertexIds[0]].port = { type: pType, ratio };
        if (vertices[edge.vertexIds[1]]) vertices[edge.vertexIds[1]].port = { type: pType, ratio };
      }
    }
  } else {
    // Fallback port placement along eligible coastal edges (e.g. NEW_WORLD)
    const eligibleCoastalEdges = coastalEdgeIdsOrdered.filter((eId) => {
      const edge = edges[eId];
      if (!edge) return false;
      return edge.hexIds.some((hId) => portEligibleHexIds.has(hId));
    });
    const fallbackPorts: PortType[] = is56
      ? ['GENERIC', 'GENERIC', 'GENERIC', 'GENERIC', 'GENERIC', 'WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE', 'SHEEP']
      : ['GENERIC', 'GENERIC', 'GENERIC', 'GENERIC', 'WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'];
    const portsToPlace = randomizeVariableSetup ? shuffle(fallbackPorts) : fallbackPorts;
    if (portsToPlace.length > 0 && eligibleCoastalEdges.length > 0) {
      const step = Math.max(1, Math.floor(eligibleCoastalEdges.length / portsToPlace.length));
      for (let i = 0; i < portsToPlace.length; i++) {
        const pType = portsToPlace[i];
        const ratio: 2 | 3 = pType === 'GENERIC' ? 3 : 2;
        const startIdx = (i * step) % eligibleCoastalEdges.length;
        for (let offset = 0; offset < eligibleCoastalEdges.length; offset++) {
          const cEdgeId = eligibleCoastalEdges[(startIdx + offset) % eligibleCoastalEdges.length];
          const edge = edges[cEdgeId];
          if (edge && !usedVertices.has(edge.vertexIds[0]) && !usedVertices.has(edge.vertexIds[1])) {
            const dockCenter = computeDockCenter(edge, hexes, hexSize);
            ports.push({
              id: `PORT_SEA_${i}_${cEdgeId}`,
              type: pType,
              ratio,
              edgeId: cEdgeId,
              vertexIds: edge.vertexIds,
              dockCenter,
            });
            usedVertices.add(edge.vertexIds[0]);
            usedVertices.add(edge.vertexIds[1]);
            if (vertices[edge.vertexIds[0]]) vertices[edge.vertexIds[0]].port = { type: pType, ratio };
            if (vertices[edge.vertexIds[1]]) vertices[edge.vertexIds[1]].port = { type: pType, ratio };
            break;
          }
        }
      }
    }
  }

  // Entities: native villages, forgotten gifts, pirate fortresses
  if (scenario === 'CLOTH_FOR_CATAN' && boardData?.nativeVillages) {
    nativeVillages = {};
    let vIdx = 0;
    for (const nv of boardData.nativeVillages) {
      const hexId = coordToId(nv.hexCoord.q, nv.hexCoord.r, -nv.hexCoord.q - nv.hexCoord.r);
      const hexVerts = Object.values(vertices)
        .filter((v) => v.hexIds.includes(hexId))
        .sort((a, b) => a.y - b.y);
      if (hexVerts.length >= 2) {
        const topV = hexVerts[0];
        const botV = hexVerts[hexVerts.length - 1];
        nativeVillages[`VILLAGE_${vIdx}`] = {
          id: `VILLAGE_${vIdx}`,
          hexId,
          vertexId: topV.id,
          numberToken: nv.topNum,
          clothRemaining: 5,
        };
        vIdx++;
        nativeVillages[`VILLAGE_${vIdx}`] = {
          id: `VILLAGE_${vIdx}`,
          hexId,
          vertexId: botV.id,
          numberToken: nv.bottomNum,
          clothRemaining: 5,
        };
        vIdx++;
      }
    }
  } else if (scenario === 'THE_FORGOTTEN_TRIBE' && boardData?.forgottenGifts) {
    forgottenGifts = {};
    let giftSpecs = [...boardData.forgottenGifts];
    if (randomizeVariableSetup) {
      const types = shuffle(giftSpecs.map((g) => ({ type: g.type, portType: g.portType })));
      giftSpecs = giftSpecs.map((g, idx) => ({
        ...g,
        type: types[idx].type,
        portType: types[idx].portType,
      }));
    }
    const usedGiftVerts = new Set<string>();
    let gIdx = 0;
    for (const spec of giftSpecs) {
      const hexId = coordToId(spec.hexCoord.q, spec.hexCoord.r, -spec.hexCoord.q - spec.hexCoord.r);
      const coastalVerts = Object.values(vertices)
        .filter((v) => v.hexIds.includes(hexId) && !usedGiftVerts.has(v.id))
        .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
      const targetV = coastalVerts[0];
      if (targetV) {
        usedGiftVerts.add(targetV.id);
        forgottenGifts[`GIFT_${gIdx}`] = {
          id: `GIFT_${gIdx}`,
          vertexId: targetV.id,
          type: spec.type,
          portType: spec.portType,
          claimed: false,
        };
        gIdx++;
      }
    }
  } else if (scenario === 'THE_PIRATE_ISLANDS' && boardData?.pirateFortresses) {
    pirateFortresses = {};
    for (const fc of boardData.pirateFortresses) {
      if (playerCount === 5 && fc.color === 'PURPLE') continue;
      if (playerCount < 4 && fc.color === 'WHITE') continue;
      const hexId = coordToId(fc.hexCoord.q, fc.hexCoord.r, -fc.hexCoord.q - fc.hexCoord.r);
      const hexVerts = Object.values(vertices)
        .filter((v) => v.hexIds.includes(hexId))
        .sort((a, b) => b.x - a.x);
      const v = hexVerts[0];
      if (v) {
        pirateFortresses[`FORTRESS_${fc.color}`] = {
          id: `FORTRESS_${fc.color}`,
          hexId,
          vertexId: v.id,
          targetPlayerColor: fc.color,
          chitsRemaining: 3,
        };
      }
    }
  }

  return {
    mode: is56 ? 'EXPANSION_5_6' : 'STANDARD_3_4',
    hexSize,
    hexes,
    vertices,
    edges,
    ports,
    robberHexId,
    pirateHexId,
    safePirateHexId,
    clothCommonReserve: scenario === 'CLOTH_FOR_CATAN' ? 10 : undefined,
    fogDeck,
    revealedHexIds: [],
    nativeVillages,
    forgottenGifts,
    pirateFleetHexId,
    pirateFleetRouteHexIds,
    pirateFortresses,
    wondersState: {},
    mainIslandHexIds,
    uninhabitableHexIds,
    foreignTerritoryMap,
  };
}


export function generateBoard(
  mode: BoardMode = 'STANDARD_3_4',
  preventAdjacentRedNumbers: boolean = true,
  hexSize: number = DEFAULT_HEX_SIZE,
  desertInCenter: boolean = true,
  seafarersScenario?: SeafarersScenario,
  playerCount: number = 4,
  randomizeVariableSetup: boolean = false,
  boardSizeOverride?: SeafarersBoardSize
): BoardState {
  if (seafarersScenario) {
    return generateSeafarersBoard(
      seafarersScenario,
      preventAdjacentRedNumbers,
      hexSize,
      playerCount,
      randomizeVariableSetup,
      boardSizeOverride
    );
  }

  const landCoords = getLandCoordsForMode(mode);
  const seaCoords = getSurroundingSeaCoords(landCoords);

  let terrainPool: TerrainType[];
  let numberPool: number[];
  let portPool: PortType[];

  if (mode === 'EXPANSION_5_6') {
    terrainPool = [...EXPANSION_TERRAINS_30];
    numberPool = [...EXPANSION_NUMBERS_28];
    portPool = [...EXPANSION_PORTS_11];
  } else if (mode === 'MEGA_RADIUS_3') {
    terrainPool = [...MEGA_TERRAINS_37];
    numberPool = [...MEGA_NUMBERS_34];
    portPool = [...EXPANSION_PORTS_11];
  } else {
    terrainPool = [...STANDARD_TERRAINS_19];
    numberPool = [...STANDARD_NUMBERS_18];
    portPool = [...STANDARD_PORTS_9];
  }

  const centerCoordId = '0,0,0';
  const hasCenterCoord = landCoords.some((c) => coordToId(c.q, c.r, c.s) === centerCoordId);

  let hexes: Record<string, Hex> = {};
  let robberHexId = '';

  // Try assigning terrains & numbers up to 250 times if preventAdjacentRedNumbers is enabled
  let attempts = 0;
  const maxAttempts = preventAdjacentRedNumbers ? 250 : 1;

  while (attempts < maxAttempts) {
    attempts++;
    hexes = {};
    robberHexId = '';

    const remainingTerrainPool = [...terrainPool];
    if (desertInCenter && hasCenterCoord) {
      const desertIdx = remainingTerrainPool.indexOf('DESERT');
      if (desertIdx !== -1) {
        remainingTerrainPool.splice(desertIdx, 1);
      }
    }

    const shuffledTerrains = shuffle(remainingTerrainPool);

    // If random desert mode is selected, ensure the desert does not accidentally land in the center
    // so the visual change from "Desierto en el Centro" is immediately distinct and noticeable!
    if (!desertInCenter && hasCenterCoord) {
      const centerIndexInCoords = landCoords.findIndex((c) => coordToId(c.q, c.r, c.s) === centerCoordId);
      if (centerIndexInCoords !== -1 && shuffledTerrains[centerIndexInCoords] === 'DESERT') {
        const nonDesertIdx = shuffledTerrains.findIndex((t, idx) => idx !== centerIndexInCoords && t !== 'DESERT');
        if (nonDesertIdx !== -1) {
          [shuffledTerrains[centerIndexInCoords], shuffledTerrains[nonDesertIdx]] = [
            shuffledTerrains[nonDesertIdx],
            shuffledTerrains[centerIndexInCoords],
          ];
        }
      }
    }

    const shuffledNumbers = shuffle(numberPool);
    let numIdx = 0;
    let terrainIdx = 0;

    landCoords.forEach((coord) => {
      const id = coordToId(coord.q, coord.r, coord.s);
      const isForcedCenterDesert = desertInCenter && hasCenterCoord && id === centerCoordId;
      const terrain: TerrainType = isForcedCenterDesert
        ? 'DESERT'
        : (shuffledTerrains[terrainIdx++] || 'DESERT');
      const isDesert = terrain === 'DESERT';
      const numberToken = isDesert ? null : (shuffledNumbers[numIdx++] ?? 5);
      const hasRobber =
        desertInCenter && hasCenterCoord
          ? id === centerCoordId
          : isDesert && !robberHexId;
      if (hasRobber) {
        robberHexId = id;
      }

      hexes[id] = {
        id,
        q: coord.q,
        r: coord.r,
        s: coord.s,
        terrain,
        numberToken,
        hasRobber,
        center: hexToPixel(coord.q, coord.r, hexSize),
      };
    });

    if (!preventAdjacentRedNumbers || !hasAdjacentRedNumbers(hexes)) {
      break;
    }
  }

  // Fallback if no desert had robber
  if (!robberHexId && landCoords.length > 0) {
    const firstId = coordToId(landCoords[0].q, landCoords[0].r, landCoords[0].s);
    robberHexId = firstId;
    hexes[firstId].hasRobber = true;
  }

  // Add outer SEA hexes
  for (const coord of seaCoords) {
    const id = coordToId(coord.q, coord.r, coord.s);
    hexes[id] = {
      id,
      q: coord.q,
      r: coord.r,
      s: coord.s,
      terrain: 'SEA',
      numberToken: null,
      hasRobber: false,
      center: hexToPixel(coord.q, coord.r, hexSize),
    };
  }

  // Build initial topology
  const { vertices, edges, coastalEdgeIdsOrdered } = buildTopologyFromHexes(hexes, hexSize);

  // Place ports evenly along the ordered coastal perimeter edges, ensuring no two ports share a vertex
  const shuffledPorts = shuffle(portPool);
  const ports: PortInfo[] = [];
  const totalCoastal = coastalEdgeIdsOrdered.length;
  const targetPortCount = shuffledPorts.length;
  const usedVertices = new Set<string>();

  if (totalCoastal > 0 && targetPortCount > 0) {
    const step = totalCoastal / targetPortCount;
    for (let i = 0; i < targetPortCount; i++) {
      const baseIdx = Math.floor(i * step) % totalCoastal;
      // Search baseIdx or nearby coastal edge whose vertices aren't already assigned to a port
      let chosenEdgeId: string | null = null;
      for (let offset = 0; offset < totalCoastal; offset++) {
        const candidateId = coastalEdgeIdsOrdered[(baseIdx + offset) % totalCoastal];
        const candidateEdge = edges[candidateId];
        if (
          candidateEdge &&
          !usedVertices.has(candidateEdge.vertexIds[0]) &&
          !usedVertices.has(candidateEdge.vertexIds[1])
        ) {
          chosenEdgeId = candidateId;
          break;
        }
      }

      if (chosenEdgeId) {
        const edge = edges[chosenEdgeId];
        const portType = shuffledPorts[i];
        const ratio: 2 | 3 = portType === 'GENERIC' ? 3 : 2;
        const dockCenter = computeDockCenter(edge, hexes, hexSize);

        ports.push({
          id: `PORT_${i}_${chosenEdgeId}`,
          type: portType,
          ratio,
          edgeId: chosenEdgeId,
          vertexIds: edge.vertexIds,
          dockCenter,
        });

        usedVertices.add(edge.vertexIds[0]);
        usedVertices.add(edge.vertexIds[1]);
        vertices[edge.vertexIds[0]].port = { type: portType, ratio };
        vertices[edge.vertexIds[1]].port = { type: portType, ratio };
      }
    }
  }

  return {
    mode,
    hexSize,
    hexes,
    vertices,
    edges,
    ports,
    robberHexId,
  };
}

/**
 * Reorganizes the board in-place so that the desert-in-center rule is fulfilled immediately:
 * - If desertInCenter is true, swaps the existing desert into (0,0,0) and places the Robber at (0,0,0).
 * - If desertInCenter is false, and (0,0,0) is desert, swaps it with a non-center land hex so the center produces resources.
 */
export function enforceDesertInCenterRule(board: BoardState, desertInCenter: boolean): BoardState {
  const centerHex = board.hexes['0,0,0'];
  if (!centerHex || centerHex.terrain === 'SEA') return board;

  const newHexes: Record<string, Hex> = { ...board.hexes };

  if (desertInCenter) {
    if (centerHex.terrain !== 'DESERT') {
      const currentDesertHex = Object.values(newHexes).find(
        (h) => h.id !== '0,0,0' && h.terrain === 'DESERT'
      );
      if (currentDesertHex) {
        const oldCenterTerrain = centerHex.terrain;
        const oldCenterToken = centerHex.numberToken;

        newHexes['0,0,0'] = {
          ...centerHex,
          terrain: 'DESERT',
          numberToken: null,
          hasRobber: true,
        };
        newHexes[currentDesertHex.id] = {
          ...currentDesertHex,
          terrain: oldCenterTerrain,
          numberToken: oldCenterToken,
          hasRobber: false,
        };
      } else {
        newHexes['0,0,0'] = {
          ...centerHex,
          terrain: 'DESERT',
          numberToken: null,
          hasRobber: true,
        };
      }
    }
    board.robberHexId = '0,0,0';
    for (const [id, h] of Object.entries(newHexes)) {
      if (id !== '0,0,0' && h.hasRobber) {
        newHexes[id] = { ...h, hasRobber: false };
      } else if (id === '0,0,0' && !h.hasRobber) {
        newHexes[id] = { ...h, hasRobber: true };
      }
    }
  } else {
    if (centerHex.terrain === 'DESERT') {
      const candidateHex = Object.values(newHexes).find(
        (h) => h.id !== '0,0,0' && h.terrain !== 'SEA' && h.terrain !== 'DESERT'
      );
      if (candidateHex) {
        const candidateTerrain = candidateHex.terrain;
        const candidateToken = candidateHex.numberToken;

        newHexes['0,0,0'] = {
          ...centerHex,
          terrain: candidateTerrain,
          numberToken: candidateToken,
          hasRobber: false,
        };
        newHexes[candidateHex.id] = {
          ...candidateHex,
          terrain: 'DESERT',
          numberToken: null,
          hasRobber: true,
        };
        board.robberHexId = candidateHex.id;
        for (const [id, h] of Object.entries(newHexes)) {
          if (id !== candidateHex.id && h.hasRobber) {
            newHexes[id] = { ...h, hasRobber: false };
          } else if (id === candidateHex.id && !h.hasRobber) {
            newHexes[id] = { ...h, hasRobber: true };
          }
        }
      }
    }
  }

  board.hexes = newHexes;
  return { ...board };
}


