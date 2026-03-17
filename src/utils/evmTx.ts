/**
 * EIP-1559 (type-2) transaction serialization and signing.
 *
 * Produces the signed raw transaction hex ready for broadcast.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { rlpEncode } from './rlp';
import { bytesToHex, hexToBytes } from './encoding';

/** Parameters for an EIP-1559 transaction. All numeric values are in wei (bigint). */
export interface Eip1559TxParams {
  /** Chain ID (e.g. 1 for Ethereum mainnet). */
  chainId: bigint;
  /** Sender nonce. */
  nonce: bigint;
  /** Max priority fee per gas (tip) in wei. */
  maxPriorityFeePerGas: bigint;
  /** Max fee per gas (base + tip cap) in wei. */
  maxFeePerGas: bigint;
  /** Gas limit. */
  gasLimit: bigint;
  /** Recipient address (20 bytes hex with 0x prefix). */
  to: string;
  /** Value to send in wei. */
  value: bigint;
  /** Calldata (hex with 0x prefix). Empty for plain ETH transfers. */
  data: string;
}

/** Converts a bigint to minimal big-endian bytes (no leading zeros). */
function bigintToBytes(n: bigint): Uint8Array {
  if (n === 0n) return new Uint8Array(0);
  let hex = n.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  return hexToBytes(hex);
}

/**
 * Builds the RLP-encoded EIP-1559 transaction payload (unsigned) for signing.
 *
 * Format: 0x02 || RLP([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas,
 *                       gasLimit, to, value, data, accessList])
 */
function encodeUnsigned(tx: Eip1559TxParams): Uint8Array {
  const fields = [
    bigintToBytes(tx.chainId),
    bigintToBytes(tx.nonce),
    bigintToBytes(tx.maxPriorityFeePerGas),
    bigintToBytes(tx.maxFeePerGas),
    bigintToBytes(tx.gasLimit),
    hexToBytes(tx.to), // 20 bytes
    bigintToBytes(tx.value),
    tx.data === '0x' || tx.data === '' ? new Uint8Array(0) : hexToBytes(tx.data),
    [], // accessList — empty for simple transfers
  ];

  const rlp = rlpEncode(fields);
  // Prepend the EIP-2718 type byte (0x02).
  const envelope = new Uint8Array(1 + rlp.length);
  envelope[0] = 0x02;
  envelope.set(rlp, 1);
  return envelope;
}

/**
 * Signs an EIP-1559 transaction and returns the raw signed transaction hex
 * ready for broadcast (with `0x` prefix).
 *
 * @param tx - Transaction parameters.
 * @param privateKey - 32-byte private key.
 * @returns Signed raw transaction as a hex string with `0x` prefix.
 */
export function signEip1559Transaction(tx: Eip1559TxParams, privateKey: Uint8Array): string {
  const unsigned = encodeUnsigned(tx);
  const hash = keccak_256(unsigned);

  // Sign with secp256k1. Use 'recovered' format to get [recovery, r, s].
  // prehash: false because we already hashed the payload ourselves.
  const sigBytes = secp256k1.sign(hash, privateKey, {
    prehash: false,
    lowS: true,
    format: 'recovered',
  });

  // 'recovered' format: 1 byte recovery || 32 bytes r || 32 bytes s = 65 bytes
  const recovery = sigBytes[0]; // 0 or 1
  const r = sigBytes.subarray(1, 33);
  const s = sigBytes.subarray(33, 65);

  // Strip leading zeros from r and s for RLP encoding.
  const rTrimmed = trimLeadingZeros(r);
  const sTrimmed = trimLeadingZeros(s);

  // Signed payload: 0x02 || RLP([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas,
  //                               gasLimit, to, value, data, accessList, v, r, s])
  const fields = [
    bigintToBytes(tx.chainId),
    bigintToBytes(tx.nonce),
    bigintToBytes(tx.maxPriorityFeePerGas),
    bigintToBytes(tx.maxFeePerGas),
    bigintToBytes(tx.gasLimit),
    hexToBytes(tx.to),
    bigintToBytes(tx.value),
    tx.data === '0x' || tx.data === '' ? new Uint8Array(0) : hexToBytes(tx.data),
    [], // accessList
    bigintToBytes(BigInt(recovery)),
    rTrimmed,
    sTrimmed,
  ];

  const rlp = rlpEncode(fields);
  const signed = new Uint8Array(1 + rlp.length);
  signed[0] = 0x02;
  signed.set(rlp, 1);

  return '0x' + bytesToHex(signed);
}

/** Parameters for a legacy (pre-EIP-1559) transaction. All numeric values in wei (bigint). */
export interface LegacyTxParams {
  /** Chain ID (e.g. 56 for BSC). */
  chainId: bigint;
  /** Sender nonce. */
  nonce: bigint;
  /** Gas price in wei. */
  gasPrice: bigint;
  /** Gas limit. */
  gasLimit: bigint;
  /** Recipient address (20 bytes hex with 0x prefix). */
  to: string;
  /** Value to send in wei. */
  value: bigint;
  /** Calldata (hex with 0x prefix). Empty for plain transfers. */
  data: string;
}

/**
 * Signs a legacy (type-0) transaction and returns the raw signed transaction hex
 * ready for broadcast (with `0x` prefix).
 *
 * Uses EIP-155 replay protection.
 *
 * @param tx - Transaction parameters.
 * @param privateKey - 32-byte private key.
 * @returns Signed raw transaction as a hex string with `0x` prefix.
 */
export function signLegacyTransaction(tx: LegacyTxParams, privateKey: Uint8Array): string {
  // EIP-155 unsigned payload: RLP([nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0])
  const unsignedFields = [
    bigintToBytes(tx.nonce),
    bigintToBytes(tx.gasPrice),
    bigintToBytes(tx.gasLimit),
    hexToBytes(tx.to),
    bigintToBytes(tx.value),
    tx.data === '0x' || tx.data === '' ? new Uint8Array(0) : hexToBytes(tx.data),
    bigintToBytes(tx.chainId),
    new Uint8Array(0), // 0 for EIP-155
    new Uint8Array(0), // 0 for EIP-155
  ];

  const rlpUnsigned = rlpEncode(unsignedFields);
  const hash = keccak_256(rlpUnsigned);

  const sigBytes = secp256k1.sign(hash, privateKey, {
    prehash: false,
    lowS: true,
    format: 'recovered',
  });

  const recovery = sigBytes[0]; // 0 or 1
  const r = sigBytes.subarray(1, 33);
  const s = sigBytes.subarray(33, 65);

  // EIP-155: v = chainId * 2 + 35 + recovery
  const v = tx.chainId * 2n + 35n + BigInt(recovery);

  const signedFields = [
    bigintToBytes(tx.nonce),
    bigintToBytes(tx.gasPrice),
    bigintToBytes(tx.gasLimit),
    hexToBytes(tx.to),
    bigintToBytes(tx.value),
    tx.data === '0x' || tx.data === '' ? new Uint8Array(0) : hexToBytes(tx.data),
    bigintToBytes(v),
    trimLeadingZeros(r),
    trimLeadingZeros(s),
  ];

  const rlpSigned = rlpEncode(signedFields);
  return '0x' + bytesToHex(rlpSigned);
}

/** Removes leading zero bytes from a byte array. */
function trimLeadingZeros(bytes: Uint8Array): Uint8Array {
  let i = 0;
  while (i < bytes.length - 1 && bytes[i] === 0) i++;
  return i === 0 ? bytes : bytes.subarray(i);
}
