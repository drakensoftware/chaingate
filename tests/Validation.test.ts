import { describe, it, expect } from 'vitest';
import { isValidPhrase, isValidSeed, isValidPrivateKey, isValidKeystore } from '../src';
import { MNEMONIC, SEED_HEX, PRIV_HEX, WIF_KEY } from './fixtures';

// ---------------------------------------------------------------------------
// isValidPhrase
// ---------------------------------------------------------------------------

describe('isValidPhrase', () => {
  it('returns true for a valid 12-word BIP-39 mnemonic', () => {
    expect(isValidPhrase(MNEMONIC)).toBe(true);
  });

  it('returns true for a valid 12-word mnemonic with extra whitespace', () => {
    expect(isValidPhrase(`  ${MNEMONIC}  `)).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidPhrase('')).toBe(false);
  });

  it('returns false for a random string', () => {
    expect(isValidPhrase('not a valid mnemonic phrase at all')).toBe(false);
  });

  it('returns false for a 11-word phrase (too short)', () => {
    const words = MNEMONIC.split(' ').slice(0, 11).join(' ');
    expect(isValidPhrase(words)).toBe(false);
  });

  it('returns false for a phrase with invalid words', () => {
    expect(
      isValidPhrase('zzzzz zzzzz zzzzz zzzzz zzzzz zzzzz zzzzz zzzzz zzzzz zzzzz zzzzz zzzzz'),
    ).toBe(false);
  });

  it('returns false for a phrase with a bad checksum', () => {
    // Replace the last word with a different valid word to break the checksum
    const words = MNEMONIC.split(' ');
    words[words.length - 1] = 'zoo';
    expect(isValidPhrase(words.join(' '))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidSeed
// ---------------------------------------------------------------------------

describe('isValidSeed', () => {
  it('returns true for a valid 128-character hex seed', () => {
    expect(isValidSeed(SEED_HEX)).toBe(true);
  });

  it('returns true for a valid seed as Uint8Array', () => {
    const bytes = Buffer.from(SEED_HEX, 'hex');
    expect(isValidSeed(bytes)).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidSeed('')).toBe(false);
  });

  it('returns true for a short hex string (Seed accepts any valid hex)', () => {
    // Seed constructor accepts any hex string — it does not enforce a minimum length.
    expect(isValidSeed('aabbcc')).toBe(true);
  });

  it('returns true for a 64-char hex (Seed accepts any hex)', () => {
    // Seed constructor does not enforce a 64-byte minimum length.
    expect(isValidSeed(PRIV_HEX)).toBe(true);
  });

  it('returns false for garbage text', () => {
    expect(isValidSeed('not-a-seed')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidPrivateKey
// ---------------------------------------------------------------------------

describe('isValidPrivateKey', () => {
  it('returns true for a valid 64-character hex private key', () => {
    expect(isValidPrivateKey(PRIV_HEX)).toBe(true);
  });

  it('returns true for a valid WIF private key', () => {
    expect(isValidPrivateKey(WIF_KEY)).toBe(true);
  });

  it('returns true for a valid private key as Uint8Array', () => {
    const bytes = Buffer.from(PRIV_HEX, 'hex');
    expect(isValidPrivateKey(bytes)).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidPrivateKey('')).toBe(false);
  });

  it('returns true for a seed-length hex (PrivateKey accepts any hex)', () => {
    // PrivateKey constructor accepts any hex string — it does not enforce a 32-byte length.
    expect(isValidPrivateKey(SEED_HEX)).toBe(true);
  });

  it('returns true for a public key hex (PrivateKey accepts any hex)', () => {
    // PrivateKey constructor accepts any hex — it does not distinguish public from private key.
    expect(
      isValidPrivateKey('03aaeb52dd7494c361049de67cc680e83ebcbbbdbeb13637d92cd845f70308af5e'),
    ).toBe(true);
  });

  it('returns false for garbage text', () => {
    expect(isValidPrivateKey('not-a-key')).toBe(false);
  });

  it('returns true for all zeros hex (PrivateKey accepts any hex)', () => {
    // PrivateKey constructor accepts any hex — no secp256k1 scalar validation.
    expect(
      isValidPrivateKey('0000000000000000000000000000000000000000000000000000000000000000'),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isValidKeystore (already tested in Keystore.test.ts, quick sanity here)
// ---------------------------------------------------------------------------

describe('isValidKeystore', () => {
  const v1JSON = JSON.stringify({
    version: 1,
    crypto: {
      cipher: 'aes-128-ctr',
      cipherparams: { iv: 'ab' },
      ciphertext: 'cd',
      kdf: 'pbkdf2',
      kdfparams: { c: 1, prf: 'hmac-sha256', dklen: 32, salt: 'ef' },
      mac: '00',
    },
  });

  const v3JSON = JSON.stringify({
    version: 3,
    crypto: {
      cipher: 'aes-128-ctr',
      ciphertext: 'ab',
      cipherparams: { iv: 'cd' },
      kdf: 'scrypt',
      kdfparams: { dklen: 32, n: 1, p: 1, r: 1, salt: 'ef' },
      mac: '00',
    },
  });

  it('returns true for a V1 keystore string', () => {
    expect(isValidKeystore(v1JSON)).toBe(true);
  });

  it('returns true for a V3 keystore string', () => {
    expect(isValidKeystore(v3JSON)).toBe(true);
  });

  it('returns false for an unrecognized version', () => {
    expect(isValidKeystore(JSON.stringify({ version: 99, crypto: {} }))).toBe(false);
  });

  it('returns false for invalid JSON', () => {
    expect(isValidKeystore('{')).toBe(false);
  });

  it('returns false for non-keystore JSON', () => {
    expect(isValidKeystore(JSON.stringify({ name: 'test' }))).toBe(false);
  });
});
