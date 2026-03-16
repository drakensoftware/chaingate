import { describe, it, expect } from 'vitest';
import {
  signEvmMessage,
  verifyEvmMessage,
  signUtxoMessage,
  recoverUtxoPublicKey,
  publicKeyToEthAddress,
} from '../src';
import { PRIV_HEX, PUB_HEX } from './fixtures';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.substring(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

const PRIVATE_KEY = hexToBytes(PRIV_HEX);
const PUBLIC_KEY_COMPRESSED = hexToBytes(PUB_HEX);

// Derive the Ethereum address for this key pair
const ETH_ADDRESS = publicKeyToEthAddress(PUBLIC_KEY_COMPRESSED);

// ---------------------------------------------------------------------------
// EVM (EIP-191) message signing
// ---------------------------------------------------------------------------

describe('EVM message signing (EIP-191)', () => {
  it('signEvmMessage returns a 0x-prefixed 65-byte hex signature', () => {
    const sig = signEvmMessage('Hello, world!', PRIVATE_KEY);
    expect(sig).toMatch(/^0x[0-9a-f]{130}$/);
  });

  it('verifyEvmMessage returns true for a valid signature', () => {
    const message = 'Hello, world!';
    const sig = signEvmMessage(message, PRIVATE_KEY);
    expect(verifyEvmMessage(message, sig, ETH_ADDRESS)).toBe(true);
  });

  it('verifyEvmMessage returns false for a tampered message', () => {
    const sig = signEvmMessage('Hello, world!', PRIVATE_KEY);
    expect(verifyEvmMessage('Tampered message', sig, ETH_ADDRESS)).toBe(false);
  });

  it('verifyEvmMessage returns false for a wrong address', () => {
    const sig = signEvmMessage('Hello, world!', PRIVATE_KEY);
    expect(
      verifyEvmMessage('Hello, world!', sig, '0x0000000000000000000000000000000000000000'),
    ).toBe(false);
  });

  it('verifyEvmMessage returns false for an invalid signature', () => {
    expect(verifyEvmMessage('Hello', '0x' + '00'.repeat(65), ETH_ADDRESS)).toBe(false);
  });

  it('verifyEvmMessage returns false for a truncated signature', () => {
    expect(verifyEvmMessage('Hello', '0x1234', ETH_ADDRESS)).toBe(false);
  });

  it('handles empty string messages', () => {
    const sig = signEvmMessage('', PRIVATE_KEY);
    expect(verifyEvmMessage('', sig, ETH_ADDRESS)).toBe(true);
  });

  it('handles Uint8Array messages', () => {
    const msgBytes = new TextEncoder().encode('binary message');
    const sig = signEvmMessage(msgBytes, PRIVATE_KEY);
    expect(verifyEvmMessage(msgBytes, sig, ETH_ADDRESS)).toBe(true);
  });

  it('is case-insensitive on address comparison', () => {
    const sig = signEvmMessage('test', PRIVATE_KEY);
    expect(verifyEvmMessage('test', sig, ETH_ADDRESS.toLowerCase())).toBe(true);
    expect(verifyEvmMessage('test', sig, ETH_ADDRESS.toUpperCase())).toBe(true);
  });

  it('round-trips: sign then verify with multiple messages', () => {
    const messages = ['Short', 'A longer message with special chars: @#$%^&*()', ''];
    for (const msg of messages) {
      const sig = signEvmMessage(msg, PRIVATE_KEY);
      expect(verifyEvmMessage(msg, sig, ETH_ADDRESS)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// UTXO (Bitcoin-style) message signing
// ---------------------------------------------------------------------------

describe('UTXO message signing (Bitcoin-style)', () => {
  it('signUtxoMessage returns a base64 string', () => {
    const sig = signUtxoMessage('Hello, Bitcoin!', PRIVATE_KEY);
    // Verify it's valid base64 by decoding and re-encoding
    const decoded = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    expect(decoded.length).toBe(65);
  });

  it('round-trips: sign then recover the correct public key', () => {
    const message = 'Hello, Bitcoin!';
    const sig = signUtxoMessage(message, PRIVATE_KEY);
    const recoveredPubKey = recoverUtxoPublicKey(message, sig);

    // The recovered compressed public key should match our input
    expect(Buffer.from(recoveredPubKey).toString('hex')).toBe(PUB_HEX);
  });

  it('recovers the correct public key for an empty message', () => {
    const sig = signUtxoMessage('', PRIVATE_KEY);
    const recovered = recoverUtxoPublicKey('', sig);
    expect(Buffer.from(recovered).toString('hex')).toBe(PUB_HEX);
  });

  it('recovers incorrect public key for a tampered message', () => {
    const sig = signUtxoMessage('Original', PRIVATE_KEY);
    const recovered = recoverUtxoPublicKey('Tampered', sig);
    expect(Buffer.from(recovered).toString('hex')).not.toBe(PUB_HEX);
  });

  it('throws for an invalid signature length', () => {
    const badSig = btoa(String.fromCharCode(...new Uint8Array(32)));
    expect(() => recoverUtxoPublicKey('test', badSig)).toThrow('Invalid signature length');
  });

  it('works with a custom prefix (Litecoin)', () => {
    const ltcPrefix = '\x19Litecoin Signed Message:\n';
    const message = 'Litecoin test';
    const sig = signUtxoMessage(message, PRIVATE_KEY, ltcPrefix);
    const recovered = recoverUtxoPublicKey(message, sig, ltcPrefix);
    expect(Buffer.from(recovered).toString('hex')).toBe(PUB_HEX);
  });

  it('works with a custom prefix (Dogecoin)', () => {
    const dogePrefix = '\x19Dogecoin Signed Message:\n';
    const message = 'Much wow';
    const sig = signUtxoMessage(message, PRIVATE_KEY, dogePrefix);
    const recovered = recoverUtxoPublicKey(message, sig, dogePrefix);
    expect(Buffer.from(recovered).toString('hex')).toBe(PUB_HEX);
  });

  it('different prefix produces a different signature', () => {
    const message = 'Same message';
    const btcSig = signUtxoMessage(message, PRIVATE_KEY, '\x18Bitcoin Signed Message:\n');
    const ltcSig = signUtxoMessage(message, PRIVATE_KEY, '\x19Litecoin Signed Message:\n');
    expect(btcSig).not.toBe(ltcSig);
  });
});

// ---------------------------------------------------------------------------
// Cross-validation: EVM vs UTXO use the same key but different schemes
// ---------------------------------------------------------------------------

describe('Cross-scheme', () => {
  it('EVM and UTXO signatures differ for the same message and key', () => {
    const message = 'Hello';
    const evmSig = signEvmMessage(message, PRIVATE_KEY);
    const utxoSig = signUtxoMessage(message, PRIVATE_KEY);
    // They should not be equal (different hashing schemes)
    expect(evmSig).not.toBe(utxoSig);
  });
});
