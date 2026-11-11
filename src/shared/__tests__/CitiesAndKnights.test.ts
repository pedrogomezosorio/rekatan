import { describe, expect, it } from 'vitest';
import { ALL_RESOURCES, ALL_TRADE_CARDS, createEmptyResources, countTotalResources } from '../constants';
import { BRANCH_META, CK_BRANCHES, PROGRESS_CARDS, emptyCKPlayer, safeHandLimit } from '../citiesKnightsConfig';
import { automaticCKChoice, initializeCitiesKnights, knightReachableVertices, produceCitiesKnightsResources, resolveBarbarianAttack } from '../engine/CitiesAndKnights';
import { applyGameAction, canBuyDevCard, createInitialGameState, executeAction, executeBotStepIfNeeded, getPlayerBankTradeRatios, getValidCityVertices, getValidRoadEdges, getValidSettlementVertices, recalculateVictoryPoints } from '../engine/RulesEngine';
import { calculatePlayerLongestRoad } from '../engine/LongestRoad';
import type { GameAction, GameState, ImprovementBranch, ProgressCardType, ResourceType } from '../types';
import type { BoardKnight, ProgressPayload, RuleContext } from '../citiesKnightsTypes';
import { RoomStore } from '../../../server/roomStore';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const entropy: RuleContext = { random: () => 0.25, now: 1_000_000 };
function game(extended = false): GameState {
  let s = createInitialGameState('CKTEST', { id: 'P1', name: 'Ana', color: 'RED', avatar: 'A' });
  s = applyGameAction(s, 'P1', { type: 'UPDATE_CONFIG', config: { expansionModule: 'CITIES_AND_KNIGHTS', boardMode: extended ? 'EXPANSION_5_6' : 'STANDARD_3_4', turnTimerSeconds: null } }, entropy).state;
  const host = structuredClone(s.players[0]);
  s.players = [host, { ...structuredClone(host), id: 'P2', name: 'Bea', color: 'BLUE', isHost: false }, { ...structuredClone(host), id: 'P3', name: 'Carla', color: 'WHITE', isHost: false }];
  const result = applyGameAction(s, 'P1', { type: 'START_GAME' }, entropy); expect(result.error).toBeUndefined(); s = result.state;
  for (const v of Object.values(s.board.vertices)) v.port = null;
  for (const h of Object.values(s.board.hexes)) h.numberToken = null;
  s.phase = 'MAIN_PHASE'; s.turn.activePlayerId = 'P1'; s.turn.hasRolledDice = true; s.turn.turnNumber = 5;
  return s;
}
function act(s: GameState, action: GameAction, id = 'P1', ctx = entropy): GameState {
  const result = applyGameAction(s, id, action, ctx); expect(result.error, `${action.type}: ${result.error}`).toBeUndefined(); return result.state;
}
function city(s: GameState, id = 'P1', index = 0): string {
  const v = Object.values(s.board.vertices).filter(v => !v.building && !v.knight)[index]; v.building = 'CITY'; v.playerId = id;
  s.players.find(p => p.id === id)!.citiesLeft--; return v.id;
}
function rich(s: GameState, id = 'P1'): void { const p = s.players.find(p => p.id === id)!; for (const r of ALL_TRADE_CARDS) p.resources[r] = 20; }
function knight(s: GameState, id = 'P1', rank: 1 | 2 | 3 = 1, active = true, vid?: string): string {
  const v = vid ? s.board.vertices[vid] : Object.values(s.board.vertices).find(v => !v.building && !v.knight)!;
  v.knight = { playerId: id, rank, active, activatedOnTurn: 1, promotedOnTurn: -1, actedOnTurn: -1 }; return v.id;
}
function giveCard(s: GameState, type: ProgressCardType, id = 'P1'): string {
  const meta = PROGRESS_CARDS[type]; const deck = s.citiesKnights!.decks[meta.branch]; const index = deck.findIndex(c => c.type === type); const [c] = deck.splice(index, 1); s.players.find(p => p.id === id)!.citiesKnights!.progressCards.push(c); return c.id;
}
function progress(s: GameState, type: ProgressCardType, payload?: ProgressPayload): GameState { const cardId = giveCard(s, type); return act(s, { type: 'PLAY_PROGRESS_CARD', cardId, payload }); }
function dice(s: GameState, pair: [number, number] = [2, 3], eventDie: RuleContext['eventDie'] = 'BARBARIAN'): GameState {
  s.phase = 'WAITING_FOR_DICE'; s.turn.hasRolledDice = false;
  return act(s, { type: 'ROLL_DICE' }, 'P1', { ...entropy, dice: pair, eventDie });
}
function settleChoices(s: GameState): GameState {
  let guard = 0;
  while (s.citiesKnights!.choices.length && guard++ < 30) { const c = automaticCKChoice(s)!; s = act(s, c.action, c.playerId); }
  return s;
}

