import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor, Castle, Hammer, Home, Route, Ship, Sparkles, X } from 'lucide-react';
import { BUILDING_COSTS, RESOURCE_META } from '../../shared/constants';
import { PlayerState, ResourceType } from '../../shared/types';
import { ResourceIcon } from '../UI/ResourceIcon';

export type ActiveBuildMode = 'ROAD' | 'SHIP' | 'MOVE_SHIP' | 'SETTLEMENT' | 'CITY' | null;

interface BuildDrawerMenuProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  buildMode: ActiveBuildMode;
  onSelectBuildMode: (mode: ActiveBuildMode) => void;
  onBuyDevCard: () => void;
  me: PlayerState;
  canBuildRoadNow: boolean;
  canBuildShipNow?: boolean;
  canMoveShipNow?: boolean;
  canBuildSettlementNow: boolean;
  canBuildCityNow: boolean;
  canBuyDevCardNow: boolean;
  restrictionReason?: string;
  devDeckRemaining: number;
  disabledBeforeDice: boolean;
  isRoadBuildingDev?: boolean;
  onFinishRoadBuilding?: () => void;
  isSeafarers?: boolean;
}

interface BuildOptionSpec {
  id: 'ROAD' | 'SHIP' | 'MOVE_SHIP' | 'SETTLEMENT' | 'CITY' | 'DEV_CARD';
  title: string;
  subtitle: string;
  remainingLabel: string;
  icon: React.ReactNode;
  cost: Partial<Record<ResourceType, number>>;
  canExecute: boolean;
  onTrigger: () => void;
}

