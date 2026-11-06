import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Compass, ShieldAlert } from 'lucide-react';
import {
  BoardState,
  Edge,
  Hex,
  PlayerState,
  PortType,
  ResourceType,
  TerrainType,
  Vertex,
  GameState,
} from '../../shared/types';
import {
  PLAYER_COLORS,
  RESOURCE_META,
} from '../../shared/constants';
import {
  getHexCornerPoints,
  getRedNumberConflictHexIds,
} from '../../shared/engine/HexGrid';
import { Hexagon } from './Hexagon';

export interface EditorToolState {
  active: boolean;
  mode: 'SWAP' | 'PAINT_TERRAIN' | 'SET_NUMBER' | 'SET_PORT';
  selectedTerrain: TerrainType;
  selectedNumber: number;
  selectedPort: PortType | null;
}

export interface HexBoardSVGProps {
  board: BoardState;
  players: PlayerState[];
  validSettlementIds?: string[];
  validCityIds?: string[];
  validRoadIds?: string[];
  isMovingRobber?: boolean;
  producingHexIds?: string[];
  onVertexClick?: (vertexId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onHexClick?: (hexId: string) => void;
  editorTool?: EditorToolState;
  onCustomSwapHexes?: (hexIdA: string, hexIdB: string) => void;
  onCustomSetTerrain?: (hexId: string, terrain: TerrainType) => void;
  onCustomSetNumber?: (hexId: string, num: number | null) => void;
  onCustomSetPort?: (edgeId: string, port: PortType | null) => void;
  lowEndPcMode?: boolean;
  lastEvent?: GameState['lastEvent'];
}

export const HexBoardSVG: React.FC<HexBoardSVGProps> = ({
  board,
  players,
  validSettlementIds = [],
  validCityIds = [],
  validRoadIds = [],
  isMovingRobber = false,
  producingHexIds = [],
  onVertexClick,
  onEdgeClick,
  onHexClick,
  editorTool,
  onCustomSwapHexes,
  onCustomSetTerrain,
  onCustomSetNumber,
  onCustomSetPort,
  lowEndPcMode = false,
  lastEvent,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showCoords, setShowCoords] = useState<boolean>(false);
  const [swapSourceHexId, setSwapSourceHexId] = useState<string | null>(null);
  const [robberImpact, setRobberImpact] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraGroupRef = useRef<SVGGElement | null>(null);
  const lowEndRef = useRef<boolean>(lowEndPcMode);

  useEffect(() => {
    lowEndRef.current = lowEndPcMode;
    if (lowEndPcMode) {
      // Lock Pan strictly centered at (0, 0) in lowEndPcMode
      targetCamRef.current.x = 0;
      targetCamRef.current.y = 0;
      currentCamRef.current.x = 0;
      currentCamRef.current.y = 0;
      velocityRef.current = { vx: 0, vy: 0 };
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  }, [lowEndPcMode]);

  // Google-Maps-style Smooth Interpolated & Inertial Camera State
  const targetCamRef = useRef<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const currentCamRef = useRef<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const lastPointerRef = useRef<{ x: number; y: number; time: number }>({
    x: 0,
    y: 0,
    time: 0,
  });
  const dragStartClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didMoveRef = useRef<boolean>(false);

  const prevRobberHexRef = useRef<string>(board.robberHexId);

  // Discreet Highlight for recently built items (Roads, Settlements, Cities)
  const [highlightedBuiltItem, setHighlightedBuiltItem] = useState<{
    type: 'ROAD' | 'SETTLEMENT' | 'CITY';
    vertexId?: string;
    edgeId?: string;
    playerId: string;
  } | null>(null);

  useEffect(() => {
    if (lastEvent?.builtItem) {
      setHighlightedBuiltItem(lastEvent.builtItem);
      const timer = setTimeout(() => {
        setHighlightedBuiltItem(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [lastEvent?.nonce, lastEvent?.builtItem]);

  // Trigger screen shake & impact shockwave whenever the Robber moves
  useEffect(() => {
    if (prevRobberHexRef.current && prevRobberHexRef.current !== board.robberHexId) {
      setRobberImpact(true);
      const t = setTimeout(() => setRobberImpact(false), 650);
      prevRobberHexRef.current = board.robberHexId;
      return () => clearTimeout(t);
    }
    prevRobberHexRef.current = board.robberHexId;
  }, [board.robberHexId]);

  // 60-120fps Physics & Interpolation Loop (Inertia + Smooth Lerp)
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const target = targetCamRef.current;
      const cur = currentCamRef.current;
      const vel = velocityRef.current;

      // In lowEndPcMode, Pan is locked to (0, 0) and only Zoom In/Out via buttons is allowed
      if (lowEndRef.current) {
        target.x = 0;
        target.y = 0;
        cur.x = 0;
        cur.y = 0;
        vel.vx = 0;
        vel.vy = 0;
      } else {
        // Apply momentum when not actively dragging
        if (!isDraggingRef.current && (Math.abs(vel.vx) > 0.05 || Math.abs(vel.vy) > 0.05)) {
          target.x += vel.vx;
          target.y += vel.vy;
          vel.vx *= 0.91; // Smooth exponential friction
          vel.vy *= 0.91;
        } else if (!isDraggingRef.current) {
          vel.vx = 0;
          vel.vy = 0;
        }

        // Clamp target pan bounds gently
        target.x = Math.max(-680, Math.min(680, target.x));
        target.y = Math.max(-560, Math.min(560, target.y));

        // Smooth spring-like interpolation (Lerp)
        const lerpFactor = isDraggingRef.current ? 0.38 : 0.18;
        cur.x += (target.x - cur.x) * lerpFactor;
        cur.y += (target.y - cur.y) * lerpFactor;
      }
      cur.zoom += (target.zoom - cur.zoom) * (lowEndRef.current ? 0.45 : 0.2);

      if (cameraGroupRef.current) {
        cameraGroupRef.current.setAttribute(
          'transform',
          `translate(${cur.x.toFixed(2)}, ${cur.y.toFixed(2)}) scale(${cur.zoom.toFixed(4)})`
        );
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Native non-passive wheel listener for smooth focal-point zoom
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      // In lowEndPcMode, zooming is restricted to the Zoom In / Zoom Out buttons
      if (lowEndRef.current) return;
      const rect = svgEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Convert client cursor position to SVG viewBox coordinates (-480..480, -420..420)
      const svgX = ((e.clientX - rect.left) / rect.width) * 960 - 480;
      const svgY = ((e.clientY - rect.top) / rect.height) * 840 - 420;

      const target = targetCamRef.current;
      const zoomIntensity = Math.exp(-e.deltaY * 0.0016);
      const nextZoom = Math.min(2.6, Math.max(0.48, target.zoom * zoomIntensity));
      const scaleRatio = nextZoom / target.zoom;

      // Adjust target pan so zoom is anchored on the cursor focal point
      target.x = svgX - (svgX - target.x) * scaleRatio;
      target.y = svgY - (svgY - target.y) * scaleRatio;
      target.zoom = nextZoom;
    };

    svgEl.addEventListener('wheel', onWheelNative, { passive: false });
    return () => svgEl.removeEventListener('wheel', onWheelNative);
  }, []);

  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerState>();
    for (const p of players) map.set(p.id, p);
    return map;
  }, [players]);

  const longestRoadEdgesSet = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) {
      if (p.longestRoadLength >= 5) {
        for (const eId of p.longestRoadEdgeIds) set.add(eId);
      }
    }
    return set;
  }, [players]);

