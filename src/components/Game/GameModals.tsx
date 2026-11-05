import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Anchor,
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Check,
  Dices,
  Flame,
  HandCoins,
  PauseCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  ALL_RESOURCES,
  BUILDING_COSTS,
  countTotalResources,
  createEmptyResources,
  PLAYER_COLORS,
  RESOURCE_META,
} from '../../shared/constants';
import {
  DevCard,
  GameAction,
  GameState,
  PlayerState,
  PortType,
  ResourceType,
  TradeOffer,
} from '../../shared/types';
import {
  canBuyDevCard,
  canTradeThisTurn,
  getPlayerBankTradeRatios,
  hasResources,
} from '../../shared/engine/RulesEngine';
import { ResourceIcon } from '../UI/ResourceIcon';

const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalCardVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 24 },
  },
  exit: { opacity: 0, scale: 0.92, y: 12, transition: { duration: 0.18 } },
};

// 0. PHASE FOR CHOOSING TURN ORDER ("FASE DE ORDEN DE SALIDA")
export const TurnOrderModal: React.FC<{
  gameState: GameState;
  me: PlayerState;
  dispatchAction: (action: GameAction) => void;
}> = ({ gameState, me, dispatchAction }) => {
  const orderRolls = gameState.turn.orderRolls || {};
  const myRoll = orderRolls[me.id];
  const allRolled = gameState.players.every((p) => Boolean(orderRolls[p.id]));

  const movePlayer = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= gameState.players.length) return;
    const ids = gameState.players.map((p) => p.id);
    const temp = ids[index];
    ids[index] = ids[targetIdx];
    ids[targetIdx] = temp;
    dispatchAction({ type: 'SET_CUSTOM_PLAYER_ORDER', playerIds: ids });
  };

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <motion.div
        variants={modalCardVariants}
        className="w-full max-w-2xl bg-gradient-to-b from-[#231911] to-[#120d09] border-2 border-[#d4af37]/65 rounded-3xl p-6 shadow-[0_25px_90px_rgba(0,0,0,0.95)] space-y-5 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-[#d4af37]/50 flex items-center justify-center text-amber-300 shadow-inner">
              <Dices className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                Fase Preliminar de Partida
              </span>
              <h2 className="font-display text-xl font-black text-amber-100">
                Decidir el Orden de Turno
              </h2>
              <p className="text-xs text-stone-400">
                Lanzad los dados de iniciativa o ajusta manualmente el orden antes de colocar los
                primeros poblados.
              </p>
            </div>
          </div>
        </div>

        {/* My Initiative Roll Call-To-Action */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1a120b] via-[#261a10] to-[#1a120b] border border-[#d4af37]/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{me.avatar}</span>
            <div>
              <div className="text-sm font-extrabold text-amber-100">
                Tu Tirada de Iniciativa ({me.name})
              </div>
              <div className="text-xs text-stone-400">
                {myRoll
                  ? `Has sacado un ${myRoll[0] + myRoll[1]} (${myRoll[0]} + ${myRoll[1]})`
                  : 'Lanza tus 2 dados para determinar tu puesto en la cola de salida'}
              </div>
            </div>
          </div>

          {!myRoll ? (
            <button
              type="button"
              onClick={() => dispatchAction({ type: 'ROLL_FOR_ORDER' })}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-sm flex items-center gap-2 shadow-xl animate-pulse cursor-pointer"
            >
              <Dices className="w-5 h-5" />
              <span>¡Lanzar mis Dados!</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-200 font-black text-base">
              <span>🎲 {myRoll[0]}</span>
              <span>+</span>
              <span>🎲 {myRoll[1]}</span>
              <span className="ml-1 px-2 py-0.5 rounded-lg bg-amber-400 text-stone-950 text-sm">
                = {myRoll[0] + myRoll[1]}
              </span>
            </div>
          )}
        </div>

        {/* Live Ranking & Host Reorder List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-amber-300/90 px-1">
            <span>Orden Actual de Jugadores (1º a {gameState.players.length}º)</span>
            {me.isHost && (
              <span className="text-[11px] text-stone-400 font-normal">
                Como anfitrión puedes usar ↑ / ↓ para elegir el orden a tu gusto
              </span>
            )}
          </div>

          <div className="space-y-2">
            {gameState.players.map((p, idx) => {
              const colorCfg = PLAYER_COLORS[p.color];
              const roll = orderRolls[p.id];
              const sum = roll ? roll[0] + roll[1] : null;

              return (
                <motion.div
                  layout
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                    idx === 0
                      ? 'bg-[#281c12] border-[#d4af37] shadow-lg'
                      : 'bg-[#140e0a] border-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl font-display font-black text-sm flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-400 text-stone-950 shadow'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {idx + 1}º
                    </div>

                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2 shadow"
                      style={{
                        backgroundColor: colorCfg.primary,
                        borderColor: colorCfg.stroke,
                      }}
                    >
                      {p.avatar}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-amber-100">{p.name}</span>
                        {p.id === me.id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                            Tú
                          </span>
                        )}
                        {idx === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/40 text-amber-200 font-extrabold">
                            👑 Sale Primero
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {p.isBot ? '🤖 Bot IA' : 'Jugador Humano'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Initiative Dice Badge */}
                    {roll ? (
                      <div className="px-3 py-1.5 rounded-xl bg-[#0d0906] border border-[#d4af37]/40 text-xs font-bold text-amber-200 flex items-center gap-1.5">
                        <span>
                          🎲 {roll[0]} + {roll[1]} =
                        </span>
                        <strong className="text-sm font-black text-amber-400">{sum}</strong>
                      </div>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-400">
                        ⏳ Sin lanzar...
                      </span>
                    )}

                    {/* Host Manual Up/Down Order Controls */}
                    {me.isHost && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePlayer(idx, -1)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-amber-200 cursor-pointer"
                          title="Subir puesto"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === gameState.players.length - 1}
                          onClick={() => movePlayer(idx, 1)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-amber-200 cursor-pointer"
                          title="Bajar puesto"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Visual Snake Draft Preview */}
        <div className="p-3.5 rounded-2xl bg-[#140e0a] border border-[#d4af37]/25 space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300/90">
            🐍 Vista Previa de Colocación Inicial (Snake Draft Ida y Vuelta):
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {gameState.players.map((p, i) => (
              <React.Fragment key={`r1_${p.id}`}>
                <span className="px-2 py-1 rounded-lg bg-stone-900 border border-stone-700 text-amber-100 font-bold">
                  {i + 1}º {p.avatar} {p.name}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
              </React.Fragment>
            ))}
            {[...gameState.players].reverse().map((p, i) => (
              <React.Fragment key={`r2_${p.id}`}>
                <span className="px-2 py-1 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-200 font-bold">
                  Vuelta {p.avatar} {p.name}
                </span>
                {i < gameState.players.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Host Action Footer */}
        {me.isHost ? (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => dispatchAction({ type: 'AUTO_ROLL_ALL_ORDER' })}
              className="px-4 py-3 rounded-2xl bg-[#261a11] hover:bg-[#332317] border border-[#d4af37]/50 text-amber-200 font-extrabold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Dices className="w-4 h-4 text-amber-400" />
              <span>{allRolled ? 'Volver a Sortear Orden' : 'Tirar Dados por Todos'}</span>
            </button>

            <button
              type="button"
              onClick={() => dispatchAction({ type: 'CONFIRM_TURN_ORDER' })}
              className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <Check className="w-5 h-5" />
              <span>Confirmar Orden y Empezar Partida</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-2.5 px-4 rounded-2xl bg-[#140e0a] border border-stone-800 text-xs text-stone-300">
            ⏳ Esperando a que el anfitrión confirme el orden de salida para empezar a colocar
            poblados...
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// 0.5 FLOATING LIVE TRADE BANNER ON THE TABLETOP (1-CLICK ACCEPT / COUNTER / REJECT)
export const ActiveTradeFloatingBanner: React.FC<{
  gameState: GameState;
  me: PlayerState;
  dispatchAction: (action: GameAction) => void;
  onOpenCounterOffer: () => void;
}> = ({ gameState, me, dispatchAction, onOpenCounterOffer }) => {
  if (gameState.activeTradeOffers.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 z-25 max-w-xl w-full space-y-2 pointer-events-auto">
      <AnimatePresence>
        {gameState.activeTradeOffers.map((tOffer) => {
          const sender = gameState.players.find((p) => p.id === tOffer.fromPlayerId);
          const isMine = tOffer.fromPlayerId === me.id;
          const canAfford = hasResources(me.resources, tOffer.request);
          const myStatus = tOffer.responses[me.id];

          return (
            <motion.div
              key={tOffer.id}
              initial={{ opacity: 0, y: -18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              className="p-3.5 rounded-2xl bg-[#1a120b]/95 backdrop-blur-xl border-2 border-[#d4af37] shadow-[0_15px_40px_rgba(0,0,0,0.85)] space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sender?.avatar}</span>
                  <span className="text-xs font-black text-amber-100">
                    {isMine ? 'Tu Oferta Activa en la Mesa' : `${sender?.name} propone un cambio:`}
                  </span>
                </div>
                {isMine && (
                  <button
                    type="button"
                    onClick={() =>
                      dispatchAction({ type: 'CANCEL_TRADE_OFFER', offerId: tOffer.id })
                    }
                    className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-[11px] font-bold cursor-pointer"
                  >
                    ✕ Cancelar
                  </button>
                )}
              </div>

              {/* Visual Cards Offered vs Requested */}
              <div className="flex items-center justify-between gap-2 bg-[#110c08] p-2.5 rounded-xl border border-[#d4af37]/30">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-400 mr-1">
                    Da:
                  </span>
                  {ALL_RESOURCES.map(
                    (r) =>
                      tOffer.offer[r] > 0 && (
                        <span
                          key={r}
                          className="px-2 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-100 text-xs font-black flex items-center gap-1"
                        >
                          <span>{tOffer.offer[r]}x</span>
                          <span>{RESOURCE_META[r].emoji}</span>
                          <span className="text-[10px]">{RESOURCE_META[r].name}</span>
                        </span>
                      )
                  )}
                </div>

                <ArrowLeftRight className="w-4 h-4 text-amber-400 shrink-0" />

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase text-amber-400 mr-1">
                    Pide:
                  </span>
                  {ALL_RESOURCES.map(
                    (r) =>
                      tOffer.request[r] > 0 && (
                        <span
                          key={r}
                          className="px-2 py-1 rounded-lg bg-amber-950/90 border border-amber-500/50 text-amber-100 text-xs font-black flex items-center gap-1"
                        >
                          <span>{tOffer.request[r]}x</span>
                          <span>{RESOURCE_META[r].emoji}</span>
                          <span className="text-[10px]">{RESOURCE_META[r].name}</span>
                        </span>
                      )
                  )}
                </div>
              </div>

              {/* Direct 1-Click Actions */}
              {!isMine ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canAfford || myStatus === 'ACCEPTED'}
                    onClick={() =>
                      dispatchAction({
                        type: 'RESPOND_TRADE_OFFER',
                        offerId: tOffer.id,
                        response: 'ACCEPT',
                      })
                    }
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition ${
                      myStatus === 'ACCEPTED'
                        ? 'bg-emerald-800 text-emerald-200 cursor-default'
                        : canAfford
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-stone-950 shadow cursor-pointer'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {myStatus === 'ACCEPTED'
                      ? '✓ Aceptada (Esperando cierre)'
                      : canAfford
                      ? '✓ Aceptar Cambio Ahora'
                      : 'Te faltan esos recursos'}
                  </button>

                  <button
                    type="button"
                    onClick={onOpenCounterOffer}
                    className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer"
                  >
                    ⇄ Negociar
                  </button>

                  {myStatus !== 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() =>
                        dispatchAction({
                          type: 'RESPOND_TRADE_OFFER',
                          offerId: tOffer.id,
                          response: 'REJECT',
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-200 text-xs font-bold cursor-pointer"
                    >
                      ✕ No
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {Object.entries(tOffer.responses).map(([pId, status]) => {
                    const partner = gameState.players.find((pl) => pl.id === pId);
                    if (!partner) return null;
                    return (
                      <div
                        key={pId}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#110c08] border border-stone-800 text-xs"
                      >
                        <span>
                          {partner.avatar} {partner.name}:
                        </span>
                        {status === 'ACCEPTED' ? (
                          <button
                            type="button"
                            onClick={() =>
                              dispatchAction({
                                type: 'EXECUTE_TRADE_OFFER',
                                offerId: tOffer.id,
                                partnerPlayerId: pId,
                              })
                            }
                            className="px-2.5 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black cursor-pointer animate-pulse"
                          >
                            ✓ Cerrar Trato
                          </button>
                        ) : status === 'REJECTED' ? (
                          <span className="text-red-400 font-bold">✕ Rechazó</span>
                        ) : (
                          <span className="text-stone-400">⏳ Pensando...</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// 1. MANDATORY ROBBER DISCARD MODAL (MANUAL MODE - VISUAL CLICKABLE CARDS)
export const RobberDiscardModal: React.FC<{
  me: PlayerState;
  onDiscard: (resources: Record<ResourceType, number>) => void;
}> = ({ me, onDiscard }) => {
  const [selected, setSelected] = useState<Record<ResourceType, number>>(createEmptyResources);
  const currentSum = countTotalResources(selected);
  const target = me.mustDiscardCount;

  const adjust = (res: ResourceType, delta: number) => {
    setSelected((prev) => {
      const nextVal = prev[res] + delta;
      if (nextVal < 0 || nextVal > me.resources[res]) return prev;
      if (delta > 0 && currentSum >= target) return prev;
      return { ...prev, [res]: nextVal };
    });
  };

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <motion.div
        variants={modalCardVariants}
        className="w-full max-w-lg bg-gradient-to-b from-[#1f1610] to-[#120d0a] border-2 border-red-500/70 rounded-3xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9)] space-y-5"
      >
        <div className="flex items-center gap-3 text-red-400">
          <ShieldAlert className="w-7 h-7 shrink-0" />
          <div>
            <h3 className="font-display text-lg font-extrabold text-amber-100">
              ¡Salió un 7! Tributo al Ladrón
            </h3>
            <p className="text-xs text-stone-300">
              Tienes más de 7 cartas en mano. Haz clic en tus cartas para seleccionar{' '}
              <strong className="text-red-400">{target} cartas</strong> a descartar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {ALL_RESOURCES.map((res) => {
            const owned = me.resources[res];
            const picked = selected[res];
            const meta = RESOURCE_META[res];
            return (
              <div
                key={res}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between gap-2 ${
                  picked > 0
                    ? 'bg-red-950/50 border-red-400 text-amber-100'
                    : 'bg-[#140e0a] border-stone-800 text-stone-300'
                }`}
              >
                <span className="text-2xl">{meta.emoji}</span>
                <div className="text-xs font-bold">{meta.name}</div>
                <div className="text-[10px] text-stone-400">Tienes: {owned}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => adjust(res, -1)}
                    disabled={picked <= 0}
                    className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 font-black text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-mono text-sm font-black text-red-300">
                    {picked}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjust(res, 1)}
                    disabled={picked >= owned || currentSum >= target}
                    className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 font-black text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={currentSum !== target}
          onClick={() => onDiscard(selected)}
          className={`w-full py-3 rounded-2xl font-extrabold text-sm transition cursor-pointer ${
            currentSum === target
              ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
        >
          Confirmar Descarte ({currentSum}/{target})
        </button>
      </motion.div>
    </motion.div>
  );
};

// 2. ROBBER STEAL VICTIM SELECTOR MODAL
export const RobberStealModal: React.FC<{
  candidates: PlayerState[];
  onSelectVictim: (victimId: string) => void;
}> = ({ candidates, onSelectVictim }) => {
  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <motion.div
        variants={modalCardVariants}
        className="w-full max-w-md bg-gradient-to-b from-[#1f1610] to-[#120d0a] border-2 border-[#d4af37]/55 rounded-3xl p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center gap-2.5 text-amber-300">
          <span className="text-2xl">🦹</span>
          <div>
            <h3 className="font-display text-base font-extrabold text-amber-100">
              Saqueo del Ladrón
            </h3>
            <p className="text-xs text-stone-400">
              Elige a qué jugador con asentamientos en este terreno deseas robarle 1 recurso al azar:
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {candidates.map((victim) => {
            const colorCfg = PLAYER_COLORS[victim.color];
            const totalCards = countTotalResources(victim.resources);
            return (
              <button
                key={victim.id}
                type="button"
                onClick={() => onSelectVictim(victim.id)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#140e0a] hover:bg-[#241911] border border-[#d4af37]/30 hover:border-[#d4af37] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2"
                    style={{
                      backgroundColor: colorCfg.primary,
                      borderColor: colorCfg.stroke,
                    }}
                  >
                    {victim.avatar}
                  </span>
                  <div className="text-left">
                    <div className="text-sm font-bold text-amber-100">{victim.name}</div>
                    <div className="text-xs text-stone-400">
                      {totalCards} cartas de recurso en mano
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-amber-600 text-stone-950 text-xs font-extrabold">
                  Robar 1 Carta
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

// 3. VISUAL & EASY INTERACTIVE TRADE & "QUEMAR CARTAS" (BANK/PORTS) MODAL
export const TradeModal: React.FC<{
  gameState: GameState;
  me: PlayerState;
  initialTab?: 'PLAYERS' | 'BANK';
  onClose: () => void;
  dispatchAction: (action: GameAction) => void;
}> = ({ gameState, me, initialTab = 'BANK', onClose, dispatchAction }) => {
  const [tab, setTab] = useState<'PLAYERS' | 'BANK'>(initialTab);
  const [offer, setOffer] = useState<Record<ResourceType, number>>(createEmptyResources);
  const [request, setRequest] = useState<Record<ResourceType, number>>(createEmptyResources);
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  const [parentOfferId, setParentOfferId] = useState<string | undefined>(undefined);

  // Maritime Bank / Port trade ("Quemar Cartas") states
  const [giveRes, setGiveRes] = useState<ResourceType>('WOOD');
  const [receiveRes, setReceiveRes] = useState<ResourceType>('WHEAT');
  const [receiveMultiple, setReceiveMultiple] = useState<number>(1);

  const ratios = getPlayerBankTradeRatios(gameState, me.id);
  const tradePermission = canTradeThisTurn(gameState, me.id);
  const isMyTurn = gameState.turn.activePlayerId === me.id;

  // Detect all ports owned by this player on the board
  const ownedPorts = React.useMemo(() => {
    const found = new Set<PortType>();
    for (const v of Object.values(gameState.board.vertices)) {
      if (v.playerId === me.id && v.building !== null && v.port) {
        found.add(v.port.type);
      }
    }
    return Array.from(found);
  }, [gameState.board.vertices, me.id]);

  // Add/Remove 1 card by clicking directly on visual cards!
  const addOfferCard = (res: ResourceType) => {
    setOffer((prev) => {
      if (prev[res] >= me.resources[res]) return prev;
      return { ...prev, [res]: prev[res] + 1 };
    });
  };

  const removeOfferCard = (res: ResourceType) => {
    setOffer((prev) => {
      if (prev[res] <= 0) return prev;
      return { ...prev, [res]: prev[res] - 1 };
    });
  };

  const addRequestCard = (res: ResourceType) => {
    setRequest((prev) => {
      if (prev[res] >= 19) return prev;
      return { ...prev, [res]: prev[res] + 1 };
    });
  };

  const removeRequestCard = (res: ResourceType) => {
    setRequest((prev) => {
      if (prev[res] <= 0) return prev;
      return { ...prev, [res]: prev[res] - 1 };
    });
  };

  const handleSendPlayerOffer = () => {
    dispatchAction({
      type: 'CREATE_TRADE_OFFER',
      targetPlayerId,
      offer,
      request,
      parentOfferId,
    });
    setOffer(createEmptyResources());
    setRequest(createEmptyResources());
    setParentOfferId(undefined);
    onClose();
  };

  const handlePrepareCounterOffer = (existingOffer: TradeOffer) => {
    const counterGive = createEmptyResources();
    for (const r of ALL_RESOURCES) {
      counterGive[r] = Math.min(me.resources[r], existingOffer.request[r] || 0);
    }
    setOffer(counterGive);
    setRequest({ ...existingOffer.offer });
    setTargetPlayerId(existingOffer.fromPlayerId);
    setParentOfferId(existingOffer.id);
    setTab('PLAYERS');
  };

  const requiredGiveAmount = ratios[giveRes] * receiveMultiple;
  const canExecuteBankTrade =
    tradePermission.allowed &&
    giveRes !== receiveRes &&
    me.resources[giveRes] >= requiredGiveAmount &&
    gameState.bank[receiveRes] >= receiveMultiple;

  const handleBankTrade = () => {
    if (!canExecuteBankTrade) return;
    dispatchAction({
      type: 'BANK_TRADE',
      giveResource: giveRes,
      giveAmount: requiredGiveAmount,
      receiveResource: receiveRes,
      receiveAmount: receiveMultiple,
    });
  };

  const otherPlayers = gameState.players.filter((p) => p.id !== me.id);

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <motion.div
        variants={modalCardVariants}
        className="w-full max-w-3xl bg-gradient-to-b from-[#231911] to-[#120d09] border-2 border-[#d4af37]/55 rounded-3xl p-6 shadow-[0_25px_90px_rgba(0,0,0,0.94)] space-y-5 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-[#d4af37]/50 flex items-center justify-center text-amber-300">
              <Flame className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-amber-100">
                Quemar Cartas (Banca/Puertos) y Comercio entre Jugadores
              </h3>
              <p className="text-xs text-stone-400">
                Quema recursos con la Banca (4:1 o Puertos 3:1 / 2:1) o negocia directamente con otros jugadores.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-amber-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* House Rule Restriction Warning */}
        {isMyTurn && !tradePermission.allowed && (
          <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{tradePermission.reason}</span>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#120c08] p-1.5 rounded-2xl border border-[#d4af37]/25">
          <button
            type="button"
            onClick={() => setTab('BANK')}
            className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
              tab === 'BANK'
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-amber-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>🔥 Quemar Cartas (Banca 4:1 / Puertos 3:1 y 2:1)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('PLAYERS')}
            className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
              tab === 'PLAYERS'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-amber-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>🤝 Comerciar con Jugadores ({gameState.activeTradeOffers.length})</span>
          </button>
        </div>

        {tab === 'PLAYERS' ? (
          /* TAB 1: VISUAL PLAYER-TO-PLAYER TRADE */
          <div className="space-y-5">
            {/* Active Offers on Table */}
            {gameState.activeTradeOffers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Ofertas Activas ahora mismo:
                </h4>
                {gameState.activeTradeOffers.map((tOffer) => {
                  const sender = gameState.players.find((p) => p.id === tOffer.fromPlayerId);
                  const isMine = tOffer.fromPlayerId === me.id;
                  const canAfford = hasResources(me.resources, tOffer.request);

                  return (
                    <div
                      key={tOffer.id}
                      className="p-3.5 rounded-2xl bg-[#140e0a] border border-[#d4af37]/40 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{sender?.avatar}</span>
                        <div>
                          <div className="text-xs font-bold text-amber-100">{sender?.name}</div>
                          <div className="text-[10px] text-stone-400">
                            {tOffer.parentOfferId ? 'Contraoferta' : 'Oferta abierta'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-bold text-emerald-200">
                          <span>Da:</span>
                          {ALL_RESOURCES.map(
                            (r) =>
                              tOffer.offer[r] > 0 && (
                                <span key={r}>
                                  {tOffer.offer[r]}
                                  {RESOURCE_META[r].emoji}
                                </span>
                              )
                          )}
                        </div>
                        <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs font-bold text-amber-200">
                          <span>Pide:</span>
                          {ALL_RESOURCES.map(
                            (r) =>
                              tOffer.request[r] > 0 && (
                                <span key={r}>
                                  {tOffer.request[r]}
                                  {RESOURCE_META[r].emoji}
                                </span>
                              )
                          )}
                        </div>
                      </div>

                      {!isMine ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() =>
                              dispatchAction({
                                type: 'RESPOND_TRADE_OFFER',
                                offerId: tOffer.id,
                                response: 'ACCEPT',
                              })
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${
                              canAfford
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 cursor-pointer'
                                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                            }`}
                          >
                            ✓ Aceptar
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrepareCounterOffer(tOffer)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer"
                          >
                            Contraofertar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            dispatchAction({
                              type: 'CANCEL_TRADE_OFFER',
                              offerId: tOffer.id,
                            })
                          }
                          className="text-xs text-red-400 hover:underline cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Visual Two-Tray Trade Builder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LEFT TRAY: WHAT I GIVE (FROM MY HAND) */}
              <div className="p-4 rounded-2xl bg-[#140e0a] border-2 border-emerald-500/35 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    📤 1. QUÉ DOY (Haz clic en tu mano)
                  </span>
                  {countTotalResources(offer) > 0 && (
                    <button
                      type="button"
                      onClick={() => setOffer(createEmptyResources())}
                      className="text-[11px] text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Limpiar
                    </button>
                  )}
                </div>

                {/* Selected Cards on the Offer Tray */}
                <div className="min-h-[68px] p-2.5 rounded-xl bg-[#0c0806] border border-emerald-500/25 flex items-center justify-center flex-wrap gap-2">
                  {countTotalResources(offer) === 0 ? (
                    <span className="text-xs text-stone-500">
                      Toca las cartas de abajo para añadir lo que entregas...
                    </span>
                  ) : (
                    ALL_RESOURCES.map(
                      (r) =>
                        offer[r] > 0 && (
                          <button
                            key={r}
                            type="button"
                            onClick={() => removeOfferCard(r)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-900/70 hover:bg-red-900/70 border border-emerald-400 text-emerald-100 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer transition"
                            title="Haz clic para quitar 1"
                          >
                            <span className="text-base">{RESOURCE_META[r].emoji}</span>
                            <span>
                              {offer[r]}x {RESOURCE_META[r].name}
                            </span>
                            <span className="text-[10px] opacity-75">✕</span>
                          </button>
                        )
                    )
                  )}
                </div>

                {/* Clickable Hand Resource Cards */}
                <div className="grid grid-cols-5 gap-1.5">
                  {ALL_RESOURCES.map((r) => {
                    const remainingInHand = me.resources[r] - offer[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={remainingInHand <= 0}
                        onClick={() => addOfferCard(r)}
                        className={`p-2 rounded-xl border text-center transition flex flex-col items-center ${
                          remainingInHand > 0
                            ? 'bg-[#1f1610] hover:bg-emerald-950/60 border-[#d4af37]/40 hover:border-emerald-400 text-amber-100 cursor-pointer shadow'
                            : 'bg-stone-900/40 border-stone-800/60 text-stone-600 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-xl">{RESOURCE_META[r].emoji}</span>
                        <span className="text-[10px] font-bold mt-0.5">{RESOURCE_META[r].name}</span>
                        <span className="text-[10px] font-mono font-black text-emerald-300 mt-0.5">
                          Disp: {remainingInHand}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT TRAY: WHAT I WANT IN RETURN */}
              <div className="p-4 rounded-2xl bg-[#140e0a] border-2 border-amber-500/35 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    📥 2. QUÉ PIDO (Haz clic para pedir)
                  </span>
                  {countTotalResources(request) > 0 && (
                    <button
                      type="button"
                      onClick={() => setRequest(createEmptyResources())}
                      className="text-[11px] text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Limpiar
                    </button>
                  )}
                </div>

                {/* Selected Cards on the Request Tray */}
                <div className="min-h-[68px] p-2.5 rounded-xl bg-[#0c0806] border border-amber-500/25 flex items-center justify-center flex-wrap gap-2">
                  {countTotalResources(request) === 0 ? (
                    <span className="text-xs text-stone-500">
                      Toca los recursos de abajo para pedir a cambio...
                    </span>
                  ) : (
                    ALL_RESOURCES.map(
                      (r) =>
                        request[r] > 0 && (
                          <button
                            key={r}
                            type="button"
                            onClick={() => removeRequestCard(r)}
                            className="px-3 py-1.5 rounded-xl bg-amber-900/70 hover:bg-red-900/70 border border-amber-400 text-amber-100 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer transition"
                            title="Haz clic para quitar 1"
                          >
                            <span className="text-base">{RESOURCE_META[r].emoji}</span>
                            <span>
                              {request[r]}x {RESOURCE_META[r].name}
                            </span>
                            <span className="text-[10px] opacity-75">✕</span>
                          </button>
                        )
                    )
                  )}
                </div>

                {/* Clickable Desired Resource Cards */}
                <div className="grid grid-cols-5 gap-1.5">
                  {ALL_RESOURCES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => addRequestCard(r)}
                      className="p-2 rounded-xl border bg-[#1f1610] hover:bg-amber-950/60 border-[#d4af37]/40 hover:border-amber-400 text-amber-100 text-center transition flex flex-col items-center cursor-pointer shadow"
                    >
                      <span className="text-xl">{RESOURCE_META[r].emoji}</span>
                      <span className="text-[10px] font-bold mt-0.5">{RESOURCE_META[r].name}</span>
                      <span className="text-[10px] font-black text-amber-400 mt-0.5">+ Pedir 1</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recipient Player Filter (All or Specific Player) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#140e0a] border border-stone-800">
              <span className="text-xs font-bold text-stone-300">🎯 Dirigir oferta a:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetPlayerId(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    targetPlayerId === null
                      ? 'bg-amber-500 text-stone-950 font-black'
                      : 'bg-stone-900 text-stone-400 hover:text-white'
                  }`}
                >
                  🌍 Todos los Jugadores
                </button>
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTargetPlayerId(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      targetPlayerId === p.id
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'bg-stone-900 text-stone-300 hover:text-white'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Offer Button */}
            <button
              type="button"
              disabled={
                countTotalResources(offer) === 0 ||
                countTotalResources(request) === 0 ||
                (!parentOfferId && !tradePermission.allowed)
              }
              onClick={handleSendPlayerOffer}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-500 text-stone-950 font-black text-sm shadow-xl transition cursor-pointer"
            >
              {parentOfferId
                ? '⇄ Enviar Contraoferta a la Mesa'
                : '🤝 Publicar Oferta en la Mesa (Aparecerá a todos)'}
            </button>
          </div>
        ) : (
          /* TAB 2: VISUAL "QUEMAR CARTAS" (MARITIME PORTS & BANK EXCHANGE) */
          <div className="space-y-4">
            {/* Active Ports Banner */}
            <div className="p-3.5 rounded-2xl bg-[#140e0a] border border-[#d4af37]/30 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Anchor className="w-4 h-4" />
                <span>Tus Tasas para Quemar Cartas (Banca / Puertos):</span>
              </span>
              {ownedPorts.length === 0 ? (
                <span className="text-xs text-stone-400">
                  Sin puertos costeros aún (Quema estándar 4:1 con la Banca)
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {ownedPorts.map((pt) => (
                    <span
                      key={pt}
                      className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-extrabold"
                    >
                      {pt === 'GENERIC'
                        ? '⚓ Puerto General 3:1'
                        : `${RESOURCE_META[pt].emoji} Puerto ${RESOURCE_META[pt].name} 2:1`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Step 1: Click Resource Card to Burn */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-orange-400">
                1. Elige qué recurso de tu mano quieres QUEMAR:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {ALL_RESOURCES.map((r) => {
                  const needed = ratios[r] * receiveMultiple;
                  const canAfford = me.resources[r] >= needed;
                  const isSelected = giveRes === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setGiveRes(r)}
                      className={`p-3 rounded-2xl border-2 text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-orange-950/60 border-orange-400 text-amber-100 shadow-lg scale-[1.02]'
                          : 'bg-[#140e0a] border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <ResourceIcon resource={r} size={30} />
                      <span className="text-xs font-bold">{RESOURCE_META[r].name}</span>
                      <span className="text-[11px] text-stone-400">Tienes: {me.resources[r]}</span>
                      <span
                        className={`mt-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          canAfford
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                            : 'bg-stone-900 text-stone-500'
                        }`}
                      >
                        Quemas {needed} ({ratios[r]}:1)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Click Resource Card to Receive */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-amber-400">
                  2. Elige qué recurso quieres recibir de la Banca:
                </label>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-stone-400">Cantidad a recibir:</span>
                  {[1, 2, 3].map((mult) => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setReceiveMultiple(mult)}
                      className={`px-2.5 py-1 rounded-lg font-black cursor-pointer ${
                        receiveMultiple === mult
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      +{mult}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {ALL_RESOURCES.map((r) => {
                  const isSelected = receiveRes === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReceiveRes(r)}
                      className={`p-3 rounded-2xl border-2 text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/60 border-amber-400 text-amber-100 shadow-lg scale-[1.02]'
                          : 'bg-[#140e0a] border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <ResourceIcon resource={r} size={30} />
                      <span className="text-xs font-bold">{RESOURCE_META[r].name}</span>
                      <span className="text-[11px] text-amber-300 font-black">
                        Recibes +{receiveMultiple}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        Banca: {gameState.bank[r]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Burn Summary & Execute Button */}
            <button
              type="button"
              disabled={!canExecuteBankTrade}
              onClick={handleBankTrade}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition cursor-pointer ${
                canExecuteBankTrade
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-600 hover:from-orange-400 hover:to-yellow-500 text-stone-950 shadow-xl'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>
                Quemar {requiredGiveAmount} {RESOURCE_META[giveRes].name} ({ratios[giveRes]}:1)
              </span>
              <ArrowRight className="w-4 h-4" />
              <span>
                Recibir +{receiveMultiple} {RESOURCE_META[receiveRes].name} Ahora
              </span>
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// 4. VISUAL DEVELOPMENT CARDS ("CARTAS DE DESARROLLO") MODAL
export const DevCardModal: React.FC<{
  gameState: GameState;
  me: PlayerState;
  onClose: () => void;
  dispatchAction: (action: GameAction) => void;
}> = ({ gameState, me, onClose, dispatchAction }) => {
  const [selectedCard, setSelectedCard] = useState<DevCard | null>(null);
  const [monopolyRes, setMonopolyRes] = useState<ResourceType>('WHEAT');
  const [plentyRes1, setPlentyRes1] = useState<ResourceType>('WHEAT');
  const [plentyRes2, setPlentyRes2] = useState<ResourceType>('ORE');
  const [justBoughtCount, setJustBoughtCount] = useState<number>(0);

  const unplayedCards = me.devCards.filter((c) => !c.played);
  const buyCheck = canBuyDevCard(gameState, me.id);

  const handleBuyDevCard = () => {
    if (!buyCheck.allowed) return;
    dispatchAction({ type: 'BUY_DEV_CARD' });
    setJustBoughtCount((c) => c + 1);
  };

  const handlePlayCard = (card: DevCard) => {
    if (card.type === 'KNIGHT' || card.type === 'ROAD_BUILDING') {
      dispatchAction({ type: 'PLAY_DEV_CARD', cardId: card.id });
      onClose();
    } else {
      setSelectedCard(card);
    }
  };

  const handleConfirmSpecialCard = () => {
    if (!selectedCard) return;
    if (selectedCard.type === 'MONOPOLY') {
      dispatchAction({
        type: 'PLAY_DEV_CARD',
        cardId: selectedCard.id,
        monopolyResource: monopolyRes,
      });
    } else if (selectedCard.type === 'YEAR_OF_PLENTY') {
      dispatchAction({
        type: 'PLAY_DEV_CARD',
        cardId: selectedCard.id,
        yearOfPlentyResources: [plentyRes1, plentyRes2],
      });
    }
    onClose();
  };

  const cardArt: Record<
    string,
    { icon: string; badge: string; desc: string; border: string; bg: string }
  > = {
    KNIGHT: {
      icon: '⚔️',
      badge: 'Ejército de Caballería',
      desc: 'Mueve el Ladrón a cualquier terreno y roba 1 recurso al azar a un jugador adyacente.',
      border: 'border-red-500/50',
      bg: 'from-red-950/50 to-[#140e0a]',
    },
    VICTORY_POINT: {
      icon: '🏛️',
      badge: '+1 Punto de Victoria',
      desc: 'Se mantiene oculto en tu mano y se suma automáticamente para darte la victoria en tu turno.',
      border: 'border-amber-400/60',
      bg: 'from-amber-950/50 to-[#140e0a]',
    },
    ROAD_BUILDING: {
      icon: '🛣️',
      badge: 'Progreso: Infraestructura',
      desc: 'Coloca inmediatamente 2 carreteras gratis en el tablero.',
      border: 'border-emerald-500/50',
      bg: 'from-emerald-950/50 to-[#140e0a]',
    },
    YEAR_OF_PLENTY: {
      icon: '🏺',
      badge: 'Progreso: Invento / Abundancia',
      desc: 'Toma inmediatamente 2 cartas de recursos cualesquiera de la banca.',
      border: 'border-sky-500/50',
      bg: 'from-sky-950/50 to-[#140e0a]',
    },
    MONOPOLY: {
      icon: '👑',
      badge: 'Progreso: Decreto Real',
      desc: 'Elige 1 recurso; todos los demás jugadores te entregan todas sus cartas de ese tipo.',
      border: 'border-purple-500/50',
      bg: 'from-purple-950/50 to-[#140e0a]',
    },
  };

  const devCardRecipe: ResourceType[] = ['SHEEP', 'WHEAT', 'ORE'];

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <motion.div
        variants={modalCardVariants}
        className="w-full max-w-2xl bg-gradient-to-b from-[#231911] to-[#120d09] border-2 border-[#d4af37]/55 rounded-3xl p-6 shadow-[0_25px_90px_rgba(0,0,0,0.95)] space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-[#d4af37]/50 flex items-center justify-center text-amber-300">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-amber-100">
                Cartas de Desarrollo ({unplayedCards.length} en mano)
              </h3>
              <p className="text-xs text-stone-400">
                Compra una Carta de Desarrollo por 1 Oveja + 1 Trigo + 1 Piedra (Quedan{' '}
                {gameState.devDeck.length} en el mazo).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BUY DEVELOPMENT CARD SECTION */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1a110b] via-[#26180f] to-[#1a110b] border-2 border-[#d4af37]/45 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Coste de Carta de Desarrollo:</span>
            </span>
            {!buyCheck.allowed && buyCheck.reason && (
              <span className="text-[11px] text-amber-200/80">{buyCheck.reason}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* The 3 Ingredient Cards */}
            <div className="flex items-center gap-2 flex-wrap">
              {devCardRecipe.map((res, idx) => {
                const hasIt = me.resources[res] >= 1;
                const meta = RESOURCE_META[res];
                return (
                  <React.Fragment key={res}>
                    <div
                      className={`px-3 py-2 rounded-2xl border flex items-center gap-2 ${
                        hasIt
                          ? 'bg-emerald-950/60 border-emerald-400/70 text-emerald-100'
                          : 'bg-red-950/40 border-red-500/40 text-red-200 opacity-75'
                      }`}
                    >
                      <ResourceIcon resource={res} size={26} />
                      <div>
                        <div className="text-xs font-extrabold">1x {meta.name}</div>
                        <div className="text-[10px] font-bold">
                          {hasIt ? `✓ Tienes ${me.resources[res]}` : '✗ Te falta (0)'}
                        </div>
                      </div>
                    </div>
                    {idx < 2 && <span className="text-amber-400 font-black text-sm">+</span>}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 1-Click Buy Dev Card Button */}
            <button
              type="button"
              disabled={!buyCheck.allowed}
              onClick={handleBuyDevCard}
              className={`px-5 py-3.5 rounded-2xl text-xs font-black flex items-center gap-2 transition ${
                buyCheck.allowed
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 shadow-xl cursor-pointer scale-[1.02]'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>🃏 Comprar Carta de Desarrollo</span>
            </button>
          </div>

          {justBoughtCount > 0 && unplayedCards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center justify-between"
            >
              <span>
                ✨ ¡Has comprado una Carta de Desarrollo:{' '}
                <strong className="text-white">
                  {unplayedCards[unplayedCards.length - 1].title}
                </strong>
                !
              </span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </motion.div>
          )}
        </div>

        {gameState.turn.devCardPlayedThisTurn && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs">
            Ya has jugado 1 Carta de Desarrollo en este turno (límite oficial: 1 por turno).
          </div>
        )}

        {/* PLAYER'S DEVELOPMENT CARDS IN HAND */}
        {!selectedCard ? (
          <div className="space-y-2.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300/90">
              Tus Cartas de Desarrollo en Mano ({unplayedCards.length}):
            </div>

            {unplayedCards.length === 0 ? (
              <div className="text-center py-8 text-sm text-stone-400 bg-[#140e0a]/60 rounded-2xl border border-stone-800">
                No tienes Cartas de Desarrollo en tu mano. ¡Compra una arriba o desde el menú de Construcción!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unplayedCards.map((card, idx) => {
                  const boughtThisTurnBlocked =
                    !gameState.config.allowInstantDevCards &&
                    card.boughtAtTurn === gameState.turn.turnNumber;
                  const isVP = card.type === 'VICTORY_POINT';
                  const canPlay =
                    !isVP &&
                    !boughtThisTurnBlocked &&
                    !gameState.turn.devCardPlayedThisTurn &&
                    gameState.turn.activePlayerId === me.id &&
                    gameState.phase === 'MAIN_PHASE';
                  const meta = cardArt[card.type];
                  const isNewest = justBoughtCount > 0 && idx === unplayedCards.length - 1;

                  return (
                    <motion.div
                      layout
                      key={card.id}
                      className={`p-4 rounded-2xl bg-gradient-to-b ${meta.bg} border-2 ${
                        isNewest ? 'border-amber-300 ring-2 ring-amber-400/50' : meta.border
                      } flex flex-col justify-between gap-3 shadow-lg`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-black/40 border border-white/15 flex items-center justify-center text-2xl shrink-0">
                          {meta.icon}
                        </span>
                        <div>
                          <div className="text-sm font-black text-amber-100">{card.title}</div>
                          <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded bg-black/40 text-amber-300 font-bold">
                            {meta.badge}
                          </span>
                          <p className="text-xs text-stone-300 mt-1.5 leading-snug">{meta.desc}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        {isVP ? (
                          <span className="w-full text-center py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-extrabold">
                            🏛️ +1 Punto de Victoria Activo
                          </span>
                        ) : boughtThisTurnBlocked ? (
                          <span className="w-full text-center py-1.5 rounded-xl bg-stone-900/80 border border-stone-700 text-stone-400 text-xs font-bold">
                            ⏳ Comprada en este turno (disponible en tu próximo turno)
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canPlay}
                            onClick={() => handlePlayCard(card)}
                            className={`w-full py-2 rounded-xl text-xs font-black transition ${
                              canPlay
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 shadow cursor-pointer'
                                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                            }`}
                          >
                            ⚡ Jugar Carta de Desarrollo
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Sub-selector for Year of Plenty (Invento) or Monopoly */
          <div className="space-y-4 bg-[#140e0a] p-4 rounded-2xl border-2 border-[#d4af37]/50">
            <h4 className="font-display text-sm font-black text-amber-200">
              {selectedCard.title} — Selecciona el efecto:
            </h4>
            {selectedCard.type === 'MONOPOLY' ? (
              <div className="space-y-2">
                <p className="text-xs text-stone-300">
                  Haz clic en el recurso que todos los demás jugadores deberán entregarte:
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {ALL_RESOURCES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setMonopolyRes(r)}
                      className={`p-3 rounded-xl border-2 text-center transition cursor-pointer ${
                        monopolyRes === r
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold scale-105'
                          : 'bg-stone-900 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="text-2xl">{RESOURCE_META[r].emoji}</div>
                      <div className="text-xs font-bold mt-1">{RESOURCE_META[r].name}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-300">
                  Elige los 2 recursos que deseas tomar gratis de la banca:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-bold text-amber-300 mb-1.5">Primer recurso:</div>
                    <div className="grid grid-cols-5 gap-1">
                      {ALL_RESOURCES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setPlentyRes1(r)}
                          className={`p-2 rounded-xl border text-center cursor-pointer ${
                            plentyRes1 === r
                              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold'
                              : 'bg-stone-900 border-stone-800 text-stone-400'
                          }`}
                        >
                          <div className="text-lg">{RESOURCE_META[r].emoji}</div>
                          <div className="text-[10px]">{RESOURCE_META[r].name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300 mb-1.5">Segundo recurso:</div>
                    <div className="grid grid-cols-5 gap-1">
                      {ALL_RESOURCES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setPlentyRes2(r)}
                          className={`p-2 rounded-xl border text-center cursor-pointer ${
                            plentyRes2 === r
                              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold'
                              : 'bg-stone-900 border-stone-800 text-stone-400'
                          }`}
                        >
                          <div className="text-lg">{RESOURCE_META[r].emoji}</div>
                          <div className="text-[10px]">{RESOURCE_META[r].name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-bold cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmSpecialCard}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 text-xs font-extrabold cursor-pointer"
              >
                Confirmar y Ejecutar Carta
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// 5. ABANDON GAME CONFIRMATION MODAL
export const AbandonConfirmModal: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        variants={modalCardVariants}
        className="w-full max-w-md bg-gradient-to-b from-[#211811] to-[#120d09] border-2 border-red-500/50 rounded-3xl p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="font-display text-base font-extrabold text-amber-100">
            ¿Abandonar la Partida?
          </h3>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          Si sales ahora, tus turnos se congelarán para no interrumpir la sesión de los demás
          jugadores (o podrás volver a unirte con el código de la sala si deseas reconectarte).
        </p>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
          >
            Continuar Jugando
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold cursor-pointer"
          >
            Sí, Abandonar Partida
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 6. DISCONNECTED PLAYER RESOLUTION BANNER
export const DisconnectResolutionBanner: React.FC<{
  gameState: GameState;
  dispatchAction: (action: GameAction) => void;
}> = ({ gameState, dispatchAction }) => {
  const disconnectedPlayers = gameState.players.filter(
    (p) => !p.connected && !p.isBot && p.status === 'DISCONNECTED_WAITING'
  );

  if (disconnectedPlayers.length === 0 && gameState.phase !== 'PAUSED_DISCONNECT') {
    return null;
  }

  const target =
    disconnectedPlayers[0] ||
    gameState.players.find((p) => p.id === gameState.turn.pausedForPlayerId);

  if (!target) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4">
      <div className="bg-[#1c140e]/95 border-2 border-[#d4af37] rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-extrabold">
            <PauseCircle className="w-4 h-4 shrink-0" />
            <span>
              {target.name} se ha desconectado. ¿Cómo deseas proceder con la partida?
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              dispatchAction({
                type: 'HANDLE_DISCONNECTED_PLAYER',
                targetPlayerId: target.id,
                resolution: 'WAIT_PAUSE',
              })
            }
            className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer"
          >
            ⏸️ Pausar y Esperar
          </button>
          <button
            type="button"
            onClick={() =>
              dispatchAction({
                type: 'HANDLE_DISCONNECTED_PLAYER',
                targetPlayerId: target.id,
                resolution: 'FREEZE_SKIP',
              })
            }
            className="py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-bold cursor-pointer"
          >
            ❄️ Omitir sus Turnos
          </button>
          <button
            type="button"
            onClick={() =>
              dispatchAction({
                type: 'HANDLE_DISCONNECTED_PLAYER',
                targetPlayerId: target.id,
                resolution: 'CONVERT_TO_BOT',
              })
            }
            className="py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/50 text-indigo-200 text-xs font-bold cursor-pointer"
          >
            🤖 Reemplazar con IA
          </button>
        </div>
      </div>
    </div>
  );
};

// 7. VICTORY MODAL (GAME OVER)
export const VictoryModal: React.FC<{
  gameState: GameState;
  onExitToMenu: () => void;
}> = ({ gameState, onExitToMenu }) => {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);
  const sortedPlayers = [...gameState.players].sort(
    (a, b) => b.totalVictoryPoints - a.totalVictoryPoints
  );

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <motion.div
        variants={modalCardVariants}
        className="w-full max-w-xl bg-gradient-to-b from-[#211811] to-[#120d09] border-2 border-[#d4af37] rounded-3xl p-7 shadow-2xl space-y-6 text-center"
      >
        <div className="inline-flex p-4 rounded-full bg-amber-500/20 border border-[#d4af37]/60 text-amber-300 mx-auto">
          <Trophy className="w-12 h-12" />
        </div>

        <div>
          <div className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
            ¡Victoria en la Isla de Catan!
          </div>
          <h2 className="font-display text-3xl font-black text-amber-100 mt-1">
            {winner?.avatar} {winner?.name}
          </h2>
          <p className="text-xs text-stone-300 mt-1">
            Ha alcanzado{' '}
            <strong className="text-amber-300">{winner?.totalVictoryPoints} Puntos de Victoria</strong>{' '}
            (Meta: {gameState.config.victoryPointsTarget} PV)
          </p>
        </div>

        <div className="space-y-2 text-left">
          {sortedPlayers.map((p, idx) => {
            const hiddenVP = p.devCards.filter((c) => c.type === 'VICTORY_POINT').length;
            const hasLongest = gameState.longestRoadPlayerId === p.id;
            const hasArmy = gameState.largestArmyPlayerId === p.id;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${
                  idx === 0
                    ? 'bg-amber-500/15 border-[#d4af37]'
                    : 'bg-[#140e0a] border-stone-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-amber-400">#{idx + 1}</span>
                  <span className="text-xl">{p.avatar}</span>
                  <div>
                    <div className="text-sm font-bold text-amber-100">{p.name}</div>
                    <div className="text-[11px] text-stone-400 flex flex-wrap gap-2">
                      <span>🛣️ Ruta: {p.longestRoadLength}</span>
                      <span>⚔️ Caballeros: {p.knightsPlayed}</span>
                      {hasLongest && <span className="text-amber-300">★ Gran Ruta (+2)</span>}
                      {hasArmy && <span className="text-amber-300">★ Gran Ejército (+2)</span>}
                      {hiddenVP > 0 && (
                        <span className="text-amber-200">🏛️ Cartas PV: +{hiddenVP}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-lg font-black text-amber-300">
                  {p.totalVictoryPoints} PV
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onExitToMenu}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-extrabold text-sm shadow-xl cursor-pointer"
        >
          Volver al Menú Principal
        </button>
      </motion.div>
    </motion.div>
  );
};
