import React, { useEffect, useRef, useState } from 'react';
import {
  ALL_RESOURCES,
  ALL_TRADE_CARDS,
  PLAYER_COLORS,
  PROGRESS_BACK_IMAGE_PATHS,
  PROGRESS_CARD_IMAGE_PATHS,
  RESOURCE_META,
  TERRAIN_META,
  createEmptyResources,
} from '../../shared/constants';
import {
  BRANCH_META,
  CK_BRANCHES,
  COMMODITIES,
  PROGRESS_CARDS,
  cardCount,
  safeHandLimit,
} from '../../shared/citiesKnightsConfig';
import {
  knightRecruitVertices,
  knightReachableVertices,
  ownKnights,
  freeRank,
  isOpenEdge,
  isRobberUnlocked,
} from '../../shared/engine/CitiesAndKnights';
import type {
  CardBundle,
  GameAction,
  GameState,
  ImprovementBranch,
  PlayerState,
  ResourceType,
  TradeCardType,
  Vertex,
} from '../../shared/types';
import type { ProgressPayload } from '../../shared/citiesKnightsTypes';
import { ResourceIcon } from '../UI/ResourceIcon';
import type { ActiveKnightMode } from './KnightsDrawerMenu';
import { Castle, Flame, ShieldAlert, Sparkles, Swords, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const field =
  'w-full rounded-xl bg-stone-950/90 border border-stone-700/80 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-400';
const button =
  'rounded-xl border border-amber-500/50 bg-amber-900/40 px-3.5 py-2 text-xs font-bold text-amber-100 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-800/60 transition cursor-pointer shadow-sm';

interface Props {
  gameState: GameState;
  playerId: string;
  dispatchAction: (action: GameAction) => void;
  onHighlightVertex?: (id: string | null) => void;
  onStartKnightMode?: (mode: ActiveKnightMode) => void;
  onStartMerchantMode?: () => void;
  onStartDiplomatMode?: () => void;
  onStartWallMode?: () => void;
  isDiceAnimating?: boolean;
}

function location(s: GameState, id: string): string {
  const v = s.board.vertices[id];
  if (!v) return '';
  return v.hexIds
    .map((hid) => {
      const h = s.board.hexes[hid];
      if (!h) return '';
      if (h.terrain === 'SEA') return 'Mar';
      if (h.terrain === 'GOLD') return 'Oro';
      if (h.terrain === 'DESERT') return 'Desierto';
      if (h.terrain === 'FOG') return 'Niebla';
      const meta =
        (RESOURCE_META as Record<string, { terrainName: string }>)[h.terrain] ||
        (TERRAIN_META as Record<string, { name: string }>)[h.terrain];
      const terrainLabel =
        (meta as { terrainName?: string; name?: string })?.terrainName ||
        (meta as { name?: string })?.name ||
        h.terrain;
      return `${terrainLabel} ${h.numberToken || ''}`;
    })
    .filter(Boolean)
    .join(' / ');
}

function HandSelection({
  hand,
  value,
  onChange,
  commoditiesOnly = false,
}: {
  hand: CardBundle;
  value: CardBundle;
  onChange: (cards: CardBundle) => void;
  commoditiesOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {(commoditiesOnly ? COMMODITIES : ALL_TRADE_CARDS).map((r) => (
        <label
          key={r}
          className="text-xs text-center flex flex-col items-center bg-stone-900/60 p-2 rounded-xl border border-stone-800"
        >
          <span className="flex justify-center mb-1">
            <ResourceIcon resource={r} size={22} />
          </span>
          <span className="text-[11px] font-semibold text-stone-200">
            {RESOURCE_META[r]?.name || r}
          </span>
          <span className="text-[10px] text-stone-400 mb-1.5 font-mono">
            ({hand[r] || 0} disponibles)
          </span>
          <input
            className={`${field} text-center`}
            aria-label={`Cantidad de ${RESOURCE_META[r]?.name || r}`}
            type="number"
            min={0}
            max={hand[r] || 0}
            value={value[r] || 0}
            onChange={(e) =>
              onChange({
                ...value,
                [r]: Math.max(0, Math.min(hand[r] || 0, Number(e.target.value))),
              })
            }
          />
        </label>
      ))}
    </div>
  );
}

export function CitiesKnightsPanel({
  gameState: s,
  playerId,
  dispatchAction,
  onHighlightVertex,
  onStartKnightMode,
  onStartMerchantMode,
  onStartDiplomatMode,
  onStartWallMode,
  isDiceAnimating = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'KNIGHTS' | 'CITIES' | 'PROGRESS'>('KNIGHTS');
  const [branch, setBranch] = useState<ImprovementBranch>('SCIENCE');
  const [selectedCard, setSelectedCard] = useState('');
  const [payload, setPayload] = useState<ProgressPayload>({});
  const [defenseKnights, setDefenseKnights] = useState<string[]>([]);
  const [gift, setGift] = useState<CardBundle>(createEmptyResources);
  const [choiceVertex, setChoiceVertex] = useState('');
  const [choiceCard, setChoiceCard] = useState('');
  const [choiceResource, setChoiceResource] = useState<ResourceType>('WOOD');

  // Delay city loss overlay until dice finish rolling (3.6s)
  const [diceWaitDelay, setDiceWaitDelay] = useState(false);
  const lastDiceNonceRef = useRef<number | null>(null);

  const ck = s.citiesKnights;
  const me = s.players.find((p) => p.id === playerId);

  // Find the choice specifically belonging to the local player for parallel resolutions!
  const myChoice = ck?.choices.find((c) => c.playerId === playerId);

  useEffect(() => {
    const ev = s.lastEvent;
    if (!ev || ev.type !== 'DICE_ROLLED' || ev.nonce === lastDiceNonceRef.current) return;
    lastDiceNonceRef.current = ev.nonce;

    if (ev.barbarianAttack || ev.dice) {
      setDiceWaitDelay(true);
      const timer = setTimeout(() => {
        setDiceWaitDelay(false);
      }, 3600);
      return () => clearTimeout(timer);
    }
  }, [s.lastEvent?.nonce]);

  useEffect(() => {
    setGift(createEmptyResources());
    setChoiceVertex('');
    setChoiceCard('');
    setDefenseKnights(
      Object.values(s.board.vertices)
        .filter((v) => v.knight?.playerId === playerId && v.knight.active)
        .map((v) => v.id)
    );
  }, [myChoice?.kind, myChoice?.playerId, s.turn.turnNumber, playerId, s.board.vertices]);

  useEffect(() => () => onHighlightVertex?.(null), [onHighlightVertex]);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      setTab('PROGRESS');
    };
    window.addEventListener('open-cities-knights', show);
    return () => window.removeEventListener('open-cities-knights', show);
  }, []);

  if (!ck || !me?.citiesKnights) return null;

  const mine = me.citiesKnights;
  const vs = Object.values(s.board.vertices);
  const ownKnightVertices = vs.filter((v) => v.knight?.playerId === me.id);
  const ownCities = vs.filter((v) => v.playerId === me.id && v.building === 'CITY');
  const buildAllowed =
    !s.turn.isPausedByHost &&
    s.turn.activePlayerId === me.id &&
    ['MAIN_PHASE', 'SPECIAL_BUILD_PHASE'].includes(s.phase);
  const actionAllowed = buildAllowed && s.phase === 'MAIN_PHASE';
  const card = mine.progressCards.find((c) => c.id === selectedCard);
  const target = s.players.find((p) => p.id === payload.targetPlayerId);

  const rivalOptions = s.players
    .filter((p) => p.id !== me.id)
    .map((p) => ({ id: p.id, name: `${p.name} · ${p.publicVictoryPoints} PV` }));
  const resourceOptions = (resources: TradeCardType[]) =>
    resources.map((r) => ({ id: r, name: RESOURCE_META[r]?.name || r }));
  const setData = (data: Partial<ProgressPayload>) => setPayload((p) => ({ ...p, ...data }));
  const totalCities = vs.filter((v) => v.building === 'CITY').length;
  const defense = vs.reduce((n, v) => n + (v.knight?.active ? v.knight.rank : 0), 0);

  const neededRival = card && ['DESERTER', 'SPY', 'MASTER_MERCHANT'].includes(card.type);
  const neededResource =
    card &&
    ['MERCHANT_FLEET', 'COMMODITY_MONOPOLY', 'RESOURCE_MONOPOLY'].includes(card.type);

  // Check if city loss should wait for dice
  const shouldHoldCityLoss = (isDiceAnimating || diceWaitDelay) && myChoice?.kind === 'CITY_LOSS';

  return (
    <>
      {/* C&K HUD Box - Relocated to the immediate right of the bottom action drawer */}
      <div className="cities-knights-hud absolute bottom-3 left-[215px] sm:left-[240px] z-30 w-[240px] sm:w-[265px] rounded-2xl border border-[#d4af37]/45 bg-[#160f0a]/95 backdrop-blur-xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.9)] text-stone-100 pointer-events-auto">
        <button
          type="button"
          className="flex justify-between items-center w-full text-xs font-black text-amber-200 hover:text-amber-100 transition cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-1.5">
            <Castle className="w-3.5 h-3.5 text-amber-400" />
            <span>Ciudades y Caballeros</span>
          </span>
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
            ＋
          </span>
        </button>

        <div className="ck-hud-details mt-2">
          {/* Barbarian Advance Track 0..7 */}
          <div
            className="flex items-center justify-between gap-1"
            aria-label={`Bárbaros: ${ck.barbarianPosition} de 7`}
          >
            {Array.from({ length: 8 }, (_, i) => {
              const isCurrent = i === ck.barbarianPosition;
              return (
                <span
                  key={i}
                  className={`flex h-5 w-5 items-center justify-center rounded-lg text-[10px] font-black transition ${
                    isCurrent
                      ? 'bg-red-700 border-2 border-red-300 text-white shadow-[0_0_10px_rgba(239,68,68,0.8)] scale-110'
                      : i < ck.barbarianPosition
                      ? 'bg-red-950/80 text-red-300/80 border border-red-800/40'
                      : 'bg-stone-900 text-stone-500 border border-stone-800'
                  }`}
                  title={isCurrent ? 'Posición actual de la flota bárbara' : `Avance ${i}`}
                >
                  {isCurrent ? '⛵' : i}
                </span>
              );
            })}
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-300">
            <span className="font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-emerald-400" />
              <span>Def. {defense}</span>
              <span className="text-stone-500">/</span>
              <span className="text-red-300">{totalCities} Bárbaros</span>
            </span>
            <span className="text-stone-400">
              Mano segura: <strong className="text-amber-200">{safeHandLimit(s, me.id)}</strong>
            </span>
          </div>

          <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-white/10">
            {CK_BRANCHES.map((b) => (
              <span
                key={b}
                style={{ color: BRANCH_META[b].color }}
                className="text-[10px] font-black flex items-center gap-0.5"
                title={`${BRANCH_META[b].name}: nivel ${mine.improvements[b]}`}
              >
                <span>{BRANCH_META[b].name[0]}</span>
                <span className="font-mono text-amber-100">Nv.{mine.improvements[b]}</span>
              </span>
            ))}
          </div>

          {ck.eventDie && (
            <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-white/10 text-[10px]">
              <img
                alt="Dado de evento"
                className="h-5 w-5 object-contain"
                src={`/assets/cities-knights/events/${
                  ck.eventDie === 'BARBARIAN' ? 'barbarian' : ck.eventDie.toLowerCase()
                }.svg`}
              />
              <span className="truncate text-stone-200">
                {s.turn.diceRoll && (
                  <>
                    <strong className="text-red-400">{s.turn.diceRoll[0]}</strong> +{' '}
                    <strong>{s.turn.diceRoll[1]}</strong> ·{' '}
                  </>
                )}
                {ck.eventDie === 'BARBARIAN' ? 'Avance bárbaro' : BRANCH_META[ck.eventDie].name}
              </span>
            </div>
          )}

          {ck.choices.length > 0 && (
            <p className="text-[10px] text-amber-300 font-bold mt-1.5 animate-pulse truncate">
              Decisión pendiente:{' '}
              {ck.choices
                .map((c) => s.players.find((p) => p.id === c.playerId)?.name)
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>

        {s.phase === 'SPECIAL_BUILD_PHASE' && s.turn.activePlayerId === me.id && (
          <button
            type="button"
            className={`ck-special-build ${button} w-full mt-2 bg-gradient-to-r from-emerald-700 to-teal-800 text-white`}
            onClick={() => dispatchAction({ type: 'END_SPECIAL_BUILD' })}
          >
            Terminar construcción especial
          </button>
        )}
      </div>

      {/* Main Expansion Dialog */}
      {open && (
        <div
          className="cities-knights-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ciudades y Caballeros"
        >
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-gradient-to-b from-[#1e140d] to-[#120a06] border-2 border-[#d4af37]/70 rounded-3xl p-5 space-y-4 text-stone-100 shadow-[0_20px_70px_rgba(0,0,0,0.95)]">
            <div className="flex justify-between items-center border-b border-[#d4af37]/30 pb-3">
              <div className="flex items-center gap-2.5">
                <Castle className="w-6 h-6 text-amber-400" />
                <h2 className="font-display font-black text-xl text-amber-100 uppercase tracking-wide">
                  Ciudades y Caballeros
                </h2>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
                onClick={() => {
                  setOpen(false);
                  onHighlightVertex?.(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="ck-tabs flex gap-2">
              {(['KNIGHTS', 'CITIES', 'PROGRESS'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                    tab === t
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-lg'
                      : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                  onClick={() => setTab(t)}
                >
                  {t === 'KNIGHTS'
                    ? 'Caballeros'
                    : t === 'CITIES'
                    ? 'Mejoras y Murallas'
                    : `Progreso (${mine.progressCards.length}/4)`}
                </button>
              ))}
            </div>

            {/* TAB: KNIGHTS (Direct Map Interaction Triggers) */}
            {tab === 'KNIGHTS' && (
              <div className="space-y-4">
                <p className="text-xs text-stone-300 leading-relaxed bg-black/30 p-3 rounded-2xl border border-white/5">
                  Reclutar o ascender cuesta <strong>1 oveja + 1 mineral</strong>. Activar cuesta{' '}
                  <strong>1 trigo</strong>. Un caballero activado durante este turno ya defiende
                  contra los bárbaros, pero actuará en el tablero a partir de un turno posterior.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-amber-200">
                        Colocar Caballero
                      </span>
                      <span className="text-[10px] text-stone-400">1 mineral + 1 oveja</span>
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Recluta un caballero básico en un cruce libre de tus caminos.
                    </p>
                    <button
                      type="button"
                      className={`${button} w-full`}
                      disabled={!buildAllowed || !freeRank(s, me.id, 1)}
                      onClick={() => {
                        setOpen(false);
                        onStartKnightMode?.('RECRUIT_KNIGHT');
                      }}
                    >
                      Seleccionar en el mapa
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-amber-200">
                        Ascender Caballero
                      </span>
                      <span className="text-[10px] text-stone-400">1 mineral + 1 oveja</span>
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Aumenta la fuerza y el rango de uno de tus caballeros (+1 defensa).
                    </p>
                    <button
                      type="button"
                      className={`${button} w-full`}
                      disabled={!buildAllowed}
                      onClick={() => {
                        setOpen(false);
                        onStartKnightMode?.('PROMOTE_KNIGHT');
                      }}
                    >
                      Seleccionar en el mapa
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-amber-200">
                        Activar Caballero
                      </span>
                      <span className="text-[10px] text-stone-400">1 trigo</span>
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Prepara un caballero inactivo para defender Catán y realizar acciones.
                    </p>
                    <button
                      type="button"
                      className={`${button} w-full`}
                      disabled={!buildAllowed}
                      onClick={() => {
                        setOpen(false);
                        onStartKnightMode?.('ACTIVATE_KNIGHT');
                      }}
                    >
                      Seleccionar en el mapa
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-amber-200">
                        Expulsar Ladrón / Pirata
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Gratis</span>
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Usa un caballero activo junto al Ladrón o Pirata para desplazarlo.
                    </p>
                    <button
                      type="button"
                      className={`${button} w-full`}
                      disabled={!actionAllowed}
                      onClick={() => {
                        setOpen(false);
                        onStartKnightMode?.('EXPEL_ROBBER');
                      }}
                    >
                      Seleccionar en el mapa
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-amber-200">
                        Mover / Desplazar Caballero
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Gratis</span>
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Reubica un caballero activo por tu red de caminos o desplaza a un caballero rival más débil.
                    </p>
                    <button
                      type="button"
                      className={`${button} w-full`}
                      disabled={!actionAllowed}
                      onClick={() => {
                        setOpen(false);
                        onStartKnightMode?.('MOVE_KNIGHT_FROM');
                      }}
                    >
                      Seleccionar en el mapa
                    </button>
                  </div>
                </div>

                <div className="border-t border-stone-800 pt-3 space-y-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 mb-2">
                    Estadísticas defensivas de la partida
                  </h4>
                  {s.players.map((p) => {
                    const pDef = vs.reduce(
                      (n, v) =>
                        n +
                        (v.knight?.playerId === p.id && v.knight.active
                          ? v.knight.rank
                          : 0),
                      0
                    );
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-black/40 border border-white/5"
                      >
                        <span
                          style={{ color: PLAYER_COLORS[p.color].primary }}
                          className="font-bold flex items-center gap-1.5"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{p.name}</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-stone-300">
                            Fuerza activa: <strong className="text-emerald-300 font-mono">{pDef}</strong>
                          </span>
                          <span className="text-amber-200 flex items-center gap-1">
                            <img
                              src="/assets/tokens/catan_chit.png"
                              className="w-3.5 h-3.5 object-contain"
                              alt=""
                            />
                            <span>Campeador: +{p.citiesKnights?.defenderPoints || 0} PV</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: CITIES (Improvements & Walls) */}
            {tab === 'CITIES' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-600/40 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black text-amber-100">Construir Muralla</h3>
                    <p className="text-[11px] text-stone-300 mt-0.5">
                      Coste: 2 arcillas · Añade +2 cartas seguras ante el 7 (máx. 3 murallas por jugador).
                    </p>
                  </div>
                  <button
                    type="button"
                    className={button}
                    disabled={!buildAllowed}
                    onClick={() => {
                      setOpen(false);
                      onStartWallMode?.();
                    }}
                  >
                    Seleccionar Ciudad en el mapa
                  </button>
                </div>

                <div className="space-y-3">
                  {CK_BRANCHES.map((b) => {
                    const meta = BRANCH_META[b];
                    const level = mine.improvements[b];
                    const nextCost = level + 1 - (ck.turnEffects?.crane ? 1 : 0);
                    return (
                      <div
                        key={b}
                        className="rounded-2xl border p-3.5 space-y-2.5 bg-black/40"
                        style={{ borderColor: meta.color }}
                      >
                        <div className="flex justify-between items-center">
                          <strong style={{ color: meta.color }} className="text-sm font-extrabold">
                            {meta.name} · Nivel {level}/5
                          </strong>
                          <span className="text-xs font-semibold text-stone-300">
                            {RESOURCE_META[meta.commodity]?.name || meta.commodity}:{' '}
                            <strong className="text-amber-300">{me.resources[meta.commodity] || 0}</strong>
                          </span>
                        </div>

                        <div className="flex gap-1.5">
                          {meta.levels.map((name, i) => (
                            <div
                              key={name}
                              title={name}
                              className={`flex-1 py-1.5 px-1 text-center rounded-xl text-[11px] font-black border transition ${
                                i < level
                                  ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                                  : 'bg-stone-900 border-stone-800 text-stone-500'
                              }`}
                            >
                              {i + 1}. {name}
                            </div>
                          ))}
                        </div>

                        <p className="text-[11px] text-stone-300 leading-relaxed">
                          {b === 'SCIENCE'
                            ? 'Nivel 3: Acueducto (un recurso a elegir si no produces con la tirada).'
                            : b === 'POLITICS'
                            ? 'Nivel 3: Fortaleza (permite ascender caballeros a poderosos de fuerza 3).'
                            : 'Nivel 3: Gremio comercial (todas las mercancías se intercambian a 2:1 con la banca).'}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[11px] text-stone-400">
                            Metrópolis:{' '}
                            <strong className="text-amber-200">
                              {s.players.find((p) => p.id === ck.metropolisOwners[b])?.name ||
                                'Sin propietario'}
                            </strong>
                            . Dado rojo:{' '}
                            <strong className="text-red-300 font-mono">
                              {level ? `1–${level + 1}` : 'Sin cobertura'}
                            </strong>
                            .
                          </p>

                          <button
                            type="button"
                            className={button}
                            disabled={
                              !buildAllowed ||
                              level === 5 ||
                              (me.resources[meta.commodity] || 0) < nextCost ||
                              ownCities.length === 0
                            }
                            onClick={() =>
                              dispatchAction({
                                type: 'IMPROVE_CITY',
                                branch: b,
                              })
                            }
                          >
                            {level < 5
                              ? `Comprar Nivel ${level + 1} (${nextCost} ${RESOURCE_META[meta.commodity]?.name})`
                              : 'Rama completada'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: PROGRESS (Interactive cards with direct map targeting) */}
            {tab === 'PROGRESS' && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  {CK_BRANCHES.map((b) => (
                    <div
                      key={b}
                      className="flex-1 text-center text-xs bg-black/40 p-2.5 rounded-2xl border border-white/5"
                    >
                      <img
                        className="h-20 mx-auto object-contain drop-shadow-md"
                        src={PROGRESS_BACK_IMAGE_PATHS[b]}
                        alt={`Mazo de ${BRANCH_META[b].name}`}
                      />
                      <span className="block font-bold mt-1.5 text-stone-300">
                        {BRANCH_META[b].name}
                      </span>
                      <span className="text-[10px] text-amber-300 font-mono">
                        {ck.decks[b].length} cartas en mazo
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {mine.progressCards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCard(c.id);
                        setPayload({});
                      }}
                      aria-pressed={selectedCard === c.id}
                      className={`rounded-2xl p-2.5 border text-xs text-left transition cursor-pointer flex flex-col justify-between ${
                        selectedCard === c.id
                          ? 'border-amber-400 bg-amber-950/70 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-[1.02]'
                          : 'border-stone-800 bg-black/50 hover:border-stone-700'
                      }`}
                    >
                      <div>
                        <img
                          className="h-32 sm:h-36 mx-auto object-contain rounded-lg drop-shadow"
                          src={PROGRESS_CARD_IMAGE_PATHS[c.type]}
                          alt=""
                        />
                        <strong className="block text-amber-100 mt-2 font-display">
                          {PROGRESS_CARDS[c.type].name}
                        </strong>
                        <span className="block text-[11px] text-stone-300 mt-1 leading-relaxed">
                          {PROGRESS_CARDS[c.type].description}
                        </span>
                      </div>
                      <span className="mt-2 text-[9px] font-black uppercase text-amber-400/90 tracking-wider">
                        Rama {BRANCH_META[c.branch].name}
                      </span>
                    </button>
                  ))}
                </div>

                {!mine.progressCards.length && (
                  <p className="text-xs text-stone-400 text-center py-6 bg-black/30 rounded-2xl border border-white/5">
                    No tienes cartas de progreso en la mano. Las obtendrás cuando el dado de evento
                    coincida con el color de una de tus ramas mejoradas y el dado rojo no supere tu nivel.
                  </p>
                )}

                {/* Selected Card Action Block */}
                {card && (
                  <div className="space-y-3 border-2 border-amber-500/60 rounded-2xl p-4 bg-[#1a120b]/90 shadow-xl">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-extrabold text-amber-100">
                        {PROGRESS_CARDS[card.type].name}
                      </strong>
                      <span className="text-[10px] uppercase font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20">
                        {BRANCH_META[card.branch].name}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300">{PROGRESS_CARDS[card.type].description}</p>

                    {/* Interactive targeting buttons depending on card type */}
                    {card.type === 'MERCHANT' && (
                      <button
                        type="button"
                        className={`${button} w-full py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-stone-950 font-black`}
                        disabled={!actionAllowed}
                        onClick={() => {
                          setOpen(false);
                          onStartMerchantMode?.();
                        }}
                      >
                        👑 Colocar Mercader en el mapa
                      </button>
                    )}

                    {card.type === 'DIPLOMAT' && (
                      <button
                        type="button"
                        className={`${button} w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black`}
                        disabled={!actionAllowed}
                        onClick={() => {
                          setOpen(false);
                          onStartDiplomatMode?.();
                        }}
                      >
                        🛣 Seleccionar Carretera / Barco en el mapa
                      </button>
                    )}

                    {card.type === 'ENGINEER' && (
                      <button
                        type="button"
                        className={`${button} w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-black`}
                        disabled={!actionAllowed}
                        onClick={() => {
                          setOpen(false);
                          onStartWallMode?.();
                        }}
                      >
                        🏰 Construir Muralla gratis en el mapa
                      </button>
                    )}

                    {neededRival && (
                      <div className="space-y-1 text-xs">
                        <label className="font-bold text-stone-300">Jugador rival objetivo</label>
                        <select
                          className={field}
                          value={payload.targetPlayerId || ''}
                          onChange={(e) => setData({ targetPlayerId: e.target.value })}
                        >
                          <option value="">Selecciona un rival…</option>
                          {rivalOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {neededResource && (
                      <div className="space-y-1 text-xs">
                        <label className="font-bold text-stone-300">Tipo de carta / recurso</label>
                        <select
                          className={field}
                          value={payload.resource || ''}
                          onChange={(e) => setData({ resource: e.target.value as TradeCardType })}
                        >
                          <option value="">Selecciona un tipo…</option>
                          {resourceOptions(
                            card.type === 'COMMODITY_MONOPOLY'
                              ? COMMODITIES
                              : card.type === 'RESOURCE_MONOPOLY'
                              ? ALL_RESOURCES
                              : ALL_TRADE_CARDS
                          ).map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {card.type === 'ALCHEMIST' && (
                      <div className="flex gap-4 p-3 bg-stone-900/60 rounded-xl border border-stone-800">
                        {[0, 1].map((i) => (
                          <label key={i} className="text-xs font-bold text-stone-200 flex-1">
                            <span>{i === 0 ? 'Dado rojo (1-6)' : 'Dado blanco (1-6)'}</span>
                            <input
                              className={`${field} mt-1 text-center font-mono text-sm`}
                              type="number"
                              min={1}
                              max={6}
                              value={payload.dice?.[i] || 1}
                              onChange={(e) => {
                                const dice: [number, number] = [...(payload.dice || [1, 1])];
                                dice[i] = Number(e.target.value);
                                setData({ dice });
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    )}

                    {card.type === 'MASTER_MERCHANT' && target && (
                      <HandSelection
                        hand={target.resources}
                        value={payload.resources || createEmptyResources()}
                        onChange={(resources) => setData({ resources })}
                      />
                    )}

                    {!['MERCHANT', 'DIPLOMAT', 'ENGINEER'].includes(card.type) && (
                      <button
                        type="button"
                        className={`${button} w-full`}
                        disabled={
                          s.turn.isPausedByHost ||
                          !(card.type === 'ALCHEMIST'
                            ? s.phase === 'WAITING_FOR_DICE' && s.turn.activePlayerId === me.id
                            : actionAllowed)
                        }
                        onClick={() =>
                          dispatchAction({
                            type: 'PLAY_PROGRESS_CARD',
                            cardId: card.id,
                            payload:
                              card.type === 'ALCHEMIST'
                                ? { ...payload, dice: payload.dice || [1, 1] }
                                : payload,
                          })
                        }
                      >
                        Jugar carta de progreso
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Modal (CITY_LOSS, BARBARIAN_DEFENSE, etc.) */}
      {/* Delayed until the 3.6s dice animation completes, and shows simultaneously to all victims */}
      {myChoice && s.phase === 'CK_CHOICE' && !s.turn.isPausedByHost && !shouldHoldCityLoss && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Decisión de Ciudades y Caballeros"
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-3xl border-2 p-6 text-stone-100 space-y-4 shadow-[0_25px_80px_rgba(0,0,0,0.95)] ${
              myChoice.kind === 'CITY_LOSS'
                ? 'bg-gradient-to-b from-[#2b0808] to-[#120404] border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]'
                : 'bg-stone-900 border-amber-500'
            }`}
          >
            <div className="flex items-center gap-3">
              {myChoice.kind === 'CITY_LOSS' ? (
                <div className="p-2.5 rounded-2xl bg-red-600/30 border border-red-400">
                  <Flame className="w-6 h-6 text-red-400 animate-pulse" />
                </div>
              ) : (
                <div className="p-2.5 rounded-2xl bg-amber-600/30 border border-amber-400">
                  <Swords className="w-6 h-6 text-amber-400" />
                </div>
              )}
              <div>
                <h2 className="font-display font-black text-lg text-amber-100">
                  {myChoice.kind === 'BARBARIAN_DEFENSE'
                    ? 'Doña Urraca: Elige tus defensores'
                    : myChoice.kind === 'CITY_LOSS'
                    ? '¡Asalto Bárbaro! Los bárbaros saquean Catán'
                    : myChoice.kind === 'AQUEDUCT'
                    ? 'Acueducto: Elige un recurso'
                    : myChoice.kind === 'DEFENDER_CARD'
                    ? 'Defensa empatada: Elige un mazo de progreso'
                    : myChoice.kind === 'PROGRESS_DISCARD'
                    ? 'Devuelve progreso hasta tener cuatro cartas'
                    : myChoice.kind === 'GIFT'
                    ? `Entrega ${myChoice.amount} carta(s) a ${
                        s.players.find((p) => p.id === myChoice.beneficiaryId)?.name
                      }`
                    : myChoice.kind === 'RETREAT'
                    ? 'Elige la retirada de tu caballero'
                    : myChoice.kind === 'DESERTER'
                    ? 'Desertor: Elige un caballero para retirar'
                    : 'Coloca el caballero recibido'}
                </h2>
                {myChoice.kind === 'CITY_LOSS' && (
                  <p className="text-xs text-red-200/90 mt-0.5">
                    La defensa de Catán ha caído. Como has aportado la menor fuerza defensiva, debes
                    reducir una de tus ciudades a un poblado.
                  </p>
                )}
              </div>
            </div>

            {myChoice.kind === 'CITY_LOSS' && (
              <div className="space-y-3">
                <p className="text-xs text-stone-300">
                  Selecciona cuál de tus ciudades deseas reducir a poblado (puedes pulsarla aquí o
                  directamente en el mapa):
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {ownCities
                    .filter((v) => !v.metropolis)
                    .map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setChoiceVertex(v.id);
                          onHighlightVertex?.(v.id);
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                          choiceVertex === v.id
                            ? 'bg-red-700/50 border-red-400 text-white shadow-lg'
                            : 'bg-black/40 border-stone-800 text-stone-300 hover:border-stone-600'
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-xs block text-amber-200">
                            Ciudad en {location(s, v.id)}
                          </span>
                          {v.cityWall && (
                            <span className="text-[10px] text-red-300 mt-0.5 block">
                              (La muralla se perderá)
                            </span>
                          )}
                        </div>
                        <span className="px-2 py-1 rounded-xl bg-stone-900 border border-white/10 text-xs font-mono font-bold text-amber-100">
                          {choiceVertex === v.id ? 'Seleccionada' : 'Elegir'}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {myChoice.kind === 'BARBARIAN_DEFENSE' && (
              <div className="space-y-3">
                <p className="text-xs text-stone-300">
                  Puedes reservar caballeros activos. Sólo se agotarán los que envíes a la batalla.
                </p>
                {ownKnightVertices
                  .filter((v) => v.knight!.active)
                  .map((v) => (
                    <label
                      key={v.id}
                      className="flex items-center gap-2.5 text-xs p-2.5 rounded-xl bg-black/40 border border-stone-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={defenseKnights.includes(v.id)}
                        onChange={(e) =>
                          setDefenseKnights((ids) =>
                            e.target.checked
                              ? [...ids, v.id]
                              : ids.filter((id) => id !== v.id)
                          )
                        }
                      />
                      <span className="font-bold text-amber-100">Fuerza {v.knight!.rank}</span>
                      <span className="text-stone-400">· {location(s, v.id)}</span>
                    </label>
                  ))}
              </div>
            )}

            {myChoice.kind === 'DEFENDER_CARD' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-300">Mazo de progreso a robar</label>
                <div className="grid grid-cols-3 gap-2">
                  {CK_BRANCHES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBranch(b)}
                      className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                        branch === b
                          ? 'bg-amber-500/30 border-amber-400 text-amber-100 font-bold'
                          : 'bg-black/40 border-stone-800 text-stone-400'
                      }`}
                    >
                      <img
                        src={PROGRESS_BACK_IMAGE_PATHS[b]}
                        className="h-16 mx-auto object-contain mb-1"
                        alt=""
                      />
                      <span>{BRANCH_META[b].name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {myChoice.kind === 'AQUEDUCT' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-300">
                  Recurso que reclamar con el Acueducto
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ALL_RESOURCES.filter((r) => s.bank[r] > 0).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setChoiceResource(r)}
                      className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 transition cursor-pointer ${
                        choiceResource === r
                          ? 'bg-amber-500/30 border-amber-400 font-bold'
                          : 'bg-black/40 border-stone-800'
                      }`}
                    >
                      <ResourceIcon resource={r} size={24} />
                      <span className="text-[10px] text-amber-100">{RESOURCE_META[r].name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {myChoice.kind === 'PROGRESS_DISCARD' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-300">
                  Carta de progreso a devolver al fondo del mazo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {mine.progressCards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChoiceCard(c.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        choiceCard === c.id
                          ? 'bg-red-950/60 border-red-400 text-white font-bold'
                          : 'bg-black/40 border-stone-800 text-stone-300'
                      }`}
                    >
                      <span className="text-xs block text-amber-200">
                        {PROGRESS_CARDS[c.type].name}
                      </span>
                      <span className="text-[10px] text-stone-400">{BRANCH_META[c.branch].name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {myChoice.kind === 'GIFT' && (
              <div className="space-y-3">
                <HandSelection
                  hand={me.resources}
                  value={gift}
                  onChange={setGift}
                  commoditiesOnly={myChoice.commodityOnly}
                />
                <p className="text-xs text-stone-300">
                  Seleccionadas:{' '}
                  <strong className="text-amber-300 font-mono">
                    {cardCount(gift)} / {myChoice.amount}
                  </strong>
                </p>
              </div>
            )}

            <button
              type="button"
              className={`${button} w-full py-2.5 text-sm bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-stone-950 font-black`}
              disabled={
                myChoice.kind === 'CITY_LOSS'
                  ? !choiceVertex
                  : myChoice.kind === 'GIFT'
                  ? cardCount(gift) !== myChoice.amount
                  : false
              }
              onClick={() =>
                dispatchAction({
                  type: 'RESOLVE_CK_CHOICE',
                  vertexId: choiceVertex || undefined,
                  vertexIds: defenseKnights,
                  branch,
                  resource: choiceResource,
                  cardId: choiceCard || undefined,
                  resources: gift,
                })
              }
            >
              Confirmar elección
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
