import { EXPANSION_NUMBERS_28, STANDARD_NUMBERS_18 } from '../constants';
import type { BoardState, Hex } from '../types';
import { hasAdjacentRedNumbers } from './HexGrid';

const adjacent = (a: Hex, b: Hex): boolean =>
  Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s)) === 1;

/** The supplied 5–6 rulebook places A–Z tokens counterclockwise, skipping deserts. */
export function withOfficialNumberSpiral(
  board: BoardState,
  preventAdjacentReds: boolean,
): BoardState {
  if (
    board.seafarersScenario ||
    !['STANDARD_3_4', 'EXPANSION_5_6'].includes(board.mode)
  )
    return board;
  const land = Object.values(board.hexes).filter((h) => h.terrain !== 'SEA');
  const tokens =
    board.mode === 'EXPANSION_5_6' ? EXPANSION_NUMBERS_28 : STANDARD_NUMBERS_18;
  if (land.filter((h) => h.terrain !== 'DESERT').length !== tokens.length)
    return board;
  const corners = land.filter(
    (h) => land.filter((other) => adjacent(h, other)).length <= 3,
  );
  for (const corner of corners) {
    let remaining = [...land];
    const route: Hex[] = [];
    while (remaining.length) {
      const ring = remaining.filter(
        (h) => remaining.filter((other) => adjacent(h, other)).length < 6,
      );
      const cx = ring.reduce((n, h) => n + h.center.x, 0) / ring.length;
      const cy = ring.reduce((n, h) => n + h.center.y, 0) / ring.length;
      // Y increases downwards on screen, hence its negation for counterclockwise order.
      ring.sort(
        (a, b) =>
          Math.atan2(-(a.center.y - cy), a.center.x - cx) -
          Math.atan2(-(b.center.y - cy), b.center.x - cx),
      );
      const start = route.length
        ? ring.findIndex((h) => adjacent(h, route[route.length - 1]))
        : ring.indexOf(corner);
      route.push(...ring.slice(start), ...ring.slice(0, start));
      remaining = remaining.filter((h) => !ring.includes(h));
    }
    const hexes = { ...board.hexes };
    let tokenIndex = 0;
    for (const h of route)
      hexes[h.id] = {
        ...h,
        numberToken: h.terrain === 'DESERT' ? null : tokens[tokenIndex++],
      };
    if (!preventAdjacentReds || !hasAdjacentRedNumbers(hexes))
      return { ...board, hexes, numberSpiralHexIds: route.map((h) => h.id) };
  }
  throw new Error(
    'No se pudo distribuir la espiral sin números rojos adyacentes. Regenera el terreno.',
  );
}
