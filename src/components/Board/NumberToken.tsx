import React from 'react';
import { NUMBER_TOKEN_PATHS, PROBABILITY_PIPS } from '../../shared/constants';

interface NumberTokenProps {
  number: number;
  isRedConflict?: boolean;
  lowEndPcMode?: boolean;
}

/** Transparent PNG face; the SVG ring only communicates a board conflict. */
export const NumberToken: React.FC<NumberTokenProps> = React.memo(({
  number,
  isRedConflict = false,
  lowEndPcMode = false,
}) => (
  <g
    transform="translate(0, 12)"
    className="pointer-events-none"
    filter={lowEndPcMode ? undefined : 'url(#token-drop-shadow)'}
    role="img"
    aria-label={`Número ${number}, ${PROBABILITY_PIPS[number] || 0} puntos de probabilidad${isRedConflict ? ', conflicto de números rojos adyacentes' : ''}`}
  >
    <image
      href={NUMBER_TOKEN_PATHS[number]}
      x={-18}
      y={-18}
      width={36}
      height={36}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    />
    {isRedConflict && <circle r={18} fill="none" stroke="#ef4444" strokeWidth={2.8} />}
  </g>
));