describe('Ciudades y Caballeros: preparación y compatibilidad', () => {
  it('usa 54 cartas oficiales, 18 por rama, 12 mercancías por tipo y ninguna carta de desarrollo', () => {
    const s = game(); expect(s.devDeck).toEqual([]); expect(s.bank.PAPER).toBe(12); expect(s.largestArmyPlayerId).toBeNull();
    for (const b of CK_BRANCHES) expect(s.citiesKnights!.decks[b]).toHaveLength(18);
    expect(canBuyDevCard(s, 'P1').allowed).toBe(false); expect(s.config.victoryPointsTarget).toBe(13);
    expect(game(true).bank.COIN).toBe(18);
  });
  it('funda un poblado sin recursos y después una ciudad con un recurso básico por terreno', () => {
    let s = game(); s.phase = 'ORDER_ROLL';
    s = act(s, { type: 'SET_CUSTOM_PLAYER_ORDER', playerIds: ['P1', 'P2', 'P3'] }); s = act(s, { type: 'CONFIRM_TURN_ORDER' });
    for (let n = 0; n < 6; n++) {
      const id = s.turn.activePlayerId; const v = getValidSettlementVertices(s, id)[0]; const before = countTotalResources(s.players.find(p => p.id === id)!.resources);
      s = act(s, { type: 'PLACE_SETTLEMENT', vertexId: v }, id);
      expect(s.board.vertices[v].building).toBe(n < 3 ? 'SETTLEMENT' : 'CITY');
      if (n < 3) expect(countTotalResources(s.players.find(p => p.id === id)!.resources)).toBe(before);
      s = act(s, { type: 'PLACE_ROAD', edgeId: getValidRoadEdges(s, id)[0] }, id);
    }
    expect(s.phase).toBe('WAITING_FOR_DICE'); expect(s.turn.activePlayerId).toBe('P1');
    for (const p of s.players) { expect(p.settlementsLeft).toBe(4); expect(p.citiesLeft).toBe(3); expect(p.resources.PAPER).toBe(0); }
  });
  it('rechaza menos de tres jugadores y no permite encoger el mapa con cinco jugadores', () => {
    let s = game(true); s.phase = 'LOBBY'; s.players = s.players.slice(0, 2);
    expect(applyGameAction(s, 'P1', { type: 'START_GAME' }).error).toContain('3 a 6');
    s.players.push(...[3, 4, 5].map(i => ({ ...structuredClone(s.players[0]), id: `P${i}`, isHost: false })));
    expect(applyGameAction(s, 'P1', { type: 'UPDATE_CONFIG', config: { boardMode: 'STANDARD_3_4' } }).error).toBeDefined();
  });
  it('combina Navegantes sin cambiar el mapa seleccionado y suma dos PV al escenario', () => {
    let s = game(); s.phase = 'LOBBY';
    s = act(s, { type: 'UPDATE_CONFIG', config: { expansionModule: 'SEAFARERS', enabledExpansions: ['BASE', 'SEAFARERS', 'CITIES_AND_KNIGHTS'], seafarersScenario: 'THROUGH_THE_DESERT', seafarersBoardSize: '4P' } });
    expect(s.config.expansionModule).toBe('SEAFARERS'); expect(s.config.victoryPointsTarget).toBe(16); expect(s.board.seafarersScenario).toBe('THROUGH_THE_DESERT');
    const board = structuredClone(s.board);
    s = act(s, { type: 'UPDATE_CONFIG', config: { expansionModule: 'SEAFARERS', enabledExpansions: ['BASE', 'SEAFARERS'] } });
    expect(s.board).toEqual(board); expect(s.config.victoryPointsTarget).toBe(14);
    s = act(s, { type: 'UPDATE_CONFIG', config: { expansionModule: 'SEAFARERS', enabledExpansions: ['BASE', 'SEAFARERS', 'CITIES_AND_KNIGHTS'] } });
    expect(s.board).toEqual(board); expect(s.config.victoryPointsTarget).toBe(16);
    s = act(s, { type: 'UPDATE_CONFIG', config: { expansionModule: 'CITIES_AND_KNIGHTS', enabledExpansions: ['BASE', 'CITIES_AND_KNIGHTS'] } });
    expect(s.board.seafarersScenario).toBeUndefined(); expect(s.config.victoryPointsTarget).toBe(13);
    expect(Object.values(s.board.hexes).filter(h => h.terrain !== 'SEA')).toHaveLength(19);
  });
  it('el despachador es puro y reproduce la misma acción con dados, reloj y azar explícitos', () => {
    const s = game(); s.phase = 'WAITING_FOR_DICE'; city(s); const before = structuredClone(s);
    const context = { ...entropy, dice: [2, 3] as [number, number], eventDie: 'SCIENCE' as const };
    expect(executeAction(s, 'P1', { type: 'ROLL_DICE' }, context)).toEqual(executeAction(s, 'P1', { type: 'ROLL_DICE' }, context)); expect(s).toEqual(before);
  });
  it.each(['STANDARD_3_4', 'EXPANSION_5_6'] as const)('regenerar %s es reproducible con semilla y reloj explícitos', mode => {
    const s = game(); s.phase = 'LOBBY';
    const seeded = () => { let seed = 77; return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; };
    const action = { type: 'GENERATE_BOARD', mode } as const;
    const first = executeAction(s, 'P1', action, { now: 3000, random: seeded() });
    const second = executeAction(s, 'P1', action, { now: 3000, random: seeded() });
    expect(first.error).toBeUndefined(); expect(first).toEqual(second);
  });
  it('rechaza las dos combinaciones que dependen de cartas de desarrollo sin perder la sala', () => {
    const s = game(); s.phase = 'LOBBY';
    for (const scenario of ['THE_FORGOTTEN_TRIBE', 'THE_PIRATE_ISLANDS'] as const) {
      const result = applyGameAction(s, 'P1', { type: 'UPDATE_CONFIG', config: { expansionModule: 'SEAFARERS', enabledExpansions: ['BASE', 'SEAFARERS', 'CITIES_AND_KNIGHTS'], seafarersScenario: scenario } });
      expect(result.error).toContain('cartas de desarrollo'); expect(result.state).toBe(s);
    }
  });
});