export const BuildDrawerMenu: React.FC<BuildDrawerMenuProps> = ({
  isOpen,
  onToggleOpen,
  buildMode,
  onSelectBuildMode,
  onBuyDevCard,
  me,
  canBuildRoadNow,
  canBuildShipNow = false,
  canMoveShipNow = false,
  canBuildSettlementNow,
  canBuildCityNow,
  canBuyDevCardNow,
  restrictionReason,
  devDeckRemaining,
  disabledBeforeDice,
  isRoadBuildingDev,
  onFinishRoadBuilding,
  isSeafarers = false,
}) => {
  const options: BuildOptionSpec[] = [
    {
      id: 'ROAD',
      title: 'Carretera',
      subtitle: 'Conecta tus rutas comerciales y costas',
      remainingLabel: `${me.roadsLeft} disp.`,
      icon: <Route className="w-5 h-5 text-amber-300" />,
      cost: BUILDING_COSTS.ROAD,
      canExecute: canBuildRoadNow,
      onTrigger: () => {
        onSelectBuildMode('ROAD');
        onToggleOpen();
      },
    },
    ...(isSeafarers
      ? [
          {
            id: 'SHIP' as const,
            title: 'Barco',
            subtitle: 'Navega por rutas marítimas y costas',
            remainingLabel: `${me.shipsLeft ?? 15} disp.`,
            icon: <Ship className="w-5 h-5 text-cyan-300" />,
            cost: BUILDING_COSTS.SHIP,
            canExecute: canBuildShipNow,
            onTrigger: () => {
              onSelectBuildMode('SHIP');
              onToggleOpen();
            },
          },
          ...(canMoveShipNow
            ? [
                {
                  id: 'MOVE_SHIP' as const,
                  title: 'Mover Barco',
                  subtitle: 'Reubica 1 barco de una ruta abierta (1/turno)',
                  remainingLabel: me.hasMovedShipThisTurn ? 'Usado' : 'Disponible',
                  icon: <Anchor className="w-5 h-5 text-sky-400" />,
                  cost: {},
                  canExecute: !me.hasMovedShipThisTurn,
                  onTrigger: () => {
                    onSelectBuildMode('MOVE_SHIP');
                    onToggleOpen();
                  },
                },
              ]
            : []),
        ]
      : []),
    {
      id: 'SETTLEMENT',
      title: 'Poblado',
      subtitle: '+1 Punto de Victoria y cosecha recursos',
      remainingLabel: `${me.settlementsLeft} disp.`,
      icon: <Home className="w-5 h-5 text-emerald-300" />,
      cost: BUILDING_COSTS.SETTLEMENT,
      canExecute: canBuildSettlementNow,
      onTrigger: () => {
        onSelectBuildMode('SETTLEMENT');
        onToggleOpen();
      },
    },
    {
      id: 'CITY',
      title: 'Ciudad',
      subtitle: '+2 Puntos de Victoria y doble producción',
      remainingLabel: `${me.citiesLeft} disp.`,
      icon: <Castle className="w-5 h-5 text-yellow-300" />,
      cost: BUILDING_COSTS.CITY,
      canExecute: canBuildCityNow,
      onTrigger: () => {
        onSelectBuildMode('CITY');
        onToggleOpen();
      },
    },
    {
      id: 'DEV_CARD',
      title: 'Carta de Desarrollo',
      subtitle: 'Caballero, Progreso o +1 PV Secreto',
      remainingLabel: `${devDeckRemaining} en mazo`,
      icon: <Sparkles className="w-5 h-5 text-purple-300" />,
      cost: BUILDING_COSTS.DEV_CARD,
      canExecute: canBuyDevCardNow,
      onTrigger: () => {
        onBuyDevCard();
        onToggleOpen();
      },
    },
  ];

  const anyOptionAvailable =
    canBuildRoadNow || canBuildShipNow || canBuildSettlementNow || canBuildCityNow || canBuyDevCardNow || canMoveShipNow;

  // When in Road Building Dev Card phase, display an active free road placement button
  if (isRoadBuildingDev) {
    return (
      <div className="relative flex items-center w-full">
        <motion.button
          type="button"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={onFinishRoadBuilding}
          className="w-full px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 border border-amber-200 text-stone-950 font-black text-[11px] flex items-center justify-between gap-2 shadow-[0_0_20px_rgba(245,158,11,0.6)] cursor-pointer animate-pulse"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Route className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span className="truncate">Carreteras Gratis (Finalizar)</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-[9px] text-stone-900 font-black">✓</span>
        </motion.button>
      </div>
    );
  }

  // When a placement mode is active on the board, transform the button into a red "Cancelar Construcción" button
  if (buildMode !== null) {
    const modeNames: Record<NonNullable<ActiveBuildMode>, string> = {
      ROAD: 'Carretera',
      SHIP: 'Barco',
      MOVE_SHIP: 'Mover Barco',
      SETTLEMENT: 'Poblado',
      CITY: 'Ciudad',
    };

    return (
      <div className="relative flex items-center w-full">
        <motion.button
          type="button"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => onSelectBuildMode(null)}
          className="w-full px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 border border-red-300/80 text-white font-black text-[11px] flex items-center justify-between gap-2 shadow-[0_0_20px_rgba(239,68,68,0.6)] cursor-pointer animate-pulse"
        >
          <span className="flex items-center gap-1.5 truncate">
            <X className="w-3.5 h-3.5 stroke-[3] shrink-0" />
            <span className="truncate">Cancelar ({modeNames[buildMode]})</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[9px] text-red-100">C</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center w-full">
      {/* Upward Animated Smart Construction Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-outside backdrop to dismiss and return to map */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggleOpen}
              className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] cursor-pointer"
            />
            <motion.div
              key="smart-build-drawer"
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="tablet-drawer absolute bottom-[calc(100%+12px)] left-0 z-50 w-[340px] sm:w-[430px] rounded-3xl bg-gradient-to-b from-[#241911]/98 to-[#120c08]/98 backdrop-blur-2xl border-2 border-[#d4af37]/70 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.95)] space-y-3 cursor-default"
            >
            <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-2.5">
              <div className="flex items-center gap-2">
                <Hammer className="w-4 h-4 text-amber-400" />
                <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-amber-100">
                  Menú Inteligente de Construcción
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

            {restrictionReason && (
              <div className="px-3 py-2 rounded-xl bg-red-950/75 border border-red-500/40 text-[11px] font-semibold text-red-200">
                {restrictionReason}
              </div>
            )}

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
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                          opt.canExecute
                            ? 'bg-amber-500/20 border-amber-400/60 shadow-inner'
                            : 'bg-stone-900 border-stone-800'
                        }`}
                      >
                        {opt.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <span
                            className={`text-xs sm:text-sm font-black whitespace-nowrap ${
                              opt.canExecute ? 'text-amber-100' : 'text-stone-400'
                            }`}
                          >
                            {opt.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-amber-300/90 font-mono font-bold whitespace-nowrap shrink-0">
                            {opt.remainingLabel}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 truncate mt-0.5">{opt.subtitle}</p>
                      </div>
                    </div>

                    {/* Official SVG Cost Recipe */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {costEntries.map(([res, needed]) => {
                        const owned = me.resources[res] || 0;
                        const hasEnough = owned >= (needed || 0);
                        return (
                          <div
                            key={res}
                            className={`tablet-cost-badge px-2 py-1 rounded-xl border flex flex-col items-center min-w-[38px] ${
                              hasEnough
                                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                                : 'bg-red-950/50 border-red-500/40 text-red-300'
                            }`}
                            title={`${RESOURCE_META[res].name}: necesitas ${needed}, tienes ${owned}`}
                          >
                            <ResourceIcon resource={res} size={18} />
                            <span className="text-[10px] font-mono font-black mt-0.5">
                              {needed}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      {/* Main Bottom Panel "Construir" Trigger Button */}
      <button
        type="button"
        disabled={disabledBeforeDice}
        onClick={onToggleOpen}
        className={`tablet-action-btn w-full px-3 py-1.5 rounded-xl border font-black text-[11px] flex items-center justify-between gap-2 transition ${
          disabledBeforeDice
            ? 'bg-stone-900/70 border-stone-800 text-stone-500 cursor-not-allowed'
            : isOpen
            ? 'bg-amber-400 text-stone-950 border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.5)] cursor-pointer'
            : anyOptionAvailable
            ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-stone-950 border-amber-300 shadow-[0_4px_15px_rgba(245,158,11,0.35)] cursor-pointer'
            : 'bg-[#261a11] hover:bg-[#332317] border-[#d4af37]/50 text-amber-100 cursor-pointer'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Hammer className="w-3.5 h-3.5 shrink-0" />
          <span>Construir</span>
          {anyOptionAvailable && !disabledBeforeDice && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-stone-950 animate-pulse" />
          )}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-black/25 text-[9px] font-mono opacity-80">C</span>
      </button>
    </div>
  );
};

