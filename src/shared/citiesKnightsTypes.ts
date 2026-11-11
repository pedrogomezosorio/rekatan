import type { ResourceType } from './types';

export type CommodityType = 'PAPER' | 'CLOTH' | 'COIN';
export type TradeCardType = ResourceType | CommodityType;
export type CardBundle = Record<ResourceType, number> & Partial<Record<CommodityType, number>>;
export type ImprovementBranch = 'SCIENCE' | 'POLITICS' | 'TRADE';
export type EventDie = 'BARBARIAN' | ImprovementBranch;
export type ProgressCardType = 'ALCHEMIST' | 'ROAD_BUILDING' | 'SMITH' | 'CRANE' | 'PRINTER' | 'ENGINEER' | 'INVENTOR' | 'IRRIGATION' | 'MEDICINE' | 'MINING' | 'WEDDING' | 'CONSTITUTION' | 'DESERTER' | 'DIPLOMAT' | 'SPY' | 'WARLORD' | 'INTRIGUE' | 'BISHOP' | 'SABOTEUR' | 'MERCHANT' | 'MERCHANT_FLEET' | 'MASTER_MERCHANT' | 'COMMODITY_MONOPOLY' | 'RESOURCE_MONOPOLY' | 'COMMERCIAL_HARBOR';
export interface ProgressCard { id: string; type: ProgressCardType; branch: ImprovementBranch }
export interface BoardKnight { playerId: string; rank: 1 | 2 | 3; active: boolean; activatedOnTurn: number; promotedOnTurn: number; actedOnTurn: number }
export interface CitiesKnightsPlayer {
  improvements: Record<ImprovementBranch, number>;
  progressCards: ProgressCard[];
  defenderPoints: number;
  progressPoints: number;
}
export type CKChoice =
  | { kind: 'CITY_LOSS'; playerId: string }
  | { kind: 'DEFENDER_CARD'; playerId: string }
  | { kind: 'AQUEDUCT'; playerId: string }
  | { kind: 'PROGRESS_DISCARD'; playerId: string }
  | { kind: 'RETREAT'; playerId: string; knight: BoardKnight; vertexIds: string[] }
  | { kind: 'DESERTER'; playerId: string; beneficiaryId: string }
  | { kind: 'DESERTER_PLACE'; playerId: string; knight: BoardKnight }
  | { kind: 'GIFT'; playerId: string; beneficiaryId: string; amount: number; commodityOnly?: boolean };
export interface CitiesKnightsState {
  barbarianPosition: number;
  firstAttackResolved: boolean;
  eventDie: EventDie | null;
  decks: Record<ImprovementBranch, ProgressCard[]>;
  metropolisOwners: Record<ImprovementBranch, string | null>;
  choices: CKChoice[];
  pendingDice?: [number, number];
  specialBuild?: { turnOwnerId: string; remainingPlayerIds: string[] };
  turnEffects?: { crane?: boolean; medicine?: boolean; engineer?: boolean; smith?: number; fleet?: TradeCardType[]; harborPartners?: string[] };
  lastBattle?: { barbarians: number; defenders: number; contributions: Record<string, number>; won: boolean; defenderIds: string[]; victimIds: string[] };
}
export interface ProgressPayload {
  vertexId?: string;
  vertexIds?: string[];
  edgeId?: string;
  toEdgeId?: string;
  hexId?: string;
  hexIds?: string[];
  targetPlayerId?: string;
  targetCardId?: string;
  resource?: TradeCardType;
  resources?: CardBundle;
  dice?: [number, number];
}
export type CitiesKnightsAction =
  | { type: 'RECRUIT_KNIGHT'; vertexId: string }
  | { type: 'PROMOTE_KNIGHT'; vertexId: string }
  | { type: 'ACTIVATE_KNIGHT'; vertexId: string }
  | { type: 'MOVE_KNIGHT'; fromVertexId: string; toVertexId: string }
  | { type: 'EXPEL_ROBBER'; vertexId: string; mode?: 'ROBBER' | 'PIRATE' }
  | { type: 'BUILD_CITY_WALL'; vertexId: string }
  | { type: 'IMPROVE_CITY'; branch: ImprovementBranch; vertexId?: string }
  | { type: 'PLAY_PROGRESS_CARD'; cardId: string; payload?: ProgressPayload }
  | { type: 'RESOLVE_CK_CHOICE'; vertexId?: string; branch?: ImprovementBranch; resource?: ResourceType; cardId?: string; resources?: CardBundle }
  | { type: 'COMMERCIAL_HARBOR_TRADE'; targetPlayerId: string; resource: ResourceType }
  | { type: 'END_SPECIAL_BUILD' };

/** Entropy is supplied by the server; tests/replays can provide a fixed source. */
export interface RuleContext { now?: number; random: () => number; dice?: [number, number]; eventDie?: EventDie }
