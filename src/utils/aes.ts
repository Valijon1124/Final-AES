import CryptoJS from 'crypto-js';

// AES mode enum
export enum AesMode {
  ECB = 'ECB',
  CBC = 'CBC',
  CTR = 'CTR'
}

// Padding enum
export enum PaddingType {
  PKCS7 = 'PKCS7',
  ANSI_X923 = 'ANSI X.923',
  NONE = 'None'
}

// Output format enum
export enum OutputFormat {
  BASE64 = 'Base64',
  HEX = 'Hex',
  BINARY = 'Binary'
}

// Key length enum
export enum KeyLength {
  AES_128 = 128,
  AES_192 = 192,
  AES_256 = 256
}

const getNumRounds = (keyLength: KeyLength): number => (
  keyLength === KeyLength.AES_128 ? 10 :
  keyLength === KeyLength.AES_192 ? 12 : 14
);

const getKeyByteLength = (keyLength: KeyLength): number => keyLength / 8;

// AES S-Box (Standard Rijndael S-box)
export const SBOX = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];

// AES Rcon (Round Constants)
export const RCON = [
  0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a,
];

// Used in MixColumns
export const GALOIS_MUL_2 = [
  0x00, 0x02, 0x04, 0x06, 0x08, 0x0a, 0x0c, 0x0e, 0x10, 0x12, 0x14, 0x16, 0x18, 0x1a, 0x1c, 0x1e,
  0x20, 0x22, 0x24, 0x26, 0x28, 0x2a, 0x2c, 0x2e, 0x30, 0x32, 0x34, 0x36, 0x38, 0x3a, 0x3c, 0x3e,
  0x40, 0x42, 0x44, 0x46, 0x48, 0x4a, 0x4c, 0x4e, 0x50, 0x52, 0x54, 0x56, 0x58, 0x5a, 0x5c, 0x5e,
  0x60, 0x62, 0x64, 0x66, 0x68, 0x6a, 0x6c, 0x6e, 0x70, 0x72, 0x74, 0x76, 0x78, 0x7a, 0x7c, 0x7e,
  0x80, 0x82, 0x84, 0x86, 0x88, 0x8a, 0x8c, 0x8e, 0x90, 0x92, 0x94, 0x96, 0x98, 0x9a, 0x9c, 0x9e,
  0xa0, 0xa2, 0xa4, 0xa6, 0xa8, 0xaa, 0xac, 0xae, 0xb0, 0xb2, 0xb4, 0xb6, 0xb8, 0xba, 0xbc, 0xbe,
  0xc0, 0xc2, 0xc4, 0xc6, 0xc8, 0xca, 0xcc, 0xce, 0xd0, 0xd2, 0xd4, 0xd6, 0xd8, 0xda, 0xdc, 0xde,
  0xe0, 0xe2, 0xe4, 0xe6, 0xe8, 0xea, 0xec, 0xee, 0xf0, 0xf2, 0xf4, 0xf6, 0xf8, 0xfa, 0xfc, 0xfe,
  0x1b, 0x19, 0x1f, 0x1d, 0x13, 0x11, 0x17, 0x15, 0x0b, 0x09, 0x0f, 0x0d, 0x03, 0x01, 0x07, 0x05,
  0x3b, 0x39, 0x3f, 0x3d, 0x33, 0x31, 0x37, 0x35, 0x2b, 0x29, 0x2f, 0x2d, 0x23, 0x21, 0x27, 0x25,
  0x5b, 0x59, 0x5f, 0x5d, 0x53, 0x51, 0x57, 0x55, 0x4b, 0x49, 0x4f, 0x4d, 0x43, 0x41, 0x47, 0x45,
  0x7b, 0x79, 0x7f, 0x7d, 0x73, 0x71, 0x77, 0x75, 0x6b, 0x69, 0x6f, 0x6d, 0x63, 0x61, 0x67, 0x65,
  0x9b, 0x99, 0x9f, 0x9d, 0x93, 0x91, 0x97, 0x95, 0x8b, 0x89, 0x8f, 0x8d, 0x83, 0x81, 0x87, 0x85,
  0xbb, 0xb9, 0xbf, 0xbd, 0xb3, 0xb1, 0xb7, 0xb5, 0xab, 0xa9, 0xaf, 0xad, 0xa3, 0xa1, 0xa7, 0xa5,
  0xdb, 0xd9, 0xdf, 0xdd, 0xd3, 0xd1, 0xd7, 0xd5, 0xcb, 0xc9, 0xcf, 0xcd, 0xc3, 0xc1, 0xc7, 0xc5,
  0xfb, 0xf9, 0xff, 0xfd, 0xf3, 0xf1, 0xf7, 0xf5, 0xeb, 0xe9, 0xef, 0xed, 0xe3, 0xe1, 0xe7, 0xe5,
];

