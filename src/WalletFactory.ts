import {
  Phrase,
  PhraseLanguage,
  PhraseNumOfWords,
} from './Wallet/SigningWallet/HDWallet/PhraseWallet/Phrase';
import { Seed } from './Wallet/SigningWallet/HDWallet/SeedWallet/Seed';
import { PrivateKey } from './Wallet/SigningWallet/PrivateKeyWallet/PrivateKey';
import { PublicKey } from './Wallet/ViewOnlyWallet/PublicKeyWallet/PublicKey';
import { PhraseWallet } from './Wallet/SigningWallet/HDWallet/PhraseWallet/PhraseWallet';
import { SeedWallet } from './Wallet/SigningWallet/HDWallet/SeedWallet/SeedWallet';
import { XprivWallet } from './Wallet/SigningWallet/HDWallet/XprivWallet/XprivWallet';
import { Xpriv } from './Wallet/SigningWallet/HDWallet/XprivWallet/Xpriv';
import { PrivateKeyWallet } from './Wallet/SigningWallet/PrivateKeyWallet/PrivateKeyWallet';
import { XpubWallet } from './Wallet/ViewOnlyWallet/XpubWallet/XpubWallet';
import { PublicKeyWallet } from './Wallet/ViewOnlyWallet/PublicKeyWallet/PublicKeyWallet';
import {
  WalletSerialized,
  WalletType,
  WALLET_TYPES,
  SECRET_WALLET_TYPES,
  SecretWalletType,
} from './Wallet/WalletSerialized';
import { EncryptedState } from './Wallet/Secret';
import { isHex, isBase58, hexToBytes } from './utils';
import {
  UnrecognizedFormatError,
  InvalidWalletParamsError,
  InvalidWalletExportError,
  InvalidKeystoreError,
} from './errors';
import { LegacyKeystore } from './Keystore/LegacyKeystore';
import { Web3Keystore } from './Keystore/Web3Keystore';
import type { HDWalletRestoreData } from './Wallet/SigningWallet/HDWallet/HDWallet';

// --- Types ---

/** Detected input format. Returned by {@link detectWalletImportType}. */
export type InputType = 'phrase' | 'xpriv' | 'xpub' | 'wif' | 'seed' | 'privateKey' | 'publicKey';

/** Parameters for {@link importWallet}. Provide exactly one property. */
export type WalletParams =
  | { phrase: string }
  | { seed: string | Uint8Array }
  | { xpriv: string }
  | { privateKey: string | Uint8Array }
  | { xpub: string }
  | { publicKey: string | Uint8Array };

/**
 * Detects what type of wallet input a string is (phrase, xpriv, xpub, WIF, seed, private/public key).
 *
 * @param input - The string to analyze.
 * @throws {@link UnrecognizedFormatError} if the format cannot be identified.
 */
export function detectWalletImportType(input: string): InputType {
  const trimmed = input.trim();

  if (trimmed.startsWith('xpub')) {
    if (trimmed.length < 107 || trimmed.length > 112) {
      throw new UnrecognizedFormatError(
        `Invalid xpub: expected 107-112 characters, got ${trimmed.length}`,
      );
    }
    return 'xpub';
  }

  if (trimmed.startsWith('xprv')) {
    if (trimmed.length < 107 || trimmed.length > 112) {
      throw new UnrecognizedFormatError(
        `Invalid xpriv: expected 107-112 characters, got ${trimmed.length}`,
      );
    }
    return 'xpriv';
  }

  if (Phrase.isValid(trimmed)) return 'phrase';

  if (isHex(trimmed)) {
    const clean = trimmed.startsWith('0x') ? trimmed.substring(2) : trimmed;
    if (clean.length === 128) return 'seed';
    if (clean.length === 64) return 'privateKey';
    if (clean.length === 66 || clean.length === 130) return 'publicKey';
    throw new UnrecognizedFormatError(
      `Invalid hex key: expected 64 (private key), 66 (public key), 128 (seed), or 130 (uncompressed public key) hex characters, got ${clean.length}`,
    );
  }

  if (isBase58(trimmed)) {
    if (trimmed.length < 51 || trimmed.length > 52) {
      throw new UnrecognizedFormatError(
        `Invalid WIF: expected 51-52 characters, got ${trimmed.length}`,
      );
    }
    return 'wif';
  }

  throw new UnrecognizedFormatError('Unrecognized input format');
}

