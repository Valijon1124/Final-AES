import React, { useEffect } from 'react';
import { SBOX, RCON } from '@/utils/aes';
import { keyExpansion, KeyLength } from '@/utils/aes';

interface KeyGenerationStep {
  stepNumber: number;
  title: string;
  description: string;
  inputKey: number[];
  outputKey: number[];
  highlightedCells: number[];
  transformationDetails: {
    lastWord: number[];
    rotatedWord: number[];
    sboxWord: number[];
    rconValue: number;
    transformedWord: number[];
    firstWordPrev: number[];
    xorResult: number[];
  };
  explanation: string;
}

interface KeyGenerationVisualizerProps {
  initialKey: number[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

const KeyGenerationVisualizer: React.FC<KeyGenerationVisualizerProps> = ({
  initialKey,
  currentStep,
  onStepChange
}) => {
  const [selectedByteIndex, setSelectedByteIndex] = React.useState<number>(0);
  const topRef = React.useRef<HTMLDivElement | null>(null);
  
  // Reset selected byte index when step changes
  useEffect(() => {
    setSelectedByteIndex(0);
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep]);
  
  // Generate detailed key expansion steps
  const generateKeyExpansionSteps = (key: number[]): KeyGenerationStep[] => {
    const steps: KeyGenerationStep[] = [];
    const roundKeys: number[][] = [key.slice()];
    const keyLen = key.length;
    const numRounds = keyLen === 16 ? 10 : keyLen === 24 ? 12 : 14;
    
    // Add initial step
    steps.push({
      stepNumber: 0,
      title: 'Boshlang\'ich kalit',
      description: 'Foydalanuvchi tomonidan berilgan asl 128-bitli kalit',
      inputKey: key,
      outputKey: key,
      highlightedCells: [],
      transformationDetails: {
        lastWord: [],
        rotatedWord: [],
        sboxWord: [],
        rconValue: 0,
        transformedWord: [],
        firstWordPrev: [],
        xorResult: []
      },
      explanation: 'Bu foydalanuvchi tomonidan berilgan asl 128-bitli kalitdir. Keyingi barcha raund kalitlar shu kalit asosida yaratiladi.'
    });

    // Generate rounds of key expansion
    for (let round = 1; round <= numRounds; round++) {
      const prevKey = roundKeys[round - 1];
      const newKey = prevKey.slice();
      
      // Get the last word (4 bytes) dynamically by key size
      const lastIndex = prevKey.length - 4;
      const lastWord = [prevKey[lastIndex], prevKey[lastIndex + 1], prevKey[lastIndex + 2], prevKey[lastIndex + 3]];
      
      // Rotate the last word (RotWord)
      const rotatedWord = [lastWord[1], lastWord[2], lastWord[3], lastWord[0]];
      
      // Apply S-box substitution (SubWord)
      const sboxWord = rotatedWord.map(byte => SBOX[byte]);
      
      // Get Rcon value for this round
      const rconValue = RCON[round];
      
      // Apply Rcon to first byte
      const transformedWord = [...sboxWord];
      transformedWord[0] ^= rconValue;
      
      // Get first word of previous key
      const firstWordPrev = [prevKey[0], prevKey[1], prevKey[2], prevKey[3]];
      
      // XOR with transformed word
      const xorResult = firstWordPrev.map((byte, index) => byte ^ transformedWord[index]);
      
      // Generate the first word of the new key
      newKey[0] = xorResult[0];
      newKey[1] = xorResult[1];
      newKey[2] = xorResult[2];
      newKey[3] = xorResult[3];
      
      // Generate the rest of the words
      const wordsInKey = keyLen / 4; // 4 for 128-bit, 6 for 192-bit, 8 for 256-bit
      for (let i = 1; i < wordsInKey; i++) {
        const offset = i * 4;
        // AES-256 special case: every 4th word (i === 4) uses SubWord on previous word
        if (wordsInKey === 8 && i === 4) {
          const tempWord = [newKey[offset - 4], newKey[offset - 3], newKey[offset - 2], newKey[offset - 1]];
          const subTempWord = tempWord.map(byte => SBOX[byte]);
          newKey[offset] = prevKey[offset] ^ subTempWord[0];
          newKey[offset + 1] = prevKey[offset + 1] ^ subTempWord[1];
          newKey[offset + 2] = prevKey[offset + 2] ^ subTempWord[2];
          newKey[offset + 3] = prevKey[offset + 3] ^ subTempWord[3];
        } else {
          newKey[offset] = newKey[offset - 4] ^ prevKey[offset];
          newKey[offset + 1] = newKey[offset - 3] ^ prevKey[offset + 1];
          newKey[offset + 2] = newKey[offset - 2] ^ prevKey[offset + 2];
          newKey[offset + 3] = newKey[offset - 1] ^ prevKey[offset + 3];
        }
      }
      
      roundKeys.push(newKey);
      
      // Add step for this round
      steps.push({
        stepNumber: round,
        title: `${round} - raund  kaliti`,
        description: `${round}-raund uchun kalitni kengaytirish jarayoni`,
        inputKey: prevKey,
        outputKey: newKey,
        highlightedCells: [0, 1, 2, 3], // Highlight the first word that's directly transformed
        transformationDetails: {
          lastWord,
          rotatedWord,
          sboxWord,
          rconValue,
          transformedWord,
          firstWordPrev,
          xorResult
        },
        explanation: `
          ${round}-raund uchun kalitni kengaytirish jarayoni:
          1. Oldingi kalitning oxirgi word qismini oling: [${lastWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}]
          2. Wordni aylantiring: [${rotatedWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}]
          3. Aylantirilgan word ga S-box ni qo'llang: [${sboxWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}]
          4. Birinchi baytga RCON (${rconValue.toString(16)}) ni qo'llang:
             Natija: [${transformedWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}]
          5. Oldingi kalitning birinchi word i: [${firstWordPrev.map(b => b.toString(16).padStart(2, '0')).join(', ')}] ni o'zgartirilgan word bilan XOR qiling: [${transformedWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}], natijada: [${xorResult.map(b => b.toString(16).padStart(2, '0')).join(', ')}] hosil bo'ladi. So'ngra qolgan word lar shu tarzda hosil qilinadi.
        `
      });
    }
    // Extra final step for summary view
    steps.push({
      stepNumber: numRounds + 1,
      title: 'Kalitlar jadvali ',
      description: 'Barcha round kalitlarni umumiy jadvalda ko\'rish',
      inputKey: roundKeys[numRounds - 1] || key,
      outputKey: roundKeys[numRounds] || key,
      highlightedCells: [],
      transformationDetails: {
        lastWord: [],
        rotatedWord: [],
        sboxWord: [],
        rconValue: 0,
        transformedWord: [],
        firstWordPrev: [],
        xorResult: []
      },
      explanation: 'Kalit generatsiyasi tugadi. Quyida barcha round kalitlar (0-rounddan boshlab) ko\'rsatiladi.'
    });
    
    return steps;
  };

  const steps = generateKeyExpansionSteps(initialKey);
  const currentStepData = steps[currentStep];

  // Format byte as hex
  const formatByte = (byte: number) => {
    return byte.toString(16).padStart(2, '0');
  };

  const formatBinaryBits = (byte: number) => {
    return byte.toString(2).padStart(8, '0').split('').join(' ');
  };

  const renderBitBoxes = (byte: number, tone: 'blue' | 'red' | 'green') => {
    const toneStyles = {
      blue: { wrap: 'bg-blue-100 border-blue-300', bit: 'text-blue-700' },
      red: { wrap: 'bg-red-100 border-red-300', bit: 'text-red-700' },
      green: { wrap: 'bg-green-200 border-green-400', bit: 'text-green-900' }
    }[tone];

    return (
      <div className={`inline-grid grid-cols-8 gap-[2px] p-1 rounded border ${toneStyles.wrap}`}>
        {byte.toString(2).padStart(8, '0').split('').map((bit, bitIndex) => (
          <span
            key={bitIndex}
            className={`w-5 h-6 flex items-center justify-center text-sm font-mono font-bold ${toneStyles.bit}`}
          >
            {bit}
          </span>
        ))}
      </div>
    );
  };

  // Render a 4x4 matrix with enhanced styling
  const renderMatrix = (matrix: number[], highlightedCells: number[] = [], title: string = '', showMessage: boolean = true) => {
    return (
      <div className="flex flex-col items-center bg-white p-6 rounded-xl shadow-lg border-2 border-blue-100">
        {title && <h4 className="font-bold mb-4 text-xl text-slate-800">{title}</h4>}
        
        {/* Matrix */}
        <div className="space-y-2">
          {[0, 1, 2, 3].map(row => (
            <div key={row} className="flex items-center">
              {/* Matrix cells for this row */}
              <div className="flex gap-2">
                {[0, 1, 2, 3].map(col => {
                  const index = row + col * 4;
                  return (
                    <div 
                      key={col} 
                      className={`
                        w-14 h-14 border-2 flex items-center justify-center text-base font-mono rounded-lg shadow-md
                        transition-all duration-300 transform hover:scale-110
                        ${highlightedCells.includes(index) 
                          ? 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-500 text-white shadow-lg scale-105' 
                          : 'bg-gradient-to-br from-white to-gray-50 border-gray-300 text-gray-800 hover:border-blue-300 hover:shadow-lg'
                        }
                      `}
                    >
                      {formatByte(matrix[index]).toUpperCase()}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Matrix info */}
        <div className="mt-4 text-sm">
          {highlightedCells.length > 0 && showMessage && (
            <div className="text-center">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-full shadow-sm">
                ✨ {highlightedCells.length} ta katak yangilandi
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render S-box lookup details
  const renderSBoxLookup = (inputByte: number, outputByte: number, index: number) => {
    const row = (inputByte >> 4) & 0x0F;
    const col = inputByte & 0x0F;
    
    return (
      <div key={index} className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 border border-gray-300 flex items-center justify-center text-xs font-mono bg-gray-100">
          {formatByte(inputByte)}
        </div>
        <span className="text-sm">→</span>
        <div className="text-xs">
          <div>S-box[{formatByte(inputByte)}] = S-box[{row}][{col}]</div>
          <div className="text-gray-600">Qator: {row}, Ustun: {col}</div>
        </div>
        <span className="text-sm">→</span>
        <div className="w-8 h-8 border border-gray-300 flex items-center justify-center text-xs font-mono bg-purple-100">
          {formatByte(outputByte)}
        </div>
      </div>
    );
  };

  // Render S-box table snippet
  const renderSBoxTableSnippet = (inputByte: number, outputByte: number) => {
    const row = (inputByte >> 4) & 0x0F;
    const col = inputByte & 0x0F;
    
    return (
      <div className="mt-4 p-4 bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg border-2 border-purple-300">
        <div className="mb-4">
          <h6 className="font-bold text-lg mb-3 text-purple-800 flex items-center gap-2">
            <span className="text-xl"></span>
            S-box jadvalidan qidirish:
          </h6>
          <div className="space-y-2 bg-white p-3 rounded-lg border-l-4 border-purple-500">
            <p className="text-sm font-semibold">
              <span className="text-purple-700">Kirish:</span> <span className="font-mono">{formatByte(inputByte).toUpperCase()}</span> = <span className="font-mono">{inputByte.toString(2).padStart(8, '0')}₂</span>
            </p>
            <p className="text-sm font-semibold">
              <span className="text-purple-700">Yuqori 4 bit (qator):</span> <span className="font-mono">{row.toString(2).padStart(4, '0')}₂</span> = <span className="font-mono">{row}₁₀</span>
            </p>
            <p className="text-sm font-semibold">
              <span className="text-purple-700">Quyi 4 bit (ustun):</span> <span className="font-mono">{col.toString(2).padStart(4, '0')}₂</span> = <span className="font-mono">{col}₁₀</span>
            </p>
            <p className="text-sm font-semibold">
              <span className="text-purple-700">S-box[{row}][{col}] =</span> <span className="font-mono text-green-600 font-bold">{formatByte(outputByte).toUpperCase()}</span> = <span className="font-mono">{outputByte}₁₀</span>
            </p>
          </div>
        </div>
        
        {/* Larger S-box table showing the specific lookup */}
        <div className="mt-4 w-full">
          <h6 className="font-bold text-base mb-3 text-purple-800">S-box jadvali (16×16):</h6>
          <div className="w-full overflow-x-auto">
            <div className="w-full">
              <div className="text-sm font-mono border-2 border-gray-400 rounded-lg overflow-hidden shadow-xl">
              {/* Header row */}
              <div className="flex bg-gradient-to-r from-gray-200 to-gray-300 w-full">
                <div className="flex-shrink-0 w-14 h-11 text-center border-r-2 border-gray-400 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center font-bold text-base shadow-sm">
                  <span className="text-gray-700">R\C</span>
                </div>
                {Array.from({length: 16}, (_, i) => (
                  <div key={i} className={`flex-1 h-11 text-center bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center font-bold text-base shadow-sm ${
                    i === 15 ? 'border-r-0' : 'border-r border-gray-400'
                  }`}>
                    <span className="text-gray-700">{i.toString(16).toUpperCase()}</span>
                  </div>
                ))}
              </div>
              {/* Data rows */}
              {Array.from({length: 16}, (_, r) => (
                <div key={r} className="flex border-t border-gray-400 w-full">
                  {/* Row header */}
                  <div className={`flex-shrink-0 w-14 h-11 text-center border-r-2 border-gray-400 flex items-center justify-center font-bold text-base shadow-sm ${
                    r === row 
                      ? 'bg-gradient-to-br from-yellow-300 to-yellow-400 text-yellow-900' 
                      : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700'
                  }`}>
                    {r.toString(16).toUpperCase()}
                  </div>
                  {/* Data cells */}
                  {Array.from({length: 16}, (_, c) => {
                    const sboxIndex = r * 16 + c;
                    const sboxValue = SBOX[sboxIndex];
                    const isHighlighted = r === row && c === col;
                    return (
                      <div 
                        key={c} 
                        className={`flex-1 h-11 text-center border-b border-gray-400 flex items-center justify-center font-mono text-sm font-semibold transition-all ${
                          c === 15 ? 'border-r-0' : 'border-r border-gray-400'
                        } ${
                          isHighlighted 
                            ? 'bg-gradient-to-br from-yellow-300 to-yellow-400 border-yellow-600 border-2 text-yellow-900 shadow-lg scale-105 z-10 relative' 
                            : c === col
                            ? 'bg-purple-100 hover:bg-purple-200 text-purple-900'
                            : r === row
                            ? 'bg-purple-100 hover:bg-purple-200 text-purple-900'
                            : 'bg-white hover:bg-gray-50 text-gray-800'
                        }`}
                      >
                        {formatByte(sboxValue).toUpperCase()}
                      </div>
                    );
                  })}
                </div>
              ))}
              </div>
            </div>
          </div>
          {row !== undefined && col !== undefined && (
            <div className="mt-3 p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm font-semibold text-yellow-900">
                🎯 <strong>Topildi:</strong> S-box jadvalining {row.toString(16).toUpperCase()}-qatori va {col.toString(16).toUpperCase()}-ustuni 
                kesishmasida <strong className="font-mono">{formatByte(outputByte).toUpperCase()}</strong> qiymati topildi!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render RCON table
  const renderRCONTable = (currentRound: number) => {
    return (
      <div className="mt-4">
        <h6 className="font-medium mb-2">RCON jadvali:</h6>
        <div className="grid grid-cols-8 gap-1 text-xs">
          {RCON.map((value, index) => (
            <div 
              key={index} 
              className={`p-1 border text-center font-mono ${
                index === currentRound ? 'bg-red-200 border-red-400' : 'bg-gray-100'
              }`}
            >
              <div>R{index}</div>
              <div>0x{value.toString(16).padStart(2, '0')}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          RCON[{currentRound}] = 0x{RCON[currentRound].toString(16).padStart(2, '0')} 
          (Round {currentRound} uchun)
        </p>
      </div>
    );
  };

  // Render transformation details
  const renderTransformationDetails = (details: KeyGenerationStep['transformationDetails']) => {
    // Skip on initial step and summary step
    if (currentStep === 0 || currentStep === steps.length - 1) return null;
    // Safety: if details are empty (e.g., summary), don't render
    if (!details || !details.rotatedWord || details.rotatedWord.length === 0) return null;

    return (
      <div className="mt-8 p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-2xl border-4 border-blue-300">
        <div className="text-center mb-8">
          <h4 className="font-extrabold text-3xl mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            🔐 KALIT KENGAYTIRISH JARAYONI
          </h4>
          <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          <p className="text-gray-600 mt-3 font-semibold">Raund {currentStep} uchun batafsil jarayon</p>
        </div>
        
        {/* Step 1: Last Word */}
        <details className="mb-6 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl shadow-lg border-2 border-yellow-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  1
                </div>
                <h5 className="font-extrabold text-xl text-amber-800">Oxirgi word (Last Word)</h5>
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-white border border-amber-200 rounded-full px-3 py-1">
                Ochish
              </span>
            </div>
          </summary>
          <div className="mt-4">
            <div className="flex gap-2 mb-3 justify-center">
            {details.lastWord.map((byte, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-14 h-14 border-2 border-yellow-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-yellow-200 to-amber-200 rounded-lg shadow-md font-bold text-yellow-900">
                  {formatByte(byte).toUpperCase()}
                </div>
                <span className="text-xs text-gray-600 mt-1 font-semibold">Bayt {i}</span>
              </div>
            ))}
          </div>
          <div className="bg-white p-3 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm text-gray-700 font-medium">
              📍 <strong>Manba:</strong> Oldingi kalitning oxirgi 4 bayt qismi [12, 13, 14, 15] pozitsiyalaridan olinadi
            </p>
          </div>
          </div>
        </details>

        {/* Step 2: Rotated Word */}
        <details className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg border-2 border-green-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  2
                </div>
                <h5 className="font-extrabold text-xl text-green-800">Aylantirilgan word (RotWord)</h5>
              </div>
              <span className="text-xs font-semibold text-green-700 bg-white border border-green-200 rounded-full px-3 py-1">
                Ochish
              </span>
            </div>
          </summary>
          <div className="mt-4">
            <div className="flex gap-3 mb-3 justify-center items-center">
            <div className="flex gap-1">
              {details.lastWord.map((byte, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-12 h-12 border border-yellow-300 flex items-center justify-center text-xs font-mono bg-yellow-100 rounded shadow-sm">
                    {formatByte(byte).toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-2xl font-bold text-green-600">→</div>
            <div className="flex gap-2">
              {details.rotatedWord.map((byte, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-14 h-14 border-2 border-green-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-green-200 to-emerald-200 rounded-lg shadow-md font-bold text-green-900">
                    {formatByte(byte).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-600 mt-1 font-semibold">Bayt {i}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border-l-4 border-green-500">
            <p className="text-sm text-gray-700 font-medium">
              🔄 <strong>Operatsiya:</strong> Har bir bayt bir pozitsiya chapga siljitiladi: <span className="font-mono">[a, b, c, d] → [b, c, d, a]</span>
            </p>
          </div>
          </div>
        </details>

        {/* Step 3: S-box Transformation */}
        <details className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg border-2 border-purple-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  3
                </div>
                <h5 className="font-extrabold text-xl text-purple-800">S-box almashtirish (SubWord)</h5>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-white border border-purple-200 rounded-full px-3 py-1">
                Ochish
              </span>
            </div>
          </summary>
          <div className="mt-4">
          
          {/* Top section: Input bytes and result */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input bytes */}
              <div className="bg-white p-4 rounded-lg shadow-md border-2 border-purple-200">
                <h6 className="font-bold text-base mb-3 text-purple-700">Kirish baytlari (RotWord dan):</h6>
                <div className="flex gap-2 justify-center">
                  {details.rotatedWord.map((byte, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-12 h-12 border-2 border-green-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg shadow-sm font-bold text-green-800">
                        {formatByte(byte).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-600 mt-1 font-semibold">Bayt {i}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Output bytes */}
              <div className="bg-white p-4 rounded-lg shadow-md border-2 border-purple-200">
                <h6 className="font-bold text-base mb-3 text-purple-700">Natija (S-box dan keyin):</h6>
                <div className="flex gap-2 justify-center">
                  {details.sboxWord.map((byte, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-12 h-12 border-2 border-purple-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-purple-200 to-pink-200 rounded-lg shadow-sm font-bold text-purple-900">
                        {formatByte(byte).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-600 mt-1 font-semibold">Bayt {i}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* S-box lookup details for each byte - compact and interactive */}
          <div className="mb-6">
            <h6 className="font-bold text-base mb-3 text-purple-800">Har bir bayt uchun S-box qiymatini tanlang (bosish orqali):</h6>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {details.rotatedWord.map((inputByte, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedByteIndex(i)}
                  className={`p-3 rounded-lg shadow-sm border-2 transition-all transform hover:scale-105 ${
                    selectedByteIndex === i
                      ? 'bg-gradient-to-br from-yellow-200 to-amber-200 border-yellow-500 shadow-lg scale-105'
                      : 'bg-white border-purple-200 hover:border-purple-400 hover:shadow-md'
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className={`text-xs font-semibold mb-1 ${selectedByteIndex === i ? 'text-yellow-900' : 'text-purple-700'}`}>
                      Bayt {i} {selectedByteIndex === i && '✓'}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-10 h-10 border-2 flex items-center justify-center text-sm font-mono rounded-lg font-bold ${
                        selectedByteIndex === i
                          ? 'border-green-500 bg-gradient-to-br from-green-200 to-emerald-200 text-green-900'
                          : 'border-green-300 bg-green-100 text-green-800'
                      }`}>
                        {formatByte(inputByte).toUpperCase()}
                      </div>
                      <span className="text-lg font-bold text-purple-600">→</span>
                      <div className={`w-10 h-10 border-2 flex items-center justify-center text-sm font-mono rounded-lg font-bold ${
                        selectedByteIndex === i
                          ? 'border-purple-500 bg-gradient-to-br from-purple-300 to-pink-300 text-purple-900'
                          : 'border-purple-300 bg-purple-100 text-purple-900'
                      }`}>
                        {formatByte(details.sboxWord[i]).toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-center text-gray-600 font-mono">
                    <div>S-box[{((inputByte >> 4) & 0x0F).toString(16).toUpperCase()}][{(inputByte & 0x0F).toString(16).toUpperCase()}]</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* S-box table - Full width, scrollable - Shows selected byte */}
          <div className="w-full">
            {renderSBoxTableSnippet(details.rotatedWord[selectedByteIndex], details.sboxWord[selectedByteIndex])}
          </div>
          </div>
        </details>

        {/* Step 4: RCON Application */}
        <details className="mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-lg border-2 border-red-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  4
                </div>
                <h5 className="font-extrabold text-xl text-red-700">RCON qo'shish jarayoni</h5>
              </div>
              <span className="text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-full px-3 py-1">
                Ochish
              </span>
            </div>
          </summary>
          <div className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side: RCON explanation */}
            <div className="bg-gradient-to-br from-white to-red-50 p-6 rounded-xl shadow-xl border-2 border-red-300">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔑</span>
                <h6 className="font-bold text-xl text-red-800">RCON nima?</h6>
              </div>
              <div className="space-y-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-red-100 to-orange-100 rounded-lg border-l-4 border-red-500">
                  <p className="font-semibold text-gray-800"><strong className="text-red-700">RCON</strong> = Round Constant (Raund konstantasi)</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg border-l-4 border-orange-500">
                  <p className="font-semibold text-gray-800">Har bir raund uchun alohida qiymat</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border-l-4 border-yellow-500">
                  <p className="font-semibold text-gray-800">Faqat <strong className="text-red-700">birinchi bayt</strong>ga qo'shiladi</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-amber-100 to-red-100 rounded-lg border-l-4 border-amber-500">
                  <p className="font-semibold text-gray-800">XOR operatsiyasi orqali qo'shiladi</p>
                </div>
              </div>
              
              {/* RCON Table */}
              <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-red-50 rounded-xl border-2 border-gray-300">
                <h6 className="font-bold text-base mb-3 text-red-800 text-center">📋 RCON jadvali (Round Constants):</h6>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {RCON.slice(0, 11).map((value, index) => (
                    <div 
                      key={index} 
                      className={`p-3 border-2 text-center font-mono rounded-lg shadow-md transition-all transform hover:scale-105 ${
                        index === currentStep 
                          ? 'bg-gradient-to-br from-red-300 to-orange-300 border-red-500 font-bold text-red-900 shadow-lg scale-105' 
                          : 'bg-white border-gray-300 hover:border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <div className="font-bold text-sm mb-1">R{index}</div>
                      <div className={`text-xs font-semibold ${
                        index === currentStep ? 'text-red-900' : 'text-gray-700'
                      }`}>
                        {value.toString(16).padStart(2, '0').toUpperCase()}
                      </div>
                      <div className={`text-xs mt-1 ${
                        index === currentStep ? 'text-red-700' : 'text-gray-500'
                      }`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-r from-red-100 to-orange-100 p-3 rounded-lg border-l-4 border-red-500">
                  <p className="text-sm font-bold text-red-900 text-center">
                    🎯 <strong>Joriy:</strong> RCON[{currentStep}] = {RCON[currentStep].toString(16).padStart(2, '0').toUpperCase()} (Round {currentStep} uchun)
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side: RCON application */}
            <div className="bg-gradient-to-br from-white to-orange-50 p-6 rounded-xl shadow-xl border-2 border-orange-300">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⚙️</span>
                <h6 className="font-bold text-xl text-red-800">RCON qo'shilish jarayoni:</h6>
              </div>
              
              {/* Before RCON */}
              <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200">
                <h6 className="font-bold text-base mb-3 text-purple-800">S-box dan keyin (RCON dan oldin):</h6>
                <div className="flex gap-3 justify-center mb-2">
                  {details.sboxWord.map((byte, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className={`w-14 h-14 border-2 flex items-center justify-center text-sm font-mono rounded-lg shadow-md font-bold ${
                        i === 0 
                          ? 'border-orange-400 bg-gradient-to-br from-orange-200 to-amber-200 text-orange-900' 
                          : 'border-purple-300 bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-900'
                      }`}>
                        {formatByte(byte).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-600 mt-1 font-semibold">
                        Bayt {i}
                        {i === 0 && <span className="block text-orange-600 font-bold">(RCON qo'shiladi)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* XOR operation */}
              <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-300">
                <div className="text-center mb-4">
                  <div className="text-lg font-bold text-orange-700 mb-1">🔄 XOR operatsiyasi:</div>
                  <div className="text-xs text-gray-600">Faqat birinchi baytga RCON qo'shiladi</div>
                </div>
                
                {/* Hex XOR */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-purple-700 font-semibold mb-1">S-box natijasi</div>
                    <div className="w-14 h-14 border-2 border-purple-400 flex items-center justify-center text-base font-mono bg-gradient-to-br from-purple-200 to-indigo-200 rounded-lg shadow-md font-bold text-purple-900">
                      {formatByte(details.sboxWord[0]).toUpperCase()}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">⊕</div>
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-red-700 font-semibold mb-1">RCON</div>
                    <div className="w-14 h-14 border-2 border-red-500 flex items-center justify-center text-base font-mono bg-gradient-to-br from-red-200 to-orange-200 rounded-lg shadow-md font-bold text-red-900">
                      {formatByte(details.rconValue).toUpperCase()}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-700">=</div>
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-green-700 font-semibold mb-1">Natija</div>
                    <div className="w-14 h-14 border-2 border-green-500 flex items-center justify-center text-base font-mono bg-gradient-to-br from-green-200 to-emerald-200 rounded-lg shadow-lg font-bold text-green-900">
                      {formatByte(details.transformedWord[0]).toUpperCase()}
                    </div>
                  </div>
                </div>
                
                {/* Binary XOR */}
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-5 rounded-xl border-2 border-gray-300 shadow-lg">
                  <div className="text-center mb-4">
                    <div className="text-base font-bold text-gray-800 mb-1">📊 Binary formatda XOR:</div>
                    <div className="text-xs text-gray-600">Har bir bit alohida XOR qilinadi</div>
                  </div>
                  
                  {/* Bit-by-bit explanation */}
                  <div className="mt-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300">
                    <div className="text-sm font-bold text-blue-800 mb-3 text-center">Bitlar bo‘yicha XOR amali (ustun ko‘rinishda):</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-16 text-right text-sm font-mono text-purple-700 font-semibold">S-box:</span>
                        <div className="inline-grid grid-cols-8 gap-[2px]">
                          {details.sboxWord[0].toString(2).padStart(8, '0').split('').map((bit, i) => (
                            <span key={i} className="inline-block w-5 text-center text-sm border border-purple-200 bg-purple-50 p-0.5 rounded">{bit}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">⊕</div>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-16 text-right text-sm font-mono text-red-700 font-semibold">RCON:</span>
                        <div className="inline-grid grid-cols-8 gap-[2px]">
                          {details.rconValue.toString(2).padStart(8, '0').split('').map((bit, i) => (
                            <span key={i} className="inline-block w-5 text-center text-sm border border-red-200 bg-red-50 p-0.5 rounded">{bit}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-700">=</div>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-16 text-right text-sm font-mono text-green-700 font-bold">Natija:</span>
                        <div className="inline-grid grid-cols-8 gap-[2px]">
                          {details.transformedWord[0].toString(2).padStart(8, '0').split('').map((bit, i) => (
                            <span key={i} className="inline-block w-5 text-center text-sm border-2 border-green-400 bg-green-100 p-0.5 rounded font-bold">{bit}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                    <div className="text-xs font-bold text-yellow-900 text-center">
                      <strong>Eslatma:</strong> Faqat birinchi baytga RCON qo'shiladi, qolgan 3 ta bayt o'zgarishsiz qoladi!
                    </div>
                  </div>
                </div>
              </div>
              
              {/* After RCON */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300">
                <h6 className="font-bold text-base mb-3 text-green-800 text-center">✅ RCON qo'shilgandan keyin:</h6>
                <div className="flex gap-3 justify-center mb-3">
                  {details.transformedWord.map((byte, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className={`w-14 h-14 border-2 flex items-center justify-center text-sm font-mono rounded-lg shadow-md font-bold ${
                        i === 0 
                          ? 'border-green-500 bg-gradient-to-br from-green-300 to-emerald-300 text-green-900 shadow-lg scale-105' 
                          : 'border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
                      }`}>
                        {formatByte(byte).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-600 mt-1 font-semibold text-center">
                        Bayt {i}
                        {i === 0 && <span className="block text-green-700 font-bold mt-1">O'zgargan</span>}
                        {i > 0 && <span className="block text-gray-500 text-xs mt-1">O'zgarmadi</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-green-500">
                  <div className="text-sm text-gray-700 font-semibold text-center">
                    <strong className="text-green-700">Natija:</strong> Faqat birinchi bayt (Bayt 0) o'zgardi, qolgan 3 ta bayt o'zgarishsiz qoldi.
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </details>

        {/* Step 5: XOR with Previous Key */}
        <details className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg border-2 border-green-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  5
                </div>
                <h5 className="font-extrabold text-xl text-green-700">Yangi kalitning birinchi word'i yaratilishi</h5>
              </div>
              <span className="text-xs font-semibold text-green-700 bg-white border border-green-200 rounded-full px-3 py-1">
                Ochish
              </span>
            </div>
          </summary>
          <div className="mt-4">
            <div className="bg-gradient-to-br from-white to-green-50 p-6 rounded-xl shadow-xl border-2 border-green-400 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">💡</span>
              <h6 className="font-bold text-xl text-green-800">Bu qadam nima qiladi?</h6>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-l-4 border-green-500">
                <p className="font-semibold text-gray-800">🎯 <strong className="text-green-700">Maqsad:</strong> Yangi kalitning birinchi wordini (4 bayt) yaratish</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg border-l-4 border-emerald-500">
                <p className="font-semibold text-gray-800">📐 <strong className="text-green-700">Formula:</strong> <span className="font-mono">Yangi word = Oldingi word ⊕ O'zgartirilgan word</span></p>
              </div>
              <div className="p-3 bg-gradient-to-r from-teal-100 to-green-100 rounded-lg border-l-4 border-teal-500">
                <p className="font-semibold text-gray-800">✨ <strong className="text-green-700">Natija:</strong> Bu yangi kalitning birinchi 4 bayti bo'ladi</p>
              </div>
            </div>
          </div>
          
          {/* Three columns layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Column 1: Previous Key First Word */}
            <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 p-6 rounded-xl shadow-xl border-2 border-blue-400">
              <div className="text-center mb-5">
                <div className="inline-block w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg mb-3">
                  1
                </div>
                <h6 className="font-bold text-xl text-blue-900">OLDINGI KALITNING BIRINCHI WORD'I</h6>
                <div className="text-xs text-gray-600 mt-2 font-semibold">Oldingi kalitning [0, 1, 2, 3] indekslaridagi baytlardan</div>
              </div>
              <div className="flex gap-2 justify-center mb-4">
                {details.firstWordPrev.map((byte, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-14 h-14 border-2 border-blue-400 flex items-center justify-center text-base font-mono bg-gradient-to-br from-blue-200 to-cyan-200 text-blue-900 rounded-lg shadow-md font-bold">
                      {formatByte(byte).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-700 mt-1 font-semibold">Bayt {i}</span>
                  </div>
                ))}
              </div>
              
            </div>
            
            {/* Column 2: Transformed Word */}
            <div className="bg-gradient-to-br from-red-50 via-pink-50 to-red-100 p-6 rounded-xl shadow-xl border-2 border-red-400">
              <div className="text-center mb-5">
                <div className="inline-block w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg mb-3">
                  2
                </div>
                <h6 className="font-bold text-xl text-red-900">O'ZGARTIRILGAN WORD</h6>
                <div className="text-xs text-gray-600 mt-2 font-semibold">RotWord + SubWord + RCON natijasi</div>
              </div>
              <div className="flex gap-2 justify-center mb-4">
                {details.transformedWord.map((byte, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={`w-14 h-14 border-2 flex items-center justify-center text-base font-mono rounded-lg shadow-md font-bold ${
                      i === 0 
                        ? 'border-green-500 bg-gradient-to-br from-green-300 to-emerald-300 text-green-900 shadow-lg scale-110' 
                        : 'border-red-400 bg-gradient-to-br from-red-200 to-pink-200 text-red-900'
                    }`}>
                      {formatByte(byte).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-700 mt-1 font-semibold text-center">
                      Bayt {i}
                      {i === 0 && <span className="block text-green-700 font-bold mt-1">(RCON)</span>}
                    </span>
                  </div>
                ))}
              </div>
              
            </div>
            
            {/* Column 3: XOR Result */}
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 p-6 rounded-xl shadow-xl border-2 border-green-400">
              <div className="text-center mb-5">
                <div className="inline-block w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg mb-3">
                  3
                </div>
                <h6 className="font-bold text-xl text-green-900">XOR NATIJASI (YANGI WORD)</h6>
                <div className="text-xs text-gray-600 mt-2 font-semibold">Yangi kalitning birinchi word'i</div>
              </div>
              <div className="flex gap-2 justify-center mb-4">
                {details.xorResult.map((byte, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-14 h-14 border-2 border-green-500 flex items-center justify-center text-base font-mono bg-gradient-to-br from-green-300 to-emerald-300 text-green-900 rounded-lg shadow-lg font-bold">
                      {formatByte(byte).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-700 mt-1 font-semibold">Bayt {i}</span>
                  </div>
                ))}
              </div>
              
            </div>
          </div>
          
          {/* Visual XOR connection */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 rounded-xl border-2 border-purple-300">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="text-center">
                <div className="text-xs font-bold text-blue-800 mb-2">Oldingi Word</div>
                <div className="flex gap-1">
                  {details.firstWordPrev.map((byte, i) => (
                    <div key={i} className="w-10 h-10 border border-blue-400 flex items-center justify-center text-xs font-mono bg-blue-100 rounded font-bold">
                      {formatByte(byte).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-600">⊕</div>
              <div className="text-center">
                <div className="text-xs font-bold text-red-800 mb-2">O'zgartirilgan Word</div>
                <div className="flex gap-1">
                  {details.transformedWord.map((byte, i) => (
                    <div key={i} className={`w-10 h-10 border flex items-center justify-center text-xs font-mono rounded font-bold ${
                      i === 0 
                        ? 'border-green-500 bg-green-100' 
                        : 'border-red-400 bg-red-100'
                    }`}>
                      {formatByte(byte).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-700">=</div>
              <div className="text-center">
                <div className="text-xs font-bold text-green-800 mb-2">Yangi Word</div>
                <div className="flex gap-1">
                  {details.xorResult.map((byte, i) => (
                    <div key={i} className="w-10 h-10 border-2 border-green-500 flex items-center justify-center text-xs font-mono bg-green-200 rounded-lg font-bold shadow-md">
                      {formatByte(byte).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Detailed XOR operations */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl border-2 border-gray-400 shadow-lg">
            <h6 className="font-extrabold text-xl text-gray-900 mb-5 text-center">HAR BIR BAYT UCHUN XOR OPERATSIYASI:</h6>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {details.xorResult.map((resultByte, i) => {
                const prevByte = details.firstWordPrev[i];
                const transByte = details.transformedWord[i];
                
                return (
                  <div key={i} className="bg-white p-4 rounded-xl border-2 border-gray-300 shadow-md hover:shadow-lg transition-all">
                    <div className="text-center mb-3">
                      <div className="text-base font-bold text-gray-800 mb-1">Bayt {i} XOR:</div>
                      <div className="inline-block px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                        <span className="text-xs font-mono font-semibold">
                          {formatByte(prevByte).toUpperCase()} ⊕ {formatByte(transByte).toUpperCase()} = <span className="text-green-700 font-bold">{formatByte(resultByte).toUpperCase()}</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Binary XOR */}
                    <div className="space-y-0.5 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                      <div className="text-center">
                        {renderBitBoxes(prevByte, 'blue')}
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-extrabold text-orange-600 leading-none">⊕</div>
                      </div>
                      <div className="text-center">
                        {renderBitBoxes(transByte, 'red')}
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-extrabold text-gray-700 leading-none">=</div>
                      </div>
                      <div className="text-center">
                        {renderBitBoxes(resultByte, 'green')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-5 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border-l-4 border-green-500">
              <div className="text-center">
                <div className="text-base font-bold text-green-800">
                  Bu 4 bayt yangi kalitning birinchi word'ini tashkil qiladi!
                </div>
                <div className="text-sm text-green-700 mt-2 font-semibold">
                  Endi qolgan 3 ta word shu word asosida yaratiladi.
                </div>
              </div>
            </div>
          </div>
          
          {/* Remaining words generation */}
          <div className="mt-6 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-100 p-6 rounded-xl border-2 border-purple-300 shadow-lg">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="text-2xl">🔄</span>
              <h6 className="font-extrabold text-xl text-purple-900">QOLGAN 3 TA WORD YARATILISHI</h6>
            </div>
            
            <div className="bg-white p-5 rounded-lg border-l-4 border-purple-500 mb-5">
              <div className="text-sm text-gray-800 mb-2">
                <p className="font-semibold mb-2">📝 <strong className="text-purple-700">Eslatma:</strong> Birinchi word topilgandan keyin, qolgan 3 ta word oddiy XOR orqali yaratiladi:</p>
                <p className="font-mono bg-purple-50 p-3 rounded-lg border border-purple-200 text-center">
                  <strong className="text-purple-900">Formula:</strong> Word[i] = Word[i-1] ⊕ Oldingi_Word[i] <span className="text-purple-600">(i = 1, 2, 3 uchun)</span>
                </p>
              </div>
            </div>
            
            {/* Visual matrix showing word generation */}
            <div className="mt-6 bg-gradient-to-br from-white via-purple-50 to-white p-6 rounded-xl border-2 border-purple-300 shadow-lg">
              <div className="flex items-center justify-center gap-3 mb-5">
                <span className="text-2xl">📊</span>
                <h6 className="font-extrabold text-xl text-purple-900">QOLGAN 3 TA WORD YARATILISHI (VIZUAL)</h6>
              </div>
              
              {/* Step-by-step word generation */}
              <div className="space-y-6">
                {/* Step 1: Word 1 generation */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-300 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <h6 className="font-bold text-lg text-blue-900">Word 1 yaratilishi (Bayt 4-7)</h6>
                  </div>
                  
                  {/* Visual XOR flow */}
                  <div className="bg-white p-4 rounded-lg border-2 border-blue-200 mb-4">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="text-center">
                        <div className="text-xs font-bold text-green-700 mb-2">Yangi Word[0] (topilgan):</div>
                        <div className="flex gap-2 justify-center">
                          {details.xorResult.map((byte, i) => (
                            <div key={i} className="w-12 h-12 border-2 border-green-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-green-200 to-emerald-200 text-green-900 rounded-lg shadow-md font-bold">
                              {formatByte(byte).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-orange-600">⊕</div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-700 mb-2">Oldingi Word[1]:</div>
                        <div className="flex gap-2 justify-center">
                          {[4, 5, 6, 7].map(i => (
                            <div key={i} className="w-12 h-12 border-2 border-gray-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 rounded-lg shadow-sm">
                              {formatByte(currentStepData.inputKey[i]).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-700">=</div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-blue-700 mb-2">Yangi Word[1]:</div>
                        <div className="flex gap-2 justify-center">
                          {[4, 5, 6, 7].map(i => (
                            <div key={i} className="w-12 h-12 border-2 border-blue-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-blue-200 to-cyan-200 text-blue-900 rounded-lg shadow-lg font-bold">
                              {formatByte(currentStepData.outputKey[i]).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-100 p-3 rounded-lg border-l-4 border-blue-500 mb-4">
                    <div className="text-center">
                      <div className="text-sm font-mono font-bold text-blue-900">
                        Word[1] = Word[0] ⊕ Oldingi_Word[1]
                      </div>
                    </div>
                  </div>
                  
                  {/* Binary XOR for Word 1 - 2x2 Grid Format */}
                  <div className="bg-white p-5 rounded-lg border-2 border-blue-300">
                    <div className="text-sm font-bold text-blue-800 mb-4 text-center">Ikkilik XOR (Word 1):</div>
                    <div className="grid grid-cols-2 gap-4">
                      {[4, 5, 6, 7].map(i => {
                        const word0Byte = details.xorResult[i - 4];
                        const oldWord1Byte = currentStepData.inputKey[i];
                        const newWord1Byte = currentStepData.outputKey[i];
                        
                        return (
                          <div key={i} className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-300 shadow-md hover:shadow-lg transition-all">
                            <div className="text-xs font-mono mb-3 text-center font-bold text-blue-900">
                              Bayt {i}: {formatByte(word0Byte).toUpperCase()} ⊕ {formatByte(oldWord1Byte).toUpperCase()} = <span className="text-green-700">{formatByte(newWord1Byte).toUpperCase()}</span>
                            </div>
                            <div className="space-y-0.5 bg-white p-1.5 rounded-lg border border-blue-200">
                              <div className="text-xs font-mono text-blue-600 text-center font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 tracking-tighter">{formatBinaryBits(word0Byte)}</div>
                              <div className="text-base text-orange-600 text-center font-extrabold leading-none">⊕</div>
                              <div className="text-xs font-mono text-red-600 text-center font-semibold bg-red-50 p-1.5 rounded border border-red-200 tracking-tighter">{formatBinaryBits(oldWord1Byte)}</div>
                              <div className="text-base text-gray-600 text-center font-extrabold leading-none">=</div>
                              <div className="text-xs font-mono text-green-700 font-bold text-center bg-green-100 p-1.5 rounded border-2 border-green-300 tracking-tighter">{formatBinaryBits(newWord1Byte)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Step 2: Word 2 generation */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-xl border-2 border-orange-300 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <h6 className="font-bold text-lg text-orange-900">Word 2 yaratilishi (Bayt 8-11)</h6>
                  </div>
                  
                  {/* Visual XOR flow */}
                  <div className="bg-white p-4 rounded-lg border-2 border-orange-200 mb-4">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="text-center">
                        <div className="text-xs font-bold text-blue-700 mb-2">Yangi Word[1] (topilgan):</div>
                        <div className="flex gap-2 justify-center">
                          {[4, 5, 6, 7].map(i => (
                            <div key={i} className="w-12 h-12 border-2 border-blue-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-blue-200 to-cyan-200 text-blue-900 rounded-lg shadow-md font-bold">
                              {formatByte(currentStepData.outputKey[i]).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-orange-600">⊕</div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-700 mb-2">Oldingi Word[2]:</div>
                        <div className="flex gap-2 justify-center">
                          {[8, 9, 10, 11].map(i => (
                            <div key={i} className="w-12 h-12 border-2 border-gray-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 rounded-lg shadow-sm">
                              {formatByte(currentStepData.inputKey[i]).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-700">=</div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-orange-700 mb-2">Yangi Word[2]:</div>
                        <div className="flex gap-2 justify-center">
                          {[8, 9, 10, 11].map(i => (
                            <div key={i} className="w-12 h-12 border-2 border-orange-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-orange-200 to-amber-200 text-orange-900 rounded-lg shadow-lg font-bold">
                              {formatByte(currentStepData.outputKey[i]).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-100 p-3 rounded-lg border-l-4 border-orange-500 mb-4">
                    <div className="text-center">
                      <div className="text-sm font-mono font-bold text-orange-900">
                        Word[2] = Word[1] ⊕ Oldingi_Word[2]
                      </div>
                    </div>
                  </div>
                  
                  {/* Binary XOR for Word 2 - 2x2 Grid Format */}
                  <div className="bg-white p-5 rounded-lg border-2 border-orange-300">
                    <div className="text-sm font-bold text-orange-800 mb-4 text-center">Ikkilik XOR (Word 2):</div>
                    <div className="grid grid-cols-2 gap-4">
                      {[8, 9, 10, 11].map(i => {
                        const word1Byte = currentStepData.outputKey[i - 4];
                        const oldWord2Byte = currentStepData.inputKey[i];
                        const newWord2Byte = currentStepData.outputKey[i];
                        
                        return (
                          <div key={i} className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border-2 border-orange-300 shadow-md hover:shadow-lg transition-all">
                            <div className="text-xs font-mono mb-3 text-center font-bold text-orange-900">
                              Bayt {i}: {formatByte(word1Byte).toUpperCase()} ⊕ {formatByte(oldWord2Byte).toUpperCase()} = <span className="text-green-700">{formatByte(newWord2Byte).toUpperCase()}</span>
                            </div>
                            <div className="space-y-0.5 bg-white p-1.5 rounded-lg border border-orange-200">
                              <div className="text-xs font-mono text-blue-600 text-center font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 tracking-tighter">{formatBinaryBits(word1Byte)}</div>
                              <div className="text-base text-orange-600 text-center font-extrabold leading-none">⊕</div>
                              <div className="text-xs font-mono text-red-600 text-center font-semibold bg-red-50 p-1.5 rounded border border-red-200 tracking-tighter">{formatBinaryBits(oldWord2Byte)}</div>
                              <div className="text-base text-gray-600 text-center font-extrabold leading-none">=</div>
                              <div className="text-xs font-mono text-green-700 font-bold text-center bg-green-100 p-1.5 rounded border-2 border-green-300 tracking-tighter">{formatBinaryBits(newWord2Byte)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Step 3: Word 3 generation */}
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-5 rounded-xl border-2 border-pink-300 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <h6 className="font-bold text-lg text-pink-900">Word 3 yaratilishi (Bayt 12-15)</h6>
                  </div>
                  
                  {/* Visual XOR flow */}
                  <div className="bg-white p-4 rounded-lg border-2 border-pink-200 mb-4">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="text-center">
                        <div className="text-xs font-bold text-orange-700 mb-2">Yangi Word[2] (topilgan):</div>
                        <div className="flex gap-2 justify-center">
                          {[8, 9, 10, 11].map(i => (
                            <div key={i} className="w-12 h-12 border-2 border-orange-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-orange-200 to-amber-200 text-orange-900 rounded-lg shadow-md font-bold">
                              {formatByte(currentStepData.outputKey[i]).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-orange-600">⊕</div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-700 mb-2">Oldingi Word[3]:</div>
                        <div className="flex gap-2 justify-center">
                          {[12, 13, 14, 15].map(i => (
                            <div key={i} className="w-12 h-12 border-2 border-gray-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 rounded-lg shadow-sm">
                              {formatByte(currentStepData.inputKey[i]).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-700">=</div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-pink-700 mb-2">Yangi Word[3]:</div>
                        <div className="flex gap-2 justify-center">
                          {[12, 13, 14, 15].map(i => (
                            <div key={i} className="w-12 h-12 border-2 border-pink-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-pink-200 to-rose-200 text-pink-900 rounded-lg shadow-lg font-bold">
                              {formatByte(currentStepData.outputKey[i]).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-pink-100 p-3 rounded-lg border-l-4 border-pink-500 mb-4">
                    <div className="text-center">
                      <div className="text-sm font-mono font-bold text-pink-900">
                        Word[3] = Word[2] ⊕ Oldingi_Word[3]
                      </div>
                    </div>
                  </div>
                  
                  {/* Binary XOR for Word 3 - 2x2 Grid Format */}
                  <div className="bg-white p-5 rounded-lg border-2 border-pink-300">
                    <div className="text-sm font-bold text-pink-800 mb-4 text-center">Ikkilik XOR (Word 3):</div>
                    <div className="grid grid-cols-2 gap-4">
                      {[12, 13, 14, 15].map(i => {
                        const word2Byte = currentStepData.outputKey[i - 4];
                        const oldWord3Byte = currentStepData.inputKey[i];
                        const newWord3Byte = currentStepData.outputKey[i];
                        
                        return (
                          <div key={i} className="bg-gradient-to-br from-pink-50 to-rose-50 p-4 rounded-xl border-2 border-pink-300 shadow-md hover:shadow-lg transition-all">
                            <div className="text-xs font-mono mb-3 text-center font-bold text-pink-900">
                              Bayt {i}: {formatByte(word2Byte).toUpperCase()} ⊕ {formatByte(oldWord3Byte).toUpperCase()} = <span className="text-green-700">{formatByte(newWord3Byte).toUpperCase()}</span>
                            </div>
                            <div className="space-y-0.5 bg-white p-1.5 rounded-lg border border-pink-200">
                              <div className="text-xs font-mono text-blue-600 text-center font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 tracking-tighter">{formatBinaryBits(word2Byte)}</div>
                              <div className="text-base text-orange-600 text-center font-extrabold leading-none">⊕</div>
                              <div className="text-xs font-mono text-red-600 text-center font-semibold bg-red-50 p-1.5 rounded border border-red-200 tracking-tighter">{formatBinaryBits(oldWord3Byte)}</div>
                              <div className="text-base text-gray-600 text-center font-extrabold leading-none">=</div>
                              <div className="text-xs font-mono text-green-700 font-bold text-center bg-green-100 p-1.5 rounded border-2 border-green-300 tracking-tighter">{formatBinaryBits(newWord3Byte)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Final result */}
              <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded border border-green-200">
                <div className="text-center">
                  <div className="text-sm font-bold text-green-700 mb-2">YANGI KALITNING TO'LIQ MATRITSASI:</div>
                  <div className="text-xs text-gray-600 mb-2">Barcha 4 ta word yaratildi!</div>
                  <div className="flex justify-center">
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 4 }).flatMap((_, row) =>
                        Array.from({ length: 4 }).map((_, col) => {
                          const i = row + col * 4;
                          let colorClass = '';
                          if (col === 0) colorClass = 'bg-green-100 border-green-300 text-green-800'; // Word 0
                          else if (col === 1) colorClass = 'bg-blue-100 border-blue-300 text-blue-800'; // Word 1
                          else if (col === 2) colorClass = 'bg-orange-100 border-orange-300 text-orange-800'; // Word 2
                          else colorClass = 'bg-pink-100 border-pink-300 text-pink-800'; // Word 3

                          return (
                            <div
                              key={`${row}-${col}`}
                              className={`w-8 h-8 border-2 flex items-center justify-center text-xs font-mono rounded ${colorClass}`}
                            >
                              {formatByte(currentStepData.outputKey[i])}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <span className="text-green-600">Yashil:</span> Word 0 | 
                    <span className="text-blue-600"> Ko'k:</span> Word 1 | 
                    <span className="text-orange-600"> To‘q sariq:</span> Word 2 | 
                    <span className="text-pink-600"> Pushti:</span> Word 3
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </details>
      </div>
    );
  };

  // Helper: Format full round key as HEX in one line
  const formatKeyRow = (key: number[]) => key.map(formatByte).join(' ');
  // Helper: HEX ko‘rinishda butun uzunlik
  const getKeyLength = () => initialKey.length;
  // Calculate all round keys for the selected key length (universal)
  const getKeyExpansion = () => {
    const keyLen = initialKey.length;
    const enumLen = keyLen === 16 ? KeyLength.AES_128 : keyLen === 24 ? KeyLength.AES_192 : KeyLength.AES_256;
    const roundKeys = keyExpansion(initialKey, enumLen);
    return roundKeys.map((k, i) => ({ round: i, key: k }));
  };

  // Pastga: Key schedule summary jadvali
  const renderKeyScheduleSummary = () => {
    const keys = getKeyExpansion();
    const byteLength = getKeyLength();
    return (
      <div className="mt-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-4xl">🔑</span>
          <h3 className="font-extrabold text-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
            Barcha round kalitlar jadvali
          </h3>
        </div>
        
        <div className="bg-gradient-to-br from-white via-purple-50 to-indigo-50 p-6 rounded-2xl shadow-xl border-2 border-purple-300 mb-6">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full text-center text-sm font-mono shadow-lg rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600">
                    <th className="px-6 py-4 text-white font-extrabold text-base border-r-2 border-purple-400">
                      <div className="flex items-center justify-center gap-2">
                        <span>📊</span>
                        <span>Round</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-white font-extrabold text-base">
                      <div className="flex items-center justify-center gap-2">
                        <span>🔐</span>
                        <span>Round kalit (HEX, {byteLength} bayt)</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {keys.map(({round, key}, index) => (
                    <tr 
                      key={round} 
                      className={`
                        transition-all duration-300 hover:scale-[1.02]
                        ${round === currentStep 
                          ? 'bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100 font-bold shadow-lg border-l-4 border-yellow-500' 
                          : index % 2 === 0 
                            ? 'bg-gradient-to-r from-white to-purple-50/30' 
                            : 'bg-gradient-to-r from-purple-50/50 to-indigo-50/30'
                        }
                      `}
                    >
                      <td className={`
                        px-6 py-4 border-r-2 border-purple-200 font-bold
                        ${round === currentStep 
                          ? 'text-yellow-900 text-lg' 
                          : 'text-purple-800'
                        }
                      `}>
                        <div className={`
                          inline-flex items-center justify-center w-12 h-12 rounded-full
                          ${round === currentStep
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg scale-110'
                            : 'bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-800 shadow-md'
                          }
                        `}>
                          {round}
                        </div>
                      </td>
                      <td className={`
                        px-6 py-4 font-mono whitespace-pre-wrap break-all
                        ${round === currentStep 
                          ? 'text-yellow-900 text-base' 
                          : 'text-gray-800'
                        }
                      `}>
                        <div className={`
                          inline-block px-4 py-2 rounded-lg border-2 shadow-md
                          ${round === currentStep
                            ? 'bg-yellow-50 border-yellow-400'
                            : 'bg-white border-purple-200 hover:border-purple-400 hover:shadow-lg'
                          }
                        `}>
                          {formatKeyRow(key)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-5 rounded-xl border-l-4 border-blue-500 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">ℹ️</span>
            <div>
              <p className="text-lg text-gray-700 font-semibold mb-3">
                <strong className="text-blue-800">Jami {keys.length} ta round kalit</strong> (kalit uzunligiga mos ravishda) ko'rsatiladi.
              </p>
              <ul className="text-base text-gray-600 space-y-2 list-disc list-inside">
                <li><strong>Round 0:</strong> Boshlang'ich kalit (foydalanuvchi tomonidan berilgan)</li>
                <li><strong>Round 1-{keys.length - 1}:</strong> Har bir round uchun generatsiya qilingan kalitlar</li>
                <li>Har bir kalit shifrlash jarayonida mos round bosqichida ishlatiladi</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={topRef} className="w-full">
      {/* Step Navigation - Modern Design */}
      <div className="flex justify-between items-center mb-6 gap-4 sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg py-4 px-6">
        <button 
          onClick={() => onStepChange(currentStep - 1)}
          disabled={currentStep === 0}
          className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all ${
            currentStep === 0 
              ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-xl transform hover:scale-105'
          }`}
        >
          ⬅️ Oldingi qadam
        </button>
        
        <div className="text-center flex-1 px-4">
          <div className="text-2xl font-extrabold text-slate-800 mb-1">{currentStepData.title}</div>
          <div className="text-sm text-slate-600 font-semibold">
            Qadam {currentStep + 1} / {steps.length}
          </div>
        </div>
        
        <button 
          onClick={() => onStepChange(currentStep + 1)}
          disabled={currentStep === steps.length - 1}
          className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all ${
            currentStep === steps.length - 1 
              ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-xl transform hover:scale-105'
          }`}
        >
          Keyingi qadam ➡️
        </button>
      </div>

      {/* Current Step Content - Modern Card */}
      <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl shadow-xl border-2 border-blue-100">
        <div className="mb-6">
          <h3 className="text-2xl font-extrabold mb-2 text-slate-800">{currentStepData.title}</h3>
          <p className="text-gray-600 text-lg">{currentStepData.description}</p>
        </div>

        {/* Key Matrices */}
        {currentStep !== steps.length - 1 && (
          <div className={`grid gap-8 mb-6 ${currentStep === 0 ? 'justify-center' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {currentStep > 0 && (
              <div>
                {renderMatrix(
                  currentStepData.inputKey, 
                  [12, 13, 14, 15],
                  'Oldingi kalit',
                  false
                )}
              </div>
            )}
            
            <div className={currentStep === 0 ? 'max-w-md' : ''}>
              {renderMatrix(
                currentStepData.outputKey, 
                currentStepData.highlightedCells, 
                'Yangi kalit',
                false
              )}
            </div>
          </div>
        )}

        {/* Transformation Details */}
        {renderTransformationDetails(currentStepData.transformationDetails)}

        {/* AES Key Image - faqat boshlang'ich kalit bo'limida */}
        {currentStep === 0 && (
          <div className="mt-8 flex justify-center">
            <img src="/AESkey.jpg" alt="AES Key Diagram" className="max-w-2xl w-full rounded-lg shadow-lg" />
          </div>
        )}

        {/* Explanation - Modern Design */}
        {currentStep !== steps.length - 1 && (
          <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border-2 border-blue-200">
            <h4 className="font-bold text-xl mb-4 text-slate-800">📚 Batafsil tushuntirish:</h4>
            <p className="whitespace-pre-line text-base text-gray-700 leading-relaxed">{currentStepData.explanation}</p>
            
            {currentStep > 0 && (
              <div className="mt-6 p-5 bg-white rounded-xl border-2 border-blue-300 shadow-md">
                <h5 className="font-bold text-lg mb-4 text-blue-800">🔢 Matematik formulalar:</h5>
                <div className="text-base space-y-3">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-500">
                    <strong className="text-blue-700">1. RotWord:</strong> <span className="font-mono text-gray-700">[a₀, a₁, a₂, a₃] → [a₁, a₂, a₃, a₀]</span>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500">
                    <strong className="text-purple-700">2. SubWord:</strong> <span className="font-mono text-gray-700">bᵢ = S-box[aᵢ]</span> <span className="text-gray-600">(har bir bayt uchun)</span>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-pink-50 to-red-50 rounded-lg border-l-4 border-pink-500">
                    <strong className="text-pink-700">3. RCON qo'shish:</strong> <span className="font-mono text-gray-700">c₀ = b₀ ⊕ RCON[round], cᵢ = bᵢ</span> <span className="text-gray-600">(i {'>'} 0 uchun)</span>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500">
                    <strong className="text-green-700">4. XOR:</strong> <span className="font-mono text-gray-700">w₀ = oldingi_w₀ ⊕ c, wᵢ = oldingi_wᵢ ⊕ wᵢ₋₁</span> <span className="text-gray-600">(i {'>'} 0 uchun)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Jadval: barcha round key lar – faqat oxiriga yetganda */}
      {currentStep === steps.length - 1 && renderKeyScheduleSummary()}
      
      {/* Step Progress - Modern Design */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl shadow-lg border-2 border-blue-200">
        <div className="flex justify-between text-sm font-semibold text-gray-700 mb-3">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            Boshlang'ich kalit
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            Raund {(initialKey.length === 16 ? 10 : initialKey.length === 24 ? 12 : 14)} kaliti
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
          <div 
            className="bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-lg relative overflow-hidden"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
          </div>
        </div>
        <div className="flex justify-between text-xs font-semibold text-gray-600 mt-3">
          {steps.map((_, index) => (
            <span 
              key={index} 
              className={`px-2 py-1 rounded transition-all ${
                index === currentStep 
                  ? 'bg-blue-600 text-white shadow-md scale-110 font-bold' 
                  : index < currentStep
                  ? 'text-blue-600'
                  : 'text-gray-400'
              }`}
            >
              {index === 0 ? '0' : index}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyGenerationVisualizer;
