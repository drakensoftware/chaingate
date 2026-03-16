import type { DerivationIndexEntry } from './SigningWallet/HDWallet/HDWallet';

/** All supported wallet type identifiers. */
export const WALLET_TYPES = ['phrase', 'seed', 'xpriv', 'privateKey', 'xpub', 'publicKey'] as const;

/** Union of all wallet type string literals. */
export type WalletType = (typeof WALLET_TYPES)[number];

/** Wallet types that support encryption. */
export const SECRET_WALLET_TYPES = ['phrase', 'seed', 'xpriv', 'privateKey'] as const;

/** Union of secret (signing) wallet type string literals. */
export type SecretWalletType = (typeof SECRET_WALLET_TYPES)[number];

// --- Encrypted variant (shared shape for all secret wallet types) ---

interface EncryptedFields {
  ciphertext: string;
  iv: string;
  salt: string;
}

// --- HD wallet restore data (shared by phrase, seed, xpriv) ---

interface HDRestoreFields {
  masterPublicKey?: string;
  derivationIndex?: DerivationIndexEntry[];
}

// --- Phrase ---

/** Serialized form of a {@link PhraseWallet}. */
export type PhraseWalletSerialized =
  | ({ type: 'phrase'; phrase: string } & HDRestoreFields)
  | ({ type: 'phrase' } & EncryptedFields & HDRestoreFields);

// --- Seed ---

/** Serialized form of a {@link SeedWallet}. */
export type SeedWalletSerialized =
  | ({ type: 'seed'; seed: string } & HDRestoreFields)
  | ({ type: 'seed' } & EncryptedFields & HDRestoreFields);

// --- Xpriv ---

/** Serialized form of an {@link XprivWallet}. */
export type XprivWalletSerialized =
  | ({ type: 'xpriv'; xpriv: string } & HDRestoreFields)
  | ({ type: 'xpriv' } & EncryptedFields & HDRestoreFields);

// --- PrivateKey ---

/** Serialized form of a {@link PrivateKeyWallet}. */
export type PrivateKeyWalletSerialized =
  | { type: 'privateKey'; privateKey: string; publicKey?: string }
  | ({ type: 'privateKey' } & EncryptedFields & { publicKey?: string });

// --- View-only (no encrypted variant) ---

/** Serialized form of an {@link XpubWallet}. */
export interface XpubWalletSerialized {
  type: 'xpub';
  xpub: string;
}

/** Serialized form of a {@link PublicKeyWallet}. */
export interface PublicKeyWalletSerialized {
  type: 'publicKey';
  publicKey: string;
}

// --- Union ---

/** Union of all serialized wallet shapes. Validate with {@link isValidSerialized}. */
export type WalletSerialized =
  | PhraseWalletSerialized
  | SeedWalletSerialized
  | XprivWalletSerialized
  | PrivateKeyWalletSerialized
  | XpubWalletSerialized
  | PublicKeyWalletSerialized;
