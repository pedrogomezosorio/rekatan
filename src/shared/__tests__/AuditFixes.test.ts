import { describe, expect, it } from 'vitest';
import {
  applyGameAction,
  createConfiguredGameState,
  createInitialGameState,
} from '../engine/RulesEngine';
import { normalizeBoardCamera, zoomBoardCamera } from '../boardCamera';
import { sanitizeStateForPlayer } from '../../../server/sanitizeState';
import { createEmptyResources } from '../constants';
import type { GameAction, GameState } from '../types';

function mustAct(state: GameState, playerId: string, action: GameAction): GameState {
  const res = applyGameAction(state, playerId, action);
  if (res.error) throw new Error(`${action.type}: ${res.error}`);
  return res.state;
}

function makeEPState(code: string): GameState {
  let s = createInitialGameState(code, { id: 'P1', name: 'Capitana', color: 'RED', avatar: 'I' });
  s = mustAct(s, 'P1', {
    type: 'UPDATE_CONFIG',
    config: {
      expansionModule: 'EXPLORERS_AND_PIRATES',
      explorersPiratesScenario: 'EXPLORERS_AND_PIRATES_FULL',
      boardMode: 'STANDARD_3_4',
      maxPlayers: 4,
    },
  });
  s = mustAct(s, 'P1', { type: 'ADD_BOT' });
  s = mustAct(s, 'P1', { type: 'ADD_BOT' });
  s = mustAct(s, 'P1', { type: 'START_GAME' });
  s.phase = 'MAIN_PHASE';
  s.turn.activePlayerId = 'P1';
  s.turn.hasRolledDice = true;
  return s;
}

function makeMBState(code: string): GameState {
  let s = createInitialGameState(code, { id: 'P1', name: 'Mercader', color: 'RED', avatar: 'I' });
  s = mustAct(s, 'P1', {
    type: 'UPDATE_CONFIG',
    config: {
      expansionModule: 'BARBARIANS',
      barbariansScenario: 'TRADERS_AND_BARBARIANS',
      boardMode: 'STANDARD_3_4',
      maxPlayers: 4,
    },
  });
  s = mustAct(s, 'P1', { type: 'ADD_BOT' });
  s = mustAct(s, 'P1', { type: 'ADD_BOT' });
  s = mustAct(s, 'P1', { type: 'START_GAME' });
  s.phase = 'MAIN_PHASE';
  s.turn.activePlayerId = 'P1';
  s.turn.hasRolledDice = true;
  return s;
}

