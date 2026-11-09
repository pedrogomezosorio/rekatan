import {
  BoardMode,
  BoardState,
  CubicCoord,
  Edge,
  Hex,
  PlayerColor,
  PortInfo,
  PortType,
  SeafarersScenario,
  TerrainType,
  Vertex,
} from '../types';
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
      port: null,
      isLand: false,
      isCoastal: false,
    };
    return vertices[vId];
  };

  // In Base Game: only non-SEA hexes generate playable topology
  // In Seafarers: both land and navigable sea hexes generate topological vertices and edges
  const isSeafarersMode = isSeafarers || Object.values(hexes).some((h) => h.terrain === 'GOLD');
  const playableHexes = isSeafarersMode
    ? Object.values(hexes)
    : Object.values(hexes).filter((h) => h.terrain !== 'SEA');
  const allHexes = Object.values(hexes);

  // Track which hexes touch each vertex/edge
  for (const hex of playableHexes) {
    const corners = getHexCornerPoints(hex.center.x, hex.center.y, hexSize);
    const cornerVertices = corners.map((pt) => getOrCreateVertex(pt.x, pt.y));

    for (const v of cornerVertices) {
      if (hex.terrain !== 'SEA') {
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
          isLand: hex.terrain !== 'SEA',
          isCoastal: false,
        };
      } else {
        if (!edges[edgeId].hexIds.includes(hex.id)) {
          edges[edgeId].hexIds.push(hex.id);
        }
        if (hex.terrain !== 'SEA') {
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

  // Mark coastal edges and vertices
  const coastalEdges: Edge[] = [];
  for (const edge of Object.values(edges)) {
    const landCount = edge.hexIds.filter(
      (hId) => hexes[hId] && hexes[hId].terrain !== 'SEA'
    ).length;
    const touchesSea = edge.hexIds.some(
      (hId) => hexes[hId] && hexes[hId].terrain === 'SEA'
    );
    const isCoastal = isSeafarersMode ? landCount >= 1 && touchesSea : landCount === 1;

    edge.isLand = landCount >= 1;
    edge.isCoastal = isCoastal;
    if (edge.isCoastal) {
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
    vertex.isLand = vertex.hexIds.some((hId) => hexes[hId] && hexes[hId].terrain !== 'SEA');
    vertex.isCoastal = isSeafarersMode
      ? vertex.isLand && vertex.hexIds.some((hId) => hexes[hId] && hexes[hId].terrain === 'SEA')
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

  const landHexId = edge.hexIds.find((id) => hexes[id] && hexes[id].terrain !== 'SEA');
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

/**
 * Generates an authentic Seafarers scenario board:
 * - HEADING_FOR_NEW_SHORES: 1 Main Island (14 hexes) + 3 Outlying Islands with Gold (6 hexes) + 17 navigable sea hexes.
 * - THE_FOUR_ISLANDS: 4 balanced islands separated by sea channels (16 land hexes) + 21 sea hexes.
 * - PROCEDURAL_ARCHIPELAGO: Randomized clusters with sea channels and 2 gold hexes.
 */
export function generateSeafarersBoard(
  scenario: SeafarersScenario = 'HEADING_FOR_NEW_SHORES',
  preventAdjacentRedNumbers: boolean = true,
  hexSize: number = DEFAULT_HEX_SIZE
): BoardState {
  const hexes: Record<string, Hex> = {};
  let robberHexId = '';
  let pirateHexId = '';

  // Generate radius 3 hex grid coordinates (37 hexes)
  const allCoords: CubicCoord[] = [];
  for (let q = -3; q <= 3; q++) {
    for (let r = -3; r <= 3; r++) {
      const s = -q - r;
      if (Math.abs(s) <= 3) {
        allCoords.push({ q, r, s });
      }
    }
  }

  // Pre-fill all coords with SEA
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

  let fogDeck: Array<{ terrain: TerrainType; numberToken: number | null }> | undefined;
  let nativeVillages: Record<string, { id: string; hexId: string; vertexId: string; numberToken: number; clothRemaining: number }> | undefined;
  let forgottenGifts: Record<string, { id: string; vertexId: string; type: 'CATAN_CHIT_1VP' | 'DEV_CARD' | 'PORT'; claimed: boolean; claimedByPlayerId?: string }> | undefined;
  let pirateFleetHexId: string | undefined;
  let pirateFleetRouteHexIds: string[] | undefined;
  let pirateFortresses: Record<string, { id: string; hexId: string; vertexId: string; targetPlayerColor: PlayerColor; chitsRemaining: number }> | undefined;

  if (scenario === 'HEADING_FOR_NEW_SHORES') {
    // 1. Main Island (14 hexes: 1 Desert, 3 Wood, 2 Brick, 3 Sheep, 3 Wheat, 2 Ore)
    const mainIslandConfigs: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: -3, r: 1, terrain: 'WOOD', num: 5 },
      { q: -3, r: 2, terrain: 'BRICK', num: 2 },
      { q: -3, r: 3, terrain: 'SHEEP', num: 10 },
      { q: -2, r: 0, terrain: 'WOOD', num: 3 },
      { q: -2, r: 1, terrain: 'WHEAT', num: 9 },
      { q: -2, r: 2, terrain: 'ORE', num: 10 },
      { q: -1, r: -2, terrain: 'SHEEP', num: 4 },
      { q: -1, r: -1, terrain: 'WHEAT', num: 8 },
      { q: -1, r: 0, terrain: 'DESERT', num: null },
      { q: -1, r: 1, terrain: 'BRICK', num: 6 },
      { q: -1, r: 2, terrain: 'ORE', num: 11 },
      { q: 0, r: -1, terrain: 'WOOD', num: 4 },
      { q: 0, r: 0, terrain: 'WHEAT', num: 3 },
      { q: 0, r: 1, terrain: 'SHEEP', num: 9 },
    ];

    // 2. Foreign Island 1 (NE, 2 hexes)
    const island1Configs: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 1, r: -3, terrain: 'GOLD', num: 8 },
      { q: 2, r: -3, terrain: 'WOOD', num: 5 },
    ];

    // 3. Foreign Island 2 (E, 2 hexes)
    const island2Configs: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 2, r: -1, terrain: 'GOLD', num: 6 },
      { q: 3, r: -2, terrain: 'ORE', num: 9 },
    ];

    // 4. Foreign Island 3 (SE, 2 hexes)
    const island3Configs: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 1, r: 2, terrain: 'BRICK', num: 4 },
      { q: 2, r: 1, terrain: 'SHEEP', num: 10 },
    ];

    const allLand = [...mainIslandConfigs, ...island1Configs, ...island2Configs, ...island3Configs];
    for (const item of allLand) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.num;
        if (item.terrain === 'DESERT') {
          hexes[id].hasRobber = true;
          robberHexId = id;
        }
      }
    }

    pirateHexId = '1,0,-1'; // Central maritime channel
  } else if (scenario === 'THE_FOUR_ISLANDS') {
    // 4 Balanced Islands (each 4 hexes separated by maritime channels)
    const fourIslands: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      // Island 1 (NW)
      { q: -3, r: 0, terrain: 'WOOD', num: 6 },
      { q: -3, r: 1, terrain: 'BRICK', num: 5 },
      { q: -2, r: 0, terrain: 'SHEEP', num: 9 },
      { q: -2, r: -1, terrain: 'WHEAT', num: 4 },
      // Island 2 (NE)
      { q: 0, r: -3, terrain: 'GOLD', num: 8 },
      { q: 1, r: -3, terrain: 'ORE', num: 10 },
      { q: 0, r: -2, terrain: 'WOOD', num: 3 },
      { q: 1, r: -2, terrain: 'WHEAT', num: 11 },
      // Island 3 (SW)
      { q: -1, r: 2, terrain: 'GOLD', num: 6 },
      { q: -1, r: 3, terrain: 'WHEAT', num: 9 },
      { q: 0, r: 2, terrain: 'BRICK', num: 4 },
      { q: 0, r: 3, terrain: 'ORE', num: 5 },
      // Island 4 (SE)
      { q: 2, r: -1, terrain: 'WOOD', num: 8 },
      { q: 3, r: -1, terrain: 'SHEEP', num: 10 },
      { q: 2, r: 0, terrain: 'BRICK', num: 3 },
      { q: 3, r: -2, terrain: 'WHEAT', num: 2 },
    ];

    for (const item of fourIslands) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.num;
      }
    }
    robberHexId = '-2,0,2';
    if (hexes[robberHexId]) hexes[robberHexId].hasRobber = true;
    pirateHexId = '0,0,0'; // Central maritime intersection
  } else if (scenario === 'OCEANIA') {
    // Escenario 3: Oceanía (Tierra ignota)
    // Isla Oeste (colonizada)
    const westIsland: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: -3, r: 0, terrain: 'WOOD', num: 6 },
      { q: -3, r: 1, terrain: 'BRICK', num: 5 },
      { q: -2, r: 0, terrain: 'SHEEP', num: 9 },
      { q: -2, r: -1, terrain: 'WHEAT', num: 4 },
      { q: -3, r: 2, terrain: 'ORE', num: 10 },
    ];

    // Isla Este (colonizada)
    const eastIsland: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 2, r: -1, terrain: 'WOOD', num: 8 },
      { q: 3, r: -1, terrain: 'SHEEP', num: 10 },
      { q: 2, r: 0, terrain: 'BRICK', num: 4 },
      { q: 3, r: -2, terrain: 'WHEAT', num: 9 },
      { q: 2, r: 1, terrain: 'ORE', num: 5 },
    ];

    // Niebla Marina Central (Tierra Ignota)
    const fogCoords = [
      { q: -1, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: -1 },
      { q: 0, r: 0 },
      { q: 0, r: 1 },
      { q: 1, r: -1 },
      { q: 1, r: 0 },
    ];

    for (const item of [...westIsland, ...eastIsland]) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.num;
      }
    }

    for (const item of fogCoords) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = 'FOG';
        hexes[id].numberToken = null;
      }
    }

    fogDeck = [
      { terrain: 'GOLD', numberToken: 6 },
      { terrain: 'GOLD', numberToken: 8 },
      { terrain: 'WOOD', numberToken: 3 },
      { terrain: 'BRICK', numberToken: 11 },
      { terrain: 'SHEEP', numberToken: 4 },
      { terrain: 'WHEAT', numberToken: 9 },
      { terrain: 'ORE', numberToken: 10 },
      { terrain: 'SEA', numberToken: null },
    ];

    robberHexId = '-3,2,1';
    if (hexes[robberHexId]) hexes[robberHexId].hasRobber = true;
    pirateHexId = '0,-2,2';
  } else if (scenario === 'THROUGH_THE_DESERT') {
    // Escenario 4: A través del desierto
    // Cinturón de desierto diagonal
    const desertBelt: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: -1, r: -1, terrain: 'DESERT', num: null },
      { q: 0, r: 0, terrain: 'DESERT', num: null },
      { q: 1, r: 1, terrain: 'DESERT', num: null },
    ];

    // Franja noroeste fértil (al otro lado del desierto)
    const nwStrip: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: -2, r: -1, terrain: 'WOOD', num: 8 },
      { q: -1, r: -2, terrain: 'BRICK', num: 5 },
      { q: -2, r: 0, terrain: 'ORE', num: 4 },
      { q: -3, r: 1, terrain: 'WHEAT', num: 11 },
    ];

    // Área sureste fértil principal (asentamientos iniciales)
    const seArea: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 0, r: 1, terrain: 'WHEAT', num: 6 },
      { q: 0, r: 2, terrain: 'SHEEP', num: 9 },
      { q: 1, r: 0, terrain: 'WOOD', num: 3 },
      { q: 1, r: 2, terrain: 'BRICK', num: 10 },
      { q: 2, r: 0, terrain: 'SHEEP', num: 4 },
      { q: 2, r: 1, terrain: 'ORE', num: 5 },
      { q: -1, r: 2, terrain: 'WOOD', num: 4 },
      { q: -1, r: 3, terrain: 'BRICK', num: 9 },
    ];

    // Islas orientales con Oro
    const eastGoldIslands: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 3, r: -2, terrain: 'GOLD', num: 8 },
      { q: 3, r: -1, terrain: 'WOOD', num: 9 },
      { q: 2, r: -3, terrain: 'GOLD', num: 6 },
      { q: 3, r: -3, terrain: 'SHEEP', num: 2 },
    ];

    for (const item of [...desertBelt, ...nwStrip, ...seArea, ...eastGoldIslands]) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.num;
        if (item.terrain === 'DESERT' && !robberHexId) {
          hexes[id].hasRobber = true;
          robberHexId = id;
        }
      }
    }
    pirateHexId = '2,-1,-1';
  } else if (scenario === 'THE_FORGOTTEN_TRIBE') {
    // Escenario 5: El pueblo perdido
    // Gran isla central habitada
    const centralLand: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 0, r: 0, terrain: 'DESERT', num: null },
      { q: -1, r: 0, terrain: 'WOOD', num: 5 },
      { q: -1, r: 1, terrain: 'BRICK', num: 4 },
      { q: 0, r: -1, terrain: 'SHEEP', num: 8 },
      { q: 0, r: 1, terrain: 'WHEAT', num: 9 },
      { q: 1, r: -1, terrain: 'ORE', num: 10 },
      { q: 1, r: 0, terrain: 'WOOD', num: 3 },
      { q: -2, r: 1, terrain: 'SHEEP', num: 10 },
      { q: -1, r: 2, terrain: 'WHEAT', num: 6 },
      { q: 1, r: 1, terrain: 'BRICK', num: 11 },
      { q: 2, r: -1, terrain: 'ORE', num: 3 },
      { q: 0, r: -2, terrain: 'WHEAT', num: 4 },
    ];

    // 4 Islotes periféricos donde NO se puede construir poblados
    const peripheralIslets: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: -3, r: 0, terrain: 'GOLD', num: 6 },
      { q: 0, r: -3, terrain: 'GOLD', num: 8 },
      { q: -1, r: 3, terrain: 'SHEEP', num: 2 },
      { q: 3, r: 0, terrain: 'WOOD', num: 9 },
    ];

    for (const item of [...centralLand, ...peripheralIslets]) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.num;
        if (item.terrain === 'DESERT') {
          hexes[id].hasRobber = true;
          robberHexId = id;
        }
      }
    }
    pirateHexId = '1,-2,1';
  } else if (scenario === 'CLOTH_FOR_CATAN') {
    // Escenario 6: Telas para Catán
    // Isla Norte (6 hexes)
    const northIsland: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: -2, r: -1, terrain: 'WOOD', num: 6 },
      { q: -1, r: -2, terrain: 'BRICK', num: 5 },
      { q: 0, r: -2, terrain: 'SHEEP', num: 9 },
      { q: 1, r: -3, terrain: 'WHEAT', num: 4 },
      { q: 2, r: -3, terrain: 'ORE', num: 10 },
      { q: 0, r: -3, terrain: 'WOOD', num: 3 },
    ];

    // Isla Sur (6 hexes)
    const southIsland: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: -2, r: 3, terrain: 'WOOD', num: 8 },
      { q: -1, r: 3, terrain: 'BRICK', num: 4 },
      { q: 0, r: 2, terrain: 'SHEEP', num: 10 },
      { q: 1, r: 1, terrain: 'WHEAT', num: 9 },
      { q: 2, r: 1, terrain: 'ORE', num: 5 },
      { q: 0, r: 3, terrain: 'WHEAT', num: 2 },
    ];

    // 4 Islotes centrales con Poblados Indígenas
    const nativeIslands: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: -2, r: 1, terrain: 'GOLD', num: 4 },
      { q: -1, r: 0, terrain: 'GOLD', num: 6 },
      { q: 1, r: -1, terrain: 'GOLD', num: 8 },
      { q: 2, r: -1, terrain: 'GOLD', num: 10 },
    ];

    for (const item of [...northIsland, ...southIsland, ...nativeIslands]) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.num;
      }
    }
    robberHexId = '0,-3,3';
    if (hexes[robberHexId]) hexes[robberHexId].hasRobber = true;
    pirateHexId = '0,0,0';
  } else if (scenario === 'THE_PIRATE_ISLANDS') {
    // Escenario 7: Las islas de los piratas
    // Isla Este de los colonos (10 hexes)
    const eastColony: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 1, r: -1, terrain: 'WOOD', num: 5 },
      { q: 2, r: -1, terrain: 'BRICK', num: 8 },
      { q: 3, r: -1, terrain: 'SHEEP', num: 9 },
      { q: 1, r: 0, terrain: 'WHEAT', num: 6 },
      { q: 2, r: 0, terrain: 'ORE', num: 10 },
      { q: 3, r: -2, terrain: 'WOOD', num: 4 },
      { q: 2, r: 1, terrain: 'SHEEP', num: 3 },
      { q: 1, r: 2, terrain: 'WHEAT', num: 11 },
      { q: 2, r: -2, terrain: 'BRICK', num: 4 },
      { q: 3, r: -3, terrain: 'ORE', num: 5 },
    ];

    // Desierto central (islas piratas)
    const pirateDeserts: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 0, r: -1, terrain: 'DESERT', num: null },
      { q: 0, r: 0, terrain: 'DESERT', num: null },
      { q: 0, r: 1, terrain: 'DESERT', num: null },
    ];

    // Fortalezas piratas en el oeste
    const fortressIslands: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: -3, r: 1, terrain: 'DESERT', num: null },
      { q: -3, r: 2, terrain: 'DESERT', num: null },
      { q: -2, r: -1, terrain: 'DESERT', num: null },
      { q: -2, r: 2, terrain: 'DESERT', num: null },
    ];

    for (const item of [...eastColony, ...pirateDeserts, ...fortressIslands]) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.num;
      }
    }

    pirateFleetRouteHexIds = [
      '-1,-1,2',
      '-1,0,1',
      '-1,1,0',
      '0,2,-2',
      '1,1,-2',
      '1,0,-1',
      '0,-2,2',
    ];
    pirateFleetHexId = '-1,0,1';
    robberHexId = ''; // En Las Islas de los Piratas no hay ladrón oficial
  } else if (scenario === 'WONDERS_OF_CATAN') {
    // Escenario 8: Las maravillas catanas
    // Archipiélago con estrecho marítimo, desierto erial y abundancia de materias primas
    const wondersLand: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      { q: 0, r: 0, terrain: 'DESERT', num: null }, // Gran Muralla
      { q: -2, r: 0, terrain: 'WOOD', num: 5 },
      { q: -2, r: 1, terrain: 'BRICK', num: 6 },
      { q: -1, r: -1, terrain: 'SHEEP', num: 8 },
      { q: -1, r: 1, terrain: 'WHEAT', num: 9 },
      { q: -1, r: 2, terrain: 'ORE', num: 10 },
      // Estrecho canal al norte
      { q: 0, r: -2, terrain: 'WOOD', num: 4 }, // Gran Puente
      { q: 1, r: -3, terrain: 'BRICK', num: 3 },
      { q: 2, r: -3, terrain: 'SHEEP', num: 11 },
      // Isla sur-este (Catedral, Teatro y Coloso portuario)
      { q: 1, r: 0, terrain: 'WHEAT', num: 8 },
      { q: 1, r: 1, terrain: 'ORE', num: 4 },
      { q: 2, r: 0, terrain: 'GOLD', num: 6 },
      { q: 2, r: -1, terrain: 'WOOD', num: 9 },
      { q: 3, r: -1, terrain: 'SHEEP', num: 10 },
      { q: 2, r: -2, terrain: 'BRICK', num: 5 },
    ];

    for (const item of wondersLand) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.num;
        if (item.terrain === 'DESERT') {
          hexes[id].hasRobber = true;
          robberHexId = id;
        }
      }
    }
    pirateHexId = '1,-2,1';
  } else {
    // Escenario 9: Un nuevo mundo / PROCEDURAL_ARCHIPELAGO
    // Generación procedural de archipiélago con 4 cúmulos de islas y canales navegables
    const proceduralLandCoords: Array<{ q: number; r: number; terrain: TerrainType; num: number | null }> = [
      // Cluster 1 (West, 6 hexes with Desert)
      { q: -3, r: 1, terrain: 'WOOD', num: 5 },
      { q: -3, r: 2, terrain: 'BRICK', num: 4 },
      { q: -2, r: 0, terrain: 'SHEEP', num: 8 },
      { q: -2, r: 1, terrain: 'DESERT', num: null },
      { q: -2, r: 2, terrain: 'ORE', num: 10 },
      { q: -1, r: 1, terrain: 'WHEAT', num: 9 },

      // Cluster 2 (North/NE, 4 hexes with Gold)
      { q: 0, r: -3, terrain: 'GOLD', num: 8 },
      { q: 1, r: -3, terrain: 'WOOD', num: 3 },
      { q: 1, r: -2, terrain: 'BRICK', num: 11 },
      { q: 2, r: -3, terrain: 'SHEEP', num: 4 },

      // Cluster 3 (East, 3 hexes with Gold)
      { q: 2, r: -1, terrain: 'GOLD', num: 6 },
      { q: 3, r: -1, terrain: 'ORE', num: 5 },
      { q: 3, r: -2, terrain: 'WHEAT', num: 10 },

      // Cluster 4 (South, 3 hexes)
      { q: 0, r: 2, terrain: 'WOOD', num: 6 },
      { q: 0, r: 3, terrain: 'SHEEP', num: 2 },
      { q: 1, r: 2, terrain: 'BRICK', num: 9 },
    ];

    for (const item of proceduralLandCoords) {
      const id = coordToId(item.q, item.r, -item.q - item.r);
      if (hexes[id]) {
        hexes[id].terrain = item.terrain;
        hexes[id].numberToken = item.terrain === 'DESERT' ? null : item.num;
        if (item.terrain === 'DESERT') {
          hexes[id].hasRobber = true;
          robberHexId = id;
        }
      }
    }
    pirateHexId = '0,0,0';
  }

  // Fallback robber if needed (except in Pirate Islands where there is officially no robber)
  if (!robberHexId && scenario !== 'THE_PIRATE_ISLANDS') {
    const firstLand = Object.values(hexes).find((h) => h.terrain !== 'SEA');
    if (firstLand) {
      robberHexId = firstLand.id;
      firstLand.hasRobber = true;
    }
  }

  // Build Seafarers Topology (both land and navigable sea generate interactive graph!)
  const { vertices, edges, coastalEdgeIdsOrdered } = buildTopologyFromHexes(
    hexes,
    hexSize,
    undefined,
    undefined,
    undefined,
    true
  );

  // Distribute 8 coastal ports
  const seafarersPortPool: PortType[] = [
    'GENERIC',
    'GENERIC',
    'GENERIC',
    'WOOD',
    'BRICK',
    'SHEEP',
    'WHEAT',
    'ORE',
  ];
  const shuffledPorts = shuffle(seafarersPortPool);
  const ports: PortInfo[] = [];
  const usedVertices = new Set<string>();

  for (let i = 0; i < shuffledPorts.length; i++) {
    const portType = shuffledPorts[i];
    const ratio: 2 | 3 = portType === 'GENERIC' ? 3 : 2;
    for (const cEdgeId of coastalEdgeIdsOrdered) {
      const edge = edges[cEdgeId];
      if (
        edge &&
        !usedVertices.has(edge.vertexIds[0]) &&
        !usedVertices.has(edge.vertexIds[1])
      ) {
        const dockCenter = computeDockCenter(edge, hexes, hexSize);
        ports.push({
          id: `PORT_SEA_${i}_${cEdgeId}`,
          type: portType,
          ratio,
          edgeId: cEdgeId,
          vertexIds: edge.vertexIds,
          dockCenter,
        });
        usedVertices.add(edge.vertexIds[0]);
        usedVertices.add(edge.vertexIds[1]);
        vertices[edge.vertexIds[0]].port = { type: portType, ratio };
        vertices[edge.vertexIds[1]].port = { type: portType, ratio };
        break;
      }
    }
  }

  // Populate scenario-specific interactive entities
  if (scenario === 'CLOTH_FOR_CATAN') {
    nativeVillages = {};
    const nativeHexes = [
      { hexId: '-2,1,1', num: 4 },
      { hexId: '-1,0,1', num: 6 },
      { hexId: '1,-1,0', num: 8 },
      { hexId: '2,-1,-1', num: 10 },
    ];
    for (const [idx, item] of nativeHexes.entries()) {
      const v = Object.values(vertices).find((vertex) => vertex.hexIds.includes(item.hexId));
      if (v) {
        nativeVillages[`VILLAGE_${idx}`] = {
          id: `VILLAGE_${idx}`,
          hexId: item.hexId,
          vertexId: v.id,
          numberToken: item.num,
          clothRemaining: 5,
        };
      }
    }
  } else if (scenario === 'THE_FORGOTTEN_TRIBE') {
    forgottenGifts = {};
    const giftTypes: Array<'CATAN_CHIT_1VP' | 'DEV_CARD' | 'PORT'> = [
      'CATAN_CHIT_1VP',
      'DEV_CARD',
      'PORT',
      'CATAN_CHIT_1VP',
    ];
    const isletHexIds = ['-3,0,3', '0,-3,3', '-1,3,-2', '3,0,-3'];
    for (let i = 0; i < isletHexIds.length; i++) {
      const v = Object.values(vertices).find((vertex) => vertex.hexIds.includes(isletHexIds[i]));
      if (v) {
        forgottenGifts[`GIFT_${i}`] = {
          id: `GIFT_${i}`,
          vertexId: v.id,
          type: giftTypes[i],
          claimed: false,
        };
      }
    }
  } else if (scenario === 'THE_PIRATE_ISLANDS') {
    pirateFortresses = {};
    const fortressConfigs: Array<{ hexId: string; color: PlayerColor }> = [
      { hexId: '-3,1,2', color: 'RED' },
      { hexId: '-3,2,1', color: 'BLUE' },
      { hexId: '-2,-1,3', color: 'ORANGE' },
      { hexId: '-2,2,0', color: 'WHITE' },
    ];
    for (const fc of fortressConfigs) {
      const v = Object.values(vertices).find((vertex) => vertex.hexIds.includes(fc.hexId));
      if (v) {
        pirateFortresses[`FORTRESS_${fc.color}`] = {
          id: `FORTRESS_${fc.color}`,
          hexId: fc.hexId,
          vertexId: v.id,
          targetPlayerColor: fc.color,
          chitsRemaining: 3,
        };
      }
    }
  }

  return {
    mode: 'STANDARD_3_4',
    hexSize,
    hexes,
    vertices,
    edges,
    ports,
    robberHexId,
    pirateHexId,
    fogDeck,
    revealedHexIds: [],
    nativeVillages,
    forgottenGifts,
    pirateFleetHexId,
    pirateFleetRouteHexIds,
    pirateFortresses,
    wondersState: {},
  };
}

/**
 * Generates a complete Catan BoardState for the given mode, red-number rule, and center-desert option.
 */
export function generateBoard(
  mode: BoardMode = 'STANDARD_3_4',
  preventAdjacentRedNumbers: boolean = true,
  hexSize: number = DEFAULT_HEX_SIZE,
  desertInCenter: boolean = true,
  seafarersScenario?: SeafarersScenario
): BoardState {
  if (seafarersScenario) {
    return generateSeafarersBoard(seafarersScenario, preventAdjacentRedNumbers, hexSize);
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


