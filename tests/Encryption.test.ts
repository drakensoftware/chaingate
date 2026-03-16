import { describe, it, expect, vi } from 'vitest';
import {
  PhraseWallet,
  Phrase,
  SeedWallet,
  Seed,
  XprivWallet,
  Xpriv,
  PrivateKeyWallet,
  PrivateKey,
  DecryptionCancelledError,
  EncryptedAccessError,
  deserializeWallet,
  isValidSerialized,
  InvalidWalletExportError,
} from '../src';
import {
  MNEMONIC,
  SEED_HEX,
  PRIV_HEX,
  PUB_HEX,
  MASTER_XPRIV as XPRIV,
  DERIVATION_PATH,
  PASSWORD,
} from './fixtures';

describe('PhraseWallet encryption', () => {
  it('encrypted is false before encrypt', () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    expect(wallet.encrypted).toBe(false);
  });

  it('encrypted is true after encrypt', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    expect(wallet.encrypted).toBe(true);
  });

  it('throws if encrypt is called twice', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    await expect(wallet.encrypt(PASSWORD, async () => PASSWORD)).rejects.toThrow(
      'Already encrypted',
    );
  });

  it('serialize returns encrypted data after encryption', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize({ acknowledge: true });
    expect(serialized.type).toBe('phrase');
    expect('ciphertext' in serialized && typeof serialized.ciphertext).toBe('string');
    expect('iv' in serialized && typeof serialized.iv).toBe('string');
  });

  it('getPhrase works after encryption', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const phrase = await wallet.getPhrase();
    expect(phrase.words.join(' ')).toBe(MNEMONIC);
  });

  it('getPhrase returns a copy when encrypted', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    const before = await wallet.getPhrase();
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const after = await wallet.getPhrase();
    expect(after.words.join(' ')).toBe(MNEMONIC);
    expect(after).not.toBe(before);
  });

  it('derive works after encryption', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.privateKey.hex).toBe(PRIV_HEX);
  });

  it('askForPassword is NOT called when derived key is cached', async () => {
    // After encrypt(), the PBKDF2-derived key is cached in memory, so
    // subsequent withDecrypted() calls never need to ask for the password.
    const askFn = vi.fn(async () => PASSWORD);
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, askFn);

    await wallet.derive(DERIVATION_PATH);
    await wallet.getPhrase();

    expect(askFn).toHaveBeenCalledTimes(0);
  });

  it('askForPassword is called once after deserialization then cached', async () => {
    // After deserialization there is no cached key, so the first
    // withDecrypted() must ask for the password and run PBKDF2.
    // Subsequent calls reuse the cached derived key.
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    const askFn = vi.fn(async () => PASSWORD);
    const restored = deserializeWallet(serialized, askFn) as PhraseWallet;

    await restored.getPhrase();
    await restored.derive(DERIVATION_PATH);

    // Only the first access triggers askForPassword; the second reuses the cache
    expect(askFn).toHaveBeenCalledTimes(1);
  });

  it('serialize does not ask for password when encrypted', async () => {
    const askFn = vi.fn(async () => PASSWORD);
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, askFn);

    await wallet.serialize({ acknowledge: true });

    expect(askFn).not.toHaveBeenCalled();
  });

  it('retries on wrong password then succeeds after deserialization', async () => {
    // Retry logic only applies when there is no cached key (after deserialization).
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    let attempts = 0;
    const restored = deserializeWallet(serialized, async () => {
      attempts++;
      return attempts >= 3 ? PASSWORD : 'wrong-password';
    }) as PhraseWallet;

    const phrase = await restored.getPhrase();
    expect(phrase.words.join(' ')).toBe(MNEMONIC);
    expect(attempts).toBe(3);
  });

  it('cancels with null and throws DecryptionCancelledError after deserialization', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    const restored = deserializeWallet(serialized, async () => null) as PhraseWallet;
    await expect(restored.getPhrase()).rejects.toThrow(DecryptionCancelledError);
  });

  it('retries wrong passwords then cancels with null after deserialization', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    let attempts = 0;
    const restored = deserializeWallet(serialized, async () => {
      attempts++;
      return attempts >= 3 ? null : 'wrong-password';
    }) as PhraseWallet;

    await expect(restored.getPhrase()).rejects.toThrow(DecryptionCancelledError);
    expect(attempts).toBe(3);
  });
});

describe('SeedWallet encryption', () => {
  it('serialize returns encrypted data after encryption', async () => {
    const wallet = new SeedWallet(new Seed(SEED_HEX));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize({ acknowledge: true });
    expect(serialized.type).toBe('seed');
    expect('ciphertext' in serialized && typeof serialized.ciphertext).toBe('string');
  });

  it('derive works after encryption', async () => {
    const wallet = new SeedWallet(new Seed(SEED_HEX));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.privateKey.hex).toBe(PRIV_HEX);
  });
});

