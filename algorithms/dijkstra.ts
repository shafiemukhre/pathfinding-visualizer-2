import { NodeData } from '../types';

/**
 * Performs Dijkstra's algorithm on a grid.
 * Returns all visited nodes in the order they were visited,
 * and the nodes forming the shortest path.
 */
export const dijkstra = (
  grid: NodeData[][],
  startNode: NodeData,
  finishNode: NodeData
): { visitedNodesInOrder: NodeData[]; nodesInShortestPathOrder: NodeData[] } => {
  const visitedNodesInOrder: NodeData[] = [];
  startNode.distance = 0;
  
  // Use an array as a priority queue (min-heap structure would be O(log N), array sort is O(N log N))
  // For grid sizes used here, this is performant enough and much faster than sorting ALL nodes.
  const openSet: NodeData[] = [startNode];

  while (openSet.length > 0) {
    // Sort nodes by distance to simulate Priority Queue
    sortNodesByDistance(openSet);
    
    const closestNode = openSet.shift();
    if (!closestNode) break;

    if (closestNode.isWall) continue;

    // If the closest node is at a distance of infinity,
    // we must be trapped and should therefore stop.
    if (closestNode.distance === Infinity) {
      return { visitedNodesInOrder, nodesInShortestPathOrder: [] };
    }

    // Skip if we've already processed this node
    if (closestNode.isVisited) continue;

    closestNode.isVisited = true;
    visitedNodesInOrder.push(closestNode);

    // If we reached the finish node, we are done!
    if (closestNode === finishNode) {
      const nodesInShortestPathOrder = getNodesInShortestPathOrder(finishNode);
      return { visitedNodesInOrder, nodesInShortestPathOrder };
    }

    updateUnvisitedNeighbors(closestNode, grid, openSet);
  }

  return { visitedNodesInOrder, nodesInShortestPathOrder: [] };
};

function sortNodesByDistance(unvisitedNodes: NodeData[]) {
  unvisitedNodes.sort((nodeA, nodeB) => nodeA.distance - nodeB.distance);
}

function updateUnvisitedNeighbors(node: NodeData, grid: NodeData[][], openSet: NodeData[]) {
  const unvisitedNeighbors = getUnvisitedNeighbors(node, grid);
  for (const neighbor of unvisitedNeighbors) {
    const newDistance = node.distance + 1;
    
    if (newDistance < neighbor.distance) {
      neighbor.distance = newDistance;
      neighbor.previousNode = node;
      
      // Add to openSet if not already present
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

function getNodesInShortestPathOrder(finishNode: NodeData): NodeData[] {
  const nodesInShortestPathOrder: NodeData[] = [];
  let currentNode: NodeData | null = finishNode;
  while (currentNode !== null) {
    nodesInShortestPathOrder.unshift(currentNode);
    currentNode = currentNode.previousNode;
  }
  return nodesInShortestPathOrder;
}