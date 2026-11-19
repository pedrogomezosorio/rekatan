import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  Compass,
  Fish,
  Hammer,
  Route,
  Shield,
  Sparkles,
  Swords,
  Truck,
  X,
} from 'lucide-react';
import { BUILDING_COSTS, RESOURCE_META } from '../../shared/constants';
import {
  MB_CARD_ASSETS,
  MB_TOKEN_ASSETS,
  WAGON_LEVELS,
  getBridgeToken,
  getWagonCardImage,
  getWagonCostCardImage,
} from '../../shared/expansionsConfig';
import type { GameState, PlayerState, ResourceType } from '../../shared/types';
import { ResourceIcon } from '../UI/ResourceIcon';

export type ActiveBarbariansBoardMode =
  | 'FISH_FREE_ROAD'
  | 'PLACE_BRIDGE'
  | 'PLACE_CAMEL'
  | 'PLACE_EDGE_KNIGHT'
  | 'MOVE_EDGE_KNIGHT'
  | 'MOVE_WAGON'
  | 'MOVE_EDGE_BARBARIAN'
  | null;

interface BarbariansDrawerMenuProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeMode: ActiveBarbariansBoardMode;
  onSelectMode: (mode: ActiveBarbariansBoardMode) => void;
  gameState: GameState;
  me: PlayerState;
  isMyTurn: boolean;
  disabledBeforeDice: boolean;
  onOpenPanelModal: () => void;
  onBuyScenarioDevCard: () => void;
  onUpgradeWagon: () => void;
  onBoostWagon: () => void;
  onFishRemoveRobber: () => void;
  onFishFreeDevCard: () => void;
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