describe('Economía, dados y Acueducto', () => {
  it.each([['WOOD', 'PAPER'], ['SHEEP', 'CLOTH'], ['ORE', 'COIN']] as const)('ciudad en %s produce un recurso y una mercancía %s', (r, commodity) => {
    const s = game(); const id = city(s); const h = s.board.hexes[s.board.vertices[id].hexIds[0]]; h.terrain = r; h.numberToken = 5; h.hasRobber = false;
    for (const other of Object.values(s.board.hexes)) if (other.id !== h.id) other.numberToken = null;
    const after = dice(s); expect(after.players[0].resources[r]).toBe(1); expect(after.players[0].resources[commodity]).toBe(1);
  });
  it.each(['WHEAT', 'BRICK'] as const)('ciudad en %s produce dos recursos', r => {
    const s = game(); const id = city(s); const h = s.board.hexes[s.board.vertices[id].hexIds[0]]; h.terrain = r; h.numberToken = 5; h.hasRobber = false;
    for (const other of Object.values(s.board.hexes)) if (other.id !== h.id) other.numberToken = null;
    expect(dice(s).players[0].resources[r]).toBe(2);
  });
  it('una falta de papel no reemplaza la mercancía por madera ni perjudica su producción', () => {
    const s = game(); const v = city(s); const h = s.board.hexes[s.board.vertices[v].hexIds[0]]; h.terrain = 'WOOD'; h.numberToken = 5; h.hasRobber = false; s.bank.PAPER = 0;
    produceCitiesKnightsResources(s, 5, 1); expect(s.players[0].resources.WOOD).toBe(1); expect(s.players[0].resources.PAPER).toBe(0);
  });
  it('no favorece al primer jugador cuando falta un recurso para varios jugadores', () => {
    const s = game(); const h = Object.values(s.board.hexes).find(h => h.terrain === 'WOOD')!; h.numberToken = 5; h.hasRobber = false;
    const [a, b] = Object.values(s.board.vertices).filter(v => v.hexIds.includes(h.id)); a.building = b.building = 'CITY'; a.playerId = 'P1'; b.playerId = 'P2'; s.bank.WOOD = 1;
    produceCitiesKnightsResources(s, 5, 1); expect(s.players[0].resources.WOOD).toBe(0); expect(s.players[1].resources.WOOD).toBe(0); expect(s.players[0].resources.PAPER).toBe(1); expect(s.players[1].resources.PAPER).toBe(1);
  });
  it('Acueducto ofrece un recurso cuando no se produce, incluyendo el bloqueo del ladrón', () => {
    const s = game(); s.players[0].citiesKnights!.improvements.SCIENCE = 3; const v = city(s); const h = s.board.hexes[s.board.vertices[v].hexIds[0]]; h.numberToken = 5; h.hasRobber = true;
    for (const other of Object.values(s.board.hexes)) if (other.id !== h.id) other.numberToken = null;
    let after = dice(s); expect(after.phase).toBe('CK_CHOICE'); expect(after.citiesKnights!.choices[0].kind).toBe('AQUEDUCT');
    after = act(after, { type: 'RESOLVE_CK_CHOICE', resource: 'ORE' }); expect(after.players[0].resources.ORE).toBe(1); expect(after.phase).toBe('MAIN_PHASE');
  });
  it('Acueducto no da nada con siete ni cuando se recibió una mercancía', () => {
    const s = game(); s.players[0].citiesKnights!.improvements.SCIENCE = 3; expect(dice(s, [3, 4]).citiesKnights!.choices).toEqual([]);
    const v = city(s); const h = s.board.hexes[s.board.vertices[v].hexIds[0]]; h.terrain = 'WOOD'; h.numberToken = 5; h.hasRobber = false; s.bank.WOOD = 0;
    expect(dice(s).citiesKnights!.choices).toEqual([]);
  });
  it.each([1, 2, 3, 4, 5])('el nivel %s cubre el dado rojo hasta nivel +1', level => {
    const s = game(); s.players[0].citiesKnights!.improvements.SCIENCE = level;
    const after = dice(s, [level + 1, 1], 'SCIENCE'); expect(after.citiesKnights!.decks.SCIENCE.length).toBe(17);
    if (level < 5) expect(dice(s, [level + 2, 1], 'SCIENCE').citiesKnights!.decks.SCIENCE.length).toBe(18);
  });
  it('permite comerciar mercancías con banca, puertos y jugadores', () => {
    let s = game(); s.players[0].resources.PAPER = 4;
    s = act(s, { type: 'BANK_TRADE', giveResource: 'PAPER', giveAmount: 4, receiveResource: 'COIN', receiveAmount: 1 }); expect(s.players[0].resources.COIN).toBe(1);
    const v = city(s); s.board.vertices[v].port = { type: 'GENERIC', ratio: 3 }; expect(getPlayerBankTradeRatios(s, 'P1').PAPER).toBe(3);
    s.players[0].citiesKnights!.improvements.TRADE = 3; expect(getPlayerBankTradeRatios(s, 'P1').PAPER).toBe(2);
    s.players[1].resources.CLOTH = 1;
    s = act(s, { type: 'CREATE_TRADE_OFFER', targetPlayerId: 'P2', offer: { ...createEmptyResources(), COIN: 1 }, request: { ...createEmptyResources(), CLOTH: 1 } });
    s = act(s, { type: 'RESPOND_TRADE_OFFER', offerId: s.activeTradeOffers[0].id, response: 'ACCEPT' }, 'P2'); expect(s.players[0].resources.CLOTH).toBe(1); expect(s.players[1].resources.COIN).toBe(1);
  });
  it.each([NaN, -1, 0.5, Infinity])('rechaza cantidades de intercambio no válidas (%s)', n => {
    const s = game(); rich(s); const result = applyGameAction(s, 'P1', { type: 'BANK_TRADE', giveResource: 'WOOD', giveAmount: n, receiveResource: 'COIN', receiveAmount: 1 }); expect(result.error).toBeDefined(); expect(result.state).toBe(s);
  });
});

