import { describe, it, expect, vi } from 'vitest';
import {
  PhraseWallet,
  Phrase,
  SeedWallet,
  Seed,
  XprivWallet,
  Xpriv,
  DerivedPublicKey,
  deserializeWallet,
  commonDerivationPaths,
} from '../src';
import {
  MNEMONIC,
  SEED_HEX,
  DERIVATION_PATH,
  EXPECTED_XPUB,
  PASSWORD,
  MASTER_XPRIV,
} from './fixtures';

// A path that is NOT in commonDerivationPaths and therefore not pre-cached
const UNCACHED_PATH = "m/44'/99'/0'/0/0";

describe('derivePublicKey', () => {
  describe('returns correct data', () => {
    it('returns a DerivedPublicKey instance', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      const derived = await wallet.derivePublicKey(DERIVATION_PATH);
      expect(derived).toBeInstanceOf(DerivedPublicKey);
    });

    it('returns correct publicKey (33-byte compressed)', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      const derived = await wallet.derivePublicKey(DERIVATION_PATH);
      expect(derived.publicKey).toBeInstanceOf(Uint8Array);
      expect(derived.publicKey.length).toBe(33);
    });

    it('returns correct xpub', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      const derived = await wallet.derivePublicKey(DERIVATION_PATH);
      expect(derived.xpub).toBe(EXPECTED_XPUB);
    });

    it('does not expose private key properties', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      const derived = await wallet.derivePublicKey(DERIVATION_PATH);
      expect('privateKey' in derived).toBe(false);
      expect('xpriv' in derived).toBe(false);
    });
  });

  describe('consistency with derive()', () => {
    it('PhraseWallet: derivePublicKey matches derive() public data', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      const full = await wallet.derive(DERIVATION_PATH);
      const pub = await wallet.derivePublicKey(DERIVATION_PATH);
      expect(pub.publicKeyHex).toBe(full.publicKeyHex);
      expect(pub.xpub).toBe(full.xpub);
    });

    it('SeedWallet: derivePublicKey matches derive() public data', async () => {
      const wallet = new SeedWallet(new Seed(SEED_HEX));
      const full = await wallet.derive(DERIVATION_PATH);
      const pub = await wallet.derivePublicKey(DERIVATION_PATH);
      expect(pub.publicKeyHex).toBe(full.publicKeyHex);
      expect(pub.xpub).toBe(full.xpub);
    });

    it('XprivWallet: derivePublicKey matches derive() public data', async () => {
      const wallet = new XprivWallet(new Xpriv(MASTER_XPRIV));
      const full = await wallet.derive(DERIVATION_PATH);
      const pub = await wallet.derivePublicKey(DERIVATION_PATH);
      expect(pub.publicKeyHex).toBe(full.publicKeyHex);
      expect(pub.xpub).toBe(full.xpub);
    });
  });

  describe('cache behavior (unencrypted)', () => {
    it('pre-cached common paths return correct data without derivation', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      // commonDerivationPaths are populated in the constructor
      for (const path of commonDerivationPaths) {
        const pub = await wallet.derivePublicKey(path);
        expect(pub).toBeInstanceOf(DerivedPublicKey);
        expect(pub.publicKey.length).toBe(33);
        expect(pub.xpub).toMatch(/^xpub/);
      }
    });

    it('uncached path gets derived and then cached', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));

      // Confirm path is not in derivationIndex yet
      const indexBefore = wallet.derivationIndex;
      expect(indexBefore.find((e) => e.derivationPath === UNCACHED_PATH)).toBeUndefined();

      const derived = await wallet.derivePublicKey(UNCACHED_PATH);
      expect(derived).toBeInstanceOf(DerivedPublicKey);

      // Now it should be in the derivationIndex
      const indexAfter = wallet.derivationIndex;
      const entry = indexAfter.find((e) => e.derivationPath === UNCACHED_PATH);
      expect(entry).toBeDefined();
      expect(entry!.publicKey).toBe(derived.publicKeyHex);
      expect(entry!.xpub).toBe(derived.xpub);
    });

    it('calling derivePublicKey twice returns same data', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      const first = await wallet.derivePublicKey(UNCACHED_PATH);
      const second = await wallet.derivePublicKey(UNCACHED_PATH);
      expect(second.publicKeyHex).toBe(first.publicKeyHex);
      expect(second.xpub).toBe(first.xpub);
    });
  });

  describe('encrypted wallet — cached path skips decryption', () => {
    it('derivePublicKey on a pre-cached path does NOT call askForPassword', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      // Constructor pre-caches commonDerivationPaths.
      // DERIVATION_PATH ("m/44'/0'/0'/0/0") is in commonDerivationPaths.
      await wallet.encrypt(PASSWORD, async () => PASSWORD);

      const askFn = vi.fn(async () => PASSWORD);
      // Serialize and restore so askFn is the only password source
      const serialized = await wallet.serialize();
      const restored = deserializeWallet(serialized, askFn) as PhraseWallet;

      const derived = await restored.derivePublicKey(DERIVATION_PATH);
      expect(derived).toBeInstanceOf(DerivedPublicKey);
      expect(derived.xpub).toBe(EXPECTED_XPUB);

      // The critical assertion: askForPassword was never called
      expect(askFn).not.toHaveBeenCalled();
    });

    it('derivePublicKey on an uncached path DOES require decryption', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      await wallet.encrypt(PASSWORD, async () => PASSWORD);
      const serialized = await wallet.serialize();

      const askFn = vi.fn(async () => PASSWORD);
      const restored = deserializeWallet(serialized, askFn) as PhraseWallet;

      // UNCACHED_PATH is not in commonDerivationPaths, so it requires decryption
      const derived = await restored.derivePublicKey(UNCACHED_PATH);
      expect(derived).toBeInstanceOf(DerivedPublicKey);
      expect(askFn).toHaveBeenCalledTimes(1);
    });

    it('derivePublicKey works after encrypt() without deserialization', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      // Get expected value before encryption
      const expected = await wallet.derivePublicKey(DERIVATION_PATH);

      await wallet.encrypt(PASSWORD, async () => PASSWORD);

      // Cached path should still work without password prompt
      const derived = await wallet.derivePublicKey(DERIVATION_PATH);
      expect(derived.publicKeyHex).toBe(expected.publicKeyHex);
      expect(derived.xpub).toBe(expected.xpub);
    });
  });

  describe('encrypted roundtrip — serialize/deserialize preserves cache', () => {
    it('derivePublicKey returns same data after encrypt+serialize+deserialize', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));
      const before = await wallet.derivePublicKey(DERIVATION_PATH);

      await wallet.encrypt(PASSWORD, async () => PASSWORD);
      const serialized = await wallet.serialize();
      const restored = deserializeWallet(serialized, async () => PASSWORD) as PhraseWallet;

      const after = await restored.derivePublicKey(DERIVATION_PATH);
      expect(after.publicKeyHex).toBe(before.publicKeyHex);
      expect(after.xpub).toBe(before.xpub);
    });

    it('derive() after derivePublicKey() on previously uncached path also populates cache', async () => {
      const wallet = new PhraseWallet(new Phrase(MNEMONIC));

      // First call caches it via derive()
      const full = await wallet.derive(UNCACHED_PATH);

      // Second call should hit the cache
      const pub = await wallet.derivePublicKey(UNCACHED_PATH);
      expect(pub.publicKeyHex).toBe(full.publicKeyHex);
      expect(pub.xpub).toBe(full.xpub);
    });
  });
});
