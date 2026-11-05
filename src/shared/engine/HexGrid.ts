import {
  BoardMode,
  BoardState,
  CubicCoord,
  Edge,
  Hex,
  PortInfo,
  PortType,
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
  existingPorts?: PortInfo[]
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

  // First pass: iterate over non-SEA hexes so we only create playable vertices and edges
  const landHexes = Object.values(hexes).filter((h) => h.terrain !== 'SEA');
  const allHexes = Object.values(hexes);

  // Track which hexes touch each vertex/edge
  for (const hex of landHexes) {
    const corners = getHexCornerPoints(hex.center.x, hex.center.y, hexSize);
    const cornerVertices = corners.map((pt) => getOrCreateVertex(pt.x, pt.y));

    for (const v of cornerVertices) {
      v.isLand = true;
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
          isLand: true,
          isCoastal: false,
        };
      } else if (!edges[edgeId].hexIds.includes(hex.id)) {
        edges[edgeId].hexIds.push(hex.id);
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

  // Mark coastal edges and vertices:
  // An edge is coastal if it touches exactly 1 land hex!
  const coastalEdges: Edge[] = [];
  for (const edge of Object.values(edges)) {
    const landTouchCount = edge.hexIds.filter(
      (hId) => hexes[hId] && hexes[hId].terrain !== 'SEA'
    ).length;
    if (landTouchCount === 1) {
      edge.isCoastal = true;
      coastalEdges.push(edge);
      const [vA, vB] = edge.vertexIds;
      if (vertices[vA]) vertices[vA].isCoastal = true;
      if (vertices[vB]) vertices[vB].isCoastal = true;
    }
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
 * Generates a complete Catan BoardState for the given mode and red-number rule.
 */
export function generateBoard(
  mode: BoardMode = 'STANDARD_3_4',
  preventAdjacentRedNumbers: boolean = true,
  hexSize: number = DEFAULT_HEX_SIZE
): BoardState {
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

  const shuffledTerrains = shuffle(terrainPool);
  let hexes: Record<string, Hex> = {};
  let robberHexId = '';

  // Try assigning numbers up to 250 times if preventAdjacentRedNumbers is enabled
  let attempts = 0;
  const maxAttempts = preventAdjacentRedNumbers ? 250 : 1;

  while (attempts < maxAttempts) {
    attempts++;
    hexes = {};
    robberHexId = '';
    const shuffledNumbers = shuffle(numberPool);
    let numIdx = 0;

    landCoords.forEach((coord, i) => {
      const id = coordToId(coord.q, coord.r, coord.s);
      const terrain = shuffledTerrains[i] || 'DESERT';
      const isDesert = terrain === 'DESERT';
      const numberToken = isDesert ? null : (shuffledNumbers[numIdx++] ?? 5);
      const hasRobber = isDesert && !robberHexId;
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

