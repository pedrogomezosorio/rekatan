import { ALL_RESOURCES, ALL_TRADE_CARDS, BUILDING_COSTS, createEmptyResources } from '../constants';
import { BRANCH_META, CK_BRANCHES, COMMODITIES, PROGRESS_CARDS, cardCount, emptyCKPlayer, hasCitiesKnights } from '../citiesKnightsConfig';
import type { BoardKnight, CardBundle, CKChoice, EventDie, ImprovementBranch, ProgressCard, ProgressPayload, RuleContext } from '../citiesKnightsTypes';
import type { Edge, GameAction, GameState, PlayerState, ResourceFlightEvent, ResourceType, TradeCardType, Vertex } from '../types';
import { updateLongestRoadAward } from './LongestRoad';

export interface CKHooks {
  resolveDice: (state: GameState, dice: [number, number]) => void;
  nextTurn: (state: GameState) => void;
  score: (state: GameState) => void;
  validRoads: (state: GameState, playerId: string) => string[];
  validShips: (state: GameState, playerId: string) => string[];
  canSpend: (state: GameState, playerId: string, infrastructure: boolean) => { allowed: boolean; reason?: string };
}
const requireRule = (condition: unknown, message: string): void => { if (!condition) throw new Error(message); };
const vertices = (s: GameState): Vertex[] => Object.values(s.board.vertices);
const player = (s: GameState, id: string): PlayerState => s.players.find(p => p.id === id)!;
const cities = (s: GameState, id: string): Vertex[] => vertices(s).filter(v => v.playerId === id && v.building === 'CITY');
export const ownKnights = (s: GameState, id: string): Vertex[] => vertices(s).filter(v => v.knight?.playerId === id);
export const freeRank = (s: GameState, id: string, rank: number): boolean => ownKnights(s, id).filter(v => v.knight!.rank === rank).length < 2;
export function isOpenEdge(s: GameState, edge: Edge): boolean {
  if (!edge.building || !edge.playerId) return false;
  return edge.vertexIds.some((id: string) => {
    const v = s.board.vertices[id];
    if (!v) return false;
    if (v.building && v.playerId === edge.playerId) return false;
    if (v.knight?.playerId === edge.playerId) return false;
    const hasOtherOwnEdge = v.adjacentEdgeIds.some(
      eid => eid !== edge.id && s.board.edges[eid]?.playerId === edge.playerId && s.board.edges[eid]?.building
    );
    return !hasOtherOwnEdge;
  });
}
const isBuildPhase = (s: GameState, id: string): boolean => s.turn.activePlayerId === id && (s.phase === 'MAIN_PHASE' || s.phase === 'SPECIAL_BUILD_PHASE');
const isActionPhase = (s: GameState, id: string): boolean => s.turn.activePlayerId === id && s.phase === 'MAIN_PHASE';
function log(s: GameState, message: string): void {
  const index = (s.logs[0]?.timestamp || s.createdAt) + 1;
  s.logs.unshift({ id: `CK_${index}`, timestamp: index, message, type: 'INFO' });
  s.logs.length = Math.min(s.logs.length, 80);
}
function pay(s: GameState, p: PlayerState, cost: Partial<Record<TradeCardType, number>>): void {
  requireRule(ALL_TRADE_CARDS.every(r => (p.resources[r] || 0) >= (cost[r] || 0)), 'No tienes las cartas necesarias.');
  for (const r of ALL_TRADE_CARDS) {
    const n = cost[r] || 0;
    p.resources[r] = (p.resources[r] || 0) - n;
    s.bank[r] = (s.bank[r] || 0) + n;
  }
  s.turn.hasSpentOrBuiltThisTurn = true;
}
function take(s: GameState, p: PlayerState, r: TradeCardType, n: number): void {
  const amount = Math.min(n, s.bank[r] || 0);
  s.bank[r] = (s.bank[r] || 0) - amount;
  p.resources[r] = (p.resources[r] || 0) + amount;
}
function transfer(from: PlayerState, to: PlayerState, r: TradeCardType, n: number): void {
  from.resources[r] = (from.resources[r] || 0) - n;
  to.resources[r] = (to.resources[r] || 0) + n;
}
function steal(from: PlayerState, to: PlayerState, random: () => number): void {
  let ticket = Math.floor(random() * cardCount(from.resources));
  for (const r of ALL_TRADE_CARDS) {
    const n = from.resources[r] || 0;
    if (ticket < n) { transfer(from, to, r, 1); return; }
    ticket -= n;
  }
}
function validBundle(bundle: CardBundle | undefined, p: PlayerState, count: number, commoditiesOnly = false): bundle is CardBundle {
  return !!bundle && Object.keys(bundle).every(r => ALL_TRADE_CARDS.includes(r as TradeCardType)) && ALL_TRADE_CARDS.every(r => Number.isInteger(bundle[r] || 0) && (bundle[r] || 0) >= 0 && (bundle[r] || 0) <= (p.resources[r] || 0) && (!commoditiesOnly || COMMODITIES.includes(r as never) || !bundle[r])) && cardCount(bundle) === count;
}
function refreshRoads(s: GameState): void {
  s.longestRoadPlayerId = updateLongestRoadAward(s.board, s.players, s.longestRoadPlayerId, s.config.seafarersCoastConnection);
}

export function initializeCitiesKnights(s: GameState, random: () => number): void {
  const decks = Object.fromEntries(CK_BRANCHES.map(branch => {
    const cards: ProgressCard[] = [];
    for (const [type, meta] of Object.entries(PROGRESS_CARDS)) {
      if (meta.branch === branch) for (let i = 0; i < meta.count; i++) cards.push({ id: `CK_${type}_${i}`, type: type as ProgressCard['type'], branch });
    }
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    return [branch, cards];
  })) as Record<ImprovementBranch, ProgressCard[]>;
  s.citiesKnights = { barbarianPosition: 0, firstAttackResolved: false, eventDie: null, decks, metropolisOwners: { SCIENCE: null, POLITICS: null, TRADE: null }, choices: [], turnEffects: {} };
  const stock = s.config.maxPlayers > 4 ? 18 : 12;
  for (const r of COMMODITIES) s.bank[r] = stock;
  for (const p of s.players) {
    p.citiesKnights = emptyCKPlayer();
    for (const r of COMMODITIES) p.resources[r] = 0;
    p.devCards = [];
  }
  s.devDeck = [];
  s.largestArmyPlayerId = null;
}

