import type { CSSProperties } from 'react';
import { PLAYER_COLORS } from '../../shared/constants';
import type { PlayerColor } from '../../shared/types';

/** Dark player-colored surfaces keep light labels readable across all six colors. */
export function playerCardStyle(color: PlayerColor, highlighted = false): CSSProperties {
  const palette = PLAYER_COLORS[color];
  return {
    backgroundColor: palette.secondary,
    backgroundImage: `linear-gradient(135deg, #00000066, #000000b3), linear-gradient(135deg, ${palette.secondary}, ${palette.primary})`,
    borderColor: palette.primary,
    boxShadow: highlighted
      ? '0 0 0 2px #fbbf24, 0 0 0 4px #0f172a, 0 6px 20px #00000080'
      : '0 4px 14px #00000040',
  };
}
