import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DiscardAnimationEvent,
  GameState,
  ResourceFlightEvent,
  ResourceType,
  RobberStealEvent,
} from '../../shared/types';
import { PLAYER_COLORS, RESOURCE_CARD_PATHS, RESOURCE_META } from '../../shared/constants';
import { ResourceIcon } from '../UI/ResourceIcon';

interface OverlayAnimationsProps {
  gameState: GameState;
  currentPlayerId: string;
  lowEndPcMode?: boolean;
}

export const OverlayAnimations: React.FC<OverlayAnimationsProps> = ({
  gameState,
  currentPlayerId,
  lowEndPcMode = false,
}) => {
  const [giantDiceRoll, setGiantDiceRoll] = useState<[number, number] | null>(null);
  const [activeFlights, setActiveFlights] = useState<ResourceFlightEvent[]>([]);
  const [activeDiscards, setActiveDiscards] = useState<DiscardAnimationEvent[]>([]);
  const [activeSteal, setActiveSteal] = useState<RobberStealEvent | null>(null);
  const [robberVictimAlert, setRobberVictimAlert] = useState<{
    hexId: string;
    movedByName?: string;
  } | null>(null);

  const lastSeenNonceRef = useRef<number>(0);

  // Detect new server events without triggering a re-render loop that cancels timers
  useEffect(() => {
    const ev = gameState.lastEvent;
    if (!ev || ev.nonce === lastSeenNonceRef.current) return;
    lastSeenNonceRef.current = ev.nonce;

    const isOrderOrSetupPhase =
      gameState.phase === 'ORDER_ROLL' ||
      gameState.phase === 'SETUP_SETTLEMENT_1' ||
      gameState.phase === 'SETUP_ROAD_1' ||
      gameState.phase === 'SETUP_SETTLEMENT_2' ||
      gameState.phase === 'SETUP_ROAD_2';

    // 1. Giant Center Dice Number (only on actual main-game DICE_ROLLED, never during ORDER_ROLL)
    if (ev.dice && ev.type === 'DICE_ROLLED' && !isOrderOrSetupPhase) {
      setGiantDiceRoll(ev.dice);
    } else if (isOrderOrSetupPhase) {
      setGiantDiceRoll(null);
    }

    // 2. Slow & Clear Resource Collection Flights
    if (ev.flights && ev.flights.length > 0) {
      setActiveFlights(ev.flights);
    }

    // 3. Robber Discard Loss Animation
    if (ev.discards && ev.discards.length > 0) {
      setActiveDiscards(ev.discards);
    }

    // 4. Card Steal Notification
    if (ev.steal) {
      setActiveSteal(ev.steal);
    }

    // 5. Robber Alert ("Te han colocado al ladrón") when local player owns a building on the target hex
    if (
      ev.robberTargetHexId &&
      ev.robberAffectedPlayerIds &&
      ev.robberAffectedPlayerIds.includes(currentPlayerId)
    ) {
      const mover = gameState.players.find((p) => p.id === ev.robberMovedByPlayerId);
      setRobberVictimAlert({
        hexId: ev.robberTargetHexId,
        movedByName: mover?.name,
      });
    }
  }, [gameState.lastEvent, gameState.phase, currentPlayerId, gameState.players]);

  // Dedicated 2.7s (>2.5s) auto-dismiss timer for Giant Center Dice Roll
  useEffect(() => {
    if (!giantDiceRoll) return;
    const timer = setTimeout(() => setGiantDiceRoll(null), 2700);
    return () => clearTimeout(timer);
  }, [giantDiceRoll]);

  // Dedicated auto-dismiss timer for Resource Flights (extended for slower, clearer flight)
  useEffect(() => {
    if (activeFlights.length === 0) return;
    const timer = setTimeout(() => setActiveFlights([]), 4600);
    return () => clearTimeout(timer);
  }, [activeFlights]);

  // Dedicated auto-dismiss timer for Robber Discards
  useEffect(() => {
    if (activeDiscards.length === 0) return;
    const timer = setTimeout(() => setActiveDiscards([]), 4000);
    return () => clearTimeout(timer);
  }, [activeDiscards]);

  // Dedicated auto-dismiss timer for Steal Notification
  useEffect(() => {
    if (!activeSteal) return;
    const timer = setTimeout(() => setActiveSteal(null), 3400);
    return () => clearTimeout(timer);
  }, [activeSteal]);

  // Dedicated auto-dismiss timer for Robber Victim Alert
  useEffect(() => {
    if (!robberVictimAlert) return;
    const timer = setTimeout(() => setRobberVictimAlert(null), 3200);
    return () => clearTimeout(timer);
  }, [robberVictimAlert]);

  const diceSum = giantDiceRoll ? giantDiceRoll[0] + giantDiceRoll[1] : null;
  const isSeven = diceSum === 7;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {/* 1. GIANT CENTER-SCREEN DICE NUMBER OVERLAY (1.5 SECONDS) */}
      <AnimatePresence>
        {giantDiceRoll && diceSum !== null && (
          <motion.div
            key={`giant-dice-${lastSeenNonceRef.current}`}
            initial={{ opacity: 0, scale: 0.45 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px]"
          >
            <div
              className={`relative flex flex-col items-center justify-center px-12 py-8 rounded-3xl border-4 shadow-[0_25px_80px_rgba(0,0,0,0.95)] ${
                isSeven
                  ? 'bg-gradient-to-b from-red-950/95 via-[#1f0808]/95 to-black/95 border-red-500'
                  : 'bg-gradient-to-b from-[#23170d]/95 via-[#140d08]/95 to-[#090604]/95 border-[#d4af37]'
              }`}
            >
              <span className="text-xs sm:text-sm font-black uppercase tracking-[0.28em] text-amber-300/90 mb-2">
                {isSeven ? '¡Alerta de Bandidos!' : 'Tirada de Dados'}
              </span>

              {/* Giant Rolled Total */}
              <div
                className={`text-7xl sm:text-9xl font-black font-serif leading-none tracking-tight drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] ${
                  isSeven
                    ? 'text-red-400'
                    : diceSum === 6 || diceSum === 8
                    ? 'text-amber-300'
                    : 'text-amber-100'
                }`}
              >
                {diceSum}
              </div>

              {/* Individual 2D6 Die Faces Beneath */}
              <div className="flex items-center gap-4 mt-4">
                <DieFace value={giantDiceRoll[0]} />
                <span className="text-2xl font-black text-amber-400/80">+</span>
                <DieFace value={giantDiceRoll[1]} />
              </div>

              <div
                className={`mt-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider px-4 py-1 rounded-full ${
                  isSeven
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                }`}
              >
                {isSeven
                  ? '¡Salió un 7! Se activa el Ladrón'
                  : 'Recolectando recursos de los terrenos iluminados...'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. SLOW & CLEAR FLYING RESOURCE CARDS FROM PRODUCING HEXES TO LEFT PLAYER BOXES */}
      <AnimatePresence>
        {activeFlights.map((flight, idx) => {
          const meta = RESOURCE_META[flight.resource];
          const cardImg = RESOURCE_CARD_PATHS[flight.resource];
          const playerIndex = gameState.players.findIndex((p) => p.id === flight.playerId);
          const player = gameState.players[playerIndex];
          const playerColor = player ? PLAYER_COLORS[player.color]?.primary : '#fbbf24';

          // Compute exact starting screen position from producing hex coordinates
          const hex = gameState.board.hexes[flight.hexId];
          const startVw = hex ? Math.min(64, Math.max(22, 45 + (hex.center.x / 960) * 50)) : 45;
          const startVh = hex ? Math.min(68, Math.max(16, 42 + (hex.center.y / 840) * 58)) : 42;

          // Target screen position: directly toward player's box in the NEW LEFT PANEL
          const targetVw = 8.5; // Centered on the left player panel
          const targetVh = Math.min(82, 12 + Math.max(0, playerIndex) * 16.5);

          const midVw = startVw + (targetVw - startVw) * 0.42;
          const midVh = Math.min(startVh, targetVh) - 6;

          return (
            <motion.div
              key={flight.id}
              initial={{
                opacity: 0,
                scale: 0.5,
                left: `${startVw}vw`,
                top: `${startVh}vh`,
              }}
              animate={{
                opacity: [0, 1, 1, 1, 0],
                scale: [0.55, 1.15, 1.1, 0.95, 0.7],
                left: [`${startVw}vw`, `${midVw}vw`, `${midVw}vw`, `${targetVw}vw`, `${targetVw}vw`],
                top: [`${startVh}vh`, `${midVh}vh`, `${midVh}vh`, `${targetVh}vh`, `${targetVh}vh`],
              }}
              transition={{
                duration: lowEndPcMode ? 2.0 : 3.0,
                times: [0, 0.22, 0.55, 0.9, 1],
                delay: idx * 0.28,
                ease: 'easeInOut',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5 p-2 pr-3.5 rounded-2xl border-2 bg-[#140e0a]/95 shadow-[0_18px_40px_rgba(0,0,0,0.95)]"
              style={{ borderColor: playerColor }}
            >
              {/* Pixel-Perfect Miniature of the Actual Resource Card */}
              <div className="relative w-11 h-16 rounded-lg overflow-hidden border border-amber-300/60 shadow-md shrink-0">
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
                    → {player?.name || 'Jugador'}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 3. ROBBER VICTIM ALERT ("Te han colocado al ladrón") */}
      <AnimatePresence>
        {robberVictimAlert && (
          <motion.div
            key={`robber-victim-${lastSeenNonceRef.current}`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: lowEndPcMode ? 0 : [0, -14, 14, -10, 10, -6, 6, 0],
              y: lowEndPcMode ? 0 : [0, 8, -8, 5, -5, 3, -3, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(127,29,29,0.55)_0%,rgba(69,10,10,0.82)_100%)]"
          >
            <motion.div
              initial={{ scale: 0.65, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className="flex flex-col items-center text-center max-w-lg mx-4 px-10 py-8 rounded-3xl bg-gradient-to-b from-[#2b0909]/95 via-[#1a0505]/95 to-[#0d0202]/95 border-4 border-red-600 shadow-[0_0_90px_rgba(220,38,38,0.85)]"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-950 border-2 border-red-500 flex items-center justify-center text-4xl mb-3 shadow-lg">
                🦹
              </div>
              <h2 className="text-3xl sm:text-4xl font-black font-serif text-red-100 tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                Te han colocado al ladrón
              </h2>
              <p className="text-sm sm:text-base text-red-300 font-semibold mt-2">
                {robberVictimAlert.movedByName
                  ? `${robberVictimAlert.movedByName} ha bloqueado uno de tus terrenos productivos.`
                  : 'Uno de tus terrenos con poblado o ciudad ha sido bloqueado por el ladrón.'}
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
                ? '⚡ Descarte Aleatorio Automático (>7 cartas)'
                : '🗑️ Cartas Descartadas al salir 7'}
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

      {/* 5. ROBBER CARD STEAL ANIMATION */}
      <AnimatePresence>
        {activeSteal && (
          <motion.div
            key={activeSteal.id}
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/95 border-2 border-purple-500/80 px-5 py-3 rounded-2xl shadow-2xl"
          >
            <span className="text-2xl">🦹</span>
            <div className="text-xs sm:text-sm">
              <div className="font-bold text-purple-200">
                {gameState.players.find((p) => p.id === activeSteal.thiefId)?.name} robó 1 carta a{' '}
                {gameState.players.find((p) => p.id === activeSteal.victimId)?.name}
              </div>
              {(currentPlayerId === activeSteal.thiefId ||
                currentPlayerId === activeSteal.victimId) && (
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold mt-0.5">
                  <span>Carta robada:</span>
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

const DieFace: React.FC<{ value: number }> = ({ value }) => {
  return (
    <motion.div
      initial={{ rotateX: 180, rotateZ: -90 }}
      animate={{ rotateX: 0, rotateZ: 0 }}
      transition={{ duration: 0.45, type: 'spring' }}
      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-amber-50 border-2 border-amber-600 shadow-inner flex items-center justify-center text-2xl sm:text-3xl font-black text-slate-900"
    >
      {value}
    </motion.div>
  );
};
