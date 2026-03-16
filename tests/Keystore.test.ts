import { describe, it, expect } from 'vitest';
import {
  LegacyKeystore,
  Web3Keystore,
  IncorrectKeystorePasswordError,
  InvalidKeystoreError,
  isValidKeystore,
  importFromKeystore,
  PhraseWallet,
  PrivateKeyWallet,
} from '../src';

// ---------------------------------------------------------------------------
// Fixtures — taken from library-v1 test vectors
// ---------------------------------------------------------------------------

const LEGACY_KEYSTORE_JSON = JSON.stringify({
  version: 1,
  crypto: {
    cipher: 'aes-128-ctr',
    cipherparams: {
      iv: '00bee8a13b05a67c1c5dcdeaf461ee4a',
    },
    ciphertext:
      'e96757767288314beb670abc4eddc40f1a36fc6f5812594d15c022aad88aff4d3a998501884b752bca0967f4c2dc6d9dabf922fd056cefa8cbc5b04a7beb64ae4f93b4af4c7543c8e83699',
    kdf: 'pbkdf2',
    kdfparams: {
      c: 262144,
      prf: 'hmac-sha256',
      dklen: 32,
      salt: 'da46c078f9657ecec39e9bddee7def09f37e06025c1eceb2b9412454800814db',
    },
    mac: '3e56e57d5fcc6873f9c09e29e1a76f6f1f1c8a534f51f164ef2064607fb136c6',
  },
});

const WEB3_KEYSTORE_JSON = JSON.stringify({
  address: '014c1c3a420c781061a8decc2f3e00cda1c59816',
  crypto: {
    cipher: 'aes-128-ctr',
    ciphertext: '6b35eafed8217cb2bda7d57f7e165e26caedb653defbf83deed4acbb3b47609e',
    cipherparams: {
      iv: 'be2065014801e9264e114c32728c7c09',
    },
    kdf: 'scrypt',
    kdfparams: {
      dklen: 32,
      n: 262144,
      p: 1,
      r: 8,
      salt: 'a109b4a90baa55fe59c47a9915de0dd91a357e1ba02b26234a5fe2b8cbcceca2',
    },
    mac: '8905d186d71c6fd6e2df02f4bc3233a46f38aedba5dc55b6c4efe0fbf87979e6',
  },
  id: '39a6290e-f719-4339-9b0f-97fb7ed3e4b4',
  version: 3,
});

const CORRECT_PASSWORD = '1234';
const WRONG_PASSWORD = 'Incorrect password';

const EXPECTED_LEGACY_PHRASE =
  'wrap comfort tip tattoo morning trade glare tribe angry meadow crisp burger';
const EXPECTED_WEB3_PRIVATE_KEY =
  '0b9882e54799f1b73bde750298d841dc7a83ea99c85de0f38559d747b48f65af';

// ---------------------------------------------------------------------------
// LegacyKeystore
// ---------------------------------------------------------------------------

