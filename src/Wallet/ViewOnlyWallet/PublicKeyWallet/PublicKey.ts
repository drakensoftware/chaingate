import { isHex, hexToBytes, bytesToHex, compressPublicKey } from '../../../utils';
import { InvalidPublicKeyError } from '../../errors';

/**
 * A public key. Accepts both compressed and uncompressed formats (hex or bytes).
 *
 * @example
 * ```ts
 * const pk = new PublicKey('02deadbeef...');
 * console.log(pk.hex);
 * ```
 */
export class PublicKey {
  private readonly _data: Uint8Array;

  /**
   * @param source - Hex string or `Uint8Array`.
   * @throws {@link InvalidPublicKeyError} if invalid.
   */
  constructor(source: string | Uint8Array) {
    let raw: Uint8Array;

    if (source instanceof Uint8Array) {
      raw = source;
    } else if (isHex(source)) {
      raw = hexToBytes(source);
    } else {
      throw new InvalidPublicKeyError('Invalid public key format');
    }

    if (raw.length !== 33 && raw.length !== 65) {
      throw new InvalidPublicKeyError(
        `Invalid public key length: expected 33 (compressed) or 65 (uncompressed) bytes, got ${raw.length}`,
      );
    }

    try {
      this._data = compressPublicKey(raw);
    } catch {
      throw new InvalidPublicKeyError('Invalid public key: not a valid secp256k1 point');
    }
  }

  /** The compressed public key as raw bytes. */
  get raw(): Uint8Array {
    return this._data;
  }

  /** The compressed public key as hex. */
  get hex(): string {
    return bytesToHex(this._data);
  }
}
