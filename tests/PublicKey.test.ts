import { describe, it, expect } from 'vitest';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { PublicKey, InvalidPublicKeyError } from '../src';
import { PUB_HEX } from './fixtures';

describe('PublicKey', () => {
  describe('from compressed hex', () => {
    it('accepts 66-char compressed hex', () => {
      const pk = new PublicKey(PUB_HEX);
      expect(pk.hex).toBe(PUB_HEX);
    });

    it('accepts 0x-prefixed compressed hex', () => {
      const pk = new PublicKey('0x' + PUB_HEX);
      expect(pk.hex).toBe(PUB_HEX);
    });
  });

  describe('from uncompressed hex', () => {
    it('accepts 130-char uncompressed hex and stores compressed', () => {
      const point = secp256k1.Point.fromHex(PUB_HEX);
      const uncompressed = point.toHex(false);
      expect(uncompressed.length).toBe(130);

      const pk = new PublicKey(uncompressed);
      expect(pk.hex).toBe(PUB_HEX);
    });
  });

  describe('from Uint8Array', () => {
    it('accepts 33-byte compressed key', () => {
      const bytes = Buffer.from(PUB_HEX, 'hex');
      const pk = new PublicKey(new Uint8Array(bytes));
      expect(pk.hex).toBe(PUB_HEX);
    });

    it('accepts 65-byte uncompressed key and stores compressed', () => {
      const point = secp256k1.Point.fromHex(PUB_HEX);
      const uncompressed = point.toBytes(false);
      expect(uncompressed.length).toBe(65);

      const pk = new PublicKey(uncompressed);
      expect(pk.hex).toBe(PUB_HEX);
    });
  });

  describe('properties', () => {
    it('raw returns 33-byte Uint8Array', () => {
      const pk = new PublicKey(PUB_HEX);
      expect(pk.raw).toBeInstanceOf(Uint8Array);
      expect(pk.raw.length).toBe(33);
    });

    it('hex returns compressed hex string', () => {
      const pk = new PublicKey(PUB_HEX);
      expect(pk.hex).toBe(PUB_HEX);
      expect(pk.hex.length).toBe(66);
    });
  });

  describe('errors', () => {
    it('throws InvalidPublicKeyError for invalid format', () => {
      expect(() => new PublicKey('not-a-key')).toThrow(InvalidPublicKeyError);
    });

    it('throws InvalidPublicKeyError for wrong byte length', () => {
      const tooShort = 'aabb';
      expect(() => new PublicKey(tooShort)).toThrow(InvalidPublicKeyError);
      expect(() => new PublicKey(tooShort)).toThrow(/Invalid public key length/);
    });

    it('throws InvalidPublicKeyError for invalid point', () => {
      // 33 bytes but not a valid secp256k1 point
      const badPoint = '03' + 'ff'.repeat(32);
      expect(() => new PublicKey(badPoint)).toThrow(InvalidPublicKeyError);
      expect(() => new PublicKey(badPoint)).toThrow(/not a valid secp256k1 point/);
    });
  });
});
