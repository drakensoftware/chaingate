import { describe, it, expect } from 'vitest';
import { Seed, InvalidSeedError } from '../src';
import { SEED_HEX } from './fixtures';

describe('Seed', () => {
  describe('constructor', () => {
    it('accepts hex string', () => {
      const seed = new Seed(SEED_HEX);
      expect(seed.hex).toBe(SEED_HEX);
    });

    it('accepts 0x-prefixed hex', () => {
      const seed = new Seed('0x' + SEED_HEX);
      expect(seed.hex).toBe(SEED_HEX);
    });

    it('accepts Uint8Array', () => {
      const bytes = Buffer.from(SEED_HEX, 'hex');
      const seed = new Seed(new Uint8Array(bytes));
      expect(seed.hex).toBe(SEED_HEX);
    });

    it('throws InvalidSeedError for non-hex string', () => {
      expect(() => new Seed('not-hex')).toThrow(InvalidSeedError);
    });
  });

  describe('properties', () => {
    it('raw returns Uint8Array', () => {
      const seed = new Seed(SEED_HEX);
      expect(seed.raw).toBeInstanceOf(Uint8Array);
      expect(seed.raw.length).toBe(64);
    });

    it('hex returns hex string', () => {
      const seed = new Seed(SEED_HEX);
      expect(seed.hex).toBe(SEED_HEX);
    });
  });
});
