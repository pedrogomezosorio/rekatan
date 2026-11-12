import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footprints, ShieldAlert, Sparkles, Swords, X } from 'lucide-react';
import { RESOURCE_META } from '../../shared/constants';
import { ResourceType, CardBundle } from '../../shared/types';
import { ResourceIcon } from '../UI/ResourceIcon';

export type ActiveKnightMode =
  | 'RECRUIT_KNIGHT'
  | 'PROMOTE_KNIGHT'
  | 'ACTIVATE_KNIGHT'
  | 'EXPEL_ROBBER'
  | 'MOVE_KNIGHT_FROM'
  | null;

interface KnightsDrawerMenuProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeKnightMode: ActiveKnightMode;
  onSelectKnightMode: (mode: ActiveKnightMode) => void;
  canRecruitNow: boolean;
  canPromoteNow: boolean;
  canActivateNow: boolean;
  canExpelNow: boolean;
  canMoveNow: boolean;
  myDefense: number;
  freeRank1Count: number;
  disabledBeforeDice: boolean;
}

interface KnightOptionSpec {
  id: NonNullable<ActiveKnightMode>;
  title: string;
  subtitle: string;
  remainingLabel: string;
  icon: React.ReactNode;
  cost: Partial<Record<ResourceType, number>>;
  canExecute: boolean;
  onTrigger: () => void;
}

