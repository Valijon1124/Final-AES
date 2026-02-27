import React from 'react';
import { AesStep, GALOIS_MUL_2, GALOIS_MUL_3 } from '@/utils/aes';
import MatrixVisualizer from './MatrixVisualizer';
import SBoxLookup from './SBoxLookup';

interface EncryptionStepVisualizerProps {
  steps: AesStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

const EncryptionStepVisualizer: React.FC<EncryptionStepVisualizerProps> = ({
  steps,
  currentStep,
  onStepChange
}) => {
  const [selectedByteIndex, setSelectedByteIndex] = React.useState<number | null>(null);
  const topRef = React.useRef<HTMLDivElement | null>(null);
  
  // Format byte as hex
  const formatByte = (byte: number) => {
    return byte.toString(16).padStart(2, '0').toUpperCase();
  };
  
  // Reset selected byte when step changes
  React.useEffect(() => {
    setSelectedByteIndex(null);
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep]);

  // Format byte as binary
  const formatByteAsBinary = (byte: number) => {
    return byte.toString(2).padStart(8, '0');
  };

  // Format byte as spaced binary: 01010011 -> 0 1 0 1 0 0 1 1
  const formatByteAsSpacedBinary = (byte: number) => {
    return formatByteAsBinary(byte).split('').join(' ');
  };

  // Calculate Galois Field multiplication step by step
  const galoisMul2StepByStep = (value: number) => {
    const originalBinary = formatByteAsBinary(value);
    const shifted = (value << 1) & 0xFF; // Shift left, keep only 8 bits
    const shiftedBinary = formatByteAsBinary(shifted);
    const hasOverflow = (value & 0x80) !== 0; // Check if MSB is 1
    const corrected = hasOverflow ? (shifted ^ 0x1B) : shifted;
    const correctedBinary = formatByteAsBinary(corrected);
    
    return {
      original: formatByte(value),
      originalBinary,
      shifted: formatByte(shifted),
      shiftedBinary,
      hasOverflow,
      corrected: formatByte(corrected),
      correctedBinary,
      xorValue: hasOverflow ? '1B' : null,
      xorBinary: hasOverflow ? '00011011' : null
    };
  };

  const galoisMul3StepByStep = (value: number) => {
    const mul2 = GALOIS_MUL_2[value];
    const result = mul2 ^ value;
    
    return {
      original: formatByte(value),
      originalBinary: formatByteAsBinary(value),
      mul2: formatByte(mul2),
      mul2Binary: formatByteAsBinary(mul2),
      result: formatByte(result),
      resultBinary: formatByteAsBinary(result)
    };
  };

  // Constant MixColumns transformation matrix (for visualization)
  const MIX_COLUMNS_MATRIX = [
    0x02, 0x03, 0x01, 0x01,
    0x01, 0x02, 0x03, 0x01,
    0x01, 0x01, 0x02, 0x03,
    0x03, 0x01, 0x01, 0x02
  ];

  // Render a 4x4 matrix with operation type
  const renderMatrix = (matrix: number[], activeIndices: number[] = [], title: string = '', operationType?: string) => {
    return (
      <div className="flex flex-col items-center">
        {title && <h4 className="font-semibold mb-2">{title}</h4>}
        <MatrixVisualizer 
          matrix={matrix}
          activeIndices={activeIndices}
          operationType={operationType as any}
        />
      </div>
    );
  };

  // Get operation type from step description
  const getOperationType = (description: string) => {
    if (description.includes('IV bilan XOR')) return 'IVXOR';
    if (description.includes('Counter XOR') || description.includes('hisoblagich bilan XOR')) return 'CTRXOR';
    if (description.includes('SubBytes')) return 'SubBytes';
    if (description.includes('ShiftRows')) return 'ShiftRows';
    if (description.includes('MixColumns')) return 'MixColumns';
    if (description.includes('AddRoundKey')) return 'AddRoundKey';
    return 'Initial';
  };

  // Render 3 matrices side by side for CTR XOR operation
  const renderCTRXORMatrices = (step: AesStep) => {
    if (!step.previousState || !step.roundKey) return null;

    return (
      <div className="flex flex-col items-center">
        <h4 className="font-extrabold mb-6 text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
          CTR XOR Operatsiyasi
        </h4>
        <div className="flex items-stretch justify-center gap-4 flex-wrap">
          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-green-700">1. Ochiq matn jadvali</h5>
            <MatrixVisualizer
              matrix={step.previousState}
              activeIndices={[]}
              showRowLabels={true}
              showColumnLabels={true}
            />
          </div>

          <div className="flex items-center justify-center">
            <div className="text-4xl font-bold text-blue-600 mx-2">⊕</div>
          </div>

          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-blue-700">2. Shifrlangan hisoblagich</h5>
            <MatrixVisualizer
              matrix={step.roundKey}
              activeIndices={[]}
              showRowLabels={true}
              showColumnLabels={true}
            />
          </div>

          <div className="flex items-center justify-center">
            <div className="text-4xl font-bold text-gray-600 mx-2">=</div>
          </div>

          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-purple-700">3. XOR natijasi</h5>
            <MatrixVisualizer
              matrix={step.state}
              activeIndices={Array.from(Array(16).keys())}
              showRowLabels={true}
              showColumnLabels={true}
            />
          </div>
        </div>
      </div>
    );
  };

  // Render 3 matrices side by side for IV XOR operation
  const renderIVXORMatrices = (step: AesStep) => {
    if (!step.previousState || !step.roundKey) return null;

    return (
      <div className="flex flex-col items-center">
        <h4 className="font-extrabold mb-6 text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">IV bilan XOR Operatsiyasi</h4>
        <div className="flex items-stretch justify-center gap-4 flex-wrap">
          {/* 1. Boshlang'ich holat */}
          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-green-700">1. Boshlang'ich holat</h5>
            <MatrixVisualizer 
              matrix={step.previousState}
              activeIndices={[]}
              showRowLabels={true}
              showColumnLabels={true}
            />
          </div>
          
          {/* XOR belgisi */}
          <div className="flex items-center justify-center">
            <div className="text-4xl font-bold text-blue-600 mx-2">⊕</div>
          </div>
          
          {/* 2. IV qiymatlari */}
          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-blue-700">2. IV (Initialization Vector)</h5>
            <MatrixVisualizer 
              matrix={step.roundKey}
              activeIndices={[]}
              showRowLabels={true}
              showColumnLabels={true}
            />
          </div>
          
          {/* = belgisi */}
          <div className="flex items-center justify-center">
            <div className="text-4xl font-bold text-gray-600 mx-2">=</div>
          </div>
          
          {/* 3. XOR natijasi */}
          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-purple-700">3. XOR natijasi</h5>
            <MatrixVisualizer 
              matrix={step.state}
              activeIndices={Array.from(Array(16).keys())}
              showRowLabels={true}
              showColumnLabels={true}
            />
          </div>
        </div>
        
        {/* Detailed Binary XOR Operation */}
        <div className="mt-8 w-full max-w-6xl">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-300 shadow-xl">
            <h6 className="font-extrabold text-center text-blue-800 text-2xl mb-6">BINAR KO'RINISHDAGI XOR OPERATSIYASI</h6>
            
            {/* Detailed XOR Example for First Byte */}
            <div className="hidden mb-6 p-6 bg-white rounded-2xl border-2 border-blue-200 shadow-lg">
              
              <div className="flex justify-center items-center gap-4 mb-4">
                {/* State Byte */}
                <div className="text-center">
                  <div className="w-16 h-16 border-2 border-green-400 flex items-center justify-center text-lg font-mono bg-green-100 text-green-800 rounded-lg shadow-lg mb-2">
                    {formatByte(step.previousState[0])}
                  </div>
                  <div className="text-sm font-semibold text-green-700">BOSHLANG'ICH HOLAT</div>
                  <div className="text-xs text-gray-600">(1-jadvaldan)</div>
                </div>
                
                {/* XOR Symbol */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">⊕</div>
                  <div className="text-xs text-blue-600">XOR</div>
                </div>
                
                {/* IV Byte */}
                <div className="text-center">
                  <div className="w-16 h-16 border-2 border-blue-400 flex items-center justify-center text-lg font-mono bg-blue-100 text-blue-800 rounded-lg shadow-lg mb-2">
                    {formatByte(step.roundKey[0])}
                  </div>
                  <div className="text-sm font-semibold text-blue-700">IV</div>
                  <div className="text-xs text-gray-600">(2-jadvaldan)</div>
                </div>
                
                {/* Equals Symbol */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">=</div>
                </div>
                
                {/* Result Byte */}
                <div className="text-center">
                  <div className="w-16 h-16 border-2 border-purple-400 flex items-center justify-center text-lg font-mono bg-purple-100 text-purple-800 rounded-lg shadow-lg mb-2">
                    {formatByte(step.previousState[0] ^ step.roundKey[0])}
                  </div>
                  <div className="text-sm font-semibold text-purple-700">NATIJA</div>
                  <div className="text-xs text-gray-600">(3-jadvalga)</div>
                </div>
              </div>
              
              {/* Binary Breakdown */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border-2 border-gray-300 shadow-md">
                <div className="text-base font-bold mb-3 text-gray-800">Binary ko'rinishda:</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-36 text-green-700 font-bold">BOSHLANG'ICH:</div>
                    <div className="font-mono bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded-lg border-2 border-green-300 shadow-sm font-bold">
                      {step.previousState[0].toString(2).padStart(8, '0')}
                    </div>
                    <div className="text-xs text-gray-600 font-semibold">({formatByte(step.previousState[0])})</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-36 text-blue-700 font-bold">IV:</div>
                    <div className="font-mono bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-lg border-2 border-blue-300 shadow-sm font-bold">
                      {step.roundKey[0].toString(2).padStart(8, '0')}
                    </div>
                    <div className="text-xs text-gray-600 font-semibold">({formatByte(step.roundKey[0])})</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-36 text-blue-700 font-bold">XOR:</div>
                    <div className="text-center text-blue-700 font-extrabold text-lg">  ⊕ ⊕ ⊕ ⊕  </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-36 text-purple-700 font-bold">NATIJA:</div>
                    <div className="font-mono bg-gradient-to-r from-purple-50 to-pink-50 p-2 rounded-lg border-2 border-purple-300 shadow-sm font-bold">
                      {(step.previousState[0] ^ step.roundKey[0]).toString(2).padStart(8, '0')}
                    </div>
                    <div className="text-xs text-gray-600 font-semibold">({formatByte(step.previousState[0] ^ step.roundKey[0])})</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* All Bytes Binary XOR Grid */}
            <div className="mb-6">
              <h6 className="font-bold text-2xl text-blue-700 mb-4 block">Barcha 16 bayt uchun binar XOR:</h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {step.state.map((byte, i) => {
                  const stateByte = step.previousState ? step.previousState[i] : byte;
                  const ivByte = step.roundKey?.[i] || 0;
                  const resultByte = stateByte ^ ivByte;
                  
                  // Convert to binary
                  const stateBinary = formatByteAsSpacedBinary(stateByte);
                  const ivBinary = formatByteAsSpacedBinary(ivByte);
                  const resultBinary = formatByteAsSpacedBinary(resultByte);
                  
                  return (
                    <div key={i} className="bg-white p-4 rounded-xl border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                      <div className="text-center">
                        <div className="text-base font-bold text-gray-700 mb-3">Bayt {i}</div>
                        
                        {/* Hex formula */}
                        <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg text-sm font-mono font-semibold">
                          {formatByte(stateByte)} ⊕ {formatByte(ivByte)} = {formatByte(resultByte)}
                        </div>
                        
                        {/* Binary XOR visualization */}
                        <div className="space-y-1">
                          {/* State binary */}
                          <div className="text-center">
                            <div className="text-sm font-mono bg-gradient-to-br from-green-50 to-emerald-50 p-2 rounded-lg border-2 border-green-300 shadow-sm font-bold">
                              {stateBinary}
                            </div>
                          </div>
                          
                          {/* XOR symbol */}
                          <div className="text-center text-blue-600 font-bold text-lg">⊕</div>
                          
                          {/* IV binary */}
                          <div className="text-center">
                            <div className="text-sm font-mono bg-gradient-to-br from-blue-50 to-indigo-50 p-2 rounded-lg border-2 border-blue-300 shadow-sm font-bold">
                              {ivBinary}
                            </div>
                          </div>
                          
                          {/* Equals */}
                          <div className="text-center text-gray-700 font-bold text-lg">=</div>
                          
                          {/* Result binary */}
                          <div className="text-center">
                            <div className="text-sm font-mono bg-gradient-to-br from-purple-50 to-pink-50 p-2 rounded-lg border-2 border-purple-300 shadow-sm font-bold">
                              {resultBinary}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 text-base flex-wrap">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md">
                <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-green-500 rounded-lg shadow-sm"></div>
                <span className="font-bold text-green-800">Boshlang'ich</span>
              </div>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-blue-500 rounded-lg shadow-sm"></div>
                <span className="font-bold text-blue-800">IV</span>
              </div>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-purple-500 rounded-lg shadow-sm"></div>
                <span className="font-bold text-purple-800">Natija</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render operation details
  const renderOperationDetails = (step: AesStep) => {
    const operationType = getOperationType(step.description);
    
    return (
      <div className="mt-6 p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl shadow-lg border border-slate-200">
        <h4 className="font-bold text-xl mb-4 text-slate-800">Operatsiya tafsilotlari:</h4>
        
        {operationType === 'IVXOR' && step.previousState && step.roundKey && (
          <div className="p-4 bg-blue-50 rounded-lg max-w-4xl">
            <p className="text-sm text-gray-700">
              <strong>Izoh:</strong> Har bir pozitsiyadagi bayt lar ketma-ket XOR qilinadi. 
              Masalan, (0,0) pozitsiyasida: <span className="font-mono font-bold">
                {formatByte(step.previousState[0])} ⊕ {formatByte(step.roundKey[0])} = {formatByte(step.state[0])}
              </span>
            </p>
          </div>
        )}

        {operationType === 'CTRXOR' && step.previousState && step.roundKey && (
          <div className="space-y-4">
            <div>
              <h6 className="font-bold text-xl text-blue-700 mb-4 block">Barcha 16 bayt uchun binar XOR:</h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {step.state.map((byte, i) => {
                  const plaintextByte = step.previousState ? step.previousState[i] : byte;
                  const counterByte = step.roundKey?.[i] || 0;
                  const resultByte = byte;

                  return (
                    <div key={i} className="bg-white p-4 rounded-xl border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                      <div className="text-center">
                        <div className="text-base font-bold text-gray-700 mb-3">Bayt {i}</div>

                        <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg text-sm font-mono font-semibold">
                          {formatByte(plaintextByte)} ⊕ {formatByte(counterByte)} = {formatByte(resultByte)}
                        </div>

                        <div className="space-y-1">
                          <div className="text-center">
                            <div className="text-sm font-mono bg-gradient-to-br from-green-50 to-emerald-50 p-2 rounded-lg border-2 border-green-300 shadow-sm font-bold">
                              {formatByteAsSpacedBinary(plaintextByte)}
                            </div>
                          </div>

                          <div className="text-center text-blue-600 font-bold text-lg">⊕</div>

                          <div className="text-center">
                            <div className="text-sm font-mono bg-gradient-to-br from-blue-50 to-indigo-50 p-2 rounded-lg border-2 border-blue-300 shadow-sm font-bold">
                              {formatByteAsSpacedBinary(counterByte)}
                            </div>
                          </div>

                          <div className="text-center text-gray-700 font-bold text-lg">=</div>

                          <div className="text-center">
                            <div className="text-sm font-mono bg-gradient-to-br from-purple-50 to-pink-50 p-2 rounded-lg border-2 border-purple-300 shadow-sm font-bold">
                              {formatByteAsSpacedBinary(resultByte)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {operationType === 'SubBytes' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h5 className="font-extrabold text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">SubBytes operatsiyasi</h5>
            </div>
            <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500">
              <p className="text-base text-gray-800 font-semibold leading-relaxed">
                Har bir bayt S-box jadvalidagi mos qiymat bilan almashtiriladi. 
                Bu AES algoritmidagi <strong className="text-blue-700">yagona no-chiziqli (non-linear) amal</strong> hisoblanadi.
              </p>
            </div>
            
            {/* Before and After matrices side by side */}
            {step.previousState && (
            <div className="mb-6 p-4 sm:p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 rounded-2xl border-2 border-purple-300 shadow-xl">
                <div className="flex flex-col lg:flex-row justify-center items-center lg:items-start gap-4 lg:gap-8 mb-4">
                  {/* Before matrix */}
                  <div className="w-fit">
                    <div className="text-center mb-3">
                      <h6 className="font-bold text-lg text-purple-900 mb-1">Oldin</h6>
                      <p className="text-xs text-gray-600">S-box dan oldin</p>
                    </div>
                    <div className="space-y-2 w-fit mx-auto">
                      {[0, 1, 2, 3].map(row => (
                        <div key={row} className="flex items-center gap-2">
                          <div className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg shadow-sm">
                            R{row}
                          </div>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map(col => {
                              const index = row + col * 4;
                              const isSelected = selectedByteIndex === index;
                              return (
                                <button
                                  key={col}
                                  onClick={() => setSelectedByteIndex(isSelected ? null : index)}
                                  className={`w-14 h-14 border-2 flex items-center justify-center text-sm font-mono rounded-lg shadow-md transition-all transform hover:scale-110 ${
                                    isSelected
                                      ? 'bg-gradient-to-br from-yellow-300 to-amber-400 border-yellow-600 text-yellow-900 shadow-xl scale-110 font-bold'
                                      : 'bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-400 text-gray-800 hover:border-yellow-600 hover:shadow-lg'
                                  }`}
                                  title={`Byte [${row},${col}] - Bosish orqali S-box lookup ko'ring`}
                                >
                                  {formatByte(step.previousState![index])}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                
                  {/* Arrow */}
                  <div className="hidden lg:flex items-center justify-center">
                    <div className="text-4xl font-bold text-purple-600">→</div>
                  </div>
                
                  {/* After matrix */}
                  <div className="w-fit">
                    <div className="text-center mb-3">
                      <h6 className="font-bold text-lg text-purple-900 mb-1">Keyin</h6>
                      <p className="text-xs text-gray-600">S-box dan keyin</p>
                    </div>
                    <div className="space-y-2 w-fit mx-auto">
                      {[0, 1, 2, 3].map(row => (
                        <div key={row} className="flex items-center gap-2">
                          <div className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg shadow-sm">
                            R{row}
                          </div>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map(col => {
                              const index = row + col * 4;
                              const isSelected = selectedByteIndex === index;
                              return (
                                <button
                                  key={col}
                                  onClick={() => setSelectedByteIndex(isSelected ? null : index)}
                                  className={`w-14 h-14 border-2 flex items-center justify-center text-sm font-mono rounded-lg shadow-md transition-all transform hover:scale-110 ${
                                    isSelected
                                      ? 'bg-gradient-to-br from-purple-400 to-pink-400 border-purple-600 text-white shadow-xl scale-110 font-bold'
                                      : 'bg-gradient-to-br from-purple-100 to-pink-100 border-purple-400 text-gray-800 hover:border-purple-600 hover:shadow-lg'
                                  }`}
                                  title={`Byte [${row},${col}] - Bosish orqali S-box lookup ko'ring`}
                                >
                                  {formatByte(step.state[index])}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Instruction */}
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <p className="text-sm text-gray-700 font-semibold text-center">
                    <strong>Ko'rsatma:</strong> Har bir baytni bosib, S-box jadvalidan qanday qilib olinayotganini ko'rishingiz mumkin!
                  </p>
                </div>
              </div>
            )}
            
            {/* S-box lookup - Show selected byte or default first byte */}
            {step.previousState && step.state && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl"></span>
                  <h6 className="font-bold text-xl text-purple-900">
                    {selectedByteIndex !== null 
                      ? `S-box jadvalidan qiymat olish (Bayt [${selectedByteIndex % 4},${Math.floor(selectedByteIndex / 4)}]):` 
                      : 'S-box jadvalidan qiymat olish misol (Birinchi bayt):'}
                  </h6>
                </div>
                <SBoxLookup 
                  inputByte={step.previousState[selectedByteIndex !== null ? selectedByteIndex : 0]} 
                  outputByte={step.state[selectedByteIndex !== null ? selectedByteIndex : 0]}
                  showProcess={true}
                />
              </div>
            )}
            
            <div className="text-base text-slate-700 p-5 bg-gradient-to-r from-purple-100 via-pink-100 to-purple-100 rounded-xl border-l-4 border-purple-500 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <strong className="font-bold text-purple-900">Maqsad:</strong>
              </div>
              <p className="text-gray-800">
                Bu operatsiya <strong className="text-purple-700">chalkashlik </strong> ni ta'minlaydi - 
                kirish va chiqish o'rtasida murakkab bog'liqlik yaratadi.
              </p>
            </div>
          </div>
        )}

        {operationType === 'ShiftRows' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h5 className="font-extrabold text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">ShiftRows operatsiyasi</h5>
            </div>
            <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500">
              <p className="text-base text-gray-800 font-semibold leading-relaxed">
                Holat matritsasining qatorlari chap tomonga quyidagicha siljitiladi:
              </p>
            </div>

            {/* Before and After visualization - ROWS DISPLAY */}
            <div className="mb-6 p-4 sm:p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 rounded-2xl border-2 border-green-300 shadow-xl">
              <div className="flex flex-col lg:flex-row justify-center items-center lg:items-start gap-4 lg:gap-8 mb-4">
                {/* Before matrix - ROWS */}
                <div className="w-fit">
                  <div className="text-center mb-4">
                    <h6 className="font-bold text-lg text-green-900 mb-1">Oldin</h6>
                    <p className="text-xs text-gray-600">Qatorlar - siljitishdan oldin</p>
                  </div>
                  <div className="space-y-3 w-fit mx-auto">
                    {[0, 1, 2, 3].map(row => (
                      <div key={row} className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center text-sm font-bold bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg shadow-sm">
                          R{row}
                        </div>
                        <div className="flex gap-2">
                          {[0, 1, 2, 3].map(col => {
                            const index = row + col * 4;
                            const beforeValue = step.previousState ? step.previousState[index] : step.state[index];
                            return (
                              <div
                                key={col}
                                className={`w-14 h-14 border-2 flex items-center justify-center text-sm font-mono rounded-lg shadow-md font-bold transition-all ${
                                  row === 0 
                                    ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400 text-gray-800' 
                                    : 'bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-400 text-gray-800'
                                }`}
                              >
                                {formatByte(beforeValue)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:flex items-center justify-center">
                  <div className="text-4xl font-bold text-green-600">→</div>
                </div>

                {/* After matrix - ROWS */}
                <div className="w-fit">
                  <div className="text-center mb-4">
                    <h6 className="font-bold text-lg text-green-900 mb-1">Keyin</h6>
                    <p className="text-xs text-gray-600">Qatorlar - siljitishdan keyin</p>
                  </div>
                  <div className="space-y-3 w-fit mx-auto">
                    {[0, 1, 2, 3].map(row => {
                      // Calculate shift amount for this row (left shift)
                      const shiftAmount = row; // Row 0: 0, Row 1: 1, Row 2: 2, Row 3: 3
                      return (
                        <div key={row} className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center text-sm font-bold bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg shadow-sm">
                            R{row}
                          </div>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map(col => {
                              const index = row + col * 4;
                              // Calculate the original position before shift (left shift means we look backwards)
                              // For left shift: new_col = (old_col - shift) % 4
                              // So: old_col = (new_col + shift) % 4
                              const originalCol = (col + shiftAmount) % 4;
                              const originalIndex = row * 4 + originalCol;
                              const isMoved = row > 0 && col !== originalCol;
                              
                              return (
                                <div
                                  key={col}
                                  className={`w-14 h-14 border-2 flex items-center justify-center text-sm font-mono rounded-lg shadow-md font-bold transition-all relative ${
                                    row === 0 
                                      ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400 text-gray-800' 
                                      : isMoved
                                      ? 'bg-gradient-to-br from-green-300 to-emerald-300 border-green-600 text-green-900 shadow-lg'
                                      : 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-400 text-gray-800'
                                  }`}
                                  title={isMoved ? `Byte [${row},${originalCol}] dan [${row},${col}] ga siljidi (${shiftAmount} ta chapga)` : 'O\'zgarmadi'}
                                >
                                  {formatByte(step.state[index])}
                                  {isMoved && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-900 shadow-md" title={`${shiftAmount} ta chapga siljidi`}>
                                      ←
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row shift explanations */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-xl border-2 border-gray-400 shadow-md hover:shadow-lg transition-all">
                  <div className="text-lg font-bold text-gray-800 mb-2">Row 0</div>
                  <div className="text-sm text-gray-600 font-semibold bg-gray-100 p-2 rounded-lg">0 ta siljitish</div>
                  <div className="text-xs text-gray-500 mt-2">Qator o'zgarmaydi</div>
                </div>
                <div className="text-center p-4 bg-white rounded-xl border-2 border-green-400 shadow-md hover:shadow-lg transition-all">
                  <div className="text-lg font-bold text-green-800 mb-2">Row 1</div>
                  <div className="text-sm text-green-700 font-semibold bg-green-100 p-2 rounded-lg">1 ta chapga</div>
                  <div className="text-xs text-gray-500 mt-2">Bayt[1,0]→[1,3], [1,1]→[1,0], ...</div>
                </div>
                <div className="text-center p-4 bg-white rounded-xl border-2 border-emerald-400 shadow-md hover:shadow-lg transition-all">
                  <div className="text-lg font-bold text-emerald-800 mb-2">Row 2</div>
                  <div className="text-sm text-emerald-700 font-semibold bg-emerald-100 p-2 rounded-lg">2 ta chapga</div>
                  <div className="text-xs text-gray-500 mt-2">Bayt[2,0]→[2,2], [2,1]→[2,3], ...</div>
                </div>
                <div className="text-center p-4 bg-white rounded-xl border-2 border-teal-400 shadow-md hover:shadow-lg transition-all">
                  <div className="text-lg font-bold text-teal-800 mb-2">Row 3</div>
                  <div className="text-sm text-teal-700 font-semibold bg-teal-100 p-2 rounded-lg">3 ta chapga</div>
                  <div className="text-xs text-gray-500 mt-2">Bayt[3,0]→[3,1], [3,1]→[3,2], ...</div>
                </div>
              </div>
            </div>

            <div className="text-base text-slate-700 p-5 bg-gradient-to-r from-green-100 via-emerald-100 to-green-100 rounded-xl border-l-4 border-green-500 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <strong className="font-bold text-green-900">Maqsad:</strong>
              </div>
              <p className="text-gray-800">
                Bu operatsiya <strong className="text-green-700">diffuziya </strong> ni ta'minlaydi -
                har bir ustundagi baytlar keyingi round davomida tarqaladi.
              </p>
            </div>
          </div>
        )}

        {operationType === 'MixColumns' && (
          <div>
            <h5 className="font-bold text-2xl mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">MixColumns operatsiyasi:</h5>
            <p className="text-base text-slate-700 mb-4">
              Har bir ustun Galois maydoni ustida chiziqli o'zgartirish orqali o'zgartiriladi.
              Bu jarayon shifrda diffuziya (ya'ni ma'lumotlarning keng tarqalishi) ni ta'minlaydi.
            </p>
            
            {/* Enhanced Before and After matrices with clear separation */}
            {step.previousState && (
              <div className="flex flex-wrap items-stretch justify-center gap-4 lg:gap-8 mb-8">
                {/* 1: Before */}
                <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-300 shadow-xl w-full max-w-[300px]">
                  <div className="text-center mb-4">
                    <h6 className="font-extrabold text-purple-900 text-xl mb-1">Kiruvchi</h6>
                    <p className="text-sm text-purple-700 font-semibold">ShiftRows dan keyingi holat</p>
                  </div>
                  <div className="flex justify-center">
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map(row => (
                        <div key={row} className="flex items-center gap-2">
                          <div className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-purple-200 text-purple-800 rounded border-2 border-purple-300">R{row}</div>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map(col => {
                              const index = row + col * 4;
                              return (
                                <div key={col} className="w-14 h-14 border-2 border-gray-300 flex items-center justify-center text-sm font-mono bg-white rounded">
                                  {formatByte(step.previousState![index])}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-purple-700 text-center font-semibold">Holat matritsasi</div>
                </div>

                {/* multiply sign */}
                <div className="hidden sm:flex w-10 items-center justify-center">
                  <div className="text-5xl font-extrabold text-blue-700 select-none drop-shadow-lg">×</div>
                  </div>
 
                {/* 2: Constant matrix */}
                <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-300 shadow-xl w-full max-w-[300px]">
                  <div className="text-center mb-4">
                    <h6 className="font-extrabold text-blue-900 text-xl mb-1">O'zgarmas</h6>
                    <p className="text-sm text-blue-700 font-semibold">MixColumns matrisi (4×4)</p>
                  </div>
                  <div className="flex justify-center">
                    <MatrixVisualizer 
                      matrix={MIX_COLUMNS_MATRIX}
                      showRowLabels={false}
                      showColumnLabels={false}
                      hideDetails={true}
                    />
                  </div>
                  <div className="mt-3 text-xs text-blue-700 text-center font-semibold">Galois maydonidagi ko'paytmalar</div>
                </div>

                {/* equal sign */}
                <div className="hidden sm:flex w-10 items-center justify-center">
                  <div className="text-5xl font-extrabold text-blue-700 select-none drop-shadow-lg">=</div>
                </div>
 
                {/* 3: After */}
                <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300 shadow-xl w-full max-w-[300px]">
                  <div className="text-center mb-4">
                    <h6 className="font-extrabold text-green-900 text-xl mb-1">Chiquvchi</h6>
                    <p className="text-sm text-green-700 font-semibold">MixColumns dan keyin</p>
                  </div>
                  <div className="flex justify-center">
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map(row => (
                        <div key={row} className="flex items-center gap-2">
                          <div className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-green-200 text-green-800 rounded border-2 border-green-300">R{row}</div>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map(col => {
                              const index = row + col * 4;
                              return (
                                <div key={col} className="w-14 h-14 border-2 border-gray-300 flex items-center justify-center text-sm font-mono bg-white rounded">
                                  {formatByte(step.state[index])}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-green-700 text-center font-semibold">Yangi holat matritsasi (4×4)</div>
                </div>
              </div>
            )}

            {/* Enhanced MixColumns Operation Visualization */}
            <details className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-300 mt-8 shadow-xl">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <h6 className="font-extrabold text-blue-800 text-lg sm:text-xl">MixColumns operatsiyasi batafsil</h6>
                  <span className="text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-full px-3 py-1">
                    Ochish
                  </span>
                </div>
              </summary>
              <div className="mt-6">
              
              {/* Column-wise transformation visualization */}
              <div className="space-y-6">
                {[0, 1, 2, 3].map(col => (
                  <div key={col} className="p-4 sm:p-6 bg-white rounded-2xl border-2 border-blue-200 shadow-lg">
                    <h6 className="font-bold text-lg sm:text-xl text-blue-700 mb-4 block">Ustun {col} transformatsiyasi:</h6>
                    
                    {/* Column before transformation */}
                    <div className="mb-4">
                      <div className="text-base font-bold text-purple-700 mb-3">Oldin (1-jadvaldan):</div>
                      <div className="flex justify-center gap-3">
                        {[0, 1, 2, 3].map(row => {
                          const index = row + col * 4;
                          const value = step.previousState ? step.previousState[index] : step.state[index];
                          return (
                            <div key={row} className="text-center">
                              <div className="w-14 h-14 border-2 border-purple-300 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-purple-50 to-pink-50 text-purple-800 rounded-lg shadow-md mb-2">
                                {formatByte(value)}
                              </div>
                              <div className="text-xs text-gray-700 font-semibold">s{row}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Transformation formulas */}
                    <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="text-xl font-bold text-blue-800 mb-3">Galois Field ko'paytirish formulalari:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-base sm:text-lg font-mono">
                        <div className="bg-white p-3 rounded-lg border border-blue-200 font-semibold">s'₀ = 2×s₀ ⊕ 3×s₁ ⊕ s₂ ⊕ s₃</div>
                        <div className="bg-white p-3 rounded-lg border border-blue-200 font-semibold">s'₁ = s₀ ⊕ 2×s₁ ⊕ 3×s₂ ⊕ s₃</div>
                        <div className="bg-white p-3 rounded-lg border border-blue-200 font-semibold">s'₂ = s₀ ⊕ s₁ ⊕ 2×s₂ ⊕ 3×s₃</div>
                        <div className="bg-white p-3 rounded-lg border border-blue-200 font-semibold">s'₃ = 3×s₀ ⊕ s₁ ⊕ s₂ ⊕ 2×s₃</div>
                      </div>
                    </div>

                    {/* Column after transformation */}
                    <div>
                      <div className="text-base font-bold text-green-700 mb-3">Keyin (3-jadvalga):</div>
                      <div className="flex justify-center gap-3">
                        {[0, 1, 2, 3].map(row => {
                          const index = row + col * 4;
                          return (
                            <div key={row} className="text-center">
                              <div className="w-14 h-14 border-2 border-green-300 flex items-center justify-center text-sm font-mono bg-gradient-to-br from-green-50 to-emerald-50 text-green-800 rounded-lg shadow-md mb-2">
                                {formatByte(step.state[index])}
                              </div>
                              <div className="text-xs text-gray-700 font-semibold">s'{row}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed calculation for first column */}
                    {col === 0 && step.previousState && (
                      <details className="mt-6 p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300 shadow-md">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-lg font-bold text-yellow-800">Birinchi ustun uchun batafsil hisoblash</span>
                            <span className="text-xs font-semibold text-yellow-700 bg-white border border-yellow-300 rounded-full px-3 py-1">
                              Ochish
                            </span>
                          </div>
                        </summary>
                        <div className="space-y-3 mt-4">
                          {[0, 1, 2, 3].map(row => {
                            const base = col * 4;
                            const s0 = step.previousState![base];
                            const s1 = step.previousState![base + 1];
                            const s2 = step.previousState![base + 2];
                            const s3 = step.previousState![base + 3];
                            const result = step.state[row + col * 4];
                            
                            // Determine coefficients for each byte
                            let coeffs = [0, 0, 0, 0];
                            if (row === 0) coeffs = [2, 3, 1, 1];
                            else if (row === 1) coeffs = [1, 2, 3, 1];
                            else if (row === 2) coeffs = [1, 1, 2, 3];
                            else coeffs = [3, 1, 1, 2];
                            
                            return (
                              <div key={row} className="bg-white p-5 rounded-2xl border-2 border-gray-300 shadow-lg">
                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                  {/* s'{row} = label */}
                                  <div className="text-xl font-extrabold text-blue-700">s'{row} =</div>
                                  
                                  {/* Each term */}
                                  {coeffs.map((coeff, idx) => {
                                    const sValue = idx === 0 ? s0 : idx === 1 ? s1 : idx === 2 ? s2 : s3;
                                    const isLast = idx === 3;
                                    
                                    // Calculate the result of multiplication
                                    let multipliedValue = sValue;
                                    if (coeff === 2) {
                                      multipliedValue = GALOIS_MUL_2[sValue];
                                    } else if (coeff === 3) {
                                      multipliedValue = GALOIS_MUL_3[sValue];
                                    }
                                    
                                    return (
                                      <div key={idx} className="flex items-center gap-2">
                                        {/* Coefficient × Byte */}
                                        {coeff !== 1 && (
                                          <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1">
                                              <div className="px-2 py-1 bg-orange-100 border border-orange-300 rounded font-semibold text-orange-700">
                                                {coeff}×
                                              </div>
                                              <div className="w-12 h-12 border-2 border-purple-300 flex items-center justify-center text-sm font-mono bg-purple-50 text-purple-800 rounded">
                                                {formatByte(sValue)}
                                              </div>
                                              <div className="text-lg font-bold text-orange-600">=</div>
                                              <div className="w-12 h-12 border-2 border-orange-400 flex items-center justify-center text-sm font-mono bg-orange-100 text-orange-800 rounded shadow-md">
                                                {formatByte(multipliedValue)}
                                              </div>
                                            </div>
                                            
                                            {/* Detailed calculation */}
                                            {coeff === 2 && (
                                              <div className="bg-orange-50 p-2 rounded-lg border-2 border-orange-300 text-xs w-56 sm:w-64">
                                                {(() => {
                                                  const steps = galoisMul2StepByStep(sValue);
                                                  return (
                                                    <div className="space-y-2">
                                                      <div className="font-bold text-orange-800 text-center mb-2">2×{steps.original} qanday?</div>
                                                      
                                                      {/* Explanation */}
                                                      <div className="bg-gray-100 p-2 rounded border border-gray-300 mb-2">
                                                        <div className="text-xs text-gray-700 leading-tight">
                                                          <span className="font-bold">Galois Field</span>da ×2 = chapga 1 bit siljitish
                                                        </div>
                                                      </div>
                                                      
                                                      {/* Step 1: Show binary */}
                                                      <div className="bg-blue-100 p-2 rounded border border-blue-300">
                                                        <div className="text-xs mb-1 font-semibold">1. Binary ko'rinish:</div>
                                                        <div className="font-mono text-sm bg-white px-2 py-1 rounded border">
                                                          {steps.originalBinary}
                                                        </div>
                                                      </div>

                                                      {/* Step 2: Shift */}
                                                      <div className="bg-green-100 p-2 rounded border border-green-300">
                                                        <div className="text-xs mb-1 font-semibold">2. Chapga 1 bit siljitish (×2):</div>
                                                        <div className="space-y-1">
                                                          <div className="text-center text-xs text-gray-600">Oldin:</div>
                                                          <div className="font-mono text-xs bg-white px-1 py-1 rounded border text-center">
                                                            {steps.originalBinary}
                                                          </div>
                                                          <div className="text-center text-orange-600 font-bold">↓</div>
                                                          <div className="text-center text-xs text-gray-600">Keyin:</div>
                                                          <div className="font-mono text-xs bg-white px-1 py-1 rounded border text-center">
                                                            {steps.shiftedBinary}
                                                          </div>
                                                          <div className="text-center text-xs mt-1">
                                                            = <span className="font-semibold text-blue-700">{steps.shifted}</span>
                                                          </div>
                                                          {steps.hasOverflow && (
                                                            <div className="text-center text-xs text-red-600 font-bold mt-1">
                                                              Oldingi bit = {steps.originalBinary[0]} → 9-bit bo'ldi!
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>

                                                      {/* Step 3: XOR if needed */}
                                                      {steps.hasOverflow && (
                                                        <div className="bg-red-100 p-2 rounded border border-red-300">
                                                          <div className="text-xs mb-1 font-semibold">3. 1B bilan XOR (tuzatish):</div>
                                                          <div className="text-xs text-gray-600 mb-1">
                                                            Galois Fieldda 9-bit bo'lib qolsa, <span className="font-bold">keltirilmaydigan ko‘phad</span> (1B) bilan XOR qilamiz
                                                          </div>
                                                          <div className="space-y-1">
                                                            <div className="flex items-center gap-1 justify-center">
                                                              <span className="font-mono text-xs bg-white px-1 py-1 rounded border">{steps.shiftedBinary}</span>
                                                              <span className="text-orange-600 font-bold">⊕</span>
                                                              <span className="font-mono text-xs bg-white px-1 py-1 rounded border">{steps.xorBinary}</span>
                                                            </div>
                                                            <div className="text-center text-orange-600 font-bold">=</div>
                                                            <div className="text-center">
                                                              <span className="font-mono text-xs bg-white px-1 py-1 rounded border">{steps.correctedBinary}</span>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}

                                                      {/* Final answer */}
                                                      <div className="bg-yellow-200 p-2 rounded-lg border-2 border-yellow-400 text-center">
                                                        <div className="text-xs font-semibold text-gray-600">Javob:</div>
                                                        <div className="font-mono text-lg font-bold text-yellow-900">{steps.corrected}</div>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            )}
                                            {coeff === 3 && (
                                              <div className="bg-orange-50 p-2 rounded-lg border-2 border-orange-300 text-xs w-56 sm:w-64">
                                                {(() => {
                                                  const steps = galoisMul3StepByStep(sValue);
                                                  return (
                                                    <div className="space-y-2">
                                                      <div className="font-bold text-orange-800 text-center mb-2">3×{steps.original} qanday?</div>
                                                      
                                                      {/* Step 1 */}
                                                      <div className="bg-blue-100 p-2 rounded border border-blue-300">
                                                        <div className="text-xs mb-1 font-semibold">1. Avval 2× hisoblaymiz:</div>
                                                        <div className="text-center space-y-1">
                                                          <div className="flex items-center justify-center gap-1">
                                                            <span className="font-semibold">2×</span>
                                                            <span className="font-mono text-xs bg-white px-2 py-1 rounded border">{steps.original}</span>
                                                            <span>=</span>
                                                            <span className="font-mono text-xs bg-white px-2 py-1 rounded border">{steps.mul2}</span>
                                                          </div>
                                                        </div>
                                                      </div>

                                                      {/* Step 2 */}
                                                      <div className="bg-green-100 p-2 rounded border border-green-300">
                                                        <div className="text-xs mb-1 font-semibold">2. Asl qiymat bilan XOR:</div>
                                                        <div className="space-y-1">
                                                          <div className="flex items-center justify-center gap-1">
                                                            <span className="font-mono text-xs bg-white px-1 py-1 rounded border">{steps.mul2Binary}</span>
                                                            <span className="text-orange-600 font-bold">⊕</span>
                                                            <span className="font-mono text-xs bg-white px-1 py-1 rounded border">{steps.originalBinary}</span>
                                                          </div>
                                                          <div className="text-center text-orange-600 font-bold">=</div>
                                                          <div className="text-center">
                                                            <span className="font-mono text-xs bg-white px-1 py-1 rounded border">{steps.resultBinary}</span>
                                                          </div>
                                                        </div>
                                                      </div>

                                                      {/* Final answer */}
                                                      <div className="bg-yellow-200 p-2 rounded-lg border-2 border-yellow-400 text-center">
                                                        <div className="text-xs font-semibold text-gray-600">Javob:</div>
                                                        <div className="font-mono text-lg font-bold text-yellow-900">{steps.result}</div>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {coeff === 1 && (
                                          <div className="w-12 h-12 border-2 border-purple-300 flex items-center justify-center text-sm font-mono bg-purple-50 text-purple-800 rounded">
                                            {formatByte(sValue)}
                                          </div>
                                        )}
                                        {!isLast && (
                                          <div className="text-2xl font-bold text-orange-600">⊕</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  
                                  {/* = Result */}
                                  <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-gray-600">=</div>
                                    <div className="w-12 h-12 border-2 border-green-400 flex items-center justify-center text-sm font-mono bg-green-100 text-green-800 rounded shadow-md">
                                      {formatByte(result)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>

              {/* Galois Field explanation */}
              <div className="mt-6 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-300 shadow-md">
                <h6 className="font-bold text-indigo-800 mb-3 block text-lg">Galois Field GF(2⁸) ko'paytirish:</h6>
                <div className="text-base text-indigo-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <div><strong>2×:</strong> Baytni chapga 1 bit siljitish (agar overflow bo'lsa, 1B bilan XOR)</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <div><strong>3×:</strong> 2× natijasini asl qiymat bilan XOR qilish</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <div><strong>XOR (⊕):</strong> Bitlar bo‘yicha XOR amali</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <div><strong>Maqsad:</strong> Har bir chiqish bayti barcha kirish baytlarga bog'liq bo'ladi</div>
                  </div>
                </div>
              </div>

                {/* Enhanced Legend */}
                <div className="flex justify-center gap-6 text-base mt-6 flex-wrap">
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-purple-500 rounded-lg shadow-sm"></div>
                  <span className="font-bold text-purple-800">Kiruvchi</span>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-blue-500 rounded-lg shadow-sm"></div>
                  <span className="font-bold text-blue-800">O'zgarmas</span>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-green-500 rounded-lg shadow-sm"></div>
                  <span className="font-bold text-green-800">Chiquvchi</span>
                </div>
                </div>
              </div>
            </details>
            
            <div className="text-base text-slate-700 mt-6 p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl border border-blue-300">
              <strong className="font-bold text-blue-900">Maqsad:</strong> Bu operatsiya eng kuchli diffuziya ta'minlaydi - 
              chiqishdagi har bir bayt kirishdagi barcha baytlarga bog'liq bo'ladi.
            </div>
          </div>
        )}

        {operationType === 'AddRoundKey' && (
          <div>
            <h5 className="font-bold text-xl sm:text-2xl mb-3 text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">AddRoundKey operatsiyasi:</h5>
            <p className="text-base text-slate-700 mb-4">
              Holat raund kalit bilan XOR amaliyoti orqali birlashtiriladi.
            </p>
            {step.roundKey && (
              <div>
                {/* Before and After matrices side by side */}
                {step.previousState && (
                  <div className="flex flex-wrap items-stretch justify-center gap-4 lg:gap-8 mb-8">
                    {/* 1: State Before XOR */}
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-300 shadow-xl w-full max-w-[300px]">
                      <div className="text-center mb-4">
                        <h6 className="font-extrabold text-red-900 text-xl mb-1">Kiruvchi</h6>
                        <p className="text-sm text-red-700 font-semibold">Bu bosqichga kelgan holat</p>
                      </div>
                      <div className="flex justify-center">
                        <div className="space-y-2">
                          {[0, 1, 2, 3].map(row => (
                            <div key={row} className="flex items-center gap-2">
                              <div className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-red-200 text-red-800 rounded border-2 border-red-300">R{row}</div>
                              <div className="flex gap-1">
                                {[0, 1, 2, 3].map(col => {
                                  const index = row + col * 4;
                                  return (
                                    <div key={col} className="w-10 h-10 border border-gray-300 flex items-center justify-center text-sm font-mono bg-white rounded">
                                      {formatByte(step.previousState![index])}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-red-700 text-center font-semibold">Holat matritsasi (4×4)</div>
                    </div>

                    {/* XOR symbol */}
                    <div className="hidden sm:flex w-10 items-center justify-center">
                      <div className="text-5xl font-extrabold text-orange-700 select-none drop-shadow-lg">⊕</div>
                    </div>

                    {/* 2: Round Key */}
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-300 shadow-xl w-full max-w-[300px]">
                      <div className="text-center mb-4">
                        <h6 className="font-extrabold text-blue-900 text-xl mb-1">Raund Kalit</h6>
                        <p className="text-sm text-blue-700 font-semibold">Bu bosqich uchun kalit</p>
                      </div>
                      <div className="flex justify-center">
                        <div className="space-y-2">
                          {[0, 1, 2, 3].map(row => (
                            <div key={row} className="flex items-center gap-2">
                              <div className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-blue-200 text-blue-800 rounded border-2 border-blue-300">R{row}</div>
                              <div className="flex gap-1">
                                {[0, 1, 2, 3].map(col => {
                                  const index = row + col * 4;
                                  return (
                                    <div key={col} className="w-10 h-10 border border-gray-300 flex items-center justify-center text-sm font-mono bg-white rounded">
                                      {formatByte(step.roundKey![index])}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-blue-700 text-center font-semibold">Kalit matritsasi (4×4)</div>
                    </div>

                    {/* equal sign */}
                    <div className="hidden sm:flex w-10 items-center justify-center">
                      <div className="text-5xl font-extrabold text-orange-700 select-none drop-shadow-lg">=</div>
                  </div>

                    {/* 3: Result After XOR */}
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300 shadow-xl w-full max-w-[300px]">
                    <div className="text-center mb-4">
                        <h6 className="font-extrabold text-green-900 text-xl mb-1">Chiquvchi</h6>
                        <p className="text-sm text-green-700 font-semibold">XOR amalidan keyin</p>
                    </div>
                    <div className="flex justify-center">
                      <div className="space-y-2">
                        {[0, 1, 2, 3].map(row => (
                          <div key={row} className="flex items-center gap-2">
                              <div className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-green-200 text-green-800 rounded border-2 border-green-300">R{row}</div>
                              <div className="flex gap-1">
                              {[0, 1, 2, 3].map(col => {
                                const index = row + col * 4;
                                return (
                                    <div key={col} className="w-10 h-10 border border-gray-300 flex items-center justify-center text-sm font-mono bg-white rounded">
                                      {formatByte(step.state[index])}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      </div>
                      <div className="mt-3 text-xs text-green-700 text-center font-semibold">Yangi holat matritsasi (4×4)</div>
                    </div>
                  </div>
                )}
                
                {/* Enhanced XOR Operation Visualization */}
                <details className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border-2 border-orange-300 mt-8 shadow-xl">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <h6 className="font-extrabold text-orange-800 text-lg sm:text-xl">XOR operatsiyasi batafsil</h6>
                      <span className="text-xs font-semibold text-orange-700 bg-white border border-orange-200 rounded-full px-3 py-1">
                        Ochish
                      </span>
                    </div>
                  </summary>
                  <div className="mt-6">
                  
                  {/* Detailed XOR Example for First Byte */}
                  {step.previousState && step.roundKey && (
                    <div className="hidden mb-6 p-6 bg-white rounded-2xl border-2 border-orange-200 shadow-lg">
                      <h6 className="font-bold text-xl text-orange-700 mb-4 block">Misol: Birinchi bayt uchun XOR jarayoni</h6>
                      
                      <div className="flex justify-center items-center gap-4 mb-4">
                        {/* State Byte */}
                        <div className="text-center">
                          <div className="w-16 h-16 border-2 border-red-400 flex items-center justify-center text-lg font-mono bg-red-100 text-red-800 rounded-lg shadow-lg mb-2">
                            {formatByte(step.previousState[0])}
                          </div>
                          <div className="text-xs text-gray-600">(1-jadvaldan)</div>
                        </div>
                        
                        {/* XOR Symbol */}
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">⊕</div>
                          <div className="text-xs text-orange-600">XOR</div>
                        </div>
                        
                        {/* Round Key Byte */}
                        <div className="text-center">
                          <div className="w-16 h-16 border-2 border-blue-400 flex items-center justify-center text-lg font-mono bg-blue-100 text-blue-800 rounded-lg shadow-lg mb-2">
                            {formatByte(step.roundKey[0])}
                          </div>
                          <div className="text-xs text-gray-600">(2-jadvaldan)</div>
                        </div>
                        
                        {/* Equals Symbol */}
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">=</div>
                        </div>
                        
                        {/* Result Byte */}
                        <div className="text-center">
                          <div className="w-16 h-16 border-2 border-green-400 flex items-center justify-center text-lg font-mono bg-green-100 text-green-800 rounded-lg shadow-lg mb-2">
                            {formatByte(step.previousState[0] ^ step.roundKey[0])}
                          </div>
                          <div className="text-xs text-gray-600">(3-jadvalga)</div>
                        </div>
                      </div>
                      
                      {/* Binary Breakdown */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm font-semibold mb-2 text-gray-700">Binary ko'rinishda:</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-20 text-red-600 font-semibold">Kiruvchi:</div>
                            <div className="font-mono bg-red-50 p-1 rounded border">
                              {step.previousState[0].toString(2).padStart(8, '0')}
                            </div>
                            <div className="text-xs text-gray-500">({formatByte(step.previousState[0])})</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 text-blue-600 font-semibold">Kalit:</div>
                            <div className="font-mono bg-blue-50 p-1 rounded border">
                              {step.roundKey[0].toString(2).padStart(8, '0')}
                            </div>
                            <div className="text-xs text-gray-500">({formatByte(step.roundKey[0])})</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 text-orange-600 font-semibold">XOR:</div>
                            <div className="text-center text-orange-600 font-bold">⊕ ⊕ ⊕ ⊕ ⊕</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 text-green-600 font-semibold">Natija:</div>
                            <div className="font-mono bg-green-50 p-1 rounded border">
                              {(step.previousState[0] ^ step.roundKey[0]).toString(2).padStart(8, '0')}
                            </div>
                            <div className="text-xs text-gray-500">({formatByte(step.previousState[0] ^ step.roundKey[0])})</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Compact Binary XOR Grid */}
                  <div className="mb-6">
                    <h6 className="font-bold text-xl sm:text-2xl text-orange-700 mb-4 block">Barcha baytlar uchun Binary XOR:</h6>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {step.state.map((byte, i) => {
                        const stateByte = step.previousState ? step.previousState[i] : byte;
                        const keyByte = step.roundKey?.[i] || 0;
                        const resultByte = stateByte ^ keyByte;
                        
                        // Convert to binary
                        const stateBinary = formatByteAsSpacedBinary(stateByte);
                        const keyBinary = formatByteAsSpacedBinary(keyByte);
                        const resultBinary = formatByteAsSpacedBinary(resultByte);
                        
                        return (
                          <div key={i} className="bg-white p-3 rounded-xl border-2 border-orange-200 shadow-md hover:shadow-lg transition-shadow">
                            <div className="text-center">
                              <div className="text-base font-extrabold text-gray-700 mb-3">Bayt {i}</div>
                              
                              {/* Hex formula */}
                              <div className="mb-3 p-2 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg text-sm font-mono font-bold">
                                {formatByte(stateByte)} ⊕ {formatByte(keyByte)} = {formatByte(resultByte)}
                              </div>
                              
                              {/* Binary XOR visualization */}
                              <div className="space-y-0">
                                {/* State binary */}
                                <div className="text-center">
                                  <div className="text-sm font-mono bg-gradient-to-br from-red-50 to-orange-50 p-0.5 rounded-lg border-2 border-red-300 shadow-sm font-bold">
                                    {stateBinary}
                                  </div>
                                </div>
                                
                                {/* XOR symbol */}
                                <div className="text-center text-orange-600 font-bold text-xl leading-none">⊕</div>
                                
                                {/* Key binary */}
                                <div className="text-center">
                                  <div className="text-sm font-mono bg-gradient-to-br from-blue-50 to-cyan-50 p-0.5 rounded-lg border-2 border-blue-300 shadow-sm font-bold">
                                    {keyBinary}
                                  </div>
                                </div>
                                
                                {/* Equals */}
                                <div className="text-center text-gray-700 font-bold text-xl leading-none">=</div>
                                
                                {/* Result binary */}
                                <div className="text-center">
                                  <div className="text-sm font-mono bg-gradient-to-br from-green-50 to-emerald-50 p-0.5 rounded-lg border-2 border-green-300 shadow-sm font-bold">
                                    {resultBinary}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Enhanced Legend for 3 tables */}
                  <div className="flex justify-center gap-6 text-base flex-wrap">
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md">
                      <div className="w-6 h-6 bg-gradient-to-br from-red-400 to-orange-500 border-2 border-red-500 rounded-lg shadow-sm"></div>
                      <span className="font-bold text-red-800">Kiruvchi</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-blue-500 rounded-lg shadow-sm"></div>
                      <span className="font-bold text-blue-800">Round Key</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-green-500 rounded-lg shadow-sm"></div>
                      <span className="font-bold text-green-800">Natija</span>
                    </div>
                  </div>
                  </div>
                </details>

                {/* Detailed explanation */}
                <div className="text-base text-slate-700 mt-6 p-4 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl border border-orange-300">
                  <div className="font-bold text-lg mb-2">XOR operatsiyasi:</div>
                  <div className="text-sm space-y-1">
                    <div>• XOR (⊕) - operatsiyasi</div>
                    <div>• Agar bitlar bir xil bo'lsa → 0</div>
                    <div>• Agar bitlar farq qilsa → 1</div>
                    <div>• Masalan: 53 ⊕ 2A = 79</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (steps.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Hech qanday bosqich mavjud emas
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const isPlaintextStateStep =
    currentStepData.description.includes('Asl ochiq matn') ||
    currentStepData.description.includes('Counter qiymati') ||
    currentStepData.description.includes('Counter') ||
    currentStepData.description.includes('Yakuniy shifrlangan matn') ||
    currentStepData.description.includes('Yakuniy shifrlangan') ||
    currentStepData.description.includes('Boshlang‘ich holat (ochiq matn)') ||
    currentStepData.description.includes("Boshlang'ich holat (ochiq matn)");

  return (
    <div ref={topRef} className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Step Navigation */}
      <div className="flex justify-between items-center mb-6 sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg py-4 px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center w-full gap-3 md:gap-4">
          <div className="flex justify-start">
            <button 
              onClick={() => onStepChange(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className={`w-full md:w-auto px-4 md:px-6 py-3 rounded-xl font-semibold shadow-lg transition-all whitespace-nowrap ${currentStep === 0 ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'}`}
            >
              Oldingi qadam
            </button>
          </div>
          <div className="text-center flex items-center justify-center order-first md:order-none">
            <div className="text-lg md:text-xl font-extrabold text-slate-800 whitespace-nowrap">Qadam {currentStep + 1} / {steps.length}</div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
              disabled={currentStep === steps.length - 1}
              className={`w-full md:w-auto px-4 md:px-6 py-3 rounded-xl font-semibold shadow-lg transition-all whitespace-nowrap ${currentStep === steps.length - 1 ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'}`}
            >
              Keyingi qadam
            </button>
          </div>
        </div>
      </div>

      {/* Current Step Description */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-200">
        <h4 className="font-bold text-xl mb-2 text-blue-900">{currentStepData.description}</h4>
        <p className="text-sm text-slate-700">{currentStepData.explanation}</p>
      </div>

      {/* State Matrix */}
      <div>
        {getOperationType(currentStepData.description) === 'IVXOR' ? (
          renderIVXORMatrices(currentStepData)
        ) : getOperationType(currentStepData.description) === 'CTRXOR' ? (
          renderCTRXORMatrices(currentStepData)
        ) : isPlaintextStateStep ? (
          renderMatrix(
            currentStepData.state,
            currentStepData.activeIndices || [],
            'Holat matritsasi',
            getOperationType(currentStepData.description)
          )
        ) : null}
      </div>

      {/* Operation Details */}
      <div className="mt-6">
        {renderOperationDetails(currentStepData)}
      </div>

      {/* Explanation */}
      <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-200">
        <h4 className="font-bold text-xl mb-2 text-blue-900">Batafsil tushuntirish:</h4>
        <p className="text-sm text-slate-700">{currentStepData.explanation}</p>
      </div>
    </div>
  );
};

export default EncryptionStepVisualizer;
