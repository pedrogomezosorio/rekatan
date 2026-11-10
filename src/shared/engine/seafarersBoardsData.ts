import { PlayerColor, PortType, SeafarersBoardSize, SeafarersScenario, TerrainType } from '../types';

export interface RawHexSpec {
  q: number;
  r: number;
  terrain: TerrainType;
  num: number | null;
  territoryId?: string;
  isMainIsland?: boolean;
  isUninhabitable?: boolean;
}

export interface RawPortSpec {
  type: PortType;
  landQ: number;
  landR: number;
  seaQ: number;
  seaR: number;
}

export interface RawVertexSpec {
  hexCoord: { q: number; r: number };
  corner: number; // 0 NE, 1 SE, 2 S, 3 SW, 4 NW, 5 N
}

export interface VariableHexGroup {
  coords: Array<{ q: number; r: number }>;
  shuffleTerrains: boolean;
  shuffleNumbers: boolean;
  preventRedAdjacent?: boolean;
  forbidRedOnGold?: boolean;
  forbidNumbersOnTerrains?: Array<{ terrains: TerrainType[]; numbers: number[] }>;
  forbiddenNumbers?: Array<{ coords: Array<{ q: number; r: number }>; numbers: number[] }>;
}

export interface ScenarioBoardData {
  scenarioId: SeafarersScenario;
  boardSize: SeafarersBoardSize;
  title: string;
  source: { pdf: 'base' | '56'; pages: number[] };
  pirateCoord?: { q: number; r: number } | null;
  robberCoord?: { q: number; r: number } | null;
  safePirateCoord?: { q: number; r: number } | null;
  hexes: RawHexSpec[];
  ports: RawPortSpec[];
  fogDeck?: Array<{ terrain: TerrainType; num: number | null }>;
  forgottenGifts?: Array<RawVertexSpec & {
    type: 'CATAN_CHIT_1VP' | 'DEV_CARD' | 'PORT';
    portType?: PortType;
    portEdge?: RawPortSpec;
  }>;
  nativeVillages?: Array<{ hexCoord: { q: number; r: number }; topNum: number; bottomNum: number }>;
  pirateFleetRoute?: Array<{ q: number; r: number }>;
  pirateFortresses?: Array<RawVertexSpec & { color: PlayerColor }>;
  wonderMarkers?: { greatBridge: RawVertexSpec[]; greatBridgeNorth?: RawVertexSpec[]; greatWall: RawVertexSpec[]; forbiddenSetup: RawVertexSpec[] };
  variableSetup: { groups: VariableHexGroup[]; shufflePorts: boolean };
}

// Transcribed from both user-provided PDFs, including the sea inside each frame.
// A dot is sea, ? is undiscovered, d is the ORIGINAL desert; see seafarersSetup.ts
// for the user's productive replacements. h = wheat, w = wood, s = sheep,
// b = brick, o = ore, g = gold. Every row explicitly gives its starting axial q.
const TERRAIN_CODES: Record<string, TerrainType> = {
  '.': 'SEA', '?': 'FOG', d: 'DESERT', h: 'WHEAT', w: 'WOOD', s: 'SHEEP', b: 'BRICK', o: 'ORE', g: 'GOLD',
};

function rows(spec: Array<[number, string]>): RawHexSpec[] {
  return spec.flatMap(([startQ, row], index) => row.split(' ').map((cell, offset) => ({
    q: startQ + offset, r: index - 3, terrain: TERRAIN_CODES[cell[0]],
    num: cell.length > 1 ? Number(cell.slice(1)) : null,
  })));
}

const coords = (value: string): Array<{ q: number; r: number }> => value.split(' ').filter(Boolean).map((pair) => {
  const [q, r] = pair.split(',').map(Number);
  return { q, r };
});

function defineBoard(data: ScenarioBoardData, main: string, uninhabitable: string, territories: string[]): ScenarioBoardData {
  const key = (q: number, r: number) => `${q},${r}`;
  const mainSet = new Set(coords(main).map(c => key(c.q, c.r)));
  const uninhabitableSet = new Set(coords(uninhabitable).map(c => key(c.q, c.r)));
  const territoryMap = new Map(territories.flatMap((cells, i) => coords(cells).map(c => [key(c.q, c.r), `ISLAND_${i + 1}`] as const)));
  for (const hex of data.hexes) {
    const id = key(hex.q, hex.r);
    if (mainSet.has(id)) hex.isMainIsland = true;
    if (uninhabitableSet.has(id)) hex.isUninhabitable = true;
    if (territoryMap.has(id)) hex.territoryId = territoryMap.get(id);
  }
  return data;
}

