import { blake2b } from '@noble/hashes/blake2.js';
import { bytesToHex, hexToBytes } from '../utils/encoding';
import { IncorrectKeystorePasswordError } from '../errors';
import type { Keystore } from './Keystore';

/** JSON shape of a V1 (legacy) keystore file. */
export interface LegacyKeystoreData {
  version: 1;
  crypto: {
    cipher: string;
    cipherparams: {
      iv: string;
    };
    ciphertext: string;
    kdf: 'pbkdf2';
    kdfparams: {
      c: number;
      prf: string;
      dklen: number;
      salt: string;
    };
    mac: string;
  };
}

interface DerivedKey {
  decryptKey: Uint8Array;
  passwordCheck: Uint8Array;
}

/** Legacy (V1) keystore. */
export class LegacyKeystore implements Keystore {
  private readonly keystoreData: LegacyKeystoreData;
  private _derivedKey: DerivedKey | undefined;

  constructor(keystoreData: LegacyKeystoreData) {
    this.keystoreData = keystoreData;
  }

  async checkPassword(password: string): Promise<boolean> {
    const derivedKey = this._derivedKey ?? (await this.deriveKey(password));

    const ciphertext = hexToBytes(this.keystoreData.crypto.ciphertext);
    const combined = new Uint8Array(derivedKey.passwordCheck.length + ciphertext.length);
    combined.set(derivedKey.passwordCheck);
    combined.set(ciphertext, derivedKey.passwordCheck.length);

    const mac = bytesToHex(blake2b(combined, { dkLen: 32 }));

    if (mac === this.keystoreData.crypto.mac) {
      this._derivedKey = derivedKey;
      return true;
    }
    return false;
  }

  private async deriveKey(password: string): Promise<DerivedKey> {
    const salt = hexToBytes(this.keystoreData.crypto.kdfparams.salt);
    const iterations = this.keystoreData.crypto.kdfparams.c;
    const dkLen = this.keystoreData.crypto.kdfparams.dklen;

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
      keyMaterial,
      dkLen * 8,
    );

    const derivedKeyRaw = new Uint8Array(derivedBits);

    return {
      decryptKey: derivedKeyRaw.slice(0, 16),
      passwordCheck: derivedKeyRaw.slice(16, 32),
    };
  }

  async decrypt(password: string): Promise<Uint8Array> {
    const derivedKey = this._derivedKey ?? (await this.deriveKey(password));
    if (!(await this.checkPassword(password))) {
      throw new IncorrectKeystorePasswordError();
    }

    const iv = hexToBytes(this.keystoreData.crypto.cipherparams.iv);
    const encryptedData = hexToBytes(this.keystoreData.crypto.ciphertext);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      derivedKey.decryptKey.buffer as ArrayBuffer,
      'AES-CTR',
      false,
      ['decrypt'],
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CTR', counter: iv.buffer as ArrayBuffer, length: 128 },
      cryptoKey,
      encryptedData.buffer as ArrayBuffer,
    );

    return new Uint8Array(decrypted);
  }

  /** Checks whether a parsed JSON object looks like a V1 keystore. */
  static isKeystore(obj: object): boolean {
    return 'version' in obj && obj.version == 1;
  }
}
