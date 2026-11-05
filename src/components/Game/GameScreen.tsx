import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Anchor,
  Award,
  Clock,
  Cpu,
  Dices,
  Flame,
  Lock,
  LogOut,
  Pause,
  Play,
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
    if (isPausedByHost && turn.pausedRemainingTimerMs !== null && turn.pausedRemainingTimerMs !== undefined) {
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

  const getPhaseInstruction = (): string => {
    if (isPausedByHost) {
      return '⏸️ Juego Pausado por el Host. El temporizador y todas las acciones están congelados.';
    }
    if (phase === 'PAUSED_DISCONNECT') {
      return '⏸️ Partida en pausa esperando reconexión de un jugador.';
    }
    if (phase === 'ORDER_ROLL') {
      return '🎲 Fase de Orden de Turno: Lanzad los dados de iniciativa o confirmad el orden de salida.';
    }
    if (!isMyTurn) {
      if (phase === 'WAITING_FOR_DICE') {
        return `🎲 Esperando a que ${activePlayer?.name || 'el jugador activo'} tire los dados...`;
      }
      return `Turno de ${activePlayer?.name || 'otro jugador'}...`;
    }
    switch (phase) {
      case 'SETUP_SETTLEMENT_1':
        return '🏠 Fase Inicial (Ronda 1): Haz clic en un vértice iluminado para colocar tu 1º Poblado gratis.';
      case 'SETUP_ROAD_1':
        return '🛣️ Fase Inicial (Ronda 1): Haz clic en una arista iluminada para colocar tu 1ª Carretera gratis.';
      case 'SETUP_SETTLEMENT_2':
        return '🏠 Fase Inicial (Ronda 2 - Inversa): Coloca tu 2º Poblado (recibirás los recursos adyacentes).';
      case 'SETUP_ROAD_2':
        return '🛣️ Fase Inicial (Ronda 2 - Inversa): Coloca tu 2ª Carretera adyacente.';
      case 'WAITING_FOR_DICE':
        return '🎲 ¡Fase Obligatoria de Dados! Debes tirar los dados en el centro de la pantalla antes de realizar cualquier acción.';
      case 'ROBBER_DISCARD':
        return '🗑️ Esperando a que los jugadores con >7 cartas descarten la mitad de su mano...';
      case 'ROBBER_MOVE':
        return '🦹 ¡Haz clic en cualquier hexágono terrestre para mover el Ladrón y bloquear su producción!';
      case 'ROBBER_STEAL':
        return '🦹 Elige a cuál de los jugadores adyacentes deseas robarle 1 carta al azar.';
      case 'ROAD_BUILDING_DEV':
        return `🛣️ Carta Construcción de Carreteras activa: Coloca ${turn.freeRoadsRemaining} carretera(s) gratis.`;
      case 'MAIN_PHASE':
        if (buildMode === 'ROAD')
          return '🛣️ Selecciona una arista iluminada en el mapa para colocar tu Carretera (o pulsa Cancelar Construcción).';
        if (buildMode === 'SETTLEMENT')
          return '🏠 Selecciona un vértice iluminado conectado a tu carretera para colocar tu Poblado.';
        if (buildMode === 'CITY')
          return '🏰 Selecciona uno de tus Poblados iluminados para mejorarlo a Ciudad.';
        return '⚡ Fase Principal: Abre Construir, Quema cartas en Banca/Puertos (4:1, 3:1, 2:1), usa Cartas de Desarrollo o pasa el turno.';
      default:
        return '';
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d0906] text-stone-100 overflow-hidden">
      {/* Overlay Animations for Giant Dice, Slow Resource Flights, Robber Victim Alert, Discards & Steals */}
      <OverlayAnimations
        gameState={gameState}
        currentPlayerId={playerId}
        lowEndPcMode={lowEndPcMode}
      />

      {/* Disconnect Resolution Banner */}
      <DisconnectResolutionBanner gameState={gameState} dispatchAction={dispatchAction} />

      {/* Top Header Bar (Dark Walnut & Brushed Gold Tabletop Header) */}
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
            {config.minSettlementDistance === 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-[#d4af37]/40 text-amber-200 font-semibold">
                Casas: 1 arista
              </span>
            )}
            {config.allowInstantDevCards && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-200 font-semibold">
                Desarrollo Inmediato
              </span>
            )}
            {config.turnActionRestriction === 'LEVEL_2_LIMITED' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-[#d4af37]/40 text-amber-200 font-semibold">
                Nivel 2: 1 Infra + 1 Quema/Comercio
              </span>
            )}
            {config.turnActionRestriction === 'LEVEL_3_STRICT' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/50 text-red-200 font-semibold">
                Nivel 3: Construir O Quemar/Comerciar
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

        {/* Right: Turn Timer, Host-Only Pause Button, Settings Button & Permanent Abandon Button */}
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

          {/* HOST-EXCLUSIVE PAUSE / RESUME BUTTON */}
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

          {/* SETTINGS BUTTON (Low-End PC Mode Toggle) */}
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

      {/* Main Middle Area: Left Player Boxes + Central Board + Compact Right Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* NEW LEFT PANEL: Player Boxes Dock (Fuerte color de facción, avatar, nombre, estado) */}
        <aside className="w-48 xl:w-56 bg-gradient-to-b from-[#19120c]/98 to-[#0d0906]/98 backdrop-blur-xl border-r-2 border-[#d4af37]/35 flex flex-col shrink-0 z-20 overflow-y-auto p-2.5 space-y-2.5 shadow-[10px_0_25px_rgba(0,0,0,0.65)] select-none">
          <div className="flex items-center justify-between px-1 text-[11px] font-black uppercase tracking-wider text-amber-300">
            <span>Jugadores ({gameState.players.length})</span>
            <span className="text-[10px] text-amber-400/80 font-mono">{config.victoryPointsTarget} PV</span>
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
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2 shrink-0 shadow-md relative"
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
                          <span className="text-indigo-300 font-semibold text-[9px]">
                            🤖 {p.botDifficulty === 'EASY' ? 'Fácil' : p.botDifficulty === 'HARD' ? 'Difícil' : 'Normal'}
                          </span>
                        ) : isTurn ? (
                          <span className="text-emerald-300 font-extrabold text-[9px] animate-pulse">
                            ● En Turno
                          </span>
                        ) : (
                          <span className="text-[9px]">🟢 En línea</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Minimalist Stats Counters */}
                  <div className="mt-2 pt-1.5 border-t border-stone-800/80 grid grid-cols-3 gap-1 text-center">
                    <div className="bg-[#090604] py-1 px-0.5 rounded-lg border border-stone-800" title="Puntos de Victoria">
                      <div className="text-[9px] text-amber-400 font-bold">PV</div>
                      <div className="text-xs font-black text-amber-200">{p.publicVictoryPoints}</div>
                    </div>
                    <div className="bg-[#090604] py-1 px-0.5 rounded-lg border border-stone-800" title="Cartas de Recurso en Mano">
                      <div className="text-[9px] text-stone-400">Mano</div>
                      <div className="text-xs font-black text-white">🎴{totalRes}</div>
                    </div>
                    <div className="bg-[#090604] py-1 px-0.5 rounded-lg border border-stone-800" title="Cartas de Desarrollo">
                      <div className="text-[9px] text-purple-300">Des.</div>
                      <div className="text-xs font-black text-purple-200">🃏{unplayedDevs}</div>
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
            producingHexIds={gameState.lastEvent?.producingHexIds || []}
            lowEndPcMode={lowEndPcMode}
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
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-2 border-amber-500 shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex items-center justify-center text-stone-950 font-black text-3xl">
                      🎲
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-2 border-amber-500 shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex items-center justify-center text-stone-950 font-black text-3xl">
                      🎲
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Turno #{turn.turnNumber} • Fase Obligatoria
                    </span>
                    <h2 className="font-display text-2xl font-black text-amber-100">
                      ¡Es tu Turno, {me.name}!
                    </h2>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Debes lanzar los dados primero para producir recursos en la isla antes de
                      construir, quemar cartas o comerciar.
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => dispatchAction({ type: 'ROLL_DICE' })}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 border-2 border-amber-200 text-stone-950 font-display font-black text-lg tracking-wider uppercase flex items-center justify-center gap-3 shadow-[0_10px_35px_rgba(245,158,11,0.55)] cursor-pointer"
                  >
                    <Dices className="w-6 h-6 stroke-[2.5]" />
                    <span>¡TIRAR DADOS!</span>
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

          {/* Floating Dice Roll Result Badge on Top-Right of Board */}
          {turn.diceRoll && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-[#16110d]/95 backdrop-blur-xl border border-[#d4af37]/45 px-3.5 py-2 rounded-2xl shadow-2xl">
              <Dices className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-stone-300">Dados:</span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-black text-sm">
                {turn.diceRoll[0]} + {turn.diceRoll[1]} = {turn.diceRoll[0] + turn.diceRoll[1]}
              </span>
            </div>
          )}
        </div>

        {/* Right Sidebar: Compact Player Summary Cards + Bank + Collapsible Chronicle */}
        <aside className="w-[280px] xl:w-[325px] bg-gradient-to-b from-[#19120c]/98 to-[#0d0906]/98 backdrop-blur-xl border-l-2 border-[#d4af37]/35 flex flex-col shrink-0 z-20 overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.8)]">
          {/* 1. Compact Player Summary Cards */}
          <div className="p-2.5 space-y-2 border-b-2 border-[#d4af37]/30 overflow-y-auto max-h-[58%]">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-amber-300 px-0.5">
              <span>Detalles Colonos</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 text-[10px]">
                {config.victoryPointsTarget} PV
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

          {/* 2. Bank Reserves & Dev Deck */}
          <div className="p-2.5 border-b-2 border-[#d4af37]/30 bg-[#140e09]/95">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-amber-200 mb-1.5 px-0.5">
              <span>Banca</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-200 text-[10px]">
                Dev: {gameState.devDeck.length}
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
                    <ResourceIcon resource={r} size={15} />
                    <span className="font-mono text-xs font-black text-amber-100">
                      {gameState.bank[r]}
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold text-stone-400 mt-0.5 truncate max-w-full">
                    {RESOURCE_META[r].name.slice(0, 4)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Collapsible Chronicle Popover / Accordion Button */}
          <div className="p-2 border-t border-[#d4af37]/25 bg-[#120d09] mt-auto">
            <button
              type="button"
              onClick={() => setShowChronicle((prev) => !prev)}
              className="w-full py-2 px-3 rounded-xl bg-[#1d140e] hover:bg-[#281c13] border border-[#d4af37]/40 text-amber-200 text-xs font-black flex items-center justify-between transition cursor-pointer shadow"
            >
              <span className="flex items-center gap-1.5">
                <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                <span>Crónicas de la Isla</span>
              </span>
              <span className="text-[11px] font-mono text-amber-400">
                {showChronicle ? '▲ Cerrar' : `▼ Ver (${gameState.logs.length})`}
              </span>
            </button>
          </div>

          {/* Collapsible Chronicle Drawer */}
          <AnimatePresence>
            {showChronicle && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 210, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden bg-[#0c0806] border-t border-[#d4af37]/30 flex flex-col p-2.5"
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

        {/* RIGHT: Quemar Cartas (Banca/Puertos) & Comerciar, Cartas de Desarrollo, Pasar Turno */}
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
                : 'Quemar cartas con la Banca (4:1 o Puertos 3:1 / 2:1) o comerciar con jugadores'
            }
          >
            {isMyTurn && !tradePermission.allowed && !isWaitingForMandatoryDice && (
              <Lock className="w-3.5 h-3.5 text-red-950" />
            )}
            {hasAnyPort ? <Anchor className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
            <span>Quemar Cartas / Comerciar</span>
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

      {/* GLOBAL HOST PAUSE MODAL ("Juego Pausado por el Host") */}
      <AnimatePresence>
        {isPausedByHost && (
          <motion.div
            key="modal-host-pause"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#241911] via-[#160f0a] to-[#0c0805] border-2 border-[#d4af37] p-8 text-center shadow-[0_25px_90px_rgba(0,0,0,0.95)] space-y-5"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border-2 border-[#d4af37] flex items-center justify-center text-amber-300 shadow-lg">
                <Pause className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-black text-amber-100">
                  Juego Pausado por el Host
                </h2>
                <p className="text-sm text-stone-300 leading-relaxed">
                  El anfitrión ha pausado temporalmente la partida. El temporizador del turno está
                  congelado y ninguna acción puede ejecutarse hasta que se reanude.
                </p>
              </div>

              {remainingSec !== null && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d0906] border border-[#d4af37]/40 text-xs font-bold text-amber-200">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Tiempo restante congelado: {remainingSec}s</span>
                </div>
              )}

              {me.isHost ? (
                <button
                  type="button"
                  onClick={() => dispatchAction({ type: 'TOGGLE_HOST_PAUSE' })}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-stone-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reanudar Partida</span>
                </button>
              ) : (
                <div className="text-xs font-semibold text-amber-300/80 italic">
                  Esperando a que el anfitrión reanude la sesión...
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  Cerrar ✕
                </button>
              </div>

              {/* Low-End PC Mode Switch */}
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
                    Desactiva partículas, filtros pesados y efectos de iluminación complejos de Framer Motion.
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
 * High-contrast, compact Player Summary Card (`PlayerCard` / `OpponentSummary`)
 * for the Right Sidebar. Displays Victory Points, Hand Cards, Development Cards,
 * Longest Road, Largest Army, and official Resource Icons (Madera, Arcilla, Oveja, Trigo, Piedra).
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
      className={`p-2.5 rounded-xl border-2 transition ${
        isActiveTurn
          ? 'bg-gradient-to-b from-[#2a1c11] to-[#18100a] border-[#fbbf24] shadow-[0_6px_20px_rgba(251,191,36,0.2)]'
          : 'bg-[#120d09] border-stone-800'
      }`}
    >
      {/* Top Row: Player Avatar, Name, Status & High-Contrast Victory Points Badge */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base border-2 shrink-0 shadow-sm"
            style={{
              backgroundColor: colorCfg.primary,
              borderColor: colorCfg.stroke,
            }}
          >
            {player.avatar}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white truncate max-w-[110px]">
                {player.name}
              </span>
              {isLocalPlayer && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-stone-950 font-black uppercase">
                  Tú
                </span>
              )}
            </div>
            <div className="text-[10px] font-semibold text-stone-400 mt-0.5 truncate">
              {player.isBot
                ? `🤖 ${player.botDifficulty === 'EASY' ? 'Fácil' : player.botDifficulty === 'HARD' ? 'Difícil' : 'Normal'}`
                : player.status === 'FROZEN_SKIP'
                ? '❄️ Omitido'
                : !player.connected
                ? '⚠️ Desconectado'
                : '🟢 En línea'}
            </div>
          </div>
        </div>

        {/* High-Contrast Victory Points Pill */}
        <div className="flex flex-col items-end shrink-0 bg-[#090604] px-2 py-1 rounded-lg border border-[#d4af37]/50 shadow-inner">
          <div className="font-display text-xs sm:text-sm font-black text-amber-300 leading-none">
            {player.publicVictoryPoints} PV
          </div>
          {isLocalPlayer && player.totalVictoryPoints > player.publicVictoryPoints && (
            <div className="text-[9px] font-extrabold text-emerald-300 mt-0.5">
              ({player.totalVictoryPoints})
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: 4 High-Contrast Stat Tiles (Cartas en Mano, Desarrollo, Carretera, Ejército) */}
      <div className="mt-2 pt-1.5 border-t border-stone-800 grid grid-cols-4 gap-1 text-center">
        <div
          className="bg-[#090604] border border-stone-800/80 rounded-lg py-1 px-0.5"
          title="Cartas de Recurso en Mano"
        >
          <div className="text-[9px] font-bold uppercase text-stone-400">Mano</div>
          <div className="text-xs sm:text-sm font-black text-white mt-0.5">
            🎴{totalRes}
          </div>
        </div>

        <div
          className="bg-[#090604] border border-stone-800/80 rounded-lg py-1 px-0.5"
          title="Cartas de Desarrollo sin jugar"
        >
          <div className="text-[9px] font-bold uppercase text-stone-400">Des.</div>
          <div className="text-xs sm:text-sm font-black text-purple-300 mt-0.5">
            🃏{unplayedDevs}
          </div>
        </div>

        <div
          className={`rounded-lg py-1 px-0.5 border ${
            hasLongestRoad
              ? 'bg-amber-950/60 border-amber-400'
              : 'bg-[#090604] border-stone-800/80'
          }`}
          title="Carretera más larga"
        >
          <div className="text-[9px] font-bold uppercase text-stone-400">Ruta</div>
          <div className="text-xs sm:text-sm font-black text-amber-300 mt-0.5">
            🛣️{player.longestRoadLength}
          </div>
        </div>

        <div
          className={`rounded-lg py-1 px-0.5 border ${
            hasLargestArmy
              ? 'bg-red-950/60 border-red-400'
              : 'bg-[#090604] border-stone-800/80'
          }`}
          title="Ejército (Caballeros jugados)"
        >
          <div className="text-[9px] font-bold uppercase text-stone-400">Ejér.</div>
          <div className="text-xs sm:text-sm font-black text-red-300 mt-0.5">
            ⚔️{player.knightsPlayed}
          </div>
        </div>
      </div>

      {/* Resource Breakdown with Official Resource Icons (Madera, Arcilla, Oveja, Trigo, Piedra) */}
      <div className="mt-1.5 pt-1 border-t border-stone-800/70">
        {isLocalPlayer ? (
          <div className="grid grid-cols-5 gap-1">
            {ALL_RESOURCES.map((res) => (
              <div
                key={res}
                className="flex items-center justify-center gap-1 py-0.5 px-0.5 rounded-lg bg-[#090604] border border-stone-800"
                title={`${RESOURCE_META[res].name}: ${player.resources[res]}`}
              >
                <ResourceIcon resource={res} size={13} />
                <span className="font-mono text-xs font-black text-white">
                  {player.resources[res]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#090604] border border-stone-800 text-[11px]">
            <span className="font-bold text-stone-400">Mano:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-black text-amber-300">
                {totalRes} {totalRes === 1 ? 'carta' : 'cartas'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Special Achievement Badges (Gran Ruta Comercial & Gran Ejército) */}
      {(hasLongestRoad || hasLargestArmy) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {hasLongestRoad && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-amber-200 text-[9px] font-black">
              <Award className="w-3 h-3 text-amber-300" /> Gran Ruta (+2 PV)
            </span>
          )}
          {hasLargestArmy && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 border border-red-400/60 text-red-200 text-[9px] font-black">
              <Swords className="w-3 h-3 text-red-300" /> Gran Ejército (+2 PV)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