export const BarbariansDrawerMenu: React.FC<BarbariansDrawerMenuProps> = ({
  isOpen,
  onToggleOpen,
  activeMode,
  onSelectMode,
  gameState,
  me,
  isMyTurn,
  disabledBeforeDice,
  onOpenPanelModal,
  onBuyScenarioDevCard,
  onUpgradeWagon,
  onBoostWagon,
  onFishRemoveRobber,
  onFishFreeDevCard,
}) => {
  const mb = gameState.barbarians;
  const pb = me.barbarians;
  if (!mb || !pb) return null;

  const canActMain = isMyTurn && !disabledBeforeDice && gameState.phase === 'MAIN_PHASE';
  const canActBuild =
    isMyTurn &&
    !disabledBeforeDice &&
    (gameState.phase === 'MAIN_PHASE' || gameState.phase === 'SPECIAL_BUILD_PHASE');

  const totalFish = pb.fishTokens.reduce((sum, t) => sum + t.fishCount, 0);
  const hasRes = (cost: Partial<Record<ResourceType, number>>) =>
    Object.entries(cost).every(([r, n]) => (me.resources[r as ResourceType] || 0) >= (n || 0));

  const options: DrawerOptionSpec[] = [];

  if (mb.scenario === 'FISHERMEN_OF_CATAN') {
    options.push(
      {
        id: 'FISH_ROAD',
        title: 'Carretera Gratis (5 Pescados)',
        subtitle: 'Haz clic en un camino iluminado del mapa',
        remainingLabel: `${totalFish} peces`,
        icon: <Route className="w-5 h-5 text-sky-300" />,
        cost: {},
        badgeLabel: '5 🐟',
        canExecute: canActMain && totalFish >= 5 && me.roadsLeft > 0,
        onTrigger: () => {
          onSelectMode('FISH_FREE_ROAD');
          onToggleOpen();
        },
      },
      {
        id: 'FISH_ROBBER',
        title: 'Ahuyentar Ladrón (2 Pescados)',
        subtitle: 'Retira el ladrón fuera del tablero',
        remainingLabel: state.HasRobberLabel(gameState),
        icon: <Shield className="w-5 h-5 text-amber-300" />,
        cost: {},
        badgeLabel: '2 🐟',
        canExecute: canActMain && totalFish >= 2 && Boolean(gameState.board.robberHexId),
        onTrigger: () => {
          onFishRemoveRobber();
          onToggleOpen();
        },
      },
      {
        id: 'FISH_DEV',
        title: 'Desarrollo Gratis (7 Pescados)',
        subtitle: 'Toma 1 carta de desarrollo sin coste',
        remainingLabel: `${gameState.devDeck.length} en mazo`,
        icon: <Sparkles className="w-5 h-5 text-purple-300" />,
        cost: {},
        badgeLabel: '7 🐟',
        canExecute: canActMain && totalFish >= 7 && gameState.devDeck.length > 0,
        onTrigger: () => {
          onFishFreeDevCard();
          onToggleOpen();
        },
      },
      {
        id: 'FISH_MARKET',
        title: 'Mercado de Pescado (3 ó 4 Pescados)',
        subtitle: 'Robar a rival (3), tomar recurso (4) o entregar Bota vieja',
        remainingLabel: pb.hasOldBoot ? 'Bota vieja (+1 PV)' : `${pb.fishTokens.length}/7 fichas`,
        icon: (
          <img
            src={pb.hasOldBoot ? MB_TOKEN_ASSETS.OLD_BOOT : MB_TOKEN_ASSETS.FISH}
            alt={pb.hasOldBoot ? 'Bota vieja' : 'Ficha de pescado'}
            className="w-7 h-7 rounded-full object-cover shadow"
            draggable={false}
          />
        ),
        cost: {},
        badgeLabel: 'Menú',
        canExecute: true,
        onTrigger: () => {
          onToggleOpen();
          onOpenPanelModal();
        },
      }
    );
  } else if (mb.scenario === 'RIVERS_OF_CATAN') {
    options.push(
      {
        id: 'BRIDGE',
        title: 'Construir Puente (+3 Oros)',
        subtitle: 'Haz clic en un paso de puente iluminado sobre el río',
        remainingLabel: `${pb.bridgesLeft} disp.`,
        icon: (
          <img
            src={getBridgeToken(me.color)}
            alt="Puente"
            className="w-8 h-5 rounded object-cover border border-amber-400/60 shadow"
            draggable={false}
          />
        ),
        cost: { BRICK: 2, WOOD: 1 },
        canExecute: canActBuild && pb.bridgesLeft > 0 && hasRes({ BRICK: 2, WOOD: 1 }),
        onTrigger: () => {
          onSelectMode('PLACE_BRIDGE');
          onToggleOpen();
        },
      },
      {
        id: 'GOLD_MARKET',
        title: 'Comercio de Oro (2 Oros → 1 Recurso)',
        subtitle: 'Compra hasta 2 materias primas por turno con tu oro',
        remainingLabel: `${pb.goldCoins} oros`,
        icon: (
          <img
            src={pb.goldCoins >= 5 ? MB_TOKEN_ASSETS.GOLD_COIN_5 : MB_TOKEN_ASSETS.GOLD_COIN_1}
            alt="Oro"
            className="w-7 h-7 rounded-full object-cover shadow"
            draggable={false}
          />
        ),
        cost: {},
        badgeLabel: '2 Oros',
        canExecute: true,
        onTrigger: () => {
          onToggleOpen();
          onOpenPanelModal();
        },
      }
    );
  } else if (mb.scenario === 'THE_CARAVANS') {
    options.push(
      {
        id: 'CAMEL_MAP',
        title: 'Colocar Camello en el Mapa',
        subtitle: 'Haz clic en un camino iluminado para prolongar la caravana',
        remainingLabel: `${mb.camelsRemaining} camellos`,
        icon: (
          <img
            src={MB_TOKEN_ASSETS.CAMEL}
            alt="Camello"
            className="w-7 h-7 rounded-full object-cover shadow"
            draggable={false}
          />
        ),
        cost: {},
        badgeLabel: mb.pendingCamelVote ? '¡Activo!' : 'Caravana',
        canExecute: canActBuild && mb.camelsRemaining > 0,
        onTrigger: () => {
          onSelectMode('PLACE_CAMEL');
          onToggleOpen();
        },
      },
      {
        id: 'CAMEL_VOTE_MODAL',
        title: 'Votación de Caravana (Lana / Trigo)',
        subtitle: 'Aporta cartas de Lana o Trigo para decidir el rumbo',
        remainingLabel: `${mb.camelEdgeIds.length} en ruta`,
        icon: <Sparkles className="w-5 h-5 text-yellow-300" />,
        cost: {},
        badgeLabel: 'Votar',
        canExecute: true,
        onTrigger: () => {
          onToggleOpen();
          onOpenPanelModal();
        },
      }
    );
  } else if (mb.scenario === 'BARBARIAN_ATTACK') {
    options.push(
      {
        id: 'BA_DEV_CARD',
        title: 'Comprar Carta de Escenario',
        subtitle: 'Se juega al instante (Armar Caballero, Prisionero, Traición)',
        remainingLabel: `${mb.scenarioDevDeck.length} en mazo`,
        icon: (
          <img
            src={MB_CARD_ASSETS.DEV_BACK}
            alt="Carta El ataque de los Bárbaros"
            className="w-6 h-8 rounded object-cover border border-amber-400/60 shadow"
            draggable={false}
          />
        ),
        cost: BUILDING_COSTS.DEV_CARD,
        canExecute:
          canActBuild && mb.scenarioDevDeck.length > 0 && hasRes(BUILDING_COSTS.DEV_CARD),
        onTrigger: () => {
          onBuyScenarioDevCard();
          onToggleOpen();
        },
      },
      {
        id: 'BA_MOVE_KNIGHT',
        title: 'Mover Caballero en el Mapa',
        subtitle: 'Selecciona tu caballero y luego el camino de destino',
        remainingLabel: `${Object.values(mb.edgeKnights).filter((k) => k.playerId === me.id && k.mpRemaining > 0)
          .length
          } listos`,
        icon: <Swords className="w-5 h-5 text-amber-300" />,
        cost: {},
        badgeLabel: '3–5 PM',
        canExecute:
          canActBuild &&
          Object.values(mb.edgeKnights).some((k) => k.playerId === me.id && k.mpRemaining > 0),
        onTrigger: () => {
          onSelectMode('MOVE_EDGE_KNIGHT');
          onToggleOpen();
        },
      },
      {
        id: 'BA_PLACE_KNIGHT',
        title: 'Desplegar Caballero en Camino',
        subtitle: 'Haz clic en un camino iluminado del Castillo',
        remainingLabel: `${pb.knightsReserve} en reserva`,
        icon: <Shield className="w-5 h-5 text-emerald-300" />,
        cost: {},
        badgeLabel: 'Reserva',
        canExecute: canActBuild && pb.knightsReserve > 0,
        onTrigger: () => {
          onSelectMode('PLACE_EDGE_KNIGHT');
          onToggleOpen();
        },
      },
      {
        id: 'BA_GOLD_MARKET',
        title: 'Prisioneros y Mercado de Oro',
        subtitle: 'Canjea 2 monedas de oro por 1 materia prima',
        remainingLabel: `${pb.prisonersCount} pris. · ${pb.goldCoins} oros`,
        icon: (
          <img
            src={MB_TOKEN_ASSETS.BARBARIAN}
            alt="Bárbaros y oro"
            className="w-7 h-7 rounded-full object-cover shadow"
            draggable={false}
          />
        ),
        cost: {},
        badgeLabel: '2 Oros',
        canExecute: true,
        onTrigger: () => {
          onToggleOpen();
          onOpenPanelModal();
        },
      }
    );
  } else if (mb.scenario === 'TRADERS_AND_BARBARIANS') {
    const nextWagonLevel = pb.wagonLevel < 5 ? ((pb.wagonLevel + 1) as 2 | 3 | 4 | 5) : null;
    const nextWagonSpec = nextWagonLevel ? WAGON_LEVELS[nextWagonLevel] : null;
    options.push(
      {
        id: 'TB_MOVE_WAGON',
        title: 'Mover Carromato en el Mapa',
        subtitle: 'Haz clic en las encrucijadas iluminadas para avanzar',
        remainingLabel: `${pb.wagonMpRemaining} PM disp.`,
        icon: (
          <img
            src={getWagonCardImage(pb.wagonLevel, me.color)}
            alt={`Carromato Nv.${pb.wagonLevel}`}
            className="w-6 h-8 rounded object-cover border border-amber-400/60 shadow"
            draggable={false}
          />
        ),
        cost: {},
        badgeLabel: `${pb.wagonMpRemaining} PM`,
        canExecute: canActMain && Boolean(pb.wagonVertexId) && pb.wagonMpRemaining > 0,
        onTrigger: () => {
          onSelectMode('MOVE_WAGON');
          onToggleOpen();
        },
      },
      {
        id: 'TB_UPGRADE_WAGON',
        title: nextWagonSpec
          ? `Mejorar a Nivel ${nextWagonSpec.level}`
          : 'Carromato Nivel 5 Máximo (+1 PV)',
        subtitle: nextWagonSpec
          ? `${nextWagonSpec.movementPoints} PM y +${nextWagonSpec.goldReward} oros por entrega`
          : 'Velocidad y recompensa máxima alcanzadas',
        remainingLabel: `Nv.${pb.wagonLevel}/5`,
        icon: (
          <img
            src={
              nextWagonLevel
                ? getWagonCostCardImage(nextWagonLevel)
                : getWagonCardImage(5, me.color)
            }
            alt="Mejora de carromato"
            className="w-6 h-8 rounded object-cover border border-emerald-400/60 shadow"
            draggable={false}
          />
        ),
        cost: nextWagonSpec ? nextWagonSpec.upgradeCost : {},
        canExecute: Boolean(canActBuild && nextWagonSpec && hasRes(nextWagonSpec.upgradeCost)),
        onTrigger: () => {
          onUpgradeWagon();
          onToggleOpen();
        },
      },
      {
        id: 'TB_BOOST_WAGON',
        title: 'Impulsar Carromato (+2 PM)',
        subtitle: 'Alimenta la caravana con 1 Trigo (máx. 1/turno)',
        remainingLabel: pb.wagonBoostedThisTurn ? 'Usado' : 'Disponible',
        icon: <Compass className="w-5 h-5 text-yellow-300" />,
        cost: { WHEAT: 1 },
        canExecute: canActMain && !pb.wagonBoostedThisTurn && hasRes({ WHEAT: 1 }),
        onTrigger: () => {
          onBoostWagon();
          onToggleOpen();
        },
      },
      {
        id: 'TB_DEV_CARD',
        title: 'Carta de Desarrollo de Caravana',
        subtitle: 'Caballero escolta, Buen viaje, Carreteras o +1 PV',
        remainingLabel: `${mb.scenarioDevDeck.length} en mazo`,
        icon: (
          <img
            src={MB_CARD_ASSETS.TB_DEV_BACK}
            alt="Mazo Mercaderes y Bárbaros"
            className="w-6 h-8 rounded object-cover border border-amber-400/60 shadow"
            draggable={false}
          />
        ),
        cost: BUILDING_COSTS.DEV_CARD,
        canExecute:
          canActBuild && mb.scenarioDevDeck.length > 0 && hasRes(BUILDING_COSTS.DEV_CARD),
        onTrigger: () => {
          onBuyScenarioDevCard();
          onToggleOpen();
        },
      }
    );
  }

  if (activeMode !== null) {
    const modeLabels: Record<NonNullable<ActiveBarbariansBoardMode>, string> = {
      FISH_FREE_ROAD: 'Carretera Gratis',
      PLACE_BRIDGE: 'Construir Puente',
      PLACE_CAMEL: 'Colocar Camello',
      PLACE_EDGE_KNIGHT: 'Colocar Caballero',
      MOVE_EDGE_KNIGHT: 'Mover Caballero',
      MOVE_WAGON: 'Mover Carromato',
      MOVE_EDGE_BARBARIAN: 'Mover Bárbaro',
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

  const buttonLabel =
    mb.scenario === 'FISHERMEN_OF_CATAN'
      ? `Pesca (${totalFish} 🐟)`
      : mb.scenario === 'RIVERS_OF_CATAN'
        ? `Ríos (${pb.goldCoins} 🪙)`
        : mb.scenario === 'THE_CARAVANS'
          ? `Caravanas (${mb.camelsRemaining} 🐪)`
          : mb.scenario === 'BARBARIAN_ATTACK'
            ? `Caballeros (${pb.prisonersCount} Pris.)`
            : `Carromato (Nv.${pb.wagonLevel} · ${pb.wagonMpRemaining} PM)`;

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
              key="barbarians-drawer"
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="tablet-drawer absolute bottom-[calc(100%+12px)] left-0 z-50 w-[340px] sm:w-[430px] rounded-3xl bg-[#1a120b] bg-gradient-to-b from-[#241911] to-[#120c08] border-2 border-[#d4af37] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.95)] space-y-3 cursor-default opacity-100"
            >
              <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-2.5">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-amber-100">
                    Acciones de Mercaderes y Bárbaros
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

              <div className="space-y-2">
                {options.map((opt) => {
                  const costEntries = Object.entries(opt.cost) as [ResourceType, number][];
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!opt.canExecute}
                      onClick={opt.onTrigger}
                      className={`tablet-drawer-item w-full p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 opacity-100 ${opt.canExecute
                        ? 'bg-gradient-to-r from-[#2c1f14] via-[#22170f] to-[#1a120b] hover:from-[#382719] hover:to-[#281b11] border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.28)] cursor-pointer scale-[1.01]'
                        : 'bg-[#150f0b] border-stone-800 text-stone-300 cursor-not-allowed'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl shrink-0 border opacity-100 ${opt.canExecute
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
        className={`tablet-action-btn w-full px-3 py-2 rounded-xl border text-xs font-black flex items-center justify-between gap-2 transition cursor-pointer active:scale-98 opacity-100 ${isOpen
          ? 'bg-amber-950 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
          : 'bg-[#2a1d13] bg-gradient-to-r from-[#2a1d13] via-[#332317] to-[#20150d] hover:from-[#3a281a] hover:to-[#2d1e13] border-[#d4af37]/60 text-amber-200 shadow'
          }`}
        title="Acciones del escenario de Mercaderes y Bárbaros"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Swords className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">{buttonLabel}</span>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-black/35 font-mono text-[9px] text-amber-300/80">
          K
        </span>
      </button>
    </div>
  );
};

const state = {
  HasRobberLabel(s: GameState): string {
    return s.board.robberHexId ? 'En tablero' : 'Fuera';
  },
};
