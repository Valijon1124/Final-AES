import React from 'react';

interface MatrixVisualizerProps {
  matrix: number[];
  activeIndices?: number[];
  isKey?: boolean;
  highlightedCells?: number[];
  operationType?: 'SubBytes' | 'ShiftRows' | 'MixColumns' | 'AddRoundKey' | 'Initial' | 'IVXOR';
  showRowLabels?: boolean;
  showColumnLabels?: boolean;
  hideDetails?: boolean;
}

const MatrixVisualizer: React.FC<MatrixVisualizerProps> = ({ 
  matrix, 
  activeIndices = [], 
  isKey = false,
  highlightedCells = [],
  operationType,
  showRowLabels = false,
  showColumnLabels = false,
  hideDetails = false
}) => {
  // Format a byte as hex string
  const formatByte = (byte: number) => {
    return byte.toString(16).padStart(2, '0');
  };

  // Get row indices for highlighting
  const getRowIndices = (row: number) => {
    return [row * 4, row * 4 + 1, row * 4 + 2, row * 4 + 3];
  };

  // Get column indices for highlighting
  const getColumnIndices = (col: number) => {
    return [col, col + 4, col + 8, col + 12];
  };

  // Check if a cell should be highlighted based on operation type
  const shouldHighlightCell = (index: number) => {
    if (highlightedCells.includes(index)) return true;
    if (activeIndices.includes(index)) return true;
    
    // Highlight based on operation type
    if (operationType === 'ShiftRows') {
      // Highlight rows that are being shifted (Row 1, 2, 3, not Row 0)
      const row = Math.floor(index / 4);
      return row > 0; // Rows 1, 2, 3 are shifted (indices 4-15)
    }
    
    if (operationType === 'MixColumns') {
      // Highlight all cells as all columns are mixed
      return true;
    }
    
    if (operationType === 'SubBytes') {
      // Highlight all cells as all bytes are substituted
      return true;
    }
    
    return false;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Matrix with row and column labels */}
      <div className="relative">
        {/* Column labels */}
        {showColumnLabels && (
          <div className="flex justify-center mb-2">
            <div className="w-8"></div> {/* Spacer for row labels */}
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(col => (
                <div 
                  key={col} 
                  className={`w-12 h-6 flex items-center justify-center text-xs font-semibold ${
                    operationType === 'MixColumns' ? 'bg-blue-100 text-blue-800' : 'text-gray-600'
                  }`}
                >
                  {col}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Matrix displayed as ROWS (not columns) */}
        <div className="space-y-2">
          {[0, 1, 2, 3].map(row => (
            <div key={row} className="flex items-center gap-2">
              {/* Row label */}
              {showRowLabels && (
                <div 
                  className={`w-12 h-12 flex items-center justify-center text-xs font-semibold rounded ${
                    operationType === 'ShiftRows' && row > 0 ? 'bg-green-100 text-green-800 border-2 border-green-300' : 
                    operationType === 'SubBytes' ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' :
                    'text-gray-600 border-2 border-gray-300'
                  }`}
                >
                  {row}
                </div>
              )}
              
              {/* Matrix cells for this row */}
              <div className="flex gap-2">
                {[0, 1, 2, 3].map(col => {
                  // CORRECT: matrix[row + col * 4] gives us the column-major order
                  const index = row + col * 4;
                  const isActive = shouldHighlightCell(index);
                  
                  return (
                    <div 
                      key={col} 
                      className={`
                        w-14 h-14 border-2 flex items-center justify-center text-sm font-mono rounded
                        ${isKey ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-300'}
                        ${isActive ? 'bg-yellow-200 border-yellow-500 shadow-md' : ''}
                        ${highlightedCells.includes(index) ? 'bg-blue-200 border-blue-500' : ''}
                        ${operationType === 'SubBytes' ? 'bg-purple-50 border-purple-200' : ''}
                        transition-all duration-200
                      `}
                    >
                      {formatByte(matrix[index])}
                    </div>
                  );
                })}
              </div>
              
              {/* Row operation indicator */}
              {operationType === 'ShiftRows' && (
                <div className="ml-2 text-xs text-gray-600">
                  {row === 0 ? '→' : row === 1 ? '↻' : row === 2 ? '↻↻' : '↻↻↻'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Operation-specific information */}
      {!hideDetails && operationType && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg max-w-md">
          {operationType === 'ShiftRows' && (
            <div className="text-sm">
              <div className="font-semibold text-green-700 mb-2">ShiftRows operatsiyasi:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <span>0-qator: siljitilmaydi (0 ta)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-300 rounded"></div>
                  <span>1-qator: 1 ta chapga siljitiladi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-300 rounded"></div>
                  <span>2-qator: 2 ta chapga siljitiladi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-300 rounded"></div>
                  <span>3-qator: 3 ta chapga siljitiladi</span>
                </div>
              </div>
            </div>
          )}
          
          {operationType === 'MixColumns' && (
            <div className="text-sm">
              <div className="font-semibold text-blue-700 mb-2">MixColumns operatsiyasi:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-300 rounded"></div>
                  <span>Har bir ustun Galois maydonida o'zgartiriladi</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Bu jarayon diffuziya (ma'lumotlarning tarqalishi) ni ta'minlaydi
                </div>
              </div>
            </div>
          )}
          
          {operationType === 'SubBytes' && (
            <div className="text-sm">
              <div className="font-semibold text-purple-700 mb-2">SubBytes operatsiyasi:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-300 rounded"></div>
                  <span>Har bir bayt S-box yordamida almashtiriladi</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Bu AES dagi yagona no-chiziqli (non-linear) amal
                </div>
              </div>
            </div>
          )}
          
          {operationType === 'AddRoundKey' && (
            <div className="text-sm">
              <div className="font-semibold text-orange-700 mb-2">AddRoundKey operatsiyasi:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-300 rounded"></div>
                  <span>Holat round key bilan XOR qilinadi</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Bu kalitni bevosita ishlatadigan yagona bosqich
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
    </div>
  );
};

export default MatrixVisualizer;
