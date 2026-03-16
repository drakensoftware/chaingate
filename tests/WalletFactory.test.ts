import { describe, it, expect } from 'vitest';
import {
  detectWalletImportType,
  newWallet,
  importWallet,
  isValidSerialized,
  deserializeWallet,
  createWalletFromString,
  PhraseWallet,
  SeedWallet,
  XprivWallet,
  PrivateKeyWallet,
  XpubWallet,
  PublicKeyWallet,
  UnrecognizedFormatError,
  InvalidWalletExportError,
} from '../src';
import {
  MNEMONIC,
  SEED_HEX,
  PRIV_HEX,
  WIF_KEY,
  MASTER_XPRIV as XPRIV,
  EXPECTED_XPUB as XPUB,
  PUB_HEX,
} from './fixtures';

describe('detectWalletImportType', () => {
  it('detects phrase', () => {
    expect(detectWalletImportType(MNEMONIC)).toBe('phrase');
  });

  it('detects xpriv', () => {
    expect(detectWalletImportType(XPRIV)).toBe('xpriv');
  });

  it('detects xpub', () => {
    expect(detectWalletImportType(XPUB)).toBe('xpub');
  });

  it('detects seed (128-char hex)', () => {
    expect(detectWalletImportType(SEED_HEX)).toBe('seed');
  });

  it('detects privateKey (64-char hex)', () => {
    expect(detectWalletImportType(PRIV_HEX)).toBe('privateKey');
  });

  it('detects publicKey (66-char compressed hex)', () => {
    expect(detectWalletImportType(PUB_HEX)).toBe('publicKey');
  });

  it('detects publicKey (130-char uncompressed hex)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { secp256k1 } = require('@noble/curves/secp256k1.js');
    const point = secp256k1.Point.fromHex(PUB_HEX);
    const uncompressed = point.toHex(false);
    expect(detectWalletImportType(uncompressed)).toBe('publicKey');
  });

  it('detects WIF', () => {
    expect(detectWalletImportType(WIF_KEY)).toBe('wif');
  });

  it('handles whitespace', () => {
    expect(detectWalletImportType(`  ${MNEMONIC}  `)).toBe('phrase');
  });

  it('throws UnrecognizedFormatError for garbage', () => {
    expect(() => detectWalletImportType('not-a-valid-input!!!')).toThrow(UnrecognizedFormatError);
  });

  it('throws for hex with invalid length', () => {
    expect(() => detectWalletImportType('aabb')).toThrow(UnrecognizedFormatError);
    expect(() => detectWalletImportType('aabb')).toThrow(/expected 64.*66.*128.*130.*got 4/);
  });

  it('throws for xpriv with invalid length', () => {
    expect(() => detectWalletImportType('xprvTooShort')).toThrow(UnrecognizedFormatError);
    expect(() => detectWalletImportType('xprvTooShort')).toThrow(/Invalid xpriv/);
  });

  it('throws for xpub with invalid length', () => {
    expect(() => detectWalletImportType('xpubTooShort')).toThrow(UnrecognizedFormatError);
    expect(() => detectWalletImportType('xpubTooShort')).toThrow(/Invalid xpub/);
  });

  it('throws for base58 with invalid WIF length', () => {
    expect(() => detectWalletImportType('abc')).toThrow(UnrecognizedFormatError);
    expect(() => detectWalletImportType('abc')).toThrow(/Invalid WIF/);
  });
});

describe('newWallet', () => {
  it('returns a phrase string and a PhraseWallet', () => {
    const { phrase, wallet } = newWallet();
    expect(typeof phrase).toBe('string');
    expect(phrase.split(/\s+/).length).toBe(12);
    expect(wallet).toBeInstanceOf(PhraseWallet);
  });

  it('generates a 24-word wallet when requested', () => {
    const { phrase, wallet } = newWallet('english', 24);
    expect(phrase.split(/\s+/).length).toBe(24);
    expect(wallet).toBeInstanceOf(PhraseWallet);
  });

  it('the returned phrase can re-import the same wallet', async () => {
    const { phrase, wallet } = newWallet();
    const reimported = importWallet({ phrase });
    expect(reimported).toBeInstanceOf(PhraseWallet);
    const origSerialized = (await wallet.serialize({ acknowledge: true })) as { phrase: string };
    const reimportedSerialized = (await reimported.serialize({ acknowledge: true })) as {
      phrase: string;
    };
    expect(origSerialized.phrase).toEqual(reimportedSerialized.phrase);
  });
});

