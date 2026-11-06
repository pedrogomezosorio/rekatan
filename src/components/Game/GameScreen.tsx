import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Anchor,
  Award,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Dices,
  Flame,
  Layers,
  Lock,
  LogOut,
  Pause,
  Play,
  Route,
  ScrollText,
  Settings,
  Sparkles,
  Swords,
  SkipForward,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import {
  ALL_RESOURCES,
  BUILDING_COSTS,
  countTotalResources,
  PLAYER_COLORS,
  RESOURCE_META,
} from '../../shared/constants';
import {
  canBuyDevCard,
  canSpendOrBuildThisTurn,
  canTradeThisTurn,
  getPlayerBankTradeRatios,
  getValidCityVertices,
  getValidRoadEdges,
  getValidSettlementVertices,
  hasResources,
} from '../../shared/engine/RulesEngine';
import { PlayerState } from '../../shared/types';
import { Board } from '../Board/Board';
import { OverlayAnimations } from '../Animations/OverlayAnimations';
import { ResourceIcon } from '../UI/ResourceIcon';
import { BuildDrawerMenu, ActiveBuildMode } from './BuildDrawerMenu';
import { ResourceHandFan } from './ResourceHandFan';
import {
  AbandonConfirmModal,
  ActiveTradeFloatingBanner,
  DevCardModal,
  DisconnectResolutionBanner,
  RobberDiscardModal,
  RobberStealModal,
  TradeModal,
  TurnOrderModal,
  VictoryModal,
} from './GameModals';