export const GALOIS_MUL_3 = [
  0x00, 0x03, 0x06, 0x05, 0x0c, 0x0f, 0x0a, 0x09, 0x18, 0x1b, 0x1e, 0x1d, 0x14, 0x17, 0x12, 0x11,
  0x30, 0x33, 0x36, 0x35, 0x3c, 0x3f, 0x3a, 0x39, 0x28, 0x2b, 0x2e, 0x2d, 0x24, 0x27, 0x22, 0x21,
  0x60, 0x63, 0x66, 0x65, 0x6c, 0x6f, 0x6a, 0x69, 0x78, 0x7b, 0x7e, 0x7d, 0x74, 0x77, 0x72, 0x71,
  0x50, 0x53, 0x56, 0x55, 0x5c, 0x5f, 0x5a, 0x59, 0x48, 0x4b, 0x4e, 0x4d, 0x44, 0x47, 0x42, 0x41,
  0xc0, 0xc3, 0xc6, 0xc5, 0xcc, 0xcf, 0xca, 0xc9, 0xd8, 0xdb, 0xde, 0xdd, 0xd4, 0xd7, 0xd2, 0xd1,
  0xf0, 0xf3, 0xf6, 0xf5, 0xfc, 0xff, 0xfa, 0xf9, 0xe8, 0xeb, 0xee, 0xed, 0xe4, 0xe7, 0xe2, 0xe1,
  0xa0, 0xa3, 0xa6, 0xa5, 0xac, 0xaf, 0xaa, 0xa9, 0xb8, 0xbb, 0xbe, 0xbd, 0xb4, 0xb7, 0xb2, 0xb1,
  0x90, 0x93, 0x96, 0x95, 0x9c, 0x9f, 0x9a, 0x99, 0x88, 0x8b, 0x8e, 0x8d, 0x84, 0x87, 0x82, 0x81,
  0x9b, 0x98, 0x9d, 0x9e, 0x97, 0x94, 0x91, 0x92, 0x83, 0x80, 0x85, 0x86, 0x8f, 0x8c, 0x89, 0x8a,
  0xab, 0xa8, 0xad, 0xae, 0xa7, 0xa4, 0xa1, 0xa2, 0xb3, 0xb0, 0xb5, 0xb6, 0xbf, 0xbc, 0xb9, 0xba,
  0xfb, 0xf8, 0xfd, 0xfe, 0xf7, 0xf4, 0xf1, 0xf2, 0xe3, 0xe0, 0xe5, 0xe6, 0xef, 0xec, 0xe9, 0xea,
  0xcb, 0xc8, 0xcd, 0xce, 0xc7, 0xc4, 0xc1, 0xc2, 0xd3, 0xd0, 0xd5, 0xd6, 0xdf, 0xdc, 0xd9, 0xda,
  0x5b, 0x58, 0x5d, 0x5e, 0x57, 0x54, 0x51, 0x52, 0x43, 0x40, 0x45, 0x46, 0x4f, 0x4c, 0x49, 0x4a,
  0x6b, 0x68, 0x6d, 0x6e, 0x67, 0x64, 0x61, 0x62, 0x73, 0x70, 0x75, 0x76, 0x7f, 0x7c, 0x79, 0x7a,
  0x3b, 0x38, 0x3d, 0x3e, 0x37, 0x34, 0x31, 0x32, 0x23, 0x20, 0x25, 0x26, 0x2f, 0x2c, 0x29, 0x2a,
  0x0b, 0x08, 0x0d, 0x0e, 0x07, 0x04, 0x01, 0x02, 0x13, 0x10, 0x15, 0x16, 0x1f, 0x1c, 0x19, 0x1a,
];

// Convert text to a state matrix - returns array of bytes
export const textToState = (text: string): number[] => {
  const wordArray = CryptoJS.enc.Utf8.parse(text);
  const bytes: number[] = [];
  const sigBytes = wordArray.sigBytes;
  for (let i = 0; i < wordArray.words.length; i++) {
    const word = wordArray.words[i];
    const bytesInThisWord = Math.min(4, sigBytes - i * 4);
    if (bytesInThisWord >= 1) bytes.push((word >>> 24) & 0xff);
    if (bytesInThisWord >= 2) bytes.push((word >>> 16) & 0xff);
    if (bytesInThisWord >= 3) bytes.push((word >>> 8) & 0xff);
    if (bytesInThisWord >= 4) bytes.push(word & 0xff);
  }
  
  // Pad to 16 bytes if needed
  while (bytes.length < 16) {
    bytes.push(0);
  }
  
  const block = bytes.slice(0, 16);
  // AES state is column-major: state[r + 4*c] = input[4*c + r]
  return block;
};

// Convert a key string to bytes using selected key length
export const keyToBytes = (
  key: string,
  keyLength: KeyLength = KeyLength.AES_128
): number[] => {
  const requiredBytes = getKeyByteLength(keyLength);
  const requiredHexLength = requiredBytes * 2;

  // Remove spaces and convert to lowercase
  const cleanKey = key.replace(/\s/g, '').toLowerCase();
  
  // If it's a hex string, convert it
  if (/^[0-9a-f]+$/.test(cleanKey)) {
    const bytes: number[] = [];
    for (let i = 0; i < Math.min(cleanKey.length, requiredHexLength); i += 2) {
      bytes.push(parseInt(cleanKey.substr(i, 2), 16));
    }
    while (bytes.length < requiredBytes) {
      bytes.push(0);
    }
    return bytes.slice(0, requiredBytes);
  }
  
  // Otherwise, treat as UTF-8 text and normalize to selected key size
  const wordArray = CryptoJS.enc.Utf8.parse(key);
  const bytes: number[] = [];
  const sigBytes = wordArray.sigBytes;
  for (let i = 0; i < wordArray.words.length; i++) {
    const word = wordArray.words[i];
    const bytesInThisWord = Math.min(4, sigBytes - i * 4);
    if (bytesInThisWord >= 1) bytes.push((word >>> 24) & 0xff);
    if (bytesInThisWord >= 2) bytes.push((word >>> 16) & 0xff);
    if (bytesInThisWord >= 3) bytes.push((word >>> 8) & 0xff);
    if (bytesInThisWord >= 4) bytes.push(word & 0xff);
  }
  while (bytes.length < requiredBytes) {
    bytes.push(0);
  }
  return bytes.slice(0, requiredBytes);
};