  const redConflictHexIds = useMemo(
    () => new Set(getRedNumberConflictHexIds(board.hexes)),
    [board.hexes]
  );

  const validSettlementSet = useMemo(() => new Set(validSettlementIds), [validSettlementIds]);
  const validCitySet = useMemo(() => new Set(validCityIds), [validCityIds]);
  const validRoadSet = useMemo(() => new Set(validRoadIds), [validRoadIds]);
  const producingSet = useMemo(() => new Set(producingHexIds), [producingHexIds]);

  // Local clipPath polygon points centered at (0, 0)
  const innerClipPoints = useMemo(
    () =>
      getHexCornerPoints(0, 0, board.hexSize * 0.89)
        .map((c) => `${c.x},${c.y}`)
        .join(' '),
    [board.hexSize]
  );

  const outerClipPoints = useMemo(
    () =>
      getHexCornerPoints(0, 0, board.hexSize)
        .map((c) => `${c.x},${c.y}`)
        .join(' '),
    [board.hexSize]
  );

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0 || lowEndRef.current) return;
    setIsDragging(true);
    isDraggingRef.current = true;
    didMoveRef.current = false;
    velocityRef.current = { vx: 0, vy: 0 };
    const now = performance.now();
    lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (lowEndRef.current || !isDraggingRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 960 / rect.width;
    const scaleY = 840 / rect.height;

    const totalDx = e.clientX - dragStartClientRef.current.x;
    const totalDy = e.clientY - dragStartClientRef.current.y;
    if (Math.hypot(totalDx, totalDy) > 4) {
      didMoveRef.current = true;
    }

    const now = performance.now();
    const dt = Math.max(8, now - lastPointerRef.current.time);
    const stepX = (e.clientX - lastPointerRef.current.x) * scaleX;
    const stepY = (e.clientY - lastPointerRef.current.y) * scaleY;

    targetCamRef.current.x += stepX;
    targetCamRef.current.y += stepY;

    // Track instantaneous velocity for smooth inertia when mouse is released
    const instantVx = (stepX / dt) * 15;
    const instantVy = (stepY / dt) * 15;
    velocityRef.current.vx = velocityRef.current.vx * 0.35 + instantVx * 0.65;
    velocityRef.current.vy = velocityRef.current.vy * 0.35 + instantVy * 0.65;

    lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    // If the user held the pointer still for >80ms before releasing, zero out momentum
    if (performance.now() - lastPointerRef.current.time > 80) {
      velocityRef.current = { vx: 0, vy: 0 };
    }
  };

  const zoomByStep = (factor: number) => {
    velocityRef.current = { vx: 0, vy: 0 };
    const oldZoom = targetCamRef.current.zoom;
    const newZoom = Math.min(2.6, Math.max(0.45, oldZoom * factor));
    if (lowEndRef.current) {
      targetCamRef.current.x = 0;
      targetCamRef.current.y = 0;
      targetCamRef.current.zoom = newZoom;
      return;
    }
    const ratio = newZoom / oldZoom;
    targetCamRef.current.x *= ratio;
    targetCamRef.current.y *= ratio;
    targetCamRef.current.zoom = newZoom;
  };

  const resetView = () => {
    velocityRef.current = { vx: 0, vy: 0 };
    targetCamRef.current = { x: 0, y: 0, zoom: 1 };
  };

  const handleHexInteraction = (hex: Hex) => {
    if (didMoveRef.current) return;
    if (hex.terrain === 'SEA') return;

    if (editorTool?.active) {
      if (editorTool.mode === 'SWAP') {
        if (!swapSourceHexId) {
          setSwapSourceHexId(hex.id);
        } else {
          if (swapSourceHexId !== hex.id) {
            onCustomSwapHexes?.(swapSourceHexId, hex.id);
          }
          setSwapSourceHexId(null);
        }
      } else if (editorTool.mode === 'PAINT_TERRAIN') {
        onCustomSetTerrain?.(hex.id, editorTool.selectedTerrain);
      } else if (editorTool.mode === 'SET_NUMBER') {
        onCustomSetNumber?.(hex.id, editorTool.selectedNumber);
      }
      return;
    }

    if (isMovingRobber) {
      onHexClick?.(hex.id);
    }
  };

  const handleEdgeInteraction = (edge: Edge) => {
    if (didMoveRef.current) return;

    if (editorTool?.active && editorTool.mode === 'SET_PORT') {
      if (edge.isCoastal) {
        onCustomSetPort?.(edge.id, editorTool.selectedPort);
      }
      return;
    }

    if (validRoadSet.has(edge.id)) {
      onEdgeClick?.(edge.id);
    }
  };

  const handleVertexInteraction = (vertex: Vertex) => {
    if (didMoveRef.current) return;
    if (validSettlementSet.has(vertex.id) || validCitySet.has(vertex.id)) {
      onVertexClick?.(vertex.id);
    }
  };

  const hexList = Object.values(board.hexes);
  const edgeList = Object.values(board.edges);
  const vertexList = Object.values(board.vertices);
  const robberHex = board.hexes[board.robberHexId];

  return (
    <motion.div
      animate={
        robberImpact
          ? {
              x: [0, -10, 10, -7, 7, -3, 3, 0],
              y: [0, 6, -6, 4, -4, 2, -2, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.55 }}
      className="relative w-full h-full overflow-hidden select-none bg-[radial-gradient(ellipse_at_center,#1b2a38_0%,#0c1722_58%,#060b11_100%)]"
    >
      {/* Warm Candlelight / Tabletop Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(212,175,55,0.12)_0%,rgba(0,0,0,0.55)_100%)]" />

      {/* Tabletop Camera Controls (Dark Walnut & Antique Gold) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-[#16110d]/90 backdrop-blur-xl border border-[#d4af37]/35 rounded-xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)]">
        <button
          onClick={() => zoomByStep(1.18)}
          className="p-2 hover:bg-[#292018] rounded-lg text-amber-200/80 hover:text-amber-300 transition"
          title="Acercar Zoom (Suave)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomByStep(1 / 1.18)}
          className="p-2 hover:bg-[#292018] rounded-lg text-amber-200/80 hover:text-amber-300 transition"
          title="Alejar Zoom (Suave)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 hover:bg-[#292018] rounded-lg text-amber-200/80 hover:text-amber-300 transition"
          title="Centrar Tablero"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-[#d4af37]/25 mx-0.5" />
        <button
          onClick={() => setShowCoords((s) => !s)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            showCoords
              ? 'bg-[#d4af37]/25 text-amber-200 border border-[#d4af37]/50'
              : 'text-stone-400 hover:bg-[#292018] hover:text-amber-200'
          }`}
          title="Mostrar Coordenadas Cúbicas (q, r, s)"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>(q,r,s)</span>
        </button>
      </div>

      {/* Red 6/8 Conflict Warning */}
      {redConflictHexIds.size > 0 && (
        <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-red-950/95 border border-red-500/60 text-red-200 px-3.5 py-2 rounded-xl text-xs shadow-2xl">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>Aviso: Hay números rojos (6 y 8) en hexágonos adyacentes.</span>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox="-480 -420 960 840"
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Local ClipPaths for Hexagon Textures */}
          <clipPath id="hex-inner-surface-clip">
            <polygon points={innerClipPoints} />
          </clipPath>
          <clipPath id="hex-outer-surface-clip">
            <polygon points={outerClipPoints} />
          </clipPath>

          {/* 3D Drop Shadows for Cardboard Tiles, Wooden Pieces & Tokens */}
          <filter id="hex-drop-shadow" x="-30%" y="-30%" width="160%" height="165%">
            <feDropShadow dx="0" dy="6" stdDeviation="4.5" floodColor="#000000" floodOpacity="0.72" />
          </filter>
          <filter id="token-drop-shadow" x="-35%" y="-35%" width="170%" height="170%">
            <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.6" />
          </filter>
          <filter id="piece-drop-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.75" />
          </filter>
          <filter id="robber-aura" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#7f1d1d" floodOpacity="0.9" />
          </filter>
          <filter id="producing-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradients for Vignettes, Parchment Tokens & Sea */}
          <radialGradient id="tile-vignette-grad" cx="50%" cy="45%" r="58%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="72%" stopColor="#000000" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.48" />
          </radialGradient>
          <radialGradient id="parchment-token-grad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="65%" stopColor="#f5ebd6" />
            <stop offset="100%" stopColor="#d6c299" />
          </radialGradient>
          <radialGradient id="sea-depth-grad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0c4a6e" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#082f49" stopOpacity="0.45" />
          </radialGradient>
        </defs>

        <g ref={cameraGroupRef} transform="translate(0, 0) scale(1)">
          {/* 1. HEXAGONS LAYER (3D Cardboard + High-Res Texture Images) */}
          {hexList.map((hex) => {
            const isSea = hex.terrain === 'SEA';
            const isProducing = producingSet.has(hex.id);
            const isRobberTarget = isMovingRobber && !isSea;
            const isSwapSelected = swapSourceHexId === hex.id;
            const isRedConflict = redConflictHexIds.has(hex.id);
            const isInteractive = Boolean(
              isRobberTarget || (editorTool?.active && !isSea)
            );

            return (
              <Hexagon
                key={hex.id}
                hex={hex}
                hexSize={board.hexSize}
                isProducing={isProducing}
                isRobberTarget={isRobberTarget}
                isSwapSelected={isSwapSelected}
                isRedConflict={isRedConflict}
                showCoords={showCoords}
                isInteractive={isInteractive}
                lowEndPcMode={lowEndPcMode}
                onSelect={handleHexInteraction}
              />
            );
          })}

          {/* 2. MARITIME PORTS LAYER (Wooden Docks, Vertex Harbor Rings & Medallions) */}
          {board.ports.map((port) => {
            const vA = board.vertices[port.vertexIds[0]];
            const vB = board.vertices[port.vertexIds[1]];
            if (!vA || !vB) return null;
            const isGeneric = port.type === 'GENERIC';
            const resMeta = !isGeneric ? RESOURCE_META[port.type as ResourceType] : null;

            return (
              <g
                key={port.id}
                className="pointer-events-none"
                filter={lowEndPcMode ? undefined : 'url(#token-drop-shadow)'}
              >
                {/* Wooden Piers from Dock Medallion to the 2 Coastal Vertices */}
                <line
                  x1={port.dockCenter.x}
                  y1={port.dockCenter.y}
                  x2={vA.x}
                  y2={vA.y}
                  stroke="#4a2c11"
                  strokeWidth={5.5}
                  strokeLinecap="round"
                />
                <line
                  x1={port.dockCenter.x}
                  y1={port.dockCenter.y}
                  x2={vB.x}
                  y2={vB.y}
                  stroke="#4a2c11"
                  strokeWidth={5.5}
                  strokeLinecap="round"
                />
                <line
                  x1={port.dockCenter.x}
                  y1={port.dockCenter.y}
                  x2={vA.x}
                  y2={vA.y}
                  stroke="#d4af37"
                  strokeWidth={1.8}
                  strokeDasharray="3 3"
                />
                <line
                  x1={port.dockCenter.x}
                  y1={port.dockCenter.y}
                  x2={vB.x}
                  y2={vB.y}
                  stroke="#d4af37"
                  strokeWidth={1.8}
                  strokeDasharray="3 3"
                />

                {/* Subtle Golden Harbor Ring on the 2 Coastal Vertices */}
                <circle
                  cx={vA.x}
                  cy={vA.y}
                  r={5.5}
                  fill="#1c1917"
                  stroke="#d4af37"
                  strokeWidth={1.6}
                />
                <circle
                  cx={vB.x}
                  cy={vB.y}
                  r={5.5}
                  fill="#1c1917"
                  stroke="#d4af37"
                  strokeWidth={1.6}
                />

                {/* 3D Parchment & Brass Harbor Medallion */}
                <g transform={`translate(${port.dockCenter.x}, ${port.dockCenter.y})`}>
                  <circle cx={0} cy={2} r={18} fill="#261409" />
                  <circle
                    cx={0}
                    cy={0}
                    r={18}
                    fill="url(#parchment-token-grad)"
                    stroke={resMeta ? resMeta.color : '#d4af37'}
                    strokeWidth={3}
                  />
                  {isGeneric ? (
                    <text
                      x={0}
                      y={-1}
                      textAnchor="middle"
                      fontSize="11"
                    >
                      ⚓
                    </text>
                  ) : (
                    resMeta && (
                      <text
                        x={0}
                        y={-1}
                        textAnchor="middle"
                        fontSize="11"
                      >
                        {resMeta.emoji}
                      </text>
                    )
                  )}
                  <text
                    x={0}
                    y={11}
                    textAnchor="middle"
                    fill="#1c1917"
                    fontWeight="900"
                    fontSize="10"
                    fontFamily="Cinzel, Georgia, serif"
                  >
                    {port.ratio}:1
                  </text>
                </g>
              </g>
            );
          })}

          {/* 3. EDGES LAYER (3D Wooden Roads anchored strictly Vertex-to-Vertex) */}
          {edgeList.map((edge) => {
            const v1 = board.vertices[edge.vertexIds[0]];
            const v2 = board.vertices[edge.vertexIds[1]];
            const x1 = v1 ? v1.x : edge.x1;
            const y1 = v1 ? v1.y : edge.y1;
            const x2 = v2 ? v2.x : edge.x2;
            const y2 = v2 ? v2.y : edge.y2;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            const halfLen = Math.max(4, (len - 4) / 2);
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

            const isValidRoad = validRoadSet.has(edge.id);
            const isPortEditTarget = Boolean(
              editorTool?.active && editorTool.mode === 'SET_PORT' && edge.isCoastal
            );
            const owner = edge.playerId ? playerMap.get(edge.playerId) : null;
            const colorCfg = owner ? PLAYER_COLORS[owner.color] : null;
            const isLongest = longestRoadEdgesSet.has(edge.id);
            const isJustBuiltRoad = highlightedBuiltItem?.edgeId === edge.id;

            return (
              <g
                key={edge.id}
                transform={`translate(${midX}, ${midY}) rotate(${angleDeg})`}
                onClick={() => handleEdgeInteraction(edge)}
                className={isValidRoad || isPortEditTarget ? 'cursor-pointer' : undefined}
              >
                {/* Invisible Fat Hit Area for Easy Clicking */}
                {(isValidRoad || isPortEditTarget) && (
                  <rect
                    x={-len / 2}
                    y={-11}
                    width={len}
                    height={22}
                    fill="transparent"
                  />
                )}

                {/* Groove Seam between Hex Tiles */}
                <line
                  x1={-len / 2}
                  y1={0}
                  x2={len / 2}
                  y2={0}
                  stroke="rgba(12, 10, 9, 0.55)"
                  strokeWidth={3.8}
                  strokeLinecap="round"
                />

                {/* Built 3D Wooden Road Piece (Centered at local 0,0 between v1 and v2) */}
                {edge.building === 'ROAD' && colorCfg && (
                  <g filter={lowEndPcMode ? undefined : 'url(#piece-drop-shadow)'}>
                    {isLongest && (
                      <line
                        x1={-halfLen}
                        y1={0}
                        x2={halfLen}
                        y2={0}
                        stroke="#fbbf24"
                        strokeWidth={14}
                        strokeLinecap="round"
                        opacity={0.7}
                      />
                    )}
                    {/* 3D Dark Extrusion Base */}
                    <rect
                      x={-halfLen}
                      y={-3.5}
                      width={halfLen * 2}
                      height={9}
                      rx={3.5}
                      fill="#120904"
                      opacity={0.75}
                    />
                    {/* Outer Bevel / Player Stroke */}
                    <rect
                      x={-halfLen}
                      y={-4.8}
                      width={halfLen * 2}
                      height={9.6}
                      rx={3.5}
                      fill={colorCfg.primary}
                      stroke={colorCfg.stroke}
                      strokeWidth={2}
                    />
                    {/* Top Highlight Plank */}
                    <line
                      x1={-halfLen + 3}
                      y1={-1.5}
                      x2={halfLen - 3}
                      y2={-1.5}
                      stroke={colorCfg.secondary}
                      strokeWidth={2}
                      strokeLinecap="round"
                      opacity={0.85}
                    />
                  </g>
                )}

                {/* Discreet Glow Pulse for newly built road */}
                {isJustBuiltRoad && (
                  <g className="pointer-events-none">
                    <line
                      x1={-halfLen - 3}
                      y1={0}
                      x2={halfLen + 3}
                      y2={0}
                      stroke="#fbbf24"
                      strokeWidth={14}
                      strokeLinecap="round"
                      opacity={0.8}
                      className="animate-pulse"
                    />
                    <line
                      x1={-halfLen}
                      y1={0}
                      x2={halfLen}
                      y2={0}
                      stroke="#ffffff"
                      strokeWidth={4.5}
                      strokeLinecap="round"
                      opacity={0.9}
                    />
                  </g>
                )}

                {/* Pulsing Highlight for Valid Road Placement */}
                {isValidRoad && (
                  <g>
                    <line
                      x1={-halfLen}
                      y1={0}
                      x2={halfLen}
                      y2={0}
                      stroke="#fbbf24"
                      strokeWidth={11}
                      strokeLinecap="round"
                      opacity={0.85}
                      className={lowEndPcMode ? undefined : 'animate-pulse'}
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={6}
                      fill="#fde047"
                      stroke="#1c1917"
                      strokeWidth={1.6}
                    />
                  </g>
                )}

                {isPortEditTarget && (
                  <line
                    x1={-halfLen}
                    y1={0}
                    x2={halfLen}
                    y2={0}
                    stroke="#38bdf8"
                    strokeWidth={10}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                )}
              </g>
            );
          })}

          {/* 4. VERTICES LAYER (3D Settlements & Cities with Spring Drop Animation) */}
          {vertexList.map((vertex) => {
            const isValidSettlement = validSettlementSet.has(vertex.id);
            const isValidCity = validCitySet.has(vertex.id);
            const owner = vertex.playerId ? playerMap.get(vertex.playerId) : null;
            const colorCfg = owner ? PLAYER_COLORS[owner.color] : null;
            const isJustBuiltVertex = highlightedBuiltItem?.vertexId === vertex.id;

            return (
              <g
                key={vertex.id}
                transform={`translate(${vertex.x}, ${vertex.y})`}
                onClick={() => handleVertexInteraction(vertex)}
                className={isValidSettlement || isValidCity ? 'cursor-pointer' : undefined}
              >
                {/* Built 3D Settlement */}
                {vertex.building === 'SETTLEMENT' && colorCfg && (
                  <g filter={lowEndPcMode ? undefined : 'url(#piece-drop-shadow)'}>
                    {/* Base Shadow Rim */}
                    <ellipse cx={0} cy={10} rx={12} ry={4} fill="rgba(0,0,0,0.45)" />
                    {/* House Walls */}
                    <polygon
                      points="0,-13 11,-3 11,10 -11,10 -11,-3"
                      fill={colorCfg.primary}
                      stroke={colorCfg.stroke}
                      strokeWidth={2.2}
                      strokeLinejoin="round"
                    />
                    {/* Pitched 3D Roof */}
                    <polygon
                      points="0,-14 13,-2 -13,-2"
                      fill={colorCfg.secondary}
                      stroke={colorCfg.stroke}
                      strokeWidth={1.6}
                      strokeLinejoin="round"
                    />
                  </g>
                )}

                {/* Built 3D City (Fortified Cathedral) */}
                {vertex.building === 'CITY' && colorCfg && (
                  <g filter={lowEndPcMode ? undefined : 'url(#piece-drop-shadow)'}>
                    <ellipse cx={1} cy={11} rx={16} ry={5} fill="rgba(0,0,0,0.5)" />
                    <polygon
                      points="-14,11 -14,-4 -7,-12 0,-4 0,-16 8,-23 16,-16 16,11"
                      fill={colorCfg.primary}
                      stroke={colorCfg.stroke}
                      strokeWidth={2.4}
                      strokeLinejoin="round"
                    />
                    <polygon
                      points="0,-16 8,-23 16,-16"
                      fill={colorCfg.secondary}
                      stroke={colorCfg.stroke}
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={8}
                      cy={-9}
                      r={4}
                      fill="#fbbf24"
                      stroke="#1c1917"
                      strokeWidth={1.2}
                    />
                  </g>
                )}

                {/* Pulsing Valid Settlement Target */}
                {isValidSettlement && (
                  <g>
                    <circle
                      cx={0}
                      cy={0}
                      r={14.5}
                      fill="rgba(251, 191, 36, 0.28)"
                      stroke="#fbbf24"
                      strokeWidth={2.5}
                      className={lowEndPcMode ? undefined : 'animate-ping'}
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={9.5}
                      fill="#d97706"
                      stroke="#fef3c7"
                      strokeWidth={2.2}
                    />
                    <text
                      x={0}
                      y={3.5}
                      textAnchor="middle"
                      fill="#fffbeb"
                      fontSize="11.5"
                      fontWeight="900"
                    >
                      +
                    </text>
                  </g>
                )}

                {/* Pulsing Valid City Upgrade Target */}
                {isValidCity && (
                  <g>
                    <circle
                      cx={0}
                      cy={0}
                      r={19}
                      fill="rgba(250, 204, 21, 0.3)"
                      stroke="#facc15"
                      strokeWidth={2.8}
                      className={lowEndPcMode ? undefined : 'animate-ping'}
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={14.5}
                      fill="none"
                      stroke="#fde047"
                      strokeWidth={2.5}
                      strokeDasharray="4 2"
                    />
                  </g>
                )}

                {/* Discreet Glow Pulse for newly built settlement or city */}
                {isJustBuiltVertex && (
                  <g className="pointer-events-none">
                    <circle
                      cx={0}
                      cy={0}
                      r={24}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={2.8}
                      strokeDasharray="4 4"
                      opacity={0.9}
                      className="animate-spin"
                      style={{ animationDuration: '6s' }}
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={28}
                      fill="rgba(251, 191, 36, 0.2)"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="animate-ping"
                      style={{ animationDuration: '2s' }}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* 5. THE ROBBER: 3D HOODED OBSIDIAN STATUE WITH DROP IMPACT */}
          {robberHex && (
            <g
              transform={`translate(${robberHex.center.x + (robberHex.numberToken ? 24 : 0)}, ${
                robberHex.center.y + (robberHex.numberToken ? -14 : 0)
              })`}
              className="pointer-events-none"
              filter={lowEndPcMode ? undefined : 'url(#robber-aura)'}
            >
              {robberImpact && !lowEndPcMode && (
                <circle
                  cx={0}
                  cy={10}
                  r={28}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={3}
                  className="animate-ping"
                />
              )}
              <ellipse
                cx={0}
                cy={15}
                rx={13}
                ry={5.5}
                fill="#090d16"
                stroke="#dc2626"
                strokeWidth={1.6}
              />
              <ellipse cx={0} cy={13.5} rx={10} ry={3.5} fill="#1e293b" />
              <path
                d="M -11 14 L -9 -4 C -9 -10, -4 -14, 0 -14 C 4 -14, 9 -10, 9 -4 L 11 14 Z"
                fill="#0f172a"
                stroke="#94a3b8"
                strokeWidth={1.3}
                strokeLinejoin="round"
              />
              <path d="M -5 13 L -3 -5 L 3 -5 L 5 13 Z" fill="#020617" />
              <path
                d="M -8 -4 C -8 -14, 0 -22, 0 -24 C 0 -22, 8 -14, 8 -4 C 5 -7, -5 -7, -8 -4 Z"
                fill="#1e293b"
                stroke="#cbd5e1"
                strokeWidth={1.2}
              />
              <ellipse cx={0} cy={-9} rx={4.8} ry={5.2} fill="#020617" />
              <circle cx={-2} cy={-9.5} r={1.2} fill="#ef4444" />
              <circle cx={2} cy={-9.5} r={1.2} fill="#ef4444" />
            </g>
          )}
        </g>
      </svg>
    </motion.div>
  );
};

export const Board = HexBoardSVG;
