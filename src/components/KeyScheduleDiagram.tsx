import React from 'react';

interface KeyScheduleDiagramProps {
  initialKey: number[]; // 16 ta byte
  stepData: any; // getKeyScheduleDetailedSteps dan bir raund natijasi (bosqichlari, oraliq qiymatlar)
}

// Matritsa ko'rinishida chizuvchi yordamchi
const renderMatrix = (data: number[], cellPrefix: string) => (
  <div className="grid grid-cols-4 gap-1">
    {data.map((val, i) => (
      <div key={i} className="w-10 h-10 rounded border text-xs font-mono flex items-center justify-center bg-white shadow">
        <span className="opacity-50 mr-1">{cellPrefix}{i}</span> {val.toString(16).padStart(2, '0')}
      </div>
    ))}
  </div>
);

const renderArrows = (count: number) => (
  <div className="flex justify-center ">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="w-10 text-gray-400 flex flex-col items-center">
        <span className="text-xl">↓</span>
      </div>
    ))}
  </div>
);

export default function KeyScheduleDiagram({ initialKey, stepData }: KeyScheduleDiagramProps) {
  // K_0 ... K_15
  const k = initialKey;
  // w_0 ... w_3 initialKey asosida
  const w = [k.slice(0, 4), k.slice(4, 8), k.slice(8, 12), k.slice(12, 16)];
  // g() bosqichlaridan qiymatlar
  const core = stepData?.stepDetails || [];

  // Odatda key schedule'da w_4 = w_0 xor g(w_3) va h.k.

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 p-2">
      {/* Chap blok */}
      <div className="flex-1">
        <div className="flex flex-col items-center mb-4">
          <div className="mb-2 text-xs font-bold text-gray-700">Boshlang'ich kalit</div>
          {renderMatrix(k, 'k')}
        </div>
        {renderArrows(4)}
        <div className="flex gap-2 justify-center mb-2">
          {w.map((wi, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-xs mb-1 font-medium">w<sub>{idx}</sub></span>
              <div className="flex gap-0.5">{wi.map((b, j) => (
                <div key={j} className="w-6 h-6 rounded border text-xs font-mono flex items-center justify-center bg-blue-50">{b.toString(16).padStart(2, '0')}</div>
              ))}</div>
            </div>
          ))}
        </div>
        {/* g() ga nuqtali strelka */}
        <div className="flex justify-center my-1"><span className="text-lg font-bold text-gray-400">↳</span><span className="text-xs text-orange-400 ml-1">g()</span></div>
        {/* XOR aylanmalari va chiqariladigan w_i lar. (Bir nechta misol ko'rsatish mumkin) */}
      </div>
      {/* O'ng blok: g() yadrosi diagrammasi */}
      <div className="flex-1 min-w-[240px] max-w-[420px] mx-auto bg-orange-50 border border-orange-200 rounded-xl shadow p-4">
        <div className="text-orange-700 font-bold mb-2">g() yadrosi — Key schedule core</div>
        {core.map((step: any, idx: number) => (
          <div key={idx} className="mb-2">
            <div className="text-xs font-medium text-gray-700 mb-1">{idx+1}. {step.step}</div>
            <div className="flex gap-1 flex-wrap mb-1">
              {(step.input || []).map((b: number, j: number) => (
                <div key={j} className="w-7 h-7 rounded bg-orange-100 border text-xs font-mono flex items-center justify-center">{b.toString(16).padStart(2, '0')}</div>
              ))}
              {step.rcon && (
                <div className="mx-2 text-orange-800 font-bold">⊕ RCON={step.rcon.toString(16)}</div>
              )}
            </div>
            <span className="mr-2 text-xs text-gray-600">→</span>
            <div className="flex gap-1 flex-wrap">
              {(step.output || []).map((b: number, j: number) => (
                <div key={j} className="w-7 h-7 rounded bg-orange-200 border text-xs font-mono flex items-center justify-center">{b.toString(16).padStart(2, '0')}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