// Generate a random key as byte array based on key length
export const generateRandomKey = (keyLength: KeyLength = KeyLength.AES_128): number[] => {
  const keyBytes = getKeyByteLength(keyLength);
  const bytes = [];
  for (let i = 0; i < keyBytes; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  return bytes;
};

// Format bytes as hex
export const bytesToHex = (bytes: number[], joinChar: string = ' '): string => {
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join(joinChar);
};

// Format bytes as binary
export const bytesToBinary = (bytes: number[], joinChar: string = ' '): string => {
  return bytes.map(byte => byte.toString(2).padStart(8, '0')).join(joinChar);
};

// SubBytes operation - substitute each byte with its S-box value
export const subBytes = (state: number[]): number[] => {
  return state.map(byte => SBOX[byte]);
};

// ShiftRows operation - rotate rows of the state matrix
export const shiftRows = (state: number[]): number[] => {
  const result = [...state];
  
  // Column-major state index helper: idx(row, col) = row + 4*col
  const idx = (row: number, col: number) => row + 4 * col;

  for (let row = 1; row < 4; row++) {
    const rowValues = [state[idx(row, 0)], state[idx(row, 1)], state[idx(row, 2)], state[idx(row, 3)]];
    const shifted = rowValues.slice(row).concat(rowValues.slice(0, row));
    for (let col = 0; col < 4; col++) {
      result[idx(row, col)] = shifted[col];
    }
  }
  
  return result;
};

// MixColumns operation - mix data within columns
export const mixColumns = (state: number[]): number[] => {
  const result = [...state];
  const idx = (row: number, col: number) => row + 4 * col;
  for (let i = 0; i < 4; i++) {
    const s0 = state[idx(0, i)];
    const s1 = state[idx(1, i)];
    const s2 = state[idx(2, i)];
    const s3 = state[idx(3, i)];
    
    result[idx(0, i)] = GALOIS_MUL_2[s0] ^ GALOIS_MUL_3[s1] ^ s2 ^ s3;
    result[idx(1, i)] = s0 ^ GALOIS_MUL_2[s1] ^ GALOIS_MUL_3[s2] ^ s3;
    result[idx(2, i)] = s0 ^ s1 ^ GALOIS_MUL_2[s2] ^ GALOIS_MUL_3[s3];
    result[idx(3, i)] = GALOIS_MUL_3[s0] ^ s1 ^ s2 ^ GALOIS_MUL_2[s3];
  }
  return result;
};

// AddRoundKey operation - XOR state with round key
export const addRoundKey = (state: number[], roundKey: number[]): number[] => {
  return state.map((byte, i) => byte ^ roundKey[i]);
};

// Kalitni kengaytirish — raund kalitlarini generatsiya qilish
export const keyExpansion = (key: number[], keyLength: KeyLength = KeyLength.AES_128): number[][] => {
  const requiredBytes = getKeyByteLength(keyLength);
  const normalizedKey = key.slice(0, requiredBytes);
  while (normalizedKey.length < requiredBytes) {
    normalizedKey.push(0);
  }

  const numRounds = getNumRounds(keyLength);
  const nk = requiredBytes / 4; // 4, 6, 8
  const totalWords = 4 * (numRounds + 1);
  const words: number[][] = [];

  const rotateWord = (word: number[]): number[] => [word[1], word[2], word[3], word[0]];
  const substituteWord = (word: number[]): number[] => word.map((byte) => SBOX[byte]);
  const xorWord = (left: number[], right: number[]): number[] => [
    left[0] ^ right[0],
    left[1] ^ right[1],
    left[2] ^ right[2],
    left[3] ^ right[3],
  ];

  // Initial key words
  for (let index = 0; index < nk; index++) {
    const offset = index * 4;
    words.push([
      normalizedKey[offset],
      normalizedKey[offset + 1],
      normalizedKey[offset + 2],
      normalizedKey[offset + 3],
    ]);
  }

  // Full AES key schedule (FIPS-197)
  for (let index = nk; index < totalWords; index++) {
    let tempWord = words[index - 1].slice();

    if (index % nk === 0) {
      tempWord = substituteWord(rotateWord(tempWord));
      tempWord[0] ^= RCON[index / nk];
    } else if (nk > 6 && index % nk === 4) {
      tempWord = substituteWord(tempWord);
    }

    words.push(xorWord(words[index - nk], tempWord));
  }

  // Convert to 16-byte round keys (Nr + 1 keys)
  const roundKeys: number[][] = [];
  for (let round = 0; round <= numRounds; round++) {
    roundKeys.push([
      ...words[round * 4],
      ...words[round * 4 + 1],
      ...words[round * 4 + 2],
      ...words[round * 4 + 3],
    ]);
  }

  return roundKeys;
};

// Perform one round of AES
export const aesRound = (state: number[], roundKey: number[], isLastRound: boolean): number[] => {
  let newState = subBytes(state);
  newState = shiftRows(newState);
  if (!isLastRound) {
    newState = mixColumns(newState);
  }
  newState = addRoundKey(newState, roundKey);
  return newState;
};

// Complete AES encryption
export const aesEncrypt = (
  plaintext: string,
  key: number[],
  keyLength: KeyLength = KeyLength.AES_128
): number[] => {
  // Initial state
  const state = textToState(plaintext);
  
  // Key expansion
  const roundKeys = keyExpansion(key, keyLength);
  const numRounds = getNumRounds(keyLength);
  
  // Initial round - just AddRoundKey
  let currentState = addRoundKey(state, roundKeys[0]);
  
  // Main rounds
  for (let round = 1; round <= numRounds; round++) {
    currentState = aesRound(currentState, roundKeys[round], round === numRounds);
  }
  
  return currentState;
};

// Convert full text to array of 16-byte blocks
export const textToBlocks = (text: string, padding: PaddingType = PaddingType.PKCS7): number[][] => {
  const wordArray = CryptoJS.enc.Utf8.parse(text);
  const bytes: number[] = [];
  
  // Convert CryptoJS WordArray to byte array, respecting sigBytes
  const sigBytes = wordArray.sigBytes;
  for (let i = 0; i < wordArray.words.length; i++) {
    const word = wordArray.words[i];
    const bytesInThisWord = Math.min(4, sigBytes - i * 4);
    
    if (bytesInThisWord >= 1) bytes.push((word >>> 24) & 0xff);
    if (bytesInThisWord >= 2) bytes.push((word >>> 16) & 0xff);
    if (bytesInThisWord >= 3) bytes.push((word >>> 8) & 0xff);
    if (bytesInThisWord >= 4) bytes.push(word & 0xff);
  }
  
  // Apply padding
  let paddedBytes: number[];
  if (padding === PaddingType.PKCS7) {
    paddedBytes = applyPKCS7Padding(bytes);
  } else if (padding === PaddingType.ANSI_X923) {
    paddedBytes = applyAnsiX923Padding(bytes);
  } else { // NONE
    paddedBytes = [...bytes];
    // For NONE padding, must be multiple of 16
    while (paddedBytes.length % 16 !== 0) {
      paddedBytes.push(0);
    }
  }
  
  // Split into 16-byte blocks
  const blocks: number[][] = [];
  for (let i = 0; i < paddedBytes.length; i += 16) {
    blocks.push(paddedBytes.slice(i, i + 16));
  }
  
  return blocks;
};

// Apply PKCS7 padding
export const applyPKCS7Padding = (data: number[]): number[] => {
  const padded = [...data];
  const paddingLength = 16 - (data.length % 16);
  
  for (let i = 0; i < paddingLength; i++) {
    padded.push(paddingLength);
  }
  
  return padded;
};

// Apply ANSI X.923 padding
export const applyAnsiX923Padding = (data: number[]): number[] => {
  const padded = [...data];
  const paddingLength = 16 - (data.length % 16);
  
  // Add padding bytes (0x00) except the last byte
  for (let i = 0; i < paddingLength - 1; i++) {
    padded.push(0x00);
  }
  
  // Add the padding length as the last byte
  padded.push(paddingLength);
  
  return padded;
};

// Remove ANSI X.923 padding
export const removeAnsiX923Padding = (data: number[]): number[] => {
  const paddingLength = data[data.length - 1];
  return data.slice(0, data.length - paddingLength);
};

// Get IV for CBC mode
export const generateIV = (): number[] => {
  const iv = [];
  for (let i = 0; i < 16; i++) {
    iv.push(Math.floor(Math.random() * 256));
  }
  return iv;
};

// Get all intermediate states for visualization
export type AesStep = {
  description: string;
  state: number[];
  activeIndices?: number[];  // For highlighting specific cells
  explanation?: string;      // More detailed explanation
  roundKey?: number[];
  previousState?: number[];  // For showing before/after comparison
};

// Get AES steps for a single block (16 bytes)
export const getAesStepsForBlock = (
  block: number[],
  key: number[],
  mode: AesMode = AesMode.ECB,
  blockIndex: number = 0,
  previousCiphertextBlock?: number[],
  iv?: number[],
  keyLength: KeyLength = KeyLength.AES_128
): {
  steps: AesStep[],
  finalState: number[]
} => {
  const steps: AesStep[] = [];
  
  // Ensure block is exactly 16 bytes
  const plaintextBytes = [...block];
  while (plaintextBytes.length < 16) {
    plaintextBytes.push(0);
  }
  
  steps.push({ 
    description: `Blok ${blockIndex + 1} — Asl ochiq matn`, 
    state: plaintextBytes,
    explanation: `Blok ${blockIndex + 1} baytga aylantiriladi va 4×4 matritsa shaklida ifodalanadi.`
  });
  
  const initialState = plaintextBytes;
  const roundKeys = keyExpansion(key, keyLength);
  const numRounds = getNumRounds(keyLength);
  
  let currentState: number[];
  
  switch (mode) {
    case AesMode.CBC:
      if (blockIndex === 0 && iv) {
        currentState = initialState.map((byte, i) => byte ^ iv[i]);
        steps.push({ 
          description: `Blok ${blockIndex + 1} — IV bilan XOR`, 
          state: currentState,
          activeIndices: Array.from(Array(16).keys()),
          previousState: initialState,
          roundKey: iv,
          explanation: `CBC: birinchi blok IV bilan XOR qilinadi.`
        });
      } else if (previousCiphertextBlock) {
        currentState = initialState.map((byte, i) => byte ^ previousCiphertextBlock[i]);
        steps.push({ 
          description: `Blok ${blockIndex + 1} — Oldingi ciphertext bilan XOR`, 
          state: currentState,
          activeIndices: Array.from(Array(16).keys()),
          previousState: initialState,
          roundKey: previousCiphertextBlock,
          explanation: `CBC: keyingi bloklar oldingi ciphertext bloki bilan XOR qilinadi.`
        });
      } else {
        currentState = initialState;
      }
      break;
    case AesMode.CTR:
      if (!iv) {
        return { steps: [], finalState: plaintextBytes };
      }
      const counterBlock = [...iv];
      let counterValue = blockIndex;
      for (let i = 15; i >= 0 && counterValue > 0; i--) {
        const sum = counterBlock[i] + (counterValue & 0xff);
        counterBlock[i] = sum & 0xff;
        counterValue = (counterValue >> 8) + (sum >> 8);
      }
      steps.push({ 
        description: `Blok ${blockIndex + 1} — Counter`, 
        state: counterBlock,
        explanation: `CTR: blok ${blockIndex + 1} uchun counter.`
      });
      currentState = counterBlock;
      break;
    default: // ECB
      currentState = initialState;
      steps.push({ 
        description: `Blok ${blockIndex + 1} — Boshlang'ich`, 
        state: currentState,
        explanation: `ECB: blok ${blockIndex + 1} mustaqil shifrlanadi.`
      });
      break;
  }
  
  const afterInitialRound = addRoundKey(currentState, roundKeys[0]);
  steps.push({ 
    description: `Blok ${blockIndex + 1} — 0-bosqich — AddRoundKey`, 
    state: afterInitialRound,
    activeIndices: Array.from(Array(16).keys()),
    explanation: '',
    roundKey: roundKeys[0],
    previousState: currentState,
  });
  
  currentState = afterInitialRound;
  
  for (let round = 1; round <= numRounds; round++) {
    const afterSubBytes = subBytes(currentState);
    steps.push({ 
      description: `Blok ${blockIndex + 1} — ${round}-bosqich — SubBytes`, 
      state: afterSubBytes,
      activeIndices: Array.from(Array(16).keys()),
      explanation: '',
      previousState: currentState
    });
    
    const afterShiftRows = shiftRows(afterSubBytes);
    steps.push({ 
      description: `Blok ${blockIndex + 1} — ${round}-bosqich — ShiftRows`, 
      state: afterShiftRows,
      activeIndices: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15],
      explanation: '',
      previousState: afterSubBytes
    });
    
    let previousStateForAddRoundKey: number[];
    
    if (round < numRounds) {
      const afterMixColumns = mixColumns(afterShiftRows);
      steps.push({ 
        description: `Blok ${blockIndex + 1} — ${round}-bosqich — MixColumns`, 
        state: afterMixColumns,
        activeIndices: Array.from(Array(16).keys()),
        explanation: '',
        previousState: afterShiftRows
      });
      
      currentState = addRoundKey(afterMixColumns, roundKeys[round]);
      previousStateForAddRoundKey = afterMixColumns;
    } else {
      currentState = addRoundKey(afterShiftRows, roundKeys[round]);
      previousStateForAddRoundKey = afterShiftRows;
    }
    
    steps.push({ 
      description: `Blok ${blockIndex + 1} — ${round}-bosqich — AddRoundKey`, 
      state: currentState,
      activeIndices: Array.from(Array(16).keys()),
      explanation: '',
      roundKey: roundKeys[round],
      previousState: previousStateForAddRoundKey,
    });
  }
  
  let finalState: number[];
  
  switch (mode) {
    case AesMode.CBC:
      finalState = currentState;
      break;
    case AesMode.CTR:
      finalState = currentState.map((byte, i) => byte ^ initialState[i]);
      steps.push({ 
        description: `Blok ${blockIndex + 1} — Counter XOR`, 
        state: finalState,
        activeIndices: Array.from(Array(16).keys()),
        explanation: `CTR: blok ${blockIndex + 1} uchun counter XOR.`,
        previousState: initialState,
        roundKey: currentState
      });
      break;
    default:
      finalState = currentState;
      break;
  }
  
  steps.push({ 
    description: `Blok ${blockIndex + 1} — Yakuniy`, 
    state: finalState,
    explanation: `Blok ${blockIndex + 1} uchun yakuniy shifrlangan natija.`
  });
  
  return { steps, finalState };
};

