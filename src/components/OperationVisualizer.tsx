import React from 'react';
import MatrixVisualizer from './MatrixVisualizer';

interface OperationVisualizerProps {
  title: string;
  description: string;
  inputMatrix: number[];
  outputMatrix: number[];
  activeIndices?: number[];
  showBothMatrices?: boolean;
}

const OperationVisualizer: React.FC<OperationVisualizerProps> = ({ 
  title,
  description,
  inputMatrix,
  outputMatrix,
  activeIndices = [],
  showBothMatrices = true
}) => {
  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="mb-4">{description}</p>
      
      <div className={`flex ${showBothMatrices ? 'justify-between' : 'justify-center'} items-center`}>
        {showBothMatrices && (
          <div className="flex flex-col items-center">
            <h4 className="font-semibold mb-2">Before</h4>
            <MatrixVisualizer matrix={inputMatrix} />
          </div>
        )}
        
        {showBothMatrices && (
          <div className="flex items-center mx-4">
            <span className="text-2xl">→</span>
          </div>
        )}
        
        <div className="flex flex-col items-center">
          <h4 className="font-semibold mb-2">{showBothMatrices ? 'After' : 'Current State'}</h4>
          <MatrixVisualizer 
            matrix={outputMatrix} 
            activeIndices={activeIndices}
          />
        </div>
      </div>
    </div>
  );
};

export default OperationVisualizer;