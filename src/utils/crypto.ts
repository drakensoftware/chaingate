import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex } from './encoding';

/**
 * Returns the compressed public key for a given private key.
 *
 * @param privateKey - The private key bytes.
 * @returns The compressed public key bytes.
 */
export function privateKeyToPublicKey(privateKey: Uint8Array): Uint8Array {
  return secp256k1.getPublicKey(privateKey, true);
}

/**
 * Compresses a public key to its short form. Accepts both compressed and uncompressed keys.
 *
 * @param raw - The public key bytes (compressed or uncompressed).
 * @returns The compressed public key bytes.
 */
export function compressPublicKey(raw: Uint8Array): Uint8Array {
  // Use hex to avoid Uint8Array type variance issues with @noble/curves
  const point = secp256k1.Point.fromHex(bytesToHex(raw));
  return point.toBytes(true);
}

/**
 * Derives an EIP-55 checksummed Ethereum address from a compressed or uncompressed public key.
 *
 * @param publicKey - The public key bytes (compressed or uncompressed).
 * @returns The checksummed Ethereum address (e.g. `"0xAb5801a7..."`).
 */
export function publicKeyToEthAddress(publicKey: Uint8Array): string {
  // Decompress to the uncompressed form (65 bytes: 04 || x || y),
  // then drop the 0x04 prefix to get the raw 64-byte x||y.
  const point = secp256k1.Point.fromHex(bytesToHex(publicKey));
  const uncompressed = point.toBytes(false); // 65 bytes
  const xy = uncompressed.slice(1); // 64 bytes

  const hash = keccak_256(xy);
  const rawAddress = bytesToHex(hash.slice(12)); // last 20 bytes

  return toEip55Checksum(rawAddress);
}

/**
 * Applies EIP-55 mixed-case checksum to a raw hex address.
 */
function toEip55Checksum(address: string): string {
  const lower = address.toLowerCase();
  const hashHex = bytesToHex(keccak_256(new TextEncoder().encode(lower)));
  let checksummed = '0x';
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    checksummed += parseInt(hashHex[i], 16) >= 8 ? char.toUpperCase() : char;
  }
  return checksummed;
}

// Matches exactly 40 hex characters, with or without 0x prefix.
const EVM_ADDRESS_RE = /^(0x)?[0-9a-fA-F]{40}$/;

/**
 * Checks whether a string is a valid EVM address.
 *
 * Accepts both checksummed and all-lowercase/all-uppercase forms.
 * When the address uses mixed case, the EIP-55 checksum is verified.
 *
 * @param address - The address string to validate.
 * @returns `true` if the address is valid.
 */
export function isValidEvmAddress(address: string): boolean {
  if (!EVM_ADDRESS_RE.test(address)) return false;

  // Strip 0x prefix for checksum evaluation.
  const raw = address.startsWith('0x') || address.startsWith('0X') ? address.slice(2) : address;

  // All-lowercase or all-uppercase is valid without checksum verification.
  if (raw === raw.toLowerCase() || raw === raw.toUpperCase()) return true;

  // Mixed case → verify EIP-55 checksum.
  return toEip55Checksum(raw) === `0x${raw}`;
}
