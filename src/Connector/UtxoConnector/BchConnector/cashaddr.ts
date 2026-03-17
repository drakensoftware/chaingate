/**
 * CashAddr codec for Bitcoin Cash addresses.
 *
 * Provides conversion between CashAddr and legacy Base58Check formats.
 * @internal
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { createBase58check } from '@scure/base';

// Base58Check codec for legacy address encode/decode.
const base58check = createBase58check(sha256);

// CashAddr base32 alphabet (same as Bech32).
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const CHARSET_INV: Record<string, number> = {};
for (let i = 0; i < CHARSET.length; i++) CHARSET_INV[CHARSET[i]] = i;

// Version byte constants.
const TYPE_P2KH = 0;
const TYPE_P2SH = 1;

// Legacy Base58Check version bytes (mainnet).
const LEGACY_P2KH = 0x00;
const LEGACY_P2SH = 0x05;

const DEFAULT_PREFIX = 'bitcoincash';

// ---------------------------------------------------------------------------
// Polymod (40-bit BCH code, 8 checksum characters)
// ---------------------------------------------------------------------------

function polymod(values: number[]): bigint {
  let c = 1n;
  for (const d of values) {
    const c0 = c >> 35n;
    c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
    if (c0 & 0x01n) c ^= 0x98f2bc8e61n;
    if (c0 & 0x02n) c ^= 0x79b76d99e2n;
    if (c0 & 0x04n) c ^= 0xf33e5fb3c4n;
    if (c0 & 0x08n) c ^= 0xae2eabe2a8n;
    if (c0 & 0x10n) c ^= 0x1e4f43e470n;
  }
  return c ^ 1n;
}

/** Encode the prefix as lower-5-bit values for the checksum input. */
function prefixData(prefix: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < prefix.length; i++) result.push(prefix.charCodeAt(i) & 0x1f);
  result.push(0); // separator
  return result;
}

// ---------------------------------------------------------------------------
// 8-bit <-> 5-bit conversion
// ---------------------------------------------------------------------------

function to5Bits(data: Uint8Array): number[] {
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out.push((value >> bits) & 0x1f);
    }
  }
  if (bits > 0) out.push((value << (5 - bits)) & 0x1f);
  return out;
}

function from5Bits(data: number[]): Uint8Array {
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const d of data) {
    value = (value << 5) | d;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

// ---------------------------------------------------------------------------
// CashAddr encode / decode
// ---------------------------------------------------------------------------

function encodeCashAddr(prefix: string, type: number, hash: Uint8Array): string {
  // Version byte: type in bits 6-3, hash size indicator in bits 2-0.
  // For 20-byte hashes, size indicator = 0.
  const versionByte = (type << 3) | 0;
  const payload = new Uint8Array([versionByte, ...hash]);
  const words = to5Bits(payload);

  const tmpl = prefixData(prefix).concat(words).concat([0, 0, 0, 0, 0, 0, 0, 0]);
  const checksum = polymod(tmpl);
  const checksumWords: number[] = [];
  for (let i = 0; i < 8; i++) checksumWords.push(Number((checksum >> BigInt(5 * (7 - i))) & 0x1fn));

  let result = prefix + ':';
  for (const w of words) result += CHARSET[w];
  for (const w of checksumWords) result += CHARSET[w];
  return result;
}

function decodeCashAddr(address: string): { prefix: string; type: number; hash: Uint8Array } {
  // Normalize: add default prefix if missing.
  let addr = address.toLowerCase();
  let prefix: string;
  let colonIdx = addr.indexOf(':');
  if (colonIdx === -1) {
    prefix = DEFAULT_PREFIX;
    addr = prefix + ':' + addr;
    colonIdx = prefix.length;
  } else {
    prefix = addr.substring(0, colonIdx);
  }

  const payload = addr.substring(colonIdx + 1);
  const words: number[] = [];
  for (const ch of payload) {
    const val = CHARSET_INV[ch];
    if (val === undefined) throw new Error(`Invalid CashAddr character: ${ch}`);
    words.push(val);
  }

  // Verify checksum (last 8 words are checksum).
  const check = prefixData(prefix).concat(words);
  if (polymod(check) !== 0n) throw new Error('Invalid CashAddr checksum');

  // Separate data words from checksum.
  const dataWords = words.slice(0, words.length - 8);
  const payloadBytes = from5Bits(dataWords);

  const versionByte = payloadBytes[0];
  const type = (versionByte >> 3) & 0x0f;
  const hash = payloadBytes.slice(1);

  return { prefix, type, hash };
}

// ---------------------------------------------------------------------------
// Public API — drop-in replacement for bchaddrjs
// ---------------------------------------------------------------------------

/**
 * Converts a CashAddr address to legacy Base58Check format.
 *
 * @param address - CashAddr address (e.g. `bitcoincash:qq...`).
 * @returns Legacy Base58Check address (e.g. `1...`).
 */
export function toLegacyAddress(address: string): string {
  const { type, hash } = decodeCashAddr(address);
  const version = type === TYPE_P2SH ? LEGACY_P2SH : LEGACY_P2KH;
  const payload = new Uint8Array([version, ...hash]);
  return base58check.encode(payload);
}

/**
 * Converts a legacy Base58Check address to CashAddr format.
 *
 * @param address - Legacy Base58Check address (e.g. `1...`).
 * @returns CashAddr address (e.g. `bitcoincash:qq...`).
 */
export function toCashAddress(address: string): string {
  const decoded = base58check.decode(address);
  const version = decoded[0];
  const hash = decoded.slice(1);
  const type = version === LEGACY_P2SH ? TYPE_P2SH : TYPE_P2KH;
  return encodeCashAddr(DEFAULT_PREFIX, type, hash);
}

/**
 * Encodes a public key hash as a CashAddr address.
 *
 * @param hash160 - The 20-byte hash of the public key.
 * @param type - Address type: `'p2pkh'` or `'p2sh'`.
 * @returns CashAddr address string.
 */
export function hashToCashAddress(hash160: Uint8Array, type: 'p2pkh' | 'p2sh' = 'p2pkh'): string {
  return encodeCashAddr(DEFAULT_PREFIX, type === 'p2sh' ? TYPE_P2SH : TYPE_P2KH, hash160);
}
