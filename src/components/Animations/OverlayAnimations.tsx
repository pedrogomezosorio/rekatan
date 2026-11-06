import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert, Swords } from 'lucide-react';
import {
  DiscardAnimationEvent,
  GameState,
  ResourceFlightEvent,
  ResourceType,
  RobberStealEvent,
} from '../../shared/types';
import {
  DEV_CARD_IMAGE_PATHS,
  PLAYER_COLORS,
  RESOURCE_CARD_PATHS,
  RESOURCE_META,
} from '../../shared/constants';
import { ResourceIcon } from '../UI/ResourceIcon';

interface OverlayAnimationsProps {
  gameState: GameState;
  currentPlayerId: string;
  lowEndPcMode?: boolean;
}

interface PositionedResourceFlight extends ResourceFlightEvent {
  instanceKey: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stepNumber: number;
  totalSteps: number;
}

interface CentralAlertPayload {
  id: string;
  kind: 'KNIGHT_PLAYED' | 'ROBBER_ON_MY_HEX';
  title: string;
  subtitle: string;
  actorName?: string;
  cardImage?: string;
}

interface DevCardFlight {
  id: string;
  buyerPlayerId: string;
  buyerPlayerName: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function resolveDeckScreenCenter(): { x: number; y: number } {
  const el = document.getElementById('tabletop-devcard-deck');
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  return { x: vw - 80, y: 130 };
}

function resolveHexScreenCenter(
  hexId: string,
  gameState: GameState
): { x: number; y: number } {
  const el = document.getElementById(`board-hex-${hexId}`);
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }
  const hex = gameState.board.hexes[hexId];
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  if (hex) {
    return {
      x: vw * 0.42 + (hex.center.x / 960) * (vw * 0.48),
      y: vh * 0.46 + (hex.center.y / 840) * (vh * 0.54),
    };
  }
  return { x: vw * 0.42, y: vh * 0.46 };
}

interface DiceRollStage {
  stage: 'SPINNING' | 'LANDED';
  displayDice: [number, number];
  finalDice: [number, number];
  isSeven: boolean;
  totalSum: number;
}

function resolvePlayerCasilleroCenter(
  playerId: string,
  gameState: GameState
): { x: number; y: number } {
  const el =
    document.getElementById(`left-box-${playerId}`) ||
    document.getElementById(`player-casillero-${playerId}`) ||
    document.getElementById(`right-player-card-${playerId}`);
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }
  const idx = Math.max(
    0,
    gameState.players.findIndex((p) => p.id === playerId)
  );
  return {
    x: 105,
    y: 110 + idx * 115,
  };
}

