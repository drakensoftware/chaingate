import { describe, it, expect } from 'vitest';
import {
  isHex,
  hexToBytes,
  bytesToHex,
  isBase58,
  privateKeyToPublicKey,
  compressPublicKey,
} from '../src/utils';
import { InvalidHexError } from '../src';
import { PRIV_HEX, PUB_HEX } from './fixtures';

describe('isHex', () => {
  it('returns true for valid hex', () => {
    expect(isHex('aabb')).toBe(true);
    expect(isHex('AABB')).toBe(true);
    expect(isHex('0xaabb')).toBe(true);
  });

  it('returns false for odd length', () => {
    expect(isHex('abc')).toBe(false);
  });

  it('returns false for non-hex characters', () => {
    expect(isHex('zzzz')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isHex('')).toBe(false);
    expect(isHex('0x')).toBe(false);
  });
});

describe('hexToBytes', () => {
  it('converts hex to bytes', () => {
    expect(hexToBytes('aabb')).toEqual(new Uint8Array([0xaa, 0xbb]));
  });

  it('handles 0x prefix', () => {
    expect(hexToBytes('0xaabb')).toEqual(new Uint8Array([0xaa, 0xbb]));
  });

  it('throws InvalidHexError for odd length', () => {
    expect(() => hexToBytes('abc')).toThrow(InvalidHexError);
  });
});

describe('bytesToHex', () => {
  it('converts bytes to hex', () => {
    expect(bytesToHex(new Uint8Array([0xaa, 0xbb]))).toBe('aabb');
  });

  it('pads single-digit bytes', () => {
    expect(bytesToHex(new Uint8Array([0x01, 0x0f]))).toBe('010f');
  });
});

describe('isBase58', () => {
  it('returns true for valid base58', () => {
    expect(isBase58('5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ')).toBe(true);
  });

  it('returns false for strings with 0, O, I, l', () => {
    expect(isBase58('0abc')).toBe(false);
    expect(isBase58('Oabc')).toBe(false);
    expect(isBase58('Iabc')).toBe(false);
    expect(isBase58('labc')).toBe(false);
  });
});

describe('privateKeyToPublicKey', () => {
  it('returns compressed public key from private key bytes', () => {
    const privBytes = hexToBytes(PRIV_HEX);
    const pubBytes = privateKeyToPublicKey(privBytes);
    expect(pubBytes).toBeInstanceOf(Uint8Array);
    expect(pubBytes.length).toBe(33);
    expect(bytesToHex(pubBytes)).toBe(PUB_HEX);
  });
});

describe('compressPublicKey', () => {
  it('returns compressed key from already-compressed input', () => {
    const compressed = hexToBytes(PUB_HEX);
    const result = compressPublicKey(compressed);
    expect(result.length).toBe(33);
    expect(bytesToHex(result)).toBe(PUB_HEX);
  });

  it('is idempotent on output of privateKeyToPublicKey', () => {
    const pub = privateKeyToPublicKey(hexToBytes(PRIV_HEX));
    expect(bytesToHex(compressPublicKey(pub))).toBe(PUB_HEX);
  });

  it('throws for invalid point', () => {
    const badPoint = hexToBytes('03' + 'ff'.repeat(32));
    expect(() => compressPublicKey(badPoint)).toThrow();
  });
});