describe('XprivWallet encryption', () => {
  it('serialize returns encrypted data after encryption', async () => {
    const wallet = new XprivWallet(new Xpriv(XPRIV));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize({ acknowledge: true });
    expect(serialized.type).toBe('xpriv');
    expect('ciphertext' in serialized && typeof serialized.ciphertext).toBe('string');
  });

  it('derive works after encryption', async () => {
    const wallet = new XprivWallet(new Xpriv(XPRIV));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.privateKey.hex).toBe(PRIV_HEX);
  });
});

describe('PrivateKeyWallet encryption', () => {
  it('serialize returns encrypted data after encryption', async () => {
    const wallet = new PrivateKeyWallet(new PrivateKey(PRIV_HEX));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize({ acknowledge: true });
    expect(serialized.type).toBe('privateKey');
    expect('ciphertext' in serialized && typeof serialized.ciphertext).toBe('string');
  });

  it('getPrivateKey works after encryption', async () => {
    const wallet = new PrivateKeyWallet(new PrivateKey(PRIV_HEX));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const pk = await wallet.getPrivateKey();
    expect(pk.hex).toBe(PRIV_HEX);
  });

  it('getPrivateKey returns a copy when encrypted', async () => {
    const wallet = new PrivateKeyWallet(new PrivateKey(PRIV_HEX));
    const before = await wallet.getPrivateKey();
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const after = await wallet.getPrivateKey();
    expect(after.hex).toBe(PRIV_HEX);
    expect(after).not.toBe(before);
  });

  it('getPublicKey works after encryption', async () => {
    const wallet = new PrivateKeyWallet(new PrivateKey(PRIV_HEX));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const pub = await wallet.getPublicKey();
    expect(pub.hex).toBe(PUB_HEX);
  });
});

describe('multiple access after encryption', () => {
  it('data remains encrypted between accesses', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);

    const first = await wallet.getPhrase();
    const second = await wallet.getPhrase();

    expect(first.words.join(' ')).toBe(second.words.join(' '));
    expect(wallet.encrypted).toBe(true);
  });
});

describe('encrypted serialize/deserialize roundtrip', () => {
  it('PhraseWallet: encrypt -> serialize -> deserialize -> getPhrase', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    expect(serialized.type).toBe('phrase');
    expect('ciphertext' in serialized && serialized.ciphertext).toBeDefined();

    const restored = deserializeWallet(serialized, async () => PASSWORD) as PhraseWallet;
    expect(restored).toBeInstanceOf(PhraseWallet);
    expect(restored.encrypted).toBe(true);

    const phrase = await restored.getPhrase();
    expect(phrase.words.join(' ')).toBe(MNEMONIC);
  });

  it('SeedWallet: encrypt -> serialize -> deserialize -> derive', async () => {
    const wallet = new SeedWallet(new Seed(SEED_HEX));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    const restored = deserializeWallet(serialized, async () => PASSWORD) as SeedWallet;
    expect(restored).toBeInstanceOf(SeedWallet);
    expect(restored.encrypted).toBe(true);

    const derived = await restored.derive(DERIVATION_PATH);
    expect(derived.privateKey.hex).toBe(PRIV_HEX);
  });

  it('XprivWallet: encrypt -> serialize -> deserialize -> derive', async () => {
    const wallet = new XprivWallet(new Xpriv(XPRIV));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    const restored = deserializeWallet(serialized, async () => PASSWORD) as XprivWallet;
    expect(restored).toBeInstanceOf(XprivWallet);
    expect(restored.encrypted).toBe(true);

    const derived = await restored.derive(DERIVATION_PATH);
    expect(derived.privateKey.hex).toBe(PRIV_HEX);
  });

  it('PrivateKeyWallet: encrypt -> serialize -> deserialize -> getPrivateKey', async () => {
    const wallet = new PrivateKeyWallet(new PrivateKey(PRIV_HEX));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    const restored = deserializeWallet(serialized, async () => PASSWORD) as PrivateKeyWallet;
    expect(restored).toBeInstanceOf(PrivateKeyWallet);
    expect(restored.encrypted).toBe(true);

    const pk = await restored.getPrivateKey();
    expect(pk.hex).toBe(PRIV_HEX);
  });

  it('isValidSerialized recognizes encrypted data', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    expect(isValidSerialized(serialized)).toBe(true);
  });

  it('isValidSerialized rejects invalid encrypted data', () => {
    expect(isValidSerialized({ type: 'phrase', ciphertext: 'aa' })).toBe(false);
    expect(isValidSerialized({ type: 'phrase', ciphertext: '', iv: 'cc' })).toBe(false);
    expect(isValidSerialized({ type: 'xpub', ciphertext: 'aa', iv: 'cc' })).toBe(false);
  });

  it('deserializeWallet throws without askForPassword for encrypted data', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    expect(() => deserializeWallet(serialized)).toThrow(InvalidWalletExportError);
    expect(() => deserializeWallet(serialized)).toThrow('askForPassword is required');
  });

  it('deserialized encrypted wallet re-serializes identically', async () => {
    const wallet = new PhraseWallet(new Phrase(MNEMONIC));
    await wallet.encrypt(PASSWORD, async () => PASSWORD);
    const serialized = await wallet.serialize();

    const restored = deserializeWallet(serialized, async () => PASSWORD);
    const reSerialized = await restored.serialize();

    expect(reSerialized).toEqual(serialized);
  });
});

