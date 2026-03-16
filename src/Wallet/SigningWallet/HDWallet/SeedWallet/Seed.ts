import { Secret, EncryptedState } from '../../../Secret';
import { isHex, hexToBytes, bytesToHex } from '../../../../utils';
import { InvalidSeedError } from '../../../errors';

/**
 * A binary seed for HD key derivation. Accepts hex strings, raw bytes, or encrypted state.
 *
 * @example
 * ```ts
 * const seed = new Seed('abcdef0123456789...');
 * const seed = new Seed(seedBytes);
 * ```
 */
export class Seed extends Secret {
  /**
   * @param source - Hex string, `Uint8Array`, or {@link EncryptedState}.
   * @throws {@link InvalidSeedError} if invalid.
   */
  constructor(source: string | Uint8Array | EncryptedState) {
    const resolved = Secret.resolveInput(source, (s) => {
      if (isHex(s)) return hexToBytes(s);
      throw new InvalidSeedError('Invalid seed: must be hex string or Uint8Array');
    });
    super(resolved);
  }

  /** The raw seed bytes. */
  get raw(): Uint8Array {
    return this.data;
  }

  /** The seed as a hex-encoded string. */
  get hex(): string {
    return bytesToHex(this.data);
  }
}
