import { describe, it, expect } from 'vitest';
import { PrivateKey, InvalidPrivateKeyError } from '../src';
import { PRIV_HEX, WIF_KEY, PUB_HEX } from './fixtures';

describe('PrivateKey', () => {
  describe('from Uint8Array', () => {
    it('accepts raw bytes', () => {
      const bytes = Buffer.from(PRIV_HEX, 'hex');
      const pk = new PrivateKey(new Uint8Array(bytes));
      expect(pk.hex).toBe(PRIV_HEX);
    });
  });

  describe('from hex string', () => {
    it('accepts hex', () => {
      const pk = new PrivateKey(PRIV_HEX);
      expect(pk.hex).toBe(PRIV_HEX);
    });

    it('accepts 0x-prefixed hex', () => {
      const pk = new PrivateKey('0x' + PRIV_HEX);
      expect(pk.hex).toBe(PRIV_HEX);
    });
  });

  describe('from WIF', () => {
    it('accepts WIF and decodes correctly', () => {
      const pk = new PrivateKey(WIF_KEY);
      expect(pk.hex).toBe(PRIV_HEX);
    });
  });

  describe('properties', () => {
    it('raw returns Uint8Array', () => {
      const pk = new PrivateKey(PRIV_HEX);
      expect(pk.raw).toBeInstanceOf(Uint8Array);
      expect(pk.raw.length).toBe(32);
    });

    it('publicKey returns compressed public key', () => {
      const pk = new PrivateKey(PRIV_HEX);
      expect(Buffer.from(pk.publicKey).toString('hex')).toBe(PUB_HEX);
    });

    it('getWif returns WIF-encoded key', () => {
      const pk = new PrivateKey(PRIV_HEX);
      expect(pk.getWif()).toBe(WIF_KEY);
    });
  });

  describe('errors', () => {
    it('throws InvalidPrivateKeyError for invalid format', () => {
      expect(() => new PrivateKey('not-a-key')).toThrow(InvalidPrivateKeyError);
    });

    it('throws InvalidPrivateKeyError for invalid WIF', () => {
      // Valid base58 but not a valid WIF (too short, bad checksum)
      expect(() => new PrivateKey('5HueCGU')).toThrow(InvalidPrivateKeyError);
    });
  });
});
