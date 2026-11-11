import { BoardState, PlayerState } from '../types';

export interface LongestRoadResult {
  length: number;
  edgeIds: string[];
}

/**
 * Computes the longest continuous road (or ship route) for a given player using DFS/backtracking.
 * Respects official Catan rules:
 * - An opponent's settlement/city on a vertex blocks the road from continuing *through* that vertex.
 * - No edge may be used twice.
 * - Cannot pass through the same intermediate vertex twice (allows a simple closed cycle to end at startVertex).
 */
export function calculatePlayerLongestRoad(
  board: BoardState,
  playerId: string,
  coastConnectionMode: 'REQUIRE_SETTLEMENT' | 'FREE_CONNECTION' = 'REQUIRE_SETTLEMENT'
): LongestRoadResult {
  const playerEdges = Object.values(board.edges).filter(
    (e) => e.playerId === playerId && e.building !== null
  );

  if (playerEdges.length === 0) {
    return { length: 0, edgeIds: [] };
  }

  const playerEdgeSet = new Set(playerEdges.map((e) => e.id));

  // Collect all vertices touched by this player's edges
  const startVertices = new Set<string>();
  for (const edge of playerEdges) {
    startVertices.add(edge.vertexIds[0]);
    startVertices.add(edge.vertexIds[1]);
  }

  let bestEdgeIds: string[] = [];

  const visitedEdges = new Set<string>();
  const visitedIntermediateVertices = new Set<string>();

  function dfs(currentVertexId: string, currentPath: string[]): void {
    if (currentPath.length > bestEdgeIds.length) {
      bestEdgeIds = [...currentPath];
    }

    const vertex = board.vertices[currentVertexId];
    if (!vertex) return;

    // If we just arrived at currentVertexId via an edge (currentPath.length > 0):
    // 1. Check if an opponent's building blocks continuation through this vertex
    if (currentPath.length > 0) {
      if (vertex.knight && vertex.knight.playerId !== playerId || vertex.building !== null && vertex.playerId !== null && vertex.playerId !== playerId) {
        return; // Blocked by enemy settlement/city!
      }
      // 2. If this vertex was already used as an intermediate vertex (or we looped back to start), we cannot continue further through it
      if (visitedIntermediateVertices.has(currentVertexId)) {
        return;
      }
    }

    visitedIntermediateVertices.add(currentVertexId);

    for (const edgeId of vertex.adjacentEdgeIds) {
      if (!playerEdgeSet.has(edgeId) || visitedEdges.has(edgeId)) {
        continue;
      }

      const edge = board.edges[edgeId];
      if (!edge) continue;

      // In Seafarers: Transition between ROAD and SHIP requires player's settlement/city at currentVertexId
      // (Unless the room has enabled the 'FREE_CONNECTION' variant)
      if (currentPath.length > 0) {
        const prevEdgeId = currentPath[currentPath.length - 1];
        const prevEdge = board.edges[prevEdgeId];
        if (prevEdge && prevEdge.building !== edge.building) {
          if (coastConnectionMode !== 'FREE_CONNECTION') {
            const hasOwnBuilding = vertex.building !== null && vertex.playerId === playerId;
            if (!hasOwnBuilding) {
              continue;
            }
          }
        }
      }

      const nextVertexId =
        edge.vertexIds[0] === currentVertexId ? edge.vertexIds[1] : edge.vertexIds[0];

      visitedEdges.add(edgeId);
      currentPath.push(edgeId);

      dfs(nextVertexId, currentPath);

      currentPath.pop();
      visitedEdges.delete(edgeId);
    }

    visitedIntermediateVertices.delete(currentVertexId);
  }

  for (const vId of startVertices) {
    visitedEdges.clear();
    visitedIntermediateVertices.clear();
    dfs(vId, []);
  }

  return {
    length: bestEdgeIds.length,
    edgeIds: bestEdgeIds,
  };
}

/**
 * Updates all players' longestRoadLength and returns the holder of the Gran Ruta Comercial award.
 */
export function updateLongestRoadAward(
  board: BoardState,
  players: PlayerState[],
  currentHolderId: string | null,
  coastConnectionMode: 'REQUIRE_SETTLEMENT' | 'FREE_CONNECTION' = 'REQUIRE_SETTLEMENT'
): string | null {
  let maxLen = 0;

  for (const player of players) {
    const res = calculatePlayerLongestRoad(board, player.id, coastConnectionMode);
    player.longestRoadLength = res.length;
    player.longestRoadEdgeIds = res.edgeIds;
    if (res.length > maxLen) {
      maxLen = res.length;
    }
  }

  if (maxLen < 5) {
    return null;
  }

  const topPlayers = players.filter((p) => p.longestRoadLength === maxLen);

  // If current holder is among the top players with >= 5, they keep it
  if (currentHolderId && topPlayers.some((p) => p.id === currentHolderId)) {
    return currentHolderId;
  }

  // If a single player strictly holds the maximum length >= 5, they get it
  if (topPlayers.length === 1) {
    return topPlayers[0].id;
  }

  // Official rule: if previous holder's road was broken and 2+ players tie for maxLen >= 5, nobody holds it until broken
  return null;
}

