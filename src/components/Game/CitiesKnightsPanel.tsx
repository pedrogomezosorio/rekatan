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
  ownKnights,
  freeRank,
} from '../../shared/engine/CitiesAndKnights';
import type {
  CardBundle,
  GameAction,
  GameState,
  ImprovementBranch,
  ProgressCard,
  ResourceType,
  TradeCardType,
} from '../../shared/types';
import type { ProgressPayload } from '../../shared/citiesKnightsTypes';
import { ResourceIcon } from '../UI/ResourceIcon';
import type { ActiveKnightMode } from './KnightsDrawerMenu';
import { Castle, Flame, Minus, Plus, ShieldAlert, Sparkles, Swords, X } from 'lucide-react';
import { motion } from 'framer-motion';

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
  onStartBishopMode?: () => void;
  onStartIntrigueMode?: () => void;
  onStartWallMode?: () => void;
  onStartEngineerMode?: (card: ProgressCard) => void;
  onStartInventorMode?: (card: ProgressCard) => void;
  onStartSmithMode?: (card: ProgressCard) => void;
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

function hexLabel(s: GameState, hexId: string): string {
  const h = s.board.hexes[hexId];
  if (!h) return hexId;
  const meta =
    (RESOURCE_META as Record<string, { terrainName?: string; name?: string }>)[h.terrain] ||
    (TERRAIN_META as Record<string, { name?: string }>)[h.terrain];
  const name = meta?.terrainName || meta?.name || h.terrain;
  return `${name} (${h.numberToken ?? '-'})`;
}