export const getAesSteps = (
  plaintext: string, 
  key: number[], 
  mode: AesMode = AesMode.ECB,
  padding: PaddingType = PaddingType.PKCS7,
  providedIv?: number[],
  keyLength: KeyLength = KeyLength.AES_128
): {
  steps: AesStep[],
  finalCiphertext: {
    base64: string;
    hex: string;
    binary: string;
  },
  iv?: number[],
  allBlocks?: { blockIndex: number, steps: AesStep[], finalState: number[] }[]
} => {
  const steps: AesStep[] = [];
  let iv: number[] | undefined = providedIv ? [...providedIv] : undefined;
  
  // Convert full text to blocks
  const blocks = textToBlocks(plaintext, padding);
  const allBlocks: { blockIndex: number, steps: AesStep[], finalState: number[] }[] = [];
  
  // Convert plaintext to bytes (for first block visualization)
  let plaintextBytes = blocks[0] || textToState(plaintext);
  steps.push({ 
    description: 'Asl ochiq matn', 
    state: plaintextBytes,
    explanation: `Ochiq matn "${plaintext}" baytga aylantiriladi va 4×4 matritsa shaklida ifodalanadi.`
  });
  
  // Apply padding if needed
  if (padding === PaddingType.ANSI_X923) {
    plaintextBytes = applyAnsiX923Padding(plaintextBytes);
    steps.push({ 
      description: 'ANSI X.923 to‘ldirishdan keyin', 
      state: plaintextBytes,
      explanation: 'ANSI X.923 to‘ldirish nollar bilan to‘ldiradi va oxirgi byte ga to‘ldirish uzunligini qo‘yadi.'
    });
  }
  
  // Generate IV for CBC/CTR mode only if not provided
  if ((mode === AesMode.CBC || mode === AesMode.CTR) && !iv) {
    iv = generateIV();
    if (blocks.length === 1) {
      // Only show IV step if single block (for backward compatibility)
      const ivDescription = mode === AesMode.CBC 
        ? 'Boshlang\'ich vektor (Initialization Vector, IV)' 
        : 'Counter (Nonce)';
      const ivExplanation = `${mode === AesMode.CBC ? 'CBC' : 'CTR'} rejimi uchun 16-bayt tasodifiy ${mode === AesMode.CBC ? 'IV' : 'Nonce'} yaratiladi.`;
      steps.push({ 
        description: ivDescription,
        state: iv,
        explanation: ivExplanation
      });
    }
  }
  
  // Start encryption process (for first block visualization)
  const initialState = plaintextBytes;
  
  // Key expansion
  const roundKeys = keyExpansion(key, keyLength);
  const numRounds = getNumRounds(keyLength);
  
  // Initial setup based on mode
  let currentState: number[];
  
  switch (mode) {
    case AesMode.CBC:
      if (!iv) iv = generateIV(); // Failsafe
      // XOR plaintext with IV
      currentState = initialState.map((byte, i) => byte ^ iv![i])

      steps.push({ 
        description: 'Boshlang\'ich holatni IV bilan XOR qilish', 
        state: currentState,
        activeIndices: Array.from(Array(16).keys()),
        previousState: initialState,
        roundKey: iv, // IV ni roundKey sifatida ko'rsatish uchun
        explanation: `CBC rejimida shifrlash boshlanishidan oldin ochiq matn IV bilan XOR qilinadi. Bu jarayon CBC rejimining asosiy xususiyatidir - har bir ochiq matn bloki avvalgi shifrlangan matn bloki (yoki birinchi blok uchun IV) bilan XOR qilinadi, keyin shifrlanadi. Bu bir xil ochiq matn bloklarini turli shifrlangan matn bloklarga aylantiradi va shifrlangan matndagi naqshlarni yashirishga yordam beradi.`
      });
      break;
    case AesMode.CTR:
      // In CTR mode, we encrypt a counter value instead of the plaintext
      const counter = iv || generateIV();
      if (!iv) iv = counter;
      
      steps.push({ 
        description: 'Counter qiymati', 
        state: counter,
        explanation: 'CTR rejimida ochiq matn o‘rniga counter qiymati shifrlanadi.'
      });
      
      currentState = counter;
      break;
    default: // ECB
      currentState = initialState;
      steps.push({ 
        description: 'Boshlang‘ich holat (ochiq matn)', 
        state: currentState,
        explanation: 'ECB rejimida ochiq matn bloklari mustaqil ravishda shifrlanadi.'
      });
      break;
  }
  
  // Initial round - just AddRoundKey (Round 0)
  const afterInitialRound = addRoundKey(currentState, roundKeys[0]);
  steps.push({ 
    description: '0-bosqich — Boshlang\'ich AddRoundKey', 
    state: afterInitialRound,
    activeIndices: Array.from(Array(16).keys()),
    explanation: '',
    roundKey: roundKeys[0],
    previousState: currentState,
  });
  
  currentState = afterInitialRound;
  
  // Main rounds
  for (let round = 1; round <= numRounds; round++) {
    // SubBytes
    const afterSubBytes = subBytes(currentState);
    steps.push({ 
      description: `${round}-bosqich — SubBytes`, 
      state: afterSubBytes,
      activeIndices: Array.from(Array(16).keys()),
      explanation: '',
      previousState: currentState // Add previous state for S-box lookup
    });
    
    // ShiftRows
    const afterShiftRows = shiftRows(afterSubBytes);
    steps.push({ 
      description: `${round}-bosqich — ShiftRows`, 
      state: afterShiftRows,
      activeIndices: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], // Rows 1, 2, 3 (not Row 0) in column-major
      explanation: '',
      previousState: afterSubBytes // Add previous state for comparison
    });
    
    let previousStateForAddRoundKey: number[];
    
    if (round < numRounds) {
      // MixColumns (not in final round)
      const afterMixColumns = mixColumns(afterShiftRows);
      steps.push({ 
        description: `${round}-bosqich — MixColumns`, 
        state: afterMixColumns,
        activeIndices: Array.from(Array(16).keys()),
        explanation: '',
        previousState: afterShiftRows // Add previous state for MixColumns comparison
      });
      
      // AddRoundKey
      currentState = addRoundKey(afterMixColumns, roundKeys[round]);
      previousStateForAddRoundKey = afterMixColumns;
    } else {
      // Final round has no MixColumns
      currentState = addRoundKey(afterShiftRows, roundKeys[round]);
      previousStateForAddRoundKey = afterShiftRows;
    }
    
    steps.push({ 
      description: `${round}-bosqich — AddRoundKey`, 
      state: currentState,
      activeIndices: Array.from(Array(16).keys()),
      explanation: '',
      roundKey: roundKeys[round],
      previousState: previousStateForAddRoundKey,
    });
  }
  
  // Final output based on mode
  let finalState: number[];
  
  switch (mode) {
    case AesMode.CBC:
      // Output is the current state (already completed encryption)
      finalState = currentState;
      break;
    case AesMode.CTR:
      // XOR the encrypted counter with plaintext
      finalState = currentState.map((byte, i) => byte ^ initialState[i]);
      steps.push({ 
        description: 'Ochiq matn shifrlangan hisoblagich bilan XOR amaliyotida birlashtiriladi.', 
        state: finalState,
        activeIndices: Array.from(Array(16).keys()),
        explanation: 'CTR rejimida, yakuniy bosqichda shifrlangan hisoblagich ochiq matn bilan XOR amaliyoti orqali birlashtiriladi va natijada shifrlangan matn hosil bo‘ladi.',
        previousState: initialState,
        roundKey: currentState
      });
      break;
    default: // ECB
      finalState = currentState;
      break;
  }
  
  steps.push({ 
    description: 'Yakuniy shifrlangan matn', 
    state: finalState,
    explanation: `${mode} rejimida AES-${keyLength} yordamida olingan yakuniy shifrlangan natija.`
  });
  
  // Process all blocks for multi-block support
  let previousCiphertextBlock: number[] | undefined;
  const combinedFinalStates: number[] = [];
  
  // Generate IV if needed
  if ((mode === AesMode.CBC || mode === AesMode.CTR) && !iv) {
    iv = generateIV();
  }
  
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const blockResult = getAesStepsForBlock(
      blocks[blockIndex],
      key,
      mode,
      blockIndex,
      previousCiphertextBlock,
      iv,
      keyLength
    );
    
    allBlocks.push({
      blockIndex,
      steps: blockResult.steps,
      finalState: blockResult.finalState
    });
    
    combinedFinalStates.push(...blockResult.finalState);
    
    // For CBC mode, use current ciphertext as previous for next block
    if (mode === AesMode.CBC) {
      previousCiphertextBlock = blockResult.finalState;
    }
  }
  
  // Use combined final states if we have multiple blocks, otherwise use single block result
  const finalStateToUse = blocks.length > 1 ? combinedFinalStates : finalState;
  
  // Convert the final state to the requested output format
  const finalWordArray = CryptoJS.lib.WordArray.create(
    new Uint8Array(finalStateToUse) as any
  );
  
  const finalCiphertextBase64 = CryptoJS.enc.Base64.stringify(finalWordArray);
  const finalCiphertextHex = CryptoJS.enc.Hex.stringify(finalWordArray);
  const finalCiphertextBinary = bytesToBinary(finalStateToUse, '');
  
  return { 
    steps, 
    finalCiphertext: {
      base64: finalCiphertextBase64,
      hex: finalCiphertextHex,
      binary: finalCiphertextBinary
    }, 
    iv,
    allBlocks: allBlocks.length > 1 ? allBlocks : undefined
  };
};