describe('Invasiones y murallas según los PDF adjuntos', () => {
  it('empate en fuerzas defiende Catán y el único máximo gana Campeador; se agotan todos', () => {
    const s = game(); city(s); city(s, 'P2'); knight(s, 'P1', 2); resolveBarbarianAttack(s);
    expect(s.citiesKnights!.lastBattle).toMatchObject({ won: true, barbarians: 2, defenders: 2, defenderIds: ['P1'] }); expect(s.players[0].citiesKnights!.defenderPoints).toBe(1);
    expect(Object.values(s.board.vertices).find(v => v.knight)?.knight!.active).toBe(false); expect(s.citiesKnights!.firstAttackResolved).toBe(true); expect(s.citiesKnights!.barbarianPosition).toBe(0);
  });
  it('máximos empatados eligen progreso sin recibir un punto', () => {
    let s = game(); city(s); knight(s, 'P1'); knight(s, 'P2'); resolveBarbarianAttack(s); s.phase = 'CK_CHOICE';
    expect(s.citiesKnights!.choices.map(c => c.playerId)).toEqual(['P1', 'P2']); s = settleChoices(s); expect(s.players[0].citiesKnights!.defenderPoints).toBe(0); expect(s.players[0].citiesKnights!.progressCards).toHaveLength(1);
  });
  it('puede perderse la única ciudad, su muralla y todas sus mejoras', () => {
    let s = game(); const id = city(s); s.board.vertices[id].cityWall = true; s.players[0].citiesKnights!.improvements.SCIENCE = 3;
    resolveBarbarianAttack(s); s.phase = 'CK_CHOICE'; s = act(s, { type: 'RESOLVE_CK_CHOICE', vertexId: id });
    expect(s.board.vertices[id].building).toBe('SETTLEMENT'); expect(s.board.vertices[id].cityWall).toBeUndefined(); expect(s.players[0].citiesKnights!.improvements.SCIENCE).toBe(0);
  });
  it('excluye a jugadores sólo con metrópolis al comparar la contribución mínima', () => {
    const s = game(); const metro = city(s, 'P1'); s.board.vertices[metro].metropolis = 'SCIENCE'; city(s, 'P2'); city(s, 'P2'); knight(s, 'P2', 1);
    resolveBarbarianAttack(s); expect(s.citiesKnights!.lastBattle!.victimIds).toEqual(['P2']);
  });
  it('si no hay poblados de reserva deja ciudad reducida y exige repararla primero', () => {
    let s = game(); const id = city(s); s.players[0].settlementsLeft = 0; resolveBarbarianAttack(s); s.phase = 'CK_CHOICE'; s = act(s, { type: 'RESOLVE_CK_CHOICE', vertexId: id });
    expect(s.board.vertices[id].isDowngradedCity).toBe(true); rich(s); expect(getValidCityVertices(s, 'P1')).toEqual([id]); const left = s.players[0].citiesLeft;
    s = act(s, { type: 'UPGRADE_CITY', vertexId: id }); expect(s.players[0].citiesLeft).toBe(left); expect(s.players[0].settlementsLeft).toBe(0); expect(s.board.vertices[id].isDowngradedCity).toBeUndefined();
  });
  it('resuelve el asalto antes de producir y usa la ciudad degradada como poblado', () => {
    let s = game(); const id = city(s); const h = s.board.hexes[s.board.vertices[id].hexIds[0]]; h.terrain = 'WOOD'; h.numberToken = 5; h.hasRobber = false; s.citiesKnights!.barbarianPosition = 6;
    for (const other of Object.values(s.board.hexes)) if (other.id !== h.id) other.numberToken = null;
    s = dice(s); expect(s.phase).toBe('CK_CHOICE'); expect(s.players[0].resources.WOOD).toBe(0);
    s = act(s, { type: 'RESOLVE_CK_CHOICE', vertexId: id }); expect(s.players[0].resources.WOOD).toBe(1); expect(s.players[0].resources.PAPER).toBe(0);
  });
  it('el siete descarta antes del primer ataque, pero no permite mover ni robar', () => {
    let s = game(); s.players[0].resources.PAPER = 8; s = dice(s, [3, 4]); expect(s.phase).toBe('ROBBER_DISCARD');
    s = act(s, { type: 'DISCARD_RESOURCES', resources: { ...createEmptyResources(), PAPER: 4 } }); expect(s.phase).toBe('MAIN_PHASE');
    expect(applyGameAction(s, 'P1', { type: 'MOVE_ROBBER', hexId: Object.keys(s.board.hexes)[0] }).error).toBeDefined();
  });
  it('un primer ataque simultáneo al siete habilita el ladrón después del combate', () => {
    let s = game(); s.citiesKnights!.barbarianPosition = 6; city(s); s = dice(s, [3, 4]); s = settleChoices(s); expect(s.phase).toBe('ROBBER_MOVE');
  });
  it('cada muralla añade dos cartas seguras, hay tres piezas, y las mercancías cuentan', () => {
    let s = game(); rich(s); const ids = [city(s), city(s), city(s), city(s)];
    for (const id of ids.slice(0, 3)) s = act(s, { type: 'BUILD_CITY_WALL', vertexId: id });
    expect(safeHandLimit(s, 'P1')).toBe(13); expect(applyGameAction(s, 'P1', { type: 'BUILD_CITY_WALL', vertexId: ids[3] }).error).toBeDefined();
    s.players[0].resources = { ...createEmptyResources(), PAPER: 13 }; expect(dice(s, [3, 4]).players[0].mustDiscardCount).toBe(0);
    s.players[0].resources.PAPER = 14; expect(dice(s, [3, 4]).players[0].mustDiscardCount).toBe(7);
  });
});

