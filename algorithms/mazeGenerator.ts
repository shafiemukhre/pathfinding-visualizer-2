import { NodeData } from '../types';

export const generateRandomMaze = (
  grid: NodeData[][],
): NodeData[][] => {
  // Create a fresh copy of the grid with no walls first to ensure we don't just add to existing walls
  const newGrid = grid.map(row => 
    row.map(node => ({
      ...node,
      isWall: false,
      isVisited: false,
      distance: Infinity,
      totalDistance: Infinity,
      heuristicDistance: Infinity,
      previousNode: null
    }))
  );

  // Randomly assign walls
  // Density of 0.3 (30%) usually provides a good balance of obstacles without blocking too many paths completely
  const WALL_DENSITY = 0.3;

  for (let row = 0; row < newGrid.length; row++) {
    for (let col = 0; col < newGrid[0].length; col++) {
      const node = newGrid[row][col];
      // Never overwrite start or finish nodes
      if (node.isStart || node.isFinish) continue;

      if (Math.random() < WALL_DENSITY) {
        node.isWall = true;
      }
    }
  }

  return newGrid;
};