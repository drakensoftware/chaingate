import { Secret, EncryptedState } from '../../../Secret';
import { bytesToHex } from '../../../../utils';

/**
 * An extended private key (xpriv). Supports encryption.
 *
 * @example
 * ```ts
 * const xpriv = new Xpriv('xprv9s21ZrQH143K...');
 * console.log(xpriv.key);
 * ```
 */
export class Xpriv extends Secret {
  /** @param source - The xpriv string or {@link EncryptedState}. */
  constructor(source: string | EncryptedState) {
    const resolved = Secret.resolveInput(source, (s) => new TextEncoder().encode(s));
    super(resolved);
  }

  /** The raw bytes. */
  get raw(): Uint8Array {
    return this.data;
  }

  /** The xpriv as hex. */
  get hex(): string {
    return bytesToHex(this.data);
  }

  /** The xpriv string. */
  get key(): string {
    return new TextDecoder().decode(this.data);
  }
}
