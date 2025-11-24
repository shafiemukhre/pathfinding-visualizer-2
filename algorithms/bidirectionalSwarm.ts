import { NodeData } from '../types';

/**
 * Bidirectional Swarm (A*)
 * Runs two simultaneous A* searches from start and end.
 */

// Helper to generate ID
function getNodeId(node: NodeData): string {
    return `${node.row}-${node.col}`;
}

// Helper to calculate Manhattan distance
function getManhattanDistance(nodeA: NodeData, nodeB: NodeData): number {
  return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
}

// Helper to get neighbors (returns all valid grid neighbors, not just unvisited)
function getNeighbors(node: NodeData, grid: NodeData[][]): NodeData[] {
  const neighbors: NodeData[] = [];
  const { col, row } = node;
  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
  return neighbors;
}

// Helper to sort open set
function sortNodes(nodes: NodeData[], fScoreMap: Map<string, number>) {
    nodes.sort((a, b) => {
        const fA = fScoreMap.get(getNodeId(a)) ?? Infinity;
        const fB = fScoreMap.get(getNodeId(b)) ?? Infinity;
        return fA - fB;
    });
}

// Helper to handle the expansion logic
function updateNeighbor(
    neighbor: NodeData, 
    current: NodeData,
    gScoreMap: Map<string, number>, 
    fScoreMap: Map<string, number>, 
    visitedMap: Map<string, NodeData>,
    openSet: NodeData[],
    targetNode: NodeData
) {
    if (neighbor.isWall) return;
    
    const tentativeG = (gScoreMap.get(getNodeId(current)) ?? Infinity) + 1;
    const neighborId = getNodeId(neighbor);
    
    if (tentativeG < (gScoreMap.get(neighborId) ?? Infinity)) {
        visitedMap.set(neighborId, current);
        gScoreMap.set(neighborId, tentativeG);
        const h = getManhattanDistance(neighbor, targetNode);
        fScoreMap.set(neighborId, tentativeG + h);
        
        if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
        }
    }
}

function reconstructBidirectionalPath(
    meetingNode: NodeData,
    startParents: Map<string, NodeData>,
    finishParents: Map<string, NodeData>
): NodeData[] {
    const path: NodeData[] = [];
    
    // Backtrack to start
    let curr: NodeData | undefined = meetingNode;
    while (curr) {
        path.unshift(curr);
        curr = startParents.get(getNodeId(curr)); 
    }

    // Forward to finish (backtrack from meeting node using finishParents)
    // The meeting node is already in path, so start from its parent in finish map
    curr = finishParents.get(getNodeId(meetingNode));
    while (curr) {
        path.push(curr);
        curr = finishParents.get(getNodeId(curr));
    }

    return path;
}

