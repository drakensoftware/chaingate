import { bytesToHex } from '../utils';

/** @internal */
export interface DerivedPublicKeyData {
  publicKey: Uint8Array;
  xpub: string;
}

/**
 * A public key derived from an HD wallet. Returned by {@link HDWallet.derivePublicKey}
 * and {@link XpubWallet.derive}.
 */
export class DerivedPublicKey {
  private readonly _publicData: DerivedPublicKeyData;

  /** @internal */
  constructor(data: DerivedPublicKeyData) {
    this._publicData = data;
  }

  /** The compressed public key as raw bytes. */
  get publicKey(): Uint8Array {
    return this._publicData.publicKey;
  }

  /** The compressed public key as hex. */
  get publicKeyHex(): string {
    return bytesToHex(this.publicKey);
  }

  /** The extended public key (xpub). */
  get xpub(): string {
    return this._publicData.xpub;
  }
}
