import { ALL_RESOURCES, createEmptyResources } from '../src/shared/constants';
import { COMMODITIES } from '../src/shared/citiesKnightsConfig';
import type { CardBundle, GameState, PlayerState } from '../src/shared/types';

function redactRivalResources(resources: CardBundle): CardBundle {
  const baseTotal = ALL_RESOURCES.reduce((sum, r) => sum + (resources[r] || 0), 0);
  const commodityTotal = COMMODITIES.reduce((sum, c) => sum + (resources[c] || 0), 0);
  const masked: CardBundle = createEmptyResources();
  if (baseTotal > 0) masked.WOOD = baseTotal;
  if (commodityTotal > 0) masked.PAPER = commodityTotal;
  return masked;
}

/**
 * Produces a player-scoped view of GameState that preserves every public counter,
 * card-back color, deck length, and legitimate card-inspection rule (Spy / Master Merchant),
 * while stripping rivals' hidden hands, secret VPs, deck ordering, and unexplored FOG payloads.
 */
export function sanitizeStateForPlayer(state: GameState, viewerPlayerId: string): GameState {
  if (state.phase === 'LOBBY' || state.phase === 'GAME_OVER') {
    return state;
  }

  const viewer = state.players.find((p) => p.id === viewerPlayerId);
  const viewerHasSpy = Boolean(
    viewer?.citiesKnights?.progressCards.some((c) => c.type === 'SPY')
  );
  const viewerHasMasterMerchant = Boolean(
    viewer?.citiesKnights?.progressCards.some((c) => c.type === 'MASTER_MERCHANT')
  );

  const sanitizedPlayers: PlayerState[] = state.players.map((p) => {
    if (p.id === viewerPlayerId) return p;

    const sanitizedDevCards = p.devCards.map((card, idx) =>
      card.played
        ? card
        : {
            id: `hidden-dev-${p.id}-${idx}`,
            type: 'KNIGHT' as const,
            title: 'Carta oculta',
            played: false,
            boughtAtTurn: 0,
          }
    );

    const sanitizedCK = p.citiesKnights
      ? {
          ...p.citiesKnights,
          progressCards: viewerHasSpy
            ? p.citiesKnights.progressCards
            : p.citiesKnights.progressCards.map((card, idx) => ({
                id: `hidden-ck-${p.id}-${idx}`,
                branch: card.branch,
                type: 'ALCHEMIST' as const,
              })),
        }
      : undefined;

    const sanitizedBarbarians = p.barbarians
      ? {
          ...p.barbarians,
          fishTokens: p.barbarians.fishTokens.map((tok, idx) => ({
            id: `hidden-fish-${p.id}-${idx}`,
            fishCount: 1 as const,
            isOldBoot: tok.isOldBoot,
          })),
          scenarioDevCards: p.barbarians.scenarioDevCards.map((c, idx) =>
            c.played
              ? c
              : {
                  ...c,
                  id: `hidden-mb-${p.id}-${idx}`,
                  description: '',
                }
          ),
        }
      : undefined;

    return {
      ...p,
      resources: viewerHasMasterMerchant ? p.resources : redactRivalResources(p.resources),
      devCards: sanitizedDevCards,
      totalVictoryPoints: p.publicVictoryPoints,
      citiesKnights: sanitizedCK,
      barbarians: sanitizedBarbarians,
    };
  });

  const sanitizedDevDeck = state.devDeck.map((_, idx) => ({
    id: `hidden-deck-${idx}`,
    type: 'KNIGHT' as const,
    title: 'Carta oculta',
    played: false,
    boughtAtTurn: 0,
  }));

  const sanitizedCKState = state.citiesKnights
    ? {
        ...state.citiesKnights,
        decks: {
          TRADE: state.citiesKnights.decks.TRADE.map((_, i) => ({
            id: `hidden-trade-${i}`,
            branch: 'TRADE' as const,
            type: 'MERCHANT' as const,
          })),
          POLITICS: state.citiesKnights.decks.POLITICS.map((_, i) => ({
            id: `hidden-pol-${i}`,
            branch: 'POLITICS' as const,
            type: 'SPY' as const,
          })),
          SCIENCE: state.citiesKnights.decks.SCIENCE.map((_, i) => ({
            id: `hidden-sci-${i}`,
            branch: 'SCIENCE' as const,
            type: 'ALCHEMIST' as const,
          })),
        },
      }
    : undefined;

  const sanitizedBarbariansState = state.barbarians
    ? {
        ...state.barbarians,
        fishDeck: state.barbarians.fishDeck.map((_, i) => ({
          id: `hidden-fishdeck-${i}`,
          fishCount: 1 as const,
        })),
        eventDeck: state.barbarians.eventDeck.map((_, i) => ({
          id: `hidden-evdeck-${i}`,
          numberToken: 7,
          dicePair: [3, 4] as [number, number],
          eventType: 'CALM_WORK' as const,
          title: 'Evento oculto',
          description: '',
        })),
        scenarioDevDeck: state.barbarians.scenarioDevDeck.map((_, i) => ({
          id: `hidden-scendev-${i}`,
          type: 'ARM_KNIGHT' as const,
          title: 'Carta oculta',
          description: '',
        })),
      }
    : undefined;

  const sanitizedEPState = state.explorersPirates
    ? {
        ...state.explorersPirates,
        unexploredSecrets: Object.fromEntries(
          Object.entries(state.explorersPirates.unexploredSecrets).map(([hid, secret]) => [
            hid,
            {
              region: secret.region,
              kind: 'SEA' as const,
              terrain: 'SEA' as const,
              numberToken: null,
            },
          ])
        ),
      }
    : undefined;

  const sanitizedBoard = state.board.fogDeck
    ? {
        ...state.board,
        fogDeck: state.board.fogDeck.map(() => ({ terrain: 'SEA' as const, numberToken: null })),
      }
    : state.board;

  return {
    ...state,
    board: sanitizedBoard,
    players: sanitizedPlayers,
    devDeck: sanitizedDevDeck,
    citiesKnights: sanitizedCKState,
    barbarians: sanitizedBarbariansState,
    explorersPirates: sanitizedEPState,
  };
}