describe('LegacyKeystore', () => {
  it('decrypts with the correct password to recover the mnemonic phrase', async () => {
    const ks = new LegacyKeystore(JSON.parse(LEGACY_KEYSTORE_JSON));
    const decrypted = await ks.decrypt(CORRECT_PASSWORD);
    const phrase = new TextDecoder().decode(decrypted);
    expect(phrase).toBe(EXPECTED_LEGACY_PHRASE);
  });

  it('checkPassword returns true for the correct password', async () => {
    const ks = new LegacyKeystore(JSON.parse(LEGACY_KEYSTORE_JSON));
    expect(await ks.checkPassword(CORRECT_PASSWORD)).toBe(true);
  });

  it('checkPassword returns false for the wrong password', async () => {
    const ks = new LegacyKeystore(JSON.parse(LEGACY_KEYSTORE_JSON));
    expect(await ks.checkPassword(WRONG_PASSWORD)).toBe(false);
  });

  it('decrypt throws IncorrectKeystorePasswordError for the wrong password', async () => {
    const ks = new LegacyKeystore(JSON.parse(LEGACY_KEYSTORE_JSON));
    await expect(ks.decrypt(WRONG_PASSWORD)).rejects.toThrow(IncorrectKeystorePasswordError);
  });

  it('isKeystore returns true for a V1 keystore object', () => {
    expect(LegacyKeystore.isKeystore(JSON.parse(LEGACY_KEYSTORE_JSON))).toBe(true);
  });

  it('isKeystore returns false for a V3 keystore object', () => {
    expect(LegacyKeystore.isKeystore(JSON.parse(WEB3_KEYSTORE_JSON))).toBe(false);
  });

  it('isKeystore returns false for a random object', () => {
    expect(LegacyKeystore.isKeystore({ foo: 'bar' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Web3Keystore
// ---------------------------------------------------------------------------

describe('Web3Keystore', () => {
  it('decrypts with the correct password to recover the private key', async () => {
    const ks = new Web3Keystore(JSON.parse(WEB3_KEYSTORE_JSON));
    const decrypted = await ks.decrypt(CORRECT_PASSWORD);

    // The decrypted bytes should be the raw 32-byte private key
    const hexKey = Array.from(decrypted)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(hexKey).toBe(EXPECTED_WEB3_PRIVATE_KEY);
  });

  it('checkPassword returns true for the correct password', async () => {
    const ks = new Web3Keystore(JSON.parse(WEB3_KEYSTORE_JSON));
    expect(await ks.checkPassword(CORRECT_PASSWORD)).toBe(true);
  });

  it('checkPassword returns false for the wrong password', async () => {
    const ks = new Web3Keystore(JSON.parse(WEB3_KEYSTORE_JSON));
    expect(await ks.checkPassword(WRONG_PASSWORD)).toBe(false);
  });

  it('decrypt throws IncorrectKeystorePasswordError for the wrong password', async () => {
    const ks = new Web3Keystore(JSON.parse(WEB3_KEYSTORE_JSON));
    await expect(ks.decrypt(WRONG_PASSWORD)).rejects.toThrow(IncorrectKeystorePasswordError);
  });

  it('isKeystore returns true for a V3 keystore object', () => {
    expect(Web3Keystore.isKeystore(JSON.parse(WEB3_KEYSTORE_JSON))).toBe(true);
  });

  it('isKeystore returns false for a V1 keystore object', () => {
    expect(Web3Keystore.isKeystore(JSON.parse(LEGACY_KEYSTORE_JSON))).toBe(false);
  });

  it('isKeystore returns false for a random object', () => {
    expect(Web3Keystore.isKeystore({ foo: 'bar' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WalletFactory: isValidKeystore + importFromKeystore
// ---------------------------------------------------------------------------

describe('isValidKeystore', () => {
  it('returns true for a V1 legacy keystore JSON string', () => {
    expect(isValidKeystore(LEGACY_KEYSTORE_JSON)).toBe(true);
  });

  it('returns true for a V3 web3 keystore JSON string', () => {
    expect(isValidKeystore(WEB3_KEYSTORE_JSON)).toBe(true);
  });

  it('returns false for invalid JSON', () => {
    expect(isValidKeystore('not json at all')).toBe(false);
  });

  it('returns false for valid JSON that is not a keystore', () => {
    expect(isValidKeystore(JSON.stringify({ foo: 'bar' }))).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidKeystore('')).toBe(false);
  });
});

describe('importFromKeystore', () => {
  it('imports a V1 legacy keystore as a PhraseWallet', async () => {
    const wallet = await importFromKeystore(LEGACY_KEYSTORE_JSON, CORRECT_PASSWORD);
    expect(wallet).toBeInstanceOf(PhraseWallet);

    const serialized = (await wallet.serialize({ acknowledge: true })) as { phrase: string };
    expect(serialized.phrase).toBe(EXPECTED_LEGACY_PHRASE);
  });

  it('imports a V3 web3 keystore as a PrivateKeyWallet', async () => {
    const wallet = await importFromKeystore(WEB3_KEYSTORE_JSON, CORRECT_PASSWORD);
    expect(wallet).toBeInstanceOf(PrivateKeyWallet);

    const serialized = (await wallet.serialize({ acknowledge: true })) as { privateKey: string };
    expect(serialized.privateKey).toBe(EXPECTED_WEB3_PRIVATE_KEY);
  });

  it('throws IncorrectKeystorePasswordError for the wrong password (legacy)', async () => {
    await expect(importFromKeystore(LEGACY_KEYSTORE_JSON, WRONG_PASSWORD)).rejects.toThrow(
      IncorrectKeystorePasswordError,
    );
  });

  it('throws IncorrectKeystorePasswordError for the wrong password (web3)', async () => {
    await expect(importFromKeystore(WEB3_KEYSTORE_JSON, WRONG_PASSWORD)).rejects.toThrow(
      IncorrectKeystorePasswordError,
    );
  });

  it('throws InvalidKeystoreError for invalid JSON', async () => {
    await expect(importFromKeystore('not json', CORRECT_PASSWORD)).rejects.toThrow(
      InvalidKeystoreError,
    );
  });

  it('throws InvalidKeystoreError for unrecognized format', async () => {
    await expect(
      importFromKeystore(JSON.stringify({ version: 99, foo: 'bar' }), CORRECT_PASSWORD),
    ).rejects.toThrow(InvalidKeystoreError);
  });
});
