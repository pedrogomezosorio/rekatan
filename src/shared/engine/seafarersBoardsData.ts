import {
  PlayerColor,
  PortType,
  SeafarersBoardSize,
  SeafarersScenario,
  TerrainType,
} from '../types';

export interface RawHexSpec {
  q: number;
  r: number;
  terrain: TerrainType;
  num: number | null;
  hasRobber?: boolean;
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

export interface ScenarioBoardData {
  scenarioId: SeafarersScenario;
  boardSize: SeafarersBoardSize;
  title: string;
  pirateCoord?: { q: number; r: number } | null;
  robberCoord?: { q: number; r: number } | null;
  safePirateCoord?: { q: number; r: number } | null;
  hexes: RawHexSpec[];
  ports: RawPortSpec[];
  fogDeck?: Array<{ terrain: TerrainType; num: number | null }>;
  forgottenGifts?: Array<{
    hexCoord: { q: number; r: number };
    type: 'CATAN_CHIT_1VP' | 'DEV_CARD' | 'PORT';
    portType?: PortType;
  }>;
  nativeVillages?: Array<{
    hexCoord: { q: number; r: number };
    topNum: number;
    bottomNum: number;
  }>;
  pirateFleetRoute?: Array<{ q: number; r: number }>;
  pirateFortresses?: Array<{
    hexCoord: { q: number; r: number };
    color: PlayerColor;
  }>;
  wonderMarkers?: {
    greatBridgeVertexOffsets?: Array<{ q: number; r: number }>;
    greatWallVertexOffsets?: Array<{ q: number; r: number }>;
  };
  variableSetup: {
    shuffleMainTerrains: boolean;
    shuffleMainNumbers: boolean;
    shuffleMainPorts: boolean;
    shuffleIsletTerrains: boolean;
    shuffleIsletNumbers: boolean;
    preventRedAdjacent: boolean;
    forbidRedOnGold: boolean;
    fixedCoords: Array<{ q: number; r: number }>;
  };
}

export const SEAFARERS_BOARDS_DATA: Record<string, ScenarioBoardData> = {
  "HEADING_FOR_NEW_SHORES__3P": {
    "scenarioId": "HEADING_FOR_NEW_SHORES",
    "boardSize": "3P",
    "title": "Rumbo a nuevas orillas (3J)",
    "pirateCoord": {
      "q": 3,
      "r": 0
    },
    "robberCoord": {
      "q": 0,
      "r": -3
    },
    "hexes": [
      {
        "q": 2,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "BRICK",
        "num": 12,
        "hasRobber": true
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "GOLD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SHEEP",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "GOLD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "WHEAT",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "BRICK",
        "landQ": -3,
        "landR": 3,
        "seaQ": -4,
        "seaR": 3
      },
      {
        "type": "SHEEP",
        "landQ": 0,
        "landR": 1,
        "seaQ": 1,
        "seaR": 0
      },
      {
        "type": "WHEAT",
        "landQ": -1,
        "landR": -1,
        "seaQ": -2,
        "seaR": -1
      },
      {
        "type": "WOOD",
        "landQ": -2,
        "landR": 3,
        "seaQ": -3,
        "seaR": 4
      },
      {
        "type": "ORE",
        "landQ": -3,
        "landR": 1,
        "seaQ": -3,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": -1,
        "seaQ": 1,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 1,
        "seaQ": -4,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 3,
        "seaQ": -1,
        "seaR": 3
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": true,
      "shuffleIsletNumbers": true,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "HEADING_FOR_NEW_SHORES__4P": {
    "scenarioId": "HEADING_FOR_NEW_SHORES",
    "boardSize": "4P",
    "title": "Rumbo a nuevas orillas (4J)",
    "pirateCoord": {
      "q": 4,
      "r": 0
    },
    "robberCoord": {
      "q": -1,
      "r": 1
    },
    "hexes": [
      {
        "q": 2,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "GOLD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "ORE",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "GOLD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "BRICK",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "WHEAT",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "BRICK",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SHEEP",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "WOOD",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "ORE",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "WHEAT",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "BRICK",
        "landQ": -3,
        "landR": 1,
        "seaQ": -4,
        "seaR": 2
      },
      {
        "type": "SHEEP",
        "landQ": -3,
        "landR": 1,
        "seaQ": -3,
        "seaR": 0
      },
      {
        "type": "WHEAT",
        "landQ": 1,
        "landR": 1,
        "seaQ": 1,
        "seaR": 2
      },
      {
        "type": "WOOD",
        "landQ": -2,
        "landR": 3,
        "seaQ": -3,
        "seaR": 4
      },
      {
        "type": "ORE",
        "landQ": 1,
        "landR": -1,
        "seaQ": 1,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": -1,
        "seaQ": -2,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": 0,
        "seaQ": 2,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": 3,
        "seaQ": 0,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 3,
        "seaQ": -4,
        "seaR": 3
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": true,
      "shuffleIsletNumbers": true,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "HEADING_FOR_NEW_SHORES__5_6P": {
    "scenarioId": "HEADING_FOR_NEW_SHORES",
    "boardSize": "5_6P",
    "title": "Rumbo a nuevas orillas (5-6J)",
    "pirateCoord": {
      "q": 5,
      "r": 0
    },
    "robberCoord": {
      "q": -1,
      "r": -1
    },
    "hexes": [
      {
        "q": 4,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -3,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "GOLD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "BRICK",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "ORE",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -1,
        "terrain": "BRICK",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 1,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "WOOD",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "GOLD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 3,
        "terrain": "GOLD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "WHEAT",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SHEEP",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "BRICK",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "BRICK",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "ORE",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": -2,
        "seaQ": 0,
        "seaR": -3
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -2,
        "seaQ": 4,
        "seaR": -3
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": -3,
        "seaQ": 3,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": -1,
        "seaQ": -2,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": 2,
        "seaQ": 2,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -1,
        "seaQ": 4,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 0,
        "seaQ": 3,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 0,
        "seaQ": -3,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 2,
        "seaQ": -3,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": 3,
        "seaQ": -2,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 3,
        "seaQ": 0,
        "seaR": 4
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": true,
      "shuffleIsletNumbers": true,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "THE_FOUR_ISLANDS__3P": {
    "scenarioId": "THE_FOUR_ISLANDS",
    "boardSize": "3P",
    "title": "Las cuatro islas (3J)",
    "pirateCoord": {
      "q": -2,
      "r": 4
    },
    "robberCoord": {
      "q": -3,
      "r": 3
    },
    "hexes": [
      {
        "q": 0,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SHEEP",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "ORE",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "BRICK",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "WHEAT",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "ORE",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SHEEP",
        "num": 12,
        "hasRobber": true
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "BRICK",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "WHEAT",
        "num": 5,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "BRICK",
        "landQ": 2,
        "landR": -1,
        "seaQ": 1,
        "seaR": 0
      },
      {
        "type": "SHEEP",
        "landQ": -2,
        "landR": 2,
        "seaQ": -2,
        "seaR": 3
      },
      {
        "type": "WHEAT",
        "landQ": 2,
        "landR": 1,
        "seaQ": 2,
        "seaR": 2
      },
      {
        "type": "WOOD",
        "landQ": -3,
        "landR": 1,
        "seaQ": -2,
        "seaR": 0
      },
      {
        "type": "ORE",
        "landQ": 0,
        "landR": -2,
        "seaQ": 0,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 2,
        "seaQ": 0,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -2,
        "seaQ": 4,
        "seaR": -3
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 1,
        "seaQ": -4,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": -1,
        "seaQ": -2,
        "seaR": -2
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "THE_FOUR_ISLANDS__4P": {
    "scenarioId": "THE_FOUR_ISLANDS",
    "boardSize": "4P",
    "title": "Las cuatro islas (4J)",
    "pirateCoord": {
      "q": -2,
      "r": 4
    },
    "robberCoord": {
      "q": 2,
      "r": -2
    },
    "hexes": [
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": true
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "ORE",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "BRICK",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -3,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -2,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "WHEAT",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "BRICK",
        "landQ": -3,
        "landR": 1,
        "seaQ": -4,
        "seaR": 2
      },
      {
        "type": "SHEEP",
        "landQ": -3,
        "landR": 3,
        "seaQ": -4,
        "seaR": 3
      },
      {
        "type": "WHEAT",
        "landQ": -1,
        "landR": -2,
        "seaQ": -2,
        "seaR": -2
      },
      {
        "type": "WOOD",
        "landQ": 3,
        "landR": -2,
        "seaQ": 3,
        "seaR": -1
      },
      {
        "type": "ORE",
        "landQ": 2,
        "landR": 1,
        "seaQ": 2,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 0,
        "seaQ": 0,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 2,
        "seaQ": -1,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 1,
        "seaQ": 2,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": -1,
        "seaQ": -2,
        "seaR": 0
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "THE_FOUR_ISLANDS__5_6P": {
    "scenarioId": "THE_FOUR_ISLANDS",
    "boardSize": "5_6P",
    "title": "Las seis islas (5-6J)",
    "pirateCoord": {
      "q": -5,
      "r": 0
    },
    "robberCoord": {
      "q": -2,
      "r": -3
    },
    "hexes": [
      {
        "q": 0,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -3,
        "terrain": "SHEEP",
        "num": 12,
        "hasRobber": true
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "ORE",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "ORE",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -2,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": -1,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SHEEP",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 2,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "WHEAT",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 3,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": -3,
        "seaQ": -1,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": -3,
        "seaQ": 2,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -3,
        "seaQ": 5,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": -5,
        "landR": 2,
        "seaQ": -6,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 3,
        "seaQ": -1,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 2,
        "seaQ": -3,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": -1,
        "seaQ": -4,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -2,
        "seaQ": 2,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": -2,
        "seaQ": -2,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 3,
        "seaQ": -3,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 2,
        "seaQ": 3,
        "seaR": 2
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "OCEANIA__3P": {
    "scenarioId": "OCEANIA",
    "boardSize": "3P",
    "title": "Ocean\u00eda (3J)",
    "pirateCoord": {
      "q": 2,
      "r": 3
    },
    "robberCoord": {
      "q": -2,
      "r": 3
    },
    "hexes": [
      {
        "q": 2,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "BRICK",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SHEEP",
        "num": 12,
        "hasRobber": true
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "BRICK",
        "landQ": -1,
        "landR": 2,
        "seaQ": -1,
        "seaR": 3
      },
      {
        "type": "SHEEP",
        "landQ": 4,
        "landR": -3,
        "seaQ": 5,
        "seaR": -3
      },
      {
        "type": "WHEAT",
        "landQ": 4,
        "landR": -1,
        "seaQ": 5,
        "seaR": -2
      },
      {
        "type": "WOOD",
        "landQ": -2,
        "landR": 1,
        "seaQ": -3,
        "seaR": 2
      },
      {
        "type": "ORE",
        "landQ": -2,
        "landR": 0,
        "seaQ": -3,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 0,
        "seaQ": 4,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -3,
        "seaQ": 4,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 3,
        "seaQ": -3,
        "seaR": 3
      }
    ],
    "fogDeck": [
      {
        "terrain": "SEA",
        "num": null
      },
      {
        "terrain": "SEA",
        "num": null
      },
      {
        "terrain": "GOLD",
        "num": 3
      },
      {
        "terrain": "GOLD",
        "num": 5
      },
      {
        "terrain": "WHEAT",
        "num": 4
      },
      {
        "terrain": "WHEAT",
        "num": 8
      },
      {
        "terrain": "BRICK",
        "num": 3
      },
      {
        "terrain": "BRICK",
        "num": 6
      },
      {
        "terrain": "ORE",
        "num": 9
      },
      {
        "terrain": "ORE",
        "num": 10
      },
      {
        "terrain": "SHEEP",
        "num": 11
      },
      {
        "terrain": "WOOD",
        "num": 12
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": false,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "OCEANIA__4P": {
    "scenarioId": "OCEANIA",
    "boardSize": "4P",
    "title": "Ocean\u00eda (4J)",
    "pirateCoord": {
      "q": -1,
      "r": 4
    },
    "robberCoord": {
      "q": 3,
      "r": -2
    },
    "hexes": [
      {
        "q": 0,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "BRICK",
        "num": 12,
        "hasRobber": true
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "WHEAT",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "BRICK",
        "landQ": 3,
        "landR": -1,
        "seaQ": 4,
        "seaR": -2
      },
      {
        "type": "SHEEP",
        "landQ": 1,
        "landR": -3,
        "seaQ": 2,
        "seaR": -4
      },
      {
        "type": "WHEAT",
        "landQ": 3,
        "landR": -3,
        "seaQ": 3,
        "seaR": -4
      },
      {
        "type": "WOOD",
        "landQ": -3,
        "landR": 0,
        "seaQ": -4,
        "seaR": 0
      },
      {
        "type": "ORE",
        "landQ": -4,
        "landR": 1,
        "seaQ": -5,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 1,
        "seaQ": 3,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -3,
        "seaQ": 4,
        "seaR": -3
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 3,
        "seaQ": -5,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 3,
        "seaQ": -4,
        "seaR": 4
      }
    ],
    "fogDeck": [
      {
        "terrain": "SEA",
        "num": null
      },
      {
        "terrain": "SEA",
        "num": null
      },
      {
        "terrain": "GOLD",
        "num": 3
      },
      {
        "terrain": "GOLD",
        "num": 5
      },
      {
        "terrain": "WHEAT",
        "num": 4
      },
      {
        "terrain": "WHEAT",
        "num": 8
      },
      {
        "terrain": "BRICK",
        "num": 6
      },
      {
        "terrain": "BRICK",
        "num": 11
      },
      {
        "terrain": "ORE",
        "num": 9
      },
      {
        "terrain": "ORE",
        "num": 10
      },
      {
        "terrain": "SHEEP",
        "num": 11
      },
      {
        "terrain": "WOOD",
        "num": 12
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": false,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "OCEANIA__5_6P": {
    "scenarioId": "OCEANIA",
    "boardSize": "5_6P",
    "title": "Ocean\u00eda (5-6J)",
    "pirateCoord": {
      "q": -2,
      "r": 4
    },
    "robberCoord": {
      "q": 4,
      "r": -2
    },
    "hexes": [
      {
        "q": -1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -3,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "ORE",
        "num": 12,
        "hasRobber": true
      },
      {
        "q": -3,
        "r": -2,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "WHEAT",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SHEEP",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": -1,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 0,
        "terrain": "ORE",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SHEEP",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 2,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "ORE",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 3,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "FOG",
        "num": null,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "BRICK",
        "landQ": 3,
        "landR": 1,
        "seaQ": 4,
        "seaR": 0
      },
      {
        "type": "SHEEP",
        "landQ": -3,
        "landR": -1,
        "seaQ": -2,
        "seaR": -1
      },
      {
        "type": "WHEAT",
        "landQ": 3,
        "landR": 1,
        "seaQ": 3,
        "seaR": 2
      },
      {
        "type": "WOOD",
        "landQ": 3,
        "landR": -3,
        "seaQ": 4,
        "seaR": -4
      },
      {
        "type": "ORE",
        "landQ": -4,
        "landR": 0,
        "seaQ": -5,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": -2,
        "seaQ": -3,
        "seaR": -3
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 3,
        "seaQ": -3,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -5,
        "landR": 2,
        "seaQ": -6,
        "seaR": 2
      },
      {
        "type": "SHEEP",
        "landQ": 3,
        "landR": -2,
        "seaQ": 2,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 2,
        "seaQ": 1,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -1,
        "seaQ": 5,
        "seaR": -2
      }
    ],
    "fogDeck": [
      {
        "terrain": "SEA",
        "num": null
      },
      {
        "terrain": "SEA",
        "num": null
      },
      {
        "terrain": "SEA",
        "num": null
      },
      {
        "terrain": "DESERT",
        "num": null
      },
      {
        "terrain": "GOLD",
        "num": 2
      },
      {
        "terrain": "GOLD",
        "num": 5
      },
      {
        "terrain": "GOLD",
        "num": 10
      },
      {
        "terrain": "WHEAT",
        "num": 3
      },
      {
        "terrain": "WHEAT",
        "num": 8
      },
      {
        "terrain": "BRICK",
        "num": 4
      },
      {
        "terrain": "BRICK",
        "num": 6
      },
      {
        "terrain": "ORE",
        "num": 3
      },
      {
        "terrain": "ORE",
        "num": 9
      },
      {
        "terrain": "ORE",
        "num": 11
      },
      {
        "terrain": "SHEEP",
        "num": 4
      },
      {
        "terrain": "SHEEP",
        "num": 11
      },
      {
        "terrain": "WOOD",
        "num": 5
      },
      {
        "terrain": "WOOD",
        "num": 12
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": false,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "THROUGH_THE_DESERT__3P": {
    "scenarioId": "THROUGH_THE_DESERT",
    "boardSize": "3P",
    "title": "A trav\u00e9s del desierto (3J)",
    "pirateCoord": {
      "q": 1,
      "r": -4
    },
    "robberCoord": {
      "q": 1,
      "r": -3
    },
    "hexes": [
      {
        "q": 2,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "GOLD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "SHEEP",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "GOLD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "BRICK",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "ORE",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SHEEP",
        "num": 4,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "BRICK",
        "landQ": -3,
        "landR": 3,
        "seaQ": -3,
        "seaR": 4
      },
      {
        "type": "SHEEP",
        "landQ": -3,
        "landR": 1,
        "seaQ": -4,
        "seaR": 2
      },
      {
        "type": "WHEAT",
        "landQ": -2,
        "landR": 1,
        "seaQ": -2,
        "seaR": 0
      },
      {
        "type": "WOOD",
        "landQ": 1,
        "landR": -2,
        "seaQ": 2,
        "seaR": -3
      },
      {
        "type": "ORE",
        "landQ": -3,
        "landR": 3,
        "seaQ": -4,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 3,
        "seaQ": -1,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 1,
        "seaQ": 1,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 1,
        "seaQ": 0,
        "seaR": 2
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": true,
      "shuffleIsletNumbers": true,
      "preventRedAdjacent": true,
      "forbidRedOnGold": true,
      "fixedCoords": [
        {
          "q": -1,
          "r": -3
        },
        {
          "q": -1,
          "r": -2
        },
        {
          "q": -1,
          "r": -1
        }
      ]
    }
  },
  "THROUGH_THE_DESERT__4P": {
    "scenarioId": "THROUGH_THE_DESERT",
    "boardSize": "4P",
    "title": "A trav\u00e9s del desierto (4J)",
    "pirateCoord": {
      "q": 1,
      "r": -4
    },
    "robberCoord": {
      "q": 1,
      "r": -3
    },
    "hexes": [
      {
        "q": 3,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "GOLD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "ORE",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "BRICK",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "BRICK",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "WHEAT",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "BRICK",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "BRICK",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "SHEEP",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "WHEAT",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "GOLD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SHEEP",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "BRICK",
        "landQ": 2,
        "landR": -3,
        "seaQ": 3,
        "seaR": -3
      },
      {
        "type": "SHEEP",
        "landQ": -1,
        "landR": 0,
        "seaQ": -2,
        "seaR": 0
      },
      {
        "type": "WHEAT",
        "landQ": -3,
        "landR": 2,
        "seaQ": -4,
        "seaR": 2
      },
      {
        "type": "WOOD",
        "landQ": -2,
        "landR": 3,
        "seaQ": -1,
        "seaR": 3
      },
      {
        "type": "ORE",
        "landQ": -3,
        "landR": 2,
        "seaQ": -3,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": -1,
        "seaQ": 2,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": -1,
        "seaQ": 3,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 1,
        "seaQ": 0,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 3,
        "seaQ": -3,
        "seaR": 4
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": true,
      "shuffleIsletNumbers": true,
      "preventRedAdjacent": true,
      "forbidRedOnGold": true,
      "fixedCoords": [
        {
          "q": -1,
          "r": -3
        },
        {
          "q": -1,
          "r": -2
        },
        {
          "q": -1,
          "r": -1
        }
      ]
    }
  },
  "THROUGH_THE_DESERT__5_6P": {
    "scenarioId": "THROUGH_THE_DESERT",
    "boardSize": "5_6P",
    "title": "A trav\u00e9s del desierto (5-6J)",
    "pirateCoord": {
      "q": 1,
      "r": 3
    },
    "robberCoord": {
      "q": -1,
      "r": -2
    },
    "hexes": [
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "WOOD",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -3,
        "terrain": "BRICK",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "WHEAT",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -3,
        "terrain": "GOLD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -2,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -1,
        "terrain": "GOLD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 0,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 1,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "BRICK",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 1,
        "terrain": "SHEEP",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 2,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "ORE",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 2,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 3,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 3,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "GOLD",
        "num": 4,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 1,
        "seaQ": -3,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 0,
        "seaQ": 2,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": -1,
        "seaQ": 3,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": 1,
        "seaQ": -2,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": 1,
        "seaQ": 0,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 0,
        "seaQ": -2,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 0,
        "seaQ": -4,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": -5,
        "landR": 1,
        "seaQ": -5,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": -5,
        "landR": 2,
        "seaQ": -6,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -5,
        "landR": 3,
        "seaQ": -6,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -5,
        "landR": 3,
        "seaQ": -4,
        "seaR": 3
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": true,
      "shuffleIsletNumbers": true,
      "preventRedAdjacent": true,
      "forbidRedOnGold": true,
      "fixedCoords": [
        {
          "q": -1,
          "r": -3
        },
        {
          "q": -1,
          "r": -2
        },
        {
          "q": -1,
          "r": -1
        },
        {
          "q": -1,
          "r": 0
        },
        {
          "q": -1,
          "r": 1
        }
      ]
    }
  },
  "THE_FORGOTTEN_TRIBE__4P": {
    "scenarioId": "THE_FORGOTTEN_TRIBE",
    "boardSize": "4P",
    "title": "El pueblo perdido (3-4J)",
    "pirateCoord": null,
    "robberCoord": {
      "q": 2,
      "r": -3
    },
    "hexes": [
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "ORE",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "ORE",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "WHEAT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "ORE",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SHEEP",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SHEEP",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "WOOD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "BRICK",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "BRICK",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": -3,
        "seaQ": -1,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -1,
        "seaQ": 5,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 3,
        "seaQ": -5,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": 3,
        "seaQ": -1,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 1,
        "seaQ": 3,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": -3,
        "seaQ": 2,
        "seaR": -4
      }
    ],
    "forgottenGifts": [
      {
        "hexCoord": {
          "q": -1,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 0,
          "r": -3
        },
        "type": "PORT",
        "portType": "WOOD"
      },
      {
        "hexCoord": {
          "q": 0,
          "r": -3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": 2,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 3,
          "r": -3
        },
        "type": "PORT",
        "portType": "SHEEP"
      },
      {
        "hexCoord": {
          "q": 3,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 4,
          "r": -3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": 4,
          "r": -1
        },
        "type": "PORT",
        "portType": "BRICK"
      },
      {
        "hexCoord": {
          "q": 4,
          "r": -1
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 3,
          "r": 1
        },
        "type": "PORT",
        "portType": "ORE"
      },
      {
        "hexCoord": {
          "q": 3,
          "r": 1
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": 1,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 0,
          "r": 3
        },
        "type": "PORT",
        "portType": "GENERIC"
      },
      {
        "hexCoord": {
          "q": 0,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -1,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -1,
          "r": 3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": -3,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -4,
          "r": 3
        },
        "type": "PORT",
        "portType": "GENERIC"
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "THE_FORGOTTEN_TRIBE__3P": {
    "scenarioId": "THE_FORGOTTEN_TRIBE",
    "boardSize": "4P",
    "title": "El pueblo perdido (3-4J)",
    "pirateCoord": null,
    "robberCoord": {
      "q": 2,
      "r": -3
    },
    "hexes": [
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "ORE",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "ORE",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "WHEAT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "ORE",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SHEEP",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SHEEP",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "WOOD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "BRICK",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "BRICK",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": -3,
        "seaQ": -1,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -1,
        "seaQ": 5,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 3,
        "seaQ": -5,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": 3,
        "seaQ": -1,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 1,
        "seaQ": 3,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": -3,
        "seaQ": 2,
        "seaR": -4
      }
    ],
    "forgottenGifts": [
      {
        "hexCoord": {
          "q": -1,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 0,
          "r": -3
        },
        "type": "PORT",
        "portType": "WOOD"
      },
      {
        "hexCoord": {
          "q": 0,
          "r": -3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": 2,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 3,
          "r": -3
        },
        "type": "PORT",
        "portType": "SHEEP"
      },
      {
        "hexCoord": {
          "q": 3,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 4,
          "r": -3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": 4,
          "r": -1
        },
        "type": "PORT",
        "portType": "BRICK"
      },
      {
        "hexCoord": {
          "q": 4,
          "r": -1
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 3,
          "r": 1
        },
        "type": "PORT",
        "portType": "ORE"
      },
      {
        "hexCoord": {
          "q": 3,
          "r": 1
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": 1,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 0,
          "r": 3
        },
        "type": "PORT",
        "portType": "GENERIC"
      },
      {
        "hexCoord": {
          "q": 0,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -1,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -1,
          "r": 3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": -3,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -4,
          "r": 3
        },
        "type": "PORT",
        "portType": "GENERIC"
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "THE_FORGOTTEN_TRIBE__5_6P": {
    "scenarioId": "THE_FORGOTTEN_TRIBE",
    "boardSize": "5_6P",
    "title": "El pueblo perdido (5-6J)",
    "pirateCoord": {
      "q": -3,
      "r": 3
    },
    "robberCoord": {
      "q": -2,
      "r": -3
    },
    "hexes": [
      {
        "q": 0,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -3,
        "terrain": "SHEEP",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "SHEEP",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": -1,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "ORE",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -1,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "BRICK",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 0,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 0,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SHEEP",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 1,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 1,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SHEEP",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "ORE",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "BRICK",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "WHEAT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 3,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": -3,
        "seaQ": 1,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 5,
        "landR": -3,
        "seaQ": 6,
        "seaR": -4
      },
      {
        "type": "BRICK",
        "landQ": -5,
        "landR": 3,
        "seaQ": -6,
        "seaR": 4
      },
      {
        "type": "SHEEP",
        "landQ": -4,
        "landR": 3,
        "seaQ": -4,
        "seaR": 4
      },
      {
        "type": "ORE",
        "landQ": -1,
        "landR": 3,
        "seaQ": -1,
        "seaR": 4
      },
      {
        "type": "WOOD",
        "landQ": 4,
        "landR": -3,
        "seaQ": 5,
        "seaR": -4
      },
      {
        "type": "WHEAT",
        "landQ": -1,
        "landR": -3,
        "seaQ": 0,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": 3,
        "seaQ": 0,
        "seaR": 4
      }
    ],
    "forgottenGifts": [
      {
        "hexCoord": {
          "q": -2,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -1,
          "r": -3
        },
        "type": "PORT",
        "portType": "WOOD"
      },
      {
        "hexCoord": {
          "q": -1,
          "r": -3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": 1,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 2,
          "r": -3
        },
        "type": "PORT",
        "portType": "SHEEP"
      },
      {
        "hexCoord": {
          "q": 2,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 4,
          "r": -3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": 5,
          "r": -3
        },
        "type": "PORT",
        "portType": "BRICK"
      },
      {
        "hexCoord": {
          "q": 5,
          "r": -3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": 2,
          "r": 3
        },
        "type": "PORT",
        "portType": "ORE"
      },
      {
        "hexCoord": {
          "q": 2,
          "r": 3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": 1,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -1,
          "r": 3
        },
        "type": "PORT",
        "portType": "GENERIC"
      },
      {
        "hexCoord": {
          "q": -1,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -2,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -2,
          "r": 3
        },
        "type": "DEV_CARD"
      },
      {
        "hexCoord": {
          "q": -4,
          "r": 3
        },
        "type": "CATAN_CHIT_1VP"
      },
      {
        "hexCoord": {
          "q": -5,
          "r": 3
        },
        "type": "PORT",
        "portType": "GENERIC"
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "CLOTH_FOR_CATAN__4P": {
    "scenarioId": "CLOTH_FOR_CATAN",
    "boardSize": "4P",
    "title": "Telas para Cat\u00e1n (3-4J)",
    "pirateCoord": {
      "q": 3,
      "r": 0
    },
    "robberCoord": {
      "q": -2,
      "r": 0
    },
    "hexes": [
      {
        "q": -1,
        "r": -3,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "WHEAT",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "SEA",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "WOOD",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SEA",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SEA",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SEA",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "ORE",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SEA",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -2,
        "seaQ": 4,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 2,
        "seaQ": -5,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": -2,
        "seaQ": -3,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": -3,
        "seaQ": 2,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": -3,
        "seaQ": 0,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 3,
        "seaQ": -4,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": 3,
        "seaQ": -1,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": 2,
        "seaQ": 1,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 1,
        "seaQ": 3,
        "seaR": 1
      }
    ],
    "nativeVillages": [
      {
        "hexCoord": {
          "q": -2,
          "r": 0
        },
        "topNum": 3,
        "bottomNum": 11
      },
      {
        "hexCoord": {
          "q": 0,
          "r": -1
        },
        "topNum": 4,
        "bottomNum": 10
      },
      {
        "hexCoord": {
          "q": -1,
          "r": 1
        },
        "topNum": 5,
        "bottomNum": 8
      },
      {
        "hexCoord": {
          "q": 1,
          "r": 0
        },
        "topNum": 6,
        "bottomNum": 9
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": [
        {
          "q": -2,
          "r": 0
        },
        {
          "q": 0,
          "r": -1
        },
        {
          "q": -1,
          "r": 1
        },
        {
          "q": 1,
          "r": 0
        }
      ]
    }
  },
  "CLOTH_FOR_CATAN__3P": {
    "scenarioId": "CLOTH_FOR_CATAN",
    "boardSize": "4P",
    "title": "Telas para Cat\u00e1n (3-4J)",
    "pirateCoord": {
      "q": 3,
      "r": 0
    },
    "robberCoord": {
      "q": -2,
      "r": 0
    },
    "hexes": [
      {
        "q": -1,
        "r": -3,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "WHEAT",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "SEA",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "WOOD",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SEA",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SEA",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SEA",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "ORE",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SEA",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -2,
        "seaQ": 4,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 2,
        "seaQ": -5,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": -2,
        "seaQ": -3,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": -3,
        "seaQ": 2,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": -3,
        "seaQ": 0,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 3,
        "seaQ": -4,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": 3,
        "seaQ": -1,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": 2,
        "seaQ": 1,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 1,
        "seaQ": 3,
        "seaR": 1
      }
    ],
    "nativeVillages": [
      {
        "hexCoord": {
          "q": -2,
          "r": 0
        },
        "topNum": 3,
        "bottomNum": 11
      },
      {
        "hexCoord": {
          "q": 0,
          "r": -1
        },
        "topNum": 4,
        "bottomNum": 10
      },
      {
        "hexCoord": {
          "q": -1,
          "r": 1
        },
        "topNum": 5,
        "bottomNum": 8
      },
      {
        "hexCoord": {
          "q": 1,
          "r": 0
        },
        "topNum": 6,
        "bottomNum": 9
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": [
        {
          "q": -2,
          "r": 0
        },
        {
          "q": 0,
          "r": -1
        },
        {
          "q": -1,
          "r": 1
        },
        {
          "q": 1,
          "r": 0
        }
      ]
    }
  },
  "CLOTH_FOR_CATAN__5_6P": {
    "scenarioId": "CLOTH_FOR_CATAN",
    "boardSize": "5_6P",
    "title": "Telas para Cat\u00e1n (5-6J)",
    "pirateCoord": {
      "q": 4,
      "r": 0
    },
    "robberCoord": {
      "q": -1,
      "r": -1
    },
    "hexes": [
      {
        "q": -2,
        "r": -3,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "BRICK",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "SHEEP",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "WHEAT",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "WOOD",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -2,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SEA",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SHEEP",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": -1,
        "terrain": "WHEAT",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SEA",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "SEA",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "GOLD",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SEA",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "ORE",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 1,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "ORE",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 2,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "WHEAT",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "BRICK",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 3,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": -3,
        "seaQ": -1,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": -3,
        "seaQ": 1,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -3,
        "seaQ": 3,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -2,
        "seaQ": 5,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 1,
        "seaQ": 4,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 2,
        "seaQ": 2,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 3,
        "seaQ": 0,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 3,
        "seaQ": -3,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 3,
        "seaQ": -5,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -5,
        "landR": 2,
        "seaQ": -6,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": -2,
        "seaQ": -4,
        "seaR": -2
      }
    ],
    "nativeVillages": [
      {
        "hexCoord": {
          "q": -3,
          "r": 0
        },
        "topNum": 4,
        "bottomNum": 9
      },
      {
        "hexCoord": {
          "q": -1,
          "r": -1
        },
        "topNum": 3,
        "bottomNum": 12
      },
      {
        "hexCoord": {
          "q": 1,
          "r": -1
        },
        "topNum": 5,
        "bottomNum": 8
      },
      {
        "hexCoord": {
          "q": -2,
          "r": 1
        },
        "topNum": 2,
        "bottomNum": 10
      },
      {
        "hexCoord": {
          "q": 0,
          "r": 1
        },
        "topNum": 6,
        "bottomNum": 11
      },
      {
        "hexCoord": {
          "q": 2,
          "r": 0
        },
        "topNum": 4,
        "bottomNum": 10
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": [
        {
          "q": -3,
          "r": 0
        },
        {
          "q": -1,
          "r": -1
        },
        {
          "q": 1,
          "r": -1
        },
        {
          "q": -2,
          "r": 1
        },
        {
          "q": 0,
          "r": 1
        },
        {
          "q": 2,
          "r": 0
        }
      ]
    }
  },
  "THE_PIRATE_ISLANDS__3P": {
    "scenarioId": "THE_PIRATE_ISLANDS",
    "boardSize": "3P",
    "title": "Las islas de los piratas (3J)",
    "pirateCoord": null,
    "robberCoord": null,
    "hexes": [
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "GOLD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "BRICK",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SHEEP",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "WOOD",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SHEEP",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "BRICK",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "GOLD",
        "num": 3,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -3,
        "seaQ": 3,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -3,
        "seaQ": 4,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -3,
        "seaQ": 5,
        "seaR": -3
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -2,
        "seaQ": 5,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 0,
        "seaQ": 4,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 1,
        "seaQ": 3,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 2,
        "seaQ": 2,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 3,
        "seaQ": 0,
        "seaR": 4
      }
    ],
    "pirateFortresses": [
      {
        "hexCoord": {
          "q": -2,
          "r": -2
        },
        "color": "RED"
      },
      {
        "hexCoord": {
          "q": -3,
          "r": -1
        },
        "color": "BLUE"
      },
      {
        "hexCoord": {
          "q": -4,
          "r": 1
        },
        "color": "ORANGE"
      }
    ],
    "pirateFleetRoute": [
      {
        "q": 0,
        "r": -1
      },
      {
        "q": 1,
        "r": -1
      },
      {
        "q": 2,
        "r": -1
      },
      {
        "q": 2,
        "r": 0
      },
      {
        "q": 2,
        "r": 1
      },
      {
        "q": 1,
        "r": 2
      },
      {
        "q": 0,
        "r": 2
      },
      {
        "q": -1,
        "r": 2
      },
      {
        "q": -1,
        "r": 1
      },
      {
        "q": -1,
        "r": 0
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": false,
      "shuffleMainNumbers": false,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": false,
      "forbidRedOnGold": false,
      "fixedCoords": []
    },
    "safePirateCoord": {
      "q": 0,
      "r": 0
    }
  },
  "THE_PIRATE_ISLANDS__4P": {
    "scenarioId": "THE_PIRATE_ISLANDS",
    "boardSize": "4P",
    "title": "Las islas de los piratas (4J)",
    "pirateCoord": null,
    "robberCoord": null,
    "hexes": [
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "GOLD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "BRICK",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "WOOD",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SHEEP",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "WOOD",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SHEEP",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "BRICK",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "GOLD",
        "num": 3,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": -3,
        "seaQ": 3,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -3,
        "seaQ": 4,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -3,
        "seaQ": 5,
        "seaR": -3
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -2,
        "seaQ": 5,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 0,
        "seaQ": 4,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 1,
        "seaQ": 3,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 2,
        "seaQ": 2,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 3,
        "seaQ": 0,
        "seaR": 4
      }
    ],
    "pirateFortresses": [
      {
        "hexCoord": {
          "q": -2,
          "r": -2
        },
        "color": "RED"
      },
      {
        "hexCoord": {
          "q": -3,
          "r": -1
        },
        "color": "BLUE"
      },
      {
        "hexCoord": {
          "q": -4,
          "r": 1
        },
        "color": "ORANGE"
      },
      {
        "hexCoord": {
          "q": -3,
          "r": 3
        },
        "color": "WHITE"
      }
    ],
    "pirateFleetRoute": [
      {
        "q": 0,
        "r": -1
      },
      {
        "q": 1,
        "r": -1
      },
      {
        "q": 2,
        "r": -1
      },
      {
        "q": 2,
        "r": 0
      },
      {
        "q": 2,
        "r": 1
      },
      {
        "q": 1,
        "r": 2
      },
      {
        "q": 0,
        "r": 2
      },
      {
        "q": -1,
        "r": 2
      },
      {
        "q": -1,
        "r": 1
      },
      {
        "q": -1,
        "r": 0
      }
    ],
    "variableSetup": {
      "shuffleMainTerrains": false,
      "shuffleMainNumbers": false,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": false,
      "forbidRedOnGold": false,
      "fixedCoords": []
    },
    "safePirateCoord": {
      "q": 0,
      "r": 0
    }
  },
  "THE_PIRATE_ISLANDS__5_6P": {
    "scenarioId": "THE_PIRATE_ISLANDS",
    "boardSize": "5_6P",
    "title": "Las islas piratas (5-6J)",
    "pirateCoord": {
      "q": -2,
      "r": 3
    },
    "robberCoord": null,
    "hexes": [
      {
        "q": -1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -3,
        "terrain": "BRICK",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -3,
        "terrain": "GOLD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -2,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "WOOD",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "WOOD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -1,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SHEEP",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": -1,
        "terrain": "GOLD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 0,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "BRICK",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 1,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 1,
        "terrain": "GOLD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 2,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "WHEAT",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 3,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "ORE",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "WHEAT",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 3,
        "terrain": "GOLD",
        "num": 3,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": -3,
        "seaQ": 4,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 5,
        "landR": -3,
        "seaQ": 5,
        "seaR": -4
      },
      {
        "type": "GENERIC",
        "landQ": 5,
        "landR": -3,
        "seaQ": 6,
        "seaR": -3
      },
      {
        "type": "GENERIC",
        "landQ": 5,
        "landR": -2,
        "seaQ": 6,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 4,
        "landR": 1,
        "seaQ": 5,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": 3,
        "landR": 2,
        "seaQ": 4,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 3,
        "seaQ": 3,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 3,
        "seaQ": 1,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": 3,
        "seaQ": 0,
        "seaR": 4
      }
    ],
    "pirateFortresses": [
      {
        "hexCoord": {
          "q": -2,
          "r": -3
        },
        "color": "RED"
      },
      {
        "hexCoord": {
          "q": -4,
          "r": -1
        },
        "color": "BLUE"
      },
      {
        "hexCoord": {
          "q": -3,
          "r": -1
        },
        "color": "ORANGE"
      },
      {
        "hexCoord": {
          "q": -5,
          "r": 1
        },
        "color": "WHITE"
      },
      {
        "hexCoord": {
          "q": -4,
          "r": 1
        },
        "color": "GREEN"
      },
      {
        "hexCoord": {
          "q": -5,
          "r": 3
        },
        "color": "PURPLE"
      }
    ],
    "pirateFleetRoute": [
      {
        "q": 0,
        "r": -1
      },
      {
        "q": 1,
        "r": -1
      },
      {
        "q": 2,
        "r": -1
      },
      {
        "q": 2,
        "r": 0
      },
      {
        "q": 2,
        "r": 1
      },
      {
        "q": 1,
        "r": 2
      },
      {
        "q": 0,
        "r": 2
      },
      {
        "q": -1,
        "r": 2
      },
      {
        "q": -1,
        "r": 1
      },
      {
        "q": -1,
        "r": 0
      }
    ],
    "safePirateCoord": {
      "q": -2,
      "r": 1
    },
    "variableSetup": {
      "shuffleMainTerrains": false,
      "shuffleMainNumbers": false,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": false,
      "shuffleIsletNumbers": false,
      "preventRedAdjacent": false,
      "forbidRedOnGold": false,
      "fixedCoords": []
    }
  },
  "WONDERS_OF_CATAN__4P": {
    "scenarioId": "WONDERS_OF_CATAN",
    "boardSize": "4P",
    "title": "Las maravillas catanas (3-4J)",
    "pirateCoord": null,
    "robberCoord": {
      "q": 3,
      "r": -2
    },
    "hexes": [
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "ORE",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "BRICK",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "GOLD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "ORE",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SHEEP",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "GOLD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "WHEAT",
        "num": 5,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 0,
        "seaQ": -2,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": -1,
        "seaQ": -2,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": -1,
        "seaQ": 0,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": -1,
        "seaQ": 2,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 0,
        "seaQ": -4,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 2,
        "seaQ": -4,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 3,
        "seaQ": -2,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 2,
        "seaQ": 0,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 2,
        "seaQ": 1,
        "seaR": 1
      }
    ],
    "wonderMarkers": {
      "greatBridgeVertexOffsets": [
        {
          "q": 0,
          "r": -2
        },
        {
          "q": 1,
          "r": -2
        }
      ],
      "greatWallVertexOffsets": [
        {
          "q": 2,
          "r": 0
        },
        {
          "q": 3,
          "r": 0
        }
      ]
    },
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": true,
      "shuffleIsletNumbers": true,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": [
        {
          "q": 1,
          "r": 0
        },
        {
          "q": 2,
          "r": 0
        },
        {
          "q": 3,
          "r": 0
        }
      ]
    }
  },
  "WONDERS_OF_CATAN__3P": {
    "scenarioId": "WONDERS_OF_CATAN",
    "boardSize": "4P",
    "title": "Las maravillas catanas (3-4J)",
    "pirateCoord": null,
    "robberCoord": {
      "q": 3,
      "r": -2
    },
    "hexes": [
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "ORE",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "BRICK",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -3,
        "terrain": "GOLD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "ORE",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "SHEEP",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "GOLD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "WOOD",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "WHEAT",
        "num": 5,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 0,
        "seaQ": -2,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": -1,
        "seaQ": -2,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": -1,
        "seaQ": 0,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": -1,
        "seaQ": 2,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 0,
        "seaQ": -4,
        "seaR": 0
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 2,
        "seaQ": -4,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": 3,
        "seaQ": -2,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 2,
        "seaQ": 0,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 0,
        "landR": 2,
        "seaQ": 1,
        "seaR": 1
      }
    ],
    "wonderMarkers": {
      "greatBridgeVertexOffsets": [
        {
          "q": 0,
          "r": -2
        },
        {
          "q": 1,
          "r": -2
        }
      ],
      "greatWallVertexOffsets": [
        {
          "q": 2,
          "r": 0
        },
        {
          "q": 3,
          "r": 0
        }
      ]
    },
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": true,
      "shuffleIsletNumbers": true,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": [
        {
          "q": 1,
          "r": 0
        },
        {
          "q": 2,
          "r": 0
        },
        {
          "q": 3,
          "r": 0
        }
      ]
    }
  },
  "WONDERS_OF_CATAN__5_6P": {
    "scenarioId": "WONDERS_OF_CATAN",
    "boardSize": "5_6P",
    "title": "Las maravillas catanas (5-6J)",
    "pirateCoord": null,
    "robberCoord": {
      "q": 4,
      "r": -2
    },
    "hexes": [
      {
        "q": -1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -3,
        "terrain": "SHEEP",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -3,
        "terrain": "WHEAT",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -3,
        "terrain": "GOLD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -2,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -2,
        "terrain": "BRICK",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": true
      },
      {
        "q": 5,
        "r": -2,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 5,
        "r": -1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": -1,
        "terrain": "WOOD",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": -1,
        "terrain": "BRICK",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": -1,
        "terrain": "BRICK",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": -1,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": -1,
        "terrain": "SHEEP",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": -1,
        "terrain": "WHEAT",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": -1,
        "terrain": "WHEAT",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": -1,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 0,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 0,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 0,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 0,
        "terrain": "ORE",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 0,
        "terrain": "BRICK",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 0,
        "terrain": "SHEEP",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 0,
        "terrain": "WHEAT",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 0,
        "terrain": "WHEAT",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 0,
        "terrain": "DESERT",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 4,
        "r": 1,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 1,
        "terrain": "WOOD",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 1,
        "terrain": "ORE",
        "num": 12,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 1,
        "terrain": "BRICK",
        "num": 8,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 1,
        "terrain": "BRICK",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 1,
        "terrain": "SHEEP",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 2,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 2,
        "terrain": "WOOD",
        "num": 10,
        "hasRobber": false
      },
      {
        "q": 3,
        "r": 2,
        "terrain": "WOOD",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 2,
        "terrain": "ORE",
        "num": 3,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 2,
        "terrain": "ORE",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 2,
        "terrain": "WHEAT",
        "num": 4,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 2,
        "terrain": "GOLD",
        "num": 6,
        "hasRobber": false
      },
      {
        "q": -5,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -2,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": 1,
        "r": 3,
        "terrain": "SEA",
        "num": null,
        "hasRobber": false
      },
      {
        "q": -3,
        "r": 3,
        "terrain": "WOOD",
        "num": 9,
        "hasRobber": false
      },
      {
        "q": -4,
        "r": 3,
        "terrain": "ORE",
        "num": 5,
        "hasRobber": false
      },
      {
        "q": -1,
        "r": 3,
        "terrain": "SHEEP",
        "num": 2,
        "hasRobber": false
      },
      {
        "q": 0,
        "r": 3,
        "terrain": "SHEEP",
        "num": 11,
        "hasRobber": false
      },
      {
        "q": 2,
        "r": 3,
        "terrain": "GOLD",
        "num": 6,
        "hasRobber": false
      }
    ],
    "ports": [
      {
        "type": "GENERIC",
        "landQ": -2,
        "landR": -1,
        "seaQ": -2,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": -1,
        "seaQ": 0,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": -1,
        "seaQ": 2,
        "seaR": -2
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": -1,
        "seaQ": -4,
        "seaR": -1
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 1,
        "seaQ": -4,
        "seaR": 1
      },
      {
        "type": "GENERIC",
        "landQ": -3,
        "landR": 2,
        "seaQ": -4,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -4,
        "landR": 3,
        "seaQ": -4,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": 3,
        "seaQ": -1,
        "seaR": 4
      },
      {
        "type": "GENERIC",
        "landQ": 1,
        "landR": 2,
        "seaQ": 1,
        "seaR": 3
      },
      {
        "type": "GENERIC",
        "landQ": 2,
        "landR": 1,
        "seaQ": 2,
        "seaR": 2
      },
      {
        "type": "GENERIC",
        "landQ": -1,
        "landR": 0,
        "seaQ": -1,
        "seaR": 1
      }
    ],
    "wonderMarkers": {
      "greatBridgeVertexOffsets": [
        {
          "q": 0,
          "r": -2
        },
        {
          "q": 1,
          "r": -2
        }
      ],
      "greatWallVertexOffsets": [
        {
          "q": 3,
          "r": 0
        },
        {
          "q": 4,
          "r": 0
        }
      ]
    },
    "variableSetup": {
      "shuffleMainTerrains": true,
      "shuffleMainNumbers": true,
      "shuffleMainPorts": true,
      "shuffleIsletTerrains": true,
      "shuffleIsletNumbers": true,
      "preventRedAdjacent": true,
      "forbidRedOnGold": false,
      "fixedCoords": [
        {
          "q": 2,
          "r": 0
        },
        {
          "q": 3,
          "r": 0
        },
        {
          "q": 4,
          "r": 0
        },
        {
          "q": 5,
          "r": 0
        }
      ]
    }
  }
};
