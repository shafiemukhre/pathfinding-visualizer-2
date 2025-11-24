import React, { useState, useEffect, useCallback, useRef } from 'react';
import Node from './Node';
import InfoModal from './InfoModal';
import { dijkstra } from '../algorithms/dijkstra';
import { astar } from '../algorithms/astar';
import { greedyBfs } from '../algorithms/greedyBfs';
import { bidirectionalSwarm } from '../algorithms/bidirectionalSwarm';
import { bmssp } from '../algorithms/bmssp';
import { generateRandomMaze } from '../algorithms/mazeGenerator';
import { NodeData, GridStats, DraggingState, AlgorithmType, HistoryEntry } from '../types';
import {
  GRID_ROWS,
  GRID_COLS,
  DEFAULT_START_ROW,
  DEFAULT_START_COL,
  DEFAULT_FINISH_ROW,
  DEFAULT_FINISH_COL,
  ANIMATION_SPEED_MS,
  SHORTEST_PATH_SPEED_MS
} from '../constants';

const PathfindingVisualizer: React.FC = () => {
  const [grid, setGrid] = useState<NodeData[][]>([]);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [stats, setStats] = useState<GridStats | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>('dijkstra');
  const [startNodePos, setStartNodePos] = useState({ row: DEFAULT_START_ROW, col: DEFAULT_START_COL });
  const [finishNodePos, setFinishNodePos] = useState({ row: DEFAULT_FINISH_ROW, col: DEFAULT_FINISH_COL });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  
  // Refs for live updates to avoid re-renders during animation
  const visitedCountRef = useRef<HTMLSpanElement>(null);
  const pathCountRef = useRef<HTMLSpanElement>(null);
  const timeValueRef = useRef<HTMLSpanElement>(null);
  const timeUnitRef = useRef<HTMLSpanElement>(null);
  const stopwatchRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  
  // Interaction State
  const [isMousePressed, setIsMousePressed] = useState(false);
  const [draggingState, setDraggingState] = useState<DraggingState>(null);

  // Initialize grid and load history
  useEffect(() => {
    const initialGrid = getInitialGrid(startNodePos, finishNodePos);
    setGrid(initialGrid);

    const savedHistory = localStorage.getItem('pathfinder_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to create the grid
  const getInitialGrid = (
    startPos: { row: number; col: number },
    finishPos: { row: number; col: number }
  ): NodeData[][] => {
    const newGrid = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      const currentRow = [];
      for (let col = 0; col < GRID_COLS; col++) {
        currentRow.push(createNode(col, row, startPos, finishPos));
      }
      newGrid.push(currentRow);
    }
    return newGrid;
  };

  const createNode = (
    col: number,
    row: number,
    startPos: { row: number; col: number },
    finishPos: { row: number; col: number }
  ): NodeData => {
    return {
      col,
      row,
      isStart: row === startPos.row && col === startPos.col,
      isFinish: row === finishPos.row && col === finishPos.col,
      distance: Infinity,
      totalDistance: Infinity,
      heuristicDistance: Infinity,
      isVisited: false,
      isWall: false,
      previousNode: null,
    };
  };

  // Helper to generate a snapshot image of the grid state
  const generateSnapshot = (
    currentGrid: NodeData[][], 
    visitedNodes: NodeData[], 
    pathNodes: NodeData[]
  ): string => {
    const canvas = document.createElement('canvas');
    const scale = 4; // Scale down factor to keep image size reasonable
    canvas.width = GRID_COLS * scale;
    canvas.height = GRID_ROWS * scale;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    // Background
    ctx.fillStyle = '#0f172a'; // slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Walls
    ctx.fillStyle = '#64748b'; // slate-500
    currentGrid.forEach(row => row.forEach(node => {
      if (node.isWall) ctx.fillRect(node.col * scale, node.row * scale, scale, scale);
    }));

    // Draw Visited
    ctx.fillStyle = 'rgba(99, 102, 241, 0.6)'; // indigo-500
    visitedNodes.forEach(node => {
      if (!node.isStart && !node.isFinish) {
        ctx.fillRect(node.col * scale, node.row * scale, scale, scale);
      }
    });

    // Draw Path
    ctx.fillStyle = '#f59e0b'; // amber-500
    pathNodes.forEach(node => {
      if (!node.isStart && !node.isFinish) {
        ctx.fillRect(node.col * scale, node.row * scale, scale, scale);
      }
    });

    // Draw Start
    ctx.fillStyle = '#22c55e'; // green-500
    currentGrid.forEach(row => row.forEach(node => {
      if (node.isStart) ctx.fillRect(node.col * scale, node.row * scale, scale, scale);
    }));

    // Draw Finish
    ctx.fillStyle = '#ef4444'; // red-500
    currentGrid.forEach(row => row.forEach(node => {
      if (node.isFinish) ctx.fillRect(node.col * scale, node.row * scale, scale, scale);
    }));

    return canvas.toDataURL('image/png');
  };

  // Helper to format high-precision timestamps
  const formatTimestamp = (date: Date) => {
    const timeString = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeString}.${ms}`;
  };

  // Handle Mouse Interactions
  const handleMouseDown = (row: number, col: number) => {
    if (isVisualizing) return;

    setIsMousePressed(true);
    const node = grid[row][col];

    if (node.isStart) {
      setDraggingState('start');
    } else if (node.isFinish) {
      setDraggingState('finish');
    } else {
      // Toggle Wall
      setDraggingState('wall');
      const newGrid = toggleWall(grid, row, col);
      setGrid(newGrid);
    }
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!isMousePressed || isVisualizing) return;

    if (draggingState === 'start') {
       if (row === finishNodePos.row && col === finishNodePos.col) return;
       const newStartPos = { row, col };
       setStartNodePos(newStartPos);
       setGrid(updateNodePositions(grid, newStartPos, finishNodePos));
    } else if (draggingState === 'finish') {
       if (row === startNodePos.row && col === startNodePos.col) return;
       const newFinishPos = { row, col };
       setFinishNodePos(newFinishPos);
       setGrid(updateNodePositions(grid, startNodePos, newFinishPos));
    } else if (draggingState === 'wall') {
       const node = grid[row][col];
       if (node.isStart || node.isFinish) return;
       const newGrid = toggleWall(grid, row, col);
       setGrid(newGrid);
    }
  };

  const handleMouseUp = () => {
    setIsMousePressed(false);
    setDraggingState(null);
  };

  // Update Grid helpers
  const updateNodePositions = (
    currentGrid: NodeData[][],
    startPos: { row: number; col: number },
    finishPos: { row: number; col: number }
  ) => {
    const newGrid = currentGrid.slice();
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const node = newGrid[row][col];
        const isStart = row === startPos.row && col === startPos.col;
        const isFinish = row === finishPos.row && col === finishPos.col;
        
        if (node.isStart !== isStart || node.isFinish !== isFinish) {
           newGrid[row][col] = { ...node, isStart, isFinish };
        }
      }
    }
    return newGrid;
  };

  const toggleWall = (currentGrid: NodeData[][], row: number, col: number) => {
    const newGrid = currentGrid.slice();
    const node = newGrid[row][col];
    newGrid[row][col] = {
      ...node,
      isWall: !node.isWall,
    };
    return newGrid;
  };

  // Visualization Logic
  const resetVisuals = () => {
    // Clear DOM classes
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const node = document.getElementById(`node-${row}-${col}`);
        if (node) {
          node.classList.remove('node-visited', 'node-shortest-path');
        }
      }
    }
    // Reset Grid Data (keep walls)
    const freshGrid = grid.map(row => 
      row.map(node => ({
        ...node,
        distance: Infinity,
        totalDistance: Infinity,
        heuristicDistance: Infinity,
        isVisited: false,
        previousNode: null
      }))
    );
    setGrid(freshGrid);
    return freshGrid;
  };

  const handleGenerateMaze = () => {
    if (isVisualizing) return;
    resetVisuals();
    const newGrid = generateRandomMaze(grid);
    setGrid(newGrid);
    setStats(null);
    resetCounters();
  };

  const resetCounters = () => {
    if (visitedCountRef.current) visitedCountRef.current.innerText = "0";
    if (pathCountRef.current) pathCountRef.current.innerText = "0";
    if (timeValueRef.current) timeValueRef.current.innerText = "0.00";
    if (timeUnitRef.current) timeUnitRef.current.innerText = " s";
  };

  const addToHistory = (entry: HistoryEntry) => {
    const updatedHistory = [entry, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('pathfinder_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('pathfinder_history');
  };

  const updateStopwatch = () => {
    if (timeValueRef.current) {
      const now = Date.now();
      const elapsedSeconds = (now - startTimeRef.current) / 1000;
      timeValueRef.current.innerText = elapsedSeconds.toFixed(2);
    }
    stopwatchRef.current = requestAnimationFrame(updateStopwatch);
  };

  const runAlgorithm = () => {
    if (isVisualizing) return;
    setIsVisualizing(true);
    setStats(null);

    // Reset counters in DOM
    resetCounters();
    
    // Start Stopwatch
    startTimeRef.current = Date.now();
    cancelAnimationFrame(stopwatchRef.current);
    stopwatchRef.current = requestAnimationFrame(updateStopwatch);

    const cleanGrid = resetVisuals();
    
    const startNode = cleanGrid[startNodePos.row][startNodePos.col];
    const finishNode = cleanGrid[finishNodePos.row][finishNodePos.col];

    // Timestamps for Algorithm Execution
    const startTimestamp = new Date();
    const startTimePerf = performance.now();
    
    let result;
    switch (selectedAlgorithm) {
      case 'dijkstra':
        result = dijkstra(cleanGrid, startNode, finishNode);
        break;
      case 'astar':
        result = astar(cleanGrid, startNode, finishNode);
        break;
      case 'greedyBfs':
        result = greedyBfs(cleanGrid, startNode, finishNode);
        break;
      case 'bidirectionalSwarm':
        result = bidirectionalSwarm(cleanGrid, startNode, finishNode);
        break;
      case 'bmssp':
        result = bmssp(cleanGrid, startNode, finishNode);
        break;
      default:
        result = dijkstra(cleanGrid, startNode, finishNode);
    }

    const endTimePerf = performance.now();
    const endTimestamp = new Date();
    const durationSeconds = (endTimePerf - startTimePerf) / 1000; // Compute duration
    const executionTimeMs = endTimePerf - startTimePerf;

    // Verify Shortest Path (Ground Truth Calculation)
    const verifyGrid = getInitialGrid(startNodePos, finishNodePos);
    // Copy walls
    for(let r=0; r<GRID_ROWS; r++){
        for(let c=0; c<GRID_COLS; c++){
            if(grid[r][c].isWall) verifyGrid[r][c].isWall = true;
        }
    }
    const verifyStart = verifyGrid[startNodePos.row][startNodePos.col];
    const verifyFinish = verifyGrid[finishNodePos.row][finishNodePos.col];
    const groundTruth = dijkstra(verifyGrid, verifyStart, verifyFinish);
    
    const foundPathLength = result.nodesInShortestPathOrder.length;
    const optimalPathLength = groundTruth.nodesInShortestPathOrder.length;
    
    // Check if lengths match (allow for 0 if both failed)
    const isOptimal = foundPathLength === optimalPathLength || (foundPathLength === 0 && optimalPathLength === 0);

    // Generate Snapshot
    const snapshot = generateSnapshot(grid, result.visitedNodesInOrder, result.nodesInShortestPathOrder);

    animateAlgorithm(
        result.visitedNodesInOrder, 
        result.nodesInShortestPathOrder, 
        executionTimeMs, 
        startTimestamp, 
        endTimestamp, 
        durationSeconds, 
        isOptimal,
        snapshot
    );
  };

  const animateAlgorithm = (
    visitedNodesInOrder: NodeData[],
    nodesInShortestPathOrder: NodeData[],
    executionTimeMs: number,
    startTimestamp: Date,
    endTimestamp: Date,
    durationSeconds: number,
    shortestPathFound: boolean,
    snapshot: string
  ) => {
    // Speed adjustment for smoother large visualizations
    const speed = selectedAlgorithm === 'bidirectionalSwarm' ? ANIMATION_SPEED_MS * 0.8 : ANIMATION_SPEED_MS;

    for (let i = 0; i <= visitedNodesInOrder.length; i++) {
      if (i === visitedNodesInOrder.length) {
        setTimeout(() => {
          animateShortestPath(
              nodesInShortestPathOrder,
              executionTimeMs,
              startTimestamp,
              endTimestamp,
              durationSeconds,
              shortestPathFound,
              snapshot,
              visitedNodesInOrder.length
          );
        }, speed * i);
        return;
      }
      setTimeout(() => {
        const node = visitedNodesInOrder[i];
        if (!node.isStart && !node.isFinish) {
            document.getElementById(`node-${node.row}-${node.col}`)?.classList.add('node-visited');
        }
        // Live update of visited count
        if (visitedCountRef.current) {
            visitedCountRef.current.innerText = (i + 1).toString();
        }
      }, speed * i);
    }
  };

  const animateShortestPath = (
      nodesInShortestPathOrder: NodeData[],
      executionTimeMs: number,
      startTimestamp: Date,
      endTimestamp: Date,
      durationSeconds: number,
      shortestPathFound: boolean,
      snapshot: string,
      finalVisitedCount: number
  ) => {
    for (let i = 0; i <= nodesInShortestPathOrder.length; i++) {
      if (i === nodesInShortestPathOrder.length) {
          setTimeout(() => {
              // Stop stopwatch and show actual algorithm time
              cancelAnimationFrame(stopwatchRef.current);
              
              const finalTime = Date.now();
              const totalVisualTimeSeconds = (finalTime - startTimeRef.current) / 1000;

              if (timeUnitRef.current) timeUnitRef.current.innerText = " s";
              if (timeValueRef.current) timeValueRef.current.innerText = totalVisualTimeSeconds.toFixed(2);
              
              const newStats: GridStats = {
                visitedNodes: finalVisitedCount,
                shortestPathLength: nodesInShortestPathOrder.length,
                timeTaken: totalVisualTimeSeconds
              };
              setStats(newStats);
              
              addToHistory({
                  id: Date.now().toString(),
                  algorithm: formatAlgorithmName(selectedAlgorithm),
                  ...newStats,
                  timeStart: formatTimestamp(startTimestamp),
                  timeEnd: formatTimestamp(endTimestamp),
                  duration: durationSeconds, // Store raw compute time
                  shortestPathFound,
                  snapshot,
                  date: startTimestamp.toLocaleDateString()
              });
              
              setIsVisualizing(false);
          }, SHORTEST_PATH_SPEED_MS * i);
          return;
      }
      setTimeout(() => {
        const node = nodesInShortestPathOrder[i];
        if (!node.isStart && !node.isFinish) {
             document.getElementById(`node-${node.row}-${node.col}`)?.classList.add('node-shortest-path');
        }
        // Live update of path length
        if (pathCountRef.current) {
            pathCountRef.current.innerText = (i + 1).toString();
        }
      }, SHORTEST_PATH_SPEED_MS * i);
    }
  };

  const clearBoard = () => {
    if(isVisualizing) return;
    setStats(null);
    // Clear DOM classes manually
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const node = document.getElementById(`node-${row}-${col}`);
        if (node) {
          node.classList.remove('node-visited', 'node-shortest-path');
        }
      }
    }
    setGrid(getInitialGrid(startNodePos, finishNodePos)); 
    resetCounters();
  };

  const clearPath = () => {
    if(isVisualizing) return;
    setStats(null);
    resetVisuals();
    resetCounters();
  };

  const formatAlgorithmName = (slug: string) => {
    switch(slug) {
      case 'dijkstra': return "Dijkstra's";
      case 'astar': return "A* Search";
      case 'greedyBfs': return "Greedy BFS";
      case 'bidirectionalSwarm': return "Bi-Direct Swarm";
      case 'bmssp': return "BMSSP (Duan et al. '25)";
      default: return slug;
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen pb-10">
      {/* Controls */}
      <div className="sticky top-0 z-50 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
         <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col">
               <div className="flex items-center gap-3">
                   <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                     Pathfinder Visualizer
                   </h1>
                   <button 
                     onClick={() => setShowInfo(true)}
                     className="text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50 p-1 rounded-full transition-all"
                     title="Algorithm Information"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                     </svg>
                   </button>
               </div>
               <p className="text-slate-400 text-xs hidden md:block mt-1">
                 Drag <span className="text-green-400 font-bold">Start</span> or <span className="text-red-400 font-bold">End</span>. Click/Drag <span className="text-slate-400 font-bold">Walls</span>.
               </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="relative">
                  <select 
                    value={selectedAlgorithm}
                    onChange={(e) => setSelectedAlgorithm(e.target.value as AlgorithmType)}
                    disabled={isVisualizing}
                    className="appearance-none bg-slate-800 text-slate-300 px-4 py-2 pr-8 rounded-lg border border-slate-700 hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50 cursor-pointer font-medium text-sm"
                  >
                    <option value="dijkstra">Dijkstra's Algorithm</option>
                    <option value="astar">A* Search</option>
                    <option value="greedyBfs">Greedy Best-First Search</option>
                    <option value="bidirectionalSwarm">Bidirectional Swarm</option>
                    <option value="bmssp">BMSSP (Duan et al. '25)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <button
                  onClick={handleGenerateMaze}
                  disabled={isVisualizing}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-all border border-slate-700"
                >
                  Random Maze
                </button>

                <button
                  onClick={clearBoard}
                  disabled={isVisualizing}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-all border border-slate-700"
                >
                  Clear Board
                </button>
                 <button
                  onClick={clearPath}
                  disabled={isVisualizing}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-all border border-slate-700"
                >
                  Clear Path
                </button>
                <button
                  onClick={runAlgorithm}
                  disabled={isVisualizing}
                  className="relative group px-6 py-2 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:shadow-[0_0_30px_rgba(79,70,229,0.7)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isVisualizing ? (
                         <>
                           <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                           Running...
                         </>
                    ) : (
                        <>
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                             <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                         </svg>
                         Visualize!
                        </>
                    )}
                  </span>
                </button>
            </div>
         </div>
      </div>

      {/* Stats Bar */}
      <div className={`w-full max-w-4xl mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 px-4 transition-all duration-500 ${stats || isVisualizing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
         <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex flex-col items-center">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Visited Nodes</span>
            <span ref={visitedCountRef} className="text-2xl font-bold text-indigo-400 tabular-nums">{stats?.visitedNodes || 0}</span>
         </div>
         <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex flex-col items-center">
             <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Path Length</span>
             <span ref={pathCountRef} className="text-2xl font-bold text-amber-400 tabular-nums">{stats?.shortestPathLength || 0}</span>
         </div>
         <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex flex-col items-center">
             <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Time Taken</span>
             <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                <span ref={timeValueRef}>{stats?.timeTaken.toFixed(2) || "0.00"}</span>
                <span ref={timeUnitRef} className="text-sm text-emerald-600 font-normal"> s</span>
             </span>
         </div>
      </div>

      {/* Grid Container */}
      <div className="mt-8 p-4 bg-slate-900 rounded-lg shadow-2xl overflow-x-auto max-w-[98vw] border border-slate-800"
           onMouseLeave={handleMouseUp}>
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, min-content)` }}>
          {grid.map((row, rowIdx) => (
            <React.Fragment key={rowIdx}>
              {row.map((node, nodeIdx) => (
                <Node
                  key={`${rowIdx}-${nodeIdx}`}
                  node={node}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                  onMouseUp={handleMouseUp}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-6 justify-center text-sm text-slate-300">
          <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-500 flex items-center justify-center rounded-sm shadow-lg shadow-green-500/20">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
              </div>
              <span>Start Node</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-500 flex items-center justify-center rounded-sm shadow-lg shadow-red-500/20">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm14.024-.983a1.125 1.125 0 0 1 0 1.966l-5.603 3.113A1.125 1.125 0 0 1 9 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113Z" clipRule="evenodd" /></svg>
              </div>
              <span>Target Node</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-500 border border-slate-600 rounded-sm"></div>
              <span>Wall</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-indigo-500 rounded-sm shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
              <span>Visited</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-amber-500 rounded-sm shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
              <span>Shortest Path</span>
          </div>
      </div>

      {/* History Table */}
      <div className="w-full max-w-6xl mt-12 px-4 mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-200">Run History</h2>
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="text-xs text-red-400 hover:text-red-300 underline"
            >
              Clear History
            </button>
          )}
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300 whitespace-nowrap">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3">Snapshot</th>
                  <th className="px-6 py-3">Algorithm</th>
                  <th className="px-6 py-3">Visited</th>
                  <th className="px-6 py-3">Path</th>
                  <th className="px-6 py-3">Visual Time (s)</th>
                  <th className="px-6 py-3">Compute Time (s)</th>
                  <th className="px-6 py-3">Time Start</th>
                  <th className="px-6 py-3">Time End</th>
                  <th className="px-6 py-3">Optimal?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                      No algorithms run yet. Visualize an algorithm to see stats here.
                    </td>
                  </tr>
                ) : (
                  history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/80 transition-colors">
                      <td className="px-6 py-2">
                          {entry.snapshot && (
                              <div 
                                className="h-10 w-20 bg-slate-900 rounded border border-slate-600 overflow-hidden group relative cursor-zoom-in"
                                onClick={() => setExpandedImage(entry.snapshot)}
                              >
                                  <img src={entry.snapshot} alt="Grid Snapshot" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                      </svg>
                                  </div>
                              </div>
                          )}
                      </td>
                      <td className="px-6 py-4 font-medium text-indigo-300">{entry.algorithm}</td>
                      <td className="px-6 py-4">{entry.visitedNodes}</td>
                      <td className="px-6 py-4 font-semibold text-amber-400">{entry.shortestPathLength || "-"}</td>
                      <td className="px-6 py-4 text-emerald-400 font-mono">{entry.timeTaken.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-300 font-mono">{entry.duration.toFixed(6)}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{entry.timeStart}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{entry.timeEnd}</td>
                      <td className="px-6 py-4">
                          {entry.shortestPathFound ? (
                              <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium bg-green-400/10 px-2 py-1 rounded-full border border-green-400/20">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                  </svg>
                                  Yes
                              </span>
                          ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium bg-amber-400/10 px-2 py-1 rounded-full border border-amber-400/20">
                                  No
                              </span>
                          )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
      
      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 modal-animate"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img src={expandedImage} alt="Expanded Snapshot" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl border border-slate-700" />
            <button 
              onClick={() => setExpandedImage(null)}
              className="absolute -top-4 -right-4 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full border border-slate-600 shadow-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PathfindingVisualizer;