export const KnightsDrawerMenu: React.FC<KnightsDrawerMenuProps> = ({
  isOpen,
  onToggleOpen,
  activeKnightMode,
  onSelectKnightMode,
  canRecruitNow,
  canPromoteNow,
  canActivateNow,
  canExpelNow,
  canMoveNow,
  myDefense,
  freeRank1Count,
  disabledBeforeDice,
}) => {
  const options: KnightOptionSpec[] = [
    {
      id: 'RECRUIT_KNIGHT',
      title: 'Colocar Caballero',
      subtitle: 'Recluta un caballero de fuerza 1 en un cruce libre de tus caminos',
      remainingLabel: `${freeRank1Count} en reserva`,
      icon: <Swords className="w-5 h-5 text-amber-300" />,
      cost: { ORE: 1, SHEEP: 1 },
      canExecute: canRecruitNow,
      onTrigger: () => {
        onSelectKnightMode('RECRUIT_KNIGHT');
        onToggleOpen();
      },
    },
    {
      id: 'PROMOTE_KNIGHT',
      title: 'Ascender Caballero',
      subtitle: 'Aumenta el rango y la fuerza (+1 defensa) de un caballero propio',
      remainingLabel: 'Coste: mineral + oveja',
      icon: <ShieldAlert className="w-5 h-5 text-yellow-300" />,
      cost: { ORE: 1, SHEEP: 1 },
      canExecute: canPromoteNow,
      onTrigger: () => {
        onSelectKnightMode('PROMOTE_KNIGHT');
        onToggleOpen();
      },
    },
    {
      id: 'ACTIVATE_KNIGHT',
      title: 'Activar Caballero',
      subtitle: 'Prepara un caballero inactivo para defender Catán y realizar acciones',
      remainingLabel: 'Coste: 1 trigo',
      icon: <Sparkles className="w-5 h-5 text-emerald-300" />,
      cost: { WHEAT: 1 },
      canExecute: canActivateNow,
      onTrigger: () => {
        onSelectKnightMode('ACTIVATE_KNIGHT');
        onToggleOpen();
      },
    },
    {
      id: 'EXPEL_ROBBER',
      title: 'Expulsar Ladrón',
      subtitle: canExpelNow
        ? 'Usa un caballero activo contiguo al hexágono del Ladrón para desplazarlo'
        : 'Requiere un caballero activo (de un turno anterior) contiguo al Ladrón o Pirata',
      remainingLabel: 'Sin coste de cartas',
      icon: <Footprints className="w-5 h-5 text-red-400" />,
      cost: {},
      canExecute: canExpelNow,
      onTrigger: () => {
        onSelectKnightMode('EXPEL_ROBBER');
        onToggleOpen();
      },
    },
    {
      id: 'MOVE_KNIGHT_FROM',
      title: 'Mover / Desplazar',
      subtitle: 'Reubica un caballero activo o desplaza a un caballero rival más débil',
      remainingLabel: 'Sin coste de cartas',
      icon: <Swords className="w-5 h-5 text-sky-400" />,
      cost: {},
      canExecute: canMoveNow,
      onTrigger: () => {
        onSelectKnightMode('MOVE_KNIGHT_FROM');
        onToggleOpen();
      },
    },
  ];

  if (activeKnightMode) {
    const modeNames: Record<NonNullable<ActiveKnightMode>, string> = {
      RECRUIT_KNIGHT: 'Colocar Caballero',
      PROMOTE_KNIGHT: 'Ascender Caballero',
      ACTIVATE_KNIGHT: 'Activar Caballero',
      EXPEL_ROBBER: 'Expulsar Ladrón',
      MOVE_KNIGHT_FROM: 'Mover Caballero',
    };

    return (
      <div className="relative flex items-center w-full">
        <motion.button
          type="button"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => onSelectKnightMode(null)}
          className="w-full px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 border border-red-300/80 text-white font-black text-[11px] flex items-center justify-between gap-2 shadow-[0_0_20px_rgba(239,68,68,0.6)] cursor-pointer animate-pulse"
        >
          <span className="flex items-center gap-1.5 truncate">
            <X className="w-3.5 h-3.5 stroke-[3] shrink-0" />
            <span className="truncate">Cancelar ({modeNames[activeKnightMode]})</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[9px] text-red-100">✕</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center w-full">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggleOpen}
              className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] cursor-pointer"
            />
            <motion.div
              key="knights-drawer"
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="tablet-drawer absolute bottom-[calc(100%+12px)] left-0 z-50 w-[340px] sm:w-[430px] rounded-3xl bg-gradient-to-b from-[#241911]/98 to-[#120c08]/98 backdrop-blur-2xl border-2 border-[#d4af37]/70 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.95)] space-y-3 cursor-default"
            >
              <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-2.5">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-amber-100">
                    Acciones de Caballeros
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleOpen}
                  className="p-1 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {options.map((opt) => {
                  const costEntries = Object.entries(opt.cost) as [ResourceType, number][];
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!opt.canExecute}
                      onClick={opt.onTrigger}
                      className={`tablet-drawer-item w-full p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                        opt.canExecute
                          ? 'bg-gradient-to-r from-[#2c1f14] via-[#22170f] to-[#1a120b] hover:from-[#382719] hover:to-[#281b11] border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.28)] cursor-pointer scale-[1.01]'
                          : 'bg-[#0e0a07]/80 border-stone-800/70 opacity-45 grayscale-[45%] cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl shrink-0 border ${
                            opt.canExecute
                              ? 'bg-amber-950/80 border-amber-500/50'
                              : 'bg-stone-900 border-stone-700'
                          }`}
                        >
                          {opt.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-xs sm:text-sm font-extrabold text-amber-100">
                              {opt.title}
                            </span>
                            <span className="text-[10px] font-semibold text-stone-400">
                              ({opt.remainingLabel})
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-stone-400 truncate mt-0.5">
                            {opt.subtitle}
                          </p>
                        </div>
                      </div>

                      {costEntries.length > 0 ? (
                        <div className="flex items-center gap-1.5 shrink-0 bg-black/40 px-2 py-1 rounded-xl border border-white/10">
                          {costEntries.map(([res, count]) => (
                            <div key={res} className="flex items-center gap-0.5" title={`${count}x ${RESOURCE_META[res].name}`}>
                              <span className="text-[10px] font-black text-amber-200">{count}</span>
                              <ResourceIcon resource={res} size={13} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                          Gratis
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button
        type="button"
        disabled={disabledBeforeDice}
        onClick={onToggleOpen}
        className={`tablet-action-btn w-full px-3 py-2 rounded-xl border text-xs font-black flex items-center justify-between gap-2 transition cursor-pointer active:scale-98 ${
          disabledBeforeDice
            ? 'bg-stone-900/70 border-stone-800 text-stone-500 cursor-not-allowed'
            : isOpen
            ? 'bg-amber-950/80 border-amber-400 text-amber-200'
            : 'bg-gradient-to-r from-[#2a1d13] via-[#332317] to-[#20150d] hover:from-[#3a281a] hover:to-[#2d1e13] border-[#d4af37]/60 text-amber-200 shadow'
        }`}
        title="Acciones de Caballeros: Colocar, Ascender, Activar, Expulsar Ladrón y Mover"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Swords className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">Caballeros ({myDefense} Def.)</span>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-black/35 font-mono text-[9px] text-amber-300/80">
          K
        </span>
      </button>
    </div>
  );
};

