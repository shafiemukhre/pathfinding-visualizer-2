export interface NodeData {
  row: number;
  col: number;
  isStart: boolean;
  isFinish: boolean;
  distance: number;
  isVisited: boolean;
  isWall: boolean;
  previousNode: NodeData | null;
  totalDistance: number;
  heuristicDistance: number;
}

export interface GridStats {
  visitedNodes: number;
  shortestPathLength: number;
  timeTaken: number;
}

export interface HistoryEntry extends GridStats {
  id: string;
  algorithm: string;
  timeStart: string;
  timeEnd: string;
  duration: number;
  shortestPathFound: boolean;
  snapshot: string;
  date: string;
}

export type DraggingState = 'start' | 'finish' | 'wall' | null;
export type AlgorithmType = 'dijkstra' | 'astar' | 'greedyBfs' | 'bidirectionalSwarm' | 'bmssp';