import { CitiesKnightsPanel } from './CitiesKnightsPanel';
import { hasCitiesKnights, BRANCH_META, PROGRESS_CARDS } from '../../shared/citiesKnightsConfig';
import {
  MB_CARD_ASSETS,
  getCatanEventCardImage,
  hasBarbarians,
  hasExplorersPirates,
} from '../../shared/expansionsConfig';
import { getValidCamelEdges } from '../../shared/engine/BarbariansEngine';
import { BarbariansPanel } from './BarbariansPanel';
import { BarbariansDrawerMenu, ActiveBarbariansBoardMode } from './BarbariansDrawerMenu';
import { ExplorersPiratesPanel } from './ExplorersPiratesPanel';
import { ExplorersPiratesDrawerMenu, ActiveExplorersBoardMode } from './ExplorersPiratesDrawerMenu';
import {
  cityCost,
  freeRank,
  ownKnights,
  isOpenEdge,
  knightRecruitVertices,
  knightReachableVertices,
  isRobberUnlocked,
} from '../../shared/engine/CitiesAndKnights';
import { KnightsDrawerMenu, ActiveKnightMode } from './KnightsDrawerMenu';
import type { ProgressCard } from '../../shared/citiesKnightsTypes';
import { playerCardStyle } from '../UI/playerCardStyle';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Anchor,
  ArrowRightLeft,
  Award,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Dices,
  Flame,
  Hammer,
  Layers,
  Lock,
  LogOut,
  Pause,
  PauseCircle,
  Play,
  Route,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
  Swords,
  SkipForward,
  Users,
  X,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { PerformancePreference, usePerformance } from '../../context/PerformanceContext';
import {
  ALL_RESOURCES,
  ALL_TRADE_CARDS,
  BUILDING_COSTS,
  CARD_BACK_PATHS,
  countTotalResources,
  PLAYER_COLORS,
  PROGRESS_BACK_IMAGE_PATHS,
  RESOURCE_CARD_PATHS,
  RESOURCE_META,
} from '../../shared/constants';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import {
  canBuyDevCard,
  canSpendOrBuildThisTurn,
  canTradeThisTurn,
  getPlayerBankTradeRatios,
  getMovableShipEdges,
  getValidCityVertices,
  getValidRoadEdges,
  getValidSettlementVertices,
  getValidShipEdges,
  getValidShipMoveDestinations,
  hasResources,
} from '../../shared/engine/RulesEngine';
import { PlayerState, ResourceType, TradeCardType } from '../../shared/types';
import { Board } from '../Board/Board';
import { OverlayAnimations } from '../Animations/OverlayAnimations';
import { AvatarIcon, ResourceIcon } from '../UI/ResourceIcon';
import { BuildDrawerMenu, ActiveBuildMode } from './BuildDrawerMenu';
import { ResourceHandFan } from './ResourceHandFan';
import { WondersModal } from './WondersPanel';
import {
  AbandonConfirmModal,
  ActiveTradeFloatingBanner,
  DevCardModal,
  DisconnectResolutionBanner,
  GoldClaimModal,
  RobberDiscardModal,
  RobberStealModal,
  TradeModal,
  TurnOrderModal,
  VictoryModal,
} from './GameModals';

