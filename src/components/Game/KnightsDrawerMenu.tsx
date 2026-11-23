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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => onSelectKnightMode(null)}
          className="w-full px-3 py-2 rounded-lg bg-[#9e2b25] hover:bg-[#b5352e] border border-red-300/60 text-white font-bold text-xs flex items-center justify-between gap-2 shadow-md cursor-pointer"
        >
          <span className="flex items-center gap-1.5 truncate">
            <X className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span className="truncate">Cancelar ({modeNames[activeKnightMode]})</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[10px] text-red-100">ESC</span>
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
              className="fixed inset-0 z-40 bg-black/45 cursor-pointer"
            />
            <motion.div
              key="knights-drawer"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="tablet-drawer absolute bottom-[calc(100%+10px)] left-0 z-50 w-[340px] sm:w-[420px] rounded-2xl bg-[#18110c] border border-[#c89b3c]/70 p-4 shadow-[0_18px_48px_rgba(8,5,3,0.92)] space-y-3 cursor-default opacity-100"
            >
              <div className="flex items-center justify-between border-b border-[#c89b3c]/25 pb-2.5">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-[#d4af37]" />
                  <span className="font-display text-sm font-bold tracking-wide text-amber-100">
                    Acciones de caballeros
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleOpen}
                  aria-label="Cerrar menú de caballeros"
                  className="p-2 rounded-md bg-[#261c14] hover:bg-[#32251a] text-stone-300 cursor-pointer opacity-100"
                >
                  <X className="w-4 h-4" />
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
                      className={`tablet-drawer-item w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between gap-3 opacity-100 ${
                        opt.canExecute
                          ? 'bg-[#231912] hover:bg-[#2d2017] border-[#c89b3c]/70 cursor-pointer'
                          : 'bg-[#140e0a] border-stone-800/80 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-md shrink-0 opacity-100 ${
                            opt.canExecute ? 'bg-[#312317]' : 'bg-[#1a130e]'
                          }`}
                        >
                          {opt.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-amber-100">
                              {opt.title}
                            </span>
                            <span className="text-[10px] font-medium text-stone-400 tabular-nums">
                              ({opt.remainingLabel})
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 truncate mt-0.5">
                            {opt.subtitle}
                          </p>
                        </div>
                      </div>

                      {costEntries.length > 0 ? (
                        <div className="flex items-center gap-1.5 shrink-0 bg-black/55 px-2 py-1 rounded-md border border-white/10 opacity-100">
                          {costEntries.map(([res, count]) => (
                            <div key={res} className="flex items-center gap-0.5 tabular-nums" title={`${count}x ${RESOURCE_META[res].name}`}>
                              <span className="text-[10px] font-bold text-amber-200">{count}</span>
                              <ResourceIcon resource={res} size={13} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-300 bg-[#11261a] border border-emerald-500/45 px-2 py-0.5 rounded-md opacity-100">
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
        onClick={onToggleOpen}
        className={`tablet-action-btn w-full px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer active:scale-98 opacity-100 ${
          isOpen
            ? 'bg-[#362618] border-[#d4af37] text-amber-100'
            : 'bg-[#241a12] hover:bg-[#2f2217] border-[#c89b3c]/50 text-amber-200 shadow'
        }`}
        title="Acciones de Caballeros: Colocar, Ascender, Activar, Expulsar Ladrón y Mover"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Swords className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
          <span className="truncate tabular-nums">Caballeros ({myDefense} Def.)</span>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-black/35 font-mono text-[9px] text-amber-300/80">
          K
        </span>
      </button>
    </div>
  );
};

