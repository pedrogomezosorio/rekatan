import { describe, expect, it } from 'vitest';
import { getAvailableWonders, getWonderStageCost } from '../constants';
import { generateSeafarersBoard } from '../engine/HexGrid';
import { applyGameAction, canStartWonder, createInitialGameState } from '../engine/RulesEngine';
import { SeafarersBoardSize } from '../types';

function playing(size: SeafarersBoardSize = '5_6P') {
  const state = createInitialGameState('WONDERS', { id: 'P1', name: 'Arquitecta', avatar: 'I', color: 'RED' });
  state.config.expansionModule = 'SEAFARERS'; state.config.seafarersScenario = 'WONDERS_OF_CATAN'; state.config.seafarersBoardSize = size;
  state.board = generateSeafarersBoard('WONDERS_OF_CATAN', true, 62, 2, false, size);
  state.phase = 'MAIN_PHASE'; state.turn.activePlayerId = 'P1'; state.turn.hasRolledDice = true;
  return state;
}

describe('Cartas originales de las maravillas de 5/6 jugadores', () => {
  it('añade las dos cartas adicionales a las cinco maravillas del juego básico', () => {
    expect(getAvailableWonders('4P')).toHaveLength(5);
    expect(getAvailableWonders('5_6P')).toHaveLength(7);
    expect(getAvailableWonders('5_6P').filter(w => w.cardImage).map(w => w.id)).toEqual(['GREAT_BRIDGE_NORTH', 'GREAT_LIBRARY']);
    expect(canStartWonder(playing('4P'), 'P1', 'GREAT_LIBRARY').allowed).toBe(false);
  });
  it('distingue los cuadrados violetas del norte de los del puente del sur', () => {
    const state = playing();
    const south = state.board.vertices[state.board.wonderMarkers!.greatBridgeVertexIds[0]];
    south.playerId = 'P1'; south.building = 'SETTLEMENT';
    expect(canStartWonder(state, 'P1', 'GREAT_BRIDGE').allowed).toBe(true);
    expect(canStartWonder(state, 'P1', 'GREAT_BRIDGE_NORTH').allowed).toBe(false);
    const north = state.board.vertices[state.board.wonderMarkers!.greatNorthBridgeVertexIds![0]];
    north.playerId = 'P1'; north.building = 'SETTLEMENT';
    expect(canStartWonder(state, 'P1', 'GREAT_BRIDGE_NORTH').allowed).toBe(true);
    expect(north.y).toBeLessThan(south.y);
  });
  it('exige dos ciudades para reclamar la Gran Biblioteca', () => {
    const state = playing();
    const vertices = Object.values(state.board.vertices).filter(v => v.isLand);
    expect(canStartWonder(state, 'P1', 'GREAT_LIBRARY').allowed).toBe(false);
    vertices[0].building = 'CITY'; vertices[0].playerId = 'P1';
    expect(canStartWonder(state, 'P1', 'GREAT_LIBRARY').allowed).toBe(false);
    vertices[1].building = 'CITY'; vertices[1].playerId = 'P1';
    expect(canStartWonder(state, 'P1', 'GREAT_LIBRARY').allowed).toBe(true);
  });
  it.each([
    ['GREAT_BRIDGE_NORTH', { WOOD: 3, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 0 }],
    ['GREAT_LIBRARY', { WOOD: 1, BRICK: 1, SHEEP: 3, WHEAT: 0, ORE: 0 }],
  ] as const)('%s consume exactamente el coste de su carta por fase', (wonderId, expected) => {
    const state = playing();
    expect(getWonderStageCost(wonderId)).toEqual(expected);
    state.players[0].activeWonderId = wonderId;
    state.players[0].wonderStage = 0;
    state.players[0].resources = { ...expected };
    state.board.wondersState = { [wonderId]: { wonderId, claimedByPlayerId: 'P1', stage: 0 } };
    const result = applyGameAction(state, 'P1', { type: 'BUILD_WONDER_STAGE' });
    expect(result.error).toBeUndefined();
    expect(result.state.players[0].resources).toEqual({ WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
    expect(result.state.players[0].wonderStage).toBe(1);
  });
  it('rechaza construir o reclamar fuera de turno o sin los recursos de la carta', () => {
    const state = playing();
    state.players[0].activeWonderId = 'GREAT_LIBRARY';
    state.players[0].resources = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 1 };
    expect(applyGameAction(state, 'P1', { type: 'BUILD_WONDER_STAGE' }).error).toBeDefined();
    state.turn.activePlayerId = 'OTHER';
    expect(canStartWonder(state, 'P1', 'GREAT_LIBRARY').allowed).toBe(false);
  });
});
