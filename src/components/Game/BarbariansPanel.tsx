import React, { useEffect, useState } from 'react';
import {
  ALL_RESOURCES,
  PLAYER_COLORS,
  RESOURCE_META,
} from '../../shared/constants';
import {
  BARBARIANS_SCENARIOS,
  COMMODITY_DELIVERY_META,
  MB_CARD_ASSETS,
  MB_TILE_ASSETS,
  MB_TOKEN_ASSETS,
  WAGON_LEVELS,
  getBarbariansDevCardImage,
  getCatanEventCardImage,
  getWagonCardImage,
  getWagonCostCardImage,
} from '../../shared/expansionsConfig';
import { BUILDING_COSTS } from '../../shared/constants';
import type {
  GameAction,
  GameState,
  ResourceType,
} from '../../shared/types';
import { ResourceIcon } from '../UI/ResourceIcon';
import type { ActiveBarbariansBoardMode } from './BarbariansDrawerMenu';
import {
  Award,
  Coins,
  Compass,
  Fish,
  Hammer,
  Route,
  Shield,
  Sparkles,
  Swords,
  Truck,
  X,
} from 'lucide-react';

interface BarbariansPanelProps {
  gameState: GameState;
  playerId: string;
  dispatchAction: (action: GameAction) => void;
  onStartBoardMode: (mode: ActiveBarbariansBoardMode) => void;
}

