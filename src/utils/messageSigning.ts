/**
 * Message signing and verification for EVM (EIP-191) and UTXO (Bitcoin-style)
 * networks.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from './encoding';
import { publicKeyToEthAddress, compressPublicKey } from './crypto';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function encodeVarInt(n: number): Uint8Array {
  if (n < 0xfd) {
    return Uint8Array.of(n);
  } else if (n <= 0xffff) {
    return Uint8Array.of(0xfd, n & 0xff, (n >> 8) & 0xff);
  } else if (n <= 0xffffffff) {
    return Uint8Array.of(0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff);
  } else {
    throw new RangeError('Message too long');
  }
}

// ---------------------------------------------------------------------------
// EVM (EIP-191) message signing
// ---------------------------------------------------------------------------

/**
 * Hashes a message using the EIP-191 "personal sign" standard.
 *
 * Format: `keccak256("\x19Ethereum Signed Message:\n" + len + message)`
 */
function eip191Hash(message: string | Uint8Array): Uint8Array {
  const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${messageBytes.length}`);

  const payload = new Uint8Array(prefix.length + messageBytes.length);
  payload.set(prefix);
  payload.set(messageBytes, prefix.length);

  return keccak_256(payload);
}

/**
 * Signs a message using EIP-191 personal sign (the same scheme as MetaMask's
 * `personal_sign`).
 *
 * @param message - The message to sign (string or raw bytes).
 * @param privateKey - The 32-byte private key.
 * @returns The 65-byte signature as a hex string with `0x` prefix.
 */
export function signEvmMessage(message: string | Uint8Array, privateKey: Uint8Array): string {
  const hash = eip191Hash(message);

  // 'recovered' format: Uint8Array of 65 bytes — [recovery(1), r(32), s(32)]
  const sigBytes = secp256k1.sign(hash, privateKey, {
    prehash: false,
    lowS: true,
    format: 'recovered',
  });

  const recovery = sigBytes[0]; // 0 or 1
  const r = sigBytes.subarray(1, 33);
  const s = sigBytes.subarray(33, 65);
  const v = (recovery + 27).toString(16).padStart(2, '0');

  return '0x' + bytesToHex(r) + bytesToHex(s) + v;
}

/**
 * Verifies an EIP-191 personal sign signature.
 *
 * @param message - The original message (string or raw bytes).
 * @param signature - The signature (hex string with `0x` prefix).
 * @param address - The expected signer address (EIP-55 checksummed or lowercase).
 * @returns `true` if the signature is valid and was produced by the given address.
 */
export function verifyEvmMessage(
  message: string | Uint8Array,
  signature: string,
  address: string,
): boolean {
  try {
    const hash = eip191Hash(message);
    const sigHexBytes = hexToBytes(signature);

    if (sigHexBytes.length !== 65) return false;

    const r = sigHexBytes.slice(0, 32);
    const s = sigHexBytes.slice(32, 64);
    const v = sigHexBytes[64];

    const recovery = v >= 27 ? v - 27 : v;
    if (recovery !== 0 && recovery !== 1) return false;

    // Reconstruct 'recovered' format: [recovery, r, s]
    const recovered = new Uint8Array(65);
    recovered[0] = recovery;
    recovered.set(r, 1);
    recovered.set(s, 33);

    const recoveredPubKeyBytes = secp256k1.recoverPublicKey(recovered, hash, { prehash: false });
    const recoveredAddress = publicKeyToEthAddress(recoveredPubKeyBytes);

    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// UTXO (Bitcoin-style) message signing
// ---------------------------------------------------------------------------

/**
 * Computes the Bitcoin "magic hash" for message signing.
 *
 * Format: `SHA256(SHA256(prefix_len + prefix + message_len + message))`
 *
 * @param message - The message to hash.
 * @param prefix - The chain-specific sign header (e.g. `"\x18Bitcoin Signed Message:\n"`).
 */
function magicHash(
  message: Uint8Array | string,
  prefix: string = '\x18Bitcoin Signed Message:\n',
): Uint8Array {
  const prefixBytes = new TextEncoder().encode(prefix);
  const prefixLen = encodeVarInt(prefixBytes.length);

  const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const msgLen = encodeVarInt(messageBytes.length);

  const payload = new Uint8Array(
    prefixLen.length + prefixBytes.length + msgLen.length + messageBytes.length,
  );
  let offset = 0;
  payload.set(prefixLen, offset);
  offset += prefixLen.length;
  payload.set(prefixBytes, offset);
  offset += prefixBytes.length;
  payload.set(msgLen, offset);
  offset += msgLen.length;
  payload.set(messageBytes, offset);

  return sha256(sha256(payload));
}

/**
 * Signs a message using the Bitcoin message signing standard.
 *
 * @param message - The message to sign (string or raw bytes).
 * @param privateKey - The 32-byte private key.
 * @param prefix - The chain-specific sign header. Defaults to Bitcoin's prefix.
 * @returns The signature as a base64 string (65 bytes).
 */
export function signUtxoMessage(
  message: Uint8Array | string,
  privateKey: Uint8Array,
  prefix: string = '\x18Bitcoin Signed Message:\n',
): string {
  const hash = magicHash(message, prefix);

  // 'recovered' format: [recovery(1), r(32), s(32)]
  const sigBytes = secp256k1.sign(hash, privateKey, {
    prehash: false,
    lowS: true,
    format: 'recovered',
  });

  const recovery = sigBytes[0]; // 0 or 1

  // Get expected public key (compressed)
  const expectedPubKey = secp256k1.getPublicKey(privateKey, true);

  // Try the actual recovery first, then fallback
  for (const recoveryId of [recovery, ...[0, 1, 2, 3].filter((r) => r !== recovery)]) {
    const candidate = new Uint8Array(65);
    candidate[0] = recoveryId;
    candidate.set(sigBytes.subarray(1, 65), 1);

    let recoveredPubKey: Uint8Array;
    try {
      recoveredPubKey = compressPublicKey(
        secp256k1.recoverPublicKey(candidate, hash, { prehash: false }),
      );
    } catch {
      continue;
    }

    // Compare the recovered public key with expected
    if (
      recoveredPubKey.length === expectedPubKey.length &&
      recoveredPubKey.every((byte, i) => byte === expectedPubKey[i])
    ) {
      // Use 31 for compressed keys (Bitcoin standard)
      const recoveryFlag = 31 + recoveryId;
      const fullSig = new Uint8Array(65);
      fullSig[0] = recoveryFlag;
      fullSig.set(sigBytes.subarray(1, 65), 1);

      return btoa(String.fromCharCode(...fullSig));
    }
  }

  throw new RangeError('Could not create recoverable signature');
}

/**
 * Recovers the compressed public key from a Bitcoin-style signed message.
 *
 * @param message - The original message.
 * @param signature - The base64-encoded signature (65 bytes).
 * @param prefix - The chain-specific sign header.
 * @returns The recovered compressed public key (33 bytes).
 */
export function recoverUtxoPublicKey(
  message: Uint8Array | string,
  signature: string,
  prefix: string = '\x18Bitcoin Signed Message:\n',
): Uint8Array {
  const hash = magicHash(message, prefix);

  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));

  if (sigBytes.length !== 65) {
    throw new RangeError('Invalid signature length');
  }

  const recoveryFlag = sigBytes[0];
  const signatureData = sigBytes.slice(1);

  const isCompressed = recoveryFlag >= 31;
  const recoveryId = isCompressed ? recoveryFlag - 31 : recoveryFlag - 27;

  if (recoveryId < 0 || recoveryId > 3) {
    throw new RangeError('Invalid recovery ID');
  }

  // Build 'recovered' format: [recovery, r, s]
  const recovered = new Uint8Array(65);
  recovered[0] = recoveryId;
  recovered.set(signatureData, 1);

  const uncompressed = secp256k1.recoverPublicKey(recovered, hash, { prehash: false });
  return isCompressed ? compressPublicKey(uncompressed) : uncompressed;
}