// Get key expansion steps with detailed explanations
export const getKeyExpansionSteps = (
  key: number[],
  keyLength: KeyLength = KeyLength.AES_128
): { 
  description: string, 
  key: number[],
  explanation?: string,
  highlightedCells?: number[]
}[] => {
  const roundKeys = keyExpansion(key, keyLength);
  const numRounds = getNumRounds(keyLength);
  const steps = [];
  
  steps.push({
    description: 'Boshlang‘ich kalit',
    key: roundKeys[0],
    explanation: `Bu foydalanuvchi tomonidan berilgan asl ${keyLength}-bitli kalitdir.`
  });
  
  for (let round = 1; round <= numRounds; round++) {
    const prevKey = roundKeys[round - 1];
    const currentKey = roundKeys[round];
    
    // Calculate the transformations for a more detailed explanation
    const lastWord = [prevKey[12], prevKey[13], prevKey[14], prevKey[15]];
    const rotWord = [lastWord[1], lastWord[2], lastWord[3], lastWord[0]];
    const sboxWord = rotWord.map(byte => SBOX[byte]);
    const rconValue = RCON[round];
    const transformedWord = [...sboxWord];
    transformedWord[0] ^= rconValue;
    // Calculate the first word of the previous key and its XOR with the transformed word
    const firstWordPrev = [prevKey[0], prevKey[1], prevKey[2], prevKey[3]];
    const xorResult = firstWordPrev.map((byte, index) => byte ^ transformedWord[index]);


    // Show the key with highlighted cells for the new word
    steps.push({
      description: `Raund kaliti ${round}`,
      key: currentKey,
      explanation: `
        ${round}-raund uchun kalitni kengaytirish jarayoni:
        1. Oldingi kalitning oxirgi word qismini oling: [${lastWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}]
        2. Wordni aylantiring: [${rotWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}]
        3. Aylantirilgan word ga S-box ni qo‘llang: [${sboxWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}]
        4. Birinchi baytga RCON (Round Constant ${rconValue.toString(16)}) ni qo‘llang:
          Natija: [${transformedWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}]
        5. Oldingi kalitning birinchi word i: [${firstWordPrev.map(b => b.toString(16).padStart(2, '0')).join(', ')}] ni o‘zgartirilgan word bilan XOR qiling: [${transformedWord.map(b => b.toString(16).padStart(2, '0')).join(', ')}], natijada: [${xorResult.map(b => b.toString(16).padStart(2, '0')).join(', ')}] hosil bo‘ladi. So‘ngra qolgan word lar shu tarzda hosil qilinadi.
      `,
      highlightedCells: [0, 1, 2, 3] // Highlight the first word that's directly transformed
    });
  }
  
  return steps;
};

