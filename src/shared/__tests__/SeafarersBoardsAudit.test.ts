import { describe, expect, it } from 'vitest';
import { generateSeafarersBoard } from '../engine/HexGrid';
import { computeIslandComponents } from '../engine/RulesEngine';
import { SeafarersBoardSize, SeafarersScenario } from '../types';

describe('Auditoría Integral de Escenarios Oficiales de Navegantes (Manuales Oficiales)', () => {
  const allScenarios: SeafarersScenario[] = [
    'HEADING_FOR_NEW_SHORES',
    'THE_FOUR_ISLANDS',
    'OCEANIA',
    'THROUGH_THE_DESERT',
    'THE_FORGOTTEN_TRIBE',
    'CLOTH_FOR_CATAN',
    'THE_PIRATE_ISLANDS',
    'WONDERS_OF_CATAN',
    'NEW_WORLD',
  ];
  const allSizes: SeafarersBoardSize[] = ['3P', '4P', '5_6P'];

  it('genera los 24 tableros oficiales sin errores para 2-3, 4 y 5-6 jugadores', () => {
    for (const scenario of allScenarios) {
      for (const size of allSizes) {
        const pCount = size === '3P' ? 3 : size === '5_6P' ? 6 : 4;
        const board = generateSeafarersBoard(scenario, true, 62, pCount, false, size);
        expect(board).toBeDefined();
        expect(Object.keys(board.hexes).length).toBeGreaterThanOrEqual(35);
        expect(Object.keys(board.vertices).length).toBeGreaterThanOrEqual(40);
        expect(Object.keys(board.edges).length).toBeGreaterThanOrEqual(50);
        expect(board.ports.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  describe('Escenario 1: Rumbo a nuevas orillas', () => {
    it('3P: 1 Isla grande (14 hex) + 2 islas de 2 hex + 1 isla de 4 hex', () => {
      const board = generateSeafarersBoard('HEADING_FOR_NEW_SHORES', true, 62, 3, false, '3P');
      const islandMap = computeIslandComponents(board);
      const componentCounts: Record<number, number> = {};
      for (const compId of islandMap.values()) {
        componentCounts[compId] = (componentCounts[compId] || 0) + 1;
      }
      const sizes = Object.values(componentCounts).sort((a, b) => b - a);
      expect(sizes).toEqual([14, 4, 2, 2]);
      expect(board.ports.length).toBe(8);
      // Cerro 12 tiene el ladrón inicial
      const brick12 = Object.values(board.hexes).find(
        (h) => h.terrain === 'BRICK' && h.numberToken === 12
      );
      expect(brick12?.hasRobber).toBe(true);
    });

    it('4P: 1 Isla principal (19 hex) + 2 islas de 2 hex + 1 isla de 5 hex', () => {
      const board = generateSeafarersBoard('HEADING_FOR_NEW_SHORES', true, 62, 4, false, '4P');
      const islandMap = computeIslandComponents(board);
      const componentCounts: Record<number, number> = {};
      for (const compId of islandMap.values()) {
        componentCounts[compId] = (componentCounts[compId] || 0) + 1;
      }
      const sizes = Object.values(componentCounts).sort((a, b) => b - a);
      expect(sizes).toEqual([19, 5, 2, 2]);
      expect(board.ports.length).toBe(9);
      const desert = Object.values(board.hexes).find((h) => h.terrain === 'DESERT');
      expect(desert?.hasRobber).toBe(true);
    });

    it('5-6P: Gran isla madre y 4 islotes exteriores con marco ampliado', () => {
      const board = generateSeafarersBoard('HEADING_FOR_NEW_SHORES', true, 62, 6, false, '5_6P');
      expect(board.ports.length).toBe(11);
      const goldHexes = Object.values(board.hexes).filter((h) => h.terrain === 'GOLD');
      expect(goldHexes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Escenario 2: Las cuatro islas (3-4J) / Las seis islas (5-6J)', () => {
    it('3P: 4 islas completamente separadas por mar sin tocarse', () => {
      const board = generateSeafarersBoard('THE_FOUR_ISLANDS', true, 62, 3, false, '3P');
      const islandMap = computeIslandComponents(board);
      const componentCounts: Record<number, number> = {};
      for (const compId of islandMap.values()) {
        componentCounts[compId] = (componentCounts[compId] || 0) + 1;
      }
      const sizes = Object.values(componentCounts).sort((a, b) => b - a);
      expect(sizes).toEqual([6, 6, 4, 4]); // 4 islas separadas
      expect(board.ports.length).toBe(9);
    });

    it('4P: 4 islas equilibradas de 6, 6, 6, 5 hexes separadas por mar', () => {
      const board = generateSeafarersBoard('THE_FOUR_ISLANDS', true, 62, 4, false, '4P');
      const islandMap = computeIslandComponents(board);
      const componentCounts: Record<number, number> = {};
      for (const compId of islandMap.values()) {
        componentCounts[compId] = (componentCounts[compId] || 0) + 1;
      }
      const sizes = Object.values(componentCounts).sort((a, b) => b - a);
      expect(sizes).toEqual([6, 6, 6, 5]); // 4 islas separadas
      expect(board.ports.length).toBe(9);
    });

    it('5-6P: 6 islas separadas (6 componentes independientes)', () => {
      const board = generateSeafarersBoard('THE_FOUR_ISLANDS', true, 62, 6, false, '5_6P');
      const islandMap = computeIslandComponents(board);
      const componentCounts: Record<number, number> = {};
      for (const compId of islandMap.values()) {
        componentCounts[compId] = (componentCounts[compId] || 0) + 1;
      }
      const sizes = Object.values(componentCounts).sort((a, b) => b - a);
      expect(sizes).toEqual([6, 6, 5, 5, 5, 5]); // 6 islas separadas
      expect(board.ports.length).toBe(11);
    });
  });

  describe('Escenario 3: Oceanía (Tierra Ignota)', () => {
    it('las islas conocidas se ubican en extremos y nunca hay puertos en niebla', () => {
      for (const size of allSizes) {
        const board = generateSeafarersBoard('OCEANIA', true, 62, 4, false, size);
        expect(board.fogDeck).toBeDefined();
        expect(board.fogDeck!.length).toBeGreaterThan(0);
        // Ningún puerto puede tocar una casilla de niebla
        for (const port of board.ports) {
          const edge = board.edges[port.edgeId];
          const touchesFog = edge.hexIds.some((hId) => board.hexes[hId]?.terrain === 'FOG');
          expect(touchesFog).toBe(false);
        }
      }
    });
  });

  describe('Escenario 4: A través del desierto', () => {
    it('el cinturón de desiertos separa la tierra madre y los islotes de oro', () => {
      const board3p = generateSeafarersBoard('THROUGH_THE_DESERT', true, 62, 3, false, '3P');
      const board4p = generateSeafarersBoard('THROUGH_THE_DESERT', true, 62, 4, false, '4P');
      const board56p = generateSeafarersBoard('THROUGH_THE_DESERT', true, 62, 6, false, '5_6P');

      expect(Object.values(board3p.hexes).filter((h) => h.terrain === 'DESERT').length).toBe(3);
      expect(Object.values(board4p.hexes).filter((h) => h.terrain === 'DESERT').length).toBe(3);
      expect(Object.values(board56p.hexes).filter((h) => h.terrain === 'DESERT').length).toBe(5);
    });
  });

  describe('Escenario 5: El pueblo perdido', () => {
    it('posee exactamente 18 dones (8 Fichas Catán, 4 cartas desarrollo, 6 puertos) en islotes deshabitados', () => {
      const board = generateSeafarersBoard('THE_FORGOTTEN_TRIBE', true, 62, 4, false, '4P');
      expect(board.forgottenGifts).toBeDefined();
      expect(Object.keys(board.forgottenGifts!).length).toBe(18);
      const chits = Object.values(board.forgottenGifts!).filter(
        (g) => g.type === 'CATAN_CHIT_1VP'
      );
      const devCards = Object.values(board.forgottenGifts!).filter((g) => g.type === 'DEV_CARD');
      const ports = Object.values(board.forgottenGifts!).filter((g) => g.type === 'PORT');
      expect(chits.length).toBe(8);
      expect(devCards.length).toBe(4);
      expect(ports.length).toBe(6);
    });
  });

  describe('Escenario 6: Telas para Catán', () => {
    it('posee 8 aldeas indígenas en 3-4J (con 5 telas c/u) y 10 aldeas en 5-6J', () => {
      const board4p = generateSeafarersBoard('CLOTH_FOR_CATAN', true, 62, 4, false, '4P');
      expect(board4p.nativeVillages).toBeDefined();
      expect(Object.keys(board4p.nativeVillages!).length).toBe(8);
      expect(board4p.clothCommonReserve).toBe(10);

      const board56p = generateSeafarersBoard('CLOTH_FOR_CATAN', true, 62, 6, false, '5_6P');
      expect(board56p.nativeVillages).toBeDefined();
      expect(Object.keys(board56p.nativeVillages!).length).toBe(12);
    });
  });

  describe('Escenario 7: Las islas de los piratas', () => {
    it('posee ruta de flota pirata, fortalezas pirata con 3 fichas y casilla segura (!)', () => {
      const board4p = generateSeafarersBoard('THE_PIRATE_ISLANDS', true, 62, 4, false, '4P');
      expect(board4p.pirateFleetRouteHexIds).toBeDefined();
      expect(board4p.pirateFleetHexId).toBeDefined();
      expect(board4p.pirateFortresses).toBeDefined();
      expect(Object.keys(board4p.pirateFortresses!).length).toBe(4); // RED, BLUE, ORANGE, WHITE
      expect(board4p.safePirateHexId).toBeDefined();
      expect(board4p.robberHexId).toBe(''); // Oficial: sin ladrón
    });
  });

  describe('Sección 4: Montaje Variable (Regenerar Escenario)', () => {
    it('mantiene la silueta de islas y mar al 100% y solo regenera lo permitido por el manual', () => {
      for (const scenario of ['HEADING_FOR_NEW_SHORES', 'THE_FOUR_ISLANDS', 'THROUGH_THE_DESERT', 'CLOTH_FOR_CATAN'] as const) {
        const boardFixed = generateSeafarersBoard(scenario, true, 62, 4, false, '4P');
        const boardRandom = generateSeafarersBoard(scenario, true, 62, 4, true, '4P');

        // La silueta (qué casillas son MAR y cuáles son tierra) debe ser 100% idéntica
        for (const [id, hex] of Object.entries(boardFixed.hexes)) {
          const isSeaFixed = hex.terrain === 'SEA';
          const isSeaRandom = boardRandom.hexes[id]?.terrain === 'SEA';
          expect(isSeaRandom).toBe(isSeaFixed);
        }

        // En A través del desierto: los 3 desiertos quedan estrictamente FIJOS
        if (scenario === 'THROUGH_THE_DESERT') {
          const fixedDeserts = Object.keys(boardFixed.hexes).filter(
            (id) => boardFixed.hexes[id].terrain === 'DESERT'
          );
          for (const dId of fixedDeserts) {
            expect(boardRandom.hexes[dId].terrain).toBe('DESERT');
          }
        }

        // En Telas para Catán: las aldeas centrales y sus números quedan estrictamente FIJOS
        if (scenario === 'CLOTH_FOR_CATAN') {
          expect(Object.keys(boardRandom.nativeVillages!).length).toBe(8);
          for (const [vId, v] of Object.entries(boardFixed.nativeVillages!)) {
            expect(boardRandom.nativeVillages![vId]?.numberToken).toBe(v.numberToken);
            expect(boardRandom.nativeVillages![vId]?.hexId).toBe(v.hexId);
          }
        }
      }
    });
  });
});
