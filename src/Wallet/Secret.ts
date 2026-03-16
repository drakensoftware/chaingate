import {
  DecryptionCancelledError,
  NotEncryptedError,
  AlreadyEncryptedError,
  EncryptedAccessError,
} from './errors';
import { bytesToHex } from '../utils';

/**
 * AES-256-GCM encryption with PBKDF2 key derivation.
 *
 * The password is run through PBKDF2 (600 000 iterations, SHA-256) to derive
 * the AES-256 key.  This provides brute-force resistance when the encrypted
 * payload is exported/persisted.
 *
 * To avoid running PBKDF2 on every encrypt/decrypt cycle (withDecrypted),
 * the derived CryptoKey is cached in memory after the first successful
 * derivation.  Only the derivedKey is kept — the plaintext password is
 * NEVER stored.  The cache is cleared on a wrong-password attempt so the
 * next try re-derives from scratch.
 *
 * On export (getEncryptedExport / serialize) the derivedKey is NOT included;
 * only ciphertext + iv + salt are persisted.  When the wallet is later
 * deserialized, the first withDecrypted() call will ask for the password,
 * run PBKDF2 once, and cache the result for all subsequent in-memory calls.
 */

const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 600_000;

/** Encrypted payload state, used when restoring an encrypted wallet from serialized data. */
export interface EncryptedState {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
  /** Callback to prompt the user for the password. Return `null` to cancel. */
  askForPassword: () => Promise<string | null>;
}

interface EncryptionInternal {
  iv: Uint8Array;
  salt: Uint8Array;
  /**
   * Cached AES derived key (produced by PBKDF2).
   * The plaintext password is never stored — only the derived CryptoKey
   * lives in memory so that subsequent withDecrypted() calls are fast.
   */
  cache: { key: CryptoKey } | null;
  askForPassword: () => Promise<string | null>;
}

// ---------------------------------------------------------------------------
// Key derivation: PBKDF2 (password + salt) -> AES-256-GCM CryptoKey
// ---------------------------------------------------------------------------

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import the password as raw key material for PBKDF2
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  // Derive a 256-bit AES-GCM key using PBKDF2 with the given salt
  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable — the derived key cannot be read back
    ['encrypt', 'decrypt'],
  );
}

// ---------------------------------------------------------------------------
// AES-256-GCM encrypt / decrypt helpers
// ---------------------------------------------------------------------------

async function aesEncrypt(data: Uint8Array, key: CryptoKey, iv: Uint8Array): Promise<Uint8Array> {
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  return new Uint8Array(ciphertext);
}

async function aesDecrypt(data: Uint8Array, key: CryptoKey, iv: Uint8Array): Promise<Uint8Array> {
  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  return new Uint8Array(plaintext);
}

// ---------------------------------------------------------------------------
// Secret — abstract base that wraps encrypted byte data
// ---------------------------------------------------------------------------

/**
 * Base class for encryptable secret data ({@link Phrase}, {@link Seed}, {@link Xpriv}, {@link PrivateKey}).
 *
 * Supports password-based encryption, temporary decryption via {@link withDecrypted},
 * and memory cleanup via {@link zeroize}.
 */
export abstract class Secret {
  private _data: Uint8Array;

  private encryption: EncryptionInternal | null = null;

  /** @internal */
  constructor(dataOrEncrypted: Uint8Array | EncryptedState) {
    if (dataOrEncrypted instanceof Uint8Array) {
      this._data = dataOrEncrypted;
    } else {
      // Restoring from serialized encrypted payload — no derived key yet.
      // The first withDecrypted() call will ask for the password and run
      // PBKDF2 once; subsequent calls reuse the cached derived key.
      this._data = dataOrEncrypted.ciphertext;
      this.encryption = {
        iv: dataOrEncrypted.iv,
        salt: dataOrEncrypted.salt,
        cache: null,
        askForPassword: dataOrEncrypted.askForPassword,
      };
    }
  }

