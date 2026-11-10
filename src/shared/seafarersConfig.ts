import { GameConfig, SeafarersBoardSize } from './types';

export const SEAFARERS_PLAYER_LIMITS: Record<SeafarersBoardSize, number> = { '3P': 3, '4P': 4, '5_6P': 6 };

export function getRoomPlayerLimit(config: GameConfig): number {
  return config.expansionModule === 'SEAFARERS'
    ? SEAFARERS_PLAYER_LIMITS[config.seafarersBoardSize || '4P']
    : config.maxPlayers;
}