describe('Caballeros y red de caminos', () => {
  it('recluta con oveja y mineral, activa con trigo, y no actúa el mismo turno', () => {
    let s = game(); const edge = Object.values(s.board.edges)[0]; edge.building = 'ROAD'; edge.playerId = 'P1'; const id = edge.vertexIds[0]; rich(s);
    s = act(s, { type: 'RECRUIT_KNIGHT', vertexId: id }); expect(s.players[0].resources.SHEEP).toBe(19); expect(s.players[0].resources.ORE).toBe(19); expect(s.players[0].resources.WHEAT).toBe(20);
    s = act(s, { type: 'ACTIVATE_KNIGHT', vertexId: id }); expect(s.players[0].resources.WHEAT).toBe(19);
    expect(applyGameAction(s, 'P1', { type: 'MOVE_KNIGHT', fromVertexId: id, toVertexId: edge.vertexIds[1] }).error).toBeDefined();
    s.turn.turnNumber++; s = act(s, { type: 'MOVE_KNIGHT', fromVertexId: id, toVertexId: edge.vertexIds[1] }); expect(s.board.vertices[edge.vertexIds[1]].knight!.active).toBe(false);
  });
  it('impone dos piezas por rango, un ascenso por turno y Fortaleza para poderosos', () => {
    let s = game(); rich(s); const id = knight(s, 'P1', 1); s = act(s, { type: 'PROMOTE_KNIGHT', vertexId: id });
    expect(applyGameAction(s, 'P1', { type: 'PROMOTE_KNIGHT', vertexId: id }).error).toBeDefined(); s.turn.turnNumber++;
    expect(applyGameAction(s, 'P1', { type: 'PROMOTE_KNIGHT', vertexId: id }).error).toContain('Fortaleza'); s.players[0].citiesKnights!.improvements.POLITICS = 3;
    s = act(s, { type: 'PROMOTE_KNIGHT', vertexId: id }); expect(s.board.vertices[id].knight!.rank).toBe(3);
    const a = knight(s, 'P1', 1); knight(s, 'P1', 2); knight(s, 'P1', 2); expect(applyGameAction(s, 'P1', { type: 'PROMOTE_KNIGHT', vertexId: a }).error).toContain('reserva');
  });
  it.each([true, false])('un caballero rival activo=%s interrumpe la ruta y su extensión', active => {
    const s = game(); const h = s.board.hexes['0,0,0']; const edges = Object.values(s.board.edges).filter(e => e.hexIds.includes(h.id));
    for (const e of edges.slice(0, 5)) { e.playerId = 'P1'; e.building = 'ROAD'; }
    const route = calculatePlayerLongestRoad(s.board, 'P1'); const a = s.board.edges[route.edgeIds[1]]; const b = s.board.edges[route.edgeIds[2]]; const middle = a.vertexIds.find(id => b.vertexIds.includes(id))!; knight(s, 'P2', 1, active, middle);
    expect(calculatePlayerLongestRoad(s.board, 'P1').length).toBeLessThan(5);
    const empty = Object.values(s.board.edges).find(e => e.vertexIds.includes(middle) && !e.building); if (empty) { rich(s); expect(getValidRoadEdges(s, 'P1')).not.toContain(empty.id); }
  });
  it('desplaza sólo a un rival más débil y conserva su estado al retirarlo', () => {
    let s = game(); const e = Object.values(s.board.edges)[0]; e.playerId = 'P1'; e.building = 'ROAD'; const [a, b] = e.vertexIds; knight(s, 'P1', 2, true, a); knight(s, 'P2', 1, true, b);
    const nextEdge = s.board.vertices[b].adjacentEdgeIds.map(id => s.board.edges[id]).find(x => x.id !== e.id)!; nextEdge.playerId = 'P2'; nextEdge.building = 'ROAD';
    s = act(s, { type: 'MOVE_KNIGHT', fromVertexId: a, toVertexId: b }); expect(s.citiesKnights!.choices[0].kind).toBe('RETREAT'); s = settleChoices(s);
    const rival = Object.values(s.board.vertices).find(v => v.knight?.playerId === 'P2'); expect(rival!.knight!.active).toBe(true); expect(s.board.vertices[b].knight!.active).toBe(false);
  });
  it('puede atravesar caballeros propios pero nunca rivales', () => {
    const s = game(); const e = Object.values(s.board.edges)[0]; const [a, b] = e.vertexIds; e.building = 'ROAD'; e.playerId = 'P1'; const e2 = s.board.vertices[b].adjacentEdgeIds.map(id => s.board.edges[id]).find(x => x.id !== e.id)!; e2.building = 'ROAD'; e2.playerId = 'P1'; const c = e2.vertexIds.find(id => id !== b)!;
    knight(s, 'P1', 1, true, a); knight(s, 'P1', 1, true, b); expect(knightReachableVertices(s, 'P1', a)).toContain(c);
    s.board.vertices[b].knight!.playerId = 'P2'; expect(knightReachableVertices(s, 'P1', a)).not.toContain(c);
  });
  it('expulsa el ladrón sólo desde un cruce adyacente y tras el primer ataque', () => {
    let s = game(); const h = s.board.hexes[s.board.robberHexId!]; const v = Object.values(s.board.vertices).find(v => v.hexIds.includes(h.id))!; knight(s, 'P1', 1, true, v.id);
    expect(applyGameAction(s, 'P1', { type: 'EXPEL_ROBBER', vertexId: v.id }).error).toBeDefined(); s.citiesKnights!.firstAttackResolved = true;
    s = act(s, { type: 'EXPEL_ROBBER', vertexId: v.id }); expect(s.phase).toBe('ROBBER_MOVE'); expect(s.board.vertices[v.id].knight!.active).toBe(false);
  });
});

describe('Mejoras y metrópolis', () => {
  it.each(CK_BRANCHES)('los niveles 1–5 de %s cuestan 1+2+3+4+5 mercancías', b => {
    let s = game(); rich(s); const v = city(s);
    for (let i = 0; i < 5; i++) s = act(s, { type: 'IMPROVE_CITY', branch: b, vertexId: v });
    expect(s.players[0].resources[BRANCH_META[b].commodity]).toBe(5); expect(s.players[0].citiesKnights!.improvements[b]).toBe(5); expect(s.board.vertices[v].metropolis).toBe(b);
  });
  it('el primer nivel cuatro obtiene la metrópolis y el cinco la arrebata; el empate no', () => {
    let s = game(); rich(s); rich(s, 'P2'); const a = city(s); const b = city(s, 'P2'); s.players[0].citiesKnights!.improvements.SCIENCE = 3;
    s = act(s, { type: 'IMPROVE_CITY', branch: 'SCIENCE', vertexId: a }); s.turn.activePlayerId = 'P2'; s.players[1].citiesKnights!.improvements.SCIENCE = 3;
    s = act(s, { type: 'IMPROVE_CITY', branch: 'SCIENCE', vertexId: b }, 'P2'); expect(s.citiesKnights!.metropolisOwners.SCIENCE).toBe('P1');
    s = act(s, { type: 'IMPROVE_CITY', branch: 'SCIENCE', vertexId: b }, 'P2'); expect(s.citiesKnights!.metropolisOwners.SCIENCE).toBe('P2'); expect(s.board.vertices[a].metropolis).toBeUndefined(); expect(s.players[1].publicVictoryPoints).toBe(4);
  });
  it('una ciudad ocupada por otra metrópolis impide llegar a cuatro en otra rama', () => {
    const s = game(); rich(s); const v = city(s); s.board.vertices[v].metropolis = 'SCIENCE'; s.citiesKnights!.metropolisOwners.SCIENCE = 'P1'; s.players[0].citiesKnights!.improvements.POLITICS = 3;
    expect(applyGameAction(s, 'P1', { type: 'IMPROVE_CITY', branch: 'POLITICS' }).error).toBeDefined();
  });
  it('sólo se gana en el turno propio, nunca durante construcción especial', () => {
    const s = game(true); s.players[1].citiesKnights!.defenderPoints = 13; s.phase = 'SPECIAL_BUILD_PHASE'; s.turn.activePlayerId = 'P2'; recalculateVictoryPoints(s); expect(s.winnerId).toBeNull();
    s.phase = 'WAITING_FOR_DICE'; recalculateVictoryPoints(s); expect(s.winnerId).toBe('P2');
  });
  it('comprueba los trece puntos al comenzar el siguiente turno, antes de tirar dados', () => {
    let s = game(true); s.players[1].citiesKnights!.defenderPoints = 13;
    s = act(s, { type: 'END_TURN' }); expect(s.winnerId).toBeNull();
    s = act(s, { type: 'END_SPECIAL_BUILD' }, 'P2'); expect(s.winnerId).toBeNull();
    s = act(s, { type: 'END_SPECIAL_BUILD' }, 'P3'); expect(s.winnerId).toBe('P2'); expect(s.phase).toBe('GAME_OVER'); expect(s.turn.hasRolledDice).toBe(false);
  });
});

