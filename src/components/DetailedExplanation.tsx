import React from 'react';
import { SBOX, bytesToHex } from '@/utils/aes';

interface DetailedExplanationProps {
  operationType: string;
  inputState: number[];
  outputState: number[];
  roundKey?: number[];
}

const DetailedExplanation: React.FC<DetailedExplanationProps> = ({
  operationType,
  inputState,
  outputState,
  roundKey
}) => {
  // Format a byte as hex string
  const formatByte = (byte: number) => {
    return byte.toString(16).padStart(2, '0');
  };

  const renderSubBytesExplanation = () => {
    return (
      <div>
        <h3 className="font-bold mb-2">SubBytes amaliyoti</h3>
        <p className="mb-4">
          Holat matritsasidagi har bir byte S-box dagi mos qiymat bilan almashtiriladi.
          S-box — cipher ga no-chiziqlilik (non-linearity) beruvchi almashtirish jadvalidir.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {inputState.slice(0, 4).map((byte, index) => (
            <div key={index} className="border p-2 rounded">
              <div className="font-mono">
                Kiritilgan bayt: {formatByte(byte)}
              </div>
              <div className="font-mono">
                S-box orqali qidiruv: S[{formatByte(byte)}] = {formatByte(SBOX[byte])}
              </div>
              <div className="font-mono bg-gray-100 p-1 mt-1">
                Chiqish bayt: {formatByte(outputState[index])}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 italic">
          Eslatma: Aniqlik uchun faqat birinchi qator ko‘rsatilgan. Shu jarayon barcha 16 byte uchun ham qo‘llaniladi.
        </p>
      </div>
    );
  };

  const renderShiftRowsExplanation = () => {
    return (
      <div>
        <h3 className="font-bold mb-2">ShiftRows amaliyoti</h3>
        <p className="mb-4">
          Holat matritsasining qatorlari turli siljish miqdorlariga ko‘ra siklik tarzda chap tomonga siljitiladi:
          <ul className="list-disc pl-6 my-2">
            <li>Row 0: Siljitilmaydi</li>
            <li>Row 1: 1 ta pozitsiyaga chapga siljitilgan</li>
            <li>Row 2: 2 ta pozitsiyaga chapga siljitilgan</li>
            <li>Row 3: 3 ta pozitsiyaga chapga siljitilgan</li>
          </ul>
        </p>
        
        <div className="grid grid-cols-2 gap-8 mt-4">
          <div>
            <h4 className="font-semibold mb-2">ShiftRows dan oldin:</h4>
            <div className="font-mono">
              Row 0: {inputState.slice(0, 4).map(formatByte).join(' ')}
              <br />
              Row 1: {inputState.slice(4, 8).map(formatByte).join(' ')}
              <br />
              Row 2: {inputState.slice(8, 12).map(formatByte).join(' ')}
              <br />
              Row 3: {inputState.slice(12, 16).map(formatByte).join(' ')}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">ShiftRows dan keyin:</h4>
            <div className="font-mono">
              Row 0: {outputState.slice(0, 4).map(formatByte).join(' ')}
              <br />
              Row 1: {outputState.slice(4, 8).map(formatByte).join(' ')}
              <br />
              Row 2: {outputState.slice(8, 12).map(formatByte).join(' ')}
              <br />
              Row 3: {outputState.slice(12, 16).map(formatByte).join(' ')}
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="font-semibold">Transformatsiya:</p>
          <div className="font-mono mt-2">
            Row 1: [{inputState.slice(4, 8).map(formatByte).join(' ')}] → [{outputState.slice(4, 8).map(formatByte).join(' ')}]
            <br />
            Row 2: [{inputState.slice(8, 12).map(formatByte).join(' ')}] → [{outputState.slice(8, 12).map(formatByte).join(' ')}]
            <br />
            Row 3: [{inputState.slice(12, 16).map(formatByte).join(' ')}] → [{outputState.slice(12, 16).map(formatByte).join(' ')}]
          </div>
        </div>
      </div>
    );
  };

  const renderMixColumnsExplanation = () => {
    return (
      <div>
        <h3 className="font-bold mb-2">MixColumns amaliyoti</h3>
        <p className="mb-4">
          Holat matritsasining har bir ustuni GF(2^8) maydonidagi polinom sifatida qaraladi va
          doimiy polinom a(x) = {'{03}'} x^3 + {'{01}'} x^2 + {'{01}'} x + {'{02}'}. ga ko‘paytiriladi.
          Ushbu operatsiya cipher ichida diffuziya (ma’lumotning tarqalishini) ta’minlaydi.
        </p>
        
        <div className="grid grid-cols-2 gap-8 mt-4">
          <div>
            <h4 className="font-semibold mb-2">MixColumns dan oldin:</h4>
            <div className="font-mono">
              Col 0: {[inputState[0], inputState[4], inputState[8], inputState[12]].map(formatByte).join(' ')}
              <br />
              Col 1: {[inputState[1], inputState[5], inputState[9], inputState[13]].map(formatByte).join(' ')}
              <br />
              Col 2: {[inputState[2], inputState[6], inputState[10], inputState[14]].map(formatByte).join(' ')}
              <br />
              Col 3: {[inputState[3], inputState[7], inputState[11], inputState[15]].map(formatByte).join(' ')}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">MixColumns dan keyin:</h4>
            <div className="font-mono">
              Col 0: {[outputState[0], outputState[4], outputState[8], outputState[12]].map(formatByte).join(' ')}
              <br />
              Col 1: {[outputState[1], outputState[5], outputState[9], outputState[13]].map(formatByte).join(' ')}
              <br />
              Col 2: {[outputState[2], outputState[6], outputState[10], outputState[14]].map(formatByte).join(' ')}
              <br />
              Col 3: {[outputState[3], outputState[7], outputState[11], outputState[15]].map(formatByte).join(' ')}
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p className="font-semibold mb-2">Matritsalar ko‘paytmasi:</p>
          <p className="font-mono">
            Har bir [a, b, c, d] ustuni uchun transformatsiya quyidagicha bo‘ladi:
            <br />
            a' = (2 × a) ⊕ (3 × b) ⊕ c ⊕ d
            <br />
            b' = a ⊕ (2 × b) ⊕ (3 × c) ⊕ d
            <br />
            c' = a ⊕ b ⊕ (2 × c) ⊕ (3 × d)
            <br />
            d' = (3 × a) ⊕ b ⊕ c ⊕ (2 × d)
          </p>
          <p className="mt-2 text-sm">
            Eslatma: Ko‘paytirish GF(2^8) maydonida, x^8 + x^4 + x^3 + x + 1 qisqarmas polinom yordamida amalga oshiriladi.
          </p>
        </div>
      </div>
    );
  };

  const renderIVXORExplanation = () => {
    if (!roundKey) return null;
    
    return (
      <div>
        <h3 className="font-bold mb-2 text-blue-800">IV bilan XOR Operatsiyasi (CBC Rejimi)</h3>
        <p className="mb-4">
          <strong>CBC (Cipher Block Chaining)</strong> rejimida shifrlash boshlanishidan oldin, ochiq matnning birinchi bloki 
          <strong> IV (Initialization Vector)</strong> bilan XOR qilinadi. Bu operatsiya CBC rejimining asosiy xususiyatidir.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-4 border-2 border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">CBC Rejimi Qanday Ishlaydi:</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Birinchi blok: Plaintext[0] ⊕ IV → Shifrlash</li>
            <li>Ikkinchi blok: Plaintext[1] ⊕ Ciphertext[0] → Shifrlash</li>
            <li>Uchinchi blok: Plaintext[2] ⊕ Ciphertext[1] → Shifrlash</li>
            <li>Va hokazo...</li>
          </ul>
          <p className="mt-3 text-sm">
            Bu jarayon bir xil plaintext bloklarini turli ciphertext bloklarga aylantiradi, 
            chunki birinchi blokdan boshlab har bir blok avvalgi ciphertext blokiga bog'liq.
          </p>
        </div>
        
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-blue-100">
                <th className="border p-2">Pozitsiya</th>
                <th className="border p-2">Ochiq matn</th>
                <th className="border p-2">IV bayti</th>
                <th className="border p-2">XOR natijasi</th>
                <th className="border p-2">Binary amaliyoti</th>
              </tr>
            </thead>
            <tbody>
              {inputState.map((byte, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="border p-2 text-center font-semibold">({Math.floor(index / 4)}, {index % 4})</td>
                  <td className="border p-2 font-mono text-center bg-green-50">{formatByte(byte)}</td>
                  <td className="border p-2 font-mono text-center bg-blue-50">{formatByte(roundKey[index])}</td>
                  <td className="border p-2 font-mono text-center bg-yellow-50 font-bold">{formatByte(outputState[index])}</td>
                  <td className="border p-2 font-mono text-center text-xs">
                    <div className="space-y-1">
                      <div>{byte.toString(2).padStart(8, '0')}</div>
                      <div className="text-blue-600">⊕ {roundKey[index].toString(2).padStart(8, '0')}</div>
                      <div className="border-t pt-1 mt-1">= {outputState[index].toString(2).padStart(8, '0')}</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mb-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">XOR Operatsiyasi Qanday Ishlaydi:</p>
          <p className="text-sm text-yellow-900">
            XOR (Exclusive OR) operatsiyasi bit darajasida ishlaydi:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>0 ⊕ 0 = 0</strong></li>
              <li><strong>0 ⊕ 1 = 1</strong></li>
              <li><strong>1 ⊕ 0 = 1</strong></li>
              <li><strong>1 ⊕ 1 = 0</strong></li>
            </ul>
            Agar bitlar bir xil bo'lsa, natija 0, agar farq qilsa, natija 1 bo'ladi.
          </p>
        </div>
        
        <div className="mt-4 bg-green-50 border-2 border-green-200 p-3 rounded">
          <p className="text-sm font-semibold text-green-800 mb-1">Misollar:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {inputState.slice(0, 3).map((byte, idx) => (
              <div key={idx} className="bg-white p-2 rounded border border-green-300">
                <div className="font-mono text-xs">
                  <div>Plaintext: {formatByte(byte)}</div>
                  <div>IV: {formatByte(roundKey[idx])}</div>
                  <div className="border-t mt-1 pt-1 font-bold text-green-700">
                    Natija: {formatByte(outputState[idx])}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAddRoundKeyExplanation = () => {
    if (!roundKey) return null;
    
    return (
      <div>
        <h3 className="font-bold mb-2">AddRoundKey amaliyoti</h3>
        <p className="mb-4">
          Holat matritsasidagi har bir bayt round kalitdagi mos bayt bilan XOR amali orqali birlashtiriladi.
          Bu — bevosita key dan foydalaniladigan yagona bosqichdir.
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Pozitsiya</th>
                <th className="border p-2">Holat bayti</th>
                <th className="border p-2">Kalit bayti</th>
                <th className="border p-2">XOR natijasi</th>
                <th className="border p-2">Binary amaliyoti</th>
              </tr>
            </thead>
            <tbody>
              {inputState.slice(0, 8).map((byte, index) => (
                <tr key={index}>
                  <td className="border p-2 text-center">({Math.floor(index / 4)}, {index % 4})</td>
                  <td className="border p-2 font-mono text-center">{formatByte(byte)}</td>
                  <td className="border p-2 font-mono text-center">{formatByte(roundKey[index])}</td>
                  <td className="border p-2 font-mono text-center">{formatByte(outputState[index])}</td>
                  <td className="border p-2 font-mono text-center">
                    {byte.toString(2).padStart(8, '0')} ⊕ {roundKey[index].toString(2).padStart(8, '0')} = {outputState[index].toString(2).padStart(8, '0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <p className="mt-4 italic">
          Eslatma: Aniqlik uchun faqat dastlabki 8 bayt ko'rsatilgan. Shu jarayon barcha 16 bayt uchun ham qo'llaniladi.
        </p>
      </div>
    );
  };

  const renderExplanation = () => {
    switch (operationType) {
      case 'IVXOR':
        return renderIVXORExplanation();
      case 'SubBytes':
        return renderSubBytesExplanation();
      case 'ShiftRows':
        return renderShiftRowsExplanation();
      case 'MixColumns':
        return renderMixColumnsExplanation();
      case 'AddRoundKey':
        return renderAddRoundKeyExplanation();
      default:
        return (
          <div>
            <h3 className="font-bold mb-2">Amaliyot: {operationType}</h3>
            <p>Ushbu amaliyot uchun batafsil tushuntirish mavjud emas.</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      {renderExplanation()}
    </div>
  );
};

export default DetailedExplanation;