export const BarbariansPanel: React.FC<BarbariansPanelProps> = ({
  gameState: s,
  playerId,
  dispatchAction,
  onStartBoardMode,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showEventRulesCard, setShowEventRulesCard] = useState(false);
  const [showFishCostsCard, setShowFishCostsCard] = useState(false);
  const [selectedFishResource, setSelectedFishResource] = useState<ResourceType>('ORE');
  const [selectedStealTargetId, setSelectedStealTargetId] = useState<string | null>(null);
  const [camelBidSheep, setCamelBidSheep] = useState(0);
  const [camelBidWheat, setCamelBidWheat] = useState(0);

  useEffect(() => {
    const openHandler = () => setIsModalOpen(true);
    window.addEventListener('open-barbarians-panel', openHandler);
    return () => window.removeEventListener('open-barbarians-panel', openHandler);
  }, []);

  const mb = s.barbarians;
  const me = s.players.find((p) => p.id === playerId);
  const pb = me?.barbarians;
  if (!mb || !me || !pb) return null;

  const scenarioSpec =
    BARBARIANS_SCENARIOS.find((sc) => sc.id === mb.scenario) || BARBARIANS_SCENARIOS[0];
  const isMyMainTurn =
    !s.turn.isPausedByHost && s.turn.activePlayerId === me.id && s.phase === 'MAIN_PHASE';
  const isMyBuildTurn =
    !s.turn.isPausedByHost &&
    s.turn.activePlayerId === me.id &&
    (s.phase === 'MAIN_PHASE' || s.phase === 'SPECIAL_BUILD_PHASE');

  const totalFish = pb.fishTokens.reduce((sum, t) => sum + t.fishCount, 0);

  const pickFishTokenIds = (neededFish: number): string[] => {
    const sorted = [...pb.fishTokens].sort((a, b) => a.fishCount - b.fishCount);
    const chosen: string[] = [];
    let acc = 0;
    for (const tok of sorted) {
      chosen.push(tok.id);
      acc += tok.fishCount;
      if (acc >= neededFish) break;
    }
    return chosen;
  };

  return (
    <>
      {/* Bottom-Left HUD Box (Exact same slot and visual style as CitiesKnightsPanel) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsModalOpen(true);
          }
        }}
        className="cities-knights-hud absolute bottom-3 left-[215px] sm:left-[240px] z-30 w-[240px] sm:w-[265px] rounded-2xl border border-[#d4af37]/60 hover:border-amber-400 bg-[#160f0a] hover:bg-[#1d140d] p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.95)] text-stone-100 pointer-events-auto cursor-pointer transition-all group opacity-100"
        title="Haz clic para abrir el menú completo de Mercaderes y Bárbaros"
      >
        <div className="flex justify-between items-center w-full text-xs font-black text-amber-200 group-hover:text-amber-100 transition">
          <span className="flex items-center gap-1.5 truncate">
            <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Mercaderes y Bárbaros</span>
          </span>
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 group-hover:bg-amber-500/35 text-amber-300 font-mono text-[10px]">
            ＋
          </span>
        </div>

        <div className="ck-hud-details mt-1.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-amber-300/90 bg-black/40 px-2 py-1 rounded-lg border border-amber-500/20">
            <span className="truncate">{scenarioSpec.title}</span>
            <span className="text-amber-100 font-mono shrink-0 ml-1">{scenarioSpec.badge}</span>
          </div>

          {mb.scenario === 'FISHERMEN_OF_CATAN' && (
            <div className="flex items-center justify-between text-[10px] text-stone-200">
              <span className="flex items-center gap-1.5 font-bold text-sky-300">
                <img
                  src={MB_TOKEN_ASSETS.FISH}
                  alt="Pescado"
                  className="w-4 h-4 rounded-full object-cover shadow"
                  draggable={false}
                />
                <span>
                  {totalFish} Pescados ({pb.fishTokens.length}/7)
                </span>
              </span>
              {pb.hasOldBoot && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950 border border-red-500/50 text-red-200 font-black">
                  <img
                    src={MB_TOKEN_ASSETS.OLD_BOOT}
                    alt="Bota vieja"
                    className="w-3.5 h-3.5 rounded-full object-cover"
                    draggable={false}
                  />
                  <span>+1 PV</span>
                </span>
              )}
            </div>
          )}

          {mb.scenario === 'RIVERS_OF_CATAN' && (
            <div className="flex items-center justify-between gap-1.5 text-[10px] text-stone-200">
              <span className="font-bold text-amber-300">
                🪙 {pb.goldCoins} Oros · 🌉 {3 - pb.bridgesLeft}/3 Puentes
              </span>
              {pb.isWealthiestSettler ? (
                <img
                  src={MB_TOKEN_ASSETS.WEALTHIEST_SETTLER}
                  alt="Colono más rico (+1 PV)"
                  className="h-6 rounded border border-emerald-400/70 shadow shrink-0"
                  draggable={false}
                />
              ) : pb.isPoorestSettler ? (
                <img
                  src={MB_TOKEN_ASSETS.POOREST_SETTLER}
                  alt="Colono pobre (-2 PV)"
                  className="h-6 rounded border border-red-400/70 shadow shrink-0"
                  draggable={false}
                />
              ) : null}
            </div>
          )}

          {mb.scenario === 'THE_CARAVANS' && (
            <div className="flex items-center justify-between text-[10px] text-stone-200">
              <span className="font-bold text-amber-300">
                🐪 {mb.camelEdgeIds.length} Camellos en ruta
              </span>
              <span className="text-stone-400">Reserva: {mb.camelsRemaining}</span>
            </div>
          )}

          {mb.scenario === 'BARBARIAN_ATTACK' && (
            <div className="flex items-center justify-between text-[10px] text-stone-200">
              <span className="font-bold text-amber-300">
                ⛓️ {pb.prisonersCount} Pris. (+{Math.floor(pb.prisonersCount / 2)} PV) · 🪙{' '}
                {pb.goldCoins}
              </span>
              <span className="text-red-300 font-bold">
                {mb.conqueredHexIds.length} Costas Conq.
              </span>
            </div>
          )}

          {mb.scenario === 'TRADERS_AND_BARBARIANS' && (
            <div className="flex items-center justify-between gap-2 text-[10px] text-stone-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <img
                  src={getWagonCardImage(pb.wagonLevel, me.color)}
                  alt={`Carromato Nivel ${pb.wagonLevel}`}
                  className="w-6 h-9 rounded object-cover border border-amber-400/60 shadow shrink-0"
                  draggable={false}
                />
                <span className="font-bold text-amber-300 truncate">
                  Nv.{pb.wagonLevel} ({pb.wagonMpRemaining} PM) · 🪙 {pb.goldCoins}
                </span>
              </div>
              <span className="text-emerald-300 font-black shrink-0">
                📦 {pb.deliveredCommoditiesCount}
              </span>
            </div>
          )}

          {mb.currentEventCard && (
            <div className="flex items-center gap-2 text-[10px] pt-1.5 border-t border-white/10 text-amber-200">
              <img
                src={getCatanEventCardImage(mb.currentEventCard)}
                alt={mb.currentEventCard.title}
                className="w-7 h-10 rounded object-cover border border-amber-400/60 shrink-0 shadow"
                draggable={false}
              />
              <div className="min-w-0">
                <div className="truncate font-black text-amber-100">
                  {mb.currentEventCard.numberToken} · {mb.currentEventCard.title}
                </div>
                <div className="text-[9px] text-stone-400 truncate">
                  Mazo eventos: {mb.eventDeck.length} cartas
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Mercaderes y Bárbaros Modal (Visually identical style to CitiesKnightsPanel Modal, ZERO select dropdowns) */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="cities-knights-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border-2 border-[#d4af37] bg-[#160f0a] p-5 text-stone-100 shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-5 cursor-default opacity-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-3">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-black text-amber-300 flex items-center gap-2">
                  <Swords className="w-5 h-5 text-amber-400" />
                  <span>Mercaderes y Bárbaros — {scenarioSpec.title}</span>
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">{scenarioSpec.specialVPRule}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-bold text-stone-300 hover:bg-stone-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* 1. Terremoto: Reparar carretera dañada si existe */}
            {pb.damagedRoadEdgeIds.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-red-950 border-2 border-red-500/70 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-red-200 uppercase">
                    🌋 Carretera Dañada por Terremoto
                  </div>
                  <p className="text-[11px] text-red-100/90 mt-0.5">
                    Debes reparar tu carretera dañada (1 Madera + 1 Arcilla) antes de poder construir nuevas carreteras.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    !isMyBuildTurn ||
                    (me.resources.WOOD || 0) < 1 ||
                    (me.resources.BRICK || 0) < 1
                  }
                  onClick={() =>
                    dispatchAction({
                      type: 'MB_REPAIR_ROAD',
                      edgeId: pb.damagedRoadEdgeIds[0],
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-black text-xs cursor-pointer shrink-0"
                >
                  Reparar (1🪵 1🧱)
                </button>
              </div>
            )}

            {/* 2. Escenario 1: LOS PESCADORES DE CATÁN */}
            {mb.scenario === 'FISHERMEN_OF_CATAN' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#1f1610] border border-[#d4af37]/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <Fish className="w-4 h-4" />
                      <span>Tus Fichas de Pescado ({pb.fishTokens.length}/7 fichas · Total: {totalFish} peces)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-stone-400">
                        Mazo: {mb.fishDeck.length} fichas
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowFishCostsCard((v) => !v)}
                        className="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-400/50 text-[10.5px] font-bold text-sky-200 cursor-pointer"
                      >
                        {showFishCostsCard ? 'Ocultar Tarjeta' : 'Tarjeta de Costes'}
                      </button>
                    </div>
                  </div>

                  {showFishCostsCard && (
                    <div className="p-3 rounded-xl bg-[#140e0a] border border-sky-500/40 flex flex-wrap items-center justify-center gap-4">
                      <img
                        src={MB_CARD_ASSETS.FISH_COSTS_FRONT}
                        alt="Tarjeta oficial de costes de Pescadores de Catán"
                        className="w-40 sm:w-44 rounded-xl border border-sky-400/60 shadow-xl"
                        draggable={false}
                      />
                      <img
                        src={MB_CARD_ASSETS.FISH_COSTS_BACK}
                        alt="Pescadores de Catán"
                        className="w-40 sm:w-44 rounded-xl border border-sky-400/60 shadow-xl"
                        draggable={false}
                      />
                    </div>
                  )}

                  {pb.fishTokens.length === 0 ? (
                    <p className="text-xs text-stone-400">
                      Aún no tienes fichas de pescado. Construye en los caladeros costeros (4, 5, 6, 8, 9, 10) o junto al Lago central (2, 3, 11, 12).
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {pb.fishTokens.map((tok) => (
                        <div
                          key={tok.id}
                          className="relative px-2.5 py-1.5 rounded-2xl bg-sky-950/90 border border-sky-400/60 text-sky-100 font-black text-xs flex items-center gap-2 shadow-md"
                        >
                          <img
                            src={MB_TOKEN_ASSETS.FISH}
                            alt={`Ficha de ${tok.fishCount} pescado(s)`}
                            className="w-8 h-8 rounded-full object-cover border border-sky-300/70 shadow"
                            draggable={false}
                          />
                          <div className="flex flex-col leading-tight">
                            <span className="text-amber-300 font-mono text-sm">×{tok.fishCount}</span>
                            <span className="text-[9px] text-sky-200/80">
                              {tok.fishCount === 1 ? 'pez' : 'peces'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Acciones de Pescado con Cajitas Visuales (Cero Selectores) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                    {/* 2 Pescados: Retirar ladrón */}
                    <div className="p-3 rounded-xl bg-[#140e0a] border border-stone-800 flex flex-col justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-amber-200">
                          2 Pescados — Retirar el Ladrón del tablero
                        </div>
                        <p className="text-[11px] text-stone-400">
                          El ladrón abandona Catán hasta que vuelva a salir un 7.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!isMyMainTurn || totalFish < 2 || !s.board.robberHexId}
                        onClick={() =>
                          dispatchAction({
                            type: 'MB_FISH_REMOVE_ROBBER',
                            tokenIds: pickFishTokenIds(2),
                          })
                        }
                        className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-stone-900 disabled:text-stone-600 text-stone-950 font-black text-xs cursor-pointer"
                      >
                        Retirar Ladrón (2 🐟)
                      </button>
                    </div>

                    {/* 5 Pescados: Carretera gratis en el mapa */}
                    <div className="p-3 rounded-xl bg-[#140e0a] border border-stone-800 flex flex-col justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-amber-200">
                          5 Pescados — Construir 1 Carretera Gratis
                        </div>
                        <p className="text-[11px] text-stone-400">
                          Resalta en el mapa los caminos disponibles para colocarla con un clic.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!isMyMainTurn || totalFish < 5 || me.roadsLeft <= 0}
                        onClick={() => {
                          setIsModalOpen(false);
                          onStartBoardMode('FISH_FREE_ROAD');
                        }}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-900 disabled:text-stone-600 text-stone-950 font-black text-xs cursor-pointer"
                      >
                        Elegir Camino en el Mapa (5 🐟)
                      </button>
                    </div>

                    {/* 4 Pescados: Tomar recurso de la banca (Cajitas de recursos) */}
                    <div className="p-3 rounded-xl bg-[#140e0a] border border-stone-800 space-y-2">
                      <div className="text-xs font-black text-amber-200">
                        4 Pescados — Tomar 1 Materia Prima de la Banca
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {ALL_RESOURCES.map((res) => {
                          const active = selectedFishResource === res;
                          return (
                            <button
                              key={res}
                              type="button"
                              onClick={() => setSelectedFishResource(res)}
                              className={`p-1.5 rounded-xl border flex flex-col items-center gap-0.5 cursor-pointer transition ${
                                active
                                  ? 'bg-amber-500/25 border-amber-400 text-amber-100 scale-105'
                                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-600'
                              }`}
                            >
                              <ResourceIcon resource={res} size={18} />
                              <span className="text-[9px] font-bold">
                                {RESOURCE_META[res].shortName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        disabled={
                          !isMyMainTurn ||
                          totalFish < 4 ||
                          (s.bank[selectedFishResource] || 0) <= 0
                        }
                        onClick={() =>
                          dispatchAction({
                            type: 'MB_FISH_BANK_RESOURCE',
                            tokenIds: pickFishTokenIds(4),
                            resource: selectedFishResource,
                          })
                        }
                        className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-stone-900 disabled:text-stone-600 text-stone-950 font-black text-xs cursor-pointer"
                      >
                        Tomar {RESOURCE_META[selectedFishResource].name} (4 🐟)
                      </button>
                    </div>

                    {/* 3 Pescados: Robar 1 recurso a un rival (Cajitas de jugadores) */}
                    <div className="p-3 rounded-xl bg-[#140e0a] border border-stone-800 space-y-2">
                      <div className="text-xs font-black text-amber-200">
                        3 Pescados — Robar 1 Materia Prima al azar a un Rival
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {s.players
                          .filter((p) => p.id !== me.id)
                          .map((rival) => {
                            const count = ALL_RESOURCES.reduce(
                              (acc, r) => acc + (rival.resources[r] || 0),
                              0
                            );
                            const isSelected = selectedStealTargetId === rival.id;
                            return (
                              <button
                                key={rival.id}
                                type="button"
                                disabled={count === 0}
                                onClick={() => setSelectedStealTargetId(rival.id)}
                                className={`p-2 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                                    : 'bg-stone-900 border-stone-800 text-stone-300 disabled:opacity-40'
                                }`}
                              >
                                <span className="truncate">{rival.name}</span>
                                <span className="font-mono text-[10px] text-amber-300">
                                  {count} 🃏
                                </span>
                              </button>
                            );
                          })}
                      </div>
                      <button
                        type="button"
                        disabled={!isMyMainTurn || totalFish < 3 || !selectedStealTargetId}
                        onClick={() => {
                          if (!selectedStealTargetId) return;
                          dispatchAction({
                            type: 'MB_FISH_STEAL_RESOURCE',
                            tokenIds: pickFishTokenIds(3),
                            targetPlayerId: selectedStealTargetId,
                          });
                        }}
                        className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-900 disabled:text-stone-600 text-stone-950 font-black text-xs cursor-pointer"
                      >
                        Robar Carta (3 🐟)
                      </button>
                    </div>
                  </div>

                  {/* Entregar la Bota Vieja si la posee */}
                  {pb.hasOldBoot && (
                    <div className="p-3 rounded-xl bg-red-950 border border-red-500/60 flex items-start gap-3">
                      <img
                        src={MB_TOKEN_ASSETS.OLD_BOOT}
                        alt="La Bota vieja"
                        className="w-14 h-14 rounded-full object-cover border-2 border-red-400/70 shadow-lg shrink-0"
                        draggable={false}
                      />
                      <div className="space-y-2 flex-1">
                        <div className="text-xs font-black text-red-200">
                          Posees la «Bota vieja» (Necesitas +1 PV adicional para ganar). Entrégasela a un jugador con tantos o más PV que tú:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {s.players
                            .filter(
                              (p) =>
                                p.id !== me.id &&
                                p.publicVictoryPoints >= me.publicVictoryPoints
                            )
                            .map((cand) => (
                              <button
                                key={cand.id}
                                type="button"
                                disabled={!isMyMainTurn}
                                onClick={() =>
                                  dispatchAction({
                                    type: 'MB_PASS_OLD_BOOT',
                                    targetPlayerId: cand.id,
                                  })
                                }
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer"
                              >
                                Entregar a {cand.name} ({cand.publicVictoryPoints} PV)
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Comercio de Oro (Ríos de Catán, Ataque de los Bárbaros, Mercaderes y Bárbaros) */}
            {scenarioSpec.usesGold && (
              <div className="p-4 rounded-2xl bg-[#1f1610] border border-[#d4af37]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span>
                      Tesorería y Mercado de Oro ({pb.goldCoins} monedas · Compras este turno:{' '}
                      {pb.goldPurchasesThisTurn}/2)
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-stone-300">
                  Haz clic en cualquier cajita de materia prima para comprarla inmediatamente por{' '}
                  <strong>2 monedas de oro</strong> (máximo 2 compras por turno):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ALL_RESOURCES.map((res) => {
                    const canBuy =
                      isMyMainTurn &&
                      pb.goldCoins >= 2 &&
                      pb.goldPurchasesThisTurn < 2 &&
                      (s.bank[res] || 0) > 0;
                    return (
                      <button
                        key={res}
                        type="button"
                        disabled={!canBuy}
                        onClick={() =>
                          dispatchAction({ type: 'MB_BUY_RESOURCE_WITH_GOLD', resource: res })
                        }
                        className={`p-2.5 rounded-2xl border-2 flex flex-col items-center gap-1 transition ${
                          canBuy
                            ? 'bg-[#2a1d13] hover:bg-[#382719] border-[#d4af37] text-amber-100 cursor-pointer'
                            : 'bg-[#120c08] border-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        <ResourceIcon resource={res} size={24} />
                        <span className="text-xs font-black">{RESOURCE_META[res].name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                          2 🪙 → +1
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Ranking de Oro entre todos los jugadores (con losetas oficiales Colono más rico / Colono pobre en Los Ríos) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-white/10">
                  {s.players.map((pl) => {
                    const pGold = pl.barbarians?.goldCoins || 0;
                    return (
                      <div
                        key={pl.id}
                        className="p-2 rounded-xl bg-[#140e0a] border border-stone-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate">{pl.name}</div>
                          <div className="font-mono font-black text-amber-300">{pGold} 🪙</div>
                        </div>
                        {pl.barbarians?.isWealthiestSettler && (
                          <img
                            src={MB_TOKEN_ASSETS.WEALTHIEST_SETTLER}
                            alt="Colono más rico (+1 PV)"
                            className="h-9 rounded border border-emerald-400/70 shadow shrink-0"
                            draggable={false}
                          />
                        )}
                        {pl.barbarians?.isPoorestSettler && (
                          <img
                            src={MB_TOKEN_ASSETS.POOREST_SETTLER}
                            alt="Colono pobre (-2 PV)"
                            className="h-9 rounded border border-red-400/70 shadow shrink-0"
                            draggable={false}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Escenario 3: LA RUTA DE LAS CARAVANAS */}
            {mb.scenario === 'THE_CARAVANS' && (
              <div className="p-4 rounded-2xl bg-[#1f1610] border border-[#d4af37]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    🐪 Caravanas del Oasis ({mb.camelEdgeIds.length} colocados · {mb.camelsRemaining} en reserva)
                  </span>
                </div>
                <p className="text-xs text-stone-300">
                  Selecciona cuántas cartas de Lana o Trigo deseas aportar a la votación y luego haz clic directamente en el camino iluminado del mapa donde colocar el camello:
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 bg-[#140e0a] p-2.5 rounded-xl border border-stone-800">
                    <ResourceIcon resource="SHEEP" size={20} />
                    <span className="text-xs font-bold">Lana ({me.resources.SHEEP || 0}):</span>
                    <button
                      type="button"
                      onClick={() => setCamelBidSheep((n) => Math.max(0, n - 1))}
                      className="px-2 py-0.5 rounded bg-stone-800 font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-amber-300 w-5 text-center">
                      {camelBidSheep}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCamelBidSheep((n) => Math.min(me.resources.SHEEP || 0, n + 1))
                      }
                      className="px-2 py-0.5 rounded bg-stone-800 font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-[#140e0a] p-2.5 rounded-xl border border-stone-800">
                    <ResourceIcon resource="WHEAT" size={20} />
                    <span className="text-xs font-bold">Trigo ({me.resources.WHEAT || 0}):</span>
                    <button
                      type="button"
                      onClick={() => setCamelBidWheat((n) => Math.max(0, n - 1))}
                      className="px-2 py-0.5 rounded bg-stone-800 font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-amber-300 w-5 text-center">
                      {camelBidWheat}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCamelBidWheat((n) => Math.min(me.resources.WHEAT || 0, n + 1))
                      }
                      className="px-2 py-0.5 rounded bg-stone-800 font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!isMyBuildTurn || mb.camelsRemaining <= 0}
                    onClick={() => {
                      setIsModalOpen(false);
                      onStartBoardMode('PLACE_CAMEL');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-black text-xs cursor-pointer"
                  >
                    Seleccionar Camino de Camello en el Mapa
                  </button>
                </div>
              </div>
            )}

            {/* 5. Escenario 5: MERCADERES Y BÁRBAROS (CARROMATOS Y MERCANCÍAS) */}
            {mb.scenario === 'TRADERS_AND_BARBARIANS' && (
              <div className="p-4 rounded-2xl bg-[#1f1610] border border-[#d4af37]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Truck className="w-4 h-4" />
                    <span>
                      Tu Carromato: {WAGON_LEVELS[pb.wagonLevel].title} ({pb.wagonMpRemaining} PM restantes)
                    </span>
                  </span>
                  <span className="text-xs font-black text-emerald-300">
                    Entregas completadas: {pb.deliveredCommoditiesCount} (+{pb.deliveredCommoditiesCount} PV)
                  </span>
                </div>

                {pb.activeCommodityTile ? (
                  <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-400/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          COMMODITY_DELIVERY_META[pb.activeCommodityTile].targetDestination === 'CASTLE'
                            ? MB_TILE_ASSETS.DEST_CASTLE
                            : COMMODITY_DELIVERY_META[pb.activeCommodityTile].targetDestination === 'QUARRY'
                            ? MB_TILE_ASSETS.DEST_QUARRY
                            : MB_TILE_ASSETS.DEST_GLASSWORKS
                        }
                        alt={COMMODITY_DELIVERY_META[pb.activeCommodityTile].targetName}
                        className="w-12 h-14 object-contain drop-shadow shrink-0"
                        draggable={false}
                      />
                      <div>
                        <div className="text-xs font-black text-amber-200">
                          {COMMODITY_DELIVERY_META[pb.activeCommodityTile].emoji} Mercancía actual a bordo:{' '}
                          {COMMODITY_DELIVERY_META[pb.activeCommodityTile].name}
                        </div>
                        <p className="text-[11px] text-amber-100/80">
                          Lleva tu carromato hasta:{' '}
                          <strong>
                            {COMMODITY_DELIVERY_META[pb.activeCommodityTile].targetName}
                          </strong>{' '}
                          para cobrar +{WAGON_LEVELS[pb.wagonLevel].goldReward} oros y +1 PV.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isMyMainTurn || pb.wagonMpRemaining <= 0}
                      onClick={() => {
                        setIsModalOpen(false);
                        onStartBoardMode('MOVE_WAGON');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-black text-xs cursor-pointer"
                    >
                      Mover en el Mapa
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-stone-300">
                    Mueve tu carromato a cualquiera de los Hexágonos de Destino (Castillo, Cantera de Mármol o Fábrica de Vidrio) para recoger tu primer encargo de mercancía.
                  </p>
                )}

                {/* Cartas oficiales de Carromato (Niveles 1 a 5 en el color del jugador + dorsos de coste) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {([1, 2, 3, 4, 5] as const).map((lvl) => {
                    const spec = WAGON_LEVELS[lvl];
                    const isCurrent = pb.wagonLevel === lvl;
                    const isUnlocked = pb.wagonLevel >= lvl;
                    const isNextUpgrade = pb.wagonLevel + 1 === lvl;
                    const canAffordUpgrade =
                      isNextUpgrade &&
                      isMyBuildTurn &&
                      Object.entries(spec.upgradeCost).every(
                        ([res, amt]) => (me.resources[res as ResourceType] || 0) >= (amt || 0)
                      );
                    const cardSrc = isUnlocked
                      ? getWagonCardImage(lvl, me.color)
                      : getWagonCostCardImage(lvl);
                    return (
                      <div
                        key={lvl}
                        className={`p-2 rounded-2xl border-2 text-center space-y-1.5 flex flex-col items-center justify-between transition ${
                          isCurrent
                            ? 'bg-amber-500/20 border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.28)]'
                            : isUnlocked
                            ? 'bg-emerald-950/35 border-emerald-500/50'
                            : 'bg-[#120c08] border-stone-800'
                        }`}
                      >
                        <div className="relative w-full">
                          <img
                            src={cardSrc}
                            alt={`Carromato Nivel ${lvl}`}
                            className={`w-full rounded-xl object-cover shadow-lg ${
                              !isUnlocked ? 'opacity-85' : ''
                            }`}
                            draggable={false}
                          />
                          {isCurrent && (
                            <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-black shadow">
                              ACTUAL
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] font-bold text-amber-300 leading-tight">
                          Nv.{lvl} · {spec.movementPoints} PM · +{spec.goldReward} 🪙
                          {lvl === 5 && <span className="text-emerald-300"> · +1 PV</span>}
                        </div>
                        {isNextUpgrade && (
                          <button
                            type="button"
                            disabled={!canAffordUpgrade}
                            onClick={() => dispatchAction({ type: 'MB_UPGRADE_WAGON' })}
                            className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-black text-[10px] cursor-pointer"
                          >
                            Mejorar Nv.{lvl}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Cartas de Desarrollo oficiales de Mercaderes y Bárbaros */}
                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Cartas de Desarrollo — Mercaderes y Bárbaros ({mb.scenarioDevDeck.length} en mazo)
                    </span>
                    <button
                      type="button"
                      disabled={
                        !isMyBuildTurn ||
                        mb.scenarioDevDeck.length === 0 ||
                        (me.resources.SHEEP || 0) < (BUILDING_COSTS.DEV_CARD.SHEEP || 1) ||
                        (me.resources.WHEAT || 0) < (BUILDING_COSTS.DEV_CARD.WHEAT || 1) ||
                        (me.resources.ORE || 0) < (BUILDING_COSTS.DEV_CARD.ORE || 1)
                      }
                      onClick={() => dispatchAction({ type: 'MB_BUY_SCENARIO_DEV_CARD' })}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-black text-xs cursor-pointer"
                    >
                      Comprar Carta (1🐑 1🌾 1⛰️)
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 items-start">
                    <div className="rounded-xl bg-[#140e0a] border border-amber-500/40 p-1 flex flex-col items-center gap-1">
                      <img
                        src={MB_CARD_ASSETS.TB_DEV_BACK}
                        alt="Mazo Mercaderes y Bárbaros"
                        className="w-full rounded-lg shadow"
                        draggable={false}
                      />
                      <span className="text-[9px] font-black text-amber-300">
                        Mazo ({mb.scenarioDevDeck.length})
                      </span>
                    </div>
                    {(
                      [
                        { type: 'TB_KNIGHT' as const, label: 'Caballero' },
                        { type: 'GOOD_TRIP' as const, label: 'Buen viaje' },
                        { type: 'TB_ROAD_BUILDING' as const, label: 'Carreteras' },
                        { type: 'TECH_QUARRY' as const, label: 'Cantera +1' },
                        { type: 'TECH_TOOLS' as const, label: 'Herram. +1' },
                        { type: 'TECH_GLASS' as const, label: 'Vidrio +1' },
                      ] as const
                    ).map((item) => {
                      const cnt = pb.scenarioDevCards.filter((c) => c.type === item.type).length;
                      return (
                        <div
                          key={item.type}
                          className="rounded-xl bg-[#140e0a] border border-stone-800 p-1 flex flex-col items-center gap-1"
                        >
                          <img
                            src={getBarbariansDevCardImage(item.type)}
                            alt={item.label}
                            className="w-full rounded-lg shadow"
                            draggable={false}
                          />
                          <span className="text-[9px] font-bold text-stone-300 truncate max-w-full">
                            {item.label}
                            {cnt > 0 ? ` (${cnt})` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 5b. Escenario 4: EL ATAQUE DE LOS BÁRBAROS (CARTAS DE DESARROLLO OFICIALES) */}
            {mb.scenario === 'BARBARIAN_ATTACK' && (
              <div className="p-4 rounded-2xl bg-[#1f1610] border border-[#d4af37]/40 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-amber-400" />
                    <span>Cartas de Desarrollo — El Ataque de los Bárbaros</span>
                  </span>
                  <button
                    type="button"
                    disabled={
                      !isMyBuildTurn ||
                      mb.scenarioDevDeck.length === 0 ||
                      (me.resources.SHEEP || 0) < (BUILDING_COSTS.DEV_CARD.SHEEP || 1) ||
                      (me.resources.WHEAT || 0) < (BUILDING_COSTS.DEV_CARD.WHEAT || 1) ||
                      (me.resources.ORE || 0) < (BUILDING_COSTS.DEV_CARD.ORE || 1)
                    }
                    onClick={() => dispatchAction({ type: 'MB_BUY_SCENARIO_DEV_CARD' })}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-black text-xs cursor-pointer"
                  >
                    Comprar Carta (1🐑 1🌾 1⛰️) · Quedan {mb.scenarioDevDeck.length}
                  </button>
                </div>

                <div className="flex flex-wrap items-start gap-3">
                  {/* Dorso oficial del mazo */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="relative w-24 rounded-xl overflow-hidden border-2 border-[#d4af37]/70 shadow-lg">
                      <img
                        src={MB_CARD_ASSETS.DEV_BACK}
                        alt="Dorso El ataque de los Bárbaros"
                        className="w-full h-auto block"
                        draggable={false}
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-amber-300 font-mono text-[10px] font-black border border-amber-400/50">
                        {mb.scenarioDevDeck.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-stone-400">Mazo oficial</span>
                  </div>

                  {/* Galería oficial de las 4 cartas del escenario (y cartas jugadas/en mano del jugador) */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-w-[240px]">
                    {(
                      [
                        { type: 'ARM_KNIGHT' as const, label: 'Armar caballero' },
                        { type: 'STRONG_KNIGHT' as const, label: 'Caballero fuerte' },
                        { type: 'PRISONER' as const, label: 'Prisionero' },
                        { type: 'TREASON' as const, label: 'Traición' },
                      ] as const
                    ).map((cardInfo) => {
                      const heldCount = pb.scenarioDevCards.filter(
                        (c) => c.type === cardInfo.type && !c.played
                      ).length;
                      const playedCount = pb.scenarioDevCards.filter(
                        (c) => c.type === cardInfo.type && c.played
                      ).length;
                      return (
                        <div
                          key={cardInfo.type}
                          className="rounded-xl bg-[#140e0a] border border-stone-700/80 p-1.5 flex flex-col items-center gap-1 shadow"
                        >
                          <img
                            src={getBarbariansDevCardImage(cardInfo.type)}
                            alt={cardInfo.label}
                            className="w-full rounded-lg object-cover shadow"
                            draggable={false}
                          />
                          <div className="text-[10px] font-bold text-amber-200 text-center leading-tight">
                            {cardInfo.label}
                          </div>
                          {(heldCount > 0 || playedCount > 0) && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                              {heldCount > 0 ? `En mano: ${heldCount}` : `Jugadas: ${playedCount}`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 5c. Variante Oficial: EVENTOS EN CATÁN (CARTAS ILUSTRADAS) */}
            {mb.variants.catanEventsDeck && (
              <div className="p-4 rounded-2xl bg-[#1f1610] border border-[#d4af37]/40 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Eventos en Catán (Mazo Oficial · {mb.eventDeck.length} cartas restantes)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEventRulesCard((v) => !v)}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-[11px] font-bold text-amber-200 cursor-pointer"
                  >
                    {showEventRulesCard ? 'Ocultar Resumen' : 'Ver Carta de Reglas'}
                  </button>
                </div>

                <div className="flex flex-wrap items-start gap-4">
                  {/* Carta activa del turno actual */}
                  {mb.currentEventCard ? (
                    <div className="flex items-start gap-3 bg-[#140e0a] p-2.5 rounded-2xl border border-amber-500/40 flex-1 min-w-[260px]">
                      <img
                        src={getCatanEventCardImage(mb.currentEventCard)}
                        alt={mb.currentEventCard.title}
                        className="w-28 sm:w-32 rounded-xl border border-amber-400/60 shadow-xl shrink-0"
                        draggable={false}
                      />
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[10px] font-black">
                          <span>Tirada equivalente: {mb.currentEventCard.numberToken}</span>
                          <span>
                            ({mb.currentEventCard.dicePair[0]} + {mb.currentEventCard.dicePair[1]})
                          </span>
                        </div>
                        <div className="text-sm font-black text-amber-100">
                          {mb.currentEventCard.title}
                        </div>
                        <p className="text-xs text-stone-300 leading-snug">
                          {mb.currentEventCard.description}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-[#140e0a] p-3 rounded-2xl border border-stone-800 flex-1 min-w-[240px]">
                      <img
                        src={MB_CARD_ASSETS.EVENT_BACK}
                        alt="Eventos en Catán"
                        className="w-20 rounded-xl border border-amber-500/40 shadow"
                        draggable={false}
                      />
                      <p className="text-xs text-stone-300">
                        Al pulsar «Lanzar Dados» en cada turno se robará automáticamente la siguiente carta del mazo oficial de <strong>Eventos en Catán</strong>.
                      </p>
                    </div>
                  )}

                  {/* Dorso del mazo restante + opcional resumen de reglas */}
                  <div className="flex items-start gap-3 shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative w-20 rounded-xl overflow-hidden border border-[#d4af37]/60 shadow-lg">
                        <img
                          src={MB_CARD_ASSETS.EVENT_BACK}
                          alt="Mazo Eventos en Catán"
                          className="w-full h-auto block"
                          draggable={false}
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-amber-300 font-mono text-[10px] font-black">
                          {mb.eventDeck.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-bold">Mazo</span>
                    </div>

                    {showEventRulesCard && (
                      <img
                        src={MB_CARD_ASSETS.EVENT_RULES}
                        alt="Eventos en Catán: Resumen de reglas"
                        className="w-36 rounded-xl border border-amber-400/50 shadow-xl"
                        draggable={false}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Variantes activas y Reglas del escenario */}
            <div className="p-4 rounded-2xl bg-[#140e0a] border border-stone-800 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                📜 Reglas Oficiales de este Escenario
              </div>
              <ul className="space-y-1 text-xs text-stone-300 list-disc pl-4">
                {scenarioSpec.rulesSummary.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
