import React, { useEffect, useState } from 'react';
import {
  ALL_RESOURCES,
  PLAYER_COLORS,
  RESOURCE_META,
} from '../../shared/constants';
import {
  EP_CARD_ASSETS,
  EP_MISSION_META,
  EP_SPICE_PERK_META,
  EP_TOKEN_ASSETS,
  EXPLORERS_PIRATES_SCENARIOS,
  canFitCargoItem,
  getEPCargoToken,
  getEPHarborCityToken,
  getEPMissionGuideCardImage,
  getEPMissionTrackImage,
  getEPMissionVPImage,
  getEPSettlerToken,
  getEPShipToken,
  getEPUnitToken,
} from '../../shared/expansionsConfig';
import type {
  EPCargoItem,
  GameAction,
  GameState,
} from '../../shared/types';
import { ResourceIcon } from '../UI/ResourceIcon';
import type { ActiveExplorersBoardMode } from './ExplorersPiratesDrawerMenu';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import {
  Anchor,
  BookOpen,
  Coins,
  Crown,
  ScrollText,
  Ship,
} from 'lucide-react';

interface ExplorersPiratesPanelProps {
  gameState: GameState;
  playerId: string;
  dispatchAction: (action: GameAction) => void;
  onStartBoardMode: (mode: ActiveExplorersBoardMode) => void;
}

const CARGO_LABELS: Record<EPCargoItem, { name: string; emoji: string }> = {
  SETTLER: { name: 'Colono (2 espacios)', emoji: '🧑‍🌾' },
  CREW: { name: 'Unidad (1 espacio)', emoji: '🛡️' },
  FISH_HAUL: { name: 'Banco de Peces (2 espacios)', emoji: '🐟' },
  SPICE_SACK: { name: 'Saco de Especias (1 espacio)', emoji: '🌶️' },
};

