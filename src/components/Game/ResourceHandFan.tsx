import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_TRADE_CARDS, RESOURCE_CARD_PATHS, RESOURCE_META } from '../../shared/constants';
import { CardBundle, TradeCardType } from '../../shared/types';

interface ResourceHandFanProps {
  resources: CardBundle;
  portRatios?: Partial<Record<TradeCardType, 2 | 3 | 4>>;
  onCardClick?: (resource: TradeCardType) => void;
}

interface FanCardItem {
  id: string;
  resource: TradeCardType;
  stackCount: number;
}

/**
 * Renders the player's resource cards in an interactive physical fan layout
 * in the center of the bottom panel using the exact pixel-by-pixel original
 * Catan card textures (/assets/cards/*.jpg).
 * On touch / tablet devices, tapping expands and enlarges the cards for clear inspection,
 * and tapping outside smoothly returns the fan to resting size.
 */
export const ResourceHandFan: React.FC<ResourceHandFanProps> = ({
  resources,
  portRatios,
  onCardClick,
}) => {
  const [isFanHovered, setIsFanHovered] = useState(false);
  const [isExpandedTouch, setIsExpandedTouch] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const fanContainerRef = useRef<HTMLDivElement>(null);

  // Close expanded touch view when tapping anywhere outside the resource hand
  useEffect(() => {
    if (!isExpandedTouch) return;
    const handleOutside = (e: Event) => {
      if (fanContainerRef.current && !fanContainerRef.current.contains(e.target as Node)) {
        setIsExpandedTouch(false);
        setHoveredIndex(null);
      }
    };

    window.addEventListener('pointerdown', handleOutside);
    window.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
    };
  }, [isExpandedTouch]);

  // Build individual physical cards for the fan (caps cleanly at 15 physical cards, stacking extras)
  const fanCards = useMemo<FanCardItem[]>(() => {
    const rawCards: TradeCardType[] = [];
    for (const res of ALL_TRADE_CARDS) {
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
    const types = ALL_TRADE_CARDS.filter(r => (resources[r] || 0) > 0);
    const slots = new Map(types.map(r => [r, 1]));
    let remainingSlots = 15 - types.length;
    while (remainingSlots > 0) {
      let added = false;
      for (const r of types) {
        if (!remainingSlots) break;
        if (slots.get(r)! < (resources[r] || 0)) { slots.set(r, slots.get(r)! + 1); remainingSlots--; added = true; }
      }
      if (!added) break;
    }
    for (const res of ALL_TRADE_CARDS) {
      const total = resources[res] || 0;
      if (total === 0) continue;
      const maxSlotsForType = slots.get(res) || 1;
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

  const totalCards = ALL_TRADE_CARDS.reduce((acc, r) => acc + (resources[r] || 0), 0);

  if (totalCards === 0) {
    return (
      <div className="flex items-center justify-center px-6 py-2 rounded-2xl bg-[#0d0906]/80 border border-stone-800/80 text-xs text-stone-400 italic select-none">
        Sin cartas de recursos en mano
      </div>
    );
  }

  const count = fanCards.length;
  const mid = (count - 1) / 2;
  const isExpanded = isFanHovered || isExpandedTouch;

  // Spread parameters: wider and amplified when hovered or expanded on tablet, compact arc at rest
  const angleStep = isExpandedTouch
    ? Math.min(8.5, 80 / Math.max(1, count))
    : isFanHovered
    ? Math.min(7.5, 68 / Math.max(1, count))
    : Math.min(4.8, 44 / Math.max(1, count));

  const xStep = isExpandedTouch
    ? Math.min(54, 540 / Math.max(1, count))
    : isFanHovered
    ? Math.min(48, 480 / Math.max(1, count))
    : Math.min(30, 300 / Math.max(1, count));

  return (
    <div
      ref={fanContainerRef}
      className={`relative flex flex-col items-center justify-end select-none overflow-visible transition-all duration-300 ${
        isExpandedTouch ? 'z-40' : 'z-20'
      }`}
      onMouseEnter={() => setIsFanHovered(true)}
      onMouseLeave={() => {
        setIsFanHovered(false);
        setHoveredIndex(null);
      }}
      onClick={(e) => {
        // Toggle touch expansion when tapping on the fan container
        if (!isExpandedTouch) {
          setIsExpandedTouch(true);
        }
      }}
    >
      {/* Tablet-friendly Expanded Indicator Banner */}
      {isExpandedTouch && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute -top-10 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md border border-[#d4af37]/60 text-amber-200 text-[11px] font-black shadow-2xl flex items-center gap-1.5 pointer-events-none"
        >
          <span>Mazo Ampliado ({totalCards} cartas)</span>
          <span className="text-[9px] text-stone-400 font-semibold">• Toca el mapa para cerrar</span>
        </motion.div>
      )}

      {/* Fan Container protruding above the bottom bar */}
      <div className="relative h-14 sm:h-16 flex items-end justify-center min-w-[260px] sm:min-w-[400px] overflow-visible">
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
              Math.abs(offsetFromCenter) * Math.abs(offsetFromCenter) * (isExpanded ? 0.85 : 1.3);
            const translateY = isCardHovered
              ? (isExpandedTouch ? -44 : -32)
              : isExpandedTouch
              ? -28 + archDropY
              : isFanHovered
              ? -12 + archDropY
              : archDropY;
            const scale = isCardHovered
              ? (isExpandedTouch ? 1.36 : 1.26)
              : isExpandedTouch
              ? 1.24
              : isFanHovered
              ? 1.08
              : 1;

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
                onClick={(e) => {
                  e.stopPropagation();
                  const isTabletTouch =
                    typeof window !== 'undefined' &&
                    window.matchMedia('(pointer: coarse)').matches;
                  if (isTabletTouch) {
                    setIsExpandedTouch(true);
                    setHoveredIndex((prev) => (prev === idx ? null : idx));
                    return;
                  }
                  onCardClick?.(card.resource);
                }}
                title={`${meta.name}${portRatio < 4 ? ` (Puerto ${portRatio}:1)` : ''}`}
                style={{
                  zIndex: isCardHovered ? 60 : 10 + idx,
                  transformOrigin: '50% 115%',
                }}
                className={`absolute bottom-0.5 w-[68px] h-[106px] sm:w-[76px] sm:h-[120px] rounded-[9px] overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.9)] cursor-pointer transition-shadow ${
                  isCardHovered
                    ? 'ring-2 ring-amber-300 shadow-[0_16px_34px_rgba(251,191,36,0.45)]'
                    : isExpandedTouch
                    ? 'ring-1.5 ring-amber-400/80 shadow-[0_14px_30px_rgba(0,0,0,0.95)]'
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

                {/* Tooltip Badge on Hover or Touch Expansion (Resource Name + Active Port Ratio) */}
                {(isCardHovered || isExpandedTouch) && (
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 py-0.5 px-1 rounded bg-stone-950/90 border border-amber-400/60 text-[9px] font-black text-amber-200 shadow-lg">
                    <span className="truncate">{meta.name}</span>
                    {portRatio < 4 && (
                      <span className="text-emerald-300 shrink-0">Puerto {portRatio}:1</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
