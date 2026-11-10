import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coordToId, generateSeafarersBoard, getHexNeighbors, hasAdjacentRedNumbers, hexToPixel } from '../engine/HexGrid';
import { computeIslandComponents } from '../engine/RulesEngine';
import { SEAFARERS_BOARDS_DATA, RawPortSpec } from '../engine/seafarersBoardsData';
import { SeafarersBoardSize, TerrainType } from '../types';

// Independently extracted from the PDF images and component tables.
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/seafarers-pdf-audit.json', import.meta.url), 'utf8')) as Record<string, {
  hexCount: number; terrains: Record<string, number>; numberTokens: Record<string, number>;
  islands: number[]; seaMask: string[]; portEdges: RawPortSpec[];
  cells: Array<[number, number, TerrainType, number | null]>;
  fogTerrains?: Record<string, number>; fogNumbers?: Record<string, number>;
}>;
const counts = (values: unknown[]) => values.reduce<Record<string, number>>((acc, value) => {
  const key = String(value); acc[key] = (acc[key] || 0) + 1; return acc;
}, {});
const id = (c: { q: number; r: number }) => coordToId(c.q, c.r, -c.q - c.r);
const playerCount = (size: SeafarersBoardSize) => size === '3P' ? 3 : size === '4P' ? 4 : 6;

