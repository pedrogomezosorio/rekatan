import { describe, expect, it } from 'vitest';
import { applyGameAction, createInitialGameState } from '../engine/RulesEngine';
import { getRoomPlayerLimit } from '../seafarersConfig';
import { SeafarersBoardSize } from '../types';

function lobby(size: SeafarersBoardSize) {
  const initial = createInitialGameState('SAIL', { id: 'HOST', name: 'Capitana', color: 'RED', avatar: 'I' });
  const result = applyGameAction(initial, 'HOST', {
    type: 'UPDATE_CONFIG', config: { expansionModule: 'SEAFARERS', seafarersScenario: 'HEADING_FOR_NEW_SHORES', seafarersBoardSize: size },
  });
  expect(result.error).toBeUndefined();
  return result.state;
}

describe('Modalidad de Navegantes independiente del número de ocupantes', () => {
  it.each([['3P', 3], ['4P', 4], ['5_6P', 6]] as const)('%s permite como máximo %i plazas humanas o bots', (size, limit) => {
    let state = lobby(size);
    const snapshot = JSON.stringify(state.board);
    expect(state.config.maxPlayers).toBe(limit);
    expect(getRoomPlayerLimit(state.config)).toBe(limit);
    state = applyGameAction(state, 'HOST', { type: 'UPDATE_CONFIG', config: { victoryPointsTarget: 15 } }).state;
    expect(state.config.maxPlayers).toBe(limit);
    state = applyGameAction(state, 'HOST', { type: 'FILL_ROOM_WITH_BOTS' }).state;
    expect(state.players).toHaveLength(limit);
    expect(JSON.stringify(state.board)).toBe(snapshot);
    expect(applyGameAction(state, 'HOST', { type: 'ADD_BOT' }).error).toContain('mapa mayor');
    const started = applyGameAction(state, 'HOST', { type: 'START_GAME' });
    expect(started.error).toBeUndefined();
    expect(started.state.phase).toBe('ORDER_ROLL');
  });

  it('exige escoger un mapa mayor antes de aumentar el número de plazas', () => {
    let state = applyGameAction(lobby('3P'), 'HOST', { type: 'FILL_ROOM_WITH_BOTS' }).state;
    const bypass = applyGameAction(state, 'HOST', { type: 'UPDATE_CONFIG', config: { maxPlayers: 6 } });
    expect(bypass.error).toContain('modalidad de mapa mayor');
    expect(bypass.state).toBe(state);
    state = applyGameAction(state, 'HOST', { type: 'UPDATE_CONFIG', config: { seafarersBoardSize: '5_6P' } }).state;
    expect(state.config.maxPlayers).toBe(6);
    state = applyGameAction(state, 'HOST', { type: 'FILL_ROOM_WITH_BOTS' }).state;
    expect(state.players).toHaveLength(6);
    const smaller = applyGameAction(state, 'HOST', { type: 'UPDATE_CONFIG', config: { seafarersBoardSize: '4P' } });
    expect(smaller.error).toContain('Retira jugadores');
    expect(smaller.state).toBe(state);
  });

  it('mantiene el montaje regenerado al añadir o retirar jugadores y al iniciar con menos plazas', () => {
    let state = lobby('5_6P');
    state = applyGameAction(state, 'HOST', { type: 'GENERATE_BOARD' }).state;
    const snapshot = JSON.stringify(state.board);
    state = applyGameAction(state, 'HOST', { type: 'ADD_BOT' }).state;
    state = applyGameAction(state, 'HOST', { type: 'ADD_BOT' }).state;
    state = applyGameAction(state, 'HOST', { type: 'REMOVE_PLAYER', targetPlayerId: state.players[2].id }).state;
    expect(state.players).toHaveLength(2);
    expect(JSON.stringify(state.board)).toBe(snapshot);
    const started = applyGameAction(state, 'HOST', { type: 'START_GAME' });
    expect(started.error).toBeUndefined();
    expect(JSON.stringify(started.state.board)).toBe(snapshot);
    expect(started.state.bank.WOOD).toBe(24);
  });

  it('rechaza modalidades desconocidas y empezar una partida que exceda su límite', () => {
    const state = lobby('3P');
    expect(applyGameAction(state, 'HOST', { type: 'UPDATE_CONFIG', config: { seafarersBoardSize: 'INVALID' as SeafarersBoardSize } }).error).toBeDefined();
    state.players = Array.from({ length: 4 }, (_, i) => ({ ...state.players[0], id: i === 0 ? 'HOST' : `BOT_${i}` }));
    expect(applyGameAction(state, 'HOST', { type: 'START_GAME' }).error).toContain('modalidad');
  });

  it('regenera Oceanía conservando sus descubrimientos y los prepara al iniciar', () => {
    let state = lobby('5_6P');
    state = applyGameAction(state, 'HOST', { type: 'UPDATE_CONFIG', config: { seafarersScenario: 'OCEANIA' } }).state;
    const deck = state.board.fogDeck;
    state = applyGameAction(state, 'HOST', { type: 'GENERATE_BOARD' }).state;
    expect(state.board.fogDeck).toEqual(deck);
    state = applyGameAction(state, 'HOST', { type: 'ADD_BOT' }).state;
    const result = applyGameAction(state, 'HOST', { type: 'START_GAME' });
    expect(result.error).toBeUndefined();
    expect(result.state.board.fogDeck?.map(h => h.terrain).sort()).toEqual(deck?.map(h => h.terrain).sort());
    expect(result.state.board.fogDeck?.map(h => h.numberToken).sort()).toEqual(deck?.map(h => h.numberToken).sort());
  });

  it('restaura el montaje inicial de A través del desierto de cuatro jugadores con el trigo 12 en la esquina inferior derecha', () => {
    let state = lobby('4P');
    state = applyGameAction(state, 'HOST', { type: 'UPDATE_CONFIG', config: { seafarersScenario: 'THROUGH_THE_DESERT' } }).state;
    const initial = state.board;
    state = applyGameAction(state, 'HOST', { type: 'GENERATE_BOARD' }).state;
    expect(state.board.seafarersSetup).toBe('VARIABLE');
    state = applyGameAction(state, 'HOST', { type: 'GENERATE_BOARD', randomizeVariableSetup: false }).state;
    expect(state.board.seafarersSetup).toBe('INITIAL');
    expect(state.board).toEqual(initial);
    expect(state.board.hexes['1,3,-4']).toMatchObject({ terrain: 'WHEAT', numberToken: 12 });
    expect(state.board.hexes['0,3,-3']).toMatchObject({ terrain: 'ORE', numberToken: 6 });
    expect(state.board.hexes['2,2,-4'].terrain).toBe('SEA');
  });
});
