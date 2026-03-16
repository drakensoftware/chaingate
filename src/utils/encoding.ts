import { InvalidHexError } from '../errors';

/**
 * Checks whether a string is valid hexadecimal. Supports optional `0x` prefix.
 *
 * @param s - The string to validate.
 * @returns `true` if valid hex.
 */
export function isHex(s: string): boolean {
  const clean = s.startsWith('0x') ? s.substring(2) : s;
  return clean.length > 0 && clean.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(clean);
}

/**
 * Converts a hex string to bytes. Supports optional `0x` prefix.
 *
 * @param hex - The hex string to decode.
 * @throws {@link InvalidHexError} If the string is not valid hex.
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.substring(2) : hex;
  if (clean.length % 2 !== 0) throw new InvalidHexError('Invalid hex: odd length');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts bytes to a lowercase hex string (without `0x` prefix).
 *
 * @param bytes - The byte array to encode.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Checks whether a string contains only valid Base58 characters.
 *
 * @param s - The string to validate.
 * @returns `true` if valid Base58.
 */
export function isBase58(s: string): boolean {
  return /^[A-HJ-NP-Za-km-z1-9]+$/.test(s);
}