export const GameScreen: React.FC = () => {
  const {
    gameState,
    playerId,
    dispatchAction,
    leaveRoomClient,
    setLowEndPcMode,
  } = useGame();
  const {
    preference: perfPreference,
    setPreference: setPerfPreference,
    autoTier,
    tier: perfTier,
    isLite: effectiveLowEndMode,
    lockBoardPan,
    setLockBoardPan,
  } = usePerformance();

  const [ckHighlightedVertex, setCKHighlightedVertex] = useState<string | null>(null);
  const [activeKnightMode, setActiveKnightMode] = useState<ActiveKnightMode>(null);
  const [isKnightsDrawerOpen, setIsKnightsDrawerOpen] = useState(false);
  const [isBarbariansDrawerOpen, setIsBarbariansDrawerOpen] = useState(false);
  const [activeBarbariansMode, setActiveBarbariansMode] = useState<ActiveBarbariansBoardMode>(null);
  const [selectedEdgeKnightEdgeId, setSelectedEdgeKnightEdgeId] = useState<string | null>(null);
  const [selectedEdgeBarbarianId, setSelectedEdgeBarbarianId] = useState<string | null>(null);
  const [pendingCamelBid, setPendingCamelBid] = useState<{ sheepCards: number; wheatCards: number }>({
    sheepCards: 0,
    wheatCards: 0,
  });
  const [isExplorersDrawerOpen, setIsExplorersDrawerOpen] = useState(false);
  const [activeExplorersMode, setActiveExplorersMode] = useState<ActiveExplorersBoardMode>(null);
  const [selectedEPShipId, setSelectedEPShipId] = useState<string | null>(null);
  const [selectedKnightMoveFrom, setSelectedKnightMoveFrom] = useState<string | null>(null);
  const [isPlacingMerchant, setIsPlacingMerchant] = useState(false);
  const [activeProgressCard, setActiveProgressCard] = useState<ProgressCard | null>(null);
  const [selectedDiplomatEdgeId, setSelectedDiplomatEdgeId] = useState<string | null>(null);
  const [selectedInventorHexIds, setSelectedInventorHexIds] = useState<string[]>([]);
  const [selectedSmithVertexIds, setSelectedSmithVertexIds] = useState<string[]>([]);
  const [buildMode, setBuildMode] = useState<ActiveBuildMode>(null);
  const [selectedMovableShipId, setSelectedMovableShipId] = useState<string | null>(null);
  const [isBuildDrawerOpen, setIsBuildDrawerOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const isMobile = useIsMobileViewport();
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeModalInitialTab, setTradeModalInitialTab] = useState<'PLAYERS' | 'BANK'>('BANK');
  const [showDevModal, setShowDevModal] = useState(false);
  const [showWonders, setShowWonders] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChronicle, setShowChronicle] = useState(false);
  const [isTabletRightPanelVisible, setIsTabletRightPanelVisible] = useState<boolean>(() => window.matchMedia('(min-width: 1024px)').matches);
  const [showProfileCardFans, setShowProfileCardFans] = useState<boolean>(() => {
    try {
      return localStorage.getItem('catan_profile_card_fans') !== 'false';
    } catch {
      return true;
    }
  });
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const toggleProfileCardFans = (nextVal: boolean) => {
    setShowProfileCardFans(nextVal);
    try {
      localStorage.setItem('catan_profile_card_fans', String(nextVal));
    } catch {
      // ignore storage errors
    }
  };

  // Non-overlapping FIFO Notification Queue (3.8s / 3.5-4s) for Human & Bot Transactions/Actions
  const [noticeQueue, setNoticeQueue] = useState<
    Array<{
      id: string;
      kind: 'BANK_TRADE' | 'PLAYER_TRADE' | 'BUILD' | 'DEV_CARD' | 'KNIGHT' | 'BOT';
      message: string;
      durationMs: number;
      giveItems?: Array<{ resource: TradeCardType; amount: number }>;
      receiveItems?: Array<{ resource: TradeCardType; amount: number }>;
      ratio?: 2 | 3 | 4;
      isBotActor?: boolean;
    }>
  >([]);
  const lastSeenNoticeEventNonceRef = useRef<number>(gameState?.lastEvent?.nonce ?? 0);
  const lastSeenOfferIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameState) return;
    const ev = gameState.lastEvent;
    if (ev && ev.nonce !== lastSeenNoticeEventNonceRef.current) {
      lastSeenNoticeEventNonceRef.current = ev.nonce;

      // 1. Bank Burn (4:1) or Port Trade (3:1 / 2:1) by Human or Bot
      if (ev.bankTradeNotice) {
        const b = ev.bankTradeNotice;
        setNoticeQueue((prev) => [
          ...prev,
          {
            id: `BANK_TRADE_${ev.nonce}`,
            kind: 'BANK_TRADE',
            message: b.message,
            durationMs: 3800,
            giveItems: [{ resource: b.giveResource, amount: b.giveAmount }],
            receiveItems: [{ resource: b.receiveResource, amount: b.receiveAmount }],
            ratio: b.ratio,
          },
        ]);
      } else if (ev.completedTrade) {
        // 2. Completed Player-to-Player Trade by Human or Bot
        const ct = ev.completedTrade;
        const giveItems = ALL_TRADE_CARDS.filter((r) => (ct.offered[r] || 0) > 0).map((r) => ({
          resource: r,
          amount: ct.offered[r] || 0,
        }));
        const receiveItems = ALL_TRADE_CARDS.filter((r) => (ct.requested[r] || 0) > 0).map((r) => ({
          resource: r,
          amount: ct.requested[r] || 0,
        }));
        setNoticeQueue((prev) => [
          ...prev,
          {
            id: `PLAYER_TRADE_${ev.nonce}`,
            kind: 'PLAYER_TRADE',
            message: `${ct.proposerName} intercambió con ${ct.accepterName}`,
            durationMs: 3800,
            giveItems,
            receiveItems,
          },
        ]);
      } else if (ev.builtItem) {
        // 3. Building Placed (Road, Settlement, City) by Human or Bot
        const builder = gameState.players.find((p) => p.id === ev.builtItem?.playerId);
        const builderName = builder?.name || 'Un jugador';
        const isSetupPhase =
          gameState.phase.startsWith('SETUP_') ||
          (ev.flights && ev.flights.some((f) => f.id.startsWith('FLIGHT_SETUP_')));

        if (ev.builtItem.type === 'CITY') {
          setNoticeQueue((prev) => [
            ...prev,
            {
              id: `BUILD_CITY_${ev.nonce}`,
              kind: 'BUILD',
              message: `${builderName} construyó una Ciudad (+2 PV)`,
              durationMs: 3800,
              giveItems: [
                { resource: 'WHEAT', amount: 2 },
                { resource: 'ORE', amount: 3 },
              ],
              isBotActor: builder?.isBot,
            },
          ]);
        } else if (ev.builtItem.type === 'SETTLEMENT') {
          if (isSetupPhase) {
            const gained = (ev.flights || []).map((f) => ({
              resource: f.resource,
              amount: f.amount,
            }));
            setNoticeQueue((prev) => [
              ...prev,
              {
                id: `BUILD_SETUP_SETTLEMENT_${ev.nonce}`,
                kind: 'BUILD',
                message: `${builderName} colocó un Poblado inicial`,
                durationMs: 3800,
                receiveItems: gained.length > 0 ? gained : undefined,
                isBotActor: builder?.isBot,
              },
            ]);
          } else {
            setNoticeQueue((prev) => [
              ...prev,
              {
                id: `BUILD_SETTLEMENT_${ev.nonce}`,
                kind: 'BUILD',
                message: `${builderName} construyó un Poblado (+1 PV)`,
                durationMs: 3800,
                giveItems: [
                  { resource: 'WOOD', amount: 1 },
                  { resource: 'BRICK', amount: 1 },
                  { resource: 'SHEEP', amount: 1 },
                  { resource: 'WHEAT', amount: 1 },
                ],
                isBotActor: builder?.isBot,
              },
            ]);
          }
        } else if (ev.builtItem.type === 'ROAD') {
          const isFreeRoad =
            gameState.phase === 'ROAD_BUILDING_DEV' ||
            (ev.botActionNotice && ev.botActionNotice.includes('gratuita'));
          const isSetupRoad =
            gameState.phase.startsWith('SETUP_') ||
            (ev.botActionNotice && ev.botActionNotice.includes('inicial'));

          setNoticeQueue((prev) => [
            ...prev,
            {
              id: `BUILD_ROAD_${ev.nonce}`,
              kind: 'BUILD',
              message: isSetupRoad
                ? `${builderName} colocó una Carretera inicial`
                : isFreeRoad
                ? `${builderName} colocó una Carretera gratis (Progreso)`
                : `${builderName} construyó una Carretera`,
              durationMs: 3800,
              giveItems:
                !isSetupRoad && !isFreeRoad
                  ? [
                      { resource: 'WOOD', amount: 1 },
                      { resource: 'BRICK', amount: 1 },
                    ]
                  : undefined,
              isBotActor: builder?.isBot,
            },
          ]);
        }
      } else if (ev.type === 'DEV_CARD_BOUGHT') {
        // 4. Development Card Bought / Progress Card Received by Human or Bot
        const buyer = gameState.players.find((p) => p.id === ev.buyerPlayerId);
        const buyerName = ev.buyerPlayerName || buyer?.name || 'Un jugador';
        const isCK = hasCitiesKnights(gameState.config) || Boolean(ev.progressFlight) || Boolean(ev.eventDie);
        const branchName = ev.progressFlight?.branch
          ? BRANCH_META[ev.progressFlight.branch]?.name
          : ev.eventDie && ev.eventDie !== 'BARBARIAN'
          ? BRANCH_META[ev.eventDie as keyof typeof BRANCH_META]?.name
          : undefined;
        setNoticeQueue((prev) => [
          ...prev,
          {
            id: `BUY_DEV_${ev.nonce}`,
            kind: 'DEV_CARD',
            message: isCK
              ? `${buyerName} obtuvo una Carta de Progreso${branchName ? ` (${branchName})` : ''}`
              : `${buyerName} compró una Carta de Desarrollo`,
            durationMs: 3800,
            giveItems: isCK
              ? undefined
              : [
                  { resource: 'SHEEP', amount: 1 },
                  { resource: 'WHEAT', amount: 1 },
                  { resource: 'ORE', amount: 1 },
                ],
            isBotActor: buyer?.isBot,
          },
        ]);
      } else if (ev.type === ('PROGRESS_CARD_PLAYED' as never)) {
        // 4b. Progress Card Played (Ciudades y Caballeros)
        const anyEv = ev as unknown as { actorPlayerName?: string; actorPlayerId?: string; progressCardType?: keyof typeof PROGRESS_CARDS; nonce: number };
        const actorName = anyEv.actorPlayerName || gameState.players.find((p) => p.id === anyEv.actorPlayerId)?.name || 'Un jugador';
        const cardTitle = anyEv.progressCardType ? PROGRESS_CARDS[anyEv.progressCardType]?.name || anyEv.progressCardType : 'Progreso';
        setNoticeQueue((prev) => [
          ...prev,
          {
            id: `PLAY_PROG_${anyEv.nonce}`,
            kind: 'DEV_CARD',
            message: `${actorName} jugó la Carta de Progreso: ${cardTitle}`,
            durationMs: 3800,
          },
        ]);
      } else if (ev.type === 'DEV_CARD_PLAYED' && ev.devCardType) {
        // 5. Development Card Played by Human or Bot
        const actor = gameState.players.find((p) => p.id === ev.devCardPlayerId);
        const actorName = ev.devCardPlayerName || actor?.name || 'Un jugador';
        let msg = `${actorName} usó una Carta de Desarrollo`;
        let receiveItems: Array<{ resource: TradeCardType; amount: number }> | undefined;

        if (ev.devCardType === 'KNIGHT') {
          msg = `${actorName} desplegó un Caballero y mueve al Ladrón`;
        } else if (ev.devCardType === 'MONOPOLY' && ev.monopolyResource) {
          const stolen = ev.monopolyTotalClaimed ?? 0;
          msg = `${actorName} usó Monopolio con ${RESOURCE_META[ev.monopolyResource].name} (${stolen} confiscada${stolen === 1 ? '' : 's'})`;
          if (stolen > 0) {
            receiveItems = [{ resource: ev.monopolyResource, amount: stolen }];
          }
        } else if (ev.devCardType === 'YEAR_OF_PLENTY' && ev.yearOfPlentyResources?.length === 2) {
          const [r1, r2] = ev.yearOfPlentyResources;
          msg = `${actorName} usó Progreso y tomó ${RESOURCE_META[r1].name} y ${RESOURCE_META[r2].name}`;
          receiveItems =
            r1 === r2
              ? [{ resource: r1, amount: 2 }]
              : [
                  { resource: r1, amount: 1 },
                  { resource: r2, amount: 1 },
                ];
        } else if (ev.devCardType === 'ROAD_BUILDING') {
          msg = `${actorName} usó Progreso: Construcción de Carreteras (2 gratis)`;
        }

        setNoticeQueue((prev) => [
          ...prev,
          {
            id: `PLAY_DEV_${ev.nonce}`,
            kind: ev.devCardType === 'KNIGHT' ? 'KNIGHT' : 'DEV_CARD',
            message: msg,
            durationMs: 3800,
            receiveItems,
            isBotActor: actor?.isBot,
          },
        ]);
      }
    }

    // 6. New Trade Offer Proposed by a Bot or Player
    const latestOffer =
      gameState.activeTradeOffers[gameState.activeTradeOffers.length - 1] || null;
    if (latestOffer && latestOffer.id !== lastSeenOfferIdRef.current) {
      lastSeenOfferIdRef.current = latestOffer.id;
      const proposer = gameState.players.find((p) => p.id === latestOffer.fromPlayerId);
      if (proposer) {
        const giveItems = ALL_TRADE_CARDS.filter((r) => (latestOffer.offer[r] || 0) > 0).map(
          (r) => ({
            resource: r,
            amount: latestOffer.offer[r] || 0,
          })
        );
        const receiveItems = ALL_TRADE_CARDS.filter((r) => (latestOffer.request[r] || 0) > 0).map(
          (r) => ({
            resource: r,
            amount: latestOffer.request[r] || 0,
          })
        );
        setNoticeQueue((prev) => [
          ...prev,
          {
            id: `OFFER_PROPOSED_${latestOffer.id}`,
            kind: 'PLAYER_TRADE',
            message: `${proposer.name} propone intercambio`,
            durationMs: 3800,
            giveItems,
            receiveItems,
            isBotActor: proposer.isBot,
          },
        ]);
      }
    }
  }, [gameState?.lastEvent, gameState?.activeTradeOffers]);

  const currentQueuedNotice = noticeQueue[0] || null;

  useEffect(() => {
    if (!currentQueuedNotice) return;
    const timer = setTimeout(() => {
      setNoticeQueue((prev) => prev.slice(1));
    }, currentQueuedNotice.durationMs);
    return () => clearTimeout(timer);
  }, [currentQueuedNotice?.id]);

  const hasActiveTurnDeadline = Boolean(
    gameState?.turn.turnDeadlineMs &&
      !gameState.turn.isPausedByHost &&
      gameState.phase !== 'GAME_OVER' &&
      gameState.phase !== 'LOBBY'
  );

  useEffect(() => {
    if (!hasActiveTurnDeadline) return;
    setNowMs(Date.now());
    const interval = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(interval);
  }, [hasActiveTurnDeadline, gameState?.turn.turnDeadlineMs]);

  useEffect(() => {
    setBuildMode(null);
    setIsBuildDrawerOpen(false);
    setActiveKnightMode(null);
    setIsKnightsDrawerOpen(false);
    setSelectedKnightMoveFrom(null);
    setIsPlacingMerchant(false);
    setActiveProgressCard(null);
    setSelectedDiplomatEdgeId(null);
    setActiveBarbariansMode(null);
    setSelectedEdgeKnightEdgeId(null);
    setSelectedEdgeBarbarianId(null);
    setIsBarbariansDrawerOpen(false);
    setActiveExplorersMode(null);
    setSelectedEPShipId(null);
    setIsExplorersDrawerOpen(false);
    setIsMobileActionsOpen(false);
  }, [
    gameState?.phase,
    gameState?.turn.activePlayerId,
    gameState?.turn.infrastructureBuiltThisTurn,
  ]);

  const isMyTurn = Boolean(gameState && gameState.turn.activePlayerId === playerId);
  const isPausedByHost = Boolean(gameState?.turn.isPausedByHost);

  // Keyboard shortcuts: 'c' -> Construir, 'd' -> Cartas de Desarrollo, 'i' -> Intercambiar/Comerciar
  useEffect(() => {
    if (!gameState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Keyboard shortcuts for leaving/abandoning game: 'q' -> open modal, 'Enter' -> confirm, 'Escape' -> cancel
      if (showAbandonModal) {
        if (e.key === 'Enter') {
          e.preventDefault();
          setShowAbandonModal(false);
          leaveRoomClient();
          return;
        }
        if (e.key === 'Escape' || key === 'q') {
          e.preventDefault();
          setShowAbandonModal(false);
          return;
        }
        return;
      }

      if (key === 'q') {
        e.preventDefault();
        setShowAbandonModal(true);
        return;
      }

      const waitingDice = gameState.phase === 'WAITING_FOR_DICE' && isMyTurn;
      if (isPausedByHost || gameState.phase === 'GAME_OVER') return;
      if (waitingDice && !(key === 'd' && hasCitiesKnights(gameState.config)) && key !== 'escape') return;

      if (key === 'escape') {
        e.preventDefault();
        setIsBuildDrawerOpen(false);
        setShowDevModal(false);
        setShowTradeModal(false);
        setIsKnightsDrawerOpen(false);
        setIsBarbariansDrawerOpen(false);
        setIsExplorersDrawerOpen(false);
        setBuildMode(null);
        setActiveKnightMode(null);
        setSelectedKnightMoveFrom(null);
        setActiveBarbariansMode(null);
        setSelectedEdgeKnightEdgeId(null);
        setSelectedEdgeBarbarianId(null);
        setActiveExplorersMode(null);
        setSelectedEPShipId(null);
        setIsPlacingMerchant(false);
        setActiveProgressCard(null);
        setSelectedDiplomatEdgeId(null);
        setSelectedInventorHexIds([]);
        setSelectedSmithVertexIds([]);
        return;
      }

      if (key === 'c') {
        e.preventDefault();
        setShowTradeModal(false);
        setShowDevModal(false);
        setIsKnightsDrawerOpen(false);
        setIsBarbariansDrawerOpen(false);
        setIsExplorersDrawerOpen(false);
        if (buildMode !== null) {
          setBuildMode(null);
        } else {
          setIsBuildDrawerOpen((prev) => !prev);
        }
      } else if (key === 'd') {
        e.preventDefault();
        setIsBuildDrawerOpen(false);
        setShowTradeModal(false);
        setIsKnightsDrawerOpen(false);
        setIsBarbariansDrawerOpen(false);
        setIsExplorersDrawerOpen(false);
        if (hasCitiesKnights(gameState.config)) {
          window.dispatchEvent(new Event('open-cities-knights'));
        } else if (hasExplorersPirates(gameState.config)) {
          window.dispatchEvent(new Event('open-explorers-pirates-panel'));
        } else if (
          gameState.barbarians?.scenario === 'BARBARIAN_ATTACK' ||
          gameState.barbarians?.scenario === 'TRADERS_AND_BARBARIANS'
        ) {
          window.dispatchEvent(new Event('open-barbarians-panel'));
        } else {
          setShowDevModal((prev) => !prev);
        }
      } else if (key === 'i') {
        e.preventDefault();
        setIsBuildDrawerOpen(false);
        setShowDevModal(false);
        setIsKnightsDrawerOpen(false);
        setIsBarbariansDrawerOpen(false);
        setIsExplorersDrawerOpen(false);
        setTradeModalInitialTab('BANK');
        setShowTradeModal((prev) => !prev);
      } else if (key === 'k') {
        if (hasCitiesKnights(gameState.config)) {
          e.preventDefault();
          setIsBuildDrawerOpen(false);
          setShowDevModal(false);
          setShowTradeModal(false);
          if (activeKnightMode !== null) {
            setActiveKnightMode(null);
            setSelectedKnightMoveFrom(null);
          } else {
            setIsKnightsDrawerOpen((prev) => !prev);
          }
        } else if (hasBarbarians(gameState.config)) {
          e.preventDefault();
          setIsBuildDrawerOpen(false);
          setShowDevModal(false);
          setShowTradeModal(false);
          if (activeBarbariansMode !== null) {
            setActiveBarbariansMode(null);
            setSelectedEdgeKnightEdgeId(null);
            setSelectedEdgeBarbarianId(null);
          } else {
            setIsBarbariansDrawerOpen((prev) => !prev);
          }
        } else if (hasExplorersPirates(gameState.config)) {
          e.preventDefault();
          setIsBuildDrawerOpen(false);
          setShowDevModal(false);
          setShowTradeModal(false);
          if (activeExplorersMode !== null) {
            setActiveExplorersMode(null);
            setSelectedEPShipId(null);
          } else {
            setIsExplorersDrawerOpen((prev) => !prev);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState,
    isMyTurn,
    isPausedByHost,
    buildMode,
    activeKnightMode,
    activeBarbariansMode,
    activeExplorersMode,
    showAbandonModal,
  ]);

  const validSettlementIds = useMemo(() => {
    if (!gameState || !isMyTurn || isPausedByHost) return [];
    if (gameState.phase === 'SETUP_SETTLEMENT_1' || gameState.phase === 'SETUP_SETTLEMENT_2') {
      return getValidSettlementVertices(gameState, playerId);
    }
    if (['MAIN_PHASE', 'SPECIAL_BUILD_PHASE'].includes(gameState.phase) && buildMode === 'SETTLEMENT') {
      return getValidSettlementVertices(gameState, playerId);
    }
    return [];
  }, [gameState, isMyTurn, isPausedByHost, buildMode, playerId]);

  const validRoadIds = useMemo(() => {
    if (!gameState || !isMyTurn || isPausedByHost) return [];
    if (
      gameState.phase === 'SETUP_ROAD_1' ||
      gameState.phase === 'SETUP_ROAD_2' ||
      gameState.phase === 'ROAD_BUILDING_DEV'
    ) {
      return getValidRoadEdges(gameState, playerId);
    }
    if (['MAIN_PHASE', 'SPECIAL_BUILD_PHASE'].includes(gameState.phase) && buildMode === 'ROAD') {
      return getValidRoadEdges(gameState, playerId);
    }
    return [];
  }, [gameState, isMyTurn, isPausedByHost, buildMode, playerId]);

  const validCityIds = useMemo(() => {
    if (!gameState || !isMyTurn || isPausedByHost) return [];
    if (['MAIN_PHASE', 'SPECIAL_BUILD_PHASE'].includes(gameState.phase) && buildMode === 'CITY') {
      return getValidCityVertices(gameState, playerId);
    }
    return [];
  }, [gameState, isMyTurn, isPausedByHost, buildMode, playerId]);

  const isSeafarers = gameState
    ? gameState.config.expansionModule === 'SEAFARERS' || Boolean(gameState.board.pirateHexId)
    : false;

  const validShipIds = useMemo(() => {
    if (!gameState || !isMyTurn || isPausedByHost) return [];
    if (
      gameState.phase === 'SETUP_ROAD_1' ||
      gameState.phase === 'SETUP_ROAD_2' ||
      gameState.phase === 'ROAD_BUILDING_DEV'
    ) {
      return isSeafarers ? getValidShipEdges(gameState, playerId) : [];
    }
    if (['MAIN_PHASE', 'SPECIAL_BUILD_PHASE'].includes(gameState.phase) && buildMode === 'SHIP') {
      return getValidShipEdges(gameState, playerId);
    }
    if (gameState.phase === 'MAIN_PHASE' && buildMode === 'MOVE_SHIP' && selectedMovableShipId) {
      return getValidShipMoveDestinations(gameState, playerId, selectedMovableShipId);
    }
    return [];
  }, [gameState, isMyTurn, isPausedByHost, buildMode, playerId, isSeafarers, selectedMovableShipId]);

  const validMovableShipIds = useMemo(() => {
    if (!gameState || !isMyTurn || isPausedByHost || !isSeafarers) return [];
    if (gameState.phase === 'MAIN_PHASE' && buildMode === 'MOVE_SHIP') {
      return getMovableShipEdges(gameState, playerId);
    }
    return [];
  }, [gameState, isMyTurn, isPausedByHost, buildMode, playerId, isSeafarers]);

  // Maritime Trade Ratios for local player
  const myPortRatios = useMemo<Record<TradeCardType, 2 | 3 | 4>>(
    () =>
      gameState
        ? getPlayerBankTradeRatios(gameState, playerId)
        : { WOOD: 4, BRICK: 4, SHEEP: 4, WHEAT: 4, ORE: 4, PAPER: 4, CLOTH: 4, COIN: 4 },
    [gameState, playerId]
  );

  const hasAnyPort = useMemo(
    () => ALL_RESOURCES.some((r) => myPortRatios[r] < 4),
    [myPortRatios]
  );

  // Turn timer progress (freezes cleanly when paused by host)
  const remainingSec = useMemo(() => {
    if (!gameState?.config.turnTimerSeconds) return null;
    if (
      isPausedByHost &&
      gameState.turn.pausedRemainingTimerMs !== null &&
      gameState.turn.pausedRemainingTimerMs !== undefined
    ) {
      return Math.max(0, Math.ceil(gameState.turn.pausedRemainingTimerMs / 1000));
    }
    if (gameState.turn.turnDeadlineMs) {
      return Math.max(0, Math.ceil((gameState.turn.turnDeadlineMs - nowMs) / 1000));
    }
    return null;
  }, [gameState, isPausedByHost, nowMs]);

  if (!gameState) return null;

  const me = gameState.players.find((p) => p.id === playerId) || gameState.players[0];
  const activePlayer = gameState.players.find((p) => p.id === gameState.turn.activePlayerId);
  const { phase, config, turn, board } = gameState;
  const isWaitingForMandatoryDice = phase === 'WAITING_FOR_DICE';

  // Disable hex glow during all initial placement & order phases
  const isInitialPlacementPhase =
    phase === 'ORDER_ROLL' ||
    phase === 'SETUP_SETTLEMENT_1' ||
    phase === 'SETUP_ROAD_1' ||
    phase === 'SETUP_SETTLEMENT_2' ||
    phase === 'SETUP_ROAD_2';

  const boardProducingHexIds = isInitialPlacementPhase
    ? []
    : gameState.lastEvent?.producingHexIds || [];

  const isMovingRobber = isMyTurn && !isPausedByHost && phase === 'ROBBER_MOVE';

  const timerPercent =
    remainingSec !== null && config.turnTimerSeconds
      ? Math.min(100, Math.max(0, (remainingSec / config.turnTimerSeconds) * 100))
      : 100;
  const isLowTime = !isPausedByHost && remainingSec !== null && remainingSec <= 10;

  const infraPermission = canSpendOrBuildThisTurn(gameState, playerId, true);
  const devBuyPermission = canBuyDevCard(gameState, playerId);
  const tradePermission = canTradeThisTurn(gameState, playerId);

  const canBuildRoadNow =
    isMyTurn &&
    !isPausedByHost &&
    (phase === 'MAIN_PHASE' || phase === 'SPECIAL_BUILD_PHASE') &&
    infraPermission.allowed &&
    me.roadsLeft > 0 &&
    hasResources(me.resources, BUILDING_COSTS.ROAD) &&
    getValidRoadEdges(gameState, playerId).length > 0;

  const canBuildSettlementNow =
    isMyTurn &&
    !isPausedByHost &&
    (phase === 'MAIN_PHASE' || phase === 'SPECIAL_BUILD_PHASE') &&
    infraPermission.allowed &&
    me.settlementsLeft > 0 &&
    hasResources(me.resources, BUILDING_COSTS.SETTLEMENT) &&
    getValidSettlementVertices(gameState, playerId).length > 0;

  const canBuildCityNow =
    isMyTurn &&
    !isPausedByHost &&
    (phase === 'MAIN_PHASE' || phase === 'SPECIAL_BUILD_PHASE') &&
    infraPermission.allowed &&
    (me.citiesLeft > 0 || Object.values(gameState.board.vertices).some(v => v.playerId === me.id && v.isDowngradedCity)) &&
    hasResources(me.resources, cityCost(gameState)) &&
    getValidCityVertices(gameState, playerId).length > 0;

  const canBuildShipNow =
    isMyTurn &&
    !isPausedByHost &&
    (phase === 'MAIN_PHASE' || phase === 'SPECIAL_BUILD_PHASE') &&
    isSeafarers &&
    infraPermission.allowed &&
    (me.shipsLeft ?? 0) > 0 &&
    hasResources(me.resources, BUILDING_COSTS.SHIP) &&
    getValidShipEdges(gameState, playerId).length > 0;

  const canMoveShipNow =
    isMyTurn &&
    !isPausedByHost &&
    phase === 'MAIN_PHASE' &&
    isSeafarers &&
    gameState.config.seafarersMoveShipAllowed !== false &&
    !me.hasMovedShipThisTurn &&
    getMovableShipEdges(gameState, playerId).length > 0;

  const isCitiesKnights = hasCitiesKnights(config);
  const isBarbarians = hasBarbarians(config);
  const isExplorersPirates = hasExplorersPirates(config);
  const usesScenarioDevDeck =
    gameState.barbarians?.scenario === 'BARBARIAN_ATTACK' ||
    gameState.barbarians?.scenario === 'TRADERS_AND_BARBARIANS';
  const hasBottomExpansionHud = isCitiesKnights || isBarbarians || isExplorersPirates;

  const canBuildWallNow =
    isCitiesKnights &&
    isMyTurn &&
    !isPausedByHost &&
    (phase === 'MAIN_PHASE' || phase === 'SPECIAL_BUILD_PHASE') &&
    infraPermission.allowed &&
    (me.resources.BRICK || 0) >= 2 &&
    Object.values(gameState.board.vertices).some(
      (v) => v.playerId === me.id && v.building === 'CITY' && !v.cityWall
    ) &&
    Object.values(gameState.board.vertices).filter(
      (v) => v.playerId === me.id && v.cityWall
    ).length < 3;

  const canRecruitKnightNow =
    isCitiesKnights &&
    isMyTurn &&
    !isPausedByHost &&
    !isWaitingForMandatoryDice &&
    (phase === 'MAIN_PHASE' || phase === 'SPECIAL_BUILD_PHASE') &&
    infraPermission.allowed &&
    (me.resources.ORE || 0) >= 1 &&
    (me.resources.SHEEP || 0) >= 1 &&
    freeRank(gameState, playerId, 1) &&
    knightRecruitVertices(gameState, playerId).length > 0;

  const canPromoteKnightNow =
    isCitiesKnights &&
    isMyTurn &&
    !isPausedByHost &&
    !isWaitingForMandatoryDice &&
    (phase === 'MAIN_PHASE' || phase === 'SPECIAL_BUILD_PHASE') &&
    infraPermission.allowed &&
    (me.resources.ORE || 0) >= 1 &&
    (me.resources.SHEEP || 0) >= 1 &&
    ownKnights(gameState, playerId).some(
      (v) =>
        v.knight!.rank < 3 &&
        v.knight!.promotedOnTurn !== gameState.turn.turnNumber &&
        (v.knight!.rank !== 2 || (me.citiesKnights?.improvements.POLITICS || 0) >= 3) &&
        freeRank(gameState, playerId, v.knight!.rank + 1)
    );

  const canActivateKnightNow =
    isCitiesKnights &&
    isMyTurn &&
    !isPausedByHost &&
    !isWaitingForMandatoryDice &&
    (phase === 'MAIN_PHASE' || phase === 'SPECIAL_BUILD_PHASE') &&
    infraPermission.allowed &&
    (me.resources.WHEAT || 0) >= 1 &&
    ownKnights(gameState, playerId).some((v) => !v.knight!.active);

  const currentRobberHexId =
    gameState?.board.robberHexId ||
    Object.values(gameState?.board.hexes || {}).find((h) => h.hasRobber)?.id ||
    '';
  const currentPirateHexId = gameState?.board.pirateHexId || '';

  const canExpelRobberNow =
    isCitiesKnights &&
    isMyTurn &&
    !isPausedByHost &&
    !isWaitingForMandatoryDice &&
    phase === 'MAIN_PHASE' &&
    ownKnights(gameState, playerId).some(
      (v) =>
        v.knight!.active &&
        v.knight!.activatedOnTurn < gameState.turn.turnNumber &&
        v.knight!.actedOnTurn !== gameState.turn.turnNumber &&
        ((Boolean(currentRobberHexId) && v.hexIds.includes(currentRobberHexId)) ||
          (Boolean(currentPirateHexId) && v.hexIds.includes(currentPirateHexId)))
    );

  const canMoveKnightNow =
    isCitiesKnights &&
    isMyTurn &&
    !isPausedByHost &&
    !isWaitingForMandatoryDice &&
    phase === 'MAIN_PHASE' &&
    ownKnights(gameState, playerId).some(
      (v) =>
        v.knight!.active &&
        v.knight!.activatedOnTurn < gameState.turn.turnNumber &&
        v.knight!.actedOnTurn !== gameState.turn.turnNumber &&
        knightReachableVertices(gameState, playerId, v.id).some((vid) => {
          const targetK = gameState.board.vertices[vid]?.knight;
          return !targetK || (targetK.playerId !== playerId && targetK.rank < v.knight!.rank);
        })
    );

  const myDefense = isCitiesKnights
    ? ownKnights(gameState, playerId).reduce(
        (acc, v) => acc + (v.knight!.active ? v.knight!.rank : 0),
        0
      )
    : 0;

  const freeRank1Count = isCitiesKnights
    ? 2 - ownKnights(gameState, playerId).filter((v) => v.knight!.rank === 1).length
    : 0;

  const validCKVertexIds = useMemo(() => {
    if (!gameState) return [];

    // 1. Mercaderes y Bárbaros: Mover Carromato en el mapa
    if (isBarbarians && activeBarbariansMode === 'MOVE_WAGON') {
      const fromVid = me?.barbarians?.wagonVertexId;
      const fromV = fromVid ? gameState.board.vertices[fromVid] : null;
      if (!fromV) return [];
      return fromV.adjacentVertexIds.filter((vid) => gameState.board.vertices[vid]?.isLand);
    }

    // 2. Piratas y Exploradores: Mejorar Ciudad Portuaria o Fundar Poblado con Barco de Colonos
    if (isExplorersPirates) {
      if (activeExplorersMode === 'UPGRADE_HARBOR_CITY') {
        return Object.values(gameState.board.vertices)
          .filter((v) => v.playerId === playerId && v.building === 'SETTLEMENT' && v.isCoastal)
          .map((v) => v.id);
      }
      if (activeExplorersMode === 'MOVE_EP_SHIP' && selectedEPShipId) {
        const ship = gameState.explorersPirates?.ships[selectedEPShipId];
        const shipEdge = ship ? gameState.board.edges[ship.edgeId] : null;
        if (ship && shipEdge && ship.cargo.includes('SETTLER')) {
          return shipEdge.vertexIds.filter((vid) => {
            const v = gameState.board.vertices[vid];
            if (!v || v.building !== null) return false;
            const touchesFog = v.hexIds.some((hid) => gameState.board.hexes[hid]?.terrain === 'FOG');
            if (touchesFog) return false;
            const hasAdj = v.adjacentVertexIds.some(
              (adjId) => gameState.board.vertices[adjId]?.building !== null
            );
            return !hasAdj;
          });
        }
      }
    }

    if (!isCitiesKnights) return [];
    if (activeKnightMode === 'RECRUIT_KNIGHT') {
      return knightRecruitVertices(gameState, playerId);
    }
    if (activeKnightMode === 'PROMOTE_KNIGHT') {
      return ownKnights(gameState, playerId)
        .filter(
          (v) =>
            v.knight!.rank < 3 &&
            v.knight!.promotedOnTurn !== gameState.turn.turnNumber &&
            (v.knight!.rank !== 2 || (me?.citiesKnights?.improvements.POLITICS || 0) >= 3) &&
            freeRank(gameState, playerId, v.knight!.rank + 1)
        )
        .map((v) => v.id);
    }
    if (activeKnightMode === 'ACTIVATE_KNIGHT') {
      return ownKnights(gameState, playerId)
        .filter((v) => !v.knight!.active)
        .map((v) => v.id);
    }
    if (activeKnightMode === 'EXPEL_ROBBER') {
      return ownKnights(gameState, playerId)
        .filter(
          (v) =>
            v.knight!.active &&
            v.knight!.activatedOnTurn < gameState.turn.turnNumber &&
            v.knight!.actedOnTurn !== gameState.turn.turnNumber &&
            ((Boolean(currentRobberHexId) && v.hexIds.includes(currentRobberHexId)) ||
              (Boolean(currentPirateHexId) && v.hexIds.includes(currentPirateHexId)))
        )
        .map((v) => v.id);
    }
    if (selectedKnightMoveFrom) {
      const movingK = gameState.board.vertices[selectedKnightMoveFrom]?.knight;
      return knightReachableVertices(gameState, playerId, selectedKnightMoveFrom).filter((vid) => {
        const targetK = gameState.board.vertices[vid]?.knight;
        return !targetK || (targetK.playerId !== playerId && Boolean(movingK) && targetK.rank < movingK!.rank);
      });
    }
    if (activeKnightMode === 'MOVE_KNIGHT_FROM') {
      return ownKnights(gameState, playerId)
        .filter(
          (v) =>
            v.knight!.active &&
            v.knight!.activatedOnTurn < gameState.turn.turnNumber &&
            v.knight!.actedOnTurn !== gameState.turn.turnNumber &&
            knightReachableVertices(gameState, playerId, v.id).some((vid) => {
              const targetK = gameState.board.vertices[vid]?.knight;
              return !targetK || (targetK.playerId !== playerId && targetK.rank < v.knight!.rank);
            })
        )
        .map((v) => v.id);
    }
    if (buildMode === 'CITY_WALL') {
      const ownWallCount = Object.values(gameState.board.vertices).filter(
        (v) => v.playerId === playerId && v.cityWall
      ).length;
      if (ownWallCount >= 3) return [];
      return Object.values(gameState.board.vertices)
        .filter((v) => v.playerId === playerId && v.building === 'CITY' && !v.cityWall)
        .map((v) => v.id);
    }
    if (activeProgressCard?.type === 'ENGINEER') {
      const ownWallCount = Object.values(gameState.board.vertices).filter(
        (v) => v.playerId === playerId && v.cityWall
      ).length;
      if (ownWallCount >= 3) return [];
      return Object.values(gameState.board.vertices)
        .filter((v) => v.playerId === playerId && v.building === 'CITY' && !v.cityWall)
        .map((v) => v.id);
    }
    if (activeProgressCard?.type === 'SMITH') {
      return ownKnights(gameState, playerId)
        .filter(
          (v) =>
            v.knight!.rank < 3 &&
            v.knight!.promotedOnTurn !== gameState.turn.turnNumber &&
            (v.knight!.rank !== 2 || (me?.citiesKnights?.improvements.POLITICS || 0) >= 3) &&
            freeRank(gameState, playerId, v.knight!.rank + 1)
        )
        .map((v) => v.id);
    }
    if (activeProgressCard?.type === 'INTRIGUE') {
      return Object.values(gameState.board.vertices)
        .filter(
          (v) =>
            v.knight &&
            v.knight.playerId !== playerId &&
            v.adjacentEdgeIds.some(
              (id) =>
                gameState.board.edges[id]?.playerId === playerId &&
                Boolean(gameState.board.edges[id]?.building)
            )
        )
        .map((v) => v.id);
    }
    const myChoice = gameState.citiesKnights?.choices.find((c) => c.playerId === playerId);
    if (myChoice?.kind === 'CITY_LOSS') {
      return Object.values(gameState.board.vertices)
        .filter((v) => v.playerId === playerId && v.building === 'CITY' && !v.metropolis)
        .map((v) => v.id);
    }
    if (myChoice?.kind === 'RETREAT') {
      return myChoice.vertexIds || [];
    }
    if (myChoice?.kind === 'DESERTER') {
      return ownKnights(gameState, playerId).map((v) => v.id);
    }
    if (myChoice?.kind === 'DESERTER_PLACE') {
      return knightRecruitVertices(gameState, playerId);
    }
    return [];
  }, [
    isCitiesKnights,
    isBarbarians,
    activeBarbariansMode,
    isExplorersPirates,
    activeExplorersMode,
    selectedEPShipId,
    gameState,
    playerId,
    activeKnightMode,
    selectedKnightMoveFrom,
    buildMode,
    activeProgressCard,
    me,
  ]);

  const validCKHexIds = useMemo(() => {
    if (!gameState) return [];
    if (isExplorersPirates && gameState.explorersPirates && activeExplorersMode === 'PLACE_PIRATE_SHIP') {
      const councilId = gameState.explorersPirates.councilHexId;
      return Object.values(gameState.board.hexes)
        .filter((h) => h.terrain === 'SEA' && h.id !== councilId)
        .map((h) => h.id);
    }
    if (!isCitiesKnights) return [];
    if (isPlacingMerchant || activeProgressCard?.type === 'MERCHANT') {
      return Object.values(gameState.board.hexes)
        .filter((h) => {
          if (!ALL_RESOURCES.includes(h.terrain as ResourceType)) return false;
          return Object.values(gameState.board.vertices).some(
            (v) => v.playerId === playerId && v.building && v.hexIds.includes(h.id)
          );
        })
        .map((h) => h.id);
    }
    if (activeProgressCard?.type === 'BISHOP') {
      return Object.values(gameState.board.hexes)
        .filter((h) => h.terrain !== 'SEA' && h.terrain !== 'FOG' && h.id !== currentRobberHexId)
        .map((h) => h.id);
    }
    if (activeProgressCard?.type === 'INVENTOR') {
      return Object.values(gameState.board.hexes)
        .filter((h) => h.numberToken && ![2, 12, 6, 8].includes(h.numberToken))
        .map((h) => h.id);
    }
    return [];
  }, [
    isCitiesKnights,
    isExplorersPirates,
    activeExplorersMode,
    gameState,
    isPlacingMerchant,
    activeProgressCard,
    playerId,
    currentRobberHexId,
  ]);

  const validCKEdgeIds = useMemo(() => {
    if (!gameState) return [];

    // 1. Mercaderes y Bárbaros: Carretera con Pescado, Puente, Camello, Caballero en Arista
    if (isBarbarians && gameState.barbarians) {
      const mb = gameState.barbarians;
      if (activeBarbariansMode === 'FISH_FREE_ROAD') {
        return validRoadIds;
      }
      if (activeBarbariansMode === 'PLACE_BRIDGE') {
        return mb.bridgeSiteEdgeIds.filter((eid) => {
          const edge = gameState.board.edges[eid];
          if (!edge || edge.building !== null) return false;
          return edge.vertexIds.some((vid) => {
            const v = gameState.board.vertices[vid];
            if (!v) return false;
            if (v.playerId === playerId && v.building) return true;
            if (v.building && v.playerId !== playerId) return false;
            return v.adjacentEdgeIds.some(
              (adjEid) =>
                gameState.board.edges[adjEid]?.playerId === playerId &&
                gameState.board.edges[adjEid]?.building !== null
            );
          });
        });
      }
      if (activeBarbariansMode === 'PLACE_CAMEL') {
        return getValidCamelEdges(gameState);
      }
      if (activeBarbariansMode === 'PLACE_EDGE_KNIGHT') {
        const castleAdjEdges = Object.values(gameState.board.edges)
          .filter(
            (e) =>
              e.isLand &&
              !mb.edgeKnights[e.id] &&
              e.hexIds.some((hid) => mb.castleHexIds.includes(hid))
          )
          .map((e) => e.id);
        if (castleAdjEdges.length > 0) return castleAdjEdges;
        return Object.values(gameState.board.edges)
          .filter((e) => e.isLand && !mb.edgeKnights[e.id])
          .map((e) => e.id);
      }
      if (activeBarbariansMode === 'MOVE_EDGE_KNIGHT') {
        if (!selectedEdgeKnightEdgeId) {
          return Object.values(mb.edgeKnights)
            .filter((k) => k.playerId === playerId && k.mpRemaining > 0)
            .map((k) => k.edgeId);
        }
        const fromEdge = gameState.board.edges[selectedEdgeKnightEdgeId];
        if (!fromEdge) return [];
        return Object.values(gameState.board.edges)
          .filter(
            (e) =>
              e.id !== selectedEdgeKnightEdgeId &&
              e.isLand &&
              !mb.edgeKnights[e.id] &&
              e.vertexIds.some((vid) => fromEdge.vertexIds.includes(vid))
          )
          .map((e) => e.id);
      }
      if (activeBarbariansMode === 'MOVE_EDGE_BARBARIAN') {
        if (!selectedEdgeBarbarianId) {
          return [...mb.edgeBarbarians];
        }
        return Object.values(gameState.board.edges)
          .filter((e) => e.isLand && e.id !== selectedEdgeBarbarianId && !mb.edgeBarbarians.includes(e.id))
          .map((e) => e.id);
      }
    }

    // 2. Piratas y Exploradores: Botar Barco en Puerto o Navegar Barco
    if (isExplorersPirates && gameState.explorersPirates) {
      const ep = gameState.explorersPirates;
      if (activeExplorersMode === 'BUILD_EP_SHIP') {
        const ownHarbors = Object.values(ep.harborBasins)
          .filter((b) => b.playerId === playerId)
          .map((b) => b.vertexId);
        return Object.values(gameState.board.edges)
          .filter((e) => {
            if (e.isLand && !e.isCoastal) return false;
            if (!e.vertexIds.some((vid) => ownHarbors.includes(vid))) return false;
            const touchesFog = e.hexIds.some((hid) => gameState.board.hexes[hid]?.terrain === 'FOG');
            if (touchesFog) return false;
            const shipsOnEdge = Object.values(ep.ships).filter((s) => s.edgeId === e.id).length;
            return shipsOnEdge < 2;
          })
          .map((e) => e.id);
      }
      if (activeExplorersMode === 'MOVE_EP_SHIP') {
        if (!selectedEPShipId) {
          return Object.values(ep.ships)
            .filter((s) => s.playerId === playerId)
            .map((s) => s.edgeId);
        }
        const ship = ep.ships[selectedEPShipId];
        const fromEdge = ship ? gameState.board.edges[ship.edgeId] : null;
        if (!ship || !fromEdge || ship.mpRemaining <= 0) return [];
        return Object.values(gameState.board.edges)
          .filter((e) => {
            if (e.id === fromEdge.id) return false;
            if (e.isLand && !e.isCoastal) return false;
            if (!e.vertexIds.some((vid) => fromEdge.vertexIds.includes(vid))) return false;
            const shipsOnDest = Object.values(ep.ships).filter((s) => s.edgeId === e.id).length;
            return shipsOnDest < 2;
          })
          .map((e) => e.id);
      }
    }

    if (!isCitiesKnights) return [];
    if (activeProgressCard?.type === 'DIPLOMAT') {
      if (selectedDiplomatEdgeId) {
        const edge = gameState.board.edges[selectedDiplomatEdgeId];
        if (edge && edge.playerId === playerId) {
          return Object.values(gameState.board.edges)
            .filter(
              (e) =>
                !e.building &&
                (edge.building === 'SHIP' ? validShipIds.includes(e.id) : validRoadIds.includes(e.id))
            )
            .map((e) => e.id);
        }
      }
      return Object.values(gameState.board.edges)
        .filter((e) => isOpenEdge(gameState, e))
        .map((e) => e.id);
    }
    return [];
  }, [
    isCitiesKnights,
    isBarbarians,
    activeBarbariansMode,
    selectedEdgeKnightEdgeId,
    isExplorersPirates,
    activeExplorersMode,
    selectedEPShipId,
    gameState,
    activeProgressCard,
    selectedDiplomatEdgeId,
    playerId,
    validShipIds,
    validRoadIds,
  ]);

  const handleCKVertexClick = (vertexId: string) => {
    if (isPausedByHost) return;

    // 1. Mercaderes y Bárbaros: Mover Carromato
    if (isBarbarians && activeBarbariansMode === 'MOVE_WAGON') {
      dispatchAction({ type: 'MB_MOVE_WAGON', toVertexId: vertexId });
      return;
    }

    // 2. Piratas y Exploradores: Mejorar a Ciudad Portuaria o Fundar Poblado con Barco de Colonos
    if (isExplorersPirates) {
      if (activeExplorersMode === 'UPGRADE_HARBOR_CITY') {
        dispatchAction({ type: 'EP_UPGRADE_HARBOR_CITY', vertexId });
        setActiveExplorersMode(null);
        return;
      }
      if (activeExplorersMode === 'MOVE_EP_SHIP' && selectedEPShipId) {
        dispatchAction({
          type: 'EP_FOUND_SETTLEMENT_WITH_SHIP',
          shipId: selectedEPShipId,
          vertexId,
        });
        setSelectedEPShipId(null);
        setActiveExplorersMode(null);
        return;
      }
    }

    if (activeKnightMode === 'RECRUIT_KNIGHT') {
      dispatchAction({ type: 'RECRUIT_KNIGHT', vertexId });
      setActiveKnightMode(null);
      return;
    }
    if (activeKnightMode === 'PROMOTE_KNIGHT') {
      dispatchAction({ type: 'PROMOTE_KNIGHT', vertexId });
      setActiveKnightMode(null);
      return;
    }
    if (activeKnightMode === 'ACTIVATE_KNIGHT') {
      dispatchAction({ type: 'ACTIVATE_KNIGHT', vertexId });
      setActiveKnightMode(null);
      return;
    }
    if (activeKnightMode === 'EXPEL_ROBBER') {
      const isPirate =
        Boolean(currentPirateHexId) &&
        gameState.board.vertices[vertexId]?.hexIds.includes(currentPirateHexId);
      dispatchAction({ type: 'EXPEL_ROBBER', vertexId, mode: isPirate ? 'PIRATE' : 'ROBBER' });
      setActiveKnightMode(null);
      return;
    }
    if (selectedKnightMoveFrom) {
      dispatchAction({
        type: 'MOVE_KNIGHT',
        fromVertexId: selectedKnightMoveFrom,
        toVertexId: vertexId,
      });
      setSelectedKnightMoveFrom(null);
      setActiveKnightMode(null);
      return;
    }
    if (activeKnightMode === 'MOVE_KNIGHT_FROM') {
      setSelectedKnightMoveFrom(vertexId);
      return;
    }
    if (buildMode === 'CITY_WALL') {
      dispatchAction({ type: 'BUILD_CITY_WALL', vertexId });
      setBuildMode(null);
      return;
    }
    if (activeProgressCard) {
      if (activeProgressCard.type === 'ENGINEER' || activeProgressCard.type === 'INTRIGUE') {
        dispatchAction({
          type: 'PLAY_PROGRESS_CARD',
          cardId: activeProgressCard.id,
          payload: { vertexId },
        });
        setActiveProgressCard(null);
        return;
      }
      if (activeProgressCard.type === 'SMITH') {
        const next = selectedSmithVertexIds.includes(vertexId)
          ? selectedSmithVertexIds.filter((id) => id !== vertexId)
          : selectedSmithVertexIds.length < 2
          ? [...selectedSmithVertexIds, vertexId]
          : [selectedSmithVertexIds[1], vertexId];
        if (next.length === 2 || validCKVertexIds.length <= 1) {
          dispatchAction({
            type: 'PLAY_PROGRESS_CARD',
            cardId: activeProgressCard.id,
            payload: { vertexIds: next },
          });
          setSelectedSmithVertexIds([]);
          setActiveProgressCard(null);
        } else {
          setSelectedSmithVertexIds(next);
        }
        return;
      }
    }
    const myChoice = gameState.citiesKnights?.choices.find((c) => c.playerId === playerId);
    if (myChoice) {
      dispatchAction({ type: 'RESOLVE_CK_CHOICE', vertexId });
      return;
    }
  };

  const handleCKHexClick = (hexId: string) => {
    if (isPausedByHost) return;
    if (isExplorersPirates && activeExplorersMode === 'PLACE_PIRATE_SHIP') {
      dispatchAction({ type: 'EP_PLACE_PIRATE_SHIP', hexId });
      setActiveExplorersMode(null);
      return;
    }
    if (isPlacingMerchant || activeProgressCard?.type === 'MERCHANT') {
      const cardId =
        activeProgressCard?.id ||
        me?.citiesKnights?.progressCards.find((c) => c.type === 'MERCHANT')?.id;
      if (cardId) {
        dispatchAction({ type: 'PLAY_PROGRESS_CARD', cardId, payload: { hexId } });
      }
      setIsPlacingMerchant(false);
      setActiveProgressCard(null);
      return;
    }
    if (activeProgressCard?.type === 'BISHOP') {
      dispatchAction({ type: 'PLAY_PROGRESS_CARD', cardId: activeProgressCard.id, payload: { hexId } });
      setActiveProgressCard(null);
      return;
    }
    if (activeProgressCard?.type === 'INVENTOR') {
      if (selectedInventorHexIds.includes(hexId)) {
        setSelectedInventorHexIds((prev) => prev.filter((id) => id !== hexId));
        return;
      }
      const next = [...selectedInventorHexIds, hexId];
      if (next.length >= 2) {
        dispatchAction({
          type: 'PLAY_PROGRESS_CARD',
          cardId: activeProgressCard.id,
          payload: { hexIds: [next[0], next[1]] },
        });
        setSelectedInventorHexIds([]);
        setActiveProgressCard(null);
      } else {
        setSelectedInventorHexIds(next);
      }
      return;
    }
  };

  const handleCKEdgeClick = (edgeId: string) => {
    if (isPausedByHost) return;

    // 1. Mercaderes y Bárbaros: Carretera con Pescado, Puente, Camello, Caballero en Arista
    if (isBarbarians && gameState.barbarians) {
      if (activeBarbariansMode === 'FISH_FREE_ROAD') {
        const fishTokens = [...(me.barbarians?.fishTokens || [])].sort(
          (a, b) => a.fishCount - b.fishCount
        );
        let sum = 0;
        const pickedIds: string[] = [];
        for (const t of fishTokens) {
          pickedIds.push(t.id);
          sum += t.fishCount;
          if (sum >= 5) break;
        }
        dispatchAction({
          type: 'MB_FISH_FREE_ROAD',
          tokenIds: pickedIds,
          edgeId,
        });
        setActiveBarbariansMode(null);
        return;
      }
      if (activeBarbariansMode === 'PLACE_BRIDGE') {
        dispatchAction({ type: 'MB_PLACE_BRIDGE', edgeId });
        setActiveBarbariansMode(null);
        return;
      }
      if (activeBarbariansMode === 'PLACE_CAMEL') {
        dispatchAction({
          type: 'MB_VOTE_CAMEL',
          edgeId,
          sheepCards: pendingCamelBid.sheepCards,
          wheatCards: pendingCamelBid.wheatCards,
        });
        setPendingCamelBid({ sheepCards: 0, wheatCards: 0 });
        setActiveBarbariansMode(null);
        return;
      }
      if (activeBarbariansMode === 'PLACE_EDGE_KNIGHT') {
        dispatchAction({ type: 'MB_PLACE_EDGE_KNIGHT', edgeId });
        setActiveBarbariansMode(null);
        return;
      }
      if (activeBarbariansMode === 'MOVE_EDGE_KNIGHT') {
        if (!selectedEdgeKnightEdgeId) {
          setSelectedEdgeKnightEdgeId(edgeId);
        } else {
          dispatchAction({
            type: 'MB_MOVE_EDGE_KNIGHT',
            fromEdgeId: selectedEdgeKnightEdgeId,
            toEdgeId: edgeId,
          });
          setSelectedEdgeKnightEdgeId(null);
          setActiveBarbariansMode(null);
        }
        return;
      }
      if (activeBarbariansMode === 'MOVE_EDGE_BARBARIAN') {
        if (!selectedEdgeBarbarianId) {
          setSelectedEdgeBarbarianId(edgeId);
        } else {
          dispatchAction({
            type: 'MB_MOVE_EDGE_BARBARIAN',
            fromEdgeId: selectedEdgeBarbarianId,
            toEdgeId: edgeId,
          });
          setSelectedEdgeBarbarianId(null);
          setActiveBarbariansMode(null);
        }
        return;
      }
    }

    // 2. Piratas y Exploradores: Botar Barco o Navegar Barco
    if (isExplorersPirates && gameState.explorersPirates) {
      if (activeExplorersMode === 'BUILD_EP_SHIP') {
        dispatchAction({ type: 'EP_BUILD_SHIP', edgeId });
        setActiveExplorersMode(null);
        return;
      }
      if (activeExplorersMode === 'MOVE_EP_SHIP') {
        if (!selectedEPShipId) {
          const ownShipOnEdge = Object.values(gameState.explorersPirates.ships).find(
            (s) => s.playerId === playerId && s.edgeId === edgeId
          );
          if (ownShipOnEdge) {
            setSelectedEPShipId(ownShipOnEdge.id);
          }
        } else {
          dispatchAction({
            type: 'EP_MOVE_SHIP',
            shipId: selectedEPShipId,
            toEdgeId: edgeId,
          });
        }
        return;
      }
    }

    if (activeProgressCard?.type === 'DIPLOMAT') {
      if (!selectedDiplomatEdgeId) {
        const edge = gameState.board.edges[edgeId];
        if (edge && edge.playerId === playerId) {
          setSelectedDiplomatEdgeId(edgeId);
        } else {
          dispatchAction({
            type: 'PLAY_PROGRESS_CARD',
            cardId: activeProgressCard.id,
            payload: { edgeId },
          });
          setActiveProgressCard(null);
        }
      } else {
        dispatchAction({
          type: 'PLAY_PROGRESS_CARD',
          cardId: activeProgressCard.id,
          payload: { edgeId: selectedDiplomatEdgeId, toEdgeId: edgeId },
        });
        setSelectedDiplomatEdgeId(null);
        setActiveProgressCard(null);
      }
    }
  };

  const myPendingGoldClaim = useMemo(() => {
    if (!gameState?.turn.pendingGoldClaims) return null;
    return gameState.turn.pendingGoldClaims.find((c) => c.playerId === playerId && c.amount > 0) || null;
  }, [gameState?.turn.pendingGoldClaims, playerId]);

  const unplayedDevCount = me.devCards.filter((c) => !c.played).length;

  const botLiveNotice =
    turn.botStatusMessage ||
    (activePlayer?.isBot
      ? `${activePlayer.name} está pensando...`
      : null);

  const getPhaseInstruction = (): string => {
    if (isPausedByHost) {
      return 'Juego Pausado por el Anfitrión. El temporizador y todas las acciones están congelados.';
    }
    if (phase === 'PAUSED_DISCONNECT') {
      return 'Partida en pausa esperando la reconexión de un jugador.';
    }
    if (phase === 'ORDER_ROLL') {
      return 'Fase de Orden de Turno: Lanzad los dados de iniciativa o confirmad el orden de salida.';
    }
    if (!isMyTurn) {
      if (botLiveNotice) {
        return botLiveNotice;
      }
      if (phase === 'WAITING_FOR_DICE') {
        return `Esperando a que ${activePlayer?.name || 'el jugador activo'} lance los dados...`;
      }
      return `Turno en curso de ${activePlayer?.name || 'otro jugador'}...`;
    }
    switch (phase) {
      case 'SETUP_SETTLEMENT_1':
        return 'Colocación Inicial (Ronda 1): Selecciona un vértice disponible para colocar tu 1.º Poblado gratis.';
      case 'SETUP_ROAD_1':
        return 'Colocación Inicial (Ronda 1): Selecciona una arista contigua para colocar tu 1.ª Carretera gratis.';
      case 'SETUP_SETTLEMENT_2':
        return hasCitiesKnights(config) ? 'Colocación inicial (ronda 2): funda tu ciudad; recibes un recurso básico por terreno adyacente.' : 'Colocación Inicial (Ronda 2): Coloca tu 2.º Poblado (recibirás los recursos de los terrenos adyacentes).';
      case 'SETUP_ROAD_2':
        return 'Colocación Inicial (Ronda 2): Coloca tu 2.ª Carretera adyacente.';
      case 'WAITING_FOR_DICE':
        return 'Fase Obligatoria de Dados: Lanza los dados en el centro de la pantalla antes de realizar cualquier acción.';
      case 'ROBBER_DISCARD':
        return 'Esperando el descarte obligatorio de cartas; el límite depende de las murallas de cada jugador.';
      case 'ROBBER_MOVE':
        return 'Selecciona cualquier hexágono terrestre (incluso el actual) para posicionar al Ladrón y robar 1 recurso.';
      case 'ROBBER_STEAL':
        return 'Elige a cuál de los jugadores adyacentes al hexágono deseas robarle 1 carta al azar.';
      case 'ROAD_BUILDING_DEV':
        return `Construcción de Carreteras activa: Coloca ${turn.freeRoadsRemaining} carretera(s) sin coste.`;
      case 'CK_CHOICE': return 'Ciudades y Caballeros: se está resolviendo una elección del jugador indicado.';
      case 'SPECIAL_BUILD_PHASE': return 'Construcción especial: puedes construir, mejorar ciudades y reclutar, activar o ascender caballeros. Al terminar, pulsa el botón del panel.';
      case 'MAIN_PHASE':
        if (activeKnightMode === 'RECRUIT_KNIGHT')
          return 'Selecciona una intersección iluminada en tus caminos para colocar tu Caballero básico.';
        if (activeKnightMode === 'PROMOTE_KNIGHT')
          return 'Selecciona uno de tus Caballeros iluminados para ascenderlo de rango.';
        if (activeKnightMode === 'ACTIVATE_KNIGHT')
          return 'Selecciona uno de tus Caballeros inactivos iluminados para activarlo.';
        if (activeKnightMode === 'EXPEL_ROBBER')
          return 'Selecciona tu Caballero activo contiguo al Ladrón o Pirata para expulsarlo.';
        if (activeKnightMode === 'MOVE_KNIGHT_FROM')
          return selectedKnightMoveFrom
            ? 'Paso 2: Selecciona la intersección destino iluminada para mover tu Caballero.'
            : 'Paso 1: Selecciona el Caballero activo que deseas desplazar.';
        if (isPlacingMerchant)
          return 'Selecciona un hexágono de recurso iluminado junto a tus poblados/ciudades para situar al Mercader.';
        if (activeProgressCard?.type === 'DIPLOMAT')
          return selectedDiplomatEdgeId
            ? 'Paso 2: Selecciona una arista iluminada para reubicar tu carretera/barco, o pulsa Cancelar.'
            : 'Selecciona una carretera o barco iluminado con un extremo abierto para retirarlo.';
        if (buildMode === 'CITY_WALL')
          return 'Selecciona una de tus Ciudades iluminadas para construir tu Muralla (+2 cartas seguras).';
        if (buildMode === 'ROAD')
          return 'Selecciona una arista iluminada en el mapa para construir tu Carretera.';
        if (buildMode === 'SETTLEMENT')
          return 'Selecciona un vértice iluminado conectado a tu carretera para construir tu Poblado.';
        if (buildMode === 'CITY')
          return 'Selecciona uno de tus Poblados iluminados para mejorarlo a Ciudad.';
        return hasCitiesKnights(config) ? 'Fase principal: construye, comercia, gestiona tus caballeros y juega progreso.' : 'Fase Principal: Construye, comercia con la Banca/Puertos o con otros colonos, juega Desarrollo o pasa el turno.';
      default:
        return '';
    }
  };

  const isStrictlyMyTurn = Boolean(
    playerId &&
      turn.activePlayerId === playerId &&
      !isPausedByHost &&
      phase !== 'LOBBY' &&
      phase !== 'ORDER_ROLL' &&
      phase !== 'PAUSED_DISCONNECT' &&
      phase !== 'GAME_OVER'
  );

  return (
    <div className={`game-screen ${hasBottomExpansionHud ? 'has-cities-knights' : ''} h-screen h-[100dvh] w-screen flex flex-col bg-[#0d0906] text-stone-100 overflow-hidden relative`}>
      {/* Intermittent Green Screen Border Glow STRICTLY ONLY when it is the local player's turn */}
      {isStrictlyMyTurn && (
        <motion.div
          key={`my-turn-green-border-glow-${turn.turnNumber}-${turn.activePlayerId}`}
          initial={{ opacity: 0.25 }}
          animate={{ opacity: [0.22, 0.92, 0.22] }}
          transition={{
            duration: 2.1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="fixed inset-0 pointer-events-none z-40"
          style={{
            boxShadow:
              'inset 0 0 36px 6px rgba(16, 185, 129, 0.58), inset 0 0 10px 2px rgba(52, 211, 153, 0.9)',
          }}
        />
      )}

      {/* Overlay Animations for Slow Center Dice, Adaptive Resource Flights, Critical Alerts, Discards & Steals */}
      <OverlayAnimations
        gameState={gameState}
        currentPlayerId={playerId}
        lowEndPcMode={effectiveLowEndMode}
      />

      {/* Disconnect Resolution Banner */}
      <DisconnectResolutionBanner
        gameState={gameState}
        currentPlayerId={playerId}
        dispatchAction={dispatchAction}
      />

      {/* Top Header Bar (Desktop & Tablet ONLY; Mobile uses clean floating corner controls) */}
      {!isMobile && (
      <header className="tablet-header h-14 px-4 bg-gradient-to-r from-[#1c130d] via-[#140e09] to-[#1c130d] border-b border-[#d4af37]/35 flex items-center justify-between gap-3 shrink-0 z-30 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="tablet-header-title font-display text-lg font-extrabold text-amber-400 tracking-wider drop-shadow">
            CATAN
          </span>
          <span className="tablet-header-badge font-mono text-xs px-2.5 py-0.5 rounded-lg bg-[#0d0906] text-amber-300 border border-[#d4af37]/40">
            Sala {gameState.roomCode}
          </span>
          <span className="hidden md:inline-flex text-xs text-stone-400">
            Meta: <strong className="text-amber-300 ml-1">{config.victoryPointsTarget} PV</strong>
          </span>

          {/* Active Custom House Rules Badges */}
          <div className="hidden 2xl:flex items-center gap-1.5">
            {config.desertInCenter && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-[#d4af37]/40 text-amber-200 font-semibold">
                Desierto Central
              </span>
            )}
            {config.minSettlementDistance === 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-[#d4af37]/40 text-amber-200 font-semibold">
                Distancia: 1 arista
              </span>
            )}
            {config.allowInstantDevCards && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-200 font-semibold">
                Desarrollo Inmediato
              </span>
            )}
            {config.turnActionRestriction === 'LEVEL_2_LIMITED' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-[#d4af37]/40 text-amber-200 font-semibold">
                Nivel 2: 1 Infra + 1 Comercio
              </span>
            )}
            {config.turnActionRestriction === 'LEVEL_3_STRICT' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/50 text-red-200 font-semibold">
                Nivel 3: Construir O Comerciar
              </span>
            )}
          </div>
        </div>

        {/* Center Phase Instruction Banner */}
        <div
          className={`tablet-header-instruction flex-1 max-w-xl px-4 py-1.5 rounded-xl border text-center text-xs font-bold truncate ${
            isPausedByHost
              ? 'bg-amber-950/80 border-amber-400 text-amber-200'
              : isMyTurn
              ? 'bg-amber-500/15 border-[#d4af37]/60 text-amber-100 shadow-inner'
              : 'bg-[#0d0906]/90 border-stone-800 text-stone-300'
          }`}
        >
          {getPhaseInstruction()}
        </div>

        {/* Right: Turn Timer, Host-Only Pause Button, Settings Button & Abandon Button */}
        <div className="flex items-center gap-2">
          {remainingSec !== null && (
            <div className="game-turn-timer flex items-center gap-2 bg-[#0d0906] px-3 py-1 rounded-xl border border-[#d4af37]/30">
              <Clock
                className={`w-4 h-4 ${
                  isPausedByHost
                    ? 'text-amber-300'
                    : isLowTime
                    ? 'text-red-400 animate-bounce'
                    : 'text-amber-400'
                }`}
              />
              <div className="w-20 sm:w-24">
                <div className="flex justify-between text-[10px] font-bold mb-0.5">
                  <span className={isLowTime ? 'text-red-400' : 'text-stone-400'}>
                    {isPausedByHost ? 'PAUSADO' : 'Tiempo'}
                  </span>
                  <span className={isLowTime ? 'text-red-400 font-black' : 'text-amber-200'}>
                    {remainingSec}s
                  </span>
                </div>
                <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isPausedByHost
                        ? 'bg-amber-500/60'
                        : isLowTime
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {me.isHost && (
            <button
              type="button"
              onClick={() => {
                if (phase === 'PAUSED_DISCONNECT') {
                  dispatchAction({ type: 'RESUME_GAME' });
                } else {
                  dispatchAction({ type: 'TOGGLE_HOST_PAUSE' });
                }
              }}
              className={`tablet-header-btn px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow active:scale-95 ${
                isPausedByHost || phase === 'PAUSED_DISCONNECT'
                  ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-stone-950 animate-pulse'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 border-[#d4af37]/60 text-amber-200'
              }`}
              title="Pausar o reanudar la partida para todos los jugadores"
            >
              {isPausedByHost || phase === 'PAUSED_DISCONNECT' ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Reanudar</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausa</span>
                </>
              )}
            </button>
          )}

          {!me.isHost && phase === 'PAUSED_DISCONNECT' && (
            <button
              type="button"
              onClick={() => dispatchAction({ type: 'RESUME_GAME' })}
              className="tablet-header-btn px-3 py-1.5 rounded-xl border border-emerald-400 bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow animate-pulse active:scale-95"
              title="Reanudar la partida pausada por desconexión"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Reanudar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className={`tablet-header-btn px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
              effectiveLowEndMode
                ? 'bg-[#192836] border-sky-400/60 text-sky-200'
                : 'bg-[#211710] hover:bg-[#2c1f16] border-[#c89b3c]/35 text-amber-200'
            }`}
            title="Ajustes de rendimiento y animaciones"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>

          {isPausedByHost && (
            <span className="text-white text-xs font-semibold tracking-wider px-2.5 py-1 rounded-xl bg-stone-900/90 border border-stone-600/70 shadow-sm animate-pulse">
              JUEGO PAUSADO
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowAbandonModal(true)}
            className="tablet-header-btn px-3 py-1.5 rounded-xl bg-red-950/75 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abandonar</span>
          </button>
        </div>
      </header>
      )}

      {/* Mobile Floating Corner Controls: Visual Turn Timer (top-left) + Compact Pause/Abandon/Players (top-right) */}
      {isMobile && (() => {
        const ringRadius = 10;
        const ringCirc = 2 * Math.PI * ringRadius;
        const ringDashOffset = ringCirc * (1 - Math.max(0, Math.min(100, timerPercent)) / 100);
        const activeColorHex = activePlayer ? PLAYER_COLORS[activePlayer.color].primary : '#f59e0b';
        return (
          <>
            {/* Top-Left Visual Timer */}
            <div
              className="fixed z-30 pointer-events-auto flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#160f0a]/92 border border-[#d4af37]/60 shadow-xl"
              style={{
                top: 'max(6px, env(safe-area-inset-top))',
                left: 'max(8px, env(safe-area-inset-left))',
              }}
            >
              <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 26 26">
                  <circle
                    cx="13"
                    cy="13"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="2.5"
                  />
                  {remainingSec !== null && (
                    <circle
                      cx="13"
                      cy="13"
                      r={ringRadius}
                      fill="none"
                      stroke={isPausedByHost ? '#f59e0b' : isLowTime ? '#ef4444' : '#34d399'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={ringCirc}
                      strokeDashoffset={ringDashOffset}
                      style={{ transition: 'stroke-dashoffset 0.35s linear' }}
                    />
                  )}
                </svg>
                <span
                  className="absolute w-2.5 h-2.5 rounded-full border border-white/80 shadow"
                  style={{ backgroundColor: activeColorHex }}
                />
              </div>

              {remainingSec !== null ? (
                <div className="flex flex-col leading-none pr-0.5">
                  <span
                    className={`font-mono text-xs font-black tabular-nums ${
                      isPausedByHost
                        ? 'text-amber-300'
                        : isLowTime
                        ? 'text-red-400 animate-pulse'
                        : 'text-amber-100'
                    }`}
                  >
                    {remainingSec}s
                  </span>
                  {isPausedByHost && (
                    <span className="text-[8px] font-bold text-amber-300 uppercase">Pausa</span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] font-bold text-amber-100 max-w-[78px] truncate pr-1">
                  {isMyTurn ? 'Tu turno' : activePlayer?.name || 'Turno'}
                </span>
              )}
            </div>

            {/* Top-Right Compact Controls: Pause + Abandon + Players Dropdown */}
            <div
              className="fixed z-30 pointer-events-auto flex items-center gap-1.5"
              style={{
                top: 'max(6px, env(safe-area-inset-top))',
                right: 'max(8px, env(safe-area-inset-right))',
              }}
            >
              {me.isHost && (
                <button
                  type="button"
                  onClick={() => {
                    if (phase === 'PAUSED_DISCONNECT') {
                      dispatchAction({ type: 'RESUME_GAME' });
                    } else {
                      dispatchAction({ type: 'TOGGLE_HOST_PAUSE' });
                    }
                  }}
                  aria-label={isPausedByHost ? 'Reanudar partida' : 'Pausar partida'}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-lg cursor-pointer active:scale-95 ${
                    isPausedByHost || phase === 'PAUSED_DISCONNECT'
                      ? 'bg-emerald-600 border-emerald-300 text-stone-950'
                      : 'bg-[#160f0a]/92 border-[#d4af37]/55 text-amber-200'
                  }`}
                >
                  {isPausedByHost || phase === 'PAUSED_DISCONNECT' ? (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Pause className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {!me.isHost && phase === 'PAUSED_DISCONNECT' && (
                <button
                  type="button"
                  onClick={() => dispatchAction({ type: 'RESUME_GAME' })}
                  aria-label="Reanudar partida"
                  className="w-8 h-8 rounded-xl border border-emerald-300 bg-emerald-600 text-stone-950 flex items-center justify-center shadow-lg cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAbandonModal(true)}
                aria-label="Abandonar partida"
                className="w-8 h-8 rounded-xl bg-red-950/90 border border-red-500/45 text-red-200 flex items-center justify-center shadow-lg cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsTabletRightPanelVisible((v) => !v)}
                className={`h-8 px-2.5 rounded-xl border text-[11px] font-black shadow-lg flex items-center gap-1 cursor-pointer active:scale-95 ${
                  isTabletRightPanelVisible
                    ? 'bg-[#c89b3c] border-amber-200 text-stone-950'
                    : 'bg-[#160f0a]/92 border-[#d4af37]/60 text-amber-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isTabletRightPanelVisible ? 'Cerrar' : 'Jugadores'}</span>
              </button>
            </div>
          </>
        );
      })()}

      {/* Main Middle Area: Full-Width Board + Right Floating Player Profiles & Bordered Bank/Chronicles Box */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Central Board Area */}
        <div className="flex-1 h-full relative">
          <Board
            board={board}
            players={gameState.players}
            validSettlementIds={validSettlementIds}
            validCityIds={validCityIds}
            validRoadIds={validRoadIds}
            validShipIds={validShipIds}
            validMovableShipIds={validMovableShipIds}
            selectedMovableShipId={selectedMovableShipId}
            isMovingRobber={isMovingRobber}
            isMovingPirate={
              isMovingRobber &&
              isSeafarers &&
              gameState.config.seafarersPirateMode !== 'PACIFIC_NO_PIRATE'
            }
            producingHexIds={boardProducingHexIds}
            lowEndPcMode={effectiveLowEndMode}
            lockBoardPan={lockBoardPan}
            lastEvent={gameState.lastEvent}
            highlightedVertexId={ckHighlightedVertex}
            isCitiesKnights={hasBottomExpansionHud}
            validCKVertexIds={validCKVertexIds}
            validCKEdgeIds={validCKEdgeIds}
            validCKHexIds={validCKHexIds}
            onCKVertexClick={handleCKVertexClick}
            onCKEdgeClick={handleCKEdgeClick}
            onCKHexClick={handleCKHexClick}
            barbarians={gameState.barbarians}
            explorersPirates={gameState.explorersPirates}
            onVertexClick={(vertexId) => {
              if (isPausedByHost) return;
              if (validCityIds.includes(vertexId)) {
                dispatchAction({ type: 'UPGRADE_CITY', vertexId });
                setBuildMode(null);
              } else if (validSettlementIds.includes(vertexId)) {
                dispatchAction({ type: 'PLACE_SETTLEMENT', vertexId });
                setBuildMode(null);
              }
            }}
            onEdgeClick={(edgeId) => {
              if (isPausedByHost) return;
              if (buildMode === 'MOVE_SHIP') {
                if (!selectedMovableShipId) {
                  if (validMovableShipIds.includes(edgeId)) {
                    setSelectedMovableShipId(edgeId);
                  }
                } else if (validShipIds.includes(edgeId)) {
                  dispatchAction({
                    type: 'MOVE_SHIP',
                    fromEdgeId: selectedMovableShipId,
                    toEdgeId: edgeId,
                  });
                  setSelectedMovableShipId(null);
                  setBuildMode(null);
                }
              } else if (
                validShipIds.includes(edgeId) &&
                (buildMode === 'SHIP' ||
                  gameState.phase === 'SETUP_ROAD_1' ||
                  gameState.phase === 'SETUP_ROAD_2' ||
                  gameState.phase === 'ROAD_BUILDING_DEV')
              ) {
                dispatchAction({ type: 'PLACE_SHIP', edgeId });
                setBuildMode(null);
              } else if (validRoadIds.includes(edgeId)) {
                dispatchAction({ type: 'PLACE_ROAD', edgeId });
                setBuildMode(null);
              }
            }}
            onHexClick={(hexId) => {
              if (isPausedByHost) return;
              if (isMovingRobber) {
                const targetHex = board.hexes[hexId];
                if (
                  targetHex?.terrain === 'SEA' &&
                  board.pirateHexId &&
                  gameState.config.seafarersPirateMode !== 'PACIFIC_NO_PIRATE'
                ) {
                  dispatchAction({ type: 'MOVE_PIRATE', hexId });
                } else if (targetHex?.terrain !== 'SEA') {
                  dispatchAction({ type: 'MOVE_ROBBER', hexId });
                }
              }
            }}
          />

          {/* Seafarers: Pirate & Robber selection prompt (Desktop/Tablet) */}
          {!isMobile && isMovingRobber && isSeafarers && isMyTurn && !isPausedByHost && (
            <div className="absolute top-16 inset-x-0 z-30 flex justify-center pointer-events-none px-4">
              <div className="flex items-center gap-2 bg-[#120904]/95 border-2 border-amber-500/80 text-amber-200 px-4 py-2 rounded-2xl text-xs font-black shadow-2xl backdrop-blur-md pointer-events-auto">
                <span className="text-base">🏴‍☠️</span>
                <span>
                  Haz clic en un terreno para mover el <strong>Ladrón</strong>, o en el mar para mover el <strong>Barco Pirata</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Seafarers: Move Ship helper prompt (Desktop/Tablet) */}
          {!isMobile && buildMode === 'MOVE_SHIP' && isMyTurn && !isPausedByHost && (
            <div className="absolute top-16 inset-x-0 z-30 flex justify-center pointer-events-none px-4">
              <div className="flex items-center gap-3 bg-[#0a192f]/95 border-2 border-sky-400 text-sky-200 px-4 py-2 rounded-2xl text-xs font-black shadow-2xl backdrop-blur-md pointer-events-auto">
                <Anchor className="w-4 h-4 text-sky-400 animate-spin" />
                <span>
                  {!selectedMovableShipId
                    ? 'Selecciona un barco al final de una ruta abierta para moverlo'
                    : 'Selecciona una posición marítima válida para colocar el barco'}
                </span>
                <button
                  onClick={() => {
                    setSelectedMovableShipId(null);
                    setBuildMode(null);
                  }}
                  className="px-2 py-0.5 bg-sky-950 border border-sky-500/40 rounded-lg text-[10px] text-sky-300 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Ciudades y Caballeros: Knight / Merchant / Diplomat / Bishop / Intrigue / Engineer / Inventor / Smith / Wall Helper floating banner (Desktop/Tablet) */}
          {!isMobile && isCitiesKnights && isMyTurn && !isPausedByHost && (activeKnightMode || isPlacingMerchant || activeProgressCard?.type === 'DIPLOMAT' || activeProgressCard?.type === 'BISHOP' || activeProgressCard?.type === 'INTRIGUE' || activeProgressCard?.type === 'ENGINEER' || activeProgressCard?.type === 'INVENTOR' || activeProgressCard?.type === 'SMITH' || buildMode === 'CITY_WALL') && (
            <div className="absolute top-16 inset-x-0 z-30 flex justify-center pointer-events-none px-4">
              <div className="flex items-center gap-3 bg-[#1e140d]/95 border-2 border-amber-400 text-amber-100 px-4 py-2 rounded-2xl text-xs font-black shadow-2xl backdrop-blur-md pointer-events-auto animate-pulse">
                <Swords className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {activeKnightMode === 'RECRUIT_KNIGHT' && 'Haz clic en una intersección iluminada para colocar tu Caballero (1 mineral + 1 oveja)'}
                  {activeKnightMode === 'PROMOTE_KNIGHT' && 'Haz clic en un Caballero propio iluminado para ascenderlo (1 mineral + 1 oveja)'}
                  {activeKnightMode === 'ACTIVATE_KNIGHT' && 'Haz clic en un Caballero inactivo iluminado para activarlo (1 trigo)'}
                  {activeKnightMode === 'EXPEL_ROBBER' && 'Haz clic en tu Caballero activo junto al Ladrón o Pirata para expulsarlo'}
                  {activeKnightMode === 'MOVE_KNIGHT_FROM' && (!selectedKnightMoveFrom ? 'Paso 1: Haz clic en el Caballero activo que quieres mover' : 'Paso 2: Haz clic en la intersección destino conectada')}
                  {isPlacingMerchant && 'Haz clic en un hexágono de recurso iluminado para colocar al Mercader (comercio 2:1 y +1 PV)'}
                  {activeProgressCard?.type === 'DIPLOMAT' && (!selectedDiplomatEdgeId ? 'Haz clic en una carretera o barco abierto para retirarlo' : 'Paso 2: Haz clic en una arista libre conectada para reubicar tu pieza')}
                  {activeProgressCard?.type === 'BISHOP' && 'Haz clic en un hexágono para mover al Ladrón con el Obispo y robar a los rivales adyacentes'}
                  {activeProgressCard?.type === 'INTRIGUE' && 'Haz clic en un caballero rival conectado a tus caminos para expulsarlo'}
                  {activeProgressCard?.type === 'ENGINEER' && 'Ingeniero: Haz clic en una de tus Ciudades sin muralla para construir una Muralla GRATIS'}
                  {activeProgressCard?.type === 'INVENTOR' && `Inventor: Haz clic en el ${selectedInventorHexIds.length === 0 ? '1.er' : '2.º'} hexágono iluminado para intercambiar sus números (${selectedInventorHexIds.length}/2)`}
                  {activeProgressCard?.type === 'SMITH' && `Fragua: Haz clic en 1 o 2 de tus caballeros iluminados para ascenderlos gratis (${selectedSmithVertexIds.length}/2)`}
                  {buildMode === 'CITY_WALL' && 'Haz clic en una de tus Ciudades iluminadas para construir una Muralla (2 arcillas)'}
                </span>
                {activeProgressCard?.type === 'DIPLOMAT' && selectedDiplomatEdgeId && (
                  <button
                    type="button"
                    onClick={() => {
                      dispatchAction({
                        type: 'PLAY_PROGRESS_CARD',
                        cardId: activeProgressCard.id,
                        payload: { edgeId: selectedDiplomatEdgeId },
                      });
                      setSelectedDiplomatEdgeId(null);
                      setActiveProgressCard(null);
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-black cursor-pointer"
                  >
                    Retirar a la mano
                  </button>
                )}
                {activeProgressCard?.type === 'SMITH' && selectedSmithVertexIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      dispatchAction({
                        type: 'PLAY_PROGRESS_CARD',
                        cardId: activeProgressCard.id,
                        payload: { vertexIds: selectedSmithVertexIds },
                      });
                      setSelectedSmithVertexIds([]);
                      setActiveProgressCard(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-[10px] font-black cursor-pointer"
                  >
                    Ascender ({selectedSmithVertexIds.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveKnightMode(null);
                    setSelectedKnightMoveFrom(null);
                    setIsPlacingMerchant(false);
                    setActiveProgressCard(null);
                    setSelectedDiplomatEdgeId(null);
                    setSelectedInventorHexIds([]);
                    setSelectedSmithVertexIds([]);
                    if (buildMode === 'CITY_WALL') setBuildMode(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-red-700/80 hover:bg-red-600 text-white text-[10px] font-black cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Centered Non-Overlapping FIFO Notification Queue (Desktop/Tablet only so mobile map stays completely clear) */}
          {!isMobile && (
          <div className="absolute top-3 inset-x-0 z-30 flex justify-center pointer-events-none px-4">
            <AnimatePresence mode="wait">
              {currentQueuedNotice && !isPausedByHost && (
                <motion.div
                  key={currentQueuedNotice.id}
                  initial={{ opacity: 0, y: -14, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.22 }}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs font-extrabold shadow-[0_12px_30px_rgba(0,0,0,0.88)] backdrop-blur-xl pointer-events-auto ${
                    currentQueuedNotice.kind === 'BANK_TRADE'
                      ? 'bg-gradient-to-r from-[#23150b]/95 via-[#2e1b0d]/95 to-[#23150b]/95 border-orange-400/75 text-amber-100'
                      : currentQueuedNotice.kind === 'KNIGHT'
                      ? 'bg-gradient-to-r from-[#2e0b0b]/95 via-[#3d0f0f]/95 to-[#2e0b0b]/95 border-red-500/80 text-red-100'
                      : currentQueuedNotice.kind === 'DEV_CARD'
                      ? 'bg-gradient-to-r from-[#10253b]/95 via-[#163452]/95 to-[#10253b]/95 border-sky-300/75 text-sky-100'
                      : currentQueuedNotice.kind === 'PLAYER_TRADE'
                      ? 'bg-gradient-to-r from-[#0e261b]/95 via-[#133526]/95 to-[#0e261b]/95 border-emerald-400/75 text-emerald-100'
                      : 'bg-[#19120c]/95 border-amber-400/65 text-amber-100'
                  }`}
                >
                  {currentQueuedNotice.kind === 'BANK_TRADE' ? (
                    currentQueuedNotice.ratio && currentQueuedNotice.ratio < 4 ? (
                      <Anchor className="w-4 h-4 text-sky-400 shrink-0" />
                    ) : (
                      <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                    )
                  ) : currentQueuedNotice.kind === 'KNIGHT' ? (
                    <Swords className="w-4 h-4 text-red-400 shrink-0" />
                  ) : currentQueuedNotice.kind === 'PLAYER_TRADE' ? (
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : currentQueuedNotice.kind === 'DEV_CARD' ? (
                    <Sparkles className="w-4 h-4 text-sky-300 shrink-0" />
                  ) : currentQueuedNotice.isBotActor ? (
                    <Bot className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Hammer className="w-4 h-4 text-amber-400 shrink-0" />
                  )}

                  <span>{currentQueuedNotice.message}</span>

                  {((currentQueuedNotice.giveItems && currentQueuedNotice.giveItems.length > 0) ||
                    (currentQueuedNotice.receiveItems &&
                      currentQueuedNotice.receiveItems.length > 0)) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-black/45 border border-white/15 text-[11px]">
                      {currentQueuedNotice.giveItems &&
                        currentQueuedNotice.giveItems.map((item, idx) => (
                          <span
                            key={`give_${item.resource}_${idx}`}
                            className="inline-flex items-center gap-0.5 text-red-200"
                          >
                            <span>-{item.amount}</span>
                            <ResourceIcon resource={item.resource} size={13} />
                          </span>
                        ))}
                      {currentQueuedNotice.giveItems &&
                        currentQueuedNotice.giveItems.length > 0 &&
                        currentQueuedNotice.receiveItems &&
                        currentQueuedNotice.receiveItems.length > 0 && (
                          <span className="text-amber-400 mx-0.5">→</span>
                        )}
                      {currentQueuedNotice.receiveItems &&
                        currentQueuedNotice.receiveItems.map((item, idx) => (
                          <span
                            key={`rec_${item.resource}_${idx}`}
                            className="inline-flex items-center gap-0.5 text-emerald-200"
                          >
                            <span>+{item.amount}</span>
                            <ResourceIcon resource={item.resource} size={13} />
                          </span>
                        ))}
                    </span>
                  )}

                  {/* Instant Dismiss Button for Notification */}
                  <button
                    type="button"
                    onClick={() => setNoticeQueue((prev) => prev.slice(1))}
                    className="ml-1 p-2 -mr-1.5 rounded-xl hover:bg-white/10 active:scale-90 text-stone-300 hover:text-white transition cursor-pointer shrink-0 pointer-events-auto"
                    title="Cerrar aviso"
                    aria-label="Cerrar aviso"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}

          {/* CENTRAL PAUSE OVERLAY (isPausedByHost || phase === 'PAUSED_DISCONNECT') */}
          <AnimatePresence>
            {(isPausedByHost || phase === 'PAUSED_DISCONNECT') && (
              <motion.div
                key="central-pause-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-35 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 pointer-events-auto"
              >
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative max-w-md w-full rounded-3xl bg-[#1c140e]/98 border-2 border-amber-500/80 p-6 text-center shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-4"
                >
                  {(!isPausedByHost || me.isHost) && (
                    <button
                      type="button"
                      onClick={() => {
                        dispatchAction({ type: 'RESUME_GAME' });
                      }}
                      className="absolute top-4 right-4 p-2 rounded-lg text-stone-400 hover:text-amber-200 hover:bg-stone-800 transition cursor-pointer"
                      title="Cerrar y reanudar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  <div className="w-14 h-14 mx-auto rounded-xl bg-amber-500/15 border border-[#c89b3c]/50 flex items-center justify-center text-amber-300">
                    <PauseCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-amber-100">
                      Partida en pausa
                    </h2>
                    <p className="text-xs text-stone-300 mt-1">
                      {isPausedByHost
                        ? me.isHost
                          ? 'Has pausado la partida. Pulsa abajo para reanudarla cuando estéis listos.'
                          : 'La partida ha sido pausada por el anfitrión. Esperando a que reanude.'
                        : 'La partida está pausada esperando resolver la situación de un jugador.'}
                    </p>
                  </div>
                  {(!isPausedByHost || me.isHost) && (
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          dispatchAction({ type: 'RESUME_GAME' });
                        }}
                        className="w-full py-3.5 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/70 text-stone-950 font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Reanudar partida</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CENTRAL MANDATORY DICE ROLL PROMPT (WAITING_FOR_DICE) */}
          <AnimatePresence>
            {phase === 'WAITING_FOR_DICE' && isMyTurn && !isPausedByHost && (
              <motion.div
                key="central-dice-roll-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
              >
                {isMobile ? (
                  <motion.div
                    initial={{ scale: 0.85, y: 14, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                    className="w-full max-w-[225px] rounded-2xl bg-[#18110b]/96 border-2 border-[#d4af37] p-4 text-center shadow-[0_18px_50px_rgba(0,0,0,0.92)] space-y-3"
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-50 to-amber-300 border border-amber-500 flex items-center justify-center text-stone-950 shadow">
                        <Dices className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <h2 className="font-display text-base font-black text-amber-100">
                        Tu turno
                      </h2>
                    </div>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => dispatchAction({ type: 'ROLL_DICE' })}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-200 text-stone-950 font-display font-black text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Dices className="w-4 h-4 stroke-[2.5]" />
                      <span>Lanzar dados</span>
                    </motion.button>

                    {isCitiesKnights && me.citiesKnights?.progressCards.some((c) => c.type === 'ALCHEMIST') && (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('open-cities-knights'))}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 border border-emerald-300 text-stone-950 font-black text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Alquimista</span>
                      </button>
                    )}
                  </motion.div>
                ) : (
                <motion.div
                  initial={{ scale: 0.82, y: 24, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 12, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#261b12]/95 via-[#18100a]/95 to-[#0f0a06]/98 border-2 border-[#d4af37] p-7 text-center shadow-[0_25px_90px_rgba(0,0,0,0.95)] space-y-5"
                >
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-2 border-amber-500 shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex items-center justify-center text-stone-950">
                      <Dices className="w-9 h-9 stroke-[2.2]" />
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-2 border-amber-500 shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex items-center justify-center text-stone-950">
                      <Dices className="w-9 h-9 stroke-[2.2]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Turno #{turn.turnNumber} • Fase Obligatoria
                    </span>
                    <h2 className="font-display text-2xl font-black text-amber-100">
                      Es tu Turno, {me.name}
                    </h2>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Lanza los dados primero para producir recursos en la isla antes de
                      construir, comerciar o jugar cartas de desarrollo.
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => dispatchAction({ type: 'ROLL_DICE' })}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 border-2 border-amber-200 text-stone-950 font-display font-black text-lg tracking-wider uppercase flex items-center justify-center gap-3 shadow-[0_10px_35px_rgba(245,158,11,0.55)] cursor-pointer"
                  >
                    <Dices className="w-6 h-6 stroke-[2.5]" />
                    <span>Lanzar Dados</span>
                  </motion.button>

                  {isCitiesKnights && me.citiesKnights?.progressCards.some((c) => c.type === 'ALCHEMIST') && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.dispatchEvent(new Event('open-cities-knights'))}
                      className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 border border-emerald-300 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 stroke-[2.5]" />
                      <span>🧪 Usar Alquimista (Elegir Dados)</span>
                    </motion.button>
                  )}
                </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Floating Trade Offers & Accepted Trade Summary Banner on Top-Left of Board */}
          <ActiveTradeFloatingBanner
            gameState={gameState}
            me={me}
            dispatchAction={dispatchAction}
            onOpenCounterOffer={() => {
              setTradeModalInitialTab('PLAYERS');
              setShowTradeModal(true);
            }}
          />

          {/* Mercaderes y Bárbaros / Piratas y Exploradores: Floating Helper Banner for active map modes (Desktop/Tablet) */}
          {!isMobile && ((isBarbarians && activeBarbariansMode) || (isExplorersPirates && activeExplorersMode)) && isMyTurn && !isPausedByHost && (
            <div className="absolute top-14 inset-x-0 z-30 flex justify-center pointer-events-none px-4">
              <div className="flex items-center gap-3 bg-[#1a120c] border border-[#c89b3c] text-amber-100 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl pointer-events-auto">
                <Swords className="w-4 h-4 text-[#d4af37] shrink-0" />
                <span>
                  {activeBarbariansMode === 'FISH_FREE_ROAD' && 'Pulsa en un camino iluminado para construir tu carretera gratis (5 pescados)'}
                  {activeBarbariansMode === 'PLACE_BRIDGE' && 'Pulsa en un paso fluvial iluminado conectado a tu red para construir tu puente (2 arcillas + 1 madera)'}
                  {activeBarbariansMode === 'PLACE_CAMEL' && `Pulsa en un camino iluminado para extender la caravana desde el oasis${pendingCamelBid.sheepCards + pendingCamelBid.wheatCards > 0 ? ` (puja: ${pendingCamelBid.sheepCards} lana, ${pendingCamelBid.wheatCards} trigo)` : ''}`}
                  {activeBarbariansMode === 'PLACE_EDGE_KNIGHT' && 'Pulsa en un camino iluminado junto al Castillo para reclutar tu caballero'}
                  {activeBarbariansMode === 'MOVE_EDGE_KNIGHT' && (!selectedEdgeKnightEdgeId ? 'Paso 1: Pulsa en el caballero en camino que deseas desplazar' : 'Paso 2: Pulsa en el camino terrestre contiguo iluminado')}
                  {activeBarbariansMode === 'MOVE_EDGE_BARBARIAN' && (!selectedEdgeBarbarianId ? 'Paso 1: Pulsa en el camino donde se encuentra el bárbaro que deseas mover' : 'Paso 2: Pulsa en el camino terrestre destino iluminado')}
                  {activeBarbariansMode === 'MOVE_WAGON' && `Pulsa en una encrucijada contigua iluminada para mover tu carromato (PM: ${me.barbarians?.wagonMpRemaining ?? 0})`}
                  {activeExplorersMode === 'UPGRADE_HARBOR_CITY' && 'Pulsa en un poblado costero propio iluminado para mejorarlo a Ciudad Portuaria (2 trigos + 2 minerales)'}
                  {activeExplorersMode === 'BUILD_EP_SHIP' && 'Pulsa en una travesía marítima iluminada junto a tu Ciudad Portuaria para botar tu barco (1 madera + 1 oveja)'}
                  {activeExplorersMode === 'MOVE_EP_SHIP' && (!selectedEPShipId ? 'Paso 1: Pulsa en la travesía donde se encuentra el barco que deseas navegar' : 'Paso 2: Pulsa en una travesía marítima contigua para navegar (o en una encrucijada costera iluminada si lleva colono)')}
                  {activeExplorersMode === 'PLACE_PIRATE_SHIP' && 'Pulsa en un hexágono de mar iluminado para situar el Barco Pirata'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveBarbariansMode(null);
                    setSelectedEdgeKnightEdgeId(null);
                    setSelectedEdgeBarbarianId(null);
                    setActiveExplorersMode(null);
                    setSelectedEPShipId(null);
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#9e2b25] hover:bg-[#b5352e] text-white text-[11px] font-bold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {gameState.citiesKnights && (
            <CitiesKnightsPanel
              gameState={gameState}
              playerId={playerId}
              dispatchAction={dispatchAction}
              onHighlightVertex={setCKHighlightedVertex}
              onStartKnightMode={(mode) => {
                setActiveKnightMode(mode);
                setSelectedKnightMoveFrom(null);
              }}
              onStartMerchantMode={() => setIsPlacingMerchant(true)}
              onStartDiplomatMode={() => {
                const diplomatCard = me?.citiesKnights?.progressCards.find((c) => c.type === 'DIPLOMAT');
                if (diplomatCard) {
                  setActiveProgressCard(diplomatCard);
                  setSelectedDiplomatEdgeId(null);
                }
              }}
              onStartBishopMode={() => {
                const bishopCard = me?.citiesKnights?.progressCards.find((c) => c.type === 'BISHOP');
                if (bishopCard) {
                  setActiveProgressCard(bishopCard);
                }
              }}
              onStartIntrigueMode={() => {
                const intrigueCard = me?.citiesKnights?.progressCards.find((c) => c.type === 'INTRIGUE');
                if (intrigueCard) {
                  setActiveProgressCard(intrigueCard);
                }
              }}
              onStartWallMode={() => setBuildMode('CITY_WALL')}
              onStartEngineerMode={(card) => {
                setActiveProgressCard(card);
                setBuildMode(null);
              }}
              onStartInventorMode={(card) => {
                setSelectedInventorHexIds([]);
                setActiveProgressCard(card);
              }}
              onStartSmithMode={(card) => {
                setSelectedSmithVertexIds([]);
                setActiveProgressCard(card);
              }}
            />
          )}

          {gameState.barbarians && (
            <BarbariansPanel
              gameState={gameState}
              playerId={playerId}
              dispatchAction={dispatchAction}
              onStartBoardMode={(mode, options) => {
                setActiveBarbariansMode(mode);
                setSelectedEdgeKnightEdgeId(null);
                setSelectedEdgeBarbarianId(null);
                if (options) {
                  setPendingCamelBid({
                    sheepCards: options.camelBidSheep || 0,
                    wheatCards: options.camelBidWheat || 0,
                  });
                } else {
                  setPendingCamelBid({ sheepCards: 0, wheatCards: 0 });
                }
              }}
            />
          )}

          {gameState.explorersPirates && (
            <ExplorersPiratesPanel
              gameState={gameState}
              playerId={playerId}
              dispatchAction={dispatchAction}
              onStartBoardMode={(mode) => {
                setActiveExplorersMode(mode);
                setSelectedEPShipId(null);
              }}
            />
          )}

          {/* Tabletop HUD: Floating Dice Roll Result + Physical Dev Card Deck (Desktop & Tablet only; hidden on mobile) */}
          {!isMobile && (
          <div
            className={`game-dice-hud tablet-dev-deck-container absolute top-3 z-20 flex flex-col items-end gap-2.5 pointer-events-none ${
              isTabletRightPanelVisible ? 'right-[338px] xl:right-[374px]' : 'right-4'
            }`}
          >
            {turn.diceRoll && (
              <div className="flex items-center gap-2 bg-[#16110d]/95 backdrop-blur-xl border border-[#d4af37]/45 px-3.5 py-2 rounded-2xl shadow-2xl pointer-events-auto">
                <Dices className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-stone-300">Dados:</span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-black text-sm">
                  {turn.diceRoll[0]} + {turn.diceRoll[1]} = {turn.diceRoll[0] + turn.diceRoll[1]}
                </span>
              </div>
            )}

            {/* Physical Development Card Deck on the Tabletop (Base, El Ataque de los Bárbaros / Mercaderes y Bárbaros) */}
            {!hasCitiesKnights(config) && !isExplorersPirates && (() => {
              const usesScenarioDevDeck =
                gameState.barbarians?.scenario === 'BARBARIAN_ATTACK' ||
                gameState.barbarians?.scenario === 'TRADERS_AND_BARBARIANS';
              const deckCount = usesScenarioDevDeck
                ? (gameState.barbarians?.scenarioDevDeck.length ?? 0)
                : (gameState.devDeck?.length ?? 0);
              const deckBackSrc =
                gameState.barbarians?.scenario === 'TRADERS_AND_BARBARIANS'
                  ? MB_CARD_ASSETS.TB_DEV_BACK
                  : gameState.barbarians?.scenario === 'BARBARIAN_ATTACK'
                  ? MB_CARD_ASSETS.DEV_BACK
                  : CARD_BACK_PATHS.development;
              return (
                <div
                  id="tabletop-devcard-deck"
                  className="pointer-events-auto relative group flex flex-col items-center select-none cursor-pointer"
                  title={
                    usesScenarioDevDeck
                      ? `Mazo de Escenario: ${deckCount} cartas restantes`
                      : `Mazo de Desarrollo: ${deckCount} cartas restantes`
                  }
                  onClick={() => {
                    if (isPausedByHost) return;
                    if (usesScenarioDevDeck) {
                      if (
                        isMyTurn &&
                        (phase === 'MAIN_PHASE' || phase === 'SPECIAL_BUILD_PHASE') &&
                        deckCount > 0 &&
                        (me.resources.SHEEP || 0) >= 1 &&
                        (me.resources.WHEAT || 0) >= 1 &&
                        (me.resources.ORE || 0) >= 1
                      ) {
                        dispatchAction({ type: 'MB_BUY_SCENARIO_DEV_CARD' });
                      } else {
                        window.dispatchEvent(new Event('open-barbarians-panel'));
                      }
                    } else if (devBuyPermission.allowed) {
                      dispatchAction({ type: 'BUY_DEV_CARD' });
                    }
                  }}
                >
                  {/* Stack depth illusion layers */}
                  {deckCount > 2 && (
                    <div className="absolute top-1.5 -left-1.5 w-16 h-24 rounded-xl bg-amber-950/70 border border-amber-600/30 -rotate-3 -z-10 shadow-md" />
                  )}
                  {deckCount > 1 && (
                    <div className="absolute top-0.5 -left-0.5 w-16 h-24 rounded-xl bg-amber-900/80 border border-amber-600/40 -rotate-1 -z-10 shadow-md" />
                  )}

                  {/* Top card of the deck with original reverse illustration */}
                  <div className="relative w-16 h-24 rounded-xl overflow-hidden border-2 border-[#d4af37]/75 bg-[#16110d] shadow-[0_8px_25px_rgba(0,0,0,0.85)] group-hover:border-amber-300 group-hover:scale-105 transition-all">
                    <img
                      src={deckBackSrc}
                      alt="Mazo de Desarrollo"
                      className="w-full h-full object-cover select-none"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/35 via-transparent to-amber-200/15 pointer-events-none" />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-md border border-[#d4af37]/60 text-[10px] font-black text-amber-300 tracking-tighter">
                      {deckCount}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 border border-amber-500/30 text-[9px] font-bold text-amber-200/90 shadow-sm">
                    <span>{usesScenarioDevDeck ? 'Escenario' : 'Mazo'}</span>
                    <span className="text-amber-400">({deckCount})</span>
                  </div>
                </div>
              );
            })()}

            {/* Physical "Eventos en Catán" Card Deck & Active Event Card on the Tabletop */}
            {gameState.barbarians?.variants.catanEventsDeck && (
              <div
                onClick={() => window.dispatchEvent(new Event('open-barbarians-panel'))}
                className="pointer-events-auto relative group flex flex-col items-center select-none cursor-pointer"
                title={
                  gameState.barbarians.currentEventCard
                    ? `Evento actual: ${gameState.barbarians.currentEventCard.title} — Haz clic para ver detalles`
                    : `Mazo Eventos en Catán (${gameState.barbarians.eventDeck.length} cartas)`
                }
              >
                <div className="relative w-20 h-32 rounded-xl overflow-hidden border-2 border-amber-400/80 bg-[#16110d] shadow-[0_10px_28px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-all">
                  <img
                    src={
                      gameState.barbarians.currentEventCard
                        ? getCatanEventCardImage(gameState.barbarians.currentEventCard)
                        : MB_CARD_ASSETS.EVENT_BACK
                    }
                    alt={gameState.barbarians.currentEventCard?.title || 'Eventos en Catán'}
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/85 border border-amber-400/60 text-[9px] font-black text-amber-300">
                    {gameState.barbarians.eventDeck.length}
                  </div>
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-black/80 border border-amber-500/40 text-[9px] font-bold text-amber-200 max-w-[110px] truncate">
                  {gameState.barbarians.currentEventCard
                    ? gameState.barbarians.currentEventCard.title
                    : 'Eventos Catán'}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Bottom-Left Action Controls: Collapsible "Acciones" on Mobile, Stacked Box on Desktop/Tablet */}
          {isMobile ? (() => {
            const hasActiveMapSelection = Boolean(
              buildMode ||
                activeKnightMode ||
                activeBarbariansMode ||
                activeExplorersMode ||
                isPlacingMerchant ||
                activeProgressCard
            );
            const clearAllMapSelections = () => {
              setBuildMode(null);
              setSelectedMovableShipId(null);
              setActiveKnightMode(null);
              setSelectedKnightMoveFrom(null);
              setActiveBarbariansMode(null);
              setSelectedEdgeKnightEdgeId(null);
              setSelectedEdgeBarbarianId(null);
              setActiveExplorersMode(null);
              setSelectedEPShipId(null);
              setIsPlacingMerchant(false);
              setActiveProgressCard(null);
              setSelectedDiplomatEdgeId(null);
              setSelectedInventorHexIds([]);
              setSelectedSmithVertexIds([]);
            };
            const closeMobileSubmenus = () => {
              setIsBuildDrawerOpen(false);
              setIsKnightsDrawerOpen(false);
              setIsBarbariansDrawerOpen(false);
              setIsExplorersDrawerOpen(false);
            };
            const closeAllMobileActions = () => {
              closeMobileSubmenus();
              setIsMobileActionsOpen(false);
            };

            return (
              <div
                className={`mobile-actions-anchor ${
                  hasBottomExpansionHud ? 'with-expansion-pill' : ''
                } fixed z-30 pointer-events-auto flex flex-col items-start gap-1.5`}
              >
                {isMobileActionsOpen && (
                  <div
                    onClick={closeAllMobileActions}
                    className="fixed inset-0 z-25 bg-black/25"
                  />
                )}

                {hasActiveMapSelection ? (
                  <div className="relative z-35 flex items-center gap-1.5">
                    {activeProgressCard?.type === 'DIPLOMAT' && selectedDiplomatEdgeId && (
                      <button
                        type="button"
                        onClick={() => {
                          dispatchAction({
                            type: 'PLAY_PROGRESS_CARD',
                            cardId: activeProgressCard.id,
                            payload: { edgeId: selectedDiplomatEdgeId },
                          });
                          clearAllMapSelections();
                        }}
                        className="h-8 px-2.5 rounded-xl bg-emerald-600 border border-emerald-300 text-stone-950 text-[11px] font-black shadow-xl cursor-pointer"
                      >
                        Retirar
                      </button>
                    )}
                    {activeProgressCard?.type === 'SMITH' && selectedSmithVertexIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          dispatchAction({
                            type: 'PLAY_PROGRESS_CARD',
                            cardId: activeProgressCard.id,
                            payload: { vertexIds: selectedSmithVertexIds },
                          });
                          clearAllMapSelections();
                        }}
                        className="h-8 px-2.5 rounded-xl bg-emerald-600 border border-emerald-300 text-stone-950 text-[11px] font-black shadow-xl cursor-pointer"
                      >
                        Ascender ({selectedSmithVertexIds.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearAllMapSelections}
                      className="h-8 px-2.5 rounded-xl bg-[#9e2b25] border border-red-300/70 text-white text-[11px] font-black flex items-center gap-1 shadow-xl cursor-pointer active:scale-95"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.6]" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative z-35">
                    <AnimatePresence>
                      {isMobileActionsOpen && (
                        <motion.div
                          key="mobile-actions-popover"
                          initial={{ opacity: 0, y: 10, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.14 }}
                          className="absolute bottom-[calc(100%+6px)] left-0 w-[124px] p-1.5 rounded-xl bg-[#160f0a] border border-[#d4af37]/75 shadow-[0_14px_36px_rgba(0,0,0,0.95)] flex flex-col gap-1 opacity-100"
                        >
                          <BuildDrawerMenu
                            isOpen={isBuildDrawerOpen}
                            onToggleOpen={() => {
                              setIsKnightsDrawerOpen(false);
                              setIsBarbariansDrawerOpen(false);
                              setIsExplorersDrawerOpen(false);
                              setIsBuildDrawerOpen((o) => !o);
                            }}
                            onCloseParentMenu={() => setIsMobileActionsOpen(false)}
                            buildMode={buildMode}
                            onSelectBuildMode={(mode) => setBuildMode(mode)}
                            onBuyDevCard={() => {
                              dispatchAction({ type: 'BUY_DEV_CARD' });
                            }}
                            me={me}
                            canBuildRoadNow={canBuildRoadNow}
                            canBuildShipNow={canBuildShipNow}
                            canMoveShipNow={canMoveShipNow}
                            canBuildSettlementNow={canBuildSettlementNow}
                            canBuildCityNow={canBuildCityNow}
                            canBuyDevCardNow={devBuyPermission.allowed && !isPausedByHost}
                            restrictionReason={!infraPermission.allowed ? infraPermission.reason : undefined}
                            devDeckRemaining={gameState.devDeck.length}
                            disabledBeforeDice={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                            isRoadBuildingDev={isMyTurn && phase === 'ROAD_BUILDING_DEV'}
                            onFinishRoadBuilding={() => dispatchAction({ type: 'FINISH_ROAD_BUILDING' })}
                            isSeafarers={isSeafarers}
                            isCitiesKnights={isCitiesKnights}
                            hideDevCardOption={isExplorersPirates || usesScenarioDevDeck}
                            canBuildWallNow={canBuildWallNow}
                            hasMedicineDiscount={Boolean(gameState.citiesKnights?.turnEffects?.medicine)}
                          />

                          <button
                            type="button"
                            disabled={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                            onClick={() => {
                              closeAllMobileActions();
                              setTradeModalInitialTab('BANK');
                              setShowTradeModal(true);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-between gap-1 transition-colors opacity-100 ${
                              isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)
                                ? 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                                : 'bg-[#b85a27] border-[#e2a46f]/70 text-amber-50 cursor-pointer'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {hasAnyPort ? (
                                <Anchor className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Flame className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span className="truncate">Comercio</span>
                            </span>
                            {gameState.activeTradeOffers.length > 0 && (
                              <span className="px-1 rounded-full bg-red-600 text-white text-[9px] font-bold">
                                {gameState.activeTradeOffers.length}
                              </span>
                            )}
                          </button>

                          {gameState.config.seafarersScenario === 'WONDERS_OF_CATAN' && (
                            <button
                              type="button"
                              onClick={() => {
                                closeAllMobileActions();
                                setShowWonders(true);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#c89b3c]/50 bg-[#2a1d11] text-amber-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                              <span className="truncate">Maravillas</span>
                            </button>
                          )}

                          {!isExplorersPirates && (
                            <button
                              type="button"
                              disabled={isPausedByHost || (!isCitiesKnights && isMyTurn && isWaitingForMandatoryDice)}
                              onClick={() => {
                                closeAllMobileActions();
                                if (isCitiesKnights) {
                                  window.dispatchEvent(new Event('open-cities-knights'));
                                } else if (usesScenarioDevDeck) {
                                  window.dispatchEvent(new Event('open-barbarians-panel'));
                                } else {
                                  setShowDevModal(true);
                                }
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-colors opacity-100 ${
                                isPausedByHost || (!isCitiesKnights && isMyTurn && isWaitingForMandatoryDice)
                                  ? 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                                  : 'bg-[#241a12] border-[#c89b3c]/45 text-amber-200 cursor-pointer'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                              <span className="truncate tabular-nums">
                                {isCitiesKnights
                                  ? `Progreso (${me.citiesKnights?.progressCards.length ?? 0})`
                                  : usesScenarioDevDeck
                                  ? `Cartas (${me.barbarians?.scenarioDevCards.filter((c) => !c.played).length ?? 0})`
                                  : `Des. (${unplayedDevCount})`}
                              </span>
                            </button>
                          )}

                          {isCitiesKnights && (
                            <KnightsDrawerMenu
                              isOpen={isKnightsDrawerOpen}
                              onToggleOpen={() => {
                                setIsBuildDrawerOpen(false);
                                setIsKnightsDrawerOpen((o) => !o);
                              }}
                              onCloseParentMenu={() => setIsMobileActionsOpen(false)}
                              activeKnightMode={activeKnightMode}
                              onSelectKnightMode={(mode) => {
                                setActiveKnightMode(mode);
                                setSelectedKnightMoveFrom(null);
                              }}
                              canRecruitNow={canRecruitKnightNow}
                              canPromoteNow={canPromoteKnightNow}
                              canActivateNow={canActivateKnightNow}
                              canExpelNow={canExpelRobberNow}
                              canMoveNow={canMoveKnightNow}
                              myDefense={myDefense}
                              freeRank1Count={freeRank1Count}
                              disabledBeforeDice={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                            />
                          )}

                          {isBarbarians && (
                            <BarbariansDrawerMenu
                              isOpen={isBarbariansDrawerOpen}
                              onToggleOpen={() => {
                                setIsBuildDrawerOpen(false);
                                setIsBarbariansDrawerOpen((o) => !o);
                              }}
                              onCloseParentMenu={() => setIsMobileActionsOpen(false)}
                              gameState={gameState}
                              me={me}
                              isMyTurn={isMyTurn}
                              activeMode={activeBarbariansMode}
                              onSelectMode={(mode) => {
                                setActiveBarbariansMode(mode);
                                setSelectedEdgeKnightEdgeId(null);
                              }}
                              onOpenPanelModal={() => window.dispatchEvent(new Event('open-barbarians-panel'))}
                              onBuyScenarioDevCard={() => dispatchAction({ type: 'MB_BUY_SCENARIO_DEV_CARD' })}
                              onUpgradeWagon={() => dispatchAction({ type: 'MB_UPGRADE_WAGON' })}
                              onBoostWagon={() => dispatchAction({ type: 'MB_BOOST_WAGON' })}
                              onFishRemoveRobber={() => {
                                const fishTokens = [...(me.barbarians?.fishTokens || [])].sort(
                                  (a, b) => a.fishCount - b.fishCount
                                );
                                let sum = 0;
                                const pickedIds: string[] = [];
                                for (const t of fishTokens) {
                                  pickedIds.push(t.id);
                                  sum += t.fishCount;
                                  if (sum >= 2) break;
                                }
                                dispatchAction({ type: 'MB_FISH_REMOVE_ROBBER', tokenIds: pickedIds });
                              }}
                              onFishFreeDevCard={() => {
                                const fishTokens = [...(me.barbarians?.fishTokens || [])].sort(
                                  (a, b) => a.fishCount - b.fishCount
                                );
                                let sum = 0;
                                const pickedIds: string[] = [];
                                for (const t of fishTokens) {
                                  pickedIds.push(t.id);
                                  sum += t.fishCount;
                                  if (sum >= 7) break;
                                }
                                dispatchAction({ type: 'MB_FISH_FREE_DEV_CARD', tokenIds: pickedIds });
                              }}
                              disabledBeforeDice={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                            />
                          )}

                          {isExplorersPirates && (
                            <ExplorersPiratesDrawerMenu
                              isOpen={isExplorersDrawerOpen}
                              onToggleOpen={() => {
                                setIsBuildDrawerOpen(false);
                                setIsExplorersDrawerOpen((o) => !o);
                              }}
                              onCloseParentMenu={() => setIsMobileActionsOpen(false)}
                              gameState={gameState}
                              me={me}
                              isMyTurn={isMyTurn}
                              activeMode={activeExplorersMode}
                              onSelectMode={(mode) => {
                                setActiveExplorersMode(mode);
                                setSelectedEPShipId(null);
                              }}
                              onOpenPanelModal={() => window.dispatchEvent(new Event('open-explorers-pirates-panel'))}
                              onBuildSettler={() => dispatchAction({ type: 'EP_BUILD_SETTLER' })}
                              onBuildUnit={() => dispatchAction({ type: 'EP_BUILD_UNIT' })}
                              onRollFishShoal={() => dispatchAction({ type: 'EP_ROLL_FISH_SHOAL' })}
                              disabledBeforeDice={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={() => {
                        if (isMobileActionsOpen) {
                          closeAllMobileActions();
                        } else {
                          setIsMobileActionsOpen(true);
                        }
                      }}
                      className={`h-8 px-2.5 rounded-xl border text-[11px] font-black flex items-center gap-1.5 shadow-xl cursor-pointer active:scale-95 transition ${
                        isMobileActionsOpen
                          ? 'bg-[#d4af37] border-amber-200 text-stone-950'
                          : 'bg-[#18110c]/96 border-[#d4af37]/75 text-amber-100'
                      }`}
                    >
                      <Hammer className="w-3.5 h-3.5 shrink-0" />
                      <span>Acciones</span>
                      {gameState.activeTradeOffers.length > 0 && !isMobileActionsOpen && (
                        <span className="px-1 rounded-full bg-red-600 text-white text-[9px] font-bold">
                          {gameState.activeTradeOffers.length}
                        </span>
                      )}
                      {isMobileActionsOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })() : (
          <div className="game-build-controls absolute bottom-3 left-3 z-30 flex items-center pointer-events-auto">
            <div className="tablet-action-box flex flex-col gap-1.5 w-[200px] sm:w-[225px] p-2 rounded-2xl bg-[#160f0a] border border-[#d4af37]/60 shadow-[0_10px_30px_rgba(0,0,0,0.95)] opacity-100">
              {/* 1. Construir (C) */}
              <BuildDrawerMenu
                isOpen={isBuildDrawerOpen}
                onToggleOpen={() => setIsBuildDrawerOpen((o) => !o)}
                buildMode={buildMode}
                onSelectBuildMode={(mode) => setBuildMode(mode)}
                onBuyDevCard={() => {
                  dispatchAction({ type: 'BUY_DEV_CARD' });
                }}
                me={me}
                canBuildRoadNow={canBuildRoadNow}
                canBuildShipNow={canBuildShipNow}
                canMoveShipNow={canMoveShipNow}
                canBuildSettlementNow={canBuildSettlementNow}
                canBuildCityNow={canBuildCityNow}
                canBuyDevCardNow={devBuyPermission.allowed && !isPausedByHost}
                restrictionReason={!infraPermission.allowed ? infraPermission.reason : undefined}
                devDeckRemaining={gameState.devDeck.length}
                disabledBeforeDice={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                isRoadBuildingDev={isMyTurn && phase === 'ROAD_BUILDING_DEV'}
                onFinishRoadBuilding={() => dispatchAction({ type: 'FINISH_ROAD_BUILDING' })}
                isSeafarers={isSeafarers}
                isCitiesKnights={isCitiesKnights}
                hideDevCardOption={isExplorersPirates || usesScenarioDevDeck}
                canBuildWallNow={canBuildWallNow}
                hasMedicineDiscount={Boolean(gameState.citiesKnights?.turnEffects?.medicine)}
              />

              {/* 2. Intercambiar / Comerciar (I) */}
              <button
                type="button"
                disabled={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                onClick={() => {
                  setTradeModalInitialTab('BANK');
                  setShowTradeModal(true);
                }}
                className={`tablet-action-btn w-full px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-between gap-2 transition-colors opacity-100 ${
                  isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)
                    ? 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-[#b85a27] hover:bg-[#c96630] border-[#e2a46f]/70 text-amber-50 shadow-[inset_0_1px_0_rgba(255,244,214,0.25)] cursor-pointer active:scale-98'
                }`}
                title={
                  !tradePermission.allowed
                    ? tradePermission.reason
                    : 'Comerciar con la Banca (4:1 o Puertos 3:1 / 2:1) o con otros jugadores (Atajo: I)'
                }
              >
                <span className="flex items-center gap-1.5 truncate">
                  {isMyTurn && !tradePermission.allowed && !isWaitingForMandatoryDice ? (
                    <Lock className="w-3.5 h-3.5 text-red-200 shrink-0" />
                  ) : hasAnyPort ? (
                    <Anchor className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">Intercambiar</span>
                  {gameState.activeTradeOffers.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-bold">
                      {gameState.activeTradeOffers.length}
                    </span>
                  )}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-[9px] font-mono opacity-85">
                  I
                </span>
              </button>

              {gameState.config.seafarersScenario === 'WONDERS_OF_CATAN' && (
                <button type="button" onClick={() => setShowWonders(true)}
                  className="w-full px-3 py-2 rounded-lg border border-[#c89b3c]/50 bg-[#2a1d11] hover:bg-[#362516] text-amber-100 text-xs font-bold flex items-center gap-2 opacity-100 cursor-pointer">
                  <Award className="w-4 h-4 text-[#d4af37]" /> Maravillas
                </button>
              )}
              {/* 3. Cartas de Desarrollo / Progreso / Escenario (D) — oculto en Piratas y Exploradores */}
              {!isExplorersPirates && (
              <div className="relative group/progbtn w-full">
                <button
                  type="button"
                  disabled={isPausedByHost || (!isCitiesKnights && isMyTurn && isWaitingForMandatoryDice)}
                  onClick={() => {
                    if (isCitiesKnights) {
                      window.dispatchEvent(new Event('open-cities-knights'));
                    } else if (usesScenarioDevDeck) {
                      window.dispatchEvent(new Event('open-barbarians-panel'));
                    } else {
                      setShowDevModal(true);
                    }
                  }}
                  className={`tablet-action-btn w-full px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-between gap-2 transition-colors opacity-100 ${
                    isPausedByHost || (!isCitiesKnights && isMyTurn && isWaitingForMandatoryDice)
                      ? 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                      : 'bg-[#241a12] hover:bg-[#2f2217] border-[#c89b3c]/45 text-amber-200 cursor-pointer shadow active:scale-98'
                  }`}
                  title={
                    isCitiesKnights
                      ? 'Ver tus Cartas de Progreso y Mazos (Atajo: D)'
                      : usesScenarioDevDeck
                      ? 'Ver y comprar cartas del mazo de escenario (Atajo: D)'
                      : 'Ver o comprar Cartas de Desarrollo (Atajo: D)'
                  }
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                    <span className="truncate tabular-nums">
                      {isCitiesKnights
                        ? `Progreso (${me.citiesKnights?.progressCards.length ?? 0})`
                        : usesScenarioDevDeck
                        ? `Cartas (${me.barbarians?.scenarioDevCards.filter((c) => !c.played).length ?? 0})`
                        : `Desarrollo (${unplayedDevCount})`}
                    </span>
                    {isCitiesKnights && (gameState.citiesKnights?.turnEffects?.harborPartners?.length ?? 0) > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#c89b3c] text-stone-950 text-[9px] font-bold">
                        Puerto
                      </span>
                    )}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/35 text-[9px] font-mono text-amber-300/80">
                    D
                  </span>
                </button>

                {/* Hover Card Backs Fan Preview on Desktop fine pointers */}
                {((isCitiesKnights && (me.citiesKnights?.progressCards.length ?? 0) > 0) ||
                  (!isCitiesKnights && !usesScenarioDevDeck && unplayedDevCount > 0)) && (
                  <div className="hidden lg:group-hover/progbtn:flex absolute bottom-[calc(100%+8px)] left-0 z-50 p-2.5 rounded-xl bg-[#16100b] border border-[#c89b3c]/60 shadow-[0_14px_36px_rgba(0,0,0,0.9)] flex-col items-center gap-1.5 pointer-events-none min-w-[160px]">
                    <span className="text-[10px] font-bold text-amber-300">
                      {isCitiesKnights ? 'Tus cartas de progreso' : 'Cartas de desarrollo en mano'}
                    </span>
                    <div className="flex items-center justify-center -space-x-2 py-1">
                      {isCitiesKnights
                        ? me.citiesKnights?.progressCards.map((c, idx) => (
                            <img
                              key={c.id}
                              src={PROGRESS_BACK_IMAGE_PATHS[c.branch]}
                              alt={BRANCH_META[c.branch].name}
                              style={{ transform: `rotate(${(idx - (me.citiesKnights!.progressCards.length - 1) / 2) * 8}deg)` }}
                              className="w-11 h-16 object-cover rounded border border-amber-300/70 shadow-lg bg-stone-900"
                            />
                          ))
                        : Array.from({ length: Math.min(unplayedDevCount, 6) }).map((_, idx) => (
                            <img
                              key={idx}
                              src={CARD_BACK_PATHS.development}
                              alt="Dorso de Desarrollo"
                              style={{ transform: `rotate(${(idx - (Math.min(unplayedDevCount, 6) - 1) / 2) * 8}deg)` }}
                              className="w-11 h-16 object-cover rounded border border-amber-300/70 shadow-lg bg-stone-900"
                            />
                          ))}
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* 4. Caballeros (K) - Exclusivo Ciudades y Caballeros */}
              {isCitiesKnights && (
                <KnightsDrawerMenu
                  isOpen={isKnightsDrawerOpen}
                  onToggleOpen={() => setIsKnightsDrawerOpen((o) => !o)}
                  activeKnightMode={activeKnightMode}
                  onSelectKnightMode={(mode) => {
                    setActiveKnightMode(mode);
                    setSelectedKnightMoveFrom(null);
                  }}
                  canRecruitNow={canRecruitKnightNow}
                  canPromoteNow={canPromoteKnightNow}
                  canActivateNow={canActivateKnightNow}
                  canExpelNow={canExpelRobberNow}
                  canMoveNow={canMoveKnightNow}
                  myDefense={myDefense}
                  freeRank1Count={freeRank1Count}
                  disabledBeforeDice={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                />
              )}

              {/* 4b. Mercaderes y Bárbaros - Cajón de acciones de escenario */}
              {isBarbarians && (
                <BarbariansDrawerMenu
                  isOpen={isBarbariansDrawerOpen}
                  onToggleOpen={() => setIsBarbariansDrawerOpen((o) => !o)}
                  gameState={gameState}
                  me={me}
                  isMyTurn={isMyTurn}
                  activeMode={activeBarbariansMode}
                  onSelectMode={(mode) => {
                    setActiveBarbariansMode(mode);
                    setSelectedEdgeKnightEdgeId(null);
                  }}
                  onOpenPanelModal={() => window.dispatchEvent(new Event('open-barbarians-panel'))}
                  onBuyScenarioDevCard={() => dispatchAction({ type: 'MB_BUY_SCENARIO_DEV_CARD' })}
                  onUpgradeWagon={() => dispatchAction({ type: 'MB_UPGRADE_WAGON' })}
                  onBoostWagon={() => dispatchAction({ type: 'MB_BOOST_WAGON' })}
                  onFishRemoveRobber={() => {
                    const fishTokens = [...(me.barbarians?.fishTokens || [])].sort(
                      (a, b) => a.fishCount - b.fishCount
                    );
                    let sum = 0;
                    const pickedIds: string[] = [];
                    for (const t of fishTokens) {
                      pickedIds.push(t.id);
                      sum += t.fishCount;
                      if (sum >= 2) break;
                    }
                    dispatchAction({ type: 'MB_FISH_REMOVE_ROBBER', tokenIds: pickedIds });
                  }}
                  onFishFreeDevCard={() => {
                    const fishTokens = [...(me.barbarians?.fishTokens || [])].sort(
                      (a, b) => a.fishCount - b.fishCount
                    );
                    let sum = 0;
                    const pickedIds: string[] = [];
                    for (const t of fishTokens) {
                      pickedIds.push(t.id);
                      sum += t.fishCount;
                      if (sum >= 7) break;
                    }
                    dispatchAction({ type: 'MB_FISH_FREE_DEV_CARD', tokenIds: pickedIds });
                  }}
                  disabledBeforeDice={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                />
              )}

              {/* 4c. Piratas y Exploradores - Cajón de acciones de flota y misiones */}
              {isExplorersPirates && (
                <ExplorersPiratesDrawerMenu
                  isOpen={isExplorersDrawerOpen}
                  onToggleOpen={() => setIsExplorersDrawerOpen((o) => !o)}
                  gameState={gameState}
                  me={me}
                  isMyTurn={isMyTurn}
                  activeMode={activeExplorersMode}
                  onSelectMode={(mode) => {
                    setActiveExplorersMode(mode);
                    setSelectedEPShipId(null);
                  }}
                  onOpenPanelModal={() => window.dispatchEvent(new Event('open-explorers-pirates-panel'))}
                  onBuildSettler={() => dispatchAction({ type: 'EP_BUILD_SETTLER' })}
                  onBuildUnit={() => dispatchAction({ type: 'EP_BUILD_UNIT' })}
                  onRollFishShoal={() => dispatchAction({ type: 'EP_ROLL_FISH_SHOAL' })}
                  disabledBeforeDice={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                />
              )}
            </div>
          </div>
          )}

          {/* Tablet-Only Toggle Button to Collapse/Expand Right Side Panel (hidden on desktop and mobile) */}
          {!isMobile && (
          <button
            type="button"
            onClick={() => setIsTabletRightPanelVisible((v) => !v)}
            className="game-players-toggle lg:hidden absolute top-2 right-2 z-30 px-3 py-2 rounded-xl bg-[#1d140e]/95 border border-[#d4af37]/60 text-amber-300 shadow-xl pointer-events-auto flex items-center gap-2 text-xs font-black backdrop-blur-md cursor-pointer active:scale-95 transition"
            title="Mostrar u ocultar panel de jugadores y banca"
          >
            <Users className="w-4 h-4" />
            <span>{isTabletRightPanelVisible ? 'Ocultar' : 'Jugadores'}</span>
          </button>
          )}

          {/* Right Area: NO outer rectangle/border line for the column!
              Only individual rounded player profile rectangles + the single bordered rectangle for Bank Resources & Island Chronicles */}
          <aside
            className={`tablet-sidebar ${isMobile ? 'mobile-players-dropdown' : ''} absolute top-2.5 bottom-2.5 right-2.5 w-[260px] md:w-[274px] xl:w-[308px] flex flex-col justify-between z-25 pointer-events-none transition-transform duration-300 ease-in-out ${
              isTabletRightPanelVisible ? 'translate-x-0' : 'translate-x-[115%] lg:translate-x-0'
            }`}
          >
            {/* 1. Floating Rounded Player Profile Rectangles (with left horizontal card fan) */}
            <div
              className={`tablet-player-list flex-1 min-h-0 space-y-2 ${
                isMobile ? 'overflow-y-auto overscroll-contain touch-pan-y pointer-events-auto space-y-1.5 pr-0' : 'overflow-visible pr-0.5 pointer-events-none'
              } ${
                isMobile || gameState.players.length > 4 ? 'tablet-player-list-compact' : ''
              }`}
            >
              {gameState.players.map((p) => {
                const pDefense = isCitiesKnights
                  ? ownKnights(gameState, p.id).reduce(
                      (acc, v) => acc + (v.knight!.active ? v.knight!.rank : 0),
                      0
                    )
                  : 0;
                return (
                  <PlayerSummaryCard
                    key={p.id}
                    player={p}
                    isLocalPlayer={p.id === playerId}
                    isActiveTurn={turn.activePlayerId === p.id}
                    hasLongestRoad={gameState.longestRoadPlayerId === p.id}
                    hasLargestArmy={gameState.largestArmyPlayerId === p.id}
                    showCardFan={!isMobile && showProfileCardFans}
                    useCompactLayout={isMobile || gameState.players.length > 4}
                    isCitiesKnights={isCitiesKnights}
                    playerDefense={pDefense}
                  />
                );
              })}
            </div>

            {/* 2. Single Delimited Rectangle ONLY for Bank Resources + Island Chronicles (Hidden on Mobile) */}
            {!isMobile && (
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="tablet-bank-box mt-2 shrink-0 flex flex-col bg-[#140e09]/95 backdrop-blur-xl border-2 border-[#d4af37]/45 rounded-2xl overflow-hidden shadow-[0_12px_35px_rgba(0,0,0,0.88)] pointer-events-auto"
            >
              {/* Recursos de la Banca */}
              <motion.div layout="position" className="p-2.5 border-b border-[#d4af37]/25">
                <div className="tablet-bank-header flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-200 mb-1.5 px-0.5">
                  <span>Recursos de la Banca</span>
                  <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-500/30 text-purple-200 text-[9px]">
                    {hasCitiesKnights(config) ? `Progreso: ${Object.values(gameState.citiesKnights?.decks || {}).reduce((n, cards) => n + cards.length, 0)}` : `Desarrollo: ${gameState.devDeck.length}`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {(hasCitiesKnights(config) ? ALL_TRADE_CARDS : ALL_RESOURCES).map((r) => (
                    <div
                      key={r}
                      className="tablet-bank-slot flex flex-col items-center justify-center py-1 px-0.5 rounded-lg bg-[#090604] border border-stone-800"
                      title={`Banca - ${RESOURCE_META[r].name}: ${gameState.bank[r]}`}
                    >
                      <div className="flex items-center gap-0.5">
                        <ResourceIcon resource={r} size={14} />
                        <span className="tablet-bank-num font-mono text-[11px] font-black text-amber-100">
                          {gameState.bank[r]}
                        </span>
                      </div>
                      <span className="tablet-bank-name text-[8px] font-semibold text-stone-400 mt-0.5 truncate max-w-full">
                        {RESOURCE_META[r].name}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Menú de las Crónicas de la Isla */}
              <motion.div layout="position" className="p-2 bg-[#120d09]">
                <button
                  type="button"
                  onClick={() => setShowChronicle((prev) => !prev)}
                  className="tablet-chronicle-btn w-full py-2 px-3 rounded-xl bg-[#1d140e] hover:bg-[#281c13] border border-[#d4af37]/40 text-amber-200 text-xs font-black flex items-center justify-between transition cursor-pointer shadow"
                >
                  <span className="flex items-center gap-1.5">
                    <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Crónicas de la Isla</span>
                  </span>
                  <span className="tablet-chronicle-badge inline-flex items-center gap-1 text-[10px] font-mono text-amber-400">
                    <span>{showChronicle ? 'Cerrar' : `Ver (${gameState.logs.length})`}</span>
                    {showChronicle ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>
              </motion.div>

              {/* Desplegable de Crónicas */}
              <AnimatePresence initial={false}>
                {showChronicle && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 190, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden bg-[#0c0806] border-t border-[#d4af37]/30 flex flex-col px-2.5 py-2"
                  >
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {gameState.logs.map((entry) => (
                        <div
                          key={entry.id}
                          className="tablet-chronicle-log text-[11px] px-2.5 py-1.5 rounded-lg bg-[#140e0a] border border-stone-800 text-stone-300 leading-snug"
                        >
                          {entry.message}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            )}
          </aside>
        </div>
      </div>

      {/* Slim Bottom Tabletop HUD (Desktop/Tablet) vs Clean Floating Cards & End Turn (Mobile) */}
      {isMobile ? (
        <>
          {/* Floating Resource Cards directly over the bottom of the map (NO bar or border line) */}
          <div
            className="mobile-floating-hand fixed z-25 pointer-events-none flex items-end justify-center"
            aria-label="Tus recursos y mercancías"
          >
            <div className="flex items-end justify-center gap-1 pointer-events-auto">
              {(hasCitiesKnights(config) ? ALL_TRADE_CARDS : ALL_RESOURCES).map((resource) => {
                const count = me.resources[resource] || 0;
                const isCKSet = hasCitiesKnights(config);
                return (
                  <button
                    key={resource}
                    type="button"
                    disabled={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                    title={`${RESOURCE_META[resource].name}: ${count}`}
                    aria-label={`${RESOURCE_META[resource].name}: ${count}`}
                    onClick={() => {
                      if (isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)) return;
                      setTradeModalInitialTab('BANK');
                      setShowTradeModal(true);
                    }}
                    className={`relative flex items-center justify-center transition-transform active:-translate-y-1 cursor-pointer ${
                      count === 0 ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    <img
                      src={RESOURCE_CARD_PATHS[resource]}
                      alt=""
                      draggable={false}
                      className={`${
                        isCKSet ? 'w-[28px] sm:w-[32px]' : 'w-[34px] sm:w-[38px]'
                      } aspect-[2/3] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)]`}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 rounded-md px-1 py-0.2 bg-[#110c08]/95 border border-[#d4af37]/70 text-amber-100 text-[10px] leading-tight font-mono font-black shadow">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floating Compact End Turn Button (Bottom-Right, safe-area aware) */}
          {isMyTurn && !isPausedByHost && (phase === 'MAIN_PHASE' || phase === 'ROAD_BUILDING_DEV' || phase === 'SPECIAL_BUILD_PHASE') && (
            <div className="mobile-floating-endturn fixed z-30 pointer-events-auto">
              {phase === 'SPECIAL_BUILD_PHASE' && (
                <button
                  type="button"
                  onClick={() => dispatchAction({ type: 'END_SPECIAL_BUILD' })}
                  className="h-8 px-3 rounded-xl bg-emerald-500 border border-emerald-200 text-stone-950 font-black text-[11px] flex items-center gap-1 shadow-xl cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                  <span>Fin</span>
                </button>
              )}
              {phase === 'ROAD_BUILDING_DEV' && (
                <button
                  type="button"
                  onClick={() => dispatchAction({ type: 'FINISH_ROAD_BUILDING' })}
                  className="h-8 px-3 rounded-xl bg-amber-400 border border-amber-200 text-stone-950 font-black text-[11px] flex items-center gap-1 shadow-xl cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                  <span>Listo</span>
                </button>
              )}
              {phase === 'MAIN_PHASE' && (
                <button
                  type="button"
                  onClick={() => dispatchAction({ type: 'END_TURN' })}
                  className="h-8 px-3 rounded-xl bg-emerald-500 border border-emerald-200 text-stone-950 font-black text-[11px] flex items-center gap-1 shadow-xl cursor-pointer active:scale-95"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Pasar</span>
                </button>
              )}
            </div>
          )}
        </>
      ) : (
      <footer className="tablet-footer h-[70px] sm:h-[76px] bg-gradient-to-r from-[#1c130d] via-[#140e09] to-[#1c130d] border-t border-[#d4af37]/35 px-2 sm:px-4 py-1 flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.85)] overflow-visible relative pb-[max(4px,env(safe-area-inset-bottom))]">
        {/* LEFT SPACER FOR SYMMETRY */}
        <div className="hidden sm:block min-w-[140px]" />

        {/* CENTER: Player's Resource Cards Protruding Above the Slim Bottom Rectangle */}
        <div className="game-resource-hand flex-1 flex items-end justify-center min-w-[260px] overflow-visible">
          <div className="game-desktop-hand"><ResourceHandFan
            resources={me.resources}
            portRatios={myPortRatios}
            onCardClick={() => {
              if (!isPausedByHost && !(isMyTurn && isWaitingForMandatoryDice)) {
                setTradeModalInitialTab('BANK');
                setShowTradeModal(true);
              }
            }}
          /></div>
          <div className="game-mobile-hand hidden w-full" aria-label="Tus recursos y mercancías">
            {(hasCitiesKnights(config) ? ALL_TRADE_CARDS : ALL_RESOURCES).map(resource => (
              <button
                key={resource}
                type="button"
                disabled={isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)}
                title={`${RESOURCE_META[resource].name}: ${me.resources[resource] || 0}`}
                aria-label={`${RESOURCE_META[resource].name}: ${me.resources[resource] || 0}`}
                onClick={() => {
                  if (isPausedByHost || (isMyTurn && isWaitingForMandatoryDice)) return;
                  setTradeModalInitialTab('BANK');
                  setShowTradeModal(true);
                }}
                className="relative flex items-center justify-center min-w-0 min-h-[48px] rounded-md py-0.5 transition-transform active:-translate-y-0.5 disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
              >
                <img
                  src={RESOURCE_CARD_PATHS[resource]}
                  alt=""
                  draggable={false}
                  className="w-full max-w-[34px] aspect-[2/3] object-contain drop-shadow-md"
                />
                <span className="absolute bottom-0 right-0 rounded px-1 bg-stone-950/95 border border-amber-500/60 text-amber-100 text-xs font-bold">
                  {me.resources[resource] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Pasar Turno / Finalizar Carreteras */}
        <div className="game-end-turn flex items-center justify-end min-w-[140px]">
          <p className="game-mobile-turn hidden text-xs text-stone-400">{isMyTurn ? 'Tu turno' : `Turno de ${activePlayer?.name || 'otro jugador'}`}</p>
          {isMyTurn && phase === 'SPECIAL_BUILD_PHASE' && !isPausedByHost && <button type="button" className="tablet-end-turn-btn rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold" onClick={() => dispatchAction({ type: 'END_SPECIAL_BUILD' })}>Terminar construcción especial</button>}

          {isMyTurn && phase === 'ROAD_BUILDING_DEV' && !isPausedByHost && (
            <button
              type="button"
              onClick={() => dispatchAction({ type: 'FINISH_ROAD_BUILDING' })}
              className="tablet-end-turn-btn px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 border border-amber-200 text-stone-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.55)] cursor-pointer active:scale-95 transition"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSeafarers ? 'Finalizar Rutas' : 'Finalizar Carreteras'}</span>
            </button>
          )}

          {isMyTurn && phase === 'MAIN_PHASE' && !isPausedByHost && (
            <button
              type="button"
              onClick={() => dispatchAction({ type: 'END_TURN' })}
              className="tablet-end-turn-btn px-5 py-3 sm:px-6 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 border border-emerald-300 text-stone-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.45)] cursor-pointer active:scale-95 transition"
            >
              <SkipForward className="w-4 h-4" />
              <span>Pasar Turno</span>
            </button>
          )}
        </div>
      </footer>
      )}

      {/* SETTINGS MODAL (Low-End PC Mode Toggle) */}
      {showWonders && <WondersModal gameState={gameState} playerId={playerId} dispatchAction={dispatchAction} onClose={() => setShowWonders(false)} />}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            key="modal-settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 cursor-pointer"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#231810] to-[#120c08] border-2 border-[#d4af37]/70 p-6 shadow-2xl space-y-5 cursor-default"
            >
              <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3">
                <div className="flex items-center gap-2.5">
                  <Settings className="w-5 h-5 text-amber-400" />
                  <h3 className="font-display text-lg font-black text-amber-100">
                    Ajustes de la Aplicación
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="text-xs font-bold text-stone-400 hover:text-amber-200 px-2 py-1 rounded-lg bg-stone-900"
                >
                  Cerrar
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#0d0906] border border-[#d4af37]/35 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-sm font-black text-amber-100">
                        Abanico de Cartas en Perfiles
                      </div>
                      <div className="text-[11px] text-stone-400">
                        Muestra un abanico horizontal con el dorso de las cartas a la izquierda de cada jugador
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={showProfileCardFans}
                    onClick={() => toggleProfileCardFans(!showProfileCardFans)}
                    className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${
                      showProfileCardFans ? 'bg-emerald-500' : 'bg-stone-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        showProfileCardFans ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#120d09] border border-[#c89b3c]/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-5 h-5 text-[#d4af37] shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-amber-100">
                        Rendimiento y animaciones
                      </div>
                      <div className="text-[11px] text-stone-400">
                        Nivel activo:{' '}
                        <strong className="text-amber-200">
                          {perfTier === 'full'
                            ? 'Completo'
                            : perfTier === 'balanced'
                            ? 'Equilibrado'
                            : 'Ligero'}
                        </strong>
                        {perfPreference === 'auto' && (
                          <span>
                            {' '}
                            (detectado automáticamente:{' '}
                            {autoTier === 'full'
                              ? 'Completo'
                              : autoTier === 'balanced'
                              ? 'Equilibrado'
                              : 'Ligero'}
                            )
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'auto', label: 'Automático', desc: 'Según dispositivo' },
                      { id: 'full', label: 'Completo', desc: 'Máximo detalle' },
                      { id: 'balanced', label: 'Equilibrado', desc: 'Sin blur pesado' },
                      { id: 'lite', label: 'Ligero', desc: 'Mínimo consumo' },
                    ] as Array<{ id: PerformancePreference; label: string; desc: string }>
                  ).map((opt) => {
                    const active = perfPreference === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setPerfPreference(opt.id);
                          setLowEndPcMode(opt.id === 'lite');
                        }}
                        className={`p-2 min-h-[44px] rounded-md border text-left transition cursor-pointer ${
                          active
                            ? 'bg-[#2a1f14] border-[#c89b3c] text-amber-100'
                            : 'bg-[#1a130e] border-stone-800 text-stone-300 hover:border-stone-600'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[10px] text-stone-400 leading-tight">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-stone-800">
                  <div>
                    <div className="text-xs font-bold text-amber-100">
                      Bloquear arrastre del mapa en (0, 0)
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Mantiene el tablero centrado y permite acercar o alejar solo con botones de zoom.
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={lockBoardPan}
                    onClick={() => setLockBoardPan(!lockBoardPan)}
                    className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${
                      lockBoardPan ? 'bg-emerald-600' : 'bg-stone-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                        lockBoardPan ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-3 min-h-[44px] rounded-lg bg-[#c89b3c] hover:bg-[#d6aa4c] text-stone-950 font-bold text-sm shadow cursor-pointer"
              >
                Guardar y volver
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Other Game Modals */}
      <AnimatePresence>
        {phase === 'ORDER_ROLL' && !isPausedByHost && (
          <TurnOrderModal
            key="modal-order-roll"
            gameState={gameState}
            me={me}
            dispatchAction={dispatchAction}
          />
        )}

        {phase === 'ROBBER_DISCARD' && me.mustDiscardCount > 0 && !isPausedByHost && (
          <RobberDiscardModal
            key="modal-discard"
            me={me}
            onDiscard={(resources) => dispatchAction({ type: 'DISCARD_RESOURCES', resources })}
          />
        )}

        {phase === 'ROBBER_STEAL' && isMyTurn && !isPausedByHost && (
          <RobberStealModal
            key="modal-steal"
            candidates={gameState.players.filter((p) =>
              gameState.robberStealCandidates.includes(p.id)
            )}
            onSelectVictim={(victimPlayerId) =>
              dispatchAction({ type: 'STEAL_RESOURCE', victimPlayerId })
            }
          />
        )}

        {/* Seafarers Gold Claim Modal */}
        {myPendingGoldClaim && !isPausedByHost && (
          <GoldClaimModal
            key="modal-gold-claim"
            remainingClaims={myPendingGoldClaim.amount}
            bank={gameState.bank}
            onClaim={(resource) => dispatchAction({ type: 'CLAIM_GOLD_RESOURCE', resource })}
          />
        )}

        {showTradeModal && !isPausedByHost && (
          <TradeModal
            key="modal-trade"
            gameState={gameState}
            me={me}
            initialTab={tradeModalInitialTab}
            onClose={() => setShowTradeModal(false)}
            dispatchAction={dispatchAction}
          />
        )}

        {showDevModal && !isPausedByHost && (
          <DevCardModal
            key="modal-dev"
            gameState={gameState}
            me={me}
            onClose={() => setShowDevModal(false)}
            dispatchAction={dispatchAction}
          />
        )}

        {showAbandonModal && (
          <AbandonConfirmModal
            key="modal-abandon"
            onCancel={() => setShowAbandonModal(false)}
            onConfirm={() => {
              setShowAbandonModal(false);
              leaveRoomClient();
            }}
          />
        )}

        {phase === 'GAME_OVER' && (
          <VictoryModal
            key="modal-victory"
            gameState={gameState}
            onExitToMenu={leaveRoomClient}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface PlayerSummaryCardProps {
  player: PlayerState;
  isLocalPlayer: boolean;
  isActiveTurn: boolean;
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
  showCardFan: boolean;
  useCompactLayout?: boolean;
  isCitiesKnights?: boolean;
  playerDefense?: number;
}

/**
 * Renders a small horizontal fan opened towards the left (`abanico abierto hacia la izquierda`)
 * using the extracted resource card reverse and scanned progress/development card backs held by that player.
 */
const ProfileHorizontalCardFan: React.FC<{
  totalCards: number;
  devBackUrls?: string[];
}> = ({ totalCards, devBackUrls = [] }) => {
  const totalCombined = totalCards + devBackUrls.length;
  if (totalCombined <= 0) return null;

  const resourceDisplayCount = Math.min(totalCards, 10);
  const devDisplayUrls = devBackUrls.slice(0, 4);
  const allFanCards: Array<{ src: string; isDev: boolean }> = [
    ...Array.from({ length: resourceDisplayCount }, () => ({
      src: CARD_BACK_PATHS.resource,
      isDev: false,
    })),
    ...devDisplayUrls.map((src) => ({ src, isDev: true })),
  ];
  const displayCount = allFanCards.length;
  const mid = (displayCount - 1) / 2;
  const angleStep = Math.min(6.8, 48 / Math.max(1, displayCount));
  const yStep = Math.min(4.6, 34 / Math.max(1, displayCount));

  return (
    <div
      className="absolute right-[calc(100%-3px)] inset-y-0 w-10 pointer-events-none select-none"
      title={`${totalCards} recurso(s) y ${devBackUrls.length} carta(s) de progreso/desarrollo`}
    >
      <AnimatePresence mode="popLayout">
        {allFanCards.map((item, idx) => {
          const offsetFromCenter = idx - mid;
          const rotateDeg = -90 - offsetFromCenter * angleStep;
          const translateY = offsetFromCenter * yStep;
          const archPushRightX = Math.abs(offsetFromCenter) * 1.15;

          return (
            <motion.div
              key={`mini-fan-card-${idx}-${item.isDev ? 'dev' : 'res'}`}
              initial={{ opacity: 0, x: 14, scale: 0.6, rotate: -90 }}
              animate={{
                opacity: 1,
                x: archPushRightX,
                y: translateY,
                rotate: rotateDeg,
                scale: 1,
              }}
              exit={{ opacity: 0, x: 12, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              style={{
                zIndex: 10 + idx,
                transformOrigin: '50% 50%',
              }}
              className={`absolute right-0 top-1/2 -mt-[16px] w-[21px] h-[32px] rounded-[3.5px] overflow-hidden border ${
                item.isDev ? 'border-amber-300 ring-1 ring-amber-400/50' : 'border-stone-300/75'
              } shadow-[0_3px_8px_rgba(0,0,0,0.88)] bg-[#1a1510]`}
            >
              <img
                src={item.src}
                alt={item.isDev ? 'Dorso de progreso/desarrollo' : 'Dorso de recurso'}
                draggable={false}
                className="w-full h-full object-fill select-none pointer-events-none"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {totalCombined > 12 && (
        <span className="absolute -left-2 top-1/2 -translate-y-1/2 z-30 px-1 py-0.2 rounded bg-stone-950/90 border border-amber-400/70 text-[8px] font-mono font-black text-amber-300 shadow">
          x{totalCombined}
        </span>
      )}
    </div>
  );
};

/**
 * Compact, high-density Player Casillero (`#player-casillero-${player.id}`) for the Right Sidebar.
 * Optimized to fit up to 6 players comfortably while serving as the exact target for sequential resource flights.
 */
const PlayerSummaryCard: React.FC<PlayerSummaryCardProps> = ({
  player,
  isLocalPlayer,
  isActiveTurn,
  hasLongestRoad,
  hasLargestArmy,
  showCardFan,
  useCompactLayout = false,
  isCitiesKnights = false,
  playerDefense = 0,
}) => {
  const [showCardBacksTouch, setShowCardBacksTouch] = useState(false);
  const totalRes = countTotalResources(player.resources);
  const unplayedDevs = player.citiesKnights?.progressCards.length ?? (isLocalPlayer
    ? player.devCards.filter((c) => !c.played).length
    : player.devCards.filter((c) => !c.played && c.type !== 'VICTORY_POINT').length +
      player.devCards.filter((c) => c.type === 'VICTORY_POINT').length);

  const devBackUrls: string[] = player.citiesKnights
    ? player.citiesKnights.progressCards.map((c) => PROGRESS_BACK_IMAGE_PATHS[c.branch])
    : Array.from({ length: unplayedDevs }, () => CARD_BACK_PATHS.development);

  return (
    <div
      id={`player-casillero-${player.id}`}
      onClick={() => {
        if (devBackUrls.length > 0 && window.matchMedia('(pointer: coarse)').matches) {
          setShowCardBacksTouch((v) => !v);
        }
      }}
      className={`tablet-player-card group/profile ${
        useCompactLayout ? 'tablet-player-card-compact' : ''
      } relative p-2.5 rounded-xl border-2 transition-all duration-200 pointer-events-auto`}
      style={playerCardStyle(player.color, isActiveTurn)}
    >
      {/* Left Horizontal Resource & Progress Card Fan (Opened towards the left - Hidden on Tablet) */}
      <div className="profile-card-fan">
        {showCardFan && <ProfileHorizontalCardFan totalCards={totalRes} devBackUrls={devBackUrls} />}
      </div>

      {/* Hover (desktop) or Tap (touch) Popover showing Scanned Progress / Development Card Backs */}
      {devBackUrls.length > 0 && (
        <div
          className={`${
            showCardBacksTouch ? 'flex' : 'hidden lg:group-hover/profile:flex'
          } absolute right-[calc(100%+12px)] lg:right-[calc(100%+42px)] top-1/2 -translate-y-1/2 z-50 p-2.5 rounded-xl bg-[#16100b] border border-[#c89b3c]/75 shadow-[0_14px_36px_rgba(0,0,0,0.92)] flex-col items-center gap-1.5 pointer-events-none min-w-[140px]`}
        >
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 whitespace-nowrap">
            {player.citiesKnights
              ? `Progreso de ${player.name} (${devBackUrls.length})`
              : `Desarrollo de ${player.name} (${devBackUrls.length})`}
          </span>
          <div className="flex items-center justify-center -space-x-2 py-1">
            {devBackUrls.map((src, idx) => (
              <img
                key={`${player.id}_back_${idx}`}
                src={src}
                alt="Dorso escaneado"
                style={{
                  transform: `rotate(${(idx - (devBackUrls.length - 1) / 2) * 8}deg)`,
                }}
                className="w-11 h-16 object-cover rounded-md border border-amber-300/85 shadow-lg bg-stone-900"
              />
            ))}
          </div>
        </div>
      )}

      {/* 1. TABLET SINGLE-ROW COMPACT VIEW (pointer: coarse) */}
      <div className="tablet-player-single-row w-full items-center justify-between gap-1 text-white">
        {/* Left: Avatar + Name + Tú + Turn Dot */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-black/40 shrink-0 text-white shadow-sm border border-white/20">
            <AvatarIcon avatar={player.avatar} className="w-3.5 h-3.5" />
          </span>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-black text-white truncate max-w-[80px] sm:max-w-[100px]">
              {player.name}
            </span>
            {isLocalPlayer && (
              <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-400 text-stone-950 font-black uppercase shrink-0">
                Tú
              </span>
            )}
            {isActiveTurn && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 ring-1 ring-emerald-300" />
            )}
          </div>
        </div>

        {/* Center: PV Badge */}
        <div className="flex items-center gap-0.5 shrink-0 bg-[#090604] px-1.5 py-0.5 rounded-md border border-[#d4af37]/50 shadow-inner">
          <span className="font-display text-[11px] font-black text-amber-300 leading-none">
            {player.publicVictoryPoints} PV
          </span>
          {isLocalPlayer && player.totalVictoryPoints > player.publicVictoryPoints && (
            <span className="text-[8px] font-extrabold text-emerald-300 leading-none">
              ({player.totalVictoryPoints})
            </span>
          )}
        </div>

        {/* Right: 4 stats in mini badges (Mano, Dev, Ruta, Caballeros) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Mano */}
          <div
            className="bg-[#090604] border border-stone-800/80 rounded px-1.5 py-0.5 flex items-center gap-1"
            title="Cartas de Recurso en Mano"
          >
            <span className="text-[8px] font-bold text-stone-400 uppercase">M</span>
            <span className="text-[11px] font-black text-white font-mono">{totalRes}</span>
          </div>

          {/* Cartas de Desarrollo */}
          <div
            className="bg-[#090604] border border-stone-800/80 rounded px-1.5 py-0.5 flex items-center gap-0.5"
            title={player.citiesKnights ? "Cartas de progreso" : "Cartas de Desarrollo sin jugar"}
          >
            <Layers className="w-2.5 h-2.5 text-purple-300 shrink-0" />
            <span className="text-[11px] font-black text-purple-300 font-mono">{unplayedDevs}</span>
          </div>

          {/* Ruta más larga */}
          <div
            className={`rounded px-1.5 py-0.5 border flex items-center gap-0.5 ${
              hasLongestRoad
                ? 'bg-amber-950/70 border-amber-400'
                : 'bg-[#090604] border-stone-800/80'
            }`}
            title={`Longitud de Carretera: ${player.longestRoadLength}${hasLongestRoad ? ' (Gran Ruta +2 PV)' : ''}`}
          >
            <Route className={`w-2.5 h-2.5 ${hasLongestRoad ? 'text-amber-300' : 'text-stone-400'} shrink-0`} />
            <span className={`text-[11px] font-black font-mono ${hasLongestRoad ? 'text-amber-300' : 'text-amber-200'}`}>
              {player.longestRoadLength}
            </span>
          </div>

          {/* Caballeros / Defensa */}
          <div
            className={`rounded px-1.5 py-0.5 border flex items-center gap-0.5 ${
              isCitiesKnights
                ? 'bg-emerald-950/60 border-emerald-500/40'
                : hasLargestArmy
                ? 'bg-red-950/70 border-red-400'
                : 'bg-[#090604] border-stone-800/80'
            }`}
            title={
              isCitiesKnights
                ? `Defensa activa ante los bárbaros: ${playerDefense} de fuerza`
                : `Caballeros jugados: ${player.knightsPlayed}${hasLargestArmy ? ' (Gran Ejército +2 PV)' : ''}`
            }
          >
            {isCitiesKnights ? (
              <ShieldAlert className="w-2.5 h-2.5 text-emerald-300 shrink-0" />
            ) : (
              <Swords className={`w-2.5 h-2.5 ${hasLargestArmy ? 'text-red-300' : 'text-stone-400'} shrink-0`} />
            )}
            <span
              className={`text-[11px] font-black font-mono ${
                isCitiesKnights ? 'text-emerald-300' : hasLargestArmy ? 'text-red-300' : 'text-red-200'
              }`}
            >
              {isCitiesKnights ? playerDefense : player.knightsPlayed}
            </span>
          </div>
        </div>
      </div>

      {/* 2. DESKTOP MULTI-ROW VIEW (pointer: fine - 100% UNTOUCHED PC / MAC) */}
      <div className="desktop-player-card-content w-full">
        {/* Top Row: Player Emblem, Name, Status & Victory Points Badge */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="tablet-player-avatar w-8 h-8 flex items-center justify-center bg-transparent text-sm font-display font-black shrink-0 text-white"
            >
              <AvatarIcon avatar={player.avatar} className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="tablet-player-name text-xs font-black text-white truncate max-w-[115px]">
                  {player.name}
                </span>
                {isLocalPlayer && (
                  <span className="tablet-player-status text-[8px] px-1 py-0.2 rounded bg-amber-400 text-stone-950 font-black uppercase">
                    Tú
                  </span>
                )}
                {isActiveTurn && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                )}
              </div>
              <div className="tablet-player-status text-[9px] font-semibold text-slate-200 truncate">
                {player.isBot
                  ? `IA (${player.botDifficulty === 'EASY' ? 'Fácil' : player.botDifficulty === 'HARD' ? 'Difícil' : 'Normal'})`
                  : player.status === 'FROZEN_SKIP'
                  ? 'Turno omitido'
                  : !player.connected
                  ? 'Desconectado'
                  : isActiveTurn
                  ? 'En turno'
                  : 'En línea'}
              </div>
            </div>
          </div>

          {/* High-Contrast Victory Points Pill */}
          <div className="tablet-player-vp flex items-center gap-1 shrink-0 bg-[#090604] px-2 py-0.5 rounded-lg border border-[#d4af37]/50 shadow-inner">
            <span className="font-display text-xs font-black text-amber-300 leading-none">
              {player.publicVictoryPoints} PV
            </span>
            {isLocalPlayer && player.totalVictoryPoints > player.publicVictoryPoints && (
              <span className="text-[9px] font-extrabold text-emerald-300">
                ({player.totalVictoryPoints})
              </span>
            )}
          </div>
        </div>

        {/* Compact Stat Strip (Mano, Desarrollo, Ruta, Ejército) */}
        <div className="tablet-player-stat-strip mt-1.5 pt-1 border-t border-white/15 grid grid-cols-4 gap-1 text-center">
          <div
            className="tablet-player-stat-box bg-[#090604] border border-stone-800/80 rounded-md py-0.5 px-1 flex items-center justify-between"
            title="Cartas de Recurso en Mano"
          >
            <span className="tablet-player-stat-label text-[8px] font-bold uppercase text-stone-400">Mano</span>
            <span className="tablet-player-stat-value text-[11px] font-black text-white">{totalRes}</span>
          </div>

          <div
            className="tablet-player-stat-box bg-[#090604] border border-stone-800/80 rounded-md py-0.5 px-1 flex items-center justify-between"
            title={player.citiesKnights ? "Cartas de progreso" : "Cartas de Desarrollo sin jugar"}
          >
            <Layers className="tablet-player-stat-icon w-2.5 h-2.5 text-purple-300 shrink-0" />
            <span className="tablet-player-stat-value text-[11px] font-black text-purple-300">{unplayedDevs}</span>
          </div>

          <div
            className={`tablet-player-stat-box rounded-md py-0.5 px-1 border flex items-center justify-between ${
              hasLongestRoad
                ? 'bg-amber-950/60 border-amber-400'
                : 'bg-[#090604] border-stone-800/80'
            }`}
            title="Longitud de Carretera"
          >
            <Route className="tablet-player-stat-icon w-2.5 h-2.5 text-amber-300 shrink-0" />
            <span className="tablet-player-stat-value text-[11px] font-black text-amber-300">
              {player.longestRoadLength}
            </span>
          </div>

          <div
            className={`tablet-player-stat-box rounded-md py-0.5 px-1 border flex items-center justify-between ${
              isCitiesKnights
                ? 'bg-emerald-950/50 border-emerald-500/40'
                : hasLargestArmy
                ? 'bg-red-950/60 border-red-400'
                : 'bg-[#090604] border-stone-800/80'
            }`}
            title={
              isCitiesKnights
                ? `Defensa activa ante los bárbaros: ${playerDefense} de fuerza`
                : `Caballeros jugados: ${player.knightsPlayed}${hasLargestArmy ? ' (Gran Ejército +2 PV)' : ''}`
            }
          >
            {isCitiesKnights ? (
              <ShieldAlert className="tablet-player-stat-icon w-2.5 h-2.5 text-emerald-400 shrink-0" />
            ) : (
              <Swords className="tablet-player-stat-icon w-2.5 h-2.5 text-red-300 shrink-0" />
            )}
            <span
              className={`tablet-player-stat-value text-[11px] font-black ${
                isCitiesKnights ? 'text-emerald-300' : 'text-red-300'
              }`}
            >
              {isCitiesKnights ? playerDefense : player.knightsPlayed}
            </span>
          </div>
        </div>

        {/* Special Achievement Badges */}
        {(hasLongestRoad || hasLargestArmy || (isCitiesKnights && (player.citiesKnights?.defenderPoints || 0) > 0)) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {hasLongestRoad && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/60 text-amber-200 text-[8px] font-black">
                <Award className="w-2.5 h-2.5 text-amber-300" /> Gran Ruta (+2 PV)
              </span>
            )}
            {hasLargestArmy && !isCitiesKnights && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-red-500/20 border border-red-400/60 text-red-200 text-[8px] font-black">
                <Swords className="w-2.5 h-2.5 text-red-300" /> Gran Ejército (+2 PV)
              </span>
            )}
            {isCitiesKnights && (player.citiesKnights?.defenderPoints || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/60 text-amber-200 text-[8px] font-black">
                <img src="/assets/tokens/catan_chit.webp" className="w-3.5 h-3.5 object-contain" alt="" />
                Campeador de Catán (+{player.citiesKnights!.defenderPoints} PV)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