export const SEAFARERS_BOARDS_DATA: Record<string, ScenarioBoardData> = {
  // base PDF, páginas [4].
  "HEADING_FOR_NEW_SHORES__3P": defineBoard({
    scenarioId: "HEADING_FOR_NEW_SHORES",
    boardSize: "3P",
    title: "Rumbo a nuevas orillas (3J)",
    source: {"pdf": "base", "pages": [4, 5]},
    pirateCoord: {"q": 3, "r": 0},
    robberCoord: {"q": 0, "r": -3},
    hexes: rows([
      [0, "b12 g5 . ."],
      [-1, ". . . s4 o9"],
      [-2, ". h4 s6 . h3 ."],
      [-2, "s2 o5 w10 . g4"],
      [-3, "b8 s10 s9 w8 . ."],
      [-3, "h11 o3 b11 . o8"],
      [-3, "h6 w5 . b10"],
    ]),
    ports: [
      {"type": "BRICK", "landQ": -3, "landR": 3, "seaQ": -4, "seaR": 3},
      {"type": "SHEEP", "landQ": 0, "landR": 1, "seaQ": 1, "seaR": 0},
      {"type": "WHEAT", "landQ": -1, "landR": -1, "seaQ": -2, "seaR": -1},
      {"type": "WOOD", "landQ": -2, "landR": 3, "seaQ": -3, "seaR": 4},
      {"type": "ORE", "landQ": -3, "landR": 1, "seaQ": -3, "seaR": 0},
      {"type": "GENERIC", "landQ": 0, "landR": -1, "seaQ": 1, "seaR": -1},
      {"type": "GENERIC", "landQ": -3, "landR": 1, "seaQ": -4, "seaR": 2},
      {"type": "GENERIC", "landQ": -2, "landR": 3, "seaQ": -1, "seaR": 3},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("-1,-1 0,-1 -2,0 -1,0 0,0 -3,1 -2,1 -1,1 0,1 -3,2 -2,2 -1,2 -3,3 -2,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true },
        { coords: coords("0,-3 1,-3 2,-3 3,-3 2,-2 3,-2 2,-1 3,-1 2,0 2,1 1,2 0,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true, forbidRedOnGold: false },
      ],
    },
  }, "-1,-1 0,-1 -2,0 -1,0 0,0 -3,1 -2,1 -1,1 0,1 -3,2 -2,2 -1,2 -3,3 -2,3", "", ["0,-3 1,-3", "2,-2 3,-2 2,-1 2,0", "-1,-1 0,-1 -2,0 -1,0 0,0 -3,1 -2,1 -1,1 0,1 -3,2 -2,2 -1,2 -3,3 -2,3", "1,2 0,3"]),
  // base PDF, páginas [5].
  "HEADING_FOR_NEW_SHORES__4P": defineBoard({
    scenarioId: "HEADING_FOR_NEW_SHORES",
    boardSize: "4P",
    title: "Rumbo a nuevas orillas (4J)",
    source: {"pdf": "base", "pages": [4, 5]},
    pirateCoord: {"q": 4, "r": 0},
    robberCoord: {"q": -1, "r": 1},
    hexes: rows([
      [0, "o8 s11 . g4 ."],
      [-1, ". . . . b5 o2"],
      [-2, ". s5 w6 o4 . w9 ."],
      [-2, "h12 b11 h3 s9 . g10"],
      [-3, "b6 w10 d h11 w5 . ."],
      [-3, "o3 s4 b9 s8 . b3"],
      [-3, "h8 w2 o10 . h6"],
    ]),
    ports: [
      {"type": "BRICK", "landQ": -3, "landR": 1, "seaQ": -4, "seaR": 2},
      {"type": "SHEEP", "landQ": -3, "landR": 1, "seaQ": -3, "seaR": 0},
      {"type": "WHEAT", "landQ": 1, "landR": 1, "seaQ": 1, "seaR": 2},
      {"type": "WOOD", "landQ": -2, "landR": 3, "seaQ": -3, "seaR": 4},
      {"type": "ORE", "landQ": 1, "landR": -1, "seaQ": 1, "seaR": -2},
      {"type": "GENERIC", "landQ": -1, "landR": -1, "seaQ": -2, "seaR": -1},
      {"type": "GENERIC", "landQ": 1, "landR": 0, "seaQ": 2, "seaR": -1},
      {"type": "GENERIC", "landQ": -1, "landR": 3, "seaQ": 0, "seaR": 3},
      {"type": "GENERIC", "landQ": -3, "landR": 3, "seaQ": -4, "seaR": 3},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("-1,-1 0,-1 1,-1 -2,0 -1,0 0,0 1,0 -3,1 -2,1 -1,1 0,1 1,1 -3,2 -2,2 -1,2 0,2 -3,3 -2,3 -1,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true },
        { coords: coords("0,-3 1,-3 2,-3 3,-3 4,-3 3,-2 4,-2 3,-1 4,-1 3,0 3,1 2,2 1,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true, forbidRedOnGold: false },
      ],
    },
  }, "-1,-1 0,-1 1,-1 -2,0 -1,0 0,0 1,0 -3,1 -2,1 -1,1 0,1 1,1 -3,2 -2,2 -1,2 0,2 -3,3 -2,3 -1,3", "", ["0,-3 1,-3", "3,-3 3,-2 4,-2 3,-1 3,0", "-1,-1 0,-1 1,-1 -2,0 -1,0 0,0 1,0 -3,1 -2,1 -1,1 0,1 1,1 -3,2 -2,2 -1,2 0,2 -3,3 -2,3 -1,3", "2,2 1,3"]),
  // base PDF, páginas [6].
  "THE_FOUR_ISLANDS__3P": defineBoard({
    scenarioId: "THE_FOUR_ISLANDS",
    boardSize: "3P",
    title: "Las cuatro islas (3J)",
    source: {"pdf": "base", "pages": [6, 7]},
    pirateCoord: {"q": -2, "r": 4},
    robberCoord: {"q": -3, "r": 3},
    hexes: rows([
      [0, ". . h4 s3"],
      [-1, "o4 w9 . h9 b5"],
      [-2, "s6 o10 . w8 b11 ."],
      [-2, ". . . . ."],
      [-3, "h11 o8 w3 . b10 b6"],
      [-3, "w5 s9 . o2 h5"],
      [-3, "s12 . . ."],
    ]),
    ports: [
      {"type": "BRICK", "landQ": 2, "landR": -1, "seaQ": 1, "seaR": 0},
      {"type": "SHEEP", "landQ": -2, "landR": 2, "seaQ": -2, "seaR": 3},
      {"type": "WHEAT", "landQ": 2, "landR": 1, "seaQ": 2, "seaR": 2},
      {"type": "WOOD", "landQ": -3, "landR": 1, "seaQ": -2, "seaR": 0},
      {"type": "ORE", "landQ": 0, "landR": -2, "seaQ": 0, "seaR": -1},
      {"type": "GENERIC", "landQ": 0, "landR": 2, "seaQ": 0, "seaR": 1},
      {"type": "GENERIC", "landQ": 3, "landR": -2, "seaQ": 4, "seaR": -3},
      {"type": "GENERIC", "landQ": -3, "landR": 1, "seaQ": -4, "seaR": 2},
      {"type": "GENERIC", "landQ": -2, "landR": -1, "seaQ": -2, "seaR": -2},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("2,-3 3,-3 -1,-2 0,-2 2,-2 3,-2 -2,-1 -1,-1 1,-1 2,-1 -3,1 -2,1 -1,1 1,1 2,1 -3,2 -2,2 0,2 1,2 -3,3"), shuffleTerrains: true, shuffleNumbers: true, forbidNumbersOnTerrains: [{ terrains: ['WOOD', 'SHEEP'], numbers: [2, 12] }] },
      ],
    },
  }, "2,-3 3,-3 -1,-2 0,-2 2,-2 3,-2 -2,-1 -1,-1 1,-1 2,-1 -3,1 -2,1 -1,1 1,1 2,1 -3,2 -2,2 0,2 1,2 -3,3", "", ["2,-3 3,-3 2,-2 3,-2 1,-1 2,-1", "-1,-2 0,-2 -2,-1 -1,-1", "-3,1 -2,1 -1,1 -3,2 -2,2 -3,3", "1,1 2,1 0,2 1,2"]),
  // base PDF, páginas [7].
  "THE_FOUR_ISLANDS__4P": defineBoard({
    scenarioId: "THE_FOUR_ISLANDS",
    boardSize: "4P",
    title: "Las cuatro islas (4J)",
    source: {"pdf": "base", "pages": [6, 7]},
    pirateCoord: {"q": -2, "r": 4},
    robberCoord: {"q": 2, "r": -2},
    hexes: rows([
      [0, "s8 . w9 w11"],
      [-1, "b10 . o3 h12 s5"],
      [-2, "h5 w3 . b5 o10 ."],
      [-2, ". . w6 . ."],
      [-3, "b4 s9 . . w9 s11"],
      [-3, "h6 o4 b2 . o8"],
      [-3, "s10 h11 . h4"],
    ]),
    ports: [
      {"type": "BRICK", "landQ": -3, "landR": 1, "seaQ": -4, "seaR": 2},
      {"type": "SHEEP", "landQ": -3, "landR": 3, "seaQ": -4, "seaR": 3},
      {"type": "WHEAT", "landQ": -1, "landR": -2, "seaQ": -2, "seaR": -2},
      {"type": "WOOD", "landQ": 3, "landR": -2, "seaQ": 3, "seaR": -1},
      {"type": "ORE", "landQ": 2, "landR": 1, "seaQ": 2, "seaR": 0},
      {"type": "GENERIC", "landQ": 0, "landR": 0, "seaQ": 0, "seaR": -1},
      {"type": "GENERIC", "landQ": -2, "landR": 2, "seaQ": -1, "seaR": 1},
      {"type": "GENERIC", "landQ": 2, "landR": 1, "seaQ": 2, "seaR": 2},
      {"type": "GENERIC", "landQ": -2, "landR": -1, "seaQ": -2, "seaR": 0},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("0,-3 2,-3 3,-3 -1,-2 1,-2 2,-2 3,-2 -2,-1 -1,-1 1,-1 2,-1 0,0 -3,1 -2,1 1,1 2,1 -3,2 -2,2 -1,2 1,2 -3,3 -2,3 0,3"), shuffleTerrains: true, shuffleNumbers: true, forbidNumbersOnTerrains: [{ terrains: ['WOOD', 'SHEEP'], numbers: [2, 12] }] },
      ],
    },
  }, "0,-3 2,-3 3,-3 -1,-2 1,-2 2,-2 3,-2 -2,-1 -1,-1 1,-1 2,-1 0,0 -3,1 -2,1 1,1 2,1 -3,2 -2,2 -1,2 1,2 -3,3 -2,3 0,3", "", ["0,-3 -1,-2 -2,-1 -1,-1", "2,-3 3,-3 1,-2 2,-2 3,-2 1,-1 2,-1 0,0", "-3,1 -2,1 -3,2 -2,2 -1,2 -3,3 -2,3", "1,1 2,1 1,2 0,3"]),
  // base PDF, páginas [8].
  "OCEANIA__3P": defineBoard({
    scenarioId: "OCEANIA",
    boardSize: "3P",
    title: "Oceanía (3J)",
    source: {"pdf": "base", "pages": [8, 9]},
    pirateCoord: {"q": 2, "r": 3},
    robberCoord: {"q": -2, "r": 3},
    hexes: rows([
      [0, "? ? . b6 w11"],
      [-1, "? ? ? . w5 h3"],
      [-2, ". . . ? . s8 s9"],
      [-2, "w6 s5 . ? . o4"],
      [-3, ". b11 w9 . ? . ."],
      [-3, ". o8 h10 . ? ?"],
      [-3, ". s12 . ? ?"],
    ]),
    ports: [
      {"type": "BRICK", "landQ": -1, "landR": 2, "seaQ": -1, "seaR": 3},
      {"type": "SHEEP", "landQ": 4, "landR": -3, "seaQ": 5, "seaR": -3},
      {"type": "WHEAT", "landQ": 4, "landR": -1, "seaQ": 5, "seaR": -2},
      {"type": "WOOD", "landQ": -2, "landR": 1, "seaQ": -3, "seaR": 2},
      {"type": "ORE", "landQ": -2, "landR": 0, "seaQ": -3, "seaR": 1},
      {"type": "GENERIC", "landQ": 3, "landR": 0, "seaQ": 4, "seaR": 0},
      {"type": "GENERIC", "landQ": 3, "landR": -3, "seaQ": 4, "seaR": -4},
      {"type": "GENERIC", "landQ": -2, "landR": 3, "seaQ": -3, "seaR": 3},
    ],
    fogDeck: [
      {"terrain": "SEA", "num": null},
      {"terrain": "SEA", "num": null},
      {"terrain": "GOLD", "num": 3},
      {"terrain": "GOLD", "num": 5},
      {"terrain": "WHEAT", "num": 4},
      {"terrain": "WHEAT", "num": 8},
      {"terrain": "BRICK", "num": 3},
      {"terrain": "BRICK", "num": 6},
      {"terrain": "ORE", "num": 9},
      {"terrain": "ORE", "num": 10},
      {"terrain": "SHEEP", "num": 11},
      {"terrain": "WOOD", "num": 12},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("3,-3 4,-3 3,-2 4,-2 3,-1 4,-1 -2,0 -1,0 3,0 -2,1 -1,1 -2,2 -1,2 -2,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: false },
      ],
    },
  }, "3,-3 4,-3 3,-2 4,-2 3,-1 4,-1 -2,0 -1,0 3,0 -2,1 -1,1 -2,2 -1,2 -2,3", "", ["3,-3 4,-3 3,-2 4,-2 3,-1 4,-1 3,0", "-2,0 -1,0 -2,1 -1,1 -2,2 -1,2 -2,3"]),
  // base PDF, páginas [9].
  "OCEANIA__4P": defineBoard({
    scenarioId: "OCEANIA",
    boardSize: "4P",
    title: "Oceanía (4J)",
    source: {"pdf": "base", "pages": [8, 9]},
    pirateCoord: {"q": 0, "r": 4},
    robberCoord: {"q": 4, "r": -2},
    hexes: rows([
      [0, "? . b4 h10 o3"],
      [-1, "? ? . s9 w6 b12"],
      [-2, ". . ? . . s10 o8"],
      [-2, "o3 . ? ? . h11"],
      [-3, "h6 w4 . ? ? . w5"],
      [-3, "b9 s8 . ? ? ."],
      [-3, "s2 w5 . ? ?"],
    ]),
    ports: [
      {"type": "BRICK", "landQ": 4, "landR": -1, "seaQ": 5, "seaR": -2},
      {"type": "SHEEP", "landQ": 2, "landR": -3, "seaQ": 3, "seaR": -4},
      {"type": "WHEAT", "landQ": 4, "landR": -3, "seaQ": 4, "seaR": -4},
      {"type": "WOOD", "landQ": -2, "landR": 0, "seaQ": -3, "seaR": 0},
      {"type": "ORE", "landQ": -3, "landR": 1, "seaQ": -4, "seaR": 2},
      {"type": "GENERIC", "landQ": 3, "landR": 1, "seaQ": 4, "seaR": 0},
      {"type": "GENERIC", "landQ": 4, "landR": -3, "seaQ": 5, "seaR": -3},
      {"type": "GENERIC", "landQ": -3, "landR": 3, "seaQ": -4, "seaR": 3},
      {"type": "GENERIC", "landQ": -3, "landR": 3, "seaQ": -3, "seaR": 4},
    ],
    fogDeck: [
      {"terrain": "SEA", "num": null},
      {"terrain": "SEA", "num": null},
      {"terrain": "GOLD", "num": 3},
      {"terrain": "GOLD", "num": 5},
      {"terrain": "WHEAT", "num": 4},
      {"terrain": "WHEAT", "num": 8},
      {"terrain": "BRICK", "num": 6},
      {"terrain": "BRICK", "num": 11},
      {"terrain": "ORE", "num": 9},
      {"terrain": "ORE", "num": 10},
      {"terrain": "SHEEP", "num": 11},
      {"terrain": "WOOD", "num": 12},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("2,-3 3,-3 4,-3 2,-2 3,-2 4,-2 3,-1 4,-1 -2,0 3,0 -3,1 -2,1 3,1 -3,2 -2,2 -3,3 -2,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: false },
      ],
    },
  }, "2,-3 3,-3 4,-3 2,-2 3,-2 4,-2 3,-1 4,-1 -2,0 3,0 -3,1 -2,1 3,1 -3,2 -2,2 -3,3 -2,3", "", ["2,-3 3,-3 4,-3 2,-2 3,-2 4,-2 3,-1 4,-1 3,0 3,1", "-2,0 -3,1 -2,1 -3,2 -2,2 -3,3 -2,3"]),
  // base PDF, páginas [10].
  "THROUGH_THE_DESERT__3P": defineBoard({
    scenarioId: "THROUGH_THE_DESERT",
    boardSize: "3P",
    title: "A través del desierto (3J)",
    source: {"pdf": "base", "pages": [10, 11]},
    pirateCoord: {"q": 1, "r": -4},
    robberCoord: {"q": 1, "r": -3},
    hexes: rows([
      [0, "g4 d . o8"],
      [-1, "w3 d w4 . s12"],
      [-2, "h6 d b5 s6 . ."],
      [-2, ". o3 w10 . g5"],
      [-3, "w11 b6 h2 b9 . ."],
      [-3, "o10 h9 w8 . h9"],
      [-3, "s8 s4 . o5"],
    ]),
    ports: [
      {"type": "BRICK", "landQ": -3, "landR": 3, "seaQ": -3, "seaR": 4},
      {"type": "SHEEP", "landQ": -3, "landR": 1, "seaQ": -4, "seaR": 2},
      {"type": "WHEAT", "landQ": -2, "landR": 1, "seaQ": -2, "seaR": 0},
      {"type": "WOOD", "landQ": 1, "landR": -2, "seaQ": 2, "seaR": -3},
      {"type": "ORE", "landQ": -3, "landR": 3, "seaQ": -4, "seaR": 3},
      {"type": "GENERIC", "landQ": -2, "landR": 3, "seaQ": -1, "seaR": 3},
      {"type": "GENERIC", "landQ": 0, "landR": 1, "seaQ": 1, "seaR": 0},
      {"type": "GENERIC", "landQ": 0, "landR": 1, "seaQ": 0, "seaR": 2},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("1,-2 0,-1 1,-1 -1,0 0,0 -3,1 -2,1 -1,1 0,1 -3,2 -2,2 -1,2 -3,3 -2,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true },
        { coords: coords("0,-3 3,-3 -1,-2 3,-2 -2,-1 2,0 1,2 0,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true, forbidRedOnGold: true },
      ],
    },
  }, "1,-2 0,-1 1,-1 -1,0 0,0 -3,1 -2,1 -1,1 0,1 -3,2 -2,2 -1,2 -3,3 -2,3", "", ["0,-3 -1,-2 -2,-1", "3,-3 3,-2", "1,-2 0,-1 1,-1 -1,0 0,0 -3,1 -2,1 -1,1 0,1 -3,2 -2,2 -1,2 -3,3 -2,3", "2,0", "1,2 0,3"]),
  // Montaje inicial de la página 11, vuelto a contrastar con el PDF:
  // noreste: mineral 9, trigo 4, arcilla 2; extremo sur: mineral 6 y trigo 12.
  // La capa de mar decorativo se añade aparte y no desplaza ninguna casilla.
  "THROUGH_THE_DESERT__4P": defineBoard({
    scenarioId: "THROUGH_THE_DESERT",
    boardSize: "4P",
    title: "A través del desierto (4J)",
    source: {"pdf": "base", "pages": [10, 11]},
    pirateCoord: {"q": 1, "r": -4},
    robberCoord: {"q": 1, "r": -3},
    hexes: rows([
      [0, "g10 d w5 . o9"],
      [-1, "o11 d b3 s6 . h4"],
      [-2, "h8 d o8 h10 w4 . b2"],
      [-2, ". w10 b11 s9 . ."],
      [-3, "b12 b6 h5 w8 . g5 s3"],
      [-3, "s3 s11 o4 . . ."],
      [-3, ". w9 . o6 h12"],
    ]),
    ports: [
      {"type": "BRICK", "landQ": 2, "landR": -3, "seaQ": 3, "seaR": -3},
      {"type": "SHEEP", "landQ": -1, "landR": 0, "seaQ": -2, "seaR": 0},
      {"type": "WHEAT", "landQ": -3, "landR": 2, "seaQ": -4, "seaR": 2},
      {"type": "WOOD", "landQ": -2, "landR": 3, "seaQ": -1, "seaR": 3},
      {"type": "ORE", "landQ": -3, "landR": 2, "seaQ": -3, "seaR": 3},
      {"type": "GENERIC", "landQ": 2, "landR": -1, "seaQ": 2, "seaR": 0},
      {"type": "GENERIC", "landQ": 2, "landR": -1, "seaQ": 3, "seaR": -2},
      {"type": "GENERIC", "landQ": 0, "landR": 1, "seaQ": 0, "seaR": 2},
      {"type": "GENERIC", "landQ": -2, "landR": 3, "seaQ": -3, "seaR": 4},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("2,-3 1,-2 2,-2 0,-1 1,-1 2,-1 -1,0 0,0 1,0 -3,1 -2,1 -1,1 0,1 -3,2 -2,2 -1,2 -2,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true },
        { coords: coords("0,-3 4,-3 -1,-2 4,-2 -2,-1 4,-1 2,1 3,1 0,3 1,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true, forbidRedOnGold: true },
      ],
    },
  }, "2,-3 1,-2 2,-2 0,-1 1,-1 2,-1 -1,0 0,0 1,0 -3,1 -2,1 -1,1 0,1 -3,2 -2,2 -1,2 -2,3", "", ["0,-3 -1,-2 -2,-1", "2,-3 1,-2 2,-2 0,-1 1,-1 2,-1 -1,0 0,0 1,0 -3,1 -2,1 -1,1 0,1 -3,2 -2,2 -1,2 -2,3", "4,-3 4,-2 4,-1", "2,1 3,1", "0,3 1,3"]),
  // base PDF, páginas [12].
  "THE_FORGOTTEN_TRIBE__4P": defineBoard({
    scenarioId: "THE_FORGOTTEN_TRIBE",
    boardSize: "4P",
    title: "El pueblo perdido (3-4J)",
    source: {"pdf": "base", "pages": [12, 13]},
    pirateCoord: {"q": 1, "r": -3},
    robberCoord: {"q": 2, "r": -3},
    hexes: rows([
      [-1, "g o . d o h"],
      [-2, ". . . . . . ."],
      [-3, "h6 w9 o11 b5 w6 o4 . s"],
      [-3, "s10 b8 s4 h12 w5 s2 ."],
      [-4, "w11 h9 o3 s8 b10 h3 . w"],
      [-4, ". . . . . . ."],
      [-4, "d b . b d g"],
    ]),
    ports: [
    ],
    forgottenGifts: [
      {"hexCoord": {"q": -1, "r": -3}, "corner": 3, "type": "DEV_CARD"},
      {"hexCoord": {"q": 4, "r": -3}, "corner": 1, "type": "DEV_CARD"},
      {"hexCoord": {"q": -4, "r": 3}, "corner": 3, "type": "DEV_CARD"},
      {"hexCoord": {"q": 1, "r": 3}, "corner": 1, "type": "DEV_CARD"},
      {"hexCoord": {"q": -1, "r": -3}, "corner": 5, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 2, "r": -3}, "corner": 5, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 4, "r": -1}, "corner": 0, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 3, "r": 1}, "corner": 0, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 4, "r": -3}, "corner": 5, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": -4, "r": 3}, "corner": 2, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": -1, "r": 3}, "corner": 2, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 1, "r": 3}, "corner": 1, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": -1, "r": -3}, "corner": 5, "type": "PORT", "portType": "GENERIC", "portEdge": {"type": "GENERIC", "landQ": -1, "landR": -3, "seaQ": -1, "seaR": -4}},
      {"hexCoord": {"q": 4, "r": -1}, "corner": 5, "type": "PORT", "portType": "WOOD", "portEdge": {"type": "WOOD", "landQ": 4, "landR": -1, "seaQ": 5, "seaR": -2}},
      {"hexCoord": {"q": -4, "r": 3}, "corner": 2, "type": "PORT", "portType": "BRICK", "portEdge": {"type": "BRICK", "landQ": -4, "landR": 3, "seaQ": -5, "seaR": 4}},
      {"hexCoord": {"q": -1, "r": 3}, "corner": 2, "type": "PORT", "portType": "SHEEP", "portEdge": {"type": "SHEEP", "landQ": -1, "landR": 3, "seaQ": -1, "seaR": 4}},
      {"hexCoord": {"q": 3, "r": 1}, "corner": 2, "type": "PORT", "portType": "WHEAT", "portEdge": {"type": "WHEAT", "landQ": 3, "landR": 1, "seaQ": 3, "seaR": 2}},
      {"hexCoord": {"q": 2, "r": -3}, "corner": 5, "type": "PORT", "portType": "ORE", "portEdge": {"type": "ORE", "landQ": 2, "landR": -3, "seaQ": 2, "seaR": -4}},
    ],
    variableSetup: {
      shufflePorts: false,
      groups: [
        { coords: coords("-3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 -3,0 -2,0 -1,0 0,0 1,0 2,0 -4,1 -3,1 -2,1 -1,1 0,1 1,1"), shuffleTerrains: true, shuffleNumbers: true, forbiddenNumbers: [{"coords": [{"q": 2, "r": 0}, {"q": 2, "r": -1}, {"q": 1, "r": 1}], "numbers": [5, 6, 8, 9]}] },
      ],
    },
  }, "-3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 -3,0 -2,0 -1,0 0,0 1,0 2,0 -4,1 -3,1 -2,1 -1,1 0,1 1,1", "-1,-3 0,-3 2,-3 3,-3 4,-3 4,-1 3,1 -4,3 -3,3 -1,3 0,3 1,3", ["-1,-3 0,-3", "2,-3 3,-3 4,-3", "-3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 -3,0 -2,0 -1,0 0,0 1,0 2,0 -4,1 -3,1 -2,1 -1,1 0,1 1,1", "4,-1", "3,1", "-4,3 -3,3", "-1,3 0,3 1,3"]),
  // base PDF, páginas [14].
  "CLOTH_FOR_CATAN__4P": defineBoard({
    scenarioId: "CLOTH_FOR_CATAN",
    boardSize: "4P",
    title: "Telas para Catán (3-4J)",
    source: {"pdf": "base", "pages": [14, 15]},
    pirateCoord: {"q": 4, "r": 0},
    robberCoord: {"q": -2, "r": -1},
    hexes: rows([
      [0, "w4 s6 b5 s11 h8"],
      [-1, "h3 w12 . . w3 o9"],
      [-2, "h12 . . g . . ."],
      [-2, ". d . . d ."],
      [-3, ". . . g . . o2"],
      [-3, "b9 h2 . . s11 o4"],
      [-3, "s10 w6 o5 h10 b8"],
    ]),
    ports: [
      {"type": "GENERIC", "landQ": 4, "landR": -2, "seaQ": 5, "seaR": -2},
      {"type": "GENERIC", "landQ": -3, "landR": 2, "seaQ": -4, "seaR": 2},
      {"type": "GENERIC", "landQ": -1, "landR": -2, "seaQ": -2, "seaR": -2},
      {"type": "GENERIC", "landQ": 3, "landR": -3, "seaQ": 3, "seaR": -4},
      {"type": "WOOD", "landQ": 0, "landR": -3, "seaQ": 1, "seaR": -4},
      {"type": "BRICK", "landQ": -2, "landR": 3, "seaQ": -3, "seaR": 4},
      {"type": "SHEEP", "landQ": 0, "landR": 3, "seaQ": 0, "seaR": 4},
      {"type": "WHEAT", "landQ": 2, "landR": 2, "seaQ": 2, "seaR": 3},
      {"type": "ORE", "landQ": 3, "landR": 1, "seaQ": 4, "seaR": 1},
    ],
    nativeVillages: [
      {"hexCoord": {"q": 1, "r": -1}, "topNum": 11, "bottomNum": 8},
      {"hexCoord": {"q": -1, "r": 0}, "topNum": 10, "bottomNum": 9},
      {"hexCoord": {"q": 2, "r": 0}, "topNum": 4, "bottomNum": 5},
      {"hexCoord": {"q": 0, "r": 1}, "topNum": 6, "bottomNum": 3},
    ],
    variableSetup: {
      shufflePorts: false,
      groups: [
        { coords: coords("0,-3 1,-3 2,-3 3,-3 4,-3 -1,-2 0,-2 3,-2 4,-2 -2,-1 3,1 -3,2 -2,2 1,2 2,2 -3,3 -2,3 -1,3 0,3 1,3"), shuffleTerrains: true, shuffleNumbers: true },
      ],
    },
  }, "0,-3 1,-3 2,-3 3,-3 4,-3 -1,-2 0,-2 3,-2 4,-2 -2,-1 3,1 -3,2 -2,2 1,2 2,2 -3,3 -2,3 -1,3 0,3 1,3", "1,-1 -1,0 2,0 0,1", ["0,-3 1,-3 2,-3 3,-3 4,-3 -1,-2 0,-2 3,-2 4,-2 -2,-1", "1,-1", "-1,0", "2,0", "0,1", "3,1 -3,2 -2,2 1,2 2,2 -3,3 -2,3 -1,3 0,3 1,3"]),
  // base PDF, páginas [15].
  "THE_PIRATE_ISLANDS__4P": defineBoard({
    scenarioId: "THE_PIRATE_ISLANDS",
    boardSize: "4P",
    title: "Las islas de los piratas (4J)",
    source: {"pdf": "base", "pages": [15, 16, 17]},
    pirateCoord: {"q": -1, "r": 3},
    robberCoord: null,
    safePirateCoord: null,
    hexes: rows([
      [-1, "g11 o6 . . h4 b5"],
      [-2, "b . . d . o9 w10"],
      [-3, "h4 . . d . w3 s8 w5"],
      [-3, ". o8 . . h6 b9 s12"],
      [-4, "h10 . . d . s11 w8 s9"],
      [-4, "b . . s . o5 w2"],
      [-4, "g3 o6 . . h10 b4"],
    ]),
    ports: [
      {"type": "GENERIC", "landQ": 3, "landR": -3, "seaQ": 3, "seaR": -4},
      {"type": "GENERIC", "landQ": 4, "landR": -3, "seaQ": 4, "seaR": -4},
      {"type": "GENERIC", "landQ": 4, "landR": -3, "seaQ": 5, "seaR": -3},
      {"type": "WOOD", "landQ": 4, "landR": -2, "seaQ": 5, "seaR": -2},
      {"type": "BRICK", "landQ": 3, "landR": 0, "seaQ": 4, "seaR": 0},
      {"type": "SHEEP", "landQ": 3, "landR": 1, "seaQ": 3, "seaR": 2},
      {"type": "WHEAT", "landQ": 2, "landR": 2, "seaQ": 2, "seaR": 3},
      {"type": "ORE", "landQ": 0, "landR": 3, "seaQ": 0, "seaR": 4},
    ],
    pirateFleetRoute: [
      {"q": -1, "r": 3},
      {"q": -2, "r": 3},
      {"q": -2, "r": 2},
      {"q": -2, "r": 1},
      {"q": -1, "r": 0},
      {"q": -1, "r": -1},
      {"q": 0, "r": -2},
      {"q": 1, "r": -3},
      {"q": 2, "r": -3},
      {"q": 2, "r": -2},
      {"q": 1, "r": -1},
      {"q": 0, "r": 0},
      {"q": 0, "r": 1},
      {"q": 0, "r": 2},
    ],
    pirateFortresses: [
      {"hexCoord": {"q": -1, "r": -3}, "corner": 5, "color": "RED"},
      {"hexCoord": {"q": -3, "r": -1}, "corner": 0, "color": "WHITE"},
      {"hexCoord": {"q": -4, "r": 1}, "corner": 1, "color": "BLUE"},
      {"hexCoord": {"q": -4, "r": 3}, "corner": 2, "color": "ORANGE"},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
      ],
    },
  }, "3,-3 4,-3 3,-2 4,-2 2,-1 3,-1 4,-1 1,0 2,0 3,0 1,1 2,1 3,1 1,2 2,2 0,3 1,3", "-1,-3 0,-3 -2,-2 1,-2 -3,-1 0,-1 -2,0 -4,1 -1,1 -4,2 -1,2 -4,3 -3,3", ["-1,-3 0,-3 -2,-2 -3,-1", "3,-3 4,-3 3,-2 4,-2 2,-1 3,-1 4,-1 1,0 2,0 3,0 1,1 2,1 3,1 1,2 2,2 0,3 1,3", "1,-2 0,-1", "-2,0", "-4,1 -4,2 -4,3 -3,3", "-1,1 -1,2"]),
  // base PDF, páginas [17].
  "WONDERS_OF_CATAN__4P": defineBoard({
    scenarioId: "WONDERS_OF_CATAN",
    boardSize: "4P",
    title: "Las maravillas catanas (3-4J)",
    source: {"pdf": "base", "pages": [17, 18]},
    robberCoord: {"q": 3, "r": -2},
    hexes: rows([
      [-1, "g8 b2 . o10 . ."],
      [-2, ". . . w11 . d ."],
      [-3, "o12 h6 b11 h10 s3 w9 d ."],
      [-3, "o3 h4 o6 s5 b4 d ."],
      [-4, "b8 s9 . . b10 . . g6"],
      [-4, ". w3 . w8 h9 . w4"],
      [-4, "o5 . s11 s2 . h5"],
    ]),
    ports: [
      {"type": "GENERIC", "landQ": -2, "landR": 0, "seaQ": -2, "seaR": 1},
      {"type": "GENERIC", "landQ": -2, "landR": -1, "seaQ": -2, "seaR": -2},
      {"type": "GENERIC", "landQ": 0, "landR": -1, "seaQ": 0, "seaR": -2},
      {"type": "GENERIC", "landQ": 1, "landR": -1, "seaQ": 2, "seaR": -2},
      {"type": "WOOD", "landQ": -3, "landR": 0, "seaQ": -4, "seaR": 0},
      {"type": "BRICK", "landQ": -3, "landR": 2, "seaQ": -4, "seaR": 2},
      {"type": "SHEEP", "landQ": -2, "landR": 3, "seaQ": -2, "seaR": 4},
      {"type": "WHEAT", "landQ": 0, "landR": 2, "seaQ": 0, "seaR": 3},
      {"type": "ORE", "landQ": 0, "landR": 2, "seaQ": 1, "seaR": 1},
    ],
    wonderMarkers: {"greatBridge": [{"hexCoord": {"q": -3, "r": 2}, "corner": 1}, {"hexCoord": {"q": -2, "r": 3}, "corner": 4}], "greatWall": [{"hexCoord": {"q": 2, "r": 0}, "corner": 4}, {"hexCoord": {"q": 2, "r": 0}, "corner": 3}, {"hexCoord": {"q": 3, "r": -1}, "corner": 3}, {"hexCoord": {"q": 3, "r": -2}, "corner": 2}, {"hexCoord": {"q": 2, "r": -1}, "corner": 5}], "forbiddenSetup": [{"hexCoord": {"q": -3, "r": 2}, "corner": 1}, {"hexCoord": {"q": -2, "r": 3}, "corner": 4}, {"hexCoord": {"q": 2, "r": 0}, "corner": 4}, {"hexCoord": {"q": 2, "r": 0}, "corner": 3}, {"hexCoord": {"q": 3, "r": -1}, "corner": 3}, {"hexCoord": {"q": 3, "r": -2}, "corner": 2}, {"hexCoord": {"q": 2, "r": -1}, "corner": 5}, {"hexCoord": {"q": -3, "r": 2}, "corner": 0}, {"hexCoord": {"q": -4, "r": 3}, "corner": 0}, {"hexCoord": {"q": -2, "r": 3}, "corner": 3}, {"hexCoord": {"q": -2, "r": 3}, "corner": 5}]},
    variableSetup: {
      shufflePorts: false,
      groups: [
        { coords: coords("2,-3 1,-2 -3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 -3,0 -2,0 -1,0 0,0 1,0 -4,1 -3,1 0,1 -3,2 -1,2 0,2 -4,3 -2,3 -1,3"), shuffleTerrains: true, shuffleNumbers: true, forbiddenNumbers: [{"coords": [{"q": 2, "r": -1}, {"q": 1, "r": 0}], "numbers": [6, 8]}] },
      ],
    },
  }, "2,-3 1,-2 3,-2 -3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 3,-1 -3,0 -2,0 -1,0 0,0 1,0 2,0 -4,1 -3,1 0,1 -3,2 -1,2 0,2 -4,3 -2,3 -1,3", "", ["-1,-3 0,-3", "2,-3 1,-2 3,-2 -3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 3,-1 -3,0 -2,0 -1,0 0,0 1,0 2,0 -4,1 -3,1 0,1 -3,2 -1,2 0,2 -4,3 -2,3 -1,3", "3,1 2,2 1,3"]),
  // 56 PDF, páginas [4].
  "THE_FOUR_ISLANDS__5_6P": defineBoard({
    scenarioId: "THE_FOUR_ISLANDS",
    boardSize: "5_6P",
    title: "Las seis islas (5-6J)",
    source: {"pdf": "56", "pages": [4]},
    pirateCoord: {"q": -4, "r": 0},
    robberCoord: {"q": -1, "r": -3},
    hexes: rows([
      [-1, "s12 o4 . w6 . o9 s6"],
      [-2, "w8 o10 . o11 b10 . h3 b10"],
      [-3, "b11 h9 . s3 w4 . . w4 ."],
      [-3, ". . . . . . . ."],
      [-4, ". b4 . . s8 w10 . w5 h6"],
      [-4, "w9 h12 . h5 o3 . b8 s9"],
      [-4, "s5 o6 . s2 . b5 h2"],
    ]),
    ports: [
      {"type": "GENERIC", "landQ": 0, "landR": -3, "seaQ": 0, "seaR": -4},
      {"type": "GENERIC", "landQ": 2, "landR": -3, "seaQ": 3, "seaR": -4},
      {"type": "GENERIC", "landQ": 5, "landR": -3, "seaQ": 6, "seaR": -4},
      {"type": "GENERIC", "landQ": -4, "landR": 2, "seaQ": -5, "seaR": 2},
      {"type": "GENERIC", "landQ": 1, "landR": 3, "seaQ": 0, "seaR": 4},
      {"type": "WOOD", "landQ": -1, "landR": 2, "seaQ": -2, "seaR": 3},
      {"type": "BRICK", "landQ": -2, "landR": -1, "seaQ": -3, "seaR": 0},
      {"type": "SHEEP", "landQ": 4, "landR": -2, "seaQ": 3, "seaR": -1},
      {"type": "WHEAT", "landQ": -1, "landR": -2, "seaQ": -1, "seaR": -1},
      {"type": "ORE", "landQ": -3, "landR": 3, "seaQ": -2, "seaR": 2},
      {"type": "SHEEP", "landQ": 3, "landR": 2, "seaQ": 4, "seaR": 2},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("-1,-3 0,-3 2,-3 4,-3 5,-3 -2,-2 -1,-2 1,-2 2,-2 4,-2 5,-2 -3,-1 -2,-1 0,-1 1,-1 4,-1 -3,1 0,1 1,1 3,1 4,1 -4,2 -3,2 -1,2 0,2 2,2 3,2 -4,3 -3,3 -1,3 1,3 2,3"), shuffleTerrains: true, shuffleNumbers: true, forbidNumbersOnTerrains: [{ terrains: ['WOOD', 'SHEEP'], numbers: [2, 12] }] },
      ],
    },
  }, "-1,-3 0,-3 2,-3 4,-3 5,-3 -2,-2 -1,-2 1,-2 2,-2 4,-2 5,-2 -3,-1 -2,-1 0,-1 1,-1 4,-1 -3,1 0,1 1,1 3,1 4,1 -4,2 -3,2 -1,2 0,2 2,2 3,2 -4,3 -3,3 -1,3 1,3 2,3", "", ["-1,-3 0,-3 -2,-2 -1,-2 -3,-1 -2,-1", "2,-3 1,-2 2,-2 0,-1 1,-1", "4,-3 5,-3 4,-2 5,-2 4,-1", "-3,1 -4,2 -3,2 -4,3 -3,3", "0,1 1,1 -1,2 0,2 -1,3", "3,1 4,1 2,2 3,2 1,3 2,3"]),
  // 56 PDF, páginas [5].
  "OCEANIA__5_6P": defineBoard({
    scenarioId: "OCEANIA",
    boardSize: "5_6P",
    title: "Oceanía (5-6J)",
    source: {"pdf": "56", "pages": [5]},
    pirateCoord: {"q": -1, "r": 4},
    robberCoord: {"q": -3, "r": -1},
    hexes: rows([
      [-1, "w10 . ? ? . w9 h2"],
      [-2, "s6 . ? ? ? . h5 o12"],
      [-3, "h12 b4 . ? ? ? . s4 b8"],
      [-3, "o11 s5 . ? ? . w6 s3"],
      [-4, "h6 w3 . ? ? ? . o9 h4"],
      [-4, "b9 s8 . ? ? ? . b10"],
      [-4, "b11 o10 . ? ? . w8"],
    ]),
    ports: [
      {"type": "BRICK", "landQ": 4, "landR": 1, "seaQ": 5, "seaR": 0},
      {"type": "SHEEP", "landQ": -2, "landR": -1, "seaQ": -1, "seaR": -1},
      {"type": "WHEAT", "landQ": 4, "landR": 1, "seaQ": 4, "seaR": 2},
      {"type": "WOOD", "landQ": 4, "landR": -3, "seaQ": 5, "seaR": -4},
      {"type": "ORE", "landQ": -3, "landR": 0, "seaQ": -4, "seaR": 0},
      {"type": "GENERIC", "landQ": -2, "landR": -2, "seaQ": -2, "seaR": -3},
      {"type": "GENERIC", "landQ": -3, "landR": 3, "seaQ": -2, "seaR": 2},
      {"type": "GENERIC", "landQ": -4, "landR": 2, "seaQ": -5, "seaR": 2},
      {"type": "SHEEP", "landQ": 4, "landR": -2, "seaQ": 3, "seaR": -1},
      {"type": "GENERIC", "landQ": 3, "landR": 2, "seaQ": 2, "seaR": 2},
      {"type": "GENERIC", "landQ": 5, "landR": -1, "seaQ": 6, "seaR": -2},
    ],
    fogDeck: [
      {"terrain": "SEA", "num": null},
      {"terrain": "SEA", "num": null},
      {"terrain": "SEA", "num": null},
      {"terrain": "DESERT", "num": null},
      {"terrain": "GOLD", "num": 2},
      {"terrain": "GOLD", "num": 5},
      {"terrain": "GOLD", "num": 10},
      {"terrain": "WHEAT", "num": 3},
      {"terrain": "WHEAT", "num": 8},
      {"terrain": "BRICK", "num": 4},
      {"terrain": "BRICK", "num": 6},
      {"terrain": "ORE", "num": 3},
      {"terrain": "ORE", "num": 9},
      {"terrain": "ORE", "num": 11},
      {"terrain": "SHEEP", "num": 2},
      {"terrain": "SHEEP", "num": 11},
      {"terrain": "WOOD", "num": 5},
      {"terrain": "WOOD", "num": 12},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("-1,-3 4,-3 5,-3 -2,-2 4,-2 5,-2 -3,-1 -2,-1 4,-1 5,-1 -3,0 -2,0 3,0 4,0 -4,1 -3,1 3,1 4,1 -4,2 -3,2 3,2 -4,3 -3,3 2,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: false },
      ],
    },
  }, "-1,-3 4,-3 5,-3 -2,-2 4,-2 5,-2 -3,-1 -2,-1 4,-1 5,-1 -3,0 -2,0 3,0 4,0 -4,1 -3,1 3,1 4,1 -4,2 -3,2 3,2 -4,3 -3,3 2,3", "", ["-1,-3 -2,-2 -3,-1 -2,-1 -3,0 -2,0 -4,1 -3,1 -4,2 -3,2 -4,3 -3,3", "4,-3 5,-3 4,-2 5,-2 4,-1 5,-1 3,0 4,0 3,1 4,1 3,2 2,3"]),
  // 56 PDF, páginas [6].
  "THROUGH_THE_DESERT__5_6P": defineBoard({
    scenarioId: "THROUGH_THE_DESERT",
    boardSize: "5_6P",
    title: "A través del desierto (5-6J)",
    source: {"pdf": "56", "pages": [6]},
    pirateCoord: {"q": 1, "r": 3},
    robberCoord: {"q": -1, "r": -2},
    hexes: rows([
      [-2, "g4 o6 b11 . w12 h5 o3 b6"],
      [-3, "w5 s2 d d d d d . ."],
      [-4, ". . . h2 w8 s9 w10 . . g10"],
      [-4, "o4 w5 h10 b5 s10 w4 b8 . ."],
      [-5, "s12 h3 b12 o6 b11 o3 h9 . . o8"],
      [-5, "b9 o11 . . . . . s11 w3"],
      [-5, "s6 . s8 h2 . g4 . h9"],
    ]),
    ports: [
      {"type": "GENERIC", "landQ": -3, "landR": 1, "seaQ": -3, "seaR": 2},
      {"type": "GENERIC", "landQ": 2, "landR": 0, "seaQ": 2, "seaR": 1},
      {"type": "GENERIC", "landQ": 2, "landR": -1, "seaQ": 3, "seaR": -1},
      {"type": "GENERIC", "landQ": -1, "landR": 1, "seaQ": -2, "seaR": 2},
      {"type": "GENERIC", "landQ": 1, "landR": 1, "seaQ": 0, "seaR": 2},
      {"type": "WOOD", "landQ": -2, "landR": 0, "seaQ": -2, "seaR": -1},
      {"type": "BRICK", "landQ": -4, "landR": 0, "seaQ": -4, "seaR": -1},
      {"type": "SHEEP", "landQ": -5, "landR": 1, "seaQ": -5, "seaR": 0},
      {"type": "WHEAT", "landQ": -5, "landR": 2, "seaQ": -6, "seaR": 2},
      {"type": "ORE", "landQ": -5, "landR": 3, "seaQ": -6, "seaR": 4},
      {"type": "SHEEP", "landQ": -4, "landR": 2, "seaQ": -4, "seaR": 3},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("-1,-1 0,-1 1,-1 2,-1 -4,0 -3,0 -2,0 -1,0 0,0 1,0 2,0 -5,1 -4,1 -3,1 -2,1 -1,1 0,1 1,1 -5,2 -4,2 -5,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true },
        { coords: coords("-2,-3 -1,-3 0,-3 1,-3 2,-3 3,-3 4,-3 5,-3 -3,-2 -2,-2 5,-2 5,-1 4,1 2,2 3,2 -3,3 -2,3 -1,3 0,3 1,3 2,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true, forbidRedOnGold: true },
      ],
    },
  }, "-1,-1 0,-1 1,-1 2,-1 -4,0 -3,0 -2,0 -1,0 0,0 1,0 2,0 -5,1 -4,1 -3,1 -2,1 -1,1 0,1 1,1 -5,2 -4,2 -5,3", "", ["-2,-3 -1,-3 0,-3 -3,-2 -2,-2", "2,-3 3,-3 4,-3 5,-3", "-1,-1 0,-1 1,-1 2,-1 -4,0 -3,0 -2,0 -1,0 0,0 1,0 2,0 -5,1 -4,1 -3,1 -2,1 -1,1 0,1 1,1 -5,2 -4,2 -5,3", "5,-1", "4,1 2,2 3,2 2,3", "-3,3 -2,3", "0,3"]),
  // 56 PDF, páginas [7].
  "THE_FORGOTTEN_TRIBE__5_6P": defineBoard({
    scenarioId: "THE_FORGOTTEN_TRIBE",
    boardSize: "5_6P",
    title: "El pueblo perdido (5-6J)",
    source: {"pdf": "56", "pages": [7]},
    pirateCoord: {"q": -3, "r": 3},
    robberCoord: {"q": -2, "r": -3},
    hexes: rows([
      [-2, "d d . g g . s s"],
      [-3, ". . . . . . . . ."],
      [-4, "h3 b5 o11 s8 b4 w10 h4 b3 w8 o5"],
      [-4, "w11 s12 w5 h10 s5 b9 h2 s9 b10"],
      [-5, "w6 o4 h9 b8 w11 o3 s4 h6 w3 o6"],
      [-5, ". . . . . . . . ."],
      [-5, "d d . o b . h g"],
    ]),
    ports: [
    ],
    forgottenGifts: [
      {"hexCoord": {"q": -2, "r": -3}, "corner": 3, "type": "DEV_CARD"},
      {"hexCoord": {"q": -5, "r": 3}, "corner": 4, "type": "DEV_CARD"},
      {"hexCoord": {"q": -2, "r": 3}, "corner": 3, "type": "DEV_CARD"},
      {"hexCoord": {"q": 2, "r": -3}, "corner": 0, "type": "DEV_CARD"},
      {"hexCoord": {"q": -2, "r": -3}, "corner": 4, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 5, "r": -3}, "corner": 1, "type": "DEV_CARD"},
      {"hexCoord": {"q": 2, "r": 3}, "corner": 0, "type": "DEV_CARD"},
      {"hexCoord": {"q": -1, "r": -3}, "corner": 4, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 1, "r": -3}, "corner": 5, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 2, "r": -3}, "corner": 4, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 4, "r": -3}, "corner": 5, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": -2, "r": 3}, "corner": 1, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": -1, "r": 3}, "corner": 3, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": -4, "r": 3}, "corner": 3, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 1, "r": 3}, "corner": 1, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 2, "r": 3}, "corner": 1, "type": "CATAN_CHIT_1VP"},
      {"hexCoord": {"q": 1, "r": -3}, "corner": 4, "type": "PORT", "portType": "GENERIC", "portEdge": {"type": "GENERIC", "landQ": 1, "landR": -3, "seaQ": 1, "seaR": -4}},
      {"hexCoord": {"q": 5, "r": -3}, "corner": 0, "type": "PORT", "portType": "GENERIC", "portEdge": {"type": "GENERIC", "landQ": 5, "landR": -3, "seaQ": 6, "seaR": -4}},
      {"hexCoord": {"q": -5, "r": 3}, "corner": 3, "type": "PORT", "portType": "BRICK", "portEdge": {"type": "BRICK", "landQ": -5, "landR": 3, "seaQ": -6, "seaR": 4}},
      {"hexCoord": {"q": -4, "r": 3}, "corner": 1, "type": "PORT", "portType": "SHEEP", "portEdge": {"type": "SHEEP", "landQ": -4, "landR": 3, "seaQ": -4, "seaR": 4}},
      {"hexCoord": {"q": -1, "r": 3}, "corner": 1, "type": "PORT", "portType": "ORE", "portEdge": {"type": "ORE", "landQ": -1, "landR": 3, "seaQ": -1, "seaR": 4}},
      {"hexCoord": {"q": 4, "r": -3}, "corner": 0, "type": "PORT", "portType": "WOOD", "portEdge": {"type": "WOOD", "landQ": 4, "landR": -3, "seaQ": 5, "seaR": -4}},
      {"hexCoord": {"q": -1, "r": -3}, "corner": 0, "type": "PORT", "portType": "WHEAT", "portEdge": {"type": "WHEAT", "landQ": -1, "landR": -3, "seaQ": 0, "seaR": -4}},
      {"hexCoord": {"q": 1, "r": 3}, "corner": 3, "type": "PORT", "portType": "GENERIC", "portEdge": {"type": "GENERIC", "landQ": 1, "landR": 3, "seaQ": 0, "seaR": 4}},
    ],
    variableSetup: {
      shufflePorts: false,
      groups: [
        { coords: coords("-4,-1 -3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 3,-1 4,-1 5,-1 -4,0 -3,0 -2,0 -1,0 0,0 1,0 2,0 3,0 4,0 -5,1 -4,1 -3,1 -2,1 -1,1 0,1 1,1 2,1 3,1 4,1"), shuffleTerrains: true, shuffleNumbers: true, forbiddenNumbers: [{"coords": [{"q": 5, "r": -1}, {"q": 4, "r": 1}, {"q": 4, "r": 0}], "numbers": [5, 6, 8, 9]}] },
      ],
    },
  }, "-4,-1 -3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 3,-1 4,-1 5,-1 -4,0 -3,0 -2,0 -1,0 0,0 1,0 2,0 3,0 4,0 -5,1 -4,1 -3,1 -2,1 -1,1 0,1 1,1 2,1 3,1 4,1", "-2,-3 -1,-3 1,-3 2,-3 4,-3 5,-3 -5,3 -4,3 -2,3 -1,3 1,3 2,3", ["-2,-3 -1,-3", "1,-3 2,-3", "4,-3 5,-3", "-4,-1 -3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 3,-1 4,-1 5,-1 -4,0 -3,0 -2,0 -1,0 0,0 1,0 2,0 3,0 4,0 -5,1 -4,1 -3,1 -2,1 -1,1 0,1 1,1 2,1 3,1 4,1", "-5,3 -4,3", "-2,3 -1,3", "1,3 2,3"]),
  // 56 PDF, páginas [8].
  "CLOTH_FOR_CATAN__5_6P": defineBoard({
    scenarioId: "CLOTH_FOR_CATAN",
    boardSize: "5_6P",
    title: "Telas para Catán (5-6J)",
    source: {"pdf": "56", "pages": [8]},
    pirateCoord: {"q": 5, "r": 0},
    robberCoord: {"q": -3, "r": -1},
    hexes: rows([
      [-1, "w4 s6 b5 h12 b3 s11 h8"],
      [-2, "h3 w12 . . . . w3 o9"],
      [-3, "h11 . . d . d . . s3"],
      [-3, ". g . . . . g ."],
      [-4, "o8 . . d . d . . o2"],
      [-4, "b9 h2 . . . . s11 o4"],
      [-4, "s10 w6 o5 w11 w8 h10 b6"],
    ]),
    ports: [
      {"type": "GENERIC", "landQ": -1, "landR": -3, "seaQ": 0, "seaR": -4},
      {"type": "GENERIC", "landQ": 2, "landR": -3, "seaQ": 2, "seaR": -4},
      {"type": "GENERIC", "landQ": 4, "landR": -3, "seaQ": 4, "seaR": -4},
      {"type": "GENERIC", "landQ": 5, "landR": -2, "seaQ": 6, "seaR": -2},
      {"type": "GENERIC", "landQ": 4, "landR": 1, "seaQ": 5, "seaR": 1},
      {"type": "WOOD", "landQ": 3, "landR": 2, "seaQ": 3, "seaR": 3},
      {"type": "BRICK", "landQ": 1, "landR": 3, "seaQ": 1, "seaR": 4},
      {"type": "SHEEP", "landQ": -2, "landR": 3, "seaQ": -2, "seaR": 4},
      {"type": "WHEAT", "landQ": -3, "landR": 3, "seaQ": -4, "seaR": 4},
      {"type": "ORE", "landQ": -4, "landR": 2, "seaQ": -5, "seaR": 2},
      {"type": "SHEEP", "landQ": -2, "landR": -2, "seaQ": -3, "seaR": -2},
    ],
    nativeVillages: [
      {"hexCoord": {"q": 0, "r": -1}, "topNum": 2, "bottomNum": 5},
      {"hexCoord": {"q": 2, "r": -1}, "topNum": 10, "bottomNum": 8},
      {"hexCoord": {"q": -2, "r": 0}, "topNum": 4, "bottomNum": 9},
      {"hexCoord": {"q": 3, "r": 0}, "topNum": 4, "bottomNum": 5},
      {"hexCoord": {"q": -1, "r": 1}, "topNum": 6, "bottomNum": 12},
      {"hexCoord": {"q": 1, "r": 1}, "topNum": 9, "bottomNum": 10},
    ],
    variableSetup: {
      shufflePorts: false,
      groups: [
        { coords: coords("-1,-3 0,-3 1,-3 2,-3 3,-3 4,-3 5,-3 -2,-2 -1,-2 4,-2 5,-2 -3,-1 5,-1 -4,1 4,1 -4,2 -3,2 2,2 3,2 -4,3 -3,3 -2,3 -1,3 0,3 1,3 2,3"), shuffleTerrains: true, shuffleNumbers: true },
      ],
    },
  }, "-1,-3 0,-3 1,-3 2,-3 3,-3 4,-3 5,-3 -2,-2 -1,-2 4,-2 5,-2 -3,-1 5,-1 -4,1 4,1 -4,2 -3,2 2,2 3,2 -4,3 -3,3 -2,3 -1,3 0,3 1,3 2,3", "0,-1 2,-1 -2,0 3,0 -1,1 1,1", ["-1,-3 0,-3 1,-3 2,-3 3,-3 4,-3 5,-3 -2,-2 -1,-2 4,-2 5,-2 -3,-1 5,-1", "0,-1", "2,-1", "-2,0", "3,0", "-4,1 4,1 -4,2 -3,2 2,2 3,2 -4,3 -3,3 -2,3 -1,3 0,3 1,3 2,3", "-1,1", "1,1"]),
  // 56 PDF, páginas [9].
  "THE_PIRATE_ISLANDS__5_6P": defineBoard({
    scenarioId: "THE_PIRATE_ISLANDS",
    boardSize: "5_6P",
    title: "Las islas piratas (5-6J)",
    source: {"pdf": "56", "pages": [9]},
    pirateCoord: {"q": -2, "r": 3},
    robberCoord: null,
    safePirateCoord: {"q": -2, "r": 0},
    hexes: rows([
      [-2, "g3 . o6 . . s5 h4 b9"],
      [-3, ". . . . d . o3 b10 w11"],
      [-4, "g11 d o8 . . . w12 w6 s4 w10"],
      [-4, ". . . d . h6 h4 o5 s8"],
      [-5, "g11 d o6 . . . s2 s10 b3 s5"],
      [-5, ". . . . d . h11 o9 b8"],
      [-5, "g3 . o8 . . w9 h5 w4"],
    ]),
    ports: [
      {"type": "GENERIC", "landQ": 4, "landR": -3, "seaQ": 4, "seaR": -4},
      {"type": "GENERIC", "landQ": 5, "landR": -3, "seaQ": 5, "seaR": -4},
      {"type": "GENERIC", "landQ": 5, "landR": -3, "seaQ": 6, "seaR": -3},
      {"type": "GENERIC", "landQ": 5, "landR": -2, "seaQ": 6, "seaR": -2},
      {"type": "WOOD", "landQ": 4, "landR": 0, "seaQ": 5, "seaR": 0},
      {"type": "BRICK", "landQ": 3, "landR": 2, "seaQ": 4, "seaR": 2},
      {"type": "SHEEP", "landQ": 2, "landR": 3, "seaQ": 3, "seaR": 3},
      {"type": "WHEAT", "landQ": 2, "landR": 3, "seaQ": 1, "seaR": 4},
      {"type": "SHEEP", "landQ": 1, "landR": 3, "seaQ": 0, "seaR": 4},
    ],
    pirateFleetRoute: [
      {"q": -2, "r": 3},
      {"q": -2, "r": 2},
      {"q": -2, "r": 1},
      {"q": -2, "r": 0},
      {"q": -1, "r": -1},
      {"q": 0, "r": -2},
      {"q": 1, "r": -3},
      {"q": 2, "r": -3},
      {"q": 2, "r": -2},
      {"q": 1, "r": -1},
      {"q": 0, "r": 0},
      {"q": 0, "r": 1},
      {"q": 0, "r": 2},
      {"q": -1, "r": 3},
    ],
    pirateFortresses: [
      {"hexCoord": {"q": -2, "r": -3}, "corner": 4, "color": "RED"},
      {"hexCoord": {"q": -3, "r": -2}, "corner": 5, "color": "WHITE"},
      {"hexCoord": {"q": -4, "r": -1}, "corner": 1, "color": "BLUE"},
      {"hexCoord": {"q": -5, "r": 1}, "corner": 0, "color": "ORANGE"},
      {"hexCoord": {"q": -5, "r": 3}, "corner": 5, "color": "GREEN"},
      {"hexCoord": {"q": -5, "r": 3}, "corner": 3, "color": "PURPLE"},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
      ],
    },
  }, "3,-3 4,-3 5,-3 3,-2 4,-2 5,-2 2,-1 3,-1 4,-1 5,-1 1,0 2,0 3,0 4,0 1,1 2,1 3,1 4,1 1,2 2,2 3,2 0,3 1,3 2,3", "-2,-3 0,-3 1,-2 -4,-1 -3,-1 -2,-1 -1,0 -5,1 -4,1 -3,1 -1,2 -5,3 -3,3", ["-2,-3", "0,-3", "3,-3 4,-3 5,-3 3,-2 4,-2 5,-2 2,-1 3,-1 4,-1 5,-1 1,0 2,0 3,0 4,0 1,1 2,1 3,1 4,1 1,2 2,2 3,2 0,3 1,3 2,3", "1,-2", "-4,-1 -3,-1 -2,-1", "-1,0", "-5,1 -4,1 -3,1", "-1,2", "-5,3", "-3,3"]),
  // 56 PDF, páginas [10].
  "WONDERS_OF_CATAN__5_6P": defineBoard({
    scenarioId: "WONDERS_OF_CATAN",
    boardSize: "5_6P",
    title: "Las maravillas catanas (5-6J)",
    source: {"pdf": "56", "pages": [10]},
    robberCoord: {"q": 4, "r": -2},
    hexes: rows([
      [-2, "g8 . s10 . h12 . . ."],
      [-3, ". . b11 . w11 . . d d"],
      [-4, ". b2 s5 h6 b5 h3 s8 w11 d ."],
      [-4, ". h9 o3 w4 o6 h10 s9 b10 d"],
      [-5, ". . b8 s5 . b4 w8 o12 . ."],
      [-5, "g6 . w10 o3 . o9 h4 . w4"],
      [-5, ". o5 w9 . s2 s11 . g6"],
    ]),
    ports: [
      {"type": "GENERIC", "landQ": -2, "landR": -1, "seaQ": -2, "seaR": -2},
      {"type": "GENERIC", "landQ": -1, "landR": -1, "seaQ": 0, "seaR": -2},
      {"type": "GENERIC", "landQ": 1, "landR": -1, "seaQ": 2, "seaR": -2},
      {"type": "GENERIC", "landQ": -3, "landR": -1, "seaQ": -4, "seaR": -1},
      {"type": "GENERIC", "landQ": -3, "landR": 1, "seaQ": -4, "seaR": 1},
      {"type": "WOOD", "landQ": -3, "landR": 2, "seaQ": -4, "seaR": 2},
      {"type": "BRICK", "landQ": -4, "landR": 3, "seaQ": -4, "seaR": 4},
      {"type": "SHEEP", "landQ": -1, "landR": 3, "seaQ": -1, "seaR": 4},
      {"type": "WHEAT", "landQ": 1, "landR": 2, "seaQ": 1, "seaR": 3},
      {"type": "ORE", "landQ": 2, "landR": 1, "seaQ": 2, "seaR": 2},
      {"type": "SHEEP", "landQ": -1, "landR": 0, "seaQ": -1, "seaR": 1},
    ],
    wonderMarkers: {"greatBridge": [{"hexCoord": {"q": -2, "r": 2}, "corner": 1}, {"hexCoord": {"q": -1, "r": 3}, "corner": 4}], "greatWall": [{"hexCoord": {"q": 4, "r": -2}, "corner": 3}, {"hexCoord": {"q": 4, "r": -2}, "corner": 2}, {"hexCoord": {"q": 3, "r": 0}, "corner": 5}, {"hexCoord": {"q": 4, "r": -1}, "corner": 2}, {"hexCoord": {"q": 3, "r": 0}, "corner": 1}], "forbiddenSetup": [{"hexCoord": {"q": -2, "r": 2}, "corner": 1}, {"hexCoord": {"q": 0, "r": -3}, "corner": 1}, {"hexCoord": {"q": 1, "r": -2}, "corner": 4}, {"hexCoord": {"q": -1, "r": 3}, "corner": 4}, {"hexCoord": {"q": 4, "r": -2}, "corner": 3}, {"hexCoord": {"q": 4, "r": -2}, "corner": 2}, {"hexCoord": {"q": 3, "r": 0}, "corner": 5}, {"hexCoord": {"q": 4, "r": -1}, "corner": 2}, {"hexCoord": {"q": 3, "r": 0}, "corner": 1}, {"hexCoord": {"q": -2, "r": 2}, "corner": 0}, {"hexCoord": {"q": 0, "r": -3}, "corner": 0}, {"hexCoord": {"q": -1, "r": -2}, "corner": 0}, {"hexCoord": {"q": 0, "r": -1}, "corner": 5}, {"hexCoord": {"q": 1, "r": -2}, "corner": 5}, {"hexCoord": {"q": -2, "r": 2}, "corner": 2}, {"hexCoord": {"q": -1, "r": 3}, "corner": 3}, {"hexCoord": {"q": 0, "r": 2}, "corner": 3}], "greatBridgeNorth": [{"hexCoord": {"q": 0, "r": -3}, "corner": 1}, {"hexCoord": {"q": 1, "r": -2}, "corner": 4}]},
    variableSetup: {
      shufflePorts: false,
      groups: [
        { coords: coords("0,-3 2,-3 -1,-2 1,-2 -3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 3,-1 -3,0 -2,0 -1,0 0,0 1,0 2,0 3,0 -3,1 -2,1 0,1 1,1 2,1 -3,2 -2,2 0,2 1,2 -4,3 -3,3 -1,3 0,3"), shuffleTerrains: true, shuffleNumbers: true, forbiddenNumbers: [{"coords": [{"q": 3, "r": -1}, {"q": 3, "r": 0}], "numbers": [6, 8]}] },
      ],
    },
  }, "0,-3 2,-3 -1,-2 1,-2 4,-2 5,-2 -3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 3,-1 4,-1 -3,0 -2,0 -1,0 0,0 1,0 2,0 3,0 4,0 -3,1 -2,1 0,1 1,1 2,1 -3,2 -2,2 0,2 1,2 -4,3 -3,3 -1,3 0,3", "", ["-2,-3", "0,-3 2,-3 -1,-2 1,-2 4,-2 5,-2 -3,-1 -2,-1 -1,-1 0,-1 1,-1 2,-1 3,-1 4,-1 -3,0 -2,0 -1,0 0,0 1,0 2,0 3,0 4,0 -3,1 -2,1 0,1 1,1 2,1 -3,2 -2,2 0,2 1,2 -4,3 -3,3 -1,3 0,3", "-5,2", "3,2 2,3"]),
  // 56 PDF, páginas [2, 3].
  "HEADING_FOR_NEW_SHORES__5_6P": defineBoard({
    scenarioId: "HEADING_FOR_NEW_SHORES",
    boardSize: "5_6P",
    title: "Rumbo a nuevas orillas (5-6J)",
    source: {"pdf": "56", "pages": [2, 3]},
    pirateCoord: {"q": 5, "r": 0},
    robberCoord: {"q": 1, "r": -2},
    hexes: rows([
      [-1, "g9 . w6 s2 h8 . o6"],
      [-2, "o11 . b3 d w3 h4 . ."],
      [-3, "s8 . b6 o4 w5 s8 h5 . b12"],
      [-3, ". o9 w9 s10 h10 b11 d ."],
      [-4, "b4 . s6 h11 b8 o12 w2 . h3"],
      [-4, "w2 . s3 b4 o5 w9 . ."],
      [-4, "g5 . s10 h11 o12 . g10"],
    ]),
    ports: [
      {"type": "GENERIC", "landQ": 0, "landR": -2, "seaQ": 0, "seaR": -3},
      {"type": "GENERIC", "landQ": 3, "landR": -2, "seaQ": 4, "seaR": -3},
      {"type": "GENERIC", "landQ": 2, "landR": -3, "seaQ": 3, "seaR": -4},
      {"type": "GENERIC", "landQ": -1, "landR": -1, "seaQ": -2, "seaR": -1},
      {"type": "GENERIC", "landQ": 1, "landR": 2, "seaQ": 2, "seaR": 2},
      {"type": "WOOD", "landQ": 3, "landR": -1, "seaQ": 4, "seaR": -1},
      {"type": "BRICK", "landQ": 3, "landR": 0, "seaQ": 3, "seaR": 1},
      {"type": "SHEEP", "landQ": -2, "landR": 0, "seaQ": -3, "seaR": 1},
      {"type": "WHEAT", "landQ": -2, "landR": 2, "seaQ": -3, "seaR": 3},
      {"type": "ORE", "landQ": -1, "landR": 3, "seaQ": -2, "seaR": 4},
      {"type": "SHEEP", "landQ": 0, "landR": 3, "seaQ": 0, "seaR": 4},
    ],
    variableSetup: {
      shufflePorts: true,
      groups: [
        { coords: coords("1,-3 2,-3 3,-3 0,-2 1,-2 2,-2 3,-2 -1,-1 0,-1 1,-1 2,-1 3,-1 -2,0 -1,0 0,0 1,0 2,0 3,0 -2,1 -1,1 0,1 1,1 2,1 -2,2 -1,2 0,2 1,2 -2,3 -1,3 0,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true },
        { coords: coords("-1,-3 -2,-2 -3,-1 -4,1 -4,2 -4,3 5,-3 5,-2 5,-1 4,1 3,2 2,3"), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true, forbidRedOnGold: false },
      ],
    },
  }, "1,-3 2,-3 3,-3 0,-2 1,-2 2,-2 3,-2 -1,-1 0,-1 1,-1 2,-1 3,-1 -2,0 -1,0 0,0 1,0 2,0 3,0 -2,1 -1,1 0,1 1,1 2,1 -2,2 -1,2 0,2 1,2 -2,3 -1,3 0,3", "", ["-1,-3 -2,-2 -3,-1", "1,-3 2,-3 3,-3 0,-2 1,-2 2,-2 3,-2 -1,-1 0,-1 1,-1 2,-1 3,-1 -2,0 -1,0 0,0 1,0 2,0 3,0 -2,1 -1,1 0,1 1,1 2,1 -2,2 -1,2 0,2 1,2 -2,3 -1,3 0,3", "5,-3", "5,-1", "-4,1 -4,2 -4,3", "4,1", "2,3"]),
};

// Scenarios 5–8 have a single shared 3/4-player diagram in the manual.
for (const scenario of ['THE_FORGOTTEN_TRIBE', 'CLOTH_FOR_CATAN', 'THE_PIRATE_ISLANDS', 'WONDERS_OF_CATAN'] as const) {
  const board = SEAFARERS_BOARDS_DATA[`${scenario}__4P`];
  SEAFARERS_BOARDS_DATA[`${scenario}__3P`] = { ...board, boardSize: '3P' };
}