describe.each(Object.entries(fixtures))('%s: auditoría contra los PDF', (key, fixture) => {
  const data = SEAFARERS_BOARDS_DATA[key];
  const { scenarioId: scenario, boardSize: size } = data;
  const create = (random = false) => generateSeafarersBoard(scenario, true, 62, playerCount(size), random, size);

  it('reproduce las casillas, materiales, números y forma del mar sin ampliar el marco', () => {
    const board = create();
    expect(Object.keys(board.hexes)).toHaveLength(fixture.hexCount);
    expect(counts(data.hexes.map(h => h.terrain))).toEqual(fixture.terrains);
    expect(counts(data.hexes.flatMap(h => h.num === null ? [] : [h.num]))).toEqual(fixture.numberTokens);
    for (const [q, r, terrain, number] of fixture.cells) {
      const source = data.hexes.find(h => h.q === q && h.r === r)!;
      const hex = board.hexes[id({ q, r })];
      // The 5/6-player mother island is blank in the PDF; only its shape and inventory are prescribed.
      if (key === 'HEADING_FOR_NEW_SHORES__5_6P' && source.isMainIsland) continue;
      expect([source.terrain, source.num]).toEqual([terrain, number]);
      if (terrain === 'DESERT') {
        expect(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE']).toContain(hex.terrain);
        expect(hex.numberToken).toBeGreaterThanOrEqual(2);
        expect(hex.numberToken).not.toBe(7);
      } else expect([hex.terrain, hex.numberToken]).toEqual([terrain, number]);
    }
    for (let r = -3; r <= 3; r++) expect(Object.values(board.hexes).filter(h => h.r === r && h.terrain === 'SEA').map(h => String(h.q)).join(' ')).toBe(fixture.seaMask[r + 3]);
    expect(Object.values(counts([...computeIslandComponents(board).values()])).sort((a, b) => b - a)).toEqual(fixture.islands);
    expect(Object.values(board.hexes).some(h => h.terrain === 'DESERT')).toBe(false);
  });

  it('coloca cada puerto en su arista exacta, incluidos los puertos que se recogen como regalos', () => {
    const board = create();
    const ports = scenario === 'THE_FORGOTTEN_TRIBE'
      ? Object.values(board.forgottenGifts!).filter(g => g.type === 'PORT').map(g => ({ edgeId: g.edgeId!, type: g.portType! })) : board.ports;
    expect(ports).toHaveLength(fixture.portEdges.length);
    fixture.portEdges.forEach((spec, i) => {
      const edge = board.edges[ports[i].edgeId];
      const land = board.hexes[id({ q: spec.landQ, r: spec.landR })];
      const sea = hexToPixel(spec.seaQ, spec.seaR, board.hexSize);
      expect(edge.hexIds).toContain(land.id);
      expect(edge.isCoastal).toBe(true);
      expect(Math.abs((edge.x1 + edge.x2) / 2 - (land.center.x + sea.x) / 2)).toBeLessThan(1);
      expect(Math.abs((edge.y1 + edge.y2) / 2 - (land.center.y + sea.y) / 2)).toBeLessThan(1);
      if (String(spec.type) !== 'UNSPECIFIED') expect(ports[i].type).toBe(spec.type);
    });
    if (scenario === 'THE_FORGOTTEN_TRIBE') {
      expect(board.ports).toHaveLength(0);
      expect(Object.values(board.vertices).every(v => v.port === null)).toBe(true);
    } else expect(new Set(board.ports.flatMap(p => p.vertexIds)).size).toBe(board.ports.length * 2);
  });

  it('rodea todo el tablero con mar decorativo sin crear rutas ni destinos jugables', () => {
    const board = create();
    const visible = new Map([...Object.values(board.hexes), ...board.decorativeSeaHexes!].map(h => [h.id, h]));
    for (const hex of Object.values(board.hexes)) for (const coord of getHexNeighbors(hex)) expect(visible.has(id(coord))).toBe(true);
    for (const hex of board.decorativeSeaHexes!) {
      expect(hex.terrain).toBe('SEA');
      expect(board.hexes[hex.id]).toBeUndefined();
      expect(Object.values(board.edges).some(e => e.hexIds.includes(hex.id))).toBe(false);
    }
    for (const port of fixture.portEdges) expect(visible.get(id({ q: port.seaQ, r: port.seaR }))?.terrain).toBe('SEA');
    if (board.pirateHexId) expect(visible.get(board.pirateHexId)?.terrain).toBe('SEA');
  });

  it('regenera solo los grupos del apartado 4 y conserva sus inventarios y restricciones', () => {
    const fixed = create();
    const snapshot = JSON.stringify(data);
    const mutable = new Set(data.variableSetup.groups.flatMap(g => g.coords.map(id)));
    let sawChange = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const board = create(true);
      expect(Object.keys(board.hexes)).toEqual(Object.keys(fixed.hexes));
      expect(counts(Object.values(board.hexes).map(h => h.terrain))).toEqual(counts(Object.values(fixed.hexes).map(h => h.terrain)));
      for (const hex of Object.values(board.hexes)) {
        const before = fixed.hexes[hex.id];
        if (hex.terrain !== before.terrain || hex.numberToken !== before.numberToken) sawChange = true;
        if (!mutable.has(hex.id)) expect([hex.terrain, hex.numberToken]).toEqual([before.terrain, before.numberToken]);
        if (hex.terrain === 'SEA' || hex.terrain === 'FOG') expect(hex.numberToken).toBeNull();
      }
      for (const group of data.variableSetup.groups) {
        const previous = group.coords.map(c => fixed.hexes[id(c)]);
        const current = group.coords.map(c => board.hexes[id(c)]);
        expect(counts(current.map(h => h.terrain))).toEqual(counts(previous.map(h => h.terrain)));
        expect(counts(current.map(h => h.numberToken))).toEqual(counts(previous.map(h => h.numberToken)));
        if (group.forbidRedOnGold) for (const hex of current.filter(h => h.terrain === 'GOLD')) expect([6, 8]).not.toContain(hex.numberToken);
        for (const restriction of group.forbiddenNumbers || []) for (const coord of restriction.coords) expect(restriction.numbers).not.toContain(board.hexes[id(coord)].numberToken);
        if (scenario === 'THE_FOUR_ISLANDS') for (const hex of current.filter(h => h.terrain === 'WOOD' || h.terrain === 'SHEEP')) expect([2, 12]).not.toContain(hex.numberToken);
      }
      if (scenario !== 'OCEANIA') expect(hasAdjacentRedNumbers(board.hexes)).toBe(false);
      expect(board.ports.map(p => p.edgeId)).toEqual(fixed.ports.map(p => p.edgeId));
      expect(counts(board.ports.map(p => p.type))).toEqual(counts(fixed.ports.map(p => p.type)));
      if (!data.variableSetup.shufflePorts) expect(board.ports).toEqual(fixed.ports);
      if (JSON.stringify(board.ports) !== JSON.stringify(fixed.ports)) sawChange = true;
      expect(board.nativeVillages).toEqual(fixed.nativeVillages);
      expect(board.forgottenGifts).toEqual(fixed.forgottenGifts);
      expect(board.pirateFortresses).toEqual(fixed.pirateFortresses);
      expect(board.pirateFleetRouteHexIds).toEqual(fixed.pirateFleetRouteHexIds);
      expect(board.wonderMarkers).toEqual(fixed.wonderMarkers);
      expect(board.robberHexId === '' ? scenario === 'THE_PIRATE_ISLANDS' : board.hexes[board.robberHexId]?.hasRobber).toBe(true);
    }
    expect(sawChange).toBe(true);
    expect(JSON.stringify(data)).toBe(snapshot);
  });

  if (scenario === 'OCEANIA') it('conserva los materiales y fichas de la pila de descubrimiento', () => {
    expect(counts(data.fogDeck!.map(h => h.terrain))).toEqual(fixture.fogTerrains);
    expect(counts(data.fogDeck!.flatMap(h => h.num === null ? [] : [h.num]))).toEqual(fixture.fogNumbers);
    const fixed = create(); const random = create(true);
    expect(fixed.fogDeck).toHaveLength(Object.values(fixed.hexes).filter(h => h.terrain === 'FOG').length);
    expect(random.fogDeck?.some(h => h.terrain === 'DESERT')).toBe(false);
    expect(counts(random.fogDeck!.map(h => h.terrain))).toEqual(counts(fixed.fogDeck!.map(h => h.terrain)));
    expect(counts(random.fogDeck!.map(h => h.numberToken))).toEqual(counts(fixed.fogDeck!.map(h => h.numberToken)));
    expect(random.fogDeck).toEqual(fixed.fogDeck); // Apartado 4: solo las islas conocidas.
  });
  if (scenario === 'THE_PIRATE_ISLANDS') it('sigue las catorce casillas de mar del circuito sin atravesar tierra', () => {
    const board = create();
    const route = board.pirateFleetRouteHexIds!;
    expect(route).toHaveLength(14);
    expect(board.pirateFleetHexId).toBe(route[0]);
    route.forEach((hexId, index) => {
      expect(board.hexes[hexId].terrain).toBe('SEA');
      expect(getHexNeighbors(board.hexes[hexId]).map(id)).toContain(route[(index + 1) % route.length]);
    });
    if (size === '5_6P') expect(board.safePirateHexId).toBe('-2,0,2');
    else expect(board.safePirateHexId).toBeUndefined();
  });
});

describe('Un nuevo mundo: marco oficial y forma terrestre libre', () => {
  it.each(['3P', '4P', '5_6P'] as const)('%s conserva todos los materiales y puertos', size => {
    const board = generateSeafarersBoard('NEW_WORLD', true, 62, 2, true, size);
    const large = size === '5_6P';
    expect(Object.keys(board.hexes)).toHaveLength(large ? 63 : 42);
    expect(Object.values(board.hexes).filter(h => h.terrain === 'SEA')).toHaveLength(large ? 21 : 19);
    expect(Object.values(board.hexes).filter(h => h.terrain === 'GOLD')).toHaveLength(large ? 4 : 0);
    expect(Object.values(board.hexes).filter(h => h.terrain === 'DESERT')).toHaveLength(0);
    expect(board.ports).toHaveLength(large ? 11 : 10);
    expect(hasAdjacentRedNumbers(board.hexes)).toBe(false);
    for (const h of Object.values(board.hexes).filter(h => h.terrain === 'GOLD')) expect([6, 8]).not.toContain(h.numberToken);
  });
});
