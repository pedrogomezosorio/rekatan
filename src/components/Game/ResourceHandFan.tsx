import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_RESOURCES, RESOURCE_CARD_PATHS, RESOURCE_META } from '../../shared/constants';
import { ResourceType } from '../../shared/types';
import { ResourceIcon } from '../UI/ResourceIcon';

interface ResourceHandFanProps {
  resources: Record<ResourceType, number>;
  portRatios?: Record<ResourceType, 2 | 3 | 4>;
  onCardClick?: (resource: ResourceType) => void;
}

interface FanCardItem {
  id: string;
  resource: ResourceType;
  stackCount: number;
}

/**
 * Renders the player's resource cards in an interactive physical fan layout
 * in the center of the bottom panel using the exact pixel-by-pixel original
 * Catan card textures (/assets/cards/*.jpg).
 */
export const ResourceHandFan: React.FC<ResourceHandFanProps> = ({
  resources,
  portRatios,
  onCardClick,
}) => {
  const [isFanHovered, setIsFanHovered] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Build individual physical cards for the fan (caps cleanly at 15 physical cards, stacking extras)
  const fanCards = useMemo<FanCardItem[]>(() => {
    const rawCards: ResourceType[] = [];
    for (const res of ALL_RESOURCES) {
      const count = resources[res] || 0;
      for (let i = 0; i < count; i++) {
        rawCards.push(res);
      }
    }

    if (rawCards.length <= 15) {
      return rawCards.map((resource, idx) => ({
        id: `${resource}-${idx}`,
        resource,
        stackCount: 1,
      }));
    }

    // If the player hoards >15 cards, group excess so the fan stays crisp and readable
    const grouped: FanCardItem[] = [];
    for (const res of ALL_RESOURCES) {
      const total = resources[res] || 0;
      if (total === 0) continue;
      const maxSlotsForType = Math.min(total, 3);
      const baseStack = Math.floor(total / maxSlotsForType);
      const remainder = total % maxSlotsForType;
      for (let i = 0; i < maxSlotsForType; i++) {
        grouped.push({
          id: `${res}-grp-${i}`,
          resource: res,
          stackCount: baseStack + (i < remainder ? 1 : 0),
        });
      }
    }
    return grouped;
  }, [resources]);

  const totalCards = ALL_RESOURCES.reduce((acc, r) => acc + (resources[r] || 0), 0);

  if (totalCards === 0) {
    return (
      <div className="flex items-center justify-center px-6 py-2 rounded-2xl bg-[#0d0906]/80 border border-stone-800/80 text-xs text-stone-400 italic select-none">
        Sin cartas de recursos en mano
      </div>
    );
  }

  const count = fanCards.length;
  const mid = (count - 1) / 2;

  // Spread parameters: wider and flatter when hovered, compact arc at rest
  const angleStep = isFanHovered
    ? Math.min(7.5, 68 / Math.max(1, count))
    : Math.min(4.8, 44 / Math.max(1, count));

  const xStep = isFanHovered
    ? Math.min(48, 480 / Math.max(1, count))
    : Math.min(30, 300 / Math.max(1, count));

  return (
    <div
      className="relative flex flex-col items-center justify-end select-none"
      onMouseEnter={() => setIsFanHovered(true)}
      onMouseLeave={() => {
        setIsFanHovered(false);
        setHoveredIndex(null);
      }}
    >
      {/* Fan Container */}
      <div className="relative h-28 sm:h-32 flex items-end justify-center min-w-[260px] sm:min-w-[400px] pt-4">
        <AnimatePresence mode="popLayout">
          {fanCards.map((card, idx) => {
            const offsetFromCenter = idx - mid;
            const isCardHovered = hoveredIndex === idx;

            // If a neighbor card is hovered, push adjacent cards slightly outward for clarity
            let neighborPushX = 0;
            if (hoveredIndex !== null && hoveredIndex !== idx) {
              const diff = idx - hoveredIndex;
              neighborPushX = diff > 0 ? 18 : -18;
            }

            const rotateDeg = isCardHovered ? offsetFromCenter * 1.4 : offsetFromCenter * angleStep;
            const translateX = offsetFromCenter * xStep + neighborPushX;
            // Parabolic arch: outer cards sit slightly lower than center cards
            const archDropY =
              Math.abs(offsetFromCenter) * Math.abs(offsetFromCenter) * (isFanHovered ? 0.85 : 1.3);
            const translateY = isCardHovered
              ? -30
              : isFanHovered
              ? -10 + archDropY
              : archDropY;
            const scale = isCardHovered ? 1.26 : isFanHovered ? 1.08 : 1;

            const meta = RESOURCE_META[card.resource];
            const portRatio = portRatios?.[card.resource] || 4;
            const cardTexturePath = RESOURCE_CARD_PATHS[card.resource];

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 40, scale: 0.7 }}
                animate={{
                  opacity: 1,
                  x: translateX,
                  y: translateY,
                  rotate: rotateDeg,
                  scale,
                }}
                exit={{ opacity: 0, y: -30, scale: 0.6 }}
                transition={{
                  type: 'spring',
                  stiffness: 360,
                  damping: 24,
                }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onClick={() => onCardClick?.(card.resource)}
                title={`${meta.name}${portRatio < 4 ? ` (Puerto ${portRatio}:1)` : ''}`}
                style={{
                  zIndex: isCardHovered ? 60 : 10 + idx,
                  transformOrigin: '50% 115%',
                }}
                className={`absolute bottom-1 w-[66px] h-[104px] sm:w-[74px] sm:h-[116px] rounded-[9px] overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.9)] cursor-pointer transition-shadow ${
                  isCardHovered
                    ? 'ring-2 ring-amber-300 shadow-[0_16px_34px_rgba(251,191,36,0.45)]'
                    : 'ring-1 ring-black/60'
                }`}
              >
                {/* Pixel-Perfect Original Resource Card Design */}
                <img
                  src={cardTexturePath}
                  alt={meta.name}
                  draggable={false}
                  className="w-full h-full object-fill select-none pointer-events-none"
                />

                {/* Stack Multiplier Badge (only if >15 cards in hand) */}
                {card.stackCount > 1 && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-stone-950/90 border border-amber-400 text-amber-300 font-mono text-[10px] font-black shadow-md">
                    x{card.stackCount}
                  </span>
                )}

                {/* Tooltip Badge on Hover (Resource Name + Active Port Ratio) */}
                {isCardHovered && (
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 py-0.5 px-1 rounded bg-stone-950/90 border border-amber-400/60 text-[9px] font-black text-amber-200 shadow-lg">
                    <span className="truncate">{meta.name}</span>
                    {portRatio < 4 && (
                      <span className="text-emerald-300 shrink-0">⚓{portRatio}:1</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Compact Summary Pill Beneath the Fan */}
      <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#0c0806]/95 border border-[#d4af37]/35 text-[11px] text-stone-200 shadow-lg">
        <span className="font-extrabold text-amber-300">Mano ({totalCards}):</span>
        {ALL_RESOURCES.map((r) => (
          <span
            key={r}
            className={`inline-flex items-center gap-1 font-mono font-bold ${
              resources[r] > 0 ? 'text-amber-100' : 'text-stone-600'
            }`}
          >
            <ResourceIcon resource={r} size={14} />
            <span>{resources[r]}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
