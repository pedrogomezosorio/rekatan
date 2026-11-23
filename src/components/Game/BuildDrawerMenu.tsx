import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor, Castle, Hammer, Home, Route, ShieldAlert, Ship, Sparkles, X } from 'lucide-react';
import { BUILDING_COSTS, RESOURCE_META } from '../../shared/constants';
import { PlayerState, ResourceType } from '../../shared/types';
import { ResourceIcon } from '../UI/ResourceIcon';

export type ActiveBuildMode = 'ROAD' | 'SHIP' | 'MOVE_SHIP' | 'SETTLEMENT' | 'CITY' | 'CITY_WALL' | null;

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
  isCitiesKnights?: boolean;
  hideDevCardOption?: boolean;
  canBuildWallNow?: boolean;
  onBuildWall?: () => void;
  hasMedicineDiscount?: boolean;
}

interface BuildOptionSpec {
  id: 'ROAD' | 'SHIP' | 'MOVE_SHIP' | 'SETTLEMENT' | 'CITY' | 'CITY_WALL' | 'DEV_CARD';
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
  isCitiesKnights = false,
  hideDevCardOption = false,
  canBuildWallNow = false,
  onBuildWall,
  hasMedicineDiscount = false,
}) => {
  const options: BuildOptionSpec[] = [
    {
      id: 'ROAD' as const,
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
      id: 'SETTLEMENT' as const,
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
      id: 'CITY' as const,
      title: hasMedicineDiscount ? 'Ciudad (Medicina Activa)' : 'Ciudad',
      subtitle: hasMedicineDiscount
        ? '¡Descuento Medicina! Solo 2 minerales y 1 trigo'
        : '+2 Puntos de Victoria y doble producción',
      remainingLabel: `${me.citiesLeft} disp.`,
      icon: <Castle className="w-5 h-5 text-yellow-300" />,
      cost: hasMedicineDiscount
        ? ({ ORE: 2, WHEAT: 1 } as Partial<Record<ResourceType, number>>)
        : BUILDING_COSTS.CITY,
      canExecute: canBuildCityNow,
      onTrigger: () => {
        onSelectBuildMode('CITY');
        onToggleOpen();
      },
    },
    ...(isCitiesKnights
      ? [
          {
            id: 'CITY_WALL' as const,
            title: 'Muralla',
            subtitle: 'Añade muralla a una ciudad (+2 cartas seguras ante 7)',
            remainingLabel: 'Máx. 3 murallas',
            icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
            cost: { BRICK: 2 } as Partial<Record<ResourceType, number>>,
            canExecute: canBuildWallNow && !disabledBeforeDice,
            onTrigger: () => {
              onSelectBuildMode('CITY_WALL');
              onToggleOpen();
            },
          },
        ]
      : hideDevCardOption
      ? []
      : [
          {
            id: 'DEV_CARD' as const,
            title: 'Carta de Desarrollo',
            subtitle: 'Caballero, Progreso o +1 PV Secreto',
            remainingLabel: `${devDeckRemaining} en mazo`,
            icon: <Sparkles className="w-5 h-5 text-amber-300" />,
            cost: BUILDING_COSTS.DEV_CARD,
            canExecute: canBuyDevCardNow,
            onTrigger: () => {
              onBuyDevCard();
              onToggleOpen();
            },
          },
        ]),
  ];

  const anyOptionAvailable =
    canBuildRoadNow ||
    canBuildShipNow ||
    canBuildSettlementNow ||
    canBuildCityNow ||
    (isCitiesKnights && canBuildWallNow) ||
    (!hideDevCardOption && !isCitiesKnights && canBuyDevCardNow) ||
    canMoveShipNow;

  // When in Road Building Dev Card phase, display an active free road placement button
  if (isRoadBuildingDev) {
    return (
      <div className="relative flex items-center w-full">
        <motion.button
          type="button"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={onFinishRoadBuilding}
          className="w-full px-3 py-2 rounded-lg bg-[#c89b3c] hover:bg-[#d6aa4c] border border-[#ebd08a] text-stone-950 font-bold text-xs flex items-center justify-between gap-2 shadow-md cursor-pointer"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Route className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
            <span className="truncate">Finalizar carreteras gratis</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-[10px] text-stone-950 font-bold">✓</span>
        </motion.button>
      </div>
    );
  }

  // When a placement mode is active on the board, transform the button into a clear cancel button
  if (buildMode !== null) {
    const modeNames: Record<NonNullable<ActiveBuildMode>, string> = {
      ROAD: 'Carretera',
      SHIP: 'Barco',
      MOVE_SHIP: 'Mover Barco',
      SETTLEMENT: 'Poblado',
      CITY: 'Ciudad',
      CITY_WALL: 'Muralla',
    };

    return (
      <div className="relative flex items-center w-full">
        <motion.button
          type="button"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => onSelectBuildMode(null)}
          className="w-full px-3 py-2 rounded-lg bg-[#9e2b25] hover:bg-[#b5352e] border border-red-300/60 text-white font-bold text-xs flex items-center justify-between gap-2 shadow-md cursor-pointer"
        >
          <span className="flex items-center gap-1.5 truncate">
            <X className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span className="truncate">Cancelar ({modeNames[buildMode]})</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[10px] text-red-100">C</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center w-full">
      {/* Upward Animated Construction Drawer (100% opaque, concentric radii 16px -> 8px -> 4px) */}
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
              key="smart-build-drawer"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="tablet-drawer absolute bottom-[calc(100%+10px)] left-0 z-50 w-[340px] sm:w-[420px] rounded-2xl bg-[#18110c] border border-[#c89b3c]/70 p-4 shadow-[0_18px_48px_rgba(8,5,3,0.92)] space-y-3 cursor-default opacity-100"
            >
            <div className="flex items-center justify-between border-b border-[#c89b3c]/25 pb-2.5">
              <div className="flex items-center gap-2">
                <Hammer className="w-4 h-4 text-[#d4af37]" />
                <span className="font-display text-sm font-bold tracking-wide text-amber-100">
                  Construcción
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleOpen}
                aria-label="Cerrar menú de construcción"
                className="p-2 rounded-md bg-[#261c14] hover:bg-[#32251a] text-stone-300 cursor-pointer opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {restrictionReason && (
              <div className="px-3 py-2 rounded-lg bg-[#2c1210] border border-red-500/50 text-xs font-medium text-red-200 opacity-100">
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
                    className={`tablet-drawer-item w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between gap-3 opacity-100 ${
                      opt.canExecute
                        ? 'bg-[#231912] hover:bg-[#2d2017] border-[#c89b3c]/70 cursor-pointer'
                        : 'bg-[#140e0a] border-stone-800/80 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 opacity-100 ${
                          opt.canExecute ? 'bg-[#312317]' : 'bg-[#1a130e]'
                        }`}
                      >
                        {opt.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <span
                            className={`text-xs sm:text-sm font-bold whitespace-nowrap ${
                              opt.canExecute ? 'text-amber-100' : 'text-stone-400'
                            }`}
                          >
                            {opt.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-amber-300 font-mono font-semibold whitespace-nowrap shrink-0 tabular-nums opacity-100">
                            {opt.remainingLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 truncate mt-0.5">{opt.subtitle}</p>
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
                            className={`tablet-cost-badge px-2 py-1 rounded-md border flex flex-col items-center min-w-[36px] opacity-100 ${
                              hasEnough
                                ? 'bg-[#11261a] border-emerald-500/60 text-emerald-200'
                                : 'bg-[#2a1210] border-red-500/55 text-red-200'
                            }`}
                            title={`${RESOURCE_META[res].name}: necesitas ${needed}, tienes ${owned}`}
                          >
                            <ResourceIcon resource={res} size={17} />
                            <span className="text-[10px] font-mono font-bold mt-0.5 tabular-nums">
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
        onClick={onToggleOpen}
        className={`tablet-action-btn w-full px-3 py-2 rounded-lg border font-bold text-xs flex items-center justify-between gap-2 transition-colors opacity-100 ${
          isOpen
            ? 'bg-[#d4af37] text-stone-950 border-[#f1d98c] cursor-pointer'
            : anyOptionAvailable && !disabledBeforeDice
            ? 'bg-[#c89b3c] hover:bg-[#d6aa4c] text-stone-950 border-[#e2be68] shadow-[inset_0_1px_0_rgba(255,244,214,0.35)] cursor-pointer'
            : 'bg-[#241a12] hover:bg-[#2f2217] border-[#c89b3c]/40 text-amber-100 cursor-pointer'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Hammer className="w-3.5 h-3.5 shrink-0" />
          <span>Construir</span>
          {anyOptionAvailable && !disabledBeforeDice && (
            <span className="w-2 h-2 rounded-full bg-emerald-700 ring-1 ring-stone-950/60" />
          )}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-black/45 text-[9px] font-mono text-amber-100 opacity-100">C</span>
      </button>
    </div>
  );
};