export const OverlayAnimations: React.FC<OverlayAnimationsProps> = ({
  gameState,
  currentPlayerId,
  lowEndPcMode = false,
}) => {
  const [activeDiceStage, setActiveDiceStage] = useState<DiceRollStage | null>(null);
  const [activeFlightItems, setActiveFlightItems] = useState<PositionedResourceFlight[]>([]);
  const [activeDevCardFlights, setActiveDevCardFlights] = useState<DevCardFlight[]>([]);
  const [centralAlert, setCentralAlert] = useState<CentralAlertPayload | null>(null);
  const [activeDiscards, setActiveDiscards] = useState<DiscardAnimationEvent[]>([]);
  const [activeSteal, setActiveSteal] = useState<RobberStealEvent | null>(null);

  const lastSeenNonceRef = useRef<number>(0);
  const sequenceRunIdRef = useRef<number>(0);
  const latestGameStateRef = useRef<GameState>(gameState);

  useEffect(() => {
    latestGameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const ev = gameState.lastEvent;
    if (!ev || ev.nonce === lastSeenNonceRef.current) return;
    lastSeenNonceRef.current = ev.nonce;

    const isOrderPhase = gameState.phase === 'ORDER_ROLL';

    // 1. Extra-Large Slow Center Dice Roll (1.0s spinning + 2.0s landed) on ANY main-game dice roll
    const hasMainGameDice =
      Boolean(ev.dice) &&
      !isOrderPhase &&
      (ev.type === 'DICE_ROLLED' ||
        ev.type === 'RESOURCES_PRODUCED' ||
        ev.type === 'ROBBER_DISCARDED');

    if (hasMainGameDice && ev.dice) {
      const finalDice = ev.dice;
      const isSeven = finalDice[0] + finalDice[1] === 7;
      const totalSum = finalDice[0] + finalDice[1];

      setActiveDiceStage({
        stage: 'SPINNING',
        displayDice: [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ],
        finalDice,
        isSeven,
        totalSum,
      });
    }

    // 2. Central Critical Alerts:
    // Case A: Someone plays a Knight Development Card
    if (ev.type === 'DEV_CARD_PLAYED' && ev.devCardType === 'KNIGHT') {
      const actorName =
        ev.devCardPlayerName ||
        gameState.players.find((p) => p.id === ev.devCardPlayerId)?.name ||
        'Un jugador';
      setCentralAlert({
        id: `ALERT_KNIGHT_${ev.nonce}`,
        kind: 'KNIGHT_PLAYED',
        title: 'Carta de Caballero en Juego',
        subtitle: `${actorName} ha desplegado un Caballero y toma el control del Ladrón.`,
        actorName,
        cardImage: DEV_CARD_IMAGE_PATHS.KNIGHT,
      });
    }

    // Case B: Someone places (or keeps) the Robber on one of the local player's terrains
    if (
      ev.robberTargetHexId &&
      ev.robberAffectedPlayerIds &&
      ev.robberAffectedPlayerIds.includes(currentPlayerId)
    ) {
      const mover = gameState.players.find((p) => p.id === ev.robberMovedByPlayerId);
      const targetHex = gameState.board.hexes[ev.robberTargetHexId];
      const terrainLabel =
        targetHex && targetHex.terrain !== 'DESERT' && targetHex.terrain !== 'SEA'
          ? `${RESOURCE_META[targetHex.terrain as ResourceType].terrainName} (${targetHex.numberToken})`
          : 'tu terreno';

      setCentralAlert({
        id: `ALERT_ROBBER_${ev.nonce}`,
        kind: 'ROBBER_ON_MY_HEX',
        title: 'El Ladrón Bloquea tu Terreno',
        subtitle: mover
          ? `${mover.name} ha colocado el Ladrón sobre tu hexágono de ${terrainLabel}.`
          : `Tu hexágono de ${terrainLabel} ha sido bloqueado por el Ladrón.`,
        actorName: mover?.name,
      });
    }

    // 3. Sequential Resource Distribution (1 by 1 with async/await, 4.0s per flight)
    if (ev.flights && ev.flights.length > 0) {
      const flightsToRun = [...ev.flights];
      // Wait for dice (1.0s spin + 2.5s landed display + buffer) before starting resource flights!
      const waitForDiceMs = hasMainGameDice ? 3650 : 150;
      const runId = ++sequenceRunIdRef.current;

      void (async () => {
        if (waitForDiceMs > 0) {
          await sleep(waitForDiceMs);
        }
        if (sequenceRunIdRef.current !== runId) return;

        for (let i = 0; i < flightsToRun.length; i++) {
          if (sequenceRunIdRef.current !== runId) return;
          const flight = flightsToRun[i];
          const liveState = latestGameStateRef.current;
          const origin = resolveHexScreenCenter(flight.hexId, liveState);
          const target = resolvePlayerCasilleroCenter(flight.playerId, liveState);
          const instanceKey = `${flight.id}_${ev.nonce}_${i}`;

          const positionedItem: PositionedResourceFlight = {
            ...flight,
            instanceKey,
            startX: origin.x,
            startY: origin.y,
            endX: target.x,
            endY: target.y,
            stepNumber: i + 1,
            totalSteps: flightsToRun.length,
          };

          setActiveFlightItems((prev) => [...prev, positionedItem]);

          // Remove this card right after its doubled 4.0s flight completes
          setTimeout(() => {
            setActiveFlightItems((prev) =>
              prev.filter((item) => item.instanceKey !== instanceKey)
            );
          }, 4050);

          // Wait until this 4.0s flight is finished before launching the next card
          if (i < flightsToRun.length - 1) {
            await sleep(3950);
          }
        }
      })();
    }

    // 4. Robber Discard Loss Animation
    if (ev.discards && ev.discards.length > 0) {
      setActiveDiscards(ev.discards);
    }

    // 5. Card Steal Notification
    if (ev.steal) {
      setActiveSteal(ev.steal);
    }

    // 6. Development Card Purchase Sliding & Spinning Flight Animation
    if (ev.type === 'DEV_CARD_BOUGHT' && ev.buyerPlayerId) {
      const liveState = latestGameStateRef.current;
      const origin = resolveDeckScreenCenter();
      const target = resolvePlayerCasilleroCenter(ev.buyerPlayerId, liveState);
      const buyerName =
        ev.buyerPlayerName ||
        liveState.players.find((p) => p.id === ev.buyerPlayerId)?.name ||
        'Jugador';
      const flightId = `DEV_FLIGHT_${ev.nonce}_${Date.now()}`;

      setActiveDevCardFlights((prev) => [
        ...prev,
        {
          id: flightId,
          buyerPlayerId: ev.buyerPlayerId!,
          buyerPlayerName: buyerName,
          startX: origin.x,
          startY: origin.y,
          endX: target.x,
          endY: target.y,
        },
      ]);

      setTimeout(() => {
        setActiveDevCardFlights((prev) => prev.filter((f) => f.id !== flightId));
      }, 2950);
    }
  }, [gameState.lastEvent, gameState.phase, currentPlayerId, gameState.players, gameState.board.hexes]);

  // Dice Animation State Machine: 1.0s spinning -> 2.0s landed display
  useEffect(() => {
    if (!activeDiceStage || activeDiceStage.stage !== 'SPINNING') return;

    const interval = setInterval(() => {
      setActiveDiceStage((prev) => {
        if (!prev || prev.stage !== 'SPINNING') return prev;
        return {
          ...prev,
          displayDice: [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1,
          ],
        };
      });
    }, 65);

    const spinTimer = setTimeout(() => {
      clearInterval(interval);
      setActiveDiceStage((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          stage: 'LANDED',
          displayDice: prev.finalDice,
        };
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(spinTimer);
    };
  }, [activeDiceStage?.stage]);

  // Landed dice stays visible for 2.5 seconds (2500ms) as requested so everyone can clearly read the result
  useEffect(() => {
    if (!activeDiceStage || activeDiceStage.stage !== 'LANDED') return;
    const landedTimer = setTimeout(() => {
      setActiveDiceStage(null);
    }, 2500);
    return () => clearTimeout(landedTimer);
  }, [activeDiceStage?.stage]);

  // Auto-dismiss Central Critical Alert after 3.4 seconds
  useEffect(() => {
    if (!centralAlert) return;
    const timer = setTimeout(() => setCentralAlert(null), 3400);
    return () => clearTimeout(timer);
  }, [centralAlert]);

  // Auto-dismiss Robber Discards
  useEffect(() => {
    if (activeDiscards.length === 0) return;
    const timer = setTimeout(() => setActiveDiscards([]), 4000);
    return () => clearTimeout(timer);
  }, [activeDiscards]);

  // Auto-dismiss Steal Notification
  useEffect(() => {
    if (!activeSteal) return;
    const timer = setTimeout(() => setActiveSteal(null), 3400);
    return () => clearTimeout(timer);
  }, [activeSteal]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {/* 1. SLOW EXTRA-LARGE CENTER-SCREEN DICE ROLL OVERLAY (1s SPINNING + 2.5s LANDED DISPLAY, CENTERED WITH INTERNAL BACKDROP BLUR) */}
      <AnimatePresence>
        {activeDiceStage && (
          <motion.div
            key={`giant-dice-${lastSeenNonceRef.current}`}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className={`relative flex flex-col items-center justify-center px-10 sm:px-14 py-7 rounded-3xl border-4 shadow-[0_25px_80px_rgba(0,0,0,0.92)] backdrop-blur-xl ${
                activeDiceStage.isSeven
                  ? 'bg-[#2b0808]/90 border-red-500'
                  : 'bg-[#1a110a]/92 border-[#d4af37]'
              }`}
            >
              <span className="text-xs sm:text-sm font-black uppercase tracking-[0.32em] text-amber-300/90 mb-3">
                {activeDiceStage.stage === 'SPINNING'
                  ? 'Lanzando Dados...'
                  : activeDiceStage.isSeven
                  ? 'Activación del Ladrón'
                  : 'Resultado de los Dados'}
              </span>

              {activeDiceStage.stage === 'SPINNING' ? (
                <div className="flex flex-col items-center justify-center my-6">
                  {/* Rolling Dice Animation during the 1.0s spinning phase */}
                  <div className="flex items-center gap-6">
                    <DieFace value={activeDiceStage.displayDice[0]} isRolling={true} />
                    <span className="text-3xl font-black text-amber-400 animate-pulse">+</span>
                    <DieFace value={activeDiceStage.displayDice[1]} isRolling={true} />
                  </div>
                  <div className="mt-6 text-xs sm:text-sm font-bold text-amber-200/90 animate-pulse">
                    Rodando los dados sobre la mesa...
                  </div>
                </div>
              ) : (
                <>
                  {/* Extra Large Numeric Result in Absolute Center (stays for 2.5s) */}
                  <motion.div
                    initial={{ scale: 0.35, opacity: 0 }}
                    animate={{ scale: [0.35, 1.15, 1], opacity: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`text-7xl sm:text-8xl font-black font-serif leading-none tracking-tight drop-shadow-[0_12px_32px_rgba(0,0,0,0.98)] ${
                      activeDiceStage.isSeven
                        ? 'text-red-400'
                        : activeDiceStage.totalSum === 6 || activeDiceStage.totalSum === 8
                        ? 'text-amber-300'
                        : 'text-amber-100'
                    }`}
                  >
                    {activeDiceStage.totalSum}
                  </motion.div>

                  {/* Individual 2D6 Die Faces Beneath */}
                  <div className="flex items-center gap-5 mt-4">
                    <DieFace value={activeDiceStage.finalDice[0]} isRolling={false} />
                    <span className="text-2xl font-black text-amber-400/80">+</span>
                    <DieFace value={activeDiceStage.finalDice[1]} isRolling={false} />
                  </div>

                  <div
                    className={`mt-5 text-xs sm:text-sm font-extrabold uppercase tracking-wider px-5 py-1.5 rounded-full ${
                      activeDiceStage.isSeven
                        ? 'bg-red-700/90 text-red-50 border border-red-400/50'
                        : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                    }`}
                  >
                    {activeDiceStage.isSeven
                      ? 'Salió un 7 — El Ladrón entra en acción'
                      : 'Recolección de recursos...'}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. SEQUENTIAL RESOURCE DISTRIBUTION ANIMATION (DOUBLED TO 4.0s PER FLIGHT FROM HEX TO EXACT PLAYER CASILLERO) */}
      <AnimatePresence>
        {activeFlightItems.map((flight) => (
          <ResourceDistributionFlightCard
            key={flight.instanceKey}
            flight={flight}
            gameState={gameState}
            lowEndPcMode={lowEndPcMode}
          />
        ))}
      </AnimatePresence>

      {/* 2B. DEVELOPMENT CARD PURCHASE SLIDING & ROTATING ANIMATION (FROM DECK TO LEFT CASILLERO) */}
      <AnimatePresence>
        {activeDevCardFlights.map((flight) => (
          <DevCardPurchaseFlightCard
            key={flight.id}
            flight={flight}
            gameState={gameState}
          />
        ))}
      </AnimatePresence>

      {/* 3. CENTRAL CRITICAL ALERTS (KNIGHT PLAYED OR ROBBER PLACED ON LOCAL PLAYER'S TERRAIN) */}
      <AnimatePresence>
        {centralAlert && (
          <motion.div
            key={centralAlert.id}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: lowEndPcMode ? 0 : [0, -12, 12, -8, 8, -4, 4, 0],
              y: lowEndPcMode ? 0 : [0, 6, -6, 4, -4, 2, -2, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(127,29,29,0.62)_0%,rgba(28,5,5,0.86)_100%)] backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.72, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="flex flex-col items-center text-center max-w-xl mx-4 px-10 py-8 rounded-3xl bg-gradient-to-b from-[#330a0a]/98 via-[#1f0606]/98 to-[#0e0202]/98 border-4 border-red-500 shadow-[0_0_100px_rgba(220,38,38,0.9)]"
            >
              {centralAlert.cardImage ? (
                <div className="w-24 h-36 rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-[0_12px_30px_rgba(0,0,0,0.9)] mb-4">
                  <img
                    src={centralAlert.cardImage}
                    alt={centralAlert.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-red-950 border-2 border-red-400 flex items-center justify-center mb-4 shadow-lg">
                  {centralAlert.kind === 'KNIGHT_PLAYED' ? (
                    <Swords className="w-9 h-9 text-red-200" />
                  ) : (
                    <ShieldAlert className="w-9 h-9 text-red-200" />
                  )}
                </div>
              )}

              <span className="text-[11px] font-black uppercase tracking-[0.28em] text-red-300/90 mb-1">
                Alerta Crítica de Partida
              </span>
              <h2 className="text-2xl sm:text-4xl font-black font-serif text-red-50 tracking-wide drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)]">
                {centralAlert.title}
              </h2>
              <p className="text-sm sm:text-base text-red-200/95 font-semibold mt-2.5 max-w-md leading-relaxed">
                {centralAlert.subtitle}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. ROBBER DISCARD LOSS ANIMATION (MANUAL & RANDOM) */}
      <AnimatePresence>
        {activeDiscards.length > 0 && (
          <motion.div
            key={`discards-${lastSeenNonceRef.current}`}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            className="absolute top-44 left-1/2 -translate-x-1/2 flex flex-col gap-2 bg-red-950/95 border-2 border-red-500/80 px-5 py-4 rounded-2xl shadow-2xl max-w-md w-full"
          >
            <div className="text-xs font-extrabold uppercase tracking-wider text-red-300 text-center">
              {activeDiscards[0]?.mode === 'RANDOM'
                ? 'Descarte Aleatorio Automático (>7 cartas)'
                : 'Cartas Descartadas al salir 7'}
            </div>
            {activeDiscards.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-red-500/30"
              >
                <span className="text-xs font-bold text-slate-100">{d.playerName} perdió:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(Object.entries(d.discarded) as Array<[ResourceType, number]>).map(
                    ([res, count]) =>
                      count > 0 && (
                        <motion.span
                          key={res}
                          initial={{ scale: 1.3, rotate: -8 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-900/70 text-red-100 text-xs font-bold border border-red-400/40"
                        >
                          -{count} <ResourceIcon resource={res} size={14} />
                        </motion.span>
                      )
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. ROBBER CARD STEAL NOTIFICATION */}
      <AnimatePresence>
        {activeSteal && (
          <motion.div
            key={activeSteal.id}
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#1c0909]/95 border-2 border-red-500/80 px-5 py-3 rounded-2xl shadow-2xl"
          >
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
            <div className="text-xs sm:text-sm">
              <div className="font-bold text-red-100">
                {gameState.players.find((p) => p.id === activeSteal.thiefId)?.name} robó 1 carta a{' '}
                {gameState.players.find((p) => p.id === activeSteal.victimId)?.name}
              </div>
              {(currentPlayerId === activeSteal.thiefId ||
                currentPlayerId === activeSteal.victimId) && (
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold mt-0.5">
                  <span>Recurso robado:</span>
                  <ResourceIcon resource={activeSteal.resource} size={15} />
                  <span>{RESOURCE_META[activeSteal.resource].name}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ResourceDistributionFlightCard: React.FC<{
  flight: PositionedResourceFlight;
  gameState: GameState;
  lowEndPcMode?: boolean;
}> = ({ flight, gameState }) => {
  const meta = RESOURCE_META[flight.resource];
  const cardImg = RESOURCE_CARD_PATHS[flight.resource];
  const player = gameState.players.find((p) => p.id === flight.playerId);
  const playerColor = player ? PLAYER_COLORS[player.color]?.primary : '#fbbf24';

  const midX = flight.startX + (flight.endX - flight.startX) * 0.45;
  const midY = Math.min(flight.startY, flight.endY) - 42;

  return (
    <>
      {/* Origin Hex Pulse Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.65, 1.35, 1.6] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ left: flight.startX, top: flight.startY, borderColor: playerColor }}
        className="fixed -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 pointer-events-none"
      />

      {/* Destination Casillero Target Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: [0, 0.4, 0.95, 0], scale: [0.9, 1.02, 1.08, 1] }}
        transition={{ duration: 4.0, times: [0, 0.5, 0.88, 1], ease: 'easeInOut' }}
        style={{ left: flight.endX, top: flight.endY, borderColor: playerColor }}
        className="fixed -translate-x-1/2 -translate-y-1/2 w-56 h-14 rounded-xl border-2 pointer-events-none shadow-[0_0_25px_rgba(251,191,36,0.5)]"
      />

      {/* Floating Resource Card Traveling from Hex to Player Casillero (Doubled 4.0s duration) */}
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.6,
          left: flight.startX,
          top: flight.startY,
        }}
        animate={{
          opacity: [0, 1, 1, 1, 0],
          scale: [0.65, 1.15, 1.08, 0.96, 0.78],
          left: [flight.startX, midX, midX, flight.endX, flight.endX],
          top: [flight.startY, midY, midY, flight.endY, flight.endY],
        }}
        transition={{
          duration: 4.0,
          times: [0, 0.22, 0.48, 0.9, 1],
          ease: 'easeInOut',
        }}
        className="fixed -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 p-2.5 pr-4 rounded-2xl border-2 bg-[#140e0a]/95 shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
        style={{ borderColor: playerColor }}
      >
        <div className="relative w-12 h-16 rounded-lg overflow-hidden border border-amber-300/70 shadow-md shrink-0">
          <img
            src={cardImg}
            alt={meta.name}
            className="w-full h-full object-fill"
          />
          <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-stone-950/90 text-amber-300 font-mono text-[10px] font-black border border-amber-400/50">
            +{flight.amount}
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-sm font-black text-amber-100">
            <ResourceIcon resource={flight.resource} size={16} />
            <span>
              +{flight.amount} {meta.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
              style={{ backgroundColor: playerColor }}
            />
            <span className="text-xs font-extrabold text-amber-300">
              Hacia {player?.name || 'Jugador'}
            </span>
          </div>
          {flight.totalSteps > 1 && (
            <span className="text-[10px] font-bold text-stone-400 mt-0.5">
              Envío {flight.stepNumber} de {flight.totalSteps}
            </span>
          )}
        </div>
      </motion.div>
    </>
  );
};

const DieFace: React.FC<{ value: number; isRolling?: boolean }> = ({ value, isRolling }) => {
  return (
    <motion.div
      animate={
        isRolling
          ? {
              rotate: [0, 90, 180, 270, 360],
              scale: [0.9, 1.12, 0.95, 1.1, 1],
              y: [0, -12, 4, -8, 0],
            }
          : { rotate: 0, scale: 1, y: 0 }
      }
      transition={
        isRolling
          ? { duration: 0.28, repeat: Infinity, ease: 'linear' }
          : { duration: 0.5, type: 'spring', stiffness: 220, damping: 16 }
      }
      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#fffbeb] via-[#fef3c7] to-[#fde68a] border-4 border-[#b45309] shadow-[0_8px_25px_rgba(0,0,0,0.85)] flex items-center justify-center text-3xl sm:text-4xl font-black font-serif text-stone-900 select-none"
    >
      {value}
    </motion.div>
  );
};

const DevCardPurchaseFlightCard: React.FC<{
  flight: DevCardFlight;
  gameState: GameState;
}> = ({ flight, gameState }) => {
  const buyer = gameState.players.find((p) => p.id === flight.buyerPlayerId);
  const buyerColor = buyer ? PLAYER_COLORS[buyer.color]?.primary : '#fbbf24';

  const midX = flight.startX + (flight.endX - flight.startX) * 0.45;
  const midY = Math.min(flight.startY, flight.endY) - 50;

  return (
    <>
      {/* Origin Deck Lift Pulse */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.7, 1.4, 1.6] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ left: flight.startX, top: flight.startY, borderColor: '#d4af37' }}
        className="fixed -translate-x-1/2 -translate-y-1/2 w-20 h-28 rounded-xl border-4 pointer-events-none"
      />

      {/* Target Buyer Casillero Aura */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: [0, 0.4, 0.95, 0], scale: [0.9, 1.02, 1.08, 1] }}
        transition={{ duration: 2.8, times: [0, 0.5, 0.88, 1], ease: 'easeInOut' }}
        style={{ left: flight.endX, top: flight.endY, borderColor: buyerColor }}
        className="fixed -translate-x-1/2 -translate-y-1/2 w-56 h-16 rounded-2xl border-2 pointer-events-none shadow-[0_0_25px_rgba(251,191,36,0.6)]"
      />

      {/* Flying & Spinning Dev Card from Deck to Buyer's Left Box */}
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.7,
          rotate: 0,
          left: flight.startX,
          top: flight.startY,
        }}
        animate={{
          opacity: [0, 1, 1, 1, 0],
          scale: [0.7, 1.15, 1.1, 0.95, 0.75],
          rotate: [0, 180, 360, 540, 720],
          left: [flight.startX, midX, midX, flight.endX, flight.endX],
          top: [flight.startY, midY, midY, flight.endY, flight.endY],
        }}
        transition={{
          duration: 2.8,
          times: [0, 0.2, 0.5, 0.88, 1],
          ease: 'easeInOut',
        }}
        className="fixed -translate-x-1/2 -translate-y-1/2 flex flex-col items-center p-2 rounded-2xl border-2 bg-[#120c08]/95 shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
        style={{ borderColor: buyerColor }}
      >
        <div className="w-16 h-24 rounded-xl overflow-hidden border border-amber-300/80 shadow-lg relative bg-stone-900">
          <img
            src="/assets/cards/devcard_back.png"
            alt="Carta de Desarrollo"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-[10px] font-black text-amber-300 mt-1 uppercase tracking-wider">
          Para {flight.buyerPlayerName}
        </span>
      </motion.div>
    </>
  );
};
