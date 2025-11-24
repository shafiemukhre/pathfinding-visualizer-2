import { NodeData } from '../types';

export const greedyBfs = (
  grid: NodeData[][],
  startNode: NodeData,
  finishNode: NodeData
): { visitedNodesInOrder: NodeData[]; nodesInShortestPathOrder: NodeData[] } => {
  const visitedNodesInOrder: NodeData[] = [];
  startNode.distance = 0;
  startNode.heuristicDistance = getManhattanDistance(startNode, finishNode);
  
  const openSet: NodeData[] = [startNode];

  while (openSet.length > 0) {
    // Greedy BFS sorts primarily by heuristic distance to end
    sortNodesByHeuristic(openSet);
    
    const closestNode = openSet.shift();
    if (!closestNode) break;

    if (closestNode.isWall) continue;
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

function sortNodesByHeuristic(nodes: NodeData[]) {
  nodes.sort((nodeA, nodeB) => nodeA.heuristicDistance - nodeB.heuristicDistance);
}

function updateUnvisitedNeighbors(
  node: NodeData,
  finishNode: NodeData,
  grid: NodeData[][],
  openSet: NodeData[]
) {
  const unvisitedNeighbors = getUnvisitedNeighbors(node, grid);
  for (const neighbor of unvisitedNeighbors) {
     // For Greedy BFS, we just want to explore. We track distance for path reconstruction logic if needed,
     // but the priority is heuristic.
     if (neighbor.distance === Infinity) { // if not visited/seen
       neighbor.distance = node.distance + 1; // keep track of path length
       neighbor.heuristicDistance = getManhattanDistance(neighbor, finishNode);
       neighbor.previousNode = node;
       openSet.push(neighbor);
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