describe('Verificación de correcciones QA (motor, expansiones, cámara y privacidad)', () => {
  it('impide que barcos de Piratas y Exploradores naveguen por aristas terrestres interiores', () => {
    const s = makeEPState('EPWATER');
    const coastalEdge = Object.values(s.board.edges).find((e) => e.isCoastal);
    expect(coastalEdge).toBeDefined();

    const inlandAdj = Object.values(s.board.edges).find(
      (e) =>
        e.id !== coastalEdge!.id &&
        e.isLand &&
        !e.isCoastal &&
        e.vertexIds.some((vid) => coastalEdge!.vertexIds.includes(vid))
    );
    expect(inlandAdj).toBeDefined();

    s.explorersPirates!.ships['ship-test'] = {
      id: 'ship-test',
      playerId: 'P1',
      edgeId: coastalEdge!.id,
      cargo: [],
      mpRemaining: 4,
      hasMovedThisTurn: false,
      boostedThisTurn: false,
      paidPirateTributeThisTurn: false,
    };

    const res = applyGameAction(s, 'P1', {
      type: 'EP_MOVE_SHIP',
      shipId: 'ship-test',
      toEdgeId: inlandAdj!.id,
    });
    expect(res.error).toBeTruthy();
  });

  it('permite embarcar tripulación desde una Guarida Pirata conquistada (EP_PICKUP_LAIR_UNIT)', () => {
    const s = makeEPState('EPLAIR');
    const seaHex = Object.values(s.board.hexes).find((h) => h.terrain === 'SEA')!;
    const adjEdge = Object.values(s.board.edges).find((e) => e.hexIds.includes(seaHex.id))!;

    s.explorersPirates!.pirateLairs[seaHex.id] = {
      hexId: seaHex.id,
      numberToken: 5,
      conquered: true,
      unitsByPlayer: { P1: 2 },
      waitingPickupByPlayer: { P1: 2 },
    };
    s.explorersPirates!.ships['ship-pickup'] = {
      id: 'ship-pickup',
      playerId: 'P1',
      edgeId: adjEdge.id,
      cargo: [],
      mpRemaining: 4,
      hasMovedThisTurn: false,
      boostedThisTurn: false,
      paidPirateTributeThisTurn: false,
    };

    const res = applyGameAction(s, 'P1', {
      type: 'EP_PICKUP_LAIR_UNIT',
      shipId: 'ship-pickup',
      hexId: seaHex.id,
    });
    expect(res.error).toBeUndefined();
    expect(res.state.explorersPirates!.ships['ship-pickup'].cargo).toEqual(['CREW', 'CREW']);
    expect(res.state.explorersPirates!.pirateLairs[seaHex.id].waitingPickupByPlayer['P1']).toBe(0);
  });

  it('valida turno en MB_MOVE_EDGE_BARBARIAN e impide mover bárbaros fuera de turno', () => {
    const s = makeMBState('MBTURN');
    const guest = s.players.find((p) => p.id !== 'P1')!;
    const landEdges = Object.values(s.board.edges).filter((e) => e.isLand);
    s.barbarians!.edgeBarbarians = [landEdges[0].id];

    const outOfTurn = applyGameAction(s, guest.id, {
      type: 'MB_MOVE_EDGE_BARBARIAN',
      fromEdgeId: landEdges[0].id,
      toEdgeId: landEdges[1].id,
    });
    expect(outOfTurn.error).toBeTruthy();

    const inTurn = applyGameAction(s, 'P1', {
      type: 'MB_MOVE_EDGE_BARBARIAN',
      fromEdgeId: landEdges[0].id,
      toEdgeId: landEdges[1].id,
    });
    expect(inTurn.error).toBeUndefined();
    expect(inTurn.state.barbarians!.edgeBarbarians).toContain(landEdges[1].id);
  });

  it('impide a invitados reanudar una partida pausada por el anfitrión y conserva el temporizador restante', () => {
    const s = createConfiguredGameState(
      'PAUSE1',
      { id: 'P1', name: 'Anfitrión', color: 'RED', avatar: 'I' },
      { preset: 'BASE_3_4', playWithBots: true, playerCount: 3 }
    );
    s.phase = 'MAIN_PHASE';
    s.config.turnTimerSeconds = 60;
    s.turn.isPausedByHost = true;
    s.turn.pausedRemainingTimerMs = 25000;

    const guest = s.players.find((p) => !p.isHost)!;
    const guestAttempt = applyGameAction(s, guest.id, { type: 'RESUME_GAME' });
    expect(guestAttempt.error).toBeTruthy();
    expect(guestAttempt.state.turn.isPausedByHost).toBe(true);

    const now = 1_700_000_000_000;
    const hostResume = applyGameAction(s, 'P1', { type: 'RESUME_GAME' }, { now, random: Math.random });
    expect(hostResume.error).toBeUndefined();
    expect(hostResume.state.turn.isPausedByHost).toBe(false);
    expect(hostResume.state.turn.turnDeadlineMs).toBe(now + 25000);
  });

  it('permite límites dinámicos de cámara para tableros grandes sin romper el valor por defecto', () => {
    const bigBounds = { maxX: 1600, maxY: 1300 };
    expect(normalizeBoardCamera({ x: 1100, y: -900, zoom: 1.5 }, bigBounds)).toEqual({
      x: 1100,
      y: -900,
      zoom: 1.5,
    });
    const zoomed = zoomBoardCamera({ x: 900, y: 0, zoom: 1.4 }, 1.1, { x: 900, y: 0 }, bigBounds);
    expect(zoomed.x).toBeCloseTo(900);
  });

  it('sanitiza manos rivales, PV ocultos y secretos de niebla por jugador', () => {
    const s = makeEPState('SECRET');
    const rivalOrig = s.players.find((p) => p.id !== 'P1')!;
    rivalOrig.resources = { ...createEmptyResources(), ORE: 3, WHEAT: 2 };
    rivalOrig.publicVictoryPoints = 4;
    rivalOrig.totalVictoryPoints = 6;
    rivalOrig.devCards = [
      { id: 'vp-1', type: 'VICTORY_POINT', title: 'Biblioteca', played: false, boughtAtTurn: 1 },
    ];

    const viewForP1 = sanitizeStateForPlayer(s, 'P1');
    const rival = viewForP1.players.find((p) => p.id === rivalOrig.id)!;
    expect(rival.resources.ORE).toBe(0);
    expect(rival.resources.WHEAT).toBe(0);
    expect(rival.resources.WOOD).toBe(5);
    expect(rival.totalVictoryPoints).toBe(4);
    expect(rival.devCards[0].type).toBe('KNIGHT');
    const secrets = Object.values(viewForP1.explorersPirates!.unexploredSecrets);
    expect(secrets.length).toBeGreaterThan(0);
    expect(secrets.every((sec) => sec.numberToken === null && sec.terrain === 'SEA')).toBe(true);
    expect(secrets.some((sec) => sec.region === 'NORTH_GREEN')).toBe(true);
  });

  it('conserva las 3 mercancías de Ciudades y Caballeros en tratos propuestos, completados y crónicas', () => {
    let ck = createInitialGameState('CKTRD1', {
      id: 'P1',
      name: 'Ana',
      color: 'RED',
      avatar: '👑',
    });
    ck = mustAct(ck, 'P1', {
      type: 'UPDATE_CONFIG',
      config: {
        expansionModule: 'CITIES_AND_KNIGHTS',
        enabledExpansions: ['BASE', 'CITIES_AND_KNIGHTS'],
      },
    });
    ck.players.push({
      ...ck.players[0],
      id: 'P2',
      name: 'Beto',
      color: 'BLUE',
      isHost: false,
      isBot: true,
      botDifficulty: 'EASY',
      resources: { ...createEmptyResources(), PAPER: 1, CLOTH: 2, COIN: 1 },
    });
    ck.players[0].resources = { ...createEmptyResources(), PAPER: 2, CLOTH: 1, COIN: 2 };
    ck.phase = 'MAIN_PHASE';
    ck.turn.activePlayerId = 'P1';
    ck.turn.diceRoll = [3, 4];
    ck.turn.hasRolledDice = true;

    const proposed = applyGameAction(ck, 'P1', {
      type: 'CREATE_TRADE_OFFER',
      targetPlayerId: 'P2',
      offer: { ...createEmptyResources(), PAPER: 1, COIN: 1 },
      request: { ...createEmptyResources(), CLOTH: 2 },
    });
    expect(proposed.error).toBeUndefined();
    expect(proposed.state.activeTradeOffers).toHaveLength(1);
    const offer = proposed.state.activeTradeOffers[0];
    expect(offer.offer.PAPER).toBe(1);
    expect(offer.offer.COIN).toBe(1);
    expect(offer.request.CLOTH).toBe(2);
    expect(proposed.state.logs[0].message).toContain('Papel');
    expect(proposed.state.logs[0].message).toContain('Moneda');
    expect(proposed.state.logs[0].message).toContain('Tela');

    const executed = applyGameAction(proposed.state, 'P1', {
      type: 'EXECUTE_TRADE_OFFER',
      offerId: offer.id,
      partnerPlayerId: 'P2',
    });
    expect(executed.error).toBeUndefined();
    expect(executed.state.lastCompletedTrade?.offered.PAPER).toBe(1);
    expect(executed.state.lastCompletedTrade?.offered.COIN).toBe(1);
    expect(executed.state.lastCompletedTrade?.requested.CLOTH).toBe(2);
    expect(executed.state.lastEvent?.completedTrade?.offered.PAPER).toBe(1);
    expect(executed.state.lastEvent?.completedTrade?.offered.COIN).toBe(1);
    expect(executed.state.lastEvent?.completedTrade?.requested.CLOTH).toBe(2);
    expect(executed.state.logs[0].message).toContain('Papel');
    expect(executed.state.logs[0].message).toContain('Moneda');
    expect(executed.state.logs[0].message).toContain('Tela');
  });
});
