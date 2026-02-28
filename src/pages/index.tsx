import { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  keyToBytes, 
  generateRandomKey, 
  generateIV,
  bytesToHex, 
  getAesSteps,
  AesStep,
  AesMode,
  PaddingType,
  OutputFormat,
  KeyLength,
  realAesEncrypt,
  realAesDecrypt,
  testSpecificCase,
  SBOX
} from '@/utils/aes';
import MatrixVisualizer from '@/components/MatrixVisualizer';
import KeyGenerationVisualizer from '@/components/KeyGenerationVisualizer';
import EncryptionStepVisualizer from '@/components/EncryptionStepVisualizer';
import SBoxTable from '@/components/SBoxTable';

type KeyInputFormat = 'hex' | 'text';

export default function Home() {
  const [input, setInput] = useState('Salom, AES!');
  const [key, setKey] = useState('cc 0e c1 70 24 24 01 8d 4e fd 5e f3 8d 15 2f 63'); // Default to the test key
  const [keyInputFormat, setKeyInputFormat] = useState<KeyInputFormat>('hex');
  const [keyBytes, setKeyBytes] = useState<number[]>([]);
  const [steps, setSteps] = useState<AesStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showKeyExpansion, setShowKeyExpansion] = useState(false);
  const [keyGenerationStep, setKeyGenerationStep] = useState(0);
  const [showEncryptionSteps, setShowEncryptionSteps] = useState(false);
  const [encryptionStep, setEncryptionStep] = useState(0);
  const [showSBoxTable, setShowSBoxTable] = useState(false);
  const [aesMode, setAesMode] = useState<AesMode>(AesMode.ECB);
  const [paddingType, setPaddingType] = useState<PaddingType>(PaddingType.PKCS7);
  const [keyLength, setKeyLength] = useState<KeyLength>(KeyLength.AES_128);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(OutputFormat.BASE64);
  const [finalCiphertext, setFinalCiphertext] = useState<{
    base64: string;
    hex: string;
    binary: string;
  } | null>(null);
  const [iv, setIv] = useState<number[] | undefined>(undefined);
  const [realCiphertext, setRealCiphertext] = useState<{
    base64: string;
    hex: string;
    binary: string;
  } | null>(null);
  const [showFinalResult, setShowFinalResult] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>('');
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [decryptError, setDecryptError] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string>('');
  const [allBlocks, setAllBlocks] = useState<{ blockIndex: number, steps: AesStep[], finalState: number[] }[] | undefined>(undefined);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(0);

  // Initialize key on first render
  useEffect(() => {
    // Set the initial key bytes from the preset key
    try {
      const initialKeyBytes = keyToBytes(key);
      setKeyBytes(initialKeyBytes);
      
      // Run the test case to validate our implementation
      setTestResult(testSpecificCase());
    } catch (error) {
      console.error('Invalid initial key format');
    }
  }, []);

  // Handle random key generation
  const handleRandomKey = () => {
    const randomKeyBytes = generateRandomKey(keyLength);
    setKeyBytes(randomKeyBytes);
    setKey(bytesToHex(randomKeyBytes));
  };
  
  // Handle key length change
  const handleKeyLengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKeyLength = parseInt(e.target.value) as KeyLength;
    setKeyLength(newKeyLength);
    
    // Regenerate key with new length if requested
    if (window.confirm('Shu uzunlik bilan yangi kalit yaratishni xohlaysizmi?')) {
      const newKeyBytes = generateRandomKey(newKeyLength);
      setKeyBytes(newKeyBytes);
      setKey(bytesToHex(newKeyBytes));
    } else {
      updateKeyBytes(key, newKeyLength, keyInputFormat);
    }
  };
  
  // Handle output format change
  const handleOutputFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOutputFormat(e.target.value as OutputFormat);
  };

  // Handle custom key input
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setKey(newKey);
    updateKeyBytes(newKey, keyLength, keyInputFormat);
  };

  // Update key bytes based on current format
  const updateKeyBytes = (
    keyValue: string,
    targetKeyLength: KeyLength = keyLength,
    inputFormat: KeyInputFormat = keyInputFormat
  ) => {
    try {
      if (inputFormat === 'hex') {
        // If hex format, manually parse hex
        const cleanKey = keyValue.replace(/\s/g, '').toLowerCase();
        if (/^[0-9a-f]+$/.test(cleanKey) || cleanKey === '') {
          const requiredBytes = targetKeyLength / 8;
          const requiredHexLength = requiredBytes * 2;
          const bytes: number[] = [];
          for (let i = 0; i < Math.min(cleanKey.length, requiredHexLength); i += 2) {
            bytes.push(parseInt(cleanKey.substr(i, 2), 16));
          }
          while (bytes.length < requiredBytes) {
            bytes.push(0);
          }
          setKeyBytes(bytes.slice(0, requiredBytes));
        }
      } else {
        // If text format, convert text to bytes
        setKeyBytes(keyToBytes(keyValue, targetKeyLength));
      }
    } catch (error) {
      console.error('Invalid key format');
    }
  };

  // Handle key format change
  const handleKeyFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFormat = e.target.value as KeyInputFormat;
    setKeyInputFormat(newFormat);
    // Update key bytes with new format
    updateKeyBytes(key, keyLength, newFormat);
  };

  // Handle input text change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Encrypt using stable IV. New IV is generated only when forced or missing.
  const encryptWithStableIv = (
    mode: AesMode,
    padding: PaddingType,
    forceNewIv: boolean = false
  ) => {
    const ivToUse =
      mode === AesMode.ECB
        ? undefined
        : forceNewIv
          ? generateIV()
          : iv;

    const result = getAesSteps(input, keyBytes, mode, padding, ivToUse, keyLength);
    setIv(result.iv);
    return result;
  };

  const handleRandomIv = () => {
    if (aesMode === AesMode.ECB) return;

    const { steps: aesSteps, finalCiphertext, iv: newIv, allBlocks: newAllBlocks } = encryptWithStableIv(
      aesMode,
      paddingType,
      true
    );

    setSteps(aesSteps);
    setFinalCiphertext(finalCiphertext);
    setAllBlocks(newAllBlocks);
    setCurrentStep(0);
    setSelectedBlockIndex(0);

    const ivHex = newIv ? bytesToHex(newIv, '') : undefined;
    const keyHex = bytesToHex(keyBytes, '');
    const crypto = realAesEncrypt(input, keyHex, aesMode, paddingType, outputFormat, keyLength, ivHex);
    setRealCiphertext(crypto.formats);
  };

  // Handle AES mode change
  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as AesMode;
    setAesMode(newMode);
    setSteps([]); // Run mode change clears encryption steps
    setFinalCiphertext(null); // Clear output
    setIv(undefined); // Clear IV
    setShowEncryptionSteps(false);
    setShowKeyExpansion(false);
    setShowFinalResult(false);

    // Auto re-encrypt immediately with the newly selected mode
    try {
      const { steps: aesSteps, finalCiphertext, iv: newIv } = encryptWithStableIv(
        newMode,
        paddingType,
        newMode !== AesMode.ECB
      );
      setSteps(aesSteps);
      setFinalCiphertext(finalCiphertext);
      setCurrentStep(0);

      const ivHex = newIv ? bytesToHex(newIv, '') : undefined;
      const keyHex = bytesToHex(keyBytes, '');
      const result = realAesEncrypt(input, keyHex, newMode, paddingType, outputFormat, keyLength, ivHex);
      setRealCiphertext(result.formats);

      if (input === 'Hello, AES!' && keyHex === 'cc 0e c1 70 24 24 01 8d 4e fd 5e f3 8d 15 2f 63' && newMode === AesMode.ECB) {
        setTestResult(testSpecificCase());
      }
    } catch (err) {
      // no-op: keep UI cleared if something goes wrong
    }
  };

  // Handle padding type change
  const handlePaddingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPadding = e.target.value as PaddingType;
    setPaddingType(newPadding);
    
    // Clear previous results
    setSteps([]);
    setFinalCiphertext(null);
    setRealCiphertext(null);
    setAllBlocks(undefined);
    setShowFinalResult(false);
    setShowEncryptionSteps(false);
    
    // Auto re-encrypt immediately with the newly selected padding
    try {
      const { steps: aesSteps, finalCiphertext, iv: newIv, allBlocks: newAllBlocks } = encryptWithStableIv(
        aesMode,
        newPadding
      );
      setSteps(aesSteps);
      setFinalCiphertext(finalCiphertext);
      setAllBlocks(newAllBlocks);
      setCurrentStep(0);
      setSelectedBlockIndex(0);
      
      // If we have multiple blocks, switch to selected block's steps
      if (newAllBlocks && newAllBlocks.length > 1) {
        setSteps(newAllBlocks[0].steps);
      }
      
      const ivHex = newIv ? bytesToHex(newIv, '') : undefined;
      const keyHex = bytesToHex(keyBytes, '');
      const result = realAesEncrypt(input, keyHex, aesMode, newPadding, outputFormat, keyLength, ivHex);
      setRealCiphertext(result.formats);
    } catch (err) {
      console.error('Padding change encryption error:', err);
    }
  };

  // Start AES encryption visualization
  const handleEncrypt = () => {
    setShowKeyExpansion(false);
    setShowFinalResult(false);
    setShowEncryptionSteps(false);
    setShowSBoxTable(false);
    
    const { steps: aesSteps, finalCiphertext, iv: newIv } = encryptWithStableIv(aesMode, paddingType);
    setSteps(aesSteps);
    setFinalCiphertext(finalCiphertext);
    setCurrentStep(0);
    
    // Also generate the real ciphertext using CryptoJS for verification
    const ivHex = newIv ? bytesToHex(newIv, '') : undefined;
    const keyHex = bytesToHex(keyBytes, '');
    const result = realAesEncrypt(input, keyHex, aesMode, paddingType, outputFormat, keyLength, ivHex);
    setRealCiphertext(result.formats);
    
    // Run test case with the specific test input
    if (input === 'Hello, AES!' && keyHex === 'cc 0e c1 70 24 24 01 8d 4e fd 5e f3 8d 15 2f 63' && aesMode === AesMode.ECB) {
      setTestResult(testSpecificCase());
    }
  };

  // Show key expansion visualization
  const handleShowKeyExpansion = () => {
    setShowKeyExpansion(true);
    setShowFinalResult(false);
    setShowEncryptionSteps(false);
    setKeyGenerationStep(0);
  };

  // Show encryption steps visualization
  const handleShowEncryptionSteps = () => {
    setShowEncryptionSteps(true);
    setShowKeyExpansion(false);
    setShowFinalResult(false);
    setShowSBoxTable(false);
    setEncryptionStep(0);
    
    // Always re-encrypt with current input to ensure latest data is used
    const { steps: aesSteps, finalCiphertext, iv: newIv, allBlocks: newAllBlocks } = encryptWithStableIv(
      aesMode,
      paddingType
    );
    setSteps(aesSteps);
    setFinalCiphertext(finalCiphertext);
    setAllBlocks(newAllBlocks);
    
    // If we have multiple blocks, switch to selected block's steps
    if (newAllBlocks && newAllBlocks.length > 1) {
      setSteps(newAllBlocks[0].steps);
      setSelectedBlockIndex(0);
    } else {
      setSelectedBlockIndex(0);
    }
    
    // Also generate the real ciphertext using CryptoJS for verification
    const ivHex = newIv ? bytesToHex(newIv, '') : undefined;
    const keyHex = bytesToHex(keyBytes, '');
    const result = realAesEncrypt(input, keyHex, aesMode, paddingType, outputFormat, keyLength, ivHex);
    setRealCiphertext(result.formats);
  };

  // Show S-box table
  const handleShowSBoxTable = () => {
    setShowSBoxTable(true);
    setShowKeyExpansion(false);
    setShowEncryptionSteps(false);
    setShowFinalResult(false);
  };
  
  // Copy to clipboard function
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle decryption
  const handleDecrypt = () => {
    if (!realCiphertext) {
      setDecryptError('Avval shifrlangan matn kerak');
      return;
    }
    
    const ivHex = iv ? bytesToHex(iv, '') : undefined;
    const keyHex = bytesToHex(keyBytes, '');
    const ciphertext = realCiphertext[outputFormat.toLowerCase() as 'base64' | 'hex' | 'binary'];
    
    const result = realAesDecrypt(
      ciphertext,
      keyHex,
      aesMode,
      paddingType,
      outputFormat,
      keyLength,
      ivHex
    );
    
    if (result.error) {
      setDecryptError(result.error);
      setDecryptedText('');
    } else {
      setDecryptedText(result.plaintext);
      setDecryptError('');
    }
  };

  // Show final encryption result
  const handleShowFinalResult = () => {
    setShowFinalResult(true);
    setShowKeyExpansion(false);
    setShowEncryptionSteps(false);
    setShowSBoxTable(false);
    setDecryptedText('');
    setDecryptError('');
    
    // Final natija paneli etalon (CryptoJS) natijasi orqali hisoblanadi.
    let ivToUse = iv;
    if ((aesMode === AesMode.CBC || aesMode === AesMode.CTR) && !ivToUse) {
      ivToUse = generateIV();
      setIv(ivToUse);
    }

    const ivHex = ivToUse ? bytesToHex(ivToUse, '') : undefined;
    const keyHex = bytesToHex(keyBytes, '');
    const result = realAesEncrypt(input, keyHex, aesMode, paddingType, outputFormat, keyLength, ivHex);
    setRealCiphertext(result.formats);
    setFinalCiphertext(result.formats);
    setSelectedBlockIndex(0);
  };

  // Move to next step in the encryption process
  const nextStep = () => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
    }
  };

  // Move to previous step in the encryption process
  const prevStep = () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
    }
  };

  // Format a byte as hex string
  const formatByte = (byte: number) => {
    return byte.toString(16).padStart(2, '0');
  };

  // Reset to the beginning of the visualization
  const resetVisualization = () => {
    setCurrentStep(0);
    setKeyGenerationStep(0);
    setEncryptionStep(0);
  };

  // Get operation type from step description
  const getOperationType = (description: string): 'IVXOR' | 'SubBytes' | 'ShiftRows' | 'MixColumns' | 'AddRoundKey' | '' => {
    if (description.includes('IV bilan XOR')) return 'IVXOR';
    if (description.includes('SubBytes')) return 'SubBytes';
    if (description.includes('ShiftRows')) return 'ShiftRows';
    if (description.includes('MixColumns')) return 'MixColumns';
    if (description.includes('AddRoundKey')) return 'AddRoundKey';
    return '';
  };

  // Render 3 matrices side by side for MixColumns operation
  const renderMixColumnsMatrices = (step: AesStep) => {
    if (!step.previousState) return null;

    const formatByte = (byte: number) => {
      return byte.toString(16).padStart(2, '0').toUpperCase();
    };

    return (
      <div className="flex flex-col items-center">
        <h3 className="font-bold mb-4 text-xl">{step.description}</h3>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* 1. Input (ShiftRows dan keyin) */}
          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-green-700">1. MixColumns ga kiruvchi qiymatlar</h5>
            <MatrixVisualizer 
              matrix={step.previousState}
              activeIndices={[]}
            />
          </div>
          
          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="text-4xl font-bold text-blue-600 mx-4">→</div>
          </div>
          
          {/* 2. Transformation matrix (constant) */}
          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-blue-700">2. O'zgarmas jadval</h5>
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
              <div className="text-sm font-semibold text-blue-800 mb-2 text-center">MixColumns jadvali (O'zgarmas)</div>
              <div className="space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">Matrix shakli:</div>
                <div className="text-xs font-mono bg-white p-2 rounded border border-blue-200">
                  <div>02 03 01 01</div>
                  <div>01 02 03 01</div>
                  <div>01 01 02 03</div>
                  <div>03 01 01 02</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="text-4xl font-bold text-blue-600 mx-4">=</div>
          </div>
          
          {/* 3. Output (after MixColumns) */}
          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-purple-700">3. MixColumns dan chiqgan qiymatlar</h5>
            <MatrixVisualizer 
              matrix={step.state}
              activeIndices={Array.from(Array(16).keys())}
            />
          </div>
        </div>
        
        {/* Additional explanation */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-4xl">
          <p className="text-sm text-gray-700">
            <strong>Izoh:</strong> Har bir ustun Galois maydoni ustida ko'paytma amaliyotlari orqali o'zgartiriladi.
            Bu diffuziya (ma'lumotlarning tarqalishi) ni ta'minlaydi.
          </p>
        </div>
      </div>
    );
  };

  // Render 3 matrices side by side for IV XOR operation
  const renderIVXORMatrices = (step: AesStep) => {
    if (!step.previousState || !step.roundKey) return null;

    const formatByte = (byte: number) => {
      return byte.toString(16).padStart(2, '0').toUpperCase();
    };

    return (
      <div className="flex flex-col items-center">
        <h3 className="font-bold mb-4 text-xl">{step.description}</h3>
        <div className="flex items-stretch justify-center gap-4 flex-wrap">
          {/* 1. Boshlang'ich holat */}
          <div className="flex flex-col items-center">
            <h5 className="font-semibold mb-2 text-green-700">1. Boshlang'ich holat</h5>
            <MatrixVisualizer 
              matrix={step.previousState}
              activeIndices={[]}
              showRowLabels={false}
              showColumnLabels={false}
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
              showRowLabels={false}
              showColumnLabels={false}
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
              showRowLabels={false}
              showColumnLabels={false}
            />
          </div>
        </div>
        
        {/* Additional explanation */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-4xl">
          <p className="text-sm text-gray-700">
            <strong>Izoh:</strong> Har bir pozitsiyadagi byte lar ketma-ket XOR qilinadi. 
            Masalan, (0,0) pozitsiyasida: <span className="font-mono font-bold">
              0x{formatByte(step.previousState[0])} ⊕ 0x{formatByte(step.roundKey[0])} = 0x{formatByte(step.state[0])}
            </span>
          </p>
        </div>
      </div>
    );
  };

  // Render the state matrix (4x4)
  const renderStateMatrix = () => {
    if (steps.length === 0) return null;
    
    const step = steps[currentStep];
    const activeIndices = step.activeIndices || [];
    
    // Check if this is IV XOR operation
    if (getOperationType(step.description) === 'IVXOR') {
      return renderIVXORMatrices(step);
    }
    
    // Check if this is MixColumns operation
    if (getOperationType(step.description) === 'MixColumns') {
      return renderMixColumnsMatrices(step);
    }
    
    return (
      <div className="flex flex-col items-center">
        <h3 className="font-bold mb-2">{step.description}</h3>
        <MatrixVisualizer 
          matrix={step.state}
          activeIndices={activeIndices}
          operationType={getOperationType(step.description) || undefined}
        />
      </div>
    );
  };

  // Render the final encryption result
  const renderFinalResult = () => {
    if (!realCiphertext) return null;
    
    return (
      <div className="flex flex-col items-center w-full">
        <div className="bg-gradient-to-br from-white via-purple-50 to-white p-6 md:p-8 rounded-xl shadow-xl border-2 border-purple-300 w-full max-w-4xl">
          {/* Asl matn */}
          <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-300 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📝</span>
              <h4 className="font-bold text-lg text-blue-900">Asl matn:</h4>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
              <div className="font-mono text-gray-800 break-all">{input}</div>
            </div>
          </div>
          
          {/* Shifrlash kaliti */}
          <div className="mb-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔑</span>
              <h4 className="font-bold text-lg text-green-900">Shifrlash kaliti:</h4>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-green-200 shadow-sm">
              <div className="font-mono flex items-center justify-between gap-3 flex-wrap">
                <span className="break-all text-gray-800 font-semibold">Hex: {bytesToHex(keyBytes, '')}</span>
                <button
                  onClick={() => copyToClipboard(bytesToHex(keyBytes, ''), 'key')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm flex-shrink-0 transition-all transform hover:scale-105 ${
                    copySuccess === 'key' 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-md'
                  }`}
                  title="Nusxalash"
                >
                  {copySuccess === 'key' ? '✓ Nusxalandi!' : '📋 Nusxalash'}
                </button>
              </div>
              <div className="text-sm text-gray-600 mt-2 font-semibold">Kalit uzunligi: <span className="text-green-700 font-bold">{keyLength} bit ({keyLength/8} bayt)</span></div>
            </div>
          </div>
          
          {iv && (
            <div className="mb-6 p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-300 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🔢</span>
                <h4 className="font-bold text-lg text-orange-900">
                  {aesMode === AesMode.CBC ? 'Initialization Vector (IV)' : 'Counter (Nonce)'}:
                </h4>
              </div>
              <div className="p-4 bg-white rounded-lg border-2 border-orange-200 shadow-sm font-mono flex items-center justify-between gap-3 flex-wrap">
                <span className="break-all text-gray-800 font-semibold">{bytesToHex(iv)}</span>
                <button
                  onClick={() => copyToClipboard(bytesToHex(iv, ''), 'iv')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm flex-shrink-0 transition-all transform hover:scale-105 ${
                    copySuccess === 'iv' 
                      ? 'bg-orange-500 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-md'
                  }`}
                  title="Nusxalash"
                >
                  {copySuccess === 'iv' ? '✓ Nusxalandi!' : '📋 Nusxalash'}
                </button>
              </div>
            </div>
          )}
          
          {/* Settings */}
          <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-300 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚙️</span>
              <h4 className="font-bold text-lg text-purple-900">Sozlamalar:</h4>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-purple-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="text-xs text-gray-600 mb-1">Rejim:</div>
                  <div className="font-bold text-blue-700">{aesMode}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="text-xs text-gray-600 mb-1">To'ldirish:</div>
                  <div className="font-bold text-green-700">{paddingType}</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <div className="text-xs text-gray-600 mb-1">Chiqish formati:</div>
                  <div className="font-bold text-purple-700">{outputFormat}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Yakuniy shifrlangan matn */}
          <div className="mb-6 p-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-300 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🔒</span>
              <h4 className="font-bold text-lg text-indigo-900">Yakuniy shifrlangan matn:</h4>
            </div>
            <div className="bg-white rounded-lg border-2 border-indigo-200 shadow-sm overflow-hidden">
              {/* Base64 */}
              <div className="p-4 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-block w-20 font-bold text-blue-700 text-sm">Base64:</span>
                  </div>
                  <div className="font-mono break-all text-sm text-gray-800 bg-white p-3 rounded border border-blue-200">{realCiphertext.base64}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(realCiphertext.base64, 'base64')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm flex-shrink-0 transition-all transform hover:scale-105 ${
                    copySuccess === 'base64' 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-md'
                  }`}
                  title="Nusxalash"
                >
                  {copySuccess === 'base64' ? '✓ Nusxalandi!' : '📋 Nusxalash'}
                </button>
              </div>
              
              {/* Hex */}
              <div className="p-4 border-b-2 border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-block w-20 font-bold text-green-700 text-sm">Hex:</span>
                  </div>
                  <div className="font-mono break-all text-sm text-gray-800 bg-white p-3 rounded border border-green-200">{realCiphertext.hex}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(realCiphertext.hex, 'hex')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm flex-shrink-0 transition-all transform hover:scale-105 ${
                    copySuccess === 'hex' 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-md'
                  }`}
                  title="Nusxalash"
                >
                  {copySuccess === 'hex' ? '✓ Nusxalandi!' : '📋 Nusxalash'}
                </button>
              </div>
              
              {/* Binary */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-block w-20 font-bold text-purple-700 text-sm">Binary:</span>
                  </div>
                  <div className="font-mono break-all text-xs text-gray-800 bg-white p-3 rounded border border-purple-200 max-h-24 overflow-y-auto">
                    {realCiphertext.binary.length > 200 ? realCiphertext.binary.substring(0, 200) + '...' : realCiphertext.binary}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(realCiphertext.binary, 'binary')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm flex-shrink-0 transition-all transform hover:scale-105 ${
                    copySuccess === 'binary' 
                      ? 'bg-purple-500 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-md'
                  }`}
                  title="Nusxalash"
                >
                  {copySuccess === 'binary' ? '✓ Nusxalandi!' : '📋 Nusxalash'}
                </button>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-700 font-semibold">
                💡 Bu to'liq shifrlangan matn - barcha bloklar va to'ldirish bilan.
              </p>
            </div>
            
            {/* Deshifrlash button */}
            <div className="mt-4">
              <button
                onClick={handleDecrypt}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 font-bold text-lg shadow-lg transition-all transform hover:scale-105"
              >
                🔓 Deshifrlash
              </button>
            </div>
            {decryptedText && (
              <div className="mt-4 p-5 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border-l-4 border-green-500 shadow-md">
                <h5 className="font-bold text-lg mb-3 text-green-900 flex items-center gap-2">
                  <span>✅</span>
                  <span>Deshifrlangan matn:</span>
                </h5>
                <div className="p-4 bg-white rounded-lg border-2 border-green-200 shadow-sm font-mono break-all text-gray-800 mb-3">{decryptedText}</div>
                <button
                  onClick={() => copyToClipboard(decryptedText, 'decrypted')}
                  className={`w-full px-4 py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-105 ${
                    copySuccess === 'decrypted' 
                      ? 'bg-green-600 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-md'
                  }`}
                >
                  {copySuccess === 'decrypted' ? '✓ Nusxalandi!' : '📋 Nusxalash'}
                </button>
              </div>
            )}
            {decryptError && (
              <div className="mt-4 p-5 bg-gradient-to-r from-red-100 to-pink-100 rounded-xl border-l-4 border-red-500 shadow-md">
                <p className="text-red-900 font-bold text-lg flex items-center gap-2">
                  <span>❌</span>
                  <span>Xatolik: {decryptError}</span>
                </p>
              </div>
            )}
          </div>
          

          
          {input === 'Salom, AES!' && bytesToHex(keyBytes, '') === 'cc 0e c1 70 24 24 01 8d 4e fd 5e f3 8d 15 2f 63' && aesMode === AesMode.ECB && (
            <div className="mt-4 p-5 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border-l-4 border-yellow-500 shadow-md">
              <h4 className="font-bold text-lg mb-3 text-yellow-900 flex items-center gap-2">
                <span>🧪</span>
                <span>Test holatini tasdiqlash:</span>
              </h4>
              <pre className="text-xs font-mono whitespace-pre-wrap bg-white p-4 rounded-lg border-2 border-yellow-200 shadow-sm">{testResult}</pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>AES shifrlash vizualizatsiyasi</title>
        <meta name="description" content="AES shifrlash jarayoni va bosqichlarini interaktiv vizual korinishda organish dasturi" />
      </Head>
      <div className="container mx-auto p-6 max-w-7xl">
        <h1 className="text-4xl font-extrabold mb-3 gradient-text">AES shifrlash vizualizatsiyasi</h1>
        <p className="text-slate-600 mb-8 text-lg">Kuchli va chiroyli kriptografiya algoritmi vizualizatsiyasi</p>
      
      {/* Input and Key Section */}
      <div className="modern-card p-8 mb-8">
        <div className="mb-6">
          <label className="block mb-2 font-semibold text-slate-700">Kiritilayotgan matn:</label>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            className="modern-input"
            placeholder="Matn kiriting..."
          />
          <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">ℹ</span>
            Matn baytga aylantiriladi va tanlangan to'ldirish rejimiga muvofiq to'ldiriladi.
          </p>
        </div>
        
        <div className="mb-6">
          <label className="block mb-2 font-semibold text-slate-700 flex items-center gap-2">
            <span>🔑</span>
            <span>Kalit:</span>
          </label>
          <div className="flex gap-3 mb-2">
            <select
              value={keyInputFormat}
              onChange={handleKeyFormatChange}
              className="modern-select w-32"
            >
              <option value="hex">📝 Hex</option>
              <option value="text">📄 Matn</option>
            </select>
            <input
              type="text"
              value={key}
              onChange={handleKeyChange}
              className="modern-input flex-grow"
              placeholder={keyInputFormat === 'hex' ? "Kalit kiriting (hex)...masalan: cc 0e c1 70 24 24 01 8d 4e fd 5e f3 8d 15 2f 63" : "Kalit kiriting (matn)...masalan: mysecretkey"}
            />
            <button 
              onClick={handleRandomKey}
              className="modern-button modern-button-info whitespace-nowrap"
            >
              🎲 Random
            </button>
          </div>
          <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">ℹ</span>
            {keyInputFormat === 'hex' 
              ? `Kalit ${keyLength / 8} bayt hex formatida (${keyLength / 4} hex raqam).`
              : `Kalit matn sifatida kiriting va ${keyLength / 8} bayt ga to'ldiriladi yoki qisqartiriladi.`}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block mb-2 font-semibold text-slate-700">Shifrlash rejimi:</label>
            <select
              value={aesMode}
              onChange={handleModeChange}
              className="modern-select"
            >
              <option value={AesMode.ECB}>🔓 ECB (Electronic Codebook)</option>
              <option value={AesMode.CBC}>🔗 CBC (Cipher Block Chaining)</option>
              <option value={AesMode.CTR}>⚡ CTR (Counter)</option>
            </select>
            <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">ℹ</span>
              {aesMode === AesMode.ECB && 'Asosiy rejim, har bir blok mustaqil shifrlanadi (xavfsizlik uchun tavsiya etilmaydi).'}
              {aesMode === AesMode.CBC && 'Bloklarni yaxshiroq xavfsizlik uchun IV yordamida zanjirlab shifrlaydi.'}
              {aesMode === AesMode.CTR && "Ochiq matn o'rniga counter ni shifrlaydi, bu parallel ishlashni yaxshilaydi."}
            </p>
          </div>
          
          <div>
            <label className="block mb-2 font-semibold text-slate-700">To'ldirish:</label>
            <select
              value={paddingType}
              onChange={handlePaddingChange}
              className="modern-select"
            >
              <option value={PaddingType.PKCS7}>📦 PKCS#7 (Default)</option>
              <option value={PaddingType.ANSI_X923}>📋 ANSI X.923</option>
              <option value={PaddingType.NONE}>❌ None (No Padding)</option>
            </select>
            <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">ℹ</span>
              {paddingType === PaddingType.PKCS7 && "To'ldirish uzunligi qiymati bilan to'ldiradi."}
              {paddingType === PaddingType.ANSI_X923 && "Nollar bilan to'ldiriladi, oxirgi bayt esa to'ldirish uzunligini bildiradi."}
              {paddingType === PaddingType.NONE && "To'ldirishsiz (kiritiladigan ma'lumot aniq 16 bayt bo'lishi kerak)."}
            </p>
          </div>
        </div>
        
        {/* IV Display Section for CBC/CTR modes */}
        {(aesMode === AesMode.CBC || aesMode === AesMode.CTR) && (
          <div className="mb-4">
            {iv && iv.length > 0 ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <label className="font-bold text-blue-800 text-xl flex items-center gap-2">
                    <span className="text-2xl"></span>
                    Tanlangan IV (Initialization Vector)
                  </label>
                  <button
                    onClick={handleRandomIv}
                    className="modern-button modern-button-info whitespace-nowrap"
                  >
                    🎲 Random IV
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow-md">
                      <div className="text-sm font-semibold text-gray-700 mb-2">📝 Hex formatida:</div>
                      <div className="text-sm font-mono bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200 break-all">
                        <span className="font-bold text-blue-700">{bytesToHex(iv, ' ')}</span>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md">
                      <div className="text-sm font-semibold text-gray-700 mb-2">🔢 Matritsa ko'rinishida:</div>
                      <div className="flex justify-center">
                        <MatrixVisualizer matrix={iv} isKey={false} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-100 p-4 rounded-xl shadow-sm">
                    <p className="text-sm text-blue-800">
                      <strong className="flex items-center gap-2">
                        <span>ℹ️</span>
                        <span>{aesMode === AesMode.CBC ? 'CBC rejimi' : 'CTR rejimi'}</span>
                      </strong>
                      <br />
                      {aesMode === AesMode.CBC 
                        ? 'IV qiymati o‘zgarmas bo‘lib turadi. Faqat "Random IV" tugmasi bosilganda yangilanadi.'
                        : 'Counter (nonce) qiymati o‘zgarmas bo‘lib turadi. Faqat "Random IV" tugmasi bosilganda yangilanadi.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 p-4 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="font-bold text-yellow-800 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    IV (Initialization Vector)
                  </label>
                  <button
                    onClick={handleRandomIv}
                    className="modern-button modern-button-info whitespace-nowrap"
                  >
                    🎲 Random IV
                  </button>
                </div>
                <p className="text-sm text-yellow-700">
                  {aesMode === AesMode.CBC 
                    ? 'Random IV tugmasi yoki birinchi shifrlashda IV yaratiladi.'
                    : 'Random IV tugmasi yoki birinchi shifrlashda counter (nonce) yaratiladi.'}
                </p>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block mb-2 font-semibold text-slate-700">Kalit uzunligi:</label>
            <select
              value={keyLength}
              onChange={handleKeyLengthChange}
              className="modern-select"
            >
              <option value={KeyLength.AES_128}>🔐 AES-128 (16 bytes)</option>
              <option value={KeyLength.AES_192}>🔒 AES-192 (24 bytes)</option>
              <option value={KeyLength.AES_256}>🛡️ AES-256 (32 bytes)</option>
            </select>
            <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">ℹ</span>
              {keyLength === KeyLength.AES_128 && 'Standart 128-bit kalit uzunligi.'}
              {keyLength === KeyLength.AES_192 && 'Yuqoriroq xavfsizlik uchun kengaytirilgan 192-bit kalit uzunligi.'}
              {keyLength === KeyLength.AES_256 && 'Eng yuqori xavfsizlik uchun maksimal 256-bit kalit uzunligi.'}
            </p>
          </div>
          
          <div>
            <label className="block mb-2 font-semibold text-slate-700">Chiqish formati:</label>
            <select
              value={outputFormat}
              onChange={handleOutputFormatChange}
              className="modern-select"
            >
              <option value={OutputFormat.BASE64}>📝 Base64</option>
              <option value={OutputFormat.HEX}>🔢 Hexadecimal</option>
              <option value={OutputFormat.BINARY}>⚙️ Binary</option>
            </select>
            <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">ℹ</span>
              {outputFormat === OutputFormat.BASE64 && 'Veb-ilovalar uchun standart Base64 kodlash.'}
              {outputFormat === OutputFormat.HEX && "Inson uchun o'qilishi oson bo'lgan o'n oltilik (hexadecimal) ko'rinish."}
              {outputFormat === OutputFormat.BINARY && "O'quv maqsadlarida ishlatiladigan raw binary format."}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleShowKeyExpansion}
            className="modern-button modern-button-secondary"
          >
            🔑 Kalit generatsiyasi
          </button>
          <button 
            onClick={handleShowEncryptionSteps}
            className="modern-button modern-button-success"
          >
            🔐 Shifrlash
          </button>
          <button 
            onClick={handleShowSBoxTable}
            className="modern-button bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
          >
            📊 S-box jadvali
          </button>
          {(realCiphertext || finalCiphertext) && (
            <button 
              onClick={handleShowFinalResult}
              className="modern-button modern-button-primary"
            >
              ✨ Natijani ko'rsat
            </button>
          )}
        </div>
      </div>
      
      {/* Visualization Section */}
      <div className="modern-card p-8 mb-8">
        <h2 className="text-3xl font-extrabold mb-6 text-slate-800">
          {showFinalResult 
            ? '✨ Yakuniy shifrlash natijasi' 
            : showSBoxTable
              ? '📊 AES S-box Jadvali'
              : showEncryptionSteps
                ? '🔐 Shifrlash jarayoni'
                : showKeyExpansion 
                  ? '🔑 Kalit generatsiyasi' 
                  : '🎯 Shifrlash jarayoni vizualizatsiyasi'
          }
        </h2>
        
        {/* Step Navigation with Block Selection */}
        {!showFinalResult && !showKeyExpansion && !showEncryptionSteps && !showSBoxTable && steps.length > 0 && (
          <div className="mb-6 w-full">
            {/* Block Selection - Inline with navigation */}
            {allBlocks && allBlocks.length > 1 && (
              <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-300 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-blue-900">Blok:</span>
                <div className="flex flex-wrap gap-1">
                  {allBlocks.map((block, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (block.steps && block.steps.length > 0) {
                          setSelectedBlockIndex(index);
                          setSteps(block.steps);
                          setCurrentStep(0);
                        }
                      }}
                      className={`px-2 py-0.5 text-xs rounded font-semibold transition-all ${
                        selectedBlockIndex === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Navigation buttons */}
            <div className="flex items-center justify-between w-full">
              <button 
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all ${
                  currentStep === 0 
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                    : 'modern-button-primary'
                }`}
              >
                ⬅️ Oldingi qadam
              </button>
              
              <div className="text-center flex-1 px-4">
                <div className="text-xl font-extrabold text-slate-800 mb-1">
                  {allBlocks && allBlocks.length > 1 
                    ? `Blok ${selectedBlockIndex + 1}: ${steps[currentStep]?.description || `Qadam ${currentStep + 1}`}`
                    : steps[currentStep]?.description || `Qadam ${currentStep + 1}`}
                </div>
                <div className="text-sm text-slate-600 font-semibold">
                  Qadam {currentStep + 1} / {steps.length}
                  {allBlocks && allBlocks.length > 1 && selectedBlockIndex < allBlocks.length && (
                    <span className="ml-2 text-blue-600">(Blok {selectedBlockIndex + 1}/{allBlocks.length})</span>
                  )}
                </div>
              </div>
              
              <button 
                onClick={nextStep}
                disabled={currentStep === steps.length - 1}
                className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all ${
                  currentStep === steps.length - 1 
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                    : 'modern-button-primary'
                }`}
              >
                Keyingi qadam ➡️
              </button>
            </div>
          </div>
        )}
        
        <div className="flex justify-center mb-6">
          {showFinalResult 
            ? renderFinalResult()
            : showSBoxTable
              ? <SBoxTable />
              : showEncryptionSteps
                ? (
                    <div className="w-full">
                      {/* Block Selection for Encryption Steps - Compact inline */}
                      {allBlocks && allBlocks.length > 1 && (
                        <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-300 flex items-center justify-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-blue-900">Blok:</span>
                          <div className="flex flex-wrap gap-1">
                            {allBlocks.map((block, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  if (block.steps && block.steps.length > 0) {
                                    setSelectedBlockIndex(index);
                                    setSteps(block.steps);
                                    setEncryptionStep(0);
                                  }
                                }}
                                className={`px-2 py-0.5 text-xs rounded font-semibold transition-all ${
                                  selectedBlockIndex === index
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-100'
                                }`}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <EncryptionStepVisualizer 
                        steps={steps}
                        currentStep={encryptionStep}
                        onStepChange={setEncryptionStep}
                      />
                    </div>
                  )
                : showKeyExpansion 
                  ? <KeyGenerationVisualizer
                      initialKey={keyBytes}
                      currentStep={keyGenerationStep}
                      onStepChange={setKeyGenerationStep}
                    />
                  : renderStateMatrix()
          }
        </div>
      </div>
      
      {/* Explanation Section */}
      <div className="modern-card p-8">
        <h2 className="text-3xl font-extrabold mb-6 text-slate-800">📚 AES jarayoni tushuntirishi</h2>
        
        {showSBoxTable ? (
          <div>
            <h3 className="font-bold mb-2">AES S-box jadvali</h3>
            <p className="mb-4">
              S-box (Substitution box) AES algoritmidagi eng muhim komponentlardan biridir. 
              Bu 16×16 matritsa bo'lib, har bir 8-bitli input uchun 8-bitli output beradi.
            </p>
            
            <div className="bg-gray-100 p-4 rounded">
              <h4 className="font-semibold mb-2">S-box xususiyatlari:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>No-chiziqlilik:</strong> S-box AES dagi yagona no-chiziqli transformatsiya</li>
                <li><strong>Chalkashlik:</strong> Kirish va chiqish o'rtasida murakkab bog'liqlik yaratadi</li>
                <li><strong>Xavfsizlik:</strong> Kriptografik hujumlarga qarshi himoya beradi</li>
                <li><strong>Deterministik:</strong> Har bir kirish uchun doim bir xil chiqish</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded mt-4">
              <h4 className="font-semibold mb-2">Qidirish usuli:</h4>
              <p className="text-sm mb-2">
                Agar kirish bayt AB bo'lsa:
              </p>
              <ul className="list-disc pl-6 text-sm">
                <li>Row = A (yuqori 4 bit) = 10₁₀</li>
                <li>Col = B (quyi 4 bit) = 11₁₀</li>
                <li>S-box[10][11] = {formatByte(SBOX[0xAB])}</li>
              </ul>
            </div>
          </div>
        ) : showEncryptionSteps ? (
          <div>
            <h3 className="font-bold mb-2">AES shifrlash jarayoni</h3>
            <p className="mb-4">
              AES shifrlash jarayoni 4 ta asosiy operatsiyadan iborat: SubBytes, ShiftRows, MixColumns va AddRoundKey.
              Har bir raundda bu operatsiyalar ketma-ket bajariladi va oxirgi raundda MixColumns qo'shilmaydi.
            </p>
            
            <div className="bg-gray-100 p-4 rounded">
              <h4 className="font-semibold mb-2">Shifrlash bosqichlari:</h4>
              <ol className="list-decimal pl-6 mb-4">
                <li><strong>Boshlang'ich AddRoundKey:</strong> Ochiq matnni birinchi raund kalit bilan XOR qilish</li>
                <li><strong>Asosiy raundlar (1-9):</strong>
                  <ul className="list-disc pl-6 mt-1">
                    <li><strong>SubBytes:</strong> Har bir baytni S-box yordamida almashtirish</li>
                    <li><strong>ShiftRows:</strong> Qatorlarni chapga siljitish</li>
                    <li><strong>MixColumns:</strong> Ustunlarni Galois maydonida o'zgartirish</li>
                    <li><strong>AddRoundKey:</strong> Raund kalit bilan XOR qilish</li>
                  </ul>
                </li>
                <li><strong>Oxirgi round (10):</strong>
                  <ul className="list-disc pl-6 mt-1">
                    <li><strong>SubBytes:</strong> S-box almashtirish</li>
                    <li><strong>ShiftRows:</strong> Qatorlarni siljitish</li>
                    <li><strong>AddRoundKey:</strong> Oxirgi raund kalit bilan XOR qilish</li>
                    <li><em>MixColumns qo'shilmaydi!</em></li>
                  </ul>
                </li>
              </ol>
            </div>
            
            <p className="mt-4">
              Har bir operatsiya ma'lum bir maqsadga xizmat qiladi: SubBytes chalkashlikni, ShiftRows va MixColumns diffuziyani, 
              AddRoundKey esa kalitni ishlatishni ta'minlaydi.
            </p>
          </div>
        ) : showKeyExpansion ? (
          <div>
            <h3 className="font-bold mb-2">AES kalit generatsiyasi jarayoni</h3>
            <p className="mb-4">
              AES algoritmi asl kalitni olib, har bir shifrlash raund uchun turli raund kalitlarni yaratish uchun uni kengaytiradi.
              AES-128 da jami 11 ta raund kalit mavjud (asl kalitni ham qo'shib), ularning har biri 128 bitdan iborat.
            </p>
            
            <div className="bg-gray-100 p-4 rounded">
              <h4 className="font-semibold mb-2">Kalitni kengaytirish algoritmi:</h4>
              <ol className="list-decimal pl-6 mb-4">
                <li>Birinchi raund kalit — bu asl kalit hisoblanadi</li>
                <li>Keyingi har bir raund (1–10) uchun:
                  <ul className="list-disc pl-6 mt-1">
                    <li>Oldingi raund kalit ning oxirgi 4 bayt (word) qismini oling</li>
                    <li>Kalit jadvali yadrosini (key schedule core) qo'llang:
                      <ul className="list-circle pl-6 mt-1">
                        <li>Wordni bir bayt chapga aylantirish (RotWord)</li>
                        <li>Har bir baytga S-box almashtirishini qo'llang (SubWord)</li>
                        <li>Birinchi baytni Rcon bilan XOR qiling</li>
                      </ul>
                    </li>
                    <li>Ushbu o'zgartirilgan word ni oldingi raund kalitning birinchi 4 bayt qismi bilan XOR qiling</li>
                    <li>Qolgan 12 baytni har bir word ni oldingi raund kalitdagi mos word bilan XOR qilib hosil qiling</li>
                  </ul>
                </li>
              </ol>
            </div>
            
            <p className="mt-4">
              Kalitni kengaytirish har bir raund da turli, ammo o'zaro bog'liq kalitlardan foydalanishni ta'minlab, turli hujumlarga qarshi barqarorlikni yaratadi.
              Bu AES ning xavfsizligi uchun juda muhimdir.
            </p>
          </div>
        ) : showFinalResult ? (
          <div>
            <h3 className="font-bold mb-2">AES shifrlash rejimlari</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="border p-3 rounded">
                <h4 className="font-semibold mb-2">ECB rejimi</h4>
                <p className="text-sm">
                  Electronic Codebook rejimi har bir blokni mustaqil shifrlaydi.
                  U sodda, biroq ko‘p hollarda xavfsiz emas,
                  chunki ochiq matndagi naqshlar shifrlangan matnda ham saqlanib qoladi.
                </p>
              </div>
              <div className="border p-3 rounded">
                <h4 className="font-semibold mb-2">CBC rejimi</h4>
                <p className="text-sm">
                  Cipher Block Chaining shifrlashdan oldin har bir ochiq matn blokni avvalgi shifrlangan bilan XOR qiladi.
                  Bu naqshlarni yashiradi va Initialization Vector (IV) dan foydalanishni talab qiladi.
                </p>
              </div>
              <div className="border p-3 rounded">
                <h4 className="font-semibold mb-2">CTR rejimi</h4>
                <p className="text-sm">
                  Counter rejimi ketma-ket hisoblagichlarni shifrlaydi va natijani ochiq matn bilan XOR qiladi.
                  Bu parallel shifrlash va deshifrlashni imkonini beradi hamda blokli shifrni oqimli shifrga aylantiradi.
                </p>
              </div>
            </div>
            
            <h3 className="font-bold mb-2">To‘ldirish usullari</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border p-3 rounded">
                <h4 className="font-semibold mb-2">PKCS#7 to‘ldirish</h4>
                <p className="text-sm">
                  Ochiq matn to‘ldirish uzunligiga teng qiymatdagi baytlar bilan to‘ldiriladi.
                  Masalan, agar 4 bayt to‘ldirish kerak bo‘lsa, [04, 04, 04, 04] bilan to‘ldiriladi.
                </p>
              </div>
              <div className="border p-3 rounded">
                <h4 className="font-semibold mb-2">ANSI X.923 to‘ldirish</h4>
                <p className="text-sm">
                  Ochiq matn nollar bilan to‘ldiriladi, oxirgi bayt esa to‘ldirish uzunligini bildiradi.
                  Masalan, agar 4 bayt to‘ldirish kerak bo‘lsa, [00, 00, 00, 04] bilan to‘ldiriladi.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentStep < steps.length && (
              <div>
                <h3 className="font-bold mb-2">{steps[currentStep]?.description}</h3>
                <p className="mb-4">{steps[currentStep]?.explanation}</p>
                
                {steps[currentStep]?.description.includes('SubBytes') && (
                  <div className="bg-gray-100 p-3 rounded">
                    <p>S-box almashtirishi — shifrlash algoritmi ichida chalkashlik hosil qiluvchi no-chiziqli transformatsiyadir.
                      Bu AES dagi yagona no-chiziqli amaliyot bo‘lib, uning xavfsizligi uchun juda muhimdir.</p>
                  </div>
                )}
                
                {steps[currentStep]?.description.includes('ShiftRows') && (
                  <div className="bg-gray-100 p-3 rounded">
                    <p>ShiftRows diffuziyani ta’minlaydi, ya’ni har bir ustundagi baytlar keyingi raund davomida tarqaladi.
                    Bu ochiq matndagi naqshlarni yo‘qotishga yordam beradi.</p>
                  </div>
                )}
                
                {steps[currentStep]?.description.includes('MixColumns') && (
                  <div className="bg-gray-100 p-3 rounded">
                    <p>MixColumns — AES ning asosiy diffuziya elementi hisoblanadi.
                    U chiqishdagi har bir bayt bir ustundagi barcha kirish baytlarga bog‘liqligini ta’minlaydi.
                    Bu matritsa ko‘paytmasining xossasi shundaki, agar bitta bayt o‘zgartirilsa, o‘sha ustundagi barcha baytlar ham o‘zgaradi</p>
                  </div>
                )}
                
                {steps[currentStep]?.description.includes('AddRoundKey') && (
                  <div className="bg-gray-100 p-3 rounded">
                    <p>AddRoundKey — bu kalitni bevosita ishlatadigan yagona bosqichdir.
                    Agar to‘g‘ri kalit bo‘lmasa, shifrlangan matn to‘g‘ri deshifrlanmaydi.
                    Aynan shu oddiy XOR amali boshqa bosqichlar bilan birga AES ni xavfsiz qiladi..</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      </div>
    </>
  );
}
