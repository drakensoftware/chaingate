import { scryptAsync } from '@noble/hashes/scrypt.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from '../utils/encoding';
import { IncorrectKeystorePasswordError, InvalidKeystoreError } from '../errors';
import type { Keystore } from './Keystore';

/** JSON shape of a V3 (Web3) keystore file. */
export interface Web3KeystoreData {
  crypto: {
    cipher: string;
    ciphertext: string;
    cipherparams: {
      iv: string;
    };
    kdf: 'scrypt' | 'pbkdf2';
    kdfparams: {
      dklen: number;
      n?: number;
      p?: number;
      r?: number;
      salt: string;
      // PBKDF2 params (less common in V3 but allowed by spec)
      c?: number;
      prf?: string;
    };
    mac: string;
  };
  version: 3;
}

/** Web3 (V3) keystore. */
export class Web3Keystore implements Keystore {
  private readonly keystoreData: Web3KeystoreData;

  constructor(keystoreData: Web3KeystoreData) {
    this.keystoreData = keystoreData;
  }

  async checkPassword(password: string): Promise<boolean> {
    try {
      const derivedKey = await this.deriveKey(password);
      return this.verifyMac(derivedKey);
    } catch {
      return false;
    }
  }

  async decrypt(password: string): Promise<Uint8Array> {
    const derivedKey = await this.deriveKey(password);

    if (!this.verifyMac(derivedKey)) {
      throw new IncorrectKeystorePasswordError();
    }

    const iv = hexToBytes(this.keystoreData.crypto.cipherparams.iv);
    const ciphertext = hexToBytes(this.keystoreData.crypto.ciphertext);

    const encryptionKey = derivedKey.slice(0, 16);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encryptionKey.buffer as ArrayBuffer,
      'AES-CTR',
      false,
      ['decrypt'],
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CTR', counter: iv.buffer as ArrayBuffer, length: 128 },
      cryptoKey,
      ciphertext.buffer as ArrayBuffer,
    );

    return new Uint8Array(decrypted);
  }

  private async deriveKey(password: string): Promise<Uint8Array> {
    const kdfparams = this.keystoreData.crypto.kdfparams;
    const salt = hexToBytes(kdfparams.salt);
    const dkLen = kdfparams.dklen;
    const passwordBytes = new TextEncoder().encode(password);

    if (this.keystoreData.crypto.kdf === 'scrypt') {
      const N = kdfparams.n;
      const r = kdfparams.r;
      const p = kdfparams.p;

      if (!N || !r || !p) {
        throw new InvalidKeystoreError('Missing scrypt parameters');
      }

      return scryptAsync(passwordBytes, salt, { N, r, p, dkLen });
    }

    if (this.keystoreData.crypto.kdf === 'pbkdf2') {
      const iterations = kdfparams.c;
      if (!iterations) {
        throw new InvalidKeystoreError('Missing PBKDF2 iterations');
      }

      const prf = kdfparams.prf ?? 'hmac-sha256';
      const hashAlgo = prf === 'hmac-sha256' ? 'SHA-256' : 'SHA-512';

      const keyMaterial = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, [
        'deriveBits',
      ]);

      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: hashAlgo },
        keyMaterial,
        dkLen * 8,
      );

      return new Uint8Array(bits);
    }

    throw new InvalidKeystoreError(`Unsupported KDF: ${this.keystoreData.crypto.kdf}`);
  }

  private verifyMac(derivedKey: Uint8Array): boolean {
    const ciphertext = hexToBytes(this.keystoreData.crypto.ciphertext);
    // MAC = keccak256(derivedKey[16:32] + ciphertext)
    const macInput = new Uint8Array(16 + ciphertext.length);
    macInput.set(derivedKey.slice(16, 32));
    macInput.set(ciphertext, 16);

    const computedMac = bytesToHex(keccak_256(macInput));
    return computedMac === this.keystoreData.crypto.mac;
  }

  /** Checks whether a parsed JSON object looks like a V3 keystore. */
  static isKeystore(obj: object): boolean {
    return 'version' in obj && obj.version == 3;
  }
}