// Return intermediate steps for each word expansion for visualization
export function getKeyScheduleDetailedSteps(key: number[], keyLength = KeyLength.AES_128) {
  const keyWords = key.length / 4;
  const numRounds = getNumRounds(keyLength);

  // Flatten byte array -> words
  let prevKey = key.slice();
  let roundKeys = [prevKey.slice()];

  // For result visualization: each step for each round
  let stepsPerRound = [];

  for (let round = 1; round <= numRounds; round++) {
    let stepDetails = [];
    let newKey = prevKey.slice();
    const lastIndex = prevKey.length - 4;
    const lastWord = [prevKey[lastIndex], prevKey[lastIndex + 1], prevKey[lastIndex + 2], prevKey[lastIndex + 3]];

    // Step 1: RotWord
    const rotWord = [lastWord[1], lastWord[2], lastWord[3], lastWord[0]];
    stepDetails.push({
      step: 'RotWord', input: lastWord.slice(), output: rotWord.slice()
    });
    // Step 2: SubBytes (S-box)
    const sboxWord = rotWord.map(byte => SBOX[byte]);
    stepDetails.push({
      step: 'SubBytes', input: rotWord.slice(), output: sboxWord.slice()
    });
    // Step 3: Rcon to first byte
    const rconValue = RCON[round];
    const rconWord = sboxWord.slice();
    rconWord[0] ^= rconValue;
    stepDetails.push({
      step: 'Apply Rcon', input: sboxWord.slice(), rcon: rconValue, output: rconWord.slice()
    });
    // Step 4: XOR with previous (first word)
    const xorResult = [
      prevKey[0] ^ rconWord[0],
      prevKey[1] ^ rconWord[1],
      prevKey[2] ^ rconWord[2],
      prevKey[3] ^ rconWord[3],
    ];
    stepDetails.push({
      step: 'XOR with previous', inputs: [prevKey.slice(0,4), rconWord.slice()], output: xorResult.slice()
    });
    // Save and update newKey
    newKey[0] = xorResult[0];
    newKey[1] = xorResult[1];
    newKey[2] = xorResult[2];
    newKey[3] = xorResult[3];
    // Other words (only simple xor)
    for (let i = 1; i < keyWords; i++) {
      const offset = i * 4;
      newKey[offset] = newKey[offset - 4] ^ prevKey[offset];
      newKey[offset + 1] = newKey[offset - 3] ^ prevKey[offset + 1];
      newKey[offset + 2] = newKey[offset - 2] ^ prevKey[offset + 2];
      newKey[offset + 3] = newKey[offset - 1] ^ prevKey[offset + 3];
      stepDetails.push({
        step: 'XOR chain', inputs: [
          newKey.slice(offset - 4, offset),
          prevKey.slice(offset, offset + 4)
        ], output: newKey.slice(offset, offset + 4), wordIndex: i
      });
    }
    stepsPerRound.push({ round, stepDetails, roundKey: newKey.slice() });
    prevKey = newKey.slice();
    roundKeys.push(prevKey);
  }
  return stepsPerRound;
}