describe('Cartas de progreso oficiales', () => {
  it('Construcción de carreteras concede dos tramos gratis y devuelve la carta al fondo', () => {
    let s = game(); const v = city(s); s = progress(s, 'ROAD_BUILDING');
    expect(s.phase).toBe('ROAD_BUILDING_DEV'); expect(s.turn.freeRoadsRemaining).toBe(2);
    s = act(s, { type: 'PLACE_ROAD', edgeId: getValidRoadEdges(s, 'P1')[0] });
    s = act(s, { type: 'PLACE_ROAD', edgeId: getValidRoadEdges(s, 'P1')[0] });
    expect(s.phase).toBe('MAIN_PHASE'); expect(s.players[0].resources).toEqual({ ...createEmptyResources(), PAPER: 0, CLOTH: 0, COIN: 0 });
    expect(s.citiesKnights!.decks.SCIENCE.at(-1)!.type).toBe('ROAD_BUILDING');
  });
  it('Diplomático retira una carretera rival abierta sin regalar una carretera propia', () => {
    let s = game(); const edge = Object.values(s.board.edges)[0]; edge.building = 'ROAD'; edge.playerId = 'P2';
    const before = s.players[1].roadsLeft; s = progress(s, 'DIPLOMAT', { edgeId: edge.id });
    expect(s.board.edges[edge.id].building).toBeNull(); expect(s.players[1].roadsLeft).toBe(before + 1); expect(s.players[0].roadsLeft).toBe(15);
  });
  it('Intriga puede expulsar a un poderoso sin usar un caballero propio', () => {
    let s = game(); const edge = Object.values(s.board.edges)[0]; edge.building = 'ROAD'; edge.playerId = 'P1'; const v = edge.vertexIds[0]; knight(s, 'P2', 3, true, v);
    s = progress(s, 'INTRIGUE', { vertexId: v }); expect(s.board.vertices[v].knight).toBeUndefined(); expect(s.citiesKnights!.choices).toEqual([]);
  });
  it('Obispo roba una mercancía a cada rival adyacente, una por jugador', () => {
    let s = game(); s.citiesKnights!.firstAttackResolved = true;
    const h = Object.values(s.board.hexes).find(h => h.terrain !== 'SEA' && h.id !== s.board.robberHexId)!;
    const vs = Object.values(s.board.vertices).filter(v => v.hexIds.includes(h.id));
    for (const [i, id] of ['P2', 'P2', 'P3'].entries()) { vs[i].building = 'SETTLEMENT'; vs[i].playerId = id; }
    s.players[1].resources.PAPER = 3; s.players[2].resources.CLOTH = 1;
    s = progress(s, 'BISHOP', { hexId: h.id }); expect(s.players[0].resources.PAPER).toBe(1); expect(s.players[0].resources.CLOTH).toBe(1); expect(s.players[1].resources.PAPER).toBe(2);
  });
  it('Grúa descuenta una sola mercancía y Medicina abarata una sola ciudad', () => {
    let s = game(); rich(s); city(s); s = progress(s, 'CRANE'); s = act(s, { type: 'IMPROVE_CITY', branch: 'SCIENCE' }); expect(s.players[0].resources.PAPER).toBe(20);
    s = act(s, { type: 'IMPROVE_CITY', branch: 'SCIENCE' }); expect(s.players[0].resources.PAPER).toBe(18);
    s = progress(s, 'MEDICINE'); const v = Object.values(s.board.vertices).find(v => !v.building)!; v.building = 'SETTLEMENT'; v.playerId = 'P1'; s = act(s, { type: 'UPGRADE_CITY', vertexId: v.id }); expect(s.players[0].resources.ORE).toBe(18); expect(s.players[0].resources.WHEAT).toBe(19);
  });
  it('Ingeniero construye una muralla gratis y Fragua asciende dos caballeros distintos', () => {
    let s = game(); const v = city(s); s = progress(s, 'ENGINEER', { vertexId: v }); expect(s.board.vertices[v].cityWall).toBe(true); const a = knight(s); const b = knight(s); s = progress(s, 'SMITH', { vertexIds: [a, b] }); expect(s.board.vertices[a].knight!.rank).toBe(2); expect(s.board.vertices[b].knight!.rank).toBe(2);
  });
  it.each(['IRRIGATION', 'MINING'] as const)('%s paga por hexágonos distintos, no por edificios', type => {
    let s = game(); const r = type === 'IRRIGATION' ? 'WHEAT' : 'ORE'; const h = Object.values(s.board.hexes).find(h => h.terrain === r)!; const vs = Object.values(s.board.vertices).filter(v => v.hexIds.includes(h.id)); vs[0].building = 'SETTLEMENT'; vs[0].playerId = 'P1'; vs[1].building = 'CITY'; vs[1].playerId = 'P1';
    const count = Object.values(s.board.hexes).filter(x => x.terrain === r && [vs[0], vs[1]].some(v => v.hexIds.includes(x.id))).length; s = progress(s, type); expect(s.players[0].resources[r]).toBe(count * 2);
  });
  it('Inventor intercambia números permitidos y rechaza números rojos', () => {
    let s = game(); const [a, b] = Object.values(s.board.hexes).filter(h => ALL_RESOURCES.includes(h.terrain as ResourceType)).slice(0, 2); a.numberToken = 5; b.numberToken = 9;
    for (const h of [a, b]) { const v = Object.values(s.board.vertices).find(v => v.hexIds.includes(h.id) && !v.building)!; v.building = 'SETTLEMENT'; v.playerId = 'P1'; }
    s = progress(s, 'INVENTOR', { hexIds: [a.id, b.id] }); expect(s.board.hexes[a.id].numberToken).toBe(9); expect(s.board.hexes[b.id].numberToken).toBe(5);
    const cid = giveCard(s, 'INVENTOR'); s.board.hexes[a.id].numberToken = 6; expect(applyGameAction(s, 'P1', { type: 'PLAY_PROGRESS_CARD', cardId: cid, payload: { hexIds: [a.id, b.id] } }).error).toBeDefined();
  });
  it('Alquimista fija los dos dados, pero mantiene el evento aleatorio', () => {
    let s = game(); const cardId = giveCard(s, 'ALCHEMIST'); s.phase = 'WAITING_FOR_DICE'; s = act(s, { type: 'PLAY_PROGRESS_CARD', cardId, payload: { dice: [3, 4] } }, 'P1', { ...entropy, eventDie: 'BARBARIAN' }); expect(s.turn.diceRoll).toEqual([3, 4]); expect(s.citiesKnights!.barbarianPosition).toBe(1);
  });
  it('Boda respeta la elección de cada rival y Saboteador no mueve el ladrón', () => {
    let s = game(); s.players[1].citiesKnights!.defenderPoints = 1; s.players[1].totalVictoryPoints = 1; s.players[1].resources.COIN = 3;
    s = progress(s, 'WEDDING'); expect(s.citiesKnights!.choices[0].playerId).toBe('P2'); s = act(s, { type: 'RESOLVE_CK_CHOICE', resources: { ...createEmptyResources(), COIN: 2 } }, 'P2'); expect(s.players[0].resources.COIN).toBe(2);
    s.players[1].resources = { ...createEmptyResources(), CLOTH: 9 }; s = progress(s, 'SABOTEUR'); expect(s.players[1].mustDiscardCount).toBe(4); s = act(s, { type: 'DISCARD_RESOURCES', resources: { ...createEmptyResources(), CLOTH: 4 } }, 'P2'); expect(s.phase).toBe('MAIN_PHASE');
  });
  it('Desertor conserva rango y estado, incluso un poderoso sin Fortaleza', () => {
    let s = game(); const e = Object.values(s.board.edges)[0]; e.playerId = 'P1'; e.building = 'ROAD'; const k = knight(s, 'P2', 3);
    s = progress(s, 'DESERTER', { targetPlayerId: 'P2' }); s = act(s, { type: 'RESOLVE_CK_CHOICE', vertexId: k }, 'P2'); expect(s.citiesKnights!.choices[0].kind).toBe('DESERTER_PLACE'); s = settleChoices(s); expect(Object.values(s.board.vertices).find(v => v.knight?.playerId === 'P1')?.knight).toMatchObject({ rank: 3, active: true });
  });
  it('Estratega activa todos y Espía roba una carta utilizable ese mismo turno', () => {
    let s = game(); city(s); const k = knight(s, 'P1', 1, false); s = progress(s, 'WARLORD'); expect(s.board.vertices[k].knight!.active).toBe(true);
    const cardId = giveCard(s, 'CRANE', 'P2'); s = progress(s, 'SPY', { targetPlayerId: 'P2', targetCardId: cardId }); s = act(s, { type: 'PLAY_PROGRESS_CARD', cardId }); expect(s.citiesKnights!.turnEffects!.crane).toBe(true);
  });
  it('Comerciante da PV y comercio 2:1; Flota mercante dura hasta finalizar el turno', () => {
    let s = game(); const id = city(s); const h = s.board.vertices[id].hexIds.map(id => s.board.hexes[id]).find(h => ALL_RESOURCES.includes(h.terrain as ResourceType))!;
    s = progress(s, 'MERCHANT', { hexId: h.id }); expect(s.players[0].publicVictoryPoints).toBe(3); expect(getPlayerBankTradeRatios(s, 'P1')[h.terrain as ResourceType]).toBe(2);
    s = progress(s, 'MERCHANT_FLEET', { resource: 'PAPER' }); expect(getPlayerBankTradeRatios(s, 'P1').PAPER).toBe(2); s = act(s, { type: 'END_TURN' }); expect(getPlayerBankTradeRatios(s, 'P1').PAPER).toBe(4);
  });
  it.each([['RESOURCE_MONOPOLY', 'WOOD', 2], ['COMMODITY_MONOPOLY', 'CLOTH', 1]] as const)('%s toma cantidades limitadas de cada rival', (type, resource, n) => {
    let s = game(); s.players[1].resources[resource] = 5; s.players[2].resources[resource] = 1; s = progress(s, type, { resource }); expect(s.players[0].resources[resource]).toBe(n + 1); expect(s.players[1].resources[resource]).toBe(5 - n);
  });
  it('Maestro comerciante elige dos cartas y Puerto deja elegir la mercancía al rival', () => {
    let s = game(); s.players[1].totalVictoryPoints = 2; s.players[1].resources.COIN = 3; s = progress(s, 'MASTER_MERCHANT', { targetPlayerId: 'P2', resources: { ...createEmptyResources(), COIN: 2 } }); expect(s.players[0].resources.COIN).toBe(2);
    s.players[0].resources.WOOD = 1; s = progress(s, 'COMMERCIAL_HARBOR'); s = act(s, { type: 'COMMERCIAL_HARBOR_TRADE', targetPlayerId: 'P2', resource: 'WOOD' }); s = act(s, { type: 'RESOLVE_CK_CHOICE', resources: { ...createEmptyResources(), COIN: 1 } }, 'P2'); expect(s.players[1].resources.WOOD).toBe(1); expect(s.players[0].resources.COIN).toBe(3);
  });
  it('los puntos de progreso se exponen inmediatamente y no ocupan la mano', () => {
    const s = game(); const deck = s.citiesKnights!.decks.SCIENCE; const index = deck.findIndex(c => c.type === 'PRINTER'); deck.unshift(...deck.splice(index, 1)); s.players[0].citiesKnights!.improvements.SCIENCE = 1;
    const after = dice(s, [1, 2], 'SCIENCE'); expect(after.players[0].citiesKnights!.progressPoints).toBe(1); expect(after.players[0].citiesKnights!.progressCards).toEqual([]);
  });
  it('la quinta carta ajena exige devolver una al fondo antes de continuar', () => {
    let s = game(); for (const type of ['CRANE', 'MEDICINE', 'MINING', 'IRRIGATION'] as const) giveCard(s, type, 'P2'); s.players[1].citiesKnights!.improvements.SCIENCE = 5;
    // Ensure the next card is not the automatic victory point.
    const deck = s.citiesKnights!.decks.SCIENCE; const i = deck.findIndex(c => c.type !== 'PRINTER'); deck.unshift(...deck.splice(i, 1));
    s = dice(s, [1, 2], 'SCIENCE'); expect(s.citiesKnights!.choices[0].kind).toBe('PROGRESS_DISCARD'); const c = s.players[1].citiesKnights!.progressCards[0]; s = act(s, { type: 'RESOLVE_CK_CHOICE', cardId: c.id }, 'P2'); expect(s.players[1].citiesKnights!.progressCards).toHaveLength(4); expect(s.citiesKnights!.decks.SCIENCE.at(-1)!.id).toBe(c.id);
  });
});