export const bidirectionalSwarm = (
  grid: NodeData[][],
  startNode: NodeData,
  finishNode: NodeData
): { visitedNodesInOrder: NodeData[]; nodesInShortestPathOrder: NodeData[] } => {
  const visitedNodesInOrder: NodeData[] = [];
  const startOpenSet: NodeData[] = [startNode];
  const finishOpenSet: NodeData[] = [finishNode];

  const visitedByStart = new Map<string, NodeData>();
  const visitedByFinish = new Map<string, NodeData>();
  
  // Initialize roots in maps. 
  // We deliberately do not set a parent for roots to terminate reconstruction loop.
  // However, we need to mark them as visited (key existence).
  // We use 'undefined' as value for root parent in map to signify end of chain, but key must exist.
  // Using `null as any` or just checking key existence carefully.
  // Let's treat the value as "Parent Node". If value is undefined but key exists, it is root? 
  // No, Map.get returns undefined if key missing.
  // We'll store the node itself as parent for root? No, that loops.
  // We just won't put root in map? Then `updateNeighbor` puts it.
  // Actually: `visitedByStart` maps Child -> Parent.
  // Root has no parent. We can just add it to `visitedNodesInOrder`.
  // But we need to know it's visited.
  // Let's rely on `gScoreMap` for "visited/seen" check in `updateNeighbor`, 
  // but for intersection check we need a quick lookup.
  
  // Let's use a separate Set for fast existence check if we want, or just use the Map.
  // If we use Map, we need to store something for Root. Let's store `startNode` itself as a sentinel, 
  // and handle `curr === startNode` check in reconstruction.
  visitedByStart.set(getNodeId(startNode), startNode);
  visitedByFinish.set(getNodeId(finishNode), finishNode);

  const gScoreStart = new Map<string, number>();
  const gScoreFinish = new Map<string, number>();
  gScoreStart.set(getNodeId(startNode), 0);
  gScoreFinish.set(getNodeId(finishNode), 0);

  const fScoreStart = new Map<string, number>();
  const fScoreFinish = new Map<string, number>();
  fScoreStart.set(getNodeId(startNode), getManhattanDistance(startNode, finishNode));
  fScoreFinish.set(getNodeId(finishNode), getManhattanDistance(finishNode, startNode));

  while (startOpenSet.length > 0 && finishOpenSet.length > 0) {
    // --- Expand Start Side ---
    sortNodes(startOpenSet, fScoreStart);
    const currentStart = startOpenSet.shift()!;
    
    if (!currentStart.isWall) {
        // Visualizer tracking
        if (!currentStart.isVisited) {
            currentStart.isVisited = true;
            visitedNodesInOrder.push(currentStart);
        }

        // Intersection Check: Did Finish side already visit this?
        if (gScoreFinish.has(getNodeId(currentStart))) {
            return {
                visitedNodesInOrder,
                nodesInShortestPathOrder: reconstructBidirectionalPathRevisited(currentStart, visitedByStart, visitedByFinish, startNode, finishNode)
            };
        }

        const neighbors = getNeighbors(currentStart, grid);
        for (const neighbor of neighbors) {
            updateNeighbor(neighbor, currentStart, gScoreStart, fScoreStart, visitedByStart, startOpenSet, finishNode);
        }
    }

    // --- Expand Finish Side ---
    sortNodes(finishOpenSet, fScoreFinish);
    const currentFinish = finishOpenSet.shift()!;

    if (!currentFinish.isWall) {
        if (!currentFinish.isVisited) {
             currentFinish.isVisited = true;
             visitedNodesInOrder.push(currentFinish);
        }

        // Intersection Check: Did Start side already visit this?
        if (gScoreStart.has(getNodeId(currentFinish))) {
            return {
                visitedNodesInOrder,
                nodesInShortestPathOrder: reconstructBidirectionalPathRevisited(currentFinish, visitedByStart, visitedByFinish, startNode, finishNode)
            };
        }

        const neighbors = getNeighbors(currentFinish, grid);
        for (const neighbor of neighbors) {
            updateNeighbor(neighbor, currentFinish, gScoreFinish, fScoreFinish, visitedByFinish, finishOpenSet, startNode);
        }
    }
  }

  return { visitedNodesInOrder, nodesInShortestPathOrder: [] };
};

function reconstructBidirectionalPathRevisited(
    meetingNode: NodeData,
    startParents: Map<string, NodeData>,
    finishParents: Map<string, NodeData>,
    startNode: NodeData,
    finishNode: NodeData
): NodeData[] {
    const path: NodeData[] = [];
    
    // Backtrack to start
    let curr = meetingNode;
    while (curr !== startNode) {
        path.unshift(curr);
        const parent = startParents.get(getNodeId(curr));
        if (!parent) break; // Should not happen if logic is correct
        curr = parent;
    }
    path.unshift(startNode); // Add start

    // Forward to finish (backtrack from meeting node using finishParents)
    // meetingNode is already in path from above loop, so start from its parent
    curr = finishParents.get(getNodeId(meetingNode))!;
    while (curr && curr !== finishNode) {
        path.push(curr);
        curr = finishParents.get(getNodeId(curr))!;
    }
    if (curr === finishNode) path.push(finishNode);

    return path;
}
