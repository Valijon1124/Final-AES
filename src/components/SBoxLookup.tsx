import React from 'react';
import { SBOX } from '@/utils/aes';

interface SBoxLookupProps {
  inputByte: number;
  outputByte: number;
  showProcess?: boolean;
}

const SBoxLookup: React.FC<SBoxLookupProps> = ({ 
  inputByte, 
  outputByte, 
  showProcess = true 
}) => {
  // Extract row and column from input byte
  const row = (inputByte >>> 4) & 0x0F; // Upper 4 bits
  const col = inputByte & 0x0F; // Lower 4 bits
  
  // Format byte as hex
  const formatByte = (byte: number) => {
    return byte.toString(16).padStart(2, '0').toUpperCase();
  };

  return (
    <div className="w-full">
      {/* S-box lookup visualization - Only table */}
      {showProcess && (
        <div>
          {/* S-box representation - Larger cells */}
          <div className="bg-white border-2 border-gray-400 rounded-xl p-4 shadow-xl overflow-hidden">
            <div className="text-sm font-bold text-gray-800 mb-3 text-center">📊 S-box jadvali (16×16):</div>
            <div className="rounded-lg border-2 border-gray-300 bg-gray-50">
              <div className="font-mono w-full">
                {/* Header row */}
                <div className="flex sticky top-0 z-20 shadow-lg">
                  <div className="w-14 h-10 text-center border border-gray-600 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center font-bold text-sm text-gray-900 sticky left-0 z-30 shadow-md">
                    R\C
                  </div>
                  {Array.from({ length: 16 }, (_, i) => {
                    const isHighlighted = col === i;
                    return (
                      <div 
                        key={`col-${i}`} 
                        className={`flex-1 h-10 text-center border border-gray-600 flex items-center justify-center font-bold text-sm transition-all ${
                          isHighlighted 
                            ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-yellow-900 shadow-lg' 
                            : 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900'
                        }`}
                      >
                        {i.toString(16).toUpperCase()}
                      </div>
                    );
                  })}
                </div>
                
                {/* S-box rows */}
                {Array.from({ length: 16 }, (_, r) => {
                  const isRowHighlighted = r === row;
                  return (
                    <div key={`row-${r}`} className="flex">
                      {/* Row header */}
                      <div className={`w-14 h-10 text-center border border-gray-600 flex items-center justify-center font-bold text-sm sticky left-0 z-10 transition-all ${
                        isRowHighlighted
                          ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-yellow-900 shadow-lg'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900'
                      }`}>
                        {r.toString(16).toUpperCase()}
                      </div>
                      
                      {/* S-box values */}
                      {Array.from({ length: 16 }, (_, c) => {
                        const sboxValue = SBOX[r * 16 + c];
                        const isTarget = r === row && c === col;
                        const isRowOrColHighlighted = (r === row || c === col) && !isTarget;
                        
                        return (
                          <div 
                            key={`cell-${c}`}
                            className={`flex-1 h-10 text-center border border-gray-400 flex items-center justify-center text-xs font-mono font-bold transition-all ${
                              isTarget
                                ? 'bg-gradient-to-br from-yellow-300 to-amber-400 border-yellow-600 text-yellow-900 shadow-xl z-20 relative'
                                : isRowOrColHighlighted
                                ? 'bg-purple-100 border-purple-300 text-purple-900'
                                : 'bg-white border-gray-400 text-gray-800 hover:bg-blue-50'
                            }`}
                          >
                            {formatByte(sboxValue)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Found result - Compact */}
          {row !== undefined && col !== undefined && (
            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl border-l-4 border-yellow-500 shadow-md">
              <div className="text-center">
                <p className="text-sm font-bold text-yellow-900">
                  🎯 <strong>Topildi!</strong> {row.toString(16).toUpperCase()}-qator va {col.toString(16).toUpperCase()}-ustun  
                  kesishmasida: <strong className="font-mono text-base">{formatByte(outputByte)}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SBoxLookup;
