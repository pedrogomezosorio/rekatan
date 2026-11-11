import { describe, expect, it } from 'vitest';
import { ROOM_PRESETS, parseRoomCreationOptions } from '../roomPresets';
import { applyGameAction, createConfiguredGameState } from '../engine/RulesEngine';

const host = { id: 'HOST', name: 'Colona', color: 'RED' as const, avatar: 'I' };

describe('Modalidades visibles al crear sala', () => {
  it.each(['CITIES_KNIGHTS_3_4', 'CITIES_KNIGHTS_5_6'] as const)('crea %s antes de publicar el primer estado de sala', preset => {
    const s = createConfiguredGameState('CREATE', host, { preset });
    const large = preset.endsWith('5_6');
    expect(s.phase).toBe('LOBBY'); expect(s.config.expansionModule).toBe('CITIES_AND_KNIGHTS'); expect(s.config.enabledExpansions).toContain('CITIES_AND_KNIGHTS');
    expect(s.config.maxPlayers).toBe(large ? 6 : 4); expect(s.config.victoryPointsTarget).toBe(13);
    expect(Object.values(s.board.hexes).filter(h => h.terrain !== 'SEA')).toHaveLength(large ? 30 : 19);
  });
  it.each([3, 4, 5, 6])('Jugar con bots empieza una partida válida de %s jugadores con todas las piezas', count => {
    const s = createConfiguredGameState('PLAY', host, { preset: count < 5 ? 'CITIES_KNIGHTS_3_4' : 'CITIES_KNIGHTS_5_6', playWithBots: true, playerCount: count, botDifficulty: 'HARD' });
    expect(s.players).toHaveLength(count); expect(s.players.filter(p => p.isBot)).toHaveLength(count - 1);
    expect(s.phase).toBe('SETUP_SETTLEMENT_1'); expect(s.turn.setupOrder).toHaveLength(count * 2);
    expect(s.bank.PAPER).toBe(count < 5 ? 12 : 18); expect(s.bank.CLOTH).toBe(count < 5 ? 12 : 18); expect(s.bank.COIN).toBe(count < 5 ? 12 : 18);
    expect(s.devDeck).toEqual([]); expect(s.largestArmyPlayerId).toBeNull(); expect(s.citiesKnights?.barbarianPosition).toBe(0);
    expect(Object.values(s.citiesKnights!.decks).map(cards => cards.length)).toEqual([18, 18, 18]);
    for (const p of s.players) { expect(p.citiesKnights?.improvements).toEqual({ SCIENCE: 0, POLITICS: 0, TRADE: 0 }); expect(p.settlementsLeft).toBe(5); expect(p.citiesLeft).toBe(4); expect(p.resources.PAPER).toBe(0); }
  });
  it('permite completar un lobby ya creado, conservando a los jugadores invitados', () => {
    let s = createConfiguredGameState('LOBBY', host, { preset: 'CITIES_KNIGHTS_3_4' });
    s = applyGameAction(s, 'HOST', { type: 'ADD_BOT' }).state; const invited = s.players[1].id;
    const started = applyGameAction(s, 'HOST', { type: 'START_WITH_BOTS' });
    expect(started.error).toBeUndefined(); expect(started.state.players).toHaveLength(4); expect(started.state.players.some(p => p.id === invited)).toBe(true); expect(started.state.phase).toBe('SETUP_SETTLEMENT_1');
  });
  it.each(Object.keys(ROOM_PRESETS))('mantiene operativa la modalidad %s', preset => {
    expect(() => createConfiguredGameState('ALL', host, { preset })).not.toThrow();
  });
  it.each([null, {}, { preset: 'OTHER' }, { preset: '__proto__' }, { preset: 'CITIES_KNIGHTS_3_4', playerCount: 6 }, { preset: 'CITIES_KNIGHTS_5_6', playerCount: 3 }, { preset: 'CITIES_KNIGHTS_3_4', playWithBots: 'yes' }, { preset: 'CITIES_KNIGHTS_3_4', botDifficulty: 'OTHER' }])('rechaza opciones inválidas sin crear una partida diferente: %j', options => {
    expect(() => parseRoomCreationOptions(options)).toThrow();
  });
  it('mantiene clientes antiguos sin selección de modalidad', () => {
    const s = createConfiguredGameState('OLD', host); expect(s.phase).toBe('LOBBY'); expect(s.config.expansionModule).toBe('BASE');
  });
  it('impide iniciar con bots en nombre de otro jugador o superar la capacidad del mapa', () => {
    const s = createConfiguredGameState('GUARD', host, { preset: 'CITIES_KNIGHTS_3_4' });
    expect(applyGameAction(s, 'HOST', { type: 'START_WITH_BOTS', playerCount: 6 }).error).toBeDefined();
    expect(applyGameAction(s, 'HOST', { type: 'START_WITH_BOTS', playerCount: 2 }).state).toBe(s);
  });
});