// --- Factory ---

export type AnyWallet =
  | PhraseWallet
  | SeedWallet
  | XprivWallet
  | PrivateKeyWallet
  | XpubWallet
  | PublicKeyWallet;

/**
 * Generates a new random mnemonic phrase and creates an HD wallet.
 *
 * @param language - Wordlist language. Defaults to `'english'`.
 * @param numberOfWords - Word count. Defaults to `12`.
 * @returns The mnemonic `phrase` and the created `wallet`.
 *
 * @example
 * ```ts
 * const { phrase, wallet } = newWallet();
 * const key = await wallet.derive("m/44'/60'/0'/0/0");
 * ```
 */
export function newWallet(
  language: PhraseLanguage = 'english',
  numberOfWords: PhraseNumOfWords = 12,
): { phrase: string; wallet: PhraseWallet } {
  const phraseEntity = Phrase.new(language, numberOfWords);
  const wallet = new PhraseWallet(phraseEntity);
  return { phrase: new TextDecoder().decode(phraseEntity.raw), wallet };
}

/**
 * Creates a wallet from explicit parameters.
 *
 * @param params - Exactly one property: `phrase`, `seed`, `xpriv`, `privateKey`, `xpub`, or `publicKey`.
 * @throws {@link InvalidWalletParamsError} if invalid.
 *
 * @example
 * ```ts
 * const wallet = importWallet({ phrase: 'abandon abandon ... about' });
 * const wallet = importWallet({ privateKey: 'deadbeef...' });
 * ```
 */
export function importWallet(params: { phrase: string }): PhraseWallet;
export function importWallet(params: { seed: string | Uint8Array }): SeedWallet;
export function importWallet(params: { xpriv: string }): XprivWallet;
export function importWallet(params: { privateKey: string | Uint8Array }): PrivateKeyWallet;
export function importWallet(params: { xpub: string }): XpubWallet;
export function importWallet(params: { publicKey: string | Uint8Array }): PublicKeyWallet;
export function importWallet(params: WalletParams): AnyWallet;
export function importWallet(params: WalletParams): AnyWallet {
  if ('phrase' in params) {
    return new PhraseWallet(new Phrase(params.phrase));
  }
  if ('seed' in params) {
    return new SeedWallet(new Seed(params.seed));
  }
  if ('xpriv' in params) {
    return new XprivWallet(new Xpriv(params.xpriv));
  }
  if ('privateKey' in params) {
    return new PrivateKeyWallet(new PrivateKey(params.privateKey));
  }
  if ('xpub' in params) {
    return new XpubWallet(params.xpub);
  }
  if ('publicKey' in params) {
    return new PublicKeyWallet(new PublicKey(params.publicKey));
  }
  throw new InvalidWalletParamsError('Invalid wallet params');
}

// --- Deserialize from serialized data ---

/**
 * Type guard — checks if unknown data is a valid {@link WalletSerialized}.
 *
 * @param data - The data to validate.
 */
export function isValidSerialized(data: unknown): data is WalletSerialized {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;
  if (typeof obj.type !== 'string') return false;
  if (!WALLET_TYPES.includes(obj.type as WalletType)) return false;

  // Encrypted: type is a valid wallet type + ciphertext/iv/salt present
  if (typeof obj.ciphertext === 'string' && obj.ciphertext !== '') {
    return (
      SECRET_WALLET_TYPES.includes(obj.type as SecretWalletType) &&
      typeof obj.iv === 'string' &&
      obj.iv !== '' &&
      typeof obj.salt === 'string' &&
      obj.salt !== ''
    );
  }

  // Plaintext: the key matching the type must be a non-empty string
  return typeof obj[obj.type] === 'string' && obj[obj.type] !== '';
}

