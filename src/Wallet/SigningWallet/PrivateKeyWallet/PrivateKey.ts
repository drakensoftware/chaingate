import * as wif from 'wif';
import { Secret, EncryptedState } from '../../Secret';
import { isHex, hexToBytes, bytesToHex, isBase58, privateKeyToPublicKey } from '../../../utils';
import { InvalidPrivateKeyError } from '../../errors';

const DEFAULT_WIF_VERSION = 128; // Bitcoin mainnet

/**
 * A private key. Accepts hex, WIF, raw bytes, or encrypted state. Supports encryption.
 *
 * @example
 * ```ts
 * const pk = new PrivateKey('deadbeef...');
 * const pk = new PrivateKey('5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ'); // WIF
 * pk.publicKey; // compressed public key bytes
 * pk.getWif();  // export as WIF
 * ```
 */
export class PrivateKey extends Secret {
  private readonly wifVersion: number;

  /**
   * @param source - Hex, WIF, `Uint8Array`, or {@link EncryptedState}.
   * @param wifVersion - WIF version byte. Defaults to `128` (Bitcoin mainnet).
   * @throws {@link InvalidPrivateKeyError} if the format is invalid.
   */
  constructor(
    source: string | Uint8Array | EncryptedState,
    wifVersion: number = DEFAULT_WIF_VERSION,
  ) {
    const resolved = Secret.resolveInput(source, (s) => {
      if (isHex(s)) return hexToBytes(s);
      if (isBase58(s)) {
        try {
          return new Uint8Array(wif.decode(s).privateKey);
        } catch {
          throw new InvalidPrivateKeyError('Invalid WIF private key');
        }
      }
      throw new InvalidPrivateKeyError('Invalid private key format');
    });
    super(resolved);
    this.wifVersion = wifVersion;
  }

  /** The raw private key bytes. */
  get raw(): Uint8Array {
    return this.data;
  }

  /** The private key as hex. */
  get hex(): string {
    return bytesToHex(this.data);
  }

  /** The corresponding compressed public key. */
  get publicKey(): Uint8Array {
    return privateKeyToPublicKey(this.data);
  }

  /**
   * Exports the private key as a WIF string.
   *
   * @param version - WIF version byte. Defaults to the version set in the constructor.
   */
  getWif(version: number = this.wifVersion): string {
    return wif.encode({ version, privateKey: this.data, compressed: true });
  }

  /** Zeros out the private key in memory. */
  override zeroize(): void {
    super.zeroize();
    // Also clear the cached public key derivation by letting GC collect it
  }
}
