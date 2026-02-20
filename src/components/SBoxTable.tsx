import React, { useState } from 'react';
import { SBOX } from '@/utils/aes';

const SBoxTable: React.FC = () => {
  const [selectedByte, setSelectedByte] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{row: number, col: number} | null>(null);
  const [searchValue, setSearchValue] = useState<string>('');
  
  // Format byte as hex
  const formatByte = (byte: number) => {
    return byte.toString(16).padStart(2, '0').toUpperCase();
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (value.length === 2) {
      const byte = parseInt(value, 16);
      if (!isNaN(byte) && byte >= 0 && byte <= 255) {
        setSelectedByte(byte);
      } else {
        setSelectedByte(null);
      }
    } else {
      setSelectedByte(null);
    }
  };

  const getSearchResult = () => {
    if (!selectedByte) return null;
    const row = (selectedByte >> 4) & 0x0F;
    const col = selectedByte & 0x0F;
    const sboxValue = SBOX[selectedByte];
    return { row, col, sboxValue, inputByte: selectedByte };
  };

  const searchResult = getSearchResult();

  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-white via-purple-50 to-white p-4 md:p-6 rounded-xl shadow-xl border-2 border-purple-300">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-3xl">📊</span>
          <h3 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">AES S-box Jadvali</h3>
        </div>
        
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500">
          <p className="text-gray-800 text-center text-sm font-semibold leading-relaxed">
            AES S-box jadvali 16×16 matritsa bo'lib, har bir bayt (00 dan FF gacha) uchun 
            mos qiymatni beradi. Bu jadval AES algoritmidagi <strong className="text-blue-700">yagona no-chiziqli transformatsiya</strong>dir.
          </p>
        </div>

        {/* Interactive Search */}
        <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-300 shadow-md">
          <h4 className="font-bold text-base text-purple-900 mb-3 text-center">Interaktiv qidirish:</h4>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Bayt qiymati (hex):</label>
              <input 
                type="text" 
                placeholder="AB" 
                value={searchValue}
                className="w-24 px-3 py-2 border-2 border-purple-300 rounded-lg text-center font-mono font-bold text-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                maxLength={2}
                onChange={(e) => handleSearch(e.target.value.toUpperCase())}
              />
            </div>
            {searchResult && (
              <div className="p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border-l-4 border-yellow-500">
                <div className="text-sm font-bold text-yellow-900">
                  {formatByte(searchResult.inputByte)} → S-box[{searchResult.row.toString(16).toUpperCase()}][{searchResult.col.toString(16).toUpperCase()}] = <span className="text-green-700">{formatByte(searchResult.sboxValue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Large S-box table - Compact to fit screen */}
        <div className="rounded-xl border-2 border-gray-300 shadow-inner bg-gray-50 overflow-hidden">
          <div className="font-mono w-full">
            {/* Header row */}
            <div className="flex sticky top-0 z-20 shadow-lg">
              <div className="w-12 h-8 text-center border border-gray-600 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center font-bold text-xs text-gray-900 sticky left-0 z-30 shadow-md">
                R\C
              </div>
              {Array.from({length: 16}, (_, i) => {
                const isHighlighted = searchResult && searchResult.col === i;
                return (
                  <div 
                    key={i} 
                    className={`flex-1 h-8 text-center border border-gray-600 flex items-center justify-center font-bold text-xs transition-all ${
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
            
            {/* Data rows */}
            {Array.from({length: 16}, (_, r) => {
              const isRowHighlighted = searchResult && searchResult.row === r;
              return (
                <div key={r} className="flex">
                  <div className={`w-12 h-8 text-center border border-gray-600 flex items-center justify-center font-bold text-xs sticky left-0 z-10 transition-all ${
                    isRowHighlighted
                      ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-yellow-900 shadow-lg'
                      : 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900'
                  }`}>
                    {r.toString(16).toUpperCase()}
                  </div>
                  {Array.from({length: 16}, (_, c) => {
                    const sboxIndex = r * 16 + c;
                    const sboxValue = SBOX[sboxIndex];
                    const inputByte = r * 16 + c;
                    const isSelected = selectedByte === inputByte;
                    const isHighlighted = searchResult && searchResult.row === r && searchResult.col === c;
                    const isHovered = hoveredCell && hoveredCell.row === r && hoveredCell.col === c;
                    const isRowOrColHighlighted = searchResult && (searchResult.row === r || searchResult.col === c);
                    
                    return (
                      <div 
                        key={c} 
                        className={`flex-1 h-8 text-center border border-gray-400 flex items-center justify-center font-mono text-xs font-bold cursor-pointer transition-all ${
                          isHighlighted
                            ? 'bg-gradient-to-br from-yellow-300 to-amber-400 border-yellow-600 text-yellow-900 shadow-xl z-20 relative'
                            : isSelected
                            ? 'bg-gradient-to-br from-green-300 to-emerald-400 border-green-600 text-green-900 shadow-lg'
                            : isRowOrColHighlighted && !isHighlighted
                            ? 'bg-purple-100 border-purple-300 text-purple-900'
                            : isHovered
                            ? 'bg-gradient-to-br from-blue-200 to-cyan-200 border-blue-500 text-blue-900 shadow-md'
                            : 'bg-white border-gray-400 text-gray-800 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 hover:shadow-sm'
                        }`}
                        title={`Input: 0x${formatByte(inputByte)} (${inputByte}) → S-box[${r}][${c}] = 0x${formatByte(sboxValue)} (${sboxValue})`}
                        onMouseEnter={() => setHoveredCell({row: r, col: c})}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => {
                          setSelectedByte(inputByte);
                          setSearchValue(formatByte(inputByte));
                        }}
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
        
        {searchResult && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border-l-4 border-green-500">
            <div className="text-center">
              <p className="text-base font-bold text-green-900">
                🎯 <strong>Topildi:</strong> S-box jadvalidan qator {searchResult.row.toString(16).toUpperCase()}, ustun {searchResult.col.toString(16).toUpperCase()} 
                pozitsiyasida <strong className="font-mono">{formatByte(searchResult.sboxValue)}</strong> qiymati topildi!
              </p>
            </div>
          </div>
        )}

        {/* Usage explanation */}
        <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📖</span>
            <h4 className="font-bold text-lg text-blue-900">S-box ishlatilishi:</h4>
          </div>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="font-semibold text-gray-800 mb-3">
                <strong className="text-blue-700">Qidirish usuli:</strong> Agar kirish bayti AB bo'lsa:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li className="font-mono"><strong className="text-purple-700">Row</strong> = A (yuqori 4 bit) = 10₁₀</li>
                <li className="font-mono"><strong className="text-purple-700">Col</strong> = B (quyi 4 bit) = 11₁₀</li>
                <li className="font-mono font-bold text-green-700">S-box[10][11] = {formatByte(SBOX[10 * 16 + 11])}</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="font-semibold text-gray-800">
                <strong className="text-green-700">Qo'llanilishi:</strong> SubBytes operatsiyasida har bir bayt o'rniga 
                S-box jadvalidagi mos qiymat qo'yiladi. Bu AES algoritmidagi <strong className="text-blue-700">yagona no-chiziqli transformatsiya</strong>dir.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
              <p className="font-semibold text-gray-800 mb-2">
                <strong className="text-purple-700">Masalan:</strong> AB → S-box[A][B] = {formatByte(SBOX[0xAB])}
              </p>
              <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                Kirish: AB → Row=A (10), Col=B (11) → Chiqish: {formatByte(SBOX[0xAB])}
              </div>
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border-l-4 border-yellow-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <h4 className="font-bold text-base text-yellow-900">Ko'rsatmalar:</h4>
          </div>
          <ul className="text-sm text-gray-700 space-y-1 list-disc pl-6">
            <li>Jadvaldagi har bir katakni <strong>bosib</strong> tanlashingiz mumkin</li>
            <li>Katak ustida <strong>sichqonchani olib borib</strong> qiymatni ko'rishingiz mumkin</li>
            <li>Yuqoridagi qidiruv maydoniga <strong>hex qiymat kiriting</strong> va jadvalda qidiring</li>
            <li>Tanlangan katak <strong>sariq rangda</strong>, hover qilingan katak <strong>ko'k rangda</strong> ko'rsatiladi</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SBoxTable;