function HandSelection({
  hand,
  value,
  onChange,
  maxTotal,
  commoditiesOnly = false,
}: {
  hand: CardBundle;
  value: CardBundle;
  onChange: (cards: CardBundle) => void;
  maxTotal?: number;
  commoditiesOnly?: boolean;
}) {
  const currentTotal = cardCount(value);
  const items = commoditiesOnly ? COMMODITIES : ALL_TRADE_CARDS;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((r) => {
        const available = hand[r] || 0;
        const selected = value[r] || 0;
        const canAdd = available > selected && (maxTotal === undefined || currentTotal < maxTotal);
        return (
          <div
            key={r}
            onClick={() => {
              if (canAdd) {
                onChange({ ...value, [r]: selected + 1 });
              } else if (selected > 0 && available > 0) {
                onChange({ ...value, [r]: 0 });
              }
            }}
            className={`text-xs text-center flex flex-col items-center p-2.5 rounded-2xl border transition select-none ${
              selected > 0
                ? 'bg-amber-500/25 border-amber-400 shadow-md shadow-amber-500/20 cursor-pointer'
                : available > 0
                ? 'bg-stone-900/70 border-stone-800 hover:border-stone-600 cursor-pointer'
                : 'bg-stone-950/40 border-stone-900 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="flex justify-center mb-1">
              <ResourceIcon resource={r} size={24} />
            </span>
            <span className="text-[11px] font-bold text-stone-100 truncate max-w-full">
              {RESOURCE_META[r]?.name || r}
            </span>
            <span className="text-[10px] text-stone-400 mb-2 font-mono">
              ({available} disp.)
            </span>
            <div
              className="flex items-center justify-center gap-2 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                disabled={selected <= 0}
                onClick={() =>
                  onChange({
                    ...value,
                    [r]: Math.max(0, selected - 1),
                  })
                }
                className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 flex items-center justify-center text-stone-200 cursor-pointer"
                aria-label={`Restar ${RESOURCE_META[r]?.name || r}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-black text-sm text-amber-300 min-w-[18px]">
                {selected}
              </span>
              <button
                type="button"
                disabled={!canAdd}
                onClick={() =>
                  onChange({
                    ...value,
                    [r]: Math.min(available, selected + 1),
                  })
                }
                className="w-6 h-6 rounded-lg bg-amber-600/80 hover:bg-amber-500 disabled:opacity-30 flex items-center justify-center text-stone-950 font-black cursor-pointer"
                aria-label={`Sumar ${RESOURCE_META[r]?.name || r}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CitiesKnightsPanel({
  gameState: s,
  playerId,
  dispatchAction,
  onHighlightVertex,
  onStartMerchantMode,
  onStartDiplomatMode,
  onStartBishopMode,
  onStartIntrigueMode,
  onStartWallMode,
  onStartEngineerMode,
  onStartInventorMode,
  onStartSmithMode,
  isDiceAnimating = false,
}: Props) {
  // Two separate modals:
  // - 'CITIES': opened by clicking the C&K HUD box -> exclusively City Improvements (levels 1-5 of the 3 branches, walls, metropolises)
  // - 'PROGRESS': opened by clicking the bottom Progreso (D) button -> Progress decks count + player's Progress Cards in hand
  const [modalMode, setModalMode] = useState<'CITIES' | 'PROGRESS' | null>(null);
  const [branch, setBranch] = useState<ImprovementBranch>('SCIENCE');
  const [selectedCard, setSelectedCard] = useState('');
  const [payload, setPayload] = useState<ProgressPayload>({});
  const [defenseKnights, setDefenseKnights] = useState<string[]>([]);
  const [gift, setGift] = useState<CardBundle>(createEmptyResources);
  const [choiceVertex, setChoiceVertex] = useState('');
  const [choiceCard, setChoiceCard] = useState('');
  const [choiceResource, setChoiceResource] = useState<ResourceType>('WOOD');
  const [harborRivalId, setHarborRivalId] = useState<string>('');
  const [harborResource, setHarborResource] = useState<ResourceType | ''>('');

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
    setChoiceCard('');
    setDefenseKnights(
      Object.values(s.board.vertices)
        .filter((v) => v.knight?.playerId === playerId && v.knight.active)
        .map((v) => v.id)
    );
    if (myChoice?.kind === 'RETREAT' && myChoice.vertexIds?.length === 1) {
      setChoiceVertex(myChoice.vertexIds[0]);
    } else if (
      myChoice?.kind === 'CITY_LOSS' &&
      Object.values(s.board.vertices).filter(
        (v) => v.playerId === playerId && v.building === 'CITY' && !v.metropolis
      ).length === 1
    ) {
      setChoiceVertex(
        Object.values(s.board.vertices).filter(
          (v) => v.playerId === playerId && v.building === 'CITY' && !v.metropolis
        )[0].id
      );
    } else if (
      myChoice?.kind === 'DESERTER' &&
      Object.values(s.board.vertices).filter((v) => v.knight?.playerId === playerId).length === 1
    ) {
      setChoiceVertex(
        Object.values(s.board.vertices).filter((v) => v.knight?.playerId === playerId)[0].id
      );
    } else if (myChoice?.kind === 'DESERTER_PLACE') {
      const recruits = knightRecruitVertices(s, playerId);
      if (recruits.length === 1) setChoiceVertex(recruits[0]);
      else setChoiceVertex('');
    } else {
      setChoiceVertex('');
    }
  }, [myChoice?.kind, myChoice?.playerId, s.turn.turnNumber, playerId, s.board.vertices]);

  useEffect(() => () => onHighlightVertex?.(null), [onHighlightVertex]);

  useEffect(() => {
    const showProgress = () => {
      setModalMode('PROGRESS');
    };
    const showCities = () => {
      setModalMode('CITIES');
    };
    window.addEventListener('open-cities-knights', showProgress);
    window.addEventListener('open-ck-cities', showCities);
    return () => {
      window.removeEventListener('open-cities-knights', showProgress);
      window.removeEventListener('open-ck-cities', showCities);
    };
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

  const setData = (data: Partial<ProgressPayload>) => setPayload((p) => ({ ...p, ...data }));
  const totalCities = vs.filter((v) => v.building === 'CITY').length;
  const defense = vs.reduce((n, v) => n + (v.knight?.active ? v.knight.rank : 0), 0);

  const neededRival = card && ['DESERTER', 'SPY', 'MASTER_MERCHANT'].includes(card.type);
  const neededResource =
    card &&
    ['MERCHANT_FLEET', 'COMMODITY_MONOPOLY', 'RESOURCE_MONOPOLY'].includes(card.type);

  // Eligible knights for SMITH (Fragua)
  const smithEligibleKnights = ownKnightVertices.filter(
    (v) =>
      v.knight &&
      v.knight.rank < 3 &&
      v.knight.promotedOnTurn !== s.turn.turnNumber &&
      (v.knight.rank !== 2 || mine.improvements.POLITICS >= 3) &&
      freeRank(s, me.id, v.knight.rank + 1)
  );

  // Eligible hexes for INVENTOR
  const inventorEligibleHexes = Object.values(s.board.hexes).filter(
    (h) => h.numberToken && ![2, 12, 6, 8].includes(h.numberToken)
  );

  // Adjacent hexes for IRRIGATION / MINING
  const adjacentOwnHex = (hexId: string): boolean =>
    vs.some((v) => v.playerId === me.id && v.building && v.hexIds.includes(hexId));
  const irrigationCount = Object.values(s.board.hexes).filter(
    (h) => h.terrain === 'WHEAT' && adjacentOwnHex(h.id)
  ).length;
  const miningCount = Object.values(s.board.hexes).filter(
    (h) => h.terrain === 'ORE' && adjacentOwnHex(h.id)
  ).length;

  // Rivals with commodities for COMMERCIAL_HARBOR
  const activeHarborPartners = (ck.turnEffects?.harborPartners || []).filter((pid) => {
    const p = s.players.find((pl) => pl.id === pid);
    return p && COMMODITIES.some((c) => (p.resources[c] || 0) > 0);
  });
  const rivalsWithCommodities = s.players.filter(
    (p) => p.id !== me.id && COMMODITIES.some((c) => (p.resources[c] || 0) > 0)
  );
  const myAvailableResources = ALL_RESOURCES.filter((r) => (me.resources[r] || 0) > 0);

  // Check if city loss should wait for dice
  const shouldHoldCityLoss = (isDiceAnimating || diceWaitDelay) && myChoice?.kind === 'CITY_LOSS';

  return (
    <>
      {/* Entire C&K HUD Box is clickable and opens the C&K City Improvements Menu */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setModalMode('CITIES')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setModalMode('CITIES');
          }
        }}
        className="cities-knights-hud absolute bottom-3 left-[215px] sm:left-[240px] z-30 w-[240px] sm:w-[265px] rounded-2xl border border-[#d4af37]/45 hover:border-amber-400/90 bg-[#160f0a]/95 hover:bg-[#1d140d]/98 backdrop-blur-xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.9)] text-stone-100 pointer-events-auto cursor-pointer transition-all group"
        title="Haz clic para abrir el menú de Ciudades y Caballeros (Mejoras de Ciudad)"
      >
        <div className="flex justify-between items-center w-full text-xs font-black text-amber-200 group-hover:text-amber-100 transition">
          <span className="flex items-center gap-1.5">
            <Castle className="w-3.5 h-3.5 text-amber-400" />
            <span>Ciudades y Caballeros</span>
          </span>
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 group-hover:bg-amber-500/35 text-amber-300 font-mono text-[10px]">
            ＋
          </span>
        </div>

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
            onClick={(e) => {
              e.stopPropagation();
              dispatchAction({ type: 'END_SPECIAL_BUILD' });
            }}
          >
            Terminar construcción especial
          </button>
        )}
      </div>

      {/* MODAL 1: CIUDADES Y CABALLEROS (Exclusively the 3 City Improvement Sectors) */}
      {modalMode === 'CITIES' && (
        <div
          className="cities-knights-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
          role="dialog"
          aria-modal="true"
          aria-label="Ciudades y Caballeros - Mejoras de Ciudad"
          onClick={() => {
            setModalMode(null);
            onHighlightVertex?.(null);
          }}
        >
          <div
            className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-gradient-to-b from-[#1e140d] to-[#120a06] border-2 border-[#d4af37]/70 rounded-3xl p-5 space-y-4 text-stone-100 shadow-[0_20px_70px_rgba(0,0,0,0.95)] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#d4af37]/30 pb-3">
              <div className="flex items-center gap-2.5">
                <Castle className="w-6 h-6 text-amber-400" />
                <div>
                  <h2 className="font-display font-black text-xl text-amber-100 uppercase tracking-wide">
                    Ciudades y Caballeros · Mejoras de Ciudad
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Desarrolla los 3 sectores de tus ciudades con mercancías para obtener habilidades y Metrópolis (+2 PV).
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
                onClick={() => {
                  setModalMode(null);
                  onHighlightVertex?.(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ck.turnEffects?.crane && (
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-400/60 text-xs text-emerald-200 font-bold flex items-center justify-between">
                <span>🏗️ Grúa activa: tu próxima mejora de ciudad este turno cuesta 1 mercancía menos.</span>
              </div>
            )}

            <div className="space-y-3">
              {CK_BRANCHES.map((b) => {
                const meta = BRANCH_META[b];
                const level = mine.improvements[b];
                const nextCost = Math.max(0, level + 1 - (ck.turnEffects?.crane ? 1 : 0));
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
                      <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                        <ResourceIcon resource={meta.commodity} size={16} />
                        <span>{RESOURCE_META[meta.commodity]?.name || meta.commodity}:</span>
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
                        ? 'Nivel 3: Acueducto (recibes 1 materia prima a elegir si el número de los dados no te produce nada).'
                        : b === 'POLITICS'
                        ? 'Nivel 3: Fortaleza (permite ascender tus caballeros fuertes a caballeros poderosos de nivel 3).'
                        : 'Nivel 3: Gremio comercial (puedes cambiar cualquier mercancía a razón 2:1 con la banca).'}
                    </p>

                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
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
                          ? `Mejorar a Nivel ${level + 1} (${nextCost} ${RESOURCE_META[meta.commodity]?.name})`
                          : 'Rama completada'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PROGRESO (Decks remaining counts + Player's Progress Cards in hand + Actions) */}
      {modalMode === 'PROGRESS' && (
        <div
          className="cities-knights-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
          role="dialog"
          aria-modal="true"
          aria-label="Cartas de Progreso"
          onClick={() => {
            setModalMode(null);
            onHighlightVertex?.(null);
          }}
        >
          <div
            className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-gradient-to-b from-[#1e140d] to-[#120a06] border-2 border-[#d4af37]/70 rounded-3xl p-5 space-y-4 text-stone-100 shadow-[0_20px_70px_rgba(0,0,0,0.95)] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#d4af37]/30 pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="font-display font-black text-xl text-amber-100 uppercase tracking-wide">
                    Cartas de Progreso ({mine.progressCards.length}/4)
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Mazos restantes por sector y tus cartas de progreso disponibles para jugar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
                onClick={() => {
                  setModalMode(null);
                  onHighlightVertex?.(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Progress Decks Remaining Count */}
            <div className="flex gap-3">
              {CK_BRANCHES.map((b) => (
                <div
                  key={b}
                  className="flex-1 text-center text-xs bg-black/45 p-2.5 rounded-2xl border"
                  style={{ borderColor: `${BRANCH_META[b].color}55` }}
                >
                  <img
                    className="h-20 mx-auto object-contain drop-shadow-md rounded-lg"
                    src={PROGRESS_BACK_IMAGE_PATHS[b]}
                    alt={`Mazo de ${BRANCH_META[b].name}`}
                  />
                  <span
                    className="block font-black mt-1.5"
                    style={{ color: BRANCH_META[b].color }}
                  >
                    {BRANCH_META[b].name}
                  </span>
                  <span className="text-[11px] text-amber-200 font-mono font-bold">
                    {ck.decks[b].length} cartas en mazo
                  </span>
                </div>
              ))}
            </div>

            {/* Active Commercial Harbor Ongoing Trades Panel */}
            {activeHarborPartners.length > 0 && actionAllowed && (
              <div className="p-4 rounded-2xl bg-amber-950/50 border-2 border-amber-400/80 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-xs sm:text-sm font-black text-amber-200">
                    ⚓ Puerto de Mercancías Activo ({activeHarborPartners.length} rival(es) disponibles)
                  </strong>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200">
                    Comercio Forzoso 1:1
                  </span>
                </div>
                <p className="text-xs text-stone-300">
                  Elige un rival con mercancías y la materia prima que le entregas; el rival deberá entregarte 1 mercancía de su mano:
                </p>
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-amber-100 block">
                    1. Selecciona el jugador rival:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {activeHarborPartners.map((pid) => {
                      const p = s.players.find((pl) => pl.id === pid);
                      if (!p) return null;
                      const commCount = COMMODITIES.reduce((sum, c) => sum + (p.resources[c] || 0), 0);
                      const isSel = harborRivalId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setHarborRivalId(p.id)}
                          className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                            isSel
                              ? 'bg-amber-500/35 border-amber-300 shadow-md scale-[1.02]'
                              : 'bg-black/50 border-stone-800 hover:border-stone-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: PLAYER_COLORS[p.color].primary }}
                            />
                            <span className="font-bold text-xs text-stone-100 truncate">{p.name}</span>
                          </div>
                          <span className="text-[10px] text-amber-300 font-mono block mt-1">
                            {commCount} mercancía(s) en mano
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-amber-100 block">
                    2. Selecciona la materia prima que entregas:
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    {ALL_RESOURCES.map((r) => {
                      const count = me.resources[r] || 0;
                      const isSel = harborResource === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          disabled={count <= 0}
                          onClick={() => setHarborResource(r)}
                          className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                            isSel
                              ? 'bg-amber-500/35 border-amber-300 font-bold scale-[1.03]'
                              : count > 0
                              ? 'bg-black/50 border-stone-800 hover:border-stone-600'
                              : 'bg-black/20 border-stone-900 opacity-35 cursor-not-allowed'
                          }`}
                        >
                          <ResourceIcon resource={r} size={22} />
                          <span className="text-[10px] text-amber-100">{RESOURCE_META[r].name}</span>
                          <span className="text-[9px] font-mono text-stone-400">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!harborRivalId || !harborResource || (me.resources[harborResource] || 0) <= 0}
                  onClick={() => {
                    if (!harborRivalId || !harborResource) return;
                    dispatchAction({
                      type: 'COMMERCIAL_HARBOR_TRADE',
                      targetPlayerId: harborRivalId,
                      resource: harborResource,
                    });
                    setHarborRivalId('');
                    setHarborResource('');
                  }}
                  className={`${button} w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black`}
                >
                  ⚓ Ofrecer Materia Prima por 1 Mercancía
                </button>
              </div>
            )}

            {/* Player's Progress Cards in Hand */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {mine.progressCards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCard(c.id);
                    setPayload(c.type === 'ALCHEMIST' ? { dice: [3, 4] } : {});
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
                  <span
                    className="mt-2 text-[9px] font-black uppercase tracking-wider"
                    style={{ color: BRANCH_META[c.branch].color }}
                  >
                    Rama {BRANCH_META[c.branch].name}
                  </span>
                </button>
              ))}
            </div>

            {!mine.progressCards.length && (
              <p className="text-xs text-stone-400 text-center py-6 bg-black/30 rounded-2xl border border-white/5">
                No tienes cartas de progreso en la mano. Las obtendrás cuando el dado de acontecimientos
                coincida con una rama mejorada de tu ciudad y el dado rojo esté dentro de tu cobertura.
              </p>
            )}

            {/* Revealed Victory Point Progress Cards (Imprenta / Constitución) */}
            {mine.revealedProgressCards && mine.revealedProgressCards.length > 0 && (
              <div className="p-3 rounded-2xl bg-black/35 border border-amber-500/30 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 block">
                  Cartas de Punto de Victoria Reveladas (+{mine.revealedProgressCards.length} PV)
                </span>
                <div className="flex gap-2 flex-wrap">
                  {mine.revealedProgressCards.map((rc) => (
                    <div
                      key={rc.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs"
                    >
                      <img
                        src={PROGRESS_CARD_IMAGE_PATHS[rc.type]}
                        alt=""
                        className="w-6 h-8 object-contain rounded"
                      />
                      <span className="font-bold text-amber-100">{PROGRESS_CARDS[rc.type].name} (+1 PV)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Card Action Block */}
            {card && (
              <div
                className="space-y-3 border-2 rounded-2xl p-4 bg-[#1a120b]/95 shadow-xl"
                style={{ borderColor: BRANCH_META[card.branch].color }}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-extrabold text-amber-100">
                    {PROGRESS_CARDS[card.type].name}
                  </strong>
                  <span
                    className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-black/50 border"
                    style={{
                      color: BRANCH_META[card.branch].color,
                      borderColor: BRANCH_META[card.branch].color,
                    }}
                  >
                    {BRANCH_META[card.branch].name}
                  </span>
                </div>
                <p className="text-xs text-stone-300">{PROGRESS_CARDS[card.type].description}</p>

                {/* MERCHANT */}
                {card.type === 'MERCHANT' && (
                  <button
                    type="button"
                    className={`${button} w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black`}
                    disabled={!actionAllowed}
                    onClick={() => {
                      setModalMode(null);
                      onStartMerchantMode?.();
                    }}
                  >
                    👑 Colocar Comerciante en el mapa
                  </button>
                )}

                {/* DIPLOMAT */}
                {card.type === 'DIPLOMAT' && (
                  <button
                    type="button"
                    className={`${button} w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-black`}
                    disabled={!actionAllowed}
                    onClick={() => {
                      setModalMode(null);
                      onStartDiplomatMode?.();
                    }}
                  >
                    🛣️ Seleccionar Carretera / Barco abierto en el mapa
                  </button>
                )}

                {/* ENGINEER (Free City Wall!) */}
                {card.type === 'ENGINEER' && (
                  <div className="space-y-2.5">
                    {ownCities.filter((c) => !c.cityWall).length === 0 ||
                    ownCities.filter((c) => c.cityWall).length >= 3 ? (
                      <p className="text-xs text-red-300 bg-red-950/40 p-2.5 rounded-xl border border-red-500/30">
                        Necesitas una ciudad sin muralla (máximo 3 murallas por jugador).
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ownCities
                            .filter((c) => !c.cityWall)
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                disabled={!actionAllowed}
                                onClick={() => {
                                  dispatchAction({
                                    type: 'PLAY_PROGRESS_CARD',
                                    cardId: card.id,
                                    payload: { vertexId: c.id },
                                  });
                                  setSelectedCard('');
                                  setModalMode(null);
                                }}
                                className="p-2.5 rounded-2xl border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/60 text-left flex items-center justify-between transition cursor-pointer"
                              >
                                <span className="text-xs font-bold text-emerald-100">
                                  🏰 Ciudad en {location(s, c.id)}
                                </span>
                                <span className="text-[10px] font-black text-emerald-300 px-2 py-0.5 rounded-lg bg-black/40">
                                  Amurallar Gratis
                                </span>
                              </button>
                            ))}
                        </div>
                        <button
                          type="button"
                          className={`${button} w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-stone-950 font-black`}
                          disabled={!actionAllowed}
                          onClick={() => {
                            setModalMode(null);
                            if (onStartEngineerMode) onStartEngineerMode(card);
                            else onStartWallMode?.();
                          }}
                        >
                          🏰 O elige tu Ciudad directamente en el mapa (Gratis)
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* SMITH (Fragua - Promote up to 2 knights for free) */}
                {card.type === 'SMITH' && (
                  <div className="space-y-2.5">
                    {smithEligibleKnights.length === 0 ? (
                      <p className="text-xs text-red-300 bg-red-950/40 p-2.5 rounded-xl border border-red-500/30">
                        No tienes caballeros que puedan ascender ahora (recuerda que ascender a nivel 3 requiere Fortaleza y piezas libres).
                      </p>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-emerald-200 block">
                          Selecciona 1 o 2 caballeros tuyos para ascender gratis:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {smithEligibleKnights.map((v) => {
                            const selectedIds = payload.vertexIds || [];
                            const isSel = selectedIds.includes(v.id);
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  const next = isSel
                                    ? selectedIds.filter((id) => id !== v.id)
                                    : selectedIds.length < 2
                                    ? [...selectedIds, v.id]
                                    : [selectedIds[1], v.id];
                                  setData({ vertexIds: next });
                                }}
                                className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                                  isSel
                                    ? 'bg-emerald-600/40 border-emerald-300 text-white shadow-md scale-[1.02]'
                                    : 'bg-black/50 border-stone-800 hover:border-stone-600 text-stone-200'
                                }`}
                              >
                                <div>
                                  <span className="font-bold text-xs text-amber-100 block">
                                    Caballero Nv.{v.knight!.rank} → Nv.{v.knight!.rank + 1}
                                  </span>
                                  <span className="text-[10px] text-stone-400 block">
                                    {location(s, v.id)}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-lg bg-black/40 text-[10px] font-bold text-emerald-300">
                                  {isSel ? 'Elegido ✓' : 'Elegir'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!actionAllowed || !(payload.vertexIds && payload.vertexIds.length >= 1)}
                            onClick={() => {
                              dispatchAction({
                                type: 'PLAY_PROGRESS_CARD',
                                cardId: card.id,
                                payload: { vertexIds: payload.vertexIds },
                              });
                              setSelectedCard('');
                              setModalMode(null);
                            }}
                            className={`${button} flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-stone-950 font-black`}
                          >
                            ⚒️ Ascender Caballeros Seleccionados ({payload.vertexIds?.length || 0}/2)
                          </button>
                          {onStartSmithMode && (
                            <button
                              type="button"
                              disabled={!actionAllowed}
                              onClick={() => {
                                setModalMode(null);
                                onStartSmithMode(card);
                              }}
                              className={`${button} py-2.5`}
                            >
                              Elegir en el mapa
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* INVENTOR (Swap 2 number tokens not 2, 12, 6, 8) */}
                {card.type === 'INVENTOR' && (
                  <div className="space-y-2.5">
                    {onStartInventorMode && (
                      <button
                        type="button"
                        disabled={!actionAllowed}
                        onClick={() => {
                          setModalMode(null);
                          onStartInventorMode(card);
                        }}
                        className={`${button} w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-stone-950 font-black`}
                      >
                        🔄 Seleccionar los 2 Hexágonos directamente en el mapa
                      </button>
                    )}
                    <span className="text-xs font-bold text-stone-300 block">
                      O elige aquí las 2 fichas de número a intercambiar (excepto 2, 12, 6 y 8):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-1">
                      {inventorEligibleHexes.map((h) => {
                        const selectedHexes = payload.hexIds || [];
                        const isSel = selectedHexes.includes(h.id);
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              const next = isSel
                                ? selectedHexes.filter((id) => id !== h.id)
                                : selectedHexes.length < 2
                                ? [...selectedHexes, h.id]
                                : [selectedHexes[1], h.id];
                              setData({ hexIds: next });
                            }}
                            className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                              isSel
                                ? 'bg-emerald-600/40 border-emerald-300 text-white font-bold'
                                : 'bg-black/45 border-stone-800 hover:border-stone-600 text-stone-300'
                            }`}
                          >
                            <span className="truncate">{hexLabel(s, h.id)}</span>
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-stone-950 font-mono font-black flex items-center justify-center text-[11px] shrink-0">
                              {h.numberToken}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={!actionAllowed || (payload.hexIds?.length || 0) !== 2}
                      onClick={() => {
                        dispatchAction({
                          type: 'PLAY_PROGRESS_CARD',
                          cardId: card.id,
                          payload: { hexIds: payload.hexIds },
                        });
                        setSelectedCard('');
                        setModalMode(null);
                      }}
                      className={`${button} w-full py-2 bg-emerald-700/80 text-white font-black`}
                    >
                      Confirmar intercambio ({payload.hexIds?.length || 0}/2 hexágonos)
                    </button>
                  </div>
                )}

                {/* ALCHEMIST (Clickable 1-6 die face boxes for Red and White dice) */}
                {card.type === 'ALCHEMIST' && (
                  <div className="space-y-3 p-3 bg-stone-900/75 rounded-2xl border border-emerald-500/40">
                    {s.phase !== 'WAITING_FOR_DICE' || s.turn.activePlayerId !== me.id ? (
                      <p className="text-xs text-amber-300 font-bold">
                        ⚠️ El Alquimista debe jugarse al inicio de tu turno ANTES de lanzar los dados.
                      </p>
                    ) : null}
                    {[0, 1].map((dieIdx) => {
                      const currentVal = payload.dice?.[dieIdx] || (dieIdx === 0 ? 3 : 4);
                      const isRed = dieIdx === 0;
                      return (
                        <div key={dieIdx} className="space-y-1.5">
                          <span className="text-xs font-extrabold text-stone-200 block">
                            {isRed ? '🎲 Dado Rojo (1–6):' : '🎲 Dado Blanco (1–6):'}
                          </span>
                          <div className="grid grid-cols-6 gap-2">
                            {[1, 2, 3, 4, 5, 6].map((face) => {
                              const isSelected = currentVal === face;
                              return (
                                <button
                                  key={face}
                                  type="button"
                                  onClick={() => {
                                    const nextDice: [number, number] = [
                                      payload.dice?.[0] || 3,
                                      payload.dice?.[1] || 4,
                                    ];
                                    nextDice[dieIdx] = face;
                                    setData({ dice: nextDice });
                                  }}
                                  className={`h-11 rounded-xl font-serif font-black text-lg flex items-center justify-center border-2 transition cursor-pointer ${
                                    isSelected
                                      ? isRed
                                        ? 'bg-red-600 border-amber-300 text-white shadow-[0_0_15px_rgba(239,68,68,0.7)] scale-105'
                                        : 'bg-amber-100 border-amber-400 text-stone-950 shadow-[0_0_15px_rgba(251,191,36,0.7)] scale-105'
                                      : isRed
                                      ? 'bg-red-950/60 border-red-800/60 text-red-200 hover:border-red-500'
                                      : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-500'
                                  }`}
                                >
                                  {face}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between pt-1 text-xs text-emerald-200 font-bold">
                      <span>
                        Resultado fijado:{' '}
                        <strong className="text-amber-300 font-mono text-sm">
                          {(payload.dice?.[0] || 3) + (payload.dice?.[1] || 4)}
                        </strong>{' '}
                        ({payload.dice?.[0] || 3} rojo + {payload.dice?.[1] || 4} blanco)
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={
                        s.turn.isPausedByHost ||
                        s.phase !== 'WAITING_FOR_DICE' ||
                        s.turn.activePlayerId !== me.id
                      }
                      onClick={() => {
                        dispatchAction({
                          type: 'PLAY_PROGRESS_CARD',
                          cardId: card.id,
                          payload: { dice: payload.dice || [3, 4] },
                        });
                        setSelectedCard('');
                        setModalMode(null);
                      }}
                      className={`${button} w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-stone-950 font-black`}
                    >
                      🧪 Lanzar Dados con Alquimista
                    </button>
                  </div>
                )}

                {/* IRRIGATION & MINING */}
                {(card.type === 'IRRIGATION' || card.type === 'MINING') && (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-stone-200">
                      {card.type === 'IRRIGATION' ? (
                        irrigationCount > 0 ? (
                          <span>
                            🌾 Tienes edificios junto a <strong>{irrigationCount}</strong> campo(s) de trigo → recibirás{' '}
                            <strong className="text-emerald-300">+{irrigationCount * 2} Trigo</strong>.
                          </span>
                        ) : (
                          <span className="text-red-300">
                            Necesitas al menos un poblado o ciudad junto a un hexágono de Trigo.
                          </span>
                        )
                      ) : miningCount > 0 ? (
                        <span>
                          ⛰️ Tienes edificios junto a <strong>{miningCount}</strong> montaña(s) de mineral → recibirás{' '}
                          <strong className="text-emerald-300">+{miningCount * 2} Mineral</strong>.
                        </span>
                      ) : (
                        <span className="text-red-300">
                          Necesitas al menos un poblado o ciudad junto a un hexágono de Mineral.
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={
                        !actionAllowed ||
                        (card.type === 'IRRIGATION' ? irrigationCount === 0 : miningCount === 0)
                      }
                      onClick={() => {
                        dispatchAction({
                          type: 'PLAY_PROGRESS_CARD',
                          cardId: card.id,
                          payload: {},
                        });
                        setSelectedCard('');
                        setModalMode(null);
                      }}
                      className={`${button} w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-stone-950 font-black`}
                    >
                      {card.type === 'IRRIGATION'
                        ? `🌾 Cobrar +${irrigationCount * 2} Trigo con Irrigación`
                        : `⛰️ Cobrar +${miningCount * 2} Mineral con Minería`}
                    </button>
                  </div>
                )}

                {/* BISHOP */}
                {card.type === 'BISHOP' && (
                  <button
                    type="button"
                    className={`${button} w-full py-2.5 bg-gradient-to-r from-red-700 to-rose-700 text-white font-black`}
                    disabled={!actionAllowed}
                    onClick={() => {
                      setModalMode(null);
                      onStartBishopMode?.();
                    }}
                  >
                    👑 Mover Ladrón con Obispo en el mapa
                  </button>
                )}

                {/* INTRIGUE */}
                {card.type === 'INTRIGUE' && (
                  <button
                    type="button"
                    className={`${button} w-full py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-black`}
                    disabled={!actionAllowed}
                    onClick={() => {
                      setModalMode(null);
                      onStartIntrigueMode?.();
                    }}
                  >
                    ⚔️ Expulsar Caballero rival en el mapa
                  </button>
                )}

                {/* COMMERCIAL_HARBOR (Puerto de mercancías) */}
                {card.type === 'COMMERCIAL_HARBOR' && (
                  <div className="space-y-3">
                    {rivalsWithCommodities.length === 0 ? (
                      <p className="text-xs text-red-300 bg-red-950/40 p-2.5 rounded-xl border border-red-500/30">
                        Ningún jugador rival tiene cartas de mercancía (Papel, Tela o Moneda) en este momento.
                      </p>
                    ) : myAvailableResources.length === 0 ? (
                      <p className="text-xs text-red-300 bg-red-950/40 p-2.5 rounded-xl border border-red-500/30">
                        Necesitas al menos 1 materia prima en tu mano para ofrecer en el Puerto de mercancías.
                      </p>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-amber-200 block">
                            1. Elige el primer rival con mercancías para intercambiar:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {rivalsWithCommodities.map((p) => {
                              const isSel = payload.targetPlayerId === p.id;
                              const commCount = COMMODITIES.reduce(
                                (sum, c) => sum + (p.resources[c] || 0),
                                0
                              );
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setData({ targetPlayerId: p.id })}
                                  className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                                    isSel
                                      ? 'bg-amber-500/35 border-amber-300 shadow-md scale-[1.02]'
                                      : 'bg-black/50 border-stone-800 hover:border-stone-600'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: PLAYER_COLORS[p.color].primary }}
                                    />
                                    <span className="font-bold text-xs text-stone-100 truncate">
                                      {p.name}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-amber-300 font-mono block mt-1">
                                    {commCount} mercancía(s)
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-amber-200 block">
                            2. Elige la materia prima que le entregas (recibirás 1 mercancía suya):
                          </span>
                          <div className="grid grid-cols-5 gap-2">
                            {ALL_RESOURCES.map((r) => {
                              const count = me.resources[r] || 0;
                              const isSel = payload.resource === r;
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  disabled={count <= 0}
                                  onClick={() => setData({ resource: r })}
                                  className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                                    isSel
                                      ? 'bg-amber-500/35 border-amber-300 font-bold scale-[1.03]'
                                      : count > 0
                                      ? 'bg-black/50 border-stone-800 hover:border-stone-600'
                                      : 'bg-black/20 border-stone-900 opacity-35 cursor-not-allowed'
                                  }`}
                                >
                                  <ResourceIcon resource={r} size={22} />
                                  <span className="text-[10px] text-amber-100">
                                    {RESOURCE_META[r].name}
                                  </span>
                                  <span className="text-[9px] font-mono text-stone-400">
                                    ({count})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={
                            !actionAllowed || !payload.targetPlayerId || !payload.resource
                          }
                          onClick={() => {
                            dispatchAction({
                              type: 'PLAY_PROGRESS_CARD',
                              cardId: card.id,
                              payload: {
                                targetPlayerId: payload.targetPlayerId,
                                resource: payload.resource,
                              },
                            });
                            setSelectedCard('');
                          }}
                          className={`${button} w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black`}
                        >
                          ⚓ Jugar Puerto de Mercancías y Comerciar
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* RIVAL SELECTION FOR DESERTER, SPY, MASTER_MERCHANT */}
                {neededRival && (
                  <div className="space-y-2 text-xs">
                    <label className="font-bold text-stone-300 block">
                      {card.type === 'SPY'
                        ? '1. Elige al rival cuyas cartas de progreso espiarás'
                        : card.type === 'MASTER_MERCHANT'
                        ? 'Elige un rival con más puntos de victoria'
                        : 'Jugador rival objetivo'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {s.players
                        .filter((p) => p.id !== me.id)
                        .map((p) => {
                          const isSelected = payload.targetPlayerId === p.id;
                          const isSelectable =
                            card.type === 'MASTER_MERCHANT'
                              ? p.totalVictoryPoints > me.totalVictoryPoints
                              : card.type === 'DESERTER'
                              ? ownKnights(s, p.id).length > 0
                              : card.type === 'SPY'
                              ? (p.citiesKnights?.progressCards?.length || 0) > 0
                              : true;
                          const pProgressCount = p.citiesKnights?.progressCards?.length ?? 0;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={!isSelectable}
                              onClick={() =>
                                setData({ targetPlayerId: p.id, targetCardId: undefined })
                              }
                              className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-amber-500/30 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                                  : isSelectable
                                  ? 'bg-black/50 border-stone-800 hover:border-stone-600 text-stone-200'
                                  : 'bg-black/20 border-stone-900 opacity-40 cursor-not-allowed text-stone-500'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                                  style={{ backgroundColor: PLAYER_COLORS[p.color].primary }}
                                />
                                <span className="font-extrabold text-xs text-stone-100 truncate">
                                  {p.name}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
                                <span>{p.publicVictoryPoints} PV</span>
                                {card.type === 'SPY' ? (
                                  <span className="text-amber-300 font-mono font-bold">
                                    {pProgressCount} {pProgressCount === 1 ? 'carta' : 'cartas'}
                                  </span>
                                ) : (
                                  <span>{cardCount(p.resources)} cartas</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* SPY TARGET CARD GALLERY */}
                {card.type === 'SPY' && target && (
                  <div className="space-y-2 text-xs pt-2 border-t border-white/10">
                    <label className="font-bold text-amber-200 block">
                      2. Elige la carta de progreso que deseas robar a {target.name}:
                    </label>
                    {target.citiesKnights?.progressCards?.length ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {target.citiesKnights.progressCards.map((c) => {
                          const isSelected = payload.targetCardId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setData({ targetCardId: c.id })}
                              className={`p-2 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-amber-500/40 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-[1.03]'
                                  : 'bg-black/50 border-stone-800 hover:border-stone-600'
                              }`}
                            >
                              <div>
                                <img
                                  src={PROGRESS_CARD_IMAGE_PATHS[c.type]}
                                  alt=""
                                  className="h-20 mx-auto object-contain drop-shadow"
                                />
                                <strong className="block text-amber-100 text-xs mt-1 font-display">
                                  {PROGRESS_CARDS[c.type].name}
                                </strong>
                                <span className="block text-[10px] text-stone-300 line-clamp-2 mt-0.5">
                                  {PROGRESS_CARDS[c.type].description}
                                </span>
                              </div>
                              <div className="mt-1.5 flex justify-between items-center text-[9px]">
                                <span
                                  style={{ color: BRANCH_META[c.branch].color }}
                                  className="font-black uppercase"
                                >
                                  {BRANCH_META[c.branch].name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200 font-bold">
                                  {isSelected ? 'Elegida ✓' : 'Robar'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-300/80 bg-black/40 p-2.5 rounded-xl border border-white/5">
                        {target.name} no tiene cartas de progreso en la mano actualmente.
                      </p>
                    )}
                  </div>
                )}

                {/* RESOURCE / COMMODITY BOXES FOR MONOPOLIES & MERCHANT FLEET */}
                {neededResource && (
                  <div className="space-y-2 text-xs">
                    <label className="font-bold text-stone-300 block">
                      {card.type === 'COMMODITY_MONOPOLY'
                        ? 'Elige la mercancía para el monopolio'
                        : card.type === 'RESOURCE_MONOPOLY'
                        ? 'Elige la materia prima para el monopolio'
                        : 'Elige el tipo de carta para el comercio 2:1 con la banca'}
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {(card.type === 'COMMODITY_MONOPOLY'
                        ? COMMODITIES
                        : card.type === 'RESOURCE_MONOPOLY'
                        ? ALL_RESOURCES
                        : ALL_TRADE_CARDS
                      ).map((r) => {
                        const isSelected = payload.resource === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setData({ resource: r as TradeCardType })}
                            className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/35 border-amber-400 font-bold scale-[1.03] shadow-md shadow-amber-500/25'
                                : 'bg-black/50 border-stone-800 hover:border-stone-700 text-stone-300'
                            }`}
                          >
                            <ResourceIcon resource={r as ResourceType} size={28} />
                            <span className="text-[11px] text-amber-100 font-semibold truncate">
                              {RESOURCE_META[r]?.name || r}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MASTER MERCHANT HAND SELECTION */}
                {card.type === 'MASTER_MERCHANT' && target && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-200 block">
                      Elige {Math.min(2, cardCount(target.resources))} carta(s) de la mano de {target.name}:
                    </span>
                    <HandSelection
                      hand={target.resources}
                      value={payload.resources || createEmptyResources()}
                      maxTotal={Math.min(2, cardCount(target.resources))}
                      onChange={(resources) => setData({ resources })}
                    />
                  </div>
                )}

                {/* GENERIC PLAY BUTTON FOR REMAINING CARDS (ROAD_BUILDING, CRANE, MEDICINE, SPY, DESERTER, WARLORD, WEDDING, SABOTEUR, MONOPOLIES, FLEET, MASTER_MERCHANT) */}
                {![
                  'MERCHANT',
                  'DIPLOMAT',
                  'ENGINEER',
                  'SMITH',
                  'INVENTOR',
                  'ALCHEMIST',
                  'IRRIGATION',
                  'MINING',
                  'BISHOP',
                  'INTRIGUE',
                  'COMMERCIAL_HARBOR',
                ].includes(card.type) && (
                  <button
                    type="button"
                    className={`${button} w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black`}
                    disabled={
                      s.turn.isPausedByHost ||
                      !actionAllowed ||
                      (card.type === 'SPY' && (!payload.targetPlayerId || !payload.targetCardId)) ||
                      (neededResource && !payload.resource) ||
                      (card.type === 'DESERTER' && !payload.targetPlayerId) ||
                      (card.type === 'CRANE' && (ownCities.length === 0 || Boolean(ck.turnEffects?.crane))) ||
                      (card.type === 'MEDICINE' && Boolean(ck.turnEffects?.medicine)) ||
                      (card.type === 'WARLORD' && !ownKnightVertices.some((v) => !v.knight!.active)) ||
                      (card.type === 'MASTER_MERCHANT' &&
                        (!target ||
                          cardCount(payload.resources || createEmptyResources()) !==
                            Math.min(2, cardCount(target.resources))))
                    }
                    onClick={() => {
                      const playedType = card.type;
                      dispatchAction({
                        type: 'PLAY_PROGRESS_CARD',
                        cardId: card.id,
                        payload,
                      });
                      setSelectedCard('');
                      setPayload({});
                      if (playedType === 'CRANE') {
                        setModalMode('CITIES');
                      } else if (
                        playedType === 'ROAD_BUILDING' ||
                        playedType === 'MEDICINE' ||
                        playedType === 'WARLORD'
                      ) {
                        setModalMode(null);
                      }
                    }}
                  >
                    {card.type === 'ROAD_BUILDING'
                      ? '🛣️ Construir 2 Carreteras / Barcos Gratis en el mapa'
                      : card.type === 'CRANE'
                      ? '🏗️ Activar Grúa e ir a Mejoras de Ciudad (-1 mercancía)'
                      : card.type === 'MEDICINE'
                      ? '⚕️ Activar Medicina (Ciudad por 2 Minerales + 1 Trigo)'
                      : 'Jugar carta de progreso'}
                  </button>
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
                    ? `Entrega ${myChoice.amount} ${
                        myChoice.commodityOnly ? 'mercancía(s)' : 'carta(s)'
                      } a ${s.players.find((p) => p.id === myChoice.beneficiaryId)?.name}`
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ownKnightVertices
                    .filter((v) => v.knight!.active)
                    .map((v) => {
                      const isChecked = defenseKnights.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            setDefenseKnights((ids) =>
                              isChecked ? ids.filter((id) => id !== v.id) : [...ids, v.id]
                            )
                          }
                          className={`flex items-center justify-between text-xs p-3 rounded-2xl border transition cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-700/40 border-emerald-400 text-white font-bold'
                              : 'bg-black/40 border-stone-800 text-stone-300'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-amber-100 block">
                              Caballero Fuerza {v.knight!.rank}
                            </span>
                            <span className="text-[10px] text-stone-400">{location(s, v.id)}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-black/40 text-[10px]">
                            {isChecked ? 'Defiende ✓' : 'En reserva'}
                          </span>
                        </button>
                      );
                    })}
                </div>
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

            {myChoice.kind === 'RETREAT' && (
              <div className="space-y-3">
                <p className="text-xs text-stone-300">
                  Tu caballero ha sido desplazado. Selecciona a qué cruce conectado y libre debe retirarse (puedes seleccionarlo aquí o pulsar en el mapa):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {myChoice.vertexIds.map((vId) => {
                    const isSelected = choiceVertex === vId;
                    return (
                      <button
                        key={vId}
                        type="button"
                        onClick={() => {
                          setChoiceVertex(vId);
                          onHighlightVertex?.(vId);
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600/50 border-amber-400 text-white shadow-lg'
                            : 'bg-black/40 border-stone-800 text-stone-300 hover:border-stone-600'
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-xs block text-amber-200">
                            Cruce en {location(s, vId)}
                          </span>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            Libre y accesible por tus caminos
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-stone-900 border border-white/10 text-xs font-mono font-bold text-amber-100">
                          {isSelected ? 'Seleccionado' : 'Elegir'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {myChoice.kind === 'DESERTER' && (
              <div className="space-y-3">
                <p className="text-xs text-stone-300">
                  Un rival ha jugado la carta Desertor. Elige cuál de tus caballeros debe desertar:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ownKnightVertices.map((v) => {
                    const isSelected = choiceVertex === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setChoiceVertex(v.id);
                          onHighlightVertex?.(v.id);
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-red-700/50 border-red-400 text-white shadow-lg'
                            : 'bg-black/40 border-stone-800 text-stone-300 hover:border-stone-600'
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-xs block text-amber-200">
                            Caballero Nivel {v.knight!.rank} ({v.knight!.active ? 'Activo' : 'Inactivo'})
                          </span>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            Cruce en {location(s, v.id)}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-stone-900 border border-white/10 text-xs font-mono font-bold text-amber-100">
                          {isSelected ? 'Seleccionado' : 'Elegir'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {myChoice.kind === 'DESERTER_PLACE' && (
              <div className="space-y-3">
                <p className="text-xs text-stone-300">
                  ¡Has reclutado un caballero desertor! Elige un cruce libre conectado a tus caminos para colocarlo:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {knightRecruitVertices(s, me.id).map((vId) => {
                    const isSelected = choiceVertex === vId;
                    return (
                      <button
                        key={vId}
                        type="button"
                        onClick={() => {
                          setChoiceVertex(vId);
                          onHighlightVertex?.(vId);
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600/50 border-amber-400 text-white shadow-lg'
                            : 'bg-black/40 border-stone-800 text-stone-300 hover:border-stone-600'
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-xs block text-amber-200">
                            Cruce en {location(s, vId)}
                          </span>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            Libre y conectado a tus caminos
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-stone-900 border border-white/10 text-xs font-mono font-bold text-amber-100">
                          {isSelected ? 'Seleccionado' : 'Elegir'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {myChoice.kind === 'GIFT' && (
              <div className="space-y-3">
                <HandSelection
                  hand={me.resources}
                  value={gift}
                  maxTotal={myChoice.amount}
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
                ['CITY_LOSS', 'RETREAT', 'DESERTER', 'DESERTER_PLACE'].includes(myChoice.kind)
                  ? !choiceVertex
                  : myChoice.kind === 'GIFT'
                  ? cardCount(gift) !== myChoice.amount
                  : myChoice.kind === 'PROGRESS_DISCARD'
                  ? !choiceCard
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