export function knightRecruitVertices(s: GameState, id: string): string[] {
  return vertices(s).filter(v => !v.building && !v.knight && v.adjacentEdgeIds.some(e => s.board.edges[e]?.playerId === id && s.board.edges[e].building)).map(v => v.id);
}
/** Paths follow the owner's network and stop at enemy pieces. The final enemy knight may be displaced. */
export function knightReachableVertices(s: GameState, id: string, fromId: string): string[] {
  const seen = new Set<string>([fromId]);
  const queue = [fromId];
  while (queue.length) {
    const v = s.board.vertices[queue.shift()!];
    if (!v) continue;
    if (v.id !== fromId && (v.building && v.playerId !== id || v.knight && v.knight.playerId !== id)) continue;
    for (const eid of v.adjacentEdgeIds) {
      const e = s.board.edges[eid];
      if (!e?.building || e.playerId !== id) continue;
      const next = e.vertexIds.find(vid => vid !== v.id)!;
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return [...seen].filter(vid => vid !== fromId && !s.board.vertices[vid].building);
}
function retreat(s: GameState, v: Vertex): void {
  const knight = v.knight!;
  const targets = knightReachableVertices(s, knight.playerId, v.id).filter(id => !s.board.vertices[id].knight);
  delete v.knight;
  if (targets.length) s.citiesKnights!.choices.push({ kind: 'RETREAT', playerId: knight.playerId, knight, vertexIds: targets });
  log(s, `${player(s, knight.playerId).name} debe retirar su caballero${targets.length ? '.' : ': vuelve a su reserva.'}`);
}
function draw(s: GameState, id: string, branch: ImprovementBranch): void {
  const ck = s.citiesKnights!;
  const card = ck.decks[branch].shift();
  if (!card) return;
  const p = player(s, id);
  if (card.type === 'PRINTER' || card.type === 'CONSTITUTION') {
    p.citiesKnights!.progressPoints++;
    (p.citiesKnights!.revealedProgressCards ||= []).push(card);
    log(s, `${p.name} recibe ${PROGRESS_CARDS[card.type].name}: +1 PV público.`);
  } else {
    p.citiesKnights!.progressCards.push(card);
    if (p.citiesKnights!.progressCards.length > 4 && id !== s.turn.activePlayerId && !ck.choices.some(c => c.kind === 'PROGRESS_DISCARD' && c.playerId === id)) ck.choices.push({ kind: 'PROGRESS_DISCARD', playerId: id });
  }
  s.lastEvent = {
    nonce: (s.lastEvent?.nonce || 0) + 1,
    type: 'DEV_CARD_BOUGHT',
    buyerPlayerId: id,
    buyerPlayerName: p.name,
    eventDie: ck.eventDie || undefined,
    progressFlight: { playerId: id, branch, cardType: card.type, cardName: PROGRESS_CARDS[card.type].name },
  };
}

export function resolveBarbarianAttack(s: GameState, participating?: Set<string>): void {
  const ck = s.citiesKnights!;
  const barbarians = vertices(s).filter(v => v.building === 'CITY').length;
  const contributes = (v: Vertex) => !!v.knight?.active && (!participating || participating.has(v.id));
  const contributions = Object.fromEntries(s.players.map(p => [p.id, ownKnights(s, p.id).reduce((n, v) => n + (contributes(v) ? v.knight!.rank : 0), 0)]));
  const defenders = Object.values(contributions).reduce((a, b) => a + b, 0);
  const won = defenders >= barbarians;
  const defenderIds: string[] = [];
  const victimIds: string[] = [];
  if (won) {
    const best = Math.max(...Object.values(contributions));
    const leaders = s.players.filter(p => contributions[p.id] === best);
    if (leaders.length === 1) { leaders[0].citiesKnights!.defenderPoints++; defenderIds.push(leaders[0].id); }
    else for (const p of inTurnOrder(s).filter(p => contributions[p.id] === best)) ck.choices.push({ kind: 'DEFENDER_CARD', playerId: p.id });
  } else {
    const eligible = s.players.filter(p => cities(s, p.id).some(v => !v.metropolis));
    const worst = Math.min(...eligible.map(p => contributions[p.id]));
    for (const p of inTurnOrder(s).filter(p => eligible.includes(p) && contributions[p.id] === worst)) {
      victimIds.push(p.id); ck.choices.push({ kind: 'CITY_LOSS', playerId: p.id });
    }
  }
  for (const v of vertices(s)) if (v.knight && contributes(v)) v.knight.active = false;
  ck.barbarianPosition = 0;
  ck.firstAttackResolved = true;
  ck.lastBattle = { barbarians, defenders, contributions, won, defenderIds, victimIds };
  s.lastEvent = {
    nonce: (s.lastEvent?.nonce || 0) + 1,
    type: 'DICE_ROLLED',
    dice: s.turn.diceRoll || undefined,
    eventDie: 'BARBARIAN',
    barbarianAttack: { barbarians, defenders, won, victimIds, defenderIds },
  };
  log(s, `Asalto bárbaro: defensa ${defenders}, bárbaros ${barbarians}. ${won ? 'Catán se defiende.' : 'Catán pierde; los jugadores afectados eligen una ciudad.'}`);
}
function inTurnOrder(s: GameState): PlayerState[] {
  const first = s.players.findIndex(p => p.id === s.turn.activePlayerId);
  return [...s.players.slice(first), ...s.players.slice(0, first)];
}
function finishChoices(s: GameState, hooks: CKHooks): void {
  const ck = s.citiesKnights!;
  if (ck.choices.length) { s.phase = 'CK_CHOICE'; return; }
  if (ck.pendingDice) {
    const dice = ck.pendingDice;
    delete ck.pendingDice;
    hooks.resolveDice(s, dice);
    if (ck.choices.length) s.phase = 'CK_CHOICE';
  } else s.phase = 'MAIN_PHASE';
  hooks.score(s);
}
export function queueAqueduct(s: GameState, received: Set<string>): void {
  if (!s.citiesKnights) return;
  for (const p of inTurnOrder(s)) {
    if (p.status !== 'ABANDONED' && p.citiesKnights!.improvements.SCIENCE >= 3 && !received.has(p.id) && !s.turn.pendingGoldClaims?.some(c => c.playerId === p.id && c.amount > 0) && ALL_RESOURCES.some(r => s.bank[r] > 0)) s.citiesKnights.choices.push({ kind: 'AQUEDUCT', playerId: p.id });
  }
}
/** Stock shortages are resolved per card type, before giving anybody cards. */
export function produceCitiesKnightsResources(s: GameState, sum: number, nonce: number): ResourceFlightEvent[] {
  const wanted: ResourceFlightEvent[] = [];
  const commodityFor = { WOOD: 'PAPER', SHEEP: 'CLOTH', ORE: 'COIN' } as const;
  for (const h of Object.values(s.board.hexes)) {
    if (h.numberToken !== sum || h.hasRobber || !ALL_RESOURCES.includes(h.terrain as ResourceType)) continue;
    const resource = h.terrain as ResourceType;
    for (const v of vertices(s).filter(v => v.building && v.hexIds.includes(h.id))) {
      const owner = player(s, v.playerId!); if (!owner || owner.status === 'ABANDONED') continue;
      const commodity = v.building === 'CITY' ? commodityFor[resource as keyof typeof commodityFor] : undefined;
      wanted.push({ id: `CK_PROD_${nonce}_${h.id}_${v.id}`, hexId: h.id, playerId: owner.id, resource, amount: v.building === 'CITY' && !commodity ? 2 : 1 });
      if (commodity) wanted.push({ id: `CK_COMMODITY_${nonce}_${h.id}_${v.id}`, hexId: h.id, playerId: owner.id, resource: commodity, amount: 1 });
    }
  }
  const result: ResourceFlightEvent[] = [];
  for (const r of ALL_TRADE_CARDS) {
    const claims = wanted.filter(f => f.resource === r);
    const total = claims.reduce((n, f) => n + f.amount, 0);
    if (total > (s.bank[r] || 0) && new Set(claims.map(f => f.playerId)).size > 1) continue;
    for (const f of claims) {
      const amount = Math.min(f.amount, s.bank[r] || 0); if (!amount) continue;
      take(s, player(s, f.playerId), r, amount); result.push({ ...f, amount });
    }
  }
  return result;
}
function loseCity(s: GameState, p: PlayerState, vertexId?: string): void {
  const v = s.board.vertices[vertexId || ''];
  requireRule(v?.playerId === p.id && v.building === 'CITY' && !v.metropolis, 'Elige una ciudad tuya que no sea metrópolis.');
  v.building = 'SETTLEMENT';
  delete v.cityWall;
  if (p.settlementsLeft > 0) { p.settlementsLeft--; p.citiesLeft++; }
  else v.isDowngradedCity = true;
  if (cities(s, p.id).length === 0) p.citiesKnights!.improvements = { SCIENCE: 0, POLITICS: 0, TRADE: 0 };
  log(s, `${p.name} pierde una ciudad y su muralla. Pasa a ser un poblado.`);
}
function promote(s: GameState, p: PlayerState, id: string, free: boolean): void {
  const k = s.board.vertices[id]?.knight;
  requireRule(k?.playerId === p.id && k.rank < 3 && k.promotedOnTurn !== s.turn.turnNumber, 'Ese caballero no puede ascender otra vez este turno.');
  requireRule(k!.rank !== 2 || p.citiesKnights!.improvements.POLITICS >= 3, 'Necesitas Fortaleza (Política 3).');
  requireRule(freeRank(s, p.id, k!.rank + 1), 'No quedan caballeros de ese rango en la reserva.');
  if (!free) pay(s, p, { ORE: 1, SHEEP: 1 });
  k!.rank = (k!.rank + 1) as 2 | 3; k!.promotedOnTurn = s.turn.turnNumber;
}
export function cityCost(s: GameState): CardBundle {
  return s.citiesKnights?.turnEffects?.medicine ? { ...createEmptyResources(), ORE: 2, WHEAT: 1 } : { ...BUILDING_COSTS.CITY };
}
export function isRobberUnlocked(s: GameState): boolean { return !hasCitiesKnights(s.config) || !!s.citiesKnights?.firstAttackResolved; }

function playProgress(s: GameState, p: PlayerState, card: ProgressCard, data: ProgressPayload, hooks: CKHooks, ctx: RuleContext): void {
  const ck = s.citiesKnights!;
  const effects = ck.turnEffects ||= {};
  const target = data.targetPlayerId ? player(s, data.targetPlayerId) : undefined;
  const adjacentOwn = (hexId: string): boolean => vertices(s).some(v => v.playerId === p.id && v.building && v.hexIds.includes(hexId));
  switch (card.type) {
    case 'ALCHEMIST': {
      requireRule(data.dice?.length === 2 && data.dice.every(n => Number.isInteger(n) && n >= 1 && n <= 6), 'Elige dos dados entre 1 y 6.');
      rollCitiesKnightsDice(s, data.dice!, ctx.eventDie || eventFromRandom(ctx.random), hooks); break;
    }
    case 'ROAD_BUILDING': s.turn.freeRoadsRemaining = 2; s.phase = 'ROAD_BUILDING_DEV'; break;
    case 'CRANE': requireRule(cities(s, p.id).length && !effects.crane, 'Necesitas una ciudad y no tener otra Grúa pendiente.'); effects.crane = true; break;
    case 'MEDICINE': requireRule(!effects.medicine, 'Ya tienes una Medicina pendiente.'); effects.medicine = true; break;
    case 'ENGINEER': {
      const v = s.board.vertices[data.vertexId || ''];
      requireRule(v?.playerId === p.id && v.building === 'CITY' && !v.cityWall && cities(s, p.id).filter(c => c.cityWall).length < 3, 'Elige una ciudad sin muralla (máximo tres murallas).');
      v.cityWall = true; break;
    }
    case 'SMITH': {
      const ids = data.vertexIds || [];
      requireRule(ids.length >= 1 && ids.length <= 2 && new Set(ids).size === ids.length, 'Elige uno o dos caballeros distintos.');
      for (const id of ids) promote(s, p, id, true); break;
    }
    case 'INVENTOR': {
      const ids = data.hexIds || [];
      requireRule(ids.length === 2 && ids[0] !== ids[1] && ids.every(id => { const h = s.board.hexes[id]; return h?.numberToken && ![2, 12, 6, 8].includes(h.numberToken) && adjacentOwn(id); }), 'Elige dos terrenos propios con números intercambiables (no 2, 12, 6 ni 8).');
      const [a, b] = ids.map(id => s.board.hexes[id]); [a.numberToken, b.numberToken] = [b.numberToken, a.numberToken]; break;
    }
    case 'IRRIGATION': case 'MINING': {
      const resource = card.type === 'IRRIGATION' ? 'WHEAT' : 'ORE';
      const count = Object.values(s.board.hexes).filter(h => h.terrain === resource && adjacentOwn(h.id)).length;
      requireRule(count > 0, 'La carta necesita un edificio junto al terreno correspondiente.');
      take(s, p, resource, 2 * count); break;
    }
    case 'WEDDING':
      for (const rival of inTurnOrder(s).filter(r => r.id !== p.id && r.totalVictoryPoints > p.totalVictoryPoints && cardCount(r.resources))) ck.choices.push({ kind: 'GIFT', playerId: rival.id, beneficiaryId: p.id, amount: Math.min(2, cardCount(rival.resources)) });
      break;
    case 'SABOTEUR':
      for (const rival of s.players.filter(r => r.id !== p.id && r.totalVictoryPoints >= p.totalVictoryPoints)) rival.mustDiscardCount = Math.floor(cardCount(rival.resources) / 2);
      if (s.players.some(r => r.mustDiscardCount)) s.phase = 'ROBBER_DISCARD';
      // The marker prevents a discard from accidentally moving the robber.
      s.turn.ckSaboteurDiscard = s.players.some(r => r.mustDiscardCount > 0); break;
    case 'DESERTER':
      requireRule(target && target.id !== p.id && ownKnights(s, target.id).length, 'Elige un rival con caballeros.');
      ck.choices.push({ kind: 'DESERTER', playerId: target!.id, beneficiaryId: p.id }); break;
    case 'WARLORD':
      requireRule(ownKnights(s, p.id).some(v => !v.knight!.active), 'Todos tus caballeros ya están activos.');
      for (const v of ownKnights(s, p.id)) if (!v.knight!.active) { v.knight!.active = true; v.knight!.activatedOnTurn = s.turn.turnNumber; }
      break;
    case 'INTRIGUE': {
      const v = s.board.vertices[data.vertexId || ''];
      requireRule(v?.knight && v.knight.playerId !== p.id && v.adjacentEdgeIds.some(id => s.board.edges[id].playerId === p.id && s.board.edges[id].building), 'Elige un caballero rival conectado a tu red.');
      retreat(s, v); refreshRoads(s); break;
    }
    case 'DIPLOMAT': {
      const e = s.board.edges[data.edgeId || ''];
      requireRule(isOpenEdge(s, e), 'Elige una carretera o barco con un extremo abierto.');
      const ownerId = e.playerId!; const piece = e.building!; e.building = null; e.playerId = null;
      if (piece === 'ROAD') player(s, ownerId).roadsLeft++;
      else player(s, ownerId).shipsLeft = (player(s, ownerId).shipsLeft || 0) + 1;
      if (ownerId === p.id && data.toEdgeId) {
        const freeState = structuredClone(s); freeState.phase = 'ROAD_BUILDING_DEV'; freeState.turn.freeRoadsRemaining = 1;
        // The Diplomat may also move a ship affected by the pirate (official FAQ).
        if (piece === 'SHIP') delete freeState.board.pirateHexId;
        requireRule((piece === 'ROAD' ? hooks.validRoads : hooks.validShips)(freeState, p.id).includes(data.toEdgeId), 'Destino de la pieza inválido.');
        s.board.edges[data.toEdgeId].building = piece; s.board.edges[data.toEdgeId].playerId = p.id;
        if (piece === 'ROAD') p.roadsLeft--; else p.shipsLeft = (p.shipsLeft || 0) - 1;
      }
      refreshRoads(s); break;
    }
    case 'SPY': {
      requireRule(target && target.id !== p.id, 'Elige un rival.');
      const stolen = target!.citiesKnights!.progressCards.find(c => c.id === data.targetCardId);
      requireRule(stolen, 'Elige una carta de progreso del rival.');
      target!.citiesKnights!.progressCards = target!.citiesKnights!.progressCards.filter(c => c !== stolen); p.citiesKnights!.progressCards.push(stolen!); break;
    }
    case 'BISHOP': {
      const h = s.board.hexes[data.hexId || ''];
      requireRule(h && h.terrain !== 'SEA' && h.terrain !== 'FOG' && h.id !== s.board.robberHexId, 'Elige otro terreno para el ladrón.');
      for (const hex of Object.values(s.board.hexes)) hex.hasRobber = hex.id === h.id;
      s.board.robberHexId = h.id;
      const ids = new Set(vertices(s).filter(v => v.building && v.playerId !== p.id && v.hexIds.includes(h.id)).map(v => v.playerId!));
      for (const id of ids) steal(player(s, id), p, ctx.random); break;
    }
    case 'MERCHANT': {
      const h = s.board.hexes[data.hexId || ''];
      requireRule(h && ALL_RESOURCES.includes(h.terrain as ResourceType) && adjacentOwn(h.id), 'El comerciante necesita un terreno de recurso junto a un edificio tuyo.');
      s.board.merchant = { playerId: p.id, hexId: h.id }; break;
    }
    case 'MERCHANT_FLEET':
      requireRule(ALL_TRADE_CARDS.includes(data.resource!), 'Elige un tipo de carta.');
      effects.fleet = [...(effects.fleet || []), data.resource!]; break;
    case 'MASTER_MERCHANT': {
      requireRule(target && target.id !== p.id && target.totalVictoryPoints > p.totalVictoryPoints, 'Elige un rival con más puntos.');
      requireRule(validBundle(data.resources, target!, Math.min(2, cardCount(target!.resources))), 'Elige hasta dos cartas de la mano del rival.');
      for (const r of ALL_TRADE_CARDS) transfer(target!, p, r, data.resources![r] || 0); break;
    }
    case 'COMMODITY_MONOPOLY': case 'RESOURCE_MONOPOLY': {
      const commodity = card.type === 'COMMODITY_MONOPOLY';
      const allowed = commodity ? COMMODITIES : ALL_RESOURCES;
      requireRule(allowed.includes(data.resource as never), 'Tipo de carta inválido para este monopolio.');
      for (const rival of s.players.filter(r => r.id !== p.id)) transfer(rival, p, data.resource!, Math.min(commodity ? 1 : 2, rival.resources[data.resource!] || 0)); break;
    }
    case 'COMMERCIAL_HARBOR': effects.harborPartners = s.players.filter(r => r.id !== p.id).map(r => r.id); break;
    case 'PRINTER': case 'CONSTITUTION': throw new Error('Los puntos de victoria se aplican al recibir la carta.');
  }
}

const eventFromRandom = (random: () => number): EventDie => (['BARBARIAN', 'BARBARIAN', 'BARBARIAN', 'SCIENCE', 'POLITICS', 'TRADE'] as EventDie[])[Math.floor(random() * 6)];
export function rollCitiesKnightsDice(s: GameState, dice: [number, number], event: EventDie, hooks: CKHooks): void {
  const ck = s.citiesKnights!;
  ck.eventDie = event; ck.pendingDice = dice;
  s.turn.diceRoll = dice; s.turn.hasRolledDice = true;
  s.lastEvent = {
    nonce: (s.lastEvent?.nonce || 0) + 1,
    type: 'DICE_ROLLED',
    dice,
    eventDie: event,
  };
  if (event === 'BARBARIAN') {
    ck.barbarianPosition++;
    if (ck.barbarianPosition >= 7) {
      if (s.config.citiesKnightsVoluntaryDefense) {
        ck.pendingDefense = {};
        for (const p of inTurnOrder(s)) if (ownKnights(s, p.id).some(v => v.knight!.active)) ck.choices.push({ kind: 'BARBARIAN_DEFENSE', playerId: p.id });
        if (!ck.choices.length) { delete ck.pendingDefense; resolveBarbarianAttack(s, new Set()); }
      } else resolveBarbarianAttack(s);
    }
  } else for (const p of inTurnOrder(s)) {
    const level = p.citiesKnights!.improvements[event];
    if (level > 0 && dice[0] <= level + 1) draw(s, p.id, event);
  }
  finishChoices(s, hooks);
}

/** Mutates only the dispatcher's private clone. All randomness is explicit in ctx. */
export function applyCitiesKnightsAction(s: GameState, id: string, action: GameAction, hooks: CKHooks, ctx: RuleContext): boolean {
  if (!hasCitiesKnights(s.config) || !s.citiesKnights) {
    if (['RECRUIT_KNIGHT', 'PROMOTE_KNIGHT', 'ACTIVATE_KNIGHT', 'MOVE_KNIGHT', 'EXPEL_ROBBER', 'BUILD_CITY_WALL', 'IMPROVE_CITY', 'PLAY_PROGRESS_CARD', 'RESOLVE_CK_CHOICE', 'COMMERCIAL_HARBOR_TRADE', 'END_SPECIAL_BUILD'].includes(action.type)) throw new Error('Ciudades y Caballeros no está activado.');
    return false;
  }
  const ck = s.citiesKnights;
  const p = player(s, id);
  if (ck.choices.length && !['RESOLVE_CK_CHOICE', 'TOGGLE_HOST_PAUSE', 'HANDLE_DISCONNECTED_PLAYER', 'RESUME_GAME', 'ABANDON_GAME'].includes(action.type)) throw new Error('Hay una decisión pendiente de Ciudades y Caballeros.');
  if (['RECRUIT_KNIGHT', 'PROMOTE_KNIGHT', 'ACTIVATE_KNIGHT', 'BUILD_CITY_WALL', 'IMPROVE_CITY'].includes(action.type)) {
    const permission = hooks.canSpend(s, id, false);
    requireRule(permission.allowed, permission.reason || 'No puedes construir en este momento.');
  }
  if (s.turn.pendingGoldClaims?.some(c => c.amount > 0) && !['CLAIM_GOLD_RESOURCE', 'RESOLVE_CK_CHOICE', 'TOGGLE_HOST_PAUSE', 'HANDLE_DISCONNECTED_PLAYER', 'RESUME_GAME', 'ABANDON_GAME'].includes(action.type)) throw new Error('Quedan recursos de oro por elegir.');
  switch (action.type) {
    case 'ROLL_DICE':
      requireRule(s.phase === 'WAITING_FOR_DICE' && s.turn.activePlayerId === id, 'No puedes lanzar los dados ahora.');
      rollCitiesKnightsDice(s, ctx.dice || [Math.floor(ctx.random() * 6) + 1, Math.floor(ctx.random() * 6) + 1], ctx.eventDie || eventFromRandom(ctx.random), hooks); return true;
    case 'RECRUIT_KNIGHT':
      requireRule(isBuildPhase(s, id) && freeRank(s, id, 1) && knightRecruitVertices(s, id).includes(action.vertexId), 'No puedes reclutar un caballero en ese lugar.');
      pay(s, p, { ORE: 1, SHEEP: 1 });
      s.board.vertices[action.vertexId].knight = { playerId: id, rank: 1, active: false, activatedOnTurn: -1, promotedOnTurn: -1, actedOnTurn: -1 };
      refreshRoads(s); break;
    case 'PROMOTE_KNIGHT':
      requireRule(isBuildPhase(s, id), 'Solo puedes ascender en tu fase de construcción.');
      promote(s, p, action.vertexId, false); break;
    case 'ACTIVATE_KNIGHT': {
      const k = s.board.vertices[action.vertexId]?.knight;
      requireRule(isBuildPhase(s, id) && k?.playerId === id && !k.active, 'No puedes activar ese caballero.');
      pay(s, p, { WHEAT: 1 }); k!.active = true; k!.activatedOnTurn = s.turn.turnNumber; break;
    }
    case 'MOVE_KNIGHT': {
      const from = s.board.vertices[action.fromVertexId]; const to = s.board.vertices[action.toVertexId]; const k = from?.knight;
      requireRule(isActionPhase(s, id) && k?.playerId === id && k.active && k.activatedOnTurn < s.turn.turnNumber && k.actedOnTurn !== s.turn.turnNumber, 'Necesitas un caballero activo desde antes de este turno.');
      requireRule(to && knightReachableVertices(s, id, from.id).includes(to.id) && (!to.knight || to.knight.playerId !== id && to.knight.rank < k!.rank), 'Destino inaccesible o caballero rival demasiado fuerte.');
      delete from.knight;
      if (to.knight) retreat(s, to);
      to.knight = k; k!.active = false; k!.actedOnTurn = s.turn.turnNumber;
      refreshRoads(s); break;
    }
    case 'EXPEL_ROBBER': {
      const v = s.board.vertices[action.vertexId]; const k = v?.knight;
      const mode = action.mode || 'ROBBER';
      const rHex = s.board.robberHexId || Object.values(s.board.hexes).find(h => h.hasRobber)?.id || '';
      const pHex = s.board.pirateHexId || '';
      const targetHex = mode === 'PIRATE' ? pHex : rHex;
      requireRule(isActionPhase(s, id) && k?.playerId === id && k.active && k.activatedOnTurn < s.turn.turnNumber && k.actedOnTurn !== s.turn.turnNumber, 'Ese caballero aún no puede expulsar al ladrón/pirata.');
      requireRule(Boolean(targetHex) && v.hexIds.includes(targetHex), 'El caballero debe estar junto al ladrón/pirata.');
      k!.active = false; k!.actedOnTurn = s.turn.turnNumber; s.turn.robberOrPirateMode = mode; s.phase = 'ROBBER_MOVE'; break;
    }
    case 'BUILD_CITY_WALL': {
      const v = s.board.vertices[action.vertexId];
      requireRule(isBuildPhase(s, id) && v?.playerId === id && v.building === 'CITY' && !v.cityWall && cities(s, id).filter(c => c.cityWall).length < 3, 'Muralla inválida: una por ciudad y tres por jugador.');
      pay(s, p, { BRICK: 2 }); v.cityWall = true; break;
    }
    case 'IMPROVE_CITY': {
      const branch = action.branch; requireRule(CK_BRANCHES.includes(branch) && isBuildPhase(s, id) && cities(s, id).length, 'Necesitas una ciudad y estar en tu fase de construcción.');
      const level = p.citiesKnights!.improvements[branch]; requireRule(level < 5, 'La rama ya está en nivel cinco.');
      const ownerId = ck.metropolisOwners[branch];
      const getsMetropolis = level + 1 >= 4 && (!ownerId || ownerId !== id && level + 1 > player(s, ownerId).citiesKnights!.improvements[branch]);
      const freeCities = cities(s, id).filter(v => !v.metropolis);
      if (level + 1 >= 4 && ownerId !== id) requireRule(freeCities.length, 'Necesitas una ciudad libre para esta metrópolis.');
      const chosen = action.vertexId ? freeCities.find(v => v.id === action.vertexId) : freeCities.length === 1 ? freeCities[0] : undefined;
      if (getsMetropolis) requireRule(chosen, 'Elige la ciudad donde colocar la metrópolis.');
      pay(s, p, { [BRANCH_META[branch].commodity]: level + 1 - (ck.turnEffects?.crane ? 1 : 0) });
      if (ck.turnEffects) delete ck.turnEffects.crane;
      p.citiesKnights!.improvements[branch]++;
      if (getsMetropolis) { for (const v of vertices(s)) if (v.metropolis === branch) delete v.metropolis; chosen!.metropolis = branch; ck.metropolisOwners[branch] = id; }
      log(s, `${p.name}: ${BRANCH_META[branch].name} ${level + 1}${getsMetropolis ? ', obtiene la metrópolis' : ''}.`); break;
    }
    case 'PLAY_PROGRESS_CARD': {
      const card = p.citiesKnights!.progressCards.find(c => c.id === action.cardId);
      requireRule(card, 'Carta de progreso no disponible.');
      requireRule(card!.type === 'ALCHEMIST' ? s.phase === 'WAITING_FOR_DICE' && s.turn.activePlayerId === id : isActionPhase(s, id), 'Esa carta no puede jugarse en esta fase.');
      p.citiesKnights!.progressCards = p.citiesKnights!.progressCards.filter(c => c.id !== card!.id);
      playProgress(s, p, card!, action.payload || {}, hooks, ctx);
      ck.decks[card!.branch].push(card!);
      s.lastEvent = {
        nonce: (s.lastEvent?.nonce || 0) + 1,
        type: 'PROGRESS_CARD_PLAYED',
        progressCardType: card!.type,
        actorPlayerId: id,
        actorPlayerName: p.name,
      } as never;
      log(s, `${p.name} juega ${PROGRESS_CARDS[card!.type].name}.`); break;
    }
    case 'COMMERCIAL_HARBOR_TRADE': {
      const rival = player(s, action.targetPlayerId);
      requireRule(isActionPhase(s, id) && ck.turnEffects?.harborPartners?.includes(action.targetPlayerId) && ALL_RESOURCES.includes(action.resource) && p.resources[action.resource] > 0, 'Intercambio de Puerto de mercancías no disponible.');
      ck.turnEffects!.harborPartners = ck.turnEffects!.harborPartners!.filter(pid => pid !== rival.id);
      if (COMMODITIES.some(r => (rival.resources[r] || 0) > 0)) {
        transfer(p, rival, action.resource, 1);
        ck.choices.push({ kind: 'GIFT', playerId: rival.id, beneficiaryId: id, amount: 1, commodityOnly: true });
      }
      break;
    }
    case 'RESOLVE_CK_CHOICE': {
      const choiceIndex = ck.choices.findIndex(c => c.playerId === id);
      requireRule(choiceIndex !== -1 && s.phase === 'CK_CHOICE', 'No tienes ninguna decisión pendiente.');
      const [choice] = ck.choices.splice(choiceIndex, 1);
      switch (choice.kind) {
        case 'BARBARIAN_DEFENSE': {
          const ids = action.vertexIds || [];
          requireRule(ck.pendingDefense && new Set(ids).size === ids.length && ids.every(vid => { const k = s.board.vertices[vid]?.knight; return k?.playerId === id && k.active; }), 'Elige sólo caballeros activos propios para defender.');
          ck.pendingDefense![id] = ids;
          if (!ck.choices.some(c => c.kind === 'BARBARIAN_DEFENSE')) {
            const participating = new Set(Object.values(ck.pendingDefense!).flat());
            delete ck.pendingDefense;
            resolveBarbarianAttack(s, participating);
          }
          break;
        }
        case 'CITY_LOSS': loseCity(s, p, action.vertexId); break;
        case 'DEFENDER_CARD': requireRule(CK_BRANCHES.includes(action.branch!), 'Elige un mazo.'); draw(s, id, action.branch!); break;
        case 'AQUEDUCT': requireRule(ALL_RESOURCES.includes(action.resource!) && s.bank[action.resource!] > 0, 'Elige un recurso disponible.'); take(s, p, action.resource!, 1); break;
        case 'PROGRESS_DISCARD': {
          const c = p.citiesKnights!.progressCards.find(c => c.id === action.cardId); requireRule(c, 'Elige una carta para devolver al fondo del mazo.');
          p.citiesKnights!.progressCards = p.citiesKnights!.progressCards.filter(card => card.id !== c!.id); ck.decks[c!.branch].push(c!);
          if (p.citiesKnights!.progressCards.length > 4) ck.choices.unshift(choice); break;
        }
        case 'RETREAT':
          requireRule(choice.vertexIds.includes(action.vertexId || '') && !s.board.vertices[action.vertexId!].knight && !s.board.vertices[action.vertexId!].building, 'Retirada inválida.');
          s.board.vertices[action.vertexId!].knight = choice.knight; refreshRoads(s); break;
        case 'GIFT':
          requireRule(validBundle(action.resources, p, choice.amount, choice.commodityOnly), 'Selecciona las cartas que debes entregar.');
          for (const r of ALL_TRADE_CARDS) transfer(p, player(s, choice.beneficiaryId), r, action.resources![r] || 0); break;
        case 'DESERTER': {
          const v = s.board.vertices[action.vertexId || '']; requireRule(v?.knight?.playerId === id, 'Elige uno de tus caballeros.');
          const k = v.knight!; delete v.knight;
          const beneficiary = choice.beneficiaryId;
          const rank = freeRank(s, beneficiary, k.rank) ? k.rank : freeRank(s, beneficiary, 1) ? 1 : null;
          if (rank && knightRecruitVertices(s, beneficiary).length) ck.choices.unshift({ kind: 'DESERTER_PLACE', playerId: beneficiary, knight: { ...k, rank, playerId: beneficiary, promotedOnTurn: -1 } });
          refreshRoads(s); break;
        }
        case 'DESERTER_PLACE':
          requireRule(knightRecruitVertices(s, id).includes(action.vertexId || ''), 'Elige un vértice conectado libre.');
          s.board.vertices[action.vertexId!].knight = choice.knight; refreshRoads(s); break;
      }
      finishChoices(s, hooks); return true;
    }
    case 'END_TURN': {
      if (s.phase !== 'MAIN_PHASE' || s.turn.activePlayerId !== id) return false;
      requireRule(!s.turn.pendingGoldClaims?.some(c => c.amount > 0), 'Quedan recursos de oro por elegir.');
      if (p.citiesKnights!.progressCards.length > 4) {
        ck.choices.push({ kind: 'PROGRESS_DISCARD', playerId: id }); s.phase = 'CK_CHOICE'; return true;
      }
      hooks.score(s); if (s.winnerId) return true;
      ck.turnEffects = {};
      if (s.config.maxPlayers > 4) {
        const others = inTurnOrder(s).slice(1).filter(p => p.status !== 'ABANDONED' && p.status !== 'FROZEN_SKIP').map(p => p.id);
        if (others.length) { resetSpecialBuildCounters(s); ck.specialBuild = { turnOwnerId: id, remainingPlayerIds: others.slice(1) }; s.turn.activePlayerId = others[0]; s.phase = 'SPECIAL_BUILD_PHASE'; s.activeTradeOffers = []; return true; }
      }
      hooks.nextTurn(s); return true;
    }
    case 'END_SPECIAL_BUILD': {
      requireRule(s.phase === 'SPECIAL_BUILD_PHASE' && s.turn.activePlayerId === id && ck.specialBuild, 'No es tu fase especial de construcción.');
      const next = ck.specialBuild!.remainingPlayerIds.shift();
      if (next) { resetSpecialBuildCounters(s); s.turn.activePlayerId = next; }
      else { s.turn.activePlayerId = ck.specialBuild!.turnOwnerId; delete ck.specialBuild; hooks.nextTurn(s); }
      return true;
    }
    case 'BUY_DEV_CARD': case 'PLAY_DEV_CARD': throw new Error('Las cartas de progreso sustituyen al desarrollo y al Gran Ejército.');
    default: return false;
  }
  if (ck.choices.length) s.phase = 'CK_CHOICE';
  hooks.score(s);
  return true;
}

/** Used for bots/timeouts only. Human choices always remain explicit actions. */
export function automaticCKChoice(s: GameState): { playerId: string; action: GameAction } | null {
  const c = s.citiesKnights?.choices[0]; if (!c) return null;
  const p = player(s, c.playerId);
  const action: Extract<GameAction, { type: 'RESOLVE_CK_CHOICE' }> = { type: 'RESOLVE_CK_CHOICE' };
  switch (c.kind) {
    case 'BARBARIAN_DEFENSE': action.vertexIds = ownKnights(s, p.id).filter(v => v.knight!.active).map(v => v.id); break;
    case 'CITY_LOSS': action.vertexId = cities(s, p.id).find(v => !v.metropolis)?.id; break;
    case 'DEFENDER_CARD': action.branch = CK_BRANCHES.find(b => s.citiesKnights!.decks[b].length) || 'SCIENCE'; break;
    case 'AQUEDUCT': action.resource = ALL_RESOURCES.find(r => s.bank[r] > 0); break;
    case 'PROGRESS_DISCARD': action.cardId = p.citiesKnights!.progressCards[0]?.id; break;
    case 'RETREAT': action.vertexId = c.vertexIds[0]; break;
    case 'DESERTER': action.vertexId = ownKnights(s, p.id)[0]?.id; break;
    case 'DESERTER_PLACE': action.vertexId = knightRecruitVertices(s, p.id)[0]; break;
    case 'GIFT': {
      const bundle: CardBundle = createEmptyResources(); let left = c.amount;
      for (const r of c.commodityOnly ? COMMODITIES : ALL_TRADE_CARDS) { const n = Math.min(left, p.resources[r] || 0); bundle[r] = n; left -= n; }
      action.resources = bundle; break;
    }
  }
  return { playerId: c.playerId, action };
}

/** Deterministic tactical candidates; the shared dispatcher validates every candidate. */
export function citiesKnightsBotActions(s: GameState, id: string): GameAction[] {
  if (!s.citiesKnights || !isBuildPhase(s, id)) return [];
  const p = player(s, id); const ck = s.citiesKnights;
  const actions: GameAction[] = [];
  const own = ownKnights(s, id);
  const city = cities(s, id).find(v => !v.metropolis);
  for (const b of [...CK_BRANCHES].sort((a, b) => p.citiesKnights!.improvements[a] - p.citiesKnights!.improvements[b])) {
    if (p.citiesKnights!.improvements[b] < 5 && (p.resources[BRANCH_META[b].commodity] || 0) >= p.citiesKnights!.improvements[b] + 1) actions.push({ type: 'IMPROVE_CITY', branch: b, vertexId: city?.id });
  }
  for (const v of own) {
    if (!v.knight!.active && p.resources.WHEAT) actions.push({ type: 'ACTIVATE_KNIGHT', vertexId: v.id });
  }
  if (p.resources.ORE && p.resources.SHEEP) {
    if (own.length < 3 && freeRank(s, id, 1)) {
      const target = knightRecruitVertices(s, id)[0];
      if (target) actions.push({ type: 'RECRUIT_KNIGHT', vertexId: target });
    }
    for (const v of own) actions.push({ type: 'PROMOTE_KNIGHT', vertexId: v.id });
  }
  if (p.resources.BRICK >= 2 && cardCount(p.resources) > safeHandLimitForBot(s, id)) {
    const v = cities(s, id).find(v => !v.cityWall); if (v) actions.push({ type: 'BUILD_CITY_WALL', vertexId: v.id });
  }
  if (s.phase !== 'MAIN_PHASE') return actions;
  const rivals = s.players.filter(p => p.id !== id);
  const higher = rivals.find(r => r.totalVictoryPoints > p.totalVictoryPoints);
  const adjacentOwn = (hid: string) => vertices(s).some(v => v.playerId === id && v.building && v.hexIds.includes(hid));
  for (const card of p.citiesKnights!.progressCards) {
    let payload: ProgressPayload = {};
    switch (card.type) {
      case 'ALCHEMIST': continue;
      case 'ENGINEER': payload.vertexId = cities(s, id).find(v => !v.cityWall)?.id; break;
      case 'SMITH': payload.vertexIds = own.filter(v => v.knight!.rank < 3 && v.knight!.promotedOnTurn !== s.turn.turnNumber && (v.knight!.rank < 2 || p.citiesKnights!.improvements.POLITICS >= 3)).slice(0, 2).map(v => v.id); break;
      case 'INVENTOR': payload.hexIds = Object.values(s.board.hexes).filter(h => h.numberToken && ![2, 12, 6, 8].includes(h.numberToken) && adjacentOwn(h.id)).slice(0, 2).map(h => h.id); break;
      case 'DESERTER': payload.targetPlayerId = rivals.find(r => ownKnights(s, r.id).length)?.id; break;
      case 'SPY': { const rival = rivals.find(r => r.citiesKnights!.progressCards.length); payload.targetPlayerId = rival?.id; payload.targetCardId = rival?.citiesKnights!.progressCards[0]?.id; break; }
      case 'INTRIGUE': payload.vertexId = vertices(s).find(v => v.knight && v.knight.playerId !== id && v.adjacentEdgeIds.some(e => s.board.edges[e].playerId === id))?.id; break;
      case 'BISHOP': payload.hexId = Object.values(s.board.hexes).find(h => h.terrain !== 'SEA' && h.terrain !== 'FOG' && h.id !== s.board.robberHexId && vertices(s).some(v => v.building && v.playerId !== id && v.hexIds.includes(h.id)))?.id; break;
      case 'MERCHANT': payload.hexId = Object.values(s.board.hexes).find(h => ALL_RESOURCES.includes(h.terrain as ResourceType) && adjacentOwn(h.id))?.id; break;
      case 'MERCHANT_FLEET': payload.resource = [...ALL_TRADE_CARDS].sort((a, b) => (p.resources[b] || 0) - (p.resources[a] || 0))[0]; break;
      case 'COMMODITY_MONOPOLY': case 'RESOURCE_MONOPOLY': payload.resource = [...(card.type === 'COMMODITY_MONOPOLY' ? COMMODITIES : ALL_RESOURCES)].sort((a, b) => rivals.reduce((n, r) => n + (r.resources[b] || 0) - (r.resources[a] || 0), 0))[0]; break;
      case 'MASTER_MERCHANT': {
        if (!higher) continue; payload.targetPlayerId = higher.id; const bundle: CardBundle = createEmptyResources(); let left = Math.min(2, cardCount(higher.resources));
        for (const r of ALL_TRADE_CARDS) { const n = Math.min(left, higher.resources[r] || 0); bundle[r] = n; left -= n; } payload.resources = bundle; break;
      }
      case 'DIPLOMAT': payload.edgeId = Object.values(s.board.edges).find(e => e.building === 'ROAD' && e.playerId !== id)?.id; break;
    }
    actions.push({ type: 'PLAY_PROGRESS_CARD', cardId: card.id, payload });
  }
  return actions;
}
function safeHandLimitForBot(s: GameState, id: string): number { return 7 + 2 * cities(s, id).filter(v => v.cityWall).length; }

function resetSpecialBuildCounters(s: GameState): void {
  s.turn.infrastructureBuiltThisTurn = 0; s.turn.tradesAndBurnsThisTurn = 0; s.turn.hasTradedThisTurn = false; s.turn.hasSpentOrBuiltThisTurn = false;
}
