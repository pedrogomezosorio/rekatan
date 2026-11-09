import React from 'react';
import { motion } from 'framer-motion';
import { Hex } from '../../shared/types';
import {
  PROBABILITY_PIPS,
  TERRAIN_META,
  TILE_TEXTURE_PATHS,
} from '../../shared/constants';
import { getHexCornerPoints } from '../../shared/engine/HexGrid';

export interface HexagonProps {
  hex: Hex;
  hexSize: number;
  isProducing: boolean;
  isRobberTarget: boolean;
  isSwapSelected: boolean;
  isRedConflict: boolean;
  showCoords: boolean;
  isInteractive: boolean;
  lowEndPcMode?: boolean;
  onSelect: (hex: Hex) => void;
}

export const Hexagon: React.FC<HexagonProps> = React.memo(
  ({
    hex,
    hexSize,
    isProducing,
    isRobberTarget,
    isSwapSelected,
    isRedConflict,
    showCoords,
    isInteractive,
    lowEndPcMode = false,
    onSelect,
  }) => {
    const isSea = hex.terrain === 'SEA';
    const isFog = hex.terrain === 'FOG';
    const isRedNumber = hex.numberToken === 6 || hex.numberToken === 8;
    const pips = hex.numberToken ? PROBABILITY_PIPS[hex.numberToken] || 0 : 0;

    // Local coordinates centered at (0, 0)
    const outerCorners = getHexCornerPoints(0, 0, hexSize);
    const outerPoints = outerCorners.map((c) => `${c.x},${c.y}`).join(' ');

    // 3D Extruded Cardboard Rim (+6px vertical thickness)
    const extrudedPoints = outerCorners
      .map((c) => `${c.x},${c.y + 6}`)
      .join(' ');

    // Inner Bevel Frame (89% scale — matches classic Catan sandstone border width)
    const innerCorners = getHexCornerPoints(0, 0, hexSize * 0.89);
    const innerPoints = innerCorners.map((c) => `${c.x},${c.y}`).join(' ');

    return (
      <g
        id={`board-hex-${hex.id}`}
        transform={`translate(${hex.center.x}, ${hex.center.y})`}
        onClick={() => onSelect(hex)}
        className={isInteractive ? 'cursor-pointer group' : undefined}
      >
        {/* 1. 3D EXTRUDED CARDBOARD BASE WITH TABLETOP DROP SHADOW */}
        {!isSea && !isFog && (
          <polygon
            points={extrudedPoints}
            fill="#261409"
            stroke="#120904"
            strokeWidth={1.8}
            filter={lowEndPcMode ? undefined : 'url(#hex-drop-shadow)'}
          />
        )}

        {/* 2. CLASSIC CATAN CARDBOARD BASE RIM */}
        <polygon
          points={outerPoints}
          fill={isFog ? '#1e293b' : isSea ? 'url(#sea-depth-grad)' : '#dac6a0'}
        />

        {/* 3. HIGH-RES AUTHENTIC ORIGINAL CATAN TERRAIN ILLUSTRATION OR FOG */}
        {isFog ? (
          <g clipPath="url(#hex-outer-surface-clip)">
            <rect
              x={-hexSize}
              y={-hexSize}
              width={hexSize * 2}
              height={hexSize * 2}
              fill="#0f172a"
            />
            {/* Ambient mist circles */}
            <circle cx={-14} cy={-10} r={28} fill="rgba(100, 116, 139, 0.35)" />
            <circle cx={14} cy={12} r={32} fill="rgba(148, 163, 184, 0.28)" />
            <circle cx={0} cy={0} r={20} fill="rgba(203, 213, 225, 0.22)" />
            {/* Mystery Emblem */}
            <g transform="translate(0, 0)">
              <circle cx={0} cy={0} r={17} fill="rgba(15, 23, 42, 0.85)" stroke="#64748b" strokeWidth={1.8} />
              <text
                x={0}
                y={6}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#cbd5e1"
                fontSize="18"
                fontWeight="900"
                fontFamily="Cinzel, Georgia, serif"
              >
                ?
              </text>
            </g>
          </g>
        ) : !isSea ? (
          <g clipPath="url(#hex-outer-surface-clip)">
            {/* Solid Fallback Base */}
            <rect
              x={-hexSize}
              y={-hexSize}
              width={hexSize * 2}
              height={hexSize * 2}
              fill={TERRAIN_META[hex.terrain].fill}
            />
            {/* High-Resolution Original Terrain Tile from Board Game */}
            <image
              href={TILE_TEXTURE_PATHS[hex.terrain]}
              x={-hexSize * 0.866025}
              y={-hexSize}
              width={hexSize * 1.73205}
              height={hexSize * 2}
              preserveAspectRatio="none"
            />
            {/* Subtle Inner Edge Shading for Tabletop Cardboard Depth */}
            <rect
              x={-hexSize}
              y={-hexSize}
              width={hexSize * 2}
              height={hexSize * 2}
              fill="url(#tile-vignette-grad)"
            />

            {/* Río de Oro (Gold River & Nuggets Overlay for Seafarers) */}
            {hex.terrain === 'GOLD' && (
              <g className="pointer-events-none">
                <path
                  d={`M ${-hexSize * 0.7} ${-hexSize * 0.4} Q ${-hexSize * 0.1} ${-hexSize * 0.1}, 0 0 T ${hexSize * 0.7} ${hexSize * 0.4}`}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={14}
                  strokeLinecap="round"
                  opacity={0.65}
                />
                <path
                  d={`M ${-hexSize * 0.7} ${-hexSize * 0.4} Q ${-hexSize * 0.1} ${-hexSize * 0.1}, 0 0 T ${hexSize * 0.7} ${hexSize * 0.4}`}
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth={6}
                  strokeLinecap="round"
                  opacity={0.9}
                />
                <circle cx={-14} cy={-10} r={3.2} fill="#fef08a" stroke="#b45309" strokeWidth={1} />
                <circle cx={14} cy={12} r={3.5} fill="#fef08a" stroke="#b45309" strokeWidth={1} />
                <circle cx={-2} cy={2} r={2.8} fill="#fef08a" stroke="#b45309" strokeWidth={1} />
              </g>
            )}
          </g>
        ) : (
          <g clipPath="url(#hex-outer-surface-clip)">
            <image
              href={TILE_TEXTURE_PATHS.SEA}
              x={-hexSize}
              y={-hexSize}
              width={hexSize * 2}
              height={hexSize * 2}
              preserveAspectRatio="xMidYMid slice"
              opacity={0.45}
            />
            <path
              d="M -18 0 Q -9 -5, 0 0 T 18 0"
              fill="none"
              stroke="rgba(186, 230, 253, 0.22)"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </g>
        )}

        {/* 4. CRISP OUTER STROKE & GLOW HIGHLIGHT OVERLAY */}
        <polygon
          points={outerPoints}
          fill="none"
          stroke={
            isProducing
              ? '#fbbf24'
              : isSwapSelected
              ? '#38bdf8'
              : isRedConflict
              ? '#ef4444'
              : isFog
              ? '#475569'
              : isSea
              ? 'rgba(56, 189, 248, 0.16)'
              : '#5c3a18'
          }
          strokeWidth={isProducing || isSwapSelected ? 4.5 : isSea ? 1 : 2.2}
          filter={isProducing && !lowEndPcMode ? 'url(#producing-glow)' : undefined}
        />

        {/* Inner Bevel Rim Line between Cardboard Border and Illustration */}
        {!isSea && !isFog && (
          <polygon
            points={innerPoints}
            fill="none"
            stroke="#785937"
            strokeWidth={1.4}
            pointerEvents="none"
          />
        )}

        {/* 4. PRODUCING RESOURCE RADIANT PULSE (Framer Motion) */}
        {isProducing && (
          <>
            {lowEndPcMode ? (
              <polygon
                points={innerPoints}
                fill="rgba(251, 191, 36, 0.35)"
                stroke="#fde047"
                strokeWidth={4}
                pointerEvents="none"
              />
            ) : (
              <>
                <motion.polygon
                  points={innerPoints}
                  fill="rgba(251, 191, 36, 0.32)"
                  stroke="#fde047"
                  strokeWidth={4.5}
                  initial={{ opacity: 0.25, scale: 0.94 }}
                  animate={{ opacity: [0.3, 0.75, 0.3], scale: [0.96, 1.03, 0.96] }}
                  transition={{ duration: 1.0, repeat: Infinity }}
                  pointerEvents="none"
                />
                <circle
                  cx={0}
                  cy={0}
                  r={hexSize * 0.74}
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth={3.5}
                  strokeDasharray="6 4"
                  className="animate-ping"
                  pointerEvents="none"
                />
              </>
            )}
          </>
        )}

        {/* 5. ROBBER PLACEMENT TARGET HIGHLIGHT */}
        {isRobberTarget && (
          <g className="pointer-events-none">
            <circle
              cx={0}
              cy={0}
              r={26}
              fill="rgba(220, 38, 38, 0.26)"
              stroke="#f87171"
              strokeWidth={2.2}
              strokeDasharray="5 3"
            />
          </g>
        )}

        {/* 6. 3D PARCHMENT NUMBER TOKEN WITH CAST SHADOW */}
        {!isSea && !isFog && hex.numberToken !== null && (
          <g
            transform="translate(0, 12)"
            className="pointer-events-none"
            filter="url(#token-drop-shadow)"
          >
            {/* 3D Token Rim Thickness */}
            <circle cx={0} cy={2.2} r={17} fill="#4a2c11" />
            {/* Main Aged Parchment Disc */}
            <circle
              cx={0}
              cy={0}
              r={17}
              fill="url(#parchment-token-grad)"
              stroke={isRedConflict ? '#ef4444' : isRedNumber ? '#b91c1c' : '#78350f'}
              strokeWidth={isRedConflict ? 2.8 : isRedNumber ? 2.2 : 1.8}
            />
            {/* Inner Engraved Ring */}
            <circle
              cx={0}
              cy={0}
              r={14.2}
              fill="none"
              stroke={isRedNumber ? 'rgba(185, 28, 28, 0.35)' : 'rgba(120, 53, 15, 0.28)'}
              strokeWidth={0.8}
            />
            {/* Number Typography */}
            <text
              x={0}
              y={2}
              textAnchor="middle"
              dominantBaseline="alphabetic"
              fill={isRedNumber ? '#b91c1c' : '#1c1917'}
              fontWeight={isRedNumber ? '900' : '800'}
              fontSize={isRedNumber ? '15.5' : '13.5'}
              fontFamily="Cinzel, Georgia, serif"
            >
              {hex.numberToken}
            </text>
            {/* Probability Pips */}
            <g transform="translate(0, 9.5)">
              {Array.from({ length: pips }).map((_, idx) => {
                const totalWidth = (pips - 1) * 3.8;
                const cx = -totalWidth / 2 + idx * 3.8;
                return (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={0}
                    r={1.35}
                    fill={isRedNumber ? '#b91c1c' : '#44403c'}
                  />
                );
              })}
            </g>
          </g>
        )}

        {/* 7. CUBIC COORDINATES OVERLAY (q, r, s) */}
        {showCoords && (
          <g
            transform={`translate(0, ${isSea ? 4 : -32})`}
            className="pointer-events-none"
          >
            <rect
              x={-26}
              y={-8}
              width={52}
              height={14}
              rx={4}
              fill="rgba(12, 10, 9, 0.88)"
              stroke="rgba(212, 175, 55, 0.35)"
              strokeWidth={0.8}
            />
            <text
              x={0}
              y={2}
              textAnchor="middle"
              fill="#e7e5e4"
              fontSize="8.5"
              fontFamily="monospace"
            >
              {hex.q},{hex.r},{hex.s}
            </text>
          </g>
        )}
      </g>
    );
  }
);
