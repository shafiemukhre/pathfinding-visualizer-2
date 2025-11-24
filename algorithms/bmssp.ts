import { NodeData } from '../types';

/**
 * Implementation of "Breaking the Sorting Barrier for Directed Single-Source Shortest Paths"
 * by Duan, Mao, Mao, Shu, Yin (2025).
 * 
 * This algorithm uses a divide-and-conquer approach on distances to solve SSSP 
 * in O(m log^(2/3) n) time, theoretically faster than Dijkstra's O(m + n log n) on sparse graphs.
 * 
 * Adapted for grid visualization.
 */

// --- Helpers ---

function getAllNodes(grid: NodeData[][]): NodeData[] {
  const nodes: NodeData[] = [];
  for (const row of grid) {
    for (const node of row) {
      nodes.push(node);
    }
  }
  return nodes;
}

function getNeighbors(node: NodeData, grid: NodeData[][]): NodeData[] {
  const neighbors: NodeData[] = [];
  const { col, row } = node;
  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
  return neighbors.filter(n => !n.isWall);
}

// --- Data Structures ---

// Simplified Min-Heap for BaseCase
class MinHeap {
  elements: { node: NodeData, dist: number }[] = [];

  push(node: NodeData, dist: number) {
    this.elements.push({ node, dist });
    this.bubbleUp(this.elements.length - 1);
  }

  pop(): { node: NodeData, dist: number } | undefined {
    if (this.elements.length === 0) return undefined;
    const min = this.elements[0];
    const end = this.elements.pop();
    if (this.elements.length > 0 && end) {
      this.elements[0] = end;
      this.bubbleDown(0);
    }
    return min;
  }

  isEmpty() {
    return this.elements.length === 0;
  }

  contains(node: NodeData) {
    return this.elements.some(e => e.node === node);
  }

  decreaseKey(node: NodeData, dist: number) {
    const idx = this.elements.findIndex(e => e.node === node);
    if (idx !== -1 && dist < this.elements[idx].dist) {
      this.elements[idx].dist = dist;
      this.bubbleUp(idx);
    }
  }

  private bubbleUp(n: number) {
    const element = this.elements[n];
    while (n > 0) {
      const parentIdx = Math.floor((n + 1) / 2) - 1;
      const parent = this.elements[parentIdx];
      if (element.dist >= parent.dist) break;
      this.elements[parentIdx] = element;
      this.elements[n] = parent;
      n = parentIdx;
    }
  }

  private bubbleDown(n: number) {
    const length = this.elements.length;
    const element = this.elements[n];
    while (true) {
      const child2N = (n + 1) * 2;
      const child1N = child2N - 1;
      let swap = null;
      if (child1N < length) {
        const child1 = this.elements[child1N];
        if (child1.dist < element.dist) swap = child1N;
      }
      if (child2N < length) {
        const child2 = this.elements[child2N];
        if (child2.dist < (swap === null ? element.dist : this.elements[child1N].dist)) swap = child2N;
      }
      if (swap === null) break;
      this.elements[n] = this.elements[swap];
      this.elements[swap] = element;
      n = swap;
    }
  }
}

// Structure D from Lemma 3.3
// Simulates the Insert, Pull, BatchPrepend operations.
class StructureD {
  private items: { node: NodeData, val: number }[] = [];
  private M: number = 0;
  private B: number = Infinity;

  initialize(M: number, B: number) {
    this.items = [];
    this.M = M;
    this.B = B;
  }