  /** @internal */
  protected static resolveInput(
    source: string | Uint8Array | EncryptedState,
    fromString: (s: string) => Uint8Array,
  ): Uint8Array | EncryptedState {
    if (source instanceof Uint8Array) return source;
    if (typeof source === 'object') return source;
    return fromString(source);
  }

  /** @internal */
  protected get data(): Uint8Array {
    if (this.encryption) throw new EncryptedAccessError();
    return this._data;
  }

  /** Zeros out the secret data in memory. Call when you no longer need this secret. */
  zeroize(): void {
    this._data.fill(0);
  }

  /** Whether this secret is currently encrypted. */
  get encrypted(): boolean {
    return this.encryption !== null;
  }

  /**
   * Returns the encrypted data as hex strings, for serialization.
   *
   * @throws {@link NotEncryptedError} if not encrypted.
   */
  getEncryptedExport(): { ciphertext: string; iv: string; salt: string } {
    if (!this.encryption) throw new NotEncryptedError();
    // Only ciphertext, iv, and salt are exported — the derivedKey stays in memory
    return {
      ciphertext: bytesToHex(this._data),
      iv: bytesToHex(this.encryption.iv),
      salt: bytesToHex(this.encryption.salt),
    };
  }

  /**
   * Encrypts this secret with a password. The plaintext is zeroed after encryption.
   *
   * @param password - The encryption password.
   * @param askForPassword - Callback for future decryption prompts.
   * @throws {@link AlreadyEncryptedError} if already encrypted.
   */
  async encrypt(password: string, askForPassword: () => Promise<string | null>): Promise<void> {
    if (this.encryption) throw new AlreadyEncryptedError();

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    // Run PBKDF2 once during encryption; the derived key is cached for the
    // lifetime of this in-memory object so subsequent operations are fast.
    const key = await deriveKey(password, salt);

    const plaintext = this._data;
    this._data = await aesEncrypt(plaintext, key, iv);
    plaintext.fill(0);

    // Store the derived key — NOT the password — in the cache
    this.encryption = { iv, salt, cache: { key }, askForPassword };
  }

  /**
   * Temporarily decrypts the secret, runs `fn`, then re-encrypts automatically.
   *
   * If not encrypted, `fn` runs immediately. If a wrong password is entered,
   * the user is prompted again until correct or cancelled.
   *
   * @param fn - Callback with access to the decrypted data.
   * @throws {@link DecryptionCancelledError} if the user cancels the password prompt.
   *
   * @example
   * ```ts
   * const hex = await secret.withDecrypted(() => secret.hex);
   * ```
   */
  async withDecrypted<R>(fn: () => R): Promise<R> {
    if (!this.encryption) return fn();

    while (true) {
      let key: CryptoKey;

      if (this.encryption.cache) {
        // Fast path: reuse the PBKDF2-derived key already in memory.
        // No password is needed and no KDF work is performed.
        key = this.encryption.cache.key;
      } else {
        // Slow path: no cached key (first access after deserialization, or
        // cache was cleared after a wrong-password attempt).  Ask the user
        // for the password and run PBKDF2 once.
        const password = await this.encryption.askForPassword();
        if (password === null) throw new DecryptionCancelledError();

        key = await deriveKey(password, this.encryption.salt);
      }

      let decrypted: Uint8Array;
      try {
        decrypted = await aesDecrypt(this._data, key, this.encryption.iv);
      } catch {
        // Wrong key — clear the cache so the next iteration asks for the
        // password again and re-derives via PBKDF2.
        this.encryption.cache = null;
        continue;
      }

      // Cache the successful derived key for future calls (password is NOT kept)
      this.encryption.cache = { key };

      // Temporarily expose plaintext: set aside encryption so `this.data` getter works
      const savedEncryption = this.encryption;
      this.encryption = null;
      this._data = decrypted;

      try {
        return fn();
      } finally {
        // Re-encrypt with a fresh IV (same salt + derived key)
        const newIv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        this._data = await aesEncrypt(decrypted, key, newIv);
        savedEncryption.iv = newIv;
        this.encryption = savedEncryption;
        decrypted.fill(0);
      }
    }
  }
}
