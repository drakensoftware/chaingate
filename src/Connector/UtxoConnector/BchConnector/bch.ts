/**
 * Bitcoin Cash transaction signing and address derivation.
 * @internal
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { hmac } from '@noble/hashes/hmac.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';
import * as btc from '@scure/btc-signer';
import { OutScript, Script } from '@scure/btc-signer';
import type { UtxoNetworkParams } from '../../../ChainGate/networks/types';
import { hexToBytes, bytesToHex } from '../../../utils/encoding';

const SIGHASH_BCH = 0x41;
const CURVE_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const HALF_ORDER = CURVE_ORDER / 2n;
const G = secp256k1.Point.BASE;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function hmacSha256(data: Uint8Array, key: Uint8Array): Uint8Array {
  return new Uint8Array(hmac(sha256, key, data));
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt('0x' + bytesToHex(bytes));
}

function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [((a % m) + m) % m, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

// ---------------------------------------------------------------------------
// RFC 6979 deterministic k (bitcore-lib-cash compatible)
// ---------------------------------------------------------------------------

// BCH-compatible deterministic k generation (double-v-hash variant).
function getDeterministicK(hash: Uint8Array, privkey: Uint8Array): bigint {
  let v: Uint8Array = new Uint8Array(32).fill(0x01);
  let k: Uint8Array = new Uint8Array(32).fill(0x00);

  // Steps a-d of RFC 6979 §3.2
  k = hmacSha256(concat(v, new Uint8Array([0x00]), privkey, hash), k);
  v = hmacSha256(v, k);
  k = hmacSha256(concat(v, new Uint8Array([0x01]), privkey, hash), k);

  // Step h: generate — with double-v-hash quirk
  v = hmacSha256(v, k);
  v = hmacSha256(v, k); // second hash (bitcore quirk)

  let T = bytesToBigInt(v);

  // Retry until T is in the valid range (0, N)
  while (T <= 0n || T >= CURVE_ORDER) {
    k = hmacSha256(concat(v, new Uint8Array([0x00])), k);
    v = hmacSha256(v, k);
    v = hmacSha256(v, k); // second hash (bitcore quirk)
    T = bytesToBigInt(v);
  }

  return T;
}

// ---------------------------------------------------------------------------
// ECDSA signing (bitcore-lib-cash compatible)
// ---------------------------------------------------------------------------

// BCH-compatible ECDSA signing.
function signEcdsaBch(hash: Uint8Array, privateKey: Uint8Array): Uint8Array {
  const e = bytesToBigInt(hash);
  const d = bytesToBigInt(privateKey);

  const kVal = getDeterministicK(hash, privateKey);
  const Q = G.multiply(kVal);
  const r = Q.x % CURVE_ORDER;
  const kInv = modInverse(kVal, CURVE_ORDER);

  // s = k^-1 * (e + d*r) mod N
  let s =
    (kInv * ((((e + ((d * r) % CURVE_ORDER)) % CURVE_ORDER) + CURVE_ORDER) % CURVE_ORDER)) %
    CURVE_ORDER;

  // BIP-62 low-S normalization
  if (s > HALF_ORDER) s = CURVE_ORDER - s;

  const sig = new secp256k1.Signature(r, s);
  return sig.toBytes('der');
}

// ---------------------------------------------------------------------------
// Address derivation
// ---------------------------------------------------------------------------

// Computes HASH160 of the input.
function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

/**
 * Derives the 20-byte public key hash from a compressed public key.
 *
 * @param publicKey - Compressed (33-byte) public key.
 */
export function publicKeyToHash160(publicKey: Uint8Array): Uint8Array {
  return hash160(publicKey);
}

// ---------------------------------------------------------------------------
// Transaction signing
// ---------------------------------------------------------------------------

/** A single UTXO input for BCH transaction signing. */
export interface BchInput {
  txid: string;
  n: number;
  script: Uint8Array;
  amount: bigint;
}

/** A single output for BCH transaction signing. */
export interface BchOutput {
  address: string;
  amount: bigint;
}

/**
 * Signs a Bitcoin Cash transaction.
 *
 * @param inputs - UTXOs to spend.
 * @param outputs - Destinations and amounts.
 * @param privateKey - 32-byte private key.
 * @param networkParams - Network parameters for address decoding.
 * @returns Serialized raw transaction bytes.
 */
export function signBchTransaction(
  inputs: BchInput[],
  outputs: BchOutput[],
  privateKey: Uint8Array,
  networkParams: UtxoNetworkParams,
): Uint8Array {
  const publicKey = secp256k1.getPublicKey(privateKey, true);
  const pubKeyHash = hash160(publicKey);

  // Build the transaction using @scure/btc-signer for structure.
  const tx = new btc.Transaction({
    allowLegacyWitnessUtxo: true,
  });

  // Add inputs.
  for (const input of inputs) {
    tx.addInput({
      txid: hexToBytes(input.txid),
      index: input.n,
      witnessUtxo: {
        script: input.script,
        amount: input.amount,
      },
      sighashType: SIGHASH_BCH,
    });
  }

  // Add outputs.
  for (const output of outputs) {
    tx.addOutput({
      script: OutScript.encode(btc.Address(networkParams).decode(output.address)),
      amount: output.amount,
    });
  }

  // Sign each input using BIP-143 preimage with SIGHASH_FORKID.
  const scriptCode = OutScript.encode({ type: 'pkh', hash: pubKeyHash });

  for (let i = 0; i < inputs.length; i++) {
    // preimageWitnessV0 computes the double-SHA256 digest of the BIP-143
    // preimage. With hashType = 0x41, the FORKID flag is embedded in the
    // 4-byte LE hashType field, which is exactly what BCH requires.
    const digest = tx.preimageWitnessV0(i, scriptCode, SIGHASH_BCH, inputs[i].amount);

    // ECDSA sign using bitcore-lib-cash compatible deterministic k.
    const derSig = signEcdsaBch(digest, privateKey);

    // scriptSig = <DER_sig || hashType_byte> <compressed_pubkey>
    const sigWithHashType = new Uint8Array(derSig.length + 1);
    sigWithHashType.set(derSig);
    sigWithHashType[derSig.length] = SIGHASH_BCH;

    const scriptSig = Script.encode([sigWithHashType, publicKey]);

    tx.updateInput(i, { finalScriptSig: scriptSig }, true);
  }

  // Serialize the transaction (legacy format, no SegWit).
  return hexToBytes(tx.hex);
}