export const ExplorersPiratesPanel: React.FC<ExplorersPiratesPanelProps> = ({
  gameState: s,
  playerId,
  dispatchAction,
  onStartBoardMode,
}) => {
  const isMobile = useIsMobileViewport();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTurnSummary, setShowTurnSummary] = useState(false);
  const [showMissionGuides, setShowMissionGuides] = useState(false);

  useEffect(() => {
    const openHandler = () => setIsModalOpen(true);
    window.addEventListener('open-explorers-pirates-panel', openHandler);
    return () => window.removeEventListener('open-explorers-pirates-panel', openHandler);
  }, []);

  const ep = s.explorersPirates;
  const me = s.players.find((p) => p.id === playerId);
  const pep = me?.explorersPirates;
  if (!ep || !me || !pep) return null;

  const scenarioSpec =
    EXPLORERS_PIRATES_SCENARIOS.find((sc) => sc.id === ep.scenario) ||
    EXPLORERS_PIRATES_SCENARIOS[4];

  const isMyMainTurn =
    !s.turn.isPausedByHost && s.turn.activePlayerId === me.id && s.phase === 'MAIN_PHASE';

  const myShips = Object.values(ep.ships).filter((sh) => sh.playerId === me.id);
  const myBasins = Object.values(ep.harborBasins).filter((b) => b.playerId === me.id);
  const unexploredCount = Object.values(s.board.hexes).filter((h) => h.terrain === 'FOG').length;

  return (
    <>
      {isMobile ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="mobile-expansion-hud fixed z-30 h-8 px-2.5 rounded-xl border border-[#d4af37]/75 bg-[#160f0a]/96 text-amber-100 shadow-xl pointer-events-auto flex items-center gap-1.5 text-[10.5px] font-black cursor-pointer active:scale-95"
          title="Abrir Misiones, Flota y Oro (Piratas y Exploradores)"
        >
          <Anchor className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>P&amp;E</span>
          <span className="font-mono text-amber-300">🪙{pep.goldCoins}</span>
          <span className="font-mono text-cyan-300">{myShips.length}/3</span>
        </button>
      ) : (
      /* Bottom-Left HUD Box (Exact same slot & style as CitiesKnightsPanel) */
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
        title="Haz clic para abrir el menú de Misiones, Flota y Oro de Piratas y Exploradores"
      >
        <div className="flex justify-between items-center w-full text-xs font-black text-amber-200 group-hover:text-amber-100 transition">
          <span className="flex items-center gap-1.5 truncate">
            <Anchor className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Piratas y Exploradores</span>
          </span>
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 group-hover:bg-amber-500/35 text-amber-300 font-mono text-[10px]">
            ＋
          </span>
        </div>

        <div className="ck-hud-details mt-1.5 space-y-1.5">
          {/* Gold, Fleet & Unexplored Hexes */}
          <div className="flex items-center justify-between text-[10px] font-bold bg-black/40 px-2 py-1 rounded-lg border border-amber-500/20">
            <span className="text-amber-300">🪙 {pep.goldCoins} Oros</span>
            <span className="text-cyan-300 flex items-center gap-1">
              <img
                src={getEPShipToken(me.color)}
                alt="Barco"
                className="w-3.5 h-3.5 rounded-full object-cover"
              />
              {myShips.length}/3
            </span>
            <span className="text-stone-300">🧭 {unexploredCount} Niebla</span>
          </div>

          {/* 3 Mission Progress Tracks Summary */}
          {ep.activeMissions.length > 0 ? (
            <div className="space-y-1">
              {ep.activeMissions.map((mId) => {
                const meta = EP_MISSION_META[mId];
                const myStep = pep.missionProgress[mId] || 0;
                const myVP = meta.stepVP[myStep] || 0;
                const isLeader = ep.missionLeaderPlayerIds[mId] === me.id;
                return (
                  <div
                    key={mId}
                    className="flex items-center justify-between text-[10px] px-1.5 py-0.5 rounded bg-stone-900/90 border border-stone-800"
                  >
                    <span className="font-bold truncate flex items-center gap-1">
                      <span>{meta.emoji}</span>
                      <span className="truncate">{meta.title}</span>
                    </span>
                    <span className="font-mono font-black text-amber-200 shrink-0 ml-1">
                      Cas.{myStep}/7 ({myVP + (isLeader ? 1 : 0)} PV{isLeader ? ' 👑' : ''})
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[10px] text-stone-300">
              ¡Tierra a la vista! Explora las islas con tus barcos y funda poblados con colonos.
            </div>
          )}

          {pep.unlockedSpicePerks.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-white/10">
              {pep.unlockedSpicePerks.map((perk) => (
                <span
                  key={perk}
                  className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-200 font-black"
                >
                  {EP_SPICE_PERK_META[perk].emoji} {EP_SPICE_PERK_META[perk].shortLabel}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Full Piratas y Exploradores Modal (Visually identical style to CitiesKnightsPanel Modal, ZERO select dropdowns) */}
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
                  <Anchor className="w-5 h-5 text-amber-400" />
                  <span>Piratas y Exploradores — {scenarioSpec.title}</span>
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

            {/* 1. Marcadores Oficiales de Misiones */}
            {ep.activeMissions.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                  🏆 Marcadores de Misión y Tarjetas de Campeón (+1 PV)
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {ep.activeMissions.map((mId) => {
                    const meta = EP_MISSION_META[mId];
                    const leaderId = ep.missionLeaderPlayerIds[mId];
                    const leaderPlayer = s.players.find((p) => p.id === leaderId);
                    return (
                      <div
                        key={mId}
                        className="p-3.5 rounded-2xl bg-[#1f1610] border border-[#d4af37]/40 space-y-2.5"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getEPMissionVPImage(mId)}
                              alt={meta.cardTitle}
                              className={`w-12 h-12 rounded-xl object-cover shrink-0 shadow-md border-2 ${
                                leaderPlayer
                                  ? 'border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]'
                                  : 'border-stone-700 opacity-85'
                              }`}
                            />
                            <div>
                              <div className="text-xs sm:text-sm font-black text-amber-100">
                                {meta.title}
                              </div>
                              <p className="text-[11px] text-stone-400">{meta.description}</p>
                            </div>
                          </div>
                          <div className="px-2.5 py-1 rounded-xl bg-amber-950 border border-amber-400/60 text-[11px] font-black text-amber-200 flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-300" />
                            <span>
                              {meta.cardTitle}:{' '}
                              <strong className="text-white">
                                {leaderPlayer ? leaderPlayer.name : 'Sin reclamar'}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Casillas del marcador S (0) a 7 */}
                        <div className="grid grid-cols-8 gap-1.5">
                          {Array.from({ length: 8 }, (_, stepIdx) => {
                            const vpAtStep = meta.stepVP[stepIdx];
                            const playersHere = s.players.filter(
                              (pl) => (pl.explorersPirates?.missionProgress[mId] || 0) === stepIdx
                            );
                            return (
                              <div
                                key={stepIdx}
                                className={`p-2 rounded-xl border text-center flex flex-col items-center justify-between min-h-[58px] ${
                                  playersHere.some((pl) => pl.id === me.id)
                                    ? 'bg-amber-500/20 border-amber-300'
                                    : 'bg-[#120c08] border-stone-800'
                                }`}
                              >
                                <div className="text-[10px] font-black text-stone-300">
                                  {stepIdx === 0 ? 'Salida (S)' : `Casilla ${stepIdx}`}
                                </div>
                                <div className="text-[11px] font-mono font-black text-amber-300">
                                  +{vpAtStep} PV
                                </div>
                                <div className="flex flex-wrap justify-center gap-1 mt-1">
                                  {playersHere.map((pl) => (
                                    <span
                                      key={pl.id}
                                      style={{
                                        backgroundColor: PLAYER_COLORS[pl.color].primary,
                                      }}
                                      className="w-3.5 h-3.5 rounded-full border border-white shadow"
                                      title={pl.name}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Gestión de Flota, Bodegas y Dársenas de Ciudades Portuarias */}
            <div className="p-4 rounded-2xl bg-[#1f1610] border border-[#d4af37]/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Ship className="w-4 h-4" />
                  <span>
                    Tu Flota Marítima ({myShips.length}/3 Barcos) y Ciudades Portuarias ({myBasins.length}/4)
                  </span>
                </span>
                <div className="flex items-center gap-2 text-[11px] text-stone-300 flex-wrap">
                  <span>Reserva:</span>
                  <span className="px-2 py-0.5 rounded bg-black/50 text-amber-200 font-bold flex items-center gap-1.5">
                    <img
                      src={getEPHarborCityToken(me.color)}
                      alt="Ciudad Portuaria"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    {pep.harborCitiesLeft} Puertos
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/50 text-amber-200 font-bold flex items-center gap-1.5">
                    <img
                      src={getEPSettlerToken(me.color)}
                      alt="Colono"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    {pep.settlersLeft} Colonos
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/50 text-sky-200 font-bold flex items-center gap-1.5">
                    <img
                      src={getEPUnitToken(me.color)}
                      alt="Unidad"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    {pep.unitsLeft} Unidades
                  </span>
                  {(ep.activeMissions.includes('PIRATE_LAIRS') ||
                    ep.scenario === 'EXPLORERS_AND_PIRATES_FULL') && (
                    <button
                      type="button"
                      disabled={!isMyMainTurn}
                      onClick={() => {
                        setIsModalOpen(false);
                        onStartBoardMode('PLACE_PIRATE_SHIP');
                      }}
                      className="px-2.5 py-1 rounded-md bg-[#9e2b25] hover:bg-[#b5352e] disabled:opacity-40 text-white font-bold text-[11px] cursor-pointer"
                    >
                      Mover Barco Pirata
                    </button>
                  )}
                </div>
              </div>

              {myShips.length === 0 ? (
                <p className="text-xs text-stone-400">
                  No tienes barcos en el mar. Construye un barco (1 Madera + 1 Lana) en una travesía junto a una de tus Ciudades Portuarias.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {myShips.map((ship, idx) => {
                    const shipEdge = s.board.edges[ship.edgeId];
                    const adjHarborId = shipEdge?.vertexIds.find(
                      (vid) => ep.harborBasins[vid]?.playerId === me.id
                    );
                    const adjLairHexId = shipEdge?.hexIds.find(
                      (hid) => ep.pirateLairs[hid] && !ep.pirateLairs[hid].conquered
                    );
                    const adjConqueredPickupLairId = shipEdge?.hexIds.find(
                      (hid) =>
                        ep.pirateLairs[hid]?.conquered &&
                        (ep.pirateLairs[hid].waitingPickupByPlayer[me.id] || 0) > 0
                    );
                    const canDriveOffPirate =
                      Boolean(ep.activePirateShip) &&
                      ep.activePirateShip!.playerId !== me.id &&
                      !ship.hasMovedThisTurn &&
                      Boolean(shipEdge?.hexIds.includes(ep.activePirateShip!.hexId));
                    const adjFishHexId = shipEdge?.hexIds.find(
                      (hid) => ep.fishGrounds[hid]?.hasFishShoal
                    );
                    const adjSpiceHexId = shipEdge?.hexIds.find(
                      (hid) =>
                        ep.spiceVillages[hid]?.discovered &&
                        ep.spiceVillages[hid].sacksRemaining > 0 &&
                        !ep.spiceVillages[hid].merchantsPlayerIds.includes(me.id)
                    );
                    const atCouncil =
                      Boolean(ep.councilHexId) &&
                      (shipEdge?.hexIds.includes(ep.councilHexId!) ||
                        shipEdge?.vertexIds.some((vid) =>
                          ep.councilDeliveryVertexIds.includes(vid)
                        ));

                    return (
                      <div
                        key={ship.id}
                        className="p-3 rounded-xl bg-[#140e0a] border border-stone-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-cyan-200 flex items-center gap-2">
                            <img
                              src={getEPShipToken(me.color)}
                              alt={`Barco #${idx + 1}`}
                              className="w-6 h-6 rounded-full object-cover border border-cyan-400/60"
                            />
                            Barco #{idx + 1}
                          </span>
                          <span className="text-[11px] font-mono font-black text-amber-300">
                            {ship.mpRemaining} PM disp.
                          </span>
                        </div>

                        <div className="text-[11px] text-stone-300 flex items-center flex-wrap gap-1.5">
                          <span>Bodega:</span>
                          {ship.cargo.length === 0 ? (
                            <span className="text-stone-500">Vacía (2 espacios libres)</span>
                          ) : (
                            ship.cargo.map((c, cIdx) => (
                              <span
                                key={`${c}-${cIdx}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-stone-900 border border-stone-700 text-[10px] font-bold text-stone-100"
                              >
                                <img
                                  src={getEPCargoToken(c, me.color)}
                                  alt={CARGO_LABELS[c].name}
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                                {CARGO_LABELS[c].name}
                              </span>
                            ))
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            disabled={
                              !isMyMainTurn ||
                              ship.boostedThisTurn ||
                              (me.resources.SHEEP || 0) < 1
                            }
                            onClick={() =>
                              dispatchAction({ type: 'EP_BOOST_SHIP', shipId: ship.id })
                            }
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-stone-900 disabled:text-stone-600 text-stone-950 font-black text-[10px] cursor-pointer"
                          >
                            +2 PM (1 🐑)
                          </button>

                          {adjHarborId && (
                            <button
                              type="button"
                              disabled={!isMyMainTurn}
                              onClick={() =>
                                dispatchAction({
                                  type: 'EP_TRANSFER_CARGO',
                                  shipId: ship.id,
                                  harborVertexId: adjHarborId,
                                  direction: 'SWAP',
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-stone-950 font-black text-[10px] cursor-pointer"
                            >
                              Intercambiar con Dársena
                            </button>
                          )}

                          {adjLairHexId && ship.cargo.includes('CREW') && (
                            <button
                              type="button"
                              disabled={!isMyMainTurn}
                              onClick={() =>
                                dispatchAction({
                                  type: 'EP_LAND_UNIT_ON_LAIR',
                                  shipId: ship.id,
                                  hexId: adjLairHexId,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-md bg-[#9e2b25] hover:bg-[#b5352e] text-white font-bold text-[11px] cursor-pointer"
                            >
                              Asaltar guarida
                            </button>
                          )}

                          {adjConqueredPickupLairId && canFitCargoItem(ship.cargo, 'CREW') && (
                            <button
                              type="button"
                              disabled={!isMyMainTurn}
                              onClick={() =>
                                dispatchAction({
                                  type: 'EP_PICKUP_LAIR_UNIT',
                                  shipId: ship.id,
                                  hexId: adjConqueredPickupLairId,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-md bg-[#245c7a] hover:bg-[#2d6f94] text-white font-bold text-[11px] cursor-pointer"
                            >
                              Embarcar tripulación
                            </button>
                          )}

                          {canDriveOffPirate && (
                            <button
                              type="button"
                              disabled={!isMyMainTurn}
                              onClick={() =>
                                dispatchAction({
                                  type: 'EP_DRIVE_OFF_PIRATE',
                                  shipId: ship.id,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-md bg-[#b84a27] hover:bg-[#cb5630] text-white font-bold text-[11px] cursor-pointer"
                            >
                              Combatir barco pirata
                            </button>
                          )}

                          {adjFishHexId && ship.cargo.length === 0 && (
                            <button
                              type="button"
                              disabled={!isMyMainTurn}
                              onClick={() =>
                                dispatchAction({
                                  type: 'EP_PICKUP_FISH_SHOAL',
                                  shipId: ship.id,
                                  hexId: adjFishHexId,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-[10px] cursor-pointer inline-flex items-center gap-1"
                            >
                              <img
                                src={EP_TOKEN_ASSETS.FISH_SHOAL}
                                alt=""
                                className="w-3.5 h-3.5 rounded-full"
                              />
                              Pescar Banco
                            </button>
                          )}

                          {adjSpiceHexId && ship.cargo.includes('CREW') && (
                            <button
                              type="button"
                              disabled={!isMyMainTurn}
                              onClick={() =>
                                dispatchAction({
                                  type: 'EP_TRADE_WITH_SPICE_VILLAGE',
                                  shipId: ship.id,
                                  hexId: adjSpiceHexId,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-[10px] cursor-pointer inline-flex items-center gap-1"
                            >
                              <img
                                src={EP_TOKEN_ASSETS.SPICE_SACK}
                                alt=""
                                className="w-3.5 h-3.5 rounded-full"
                              />
                              Comerciar Especias
                            </button>
                          )}

                          {atCouncil &&
                            (ship.cargo.includes('FISH_HAUL') ||
                              ship.cargo.includes('SPICE_SACK')) && (
                              <button
                                type="button"
                                disabled={!isMyMainTurn}
                                onClick={() =>
                                  dispatchAction({
                                    type: 'EP_DELIVER_TO_COUNCIL',
                                    shipId: ship.id,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-[10px] cursor-pointer"
                              >
                                🏛️ Entregar al Consejo
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Mercado de Oro (2 Oros = 1 Recurso; 3 Recursos iguales = 1 Oro; Comercio de Oro de Especias) */}
            <div className="p-4 rounded-2xl bg-[#1f1610] border border-[#d4af37]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span>
                    Mercado de Oro y Comercio 3:1 ({pep.goldCoins} monedas · Compras:{' '}
                    {pep.goldPurchasesThisTurn}/2)
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-stone-300">
                Haz clic en una materia prima para comprarla por <strong>2 monedas de oro</strong> (hasta 2 veces en tu fase de comercio y construcción), o entrega 3 recursos iguales por 1 moneda de oro:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ALL_RESOURCES.map((res) => {
                  const canBuy =
                    isMyMainTurn &&
                    ep.turnSubPhase === 'TRADE_AND_BUILD' &&
                    pep.goldCoins >= 2 &&
                    pep.goldPurchasesThisTurn < 2 &&
                    (s.bank[res] || 0) > 0;
                  const canSell3 =
                    isMyMainTurn &&
                    ep.turnSubPhase === 'TRADE_AND_BUILD' &&
                    (me.resources[res] || 0) >= 3;
                  const maxSpiceGoldTrades =
                    (pep.unlockedSpicePerks.includes('GOLD_TRADE_1') ? 1 : 0) +
                    (pep.unlockedSpicePerks.includes('GOLD_TRADE_2') ? 1 : 0);
                  const canSpiceGoldTrade =
                    maxSpiceGoldTrades > 0 &&
                    isMyMainTurn &&
                    ep.turnSubPhase === 'TRADE_AND_BUILD' &&
                    pep.spiceGoldTradesThisTurn < maxSpiceGoldTrades &&
                    (me.resources[res] || 0) >= 1;
                  return (
                    <div
                      key={res}
                      className="p-2.5 rounded-lg bg-[#140e0a] border border-stone-800 flex flex-col items-center gap-1.5"
                    >
                      <ResourceIcon resource={res} size={22} />
                      <span className="text-xs font-bold">{RESOURCE_META[res].name}</span>
                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() =>
                          dispatchAction({ type: 'EP_BUY_RESOURCE_WITH_GOLD', resource: res })
                        }
                        className="w-full py-1.5 rounded-md bg-[#c89b3c] hover:bg-[#d6aa4c] disabled:bg-stone-900 disabled:text-stone-600 text-stone-950 font-bold text-[10px] cursor-pointer tabular-nums"
                      >
                        Comprar (2 oros)
                      </button>
                      <button
                        type="button"
                        disabled={!canSell3}
                        onClick={() =>
                          dispatchAction({ type: 'EP_TRADE_3_FOR_GOLD', giveResource: res })
                        }
                        className="w-full py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-200 font-bold text-[10px] cursor-pointer tabular-nums"
                      >
                        Dar 3 → +1 oro
                      </button>
                      {maxSpiceGoldTrades > 0 && (
                        <button
                          type="button"
                          disabled={!canSpiceGoldTrade}
                          onClick={() =>
                            dispatchAction({ type: 'EP_SPICE_GOLD_TRADE', giveResource: res })
                          }
                          className="w-full py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-700 disabled:opacity-35 text-emerald-100 font-bold text-[10px] cursor-pointer tabular-nums"
                        >
                          Especias: 1 → +1 oro
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Resumen de Reglas y Tarjetas Oficiales de Referencia */}
            <div className="p-4 rounded-2xl bg-[#140e0a] border border-stone-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                  📜 Reglas Oficiales de este Escenario
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowTurnSummary((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition ${
                      showTurnSummary
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-500/60'
                    }`}
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                    {showTurnSummary ? 'Ocultar Resumen del Turno' : 'Ver Resumen del Turno'}
                  </button>
                  {ep.activeMissions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowMissionGuides((v) => !v)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition ${
                        showMissionGuides
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-500/60'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      {showMissionGuides ? 'Ocultar Guías de Misión' : 'Ver Pistas y Guías Originales'}
                    </button>
                  )}
                </div>
              </div>

              <ul className="space-y-1 text-xs text-stone-300 list-disc pl-4">
                {scenarioSpec.rulesSummary.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>

              {showTurnSummary && (
                <div className="pt-2 border-t border-stone-800 flex justify-center">
                  <img
                    src={EP_CARD_ASSETS.TURN_SUMMARY}
                    alt="Resumen del turno de Piratas y Exploradores"
                    className="max-w-sm w-full rounded-2xl border border-[#d4af37]/60 shadow-2xl"
                  />
                </div>
              )}

              {showMissionGuides && ep.activeMissions.length > 0 && (
                <div className="pt-2 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ep.activeMissions.map((mId) => (
                    <div
                      key={`guide-${mId}`}
                      className="p-2.5 rounded-xl bg-black/40 border border-stone-800 flex flex-col items-center gap-2"
                    >
                      <span className="text-[11px] font-black text-amber-200">
                        {EP_MISSION_META[mId].title}
                      </span>
                      <div className="flex items-center justify-center gap-2 w-full">
                        <img
                          src={getEPMissionTrackImage(mId)}
                          alt={`Marcador ${EP_MISSION_META[mId].title}`}
                          className="h-44 w-auto rounded-lg border border-stone-700 shadow"
                        />
                        <img
                          src={getEPMissionGuideCardImage(mId)}
                          alt={`Guía ${EP_MISSION_META[mId].title}`}
                          className="h-44 w-auto rounded-lg border border-stone-700 shadow"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
