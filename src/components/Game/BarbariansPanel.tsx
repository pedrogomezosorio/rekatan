import React, { useEffect, useState } from 'react';
import {
  ALL_RESOURCES,
  PLAYER_COLORS,
  RESOURCE_META,
} from '../../shared/constants';
import {
  BARBARIANS_SCENARIOS,
  COMMODITY_DELIVERY_META,
  WAGON_LEVELS,
} from '../../shared/expansionsConfig';
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
              <span className="flex items-center gap-1 font-bold text-sky-300">
                <Fish className="w-3 h-3" />
                <span>
                  {totalFish} Pescados ({pb.fishTokens.length}/7 fichas)
                </span>
              </span>
              {pb.hasOldBoot && (
                <span className="px-1.5 py-0.2 rounded bg-red-950 border border-red-500/50 text-red-200 font-black">
                  👢 Bota (+1 PV meta)
                </span>
              )}
            </div>
          )}

          {mb.scenario === 'RIVERS_OF_CATAN' && (
            <div className="flex items-center justify-between text-[10px] text-stone-200">
              <span className="font-bold text-amber-300">
                🪙 {pb.goldCoins} Oros · 🌉 {3 - pb.bridgesLeft}/3 Puentes
              </span>
              {pb.isWealthiestSettler ? (
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-200 font-black">
                  Rico (+1 PV)
                </span>
              ) : pb.isPoorestSettler ? (
                <span className="px-1.5 py-0.2 rounded bg-red-950 border border-red-500/60 text-red-200 font-black">
                  Pobre (-2 PV)
                </span>
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
            <div className="flex items-center justify-between text-[10px] text-stone-200">
              <span className="font-bold text-amber-300">
                🛞 Carromato Nv.{pb.wagonLevel} ({pb.wagonMpRemaining} PM) · 🪙 {pb.goldCoins}
              </span>
              <span className="text-emerald-300 font-black">
                📦 {pb.deliveredCommoditiesCount} Entregas
              </span>
            </div>
          )}

          {mb.currentEventCard && (
            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/10 text-amber-200">
              <span className="truncate font-bold">
                🃏 {mb.currentEventCard.numberToken} · {mb.currentEventCard.title}
              </span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <Fish className="w-4 h-4" />
                      <span>Tus Fichas de Pescado ({pb.fishTokens.length}/7 fichas · Total: {totalFish} peces)</span>
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Mazo: {mb.fishDeck.length} fichas
                    </span>
                  </div>

                  {pb.fishTokens.length === 0 ? (
                    <p className="text-xs text-stone-400">
                      Aún no tienes fichas de pescado. Construye en los caladeros costeros (4, 5, 6, 8, 9, 10) o junto al Lago central (2, 3, 11, 12).
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {pb.fishTokens.map((tok) => (
                        <div
                          key={tok.id}
                          className="px-3 py-2 rounded-xl bg-sky-950 border border-sky-400/60 text-sky-100 font-black text-xs flex items-center gap-1.5 shadow"
                        >
                          <span>{'🐟'.repeat(tok.fishCount)}</span>
                          <span className="font-mono text-amber-300">({tok.fishCount})</span>
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
                    <div className="p-3 rounded-xl bg-red-950 border border-red-500/60 space-y-2">
                      <div className="text-xs font-black text-red-200">
                        👢 Posees la «Bota vieja» (Necesitas +1 PV para ganar). Entrégasela a un jugador con tantos o más PV que tú:
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

                {/* Ranking de Oro entre todos los jugadores */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10">
                  {s.players.map((pl) => {
                    const pGold = pl.barbarians?.goldCoins || 0;
                    return (
                      <div
                        key={pl.id}
                        className="p-2 rounded-xl bg-[#140e0a] border border-stone-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold truncate">{pl.name}</span>
                        <span className="font-mono font-black text-amber-300">
                          {pGold} 🪙
                          {pl.barbarians?.isWealthiestSettler && ' (+1 PV)'}
                          {pl.barbarians?.isPoorestSettler && ' (-2 PV)'}
                        </span>
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
                  <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-400/60 flex items-center justify-between">
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

                {/* Tabla visual de niveles de Carromato */}
                <div className="grid grid-cols-5 gap-2">
                  {([1, 2, 3, 4, 5] as const).map((lvl) => {
                    const spec = WAGON_LEVELS[lvl];
                    const isCurrent = pb.wagonLevel === lvl;
                    const isUnlocked = pb.wagonLevel >= lvl;
                    return (
                      <div
                        key={lvl}
                        className={`p-2.5 rounded-xl border text-center space-y-1 ${
                          isCurrent
                            ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                            : isUnlocked
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                            : 'bg-[#120c08] border-stone-800 text-stone-400'
                        }`}
                      >
                        <div className="text-xs font-black">Nivel {lvl}</div>
                        <div className="text-[11px] font-bold text-amber-300">
                          {spec.movementPoints} PM · +{spec.goldReward} 🪙
                        </div>
                        {lvl === 5 && (
                          <div className="text-[10px] font-black text-emerald-300">+1 PV</div>
                        )}
                      </div>
                    );
                  })}
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