describe('encrypted access prevention', () => {
  it('Phrase: accessing .words throws EncryptedAccessError when encrypted', async () => {
    const phrase = new Phrase(MNEMONIC);
    await phrase.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => phrase.words).toThrow(EncryptedAccessError);
  });

  it('Phrase: accessing .raw throws EncryptedAccessError when encrypted', async () => {
    const phrase = new Phrase(MNEMONIC);
    await phrase.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => phrase.raw).toThrow(EncryptedAccessError);
  });

  it('Phrase: accessing .hex throws EncryptedAccessError when encrypted', async () => {
    const phrase = new Phrase(MNEMONIC);
    await phrase.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => phrase.hex).toThrow(EncryptedAccessError);
  });

  it('Phrase: accessing .getSeed() throws EncryptedAccessError when encrypted', async () => {
    const phrase = new Phrase(MNEMONIC);
    await phrase.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => phrase.getSeed()).toThrow(EncryptedAccessError);
  });

  it('Seed: accessing .raw throws EncryptedAccessError when encrypted', async () => {
    const seed = new Seed(SEED_HEX);
    await seed.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => seed.raw).toThrow(EncryptedAccessError);
  });

  it('Seed: accessing .hex throws EncryptedAccessError when encrypted', async () => {
    const seed = new Seed(SEED_HEX);
    await seed.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => seed.hex).toThrow(EncryptedAccessError);
  });

  it('Xpriv: accessing .key throws EncryptedAccessError when encrypted', async () => {
    const xpriv = new Xpriv(XPRIV);
    await xpriv.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => xpriv.key).toThrow(EncryptedAccessError);
  });

  it('PrivateKey: accessing .raw throws EncryptedAccessError when encrypted', async () => {
    const pk = new PrivateKey(PRIV_HEX);
    await pk.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => pk.raw).toThrow(EncryptedAccessError);
  });

  it('PrivateKey: accessing .hex throws EncryptedAccessError when encrypted', async () => {
    const pk = new PrivateKey(PRIV_HEX);
    await pk.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => pk.hex).toThrow(EncryptedAccessError);
  });

  it('PrivateKey: accessing .publicKey throws EncryptedAccessError when encrypted', async () => {
    const pk = new PrivateKey(PRIV_HEX);
    await pk.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => pk.publicKey).toThrow(EncryptedAccessError);
  });

  it('PrivateKey: accessing .getWif() throws EncryptedAccessError when encrypted', async () => {
    const pk = new PrivateKey(PRIV_HEX);
    await pk.encrypt(PASSWORD, async () => PASSWORD);
    expect(() => pk.getWif()).toThrow(EncryptedAccessError);
  });

  it('data is accessible again inside withDecrypted()', async () => {
    const phrase = new Phrase(MNEMONIC);
    await phrase.encrypt(PASSWORD, async () => PASSWORD);
    const words = await phrase.withDecrypted(() => phrase.words.join(' '));
    expect(words).toBe(MNEMONIC);
  });

  it('data is not accessible after withDecrypted() completes', async () => {
    const phrase = new Phrase(MNEMONIC);
    await phrase.encrypt(PASSWORD, async () => PASSWORD);
    await phrase.withDecrypted(() => phrase.words);
    expect(() => phrase.words).toThrow(EncryptedAccessError);
  });

  it('unencrypted secrets remain freely accessible', () => {
    const phrase = new Phrase(MNEMONIC);
    expect(() => phrase.words).not.toThrow();
    expect(phrase.words.join(' ')).toBe(MNEMONIC);
  });
});
