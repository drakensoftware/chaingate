import { describe, it, expect } from 'vitest';
import { Phrase, InvalidPhraseError, Seed } from '../src';
import { MNEMONIC, SEED_HEX } from './fixtures';

describe('Phrase', () => {
  describe('constructor', () => {
    it('accepts a valid 12-word english mnemonic', () => {
      const phrase = new Phrase(MNEMONIC);
      expect(phrase.words).toHaveLength(12);
    });

    it('trims whitespace', () => {
      const phrase = new Phrase(`  ${MNEMONIC}  `);
      expect(phrase.words).toHaveLength(12);
    });

    it('throws InvalidPhraseError for empty string', () => {
      expect(() => new Phrase('')).toThrow(InvalidPhraseError);
      expect(() => new Phrase('   ')).toThrow(InvalidPhraseError);
    });

    it('throws InvalidPhraseError for wrong word count', () => {
      expect(() => new Phrase('abandon abandon abandon')).toThrow(InvalidPhraseError);
      expect(() => new Phrase('abandon abandon abandon')).toThrow(
        /must be 12, 15, 18, 21, 24 words/,
      );
    });

    it('throws InvalidPhraseError for invalid words', () => {
      const bad =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon xyz';
      expect(() => new Phrase(bad)).toThrow(InvalidPhraseError);
      expect(() => new Phrase(bad)).toThrow(/Invalid mnemonic phrase/);
    });
  });

  describe('properties', () => {
    it('words returns array of words', () => {
      const phrase = new Phrase(MNEMONIC);
      expect(phrase.words[0]).toBe('abandon');
      expect(phrase.words[11]).toBe('about');
    });

    it('raw returns UTF-8 encoded bytes', () => {
      const phrase = new Phrase(MNEMONIC);
      const decoded = new TextDecoder().decode(phrase.raw);
      expect(decoded).toBe(MNEMONIC);
    });

    it('hex returns hex-encoded UTF-8 bytes', () => {
      const phrase = new Phrase(MNEMONIC);
      expect(phrase.hex).toBe(
        Array.from(new TextEncoder().encode(MNEMONIC))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
      );
    });
  });

  describe('getSeed', () => {
    it('returns a Seed instance', () => {
      const phrase = new Phrase(MNEMONIC);
      const seed = phrase.getSeed();
      expect(seed).toBeInstanceOf(Seed);
    });

    it('returns deterministic seed', () => {
      const phrase = new Phrase(MNEMONIC);
      expect(phrase.getSeed().hex).toBe(SEED_HEX);
    });
  });

  describe('Phrase.new', () => {
    it('generates a valid 12-word phrase by default', () => {
      const phrase = Phrase.new();
      expect(phrase.words).toHaveLength(12);
      expect(Phrase.isValid(phrase.words.join(' '))).toBe(true);
    });

    it('generates a valid 24-word phrase', () => {
      const phrase = Phrase.new('english', 24);
      expect(phrase.words).toHaveLength(24);
    });

    it('generates valid phrases in other languages', () => {
      const phrase = Phrase.new('spanish');
      expect(phrase.words).toHaveLength(12);
      expect(Phrase.isValid(phrase.words.join(' '))).toBe(true);
    });
  });

  describe('Phrase.isValid', () => {
    it('returns true for valid mnemonic', () => {
      expect(Phrase.isValid(MNEMONIC)).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(Phrase.isValid('')).toBe(false);
    });

    it('returns false for wrong word count', () => {
      expect(Phrase.isValid('abandon abandon')).toBe(false);
    });

    it('returns false for invalid words', () => {
      expect(
        Phrase.isValid('foo bar baz qux quux corge grault garply waldo fred plugh xyzzy'),
      ).toBe(false);
    });
  });
});
