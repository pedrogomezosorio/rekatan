import type { BotDifficulty, GameConfig } from './types';

export type RoomPresetId =
  | 'BASE_3_4'
  | 'BASE_5_6'
  | 'SEAFARERS_3'
  | 'SEAFARERS_4'
  | 'SEAFARERS_5_6'
  | 'CITIES_KNIGHTS_3_4'
  | 'CITIES_KNIGHTS_5_6';
export interface RoomCreationOptions {
  preset: RoomPresetId;
  playWithBots?: boolean;
  playerCount?: number;
  botDifficulty?: BotDifficulty;
  voluntaryDefense?: boolean;
}
export interface RoomPreset {
  id: RoomPresetId;
  title: string;
  players: number[];
  landHexes: number;
  config: Partial<GameConfig>;
}
export const ROOM_PRESETS: Record<RoomPresetId, RoomPreset> = {
  BASE_3_4: {
    id: 'BASE_3_4',
    title: 'Juego base · 3–4 jugadores',
    players: [3, 4],
    landHexes: 19,
    config: {
      expansionModule: 'BASE',
      enabledExpansions: ['BASE'],
      boardMode: 'STANDARD_3_4',
      maxPlayers: 4,
      victoryPointsTarget: 10,
    },
  },
  BASE_5_6: {
    id: 'BASE_5_6',
    title: 'Juego base · 5–6 jugadores',
    players: [5, 6],
    landHexes: 30,
    config: {
      expansionModule: 'BASE',
      enabledExpansions: ['BASE'],
      boardMode: 'EXPANSION_5_6',
      maxPlayers: 6,
      victoryPointsTarget: 10,
    },
  },
  SEAFARERS_3: {
    id: 'SEAFARERS_3',
    title: 'Navegantes · 2–3 jugadores',
    players: [2, 3],
    landHexes: 22,
    config: {
      expansionModule: 'SEAFARERS',
      enabledExpansions: ['BASE', 'SEAFARERS'],
      seafarersScenario: 'HEADING_FOR_NEW_SHORES',
      seafarersBoardSize: '3P',
      maxPlayers: 3,
      victoryPointsTarget: 14,
    },
  },
  SEAFARERS_4: {
    id: 'SEAFARERS_4',
    title: 'Navegantes · 4 jugadores',
    players: [4],
    landHexes: 28,
    config: {
      expansionModule: 'SEAFARERS',
      enabledExpansions: ['BASE', 'SEAFARERS'],
      seafarersScenario: 'HEADING_FOR_NEW_SHORES',
      seafarersBoardSize: '4P',
      maxPlayers: 4,
      victoryPointsTarget: 14,
    },
  },
  SEAFARERS_5_6: {
    id: 'SEAFARERS_5_6',
    title: 'Navegantes · 5–6 jugadores',
    players: [5, 6],
    landHexes: 40,
    config: {
      expansionModule: 'SEAFARERS',
      enabledExpansions: ['BASE', 'SEAFARERS'],
      seafarersScenario: 'HEADING_FOR_NEW_SHORES',
      seafarersBoardSize: '5_6P',
      maxPlayers: 6,
      victoryPointsTarget: 14,
    },
  },
  CITIES_KNIGHTS_3_4: {
    id: 'CITIES_KNIGHTS_3_4',
    title: 'Ciudades y Caballeros · 3–4 jugadores',
    players: [3, 4],
    landHexes: 19,
    config: {
      expansionModule: 'CITIES_AND_KNIGHTS',
      enabledExpansions: ['BASE', 'CITIES_AND_KNIGHTS'],
      boardMode: 'STANDARD_3_4',
      maxPlayers: 4,
      victoryPointsTarget: 13,
    },
  },
  CITIES_KNIGHTS_5_6: {
    id: 'CITIES_KNIGHTS_5_6',
    title: 'Ciudades y Caballeros · 5–6 jugadores',
    players: [5, 6],
    landHexes: 30,
    config: {
      expansionModule: 'CITIES_AND_KNIGHTS',
      enabledExpansions: ['BASE', 'CITIES_AND_KNIGHTS'],
      boardMode: 'EXPANSION_5_6',
      maxPlayers: 6,
      victoryPointsTarget: 13,
    },
  },
};

/** Shared by the server and menu so a chosen expansion cannot silently become a base game. */
export function parseRoomCreationOptions(value: unknown): RoomCreationOptions {
  if (value === undefined) return { preset: 'BASE_3_4' };
  if (!value || typeof value !== 'object')
    throw new Error('Opciones de creación de sala inválidas.');
  const options = value as Partial<RoomCreationOptions>;
  if (!options.preset || !Object.hasOwn(ROOM_PRESETS, options.preset))
    throw new Error('Modalidad de partida desconocida.');
  if (
    options.playWithBots !== undefined &&
    typeof options.playWithBots !== 'boolean'
  )
    throw new Error('Elige partida multijugador o con bots.');
  if (
    options.playerCount !== undefined &&
    !ROOM_PRESETS[options.preset].players.includes(options.playerCount)
  )
    throw new Error(
      'El número de participantes no corresponde a esta modalidad.',
    );
  if (
    options.botDifficulty !== undefined &&
    !['EASY', 'MEDIUM', 'HARD'].includes(options.botDifficulty)
  )
    throw new Error('Dificultad de bots inválida.');
  if (
    options.voluntaryDefense !== undefined &&
    typeof options.voluntaryDefense !== 'boolean'
  )
    throw new Error('Variante de defensa inválida.');
  return {
    preset: options.preset,
    playWithBots: options.playWithBots,
    playerCount: options.playerCount,
    botDifficulty: options.botDifficulty,
    voluntaryDefense: options.voluntaryDefense,
  };
}
