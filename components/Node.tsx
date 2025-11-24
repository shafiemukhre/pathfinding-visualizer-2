import React from 'react';
import { NodeData } from '../types';

interface NodeProps {
  node: NodeData;
  onMouseDown: (row: number, col: number) => void;
  onMouseEnter: (row: number, col: number) => void;
  onMouseUp: () => void;
}

const Node: React.FC<NodeProps> = ({
  node,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}) => {
  const { row, col, isStart, isFinish, isWall } = node;

  const getExtraClassNames = () => {
    if (isStart) return 'bg-green-500 scale-110 border-green-600 z-10 shadow-lg shadow-green-500/50';
    if (isFinish) return 'bg-red-500 scale-110 border-red-600 z-10 shadow-lg shadow-red-500/50';
    if (isWall) return 'node-wall';
    return 'bg-slate-800 border-slate-700 hover:bg-slate-700';
  };

  return (
    <div
      id={`node-${row}-${col}`}
      className={`w-6 h-6 border border-opacity-20 transition-colors duration-100 no-select cursor-pointer ${getExtraClassNames()}`}
      onMouseDown={() => onMouseDown(row, col)}
      onMouseEnter={() => onMouseEnter(row, col)}
      onMouseUp={() => onMouseUp()}
      role="gridcell"
    >
      {/* Render icons for start/finish for better aesthetics */}
      {isStart && (
        <div className="flex items-center justify-center w-full h-full text-white text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      {isFinish && (
        <div className="flex items-center justify-center w-full h-full text-white text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm14.024-.983a1.125 1.125 0 0 1 0 1.966l-5.603 3.113A1.125 1.125 0 0 1 9 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113Z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default React.memo(Node);