describe('importWallet', () => {
  it('creates PhraseWallet from phrase', () => {
    const wallet = importWallet({ phrase: MNEMONIC });
    expect(wallet).toBeInstanceOf(PhraseWallet);
  });

  it('creates SeedWallet from seed hex', () => {
    const wallet = importWallet({ seed: SEED_HEX });
    expect(wallet).toBeInstanceOf(SeedWallet);
  });

  it('creates SeedWallet from seed Uint8Array', () => {
    const wallet = importWallet({ seed: Buffer.from(SEED_HEX, 'hex') });
    expect(wallet).toBeInstanceOf(SeedWallet);
  });

  it('creates XprivWallet from xpriv', () => {
    const wallet = importWallet({ xpriv: XPRIV });
    expect(wallet).toBeInstanceOf(XprivWallet);
  });

  it('creates PrivateKeyWallet from hex', () => {
    const wallet = importWallet({ privateKey: PRIV_HEX });
    expect(wallet).toBeInstanceOf(PrivateKeyWallet);
  });

  it('creates XpubWallet from xpub', () => {
    const wallet = importWallet({ xpub: XPUB });
    expect(wallet).toBeInstanceOf(XpubWallet);
  });

  it('creates PublicKeyWallet from publicKey hex', () => {
    const wallet = importWallet({ publicKey: PUB_HEX });
    expect(wallet).toBeInstanceOf(PublicKeyWallet);
  });

  it('creates PublicKeyWallet from publicKey Uint8Array', () => {
    const wallet = importWallet({ publicKey: Buffer.from(PUB_HEX, 'hex') });
    expect(wallet).toBeInstanceOf(PublicKeyWallet);
  });
});

describe('isValidSerialized', () => {
  it('returns true for valid phrase data', () => {
    expect(isValidSerialized({ type: 'phrase', phrase: MNEMONIC })).toBe(true);
  });

  it('returns true for valid seed data', () => {
    expect(isValidSerialized({ type: 'seed', seed: SEED_HEX })).toBe(true);
  });

  it('returns true for valid xpriv data', () => {
    expect(isValidSerialized({ type: 'xpriv', xpriv: XPRIV })).toBe(true);
  });

  it('returns true for valid privateKey data', () => {
    expect(isValidSerialized({ type: 'privateKey', privateKey: PRIV_HEX })).toBe(true);
  });

  it('returns true for valid xpub data', () => {
    expect(isValidSerialized({ type: 'xpub', xpub: XPUB })).toBe(true);
  });

  it('returns true for valid publicKey data', () => {
    expect(isValidSerialized({ type: 'publicKey', publicKey: PUB_HEX })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidSerialized(null)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isValidSerialized('string')).toBe(false);
    expect(isValidSerialized(42)).toBe(false);
  });

  it('returns false for missing type', () => {
    expect(isValidSerialized({ phrase: MNEMONIC })).toBe(false);
  });

  it('returns false for unknown type', () => {
    expect(isValidSerialized({ type: 'unknown', value: 'abc' })).toBe(false);
  });

  it('returns false for missing value key', () => {
    expect(isValidSerialized({ type: 'phrase' })).toBe(false);
    expect(isValidSerialized({ type: 'seed' })).toBe(false);
    expect(isValidSerialized({ type: 'privateKey' })).toBe(false);
    expect(isValidSerialized({ type: 'xpub' })).toBe(false);
    expect(isValidSerialized({ type: 'publicKey' })).toBe(false);
  });

  it('returns false for empty value', () => {
    expect(isValidSerialized({ type: 'phrase', phrase: '' })).toBe(false);
  });

  it('returns false for non-string value', () => {
    expect(isValidSerialized({ type: 'phrase', phrase: 123 })).toBe(false);
  });
});