export const GameScreen: React.FC = () => {
  const {
    gameState,
    playerId,
    dispatchAction,
    leaveRoomClient,
    lowEndPcMode,
    setLowEndPcMode,
  } = useGame();

  const [buildMode, setBuildMode] = useState<ActiveBuildMode>(null);
  const [isBuildDrawerOpen, setIsBuildDrawerOpen] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeModalInitialTab, setTradeModalInitialTab] = useState<'PLAYERS' | 'BANK'>('BANK');
  const [showDevModal, setShowDevModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChronicle, setShowChronicle] = useState(false);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setBuildMode(null);
    setIsBuildDrawerOpen(false);
  }, [
    gameState?.phase,
    gameState?.turn.activePlayerId,
    gameState?.turn.infrastructureBuiltThisTurn,
  ]);

  if (!gameState) return null;

  const me = gameState.players.find((p) => p.id === playerId) || gameState.players[0];
  const activePlayer = gameState.players.find((p) => p.id === gameState.turn.activePlayerId);
  const isMyTurn = gameState.turn.activePlayerId === playerId;
  const { phase, config, turn, board } = gameState;
  const isPausedByHost = Boolean(turn.isPausedByHost);

  // Disable hex glow during all initial placement & order phases
  const isInitialPlacementPhase =
    phase === 'ORDER_ROLL' ||
    phase === 'SETUP_SETTLEMENT_1' ||
    phase === 'SETUP_ROAD_1' ||
    phase === 'SETUP_SETTLEMENT_2' ||
    phase === 'SETUP_ROAD_2';

  const boardProducingHexIds = isInitialPlacementPhase
    ? []
    : gameState.lastEvent?.producingHexIds || [];

  const validSettlementIds = useMemo(() => {
    if (!isMyTurn || isPausedByHost) return [];
    if (phase === 'SETUP_SETTLEMENT_1' || phase === 'SETUP_SETTLEMENT_2') {
      return getValidSettlementVertices(gameState, playerId);
    }
    if (phase === 'MAIN_PHASE' && buildMode === 'SETTLEMENT') {
      return getValidSettlementVertices(gameState, playerId);
    }
    return [];
  }, [gameState, isMyTurn, isPausedByHost, phase, buildMode, playerId]);

  const validRoadIds = useMemo(() => {
    if (!isMyTurn || isPausedByHost) return [];
    if (
      phase === 'SETUP_ROAD_1' ||
      phase === 'SETUP_ROAD_2' ||
      phase === 'ROAD_BUILDING_DEV'
    ) {
      return getValidRoadEdges(gameState, playerId);
    }
    if (phase === 'MAIN_PHASE' && buildMode === 'ROAD') {
      return getValidRoadEdges(gameState, playerId);
    }
    return [];
  }, [gameState, isMyTurn, isPausedByHost, phase, buildMode, playerId]);

  const validCityIds = useMemo(() => {
    if (!isMyTurn || isPausedByHost) return [];
    if (phase === 'MAIN_PHASE' && buildMode === 'CITY') {
      return getValidCityVertices(gameState, playerId);
    }
    return [];
  }, [gameState, isMyTurn, isPausedByHost, phase, buildMode, playerId]);

  const isMovingRobber = isMyTurn && !isPausedByHost && phase === 'ROBBER_MOVE';

  // Maritime Trade Ratios for local player
  const myPortRatios = useMemo(
    () => getPlayerBankTradeRatios(gameState, playerId),
    [gameState, playerId]
  );

  const hasAnyPort = useMemo(
    () => ALL_RESOURCES.some((r) => myPortRatios[r] < 4),
    [myPortRatios]
  );

  // Turn timer progress (freezes cleanly when paused by host)
  const remainingSec = useMemo(() => {
    if (!config.turnTimerSeconds) return null;
    if (
      isPausedByHost &&
      turn.pausedRemainingTimerMs !== null &&
      turn.pausedRemainingTimerMs !== undefined
    ) {
      return Math.max(0, Math.ceil(turn.pausedRemainingTimerMs / 1000));
    }
    if (turn.turnDeadlineMs) {
      return Math.max(0, Math.ceil((turn.turnDeadlineMs - nowMs) / 1000));
    }
    return null;
  }, [config.turnTimerSeconds, isPausedByHost, turn.pausedRemainingTimerMs, turn.turnDeadlineMs, nowMs]);

  const timerPercent =
    remainingSec !== null && config.turnTimerSeconds
      ? Math.min(100, Math.max(0, (remainingSec / config.turnTimerSeconds) * 100))
      : 100;
  const isLowTime = !isPausedByHost && remainingSec !== null && remainingSec <= 10;

  const infraPermission = canSpendOrBuildThisTurn(gameState, playerId, true);
  const devBuyPermission = canBuyDevCard(gameState, playerId);
  const tradePermission = canTradeThisTurn(gameState, playerId);

  const canBuildRoadNow =
    isMyTurn &&
    !isPausedByHost &&
    phase === 'MAIN_PHASE' &&
    infraPermission.allowed &&
    me.roadsLeft > 0 &&
    hasResources(me.resources, BUILDING_COSTS.ROAD) &&
    getValidRoadEdges(gameState, playerId).length > 0;

  const canBuildSettlementNow =
    isMyTurn &&
    !isPausedByHost &&
    phase === 'MAIN_PHASE' &&
    infraPermission.allowed &&
    me.settlementsLeft > 0 &&
    hasResources(me.resources, BUILDING_COSTS.SETTLEMENT) &&
    getValidSettlementVertices(gameState, playerId).length > 0;

  const canBuildCityNow =
    isMyTurn &&
    !isPausedByHost &&
    phase === 'MAIN_PHASE' &&
    infraPermission.allowed &&
    me.citiesLeft > 0 &&
    hasResources(me.resources, BUILDING_COSTS.CITY) &&
    getValidCityVertices(gameState, playerId).length > 0;

  const unplayedDevCount = me.devCards.filter((c) => !c.played).length;
  const isWaitingForMandatoryDice = phase === 'WAITING_FOR_DICE';

  const botLiveNotice =
    turn.botStatusMessage ||
    (activePlayer?.isBot
      ? `${activePlayer.name} está pensando...`
      : null);

  const getPhaseInstruction = (): string => {
    if (isPausedByHost) {
      return 'Juego Pausado por el Anfitrión. El temporizador y todas las acciones están congelados.';
    }
    if (phase === 'PAUSED_DISCONNECT') {
      return 'Partida en pausa esperando la reconexión de un jugador.';
    }
    if (phase === 'ORDER_ROLL') {
      return 'Fase de Orden de Turno: Lanzad los dados de iniciativa o confirmad el orden de salida.';
    }
    if (!isMyTurn) {
      if (botLiveNotice) {
        return botLiveNotice;
      }
      if (phase === 'WAITING_FOR_DICE') {
        return `Esperando a que ${activePlayer?.name || 'el jugador activo'} lance los dados...`;
      }
      return `Turno en curso de ${activePlayer?.name || 'otro jugador'}...`;
    }
    switch (phase) {
      case 'SETUP_SETTLEMENT_1':
        return 'Colocación Inicial (Ronda 1): Selecciona un vértice disponible para colocar tu 1.º Poblado gratis.';
      case 'SETUP_ROAD_1':
        return 'Colocación Inicial (Ronda 1): Selecciona una arista contigua para colocar tu 1.ª Carretera gratis.';
      case 'SETUP_SETTLEMENT_2':
        return 'Colocación Inicial (Ronda 2): Coloca tu 2.º Poblado (recibirás los recursos de los terrenos adyacentes).';
      case 'SETUP_ROAD_2':
        return 'Colocación Inicial (Ronda 2): Coloca tu 2.ª Carretera adyacente.';
      case 'WAITING_FOR_DICE':
        return 'Fase Obligatoria de Dados: Lanza los dados en el centro de la pantalla antes de realizar cualquier acción.';
      case 'ROBBER_DISCARD':
        return 'Esperando a que los jugadores con más de 7 cartas descarten la mitad de su mano...';
      case 'ROBBER_MOVE':
        return 'Selecciona cualquier hexágono terrestre (incluso el actual) para posicionar al Ladrón y robar 1 recurso.';
      case 'ROBBER_STEAL':
        return 'Elige a cuál de los jugadores adyacentes al hexágono deseas robarle 1 carta al azar.';
      case 'ROAD_BUILDING_DEV':
        return `Construcción de Carreteras activa: Coloca ${turn.freeRoadsRemaining} carretera(s) sin coste.`;
      case 'MAIN_PHASE':
        if (buildMode === 'ROAD')
          return 'Selecciona una arista iluminada en el mapa para construir tu Carretera.';
        if (buildMode === 'SETTLEMENT')
          return 'Selecciona un vértice iluminado conectado a tu carretera para construir tu Poblado.';
        if (buildMode === 'CITY')
          return 'Selecciona uno de tus Poblados iluminados para mejorarlo a Ciudad.';
        return 'Fase Principal: Construye, comercia con la Banca/Puertos o con otros colonos, juega Desarrollo o pasa el turno.';
      default:
        return '';
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d0906] text-stone-100 overflow-hidden">
      {/* Overlay Animations for Slow Center Dice, Sequential Resource Flights, Critical Alerts, Discards & Steals */}
      <OverlayAnimations
        gameState={gameState}
        currentPlayerId={playerId}
        lowEndPcMode={lowEndPcMode}
      />

      {/* Disconnect Resolution Banner */}
      <DisconnectResolutionBanner gameState={gameState} dispatchAction={dispatchAction} />

      {/* Top Header Bar */}
      <header className="h-14 px-4 bg-gradient-to-r from-[#1c130d] via-[#140e09] to-[#1c130d] border-b border-[#d4af37]/35 flex items-center justify-between gap-3 shrink-0 z-30 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-extrabold text-amber-400 tracking-wider drop-shadow">
            CATAN
          </span>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-[#0d0906] text-amber-300 border border-[#d4af37]/40">
            Sala {gameState.roomCode}
          </span>
          <span className="hidden md:inline-flex text-xs text-stone-400">
            Meta: <strong className="text-amber-300 ml-1">{config.victoryPointsTarget} PV</strong>
          </span>

          {/* Active Custom House Rules Badges */}
          <div className="hidden 2xl:flex items-center gap-1.5">
            {config.desertInCenter && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-[#d4af37]/40 text-amber-200 font-semibold">
                Desierto Central
              </span>
            )}
            {config.minSettlementDistance === 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-[#d4af37]/40 text-amber-200 font-semibold">
                Distancia: 1 arista
              </span>
            )}
            {config.allowInstantDevCards && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-200 font-semibold">
                Desarrollo Inmediato
              </span>
            )}
            {config.turnActionRestriction === 'LEVEL_2_LIMITED' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-[#d4af37]/40 text-amber-200 font-semibold">
                Nivel 2: 1 Infra + 1 Comercio
              </span>
            )}
            {config.turnActionRestriction === 'LEVEL_3_STRICT' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/50 text-red-200 font-semibold">
                Nivel 3: Construir O Comerciar
              </span>
            )}
          </div>
        </div>

        {/* Center Phase Instruction Banner */}
        <div
          className={`flex-1 max-w-xl px-4 py-1.5 rounded-xl border text-center text-xs font-bold truncate ${
            isPausedByHost
              ? 'bg-amber-950/80 border-amber-400 text-amber-200'
              : isMyTurn
              ? 'bg-amber-500/15 border-[#d4af37]/60 text-amber-100 shadow-inner'
              : 'bg-[#0d0906]/90 border-stone-800 text-stone-300'
          }`}
        >
          {getPhaseInstruction()}
        </div>

        {/* Right: Turn Timer, Host-Only Pause Button, Settings Button & Abandon Button */}
        <div className="flex items-center gap-2">
          {remainingSec !== null && (
            <div className="flex items-center gap-2 bg-[#0d0906] px-3 py-1 rounded-xl border border-[#d4af37]/30">
              <Clock
                className={`w-4 h-4 ${
                  isPausedByHost
                    ? 'text-amber-300'
                    : isLowTime
                    ? 'text-red-400 animate-bounce'
                    : 'text-amber-400'
                }`}
              />
              <div className="w-20 sm:w-24">
                <div className="flex justify-between text-[10px] font-bold mb-0.5">
                  <span className={isLowTime ? 'text-red-400' : 'text-stone-400'}>
                    {isPausedByHost ? 'PAUSADO' : 'Tiempo'}
                  </span>
                  <span className={isLowTime ? 'text-red-400 font-black' : 'text-amber-200'}>
                    {remainingSec}s
                  </span>
                </div>
                <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isPausedByHost
                        ? 'bg-amber-500/60'
                        : isLowTime
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {me.isHost && (
            <button
              type="button"
              onClick={() => dispatchAction({ type: 'TOGGLE_HOST_PAUSE' })}
              className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow ${
                isPausedByHost
                  ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-stone-950'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 border-[#d4af37]/60 text-amber-200'
              }`}
              title="Pausar o reanudar la partida para todos los jugadores (Exclusivo del Anfitrión)"
            >
              {isPausedByHost ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Reanudar</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausa</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              lowEndPcMode
                ? 'bg-sky-950/90 border-sky-400/60 text-sky-200'
                : 'bg-[#211710] hover:bg-[#2c1f16] border-[#d4af37]/35 text-amber-200'
            }`}
            title="Ajustes de Rendimiento y Animaciones"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Ajustes</span>
          </button>

          {isPausedByHost && (
            <span className="text-white text-xs font-semibold tracking-wider px-2.5 py-1 rounded-xl bg-stone-900/90 border border-stone-600/70 shadow-sm animate-pulse">
              JUEGO PAUSADO
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowAbandonModal(true)}
            className="px-3 py-1.5 rounded-xl bg-red-950/75 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abandonar</span>
          </button>
        </div>
      </header>

      {/* Main Middle Area: Left Player Boxes Dock + Central Board + Optimized Right Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* RESTORED LEFT PANEL: Player Boxes Dock */}
        <aside className="w-48 xl:w-56 bg-gradient-to-b from-[#19120c]/98 to-[#0d0906]/98 backdrop-blur-xl border-r-2 border-[#d4af37]/35 flex flex-col shrink-0 z-20 overflow-y-auto p-2.5 space-y-2.5 shadow-[10px_0_25px_rgba(0,0,0,0.65)] select-none">
          <div className="flex items-center justify-between px-1 text-[11px] font-black uppercase tracking-wider text-amber-300">
            <span>Jugadores ({gameState.players.length})</span>
            <span className="text-[10px] text-amber-400/80 font-mono">Meta {config.victoryPointsTarget} PV</span>
          </div>

          <div className="space-y-2">
            {gameState.players.map((p) => {
              const colorCfg = PLAYER_COLORS[p.color];
              const isTurn = turn.activePlayerId === p.id;
              const totalRes = countTotalResources(p.resources);
              const unplayedDevs =
                p.id === playerId
                  ? p.devCards.filter((c) => !c.played).length
                  : p.devCards.filter((c) => !c.played && c.type !== 'VICTORY_POINT').length +
                    p.devCards.filter((c) => c.type === 'VICTORY_POINT').length;

              return (
                <div
                  key={p.id}
                  id={`left-box-${p.id}`}
                  className={`relative p-2.5 rounded-2xl border-2 transition-all duration-300 ${
                    isTurn
                      ? 'bg-gradient-to-br from-[#2f1f13] to-[#1a1008] shadow-[0_0_18px_rgba(251,191,36,0.35)] scale-[1.02]'
                      : 'bg-[#120d09]/95 hover:bg-[#18110b]'
                  }`}
                  style={{
                    borderColor: isTurn ? '#fbbf24' : colorCfg.primary,
                    boxShadow: isTurn
                      ? `0 0 16px ${colorCfg.primary}55`
                      : `0 4px 10px rgba(0,0,0,0.5)`,
                  }}
                >
                  {/* Top: Avatar, Name & Turn Badge */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2 shrink-0 shadow-md relative text-stone-950"
                      style={{
                        backgroundColor: colorCfg.primary,
                        borderColor: colorCfg.stroke,
                      }}
                    >
                      <span>{p.avatar}</span>
                      {isTurn && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-stone-950 animate-ping" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-amber-100 truncate">
                          {p.name}
                        </span>
                        {p.id === playerId && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-stone-950 font-black shrink-0">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        {p.isBot ? (
                          <span className="text-indigo-300 font-semibold text-[9px] inline-flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> IA ({p.botDifficulty === 'EASY' ? 'Fácil' : p.botDifficulty === 'HARD' ? 'Difícil' : 'Normal'})
                          </span>
                        ) : isTurn ? (
                          <span className="text-emerald-300 font-extrabold text-[9px] animate-pulse">
                            ● En Turno
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400">● En línea</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Minimalist Stats Counters */}
                  <div className="mt-2 pt-1.5 border-t border-stone-800/80 grid grid-cols-3 gap-1 text-center">
                    <div
                      className="bg-[#090604] py-1 px-0.5 rounded-lg border border-stone-800"
                      title={
                        p.id === playerId
                          ? `Tus Puntos de Victoria Totales: ${p.totalVictoryPoints} (${p.publicVictoryPoints} públicos${
                              p.totalVictoryPoints > p.publicVictoryPoints
                                ? ` + ${p.totalVictoryPoints - p.publicVictoryPoints} de Cartas de Desarrollo`
                                : ''
                            })`
                          : `Puntos de Victoria Públicos: ${p.publicVictoryPoints}`
                      }
                    >
                      <div className="text-[9px] text-amber-400 font-bold">PV</div>
                      <div className="text-xs font-black text-amber-200">
                        {p.id === playerId ? p.totalVictoryPoints : p.publicVictoryPoints}
                        {p.id === playerId && p.totalVictoryPoints > p.publicVictoryPoints && (
                          <span className="text-[8px] text-emerald-300 ml-0.5" title="Incluye Cartas de Desarrollo">
                            ★
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-[#090604] py-1 px-0.5 rounded-lg border border-stone-800" title="Cartas de Recurso en Mano">
                      <div className="text-[9px] text-stone-400">Mano</div>
                      <div className="text-xs font-black text-white">{totalRes}</div>
                    </div>
                    <div className="bg-[#090604] py-1 px-0.5 rounded-lg border border-stone-800" title="Cartas de Desarrollo">
                      <div className="text-[9px] text-purple-300">Des.</div>
                      <div className="text-xs font-black text-purple-200">{unplayedDevs}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Central Board Area */}
        <div className="flex-1 h-full relative">
          <Board
            board={board}
            players={gameState.players}
            validSettlementIds={validSettlementIds}
            validCityIds={validCityIds}
            validRoadIds={validRoadIds}
            isMovingRobber={isMovingRobber}
            producingHexIds={boardProducingHexIds}
            lowEndPcMode={lowEndPcMode}
            lastEvent={gameState.lastEvent}
            onVertexClick={(vertexId) => {
              if (isPausedByHost) return;
              if (validCityIds.includes(vertexId)) {
                dispatchAction({ type: 'UPGRADE_CITY', vertexId });
                setBuildMode(null);
              } else if (validSettlementIds.includes(vertexId)) {
                dispatchAction({ type: 'PLACE_SETTLEMENT', vertexId });
                setBuildMode(null);
              }
            }}
            onEdgeClick={(edgeId) => {
              if (isPausedByHost) return;
              if (validRoadIds.includes(edgeId)) {
                dispatchAction({ type: 'PLACE_ROAD', edgeId });
                setBuildMode(null);
              }
            }}
            onHexClick={(hexId) => {
              if (isPausedByHost) return;
              if (isMovingRobber) {
                dispatchAction({ type: 'MOVE_ROBBER', hexId });
              }
            }}
          />

          {/* Bot Activity / Thinking Status Floating Pill */}
          <AnimatePresence>
            {botLiveNotice && !isPausedByHost && (
              <motion.div
                key={botLiveNotice}
                initial={{ opacity: 0, y: -14, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#19120c]/95 border border-amber-400/50 text-amber-100 text-xs font-extrabold shadow-[0_12px_30px_rgba(0,0,0,0.85)]"
              >
                <Bot className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                <span>{botLiveNotice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CENTRAL MANDATORY DICE ROLL PROMPT (WAITING_FOR_DICE) */}
          <AnimatePresence>
            {phase === 'WAITING_FOR_DICE' && isMyTurn && !isPausedByHost && (
              <motion.div
                key="central-dice-roll-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-[3px] p-4"
              >
                <motion.div
                  initial={{ scale: 0.82, y: 24, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 12, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#261b12]/95 via-[#18100a]/95 to-[#0f0a06]/98 border-2 border-[#d4af37] p-7 text-center shadow-[0_25px_90px_rgba(0,0,0,0.95)] space-y-5"
                >
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-2 border-amber-500 shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex items-center justify-center text-stone-950">
                      <Dices className="w-9 h-9 stroke-[2.2]" />
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-2 border-amber-500 shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex items-center justify-center text-stone-950">
                      <Dices className="w-9 h-9 stroke-[2.2]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Turno #{turn.turnNumber} • Fase Obligatoria
                    </span>
                    <h2 className="font-display text-2xl font-black text-amber-100">
                      Es tu Turno, {me.name}
                    </h2>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Lanza los dados primero para producir recursos en la isla antes de
                      construir, comerciar o jugar cartas de desarrollo.
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => dispatchAction({ type: 'ROLL_DICE' })}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 border-2 border-amber-200 text-stone-950 font-display font-black text-lg tracking-wider uppercase flex items-center justify-center gap-3 shadow-[0_10px_35px_rgba(245,158,11,0.55)] cursor-pointer"
                  >
                    <Dices className="w-6 h-6 stroke-[2.5]" />
                    <span>Lanzar Dados</span>
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Floating Trade Offers Banner on Top-Left of Board */}
          <ActiveTradeFloatingBanner
            gameState={gameState}
            me={me}
            dispatchAction={dispatchAction}
            onOpenCounterOffer={() => {
              setTradeModalInitialTab('PLAYERS');
              setShowTradeModal(true);
            }}
          />

          {/* Top-Right Tabletop HUD: Floating Dice Roll Result + Physical Dev Card Deck */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2.5 pointer-events-none">
            {turn.diceRoll && (
              <div className="flex items-center gap-2 bg-[#16110d]/95 backdrop-blur-xl border border-[#d4af37]/45 px-3.5 py-2 rounded-2xl shadow-2xl pointer-events-auto">
                <Dices className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-stone-300">Dados:</span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-black text-sm">
                  {turn.diceRoll[0]} + {turn.diceRoll[1]} = {turn.diceRoll[0] + turn.diceRoll[1]}
                </span>
              </div>
            )}

            {/* Physical Development Card Deck on the Tabletop */}
            <div
              id="tabletop-devcard-deck"
              className="pointer-events-auto relative group flex flex-col items-center select-none cursor-pointer"
              title={`Mazo de Desarrollo: ${gameState.devDeck?.length ?? 0} cartas restantes`}
              onClick={() => {
                if (devBuyPermission.allowed && !isPausedByHost) {
                  dispatchAction({ type: 'BUY_DEV_CARD' });
                }
              }}
            >
              {/* Stack depth illusion layers */}
              {(gameState.devDeck?.length ?? 0) > 2 && (
                <div className="absolute top-1.5 -left-1.5 w-16 h-24 rounded-xl bg-amber-950/70 border border-amber-600/30 -rotate-3 -z-10 shadow-md" />
              )}
              {(gameState.devDeck?.length ?? 0) > 1 && (
                <div className="absolute top-0.5 -left-0.5 w-16 h-24 rounded-xl bg-amber-900/80 border border-amber-600/40 -rotate-1 -z-10 shadow-md" />
              )}

              {/* Top card of the deck with original reverse illustration */}
              <div className="relative w-16 h-24 rounded-xl overflow-hidden border-2 border-[#d4af37]/75 bg-[#16110d] shadow-[0_8px_25px_rgba(0,0,0,0.85)] group-hover:border-amber-300 group-hover:scale-105 transition-all">
                <img
                  src="/assets/cards/devcard_back.png"
                  alt="Mazo de Desarrollo"
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                />
                {/* Subtle sheen highlight */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-amber-200/20 pointer-events-none" />

                {/* Count badge */}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-md border border-[#d4af37]/60 text-[10px] font-black text-amber-300 tracking-tighter">
                  {gameState.devDeck?.length ?? 0}
                </div>
              </div>

              <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 border border-amber-500/30 text-[9px] font-bold text-amber-200/90 shadow-sm">
                <span>Mazo</span>
                <span className="text-amber-400">({gameState.devDeck?.length ?? 0})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Compact Player Casilleros + Coupled (Bank Resources + Island Chronicles) */}
        <aside className="w-[276px] xl:w-[312px] bg-gradient-to-b from-[#19120c]/98 to-[#0d0906]/98 backdrop-blur-xl border-l-2 border-[#d4af37]/35 flex flex-col shrink-0 z-20 overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.8)]">
          {/* 1. Compact Player & Opponent List (fits 4-6 players comfortably) */}
          <div className="flex-1 min-h-0 p-2 space-y-1.5 overflow-y-auto">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-300 px-1 pb-0.5">
              <span>Colonos ({gameState.players.length})</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 text-[9px]">
                Meta {config.victoryPointsTarget} PV
              </span>
            </div>

            {gameState.players.map((p) => (
              <PlayerSummaryCard
                key={p.id}
                player={p}
                isLocalPlayer={p.id === playerId}
                isActiveTurn={turn.activePlayerId === p.id}
                hasLongestRoad={gameState.longestRoadPlayerId === p.id}
                hasLargestArmy={gameState.largestArmyPlayerId === p.id}
              />
            ))}
          </div>

          {/* 2 & 3. Coupled Bottom Stack: Bank Resources IMMEDIATELY above Island Chronicles */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="mt-auto shrink-0 flex flex-col bg-[#140e09]/98 border-t-2 border-[#d4af37]/35 shadow-[0_-10px_25px_rgba(0,0,0,0.75)]"
          >
            {/* Recursos de la Banca (Immediately above Crónicas de la Isla) */}
            <motion.div layout="position" className="p-2 border-b border-[#d4af37]/25">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-200 mb-1.5 px-0.5">
                <span>Recursos de la Banca</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-500/30 text-purple-200 text-[9px]">
                  Desarrollo: {gameState.devDeck.length}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {ALL_RESOURCES.map((r) => (
                  <div
                    key={r}
                    className="flex flex-col items-center justify-center py-1 px-0.5 rounded-lg bg-[#090604] border border-stone-800"
                    title={`Banca - ${RESOURCE_META[r].name}: ${gameState.bank[r]}`}
                  >
                    <div className="flex items-center gap-0.5">
                      <ResourceIcon resource={r} size={14} />
                      <span className="font-mono text-[11px] font-black text-amber-100">
                        {gameState.bank[r]}
                      </span>
                    </div>
                    <span className="text-[8px] font-semibold text-stone-400 mt-0.5 truncate max-w-full">
                      {RESOURCE_META[r].name}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Menú de las Crónicas de la Isla */}
            <motion.div layout="position" className="p-2 bg-[#120d09]">
              <button
                type="button"
                onClick={() => setShowChronicle((prev) => !prev)}
                className="w-full py-2 px-3 rounded-xl bg-[#1d140e] hover:bg-[#281c13] border border-[#d4af37]/40 text-amber-200 text-xs font-black flex items-center justify-between transition cursor-pointer shadow"
              >
                <span className="flex items-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Crónicas de la Isla</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400">
                  <span>{showChronicle ? 'Cerrar' : `Ver (${gameState.logs.length})`}</span>
                  {showChronicle ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>
            </motion.div>

            {/* Desplegable de Crónicas (empuja suavemente ambos bloques hacia arriba al abrirse) */}
            <AnimatePresence initial={false}>
              {showChronicle && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 190, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden bg-[#0c0806] border-t border-[#d4af37]/30 flex flex-col px-2.5 py-2"
                >
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {gameState.logs.map((entry) => (
                      <div
                        key={entry.id}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[#140e0a] border border-stone-800 text-stone-300 leading-snug"
                      >
                        {entry.message}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </aside>
      </div>

      {/* Bottom Tabletop HUD */}
      <footer className="bg-gradient-to-r from-[#1c130d] via-[#140e09] to-[#1c130d] border-t border-[#d4af37]/35 px-4 py-2 flex flex-wrap items-center justify-between gap-4 shrink-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.85)]">
        {/* LEFT: Smart Construction Menu Drawer & Cancel Placement Button */}
        <div className="flex items-center gap-2.5">
          <BuildDrawerMenu
            isOpen={isBuildDrawerOpen}
            onToggleOpen={() => setIsBuildDrawerOpen((o) => !o)}
            buildMode={buildMode}
            onSelectBuildMode={(mode) => setBuildMode(mode)}
            onBuyDevCard={() => {
              dispatchAction({ type: 'BUY_DEV_CARD' });
            }}
            me={me}
            canBuildRoadNow={canBuildRoadNow}
            canBuildSettlementNow={canBuildSettlementNow}
            canBuildCityNow={canBuildCityNow}
            canBuyDevCardNow={devBuyPermission.allowed && !isPausedByHost}
            restrictionReason={!infraPermission.allowed ? infraPermission.reason : undefined}
            devDeckRemaining={gameState.devDeck.length}
            disabledBeforeDice={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
          />
        </div>

        {/* CENTER: Player's Resource Cards in a Pixel-Perfect Fan Layout */}
        <div className="flex-1 flex items-center justify-center min-w-[260px]">
          <ResourceHandFan
            resources={me.resources}
            portRatios={myPortRatios}
            onCardClick={() => {
              if (!isWaitingForMandatoryDice && !isPausedByHost) {
                setTradeModalInitialTab('BANK');
                setShowTradeModal(true);
              }
            }}
          />
        </div>

        {/* RIGHT: Comerciar, Cartas de Desarrollo, Pasar Turno */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            disabled={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
            onClick={() => {
              setTradeModalInitialTab('BANK');
              setShowTradeModal(true);
            }}
            className={`relative px-4 py-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition ${
              isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)
                ? 'bg-stone-900/70 border border-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-600 hover:from-orange-400 hover:to-yellow-500 text-stone-950 shadow-lg cursor-pointer'
            }`}
            title={
              !tradePermission.allowed
                ? tradePermission.reason
                : 'Comerciar con la Banca (4:1 o Puertos 3:1 / 2:1) o con otros jugadores'
            }
          >
            {isMyTurn && !tradePermission.allowed && !isWaitingForMandatoryDice && (
              <Lock className="w-3.5 h-3.5 text-red-950" />
            )}
            {hasAnyPort ? <Anchor className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
            <span>Banca y Comercio</span>
            {gameState.activeTradeOffers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black animate-bounce">
                {gameState.activeTradeOffers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
            onClick={() => setShowDevModal(true)}
            className={`px-4 py-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)
                ? 'bg-stone-900/70 border-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-[#261a11] hover:bg-[#332317] border-[#d4af37]/50 text-amber-200 cursor-pointer shadow'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Cartas de Desarrollo ({unplayedDevCount})</span>
          </button>

          {isMyTurn && phase === 'MAIN_PHASE' && !isPausedByHost && (
            <button
              type="button"
              onClick={() => dispatchAction({ type: 'END_TURN' })}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-stone-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
              <span>Pasar Turno</span>
            </button>
          )}
        </div>
      </footer>

      {/* SETTINGS MODAL (Low-End PC Mode Toggle) */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            key="modal-settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#231810] to-[#120c08] border-2 border-[#d4af37]/70 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3">
                <div className="flex items-center gap-2.5">
                  <Settings className="w-5 h-5 text-amber-400" />
                  <h3 className="font-display text-lg font-black text-amber-100">
                    Ajustes de la Aplicación
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="text-xs font-bold text-stone-400 hover:text-amber-200 px-2 py-1 rounded-lg bg-stone-900"
                >
                  Cerrar
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#0d0906] border border-[#d4af37]/35 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-sm font-black text-amber-100">
                        Modo de Animaciones Simplificadas
                      </div>
                      <div className="text-[11px] text-stone-400">
                        Ideal para ordenadores de bajo rendimiento (Low-End PC Mode)
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={lowEndPcMode}
                    onClick={() => setLowEndPcMode(!lowEndPcMode)}
                    className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${
                      lowEndPcMode ? 'bg-emerald-500' : 'bg-stone-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        lowEndPcMode ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <ul className="text-xs text-stone-300 space-y-1.5 pl-4 list-disc border-t border-stone-800 pt-2.5">
                  <li>
                    Desactiva filtros pesados y efectos de iluminación complejos.
                  </li>
                  <li>
                    <strong>Bloqueo del Pan (Arrastre del Mapa):</strong> El tablero permanece fijo y centrado en <code>(0, 0)</code>; solo podrás acercar o alejar la vista mediante los botones de <em>Zoom In</em> y <em>Zoom Out</em>.
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Guardar y Volver
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Other Game Modals */}
      <AnimatePresence>
        {phase === 'ORDER_ROLL' && !isPausedByHost && (
          <TurnOrderModal
            key="modal-order-roll"
            gameState={gameState}
            me={me}
            dispatchAction={dispatchAction}
          />
        )}

        {phase === 'ROBBER_DISCARD' && me.mustDiscardCount > 0 && !isPausedByHost && (
          <RobberDiscardModal
            key="modal-discard"
            me={me}
            onDiscard={(resources) => dispatchAction({ type: 'DISCARD_RESOURCES', resources })}
          />
        )}

        {phase === 'ROBBER_STEAL' && isMyTurn && !isPausedByHost && (
          <RobberStealModal
            key="modal-steal"
            candidates={gameState.players.filter((p) =>
              gameState.robberStealCandidates.includes(p.id)
            )}
            onSelectVictim={(victimPlayerId) =>
              dispatchAction({ type: 'STEAL_RESOURCE', victimPlayerId })
            }
          />
        )}

        {showTradeModal && !isPausedByHost && (
          <TradeModal
            key="modal-trade"
            gameState={gameState}
            me={me}
            initialTab={tradeModalInitialTab}
            onClose={() => setShowTradeModal(false)}
            dispatchAction={dispatchAction}
          />
        )}

        {showDevModal && !isPausedByHost && (
          <DevCardModal
            key="modal-dev"
            gameState={gameState}
            me={me}
            onClose={() => setShowDevModal(false)}
            dispatchAction={dispatchAction}
          />
        )}

        {showAbandonModal && (
          <AbandonConfirmModal
            key="modal-abandon"
            onCancel={() => setShowAbandonModal(false)}
            onConfirm={() => {
              setShowAbandonModal(false);
              leaveRoomClient();
            }}
          />
        )}

        {phase === 'GAME_OVER' && (
          <VictoryModal
            key="modal-victory"
            gameState={gameState}
            onExitToMenu={leaveRoomClient}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface PlayerSummaryCardProps {
  player: PlayerState;
  isLocalPlayer: boolean;
  isActiveTurn: boolean;
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
}

/**
 * Compact, high-density Player Casillero (`#player-casillero-${player.id}`) for the Right Sidebar.
 * Optimized to fit up to 6 players comfortably while serving as the exact target for sequential resource flights.
 */
const PlayerSummaryCard: React.FC<PlayerSummaryCardProps> = ({
  player,
  isLocalPlayer,
  isActiveTurn,
  hasLongestRoad,
  hasLargestArmy,
}) => {
  const colorCfg = PLAYER_COLORS[player.color];
  const totalRes = countTotalResources(player.resources);
  const unplayedDevs = isLocalPlayer
    ? player.devCards.filter((c) => !c.played).length
    : player.devCards.filter((c) => !c.played && c.type !== 'VICTORY_POINT').length +
      player.devCards.filter((c) => c.type === 'VICTORY_POINT').length;

  return (
    <div
      id={`player-casillero-${player.id}`}
      className={`p-2 rounded-xl border transition-all duration-200 ${
        isActiveTurn
          ? 'bg-gradient-to-b from-[#2a1c11] to-[#18100a] border-[#fbbf24] shadow-[0_4px_14px_rgba(251,191,36,0.22)]'
          : 'bg-[#120d09] border-stone-800/90'
      }`}
    >
      {/* Top Row: Player Emblem, Name, Status & Victory Points Badge */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-display font-black border shrink-0 shadow-sm text-stone-950"
            style={{
              backgroundColor: colorCfg.primary,
              borderColor: colorCfg.stroke,
            }}
          >
            {player.avatar}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-white truncate max-w-[115px]">
                {player.name}
              </span>
              {isLocalPlayer && (
                <span className="text-[8px] px-1 py-0.2 rounded bg-amber-400 text-stone-950 font-black uppercase">
                  Tú
                </span>
              )}
              {isActiveTurn && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </div>
            <div className="text-[9px] font-semibold text-stone-400 truncate">
              {player.isBot
                ? `IA (${player.botDifficulty === 'EASY' ? 'Fácil' : player.botDifficulty === 'HARD' ? 'Difícil' : 'Normal'})`
                : player.status === 'FROZEN_SKIP'
                ? 'Turno omitido'
                : !player.connected
                ? 'Desconectado'
                : isActiveTurn
                ? 'En turno'
                : 'En línea'}
            </div>
          </div>
        </div>

        {/* High-Contrast Victory Points Pill */}
        <div className="flex items-center gap-1 shrink-0 bg-[#090604] px-2 py-0.5 rounded-lg border border-[#d4af37]/50 shadow-inner">
          <span className="font-display text-xs font-black text-amber-300 leading-none">
            {player.publicVictoryPoints} PV
          </span>
          {isLocalPlayer && player.totalVictoryPoints > player.publicVictoryPoints && (
            <span className="text-[9px] font-extrabold text-emerald-300">
              ({player.totalVictoryPoints})
            </span>
          )}
        </div>
      </div>

      {/* Compact Stat Strip (Mano, Desarrollo, Ruta, Ejército) */}
      <div className="mt-1.5 pt-1 border-t border-stone-800/80 grid grid-cols-4 gap-1 text-center">
        <div
          className="bg-[#090604] border border-stone-800/80 rounded-md py-0.5 px-1 flex items-center justify-between"
          title="Cartas de Recurso en Mano"
        >
          <span className="text-[8px] font-bold uppercase text-stone-400">Mano</span>
          <span className="text-[11px] font-black text-white">{totalRes}</span>
        </div>

        <div
          className="bg-[#090604] border border-stone-800/80 rounded-md py-0.5 px-1 flex items-center justify-between"
          title="Cartas de Desarrollo sin jugar"
        >
          <Layers className="w-2.5 h-2.5 text-purple-300 shrink-0" />
          <span className="text-[11px] font-black text-purple-300">{unplayedDevs}</span>
        </div>

        <div
          className={`rounded-md py-0.5 px-1 border flex items-center justify-between ${
            hasLongestRoad
              ? 'bg-amber-950/60 border-amber-400'
              : 'bg-[#090604] border-stone-800/80'
          }`}
          title="Longitud de Carretera"
        >
          <Route className="w-2.5 h-2.5 text-amber-300 shrink-0" />
          <span className="text-[11px] font-black text-amber-300">
            {player.longestRoadLength}
          </span>
        </div>

        <div
          className={`rounded-md py-0.5 px-1 border flex items-center justify-between ${
            hasLargestArmy
              ? 'bg-red-950/60 border-red-400'
              : 'bg-[#090604] border-stone-800/80'
          }`}
          title="Caballeros jugados"
        >
          <Swords className="w-2.5 h-2.5 text-red-300 shrink-0" />
          <span className="text-[11px] font-black text-red-300">
            {player.knightsPlayed}
          </span>
        </div>
      </div>

      {/* Resource Breakdown for Local Player */}
      {isLocalPlayer && (
        <div className="mt-1 pt-1 border-t border-stone-800/70 grid grid-cols-5 gap-1">
          {ALL_RESOURCES.map((res) => (
            <div
              key={res}
              className="flex items-center justify-center gap-0.5 py-0.5 px-0.5 rounded bg-[#090604] border border-stone-800"
              title={`${RESOURCE_META[res].name}: ${player.resources[res]}`}
            >
              <ResourceIcon resource={res} size={11} />
              <span className="font-mono text-[10px] font-black text-white">
                {player.resources[res]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Special Achievement Badges */}
      {(hasLongestRoad || hasLargestArmy) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {hasLongestRoad && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/60 text-amber-200 text-[8px] font-black">
              <Award className="w-2.5 h-2.5 text-amber-300" /> Gran Ruta (+2 PV)
            </span>
          )}
          {hasLargestArmy && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-red-500/20 border border-red-400/60 text-red-200 text-[8px] font-black">
              <Swords className="w-2.5 h-2.5 text-red-300" /> Gran Ejército (+2 PV)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