/**
 * Restores a wallet from serialized data (produced by {@link Wallet.serialize}).
 *
 * @param data - The serialized wallet data.
 * @param askForPassword - Password prompt callback. Required for encrypted wallets.
 * @throws {@link InvalidWalletExportError} if the data is invalid.
 *
 * @example
 * ```ts
 * const wallet = deserializeWallet(JSON.parse(stored), async () => {
 *   return prompt('Enter password:');
 * });
 * ```
 */
export function deserializeWallet(
  data: unknown,
  askForPassword?: () => Promise<string | null>,
): AnyWallet {
  if (!isValidSerialized(data)) {
    throw new InvalidWalletExportError(
      'Invalid wallet data: expected { type, phrase | seed | xpriv | privateKey | xpub | publicKey }',
    );
  }

  const restoreData = extractRestoreData(data);
  const isEncrypted = 'ciphertext' in data && data.ciphertext !== '';

  if (isEncrypted) {
    if (!askForPassword) {
      throw new InvalidWalletExportError(
        'askForPassword is required to deserialize an encrypted wallet',
      );
    }
    const enc = data as WalletSerialized & { ciphertext: string; iv: string; salt: string };
    const encrypted: EncryptedState = {
      ciphertext: hexToBytes(enc.ciphertext),
      iv: hexToBytes(enc.iv),
      salt: hexToBytes(enc.salt),
      askForPassword,
    };
    switch (data.type) {
      case 'phrase':
        return new PhraseWallet(new Phrase(encrypted), restoreData);
      case 'seed':
        return new SeedWallet(new Seed(encrypted), restoreData);
      case 'xpriv':
        return new XprivWallet(new Xpriv(encrypted), restoreData);
      case 'privateKey':
        return new PrivateKeyWallet(new PrivateKey(encrypted));
    }
  }

  switch (data.type) {
    case 'phrase':
      return new PhraseWallet(new Phrase((data as { phrase: string }).phrase), restoreData);
    case 'seed':
      return new SeedWallet(new Seed((data as { seed: string }).seed), restoreData);
    case 'xpriv':
      return new XprivWallet(new Xpriv((data as { xpriv: string }).xpriv), restoreData);
    case 'privateKey':
      return new PrivateKeyWallet(new PrivateKey((data as { privateKey: string }).privateKey));
    case 'xpub':
      return new XpubWallet(data.xpub);
    case 'publicKey':
      return new PublicKeyWallet(new PublicKey(data.publicKey));
  }
}

function extractRestoreData(data: WalletSerialized): HDWalletRestoreData | undefined {
  const restoreData: HDWalletRestoreData = {};

  if ('derivationIndex' in data && Array.isArray(data.derivationIndex)) {
    restoreData.derivationIndex = data.derivationIndex;
  }
  if ('masterPublicKey' in data && typeof data.masterPublicKey === 'string') {
    restoreData.masterPublicKey = data.masterPublicKey;
  }

  return Object.keys(restoreData).length > 0 ? restoreData : undefined;
}

// --- Auto-detect from string ---

/**
 * Auto-detects the format of a string and creates the appropriate wallet.
 *
 * @param input - Phrase, xpriv, xpub, WIF, hex key, etc.
 * @throws {@link UnrecognizedFormatError} if the format cannot be identified.
 *
 * @example
 * ```ts
 * const wallet = createWalletFromString('abandon abandon ... about');
 * const wallet = createWalletFromString('xpub6CUGRUo...');
 * ```
 */
export function createWalletFromString(input: string): AnyWallet {
  const type = detectWalletImportType(input);

  const paramMap: Record<InputType, () => WalletParams> = {
    phrase: () => ({ phrase: input }),
    seed: () => ({ seed: input }),
    xpriv: () => ({ xpriv: input }),
    privateKey: () => ({ privateKey: input }),
    wif: () => ({ privateKey: input }),
    xpub: () => ({ xpub: input }),
    publicKey: () => ({ publicKey: input }),
  };

  return importWallet(paramMap[type]());
}

