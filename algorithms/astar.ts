import { NodeData } from '../types';

export const astar = (
  grid: NodeData[][],
  startNode: NodeData,
  finishNode: NodeData
): { visitedNodesInOrder: NodeData[]; nodesInShortestPathOrder: NodeData[] } => {
  const visitedNodesInOrder: NodeData[] = [];
  startNode.distance = 0;
  startNode.heuristicDistance = getManhattanDistance(startNode, finishNode);
  startNode.totalDistance = startNode.distance + startNode.heuristicDistance;

  // Use an array as a priority queue
  const openSet: NodeData[] = [startNode];

  while (openSet.length > 0) {
    // Sort by totalDistance (f-score), then heuristicDistance (h-score) for tie-breaking
    sortNodesByTotalDistance(openSet);
    
    const closestNode = openSet.shift();
    if (!closestNode) break;

    if (closestNode.isWall) continue;

    // If we've already visited this node (closed set check), skip
    // Note: In this grid implementation, checking isVisited is sufficient for monotone heuristics
    if (closestNode.isVisited) continue;

    closestNode.isVisited = true;
    visitedNodesInOrder.push(closestNode);

    if (closestNode === finishNode) {
      const nodesInShortestPathOrder = getNodesInShortestPathOrder(finishNode);
      return { visitedNodesInOrder, nodesInShortestPathOrder };
    }

    updateUnvisitedNeighbors(closestNode, finishNode, grid, openSet);
  }

  return { visitedNodesInOrder, nodesInShortestPathOrder: [] };
};

function sortNodesByTotalDistance(nodes: NodeData[]) {
  nodes.sort((nodeA, nodeB) => {
    if (nodeA.totalDistance === nodeB.totalDistance) {
      return nodeA.heuristicDistance - nodeB.heuristicDistance;
    }
    return nodeA.totalDistance - nodeB.totalDistance;
  });
}

function updateUnvisitedNeighbors(
  node: NodeData,
  finishNode: NodeData,
  grid: NodeData[][],
  openSet: NodeData[]
) {
  const unvisitedNeighbors = getUnvisitedNeighbors(node, grid);
  for (const neighbor of unvisitedNeighbors) {
    // Distance from start (g-score)
    const newDistance = node.distance + 1;
    
    // If we found a shorter path to neighbor, or it's not in open set (distance is Infinity)
    if (newDistance < neighbor.distance) {
       neighbor.distance = newDistance;
       neighbor.heuristicDistance = getManhattanDistance(neighbor, finishNode);
       neighbor.totalDistance = neighbor.distance + neighbor.heuristicDistance;
       neighbor.previousNode = node;
       
       // Add to open set if not already there
       // (In a strict binary heap we'd decrease key, here we just push and handle duplicates via isVisited check or simple duplicate check)
       if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
       }
    }
  }
}

function getUnvisitedNeighbors(node: NodeData, grid: NodeData[][]): NodeData[] {
  const neighbors: NodeData[] = [];
  const { col, row } = node;
  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
  return neighbors.filter((neighbor) => !neighbor.isVisited);
}

function getManhattanDistance(nodeA: NodeData, nodeB: NodeData): number {
  return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
}

function getNodesInShortestPathOrder(finishNode: NodeData): NodeData[] {
  const nodesInShortestPathOrder: NodeData[] = [];
  let currentNode: NodeData | null = finishNode;
  while (currentNode !== null) {
    nodesInShortestPathOrder.unshift(currentNode);
    currentNode = currentNode.previousNode;
  }
  return nodesInShortestPathOrder;
}