describe('Ampliación, bots y persistencia', () => {
  it('los bots descartan Saboteador aunque el jugador activo sea humano', () => {
    let s = game(); s.players[1].isBot = true; s.players[1].resources.CLOTH = 9;
    s = progress(s, 'SABOTEUR'); expect(s.phase).toBe('ROBBER_DISCARD'); s = executeBotStepIfNeeded(s);
    expect(s.players[1].mustDiscardCount).toBe(0); expect(s.players[1].resources.CLOTH).toBe(5); expect(s.phase).toBe('MAIN_PHASE');
  });
  it('la activación en construcción especial permite actuar en el siguiente turno propio', () => {
    let s = game(true); const edge = Object.values(s.board.edges)[0]; edge.building = 'ROAD'; edge.playerId = 'P2'; const v = knight(s, 'P2', 1, false, edge.vertexIds[0]); s.players[1].resources.WHEAT = 1;
    s = act(s, { type: 'END_TURN' }); s = act(s, { type: 'ACTIVATE_KNIGHT', vertexId: v }, 'P2');
    s = act(s, { type: 'END_SPECIAL_BUILD' }, 'P2'); s = act(s, { type: 'END_SPECIAL_BUILD' }, 'P3');
    s.phase = 'MAIN_PHASE'; s.turn.hasRolledDice = true;
    s = act(s, { type: 'MOVE_KNIGHT', fromVertexId: v, toVertexId: edge.vertexIds[1] }, 'P2'); expect(s.board.vertices[edge.vertexIds[1]].knight!.active).toBe(false);
  });
  it('construcción especial rota por los demás jugadores y prohíbe comercio, progreso y acciones militares', () => {
    let s = game(true); rich(s, 'P2'); const k = knight(s, 'P2'); const cid = giveCard(s, 'CRANE', 'P2'); s = act(s, { type: 'END_TURN' }); expect(s.phase).toBe('SPECIAL_BUILD_PHASE'); expect(s.turn.activePlayerId).toBe('P2');
    expect(applyGameAction(s, 'P2', { type: 'BANK_TRADE', giveResource: 'WOOD', giveAmount: 4, receiveResource: 'PAPER', receiveAmount: 1 }).error).toBeDefined();
    expect(applyGameAction(s, 'P2', { type: 'PLAY_PROGRESS_CARD', cardId: cid }).error).toBeDefined(); expect(applyGameAction(s, 'P2', { type: 'EXPEL_ROBBER', vertexId: k }).error).toBeDefined();
    const v = city(s, 'P2'); s = act(s, { type: 'BUILD_CITY_WALL', vertexId: v }, 'P2'); s = act(s, { type: 'IMPROVE_CITY', branch: 'SCIENCE' }, 'P2');
    s = act(s, { type: 'END_SPECIAL_BUILD' }, 'P2'); expect(s.turn.activePlayerId).toBe('P3'); s = act(s, { type: 'END_SPECIAL_BUILD' }, 'P3'); expect(s.phase).toBe('WAITING_FOR_DICE'); expect(s.turn.activePlayerId).toBe('P2'); expect(s.turn.turnNumber).toBe(6);
  });
  it('un bot resuelve sus decisiones pendientes aunque sea el turno de una persona', () => {
    let s = game(); s.players[1].isBot = true; city(s, 'P2'); resolveBarbarianAttack(s); s.phase = 'CK_CHOICE'; s = executeBotStepIfNeeded(s); expect(s.citiesKnights!.choices).toEqual([]); expect(Object.values(s.board.vertices).some(v => v.playerId === 'P2' && v.building === 'CITY')).toBe(false);
  });
  it('guarda y restaura invasión, mano, decisiones pendientes y caballeros', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ck-save-'));
    try { const file = join(directory, 'rooms.json'); const store = new RoomStore(file); const s = game(); knight(s); s.citiesKnights!.barbarianPosition = 6; giveCard(s, 'CRANE'); s.citiesKnights!.choices.push({ kind: 'AQUEDUCT', playerId: 'P1' }); s.phase = 'CK_CHOICE'; store.set(s.roomCode, s); store.flush(); const restored = new RoomStore(file).get(s.roomCode)!; expect(restored.citiesKnights).toEqual(s.citiesKnights); expect(restored.players[0].citiesKnights).toEqual(s.players[0].citiesKnights); expect(restored.board).toEqual(JSON.parse(JSON.stringify(s.board))); expect(restored.turn.phaseBeforePause).toBe('CK_CHOICE'); } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