// Real AES encryption using CryptoJS for verification
export const realAesEncrypt = (
  plaintext: string,
  key: string,
  mode: AesMode = AesMode.ECB,
  padding: PaddingType = PaddingType.PKCS7,
  outputFormat: OutputFormat = OutputFormat.BASE64,
  keyLength: KeyLength = KeyLength.AES_128,
  ivString?: string
): { ciphertext: string, iv?: string, formats: { base64: string, hex: string, binary: string } } => {
  // Handle case where key is shorter than required by keyLength
  const cleanKey = key.replace(/\s/g, '');
  let keyHex = cleanKey.length % 2 === 1 ? cleanKey + '0' : cleanKey;
  
  // Ensure key is of correct length for the selected key length
  const requiredHexChars = keyLength / 4; // Each hex char is 4 bits
  if (keyHex.length < requiredHexChars) {
    // Pad key if too short
    keyHex = keyHex.padEnd(requiredHexChars, '0');
  } else if (keyHex.length > requiredHexChars) {
    // Truncate key if too long
    keyHex = keyHex.substring(0, requiredHexChars);
  }
  
  const keyWordArray = CryptoJS.enc.Hex.parse(keyHex);
  
  let paddingOption: any;
  switch (padding) {
    case PaddingType.ANSI_X923:
      paddingOption = { padding: CryptoJS.pad.AnsiX923 };
      break;
    case PaddingType.NONE:
      paddingOption = { padding: CryptoJS.pad.NoPadding };
      break;
    default:
      paddingOption = {}; // default is PKCS7
  }
  
  let modeOption: any;
  let iv: any;
  
  switch (mode) {
    case AesMode.CBC:
      if (ivString) {
        iv = CryptoJS.enc.Hex.parse(ivString.replace(/\s/g, ''));
      } else {
        iv = CryptoJS.lib.WordArray.random(16);
      }
      modeOption = { 
        mode: CryptoJS.mode.CBC,
        iv: iv,
        ...paddingOption
      };
      break;
    case AesMode.CTR:
      if (ivString) {
        iv = CryptoJS.enc.Hex.parse(ivString.replace(/\s/g, ''));
      } else {
        iv = CryptoJS.lib.WordArray.random(16);
      }
      modeOption = {
        mode: CryptoJS.mode.CTR,
        iv: iv,
        counter: CryptoJS.lib.WordArray.create([0, 0, 0, 0], 16),
        ...paddingOption
      };
      break;
    default: // ECB
      modeOption = {
        mode: CryptoJS.mode.ECB,
        ...paddingOption
      };
      break;
  }
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, modeOption);
  
  // Get all output formats
  const base64Output = encrypted.toString();
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(base64Output)
  });
  const hexOutput = CryptoJS.format.Hex.stringify(cipherParams);
  
  // For binary, we need to convert the hex to binary
  const hexBytes = hexOutput.match(/.{2}/g)!.map(hex => parseInt(hex, 16));
  const binaryOutput = bytesToBinary(hexBytes, '');
  
  // Select the requested format for primary output
  let primaryOutput: string;
  switch (outputFormat) {
    case OutputFormat.HEX:
      primaryOutput = hexOutput;
      break;
    case OutputFormat.BINARY:
      primaryOutput = binaryOutput;
      break;
    default: // BASE64
      primaryOutput = base64Output;
      break;
  }
  
  return { 
    ciphertext: primaryOutput,
    iv: iv ? CryptoJS.enc.Hex.stringify(iv) : undefined,
    formats: {
      base64: base64Output,
      hex: hexOutput,
      binary: binaryOutput
    }
  };
};

