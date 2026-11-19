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
    {
      id: 'EP_MODAL',
      title: 'Misiones, Bodegas y Mercado de Oro',
      subtitle: 'Gestiona carga, descarga en el Consejo y compra recursos por 2 oros',
      remainingLabel: `${pep.goldCoins} 🪙`,
      icon: <Coins className="w-5 h-5 text-yellow-300" />,
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
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => onSelectMode(null)}
          className="tablet-action-btn w-full px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 border border-red-300/80 text-white font-black text-xs flex items-center justify-between gap-2 shadow-[0_0_20px_rgba(239,68,68,0.6)] cursor-pointer animate-pulse opacity-100"
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
              className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] cursor-pointer"
            />
            <motion.div
              key="explorers-pirates-drawer"
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="tablet-drawer absolute bottom-[calc(100%+12px)] left-0 z-50 w-[340px] sm:w-[430px] rounded-3xl bg-[#1a120b] bg-gradient-to-b from-[#241911] to-[#120c08] border-2 border-[#d4af37] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.95)] space-y-3 cursor-default opacity-100"
            >
              <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-2.5">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-amber-400" />
                  <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-amber-100">
                    Flota y Exploración (Piratas y Exploradores)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleOpen}
                  className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {options.map((opt) => {
                  const costEntries = Object.entries(opt.cost) as [ResourceType, number][];
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!opt.canExecute}
                      onClick={opt.onTrigger}
                      className={`tablet-drawer-item w-full p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 opacity-100 ${
                        opt.canExecute
                          ? 'bg-gradient-to-r from-[#2c1f14] via-[#22170f] to-[#1a120b] hover:from-[#382719] hover:to-[#281b11] border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.28)] cursor-pointer scale-[1.01]'
                          : 'bg-[#150f0b] border-stone-800 text-stone-300 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl shrink-0 border opacity-100 ${
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
                        <div className="flex items-center gap-1.5 shrink-0 bg-black/60 px-2 py-1 rounded-xl border border-white/10 opacity-100">
                          {costEntries.map(([res, count]) => (
                            <div
                              key={res}
                              className="flex items-center gap-0.5"
                              title={`${count}x ${RESOURCE_META[res].name}`}
                            >
                              <span className="text-[10px] font-black text-amber-200">{count}</span>
                              <ResourceIcon resource={res} size={13} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950 border border-amber-500/50 px-2 py-0.5 rounded-lg opacity-100 shrink-0">
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
        className={`tablet-action-btn w-full px-3 py-2 rounded-xl border text-xs font-black flex items-center justify-between gap-2 transition cursor-pointer active:scale-98 opacity-100 ${
          isOpen
            ? 'bg-amber-950 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
            : 'bg-[#2a1d13] bg-gradient-to-r from-[#2a1d13] via-[#332317] to-[#20150d] hover:from-[#3a281a] hover:to-[#2d1e13] border-[#d4af37]/60 text-amber-200 shadow'
        }`}
        title="Flota, Colonos, Unidades y Exploración Marítima"
      >
        <span className="flex items-center gap-1.5 truncate">
          <img
            src={getEPShipToken(me.color)}
            alt="Flota"
            className="w-4 h-4 rounded-full object-cover shrink-0 border border-amber-300/60"
          />
          <span className="truncate">
            Flota ({myShips.length}/3 · {pep.goldCoins} 🪙)
          </span>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-black/35 font-mono text-[9px] text-amber-300/80">
          K
        </span>
      </button>
    </div>
  );
};
