import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const algorithms = [
  {
    name: "Dijkstra's Algorithm",
    description: "The classic pathfinding algorithm. It guarantees the shortest path by exploring nodes in all directions equally, expanding like concentric circles. It respects edge weights but does not use heuristics, making it reliable but potentially slower than A*.",
    time: "O(V + E log V)",
    space: "O(V)"
  },
  {
    name: "A* Search",
    description: "Widely considered the best choice for pathfinding. It uses a heuristic function (Manhattan distance) to estimate the cost to the goal, prioritizing promising paths. It guarantees the shortest path and is usually faster than Dijkstra.",
    time: "O(E)",
    space: "O(V)"
  },
  {
    name: "Greedy Best-First Search",
    description: "A faster, more aggressive version of A* that relies solely on the heuristic. It tries to move directly towards the target. It is very fast computationally but does NOT guarantee the shortest path.",
    time: "O(V)",
    space: "O(V)"
  },
  {
    name: "Bidirectional Swarm",
    description: "Runs two simultaneous A* searches: one from the start node and one from the target node. They meet in the middle, often significantly reducing the search space compared to a single directional search.",
    time: "O(b^(d/2))",
    space: "O(V)"
  },
  {
    name: "BMSSP (Duan et al. '25)",
    description: "Bounded Multi-Source Shortest Path. A recent theoretical breakthrough (2025) that breaks the classical sorting barrier for directed graphs. It uses a complex divide-and-conquer approach on distance values to achieve sub-logarithmic overhead per edge.",
    time: "O(m log^(2/3) n)",
    space: "O(V + m)"
  }
];

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col modal-animate"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
             </div>
             <h2 className="text-2xl font-bold text-white">Algorithm Guide</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {algorithms.map((algo, index) => (
            <div key={index} className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 hover:border-indigo-500/30 transition-all hover:bg-slate-800/60 group">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                <h3 className="text-lg font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">{algo.name}</h3>
                <div className="flex gap-2 text-xs font-mono text-slate-400 shrink-0">
                  <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                    <span className="text-slate-500">Time:</span>
                    <span className="text-emerald-400">{algo.time}</span>
                  </div>
                  <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                     <span className="text-slate-500">Space:</span>
                     <span className="text-amber-400">{algo.space}</span>
                  </div>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{algo.description}</p>
            </div>
          ))}
          
          <div className="mt-8 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-sm text-indigo-200/80 flex gap-3 items-start">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0 mt-0.5 text-indigo-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <p className="font-semibold mb-1 text-indigo-300">Complexity Notation Guide</p>
              <p className="opacity-80">
                <strong>V</strong> = Vertices (Grid Cells), <strong>E</strong> = Edges (Neighbors), <strong>m</strong> = Edges (Sparse Graph).
                <br/>
                This grid has <span className="font-mono text-xs bg-slate-900 px-1 rounded">25x50 = 1250</span> vertices. Each cell has up to 4 edges.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;