import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Anchor,
  Coins,
  Compass,
  X,
} from 'lucide-react';
import { RESOURCE_META } from '../../shared/constants';
import {
  EP_BUILDING_COSTS,
  EP_TOKEN_ASSETS,
  canFitCargoItem,
  getEPHarborCityToken,
  getEPSettlerToken,
  getEPShipToken,
  getEPUnitToken,
} from '../../shared/expansionsConfig';
import type { GameState, PlayerState, ResourceType } from '../../shared/types';
import { ResourceIcon } from '../UI/ResourceIcon';

export type ActiveExplorersBoardMode =
  | 'UPGRADE_HARBOR_CITY'
  | 'BUILD_EP_SHIP'
  | 'MOVE_EP_SHIP'
  | 'PLACE_PIRATE_SHIP'
  | null;

interface ExplorersPiratesDrawerMenuProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeMode: ActiveExplorersBoardMode;
  onSelectMode: (mode: ActiveExplorersBoardMode) => void;
  gameState: GameState;
  me: PlayerState;
  isMyTurn: boolean;
  disabledBeforeDice: boolean;
  onOpenPanelModal: () => void;
  onBuildSettler: () => void;
  onBuildUnit: () => void;
  onRollFishShoal: () => void;
}

interface DrawerOptionSpec {
  id: string;
  title: string;
  subtitle: string;
  remainingLabel: string;
  icon: React.ReactNode;
  cost: Partial<Record<ResourceType, number>>;
  badgeLabel?: string;
  canExecute: boolean;
  onTrigger: () => void;
}

