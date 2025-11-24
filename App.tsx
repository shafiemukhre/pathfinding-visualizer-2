import React from 'react';
import PathfindingVisualizer from './components/PathfindingVisualizer';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-indigo-500/30">
      <PathfindingVisualizer />
    </div>
  );
};

export default App;