// Real AES decryption using CryptoJS
export const realAesDecrypt = (
  ciphertext: string,
  key: string,
  mode: AesMode = AesMode.ECB,
  padding: PaddingType = PaddingType.PKCS7,
  inputFormat: OutputFormat = OutputFormat.BASE64,
  keyLength: KeyLength = KeyLength.AES_128,
  ivString?: string
): { plaintext: string, error?: string } => {
  try {
    // Handle case where key is shorter than required by keyLength
    const cleanKey = key.replace(/\s/g, '');
    let keyHex = cleanKey.length % 2 === 1 ? cleanKey + '0' : cleanKey;
    
    // Ensure key is of correct length for the selected key length
    const requiredHexChars = keyLength / 4; // Each hex char is 4 bits
    if (keyHex.length < requiredHexChars) {
      // Pad key if too short
      keyHex = keyHex.padEnd(requiredHexChars, '0');
    } else if (keyHex.length > requiredHexChars) {
      // Truncate key if too long
      keyHex = keyHex.substring(0, requiredHexChars);
    }
    
    const keyWordArray = CryptoJS.enc.Hex.parse(keyHex);
    
    // Parse ciphertext based on input format
    let ciphertextWordArray: any;
    switch (inputFormat) {
      case OutputFormat.HEX:
        ciphertextWordArray = CryptoJS.enc.Hex.parse(ciphertext.replace(/\s/g, ''));
        break;
      case OutputFormat.BINARY:
        // Convert binary string to hex first
        const hexFromBinary = ciphertext.replace(/\s/g, '').match(/.{8}/g)?.map(bin => parseInt(bin, 2).toString(16).padStart(2, '0')).join('') || '';
        ciphertextWordArray = CryptoJS.enc.Hex.parse(hexFromBinary);
        break;
      default: // BASE64
        ciphertextWordArray = CryptoJS.enc.Base64.parse(ciphertext);
        break;
    }
    
    let paddingOption: any;
    switch (padding) {
      case PaddingType.ANSI_X923:
        paddingOption = { padding: CryptoJS.pad.AnsiX923 };
        break;
      case PaddingType.NONE:
        paddingOption = { padding: CryptoJS.pad.NoPadding };
        break;
      default:
        paddingOption = {}; // default is PKCS7
    }
    
    let modeOption: any;
    let iv: any;
    
    switch (mode) {
      case AesMode.CBC:
        if (!ivString) {
          return { plaintext: '', error: 'CBC rejimi uchun IV kerak' };
        }
        iv = CryptoJS.enc.Hex.parse(ivString.replace(/\s/g, ''));
        modeOption = { 
          mode: CryptoJS.mode.CBC,
          iv: iv,
          ...paddingOption
        };
        break;
      case AesMode.CTR:
        if (!ivString) {
          return { plaintext: '', error: 'CTR rejimi uchun IV (Nonce) kerak' };
        }
        iv = CryptoJS.enc.Hex.parse(ivString.replace(/\s/g, ''));
        modeOption = {
          mode: CryptoJS.mode.CTR,
          iv: iv,
          counter: CryptoJS.lib.WordArray.create([0, 0, 0, 0], 16),
          ...paddingOption
        };
        break;
      default: // ECB
        modeOption = {
          mode: CryptoJS.mode.ECB,
          ...paddingOption
        };
        break;
    }
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertextWordArray } as any,
      keyWordArray,
      modeOption
    );
    
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!plaintext) {
      return { plaintext: '', error: 'Deshifrlash muvaffaqiyatsiz. Kalit yoki shifrlangan matn noto\'g\'ri.' };
    }
    
    return { plaintext };
  } catch (error: any) {
    return { plaintext: '', error: error.message || 'Deshifrlashda xatolik yuz berdi' };
  }
};

// Test specific case for "Salom, AES!" with key "cc 0e c1 70 24 24 01 8d 4e fd 5e f3 8d 15 2f 63"
export const testSpecificCase = (): string => {
  const plaintext = "Salom, AES!";
  const key = "cc 0e c1 70 24 24 01 8d 4e fd 5e f3 8d 15 2f 63";
  
  // Create key and input as byte arrays
  const keyBytes = [];
  for (let i = 0; i < key.length; i += 2) {
    keyBytes.push(parseInt(key.substr(i, 2), 16));
  }
  
  // Use our implementation
  const { finalCiphertext } = getAesSteps(plaintext, keyBytes, AesMode.ECB, PaddingType.PKCS7);
  
  // Use CryptoJS implementation
  const cryptoResult = realAesEncrypt(plaintext, key, AesMode.ECB, PaddingType.PKCS7, OutputFormat.HEX);
  
  return `
    Bizning implementatsiyamiz (HEX): ${finalCiphertext.hex}
    CryptoJS implementatsiyasi (HEX): ${cryptoResult.formats.hex}
    Kutilayotgan natija: 30484B8F8C6BB09CA3F94C6F84F0305E
  `;
};
