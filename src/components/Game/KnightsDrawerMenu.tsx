import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footprints, ShieldAlert, Sparkles, Swords, X } from 'lucide-react';
import { RESOURCE_META } from '../../shared/constants';
import { ResourceType, CardBundle } from '../../shared/types';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
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
  onCloseParentMenu?: () => void;
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
  onCloseParentMenu,
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
  const isMobile = useIsMobileViewport();
  const closeMenus = () => {
    onToggleOpen();
    onCloseParentMenu?.();
  };
  const options: KnightOptionSpec[] = [
    {
      id: 'RECRUIT_KNIGHT',
      title: isMobile ? 'Colocar' : 'Colocar Caballero',
      subtitle: 'Recluta un caballero de fuerza 1 en un cruce libre de tus caminos',
      remainingLabel: `${freeRank1Count} en reserva`,
      icon: <Swords className="w-4 h-4 md:w-5 md:h-5 text-amber-300" />,
      cost: { ORE: 1, SHEEP: 1 },
      canExecute: canRecruitNow,
      onTrigger: () => {
        onSelectKnightMode('RECRUIT_KNIGHT');
        closeMenus();
      },
    },
    {
      id: 'PROMOTE_KNIGHT',
      title: isMobile ? 'Ascender' : 'Ascender Caballero',
      subtitle: 'Aumenta el rango y la fuerza (+1 defensa) de un caballero propio',
      remainingLabel: 'Coste: mineral + oveja',
      icon: <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-yellow-300" />,
      cost: { ORE: 1, SHEEP: 1 },
      canExecute: canPromoteNow,
      onTrigger: () => {
        onSelectKnightMode('PROMOTE_KNIGHT');
        closeMenus();
      },
    },
    {
      id: 'ACTIVATE_KNIGHT',
      title: isMobile ? 'Activar' : 'Activar Caballero',
      subtitle: 'Prepara un caballero inactivo para defender Catán y realizar acciones',
      remainingLabel: 'Coste: 1 trigo',
      icon: <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-emerald-300" />,
      cost: { WHEAT: 1 },
      canExecute: canActivateNow,
      onTrigger: () => {
        onSelectKnightMode('ACTIVATE_KNIGHT');
        closeMenus();
      },
    },
    {
      id: 'EXPEL_ROBBER',
      title: isMobile ? 'Expulsar' : 'Expulsar Ladrón',
      subtitle: canExpelNow
        ? 'Usa un caballero activo contiguo al hexágono del Ladrón para desplazarlo'
        : 'Requiere un caballero activo (de un turno anterior) contiguo al Ladrón o Pirata',
      remainingLabel: 'Sin coste de cartas',
      icon: <Footprints className="w-4 h-4 md:w-5 md:h-5 text-red-400" />,
      cost: {},
      canExecute: canExpelNow,
      onTrigger: () => {
        onSelectKnightMode('EXPEL_ROBBER');
        closeMenus();
      },
    },
    {
      id: 'MOVE_KNIGHT_FROM',
      title: isMobile ? 'Mover' : 'Mover / Desplazar',
      subtitle: 'Reubica un caballero activo o desplaza a un caballero rival más débil',
      remainingLabel: 'Sin coste de cartas',
      icon: <Swords className="w-4 h-4 md:w-5 md:h-5 text-sky-400" />,
      cost: {},
      canExecute: canMoveNow,
      onTrigger: () => {
        onSelectKnightMode('MOVE_KNIGHT_FROM');
        closeMenus();
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
              className={`fixed inset-0 z-40 cursor-pointer ${isMobile ? 'bg-transparent' : 'bg-black/45'}`}
            />
            <motion.div
              key="knights-drawer"
              initial={isMobile ? { opacity: 0, x: -10, scale: 0.96 } : { opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={isMobile ? { opacity: 0, x: -8, scale: 0.96 } : { opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className={
                isMobile
                  ? 'mobile-right-drawer absolute bottom-0 left-[calc(100%+8px)] z-50 rounded-xl bg-[#18110c] border border-[#c89b3c]/80 p-2 shadow-[0_14px_36px_rgba(8,5,3,0.95)] space-y-1.5 cursor-default opacity-100'
                  : 'tablet-drawer absolute bottom-[calc(100%+10px)] left-0 z-50 w-[340px] sm:w-[420px] rounded-2xl bg-[#18110c] border border-[#c89b3c]/70 p-4 shadow-[0_18px_48px_rgba(8,5,3,0.92)] space-y-3 cursor-default opacity-100'
              }
              style={
                isMobile
                  ? {
                      width: 'min(220px, calc(100vw - 148px - env(safe-area-inset-left) - env(safe-area-inset-right)))',
                    }
                  : undefined
              }
            >
              <div className={`flex items-center justify-between border-b border-[#c89b3c]/25 ${isMobile ? 'pb-1.5' : 'pb-2.5'}`}>
                <div className="flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#d4af37]" />
                  <span className="font-display text-xs md:text-sm font-bold tracking-wide text-amber-100">
                    {isMobile ? 'Caballeros' : 'Acciones de caballeros'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleOpen}
                  aria-label="Cerrar menú de caballeros"
                  className="p-1 md:p-2 rounded-md bg-[#261c14] hover:bg-[#32251a] text-stone-300 cursor-pointer opacity-100"
                >
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>

              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                {options.map((opt) => {
                  const costEntries = Object.entries(opt.cost) as [ResourceType, number][];
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!opt.canExecute}
                      onClick={opt.onTrigger}
                      className={`tablet-drawer-item w-full ${isMobile ? 'p-1.5 gap-1.5' : 'p-2.5 gap-3'} rounded-lg border text-left transition-colors flex items-center justify-between opacity-100 ${
                        opt.canExecute
                          ? 'bg-[#231912] hover:bg-[#2d2017] border-[#c89b3c]/70 cursor-pointer'
                          : 'bg-[#140e0a] border-stone-800/80 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-3'} min-w-0`}>
                        <div
                          className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-md shrink-0 opacity-100 ${
                            opt.canExecute ? 'bg-[#312317]' : 'bg-[#1a130e]'
                          }`}
                        >
                          {opt.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`${isMobile ? 'text-[11px]' : 'text-xs sm:text-sm'} font-bold text-amber-100 truncate`}>
                              {opt.title}
                            </span>
                            {!isMobile && (
                              <span className="text-[10px] font-medium text-stone-400 tabular-nums">
                                ({opt.remainingLabel})
                              </span>
                            )}
                          </div>
                          {!isMobile && (
                            <p className="text-[11px] text-stone-400 truncate mt-0.5">
                              {opt.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {costEntries.length > 0 ? (
                        <div className={`flex items-center ${isMobile ? 'gap-1 px-1.5 py-0.5' : 'gap-1.5 px-2 py-1'} shrink-0 bg-black/55 rounded-md border border-white/10 opacity-100`}>
                          {costEntries.map(([res, count]) => (
                            <div key={res} className="flex items-center gap-0.5 tabular-nums" title={`${count}x ${RESOURCE_META[res].name}`}>
                              <span className="text-[9.5px] md:text-[10px] font-bold text-amber-200">{count}</span>
                              <ResourceIcon resource={res} size={isMobile ? 11 : 13} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9.5px] md:text-[10px] font-bold text-emerald-300 bg-[#11261a] border border-emerald-500/45 px-1.5 md:px-2 py-0.5 rounded-md opacity-100 shrink-0">
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
        className={`tablet-action-btn w-full ${isMobile ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} rounded-lg border font-bold flex items-center justify-between gap-1.5 transition-colors cursor-pointer active:scale-98 opacity-100 ${
          isOpen
            ? 'bg-[#362618] border-[#d4af37] text-amber-100'
            : 'bg-[#241a12] hover:bg-[#2f2217] border-[#c89b3c]/50 text-amber-200 shadow'
        }`}
        title="Acciones de Caballeros: Colocar, Ascender, Activar, Expulsar Ladrón y Mover"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Swords className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
          <span className="truncate tabular-nums">
            {isMobile ? `Caballeros (${myDefense})` : `Caballeros (${myDefense} Def.)`}
          </span>
        </span>
        {!isMobile && (
          <span className="px-1.5 py-0.5 rounded bg-black/35 font-mono text-[9px] text-amber-300/80">
            K
          </span>
        )}
      </button>
    </div>
  );
};