describe('deserializeWallet', () => {
  it('throws InvalidWalletExportError for invalid data', () => {
    expect(() => deserializeWallet(null)).toThrow(InvalidWalletExportError);
    expect(() => deserializeWallet({})).toThrow(InvalidWalletExportError);
    expect(() => deserializeWallet({ type: 'phrase' })).toThrow(InvalidWalletExportError);
    expect(() => deserializeWallet('garbage')).toThrow(InvalidWalletExportError);
  });

  it('deserializes PhraseWallet', async () => {
    const wallet = deserializeWallet({ type: 'phrase', phrase: MNEMONIC });
    expect(wallet).toBeInstanceOf(PhraseWallet);
    expect(await wallet.serialize({ acknowledge: true })).toMatchObject({
      type: 'phrase',
      phrase: MNEMONIC,
    });
  });

  it('deserializes SeedWallet', async () => {
    const wallet = deserializeWallet({ type: 'seed', seed: SEED_HEX });
    expect(wallet).toBeInstanceOf(SeedWallet);
    expect(await wallet.serialize({ acknowledge: true })).toMatchObject({
      type: 'seed',
      seed: SEED_HEX,
    });
  });

  it('deserializes XprivWallet', async () => {
    const wallet = deserializeWallet({ type: 'xpriv', xpriv: XPRIV });
    expect(wallet).toBeInstanceOf(XprivWallet);
    expect(await wallet.serialize({ acknowledge: true })).toMatchObject({
      type: 'xpriv',
      xpriv: XPRIV,
    });
  });

  it('deserializes PrivateKeyWallet', async () => {
    const wallet = deserializeWallet({ type: 'privateKey', privateKey: PRIV_HEX });
    expect(wallet).toBeInstanceOf(PrivateKeyWallet);
    expect(await wallet.serialize({ acknowledge: true })).toMatchObject({
      type: 'privateKey',
      privateKey: PRIV_HEX,
    });
  });

  it('deserializes XpubWallet', async () => {
    const wallet = deserializeWallet({ type: 'xpub', xpub: XPUB });
    expect(wallet).toBeInstanceOf(XpubWallet);
    expect(await wallet.serialize()).toEqual({ type: 'xpub', xpub: XPUB });
  });

  it('deserializes PublicKeyWallet', async () => {
    const wallet = deserializeWallet({ type: 'publicKey', publicKey: PUB_HEX });
    expect(wallet).toBeInstanceOf(PublicKeyWallet);
    expect(await wallet.serialize()).toEqual({ type: 'publicKey', publicKey: PUB_HEX });
  });

  it('roundtrips: serialize -> deserialize -> serialize (unencrypted)', async () => {
    const original = importWallet({ phrase: MNEMONIC });
    const serialized = await original.serialize({ acknowledge: true });
    const restored = deserializeWallet(serialized);
    expect(await restored.serialize({ acknowledge: true })).toEqual(serialized);
  });

  it('roundtrips: serialize -> deserialize -> serialize (view-only xpub)', async () => {
    const original = importWallet({ xpub: XPUB });
    const serialized = await original.serialize();
    const restored = deserializeWallet(serialized);
    expect(await restored.serialize()).toEqual(serialized);
  });

  it('roundtrips: serialize -> deserialize -> serialize (view-only publicKey)', async () => {
    const original = importWallet({ publicKey: PUB_HEX });
    const serialized = await original.serialize();
    const restored = deserializeWallet(serialized);
    expect(await restored.serialize()).toEqual(serialized);
  });
});

describe('createWalletFromString', () => {
  it('creates PhraseWallet from mnemonic', () => {
    const wallet = createWalletFromString(MNEMONIC);
    expect(wallet).toBeInstanceOf(PhraseWallet);
  });

  it('creates SeedWallet from seed hex', () => {
    const wallet = createWalletFromString(SEED_HEX);
    expect(wallet).toBeInstanceOf(SeedWallet);
  });

  it('creates PrivateKeyWallet from private key hex', () => {
    const wallet = createWalletFromString(PRIV_HEX);
    expect(wallet).toBeInstanceOf(PrivateKeyWallet);
  });

  it('creates PrivateKeyWallet from WIF', () => {
    const wallet = createWalletFromString(WIF_KEY);
    expect(wallet).toBeInstanceOf(PrivateKeyWallet);
  });

  it('creates XprivWallet from xpriv', () => {
    const wallet = createWalletFromString(XPRIV);
    expect(wallet).toBeInstanceOf(XprivWallet);
  });

  it('creates XpubWallet from xpub', () => {
    const wallet = createWalletFromString(XPUB);
    expect(wallet).toBeInstanceOf(XpubWallet);
  });

  it('creates PublicKeyWallet from compressed public key hex', () => {
    const wallet = createWalletFromString(PUB_HEX);
    expect(wallet).toBeInstanceOf(PublicKeyWallet);
  });
});