export const ExplorersPiratesDrawerMenu: React.FC<ExplorersPiratesDrawerMenuProps> = ({
  isOpen,
  onToggleOpen,
  activeMode,
  onSelectMode,
  gameState,
  me,
  isMyTurn,
  disabledBeforeDice,
  onOpenPanelModal,
  onBuildSettler,
  onBuildUnit,
  onRollFishShoal,
}) => {
  const ep = gameState.explorersPirates;
  const pep = me.explorersPirates;
  if (!ep || !pep) return null;

  const canActMain = isMyTurn && !disabledBeforeDice && gameState.phase === 'MAIN_PHASE';
  const canActBuild =
    isMyTurn &&
    !disabledBeforeDice &&
    (gameState.phase === 'MAIN_PHASE' || gameState.phase === 'SPECIAL_BUILD_PHASE');

  const hasRes = (cost: Partial<Record<ResourceType, number>>) =>
    Object.entries(cost).every(([r, n]) => (me.resources[r as ResourceType] || 0) >= (n || 0));

  const myShips = Object.values(ep.ships).filter((sh) => sh.playerId === me.id);
  const myBasins = Object.values(ep.harborBasins).filter((b) => b.playerId === me.id);
  const hasCoastalSettlement = Object.values(gameState.board.vertices).some(
    (v) => v.playerId === me.id && v.building === 'SETTLEMENT' && v.isCoastal
  );
  const hasFreeSlotForSettler =
    myBasins.some((b) => canFitCargoItem(b.cargo, 'SETTLER')) ||
    myShips.some((sh) => canFitCargoItem(sh.cargo, 'SETTLER'));
  const hasFreeSlotForUnit =
    myBasins.some((b) => canFitCargoItem(b.cargo, 'CREW')) ||
    myShips.some((sh) => canFitCargoItem(sh.cargo, 'CREW'));

  const options: DrawerOptionSpec[] = [
    {
      id: 'HARBOR_CITY',
      title: 'Ciudad Portuaria (+2 PV)',
      subtitle: 'Mejora un poblado costero y añade dársena para barcos y carga',
      remainingLabel: `${pep.harborCitiesLeft} disp.`,
      icon: (
        <img
          src={getEPHarborCityToken(me.color)}
          alt="Ciudad Portuaria"
          className="w-7 h-7 rounded-full object-cover shadow"
        />
      ),
      cost: EP_BUILDING_COSTS.HARBOR_CITY,
      canExecute:
        canActBuild &&
        pep.harborCitiesLeft > 0 &&
        hasCoastalSettlement &&
        hasRes(EP_BUILDING_COSTS.HARBOR_CITY),
      onTrigger: () => {
        onSelectMode('UPGRADE_HARBOR_CITY');
        onToggleOpen();
      },
    },
    {
      id: 'BUILD_SHIP',
      title: 'Botar Barco en Ciudad Portuaria',
      subtitle: 'Haz clic en una travesía marítima junto a tu Ciudad Portuaria',
      remainingLabel: `${pep.shipsLeft} en reserva`,
      icon: (
        <img
          src={getEPShipToken(me.color)}
          alt="Barco"
          className="w-7 h-7 rounded-full object-cover shadow"
        />
      ),
      cost: EP_BUILDING_COSTS.SHIP,
      canExecute:
        canActBuild &&
        myBasins.length > 0 &&
        pep.shipsLeft > 0 &&
        hasRes(EP_BUILDING_COSTS.SHIP),
      onTrigger: () => {
        onSelectMode('BUILD_EP_SHIP');
        onToggleOpen();
      },
    },
    {
      id: 'BUILD_SETTLER',
      title: 'Reclutar Colono',
      subtitle: 'Se embarca en tu Ciudad Portuaria o Barco para fundar poblados',
      remainingLabel: `${pep.settlersLeft} disp.`,
      icon: (
        <img
          src={getEPSettlerToken(me.color)}
          alt="Colono"
          className="w-7 h-7 rounded-full object-cover shadow"
        />
      ),
      cost: EP_BUILDING_COSTS.SETTLER,
      canExecute:
        canActBuild &&
        pep.settlersLeft > 0 &&
        hasFreeSlotForSettler &&
        hasRes(EP_BUILDING_COSTS.SETTLER),
      onTrigger: () => {
        onBuildSettler();
        onToggleOpen();
      },
    },
    {
      id: 'BUILD_UNIT',
      title: 'Reclutar Unidad (Guerrero / Mercader)',
      subtitle: 'Conquista Guaridas Piratas o comercia en Aldeas de Especias',
      remainingLabel: `${pep.unitsLeft} disp.`,
      icon: (
        <img
          src={getEPUnitToken(me.color)}
          alt="Unidad"
          className="w-7 h-7 rounded-full object-cover shadow"
        />
      ),
      cost: EP_BUILDING_COSTS.UNIT,
      canExecute:
        canActBuild &&
        pep.unitsLeft > 0 &&
        hasFreeSlotForUnit &&
        hasRes(EP_BUILDING_COSTS.UNIT),
      onTrigger: () => {
        onBuildUnit();
        onToggleOpen();
      },
    },
    {
      id: 'MOVE_FLEET',
      title: 'Mover Barcos y Explorar en el Mapa',
      subtitle: 'Selecciona un barco en el mapa para navegar, descubrir o fundar',
      remainingLabel: `${myShips.filter((s) => s.mpRemaining > 0).length}/${myShips.length} barcos`,
      icon: <Compass className="w-6 h-6 text-amber-300" />,
      cost: {},
      badgeLabel: '4–8 PM',
      canExecute: canActMain && myShips.length > 0,
      onTrigger: () => {
        onSelectMode('MOVE_EP_SHIP');
        onToggleOpen();
      },
    },
    ...(ep.activeMissions.includes('FISH_FOR_CATAN')
      ? [
          {
            id: 'ROLL_FISH',
            title: 'Buscar Banco de Peces (1 Dado)',
            subtitle: 'Tira 1 dado para hacer aparecer peces en alta mar (1x/turno)',
            remainingLabel: ep.hasRolledFishThisTurn ? 'Ya lanzado' : 'Disponible',
            icon: (
              <img
                src={EP_TOKEN_ASSETS.FISH_SHOAL}
                alt="Banco de Peces"
                className="w-7 h-7 rounded-full object-cover shadow"
              />
            ),
            cost: {},
            badgeLabel: '1d6 🐟',
            canExecute: canActMain && !ep.hasRolledFishThisTurn,
            onTrigger: () => {
              onRollFishShoal();
              onToggleOpen();
            },
          },
        ]
      : []),
    ...(ep.activeMissions.includes('PIRATE_LAIRS') ||
    ep.scenario === 'EXPLORERS_AND_PIRATES_FULL'
      ? [
          {
            id: 'PLACE_PIRATE',
            title: 'Posicionar Barco Pirata',
            subtitle: 'Coloca el Barco Pirata en un hexágono de mar y exige tributo',
            remainingLabel: ep.activePirateShip ? 'En mar' : 'Disponible',
            icon: <Anchor className="w-5 h-5 text-red-400" />,
            cost: {},
            badgeLabel: 'Pirata',
            canExecute: canActMain,
            onTrigger: () => {
              onSelectMode('PLACE_PIRATE_SHIP');
              onToggleOpen();
            },
          },
        ]
      : []),
    {
      id: 'EP_MODAL',
      title: 'Misiones, Bodegas y Mercado de Oro',
      subtitle: 'Gestiona carga, descarga en el Consejo y compra recursos por 2 oros',
      remainingLabel: `${pep.goldCoins} oros`,
      icon: <Coins className="w-5 h-5 text-[#d4af37]" />,
      cost: {},
      badgeLabel: 'Abrir',
      canExecute: true,
      onTrigger: () => {
        onToggleOpen();
        onOpenPanelModal();
      },
    },
  ];

  if (activeMode !== null) {
    const modeLabels: Record<NonNullable<ActiveExplorersBoardMode>, string> = {
      UPGRADE_HARBOR_CITY: 'Ciudad Portuaria',
      BUILD_EP_SHIP: 'Botar Barco',
      MOVE_EP_SHIP: 'Navegar Flota',
      PLACE_PIRATE_SHIP: 'Colocar Barco Pirata',
    };
    return (
      <div className="relative flex items-center w-full">
        <motion.button
          type="button"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => onSelectMode(null)}
          className="tablet-action-btn w-full px-3 py-2 rounded-lg bg-[#9e2b25] hover:bg-[#b5352e] border border-red-300/60 text-white font-bold text-xs flex items-center justify-between gap-2 shadow-md cursor-pointer opacity-100"
        >
          <span className="flex items-center gap-1.5 truncate">
            <X className="w-3.5 h-3.5 stroke-[3] shrink-0" />
            <span className="truncate">Cancelar ({modeLabels[activeMode]})</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[9px] text-red-100">
            ESC
          </span>
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
              key="explorers-pirates-drawer"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="tablet-drawer absolute bottom-[calc(100%+10px)] left-0 z-50 w-[340px] sm:w-[420px] rounded-2xl bg-[#18110c] border border-[#c89b3c]/70 p-4 shadow-[0_18px_48px_rgba(8,5,3,0.92)] space-y-3 cursor-default opacity-100"
            >
              <div className="flex items-center justify-between border-b border-[#c89b3c]/25 pb-2.5">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-[#d4af37]" />
                  <span className="font-display text-sm font-bold tracking-wide text-amber-100">
                    Flota y exploración
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleOpen}
                  aria-label="Cerrar menú de flota y exploración"
                  className="p-2 rounded-md bg-[#261c14] hover:bg-[#32251a] text-stone-300 cursor-pointer opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-[65dvh] overflow-y-auto pr-1">
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
                            <div
                              key={res}
                              className="flex items-center gap-0.5 tabular-nums"
                              title={`${count}x ${RESOURCE_META[res].name}`}
                            >
                              <span className="text-[10px] font-bold text-amber-200">{count}</span>
                              <ResourceIcon resource={res} size={13} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-200 bg-[#2a1f14] border border-[#c89b3c]/45 px-2 py-0.5 rounded-md opacity-100 shrink-0">
                          {opt.badgeLabel || 'Acción'}
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
        title="Flota, Colonos, Unidades y Exploración Marítima"
      >
        <span className="flex items-center gap-1.5 truncate">
          <img
            src={getEPShipToken(me.color)}
            alt="Flota"
            className="w-4 h-4 rounded-full object-cover shrink-0 border border-amber-300/60"
          />
          <span className="truncate tabular-nums">
            Flota ({myShips.length}/3 · {pep.goldCoins} oros)
          </span>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-black/35 font-mono text-[9px] text-amber-300/80">
          K
        </span>
      </button>
    </div>
  );
};
