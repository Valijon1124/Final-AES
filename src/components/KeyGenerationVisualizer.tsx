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
    const keyBits = keyLen * 8;
    const numRounds = keyLen === 16 ? 10 : keyLen === 24 ? 12 : 14;
    const wordsInKey = keyLen / 4;
    const totalWords = 4 * (numRounds + 1);
    const isAes192 = keyLen === 24;
    const isAes256 = keyLen === 32;
    const generationStepCount = Math.ceil((totalWords - wordsInKey) / wordsInKey);
    
    // Add initial step
    steps.push({
      stepNumber: 0,
      title: 'Boshlang\'ich kalit',
      description: isAes256
        ? `Foydalanuvchi tomonidan berilgan asl ${keyBits}-bitli kalit (Round 0 va Round 1 kalitlari)`
        : isAes192
        ? `Foydalanuvchi tomonidan berilgan asl ${keyBits}-bitli kalit (Round 0 va Round 1/2 kalitlari)`
        : `Foydalanuvchi tomonidan berilgan asl ${keyBits}-bitli kalit`,
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
      explanation: isAes256
        ? `Bu foydalanuvchi tomonidan berilgan asl ${keyBits}-bitli kalitdir. AES-256 da bu kalitning o'zi Round 0 va Round 1 kalitlarini beradi. Keyingi raund kalitlar shu asosda yaratiladi.`
        : isAes192
        ? `Bu foydalanuvchi tomonidan berilgan asl ${keyBits}-bitli kalitdir. AES-192 da bu kalit Round 0 ni to'liq va Round 1 ning yarmini beradi. Keyingi bosqichlarda bu ketma-ketlik davom etadi.`
        : `Bu foydalanuvchi tomonidan berilgan asl ${keyBits}-bitli kalitdir. Keyingi barcha raund kalitlar shu kalit asosida yaratiladi.`
    });

    // Generate rounds of key expansion
    for (let round = 1; round <= generationStepCount; round++) {
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
      // 4 for 128-bit, 6 for 192-bit, 8 for 256-bit
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
      
      let roundLabel = `${round}`;
      let roundRangeLabel = `${round}`;

      if (isAes256) {
        const startRound = round * 2;
        const endRound = Math.min(startRound + 1, numRounds);
        roundLabel = startRound === endRound ? `${startRound}` : `${startRound},${endRound}`;
        roundRangeLabel = startRound === endRound ? `${startRound}` : `${startRound}-${endRound}`;
      } else if (isAes192) {
        const startWord = round * wordsInKey;
        const endWord = Math.min(startWord + wordsInKey - 1, totalWords - 1);
        const roundParts: string[] = [];
        const firstRound = Math.floor(startWord / 4);
        const lastRound = Math.floor(endWord / 4);

        for (let r = firstRound; r <= lastRound; r++) {
          const overlapStart = Math.max(startWord, r * 4);
          const overlapEnd = Math.min(endWord, r * 4 + 3);
          const overlapLength = overlapEnd - overlapStart + 1;

          if (overlapLength === 4) {
            roundParts.push(`${r}`);
          } else if (overlapLength === 2) {
            roundParts.push(`${r}/2`);
          }
        }

        roundLabel = roundParts.join(' va ');
        roundRangeLabel = roundLabel;
      }

      // Add step for this round
      steps.push({
        stepNumber: round,
        title: `${roundLabel} - raund  kalitlari`,
        description: `${roundRangeLabel} raund(lar) uchun kalitni kengaytirish jarayoni`,
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
          ${roundRangeLabel}-raund(lar) uchun kalitni kengaytirish jarayoni:
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
      stepNumber: generationStepCount + 1,
      title: 'Kalitlar jadvali ',
      description: 'Barcha raund kalitlarni umumiy jadvalda ko\'rish',
      inputKey: roundKeys[generationStepCount - 1] || key,
      outputKey: roundKeys[generationStepCount] || key,
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
      explanation: 'Kalit generatsiyasi tugadi. Quyida barcha raund kalitlar (0-raunddan boshlab) ko\'rsatiladi.'
    });
    
    return steps;
  };

  const steps = generateKeyExpansionSteps(initialKey);
  const currentStepData = steps[currentStep];
  const hasStepExplanation = Boolean(currentStepData.explanation?.trim());
  const enumLen =
    initialKey.length === 16
      ? KeyLength.AES_128
      : initialKey.length === 24
      ? KeyLength.AES_192
      : KeyLength.AES_256;
  const allRoundKeys = keyExpansion(initialKey, enumLen);
  const isLongKeyFinalRoundStep =
    initialKey.length > 16 &&
    currentStep > 0 &&
    currentStep === steps.length - 2;
  const displayedOutputKey =
    isLongKeyFinalRoundStep ? currentStepData.outputKey.slice(0, 16) : currentStepData.outputKey;
  const displayedInputKey = currentStepData.inputKey;
  const maxDisplayColumns = Math.max(
    Math.ceil(displayedInputKey.length / 4),
    Math.ceil(displayedOutputKey.length / 4)
  );
  const sharedMatrixCellSizeClass =
    maxDisplayColumns >= 8
      ? 'w-11 h-11 text-sm'
      : maxDisplayColumns >= 6
      ? 'w-12 h-12 text-sm'
      : undefined;
  const getAes192RoundFragmentsForStep = (stepNumber: number) => {
    if (initialKey.length !== 24) return [] as Array<{ label: string; bytes: number[]; cols: number }>;

    const wordsPerStep = 6;
    const totalWords = allRoundKeys.length * 4;
    const startWord = stepNumber * wordsPerStep;
    const endWord = Math.min(startWord + wordsPerStep - 1, totalWords - 1);
    const firstRound = Math.floor(startWord / 4);
    const lastRound = Math.floor(endWord / 4);
    const fragments: Array<{ label: string; bytes: number[]; cols: number }> = [];

    for (let round = firstRound; round <= lastRound; round++) {
      const roundWordStart = round * 4;
      const overlapStart = Math.max(startWord, roundWordStart);
      const overlapEnd = Math.min(endWord, roundWordStart + 3);
      const overlapLength = overlapEnd - overlapStart + 1;
      if (overlapLength <= 0) continue;

      const roundKey = allRoundKeys[round] || [];
      if (overlapLength === 4) {
        fragments.push({
          label: `${round}-raund kaliti`,
          bytes: roundKey,
          cols: 4
        });
      } else if (overlapLength === 2) {
        const isFirstHalf = overlapStart === roundWordStart;
        fragments.push({
          label: `${round}-raund kaliti (${isFirstHalf ? '1/2' : '2/2'}, 4x2)`,
          bytes: isFirstHalf ? roundKey.slice(0, 8) : roundKey.slice(8, 16),
          cols: 2
        });
      }
    }

    return fragments;
  };

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

  // Render a 4xN matrix (N key lengthga bog'liq) with enhanced styling
  const renderMatrix = (
    matrix: number[],
    highlightedCells: number[] = [],
    title: string = '',
    showMessage: boolean = true,
    forcedCellSizeClass?: string
  ) => {
    const columns = Math.max(1, Math.ceil(matrix.length / 4));
    const cellSizeClass = forcedCellSizeClass ?? (columns >= 8
      ? 'w-11 h-11 text-sm'
      : columns >= 6
      ? 'w-12 h-12 text-sm'
      : 'w-14 h-14 text-base');

    return (
      <div className="w-full flex flex-col items-center bg-white p-6 rounded-xl shadow-lg border-2 border-blue-100">
        {title && <h4 className="font-bold mb-4 text-xl text-slate-800">{title}</h4>}
        
        {/* Matrix */}
        <div className="w-full overflow-x-auto pb-1">
          <div className="w-max mx-auto space-y-2">
            {[0, 1, 2, 3].map(row => (
              <div key={row} className="flex items-center">
                {/* Matrix cells for this row */}
                <div className="flex gap-2">
                  {Array.from({ length: columns }, (_, col) => {
                    const index = row + col * 4;
                    if (index >= matrix.length) return null;

                    return (
                      <div 
                        key={col} 
                        className={`
                          ${cellSizeClass} border-2 flex items-center justify-center font-mono rounded-lg shadow-md
                          transition-all duration-300 transform hover:scale-110
                          ${highlightedCells.includes(index) 
                            ? 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-500 text-white shadow-lg' 
                            : 'bg-gradient-to-br from-white to-gray-50 border-gray-300 text-gray-800 hover:border-blue-300 hover:shadow-lg'
                          }
                        `}
                      >
                        {formatByte(matrix[index]).toUpperCase()}
                      </div>
                    );
                  })}
                </div>

                {highlightedCells.length === -1 && (
                  <>
                    {/* Step 4: Word 4 generation (AES-192/256) */}
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-5 rounded-xl border-2 border-violet-300 shadow-md">
                      <div className="flex items-center gap-3 mb-4">
                        <h6 className="font-bold text-lg text-violet-900">Word 4 yaratilishi (Bayt 16-19)</h6>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border-2 border-violet-200 mb-4">
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                          <div className="text-center">
                            <div className="text-xs font-bold text-pink-700 mb-2">Yangi Word[3] (topilgan):</div>
                            <div className="flex gap-2 justify-center">
                              {[12, 13, 14, 15].map(i => (
                                <div key={i} className="w-12 h-12 border-2 border-pink-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-pink-200 to-rose-200 text-pink-900 rounded-lg shadow-md font-bold">
                                  {formatByte(currentStepData.outputKey[i]).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-3xl font-bold text-orange-600">⊕</div>
                          <div className="text-center">
                            <div className="text-xs font-bold text-gray-700 mb-2">Oldingi Word[4]:</div>
                            <div className="flex gap-2 justify-center">
                              {[16, 17, 18, 19].map(i => (
                                <div key={i} className="w-12 h-12 border-2 border-gray-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 rounded-lg shadow-sm">
                                  {formatByte(currentStepData.inputKey[i]).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-3xl font-bold text-gray-700">=</div>
                          <div className="text-center">
                            <div className="text-xs font-bold text-violet-700 mb-2">Yangi Word[4]:</div>
                            <div className="flex gap-2 justify-center">
                              {[16, 17, 18, 19].map(i => (
                                <div key={i} className="w-12 h-12 border-2 border-violet-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-violet-200 to-purple-200 text-violet-900 rounded-lg shadow-lg font-bold">
                                  {formatByte(currentStepData.outputKey[i]).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-violet-100 p-3 rounded-lg border-l-4 border-violet-500 mb-4">
                        <div className="text-center">
                          <div className="text-sm font-mono font-bold text-violet-900">
                            Word[4] = Word[3] ⊕ Oldingi_Word[4]
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-5 rounded-lg border-2 border-violet-300">
                        <div className="grid grid-cols-2 gap-4">
                          {[16, 17, 18, 19].map(i => {
                            const word3Byte = currentStepData.outputKey[i - 4];
                            const oldWord4Byte = currentStepData.inputKey[i];
                            const newWord4Byte = currentStepData.outputKey[i];
                            
                            return (
                              <div key={i} className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-xl border-2 border-violet-300 shadow-md hover:shadow-lg transition-all">
                                <div className="text-xs font-mono mb-3 text-center font-bold text-violet-900">
                                  Bayt {i}: {formatByte(word3Byte).toUpperCase()} ⊕ {formatByte(oldWord4Byte).toUpperCase()} = <span className="text-green-700">{formatByte(newWord4Byte).toUpperCase()}</span>
                                </div>
                                <div className="space-y-0.5 bg-white p-1.5 rounded-lg border border-violet-200">
                                  <div className="text-xs font-mono text-blue-600 text-center font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 tracking-tighter">{formatBinaryBits(word3Byte)}</div>
                                  <div className="text-base text-orange-600 text-center font-extrabold leading-none">⊕</div>
                                  <div className="text-xs font-mono text-red-600 text-center font-semibold bg-red-50 p-1.5 rounded border border-red-200 tracking-tighter">{formatBinaryBits(oldWord4Byte)}</div>
                                  <div className="text-base text-gray-600 text-center font-extrabold leading-none">=</div>
                                  <div className="text-xs font-mono text-green-700 font-bold text-center bg-green-100 p-1.5 rounded border-2 border-green-300 tracking-tighter">{formatBinaryBits(newWord4Byte)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Step 5: Word 5 generation (AES-192/256) */}
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-5 rounded-xl border-2 border-teal-300 shadow-md">
                      <div className="flex items-center gap-3 mb-4">
                        <h6 className="font-bold text-lg text-teal-900">Word 5 yaratilishi (Bayt 20-23)</h6>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border-2 border-teal-200 mb-4">
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                          <div className="text-center">
                            <div className="text-xs font-bold text-violet-700 mb-2">Yangi Word[4] (topilgan):</div>
                            <div className="flex gap-2 justify-center">
                              {[16, 17, 18, 19].map(i => (
                                <div key={i} className="w-12 h-12 border-2 border-violet-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-violet-200 to-purple-200 text-violet-900 rounded-lg shadow-md font-bold">
                                  {formatByte(currentStepData.outputKey[i]).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-3xl font-bold text-orange-600">⊕</div>
                          <div className="text-center">
                            <div className="text-xs font-bold text-gray-700 mb-2">Oldingi Word[5]:</div>
                            <div className="flex gap-2 justify-center">
                              {[20, 21, 22, 23].map(i => (
                                <div key={i} className="w-12 h-12 border-2 border-gray-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 rounded-lg shadow-sm">
                                  {formatByte(currentStepData.inputKey[i]).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-3xl font-bold text-gray-700">=</div>
                          <div className="text-center">
                            <div className="text-xs font-bold text-teal-700 mb-2">Yangi Word[5]:</div>
                            <div className="flex gap-2 justify-center">
                              {[20, 21, 22, 23].map(i => (
                                <div key={i} className="w-12 h-12 border-2 border-teal-400 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-teal-200 to-cyan-200 text-teal-900 rounded-lg shadow-lg font-bold">
                                  {formatByte(currentStepData.outputKey[i]).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-teal-100 p-3 rounded-lg border-l-4 border-teal-500 mb-4">
                        <div className="text-center">
                          <div className="text-sm font-mono font-bold text-teal-900">
                            Word[5] = Word[4] ⊕ Oldingi_Word[5]
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-5 rounded-lg border-2 border-teal-300">
                        <div className="grid grid-cols-2 gap-4">
                          {[20, 21, 22, 23].map(i => {
                            const word4Byte = currentStepData.outputKey[i - 4];
                            const oldWord5Byte = currentStepData.inputKey[i];
                            const newWord5Byte = currentStepData.outputKey[i];
                            
                            return (
                              <div key={i} className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border-2 border-teal-300 shadow-md hover:shadow-lg transition-all">
                                <div className="text-xs font-mono mb-3 text-center font-bold text-teal-900">
                                  Bayt {i}: {formatByte(word4Byte).toUpperCase()} ⊕ {formatByte(oldWord5Byte).toUpperCase()} = <span className="text-green-700">{formatByte(newWord5Byte).toUpperCase()}</span>
                                </div>
                                <div className="space-y-0.5 bg-white p-1.5 rounded-lg border border-teal-200">
                                  <div className="text-xs font-mono text-blue-600 text-center font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 tracking-tighter">{formatBinaryBits(word4Byte)}</div>
                                  <div className="text-base text-orange-600 text-center font-extrabold leading-none">⊕</div>
                                  <div className="text-xs font-mono text-red-600 text-center font-semibold bg-red-50 p-1.5 rounded border border-red-200 tracking-tighter">{formatBinaryBits(oldWord5Byte)}</div>
                                  <div className="text-base text-gray-600 text-center font-extrabold leading-none">=</div>
                                  <div className="text-xs font-mono text-green-700 font-bold text-center bg-green-100 p-1.5 rounded border-2 border-green-300 tracking-tighter">{formatBinaryBits(newWord5Byte)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
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
    const explanationWordsInCurrentKey = displayedOutputKey.length / 4;
    const displayedWordsInSummary = displayedOutputKey.length / 4;
    const remainingWords = explanationWordsInCurrentKey - 1;
    const summaryHeaderText =
      initialKey.length === 16
        ? `${currentStep}-raund kaliti (16 bayt):`
        : "YANGI KALITNING TO'LIQ MATRITSASI:";
    const summaryMetaText =
      initialKey.length === 16
        ? `${currentStep}-raund uchun 4 ta word (16 bayt) tayyor bo'ldi!`
        : `Barcha ${displayedWordsInSummary} ta word yaratildi!`;

    return (
      <div className="mt-8 p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-2xl border-4 border-blue-300">
        <div className="text-center mb-8">
          <h4 className="font-extrabold text-3xl mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            🔐 KALIT KENGAYTIRISH JARAYONI
          </h4>
          <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          <p className="text-gray-600 mt-3 font-semibold">
            {initialKey.length === 16
              ? `Raund ${currentStep} uchun batafsil jarayon`
              : `Qadam ${currentStep} uchun batafsil jarayon`}
          </p>
        </div>
        
        {/* Step 1: Last Word */}
        <details className="group mb-6 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl shadow-lg border-2 border-yellow-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  1
                </div>
                <h5 className="font-extrabold text-xl text-amber-800">Oxirgi word (Last Word)</h5>
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-white border border-amber-200 rounded-full px-3 py-1">
                <span className="group-open:hidden">Ochish</span>
                <span className="hidden group-open:inline">Yopish</span>
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
        <details className="group mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg border-2 border-green-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  2
                </div>
                <h5 className="font-extrabold text-xl text-green-800">Aylantirilgan word (RotWord)</h5>
              </div>
              <span className="text-xs font-semibold text-green-700 bg-white border border-green-200 rounded-full px-3 py-1">
                <span className="group-open:hidden">Ochish</span>
                <span className="hidden group-open:inline">Yopish</span>
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
        <details className="group mb-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg border-2 border-purple-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  3
                </div>
                <h5 className="font-extrabold text-xl text-purple-800">S-box almashtirish (SubWord)</h5>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-white border border-purple-200 rounded-full px-3 py-1">
                <span className="group-open:hidden">Ochish</span>
                <span className="hidden group-open:inline">Yopish</span>
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
        <details className="group mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-lg border-2 border-red-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  4
                </div>
                <h5 className="font-extrabold text-xl text-red-700">RCON qo'shish jarayoni</h5>
              </div>
              <span className="text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-full px-3 py-1">
                <span className="group-open:hidden">Ochish</span>
                <span className="hidden group-open:inline">Yopish</span>
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
                  <p className="font-semibold text-gray-800">XOR (⊕) operatsiyasi orqali qo'shiladi</p>
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
                    <strong>Joriy:</strong> RCON[{currentStep}] = {RCON[currentStep].toString(16).padStart(2, '0').toUpperCase()} (Raund {currentStep} uchun)
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
                  <div className="text-lg font-bold text-orange-700 mb-1">XOR (⊕) operatsiyasi:</div>
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
                  {/* Bit-by-bit explanation */}
                  <div className="mt-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300">
                    <div className="text-sm font-bold text-blue-800 mb-3 text-center">Bitlar bo‘yicha XOR(⊕) amali</div>
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
        <details className="group mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg border-2 border-green-300">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  5
                </div>
                <h5 className="font-extrabold text-xl text-green-700">Yangi kalitning birinchi word'i yaratilishi</h5>
              </div>
              <span className="text-xs font-semibold text-green-700 bg-white border border-green-200 rounded-full px-3 py-1">
                <span className="group-open:hidden">Ochish</span>
                <span className="hidden group-open:inline">Yopish</span>
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
                      <div className="text-base font-bold text-gray-800 mb-1">Bayt {i}</div>
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
                  Endi qolgan {remainingWords} ta word shu word asosida yaratiladi.
                </div>
              </div>
            </div>
          </div>
          
          {/* Remaining words generation */}
          <div className="mt-6 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-100 p-6 rounded-xl border-2 border-purple-300 shadow-lg">
            <div className="flex items-center justify-center gap-3 mb-5">
              <h6 className="font-extrabold text-xl text-purple-900">QOLGAN {remainingWords} TA WORD YARATILISHI</h6>
            </div>
            
            <div className="bg-white p-5 rounded-lg border-l-4 border-purple-500 mb-5">
              <div className="text-sm text-gray-800 mb-2">
                <p className="font-semibold mb-2">
                  <strong className="text-purple-700">Eslatma:</strong>{' '}
                  {explanationWordsInCurrentKey === 8
                    ? `AES-256 da qolgan ${remainingWords} ta word yaratiladi, Word[4] da esa SubWord qoidasi ishlatiladi.`
                    : `Birinchi word topilgandan keyin, qolgan ${remainingWords} ta word oddiy XOR orqali yaratiladi:`}
                </p>
                <p className="font-mono bg-purple-50 p-3 rounded-lg border border-purple-200 text-center">
                  <strong className="text-purple-900">Formula:</strong>{' '}
                  {explanationWordsInCurrentKey === 8 ? (
                    <>
                      Word[4] = SubWord(Word[3]) ⊕ Oldingi_Word[4], Word[i] = Word[i-1] ⊕ Oldingi_Word[i]
                      <span className="text-purple-600"> (i = 1 ... {remainingWords}, i=4 maxsus)</span>
                    </>
                  ) : (
                    <>
                      Word[i] = Word[i-1] ⊕ Oldingi_Word[i]
                      <span className="text-purple-600"> (i = 1 ... {remainingWords} uchun)</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            
            {/* Visual matrix showing word generation */}
            <div className="mt-6 bg-gradient-to-br from-white via-purple-50 to-white p-6 rounded-xl border-2 border-purple-300 shadow-lg">
              <div className="flex items-center justify-center gap-3 mb-5">
                <h6 className="font-extrabold text-xl text-purple-900">QOLGAN {remainingWords} TA WORD YARATILISHI</h6>
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

                {explanationWordsInCurrentKey >= 6 && (
                  <>
                    {/* Step 4: Word 4 generation (AES-192/256) */}
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-5 rounded-xl border-2 border-violet-300 shadow-md">
                      <div className="flex items-center gap-3 mb-4">
                        <h6 className="font-bold text-lg text-violet-900">
                          {explanationWordsInCurrentKey === 8
                            ? 'Word 4 yaratilishi (Bayt 16-19, SubWord bilan)'
                            : 'Word 4 yaratilishi (Bayt 16-19)'}
                        </h6>
                      </div>
                      {explanationWordsInCurrentKey === 8 && (
                        <div className="bg-indigo-100 p-3 rounded-lg border-l-4 border-indigo-500 mb-4">
                          <div className="text-center">
                            <div className="text-sm font-semibold text-indigo-900">
                              AES-256 uchun Word[4] da avval Word[3] ga SubWord qo&apos;llanadi.
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="bg-violet-100 p-3 rounded-lg border-l-4 border-violet-500 mb-4">
                        <div className="text-center">
                          <div className="text-sm font-mono font-bold text-violet-900">
                            {explanationWordsInCurrentKey === 8
                              ? 'Word[4] = SubWord(Word[3]) ⊕ Oldingi_Word[4]'
                              : 'Word[4] = Word[3] ⊕ Oldingi_Word[4]'}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-lg border-2 border-violet-300">
                        <div className="grid grid-cols-2 gap-4">
                          {[16, 17, 18, 19].map(i => {
                            const word3SourceByte = currentStepData.outputKey[i - 4];
                            const word3Byte = explanationWordsInCurrentKey === 8 ? SBOX[word3SourceByte] : word3SourceByte;
                            const oldWord4Byte = currentStepData.inputKey[i];
                            const newWord4Byte = currentStepData.outputKey[i];

                            return (
                              <div key={i} className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-xl border-2 border-violet-300 shadow-md hover:shadow-lg transition-all">
                                <div className="text-xs font-mono mb-3 text-center font-bold text-violet-900">
                                  Bayt {i}: {formatByte(word3Byte).toUpperCase()} ⊕ {formatByte(oldWord4Byte).toUpperCase()} = <span className="text-green-700">{formatByte(newWord4Byte).toUpperCase()}</span>
                                </div>
                                <div className="space-y-0.5 bg-white p-1.5 rounded-lg border border-violet-200">
                                  <div className="text-xs font-mono text-blue-600 text-center font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 tracking-tighter">{formatBinaryBits(word3Byte)}</div>
                                  <div className="text-base text-orange-600 text-center font-extrabold leading-none">⊕</div>
                                  <div className="text-xs font-mono text-red-600 text-center font-semibold bg-red-50 p-1.5 rounded border border-red-200 tracking-tighter">{formatBinaryBits(oldWord4Byte)}</div>
                                  <div className="text-base text-gray-600 text-center font-extrabold leading-none">=</div>
                                  <div className="text-xs font-mono text-green-700 font-bold text-center bg-green-100 p-1.5 rounded border-2 border-green-300 tracking-tighter">{formatBinaryBits(newWord4Byte)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Step 5: Word 5 generation (AES-192/256) */}
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-5 rounded-xl border-2 border-teal-300 shadow-md">
                      <div className="flex items-center gap-3 mb-4">
                        <h6 className="font-bold text-lg text-teal-900">Word 5 yaratilishi (Bayt 20-23)</h6>
                      </div>
                      <div className="bg-teal-100 p-3 rounded-lg border-l-4 border-teal-500 mb-4">
                        <div className="text-center">
                          <div className="text-sm font-mono font-bold text-teal-900">
                            Word[5] = Word[4] ⊕ Oldingi_Word[5]
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-lg border-2 border-teal-300">
                        <div className="grid grid-cols-2 gap-4">
                          {[20, 21, 22, 23].map(i => {
                            const word4Byte = currentStepData.outputKey[i - 4];
                            const oldWord5Byte = currentStepData.inputKey[i];
                            const newWord5Byte = currentStepData.outputKey[i];

                            return (
                              <div key={i} className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border-2 border-teal-300 shadow-md hover:shadow-lg transition-all">
                                <div className="text-xs font-mono mb-3 text-center font-bold text-teal-900">
                                  Bayt {i}: {formatByte(word4Byte).toUpperCase()} ⊕ {formatByte(oldWord5Byte).toUpperCase()} = <span className="text-green-700">{formatByte(newWord5Byte).toUpperCase()}</span>
                                </div>
                                <div className="space-y-0.5 bg-white p-1.5 rounded-lg border border-teal-200">
                                  <div className="text-xs font-mono text-blue-600 text-center font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 tracking-tighter">{formatBinaryBits(word4Byte)}</div>
                                  <div className="text-base text-orange-600 text-center font-extrabold leading-none">⊕</div>
                                  <div className="text-xs font-mono text-red-600 text-center font-semibold bg-red-50 p-1.5 rounded border border-red-200 tracking-tighter">{formatBinaryBits(oldWord5Byte)}</div>
                                  <div className="text-base text-gray-600 text-center font-extrabold leading-none">=</div>
                                  <div className="text-xs font-mono text-green-700 font-bold text-center bg-green-100 p-1.5 rounded border-2 border-green-300 tracking-tighter">{formatBinaryBits(newWord5Byte)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {explanationWordsInCurrentKey === 8 && (
                      <>
                        {/* Step 6: Word 6 generation (AES-256) */}
                        <div className="bg-gradient-to-br from-cyan-50 to-sky-50 p-5 rounded-xl border-2 border-cyan-300 shadow-md">
                          <div className="flex items-center gap-3 mb-4">
                            <h6 className="font-bold text-lg text-cyan-900">Word 6 yaratilishi (Bayt 24-27)</h6>
                          </div>
                          <div className="bg-cyan-100 p-3 rounded-lg border-l-4 border-cyan-500 mb-4">
                            <div className="text-center">
                              <div className="text-sm font-mono font-bold text-cyan-900">
                                Word[6] = Word[5] ⊕ Oldingi_Word[6]
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-5 rounded-lg border-2 border-cyan-300">
                            <div className="grid grid-cols-2 gap-4">
                              {[24, 25, 26, 27].map(i => {
                                const word5Byte = currentStepData.outputKey[i - 4];
                                const oldWord6Byte = currentStepData.inputKey[i];
                                const newWord6Byte = currentStepData.outputKey[i];

                                return (
                                  <div key={i} className="bg-gradient-to-br from-cyan-50 to-sky-50 p-4 rounded-xl border-2 border-cyan-300 shadow-md hover:shadow-lg transition-all">
                                    <div className="text-xs font-mono mb-3 text-center font-bold text-cyan-900">
                                      Bayt {i}: {formatByte(word5Byte).toUpperCase()} ⊕ {formatByte(oldWord6Byte).toUpperCase()} = <span className="text-green-700">{formatByte(newWord6Byte).toUpperCase()}</span>
                                    </div>
                                    <div className="space-y-0.5 bg-white p-1.5 rounded-lg border border-cyan-200">
                                      <div className="text-xs font-mono text-blue-600 text-center font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 tracking-tighter">{formatBinaryBits(word5Byte)}</div>
                                      <div className="text-base text-orange-600 text-center font-extrabold leading-none">⊕</div>
                                      <div className="text-xs font-mono text-red-600 text-center font-semibold bg-red-50 p-1.5 rounded border border-red-200 tracking-tighter">{formatBinaryBits(oldWord6Byte)}</div>
                                      <div className="text-base text-gray-600 text-center font-extrabold leading-none">=</div>
                                      <div className="text-xs font-mono text-green-700 font-bold text-center bg-green-100 p-1.5 rounded border-2 border-green-300 tracking-tighter">{formatBinaryBits(newWord6Byte)}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Step 7: Word 7 generation (AES-256) */}
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border-2 border-indigo-300 shadow-md">
                          <div className="flex items-center gap-3 mb-4">
                            <h6 className="font-bold text-lg text-indigo-900">Word 7 yaratilishi (Bayt 28-31)</h6>
                          </div>
                          <div className="bg-indigo-100 p-3 rounded-lg border-l-4 border-indigo-500 mb-4">
                            <div className="text-center">
                              <div className="text-sm font-mono font-bold text-indigo-900">
                                Word[7] = Word[6] ⊕ Oldingi_Word[7]
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-5 rounded-lg border-2 border-indigo-300">
                            <div className="grid grid-cols-2 gap-4">
                              {[28, 29, 30, 31].map(i => {
                                const word6Byte = currentStepData.outputKey[i - 4];
                                const oldWord7Byte = currentStepData.inputKey[i];
                                const newWord7Byte = currentStepData.outputKey[i];

                                return (
                                  <div key={i} className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border-2 border-indigo-300 shadow-md hover:shadow-lg transition-all">
                                    <div className="text-xs font-mono mb-3 text-center font-bold text-indigo-900">
                                      Bayt {i}: {formatByte(word6Byte).toUpperCase()} ⊕ {formatByte(oldWord7Byte).toUpperCase()} = <span className="text-green-700">{formatByte(newWord7Byte).toUpperCase()}</span>
                                    </div>
                                    <div className="space-y-0.5 bg-white p-1.5 rounded-lg border border-indigo-200">
                                      <div className="text-xs font-mono text-blue-600 text-center font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 tracking-tighter">{formatBinaryBits(word6Byte)}</div>
                                      <div className="text-base text-orange-600 text-center font-extrabold leading-none">⊕</div>
                                      <div className="text-xs font-mono text-red-600 text-center font-semibold bg-red-50 p-1.5 rounded border border-red-200 tracking-tighter">{formatBinaryBits(oldWord7Byte)}</div>
                                      <div className="text-base text-gray-600 text-center font-extrabold leading-none">=</div>
                                      <div className="text-xs font-mono text-green-700 font-bold text-center bg-green-100 p-1.5 rounded border-2 border-green-300 tracking-tighter">{formatBinaryBits(newWord7Byte)}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              
              {/* Final result */}
              <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded border border-green-200">
                <div className="text-center">
                  <div className="text-sm font-bold text-green-700 mb-2">{summaryHeaderText}</div>
                  <div className="text-xs text-gray-600 mb-2">{summaryMetaText}</div>
                  <div className="flex justify-center">
                    {initialKey.length === 24 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {getAes192RoundFragmentsForStep(currentStepData.stepNumber).map((fragment, blockIndex) => (
                          <div key={blockIndex} className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                            <div className="text-xs font-bold text-blue-700 mb-2 text-center">
                              {fragment.label}
                            </div>
                            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${fragment.cols}, minmax(0, 1fr))` }}>
                              {Array.from({ length: 4 }).flatMap((_, row) =>
                                Array.from({ length: fragment.cols }).map((_, col) => {
                                  const i = row + col * 4;
                                  let colorClass = '';
                                  if (col === 0) colorClass = 'bg-green-100 border-green-300 text-green-800';
                                  else if (col === 1) colorClass = 'bg-blue-100 border-blue-300 text-blue-800';
                                  else if (col === 2) colorClass = 'bg-orange-100 border-orange-300 text-orange-800';
                                  else colorClass = 'bg-pink-100 border-pink-300 text-pink-800';

                                  return (
                                    <div
                                      key={`${blockIndex}-${row}-${col}`}
                                      className={`w-8 h-8 border-2 flex items-center justify-center text-xs font-mono rounded ${colorClass}`}
                                    >
                                      {fragment.bytes[i] !== undefined ? formatByte(fragment.bytes[i]) : '--'}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : displayedWordsInSummary === 8 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[currentStepData.stepNumber * 2, currentStepData.stepNumber * 2 + 1]
                          .filter((roundNumber) => roundNumber <= allRoundKeys.length - 1)
                          .map((roundNumber, blockIndex) => {
                          const roundKey = allRoundKeys[roundNumber] || [];
                          return (
                            <div key={blockIndex} className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                              <div className="text-xs font-bold text-blue-700 mb-2 text-center">
                                {roundNumber}-raund kaliti
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {Array.from({ length: 4 }).flatMap((_, row) =>
                                  Array.from({ length: 4 }).map((_, col) => {
                                    const i = row + col * 4;
                                    let colorClass = '';
                                    if (col === 0) colorClass = 'bg-green-100 border-green-300 text-green-800';
                                    else if (col === 1) colorClass = 'bg-blue-100 border-blue-300 text-blue-800';
                                    else if (col === 2) colorClass = 'bg-orange-100 border-orange-300 text-orange-800';
                                    else colorClass = 'bg-pink-100 border-pink-300 text-pink-800';

                                    return (
                                      <div
                                        key={`${blockIndex}-${row}-${col}`}
                                        className={`w-8 h-8 border-2 flex items-center justify-center text-xs font-mono rounded ${colorClass}`}
                                      >
                                        {roundKey.length === 16 ? formatByte(roundKey[i]) : '--'}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${displayedWordsInSummary}, minmax(0, 1fr))` }}>
                        {Array.from({ length: 4 }).flatMap((_, row) =>
                          Array.from({ length: displayedWordsInSummary }).map((_, col) => {
                            const i = row + col * 4;
                            let colorClass = '';
                            if (col === 0) colorClass = 'bg-green-100 border-green-300 text-green-800';
                            else if (col === 1) colorClass = 'bg-blue-100 border-blue-300 text-blue-800';
                            else if (col === 2) colorClass = 'bg-orange-100 border-orange-300 text-orange-800';
                            else if (col === 3) colorClass = 'bg-pink-100 border-pink-300 text-pink-800';
                            else if (col === 4) colorClass = 'bg-violet-100 border-violet-300 text-violet-800';
                            else if (col === 5) colorClass = 'bg-teal-100 border-teal-300 text-teal-800';
                            else if (col === 6) colorClass = 'bg-cyan-100 border-cyan-300 text-cyan-800';
                            else colorClass = 'bg-indigo-100 border-indigo-300 text-indigo-800';

                            return (
                              <div
                                key={`${row}-${col}`}
                                className={`w-8 h-8 border-2 flex items-center justify-center text-xs font-mono rounded ${colorClass}`}
                              >
                                {formatByte(displayedOutputKey[i])}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  {displayedWordsInSummary === 8 && (
                    <div className="text-xs text-blue-700 font-semibold mt-2">
                      AES-256: bu bosqichda {[currentStepData.stepNumber * 2, currentStepData.stepNumber * 2 + 1].filter((r) => r <= allRoundKeys.length - 1).length} ta raund kalit hosil bo&apos;ladi.
                    </div>
                  )}
                  {initialKey.length === 24 && currentStep > 0 && currentStep < steps.length - 1 && (
                    <div className="text-xs text-blue-700 font-semibold mt-2">
                      AES-192: bu bosqichda raund kalitlar yarim va to&apos;liq bo&apos;laklarda (4x2 / 4x4) ko&apos;rsatiladi.
                    </div>
                  )}
                  <div className="text-xs text-gray-600 mt-2">
                    <span className="text-green-600">Yashil:</span> Word 0 | 
                    <span className="text-blue-600"> Ko'k:</span> Word 1 | 
                    <span className="text-orange-600"> To‘q sariq:</span> Word 2 | 
                    <span className="text-pink-600"> Pushti:</span> Word 3
                    {displayedWordsInSummary >= 6 && (
                      <>
                        {' | '}<span className="text-violet-600"> Binafsha:</span> Word 4
                        {' | '}<span className="text-teal-600"> Zangori:</span> Word 5
                      </>
                    )}
                    {displayedWordsInSummary >= 8 && (
                      <>
                        {' | '}<span className="text-cyan-600"> Moviy:</span> Word 6
                        {' | '}<span className="text-indigo-600"> Indigo:</span> Word 7
                      </>
                    )}
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
    const highlightedRound = -1;
    return (
      <div className="mt-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-4xl">🔑</span>
          <h3 className="font-extrabold text-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
            Barcha raund kalitlar jadvali
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
                        <span>Raund kalit (HEX, {byteLength} bayt)</span>
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
                        ${round === highlightedRound 
                          ? 'bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100 font-bold shadow-lg border-l-4 border-yellow-500' 
                          : index % 2 === 0 
                            ? 'bg-gradient-to-r from-white to-purple-50/30' 
                            : 'bg-gradient-to-r from-purple-50/50 to-indigo-50/30'
                        }
                      `}
                    >
                      <td className={`
                        px-6 py-4 border-r-2 border-purple-200 font-bold
                        ${round === highlightedRound 
                          ? 'text-yellow-900 text-lg' 
                          : 'text-purple-800'
                        }
                      `}>
                        <div className={`
                          inline-flex items-center justify-center w-12 h-12 rounded-full
                          ${round === highlightedRound
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg scale-110'
                            : 'bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-800 shadow-md'
                          }
                        `}>
                          {round}
                        </div>
                      </td>
                      <td className={`
                        px-6 py-4 font-mono whitespace-pre-wrap break-all
                        ${round === highlightedRound 
                          ? 'text-yellow-900 text-base' 
                          : 'text-gray-800'
                        }
                      `}>
                        <div className={`
                          inline-block px-4 py-2 rounded-lg border-2 shadow-md
                          ${round === highlightedRound
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
                <strong className="text-blue-800">Jami {keys.length} ta raund kalit</strong> (kalit uzunligiga mos ravishda) ko'rsatiladi.
              </p>
              {initialKey.length === 32 && (
                <p className="text-sm text-blue-700 font-semibold mb-3">
                  AES-256: eng boshidagi AddRoundKey (Round 0) bilan birga jami 15 ta 16-baytli kalit mavjud.
                </p>
              )}
              <ul className="text-base text-gray-600 space-y-2 list-disc list-inside">
                {initialKey.length === 32 ? (
                  <>
                    <li><strong>Round 0-1:</strong> Boshlang'ich kalitdan to'g'ridan-to'g'ri olinadi</li>
                    <li><strong>Round 2-{keys.length - 1}:</strong> Key schedule orqali generatsiya qilinadi</li>
                  </>
                ) : initialKey.length === 24 ? (
                  <>
                    <li><strong>Round 0 + Round 1/2:</strong> Boshlang'ich kalitdan olinadi</li>
                    <li><strong>Keyingi qadamlar:</strong> <span className="font-mono">1/2 + 2</span>, <span className="font-mono">3 + 4/2</span>, <span className="font-mono">4/2 + 5</span> ... ko'rinishida davom etadi</li>
                  </>
                ) : (
                  <>
                    <li><strong>Round 0:</strong> Boshlang'ich kalit (foydalanuvchi tomonidan berilgan)</li>
                    <li><strong>Round 1-{keys.length - 1}:</strong> Har bir round uchun generatsiya qilingan kalitlar</li>
                  </>
                )}
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
        {/* Key Matrices */}
        {currentStep !== steps.length - 1 && (
          <div className={`grid gap-8 mb-6 mx-auto ${currentStep === 0 ? 'justify-center' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {currentStep > 0 && (
              <div className="w-full">
                {renderMatrix(
                  displayedInputKey,
                  Array.from({ length: 4 }, (_, i) => currentStepData.inputKey.length - 4 + i),
                  'Oldingi kalit',
                  false,
                  sharedMatrixCellSizeClass
                )}
              </div>
            )}
            
            <div className={currentStep === 0 ? (displayedOutputKey.length === 16 ? 'max-w-md mx-auto' : 'w-full') : 'w-full'}>
              {renderMatrix(
                displayedOutputKey,
                currentStepData.highlightedCells, 
                'Yangi kalit',
                false,
                sharedMatrixCellSizeClass
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
        {currentStep !== steps.length - 1 && hasStepExplanation && (
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
                    <strong className="text-green-700">4. XOR(⊕):</strong> <span className="font-mono text-gray-700">w₀ = oldingi_w₀ ⊕ c, wᵢ = oldingi_wᵢ ⊕ wᵢ₋₁</span> <span className="text-gray-600">(i {'>'} 0 uchun)</span>
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