// --- Keystore import ---

/**
 * Checks whether a JSON string is a recognized keystore format (V1 Legacy or V3 Web3).
 *
 * @param keystore - The JSON string to check.
 * @returns `true` if the JSON is a valid V1 or V3 keystore.
 *
 * @example
 * ```ts
 * if (isValidKeystore(jsonString)) {
 *   const wallet = await importFromKeystore(jsonString, 'myPassword');
 * }
 * ```
 */
export function isValidKeystore(keystore: string): boolean {
  try {
    const obj = JSON.parse(keystore);
    return LegacyKeystore.isKeystore(obj) || Web3Keystore.isKeystore(obj);
  } catch {
    return false;
  }
}

/**
 * Imports a wallet from an encrypted keystore JSON (V1 Legacy or V3 Web3
 * format, as used by MetaMask, MyEtherWallet, Geth, etc.).
 *
 * The keystore is decrypted with the given password. The decrypted secret is
 * auto-detected as either a mnemonic phrase (returns {@link PhraseWallet}) or
 * a raw private key (returns {@link PrivateKeyWallet}).
 *
 * @param keystore - The keystore JSON string.
 * @param password - The decryption password.
 * @returns The appropriate wallet type based on the decrypted contents.
 *
 * @throws {@link InvalidKeystoreError} if the JSON is not a recognized keystore.
 * @throws {@link IncorrectKeystorePasswordError} if the password is wrong.
 *
 * @example
 * ```ts
 * const wallet = await importFromKeystore(keystoreJson, 'my-password');
 * ```
 */
export async function importFromKeystore(
  keystore: string,
  password: string,
): Promise<PhraseWallet | PrivateKeyWallet> {
  let obj: object;
  try {
    obj = JSON.parse(keystore);
  } catch {
    throw new InvalidKeystoreError('Invalid JSON');
  }

  let decrypted: Uint8Array;

  if (LegacyKeystore.isKeystore(obj)) {
    decrypted = await new LegacyKeystore(
      obj as ConstructorParameters<typeof LegacyKeystore>[0],
    ).decrypt(password);
  } else if (Web3Keystore.isKeystore(obj)) {
    decrypted = await new Web3Keystore(
      obj as ConstructorParameters<typeof Web3Keystore>[0],
    ).decrypt(password);
  } else {
    throw new InvalidKeystoreError('Unrecognized keystore format');
  }

  // Try to interpret the decrypted bytes as a mnemonic phrase first
  try {
    const phraseText = new TextDecoder().decode(decrypted);
    if (Phrase.isValid(phraseText)) {
      return new PhraseWallet(new Phrase(phraseText));
    }
  } catch {
    // Not a valid phrase — fall through to private key
  }

  return new PrivateKeyWallet(new PrivateKey(decrypted));
}

// --- Validation helpers ---

/**
 * Checks whether a string is a valid BIP-39 mnemonic phrase.
 *
 * @param phrase - The mnemonic phrase to validate.
 * @returns `true` if valid.
 */
export function isValidPhrase(phrase: string): boolean {
  return Phrase.isValid(phrase);
}

/**
 * Checks whether a value is a valid HD seed (hex string or bytes).
 *
 * @param seed - The seed to validate (hex string or `Uint8Array`).
 * @returns `true` if valid.
 */
export function isValidSeed(seed: string | Uint8Array): boolean {
  try {
    new Seed(seed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether a value is a valid secp256k1 private key (hex, WIF, or bytes).
 *
 * @param privateKey - The private key to validate.
 * @returns `true` if valid.
 */
export function isValidPrivateKey(privateKey: string | Uint8Array): boolean {
  try {
    new PrivateKey(privateKey);
    return true;
  } catch {
    return false;
  }
}