  insert(node: NodeData, val: number) {
    // Update existing if better
    const existingIdx = this.items.findIndex(i => i.node === node);
    if (existingIdx !== -1) {
      if (this.items[existingIdx].val > val) {
        this.items.splice(existingIdx, 1);
      } else {
        return; 
      }
    }
    
    // Binary insertion to keep sorted
    let low = 0, high = this.items.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.items[mid].val < val) low = mid + 1;
      else high = mid;
    }
    this.items.splice(low, 0, { node, val });
  }

  pull(): { Bi: number, Si: NodeData[] } {
    if (this.items.length === 0) {
      return { Bi: this.B, Si: [] };
    }

    const count = Math.min(this.items.length, this.M);
    const subset = this.items.splice(0, count);
    
    let Bi: number;
    if (this.items.length === 0) {
      Bi = this.B;
    } else {
      Bi = this.items[0].val;
    }

    return { Bi, Si: subset.map(i => i.node) };
  }

  batchPrepend(items: { node: NodeData, val: number }[]) {
    for (const item of items) {
       this.insert(item.node, item.val);
    }
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

// --- Global Context for Algorithm execution ---
let k_param: number;
let t_param: number;
let visitedNodesInOrder: NodeData[] = [];
let gridRef: NodeData[][];

// --- Algorithm Modules ---

// Algorithm 1: Finding Pivots
function findPivots(B: number, S: NodeData[]): { P: NodeData[], W: NodeData[] } {
  let W = new Set<NodeData>(S);
  let W_prev = new Set<NodeData>(S);
  let W_list = [...S];

  for (let i = 0; i < k_param; i++) {
    const W_curr = new Set<NodeData>();
    
    for (const u of W_prev) {
      const neighbors = getNeighbors(u, gridRef);
      for (const v of neighbors) {
        const weight = 1; 
        // Relaxation check
        if (u.distance + weight <= v.distance) {
          v.distance = u.distance + weight;
          v.previousNode = u;
          
          if (!v.isVisited) {
             // Add to animation list for visualization purposes ("scanning")
             // We don't mark isVisited true yet to allow proper re-visitation in BaseCase
             // But we push to array to show activity
             visitedNodesInOrder.push(v);
          }

          if (v.distance < B) {
            W_curr.add(v);
          }
        }
      }
    }

    for (const node of W_curr) {
      if (!W.has(node)) {
        W.add(node);
        W_list.push(node);
      }
    }

    if (W.size > k_param * S.length) {
       return { P: S, W: W_list };
    }

    W_prev = W_curr;
    if (W_curr.size === 0) break;
  }

  return { P: S, W: W_list }; 
}

// Algorithm 2: Base Case (Mini Dijkstra)
function baseCase(B: number, S: NodeData[]): { boundary: number, U: NodeData[] } {
  const U0 = new Set<NodeData>(S);
  const heap = new MinHeap();
  
  for (const node of S) {
    heap.push(node, node.distance);
  }

  // Upper bound for mini-dijkstra iterations
  while (!heap.isEmpty() && U0.size < k_param + 1) {
    const min = heap.pop();
    if (!min) break;
    const { node: u, dist } = min;

    if (dist >= B) break;

    U0.add(u);
    
    if (!u.isVisited) {
        u.isVisited = true;
        visitedNodesInOrder.push(u);
    }

    const neighbors = getNeighbors(u, gridRef);
    for (const v of neighbors) {
      const weight = 1;
      if (u.distance + weight <= v.distance && u.distance + weight < B) {
        v.distance = u.distance + weight;
        v.previousNode = u;
        
        visitedNodesInOrder.push(v);

        if (heap.contains(v)) {
          heap.decreaseKey(v, v.distance);
        } else {
          heap.push(v, v.distance);
        }
      }
    }
  }

  if (U0.size <= k_param) {
    return { boundary: B, U: Array.from(U0) };
  } else {
    let maxDist = 0;
    for (const node of U0) if (node.distance > maxDist && node.distance !== Infinity) maxDist = node.distance;
    
    const U_res = Array.from(U0).filter(n => n.distance < maxDist);
    return { boundary: maxDist, U: U_res };
  }
}

// Algorithm 3: BMSSP Recursive
function bmsspRecursive(l: number, B: number, S: NodeData[]): { boundary: number, U: NodeData[] } {
  if (l === 0) {
    return baseCase(B, S);
  }

  const { P, W } = findPivots(B, S);

  const D = new StructureD();
  const M = Math.pow(2, (l - 1) * t_param); 
  D.initialize(M, B);

  for (const x of P) {
    D.insert(x, x.distance);
  }

  let B_prime = Infinity;
  for (const x of P) if (x.distance < B_prime) B_prime = x.distance;
  if (P.length === 0) B_prime = B;
  
  let U = new Set<NodeData>();

  const sizeLimit = k_param * Math.pow(2, l * t_param);

  while (U.size < sizeLimit && !D.isEmpty()) {
    const { Bi, Si } = D.pull();

    const result = bmsspRecursive(l - 1, Bi, Si);
    const B_prime_i = result.boundary;
    const Ui = result.U;

    for (const node of Ui) {
      U.add(node);
      if (!node.isVisited) {
        node.isVisited = true;
        visitedNodesInOrder.push(node);
      }
    }

    const K: { node: NodeData, val: number }[] = [];

    for (const u of Ui) {
      const neighbors = getNeighbors(u, gridRef);
      for (const v of neighbors) {
        const weight = 1;
        if (u.distance + weight <= v.distance) {
          v.distance = u.distance + weight;
          v.previousNode = u;
          
          const newDist = v.distance;

          if (newDist >= Bi && newDist < B) {
            D.insert(v, newDist);
          }
          else if (newDist >= B_prime_i && newDist < Bi) {
            K.push({ node: v, val: newDist });
          }
        }
      }
    }

    const prependList = [...K];
    for (const x of Si) {
      if (x.distance >= B_prime_i && x.distance < Bi) {
        prependList.push({ node: x, val: x.distance });
      }
    }
    D.batchPrepend(prependList);

    B_prime = Math.min(B_prime_i, B);
  }

  for (const x of W) {
    if (x.distance < B_prime) {
      U.add(x);
      if (!x.isVisited) {
        x.isVisited = true;
        visitedNodesInOrder.push(x);
      }
    }
  }

  return { boundary: B_prime, U: Array.from(U) };
}

// --- Main Export ---

export const bmssp = (
  grid: NodeData[][],
  startNode: NodeData,
  finishNode: NodeData
): { visitedNodesInOrder: NodeData[]; nodesInShortestPathOrder: NodeData[] } => {
  visitedNodesInOrder = [];
  gridRef = grid;

  const allNodes = getAllNodes(grid);
  for (const node of allNodes) {
    node.distance = Infinity;
    node.isVisited = false;
    node.previousNode = null;
  }
  startNode.distance = 0;

  const N = allNodes.length;
  
  // Calculate parameters based on graph size N
  k_param = Math.floor(Math.pow(Math.log2(N), 1/3));
  if (k_param < 2) k_param = 2; 
  
  t_param = Math.floor(Math.pow(Math.log2(N), 2/3));
  if (t_param < 2) t_param = 2;

  const l = Math.ceil(Math.log2(N) / t_param);

  // Execute BMSSP from top level
  bmsspRecursive(l, Infinity, [startNode]);

  // Path Reconstruction
  const nodesInShortestPathOrder: NodeData[] = [];
  let currentNode: NodeData | null = finishNode;
  
  if (finishNode.distance !== Infinity) {
    while (currentNode !== null) {
      nodesInShortestPathOrder.unshift(currentNode);
      currentNode = currentNode.previousNode;
    }
  }

  return { visitedNodesInOrder, nodesInShortestPathOrder };
};